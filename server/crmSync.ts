import { v4 as uuidv4 } from 'uuid';
import * as db from './database';

let queueChain: Promise<any> = Promise.resolve();
let flushTimer: NodeJS.Timeout | null = null;
let retryInterval: NodeJS.Timeout | null = null;
const pendingFlushLogIds = new Set<string>();

function enqueueWorker<T>(task: () => Promise<T>): Promise<T> {
  const next = queueChain.then(task, task);
  queueChain = next.catch(() => {});
  return next;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function resolveBasePrice(
  product: { priceLamb: number | null; priceTwoTeeth: number | null; hasLamb?: boolean; hasTwoTeeth?: boolean },
  settings: db.CrmSettings
): number | null {
  if (settings.priceSource === 'two_teeth_then_lamb') {
    const val = product.priceTwoTeeth ?? product.priceLamb ?? null;
    return typeof val === 'number' && Number.isFinite(val) ? val : null;
  }
  const val = product.priceLamb ?? product.priceTwoTeeth ?? null;
  return typeof val === 'number' && Number.isFinite(val) ? val : null;
}

export function computeSentPrice(rawPrice: number, settings: db.CrmSettings): number {
  return Math.round(rawPrice * settings.priceMultiplier);
}

function buildAuthHeaders(settings: db.CrmSettings): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = process.env.CRM_API_AUTH_TOKEN;
  if (!token || settings.authType === 'none') {
    return headers;
  }
  const headerName = settings.authHeaderName || 'Authorization';
  if (settings.authType === 'bearer') {
    headers[headerName] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  } else if (settings.authType === 'api_key_header') {
    headers[headerName] = token;
  }
  return headers;
}

function truncateText(value: string, maxLen = 2000): string {
  if (value.length <= maxLen) return value;
  return value.slice(0, maxLen) + '... [truncated]';
}

export interface SyncBatchSummary {
  transmitted: boolean;
  reason?: string;
  total: number;
  succeeded: number;
  failed: number;
  needsReview: number;
  pending: number;
  batchResults: Array<{
    batchId: string;
    sentCount: number;
    updatedCount: number | null;
    status: db.CrmSyncStatus;
    errorMessage: string | null;
  }>;
}

