import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import * as db from './server/database';
import * as crmSync from './server/crmSync';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Configure CORS
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) 
    : null;

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (!allowedOrigins) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('CORS request blocked by security policy'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Session-Token', 'X-Requested-With']
  }));

  // JSON Body Parser with safe limits
  app.use(express.json({ limit: '10mb' }));

  // Initialize DB
  db.initDb();
  crmSync.startCrmRetryScheduler();

  // --- In-Memory Login Rate Limiter ---
  const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();
  function checkLoginRateLimit(ip: string): boolean {
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = 10;
    const record = loginAttempts.get(ip);
    if (!record) {
      loginAttempts.set(ip, { count: 1, firstAttempt: now });
      return true;
    }
    if (now - record.firstAttempt > windowMs) {
      loginAttempts.set(ip, { count: 1, firstAttempt: now });
      return true;
    }
    if (record.count >= maxAttempts) {
      return false;
    }
    record.count += 1;
    return true;
  }
  function clearLoginRateLimit(ip: string) {
    loginAttempts.delete(ip);
  }

  // --- Authentication & Role Middlewares ---
  function authRequired(req: any, res: any, next: any) {
    const authHeader = req.headers.authorization || req.headers['x-session-token'];
    let token = '';
    if (typeof authHeader === 'string') {
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      } else {
        token = authHeader.trim();
      }
    }

    if (!token) {
      return res.status(401).json({ error: 'عدم احراز هویت. لطفاً ابتدا وارد سیستم شوید.' });
    }

    const user = db.getSessionUser(token);
    if (!user) {
      return res.status(401).json({ error: 'نشست کاربری نامعتبر یا منقضی شده است. لطفاً مجدداً وارد شوید.' });
    }

    req.user = user;
    req.sessionToken = token;
    next();
  }

  function roleRequired(allowedRoles: string[]) {
    return (req: any, res: any, next: any) => {
      if (!req.user || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'دسترسی غیرمجاز. سطح دسترسی شما برای این عملیات کافی نیست.' });
      }
      next();
    };
  }

  function apiKeyRequired(requiredScope?: string) {
    return (req: any, res: any, next: any) => {
      // Rejects non-GET write methods on read-only endpoints
      if (req.method !== 'GET' && req.method !== 'OPTIONS' && req.method !== 'HEAD') {
        return res.status(405).json({
          success: false,
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: 'عملیات نامعتبر است. این رابط صرفاً فقط-خواندنی (Read-Only) است.'
          }
        });
      }

      const rawAuth = req.headers['x-api-key'] || req.headers.authorization;
      let apiKey = '';
      if (typeof rawAuth === 'string') {
        if (rawAuth.startsWith('Bearer ')) {
          apiKey = rawAuth.substring(7).trim();
        } else {
          apiKey = rawAuth.trim();
        }
      }

      if (!apiKey) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'کلید دسترسی ارائه نشده است. لطفاً کلید معتبر را در هدر X-API-Key ارسال فرمایید.'
          }
        });
      }

      const result = db.validateApiKey(apiKey, requiredScope);
      if (!result) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_API_KEY',
            message: 'کلید API نامعتبر است یا غیرفعال شده است.'
          }
        });
      }

      if (result.error === 'EXPIRED') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'API_KEY_EXPIRED',
            message: 'اعتبار کلید API منقضی شده است.'
          }
        });
      }

      if (result.error === 'INSUFFICIENT_SCOPE') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_SCOPE',
            message: `کلید API فاقد مجوز دسترسی لازم (${result.requiredScope}) است.`
          }
        });
      }

      req.apiKey = result;
      next();
    };
  }

  // --- API Router ---
  const api = express.Router();

  // Public Health Check
  api.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // --- Public Read-Only Endpoints (Required by Public Price List) ---
  api.get('/categories', (req, res) => {
    try {
      res.json(db.getCategories());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  api.get('/products', (req, res) => {
    try {
      res.json(db.getProducts());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  api.get('/products/category/:categoryId', (req, res) => {
    try {
      res.json(db.getProductsByCategory(req.params.categoryId));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  api.get('/settings', (req, res) => {
    try {
      res.json(db.getSettings());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- Authentication Routes ---
  api.post('/auth/login', (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkLoginRateLimit(ip)) {
      return res.status(429).json({ error: 'تعداد تلاش‌های ناموفق بیش از حد مجاز است. لطفاً ۱۵ دقیقه دیگر تلاش کنید.' });
    }

    try {
      const { username, password } = req.body || {};
      if (!username || !password) {
        return res.status(400).json({ error: 'نام کاربری و رمز عبور الزامی است.' });
      }

      const user = db.validateUser(String(username).trim(), String(password));
      if (user) {
        clearLoginRateLimit(ip);
        const token = db.createSession(user.id);
        res.json({ success: true, token, user });
      } else {
        res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است.' });
      }
    } catch (e: any) {
      res.status(500).json({ error: 'خطای سیستمی در فرآیند احراز هویت.' });
    }
  });

  api.post('/auth/logout', authRequired, (req: any, res) => {
    try {
      if (req.sessionToken) {
        db.deleteSession(req.sessionToken);
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  api.get('/auth/me', authRequired, (req: any, res) => {
    res.json({ success: true, user: req.user });
  });

  // --- Protected Editor & Admin Routes ---
  api.get('/history', authRequired, roleRequired(['admin', 'editor']), (req, res) => {
    try {
      res.json(db.getPriceHistory());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  api.get('/stats', authRequired, roleRequired(['admin', 'editor']), (req, res) => {
    try {
      res.json(db.getStats());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  api.put('/products/prices', authRequired, roleRequired(['admin', 'editor']), (req: any, res) => {
    try {
      if (!req.body || !Array.isArray(req.body.updates)) {
        return res.status(400).json({ error: 'فرمت داده‌های تغییر قیمت نامعتبر است.' });
      }
      // Security Hardening: Derive audit identity strictly from authenticated user!
      const auditIdentity = req.user.name ? `${req.user.name} (${req.user.username})` : req.user.username;
      const { changedVariants } = db.updateProductPrices(req.body.updates, auditIdentity);

      // Fire-and-forget asynchronous CRM sync queue (never blocks or fails local price saving)
      if (changedVariants.length > 0) {
        crmSync.enqueueAutoPriceSync(changedVariants, auditIdentity).catch(err => {
          console.error('[CRM_SYNC] Failed to enqueue auto price sync:', err);
        });
      }

      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message || 'خطا در ثبت تغییرات قیمت.' });
    }
  });

  api.put('/products/reorder', authRequired, roleRequired(['admin', 'editor']), (req, res) => {
    try {
      if (!req.body || !Array.isArray(req.body.updates)) {
        return res.status(400).json({ error: 'فرمت داده‌های چیدمان نامعتبر است.' });
      }
      db.reorderProducts(req.body.updates);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message || 'خطا در تغییر ترتیب محصولات.' });
    }
  });

  api.patch('/products/:id/toggle', authRequired, roleRequired(['admin', 'editor']), (req, res) => {
    try {
      db.toggleProductActive(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- Protected Admin-Only Routes ---
  api.post('/categories', authRequired, roleRequired(['admin']), (req, res) => {
    try {
      if (!req.body || !req.body.name) {
        return res.status(400).json({ error: 'نام دسته‌بندی الزامی است.' });
      }
      const cat = db.addCategory(req.body.name, req.body.parentId, req.body.hasLamb, req.body.hasTwoTeeth);
      res.json(cat);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  api.put('/categories/:id', authRequired, roleRequired(['admin']), (req, res) => {
    try {
      if (!req.body || !req.body.name) {
        return res.status(400).json({ error: 'نام دسته‌بندی الزامی است.' });
      }
      db.updateCategory(req.params.id, req.body.name, req.body.parentId, req.body.hasLamb, req.body.hasTwoTeeth);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  api.delete('/categories/:id', authRequired, roleRequired(['admin']), (req, res) => {
    try {
      db.deleteCategory(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  api.patch('/categories/:id/toggle', authRequired, roleRequired(['admin']), (req, res) => {
    try {
      db.toggleCategoryActive(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  api.post('/products', authRequired, roleRequired(['admin']), (req, res) => {
    try {
      if (!req.body || !req.body.name || !req.body.categoryId) {
        return res.status(400).json({ error: 'نام کالا و دسته‌بندی الزامی است.' });
      }
      const crmIndex = req.body.crmProductIndex !== undefined ? req.body.crmProductIndex : req.body.crm_product_index;
      const prod = db.addProduct(
        req.body.categoryId,
        req.body.name,
        req.body.hasLamb,
        req.body.hasTwoTeeth,
        req.body.fontSize,
        {
          crmProductIndex: crmIndex,
          crmLambIndex: req.body.crmLambIndex,
          crmTwoTeethIndex: req.body.crmTwoTeethIndex,
          crmMappings: req.body.crmMappings,
        }
      );
      res.json(prod);
    } catch (e: any) {
      res.status(e.statusCode || 400).json({ error: e.message, code: e.code });
    }
  });

  api.put('/products/:id', authRequired, roleRequired(['admin']), (req, res) => {
    try {
      if (!req.body || !req.body.name || !req.body.categoryId) {
        return res.status(400).json({ error: 'نام کالا و دسته‌بندی الزامی است.' });
      }
      const crmIndex = req.body.crmProductIndex !== undefined ? req.body.crmProductIndex : req.body.crm_product_index;
      db.updateProduct(
        req.params.id,
        req.body.name,
        req.body.categoryId,
        req.body.hasLamb,
        req.body.hasTwoTeeth,
        req.body.fontSize,
        {
          crmProductIndex: crmIndex,
          crmLambIndex: req.body.crmLambIndex,
          crmTwoTeethIndex: req.body.crmTwoTeethIndex,
          crmMappings: req.body.crmMappings,
        }
      );
      res.json({ success: true });
    } catch (e: any) {
      res.status(e.statusCode || 400).json({ error: e.message, code: e.code });
    }
  });

  api.delete('/products/:id', authRequired, roleRequired(['admin']), (req, res) => {
    try {
      db.removeProduct(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  api.put('/settings', authRequired, roleRequired(['admin']), (req, res) => {
    try {
      db.updateSettings(req.body);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Backup & Restore (Protected Admin Only)
  api.get('/backup', authRequired, roleRequired(['admin']), (req, res) => {
    try {
      const backup = db.getBackupData();
      res.json(backup);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  api.post('/backup/restore', authRequired, roleRequired(['admin']), (req, res) => {
    try {
      const result = db.restoreBackupData(req.body);
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e.message || 'خطا در بارگذاری فایل پشتیبان.' });
    }
  });

  api.post('/migrate', authRequired, roleRequired(['admin']), (req, res) => {
    try {
      db.runMigration(req.body);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // User Management (Protected Admin Only)
  api.get('/users', authRequired, roleRequired(['admin']), (req, res) => {
    try {
      res.json(db.getUsers());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  api.post('/users', authRequired, roleRequired(['admin']), (req, res) => {
    try {
      const { username, password, name, role } = req.body || {};
      if (!username || !password || !name) {
        return res.status(400).json({ error: 'اطلاعات کاربر ناقص است.' });
      }
      const newUser = db.addUser(username.trim().toLowerCase(), password, name.trim(), role || 'editor');
      res.json(newUser);
    } catch (e: any) {
      res.status(400).json({ error: 'نام کاربری از قبل وجود دارد یا خطایی رخ داده است.' });
    }
  });

  api.put('/users/:id', authRequired, roleRequired(['admin']), (req, res) => {
    try {
      const { username, password, name, role } = req.body || {};
      if (!username || !name) {
        return res.status(400).json({ error: 'نام و نام کاربری الزامی است.' });
      }
      const updated = db.updateUser(req.params.id, username, password || null, name, role || 'editor');
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ error: e.message || 'خطا در بروزرسانی کاربر.' });
    }
  });

  api.delete('/users/:id', authRequired, roleRequired(['admin']), (req: any, res) => {
    try {
      db.removeUser(req.params.id, req.user.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message || 'خطا در حذف کاربر.' });
    }
  });

  // API Key Management (Protected Admin Only)
  api.get('/api-keys', authRequired, roleRequired(['admin']), (req, res) => {
    try {
      res.json(db.getApiKeys());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  api.post('/api-keys', authRequired, roleRequired(['admin']), (req, res) => {
    try {
      const { name, scopes, expiresInDays } = req.body || {};
      if (!name) {
        return res.status(400).json({ error: 'عنوان کلید الزامی است.' });
      }
      const created = db.createApiKey(name, scopes, expiresInDays ? parseInt(expiresInDays, 10) : null);
      res.json(created);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  api.delete('/api-keys/:id', authRequired, roleRequired(['admin']), (req, res) => {
    try {
      db.deleteApiKey(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  api.patch('/api-keys/:id/revoke', authRequired, roleRequired(['admin']), (req, res) => {
    try {
      db.revokeApiKey(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- CRM Synchronization & Configuration (Protected Admin Only) ---
  api.get('/crm/stats', authRequired, roleRequired(['admin']), (req, res) => {
    try {
      res.json(db.getCrmSyncStats());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  api.get('/crm/settings', authRequired, roleRequired(['admin']), (req, res) => {
    try {
      const settings = db.getCrmSettings();
      res.json({
        ...settings,
        ...db.getCrmApiSecretStatus(),
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  api.put('/crm/settings', authRequired, roleRequired(['admin']), (req: any, res) => {
    try {
      const updated = db.updateCrmSettings(req.body || {});
      const secretStatus = db.getCrmApiSecretStatus();
      const auditIdentity = req.user.name ? `${req.user.name} (${req.user.username})` : req.user.username;
      console.log(`[CRM_SYNC] Settings updated by ${auditIdentity}: liveTransmissionEnabled=${updated.liveTransmissionEnabled}, priceUnitConfirmed=${updated.priceUnitConfirmed}, authType=${updated.authType}, hasApiKey=${secretStatus.hasApiKey}`);
      res.json({
        ...updated,
        ...secretStatus,
      });
    } catch (e: any) {
      res.status(400).json({ error: e.message || 'خطا در ذخیره تنظیمات CRM.' });
    }
  });

  api.get('/crm/logs', authRequired, roleRequired(['admin']), (req, res) => {
    try {
      const result = db.getCrmSyncLogs({
        status: req.query.status as string | undefined,
        productId: req.query.productId as string | undefined,
        operationType: req.query.operationType as string | undefined,
        from: req.query.from as string | undefined,
        to: req.query.to as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 100,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
      });
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  api.get('/crm/bulk-preview', authRequired, roleRequired(['admin']), (req, res) => {
    try {
      res.json(crmSync.getManualBulkPreview());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  api.post('/crm/sync-all', authRequired, roleRequired(['admin']), async (req: any, res) => {
    try {
      const auditIdentity = req.user.name ? `${req.user.name} (${req.user.username})` : req.user.username;
      const summary = await crmSync.triggerManualBulkSync(auditIdentity);
      res.json(summary);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'خطا در اجرای همگام‌سازی گروهی.' });
    }
  });

  api.post('/crm/retry-failed', authRequired, roleRequired(['admin']), async (req: any, res) => {
    try {
      const auditIdentity = req.user.name ? `${req.user.name} (${req.user.username})` : req.user.username;
      const logIds = Array.isArray(req.body?.logIds) ? req.body.logIds : undefined;
      const includePending = Boolean(req.body?.includePending);
      const summary = await crmSync.retryCrmLogs({
        logIds,
        triggeredBy: auditIdentity,
        isAutomatic: false,
        includePending,
      });
      res.json(summary);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'خطا در ارسال مجدد موارد ناموفق.' });
    }
  });

  api.post('/crm/logs/:id/retry', authRequired, roleRequired(['admin']), async (req: any, res) => {
    try {
      const existing = db.getCrmSyncLogById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'رکورد همگام‌سازی یافت نشد.' });
      }
      const auditIdentity = req.user.name ? `${req.user.name} (${req.user.username})` : req.user.username;
      const summary = await crmSync.retryCrmLogs({
        logIds: [req.params.id],
        triggeredBy: auditIdentity,
        isAutomatic: false,
      });
      res.json(summary);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'خطا در ارسال مجدد.' });
    }
  });

  // --- Read-Only Internal Integration API (/api/internal/*) ---
  const internalApi = express.Router();

  // Reject write methods explicitly with 405
  internalApi.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'OPTIONS' && req.method !== 'HEAD') {
      return res.status(405).json({
        success: false,
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: 'این API فقط-خواندنی (Read-Only) است. متدهای POST, PUT, DELETE, PATCH مجاز نمی‌باشند.'
        }
      });
    }
    next();
  });

  // Internal Products
  internalApi.get('/products', apiKeyRequired('read:products'), (req, res) => {
    try {
      const categoryId = req.query.categoryId as string | undefined;
      const isActiveParam = req.query.isActive as string | undefined;
      const limit = Math.min(Math.max(1, parseInt(req.query.limit as string, 10) || 100), 500);
      const offset = Math.max(0, parseInt(req.query.offset as string, 10) || 0);

      let products = categoryId ? db.getProductsByCategory(categoryId) : db.getProducts();
      if (isActiveParam !== undefined) {
        const wantActive = isActiveParam === 'true' || isActiveParam === '1';
        products = products.filter(p => p.isActive === wantActive);
      }

      const total = products.length;
      const paged = products.slice(offset, offset + limit);

      res.json({
        success: true,
        total,
        limit,
        offset,
        data: paged
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
    }
  });

  // Internal Categories
  internalApi.get('/categories', apiKeyRequired('read:categories'), (req, res) => {
    try {
      const parentId = req.query.parentId !== undefined 
        ? (req.query.parentId === 'null' ? null : String(req.query.parentId)) 
        : undefined;
      const isActiveParam = req.query.isActive as string | undefined;

      let categories = db.getCategories();
      if (parentId !== undefined) {
        categories = categories.filter(c => c.parentId === parentId);
      }
      if (isActiveParam !== undefined) {
        const wantActive = isActiveParam === 'true' || isActiveParam === '1';
        categories = categories.filter(c => c.isActive === wantActive);
      }

      res.json({
        success: true,
        total: categories.length,
        data: categories
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
    }
  });

  // Internal Live Price List
  internalApi.get('/price-list', apiKeyRequired('read:prices'), (req, res) => {
    try {
      const categories = db.getCategories().filter(c => c.isActive);
      const allProducts = db.getProducts().filter(p => p.isActive);
      const settings = db.getSettings();

      const structured = categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        hasLamb: cat.hasLamb,
        hasTwoTeeth: cat.hasTwoTeeth,
        products: allProducts
          .filter(p => p.categoryId === cat.id)
          .map(p => ({
            id: p.id,
            name: p.name,
            priceLamb: p.priceLamb,
            priceTwoTeeth: p.priceTwoTeeth,
            hasLamb: p.hasLamb,
            hasTwoTeeth: p.hasTwoTeeth
          }))
      }));

      res.json({
        success: true,
        companyName: settings.companyName,
        currency: settings.currency,
        lastUpdated: settings.lastUpdated,
        dateMode: settings.dateMode || 'today',
        categories: structured
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: e.message } });
    }
  });

  // Mount internal router
  api.use('/internal', internalApi);

  // Mount main api router
  app.use('/api', api);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
