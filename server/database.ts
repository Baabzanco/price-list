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

export type CrmPriceType = 'single' | 'lamb' | 'two_teeth';

export interface ProductCrmMapping {
  id?: string;
  productId?: string;
  priceType: CrmPriceType;
  variantLabel: string;
  crmProductIndex: number;
  lastSyncStatus?: CrmSyncStatus | null;
  lastSyncedAt?: string | null;
  lastSyncError?: string | null;
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
  crmProductIndex?: number | null;
  crmLambIndex?: number | null;
  crmTwoTeethIndex?: number | null;
  crmMappings?: ProductCrmMapping[];
}

export type CrmSyncStatus = 'pending' | 'sending' | 'success' | 'failed' | 'needs_review';
export type CrmOperationType = 'auto' | 'manual' | 'retry';

export interface CrmSettings {
  apiUrl: string;
  liveTransmissionEnabled: boolean;
  priceUnitConfirmed: boolean;
  priceUnitLabel: string;
  priceMultiplier: number;
  priceSource: 'lamb_then_two_teeth' | 'two_teeth_then_lamb';
  authType: 'none' | 'bearer' | 'api_key_header';
  authHeaderName: string;
  timeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
  batchSize: number;
  rateLimitDelayMs: number;
  debounceMs: number;
  invalidIndexPolicy: 'needs_review' | 'fail_batch';
}

export interface CrmSyncLog {
  id: string;
  batchId: string | null;
  productId: string | null;
  productName: string;
  priceType: CrmPriceType;
  variantLabel: string;
  crmProductIndex: number;
  rawPrice: number | null;
  sentPrice: number;
  currencyUnit: string | null;
  operationType: CrmOperationType;
  status: CrmSyncStatus;
  apiResponse: string | null;
  errorMessage: string | null;
  retryCount: number;
  nextRetryAt: string | null;
  batchSize: number;
  updatedCount: number | null;
  triggeredBy: string | null;
  createdAt: string;
  sentAt: string | null;
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
      crm_product_index INTEGER,
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

    CREATE TABLE IF NOT EXISTS product_crm_mappings (
      id TEXT PRIMARY KEY,
      productId TEXT NOT NULL,
      priceType TEXT NOT NULL CHECK(priceType IN ('single', 'lamb', 'two_teeth')),
      variantLabel TEXT NOT NULL,
      crmProductIndex INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY(productId) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE(productId, priceType)
    );

    CREATE TABLE IF NOT EXISTS crm_sync_logs (
      id TEXT PRIMARY KEY,
      batchId TEXT,
      productId TEXT,
      productName TEXT NOT NULL,
      priceType TEXT NOT NULL DEFAULT 'single',
      variantLabel TEXT NOT NULL DEFAULT 'قیمت واحد',
      crmProductIndex INTEGER NOT NULL,
      rawPrice REAL,
      sentPrice REAL NOT NULL,
      currencyUnit TEXT,
      operationType TEXT NOT NULL,
      status TEXT NOT NULL,
      apiResponse TEXT,
      errorMessage TEXT,
      retryCount INTEGER NOT NULL DEFAULT 0,
      nextRetryAt TEXT,
      batchSize INTEGER NOT NULL DEFAULT 1,
      updatedCount INTEGER,
      triggeredBy TEXT,
      createdAt TEXT NOT NULL,
      sentAt TEXT,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY(productId) REFERENCES products(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(keyHash);
    CREATE INDEX IF NOT EXISTS idx_crm_sync_logs_status ON crm_sync_logs(status);
    CREATE INDEX IF NOT EXISTS idx_crm_sync_logs_product ON crm_sync_logs(productId);
    CREATE INDEX IF NOT EXISTS idx_crm_sync_logs_created ON crm_sync_logs(createdAt);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_product_crm_mappings_index ON product_crm_mappings(crmProductIndex);
    CREATE INDEX IF NOT EXISTS idx_product_crm_mappings_product ON product_crm_mappings(productId);
  `);
  try { db.prepare("ALTER TABLE categories ADD COLUMN parentId TEXT").run(); } catch(e){}
  try { db.prepare("ALTER TABLE categories ADD COLUMN hasLamb INTEGER NOT NULL DEFAULT 1").run(); } catch(e){}
  try { db.prepare("ALTER TABLE categories ADD COLUMN hasTwoTeeth INTEGER NOT NULL DEFAULT 1").run(); } catch(e){}
  try { db.prepare("ALTER TABLE products ADD COLUMN hasLamb INTEGER NOT NULL DEFAULT 1").run(); } catch(e){}
  try { db.prepare("ALTER TABLE products ADD COLUMN hasTwoTeeth INTEGER NOT NULL DEFAULT 1").run(); } catch(e){}
  try { db.prepare("ALTER TABLE products ADD COLUMN fontSize INTEGER").run(); } catch(e){}

  // Safe idempotent migration for crm_product_index + unique partial index
  const productColumns = db.prepare("PRAGMA table_info(products)").all() as { name: string }[];
  if (!productColumns.some(col => col.name === 'crm_product_index')) {
    db.prepare("ALTER TABLE products ADD COLUMN crm_product_index INTEGER").run();
  }
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_products_crm_index
    ON products(crm_product_index)
    WHERE crm_product_index IS NOT NULL;
  `);

  // Safe idempotent migration for multi-variant columns on crm_sync_logs
  const crmLogColumns = db.prepare("PRAGMA table_info(crm_sync_logs)").all() as { name: string }[];
  if (!crmLogColumns.some(col => col.name === 'priceType')) {
    db.prepare("ALTER TABLE crm_sync_logs ADD COLUMN priceType TEXT NOT NULL DEFAULT 'single'").run();
  }
  if (!crmLogColumns.some(col => col.name === 'variantLabel')) {
    db.prepare("ALTER TABLE crm_sync_logs ADD COLUMN variantLabel TEXT NOT NULL DEFAULT 'قیمت واحد'").run();
  }
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_crm_sync_logs_product_variant ON crm_sync_logs(productId, priceType);
  `);

  // Idempotent migration from legacy products.crm_product_index into product_crm_mappings
  const legacyMappedProducts = db.prepare(`
    SELECT p.id, p.hasLamb, p.hasTwoTeeth, p.crm_product_index
    FROM products p
    WHERE p.crm_product_index IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM product_crm_mappings m WHERE m.productId = p.id)
  `).all() as Array<{ id: string; hasLamb: number; hasTwoTeeth: number; crm_product_index: number }>;

  if (legacyMappedProducts.length > 0) {
    const now = new Date().toISOString();
    const insertMapping = db.prepare(`
      INSERT OR IGNORE INTO product_crm_mappings (id, productId, priceType, variantLabel, crmProductIndex, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const migrateTx = db.transaction(() => {
      for (const p of legacyMappedProducts) {
        const hasLamb = !!p.hasLamb;
        const hasTwoTeeth = !!p.hasTwoTeeth;
        const priceType: CrmPriceType = (!hasLamb && !hasTwoTeeth)
          ? 'single'
          : (hasLamb ? 'lamb' : 'two_teeth');
        const variantLabel = getVariantLabel(priceType);
        insertMapping.run(uuidv4(), p.id, priceType, variantLabel, p.crm_product_index, now, now);
      }
    });
    migrateTx();
  }