async function dispatchLogIds(
  logIds: string[],
  options: { isRetry?: boolean } = {}
): Promise<SyncBatchSummary> {
  const uniqueIds = Array.from(new Set(logIds));
  if (uniqueIds.length === 0) {
    return {
      transmitted: false,
      reason: 'NO_ITEMS',
      total: 0,
      succeeded: 0,
      failed: 0,
      needsReview: 0,
      pending: 0,
      batchResults: [],
    };
  }

  const settings = db.getCrmSettings();
  const logs = uniqueIds
    .map(id => db.getCrmSyncLogById(id))
    .filter((l): l is db.CrmSyncLog => Boolean(l));

  if (logs.length === 0) {
    return {
      transmitted: false,
      reason: 'NO_ITEMS',
      total: 0,
      succeeded: 0,
      failed: 0,
      needsReview: 0,
      pending: 0,
      batchResults: [],
    };
  }

  // Safety Gate: Do not transmit to external CRM until price unit is confirmed and live transmission is enabled
  if (!settings.liveTransmissionEnabled || !settings.priceUnitConfirmed) {
    const disabledReason = 'ارسال واقعی غیرفعال است (واحد قیمت CRM هنوز تایید نشده است).';
    for (const log of logs) {
      db.updateCrmSyncLog(log.id, {
        status: 'pending',
        errorMessage: disabledReason,
        nextRetryAt: null,
      });
    }
    return {
      transmitted: false,
      reason: 'LIVE_TRANSMISSION_DISABLED',
      total: logs.length,
      succeeded: 0,
      failed: 0,
      needsReview: 0,
      pending: logs.length,
      batchResults: [],
    };
  }

  // Deduplicate by crmProductIndex (keep latest log if duplicates exist)
  const byCrmIndex = new Map<number, db.CrmSyncLog>();
  for (const log of logs) {
    byCrmIndex.set(log.crmProductIndex, log);
  }
  const dedupedLogs = Array.from(byCrmIndex.values());

  const chunkSize = Math.max(1, settings.batchSize || 50);
  const chunks: db.CrmSyncLog[][] = [];
  for (let i = 0; i < dedupedLogs.length; i += chunkSize) {
    chunks.push(dedupedLogs.slice(i, i + chunkSize));
  }

  let succeeded = 0;
  let failed = 0;
  let needsReview = 0;
  const batchResults: SyncBatchSummary['batchResults'] = [];

  for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
    const chunk = chunks[chunkIdx];
    const batchId = uuidv4();
    const sentAt = new Date().toISOString();

    const payload: Record<string, number> = {};
    for (const item of chunk) {
      payload[String(item.crmProductIndex)] = item.sentPrice;
      db.updateCrmSyncLog(item.id, {
        batchId,
        status: 'sending',
        batchSize: chunk.length,
        sentAt,
        errorMessage: null,
      });
    }

    let finalStatus: db.CrmSyncStatus = 'failed';
    let apiResponseStr: string | null = null;
    let errorMessage: string | null = null;
    let updatedCount: number | null = null;

    try {
      const response = await fetch(settings.apiUrl, {
        method: 'POST',
        headers: buildAuthHeaders(settings),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(settings.timeoutMs),
      });

      const rawBody = await response.text();
      apiResponseStr = rawBody ? truncateText(rawBody) : `HTTP ${response.status}`;

      let parsed: any = null;
      try {
        parsed = rawBody ? JSON.parse(rawBody) : null;
      } catch {
        parsed = null;
      }

      if (!response.ok) {
        finalStatus = 'failed';
        errorMessage =
          parsed?.error ||
          parsed?.msg ||
          `خطای HTTP ${response.status} از سرور CRM`;
      } else if (!parsed || typeof parsed !== 'object') {
        finalStatus = 'failed';
        errorMessage = 'پاسخ دریافتی از CRM در قالب JSON معتبر نیست.';
      } else if (parsed.success !== true) {
        finalStatus = 'failed';
        errorMessage =
          parsed.error ||
          parsed.msg ||
          `سرور CRM عملیات را ناموفق اعلام کرد (code: ${parsed.code ?? 'unknown'}).`;
      } else {
        const rawUpdatedCount = parsed?.data?.updatedCount;
        updatedCount =
          typeof rawUpdatedCount === 'number' && Number.isFinite(rawUpdatedCount)
            ? rawUpdatedCount
            : null;

        if (updatedCount !== null && updatedCount === chunk.length) {
          finalStatus = 'success';
          errorMessage = null;
        } else if (updatedCount !== null && updatedCount < chunk.length) {
          finalStatus =
            settings.invalidIndexPolicy === 'fail_batch'
              ? 'failed'
              : 'needs_review';
          errorMessage = `تعداد رکوردهای بروزرسانی‌شده در CRM (${updatedCount}) کمتر از تعداد محصولات ارسالی (${chunk.length}) است و نیازمند بررسی می‌باشد.`;
        } else {
          finalStatus =
            settings.invalidIndexPolicy === 'fail_batch'
              ? 'failed'
              : 'needs_review';
          errorMessage =
            updatedCount === null
              ? 'فیلد updatedCount در پاسخ CRM یافت نشد و وضعیت نیازمند بررسی است.'
              : `عدم تطابق تعداد رکوردهای بروزرسانی‌شده (${updatedCount}) با تعداد ارسالی (${chunk.length}).`;
        }
      }
    } catch (err: any) {
      finalStatus = 'failed';
      if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
        errorMessage = `اتمام مهلت زمانی اتصال به CRM (${settings.timeoutMs} میلی‌ثانیه).`;
      } else {
        errorMessage = `خطای شبکه در ارتباط با CRM: ${err?.message || 'اتصال برقرار نشد'}`;
      }
      apiResponseStr = null;
    }

    for (const item of chunk) {
      const currentLog = db.getCrmSyncLogById(item.id);
      const currentRetryCount = currentLog ? currentLog.retryCount : item.retryCount;
      const nextRetryCount = options.isRetry ? currentRetryCount + 1 : currentRetryCount;

      let nextRetryAt: string | null = null;
      if (finalStatus === 'failed' && nextRetryCount < settings.maxRetries) {
        const backoff = settings.retryDelayMs * Math.pow(2, Math.max(0, nextRetryCount));
        nextRetryAt = new Date(Date.now() + backoff).toISOString();
      }

      db.updateCrmSyncLog(item.id, {
        status: finalStatus,
        apiResponse: apiResponseStr,
        errorMessage,
        updatedCount,
        retryCount: nextRetryCount,
        nextRetryAt,
      });

      if (finalStatus === 'success') succeeded++;
      else if (finalStatus === 'needs_review') needsReview++;
      else failed++;
    }

    batchResults.push({
      batchId,
      sentCount: chunk.length,
      updatedCount,
      status: finalStatus,
      errorMessage,
    });

    if (chunkIdx < chunks.length - 1 && settings.rateLimitDelayMs > 0) {
      await sleep(settings.rateLimitDelayMs);
    }
  }

  return {
    transmitted: true,
    total: dedupedLogs.length,
    succeeded,
    failed,
    needsReview,
    pending: 0,
    batchResults,
  };
}

