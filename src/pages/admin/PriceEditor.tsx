import { useState, useEffect } from 'react';
import { useDB } from '../../lib/useDB';
import { db } from '../../lib/db';
import { Save, AlertCircle, CheckCircle2, Zap } from 'lucide-react';
import { cn, formatNumber } from '../../lib/utils';

export function PriceEditor() {
  const { categories, products, settings } = useDB();
  
  // Local state to track edits before saving
  const [edits, setEdits] = useState<Record<string, { priceLamb: number | null, priceTwoTeeth: number | null }>>({});
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Bulk Edit State
  const [bulkTarget, setBulkTarget] = useState('all');
  const [bulkType, setBulkType] = useState<'fixed' | 'percent'>('fixed');
  const [bulkValue, setBulkValue] = useState('');
  const [bulkField, setBulkField] = useState<'both' | 'lamb' | 'two_teeth'>('both');

  // Initialize edits from DB on load
  useEffect(() => {
    const initialEdits: Record<string, { priceLamb: number | null, priceTwoTeeth: number | null }> = {};
    products.forEach(p => {
      initialEdits[p.id] = {
        priceLamb: p.priceLamb,
        priceTwoTeeth: p.priceTwoTeeth
      };
    });
    setEdits(initialEdits);
  }, [products]);

  const handlePriceChange = (productId: string, type: 'priceLamb' | 'priceTwoTeeth', val: string) => {
    const num = val === '' ? null : parseInt(val.replace(/\D/g, ''), 10);
    setEdits(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [type]: num
      }
    }));
  };

  const handleSave = async () => {
    const updates = Object.keys(edits).map(id => ({
      id,
      priceLamb: edits[id].priceLamb,
      priceTwoTeeth: edits[id].priceTwoTeeth
    }));

    try {
      await db.updateProductPrices(updates, 'admin');
      setToast({ type: 'success', message: 'قیمت‌ها با موفقیت بروزرسانی شدند.' });
      setTimeout(() => setToast(null), 3000);
    } catch (e) {
      setToast({ type: 'error', message: 'خطا در ذخیره قیمت‌ها.' });
    }
  };

  const handleBulkApply = () => {
    const amount = parseFloat(bulkValue.replace(/[^\d.-]/g, ''));
    if (isNaN(amount) || amount === 0) return;

    const newEdits = { ...edits };
    let appliedCount = 0;

    products.forEach(p => {
      if (bulkTarget !== 'all' && p.categoryId !== bulkTarget) return;

      const applyChange = (val: number | null) => {
        if (val === null) return null;
        let newVal = val;
        if (bulkType === 'fixed') newVal += amount;
        if (bulkType === 'percent') newVal += (val * amount / 100);
        return Math.max(0, Math.round(newVal)); // Prices shouldn't be negative
      };

      let changed = false;
      const currentLamb = edits[p.id]?.priceLamb ?? p.priceLamb;
      const currentTwoTeeth = edits[p.id]?.priceTwoTeeth ?? p.priceTwoTeeth;

      if ((bulkField === 'both' || bulkField === 'lamb') && currentLamb !== null) {
        newEdits[p.id].priceLamb = applyChange(currentLamb);
        changed = true;
      }
      
      if ((bulkField === 'both' || bulkField === 'two_teeth') && currentTwoTeeth !== null) {
        newEdits[p.id].priceTwoTeeth = applyChange(currentTwoTeeth);
        changed = true;
      }

      if (changed) appliedCount++;
    });

    if (appliedCount > 0) {
      setEdits(newEdits);
      setToast({ type: 'success', message: `قیمت ${appliedCount} کالا در فرم تغییر یافت (برای نهایی شدن کلید ذخیره را بزنید).` });
      setBulkValue('');
      setTimeout(() => setToast(null), 4000);
    }
  };

  const hasChanges = products.some(p => 
    edits[p.id]?.priceLamb !== p.priceLamb || 
    edits[p.id]?.priceTwoTeeth !== p.priceTwoTeeth
  );

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-surface-900">ویرایش گروهی قیمت‌ها</h2>
          <p className="text-surface-600 mt-1">تغییرات را در جدول وارد کرده و سپس ذخیره کنید.</p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              تغییرات ذخیره نشده
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm font-medium"
          >
            <Save className="w-5 h-5" />
            ذخیره همه تغییرات
          </button>
        </div>
      </div>

      {toast && (
        <div className={cn(
          "p-4 rounded-xl flex items-center gap-3 border shadow-sm transition-all",
          toast.type === 'success' ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
        )}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {/* Bulk Editor Section */}
      <div className="bg-white dark:bg-surface-900 p-5 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm flex flex-col md:flex-row md:items-end gap-4">
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-bold text-surface-600 dark:text-surface-400 uppercase tracking-wider">دسته‌بندی هدف</label>
          <select 
            value={bulkTarget} 
            onChange={e => setBulkTarget(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-50 dark:bg-surface-800 dark:text-white"
          >
            <option value="all">همه محصولات</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-bold text-surface-600 dark:text-surface-400 uppercase tracking-wider">ستون قیمت</label>
          <select 
            value={bulkField} 
            onChange={e => setBulkField(e.target.value as any)}
            className="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-50 dark:bg-surface-800 dark:text-white"
          >
            <option value="both">هر دو قیمت</option>
            <option value="lamb">فقط قیمت بره</option>
            <option value="two_teeth">فقط قیمت دو دندان</option>
          </select>
        </div>

        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-bold text-surface-600 dark:text-surface-400 uppercase tracking-wider">نوع تغییر</label>
          <select 
            value={bulkType} 
            onChange={e => setBulkType(e.target.value as any)}
            className="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-50 dark:bg-surface-800 dark:text-white"
          >
            <option value="fixed">مبلغ ثابت (+/-)</option>
            <option value="percent">درصد (+/- %)</option>
          </select>
        </div>

        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-bold text-surface-600 dark:text-surface-400 uppercase tracking-wider">مقدار</label>
          <input 
            type="text" 
            placeholder="مثال: 50 یا 50-" 
            value={bulkValue}
            onChange={e => setBulkValue(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-surface-50 dark:bg-surface-800 dark:text-white"
            dir="ltr"
          />
        </div>

        <button
          onClick={handleBulkApply}
          disabled={!bulkValue}
          className="flex items-center justify-center gap-2 bg-surface-800 dark:bg-surface-700 text-white px-5 py-2 rounded-lg hover:bg-surface-900 dark:hover:bg-surface-600 disabled:opacity-50 transition-colors font-medium h-[42px]"
        >
          <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
          اعمال گروهی
        </button>
      </div>

      <div className="space-y-8">
        {categories.map(category => {
          const categoryProducts = products.filter(p => p.categoryId === category.id && p.isActive);
          if (categoryProducts.length === 0) return null;

          return (
            <div key={category.id} className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-800">
                <h3 className="font-bold text-lg text-primary dark:text-white">{category.name}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800">
                    <tr>
                      <th className="px-6 py-3 font-medium text-surface-600 dark:text-surface-400 w-1/3">نام کالا</th>
                      <th className="px-6 py-3 font-medium text-surface-600 dark:text-surface-400">قیمت بره ({settings.currency})</th>
                      <th className="px-6 py-3 font-medium text-surface-600 dark:text-surface-400">قیمت دو دندان ({settings.currency})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                    {categoryProducts.map((product) => {
                      const editState = edits[product.id] || { priceLamb: product.priceLamb, priceTwoTeeth: product.priceTwoTeeth };
                      
                      const lambChanged = editState.priceLamb !== product.priceLamb;
                      const twoTeethChanged = editState.priceTwoTeeth !== product.priceTwoTeeth;

                      return (
                        <tr key={product.id} className="hover:bg-surface-50/30 dark:hover:bg-surface-800/30">
                          <td className="px-6 py-3 font-medium text-surface-900 dark:text-white">{product.name}</td>
                          <td className="px-6 py-3">
                            <div className="relative w-48">
                              <input
                                type="text"
                                value={editState.priceLamb === null ? '' : editState.priceLamb}
                                onChange={(e) => handlePriceChange(product.id, 'priceLamb', e.target.value)}
                                className={cn(
                                  "w-full px-3 py-2 rounded-lg border text-left font-sans focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all dark:bg-surface-800 dark:text-white",
                                  lambChanged ? "border-secondary dark:border-secondary bg-secondary/5 dark:bg-secondary/20 text-secondary dark:text-secondary font-bold" : "border-surface-200 dark:border-surface-700 bg-white"
                                )}
                                placeholder="—"
                                dir="ltr"
                              />
                              {lambChanged && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-secondary dark:text-secondary">
                                  تغییر کرده
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <div className="relative w-48">
                              <input
                                type="text"
                                value={editState.priceTwoTeeth === null ? '' : editState.priceTwoTeeth}
                                onChange={(e) => handlePriceChange(product.id, 'priceTwoTeeth', e.target.value)}
                                className={cn(
                                  "w-full px-3 py-2 rounded-lg border text-left font-sans focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all dark:bg-surface-800 dark:text-white",
                                  twoTeethChanged ? "border-secondary dark:border-secondary bg-secondary/5 dark:bg-secondary/20 text-secondary dark:text-secondary font-bold" : "border-surface-200 dark:border-surface-700 bg-white"
                                )}
                                placeholder="—"
                                dir="ltr"
                              />
                              {twoTeethChanged && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-secondary dark:text-secondary">
                                  تغییر کرده
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Action Bar for Mobile/Long pages */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white dark:bg-surface-950 border-t border-surface-200 dark:border-surface-800 p-4 flex justify-between items-center shadow-lg z-30 animate-in slide-in-from-bottom-4">
          <span className="font-medium text-amber-600 hidden sm:block">تغییرات ذخیره نشده دارید. برای اعمال آن‌ها دکمه ذخیره را بزنید.</span>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl hover:bg-primary-hover shadow-md font-bold w-full sm:w-auto justify-center"
          >
            <Save className="w-5 h-5" />
            ذخیره همه تغییرات
          </button>
        </div>
      )}
    </div>
  );
}
