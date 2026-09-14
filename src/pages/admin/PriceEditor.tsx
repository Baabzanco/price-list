import { useState, useEffect, useMemo } from 'react';
import { useDB } from '../../lib/useDB';
import { db, Category } from '../../lib/db';
import { Save, AlertCircle, CheckCircle2, Zap, Search } from 'lucide-react';
import { cn } from '../../lib/utils';

export function PriceEditor() {
  const { categories, products, settings, user } = useDB();
  
  // Local state to track edits before saving
  const [edits, setEdits] = useState<Record<string, { priceLamb: number | null, priceTwoTeeth: number | null }>>({});
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  const hasChanges = Object.keys(edits).some(id => {
    const product = products.find(p => p.id === id);
    if (!product) return false;
    return edits[id].priceLamb !== product.priceLamb || edits[id].priceTwoTeeth !== product.priceTwoTeeth;
  });

  const handleSave = async () => {
    try {
      const changedProducts = Object.keys(edits).filter(id => {
        const product = products.find(p => p.id === id);
        if (!product) return false;
        return edits[id].priceLamb !== product.priceLamb || edits[id].priceTwoTeeth !== product.priceTwoTeeth;
      });

      const updates = changedProducts.map(id => ({
        id,
        priceLamb: edits[id].priceLamb,
        priceTwoTeeth: edits[id].priceTwoTeeth
      }));

      if (updates.length > 0) {
        await db.updateProductPrices(updates, user?.id || 'admin');
      }
      
      await db.updateSettings({ lastUpdated: new Date().toISOString() });
      
      setToast({ type: 'success', message: 'قیمت‌ها با موفقیت ذخیره شدند.' });
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error(error);
      setToast({ type: 'error', message: 'خطا در ذخیره قیمت‌ها.' });
    }
  };

  const handleBulkApply = () => {
    const numValue = parseFloat(bulkValue);
    if (isNaN(numValue)) return;

    setEdits(prev => {
      const next = { ...prev };
      
      products.forEach(p => {
        if (bulkTarget !== 'all' && p.categoryId !== bulkTarget) return;
        
        const category = categories.find(c => c.id === p.categoryId);
        const currentEdit = next[p.id] || { priceLamb: p.priceLamb, priceTwoTeeth: p.priceTwoTeeth };
        const updated = { ...currentEdit };

        const applyChange = (val: number | null) => {
          if (val === null) return null;
          if (bulkType === 'fixed') {
            return Math.max(0, val + numValue);
          } else {
            return Math.max(0, Math.round(val * (1 + numValue / 100)));
          }
        };

        if ((bulkField === 'both' || bulkField === 'lamb') && (category?.hasLamb ?? true)) {
          updated.priceLamb = applyChange(currentEdit.priceLamb);
        }
        
        if ((bulkField === 'both' || bulkField === 'two_teeth') && (category?.hasTwoTeeth ?? true)) {
          updated.priceTwoTeeth = applyChange(currentEdit.priceTwoTeeth);
        }

        next[p.id] = updated;
      });
      return next;
    });

    setBulkValue('');
    setToast({ type: 'success', message: 'تغییرات گروهی اعمال شد. برای تایید نهایی روی دکمه ذخیره کلیک کنید.' });
    setTimeout(() => setToast(null), 3000);
  };

  const getNestedCategories = (parentId: string | null, depth = 0): (Category & { depth: number })[] => {
    let result: (Category & { depth: number })[] = [];
    const children = categories.filter(c => c.parentId === parentId);
    for (const child of children) {
      result.push({ ...child, depth });
      result = result.concat(getNestedCategories(child.id, depth + 1));
    }
    return result;
  };
  const orderedCategories = getNestedCategories(null);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return orderedCategories;
    const lowerQuery = searchQuery.toLowerCase();
    
    // Include category if it matches OR if it has a product that matches
    return orderedCategories.filter(cat => {
      if (cat.name.toLowerCase().includes(lowerQuery)) return true;
      const catProducts = products.filter(p => p.categoryId === cat.id && p.isActive);
      return catProducts.some(p => p.name.toLowerCase().includes(lowerQuery));
    });
  }, [orderedCategories, products, searchQuery]);

  return (
    <div className="space-y-6 pb-24">
      {toast && (
        <div className={cn(
          "p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4",
          toast.type === 'success' ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400"
        )}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="font-medium">{toast.message}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-surface-900 dark:text-white">ویرایش سریع قیمت‌ها</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1 text-sm">تغییر قیمت محصولات و اعمال تغییرات گروهی</p>
        </div>
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-xl hover:bg-primary-hover disabled:opacity-50 transition-colors font-medium shadow-sm shadow-primary/20"
        >
          <Save className="w-5 h-5" />
          ذخیره تغییرات
        </button>
      </div>

      {/* Bulk Edit Section */}
      <div className="bg-surface-50 dark:bg-surface-800/50 p-4 lg:p-5 rounded-2xl border border-surface-200 dark:border-surface-700 flex flex-col lg:flex-row gap-4 items-end">
        <div className="flex-1 space-y-1.5 w-full">
          <label className="text-xs font-bold text-surface-600 dark:text-surface-400 uppercase tracking-wider">دسته‌بندی هدف</label>
          <select 
            value={bulkTarget}
            onChange={e => setBulkTarget(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white dark:bg-surface-900 dark:text-white"
          >
            <option value="all">همه دسته‌ها</option>
            {orderedCategories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {'  '.repeat(cat.depth)}{cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 space-y-1.5 w-full">
          <label className="text-xs font-bold text-surface-600 dark:text-surface-400 uppercase tracking-wider">فیلد هدف</label>
          <select 
            value={bulkField}
            onChange={e => setBulkField(e.target.value as any)}
            className="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white dark:bg-surface-900 dark:text-white"
          >
            <option value="both">هر دو (بره و دودندان)</option>
            <option value="lamb">فقط قیمت بره</option>
            <option value="two_teeth">فقط قیمت دودندان</option>
          </select>
        </div>

        <div className="flex-1 space-y-1.5 w-full">
          <label className="text-xs font-bold text-surface-600 dark:text-surface-400 uppercase tracking-wider">نوع تغییر</label>
          <select 
            value={bulkType}
            onChange={e => setBulkType(e.target.value as any)}
            className="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white dark:bg-surface-900 dark:text-white"
          >
            <option value="fixed">مبلغ ثابت (افزایش/کاهش)</option>
            <option value="percent">درصد (افزایش/کاهش)</option>
          </select>
        </div>
        
        <div className="flex-1 space-y-1.5 w-full">
          <label className="text-xs font-bold text-surface-600 dark:text-surface-400 uppercase tracking-wider">مقدار</label>
          <input 
            type="text" 
            placeholder="مثال: 50 یا 50-" 
            value={bulkValue}
            onChange={e => setBulkValue(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white dark:bg-surface-900 dark:text-white"
            dir="ltr"
          />
        </div>
        
        <button
          onClick={handleBulkApply}
          disabled={!bulkValue}
          className="w-full lg:w-auto flex items-center justify-center gap-2 bg-surface-800 dark:bg-surface-700 text-white px-5 py-2 rounded-lg hover:bg-surface-900 dark:hover:bg-surface-600 disabled:opacity-50 transition-colors font-medium h-[42px]"
        >
          <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
          اعمال گروهی
        </button>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
        <input
          type="text"
          placeholder="جستجوی کالا یا دسته‌بندی..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-4 pr-11 py-3 rounded-xl border border-surface-200 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all bg-white dark:bg-surface-900 dark:text-white shadow-sm"
        />
      </div>

      <div className="space-y-8">
        {filteredCategories.map(category => {
          // Find active products for this category
          const allCatProducts = products.filter(p => p.categoryId === category.id && p.isActive);
          
          // Filter by search query if applicable
          const categoryProducts = searchQuery.trim() 
            ? allCatProducts.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || category.name.toLowerCase().includes(searchQuery.toLowerCase()))
            : allCatProducts;

          if (categoryProducts.length === 0) return null;

          return (
            <div key={category.id} className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden" style={{ marginRight: `${category.depth}rem` }}>
              <div className="px-6 py-4 bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-800">
                <h3 className="font-bold text-lg text-primary dark:text-white">{category.name}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800">
                    <tr>
                      <th className="px-6 py-3 font-medium text-surface-600 dark:text-surface-400 w-1/3">نام کالا</th>
                      {category.hasLamb && (
                        <th className="px-6 py-3 font-medium text-surface-600 dark:text-surface-400">قیمت بره ({settings.currency})</th>
                      )}
                      {category.hasTwoTeeth && (
                        <th className="px-6 py-3 font-medium text-surface-600 dark:text-surface-400">قیمت دو دندان ({settings.currency})</th>
                      )}
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
                          
                          {!product.hasLamb && !product.hasTwoTeeth ? (
                            <td colSpan={category.hasLamb && category.hasTwoTeeth ? 2 : 1} className="px-6 py-3">
                              <div className="relative w-48 mx-auto">
                                <input
                                  type="text"
                                  value={editState.priceLamb === null ? '' : editState.priceLamb}
                                  onChange={(e) => handlePriceChange(product.id, 'priceLamb', e.target.value)}
                                  className={cn(
                                    "w-full px-3 py-2 rounded-lg border text-left font-sans focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all dark:bg-surface-800 dark:text-white",
                                    lambChanged ? "border-secondary dark:border-secondary bg-secondary/5 dark:bg-secondary/20 text-secondary dark:text-secondary font-bold" : "border-surface-200 dark:border-surface-700 bg-white"
                                  )}
                                  placeholder="قیمت واحد"
                                  dir="ltr"
                                />
                                {lambChanged && (
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-secondary dark:text-secondary">
                                    تغییر کرده
                                  </span>
                                )}
                              </div>
                            </td>
                          ) : (
                            <>
                              {category.hasLamb && (
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
                              )}

                              {category.hasTwoTeeth && (
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
                              )}
                            </>
                          )}
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
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-xl hover:bg-primary-hover transition-colors font-medium shadow-sm shadow-primary/20"
          >
            <Save className="w-5 h-5" />
            ذخیره تغییرات
          </button>
        </div>
      )}
    </div>
  );
}
