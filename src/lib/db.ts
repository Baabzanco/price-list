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
  hasLamb: boolean;
  hasTwoTeeth: boolean;
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
  hasEnvAuthToken?: boolean;
  hasApiKey?: boolean;
  apiKeySource?: 'settings' | 'env' | 'none';
  apiKeyMasked?: string | null;
}

export interface CrmSyncLog {
  id: string;
  batchId: string | null;
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

export interface CrmSyncStats {
  totalProducts: number;
  withCrmIndex: number;
  withoutCrmIndex: number;
  totalMappingsCount?: number;
  syncedProductsCount: number;
  unsyncedProductsCount: number;
  failedProductsCount: number;
  needsReviewProductsCount: number;
  pendingProductsCount: number;
  lastSyncAt: string | null;
  liveTransmissionEnabled: boolean;
  priceUnitConfirmed: boolean;
}

export interface CrmBulkPreview {
  totalProducts: number;
  withCrmIndex: number;
  withoutCrmIndex: number;
  totalMappingsCount?: number;
  eligibleCount: number;
  missingPriceWithIndexCount: number;
  liveTransmissionEnabled: boolean;
  priceUnitConfirmed: boolean;
  priceUnitLabel: string;
  priceMultiplier: number;
  batchSize: number;
  samplePayload: Record<string, number>;
  items: Array<{
    productId: string;
    productName: string;
    priceType?: CrmPriceType;
    variantLabel?: string;
    crmProductIndex: number;
    rawPrice: number;
    sentPrice: number;
    isActive: boolean;
  }>;
}

export interface CrmSyncBatchSummary {
  transmitted: boolean;
  reason?: string;
  total: number;
  succeeded: number;
  failed: number;
  needsReview: number;
  pending: number;
  batchResults: Array<{
    batchId: string;
    sentCount: number;
    updatedCount: number | null;
    status: CrmSyncStatus;
    errorMessage: string | null;
  }>;
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

export interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  createdAt: string;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  isActive: boolean;
}

class APIClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('price_list_token');
  }

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('price_list_token', token);
    } else {
      localStorage.removeItem('price_list_token');
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`/api${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errMsg = 'خطا در ارتباط با سرور';
      try {
        const errJson = await res.json();
        errMsg = errJson.error?.message || errJson.error || errJson.message || errMsg;
      } catch {
        const text = await res.text();
        if (text) errMsg = text;
      }

      if (res.status === 401 && !endpoint.includes('/auth/login')) {
        this.setToken(null);
        localStorage.removeItem('price_list_user');
        window.dispatchEvent(new Event('auth-expired'));
      }

      throw new Error(errMsg);
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
  async deleteCategory(id: string): Promise<void> {
    await this.request<void>(`/categories/${id}`, { method: 'DELETE' });
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
  async addProduct(
    categoryId: string,
    name: string,
    hasLamb: boolean = true,
    hasTwoTeeth: boolean = true,
    fontSize?: number | null,
    crmOptions?: number | null | {
      crmProductIndex?: number | null;
      crmLambIndex?: number | null;
      crmTwoTeethIndex?: number | null;
      crmMappings?: ProductCrmMapping[];
    }
  ): Promise<Product> {
    const crmPayload =
      crmOptions && typeof crmOptions === 'object'
        ? crmOptions
        : { crmProductIndex: crmOptions ?? null };
    const res = await this.request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify({ categoryId, name, hasLamb, hasTwoTeeth, fontSize: fontSize ?? null, ...crmPayload })
    });
    this.notify();
    return res;
  }
  async updateProduct(
    id: string,
    name: string,
    categoryId: string,
    hasLamb: boolean = true,
    hasTwoTeeth: boolean = true,
    fontSize?: number | null,
    crmOptions?: number | null | {
      crmProductIndex?: number | null;
      crmLambIndex?: number | null;
      crmTwoTeethIndex?: number | null;
      crmMappings?: ProductCrmMapping[];
    }
  ): Promise<void> {
    const crmPayload =
      crmOptions && typeof crmOptions === 'object'
        ? crmOptions
        : { crmProductIndex: crmOptions ?? null };
    await this.request<void>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, categoryId, hasLamb, hasTwoTeeth, fontSize: fontSize ?? null, ...crmPayload })
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
  async updateProductPrices(updates: { id: string; priceLamb: number | null; priceTwoTeeth: number | null }[], userId?: string): Promise<void> {
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

  // Backup & Restore
  async getBackup(): Promise<any> {
    return this.request<any>('/backup');
  }

  async restoreBackup(backupData: any): Promise<{ success: boolean; categoriesCount: number; productsCount: number }> {
    const res = await this.request<{ success: boolean; categoriesCount: number; productsCount: number }>('/backup/restore', {
      method: 'POST',
      body: JSON.stringify(backupData)
    });
    this.notify();
    return res;
  }

  // Migration
  async migrateFromLocal(data: any): Promise<void> {
    return this.request<void>('/migrate', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Auth & Users
  async login(username: string, passwordPlain: string): Promise<{ success: boolean; token: string; user: User }> {
    const res = await this.request<{ success: boolean; token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password: passwordPlain })
    });
    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  async logout(): Promise<void> {
    try {
      await this.request<void>('/auth/logout', { method: 'POST' });
    } catch {}
    this.setToken(null);
    localStorage.removeItem('price_list_user');
  }

  async getMe(): Promise<{ success: boolean; user: User }> {
    return this.request<{ success: boolean; user: User }>('/auth/me');
  }

  async getUsers(): Promise<User[]> {
    return this.request<User[]>('/users');
  }

  async addUser(userData: any): Promise<User> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async updateUser(id: string, userData: any): Promise<User> {
    return this.request<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  }

  async removeUser(id: string): Promise<void> {
    await this.request<void>(`/users/${id}`, { method: 'DELETE' });
  }

  // API Key Management
  async getApiKeys(): Promise<ApiKeyItem[]> {
    return this.request<ApiKeyItem[]>('/api-keys');
  }

  async createApiKey(data: { name: string; scopes: string[]; expiresInDays?: number | null }): Promise<{ key: string; record: ApiKeyItem }> {
    return this.request<{ key: string; record: ApiKeyItem }>('/api-keys', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async revokeApiKey(id: string): Promise<void> {
    await this.request<void>(`/api-keys/${id}/revoke`, { method: 'PATCH' });
  }

  async deleteApiKey(id: string): Promise<void> {
    await this.request<void>(`/api-keys/${id}`, { method: 'DELETE' });
  }

  // CRM Synchronization
  async getCrmStats(): Promise<CrmSyncStats> {
    return this.request<CrmSyncStats>('/crm/stats');
  }

  async getCrmSettings(): Promise<CrmSettings> {
    return this.request<CrmSettings>('/crm/settings');
  }

  async updateCrmSettings(data: Partial<CrmSettings> & { apiKey?: string; clearApiKey?: boolean }): Promise<CrmSettings> {
    return this.request<CrmSettings>('/crm/settings', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async getCrmLogs(filters?: {
    status?: string;
    productId?: string;
    operationType?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ total: number; items: CrmSyncLog[] }> {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters?.productId && filters.productId !== 'all') params.set('productId', filters.productId);
    if (filters?.operationType && filters.operationType !== 'all') params.set('operationType', filters.operationType);
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));
    const qs = params.toString();
    return this.request<{ total: number; items: CrmSyncLog[] }>(`/crm/logs${qs ? `?${qs}` : ''}`);
  }

  async getCrmBulkPreview(): Promise<CrmBulkPreview> {
    return this.request<CrmBulkPreview>('/crm/bulk-preview');
  }

  async syncAllToCrm(): Promise<CrmSyncBatchSummary> {
    return this.request<CrmSyncBatchSummary>('/crm/sync-all', { method: 'POST' });
  }

  async retryFailedCrmLogs(options?: { logIds?: string[]; includePending?: boolean }): Promise<CrmSyncBatchSummary> {
    return this.request<CrmSyncBatchSummary>('/crm/retry-failed', {
      method: 'POST',
      body: JSON.stringify(options || {})
    });
  }

  async retryCrmLogById(id: string): Promise<CrmSyncBatchSummary> {
    return this.request<CrmSyncBatchSummary>(`/crm/logs/${id}/retry`, { method: 'POST' });
  }
}

export const db = new APIClient();
