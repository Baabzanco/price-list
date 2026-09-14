import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface Category {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  parentId: string | null;
  hasLamb: boolean;
  hasTwoTeeth: boolean;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  priceLamb: number | null;
  priceTwoTeeth: number | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PriceHistory {
  id: string;
  productId: string;
  priceType: 'lamb' | 'two_teeth';
  oldPrice: number | null;
  newPrice: number | null;
  changedAt: string;
  changedBy: string;
}

export interface Settings {
  companyName: string;
  title: string;
  subtitle: string;
  phone: string;
  hours: string;
  logoUrl: string;
  logoLightUrl?: string;
  logoDarkUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  currency: string;
  lastUpdated: string | null;
}

const SEED_CATEGORIES: Category[] = [
  { id: 'cat_1', name: 'گوسفندی', isActive: true, sortOrder: 1, parentId: null, hasLamb: true, hasTwoTeeth: true },
  { id: 'cat_2', name: 'استخوان دار گوسفندی', isActive: true, sortOrder: 2, parentId: null, hasLamb: true, hasTwoTeeth: true },
  { id: 'cat_3', name: 'آلایشات', isActive: true, sortOrder: 3, parentId: null, hasLamb: true, hasTwoTeeth: true },
  { id: 'cat_4', name: 'گوساله جوانه', isActive: true, sortOrder: 4, parentId: null, hasLamb: true, hasTwoTeeth: true },
  { id: 'cat_5', name: 'مرغ', isActive: true, sortOrder: 5, parentId: null, hasLamb: true, hasTwoTeeth: true },
];

const SEED_PRODUCTS_RAW = [
  // گوسفندی
  { categoryId: 'cat_1', name: 'ران گوسفندی (شیشک)' },
  { categoryId: 'cat_1', name: 'سردست گوسفندی (شیشک)' },
  { categoryId: 'cat_1', name: 'کفدست گوسفندی (شیشک)' },
  { categoryId: 'cat_1', name: 'ران بره' },
  { categoryId: 'cat_1', name: 'سردست بره' },
  { categoryId: 'cat_1', name: 'کفدست بره' },
  { categoryId: 'cat_1', name: 'قلوه گاه بی استخوان ممتاز گوسفندی' },
  { categoryId: 'cat_1', name: 'قلوه گاه با استخوان گوسفندی' },
  { categoryId: 'cat_1', name: 'گردن گوسفندی' },
  { categoryId: 'cat_1', name: 'راسته بدون استخوان ممتاز گوسفندی' },
  { categoryId: 'cat_1', name: 'فیله ممتاز گوسفندی' },
  { categoryId: 'cat_1', name: 'خرده گوشت گوسفندی' },
  { categoryId: 'cat_1', name: 'دنبه گوسفندی' },
  
  // استخوان دار گوسفندی
  { categoryId: 'cat_2', name: 'شیشلیک شاندیز عالی' },
  { categoryId: 'cat_2', name: 'راسته با استخوان گوسفندی' },
  { categoryId: 'cat_2', name: 'شیشلیک برگ ممتاز' },
  
  // آلایشات
  { categoryId: 'cat_3', name: 'ماهیچه گوسفندی' },
  { categoryId: 'cat_3', name: 'مغز گوسفندی' },
  { categoryId: 'cat_3', name: 'زبان گوسفندی' },
  { categoryId: 'cat_3', name: 'جگر و قلوه گوسفندی' },
  { categoryId: 'cat_3', name: 'کله پاچه تمیز بدون کیست و مغز حرام' },
  { categoryId: 'cat_3', name: 'گردن اسلایسی' },
  
  // گوساله جوانه
  { categoryId: 'cat_4', name: 'ران بدون استخوان ممتاز گوساله' },
  { categoryId: 'cat_4', name: 'ران مغز شده گوساله' },
  { categoryId: 'cat_4', name: 'سردست با گردن بدون استخوان ممتاز گوساله' },
  { categoryId: 'cat_4', name: 'سردست بدون گردن بدون استخوان ممتاز گوساله' },
  { categoryId: 'cat_4', name: 'سردست بدون گردن بدون استخوان سوپر ممتاز گوساله' },
  { categoryId: 'cat_4', name: 'کتف بدون استخوان ممتاز گوساله' },
  { categoryId: 'cat_4', name: 'سرسینه معمولی گوساله' },
  { categoryId: 'cat_4', name: 'سرسینه ممتاز گوساله' },
  { categoryId: 'cat_4', name: 'گردن بدون استخوان ممتاز گوساله' },
  { categoryId: 'cat_4', name: 'ماهیچه مغز شده گوساله' },
  { categoryId: 'cat_4', name: 'قلوه‌گاه بدون استخوان ممتاز گوساله' },
  { categoryId: 'cat_4', name: 'تویوز خالی گوساله' },
  { categoryId: 'cat_4', name: 'خرده راسته بدون تویوز گوساله' },
  { categoryId: 'cat_4', name: 'راسته مغز گوساله' },
  { categoryId: 'cat_4', name: 'فیله مغز گوساله سایز ۹۰۰ تا ۱۲۰۰' },
  { categoryId: 'cat_4', name: 'فیله مغز گوساله سایز ۱۲۰۰ تا ۱۶۰۰' },
  { categoryId: 'cat_4', name: 'فیله مغز گوساله سایز ۱۶۰۰ گرم به بالا' },
  { categoryId: 'cat_4', name: 'خرده بدن گوساله' },
  { categoryId: 'cat_4', name: 'چربی بدن گوساله (شمله)' },
  
  // مرغ
  { categoryId: 'cat_5', name: 'شنیسل سینه استیکی ممتاز' },
  { categoryId: 'cat_5', name: 'ران با پوست بدون کمر ممتاز' },
  { categoryId: 'cat_5', name: 'ران بدون پوست بدون کمر ممتاز' },
  { categoryId: 'cat_5', name: 'بال بازو سه تکه' },
  { categoryId: 'cat_5', name: 'بال بازو بدون نوک دو تکه' }
];

const SEED_PRODUCTS: Product[] = SEED_PRODUCTS_RAW.map((p, index) => ({
  id: `p_${index + 1}`,
  categoryId: p.categoryId,
  name: p.name,
  priceLamb: null,
  priceTwoTeeth: null,
  isActive: true,
  sortOrder: index + 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}));

const DEFAULT_SETTINGS: Settings = {
  companyName: 'پروتئین گل محمدی',
  title: 'لیست قیمت شرکت',
  subtitle: '(دامداری، کشتار و پخش گوشت)',
  phone: '۰۲۱-۳۷۹۵۹۰۰۰',
  hours: '۹ الی ۱۷',
  logoUrl: '',
  primaryColor: '#124A57',
  secondaryColor: '#CD78B3',
  currency: 'هزار تومان',
  lastUpdated: null,
};

const dbPath = path.join(process.cwd(), 'data', 'database.sqlite');
const db = new Database(dbPath);

// Enable WAL for better concurrency and foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      isActive INTEGER NOT NULL DEFAULT 1,
      sortOrder INTEGER NOT NULL,
      parentId TEXT,
      hasLamb INTEGER NOT NULL DEFAULT 1,
      hasTwoTeeth INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      categoryId TEXT NOT NULL,
      name TEXT NOT NULL,
      priceLamb REAL,
      priceTwoTeeth REAL,
      isActive INTEGER NOT NULL DEFAULT 1,
      sortOrder INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      hasLamb INTEGER NOT NULL DEFAULT 1,
      hasTwoTeeth INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY(categoryId) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS price_history (
      id TEXT PRIMARY KEY,
      productId TEXT NOT NULL,
      priceType TEXT NOT NULL,
      oldPrice REAL,
      newPrice REAL,
      changedAt TEXT NOT NULL,
      changedBy TEXT NOT NULL,
      FOREIGN KEY(productId) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  try { db.prepare("ALTER TABLE categories ADD COLUMN parentId TEXT").run(); } catch(e){}
  try { db.prepare("ALTER TABLE categories ADD COLUMN hasLamb INTEGER NOT NULL DEFAULT 1").run(); } catch(e){}
  try { db.prepare("ALTER TABLE categories ADD COLUMN hasTwoTeeth INTEGER NOT NULL DEFAULT 1").run(); } catch(e){}
  try { db.prepare("ALTER TABLE products ADD COLUMN hasLamb INTEGER NOT NULL DEFAULT 1").run(); } catch(e){}
  try { db.prepare("ALTER TABLE products ADD COLUMN hasTwoTeeth INTEGER NOT NULL DEFAULT 1").run(); } catch(e){}

  // Seed data if empty
  const categoryCount = db.prepare('SELECT count(*) as count FROM categories').get() as { count: number };
  if (categoryCount.count === 0) {
    const insertCategory = db.prepare('INSERT INTO categories (id, name, isActive, sortOrder, parentId, hasLamb, hasTwoTeeth) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const insertProduct = db.prepare('INSERT INTO products (id, categoryId, name, priceLamb, priceTwoTeeth, isActive, sortOrder, createdAt, updatedAt, hasLamb, hasTwoTeeth) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    
    const transaction = db.transaction(() => {
      for (const cat of SEED_CATEGORIES) {
        insertCategory.run(cat.id, cat.name, cat.isActive ? 1 : 0, cat.sortOrder, cat.parentId || null, cat.hasLamb ? 1 : 0, cat.hasTwoTeeth ? 1 : 0);
      }
      for (const prod of SEED_PRODUCTS) {
        insertProduct.run(
  prod.id,
  prod.categoryId,
  prod.name,
  prod.priceLamb,
  prod.priceTwoTeeth,
  prod.isActive ? 1 : 0,
  prod.sortOrder,
  prod.createdAt,
  prod.updatedAt,
  prod.hasLamb ? 1 : 0,
  prod.hasTwoTeeth ? 1 : 0
);
      }
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('app_settings', JSON.stringify(DEFAULT_SETTINGS));
    });
    
    transaction();
  }
}

export function getCategories(): Category[] {
  const rows = db.prepare('SELECT * FROM categories ORDER BY sortOrder ASC').all();
  return rows.map((r: any) => ({ ...r, isActive: !!r.isActive, hasLamb: !!r.hasLamb, hasTwoTeeth: !!r.hasTwoTeeth }));
}

export function addCategory(name: string, parentId: string | null = null, hasLamb: boolean = true, hasTwoTeeth: boolean = true): Category {
  const sortOrder = db.prepare('SELECT COALESCE(MAX(sortOrder), 0) + 1 as nextSort FROM categories').get() as { nextSort: number };
  const id = uuidv4();
  db.prepare('INSERT INTO categories (id, name, isActive, sortOrder, parentId, hasLamb, hasTwoTeeth) VALUES (?, ?, 1, ?, ?, ?, ?)').run(
    id, name, sortOrder.nextSort, parentId, hasLamb ? 1 : 0, hasTwoTeeth ? 1 : 0
  );
  return { id, name, isActive: true, sortOrder: sortOrder.nextSort, parentId, hasLamb, hasTwoTeeth };
}

export function updateCategory(id: string, name: string, parentId: string | null = null, hasLamb: boolean = true, hasTwoTeeth: boolean = true) {
  db.prepare('UPDATE categories SET name = ?, parentId = ?, hasLamb = ?, hasTwoTeeth = ? WHERE id = ?').run(
    name, parentId, hasLamb ? 1 : 0, hasTwoTeeth ? 1 : 0, id
  );
}

export function toggleCategoryActive(id: string) {
  db.prepare('UPDATE categories SET isActive = NOT isActive WHERE id = ?').run(id);
}

export function getProducts(): Product[] {
  const rows = db.prepare('SELECT * FROM products ORDER BY sortOrder ASC').all();
  return rows.map((r: any) => ({ ...r, isActive: !!r.isActive }));
}

export function getProductsByCategory(categoryId: string): Product[] {
  const rows = db.prepare('SELECT * FROM products WHERE categoryId = ? ORDER BY sortOrder ASC').all(categoryId);
  return rows.map((r: any) => ({ ...r, isActive: !!r.isActive }));
}

export function addProduct(categoryId: string, name: string, hasLamb: boolean = true, hasTwoTeeth: boolean = true): Product {
  const sortOrder = db.prepare('SELECT COALESCE(MAX(sortOrder), 0) + 1 as nextSort FROM products WHERE categoryId = ?').get(categoryId) as { nextSort: number };
  const id = `p_${uuidv4()}`;
  const now = new Date().toISOString();
  db.prepare('INSERT INTO products (id, categoryId, name, isActive, sortOrder, createdAt, updatedAt, hasLamb, hasTwoTeeth) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?)')
    .run(id, categoryId, name, sortOrder.nextSort, now, now, hasLamb ? 1 : 0, hasTwoTeeth ? 1 : 0);
  
  return {
    id, categoryId, name, priceLamb: null, priceTwoTeeth: null, isActive: true, sortOrder: sortOrder.nextSort, createdAt: now, updatedAt: now, hasLamb, hasTwoTeeth
  };
}

export function removeProduct(id: string) {
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
}

export function toggleProductActive(id: string) {
  db.prepare('UPDATE products SET isActive = NOT isActive WHERE id = ?').run(id);
}

export function updateProduct(id: string, name: string, categoryId: string, hasLamb: boolean = true, hasTwoTeeth: boolean = true) {
  const now = new Date().toISOString();
  db.prepare('UPDATE products SET name = ?, categoryId = ?, updatedAt = ?, hasLamb = ?, hasTwoTeeth = ? WHERE id = ?').run(name, categoryId, now, hasLamb ? 1 : 0, hasTwoTeeth ? 1 : 0, id);
}

export function updateProductPrices(updates: { id: string; priceLamb: number | null; priceTwoTeeth: number | null }[], userId: string) {
  const now = new Date().toISOString();
  
  const getProduct = db.prepare('SELECT * FROM products WHERE id = ?');
  const updateProduct = db.prepare('UPDATE products SET priceLamb = ?, priceTwoTeeth = ?, updatedAt = ? WHERE id = ?');
  const insertHistory = db.prepare('INSERT INTO price_history (id, productId, priceType, oldPrice, newPrice, changedAt, changedBy) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const updateSettings = db.prepare("UPDATE settings SET value = json_set(value, '$.lastUpdated', ?) WHERE key = 'app_settings'");

  let historyAdded = false;

  const transaction = db.transaction(() => {
    for (const update of updates) {
      const p = getProduct.get(update.id) as any;
      if (!p) continue;
      
      if (update.priceLamb !== p.priceLamb) {
        insertHistory.run(uuidv4(), update.id, 'lamb', p.priceLamb, update.priceLamb, now, userId);
        historyAdded = true;
      }
      
      if (update.priceTwoTeeth !== p.priceTwoTeeth) {
        insertHistory.run(uuidv4(), update.id, 'two_teeth', p.priceTwoTeeth, update.priceTwoTeeth, now, userId);
        historyAdded = true;
      }
      
      updateProduct.run(update.priceLamb, update.priceTwoTeeth, now, update.id);
    }
    
    if (historyAdded) {
      updateSettings.run(now);
    }
  });
  
  transaction();
}

export function getPriceHistory(): PriceHistory[] {
  return db.prepare('SELECT * FROM price_history ORDER BY changedAt DESC').all() as PriceHistory[];
}

export function getSettings(): Settings {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'app_settings'").get() as { value: string };
  if (row) return JSON.parse(row.value);
  return DEFAULT_SETTINGS;
}

export function updateSettings(newSettings: Partial<Settings>) {
  const current = getSettings();
  const merged = { ...current, ...newSettings };
  db.prepare("UPDATE settings SET value = ? WHERE key = 'app_settings'").run(JSON.stringify(merged));
}

export function getStats() {
  const activeProducts = (db.prepare('SELECT count(*) as count FROM products WHERE isActive = 1').get() as any).count;
  const categoriesCount = (db.prepare('SELECT count(*) as count FROM categories').get() as any).count;
  
  const todayStr = new Date().toISOString().split('T')[0];
  const changesToday = (db.prepare('SELECT count(*) as count FROM price_history WHERE changedAt LIKE ?').get(todayStr + '%') as any).count;
  
  const settings = getSettings();
  
  return {
    activeProducts,
    categoriesCount,
    changesToday,
    lastUpdated: settings.lastUpdated
  };
}

export function runMigration(data: any) {
  const transaction = db.transaction(() => {
    // Clear existing
    db.prepare('DELETE FROM price_history').run();
    db.prepare('DELETE FROM products').run();
    db.prepare('DELETE FROM categories').run();
    db.prepare('DELETE FROM settings').run();
    
    const insertCategory = db.prepare('INSERT INTO categories (id, name, isActive, sortOrder, parentId, hasLamb, hasTwoTeeth) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const cat of data.categories) {
      insertCategory.run(cat.id, cat.name, cat.isActive ? 1 : 0, cat.sortOrder, cat.parentId || null, cat.hasLamb ? 1 : 0, cat.hasTwoTeeth ? 1 : 0);
    }
    
    const insertProduct = db.prepare('INSERT INTO products (id, categoryId, name, priceLamb, priceTwoTeeth, isActive, sortOrder, createdAt, updatedAt, hasLamb, hasTwoTeeth) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const prod of data.products) {
      insertProduct.run(prod.id, prod.categoryId, prod.name, prod.priceLamb, prod.priceTwoTeeth, prod.isActive ? 1 : 0, prod.sortOrder, prod.createdAt, prod.updatedAt);
    }
    
    const insertHistory = db.prepare('INSERT INTO price_history (id, productId, priceType, oldPrice, newPrice, changedAt, changedBy) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const h of (data.priceHistory || [])) {
      insertHistory.run(h.id, h.productId, h.priceType, h.oldPrice, h.newPrice, h.changedAt, h.changedBy);
    }
    
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('app_settings', JSON.stringify(data.settings));
  });
  
  transaction();
}
