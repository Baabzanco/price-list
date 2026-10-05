import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Settings, History, Edit3, Menu, X, Printer, ListTree, Users, LogOut, Lock } from 'lucide-react';
import { cn } from '../lib/utils';
import { useDB } from '../lib/useDB';
import { ThemeToggle } from '../components/ThemeToggle';

const navItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'داشبورد' },
  { to: '/admin/prices', icon: Edit3, label: 'ویرایش قیمت‌ها' },
  { to: '/admin/products', icon: FileText, label: 'مدیریت اقلام' },
  { to: '/admin/categories', icon: ListTree, label: 'دسته‌بندی‌ها' },
  { to: '/admin/history', icon: History, label: 'تاریخچه تغییرات' },
  { to: '/admin/settings', icon: Settings, label: 'تنظیمات سیستم' },
  { to: '/admin/users', icon: Users, label: 'مدیریت کاربران' },
];

export function AdminLayout() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { settings, user, login, logout } = useDB();

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setLoginError('لطفاً نام کاربری و رمز عبور را وارد کنید.');
      return;
    }
    try {
      setIsLoggingIn(true);
      await login(loginUsername.trim(), loginPassword.trim());
    } catch (err: any) {
      setLoginError(err.message || 'نام کاربری یا رمز عبور اشتباه است.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (!user) {
    // Render beautiful full screen Persian login page
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex flex-col items-center justify-center p-4 transition-colors" dir="rtl">
        <div className="w-full max-w-md bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl shadow-xl overflow-hidden p-6 lg:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary dark:text-white mb-2">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-surface-900 dark:text-white">ورود به پنل مدیریت</h2>
            <p className="text-sm text-surface-500 dark:text-surface-400">لیست قیمت {settings.companyName || 'شرکت'}</p>
          </div>

          {loginError && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm font-bold rounded-xl flex items-center gap-2">
              <X className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-surface-700 dark:text-surface-300">نام کاربری</label>
              <input
                type="text"
                value={loginUsername}
                onChange={e => setLoginUsername(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono transition-all text-left"
                placeholder="username"
                autoComplete="username"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-surface-700 dark:text-surface-300">رمز عبور</label>
              <input
                type="password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-left"
                placeholder="password"
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-primary hover:bg-primary-hover text-white py-3 rounded-xl transition-all font-bold shadow-md shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isLoggingIn ? 'درحال بررسی...' : 'ورود به پنل'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900 flex" dir="rtl">
      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-surface-900/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 right-0 z-50 w-64 bg-primary text-white transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:translate-x-0",
        isMobileOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="h-full flex flex-col overflow-hidden">
          <div className="h-16 flex items-center justify-between px-6 border-b border-white/10 shrink-0">
            <span className="text-lg font-bold truncate">{settings.companyName}</span>
            <button className="lg:hidden" onClick={() => setIsMobileOpen(false)}>
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
          
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                  isActive ? "bg-white/15 text-white font-medium" : "text-white/70 hover:bg-white/5 hover:text-white"
                )}
                onClick={() => setIsMobileOpen(false)}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-white/10 space-y-2 shrink-0">
            <NavLink
              to="/price-list"
              className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:bg-white/5 hover:text-white transition-colors"
            >
              <Printer className="w-5 h-5" />
              مشاهده لیست چاپ
            </NavLink>
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-rose-300 hover:bg-white/5 hover:text-rose-200 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              خروج از حساب
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-surface-50 dark:bg-surface-900 transition-colors">
        <header className="h-16 bg-white dark:bg-surface-950 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between px-4 lg:px-8 shrink-0 transition-colors sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-800 dark:text-surface-200"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-surface-900 dark:text-white hidden sm:block">پنل مدیریت</h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <span className="px-3 py-1 bg-surface-100 dark:bg-surface-800 rounded-full font-medium text-surface-600 dark:text-surface-300">{user.name}</span>
          </div>
        </header>
        
        <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