export async function enqueueAutoPriceSync(
  changedProducts: db.PriceChangedProductInfo[],
  triggeredBy: string
): Promise<{ queuedCount: number }> {
  const settings = db.getCrmSettings();
  const connected = changedProducts.filter(p => p.crmProductIndex !== null && p.crmProductIndex !== undefined);

  if (connected.length === 0) {
    return { queuedCount: 0 };
  }

  const queuedIds: string[] = [];

  for (const prod of connected) {
    const rawPrice = resolveBasePrice(prod, settings);
    if (rawPrice === null) continue;

    const sentPrice = computeSentPrice(rawPrice, settings);
    const crmIndex = prod.crmProductIndex!;
    const disabledNote =
      !settings.liveTransmissionEnabled || !settings.priceUnitConfirmed
        ? 'ارسال واقعی غیرفعال است (واحد قیمت CRM هنوز تایید نشده است).'
        : null;

    // Supersede older retries for this product so stale prices cannot overwrite newer ones
    db.cancelPendingRetriesForProduct(prod.id);

    // Coalesce rapid successive changes into existing pending auto log if not yet sent
    const existingPending = db.findPendingAutoLogForProduct(prod.id);
    if (existingPending) {
      db.updateCrmSyncLog(existingPending.id, {
        productName: prod.name,
        rawPrice,
        sentPrice,
        currencyUnit: settings.priceUnitLabel,
        triggeredBy,
        errorMessage: disabledNote,
      });
      queuedIds.push(existingPending.id);
    } else {
      const created = db.createCrmSyncLog({
        productId: prod.id,
        productName: prod.name,
        crmProductIndex: crmIndex,
        rawPrice,
        sentPrice,
        currencyUnit: settings.priceUnitLabel,
        operationType: 'auto',
        status: 'pending',
        errorMessage: disabledNote,
        triggeredBy,
      });
      queuedIds.push(created.id);
    }
  }

  if (queuedIds.length === 0) {
    return { queuedCount: 0 };
  }

  // Only schedule transmission if live transmission is explicitly enabled & unit confirmed
  if (settings.liveTransmissionEnabled && settings.priceUnitConfirmed) {
    for (const id of queuedIds) {
      pendingFlushLogIds.add(id);
    }
    if (flushTimer) {
      clearTimeout(flushTimer);
    }
    const delay = Math.max(0, settings.debounceMs);
    flushTimer = setTimeout(() => {
      flushTimer = null;
      const idsToFlush = Array.from(pendingFlushLogIds);
      pendingFlushLogIds.clear();
      if (idsToFlush.length > 0) {
        enqueueWorker(() => dispatchLogIds(idsToFlush)).catch(err => {
          console.error('[CRM_SYNC] Auto-sync flush error:', err);
        });
      }
    }, delay);
  }

  return { queuedCount: queuedIds.length };
}

export async function flushPendingAutoSyncNow(): Promise<SyncBatchSummary | null> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  const ids = Array.from(pendingFlushLogIds);
  pendingFlushLogIds.clear();
  if (ids.length === 0) return null;
  return enqueueWorker(() => dispatchLogIds(ids));
}

export function getManualBulkPreview() {
  const settings = db.getCrmSettings();
  const products = db.getProducts();

  const withIndex = products.filter(p => p.crmProductIndex !== null && p.crmProductIndex !== undefined);
  const withoutIndex = products.length - withIndex.length;

  const eligibleItems: Array<{
    productId: string;
    productName: string;
    crmProductIndex: number;
    rawPrice: number;
    sentPrice: number;
    isActive: boolean;
  }> = [];

  let missingPriceWithIndexCount = 0;

  for (const prod of withIndex) {
    const rawPrice = resolveBasePrice(
      {
        priceLamb: prod.priceLamb,
        priceTwoTeeth: prod.priceTwoTeeth,
        hasLamb: prod.hasLamb,
        hasTwoTeeth: prod.hasTwoTeeth,
      },
      settings
    );
    if (rawPrice === null) {
      missingPriceWithIndexCount++;
      continue;
    }
    eligibleItems.push({
      productId: prod.id,
      productName: prod.name,
      crmProductIndex: prod.crmProductIndex!,
      rawPrice,
      sentPrice: computeSentPrice(rawPrice, settings),
      isActive: prod.isActive,
    });
  }

  return {
    totalProducts: products.length,
    withCrmIndex: withIndex.length,
    withoutCrmIndex: withoutIndex,
    eligibleCount: eligibleItems.length,
    missingPriceWithIndexCount,
    liveTransmissionEnabled: settings.liveTransmissionEnabled,
    priceUnitConfirmed: settings.priceUnitConfirmed,
    priceUnitLabel: settings.priceUnitLabel,
    priceMultiplier: settings.priceMultiplier,
    batchSize: settings.batchSize,
    samplePayload: Object.fromEntries(
      eligibleItems.slice(0, 5).map(item => [String(item.crmProductIndex), item.sentPrice])
    ),
    items: eligibleItems,
  };
}

