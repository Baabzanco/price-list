import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from './layouts/AdminLayout';
import { Dashboard } from './pages/admin/Dashboard';
import { PriceEditor } from './pages/admin/PriceEditor';
import { Categories } from './pages/admin/Categories';
import { Products } from './pages/admin/Products';
import { History } from './pages/admin/History';
import { Settings } from './pages/admin/Settings';
import { PriceList } from './pages/public/PriceList';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/price-list" replace />} />
        <Route path="/price-list" element={<PriceList />} />
        
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="prices" element={<PriceEditor />} />
          <Route path="products" element={<Products />} />
          <Route path="categories" element={<Categories />} />
          <Route path="history" element={<History />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

