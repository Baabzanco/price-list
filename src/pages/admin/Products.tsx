import React, { useState, useMemo } from 'react';
import { useDB } from '../../lib/useDB';
import { db, Category } from '../../lib/db';
import { CheckCircle2, Eye, EyeOff, Plus, Trash2, Search, Edit2, Save, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Products() {
  const { categories, products } = useDB();
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  const [newProductName, setNewProductName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newHasLamb, setNewHasLamb] = useState(true);
  const [newHasTwoTeeth, setNewHasTwoTeeth] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string, categoryId: string, hasLamb: boolean, hasTwoTeeth: boolean }>({ name: '', categoryId: '', hasLamb: true, hasTwoTeeth: true });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim() || !selectedCategory) return;
    try {
      await db.addProduct(selectedCategory, newProductName.trim(), newHasLamb, newHasTwoTeeth);
      setNewProductName('');
      setNewHasLamb(true);
      setNewHasTwoTeeth(true);
      showToast('محصول جدید با موفقیت اضافه شد.');
    } catch (error) {
      showToast('خطا در افزودن محصول.', 'error');
    }
  };

  const toggleVisibility = async (id: string) => {
    try {
      await db.toggleProductActive(id);
      showToast('وضعیت نمایش محصول تغییر کرد.');
    } catch (error) {
      showToast('خطا در تغییر وضعیت محصول.', 'error');
    }
  };

  const removeProduct = async (id: string) => {
    if (confirm('آیا از حذف این محصول اطمینان دارید؟')) {
      try {
        await db.removeProduct(id);
        showToast('محصول با موفقیت حذف شد.');
      } catch (error) {
        showToast('خطا در حذف محصول.', 'error');
      }
    }
  };

  const startEdit = (p: any) => {
    setEditingId(p.id);
    setEditForm({ name: p.name, categoryId: p.categoryId, hasLamb: p.hasLamb ?? true, hasTwoTeeth: p.hasTwoTeeth ?? true });
  };

  const saveEdit = async (id: string) => {
    if (!editForm.name.trim() || !editForm.categoryId) return;
    try {
      await db.updateProduct(id, editForm.name.trim(), editForm.categoryId, editForm.hasLamb, editForm.hasTwoTeeth);
      showToast('محصول با موفقیت ویرایش شد.');
      setEditingId(null);
    } catch (error) {
      showToast('خطا در ویرایش محصول.', 'error');
    }
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

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    return products.filter(p => 
      p.name.includes(searchQuery) || 
      categories.find(c => c.id === p.categoryId)?.name.includes(searchQuery)
    );
  }, [products, searchQuery, categories]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-surface-900 dark:text-white">مدیریت اقلام</h2>
          <p className="text-surface-600 dark:text-surface-400 mt-1">افزودن، ویرایش و حذف اقلام.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="جستجو در اقلام..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-surface-200 bg-white dark:bg-surface-800 dark:border-surface-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <Search className="w-5 h-5 text-surface-400 absolute left-3 top-2.5" />
        </div>
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
      <form onSubmit={handleAddProduct} className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6 shadow-sm flex flex-col lg:flex-row gap-4 items-end">
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
        <div className="w-full lg:w-48 space-y-1.5">
          <label className="text-sm font-medium text-surface-700 dark:text-surface-300">دسته‌بندی</label>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 dark:bg-surface-800 dark:border-surface-700 dark:text-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
            required
          >
            <option value="">انتخاب دسته</option>
            {orderedCategories.map(c => (
              <option key={c.id} value={c.id}>{'\u00A0\u00A0'.repeat(c.depth)}{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-4 items-center h-[46px] px-2 w-full lg:w-auto">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={newHasLamb} onChange={e => setNewHasLamb(e.target.checked)} className="w-4 h-4 rounded text-primary focus:ring-primary/20 bg-white border-surface-300 dark:border-surface-600 dark:bg-surface-800" />
            <span className="text-sm font-medium text-surface-700 dark:text-surface-300 whitespace-nowrap">قیمت بره</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={newHasTwoTeeth} onChange={e => setNewHasTwoTeeth(e.target.checked)} className="w-4 h-4 rounded text-primary focus:ring-primary/20 bg-white border-surface-300 dark:border-surface-600 dark:bg-surface-800" />
            <span className="text-sm font-medium text-surface-700 dark:text-surface-300 whitespace-nowrap">قیمت دودندان</span>
          </label>
        </div>
        <button
          type="submit"
          className="w-full lg:w-auto px-6 h-[46px] bg-primary text-white rounded-xl font-medium hover:bg-primary-hover flex items-center justify-center gap-2 transition-colors shrink-0"
        >
          <Plus className="w-5 h-5" />
          <span>افزودن</span>
        </button>
      </form>

      {/* Products List */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-surface-50 dark:bg-surface-800/50 text-surface-600 dark:text-surface-400 border-b border-surface-200 dark:border-surface-800">
              <tr>
                <th className="px-6 py-4 font-medium">نام قلم</th>
                <th className="px-6 py-4 font-medium">دسته‌بندی</th>
                <th className="px-6 py-4 font-medium">پیکربندی ستون‌ها</th>
                <th className="px-6 py-4 font-medium text-left">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200 dark:divide-surface-800">
              {filteredProducts.map(product => {
                const category = categories.find(c => c.id === product.categoryId);
                const isEditing = editingId === product.id;

                return (
                  <tr key={product.id} className="hover:bg-surface-50/50 dark:hover:bg-surface-800/50 transition-colors">
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg border border-surface-200 bg-white dark:bg-surface-800 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      ) : (
                        <span className="font-medium text-surface-900 dark:text-white">
                          {product.name}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <select
                          value={editForm.categoryId}
                          onChange={e => setEditForm({ ...editForm, categoryId: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg border border-surface-200 bg-white dark:bg-surface-800 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          {orderedCategories.map(c => (
                            <option key={c.id} value={c.id}>{'\u00A0\u00A0'.repeat(c.depth)}{c.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-surface-600 dark:text-surface-400">
                          {category?.name || 'بدون دسته'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <div className="flex gap-4 items-center">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={editForm.hasLamb} onChange={e => setEditForm({ ...editForm, hasLamb: e.target.checked })} className="w-4 h-4 rounded text-primary bg-white border-surface-300 dark:bg-surface-800 dark:border-surface-600" />
                            <span className="text-sm">بره</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={editForm.hasTwoTeeth} onChange={e => setEditForm({ ...editForm, hasTwoTeeth: e.target.checked })} className="w-4 h-4 rounded text-primary bg-white border-surface-300 dark:bg-surface-800 dark:border-surface-600" />
                            <span className="text-sm">دودندان</span>
                          </label>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          {product.hasLamb && <span className="px-2 py-1 bg-surface-100 text-surface-600 rounded-md text-xs dark:bg-surface-800 dark:text-surface-400">بره</span>}
                          {product.hasTwoTeeth && <span className="px-2 py-1 bg-surface-100 text-surface-600 rounded-md text-xs dark:bg-surface-800 dark:text-surface-400">دودندان</span>}
                          {!product.hasLamb && !product.hasTwoTeeth && <span className="px-2 py-1 bg-surface-50 text-surface-400 rounded-md text-xs dark:bg-surface-800/50">هیچکدام</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button 
                              onClick={() => saveEdit(product.id)}
                              className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200"
                              title="ذخیره"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setEditingId(null)}
                              className="p-1.5 bg-surface-200 text-surface-700 rounded-lg hover:bg-surface-300 dark:bg-surface-700 dark:text-surface-300"
                              title="انصراف"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => startEdit(product)}
                              className="p-1.5 bg-surface-100 text-surface-600 rounded-lg hover:bg-surface-200 hover:text-primary transition-colors dark:bg-surface-800 dark:text-surface-400 dark:hover:text-primary"
                              title="ویرایش"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => toggleVisibility(product.id)}
                              className="p-1.5 bg-surface-100 text-surface-600 rounded-lg hover:bg-surface-200 transition-colors dark:bg-surface-800 dark:text-surface-400"
                              title={product.isActive ? "پنهان کردن" : "نمایش دادن"}
                            >
                              {product.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                            <button 
                              onClick={() => removeProduct(product.id)}
                              className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors dark:bg-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-900/50"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-surface-500">
                    هیچ موردی یافت نشد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
