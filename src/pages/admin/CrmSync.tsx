import React, { useState, useEffect, useCallback } from 'react';
import { useDB } from '../../lib/useDB';
import {
  db,
  CrmSyncStats,
  CrmSettings,
  CrmSyncLog,
  CrmBulkPreview,
  CrmSyncStatus,
} from '../../lib/db';
import { formatPersianDate, formatNumber, cn } from '../../lib/utils';
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Send,
  RotateCcw,
  Settings as SettingsIcon,
  ShieldAlert,
  Link2,
  Unlink,
  Loader2,
  Filter,
  Eye,
  X,
  Check,
  Info,
  Activity,
} from 'lucide-react';

const STATUS_META: Record<
  CrmSyncStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  pending: {
    label: 'در انتظار ارسال',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    dotClass: 'bg-slate-400',
  },
  sending: {
    label: 'در حال ارسال',
    badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    dotClass: 'bg-blue-500 animate-pulse',
  },
  success: {
    label: 'موفق',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    dotClass: 'bg-emerald-500',
  },
  failed: {
    label: 'ناموفق',
    badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    dotClass: 'bg-rose-500',
  },
  needs_review: {
    label: 'نیازمند بررسی',
    badgeClass: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    dotClass: 'bg-amber-500',
  },
};

const OPERATION_LABELS: Record<string, string> = {
  auto: 'خودکار',
  manual: 'دستی (گروهی)',
  retry: 'تلاش مجدد',
};