  // Seed default CRM settings safely if missing
  db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run(
    'crm_settings',
    JSON.stringify(DEFAULT_CRM_SETTINGS)
  );

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

export function getVariantLabel(priceType: CrmPriceType): string {
  if (priceType === 'lamb') return 'بره';
  if (priceType === 'two_teeth') return 'دودندان';
  return 'قیمت واحد';
}

export function getActivePriceTypesForProduct(hasLamb: boolean, hasTwoTeeth: boolean): CrmPriceType[] {
  if (!hasLamb && !hasTwoTeeth) return ['single'];
  const types: CrmPriceType[] = [];
  if (hasLamb) types.push('lamb');
  if (hasTwoTeeth) types.push('two_teeth');
  return types;
}

function loadMappingsByProductIds(productIds?: string[]): Map<string, ProductCrmMapping[]> {
  const result = new Map<string, ProductCrmMapping[]>();
  const mappings = productIds && productIds.length === 1
    ? (db.prepare('SELECT * FROM product_crm_mappings WHERE productId = ? ORDER BY CASE priceType WHEN \'single\' THEN 0 WHEN \'lamb\' THEN 1 ELSE 2 END').all(productIds[0]) as any[])
    : (db.prepare('SELECT * FROM product_crm_mappings ORDER BY CASE priceType WHEN \'single\' THEN 0 WHEN \'lamb\' THEN 1 ELSE 2 END').all() as any[]);

  // Fetch latest sync log status per (productId, priceType)
  const latestLogRows = db.prepare(`
    SELECT l.productId, l.priceType, l.status, l.sentAt, l.updatedAt, l.errorMessage
    FROM crm_sync_logs l
    WHERE l.productId IS NOT NULL
      AND l.id = (
        SELECT l2.id FROM crm_sync_logs l2
        WHERE l2.productId = l.productId AND l2.priceType = l.priceType
        ORDER BY l2.createdAt DESC, l2.rowid DESC
        LIMIT 1
      )
  `).all() as Array<{ productId: string; priceType: CrmPriceType; status: CrmSyncStatus; sentAt: string | null; updatedAt: string; errorMessage: string | null }>;

  const statusByKey = new Map<string, { status: CrmSyncStatus; sentAt: string | null; errorMessage: string | null }>();
  for (const row of latestLogRows) {
    statusByKey.set(`${row.productId}:${row.priceType}`, {
      status: row.status,
      sentAt: row.sentAt || row.updatedAt,
      errorMessage: row.errorMessage || null,
    });
  }

  for (const m of mappings) {
    const logInfo = statusByKey.get(`${m.productId}:${m.priceType}`);
    const entry: ProductCrmMapping = {
      id: m.id,
      productId: m.productId,
      priceType: m.priceType as CrmPriceType,
      variantLabel: m.variantLabel || getVariantLabel(m.priceType as CrmPriceType),
      crmProductIndex: m.crmProductIndex,
      lastSyncStatus: logInfo?.status ?? null,
      lastSyncedAt: logInfo?.sentAt ?? null,
      lastSyncError: logInfo?.errorMessage ?? null,
    };
    const arr = result.get(m.productId) || [];
    arr.push(entry);
    result.set(m.productId, arr);
  }
  return result;
}

function mapProductRow(r: any, mappings?: ProductCrmMapping[]): Product {
  const hasLamb = !!r.hasLamb;
  const hasTwoTeeth = !!r.hasTwoTeeth;
  const resolvedMappings = mappings ?? [];
  const singleMap = resolvedMappings.find(m => m.priceType === 'single');
  const lambMap = resolvedMappings.find(m => m.priceType === 'lamb');
  const twoTeethMap = resolvedMappings.find(m => m.priceType === 'two_teeth');
  const isMultiVariant = hasLamb && hasTwoTeeth;

  let singleDisplayIndex: number | null = null;
  if (!isMultiVariant) {
    singleDisplayIndex =
      (!hasLamb && !hasTwoTeeth ? singleMap?.crmProductIndex : null) ??
      (hasLamb ? lambMap?.crmProductIndex : null) ??
      (hasTwoTeeth ? twoTeethMap?.crmProductIndex : null) ??
      r.crm_product_index ??
      null;
  }

  return {
    id: r.id,
    categoryId: r.categoryId,
    name: r.name,
    priceLamb: r.priceLamb ?? null,
    priceTwoTeeth: r.priceTwoTeeth ?? null,
    isActive: !!r.isActive,
    sortOrder: r.sortOrder,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    hasLamb,
    hasTwoTeeth,
    fontSize: r.fontSize ?? null,
    crmProductIndex: singleDisplayIndex,
    crmLambIndex: lambMap?.crmProductIndex ?? null,
    crmTwoTeethIndex: twoTeethMap?.crmProductIndex ?? null,
    crmMappings: resolvedMappings,
  };
}

export function normalizeCrmProductIndex(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const str = String(raw)
    .trim()
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

  if (str === '') return null;
  if (!/^\d+$/.test(str)) {
    const err: any = new Error('شاخص محصول در CRM باید یک عدد صحیح مثبت باشد.');
    err.statusCode = 400;
    throw err;
  }
  const num = Number(str);
  if (!Number.isSafeInteger(num) || num <= 0) {
    const err: any = new Error('شاخص محصول در CRM باید یک عدد صحیح مثبت بزرگ‌تر از صفر باشد.');
    err.statusCode = 400;
    throw err;
  }
  return num;
}

function throwDuplicateCrmIndexError(crmIndex: number, excludeProductId?: string): never {
  const conflict = excludeProductId
    ? (db.prepare(`
        SELECT m.productId, m.priceType, m.variantLabel, p.name as productName
        FROM product_crm_mappings m
        JOIN products p ON p.id = m.productId
        WHERE m.crmProductIndex = ? AND m.productId != ?
      `).get(crmIndex, excludeProductId) as any)
    : (db.prepare(`
        SELECT m.productId, m.priceType, m.variantLabel, p.name as productName
        FROM product_crm_mappings m
        JOIN products p ON p.id = m.productId
        WHERE m.crmProductIndex = ?
      `).get(crmIndex) as any);

  const conflictName = conflict?.productName || 'محصول دیگر';
  const conflictVariantLabel = conflict?.variantLabel || getVariantLabel((conflict?.priceType as CrmPriceType) || 'single');
  const err: any = new Error(
    `این شاخص CRM (${crmIndex}) قبلاً برای محصول «${conflictName}» (نوع: ${conflictVariantLabel}) ثبت شده است. لطفاً شاخص دیگری وارد کنید.`
  );
  err.statusCode = 409;
  err.code = 'DUPLICATE_CRM_INDEX';
  err.conflictProductName = conflictName;
  err.conflictVariantLabel = conflictVariantLabel;
  throw err;
}

export interface ProductCrmInput {
  crmProductIndex?: unknown;
  crmLambIndex?: unknown;
  crmTwoTeethIndex?: unknown;
  crmMappings?: Array<{ priceType?: CrmPriceType; variantLabel?: string; crmProductIndex?: unknown }>;
}

function resolveDesiredMappingsForProduct(
  hasLamb: boolean,
  hasTwoTeeth: boolean,
  productName: string,
  crmInput: ProductCrmInput,
  existingMappings?: ProductCrmMapping[]
): { desired: Array<{ priceType: CrmPriceType; variantLabel: string; crmProductIndex: number }>; singleMirrorIndex: number | null } {
  const activeTypes = getActivePriceTypesForProduct(hasLamb, hasTwoTeeth);
  const isMultiVariant = hasLamb && hasTwoTeeth;

  const hasExplicitMappingsArray = crmInput.crmMappings !== undefined;
  const hasExplicitLamb = crmInput.crmLambIndex !== undefined;
  const hasExplicitTwoTeeth = crmInput.crmTwoTeethIndex !== undefined;
  const hasExplicitSingle = crmInput.crmProductIndex !== undefined;
  const hasAnyExplicitField = hasExplicitMappingsArray || hasExplicitLamb || hasExplicitTwoTeeth || hasExplicitSingle;

  const byType = new Map<CrmPriceType, number | null>();

  if (!hasAnyExplicitField && existingMappings) {
    // Preserve matching existing mappings when CRM fields weren't sent at all
    for (const m of existingMappings) {
      if (activeTypes.includes(m.priceType)) {
        byType.set(m.priceType, m.crmProductIndex);
      }
    }
  } else if (hasExplicitMappingsArray) {
    const arr = Array.isArray(crmInput.crmMappings) ? crmInput.crmMappings : [];
    for (const item of arr) {
      if (!item || !item.priceType) continue;
      if (!activeTypes.includes(item.priceType)) continue;
      const normalized = normalizeCrmProductIndex(item.crmProductIndex);
      if (normalized !== null) {
        byType.set(item.priceType, normalized);
      }
    }
  } else if (isMultiVariant) {
    if (hasExplicitLamb) {
      byType.set('lamb', normalizeCrmProductIndex(crmInput.crmLambIndex));
    } else if (existingMappings) {
      const existingLamb = existingMappings.find(m => m.priceType === 'lamb');
      if (existingLamb) byType.set('lamb', existingLamb.crmProductIndex);
    }

    if (hasExplicitTwoTeeth) {
      byType.set('two_teeth', normalizeCrmProductIndex(crmInput.crmTwoTeethIndex));
    } else if (existingMappings) {
      const existingTwoTeeth = existingMappings.find(m => m.priceType === 'two_teeth');
      if (existingTwoTeeth) byType.set('two_teeth', existingTwoTeeth.crmProductIndex);
    }

    // If neither lamb nor two_teeth field was provided on a multi-variant product and only crmProductIndex was sent:
    if (!hasExplicitLamb && !hasExplicitTwoTeeth && hasExplicitSingle) {
      const normalizedSingle = normalizeCrmProductIndex(crmInput.crmProductIndex);
      if (normalizedSingle !== null) {
        byType.set('lamb', normalizedSingle);
      }
    }
  } else {
    // Single-variant product: single | lamb | two_teeth
    const onlyType = activeTypes[0];
    let rawVal: unknown = undefined;
    if (onlyType === 'lamb' && hasExplicitLamb) rawVal = crmInput.crmLambIndex;
    else if (onlyType === 'two_teeth' && hasExplicitTwoTeeth) rawVal = crmInput.crmTwoTeethIndex;
    else if (hasExplicitSingle) rawVal = crmInput.crmProductIndex;
    else if (hasExplicitLamb) rawVal = crmInput.crmLambIndex;
    else if (hasExplicitTwoTeeth) rawVal = crmInput.crmTwoTeethIndex;

    if (rawVal !== undefined) {
      const normalized = normalizeCrmProductIndex(rawVal);
      if (normalized !== null) {
        byType.set(onlyType, normalized);
      }
    }
  }

  const desired: Array<{ priceType: CrmPriceType; variantLabel: string; crmProductIndex: number }> = [];
  const seenIndices = new Map<number, string>();

  for (const pt of activeTypes) {
    const val = byType.get(pt) ?? null;
    if (val === null) continue;
    const label = getVariantLabel(pt);
    const prevLabel = seenIndices.get(val);
    if (prevLabel) {
      const err: any = new Error(
        `شاخص CRM (${val}) نمی‌تواند هم‌زمان برای دو نوع «${prevLabel}» و «${label}» در محصول «${productName}» یکسان باشد.`
      );
      err.statusCode = 409;
      err.code = 'DUPLICATE_CRM_INDEX';
      err.conflictProductName = productName;
      err.conflictVariantLabel = prevLabel;
      throw err;
    }
    seenIndices.set(val, label);
    desired.push({ priceType: pt, variantLabel: label, crmProductIndex: val });
  }

  const singleMirrorIndex = !isMultiVariant && desired.length === 1 ? desired[0].crmProductIndex : null;
  return { desired, singleMirrorIndex };
}

export function getProducts(): Product[] {
  const rows = db.prepare('SELECT * FROM products ORDER BY sortOrder ASC').all();
  const mappingsMap = loadMappingsByProductIds();
  return rows.map((r: any) => mapProductRow(r, mappingsMap.get(r.id) || []));
}

export function getProductsByCategory(categoryId: string): Product[] {
  const rows = db.prepare('SELECT * FROM products WHERE categoryId = ? ORDER BY sortOrder ASC').all(categoryId);
  const mappingsMap = loadMappingsByProductIds();
  return rows.map((r: any) => mapProductRow(r, mappingsMap.get(r.id) || []));
}

export function getProductById(id: string): Product | null {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!row) return null;
  const mappingsMap = loadMappingsByProductIds([id]);
  return mapProductRow(row, mappingsMap.get(id) || []);
}

