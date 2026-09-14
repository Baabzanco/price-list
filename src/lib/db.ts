import { v4 as uuidv4 } from 'uuid';

export interface Category {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
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

export interface DatabaseSchema {
  categories: Category[];
  products: Product[];
  priceHistory: PriceHistory[];
  settings: Settings;
  isSeeded: boolean;
}

const SEED_CATEGORIES: Category[] = [
  { id: 'cat_1', name: 'اقلام گوسفندی', isActive: true, sortOrder: 1 },
  { id: 'cat_2', name: 'اقلام گوسفندی و راسته گوسفندی', isActive: true, sortOrder: 2 },
  { id: 'cat_3', name: 'اقلام خورشتی، گردن، ماهیچه', isActive: true, sortOrder: 3 },
  { id: 'cat_4', name: 'اقلام گوساله جوانه', isActive: true, sortOrder: 4 },
  { id: 'cat_5', name: 'اقلام مرغ', isActive: true, sortOrder: 5 }
];

const SEED_PRODUCTS_RAW = [
  // گوسفندی
  { categoryId: 'cat_1', name: 'راسته' },
  { categoryId: 'cat_1', name: 'ران معمولی' },
  { categoryId: 'cat_1', name: 'ران ممتاز' },
  { categoryId: 'cat_1', name: 'سردست معمولی با دنده' },
  { categoryId: 'cat_1', name: 'کتف ممتاز' },
  { categoryId: 'cat_1', name: 'دنبه' },
  // گوسفندی و راسته گوسفندی
  { categoryId: 'cat_2', name: 'خورده راسته با شاه‌پسند' },
  { categoryId: 'cat_2', name: 'رودستی' },
  { categoryId: 'cat_2', name: 'دست قلوه‌گاه بدون استخوان دو دندانی معمولی' },
  { categoryId: 'cat_2', name: 'قلوه‌گاه تک‌بر' },
  { categoryId: 'cat_2', name: 'قلوه‌گاه با خردل' },
  { categoryId: 'cat_2', name: 'خرده بدن' },
  { categoryId: 'cat_2', name: 'شله گوسفندی' },
  { categoryId: 'cat_2', name: 'راسته با استخوان' },
  { categoryId: 'cat_2', name: 'راسته ممتاز با دور ۲ تکه' },
  { categoryId: 'cat_2', name: 'راسته مغز آنکه' },
  { categoryId: 'cat_2', name: 'فیله مغز بدون رگ' },
  { categoryId: 'cat_2', name: 'شیشلیک تک بند و دو بند' },
  { categoryId: 'cat_2', name: 'شیشلیک تک بند' },
  // خورشتی، گردن، ماهیچه
  { categoryId: 'cat_3', name: 'خورشتی لخم ران' },
  { categoryId: 'cat_3', name: 'خورشتی گل کتف بدون استخوان' },
  { categoryId: 'cat_3', name: 'کتف ممتاز بدون استخوان دو دندانه' },
  { categoryId: 'cat_3', name: 'ماهیچه مشهدی سایز' },
  { categoryId: 'cat_3', name: 'ماهیچه ران' },
  { categoryId: 'cat_3', name: 'ماهیچه ران بدون سر قلم دو دندانه' },
  { categoryId: 'cat_3', name: 'گردن بدون دور سایز شده' },
  { categoryId: 'cat_3', name: 'گردن بدون دور سایز بدون کیست و مغز حرام' },
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

const DB_KEY = 'meat_price_list_db';

class LocalDatabase {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    try {
      const stored = localStorage.getItem(DB_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load DB from localStorage', e);
    }
    
    // Initialize Seed
    const initialData: DatabaseSchema = {
      categories: SEED_CATEGORIES,
      products: SEED_PRODUCTS,
      priceHistory: [],
      settings: DEFAULT_SETTINGS,
      isSeeded: true,
    };
    
    this.saveData(initialData);
    return initialData;
  }

  private saveData(data: DatabaseSchema) {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(data));
      this.data = data;
      
      // Dispatch custom event for cross-component reactivity
      window.dispatchEvent(new Event('db-updated'));
    } catch (e) {
      console.error('Failed to save DB to localStorage', e);
    }
  }

