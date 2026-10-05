import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { db, Category, Product, PriceHistory, Settings, User } from './db';

interface DBState {
  categories: Category[];
  products: Product[];
  history: PriceHistory[];
  settings: Settings;
  stats: {
    activeProducts: number;
    categoriesCount: number;
    changesToday: number;
    lastUpdated: string | null;
  };
  isLoading: boolean;
  error: string | null;
  user: User | null;
  refresh: () => Promise<void>;
  login: (username: string, passwordPlain: string) => Promise<void>;
  logout: () => void;
}

const DBContext = createContext<DBState | null>(null);

export function DBProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('price_list_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const handleLogin = async (username: string, passwordPlain: string) => {
    const res = await db.login(username, passwordPlain);
    if (res.success && res.user) {
      setUser(res.user);
      localStorage.setItem('price_list_user', JSON.stringify(res.user));
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('price_list_user');
  };

  const [data, setData] = useState<Omit<DBState, 'refresh' | 'user' | 'login' | 'logout'>>({
    categories: [],
    products: [],
    history: [],
    settings: {
      companyName: '',
      title: '',
      subtitle: '',
      phone: '',
      hours: '',
      logoUrl: '',
      primaryColor: '#124A57',
      secondaryColor: '#CD78B3',
      currency: 'هزار تومان',
      lastUpdated: null,
    },
    stats: {
      activeProducts: 0,
      categoriesCount: 0,
      changesToday: 0,
      lastUpdated: null,
    },
    isLoading: true,
    error: null,
  });

  const loadData = useCallback(async () => {
    try {
      // Check for legacy localStorage DB
      const localData = localStorage.getItem('meat_price_list_db');
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          if (parsed.isSeeded) {
            await db.migrateFromLocal(parsed);
          }
        } catch (e) {
          console.error('Failed to migrate local data', e);
        }
        localStorage.removeItem('meat_price_list_db');
      }

      const [categories, products, history, settings, stats] = await Promise.all([
        db.getCategories(),
        db.getProducts(),
        db.getPriceHistory(),
        db.getSettings(),
        db.getStats()
      ]);
      setData({
        categories,
        products,
        history,
        settings,
        stats,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      console.error('Failed to load DB', err);
      setData(prev => ({ ...prev, isLoading: false, error: err.message }));
    }
  }, []);

  useEffect(() => {
    loadData();
    window.addEventListener('db-updated', loadData);
    return () => window.removeEventListener('db-updated', loadData);
  }, [loadData]);

  const refresh = async () => {
    await loadData();
    window.dispatchEvent(new Event('db-updated'));
  };

  return (
    <DBContext.Provider value={{ ...data, refresh, user, login: handleLogin, logout: handleLogout }}>
      {data.isLoading ? (
        <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-900 text-primary">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        children
      )}
    </DBContext.Provider>
  );
}

export function useDB() {
  const context = useContext(DBContext);
  if (!context) {
    throw new Error('useDB must be used within a DBProvider');
  }
  return context;
}