export async function triggerManualBulkSync(triggeredBy: string): Promise<SyncBatchSummary> {
  const settings = db.getCrmSettings();
  const preview = getManualBulkPreview();

  if (preview.eligibleCount === 0) {
    return {
      transmitted: false,
      reason: 'NO_ELIGIBLE_PRODUCTS',
      total: 0,
      succeeded: 0,
      failed: 0,
      needsReview: 0,
      pending: 0,
      batchResults: [],
    };
  }

  const disabledNote =
    !settings.liveTransmissionEnabled || !settings.priceUnitConfirmed
      ? 'ارسال واقعی غیرفعال است (واحد قیمت CRM هنوز تایید نشده است).'
      : null;

  const createdIds: string[] = [];
  for (const item of preview.items) {
    db.cancelPendingRetriesForProduct(item.productId);
    const created = db.createCrmSyncLog({
      productId: item.productId,
      productName: item.productName,
      crmProductIndex: item.crmProductIndex,
      rawPrice: item.rawPrice,
      sentPrice: item.sentPrice,
      currencyUnit: settings.priceUnitLabel,
      operationType: 'manual',
      status: 'pending',
      errorMessage: disabledNote,
      triggeredBy,
    });
    createdIds.push(created.id);
  }

  return enqueueWorker(() => dispatchLogIds(createdIds));
}

export async function retryCrmLogs(options: {
  logIds?: string[];
  triggeredBy: string;
  isAutomatic?: boolean;
  includePending?: boolean;
}): Promise<SyncBatchSummary> {
  const settings = db.getCrmSettings();

  let targetLogs: db.CrmSyncLog[] = [];
  if (options.logIds && options.logIds.length > 0) {
    targetLogs = options.logIds
      .map(id => db.getCrmSyncLogById(id))
      .filter((l): l is db.CrmSyncLog => Boolean(l));
  } else {
    targetLogs = db.getLatestFailedOrReviewLogs();
    if (options.includePending) {
      const pending = db.getPendingCrmLogs();
      const seen = new Set(targetLogs.map(l => l.id));
      for (const p of pending) {
        if (!seen.has(p.id)) targetLogs.push(p);
      }
    }
  }

  if (targetLogs.length === 0) {
    return {
      transmitted: false,
      reason: 'NO_RETRYABLE_LOGS',
      total: 0,
      succeeded: 0,
      failed: 0,
      needsReview: 0,
      pending: 0,
      batchResults: [],
    };
  }

  const preparedIds: string[] = [];
  for (const log of targetLogs) {
    // Refresh price & crm index from current DB product state when possible
    let rawPrice = log.rawPrice;
    let sentPrice = log.sentPrice;
    let productName = log.productName;

    if (log.productId) {
      const product = db.getProductById(log.productId);
      if (product && product.crmProductIndex !== null && product.crmProductIndex !== undefined) {
        productName = product.name;
        const latestBase = resolveBasePrice(
          {
            priceLamb: product.priceLamb,
            priceTwoTeeth: product.priceTwoTeeth,
            hasLamb: product.hasLamb,
            hasTwoTeeth: product.hasTwoTeeth,
          },
          settings
        );
        if (latestBase !== null) {
          rawPrice = latestBase;
          sentPrice = computeSentPrice(latestBase, settings);
        }
      }
    }

    db.updateCrmSyncLog(log.id, {
      productName,
      rawPrice,
      sentPrice,
      currencyUnit: settings.priceUnitLabel,
      operationType: options.isAutomatic ? log.operationType : 'retry',
      triggeredBy: options.triggeredBy,
      nextRetryAt: null,
    });
    preparedIds.push(log.id);
  }

  return enqueueWorker(() => dispatchLogIds(preparedIds, { isRetry: true }));
}

export function startCrmRetryScheduler() {
  if (retryInterval) return;

  retryInterval = setInterval(() => {
    try {
      const settings = db.getCrmSettings();
      if (!settings.liveTransmissionEnabled || !settings.priceUnitConfirmed) {
        return;
      }
      const dueLogs = db.getDueRetryCrmLogs(settings.maxRetries);
      if (dueLogs.length === 0) return;

      retryCrmLogs({
        logIds: dueLogs.map(l => l.id),
        triggeredBy: 'system-auto-retry',
        isAutomatic: true,
      }).catch(err => {
        console.error('[CRM_SYNC] Retry scheduler error:', err);
      });
    } catch (err) {
      console.error('[CRM_SYNC] Scheduler tick failed:', err);
    }
  }, 10000);

  if (typeof retryInterval.unref === 'function') {
    retryInterval.unref();
  }
}

export function stopCrmRetryScheduler() {
  if (retryInterval) {
    clearInterval(retryInterval);
    retryInterval = null;
  }
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}
