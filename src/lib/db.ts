// Interfaces that match backend
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
  hasLamb: boolean;
  hasTwoTeeth: boolean;
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

class APIClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`/api${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    if (!res.ok) {
      const error = await res.text();
      throw new Error(error || 'API Error');
    }
    return res.json();
  }

  private notify() {
    window.dispatchEvent(new Event('db-updated'));
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return this.request<Category[]>('/categories');
  }
  async addCategory(name: string, parentId: string | null = null, hasLamb: boolean = true, hasTwoTeeth: boolean = true): Promise<Category> {
    const res = await this.request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify({ name, parentId, hasLamb, hasTwoTeeth })
    });
    this.notify();
    return res;
  }
  async updateCategory(id: string, name: string, parentId: string | null = null, hasLamb: boolean = true, hasTwoTeeth: boolean = true): Promise<void> {
    await this.request<void>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, parentId, hasLamb, hasTwoTeeth })
    });
    this.notify();
  }
  async toggleCategoryActive(id: string): Promise<void> {
    await this.request<void>(`/categories/${id}/toggle`, { method: 'PATCH' });
    this.notify();
  }

  // Products
  async getProducts(): Promise<Product[]> {
    return this.request<Product[]>('/products');
  }
  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    return this.request<Product[]>(`/products/category/${categoryId}`);
  }
  async addProduct(categoryId: string, name: string, hasLamb: boolean = true, hasTwoTeeth: boolean = true): Promise<Product> {
    const res = await this.request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify({ categoryId, name, hasLamb, hasTwoTeeth })
    });
    this.notify();
    return res;
  }
  async updateProduct(id: string, name: string, categoryId: string, hasLamb: boolean = true, hasTwoTeeth: boolean = true): Promise<void> {
    await this.request<void>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, categoryId, hasLamb, hasTwoTeeth })
    });
    this.notify();
  }
  async removeProduct(id: string): Promise<void> {
    await this.request<void>(`/products/${id}`, { method: 'DELETE' });
    this.notify();
  }
  async toggleProductActive(id: string): Promise<void> {
    await this.request<void>(`/products/${id}/toggle`, { method: 'PATCH' });
    this.notify();
  }
  async updateProductPrices(updates: { id: string; priceLamb: number | null; priceTwoTeeth: number | null }[], userId: string): Promise<void> {
    await this.request<void>('/products/prices', {
      method: 'PUT',
      body: JSON.stringify({ updates, userId })
    });
    this.notify();
  }

  async reorderProducts(updates: { id: string; sortOrder: number }[]): Promise<void> {
    await this.request<void>('/products/reorder', {
      method: 'PUT',
      body: JSON.stringify({ updates })
    });
    this.notify();
  }

  // History
  async getPriceHistory(): Promise<PriceHistory[]> {
    return this.request<PriceHistory[]>('/history');
  }

  // Settings
  async getSettings(): Promise<Settings> {
    return this.request<Settings>('/settings');
  }
  async updateSettings(newSettings: Partial<Settings>): Promise<void> {
    await this.request<void>('/settings', {
      method: 'PUT',
      body: JSON.stringify(newSettings)
    });
    this.notify();
  }

  // Stats
  async getStats(): Promise<{ activeProducts: number, categoriesCount: number, changesToday: number, lastUpdated: string | null }> {
    return this.request('/stats');
  }

  // Migration
  async migrateFromLocal(data: any): Promise<void> {
    return this.request<void>('/migrate', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
}

export const db = new APIClient();
