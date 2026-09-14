import React, { useState } from 'react';
import { useDB } from '../../lib/useDB';
import { db } from '../../lib/db';
import { CheckCircle2, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Products() {
  const { categories, products } = useDB();
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  const [newProductName, setNewProductName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(categories[0]?.id || '');

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim() || !selectedCategory) return;
    try {
      db.addProduct(selectedCategory, newProductName.trim());
      setNewProductName('');
      showToast('محصول جدید با موفقیت اضافه شد.');
    } catch (error) {
      showToast('خطا در افزودن محصول.', 'error');
    }
  };

  const toggleVisibility = (id: string) => {
    try {
      db.toggleProductActive(id);
      showToast('وضعیت نمایش محصول تغییر کرد.');
    } catch (error) {
      showToast('خطا در تغییر وضعیت محصول.', 'error');
    }
  };

  const removeProduct = (id: string) => {
    if (confirm('آیا از حذف این محصول اطمینان دارید؟')) {
      try {
        db.removeProduct(id);
        showToast('محصول با موفقیت حذف شد.');
      } catch (error) {
        showToast('خطا در حذف محصول.', 'error');
      }
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-surface-900 dark:text-white">مدیریت اقلام</h2>
        <p className="text-surface-600 dark:text-surface-400 mt-1">افزودن، حذف و تغییر وضعیت نمایش اقلام لیست قیمت.</p>
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

      {/* Add New Product */}
      <form onSubmit={handleAddProduct} className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6 shadow-sm flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1 w-full space-y-1.5">
          <label className="text-sm font-medium text-surface-700 dark:text-surface-300">نام قلم جدید</label>
          <input
            type="text"
            value={newProductName}
            onChange={e => setNewProductName(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 dark:bg-surface-800 dark:border-surface-700 dark:text-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="مثال: ران ممتاز..."
            required
          />
        </div>
        <div className="w-full sm:w-64 space-y-1.5">
          <label className="text-sm font-medium text-surface-700 dark:text-surface-300">دسته‌بندی</label>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 dark:bg-surface-800 dark:border-surface-700 dark:text-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
            required
          >
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="w-full sm:w-auto px-6 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary-hover flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>افزودن</span>
        </button>
      </form>

      {/* Products List */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden">
        <table className="w-full text-right text-sm">
          <thead className="bg-surface-50 dark:bg-surface-800/50 text-surface-600 dark:text-surface-400 border-b border-surface-200 dark:border-surface-800">
            <tr>
              <th className="px-6 py-4 font-medium">نام قلم</th>
              <th className="px-6 py-4 font-medium">دسته‌بندی</th>
              <th className="px-6 py-4 font-medium w-32">وضعیت</th>
              <th className="px-6 py-4 font-medium w-32">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
            {products.map((product) => {
              const category = categories.find(c => c.id === product.categoryId);
              return (
                <tr key={product.id} className={cn("hover:bg-surface-50/50 dark:hover:bg-surface-800/50", !product.isActive && "opacity-60")}>
                  <td className="px-6 py-4 font-medium text-surface-900 dark:text-white">
                    {product.name}
                  </td>
                  <td className="px-6 py-4 text-surface-600 dark:text-surface-400">
                    {category?.name || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 text-xs font-medium rounded-full",
                      product.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400"
                    )}>
                      {product.isActive ? 'فعال' : 'غیرفعال'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => toggleVisibility(product.id)}
                        className="p-1.5 bg-surface-100 text-surface-600 rounded-lg hover:bg-surface-200 transition-colors dark:bg-surface-800 dark:text-surface-400"
                        title={product.isActive ? "مخفی کردن" : "نمایش دادن"}
                      >
                        {product.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button 
                        onClick={() => removeProduct(product.id)}
                        className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors dark:bg-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-900/50"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
}
