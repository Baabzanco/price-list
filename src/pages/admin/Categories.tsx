import React, { useState } from 'react';
import { useDB } from '../../lib/useDB';
import { db, Category } from '../../lib/db';
import { Save, CheckCircle2, Edit2, X, Eye, EyeOff, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Categories() {
  const { categories } = useDB();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{name: string, parentId: string, hasLamb: boolean, hasTwoTeeth: boolean}>({ name: '', parentId: '', hasLamb: true, hasTwoTeeth: true });
  
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState<{name: string, parentId: string, hasLamb: boolean, hasTwoTeeth: boolean}>({ name: '', parentId: '', hasLamb: true, hasTwoTeeth: true });

  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditForm({ name: cat.name, parentId: cat.parentId || '', hasLamb: cat.hasLamb, hasTwoTeeth: cat.hasTwoTeeth });
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string) => {
    if (!editForm.name.trim()) return;
    try {
      await db.updateCategory(id, editForm.name.trim(), editForm.parentId || null, editForm.hasLamb, editForm.hasTwoTeeth);
      showToast('دسته‌بندی با موفقیت ویرایش شد.');
      setEditingId(null);
    } catch (e) {
      showToast('خطا در ویرایش دسته‌بندی.', 'error');
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim()) return;
    try {
      await db.addCategory(addForm.name.trim(), addForm.parentId || null, addForm.hasLamb, addForm.hasTwoTeeth);
      showToast('دسته‌بندی جدید اضافه شد.');
      setIsAdding(false);
      setAddForm({ name: '', parentId: '', hasLamb: true, hasTwoTeeth: true });
    } catch (e) {
      showToast('خطا در افزودن دسته‌بندی.', 'error');
    }
  };

  const toggleVisibility = async (id: string) => {
    try {
      await db.toggleCategoryActive(id);
      showToast('وضعیت نمایش دسته‌بندی تغییر کرد.');
    } catch (e) {
      showToast('خطا در تغییر وضعیت.', 'error');
    }
  };

  // Helper to get nested categories
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-surface-900 dark:text-white">مدیریت دسته‌بندی‌ها</h2>
          <p className="text-surface-600 dark:text-surface-400 mt-1">ساختار درختی و تنظیمات نمایش قیمت‌ها.</p>
        </div>
        <button
          onClick={() => { setIsAdding(true); setEditingId(null); }}
          className="bg-primary text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-primary-hover transition-colors"
        >
          <Plus className="w-5 h-5" />
          دسته‌بندی جدید
        </button>
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

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-lg dark:text-white">افزودن دسته‌بندی جدید</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium dark:text-surface-300">نام دسته‌بندی</label>
              <input
                type="text"
                value={addForm.name}
                onChange={e => setAddForm({...addForm, name: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-surface-200 bg-surface-50 dark:bg-surface-800 dark:border-surface-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium dark:text-surface-300">دسته‌بندی مادر (اختیاری)</label>
              <select
                value={addForm.parentId}
                onChange={e => setAddForm({...addForm, parentId: e.target.value})}
                className="w-full px-3 py-2 rounded-xl border border-surface-200 bg-surface-50 dark:bg-surface-800 dark:border-surface-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">-- بدون دسته مادر --</option>
                {orderedCategories.map(c => (
                  <option key={c.id} value={c.id}>{'\u00A0\u00A0'.repeat(c.depth)}{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={addForm.hasLamb} onChange={e => setAddForm({...addForm, hasLamb: e.target.checked})} className="rounded text-primary focus:ring-primary" />
              <span className="text-sm font-medium dark:text-surface-300">دارای قیمت بره</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={addForm.hasTwoTeeth} onChange={e => setAddForm({...addForm, hasTwoTeeth: e.target.checked})} className="rounded text-primary focus:ring-primary" />
              <span className="text-sm font-medium dark:text-surface-300">دارای قیمت دودندان</span>
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-surface-600 hover:bg-surface-100 rounded-xl dark:text-surface-400 dark:hover:bg-surface-800">انصراف</button>
            <button type="submit" className="px-6 py-2 bg-primary text-white rounded-xl hover:bg-primary-hover font-medium">ذخیره</button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden">
        <table className="w-full text-right text-sm">
          <thead className="bg-surface-50 dark:bg-surface-800/50 text-surface-600 dark:text-surface-400 border-b border-surface-200 dark:border-surface-800">
            <tr>
              <th className="px-6 py-4 font-medium">نام دسته‌بندی</th>
              <th className="px-6 py-4 font-medium">تنظیمات قیمت</th>
              <th className="px-6 py-4 font-medium w-32">وضعیت</th>
              <th className="px-6 py-4 font-medium w-40">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
            {orderedCategories.map((category) => (
              <tr key={category.id} className={cn("hover:bg-surface-50/50 dark:hover:bg-surface-800/50", !category.isActive && "opacity-60")}>
                <td className="px-6 py-4">
                  <div className="flex items-center" style={{ paddingRight: `${category.depth * 20}px` }}>
                    {category.depth > 0 && <span className="text-surface-300 dark:text-surface-600 ml-2">↳</span>}
                    {editingId === category.id ? (
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={e => setEditForm({...editForm, name: e.target.value})}
                        className="w-full max-w-[200px] px-3 py-1.5 rounded-lg border border-primary bg-transparent text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                        autoFocus
                      />
                    ) : (
                      <span className={cn("font-medium text-surface-900 dark:text-white", category.depth === 0 && "text-base")}>{category.name}</span>
                    )}
                  </div>
                </td>
                
                <td className="px-6 py-4">
                  {editingId === category.id ? (
                    <div className="flex flex-col gap-2">
                      <select
                        value={editForm.parentId}
                        onChange={e => setEditForm({...editForm, parentId: e.target.value})}
                        className="w-full max-w-[200px] px-2 py-1 text-sm rounded border border-surface-200 bg-surface-50 dark:bg-surface-800 dark:border-surface-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary/20"
                      >
                        <option value="">-- دسته اصلی --</option>
                        {orderedCategories.filter(c => c.id !== category.id).map(c => (
                          <option key={c.id} value={c.id}>{'\u00A0\u00A0'.repeat(c.depth)}{c.name}</option>
                        ))}
                      </select>
                      <div className="flex items-center gap-3 mt-1">
                        <label className="flex items-center gap-1.5 text-xs">
                          <input type="checkbox" checked={editForm.hasLamb} onChange={e => setEditForm({...editForm, hasLamb: e.target.checked})} className="rounded text-primary" />
                          بره
                        </label>
                        <label className="flex items-center gap-1.5 text-xs">
                          <input type="checkbox" checked={editForm.hasTwoTeeth} onChange={e => setEditForm({...editForm, hasTwoTeeth: e.target.checked})} className="rounded text-primary" />
                          دودندان
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      {category.hasLamb && <span className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50">بره</span>}
                      {category.hasTwoTeeth && <span className="px-2 py-0.5 rounded text-xs bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800/50">دودندان</span>}
                      {!category.hasLamb && !category.hasTwoTeeth && <span className="text-xs text-surface-400">بدون ستون قیمت</span>}
                    </div>
                  )}
                </td>

                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-full",
                    category.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400"
                  )}>
                    {category.isActive ? 'فعال' : 'غیرفعال'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {editingId === category.id ? (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => saveEdit(category.id)}
                        className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200"
                        title="ذخیره"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={cancelEdit}
                        className="p-1.5 bg-surface-200 text-surface-700 rounded-lg hover:bg-surface-300 dark:bg-surface-700 dark:text-surface-300"
                        title="انصراف"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => startEdit(category)}
                        className="p-1.5 bg-surface-100 text-surface-600 rounded-lg hover:bg-surface-200 hover:text-primary transition-colors dark:bg-surface-800 dark:text-surface-400 dark:hover:text-primary"
                        title="ویرایش"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => toggleVisibility(category.id)}
                        className="p-1.5 bg-surface-100 text-surface-600 rounded-lg hover:bg-surface-200 transition-colors dark:bg-surface-800 dark:text-surface-400"
                        title={category.isActive ? "مخفی کردن" : "نمایش دادن"}
                      >
                        {category.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
