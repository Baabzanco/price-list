import React, { useState, useRef } from 'react';
import { useDB } from '../../lib/useDB';
import { db } from '../../lib/db';
import { Save, CheckCircle2, Image as ImageIcon, X, Download, Upload, Database, AlertTriangle, FileJson, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Settings() {
  const { settings, categories, products } = useDB();
  const [form, setForm] = useState(settings);
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const lightLogoInputRef = useRef<HTMLInputElement>(null);
  const darkLogoInputRef = useRef<HTMLInputElement>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [restoreModalData, setRestoreModalData] = useState<{
    fileName: string;
    categoriesCount: number;
    productsCount: number;
    historyCount: number;
    exportedAt?: string;
    raw: any;
  } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await db.updateSettings(form);
      setToast({ type: 'success', message: 'تنظیمات با موفقیت ذخیره شد.' });
      setTimeout(() => setToast(null), 3000);
    } catch (e) {
      setToast({ type: 'error', message: 'خطا در ذخیره تنظیمات.' });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoLightUrl' | 'logoDarkUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setToast({ type: 'error', message: 'حجم تصویر نباید بیشتر از 2 مگابایت باشد.' });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setForm(prev => ({ ...prev, [field]: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadBackup = async () => {
    try {
      setIsExporting(true);
      const data = await db.getBackup();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const nowStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.href = url;
      a.download = `price-list-backup-${nowStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setToast({ type: 'success', message: 'فایل پشتیبان JSON با موفقیت دانلود شد.' });
      setTimeout(() => setToast(null), 3500);
    } catch (e: any) {
      setToast({ type: 'error', message: 'خطا در دریافت فایل پشتیبان: ' + (e.message || '') });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSelectBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || !Array.isArray(parsed.categories) || !Array.isArray(parsed.products)) {
          throw new Error('ساختار فایل JSON معتبر نیست. بخش‌های categories یا products یافت نشد.');
        }
        setRestoreModalData({
          fileName: file.name,
          categoriesCount: parsed.categories.length,
          productsCount: parsed.products.length,
          historyCount: (parsed.priceHistory || parsed.price_history || []).length,
          exportedAt: parsed.exportedAt,
          raw: parsed
        });
      } catch (err: any) {
        setToast({ type: 'error', message: 'خطا در خواندن فایل پشتیبان: ' + (err.message || 'فایل نامعتبر است') });
        setTimeout(() => setToast(null), 4000);
      } finally {
        if (backupFileInputRef.current) {
          backupFileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = async () => {
    if (!restoreModalData) return;
    try {
      setIsImporting(true);
      const res = await db.restoreBackup(restoreModalData.raw);
      setToast({ 
        type: 'success', 
        message: `اطلاعات با موفقیت بازیابی شدند (${res.categoriesCount} دسته‌بندی و ${res.productsCount} محصول).` 
      });
      setTimeout(() => setToast(null), 4500);
      setRestoreModalData(null);
    } catch (err: any) {
      setToast({ type: 'error', message: 'خطا در بازیابی پشتیبان: ' + (err.message || '') });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-surface-900 dark:text-white">تنظیمات سیستم</h2>
        <p className="text-surface-600 dark:text-surface-400 mt-1">مدیریت اطلاعات پایه و نمایشی سیستم.</p>
      </div>

      {toast && (
        <div className={cn(
          "p-4 rounded-xl flex items-center gap-3 border shadow-sm transition-all",
          toast.type === 'success' ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
        )}>
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-surface-700 dark:text-surface-300">نام شرکت</label>
              <input
                type="text"
                value={form.companyName}
                onChange={e => setForm({ ...form, companyName: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 dark:bg-surface-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-surface-700 dark:text-surface-300">عنوان لیست قیمت</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 dark:bg-surface-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-surface-700 dark:text-surface-300">زیرعنوان</label>
              <input
                type="text"
                value={form.subtitle}
                onChange={e => setForm({ ...form, subtitle: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 dark:bg-surface-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-surface-700 dark:text-surface-300">متن کنار شماره تماس</label>
              <input
                type="text"
                value={form.footerTextLeft ?? ''}
                onChange={e => setForm({ ...form, footerTextLeft: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 dark:bg-surface-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="تماس با خط ویژه:"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-surface-700 dark:text-surface-300">شماره تماس (نمایش در فوتر)</label>
              <input
                type="text"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 dark:bg-surface-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                dir="ltr"
                style={{ textAlign: 'right' }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-surface-700 dark:text-surface-300">متن کنار ساعات پاسخگویی</label>
              <input
                type="text"
                value={form.footerTextRight ?? ''}
                onChange={e => setForm({ ...form, footerTextRight: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 dark:bg-surface-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="پاسخگویی از ساعت"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-surface-700 dark:text-surface-300">ساعات پاسخگویی</label>
              <input
                type="text"
                value={form.hours}
                onChange={e => setForm({ ...form, hours: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 dark:bg-surface-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-surface-700 dark:text-surface-300">واحد قیمت</label>
              <input
                type="text"
                value={form.currency}
                onChange={e => setForm({ ...form, currency: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 dark:bg-surface-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-surface-700 dark:text-surface-300">نحوه نمایش تاریخ بالای لیست قیمت</label>
              <select
                value={form.dateMode || 'today'}
                onChange={e => setForm({ ...form, dateMode: e.target.value as 'today' | 'last_updated' })}
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 dark:bg-surface-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="today">بروزرسانی اتوماتیک (تاریخ روز)</option>
                <option value="last_updated">تاریخ آخرین ویرایش قیمت‌ها</option>
              </select>
            </div>
          </div>

          <hr className="border-surface-200 dark:border-surface-800" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo Light */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-surface-700 dark:text-surface-300">لوگوی حالت روشن</label>
              <div className="border-2 border-dashed border-surface-300 dark:border-surface-700 rounded-xl p-4 flex flex-col items-center justify-center gap-3 bg-surface-50 dark:bg-surface-800 relative">
                {form.logoLightUrl ? (
                  <div className="relative w-full aspect-[3/1] bg-white rounded-lg flex items-center justify-center p-2 shadow-sm border border-surface-200">
                    <img src={form.logoLightUrl} alt="Logo Light" className="max-w-full max-h-full object-contain" />
                    <button 
                      type="button" 
                      onClick={() => setForm(prev => ({ ...prev, logoLightUrl: undefined }))}
                      className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 hover:bg-rose-600 shadow-md"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-white dark:bg-surface-700 rounded-full flex items-center justify-center shadow-sm">
                      <ImageIcon className="w-6 h-6 text-surface-400" />
                    </div>
                    <button 
                      type="button"
                      onClick={() => lightLogoInputRef.current?.click()}
                      className="text-sm text-primary font-medium hover:underline"
                    >
                      انتخاب تصویر...
                    </button>
                  </>
                )}
                <input 
                  type="file" 
                  ref={lightLogoInputRef} 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => handleFileChange(e, 'logoLightUrl')}
                />
              </div>
            </div>

            {/* Logo Dark */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-surface-700 dark:text-surface-300">لوگوی حالت تاریک</label>
              <div className="border-2 border-dashed border-surface-300 dark:border-surface-700 rounded-xl p-4 flex flex-col items-center justify-center gap-3 bg-surface-50 dark:bg-surface-800 relative">
                {form.logoDarkUrl ? (
                  <div className="relative w-full aspect-[3/1] bg-surface-900 rounded-lg flex items-center justify-center p-2 shadow-sm border border-surface-700">
                    <img src={form.logoDarkUrl} alt="Logo Dark" className="max-w-full max-h-full object-contain" />
                    <button 
                      type="button" 
                      onClick={() => setForm(prev => ({ ...prev, logoDarkUrl: undefined }))}
                      className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 hover:bg-rose-600 shadow-md"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-surface-900 rounded-full flex items-center justify-center shadow-sm">
                      <ImageIcon className="w-6 h-6 text-surface-500" />
                    </div>
                    <button 
                      type="button"
                      onClick={() => darkLogoInputRef.current?.click()}
                      className="text-sm text-primary font-medium hover:underline"
                    >
                      انتخاب تصویر...
                    </button>
                  </>
                )}
                <input 
                  type="file" 
                  ref={darkLogoInputRef} 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => handleFileChange(e, 'logoDarkUrl')}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-surface-50 dark:bg-surface-800/50 border-t border-surface-200 dark:border-surface-800 flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl hover:bg-primary-hover shadow-sm font-medium transition-all cursor-pointer"
          >
            <Save className="w-5 h-5" />
            ذخیره تنظیمات
          </button>
        </div>
      </form>

      {/* Backup and Restore Section */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-surface-200 dark:border-surface-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-surface-900 dark:text-white">پشتیبان‌گیری و بازیابی اطلاعات (JSON Backup)</h3>
              <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
                امکان دریافت فایل بکاپ از تمام دسته‌بندی‌ها، اقلام، قیمت‌ها و تنظیمات و بازگردانی آن در هر زمان.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export Card */}
          <div className="p-5 rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-800/30 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h4 className="font-bold text-surface-900 dark:text-white">دریافت فایل پشتیبان (خروجی JSON)</h4>
              </div>
              <p className="text-xs text-surface-600 dark:text-surface-400 leading-relaxed">
                یک فایل کامل شامل <span className="font-semibold text-surface-800 dark:text-surface-200">{categories.length} دسته‌بندی</span> و <span className="font-semibold text-surface-800 dark:text-surface-200">{products.length} قلم کالا</span> به همراه تاریخچه قیمت‌ها و لوگوها استخراج می‌شود.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadBackup}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>دانلود فایل بکاپ (JSON)</span>
            </button>
          </div>

          {/* Import Card */}
          <div className="p-5 rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-800/30 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" />
                <h4 className="font-bold text-surface-900 dark:text-white">بارگذاری و بازیابی فایل پشتیبان (ورودی JSON)</h4>
              </div>
              <p className="text-xs text-surface-600 dark:text-surface-400 leading-relaxed">
                فایل JSON پشتیبانی که قبلاً دانلود کرده‌اید را انتخاب کنید تا اطلاعات سیستم بر اساس آن بازیابی شود.
              </p>
            </div>

            <input
              type="file"
              ref={backupFileInputRef}
              accept=".json,application/json"
              className="hidden"
              onChange={handleSelectBackupFile}
            />

            <button
              type="button"
              onClick={() => backupFileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-xl font-medium shadow-sm transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>انتخاب فایل پشتیبان (.json)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Restore Confirmation Modal */}
      {restoreModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-surface-900 dark:text-white">تایید بازیابی فایل پشتیبان</h3>
                <p className="text-xs text-surface-500 dark:text-surface-400">لطفاً پیش از تایید، اطلاعات فایل را بررسی فرمایید.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              <strong>توجه:</strong> با تایید این عملیات، تمامی دسته‌بندی‌ها، اقلام و قیمت‌های فعلی سیستم با اطلاعات موجود در فایل بکاپ جایگزین خواهند شد.
            </div>

            <div className="space-y-2 text-sm bg-surface-50 dark:bg-surface-800/60 p-4 rounded-xl border border-surface-200 dark:border-surface-700/60">
              <div className="flex justify-between py-1 border-b border-surface-200/50 dark:border-surface-700/50">
                <span className="text-surface-500 dark:text-surface-400">نام فایل:</span>
                <span className="font-mono text-surface-800 dark:text-surface-200 text-xs">{restoreModalData.fileName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-surface-200/50 dark:border-surface-700/50">
                <span className="text-surface-500 dark:text-surface-400">تعداد دسته‌بندی‌ها:</span>
                <span className="font-bold text-surface-900 dark:text-white">{restoreModalData.categoriesCount} مورد</span>
              </div>
              <div className="flex justify-between py-1 border-b border-surface-200/50 dark:border-surface-700/50">
                <span className="text-surface-500 dark:text-surface-400">تعداد اقلام کالا:</span>
                <span className="font-bold text-surface-900 dark:text-white">{restoreModalData.productsCount} مورد</span>
              </div>
              {restoreModalData.historyCount > 0 && (
                <div className="flex justify-between py-1 border-b border-surface-200/50 dark:border-surface-700/50">
                  <span className="text-surface-500 dark:text-surface-400">تاریخچه تغییرات قیمت:</span>
                  <span className="font-bold text-surface-900 dark:text-white">{restoreModalData.historyCount} رکورد</span>
                </div>
              )}
              {restoreModalData.exportedAt && (
                <div className="flex justify-between py-1">
                  <span className="text-surface-500 dark:text-surface-400">تاریخ خروجی فایل:</span>
                  <span className="font-mono text-xs text-surface-600 dark:text-surface-400">{restoreModalData.exportedAt.slice(0, 19).replace('T', ' ')}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRestoreModalData(null)}
                disabled={isImporting}
                className="px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-700 dark:text-surface-300 font-medium text-sm transition-all cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isImporting}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                <span>{isImporting ? 'در حال بازیابی...' : 'تایید و جایگزینی اطلاعات'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