export function addProduct(
  categoryId: string,
  name: string,
  hasLamb: boolean = true,
  hasTwoTeeth: boolean = true,
  fontSize: number | null = null,
  crmInput?: unknown
): Product {
  const normalizedInput: ProductCrmInput =
    crmInput && typeof crmInput === 'object' && !Array.isArray(crmInput)
      ? (crmInput as ProductCrmInput)
      : { crmProductIndex: crmInput };

  const { desired, singleMirrorIndex } = resolveDesiredMappingsForProduct(hasLamb, hasTwoTeeth, name, normalizedInput);
  const id = `p_${uuidv4()}`;
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    for (const item of desired) {
      const existing = db.prepare('SELECT productId FROM product_crm_mappings WHERE crmProductIndex = ?').get(item.crmProductIndex) as any;
      if (existing) {
        throwDuplicateCrmIndexError(item.crmProductIndex);
      }
    }

    const sortOrder = db.prepare('SELECT COALESCE(MAX(sortOrder), 0) + 1 as nextSort FROM products WHERE categoryId = ?').get(categoryId) as { nextSort: number };
    try {
      db.prepare('INSERT INTO products (id, categoryId, name, isActive, sortOrder, createdAt, updatedAt, hasLamb, hasTwoTeeth, fontSize, crm_product_index) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, categoryId, name, sortOrder.nextSort, now, now, hasLamb ? 1 : 0, hasTwoTeeth ? 1 : 0, fontSize ? Number(fontSize) : null, singleMirrorIndex);

      const insertMap = db.prepare(`
        INSERT INTO product_crm_mappings (id, productId, priceType, variantLabel, crmProductIndex, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const item of desired) {
        insertMap.run(uuidv4(), id, item.priceType, item.variantLabel, item.crmProductIndex, now, now);
      }
    } catch (e: any) {
      if (e?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        for (const item of desired) {
          const conflict = db.prepare('SELECT productId FROM product_crm_mappings WHERE crmProductIndex = ?').get(item.crmProductIndex);
          if (conflict) throwDuplicateCrmIndexError(item.crmProductIndex);
        }
      }
      throw e;
    }

    return getProductById(id)!;
  });

  return tx();
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

export function updateProduct(
  id: string,
  name: string,
  categoryId: string,
  hasLamb: boolean = true,
  hasTwoTeeth: boolean = true,
  fontSize: number | null = null,
  crmInput?: unknown
) {
  const now = new Date().toISOString();
  const normalizedInput: ProductCrmInput =
    crmInput && typeof crmInput === 'object' && !Array.isArray(crmInput)
      ? (crmInput as ProductCrmInput)
      : { crmProductIndex: crmInput };

  const tx = db.transaction(() => {
    const current = db.prepare('SELECT id, crm_product_index FROM products WHERE id = ?').get(id) as any;
    if (!current) {
      const err: any = new Error('محصول مورد نظر یافت نشد.');
      err.statusCode = 404;
      throw err;
    }

    const existingMappings = (db.prepare('SELECT * FROM product_crm_mappings WHERE productId = ?').all(id) as any[]).map(m => ({
      id: m.id,
      productId: m.productId,
      priceType: m.priceType as CrmPriceType,
      variantLabel: m.variantLabel,
      crmProductIndex: m.crmProductIndex,
    }));

    const { desired, singleMirrorIndex } = resolveDesiredMappingsForProduct(
      hasLamb,
      hasTwoTeeth,
      name,
      normalizedInput,
      existingMappings
    );

    for (const item of desired) {
      const conflict = db.prepare('SELECT productId FROM product_crm_mappings WHERE crmProductIndex = ? AND productId != ?').get(item.crmProductIndex, id) as any;
      if (conflict) {
        throwDuplicateCrmIndexError(item.crmProductIndex, id);
      }
    }

    try {
      // Clear old mappings for this product first so reassigning same indices or changing types is conflict-free
      db.prepare('DELETE FROM product_crm_mappings WHERE productId = ?').run(id);

      db.prepare('UPDATE products SET name = ?, categoryId = ?, updatedAt = ?, hasLamb = ?, hasTwoTeeth = ?, fontSize = ?, crm_product_index = ? WHERE id = ?')
        .run(name, categoryId, now, hasLamb ? 1 : 0, hasTwoTeeth ? 1 : 0, fontSize ? Number(fontSize) : null, singleMirrorIndex, id);

      const insertMap = db.prepare(`
        INSERT INTO product_crm_mappings (id, productId, priceType, variantLabel, crmProductIndex, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const item of desired) {
        insertMap.run(uuidv4(), id, item.priceType, item.variantLabel, item.crmProductIndex, now, now);
      }
    } catch (e: any) {
      if (e?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        for (const item of desired) {
          const conflict = db.prepare('SELECT productId FROM product_crm_mappings WHERE crmProductIndex = ? AND productId != ?').get(item.crmProductIndex, id);
          if (conflict) throwDuplicateCrmIndexError(item.crmProductIndex, id);
        }
      }
      throw e;
    }
  });

  tx();
}