export function CrmSync() {
  const { user, products } = useDB();
  const [activeTab, setActiveTab] = useState<'logs' | 'settings'>('logs');
  const [stats, setStats] = useState<CrmSyncStats | null>(null);
  const [crmSettings, setCrmSettings] = useState<CrmSettings | null>(null);
  const [settingsForm, setSettingsForm] = useState<CrmSettings | null>(null);
  const [logs, setLogs] = useState<CrmSyncLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);

  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [operationFilter, setOperationFilter] = useState<string>('all');
  const [dateRangePreset, setDateRangePreset] = useState<'all' | 'today' | '7d' | '30d' | 'custom'>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Modals
  const [bulkPreview, setBulkPreview] = useState<CrmBulkPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [selectedLogDetail, setSelectedLogDetail] = useState<CrmSyncLog | null>(null);

  const showToast = (type: 'success' | 'error' | 'warning', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const computeDateBounds = useCallback(() => {
    if (dateRangePreset === 'all') return { from: undefined, to: undefined };
    const now = new Date();
    if (dateRangePreset === 'today') {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { from: start.toISOString(), to: undefined };
    }
    if (dateRangePreset === '7d') {
      return { from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), to: undefined };
    }
    if (dateRangePreset === '30d') {
      return { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), to: undefined };
    }
    return {
      from: fromDate ? new Date(`${fromDate}T00:00:00.000Z`).toISOString() : undefined,
      to: toDate ? new Date(`${toDate}T23:59:59.999Z`).toISOString() : undefined,
    };
  }, [dateRangePreset, fromDate, toDate]);

  const fetchAll = useCallback(async () => {
    if (user?.role !== 'admin') return;
    try {
      setIsLoading(true);
      const bounds = computeDateBounds();
      const [fetchedStats, fetchedSettings, fetchedLogs] = await Promise.all([
        db.getCrmStats(),
        db.getCrmSettings(),
        db.getCrmLogs({
          status: statusFilter,
          productId: productFilter,
          operationType: operationFilter,
          from: bounds.from,
          to: bounds.to,
          limit: 150,
        }),
      ]);
      setStats(fetchedStats);
      setCrmSettings(fetchedSettings);
      setSettingsForm(prev => prev ?? fetchedSettings);
      setLogs(fetchedLogs.items);
      setTotalLogs(fetchedLogs.total);
    } catch (err: any) {
      showToast('error', err.message || 'خطا در دریافت اطلاعات همگام‌سازی CRM.');
    } finally {
      setIsLoading(false);
    }
  }, [user, statusFilter, productFilter, operationFilter, computeDateBounds]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleOpenBulkSyncModal = async () => {
    try {
      setIsLoadingPreview(true);
      const preview = await db.getCrmBulkPreview();
      setBulkPreview(preview);
    } catch (err: any) {
      showToast('error', err.message || 'خطا در دریافت پیش‌نمایش همگام‌سازی گروهی.');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleConfirmBulkSync = async () => {
    try {
      setIsSyncing(true);
      const res = await db.syncAllToCrm();
      setBulkPreview(null);
      if (!res.transmitted && res.reason === 'LIVE_TRANSMISSION_DISABLED') {
        showToast(
          'warning',
          `${res.pending} محصول در صف انتظار ثبت شد، اما به دلیل غیرفعال بودن ارسال واقعی، درخواستی به سرور CRM ارسال نگردید.`
        );
      } else if (!res.transmitted && res.reason === 'NO_ELIGIBLE_PRODUCTS') {
        showToast('warning', 'هیچ محصول واجد شرایطی برای همگام‌سازی یافت نشد.');
      } else if (res.failed > 0 || res.needsReview > 0) {
        showToast(
          'warning',
          `همگام‌سازی انجام شد: ${res.succeeded} موفق، ${res.needsReview} نیازمند بررسی، ${res.failed} ناموفق.`
        );
      } else {
        showToast('success', `همگام‌سازی گروهی ${res.succeeded} محصول با موفقیت انجام شد.`);
      }
      await fetchAll();
    } catch (err: any) {
      showToast('error', err.message || 'خطا در اجرای همگام‌سازی گروهی.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRetryAllFailed = async () => {
    try {
      setIsSyncing(true);
      const res = await db.retryFailedCrmLogs({
        includePending: Boolean(crmSettings?.liveTransmissionEnabled),
      });
      if (!res.transmitted && res.reason === 'NO_RETRYABLE_LOGS') {
        showToast('warning', 'مورد ناموفق یا نیازمند بررسی برای ارسال مجدد وجود ندارد.');
      } else if (!res.transmitted && res.reason === 'LIVE_TRANSMISSION_DISABLED') {
        showToast('warning', 'ارسال واقعی غیرفعال است. ابتدا در تب تنظیمات، واحد قیمت و ارسال واقعی را تایید و فعال کنید.');
      } else {
        showToast(
          res.failed === 0 && res.needsReview === 0 ? 'success' : 'warning',
          `نتیجه ارسال مجدد: ${res.succeeded} موفق، ${res.needsReview} نیازمند بررسی، ${res.failed} ناموفق.`
        );
      }
      await fetchAll();
    } catch (err: any) {
      showToast('error', err.message || 'خطا در ارسال مجدد موارد ناموفق.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRetrySingle = async (logId: string) => {
    try {
      setRetryingLogId(logId);
      const res = await db.retryCrmLogById(logId);
      if (!res.transmitted && res.reason === 'LIVE_TRANSMISSION_DISABLED') {
        showToast('warning', 'ارسال واقعی غیرفعال است؛ برای ارسال درخواست، ابتدا ارسال واقعی را فعال کنید.');
      } else if (res.succeeded > 0) {
        showToast('success', 'ارسال مجدد محصول با موفقیت انجام شد.');
      } else if (res.needsReview > 0) {
        showToast('warning', 'عملیات نیازمند بررسی ثبت شد (عدم تطابق تعداد رکوردهای بروزرسانی‌شده).');
      } else {
        showToast('error', 'ارسال مجدد ناموفق بود. جزئیات خطا در گزارش ثبت شد.');
      }
      await fetchAll();
    } catch (err: any) {
      showToast('error', err.message || 'خطا در ارسال مجدد.');
    } finally {
      setRetryingLogId(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsForm) return;
    try {
      setIsSavingSettings(true);
      const updated = await db.updateCrmSettings(settingsForm);
      setCrmSettings(updated);
      setSettingsForm(updated);
      showToast('success', 'تنظیمات اتصال و همگام‌سازی CRM با موفقیت ذخیره شد.');
      await fetchAll();
    } catch (err: any) {
      showToast('error', err.message || 'خطا در ذخیره تنظیمات CRM.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  if (user && user.role !== 'admin') {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-950/40 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-surface-900 dark:text-white">دسترسی محدود شده</h2>
        <p className="text-surface-600 dark:text-surface-400 text-sm">
          مدیریت همگام‌سازی و تنظیمات اتصال به CRM صرفاً در اختیار مدیر ارشد سیستم است.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {toast && (
        <div
          className={cn(
            'p-4 rounded-xl flex items-center gap-3 fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-[440px] z-50 shadow-lg animate-in fade-in slide-in-from-top-4',
            toast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : toast.type === 'warning'
              ? 'bg-amber-600 text-white'
              : 'bg-rose-600 text-white'
          )}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : toast.type === 'warning' ? (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <p className="font-medium text-sm">{toast.message}</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-surface-900 p-6 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 rounded-xl text-primary dark:text-white">
              <RefreshCw className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-surface-900 dark:text-white">همگامسازی با CRM</h1>
            {stats && (
              <span
                className={cn(
                  'px-2.5 py-0.5 rounded-full text-xs font-bold border',
                  stats.liveTransmissionEnabled
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                )}
              >
                {stats.liveTransmissionEnabled ? 'ارسال واقعی فعال' : 'ارسال واقعی متوقف (حالت ایمن)'}
              </span>
            )}
          </div>
          <p className="text-surface-500 dark:text-surface-400 text-sm">
            مدیریت ارتباط با API پلتفرم CRM، پایش وضعیت ارسال خودکار قیمت‌ها، همگام‌سازی گروهی و ارسال مجدد موارد ناموفق.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <button
            onClick={handleRetryAllFailed}
            disabled={isSyncing}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-bold text-sm transition-colors disabled:opacity-50"
          >
            <RotateCcw className={cn('w-4 h-4', isSyncing && 'animate-spin')} />
            ارسال مجدد ناموفق‌ها
            {stats && stats.failedProductsCount + stats.needsReviewProductsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-600 text-white text-[11px] font-mono">
                {stats.failedProductsCount + stats.needsReviewProductsCount}
              </span>
            )}
          </button>

          <button
            onClick={handleOpenBulkSyncModal}
            disabled={isSyncing || isLoadingPreview}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm shadow-primary/20 transition-colors disabled:opacity-50"
          >
            {isLoadingPreview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            همگامسازی همه قیمت‌ها
          </button>
        </div>
      </div>

      {/* Safety Notice Banner when live transmission is disabled */}
      {crmSettings && !crmSettings.liveTransmissionEnabled && (
        <div className="bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1 leading-relaxed">
              <p className="font-bold text-sm">ارسال واقعی به سرور CRM فعلاً غیرفعال است</p>
              <p>
                تا زمان تایید واحد صحیح قیمت (تومان، ریال یا هزار تومان) با برنامه‌نویس CRM، درخواست‌های واقعی به سرور مقصد ارسال نمی‌شوند و تغییرات قیمت فقط در صف انتظار ثبت می‌گردند. پس از تایید واحد قیمت، از بخش تنظیمات اتصال آن را فعال نمایید.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('settings')}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition-colors"
          >
            تنظیمات واحد قیمت و اتصال
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-surface-900 p-5 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-xs flex items-start gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <Link2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-surface-500 dark:text-surface-400 font-medium">دارای شاخص CRM</p>
            <p className="text-2xl font-black text-surface-900 dark:text-white mt-1">
              {stats ? formatNumber(stats.withCrmIndex) : '—'}
            </p>
            <p className="text-[11px] text-surface-400 mt-0.5">
              از مجموع {stats ? formatNumber(stats.totalProducts) : '—'} محصول
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-900 p-5 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-xs flex items-start gap-4">
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <Unlink className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-surface-500 dark:text-surface-400 font-medium">فاقد شاخص CRM</p>
            <p className="text-2xl font-black text-surface-900 dark:text-white mt-1">
              {stats ? formatNumber(stats.withoutCrmIndex) : '—'}
            </p>
            <p className="text-[11px] text-surface-400 mt-0.5">درخواست ارسال نخواهند داشت</p>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-900 p-5 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-xs flex items-start gap-4">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
            <Activity className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-surface-500 dark:text-surface-400 font-medium">وضعیت همگام‌سازی اقلام متصل</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                {stats ? formatNumber(stats.syncedProductsCount) : '—'} همگام
              </span>
              <span className="text-surface-300">/</span>
              <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                {stats ? formatNumber(stats.unsyncedProductsCount) : '—'} همگام‌نشده
              </span>
            </div>
            {stats && (stats.failedProductsCount > 0 || stats.needsReviewProductsCount > 0 || stats.pendingProductsCount > 0) && (
              <p className="text-[11px] text-surface-500 mt-0.5">
                {stats.failedProductsCount > 0 && `${stats.failedProductsCount} ناموفق`}
                {stats.needsReviewProductsCount > 0 && ` • ${stats.needsReviewProductsCount} نیازمند بررسی`}
                {stats.pendingProductsCount > 0 && ` • ${stats.pendingProductsCount} در انتظار`}
              </p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-surface-900 p-5 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-xs flex items-start gap-4">
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-surface-500 dark:text-surface-400 font-medium">آخرین همگام‌سازی موفق</p>
            <p className="text-sm font-bold text-surface-900 dark:text-white mt-2">
              {stats?.lastSyncAt ? formatPersianDate(stats.lastSyncAt, true) : 'هنوز انجام نشده'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-surface-200 dark:border-surface-800">
        <button
          onClick={() => setActiveTab('logs')}
          className={cn(
            'px-5 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2',
            activeTab === 'logs'
              ? 'border-primary text-primary dark:text-white'
              : 'border-transparent text-surface-500 hover:text-surface-800 dark:hover:text-surface-200'
          )}
        >
          <Activity className="w-4 h-4" />
          تاریخچه و گزارش همگام‌سازی
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={cn(
            'px-5 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2',
            activeTab === 'settings'
              ? 'border-primary text-primary dark:text-white'
              : 'border-transparent text-surface-500 hover:text-surface-800 dark:hover:text-surface-200'
          )}
        >
          <SettingsIcon className="w-4 h-4" />
          تنظیمات اتصال و واحد قیمت CRM
        </button>
      </div>

      {/* LOGS TAB */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white dark:bg-surface-900 p-4 rounded-2xl border border-surface-200 dark:border-surface-800 flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-2 text-surface-600 dark:text-surface-400 text-xs font-bold pb-2.5">
              <Filter className="w-4 h-4" />
              فیلترها:
            </div>

            <div className="space-y-1 min-w-[150px] flex-1 sm:flex-none">
              <label className="text-[11px] font-bold text-surface-500">وضعیت</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 dark:text-white text-xs focus:outline-none"
              >
                <option value="all">همه وضعیت‌ها</option>
                <option value="pending">در انتظار ارسال</option>
                <option value="sending">در حال ارسال</option>
                <option value="success">موفق</option>
                <option value="failed">ناموفق</option>
                <option value="needs_review">نیازمند بررسی</option>
              </select>
            </div>

            <div className="space-y-1 min-w-[180px] flex-1 sm:flex-none">
              <label className="text-[11px] font-bold text-surface-500">محصول</label>
              <select
                value={productFilter}
                onChange={e => setProductFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 dark:text-white text-xs focus:outline-none"
              >
                <option value="all">همه محصولات</option>
                {products
                  .filter(p => p.crmProductIndex != null)
                  .map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (#{p.crmProductIndex})
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1 min-w-[130px] flex-1 sm:flex-none">
              <label className="text-[11px] font-bold text-surface-500">نوع عملیات</label>
              <select
                value={operationFilter}
                onChange={e => setOperationFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 dark:text-white text-xs focus:outline-none"
              >
                <option value="all">همه انواع</option>
                <option value="auto">خودکار</option>
                <option value="manual">دستی (گروهی)</option>
                <option value="retry">تلاش مجدد</option>
              </select>
            </div>

            <div className="space-y-1 min-w-[140px] flex-1 sm:flex-none">
              <label className="text-[11px] font-bold text-surface-500">بازه زمانی</label>
              <select
                value={dateRangePreset}
                onChange={e => setDateRangePreset(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 dark:text-white text-xs focus:outline-none"
              >
                <option value="all">همه زمان‌ها</option>
                <option value="today">امروز</option>
                <option value="7d">۷ روز گذشته</option>
                <option value="30d">۳۰ روز گذشته</option>
                <option value="custom">بازه دلخواه</option>
              </select>
            </div>

            {dateRangePreset === 'custom' && (
              <>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-surface-500">از تاریخ</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={e => setFromDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 dark:text-white text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-surface-500">تا تاریخ</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={e => setToDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 dark:text-white text-xs"
                  />
                </div>
              </>
            )}

            <button
              onClick={fetchAll}
              className="mr-auto px-3.5 py-2 rounded-xl border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 text-xs font-bold text-surface-700 dark:text-surface-300 flex items-center gap-1.5"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
              بروزرسانی
            </button>
          </div>

          {/* Logs Table */}
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between">
              <h2 className="font-bold text-surface-900 dark:text-white text-base">
                گزارش عملیات همگام‌سازی
              </h2>
              <span className="text-xs bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 px-2.5 py-1 rounded-full font-mono">
                {totalLogs} رکورد
              </span>
            </div>

            {isLoading ? (
              <div className="p-16 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <span className="text-xs text-surface-500">در حال دریافت گزارش‌ها...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-16 text-center space-y-2">
                <p className="text-surface-600 dark:text-surface-400 text-sm font-medium">
                  هنوز عملیات همگام‌سازی با فیلترهای انتخاب‌شده ثبت نشده است.
                </p>
                <p className="text-xs text-surface-400">
                  پس از تعیین شاخص CRM برای محصولات و تغییر قیمت یا اجرای همگام‌سازی گروهی، گزارش‌ها در این جدول نمایش داده می‌شوند.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-800 text-xs text-surface-600 dark:text-surface-400">
                    <tr>
                      <th className="px-4 py-3.5 font-bold">محصول / شاخص CRM</th>
                      <th className="px-4 py-3.5 font-bold">قیمت ارسالی</th>
                      <th className="px-4 py-3.5 font-bold">نوع</th>
                      <th className="px-4 py-3.5 font-bold">وضعیت</th>
                      <th className="px-4 py-3.5 font-bold">تلاش مجدد</th>
                      <th className="px-4 py-3.5 font-bold">تاریخ و ساعت</th>
                      <th className="px-4 py-3.5 font-bold">پاسخ / خطا</th>
                      <th className="px-4 py-3.5 font-bold text-left">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                    {logs.map(log => {
                      const statusMeta = STATUS_META[log.status] || STATUS_META.pending;
                      const canRetry =
                        log.status === 'failed' ||
                        log.status === 'needs_review' ||
                        log.status === 'pending';
                      return (
                        <tr key={log.id} className="hover:bg-surface-50/40 dark:hover:bg-surface-800/40">
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-surface-900 dark:text-white">{log.productName}</div>
                            <div className="text-xs font-mono text-surface-500 mt-0.5" dir="ltr" style={{ textAlign: 'right' }}>
                              CRM #{log.crmProductIndex}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-bold font-mono text-surface-900 dark:text-white">
                              {formatNumber(log.sentPrice)}
                            </div>
                            {log.rawPrice !== null && log.rawPrice !== log.sentPrice && (
                              <div className="text-[11px] text-surface-400">
                                پایه: {formatNumber(log.rawPrice)}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-surface-600 dark:text-surface-300">
                            {OPERATION_LABELS[log.operationType] || log.operationType}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border',
                                statusMeta.badgeClass
                              )}
                            >
                              <span className={cn('w-1.5 h-1.5 rounded-full', statusMeta.dotClass)} />
                              {statusMeta.label}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-xs font-mono text-surface-600 dark:text-surface-400">
                            {formatNumber(log.retryCount)}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-surface-600 dark:text-surface-400">
                            {formatPersianDate(log.sentAt || log.createdAt, true)}
                          </td>
                          <td className="px-4 py-3.5 max-w-[220px]">
                            {log.errorMessage ? (
                              <p className="text-xs text-rose-600 dark:text-rose-400 truncate" title={log.errorMessage}>
                                {log.errorMessage}
                              </p>
                            ) : log.apiResponse ? (
                              <p className="text-xs font-mono text-emerald-700 dark:text-emerald-400 truncate" dir="ltr">
                                {log.updatedCount != null ? `updatedCount: ${log.updatedCount}/${log.batchSize}` : log.apiResponse}
                              </p>
                            ) : (
                              <span className="text-xs text-surface-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-left">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedLogDetail(log)}
                                className="p-1.5 rounded-lg bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-300"
                                title="مشاهده جزئیات کامل"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {canRetry && (
                                <button
                                  onClick={() => handleRetrySingle(log.id)}
                                  disabled={retryingLogId === log.id}
                                  className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                                  title="ارسال مجدد"
                                >
                                  {retryingLogId === log.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  )}
                                  ارسال مجدد
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SETTINGS TAB */}
      {activeTab === 'settings' && settingsForm && (
        <form
          onSubmit={handleSaveSettings}
          className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm p-6 space-y-6"
        >
          <div className="border-b border-surface-200 dark:border-surface-800 pb-4">
            <h2 className="text-lg font-bold text-surface-900 dark:text-white">پیکربندی اتصال و سیاست همگام‌سازی CRM</h2>
            <p className="text-xs text-surface-500 mt-1">
              آدرس API، واحد قیمت، محدودیت دسته‌بندی درخواست‌ها و تنظیمات تلاش مجدد در این بخش مدیریت می‌شوند. مقادیر محرمانه احراز هویت تنها از متغیرهای محیطی سرور خوانده می‌شوند.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-surface-700 dark:text-surface-300">آدرس API مقصد (SetProductPrices)</label>
              <input
                type="url"
                value={settingsForm.apiUrl}
                onChange={e => setSettingsForm({ ...settingsForm, apiUrl: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 dark:text-white font-mono text-sm text-left"
                dir="ltr"
                required
              />
            </div>

            {/* Price Unit Confirmation & Multiplier */}
            <div className="md:col-span-2 p-4 rounded-2xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 space-y-4">
              <div className="flex items-start gap-2.5">
                <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs text-surface-700 dark:text-surface-300">
                  <p className="font-bold text-sm">تنظیم واحد قیمت ارسالی به CRM</p>
                  <p>
                    قیمت‌های این سیستم ممکن است بر حسب «هزار تومان»، «تومان» یا «ریال» تعریف شده باشند. پیش از فعال‌سازی ارسال واقعی، واحد مورد انتظار CRM را با برنامه‌نویس CRM استعلام و ضریب تبدیل مناسب را انتخاب کنید.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-surface-700 dark:text-surface-300">پیش‌تنظیم ضریب تبدیل</label>
                  <select
                    value={String(settingsForm.priceMultiplier)}
                    onChange={e => {
                      const val = Number(e.target.value);
                      const labelMap: Record<number, string> = {
                        1: 'بدون تبدیل (× ۱)',
                        10: 'تبدیل تومان به ریال (× ۱۰)',
                        1000: 'تبدیل هزار تومان به تومان (× ۱,۰۰۰)',
                        10000: 'تبدیل هزار تومان به ریال (× ۱۰,۰۰۰)',
                      };
                      setSettingsForm({
                        ...settingsForm,
                        priceMultiplier: val,
                        priceUnitLabel: labelMap[val] || settingsForm.priceUnitLabel,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 dark:text-white text-xs"
                  >
                    <option value="1">بدون تبدیل (× ۱)</option>
                    <option value="10">ضرب در ۱۰</option>
                    <option value="1000">ضرب در ۱,۰۰۰</option>
                    <option value="10000">ضرب در ۱۰,۰۰۰</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-surface-700 dark:text-surface-300">ضریب عددی دقیق</label>
                  <input
                    type="number"
                    step="any"
                    min="0.0001"
                    value={settingsForm.priceMultiplier}
                    onChange={e =>
                      setSettingsForm({
                        ...settingsForm,
                        priceMultiplier: Math.max(0.0001, Number(e.target.value) || 1),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 dark:text-white font-mono text-sm text-left"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-surface-700 dark:text-surface-300">شرح واحد ارسالی</label>
                  <input
                    type="text"
                    value={settingsForm.priceUnitLabel}
                    onChange={e => setSettingsForm({ ...settingsForm, priceUnitLabel: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 dark:text-white text-xs"
                  />
                </div>
              </div>

              <div className="text-xs text-surface-600 dark:text-surface-400 bg-white dark:bg-surface-900 px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700">
                نمونه تبدیل: اگر قیمت ثبت‌شده در پنل <strong>۲۵۰</strong> باشد، مقدار ارسالی به CRM برابر{' '}
                <strong className="font-mono text-primary">
                  {formatNumber(Math.round(250 * (settingsForm.priceMultiplier || 1)))}
                </strong>{' '}
                خواهد بود.
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsForm.priceUnitConfirmed}
                    onChange={e => {
                      const confirmed = e.target.checked;
                      setSettingsForm({
                        ...settingsForm,
                        priceUnitConfirmed: confirmed,
                        liveTransmissionEnabled: confirmed ? settingsForm.liveTransmissionEnabled : false,
                      });
                    }}
                    className="w-4 h-4 rounded text-primary"
                  />
                  <span className="text-xs font-bold text-surface-800 dark:text-surface-200">
                    واحد صحیح قیمت از برنامه‌نویس CRM استعلام و تایید شده است
                  </span>
                </label>

                <label
                  className={cn(
                    'flex items-center gap-2.5',
                    settingsForm.priceUnitConfirmed ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <input
                    type="checkbox"
                    disabled={!settingsForm.priceUnitConfirmed}
                    checked={settingsForm.liveTransmissionEnabled}
                    onChange={e =>
                      setSettingsForm({ ...settingsForm, liveTransmissionEnabled: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    فعال‌سازی ارسال واقعی قیمت‌ها به سرور CRM
                  </span>
                </label>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-surface-700 dark:text-surface-300">اولویت منبع قیمت (اقلام دو قیمتی)</label>
              <select
                value={settingsForm.priceSource}
                onChange={e => setSettingsForm({ ...settingsForm, priceSource: e.target.value as any })}
                className="w-full px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 dark:text-white text-xs"
              >
                <option value="lamb_then_two_teeth">ابتدا قیمت بره / قیمت واحد (و در صورت نبود، دودندان)</option>
                <option value="two_teeth_then_lamb">ابتدا قیمت دودندان (و در صورت نبود، بره / قیمت واحد)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-surface-700 dark:text-surface-300">رفتار در مواجهه با عدم تطابق updatedCount</label>
              <select
                value={settingsForm.invalidIndexPolicy}
                onChange={e => setSettingsForm({ ...settingsForm, invalidIndexPolicy: e.target.value as any })}
                className="w-full px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 dark:text-white text-xs"
              >
                <option value="needs_review">ثبت با وضعیت «نیازمند بررسی» (توصیه‌شده)</option>
                <option value="fail_batch">علامت‌گذاری بسته به عنوان «ناموفق»</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-surface-700 dark:text-surface-300">نوع احراز هویت API مقصد</label>
              <select
                value={settingsForm.authType}
                onChange={e => setSettingsForm({ ...settingsForm, authType: e.target.value as any })}
                className="w-full px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 dark:text-white text-xs"
              >
                <option value="none">بدون احراز هویت هدر (پیش‌فرض فعلی)</option>
                <option value="bearer">Bearer Token (خوانده‌شده از CRM_API_AUTH_TOKEN در سرور)</option>
                <option value="api_key_header">هدر کلید API سفارشی (خوانده‌شده از CRM_API_AUTH_TOKEN)</option>
              </select>
              <p className="text-[11px] text-surface-400">
                وضعیت توکن محیطی سرور:{' '}
                <strong className={settingsForm.hasEnvAuthToken ? 'text-emerald-600' : 'text-surface-500'}>
                  {settingsForm.hasEnvAuthToken ? 'تنظیم شده در Environment Variables' : 'تنظیم نشده'}
                </strong>
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-surface-700 dark:text-surface-300">نام هدر احراز هویت</label>
              <input
                type="text"
                value={settingsForm.authHeaderName}
                onChange={e => setSettingsForm({ ...settingsForm, authHeaderName: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 dark:text-white font-mono text-xs text-left"
                dir="ltr"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-surface-700 dark:text-surface-300">مهلت زمانی درخواست (Timeout - میلی‌ثانیه)</label>
              <input
                type="number"
                min={1000}
                max={60000}
                value={settingsForm.timeoutMs}
                onChange={e => setSettingsForm({ ...settingsForm, timeoutMs: Number(e.target.value) })}
                className="w-full px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 dark:text-white font-mono text-sm text-left"
                dir="ltr"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-surface-700 dark:text-surface-300">حداکثر تعداد تلاش مجدد خودکار</label>
              <input
                type="number"
                min={0}
                max={10}
                value={settingsForm.maxRetries}
                onChange={e => setSettingsForm({ ...settingsForm, maxRetries: Number(e.target.value) })}
                className="w-full px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 dark:text-white font-mono text-sm text-left"
                dir="ltr"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-surface-700 dark:text-surface-300">فاصله پایه تلاش مجدد (میلی‌ثانیه)</label>
              <input
                type="number"
                min={1000}
                max={3600000}
                value={settingsForm.retryDelayMs}
                onChange={e => setSettingsForm({ ...settingsForm, retryDelayMs: Number(e.target.value) })}
                className="w-full px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 dark:text-white font-mono text-sm text-left"
                dir="ltr"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-surface-700 dark:text-surface-300">حداکثر تعداد محصول در هر درخواست (Batch Size)</label>
              <input
                type="number"
                min={1}
                max={500}
                value={settingsForm.batchSize}
                onChange={e => setSettingsForm({ ...settingsForm, batchSize: Number(e.target.value) })}
                className="w-full px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 dark:text-white font-mono text-sm text-left"
                dir="ltr"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-surface-700 dark:text-surface-300">فاصله بین دسته‌های ارسال گروهی (میلی‌ثانیه)</label>
              <input
                type="number"
                min={0}
                max={30000}
                value={settingsForm.rateLimitDelayMs}
                onChange={e => setSettingsForm({ ...settingsForm, rateLimitDelayMs: Number(e.target.value) })}
                className="w-full px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 dark:text-white font-mono text-sm text-left"
                dir="ltr"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-surface-700 dark:text-surface-300">پنجره تجمیع تغییرات سریع قیمت (Debounce - میلی‌ثانیه)</label>
              <input
                type="number"
                min={0}
                max={30000}
                value={settingsForm.debounceMs}
                onChange={e => setSettingsForm({ ...settingsForm, debounceMs: Number(e.target.value) })}
                className="w-full px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 dark:text-white font-mono text-sm text-left"
                dir="ltr"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-surface-200 dark:border-surface-800">
            <button
              type="submit"
              disabled={isSavingSettings}
              className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {isSavingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              ذخیره تنظیمات CRM
            </button>
          </div>
        </form>
      )}

      {/* BULK SYNC CONFIRMATION MODAL */}
      {bulkPreview && (
        <div className="fixed inset-0 bg-surface-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-surface-900 rounded-2xl w-full max-w-lg shadow-2xl border border-surface-200 dark:border-surface-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between">
              <h3 className="font-black text-lg text-surface-900 dark:text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-primary" />
                تایید همگام‌سازی گروهی قیمت‌ها با CRM
              </h3>
              <button onClick={() => setBulkPreview(null)} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {!bulkPreview.liveTransmissionEnabled && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  <strong>توجه:</strong> ارسال واقعی فعلاً غیرفعال است. در صورت تایید، اقلام در صف انتظار ثبت می‌شوند اما درخواست HTTP به سرور CRM ارسال نخواهد شد.
                </div>
              )}

              <div className="bg-surface-50 dark:bg-surface-800/60 rounded-xl p-4 space-y-2 text-sm border border-surface-200 dark:border-surface-700">
                <div className="flex justify-between">
                  <span className="text-surface-500">محصولات واجد شرایط ارسال:</span>
                  <span className="font-black text-primary dark:text-white">{formatNumber(bulkPreview.eligibleCount)} محصول</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-500">دارای شاخص ولی بدون قیمت:</span>
                  <span className="font-bold text-surface-700 dark:text-surface-300">{formatNumber(bulkPreview.missingPriceWithIndexCount)} محصول</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-500">فاقد شاخص CRM (ارسال نمی‌شوند):</span>
                  <span className="font-bold text-surface-700 dark:text-surface-300">{formatNumber(bulkPreview.withoutCrmIndex)} محصول</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-500">ضریب و واحد فعلی:</span>
                  <span className="font-bold text-surface-800 dark:text-surface-200 text-xs">{bulkPreview.priceUnitLabel} (×{bulkPreview.priceMultiplier})</span>
                </div>
              </div>

              {bulkPreview.eligibleCount > 0 ? (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-surface-600 dark:text-surface-400">نمونه ساختار ارسالی (Payload):</span>
                  <pre className="bg-surface-900 text-emerald-300 p-3 rounded-xl text-xs font-mono overflow-x-auto text-left" dir="ltr">
                    {JSON.stringify(bulkPreview.samplePayload, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 text-xs text-rose-700 dark:text-rose-300">
                  هیچ محصولی که هم شاخص CRM و هم قیمت ثبت‌شده داشته باشد یافت نشد.
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-surface-200 dark:border-surface-800">
                <button
                  type="button"
                  onClick={() => setBulkPreview(null)}
                  className="px-4 py-2 rounded-xl border border-surface-200 dark:border-surface-700 text-sm font-medium"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  disabled={isSyncing || bulkPreview.eligibleCount === 0}
                  onClick={handleConfirmBulkSync}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50"
                >
                  {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  تایید و شروع همگام‌سازی ({formatNumber(bulkPreview.eligibleCount)} محصول)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOG DETAIL MODAL */}
      {selectedLogDetail && (
        <div className="fixed inset-0 bg-surface-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-surface-900 rounded-2xl w-full max-w-lg shadow-2xl border border-surface-200 dark:border-surface-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between">
              <h3 className="font-bold text-base text-surface-900 dark:text-white">
                جزئیات عملیات همگام‌سازی
              </h3>
              <button onClick={() => setSelectedLogDetail(null)} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-surface-50 dark:bg-surface-800/60 p-3.5 rounded-xl">
                <div><span className="text-surface-500">محصول:</span> <strong>{selectedLogDetail.productName}</strong></div>
                <div><span className="text-surface-500">شاخص CRM:</span> <strong className="font-mono">#{selectedLogDetail.crmProductIndex}</strong></div>
                <div><span className="text-surface-500">قیمت پایه:</span> <strong>{formatNumber(selectedLogDetail.rawPrice)}</strong></div>
                <div><span className="text-surface-500">قیمت ارسالی:</span> <strong>{formatNumber(selectedLogDetail.sentPrice)}</strong></div>
                <div><span className="text-surface-500">نوع:</span> <strong>{OPERATION_LABELS[selectedLogDetail.operationType]}</strong></div>
                <div><span className="text-surface-500">وضعیت:</span> <strong>{STATUS_META[selectedLogDetail.status]?.label}</strong></div>
                <div><span className="text-surface-500">تعداد بسته:</span> <strong>{selectedLogDetail.batchSize}</strong></div>
                <div><span className="text-surface-500">updatedCount:</span> <strong>{selectedLogDetail.updatedCount ?? '—'}</strong></div>
              </div>

              {selectedLogDetail.errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
                  <div className="font-bold mb-1">پیام خطا / هشدار:</div>
                  <p>{selectedLogDetail.errorMessage}</p>
                </div>
              )}

              {selectedLogDetail.apiResponse && (
                <div className="space-y-1">
                  <div className="font-bold text-surface-700 dark:text-surface-300">پاسخ خام API:</div>
                  <pre className="bg-surface-900 text-surface-100 p-3 rounded-xl font-mono text-[11px] overflow-x-auto text-left" dir="ltr">
                    {selectedLogDetail.apiResponse}
                  </pre>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedLogDetail(null)}
                  className="px-4 py-2 rounded-xl bg-surface-800 text-white font-bold"
                >
                  بستن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
