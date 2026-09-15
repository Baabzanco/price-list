import React, { useState, useRef } from 'react';
import { useDB } from '../../lib/useDB';
import { db } from '../../lib/db';
import { Save, CheckCircle2, Image as ImageIcon, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Settings() {
  const { settings } = useDB();
  const [form, setForm] = useState(settings);
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const lightLogoInputRef = useRef<HTMLInputElement>(null);
  const darkLogoInputRef = useRef<HTMLInputElement>(null);

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
            className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl hover:bg-primary-hover shadow-sm font-medium transition-all"
          >
            <Save className="w-5 h-5" />
            ذخیره تنظیمات
          </button>
        </div>
      </form>
    </div>
  );
}
