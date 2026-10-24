import React, { useState, useEffect } from 'react';
import { useDB } from '../../lib/useDB';
import { db, ApiKeyItem } from '../../lib/db';
import { Plug, Key, Plus, Trash2, ShieldAlert, CheckCircle2, AlertCircle, Loader2, Copy, Check, X, Shield, Clock, Calendar, CheckSquare, Square } from 'lucide-react';
import { cn } from '../../lib/utils';

export function IntegrationsManagement() {
  const { user } = useDB();
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Creation modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['read:prices', 'read:products', 'read:categories']);
  const [expiresInDays, setExpiresInDays] = useState('0');

  // One-time Secret display modal state
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchKeys = async () => {
    if (user?.role !== 'admin') return;
    try {
      setIsLoading(true);
      const data = await db.getApiKeys();
      setApiKeys(data);
    } catch (err: any) {
      showToast('error', err.message || 'خطا در دریافت لیست کلیدهای API');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, [user]);

  const handleToggleScope = (scopeKey: string) => {
    setScopes(prev => 
      prev.includes(scopeKey) 
        ? prev.filter(s => s !== scopeKey) 
        : [...prev, scopeKey]
    );
  };

  const handleOpenCreate = () => {
    setName('');
    setScopes(['read:prices', 'read:products', 'read:categories']);
    setExpiresInDays('0');
    setCreatedSecret(null);
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('error', 'لطفاً نام یا عنوان سامانه متصل را وارد کنید.');
      return;
    }
    if (scopes.length === 0) {
      showToast('error', 'حداقل یکی از مجوزهای خواندن باید انتخاب شود.');
      return;
    }

    try {
      setIsSaving(true);
      const days = parseInt(expiresInDays, 10);
      const res = await db.createApiKey({
        name: name.trim(),
        scopes,
        expiresInDays: days > 0 ? days : null
      });

      setIsCreateModalOpen(false);
      setCreatedSecret(res.key);
      setHasCopied(false);
      await fetchKeys();
      showToast('success', 'کلید API جدید با موفقیت ایجاد شد.');
    } catch (err: any) {
      showToast('error', err.message || 'خطا در ایجاد کلید API');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevoke = async (id: string, keyName: string) => {
    const confirmed = window.confirm(
      `آیا از ابطال کلید «${keyName}» اطمینان دارید؟\nدسترسی نرم‌افزار متصل بلافاصله قطع خواهد شد و این اقدام غیرقابل بازگشت است.`
    );
    if (!confirmed) return;

    try {
      await db.revokeApiKey(id);
      showToast('success', 'کلید API با موفقیت باطل شد.');
      fetchKeys();
    } catch (err: any) {
      showToast('error', err.message || 'خطا در ابطال کلید API');
    }
  };

  const handleDelete = async (id: string, keyName: string) => {
    const confirmed = window.confirm(
      `آیا از حذف کامل کلید «${keyName}» اطمینان دارید؟`
    );
    if (!confirmed) return;

    try {
      await db.deleteApiKey(id);
      showToast('success', 'کلید مورد نظر با موفقیت حذف شد.');
      fetchKeys();
    } catch (err: any) {
      showToast('error', err.message || 'خطا در حذف کلید');
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 3000);
  };

  // Access check for editor role
  if (user && user.role !== 'admin') {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-950/40 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-surface-900 dark:text-white">دسترسی محدود شده</h2>
        <p className="text-surface-600 dark:text-surface-400 text-sm">
          مدیریت و صدور کلیدهای اتصال به سیستم‌های دیگر صرفاً در حیطه اختیارات مدیر ارشد سیستم است.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* Toast Notification */}
      {toast && (
        <div className={cn(
          "p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 shadow-lg",
          toast.type === 'success' ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
        )}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <p className="font-medium text-sm">{toast.message}</p>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-surface-900 p-6 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 rounded-xl text-primary dark:text-white">
              <Plug className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-surface-900 dark:text-white">اتصال به سیستم‌های دیگر</h1>
          </div>
          <p className="text-surface-500 dark:text-surface-400 text-sm">
            صدور و مدیریت کلیدهای اختصاصی API برای خواندن خودکار کالاها، دسته‌بندی‌ها و قیمت‌های جاری توسط نرم‌افزارهای داخلی شرکت
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl hover:bg-primary-hover transition-colors font-bold text-sm shadow-sm shadow-primary/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          ایجاد کلید API جدید
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-2xl p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 dark:text-blue-200 space-y-1 leading-relaxed">
          <span className="font-bold">امنیت و کنترل دسترسی یکپارچه:</span>
          <p>
            کلیه کلیدهای صادره در این بخش <strong>صرفاً دسترسی فقط-خواندنی (Read-Only)</strong> دارند و تحت هیچ شرایطی امکان تغییر قیمت‌ها، حذف داده‌ها یا دسترسی به تنظیمات سرور و کاربران را نخواهند داشت. همچنین کلید اصلی به صورت هش‌شده در سرور ذخیره شده و فقط در لحظه ایجاد قابل مشاهده است.
          </p>
        </div>
      </div>

      {/* API Keys Table */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between">
          <h2 className="font-bold text-surface-900 dark:text-white text-base flex items-center gap-2">
            <Key className="w-4 h-4 text-primary" />
            فهرست کلیدهای فعال و صادرشده
          </h2>
          <span className="text-xs bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 px-2.5 py-1 rounded-full font-mono font-medium">
            {apiKeys.length} کلید
          </span>
        </div>

        {isLoading ? (
          <div className="p-16 flex flex-col justify-center items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="text-xs text-surface-500">در حال دریافت کلیدها...</span>
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 bg-surface-100 dark:bg-surface-800 rounded-full flex items-center justify-center mx-auto text-surface-400">
              <Key className="w-6 h-6" />
            </div>
            <p className="text-surface-600 dark:text-surface-400 text-sm font-medium">هیچ کلید اتصالی ثبت نشده است.</p>
            <button
              onClick={handleOpenCreate}
              className="text-xs text-primary hover:underline font-bold"
            >
              اولین کلید API را صادر کنید
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-800">
                <tr>
                  <th className="px-6 py-3.5 font-bold text-surface-700 dark:text-surface-300">سامانه / پیشوند کلید</th>
                  <th className="px-6 py-3.5 font-bold text-surface-700 dark:text-surface-300">مجوزهای دسترسی</th>
                  <th className="px-6 py-3.5 font-bold text-surface-700 dark:text-surface-300">تاریخ صدور</th>
                  <th className="px-6 py-3.5 font-bold text-surface-700 dark:text-surface-300">تاریخ انقضاء</th>
                  <th className="px-6 py-3.5 font-bold text-surface-700 dark:text-surface-300">آخرین استفاده</th>
                  <th className="px-6 py-3.5 font-bold text-surface-700 dark:text-surface-300">وضعیت</th>
                  <th className="px-6 py-3.5 font-bold text-surface-700 dark:text-surface-300 text-left">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {apiKeys.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-50/40 dark:hover:bg-surface-800/40 transition-colors">
                    {/* Name & Prefix */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-surface-900 dark:text-white">{item.name}</div>
                      <div className="font-mono text-xs text-surface-400 dark:text-surface-500 mt-0.5" dir="ltr" style={{ textAlign: 'right' }}>
                        {item.keyPrefix}...
                      </div>
                    </td>

                    {/* Scopes */}
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {item.scopes.map((scope) => (
                          <span
                            key={scope}
                            className="inline-block px-2 py-0.5 rounded text-[11px] font-mono bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 border border-surface-200 dark:border-surface-700"
                          >
                            {scope}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Created Date */}
                    <td className="px-6 py-4 text-xs font-sans text-surface-600 dark:text-surface-400" dir="ltr" style={{ textAlign: 'right' }}>
                      {new Date(item.createdAt).toLocaleDateString('fa-IR')}
                    </td>

                    {/* Expires At */}
                    <td className="px-6 py-4 text-xs font-sans text-surface-600 dark:text-surface-400" dir="ltr" style={{ textAlign: 'right' }}>
                      {item.expiresAt ? (
                        new Date(item.expiresAt).toLocaleDateString('fa-IR')
                      ) : (
                        <span className="text-surface-400">بدون انقضاء (دائمی)</span>
                      )}
                    </td>

                    {/* Last Used At */}
                    <td className="px-6 py-4 text-xs font-sans text-surface-600 dark:text-surface-400" dir="ltr" style={{ textAlign: 'right' }}>
                      {item.lastUsedAt ? (
                        new Date(item.lastUsedAt).toLocaleString('fa-IR')
                      ) : (
                        <span className="text-surface-400 italic">هنوز استفاده نشده</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold",
                        item.isActive 
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400" 
                          : "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400"
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", item.isActive ? "bg-emerald-500" : "bg-rose-500")} />
                        {item.isActive ? 'فعال' : 'باطل‌شده'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-left">
                      <div className="flex items-center justify-end gap-2">
                        {item.isActive && (
                          <button
                            onClick={() => handleRevoke(item.id, item.name)}
                            className="px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-950/50 rounded-lg transition-colors border border-amber-200 dark:border-amber-900/40"
                            title="ابطال فوری کلید"
                          >
                            ابطال کلید
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(item.id, item.name)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                          title="حذف رکورد کلید"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Developer API Guide Card */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6 space-y-4">
        <h3 className="font-bold text-surface-900 dark:text-white flex items-center gap-2 text-base">
          <Key className="w-5 h-5 text-primary" />
          راهنمای استفاده از کلیدها در سامانه‌های دیگر (مستندات توسعه‌دهنده)
        </h3>

        <p className="text-xs text-surface-600 dark:text-surface-400 leading-relaxed">
          نرم‌افزارها یا سرورهای شبکه داخلی می‌توانند با ارسال کلید اختصاصی در هدر <code className="font-mono text-primary bg-primary/10 px-1 py-0.5 rounded">X-API-Key</code> یا <code className="font-mono text-primary bg-primary/10 px-1 py-0.5 rounded">Authorization: Bearer &lt;key&gt;</code> داده‌های زیر را به صورت JSON استاندارد دریافت کنند:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 bg-surface-50 dark:bg-surface-800/60 rounded-xl border border-surface-200 dark:border-surface-700 space-y-1">
            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">GET /api/internal/price-list</span>
            <p className="text-xs text-surface-700 dark:text-surface-300 font-medium">دریافت لیست قیمت جاری و کامل</p>
            <p className="text-[11px] text-surface-400">مجوز: read:prices</p>
          </div>

          <div className="p-3.5 bg-surface-50 dark:bg-surface-800/60 rounded-xl border border-surface-200 dark:border-surface-700 space-y-1">
            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">GET /api/internal/products</span>
            <p className="text-xs text-surface-700 dark:text-surface-300 font-medium">فهرست کالاها و مشخصات با صفحه‌بندی</p>
            <p className="text-[11px] text-surface-400">مجوز: read:products</p>
          </div>

          <div className="p-3.5 bg-surface-50 dark:bg-surface-800/60 rounded-xl border border-surface-200 dark:border-surface-700 space-y-1">
            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">GET /api/internal/categories</span>
            <p className="text-xs text-surface-700 dark:text-surface-300 font-medium">ساختار درختی دسته‌بندی‌ها</p>
            <p className="text-[11px] text-surface-400">مجوز: read:categories</p>
          </div>
        </div>

        <div className="bg-surface-900 text-surface-100 p-4 rounded-xl font-mono text-xs overflow-x-auto text-left" dir="ltr">
          <div className="text-surface-400 mb-1"># نمونه درخواست با cURL:</div>
          <div>curl -X GET "http://localhost:3000/api/internal/price-list" \</div>
          <div>&nbsp;&nbsp;-H "X-API-Key: plk_xxxxxxxxxxxxxxxxxxxxxxxx"</div>
        </div>
      </div>

      {/* CREATE KEY MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-surface-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-surface-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-surface-200 dark:border-surface-800">
            <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between">
              <h3 className="font-black text-lg text-surface-900 dark:text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                ایجاد کلید جدید یکپارچه‌سازی API
              </h3>
              <button 
                onClick={() => setIsCreateModalOpen(false)} 
                className="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-surface-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-5">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-surface-700 dark:text-surface-300">
                  عنوان سامانه متصل <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="مثال: سیستم فروش داخلی، نرم‌افزار حسابداری"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                  required
                />
              </div>

              {/* Scope Checkboxes */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-surface-700 dark:text-surface-300">
                  مجوزهای دسترسی (صرفاً فقط-خواندنی) <span className="text-red-500">*</span>
                </label>
                <div className="bg-surface-50 dark:bg-surface-800/50 p-3 rounded-xl border border-surface-200 dark:border-surface-700 space-y-2.5">
                  {[
                    { key: 'read:prices', title: 'خواندن قیمت‌های جاری', desc: 'دسترسی به مقادیر قیمت، تاریخ آخرین بروزرسانی و واحد پول' },
                    { key: 'read:products', title: 'خواندن لیست و جزئیات کالاها', desc: 'دسترسی به اسامی کالاها، وضعیت، فونت و دسته‌بندی' },
                    { key: 'read:categories', title: 'خواندن ساختار دسته‌بندی‌ها', desc: 'دسترسی به نام و ترتیب دسته‌بندی‌ها' },
                  ].map(s => {
                    const isChecked = scopes.includes(s.key);
                    return (
                      <div
                        key={s.key}
                        onClick={() => handleToggleScope(s.key)}
                        className={cn(
                          "flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors border",
                          isChecked 
                            ? "bg-white dark:bg-surface-800 border-primary/30 dark:border-primary/40 shadow-xs" 
                            : "border-transparent hover:bg-surface-100/60 dark:hover:bg-surface-700/40"
                        )}
                      >
                        <div className="mt-0.5 text-primary">
                          {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-surface-400" />}
                        </div>
                        <div className="space-y-0.5 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-surface-800 dark:text-surface-200">{s.title}</span>
                            <span className="font-mono text-[11px] text-surface-400 bg-surface-100 dark:bg-surface-700 px-1.5 py-0.5 rounded">{s.key}</span>
                          </div>
                          <p className="text-[11px] text-surface-500">{s.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Expiration choices */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-surface-700 dark:text-surface-300">
                  مدت اعتبار کلید
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { val: '30', label: '۳۰ روزه' },
                    { val: '90', label: '۹۰ روزه' },
                    { val: '365', label: '۱ ساله' },
                    { val: '0', label: 'بدون انقضاء' },
                  ].map(opt => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setExpiresInDays(opt.val)}
                      className={cn(
                        "py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center",
                        expiresInDays === opt.val
                          ? "bg-primary text-white border-primary shadow-xs"
                          : "bg-surface-50 dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-100"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-200 dark:border-surface-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors font-medium text-sm"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl transition-colors font-bold flex items-center gap-2 text-sm shadow-sm shadow-primary/20"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                  ایجاد کلید API
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SECURE KEY DISPLAY MODAL (ONCE ONLY) */}
      {createdSecret && (
        <div className="fixed inset-0 bg-surface-900/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in zoom-in-95 duration-150">
          <div className="bg-white dark:bg-surface-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-surface-200 dark:border-surface-800 space-y-0">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900 flex items-center justify-between">
              <h3 className="font-black text-lg text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                کلید API با موفقیت صادر شد
              </h3>
            </div>

            <div className="p-6 space-y-5">
              {/* Security Warning Box */}
              <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-300">هشدار بسیار مهم امنیتی:</span>
                  <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
                    این کلید محرمانه <strong>فقط همین یک‌بار</strong> به شما نمایش داده می‌شود. لطفاً بلافاصله آن را کپی کرده و در تنظیمات نرم‌افزار متصل قرار دهید. پس از بستن این پنجره، کلید به دلایل امنیتی در سرور هش شده و امکان مشاهده دوباره آن وجود ندارد.
                  </p>
                </div>
              </div>

              {/* Raw Key Display with Copy Button */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-surface-700 dark:text-surface-300">
                  کلید API اختصاصی شما (Secret Key):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={createdSecret}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 font-mono text-sm dark:text-white select-all text-left font-bold text-primary"
                    dir="ltr"
                  />
                  <button
                    onClick={() => handleCopy(createdSecret)}
                    className={cn(
                      "px-4 py-2.5 rounded-xl transition-all shrink-0 flex items-center gap-1.5 text-xs font-bold shadow-sm",
                      hasCopied 
                        ? "bg-emerald-600 text-white" 
                        : "bg-primary text-white hover:bg-primary-hover"
                    )}
                  >
                    {hasCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {hasCopied ? 'کپی شد!' : 'کپی کلید'}
                  </button>
                </div>
              </div>

              {/* cURL usage preview */}
              <div className="p-3 bg-surface-50 dark:bg-surface-800 rounded-xl text-xs space-y-1 font-mono text-surface-600 dark:text-surface-300 text-left" dir="ltr">
                <div className="font-sans font-bold text-surface-700 dark:text-surface-300 mb-1 text-right" dir="rtl">
                  نمونه ارسال هدر در سیستم دوم:
                </div>
                <div>X-API-Key: {createdSecret}</div>
              </div>

              {/* Close Button */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setCreatedSecret(null)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-surface-800 hover:bg-surface-900 text-white rounded-xl text-sm font-bold transition-colors"
                >
                  متوجه شدم و کلید را ذخیره کردم
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
