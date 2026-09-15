import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import * as db from './server/database';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Initialize DB
  db.initDb();

  // --- API Routes ---
  const api = express.Router();

  api.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Categories
  api.get('/categories', (req, res) => res.json(db.getCategories()));
  api.post('/categories', (req, res) => res.json(db.addCategory(req.body.name, req.body.parentId, req.body.hasLamb, req.body.hasTwoTeeth)));
  api.put('/categories/:id', (req, res) => {
    db.updateCategory(req.params.id, req.body.name, req.body.parentId, req.body.hasLamb, req.body.hasTwoTeeth);
    res.json({ success: true });
  });
  api.patch('/categories/:id/toggle', (req, res) => {
    db.toggleCategoryActive(req.params.id);
    res.json({ success: true });
  });

  // Products
  api.get('/products', (req, res) => res.json(db.getProducts()));
  api.get('/products/category/:categoryId', (req, res) => res.json(db.getProductsByCategory(req.params.categoryId)));
  api.post('/products', (req, res) => res.json(db.addProduct(req.body.categoryId, req.body.name, req.body.hasLamb, req.body.hasTwoTeeth)));
  api.put('/products/prices', (req, res) => {
    db.updateProductPrices(req.body.updates, req.body.userId);
    res.json({ success: true });
  });

  api.put('/products/reorder', (req, res) => {
    db.reorderProducts(req.body.updates);
    res.json({ success: true });
  });

  api.put('/products/:id', (req, res) => {
    db.updateProduct(req.params.id, req.body.name, req.body.categoryId, req.body.hasLamb, req.body.hasTwoTeeth);
    res.json({ success: true });
  });
  api.delete('/products/:id', (req, res) => {
    db.removeProduct(req.params.id);
    res.json({ success: true });
  });
  api.patch('/products/:id/toggle', (req, res) => {
    db.toggleProductActive(req.params.id);
    res.json({ success: true });
  });
  // History
  api.get('/history', (req, res) => res.json(db.getPriceHistory()));

  // Settings
  api.get('/settings', (req, res) => res.json(db.getSettings()));
  api.put('/settings', (req, res) => {
    db.updateSettings(req.body);
    res.json({ success: true });
  });

  // Stats
  api.get('/stats', (req, res) => res.json(db.getStats()));

  // Migration
  api.post('/migrate', (req, res) => {
    try {
      db.runMigration(req.body);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

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
