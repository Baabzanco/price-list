import { useState, useEffect } from 'react';
import { db, DatabaseSchema } from './db';

export function useDB() {
  const [data, setData] = useState({
    categories: db.getCategories(),
    products: db.getProducts(),
    history: db.getPriceHistory(),
    settings: db.getSettings(),
    stats: db.getStats(),
  });

  useEffect(() => {
    const handleUpdate = () => {
      setData({
        categories: db.getCategories(),
        products: db.getProducts(),
        history: db.getPriceHistory(),
        settings: db.getSettings(),
        stats: db.getStats(),
      });
    };

    window.addEventListener('db-updated', handleUpdate);
    return () => window.removeEventListener('db-updated', handleUpdate);
  }, []);

  return data;
}