export interface PriceChangedVariantInfo {
  productId: string;
  productName: string;
  priceType: CrmPriceType;
  variantLabel: string;
  crmProductIndex: number;
  rawPrice: number | null;
}

export function updateProductPrices(
  updates: { id: string; priceLamb: number | null; priceTwoTeeth: number | null }[],
  userId: string
): { changedVariants: PriceChangedVariantInfo[] } {
  if (!Array.isArray(updates)) {
    throw new Error('لیست قیمت‌های ارسالی معتبر نیست.');
  }
  const now = new Date().toISOString();

  const getProduct = db.prepare('SELECT * FROM products WHERE id = ?');
  const getMappings = db.prepare('SELECT * FROM product_crm_mappings WHERE productId = ?');
  const updateProductStmt = db.prepare('UPDATE products SET priceLamb = ?, priceTwoTeeth = ?, updatedAt = ? WHERE id = ?');
  const insertHistory = db.prepare('INSERT INTO price_history (id, productId, priceType, oldPrice, newPrice, changedAt, changedBy) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const updateSettingsStmt = db.prepare("UPDATE settings SET value = json_set(value, '$.lastUpdated', ?) WHERE key = 'app_settings'");

  let historyAdded = false;
  const changedVariants: PriceChangedVariantInfo[] = [];

  const transaction = db.transaction(() => {
    for (const update of updates) {
      const p = getProduct.get(update.id) as any;
      if (!p) continue;

      const hasLamb = !!p.hasLamb;
      const hasTwoTeeth = !!p.hasTwoTeeth;
      const mappings = getMappings.all(p.id) as Array<{ priceType: CrmPriceType; variantLabel: string; crmProductIndex: number }>;

      const lambChanged = update.priceLamb !== p.priceLamb;
      const twoTeethChanged = update.priceTwoTeeth !== p.priceTwoTeeth;

      if (lambChanged) {
        insertHistory.run(uuidv4(), update.id, 'lamb', p.priceLamb, update.priceLamb, now, userId);
        historyAdded = true;

        const lambSlotType: CrmPriceType | null = !hasLamb && !hasTwoTeeth ? 'single' : (hasLamb ? 'lamb' : null);
        if (lambSlotType) {
          const mapEntry = mappings.find(m => m.priceType === lambSlotType);
          if (mapEntry) {
            changedVariants.push({
              productId: p.id,
              productName: p.name,
              priceType: mapEntry.priceType,
              variantLabel: mapEntry.variantLabel || getVariantLabel(mapEntry.priceType),
              crmProductIndex: mapEntry.crmProductIndex,
              rawPrice: update.priceLamb ?? null,
            });
          }
        }
      }

      if (twoTeethChanged) {
        insertHistory.run(uuidv4(), update.id, 'two_teeth', p.priceTwoTeeth, update.priceTwoTeeth, now, userId);
        historyAdded = true;

        if (hasTwoTeeth) {
          const mapEntry = mappings.find(m => m.priceType === 'two_teeth');
          if (mapEntry) {
            changedVariants.push({
              productId: p.id,
              productName: p.name,
              priceType: 'two_teeth',
              variantLabel: mapEntry.variantLabel || getVariantLabel('two_teeth'),
              crmProductIndex: mapEntry.crmProductIndex,
              rawPrice: update.priceTwoTeeth ?? null,
            });
          }
        }
      }

      updateProductStmt.run(update.priceLamb, update.priceTwoTeeth, now, update.id);
    }

    if (historyAdded) {
      updateSettingsStmt.run(now);
    }
  });

  transaction();
  return { changedVariants };
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
    db.prepare('DELETE FROM product_crm_mappings').run();
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
    
    // Insert products & CRM mappings
    const insertProduct = db.prepare('INSERT INTO products (id, categoryId, name, priceLamb, priceTwoTeeth, isActive, sortOrder, createdAt, updatedAt, hasLamb, hasTwoTeeth, fontSize, crm_product_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const insertMapping = db.prepare('INSERT INTO product_crm_mappings (id, productId, priceType, variantLabel, crmProductIndex, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const prod of data.products) {
      const hasLamb = !!prod.hasLamb;
      const hasTwoTeeth = !!prod.hasTwoTeeth;
      const { desired, singleMirrorIndex } = resolveDesiredMappingsForProduct(
        hasLamb,
        hasTwoTeeth,
        prod.name,
        {
          crmProductIndex: prod.crmProductIndex ?? prod.crm_product_index ?? null,
          crmLambIndex: prod.crmLambIndex,
          crmTwoTeethIndex: prod.crmTwoTeethIndex,
          crmMappings: Array.isArray(prod.crmMappings) ? prod.crmMappings : undefined,
        }
      );
      const createdAt = prod.createdAt || new Date().toISOString();
      const updatedAt = prod.updatedAt || new Date().toISOString();
      insertProduct.run(
        prod.id, 
        prod.categoryId, 
        prod.name, 
        prod.priceLamb ?? null, 
        prod.priceTwoTeeth ?? null, 
        prod.isActive ? 1 : 0, 
        prod.sortOrder ?? 1, 
        createdAt, 
        updatedAt,
        hasLamb ? 1 : 0,
        hasTwoTeeth ? 1 : 0,
        prod.fontSize ? Number(prod.fontSize) : null,
        singleMirrorIndex
      );
      for (const m of desired) {
        insertMapping.run(uuidv4(), prod.id, m.priceType, m.variantLabel, m.crmProductIndex, createdAt, updatedAt);
      }
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

// --- CRM Integration Settings & Sync Logs ---

export const DEFAULT_CRM_SETTINGS: CrmSettings = {
  apiUrl: process.env.CRM_API_URL || 'http://194.48.198.4:9093/Product/Action/SetProductPrices',
  liveTransmissionEnabled: false,
  priceUnitConfirmed: false,
  priceUnitLabel: 'نامشخص (نیازمند استعلام از برنامه‌نویس CRM)',
  priceMultiplier: 1,
  priceSource: 'lamb_then_two_teeth',
  authType: 'none',
  authHeaderName: process.env.CRM_API_AUTH_HEADER || 'Authorization',
  timeoutMs: 10000,
  maxRetries: 3,
  retryDelayMs: 5000,
  batchSize: 50,
  rateLimitDelayMs: 500,
  debounceMs: 1200,
  invalidIndexPolicy: 'needs_review',
};

export function getCrmSettings(): CrmSettings {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'crm_settings'").get() as { value: string } | undefined;
  let stored: Partial<CrmSettings> = {};
  if (row) {
    try {
      stored = JSON.parse(row.value);
    } catch {
      stored = {};
    }
  }
  const merged: CrmSettings = {
    ...DEFAULT_CRM_SETTINGS,
    ...stored,
  };
  // Safety: never allow liveTransmissionEnabled without confirmed price unit
  if (!merged.priceUnitConfirmed) {
    merged.liveTransmissionEnabled = false;
  }
  return merged;
}

export function updateCrmSettings(newSettings: Partial<CrmSettings>): CrmSettings {
  const current = getCrmSettings();
  const merged: CrmSettings = { ...current };

  if (newSettings.apiUrl !== undefined) {
    const trimmedUrl = String(newSettings.apiUrl).trim();
    let parsed: URL;
    try {
      parsed = new URL(trimmedUrl);
    } catch {
      throw new Error('آدرس API معتبر نیست.');
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('آدرس API باید با http:// یا https:// شروع شود.');
    }
    merged.apiUrl = trimmedUrl;
  }

  if (newSettings.priceUnitLabel !== undefined) {
    merged.priceUnitLabel = String(newSettings.priceUnitLabel).trim() || DEFAULT_CRM_SETTINGS.priceUnitLabel;
  }

  if (newSettings.priceMultiplier !== undefined) {
    const mult = Number(newSettings.priceMultiplier);
    if (!Number.isFinite(mult) || mult <= 0) {
      throw new Error('ضریب تبدیل واحد قیمت باید عددی مثبت و بزرگ‌تر از صفر باشد.');
    }
    merged.priceMultiplier = mult;
  }

  if (newSettings.priceUnitConfirmed !== undefined) {
    merged.priceUnitConfirmed = Boolean(newSettings.priceUnitConfirmed);
  }

  if (newSettings.liveTransmissionEnabled !== undefined) {
    const wantLive = Boolean(newSettings.liveTransmissionEnabled);
    if (wantLive && !merged.priceUnitConfirmed) {
      throw new Error('پیش از تایید واحد قیمت CRM، امکان فعال‌سازی ارسال واقعی وجود ندارد.');
    }
    merged.liveTransmissionEnabled = wantLive;
  }

  if (!merged.priceUnitConfirmed) {
    merged.liveTransmissionEnabled = false;
  }

  if (newSettings.priceSource === 'lamb_then_two_teeth' || newSettings.priceSource === 'two_teeth_then_lamb') {
    merged.priceSource = newSettings.priceSource;
  }

  if (newSettings.authType === 'none' || newSettings.authType === 'bearer' || newSettings.authType === 'api_key_header') {
    merged.authType = newSettings.authType;
  }

  if (newSettings.authHeaderName !== undefined) {
    const header = String(newSettings.authHeaderName).trim();
    if (!header || !/^[A-Za-z0-9-]+$/.test(header)) {
      throw new Error('نام هدر احراز هویت معتبر نیست.');
    }
    merged.authHeaderName = header;
  }

  if (newSettings.timeoutMs !== undefined) {
    const t = Math.round(Number(newSettings.timeoutMs));
    if (!Number.isFinite(t) || t < 1000 || t > 60000) {
      throw new Error('مقدار Timeout باید بین ۱۰۰۰ تا ۶۰۰۰۰ میلی‌ثانیه باشد.');
    }
    merged.timeoutMs = t;
  }

  if (newSettings.maxRetries !== undefined) {
    const r = Math.round(Number(newSettings.maxRetries));
    if (!Number.isFinite(r) || r < 0 || r > 10) {
      throw new Error('حداکثر تعداد تلاش مجدد باید بین ۰ تا ۱۰ باشد.');
    }
    merged.maxRetries = r;
  }

  if (newSettings.retryDelayMs !== undefined) {
    const d = Math.round(Number(newSettings.retryDelayMs));
    if (!Number.isFinite(d) || d < 1000 || d > 3600000) {
      throw new Error('فاصله تلاش مجدد باید بین ۱۰۰۰ تا ۳۶۰۰۰۰۰ میلی‌ثانیه باشد.');
    }
    merged.retryDelayMs = d;
  }

  if (newSettings.batchSize !== undefined) {
    const b = Math.round(Number(newSettings.batchSize));
    if (!Number.isFinite(b) || b < 1 || b > 500) {
      throw new Error('تعداد اقلام در هر بسته ارسال باید بین ۱ تا ۵۰۰ باشد.');
    }
    merged.batchSize = b;
  }

  if (newSettings.rateLimitDelayMs !== undefined) {
    const rl = Math.round(Number(newSettings.rateLimitDelayMs));
    if (!Number.isFinite(rl) || rl < 0 || rl > 30000) {
      throw new Error('تاخیر بین دسته‌ها باید بین ۰ تا ۳۰۰۰۰ میلی‌ثانیه باشد.');
    }
    merged.rateLimitDelayMs = rl;
  }

  if (newSettings.debounceMs !== undefined) {
    const dbMs = Math.round(Number(newSettings.debounceMs));
    if (!Number.isFinite(dbMs) || dbMs < 0 || dbMs > 30000) {
      throw new Error('زمان تجمیع تغییرات سریع باید بین ۰ تا ۳۰۰۰۰ میلی‌ثانیه باشد.');
    }
    merged.debounceMs = dbMs;
  }

  if (newSettings.invalidIndexPolicy === 'needs_review' || newSettings.invalidIndexPolicy === 'fail_batch') {
    merged.invalidIndexPolicy = newSettings.invalidIndexPolicy;
  }

  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
    'crm_settings',
    JSON.stringify(merged)
  );
  return merged;
}

export function createCrmSyncLog(input: {
  batchId?: string | null;
  productId: string | null;
  productName: string;
  priceType?: CrmPriceType;
  variantLabel?: string;
  crmProductIndex: number;
  rawPrice: number | null;
  sentPrice: number;
  currencyUnit: string | null;
  operationType: CrmOperationType;
  status: CrmSyncStatus;
  errorMessage?: string | null;
  batchSize?: number;
  triggeredBy?: string | null;
}): CrmSyncLog {
  const id = uuidv4();
  const now = new Date().toISOString();
  const priceType: CrmPriceType = input.priceType || 'single';
  const variantLabel = input.variantLabel || getVariantLabel(priceType);
  db.prepare(`
    INSERT INTO crm_sync_logs (
      id, batchId, productId, productName, priceType, variantLabel, crmProductIndex, rawPrice, sentPrice,
      currencyUnit, operationType, status, apiResponse, errorMessage, retryCount,
      nextRetryAt, batchSize, updatedCount, triggeredBy, createdAt, sentAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 0, NULL, ?, NULL, ?, ?, NULL, ?)
  `).run(
    id,
    input.batchId ?? null,
    input.productId,
    input.productName,
    priceType,
    variantLabel,
    input.crmProductIndex,
    input.rawPrice,
    input.sentPrice,
    input.currencyUnit,
    input.operationType,
    input.status,
    input.errorMessage ?? null,
    input.batchSize ?? 1,
    input.triggeredBy ?? null,
    now,
    now
  );

  return getCrmSyncLogById(id)!;
}

export function updateCrmSyncLog(id: string, fields: {
  batchId?: string | null;
  productName?: string;
  priceType?: CrmPriceType;
  variantLabel?: string;
  crmProductIndex?: number;
  rawPrice?: number | null;
  sentPrice?: number;
  currencyUnit?: string | null;
  operationType?: CrmOperationType;
  status?: CrmSyncStatus;
  apiResponse?: string | null;
  errorMessage?: string | null;
  retryCount?: number;
  nextRetryAt?: string | null;
  batchSize?: number;
  updatedCount?: number | null;
  triggeredBy?: string | null;
  sentAt?: string | null;
}) {
  const existing = getCrmSyncLogById(id);
  if (!existing) return null;
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE crm_sync_logs SET
      batchId = ?,
      productName = ?,
      priceType = ?,
      variantLabel = ?,
      crmProductIndex = ?,
      rawPrice = ?,
      sentPrice = ?,
      currencyUnit = ?,
      operationType = ?,
      status = ?,
      apiResponse = ?,
      errorMessage = ?,
      retryCount = ?,
      nextRetryAt = ?,
      batchSize = ?,
      updatedCount = ?,
      triggeredBy = ?,
      sentAt = ?,
      updatedAt = ?
    WHERE id = ?
  `).run(
    fields.batchId !== undefined ? fields.batchId : existing.batchId,
    fields.productName !== undefined ? fields.productName : existing.productName,
    fields.priceType !== undefined ? fields.priceType : existing.priceType,
    fields.variantLabel !== undefined ? fields.variantLabel : existing.variantLabel,
    fields.crmProductIndex !== undefined ? fields.crmProductIndex : existing.crmProductIndex,
    fields.rawPrice !== undefined ? fields.rawPrice : existing.rawPrice,
    fields.sentPrice !== undefined ? fields.sentPrice : existing.sentPrice,
    fields.currencyUnit !== undefined ? fields.currencyUnit : existing.currencyUnit,
    fields.operationType !== undefined ? fields.operationType : existing.operationType,
    fields.status !== undefined ? fields.status : existing.status,
    fields.apiResponse !== undefined ? fields.apiResponse : existing.apiResponse,
    fields.errorMessage !== undefined ? fields.errorMessage : existing.errorMessage,
    fields.retryCount !== undefined ? fields.retryCount : existing.retryCount,
    fields.nextRetryAt !== undefined ? fields.nextRetryAt : existing.nextRetryAt,
    fields.batchSize !== undefined ? fields.batchSize : existing.batchSize,
    fields.updatedCount !== undefined ? fields.updatedCount : existing.updatedCount,
    fields.triggeredBy !== undefined ? fields.triggeredBy : existing.triggeredBy,
    fields.sentAt !== undefined ? fields.sentAt : existing.sentAt,
    now,
    id
  );
  return getCrmSyncLogById(id);
}

export function getCrmSyncLogById(id: string): CrmSyncLog | null {
  const row = db.prepare('SELECT * FROM crm_sync_logs WHERE id = ?').get(id);
  return (row as CrmSyncLog) || null;
}

export function findPendingAutoLogForProductVariant(productId: string, priceType: CrmPriceType): CrmSyncLog | null {
  const row = db.prepare(`
    SELECT * FROM crm_sync_logs
    WHERE productId = ? AND priceType = ? AND operationType = 'auto' AND status = 'pending'
    ORDER BY createdAt DESC, rowid DESC
    LIMIT 1
  `).get(productId, priceType);
  return (row as CrmSyncLog) || null;
}

export function cancelPendingRetriesForProductVariant(productId: string, priceType: CrmPriceType, exceptLogId?: string) {
  const now = new Date().toISOString();
  if (exceptLogId) {
    db.prepare(`
      UPDATE crm_sync_logs
      SET nextRetryAt = NULL, updatedAt = ?
      WHERE productId = ? AND priceType = ? AND status = 'failed' AND nextRetryAt IS NOT NULL AND id != ?
    `).run(now, productId, priceType, exceptLogId);
  } else {
    db.prepare(`
      UPDATE crm_sync_logs
      SET nextRetryAt = NULL, updatedAt = ?
      WHERE productId = ? AND priceType = ? AND status = 'failed' AND nextRetryAt IS NOT NULL
    `).run(now, productId, priceType);
  }
}

export function getCrmSyncLogs(filters?: {
  status?: string;
  productId?: string;
  operationType?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}): { total: number; items: CrmSyncLog[] } {
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters?.status && filters.status !== 'all') {
    conditions.push('status = ?');
    params.push(filters.status);
  }
  if (filters?.productId && filters.productId !== 'all') {
    conditions.push('productId = ?');
    params.push(filters.productId);
  }
  if (filters?.operationType && filters.operationType !== 'all') {
    conditions.push('operationType = ?');
    params.push(filters.operationType);
  }
  if (filters?.from) {
    conditions.push('createdAt >= ?');
    params.push(filters.from);
  }
  if (filters?.to) {
    conditions.push('createdAt <= ?');
    params.push(filters.to);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const totalRow = db.prepare(`SELECT count(*) as total FROM crm_sync_logs ${whereClause}`).get(...params) as { total: number };

  const limit = Math.min(Math.max(1, Number(filters?.limit) || 100), 500);
  const offset = Math.max(0, Number(filters?.offset) || 0);

  const items = db.prepare(`
    SELECT * FROM crm_sync_logs
    ${whereClause}
    ORDER BY createdAt DESC, rowid DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as CrmSyncLog[];

  return { total: totalRow.total, items };
}

export function getDueRetryCrmLogs(maxRetries: number): CrmSyncLog[] {
  const now = new Date().toISOString();
  // Pick the latest failed log per (productId, priceType) that is still due for retry
  return db.prepare(`
    SELECT l.*
    FROM crm_sync_logs l
    WHERE l.productId IS NOT NULL
      AND l.id = (
        SELECT l2.id FROM crm_sync_logs l2
        WHERE l2.productId = l.productId AND l2.priceType = l.priceType
        ORDER BY l2.createdAt DESC, l2.rowid DESC
        LIMIT 1
      )
      AND l.status = 'failed'
      AND l.retryCount < ?
      AND l.nextRetryAt IS NOT NULL
      AND l.nextRetryAt <= ?
    ORDER BY l.createdAt ASC
  `).all(maxRetries, now) as CrmSyncLog[];
}

export function getLatestFailedOrReviewLogs(): CrmSyncLog[] {
  return db.prepare(`
    SELECT l.*
    FROM crm_sync_logs l
    WHERE l.productId IS NOT NULL
      AND l.id = (
        SELECT l2.id FROM crm_sync_logs l2
        WHERE l2.productId = l.productId AND l2.priceType = l.priceType
        ORDER BY l2.createdAt DESC, l2.rowid DESC
        LIMIT 1
      )
      AND l.status IN ('failed', 'needs_review')
    ORDER BY l.createdAt ASC
  `).all() as CrmSyncLog[];
}

export function getPendingCrmLogs(): CrmSyncLog[] {
  return db.prepare(`
    SELECT * FROM crm_sync_logs
    WHERE status = 'pending'
    ORDER BY createdAt ASC
  `).all() as CrmSyncLog[];
}

export function getCrmSyncStats() {
  const totalProducts = (db.prepare('SELECT count(*) as c FROM products').get() as any).c;
  const withCrmIndex = (db.prepare('SELECT count(DISTINCT productId) as c FROM product_crm_mappings').get() as any).c;
  const withoutCrmIndex = totalProducts - withCrmIndex;
  const totalMappingsCount = (db.prepare('SELECT count(*) as c FROM product_crm_mappings').get() as any).c;

  // Latest sync log status per connected variant mapping
  const latestRows = db.prepare(`
    SELECT m.productId, m.priceType, m.crmProductIndex, l.status as lastStatus
    FROM product_crm_mappings m
    LEFT JOIN crm_sync_logs l ON l.id = (
      SELECT l2.id FROM crm_sync_logs l2
      WHERE l2.productId = m.productId AND l2.priceType = m.priceType
      ORDER BY l2.createdAt DESC, l2.rowid DESC
      LIMIT 1
    )
  `).all() as { productId: string; priceType: CrmPriceType; crmProductIndex: number; lastStatus: CrmSyncStatus | null }[];

  let syncedProductsCount = 0;
  let unsyncedProductsCount = 0;
  let failedProductsCount = 0;
  let needsReviewProductsCount = 0;
  let pendingProductsCount = 0;

  for (const row of latestRows) {
    if (row.lastStatus === 'success') {
      syncedProductsCount++;
    } else {
      unsyncedProductsCount++;
      if (row.lastStatus === 'failed') failedProductsCount++;
      if (row.lastStatus === 'needs_review') needsReviewProductsCount++;
      if (row.lastStatus === 'pending' || row.lastStatus === 'sending') pendingProductsCount++;
    }
  }

  const lastSuccessRow = db.prepare(`
    SELECT sentAt, updatedAt FROM crm_sync_logs
    WHERE status = 'success'
    ORDER BY COALESCE(sentAt, updatedAt) DESC
    LIMIT 1
  `).get() as { sentAt: string | null; updatedAt: string } | undefined;

  const crmSettings = getCrmSettings();

  return {
    totalProducts,
    withCrmIndex,
    withoutCrmIndex,
    totalMappingsCount,
    syncedProductsCount,
    unsyncedProductsCount,
    failedProductsCount,
    needsReviewProductsCount,
    pendingProductsCount,
    lastSyncAt: lastSuccessRow ? (lastSuccessRow.sentAt || lastSuccessRow.updatedAt) : null,
    liveTransmissionEnabled: crmSettings.liveTransmissionEnabled,
    priceUnitConfirmed: crmSettings.priceUnitConfirmed,
  };
}


