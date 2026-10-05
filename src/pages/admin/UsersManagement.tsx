import React, { useState, useEffect } from 'react';
import { useDB } from '../../lib/useDB';
import { db, User } from '../../lib/db';
import { UserPlus, Edit, Trash2, Shield, Save, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export function UsersManagement() {
  const { user: currentUser } = useDB();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');
  const [isSaving, setIsSaving] = useState(false);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const data = await db.getUsers();
      setUsers(data);
    } catch (err: any) {
      showToast('error', 'خطا در دریافت لیست کاربران');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setName('');
    setUsername('');
    setPassword('');
    setRole('admin');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setUsername(user.username);
    setPassword('');
    setRole(user.role);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (id === currentUser?.id) {
      showToast('error', 'شما نمی‌توانید حساب کاربری فعال خودتان را حذف کنید.');
      return;
    }
    const targetUser = users.find(u => u.id === id);
    if (targetUser?.username === 'admin') {
      showToast('error', 'کاربر پیش‌فرض سیستم (admin) قابل حذف نیست.');
      return;
    }

    if (!window.confirm('آیا از حذف این کاربر اطمینان دارید؟')) return;

    try {
      await db.removeUser(id);
      showToast('success', 'کاربر با موفقیت حذف شد.');
      fetchUsers();
    } catch (err) {
      showToast('error', 'خطا در حذف کاربر');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim()) {
      showToast('error', 'لطفاً نام و نام‌کاربری را وارد کنید.');
      return;
    }

    // Password is required for new users
    if (!editingUser && !password) {
      showToast('error', 'لطفاً رمز عبور را وارد کنید.');
      return;
    }

    try {
      setIsSaving(true);
      if (editingUser) {
        await db.updateUser(editingUser.id, {
          username: username.trim(),
          name: name.trim(),
          role,
          password: password ? password : undefined
        });
        showToast('success', 'اطلاعات کاربر با موفقیت ویرایش شد.');
      } else {
        await db.addUser({
          username: username.trim().toLowerCase(),
          name: name.trim(),
          role,
          password
        });
        showToast('success', 'کاربر جدید با موفقیت تعریف شد.');
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      showToast('error', err.message || 'خطا در ذخیره اطلاعات');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
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
          <h1 className="text-2xl font-black text-surface-900 dark:text-white">مدیریت کاربران سیستم</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1 text-sm">تعریف و ویرایش دسترسی کاربران پنل مدیریت قیمت‌ها</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl hover:bg-primary-hover transition-colors font-medium shadow-sm shadow-primary/20"
        >
          <UserPlus className="w-5 h-5" />
          کاربر جدید
        </button>
      </div>

      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center items-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-800">
                <tr>
                  <th className="px-6 py-4 font-bold text-surface-700 dark:text-surface-300">نام و نام‌خانوادگی</th>
                  <th className="px-6 py-4 font-bold text-surface-700 dark:text-surface-300">نام کاربری</th>
                  <th className="px-6 py-4 font-bold text-surface-700 dark:text-surface-300">نقش سیستم</th>
                  <th className="px-6 py-4 font-bold text-surface-700 dark:text-surface-300">تاریخ ایجاد</th>
                  <th className="px-6 py-4 font-bold text-surface-700 dark:text-surface-300 text-left">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {users.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-50/30 dark:hover:bg-surface-800/30">
                    <td className="px-6 py-4 font-medium text-surface-900 dark:text-white">{item.name}</td>
                    <td className="px-6 py-4 font-mono text-surface-600 dark:text-surface-400">{item.username}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary dark:bg-white/10 dark:text-white rounded-full font-bold text-xs">
                        <Shield className="w-3.5 h-3.5" />
                        {item.role === 'admin' ? 'مدیر ارشد' : 'همکار'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-surface-500 font-sans tabular-nums" dir="ltr" style={{ textAlign: 'right' }}>
                      {new Date(item.createdAt).toLocaleDateString('fa-IR')}
                    </td>
                    <td className="px-6 py-4 text-left">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-blue-600 hover:text-blue-700 transition-colors"
                          title="ویرایش"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className={cn(
                            "p-1.5 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-rose-500 hover:text-rose-600 transition-colors",
                            (item.id === currentUser?.id || item.username === 'admin') && "opacity-30 cursor-not-allowed"
                          )}
                          disabled={item.id === currentUser?.id || item.username === 'admin'}
                          title="حذف"
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

      {/* Modal Setup */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-surface-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-surface-900 rounded-2xl w-full max-w-md shadow-xl overflow-hidden border border-surface-100 dark:border-surface-800 animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between">
              <h3 className="font-black text-lg text-surface-900 dark:text-white">
                {editingUser ? 'ویرایش کاربر' : 'تعریف کاربر جدید'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-surface-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-surface-700 dark:text-surface-300">نام و نام‌خانوادگی</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-surface-700 dark:text-surface-300">نام کاربری</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  disabled={editingUser?.username === 'admin'}
                  className={cn(
                    "w-full px-3.5 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono",
                    editingUser?.username === 'admin' && "opacity-50"
                  )}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-surface-700 dark:text-surface-300">
                  {editingUser ? 'رمز عبور جدید (در صورت تمایل به تغییر)' : 'رمز عبور'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required={!editingUser}
                  placeholder={editingUser ? '••••••••' : ''}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-surface-700 dark:text-surface-300">نقش سیستم</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  disabled={editingUser?.username === 'admin'}
                  className="w-full px-3.5 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                >
                  <option value="admin">مدیر ارشد (دسترسی کامل)</option>
                  <option value="editor">همکار (فقط ویرایش قیمت‌ها)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors font-medium text-sm"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors font-medium flex items-center gap-1.5 text-sm shadow-sm"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  ذخیره اطلاعات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