  // Categories
  getCategories(): Category[] {
    return [...this.data.categories].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  addCategory(name: string): Category {
    const newCategory: Category = {
      id: uuidv4(),
      name,
      isActive: true,
      sortOrder: this.data.categories.length + 1
    };
    this.saveData({
      ...this.data,
      categories: [...this.data.categories, newCategory]
    });
    return newCategory;
  }

  updateCategory(id: string, name: string) {
    const updated = this.data.categories.map(c => 
      c.id === id ? { ...c, name } : c
    );
    this.saveData({
      ...this.data,
      categories: updated
    });
  }

  toggleCategoryActive(id: string) {
    const updated = this.data.categories.map(c => 
      c.id === id ? { ...c, isActive: !c.isActive } : c
    );
    this.saveData({
      ...this.data,
      categories: updated
    });
  }

  // Products
  getProducts(): Product[] {
    return [...this.data.products].sort((a, b) => a.sortOrder - b.sortOrder);
  }
  
  getProductsByCategory(categoryId: string): Product[] {
    return this.getProducts().filter(p => p.categoryId === categoryId);
  }

  addProduct(categoryId: string, name: string): Product {
    const categoryProducts = this.getProductsByCategory(categoryId);
    const newProduct: Product = {
      id: `p_${uuidv4()}`,
      categoryId,
      name,
      priceLamb: null,
      priceTwoTeeth: null,
      isActive: true,
      sortOrder: categoryProducts.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.saveData({
      ...this.data,
      products: [...this.data.products, newProduct]
    });
    return newProduct;
  }

  removeProduct(id: string) {
    this.saveData({
      ...this.data,
      products: this.data.products.filter(p => p.id !== id)
    });
  }

  toggleProductActive(id: string) {
    const updated = this.data.products.map(p => 
      p.id === id ? { ...p, isActive: !p.isActive } : p
    );
    this.saveData({
      ...this.data,
      products: updated
    });
  }

  updateProductPrices(updates: { id: string; priceLamb: number | null; priceTwoTeeth: number | null }[], userId: string) {
    const now = new Date().toISOString();
    const newHistory: PriceHistory[] = [];
    
    const updatedProducts = this.data.products.map(product => {
      const update = updates.find(u => u.id === product.id);
      if (!update) return product;

      // Check differences
      if (update.priceLamb !== product.priceLamb) {
        newHistory.push({
          id: uuidv4(),
          productId: product.id,
          priceType: 'lamb',
          oldPrice: product.priceLamb,
          newPrice: update.priceLamb,
          changedAt: now,
          changedBy: userId
        });
      }
      
      if (update.priceTwoTeeth !== product.priceTwoTeeth) {
        newHistory.push({
          id: uuidv4(),
          productId: product.id,
          priceType: 'two_teeth',
          oldPrice: product.priceTwoTeeth,
          newPrice: update.priceTwoTeeth,
          changedAt: now,
          changedBy: userId
        });
      }

      return {
        ...product,
        priceLamb: update.priceLamb,
        priceTwoTeeth: update.priceTwoTeeth,
        updatedAt: now
      };
    });

    if (newHistory.length > 0) {
       this.saveData({
          ...this.data,
          products: updatedProducts,
          priceHistory: [...newHistory, ...this.data.priceHistory], // newest first
          settings: {
            ...this.data.settings,
            lastUpdated: now
          }
       });
    }
  }

  // History
  getPriceHistory(): PriceHistory[] {
    return this.data.priceHistory;
  }

  // Settings
  getSettings(): Settings {
    return this.data.settings;
  }
  
  updateSettings(newSettings: Partial<Settings>) {
    this.saveData({
      ...this.data,
      settings: { ...this.data.settings, ...newSettings }
    });
  }
  
  // Dashboard Stats
  getStats() {
    const activeProducts = this.data.products.filter(p => p.isActive).length;
    const categoriesCount = this.data.categories.length;
    
    // Count changes today
    const todayStr = new Date().toISOString().split('T')[0];
    const changesToday = this.data.priceHistory.filter(h => h.changedAt.startsWith(todayStr)).length;
    
    return {
      activeProducts,
      categoriesCount,
      changesToday,
      lastUpdated: this.data.settings.lastUpdated
    };
  }
}

export const db = new LocalDatabase();
