import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Settings, History, Edit3, Menu, X, Printer, ListTree } from 'lucide-react';
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
];

export function AdminLayout() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { settings } = useDB();


  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900 flex">
      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-surface-900/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 right-0 z-50 w-64 bg-primary text-white transition-transform duration-300 lg:static lg:translate-x-0",
        isMobileOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="h-full flex flex-col">
          <div className="h-16 flex items-center justify-between px-6 border-b border-white/10">
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

          <div className="p-4 border-t border-white/10 space-y-2">
            <NavLink
              to="/price-list"
              className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:bg-white/5 hover:text-white transition-colors"
            >
              <Printer className="w-5 h-5" />
              مشاهده لیست چاپ
            </NavLink>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-surface-50 dark:bg-surface-900 transition-colors">
        <header className="h-16 bg-white dark:bg-surface-950 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between px-4 lg:px-8 shrink-0 transition-colors">
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
            <span className="px-3 py-1 bg-surface-100 dark:bg-surface-800 rounded-full font-medium text-surface-600 dark:text-surface-300">مدیر سیستم</span>
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
