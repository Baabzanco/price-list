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
  logout: () => Promise<void>;
}

const DBContext = createContext<DBState | null>(null);

export function DBProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('price_list_user');
    const token = localStorage.getItem('price_list_token');
    if (saved && token) {
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

  const handleLogout = async () => {
    await db.logout();
    setUser(null);
    window.dispatchEvent(new Event('db-updated'));
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
      // 1. Fetch public datasets (always available)
      const [categories, products, settings] = await Promise.all([
        db.getCategories(),
        db.getProducts(),
        db.getSettings()
      ]);

      let history: PriceHistory[] = [];
      let stats = {
        activeProducts: products.filter(p => p.isActive).length,
        categoriesCount: categories.length,
        changesToday: 0,
        lastUpdated: settings.lastUpdated
      };

      // 2. Fetch authenticated datasets if logged in
      if (db.getToken()) {
        try {
          const [fetchedHistory, fetchedStats] = await Promise.all([
            db.getPriceHistory(),
            db.getStats()
          ]);
          history = fetchedHistory;
          stats = fetchedStats;
        } catch (authErr) {
          // Token might be invalid or expired
          console.warn('Authenticated data fetch skipped:', authErr);
        }
      }

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

  // Validate session on start
  useEffect(() => {
    if (db.getToken() && user) {
      db.getMe()
        .then(res => {
          if (res?.user) {
            setUser(res.user);
            localStorage.setItem('price_list_user', JSON.stringify(res.user));
          }
        })
        .catch(() => {
          db.setToken(null);
          localStorage.removeItem('price_list_user');
          setUser(null);
        });
    }
  }, []);

  useEffect(() => {
    loadData();
    window.addEventListener('db-updated', loadData);
    
    const onAuthExpired = () => {
      setUser(null);
      loadData();
    };
    window.addEventListener('auth-expired', onAuthExpired);

    return () => {
      window.removeEventListener('db-updated', loadData);
      window.removeEventListener('auth-expired', onAuthExpired);
    };
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
