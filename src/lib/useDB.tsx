import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { db, Category, Product, PriceHistory, Settings } from './db';

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
  refresh: () => Promise<void>;
}

const DBContext = createContext<DBState | null>(null);

export function DBProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Omit<DBState, 'refresh'>>({
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
    <DBContext.Provider value={{ ...data, refresh }}>
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
