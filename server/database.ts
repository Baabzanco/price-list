import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEYLEN = 32;
const PBKDF2_DIGEST = 'sha256';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString('hex');
  return `pbkdf2:${PBKDF2_ITERATIONS}:${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) return false;

  // New salted PBKDF2 format
  if (storedHash.startsWith('pbkdf2:')) {
    const parts = storedHash.split(':');
    if (parts.length !== 4) return false;
    const iterations = parseInt(parts[1], 10);
    const salt = parts[2];
    const originalHash = parts[3];
    const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, originalHash.length / 2, PBKDF2_DIGEST).toString('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(derivedKey, 'hex'), Buffer.from(originalHash, 'hex'));
    } catch {
      return false;
    }
  }

  // Legacy fallback: unsalted single-pass SHA-256 (64 hex characters)
  if (storedHash.length === 64) {
    const legacyHash = crypto.createHash('sha256').update(password).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(legacyHash, 'hex'), Buffer.from(storedHash, 'hex'));
    } catch {
      return false;
    }
  }

  return false;
}


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
  hasLamb?: boolean;
  hasTwoTeeth?: boolean;
  fontSize?: number | null;
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
  footerTextRight?: string;
  footerTextLeft?: string;
  dateMode?: 'today' | 'last_updated';
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
  footerTextRight: 'پاسخگویی از ساعت',
  footerTextLeft: 'تماس با خط ویژه:',
  dateMode: 'today',
};

const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.join(dbDir, 'database.sqlite');
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
      fontSize INTEGER,
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

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      expiresAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      keyPrefix TEXT NOT NULL,
      keyHash TEXT NOT NULL,
      scopes TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      expiresAt TEXT,
      lastUsedAt TEXT,
      isActive INTEGER NOT NULL DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(keyHash);
  `);
  try { db.prepare("ALTER TABLE categories ADD COLUMN parentId TEXT").run(); } catch(e){}
  try { db.prepare("ALTER TABLE categories ADD COLUMN hasLamb INTEGER NOT NULL DEFAULT 1").run(); } catch(e){}
  try { db.prepare("ALTER TABLE categories ADD COLUMN hasTwoTeeth INTEGER NOT NULL DEFAULT 1").run(); } catch(e){}
  try { db.prepare("ALTER TABLE products ADD COLUMN hasLamb INTEGER NOT NULL DEFAULT 1").run(); } catch(e){}
  try { db.prepare("ALTER TABLE products ADD COLUMN hasTwoTeeth INTEGER NOT NULL DEFAULT 1").run(); } catch(e){}
  try { db.prepare("ALTER TABLE products ADD COLUMN fontSize INTEGER").run(); } catch(e){}

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

  // Seed default user if empty
  const userCount = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    db.prepare('INSERT INTO users (id, username, password, name, role, createdAt) VALUES (?, ?, ?, ?, ?, ?)')
      .run(uuidv4(), 'admin', hashPassword('admin'), 'مدیر سیستم', 'admin', new Date().toISOString());
  }

  // Seed default internal read-only API key if empty
  const keyCount = db.prepare('SELECT count(*) as count FROM api_keys').get() as { count: number };
  if (keyCount.count === 0) {
    const rawKey = 'plk_internal_readonly_' + crypto.randomBytes(16).toString('hex');
    const keyPrefix = rawKey.substring(0, 10);
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    db.prepare('INSERT INTO api_keys (id, name, keyPrefix, keyHash, scopes, createdAt, expiresAt, isActive) VALUES (?, ?, ?, ?, ?, ?, NULL, 1)')
      .run(uuidv4(), 'کلید پیش‌فرض سرویس داخلی (سیستم دوم)', keyPrefix, keyHash, JSON.stringify(['read:products', 'read:categories', 'read:prices']), new Date().toISOString());
    console.log(`[AUTH] Generated default internal read-only API Key: ${rawKey}`);
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

export function deleteCategory(id: string) {
  const productCount = (db.prepare('SELECT count(*) as count FROM products WHERE categoryId = ?').get(id) as any).count;
  if (productCount > 0) {
    throw new Error(`امکان حذف دسته‌بندی وجود ندارد؛ ${productCount} قلم کالا به این دسته‌بندی اختصاص دارد.`);
  }
  const childCount = (db.prepare('SELECT count(*) as count FROM categories WHERE parentId = ?').get(id) as any).count;
  if (childCount > 0) {
    throw new Error(`امکان حذف دسته‌بندی وجود ندارد؛ این دسته‌بندی دارای ${childCount} زیرمجموعه است.`);
  }
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  return { success: true };
}

export function getProducts(): Product[] {
  const rows = db.prepare('SELECT * FROM products ORDER BY sortOrder ASC').all();
  return rows.map((r: any) => ({ ...r, isActive: !!r.isActive, hasLamb: !!r.hasLamb, hasTwoTeeth: !!r.hasTwoTeeth, fontSize: r.fontSize ?? null }));
}

export function getProductsByCategory(categoryId: string): Product[] {
  const rows = db.prepare('SELECT * FROM products WHERE categoryId = ? ORDER BY sortOrder ASC').all(categoryId);
  return rows.map((r: any) => ({ ...r, isActive: !!r.isActive, hasLamb: !!r.hasLamb, hasTwoTeeth: !!r.hasTwoTeeth, fontSize: r.fontSize ?? null }));
}

export function addProduct(categoryId: string, name: string, hasLamb: boolean = true, hasTwoTeeth: boolean = true, fontSize: number | null = null): Product {
  const sortOrder = db.prepare('SELECT COALESCE(MAX(sortOrder), 0) + 1 as nextSort FROM products WHERE categoryId = ?').get(categoryId) as { nextSort: number };
  const id = `p_${uuidv4()}`;
  const now = new Date().toISOString();
  db.prepare('INSERT INTO products (id, categoryId, name, isActive, sortOrder, createdAt, updatedAt, hasLamb, hasTwoTeeth, fontSize) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?)')
    .run(id, categoryId, name, sortOrder.nextSort, now, now, hasLamb ? 1 : 0, hasTwoTeeth ? 1 : 0, fontSize ? Number(fontSize) : null);
  
  return {
    id, categoryId, name, priceLamb: null, priceTwoTeeth: null, isActive: true, sortOrder: sortOrder.nextSort, createdAt: now, updatedAt: now, hasLamb, hasTwoTeeth, fontSize: fontSize ? Number(fontSize) : null
  };
}

export function removeProduct(id: string) {
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
}

export function reorderProducts(updates: { id: string, sortOrder: number }[]) {
  if (!Array.isArray(updates)) {
    throw new Error('لیست ترتیب محصولات معتبر نیست.');
  }
  const stmt = db.prepare('UPDATE products SET sortOrder = ? WHERE id = ?');
  const transaction = db.transaction((items) => {
    for (const update of items) {
      if (update && update.id) {
        stmt.run(Number(update.sortOrder) || 0, update.id);
      }
    }
  });
  transaction(updates);
}

export function toggleProductActive(id: string) {
  db.prepare('UPDATE products SET isActive = NOT isActive WHERE id = ?').run(id);
}

export function updateProduct(id: string, name: string, categoryId: string, hasLamb: boolean = true, hasTwoTeeth: boolean = true, fontSize: number | null = null) {
  const now = new Date().toISOString();
  db.prepare('UPDATE products SET name = ?, categoryId = ?, updatedAt = ?, hasLamb = ?, hasTwoTeeth = ?, fontSize = ? WHERE id = ?')
    .run(name, categoryId, now, hasLamb ? 1 : 0, hasTwoTeeth ? 1 : 0, fontSize ? Number(fontSize) : null, id);
}

export function updateProductPrices(updates: { id: string; priceLamb: number | null; priceTwoTeeth: number | null }[], userId: string) {
  if (!Array.isArray(updates)) {
    throw new Error('لیست قیمت‌های ارسالی معتبر نیست.');
  }
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

export function getBackupData() {
  const categories = getCategories();
  const products = getProducts();
  const priceHistory = getPriceHistory();
  const settings = getSettings();
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    categories,
    products,
    priceHistory,
    settings
  };
}

export function restoreBackupData(data: any) {
  if (!data || typeof data !== 'object') {
    throw new Error('فایل پشتیبان نامعتبر است.');
  }
  if (!Array.isArray(data.categories)) {
    throw new Error('بخش دسته‌بندی‌ها (categories) در فایل پشتیبان وجود ندارد.');
  }
  if (!Array.isArray(data.products)) {
    throw new Error('بخش محصولات (products) در فایل پشتیبان وجود ندارد.');
  }

  const transaction = db.transaction(() => {
    // Clear existing tables
    db.prepare('DELETE FROM price_history').run();
    db.prepare('DELETE FROM products').run();
    db.prepare('DELETE FROM categories').run();
    db.prepare('DELETE FROM settings').run();
    
    // Insert categories
    const insertCategory = db.prepare('INSERT INTO categories (id, name, isActive, sortOrder, parentId, hasLamb, hasTwoTeeth) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const cat of data.categories) {
      insertCategory.run(
        cat.id, 
        cat.name, 
        cat.isActive ? 1 : 0, 
        cat.sortOrder ?? 1, 
        cat.parentId || null, 
        cat.hasLamb ? 1 : 0, 
        cat.hasTwoTeeth ? 1 : 0
      );
    }
    
    // Insert products
    const insertProduct = db.prepare('INSERT INTO products (id, categoryId, name, priceLamb, priceTwoTeeth, isActive, sortOrder, createdAt, updatedAt, hasLamb, hasTwoTeeth, fontSize) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const prod of data.products) {
      insertProduct.run(
        prod.id, 
        prod.categoryId, 
        prod.name, 
        prod.priceLamb ?? null, 
        prod.priceTwoTeeth ?? null, 
        prod.isActive ? 1 : 0, 
        prod.sortOrder ?? 1, 
        prod.createdAt || new Date().toISOString(), 
        prod.updatedAt || new Date().toISOString(),
        prod.hasLamb ? 1 : 0,
        prod.hasTwoTeeth ? 1 : 0,
        prod.fontSize ? Number(prod.fontSize) : null
      );
    }
    
    // Insert price history
    const histories = data.priceHistory || data.price_history || [];
    if (Array.isArray(histories) && histories.length > 0) {
      const insertHistory = db.prepare('INSERT INTO price_history (id, productId, priceType, oldPrice, newPrice, changedAt, changedBy) VALUES (?, ?, ?, ?, ?, ?, ?)');
      for (const h of histories) {
        insertHistory.run(
          h.id || uuidv4(), 
          h.productId, 
          h.priceType || 'lamb', 
          h.oldPrice ?? null, 
          h.newPrice ?? null, 
          h.changedAt || new Date().toISOString(), 
          h.changedBy || 'system'
        );
      }
    }
    
    // Insert settings
    const currentSettings = data.settings || DEFAULT_SETTINGS;
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('app_settings', JSON.stringify(currentSettings));
  });
  
  transaction();

  return {
    success: true,
    categoriesCount: data.categories.length,
    productsCount: data.products.length,
    historyCount: (data.priceHistory || data.price_history || []).length
  };
}

export function runMigration(data: any) {
  return restoreBackupData(data);
}

export function getUsers() {
  const rows = db.prepare('SELECT id, username, name, role, createdAt FROM users ORDER BY createdAt DESC').all();
  return rows;
}

export function addUser(username: string, passwordPlain: string, name: string, role: string) {
  const id = uuidv4();
  const passwordHash = hashPassword(passwordPlain);
  const createdAt = new Date().toISOString();
  db.prepare('INSERT INTO users (id, username, password, name, role, createdAt) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, username, passwordHash, name, role, createdAt);
  return { id, username, name, role, createdAt };
}

export function updateUser(id: string, username: string, passwordPlain: string | null, name: string, role: string) {
  const existing = db.prepare('SELECT username FROM users WHERE id = ?').get(id) as any;
  if (!existing) {
    throw new Error('کاربر مورد نظر یافت نشد.');
  }

  // Ensure root admin stays admin
  const effectiveRole = existing.username === 'admin' ? 'admin' : role;

  if (passwordPlain && passwordPlain.trim() !== '') {
    const passwordHash = hashPassword(passwordPlain.trim());
    db.prepare('UPDATE users SET username = ?, password = ?, name = ?, role = ? WHERE id = ?')
      .run(username.trim(), passwordHash, name.trim(), effectiveRole, id);
  } else {
    db.prepare('UPDATE users SET username = ?, name = ?, role = ? WHERE id = ?')
      .run(username.trim(), name.trim(), effectiveRole, id);
  }
  return { id, username: username.trim(), name: name.trim(), role: effectiveRole };
}

export function removeUser(id: string, requestingUserId?: string) {
  const user = db.prepare('SELECT username, role FROM users WHERE id = ?').get(id) as any;
  if (!user) {
    throw new Error('کاربر مورد نظر یافت نشد.');
  }
  if (user.username === 'admin') {
    throw new Error('حساب کاربری ریشه (admin) غیرقابل حذف است.');
  }
  if (requestingUserId && id === requestingUserId) {
    throw new Error('شما نمی‌توانید حساب کاربری فعال خودتان را حذف کنید.');
  }

  // Ensure at least one admin remains
  if (user.role === 'admin') {
    const adminCount = (db.prepare("SELECT count(*) as count FROM users WHERE role = 'admin'").get() as any).count;
    if (adminCount <= 1) {
      throw new Error('حداقل یک کاربر با نقش مدیر ارشد باید در سیستم فعال باشد.');
    }
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  return { success: true };
}

export function validateUser(username: string, passwordPlain: string) {
  const user = db.prepare('SELECT id, username, password, name, role FROM users WHERE username = ?').get(username) as any;
  if (!user) return null;

  const isValid = verifyPassword(passwordPlain, user.password);
  if (!isValid) return null;

  // Transparently migrate legacy SHA-256 hash to PBKDF2
  if (!user.password.startsWith('pbkdf2:')) {
    try {
      const newSaltedHash = hashPassword(passwordPlain);
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(newSaltedHash, user.id);
      console.log(`[AUTH] Successfully migrated password hash to PBKDF2 for user: ${username}`);
    } catch (err) {
      console.error('Failed to migrate password hash', err);
    }
  }

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role
  };
}

// --- Session Management ---

export function createSession(userId: string, ttlDays = 7): string {
  const token = crypto.randomBytes(32).toString('hex');
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();
  
  db.prepare('INSERT INTO sessions (token, userId, createdAt, expiresAt) VALUES (?, ?, ?, ?)').run(
    token, userId, createdAt, expiresAt
  );
  return token;
}

export function getSessionUser(token: string) {
  if (!token) return null;
  const now = new Date().toISOString();
  const session = db.prepare(`
    SELECT s.token, s.userId, s.expiresAt, u.id, u.username, u.name, u.role
    FROM sessions s
    JOIN users u ON s.userId = u.id
    WHERE s.token = ? AND s.expiresAt > ?
  `).get(token, now) as any;
  
  if (!session) return null;
  return {
    id: session.id,
    username: session.username,
    name: session.name,
    role: session.role
  };
}

export function deleteSession(token: string) {
  if (!token) return;
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

// --- API Key Management (Internal Read-Only API) ---

export interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes: string[];
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  isActive: boolean;
}

const ALLOWED_READ_SCOPES = ['read:products', 'read:categories', 'read:prices'];

export function createApiKey(name: string, requestedScopes: string[] = ['read:products', 'read:categories', 'read:prices'], expiresInDays?: number | null): { key: string; record: Omit<ApiKeyRecord, 'keyHash'> } {
  if (!name || typeof name !== 'string' || name.trim() === '') {
    throw new Error('عنوان سامانه برای صدور کلید الزامی است.');
  }

  // Filter requested scopes strictly to allowed read-only scopes
  const scopes = Array.isArray(requestedScopes)
    ? requestedScopes.filter(s => ALLOWED_READ_SCOPES.includes(s))
    : ALLOWED_READ_SCOPES;

  if (scopes.length === 0) {
    throw new Error('حداقل یکی از مجوزهای خواندن باید انتخاب شود.');
  }

  const id = uuidv4();
  const rawSecret = crypto.randomBytes(24).toString('hex');
  const fullKey = `plk_${rawSecret}`;
  const keyPrefix = fullKey.substring(0, 10);
  const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');
  const createdAt = new Date().toISOString();
  
  let expiresAt: string | null = null;
  if (expiresInDays && Number(expiresInDays) > 0) {
    expiresAt = new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000).toISOString();
  }
  
  db.prepare(`
    INSERT INTO api_keys (id, name, keyPrefix, keyHash, scopes, createdAt, expiresAt, isActive)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `).run(id, name.trim(), keyPrefix, keyHash, JSON.stringify(scopes), createdAt, expiresAt);
  
  return {
    key: fullKey,
    record: {
      id,
      name: name.trim(),
      keyPrefix,
      scopes,
      createdAt,
      expiresAt,
      lastUsedAt: null,
      isActive: true
    }
  };
}

export function validateApiKey(rawKey: string, requiredScope?: string) {
  if (!rawKey || typeof rawKey !== 'string' || !rawKey.startsWith('plk_')) return null;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const now = new Date().toISOString();
  
  const keyRow = db.prepare(`
    SELECT * FROM api_keys WHERE keyHash = ? AND isActive = 1
  `).get(keyHash) as any;
  
  if (!keyRow) return null;

  // Constant-time comparison in runtime memory for defense-in-depth against timing side-channels
  try {
    const isMatch = crypto.timingSafeEqual(
      Buffer.from(keyHash, 'hex'),
      Buffer.from(keyRow.keyHash, 'hex')
    );
    if (!isMatch) return null;
  } catch {
    return null;
  }
  
  if (keyRow.expiresAt && keyRow.expiresAt <= now) {
    return { error: 'EXPIRED' };
  }
  
  let scopes: string[] = [];
  try {
    scopes = JSON.parse(keyRow.scopes);
  } catch {
    scopes = [];
  }
  
  // Strict scope enforcement: only the exact granular scope is authorized
  if (requiredScope && !scopes.includes(requiredScope)) {
    return { error: 'INSUFFICIENT_SCOPE', requiredScope, availableScopes: scopes };
  }
  
  // Record usage timestamp safely
  try {
    db.prepare('UPDATE api_keys SET lastUsedAt = ? WHERE id = ?').run(now, keyRow.id);
  } catch {}
  
  return {
    id: keyRow.id,
    name: keyRow.name,
    scopes,
    isValid: true
  };
}

export function getApiKeys(): Omit<ApiKeyRecord, 'keyHash'>[] {
  const rows = db.prepare('SELECT id, name, keyPrefix, scopes, createdAt, expiresAt, lastUsedAt, isActive FROM api_keys ORDER BY createdAt DESC').all();
  return rows.map((r: any) => ({
    ...r,
    scopes: typeof r.scopes === 'string' ? JSON.parse(r.scopes) : r.scopes,
    isActive: !!r.isActive
  }));
}

export function revokeApiKey(id: string) {
  db.prepare('UPDATE api_keys SET isActive = 0 WHERE id = ?').run(id);
  return { success: true };
}

export function deleteApiKey(id: string) {
  db.prepare('DELETE FROM api_keys WHERE id = ?').run(id);
  return { success: true };
}

