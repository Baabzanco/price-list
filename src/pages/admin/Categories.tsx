import { useState } from 'react';
import { useDB } from '../../lib/useDB';
import { db } from '../../lib/db';
import { Save, CheckCircle2, Edit2, X, Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Categories() {
  const { categories } = useDB();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await db.updateCategory(id, editName.trim());
      setToast({ type: 'success', message: 'دسته‌بندی با موفقیت ویرایش شد.' });
      setTimeout(() => setToast(null), 3000);
      setEditingId(null);
    } catch (e) {
      setToast({ type: 'error', message: 'خطا در ویرایش دسته‌بندی.' });
    }
  };

  const toggleVisibility = async (id: string) => {
    try {
      await db.toggleCategoryActive(id);
      setToast({ type: 'success', message: 'وضعیت نمایش دسته‌بندی تغییر کرد.' });
    } catch (e) {
      setToast({ type: 'error', message: 'خطا در تغییر وضعیت دسته‌بندی.' });
    }
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-surface-900 dark:text-white">مدیریت دسته‌بندی‌ها</h2>
        <p className="text-surface-600 dark:text-surface-400 mt-1">تغییر نام و وضعیت نمایش دسته‌بندی‌ها.</p>
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

      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden">
        <table className="w-full text-right text-sm">
          <thead className="bg-surface-50 dark:bg-surface-800/50 text-surface-600 dark:text-surface-400 border-b border-surface-200 dark:border-surface-800">
            <tr>
              <th className="px-6 py-4 font-medium">نام دسته‌بندی</th>
              <th className="px-6 py-4 font-medium w-32">وضعیت</th>
              <th className="px-6 py-4 font-medium w-40">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
            {categories.map((category) => (
              <tr key={category.id} className={cn("hover:bg-surface-50/50 dark:hover:bg-surface-800/50", !category.isActive && "opacity-60")}>
                <td className="px-6 py-4">
                  {editingId === category.id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full max-w-sm px-3 py-1.5 rounded-lg border border-primary bg-transparent text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                      autoFocus
                    />
                  ) : (
                    <span className="font-medium text-surface-900 dark:text-white">{category.name}</span>
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
                        onClick={() => startEdit(category.id, category.name)}
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
