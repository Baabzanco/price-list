import http from 'http';
import Database from 'better-sqlite3';

const BASE_URL = 'http://127.0.0.1:3000';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING CRM INTEGRATION & SYNC TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`✅ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${msg}`);
      failed++;
    }
  }

  const sqliteDb = new Database('data/database.sqlite');
  const initialCategoriesCount = (sqliteDb.prepare('SELECT count(*) as c FROM categories').get() as any).c;
  const initialProductsCount = (sqliteDb.prepare('SELECT count(*) as c FROM products').get() as any).c;

  // Login as admin
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin' }),
  });
  const loginJson = await loginRes.json();
  assert(loginRes.status === 200 && !!loginJson.token, 'Admin login succeeded');
  const adminToken = loginJson.token;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  };

  // Save original CRM settings to restore at the end
  const origSettingsRes = await fetch(`${BASE_URL}/api/crm/settings`, { headers: authHeaders });
  const origSettings = await origSettingsRes.json();
  assert(
    origSettingsRes.status === 200 &&
      origSettings.liveTransmissionEnabled === false &&
      origSettings.priceUnitConfirmed === false,
    'Default CRM settings keep liveTransmissionEnabled=false and priceUnitConfirmed=false'
  );

  // Track created test artifacts for cleanup
  const createdProductIds: string[] = [];
  const createdLogIds: string[] = [];

  // Mock CRM HTTP server
  let mockMode: 'ok' | 'partial' | 'error' = 'ok';
  let mockPayloads: Array<Record<string, number>> = [];
  let mockPort = 0;

  const mockServer = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/Product/Action/SetProductPrices') {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          mockPayloads.push(parsed);
          const keys = Object.keys(parsed);
          if (mockMode === 'error') {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ data: null, success: false, code: 500, msg: 'CRM Error', error: 'Mock failure' }));
            return;
          }
          const updatedCount = mockMode === 'partial' ? Math.max(0, keys.length - 1) : keys.length;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              data: { updatedCount },
              success: true,
              code: 0,
              msg: '',
              error: '',
            })
          );
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Bad JSON' }));
        }
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  await new Promise<void>(resolve => {
    mockServer.listen(0, '127.0.0.1', () => {
      const addr = mockServer.address() as any;
      mockPort = addr.port;
      resolve();
    });
  });

  try {
    // 1. Authorization / Security checks on /api/crm/*
    const unauthCrmRes = await fetch(`${BASE_URL}/api/crm/stats`);
    assert(unauthCrmRes.status === 401, 'Unauthenticated GET /api/crm/stats returns 401');

    // Create temporary editor to verify 403 on /api/crm/*
    const editorRes = await fetch(`${BASE_URL}/api/users`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        username: 'crm_test_editor',
        name: 'ادیتور تست CRM',
        password: 'EditorTestPassword!1',
        role: 'editor',
      }),
    });
    const editorUser = await editorRes.json();
    const editorLogin = await (
      await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'crm_test_editor', password: 'EditorTestPassword!1' }),
      })
    ).json();
    const editorCrmRes = await fetch(`${BASE_URL}/api/crm/settings`, {
      headers: { Authorization: `Bearer ${editorLogin.token}` },
    });
    assert(editorCrmRes.status === 403, 'Editor role is FORBIDDEN (403) from /api/crm/settings');
    await fetch(`${BASE_URL}/api/users/${editorUser.id}`, { method: 'DELETE', headers: authHeaders });

    // 2. Cannot enable liveTransmissionEnabled without priceUnitConfirmed
    const illegalEnableRes = await fetch(`${BASE_URL}/api/crm/settings`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ priceUnitConfirmed: false, liveTransmissionEnabled: true }),
    });
    assert(illegalEnableRes.status === 400, 'Cannot enable liveTransmissionEnabled when priceUnitConfirmed is false (400)');

    // 3. Create product with valid CRM index
    const createWithCrmRes = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        categoryId: 'cat_1',
        name: 'محصول تستی CRM اول',
        hasLamb: true,
        hasTwoTeeth: false,
        crmProductIndex: 99001,
      }),
    });
    const prod1 = await createWithCrmRes.json();
    if (prod1?.id) createdProductIds.push(prod1.id);
    assert(
      createWithCrmRes.status === 200 && prod1.crmProductIndex === 99001,
      'Created product with new CRM index (99001)'
    );

    // 4. Create multiple products WITHOUT CRM index (NULL allowed)
    const createNoCrm1Res = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        categoryId: 'cat_1',
        name: 'محصول تستی بدون شاخص ۱',
        hasLamb: true,
        hasTwoTeeth: false,
        crmProductIndex: null,
      }),
    });
    const prodNoCrm1 = await createNoCrm1Res.json();
    if (prodNoCrm1?.id) createdProductIds.push(prodNoCrm1.id);

    const createNoCrm2Res = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        categoryId: 'cat_1',
        name: 'محصول تستی بدون شاخص ۲',
        hasLamb: true,
        hasTwoTeeth: false,
      }),
    });
    const prodNoCrm2 = await createNoCrm2Res.json();
    if (prodNoCrm2?.id) createdProductIds.push(prodNoCrm2.id);
    assert(
      createNoCrm1Res.status === 200 &&
        createNoCrm2Res.status === 200 &&
        prodNoCrm1.crmProductIndex === null &&
        prodNoCrm2.crmProductIndex === null,
      'Multiple products without CRM index (NULL) can be created'
    );

    // 5. Reject invalid CRM index (negative, zero, non-integer)
    const badIndexRes = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        categoryId: 'cat_1',
        name: 'محصول شاخص نامعتبر',
        crmProductIndex: -5,
      }),
    });
    assert(badIndexRes.status === 400, 'Negative CRM index is rejected with 400');

    // 6. Reject duplicate CRM index & verify conflicting product name in error message
    const dupIndexRes = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        categoryId: 'cat_1',
        name: 'محصول تستی تکراری',
        crmProductIndex: 99001,
      }),
    });
    const dupIndexJson = await dupIndexRes.json();
    assert(
      dupIndexRes.status === 409 &&
        typeof dupIndexJson.error === 'string' &&
        dupIndexJson.error.includes('محصول تستی CRM اول'),
      `Duplicate CRM index rejected (409) with conflicting product name in error: "${dupIndexJson.error}"`
    );

    // 7. Concurrent duplicate creation test
    const concurrentResults = await Promise.all([
      fetch(`${BASE_URL}/api/products`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ categoryId: 'cat_1', name: 'همزمانی الف', crmProductIndex: 99002 }),
      }),
      fetch(`${BASE_URL}/api/products`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ categoryId: 'cat_1', name: 'همزمانی ب', crmProductIndex: 99002 }),
      }),
    ]);
    const concJson0 = await concurrentResults[0].json();
    const concJson1 = await concurrentResults[1].json();
    if (concurrentResults[0].status === 200 && concJson0?.id) createdProductIds.push(concJson0.id);
    if (concurrentResults[1].status === 200 && concJson1?.id) createdProductIds.push(concJson1.id);
    const concStatuses = [concurrentResults[0].status, concurrentResults[1].status].sort();
    assert(
      concStatuses[0] === 200 && concStatuses[1] === 409,
      'Concurrent creation with identical CRM index allows exactly one 200 and rejects duplicate with 409'
    );

    // 8. Edit product: same CRM index on same product succeeds; changing to another product's index fails; clearing sets null
    const selfUpdateRes = await fetch(`${BASE_URL}/api/products/${prod1.id}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'محصول تستی CRM اول ویرایش‌شده',
        categoryId: 'cat_1',
        hasLamb: true,
        hasTwoTeeth: false,
        crmProductIndex: 99001,
      }),
    });
    assert(selfUpdateRes.status === 200, 'Updating product with its own existing CRM index succeeds');

    const conflictEditRes = await fetch(`${BASE_URL}/api/products/${prodNoCrm1.id}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        name: prodNoCrm1.name,
        categoryId: 'cat_1',
        hasLamb: true,
        hasTwoTeeth: false,
        crmProductIndex: 99001,
      }),
    });
    const conflictEditJson = await conflictEditRes.json();
    assert(
      conflictEditRes.status === 409 && conflictEditJson.error.includes('محصول تستی CRM اول ویرایش‌شده'),
      'Editing product to use another product CRM index fails with 409 and owner name'
    );

    // Assign 99003 to prodNoCrm1, then clear it, then assign 99003 again
    const assignRes = await fetch(`${BASE_URL}/api/products/${prodNoCrm1.id}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        name: prodNoCrm1.name,
        categoryId: 'cat_1',
        hasLamb: true,
        hasTwoTeeth: false,
        crmProductIndex: 99003,
      }),
    });
    assert(assignRes.status === 200, 'Assigned CRM index 99003 to second product');

    const clearRes = await fetch(`${BASE_URL}/api/products/${prodNoCrm1.id}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        name: prodNoCrm1.name,
        categoryId: 'cat_1',
        hasLamb: true,
        hasTwoTeeth: false,
        crmProductIndex: null,
      }),
    });
    assert(clearRes.status === 200, 'Cleared CRM index to null on edit');

    // Re-assign 99003 to prodNoCrm1 for bulk sync test
    await fetch(`${BASE_URL}/api/products/${prodNoCrm1.id}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        name: prodNoCrm1.name,
        categoryId: 'cat_1',
        hasLamb: true,
        hasTwoTeeth: false,
        crmProductIndex: 99003,
      }),
    });

    // 9. Safe disabled default: price change creates 'pending' log without transmitting to external CRM
    await fetch(`${BASE_URL}/api/products/prices`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        updates: [{ id: prod1.id, priceLamb: 250, priceTwoTeeth: null }],
      }),
    });
    await sleep(300);
    const pendingLogsRes = await fetch(`${BASE_URL}/api/crm/logs?productId=${prod1.id}`, { headers: authHeaders });
    const pendingLogsJson = await pendingLogsRes.json();
    for (const item of pendingLogsJson.items || []) createdLogIds.push(item.id);
    assert(
      pendingLogsJson.items.length > 0 && pendingLogsJson.items[0].status === 'pending',
      'Price change while liveTransmissionEnabled=false logs pending record without calling external API'
    );

    // 10. Enable CRM settings pointing to local mock server (with multiplier=1000 and short debounce)
    const updateCfgRes = await fetch(`${BASE_URL}/api/crm/settings`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        apiUrl: `http://127.0.0.1:${mockPort}/Product/Action/SetProductPrices`,
        priceUnitConfirmed: true,
        liveTransmissionEnabled: true,
        priceMultiplier: 1000,
        priceUnitLabel: 'تومان (× ۱,۰۰۰)',
        debounceMs: 250,
        timeoutMs: 3000,
        maxRetries: 2,
        retryDelayMs: 1000,
        batchSize: 50,
        rateLimitDelayMs: 0,
      }),
    });
    assert(updateCfgRes.status === 200, 'Configured CRM settings to point at mock server with multiplier 1000');

    // 11. Auto-sync + Coalescing rapid edits on prod1 (send 275 then immediately 300 -> mock should receive 300000!)
    mockPayloads = [];
    mockMode = 'ok';
    await fetch(`${BASE_URL}/api/products/prices`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        updates: [{ id: prod1.id, priceLamb: 275, priceTwoTeeth: null }],
      }),
    });
    await fetch(`${BASE_URL}/api/products/prices`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        updates: [{ id: prod1.id, priceLamb: 300, priceTwoTeeth: null }],
      }),
    });
    // Also update prodNoCrm2 (which has NO CRM index) -> should NOT trigger CRM call
    await fetch(`${BASE_URL}/api/products/prices`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        updates: [{ id: prodNoCrm2.id, priceLamb: 500, priceTwoTeeth: null }],
      }),
    });

    await sleep(700);
    const autoLogsRes = await fetch(`${BASE_URL}/api/crm/logs?productId=${prod1.id}`, { headers: authHeaders });
    const autoLogsJson = await autoLogsRes.json();
    for (const item of autoLogsJson.items || []) createdLogIds.push(item.id);
    const noCrmLogsRes = await fetch(`${BASE_URL}/api/crm/logs?productId=${prodNoCrm2.id}`, { headers: authHeaders });
    const noCrmLogsJson = await noCrmLogsRes.json();

    assert(
      mockPayloads.length === 1 && mockPayloads[0]['99001'] === 300000,
      `Rapid price edits coalesced into 1 CRM POST with final converted price 300000 (got ${JSON.stringify(mockPayloads)})`
    );
    assert(
      autoLogsJson.items[0]?.status === 'success' && autoLogsJson.items[0]?.sentPrice === 300000,
      'Auto-sync log recorded status=success and sentPrice=300000'
    );
    assert(
      noCrmLogsJson.total === 0,
      'Product without CRM index produces zero CRM sync logs when price changes'
    );

    // 12. Manual Bulk Sync (assign price to prodNoCrm1 first, then sync-all)
    await fetch(`${BASE_URL}/api/products/prices`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        updates: [{ id: prodNoCrm1.id, priceLamb: 420, priceTwoTeeth: null }],
      }),
    });
    await sleep(600);

    mockPayloads = [];
    mockMode = 'ok';
    const previewRes = await fetch(`${BASE_URL}/api/crm/bulk-preview`, { headers: authHeaders });
    const previewJson = await previewRes.json();
    assert(previewRes.status === 200 && previewJson.eligibleCount >= 2, `Bulk preview reports ${previewJson.eligibleCount} eligible products`);

    const syncAllRes = await fetch(`${BASE_URL}/api/crm/sync-all`, { method: 'POST', headers: authHeaders });
    const syncAllJson = await syncAllRes.json();
    assert(
      syncAllRes.status === 200 &&
        syncAllJson.transmitted === true &&
        syncAllJson.succeeded >= 2 &&
        syncAllJson.failed === 0 &&
        mockPayloads.length === 1 &&
        mockPayloads[0]['99001'] === 300000 &&
        mockPayloads[0]['99003'] === 420000 &&
        !Object.values(mockPayloads[0]).includes(500000),
      'Manual bulk sync sends only CRM-indexed products in { "index": price } format and marks success'
    );

    // 13. Partial updatedCount -> MUST be 'needs_review', NOT 'success'
    mockPayloads = [];
    mockMode = 'partial';
    const partialSyncRes = await fetch(`${BASE_URL}/api/crm/sync-all`, { method: 'POST', headers: authHeaders });
    const partialSyncJson = await partialSyncRes.json();
    assert(
      partialSyncRes.status === 200 &&
        partialSyncJson.succeeded === 0 &&
        partialSyncJson.needsReview >= 2,
      'When CRM returns updatedCount < sentCount, status is marked needs_review (never success)'
    );

    // 14. Unreachable / Failed CRM API when changing price: local price STILL saves, CRM log becomes 'failed', manual retry succeeds
    await new Promise<void>(resolve => mockServer.close(() => resolve()));

    const offlinePriceRes = await fetch(`${BASE_URL}/api/products/prices`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        updates: [{ id: prod1.id, priceLamb: 350, priceTwoTeeth: null }],
      }),
    });
    assert(offlinePriceRes.status === 200, 'Local price save succeeds even when CRM API is unreachable');

    // Confirm price was persisted in local DB
    const dbProd1 = sqliteDb.prepare('SELECT priceLamb FROM products WHERE id = ?').get(prod1.id) as any;
    assert(dbProd1?.priceLamb === 350, 'New price (350) persisted in local SQLite database while CRM offline');

    await sleep(800);
    const failedLogsRes = await fetch(`${BASE_URL}/api/crm/logs?productId=${prod1.id}`, { headers: authHeaders });
    const failedLogsJson = await failedLogsRes.json();
    const latestFailedLog = failedLogsJson.items[0];
    assert(
      latestFailedLog?.status === 'failed' && !!latestFailedLog?.errorMessage,
      `Offline CRM sync marked log as failed with error: "${latestFailedLog?.errorMessage}"`
    );

    // Bring mock server back online on same port & test manual retry
    const retryServer = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/Product/Action/SetProductPrices') {
        let body = '';
        req.on('data', c => (body += c));
        req.on('end', () => {
          const parsed = JSON.parse(body);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              data: { updatedCount: Object.keys(parsed).length },
              success: true,
              code: 0,
              msg: '',
              error: '',
            })
          );
        });
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    await new Promise<void>(resolve => retryServer.listen(mockPort, '127.0.0.1', () => resolve()));

    const retryRes = await fetch(`${BASE_URL}/api/crm/logs/${latestFailedLog.id}/retry`, {
      method: 'POST',
      headers: authHeaders,
    });
    const retryJson = await retryRes.json();
    const afterRetryLog = await (
      await fetch(`${BASE_URL}/api/crm/logs?productId=${prod1.id}`, { headers: authHeaders })
    ).json();
    assert(
      retryRes.status === 200 &&
        retryJson.succeeded === 1 &&
        afterRetryLog.items[0]?.status === 'success' &&
        afterRetryLog.items[0]?.retryCount >= 1,
      'Manual retry of failed log succeeded and incremented retryCount'
    );

    await new Promise<void>(resolve => retryServer.close(() => resolve()));

    // =========================================================================
    // MULTI-VARIANT CRM INDEX TESTS (e.g., بره + دودندان)
    // =========================================================================
    const multiProdRes = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        categoryId: 'cat_1',
        name: 'ران معمولی تستی',
        hasLamb: true,
        hasTwoTeeth: true,
        crmLambIndex: 99011,
        crmTwoTeethIndex: 99012,
      }),
    });
    const multiProd = await multiProdRes.json();
    if (multiProd?.id) createdProductIds.push(multiProd.id);
    assert(
      multiProdRes.status === 200 &&
        multiProd.crmLambIndex === 99011 &&
        multiProd.crmTwoTeethIndex === 99012 &&
        Array.isArray(multiProd.crmMappings) &&
        multiProd.crmMappings.length === 2,
      'Created multi-variant product with independent CRM indices (بره: 99011, دودندان: 99012)'
    );

    // Same index for both variants of same product -> rejected 409
    const selfDupRes = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        categoryId: 'cat_1',
        name: 'محصول تکراری داخلی',
        hasLamb: true,
        hasTwoTeeth: true,
        crmLambIndex: 99020,
        crmTwoTeethIndex: 99020,
      }),
    });
    const selfDupJson = await selfDupRes.json();
    assert(
      selfDupRes.status === 409 &&
        selfDupJson.error.includes('بره') &&
        selfDupJson.error.includes('دودندان'),
      `Duplicate index across two variants of same product rejected (409): "${selfDupJson.error}"`
    );

    // Cross-product duplicate check includes BOTH product name and variant label
    const crossDupRes = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        categoryId: 'cat_1',
        name: 'سردست تستی تکراری',
        hasLamb: true,
        hasTwoTeeth: true,
        crmLambIndex: 99021,
        crmTwoTeethIndex: 99011,
      }),
    });
    const crossDupJson = await crossDupRes.json();
    assert(
      crossDupRes.status === 409 &&
        crossDupJson.error.includes('ران معمولی تستی') &&
        crossDupJson.error.includes('بره'),
      `Cross-product duplicate variant index rejected (409) with product + variant name: "${crossDupJson.error}"`
    );

    // Re-open mock server to verify per-variant price transmission & outbound X-API-KEY header
    mockPayloads = [];
    let receivedMockHeaders: Array<http.IncomingHttpHeaders> = [];
    const multiMockServer = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/Product/Action/SetProductPrices') {
        receivedMockHeaders.push(req.headers);
        let body = '';
        req.on('data', c => (body += c));
        req.on('end', () => {
          const parsed = JSON.parse(body);
          mockPayloads.push(parsed);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              data: { updatedCount: Object.keys(parsed).length },
              success: true,
              code: 0,
              msg: '',
              error: '',
            })
          );
        });
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    await new Promise<void>(resolve => multiMockServer.listen(mockPort, '127.0.0.1', () => resolve()));

    try {
      // A) Update ONLY بره (priceLamb=250) -> MUST send ONLY "99011"
      mockPayloads = [];
      await fetch(`${BASE_URL}/api/products/prices`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          updates: [{ id: multiProd.id, priceLamb: 250, priceTwoTeeth: null }],
        }),
      });
      await sleep(700);
      assert(
        mockPayloads.length === 1 &&
          mockPayloads[0]['99011'] === 250000 &&
          mockPayloads[0]['99012'] === undefined,
        `Updating only بره sent ONLY CRM index 99011 (got ${JSON.stringify(mockPayloads)})`
      );

      // B) Update ONLY دودندان (priceTwoTeeth=380, keeping priceLamb=250) -> MUST send ONLY "99012"
      mockPayloads = [];
      await fetch(`${BASE_URL}/api/products/prices`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          updates: [{ id: multiProd.id, priceLamb: 250, priceTwoTeeth: 380 }],
        }),
      });
      await sleep(700);
      assert(
        mockPayloads.length === 1 &&
          mockPayloads[0]['99012'] === 380000 &&
          mockPayloads[0]['99011'] === undefined,
        `Updating only دودندان sent ONLY CRM index 99012 (got ${JSON.stringify(mockPayloads)})`
      );

      // C) Update BOTH variants -> MUST send BOTH in one batch
      mockPayloads = [];
      await fetch(`${BASE_URL}/api/products/prices`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          updates: [{ id: multiProd.id, priceLamb: 260, priceTwoTeeth: 390 }],
        }),
      });
      await sleep(700);
      assert(
        mockPayloads.length === 1 &&
          mockPayloads[0]['99011'] === 260000 &&
          mockPayloads[0]['99012'] === 390000,
        `Updating both بره & دودندان sent both 99011 & 99012 in one batch (got ${JSON.stringify(mockPayloads)})`
      );

      // D) Manual bulk sync includes both variant indices independently
      mockPayloads = [];
      const multiSyncAllRes = await fetch(`${BASE_URL}/api/crm/sync-all`, { method: 'POST', headers: authHeaders });
      const multiSyncAllJson = await multiSyncAllRes.json();
      assert(
        multiSyncAllRes.status === 200 &&
          multiSyncAllJson.succeeded >= 4 &&
          mockPayloads[0]?.['99011'] === 260000 &&
          mockPayloads[0]?.['99012'] === 390000,
        'Bulk sync sends both variant prices (99011 & 99012) alongside single-type products'
      );

      // E) Independent sync logs per variant & clearing one variant frees its index
      const multiLogsJson = await (
        await fetch(`${BASE_URL}/api/crm/logs?productId=${multiProd.id}`, { headers: authHeaders })
      ).json();
      const hasLambLog = multiLogsJson.items.some((l: any) => l.priceType === 'lamb' && l.crmProductIndex === 99011);
      const hasTwoTeethLog = multiLogsJson.items.some((l: any) => l.priceType === 'two_teeth' && l.crmProductIndex === 99012);
      assert(hasLambLog && hasTwoTeethLog, 'Logs track بره (99011) and دودندان (99012) independently');

      const clearVariantRes = await fetch(`${BASE_URL}/api/products/${multiProd.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          name: 'ران معمولی تستی',
          categoryId: 'cat_1',
          hasLamb: true,
          hasTwoTeeth: true,
          crmLambIndex: 99011,
          crmTwoTeethIndex: null,
        }),
      });
      assert(clearVariantRes.status === 200, 'Cleared دودندان CRM index while preserving بره index 99011');

      const reuseFreedRes = await fetch(`${BASE_URL}/api/products`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          categoryId: 'cat_1',
          name: 'محصول جایگزین شاخص آزادشده',
          hasLamb: false,
          hasTwoTeeth: false,
          crmProductIndex: 99012,
        }),
      });
      const reuseFreedJson = await reuseFreedRes.json();
      if (reuseFreedJson?.id) createdProductIds.push(reuseFreedJson.id);
      assert(reuseFreedRes.status === 200, 'Freed variant CRM index (99012) can be reassigned to another product');

      // =========================================================================
      // OUTBOUND CRM API KEY (X-API-KEY) STORAGE, MASKING & TRANSMISSION TESTS
      // =========================================================================
      const testSecretKey = 'secret-crm-test-key-9876';
      const saveKeyRes = await fetch(`${BASE_URL}/api/crm/settings`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          authType: 'api_key_header',
          authHeaderName: 'X-API-KEY',
          apiKey: testSecretKey,
        }),
      });
      const saveKeyRaw = await saveKeyRes.text();
      const saveKeyJson = JSON.parse(saveKeyRaw);
      assert(
        saveKeyRes.status === 200 &&
          saveKeyJson.hasApiKey === true &&
          saveKeyJson.apiKeySource === 'settings' &&
          typeof saveKeyJson.apiKeyMasked === 'string' &&
          saveKeyJson.apiKeyMasked.includes('9876') &&
          !saveKeyRaw.includes(testSecretKey),
        'Saving CRM API Key stores secret securely and returns only masked preview'
      );

      const getSettingsRes = await fetch(`${BASE_URL}/api/crm/settings`, { headers: authHeaders });
      const getSettingsRaw = await getSettingsRes.text();
      const getSettingsJson = JSON.parse(getSettingsRaw);
      assert(
        getSettingsRes.status === 200 &&
          getSettingsJson.hasApiKey === true &&
          getSettingsJson.apiKeySource === 'settings' &&
          !getSettingsRaw.includes(testSecretKey),
        'GET /api/crm/settings never exposes raw CRM API key'
      );

      const backupRaw = await (await fetch(`${BASE_URL}/api/backup`, { headers: authHeaders })).text();
      assert(!backupRaw.includes(testSecretKey) && !backupRaw.includes('crm_auth_secret'), 'GET /api/backup does not export CRM API secret');

      // Transmit with X-API-KEY
      receivedMockHeaders = [];
      mockPayloads = [];
      const keySyncRes = await fetch(`${BASE_URL}/api/crm/sync-all`, { method: 'POST', headers: authHeaders });
      assert(
        keySyncRes.status === 200 &&
          receivedMockHeaders.length >= 1 &&
          receivedMockHeaders[0]['x-api-key'] === testSecretKey,
        `CRM outbound POST sent X-API-KEY header with saved key (got "${receivedMockHeaders[0]?.['x-api-key'] ? '[present]' : '[missing]'}")`
      );

      // Update unrelated setting without apiKey -> key must be preserved
      const updateOtherRes = await fetch(`${BASE_URL}/api/crm/settings`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ debounceMs: 260 }),
      });
      const updateOtherJson = await updateOtherRes.json();
      assert(
        updateOtherRes.status === 200 &&
          updateOtherJson.hasApiKey === true &&
          updateOtherJson.apiKeySource === 'settings',
        'Updating other CRM settings without apiKey preserves existing saved key'
      );

      receivedMockHeaders = [];
      await fetch(`${BASE_URL}/api/crm/sync-all`, { method: 'POST', headers: authHeaders });
      assert(
        receivedMockHeaders.length >= 1 && receivedMockHeaders[0]['x-api-key'] === testSecretKey,
        'Preserved CRM API key continues to be sent in X-API-KEY header'
      );

      // Clear API Key
      const clearKeyRes = await fetch(`${BASE_URL}/api/crm/settings`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ clearApiKey: true }),
      });
      const clearKeyJson = await clearKeyRes.json();
      const dbSecretRow = sqliteDb.prepare("SELECT value FROM settings WHERE key = 'crm_auth_secret'").get();
      assert(
        clearKeyRes.status === 200 &&
          clearKeyJson.apiKeySource !== 'settings' &&
          !dbSecretRow,
        'clearApiKey: true removes crm_auth_secret row from SQLite'
      );

      receivedMockHeaders = [];
      await fetch(`${BASE_URL}/api/crm/sync-all`, { method: 'POST', headers: authHeaders });
      assert(
        receivedMockHeaders.length >= 1 && !receivedMockHeaders[0]['x-api-key'],
        'After clearing CRM API key, outbound POST omits X-API-KEY header'
      );
    } finally {
      await new Promise<void>(resolve => multiMockServer.close(() => resolve()));
    }
  } finally {
    // Cleanup test products, test logs, test price_history, and restore original CRM settings
    try {
      mockServer.close();
    } catch {}

    await fetch(`${BASE_URL}/api/crm/settings`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        apiUrl: origSettings.apiUrl,
        priceUnitConfirmed: origSettings.priceUnitConfirmed,
        liveTransmissionEnabled: origSettings.liveTransmissionEnabled,
        priceUnitLabel: origSettings.priceUnitLabel,
        priceMultiplier: origSettings.priceMultiplier,
        priceSource: origSettings.priceSource,
        authType: origSettings.authType,
        authHeaderName: origSettings.authHeaderName,
        clearApiKey: origSettings.apiKeySource !== 'settings',
        timeoutMs: origSettings.timeoutMs,
        maxRetries: origSettings.maxRetries,
        retryDelayMs: origSettings.retryDelayMs,
        batchSize: origSettings.batchSize,
        rateLimitDelayMs: origSettings.rateLimitDelayMs,
        debounceMs: origSettings.debounceMs,
        invalidIndexPolicy: origSettings.invalidIndexPolicy,
      }),
    });

    for (const pid of createdProductIds) {
      sqliteDb.prepare('DELETE FROM crm_sync_logs WHERE productId = ?').run(pid);
      sqliteDb.prepare('DELETE FROM price_history WHERE productId = ?').run(pid);
      sqliteDb.prepare('DELETE FROM product_crm_mappings WHERE productId = ?').run(pid);
      sqliteDb.prepare('DELETE FROM products WHERE id = ?').run(pid);
    }
    sqliteDb.prepare("DELETE FROM crm_sync_logs WHERE crmProductIndex IN (99001, 99002, 99003, 99011, 99012)").run();
  }

  // 15. Verify original database rows preserved
  const finalCategoriesCount = (sqliteDb.prepare('SELECT count(*) as c FROM categories').get() as any).c;
  const finalProductsCount = (sqliteDb.prepare('SELECT count(*) as c FROM products').get() as any).c;
  assert(
    finalCategoriesCount === initialCategoriesCount && finalProductsCount === initialProductsCount,
    `Database preserved: ${finalCategoriesCount} categories, ${finalProductsCount} products`
  );

  sqliteDb.close();

  console.log('\n====================================================');
  console.log(`CRM TEST SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('CRM test suite failed:', err);
  process.exit(1);
});
