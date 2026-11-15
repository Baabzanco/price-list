import React, { useState, useMemo } from 'react';
import { useDB } from '../../lib/useDB';
import { db, Category } from '../../lib/db';
import { CheckCircle2, AlertCircle, Eye, EyeOff, Plus, Trash2, Search, Edit2, Save, X, GripVertical, Type, Minus, RotateCcw, Link2, Unlink } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '../../lib/utils';

function parseCrmIndexInput(raw: string): { valid: boolean; value: number | null; error?: string } {
  const normalized = raw
    .trim()
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  if (normalized === '') {
    return { valid: true, value: null };
  }
  if (!/^\d+$/.test(normalized)) {
    return { valid: false, value: null, error: 'شاخص محصول در CRM باید یک عدد صحیح مثبت باشد.' };
  }
  const num = Number(normalized);
  if (!Number.isSafeInteger(num) || num <= 0) {
    return { valid: false, value: null, error: 'شاخص محصول در CRM باید عدد صحیح بزرگ‌تر از صفر باشد.' };
  }
  return { valid: true, value: num };
}

function SortableRow({ product, category, isEditing, editForm, setEditForm, editError, saveEdit, startEdit, toggleVisibility, removeProduct, setEditingId, orderedCategories, isFilterActive }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 1 : 0, position: isDragging ? 'relative' as const : undefined };
  return (
    <tr ref={setNodeRef} style={style} className={`hover:bg-surface-50/50 dark:hover:bg-surface-800/50 transition-colors ${isDragging ? 'bg-surface-100 dark:bg-surface-800 shadow-lg' : ''} ${isEditing ? 'bg-primary/5 dark:bg-primary/10' : ''}`}>
      <td className="pl-2 pr-6 py-4 w-10">
        {!isEditing && !isFilterActive && (
          <div {...attributes} {...listeners} className="cursor-grab text-surface-400 hover:text-surface-600 dark:hover:text-surface-300">
            <GripVertical className="w-4 h-4" />
          </div>
        )}
      </td>
      <td className="px-6 py-4">
        {isEditing ? (
          <div className="space-y-2.5 min-w-[280px]">
            <input 
              type="text" 
              value={editForm.name} 
              onChange={e => setEditForm({ ...editForm, name: e.target.value })} 
              className="w-full px-3 py-2 rounded-lg border border-surface-200 bg-white dark:bg-surface-800 dark:border-surface-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium" 
              placeholder="نام قلم..."
            />
            
            {/* Font size control toolbar */}
            <div className="flex flex-col gap-2 p-2.5 rounded-xl bg-surface-50 dark:bg-surface-800/90 border border-surface-200 dark:border-surface-700">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs text-surface-700 dark:text-surface-300 font-medium">
                  <Type className="w-3.5 h-3.5 text-primary" />
                  سایز فونت نام آیتم:
                </span>
                
                {/* Stepper +/- */}
                <div className="flex items-center bg-white dark:bg-surface-900 rounded-lg border border-surface-200 dark:border-surface-700 shadow-xs">
                  <button
                    type="button"
                    onClick={() => {
                      const current = editForm.fontSize ?? 13;
                      const next = Math.max(9, current - 1);
                      setEditForm({ ...editForm, fontSize: next });
                    }}
                    className="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-700 dark:text-surface-300 rounded-r-lg transition-colors cursor-pointer"
                    title="کوچک‌تر کردن فونت (-)"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 font-mono font-bold text-xs text-surface-900 dark:text-white min-w-[48px] text-center">
                    {editForm.fontSize ? `${editForm.fontSize}px` : 'خودکار'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const current = editForm.fontSize ?? 13;
                      const next = Math.min(26, current + 1);
                      setEditForm({ ...editForm, fontSize: next });
                    }}
                    className="p-1.5 hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-700 dark:text-surface-300 rounded-l-lg transition-colors cursor-pointer"
                    title="بزرگ‌تر کردن فونت (+)"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Quick Presets & Reset */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-surface-200/60 dark:border-surface-700/60">
                <span className="text-[11px] text-surface-500">اندازه‌ها:</span>
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, fontSize: 11 })}
                  className={cn(
                    "px-2 py-0.5 rounded text-[11px] transition-all cursor-pointer",
                    editForm.fontSize === 11 
                      ? "bg-primary text-white font-bold shadow-xs" 
                      : "bg-white dark:bg-surface-700 text-surface-700 dark:text-surface-200 border border-surface-200 dark:border-surface-600 hover:bg-surface-100"
                  )}
                >
                  کوچک (11px)
                </button>
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, fontSize: 13 })}
                  className={cn(
                    "px-2 py-0.5 rounded text-[11px] transition-all cursor-pointer",
                    editForm.fontSize === 13 
                      ? "bg-primary text-white font-bold shadow-xs" 
                      : "bg-white dark:bg-surface-700 text-surface-700 dark:text-surface-200 border border-surface-200 dark:border-surface-600 hover:bg-surface-100"
                  )}
                >
                  استاندارد (13px)
                </button>
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, fontSize: 15 })}
                  className={cn(
                    "px-2 py-0.5 rounded text-[11px] transition-all cursor-pointer",
                    editForm.fontSize === 15 
                      ? "bg-primary text-white font-bold shadow-xs" 
                      : "bg-white dark:bg-surface-700 text-surface-700 dark:text-surface-200 border border-surface-200 dark:border-surface-600 hover:bg-surface-100"
                  )}
                >
                  بزرگ (15px)
                </button>
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, fontSize: 18 })}
                  className={cn(
                    "px-2 py-0.5 rounded text-[11px] transition-all cursor-pointer",
                    editForm.fontSize === 18 
                      ? "bg-primary text-white font-bold shadow-xs" 
                      : "bg-white dark:bg-surface-700 text-surface-700 dark:text-surface-200 border border-surface-200 dark:border-surface-600 hover:bg-surface-100"
                  )}
                >
                  خیلی بزرگ (18px)
                </button>
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, fontSize: null })}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-all mr-auto cursor-pointer",
                    editForm.fontSize === null 
                      ? "bg-surface-700 text-white font-bold" 
                      : "bg-white dark:bg-surface-700 text-surface-500 dark:text-surface-400 border border-surface-200 dark:border-surface-600 hover:bg-surface-100"
                  )}
                  title="بازگشت به اندازه خودکار بر اساس طول نام"
                >
                  <RotateCcw className="w-3 h-3" />
                  خودکار
                </button>
              </div>

              {/* Live Preview Bar */}
              <div className="mt-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 flex items-center gap-2 overflow-hidden">
                <span className="text-[10px] text-surface-400 shrink-0">پیش‌نمایش:</span>
                <span 
                  className="font-bold text-surface-900 dark:text-white truncate"
                  style={{ fontSize: `${editForm.fontSize || 13}px` }}
                >
                  {editForm.name || 'نام قلم'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <span 
              className="font-medium text-surface-900 dark:text-white transition-all"
              style={product.fontSize ? { fontSize: `${product.fontSize}px` } : undefined}
            >
              {product.name}
            </span>
            {product.fontSize ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-hover border border-primary/20" title="سایز فونت اختصاصی">
                <Type className="w-3 h-3" />
                {product.fontSize}px
              </span>
            ) : null}
          </div>
        )}
      </td>
      <td className="px-6 py-4">
        {isEditing ? (
          <select value={editForm.categoryId} onChange={e => setEditForm({ ...editForm, categoryId: e.target.value })} className="w-full px-3 py-1.5 rounded-lg border border-surface-200 bg-white dark:bg-surface-800 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary/20">
            {orderedCategories.map((c: any) => <option key={c.id} value={c.id}>{'  '.repeat(c.depth)}{c.name}</option>)}
          </select>
        ) : (
          <span className="text-surface-600 dark:text-surface-400">{category?.name || 'بدون دسته'}</span>
        )}
      </td>
      <td className="px-6 py-4">
        {isEditing ? (
          <div className="flex gap-4 items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={editForm.hasLamb} onChange={e => setEditForm({ ...editForm, hasLamb: e.target.checked })} className="w-4 h-4 rounded text-primary bg-white border-surface-300 dark:bg-surface-800 dark:border-surface-600" />
              <span className="text-sm">بره</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={editForm.hasTwoTeeth} onChange={e => setEditForm({ ...editForm, hasTwoTeeth: e.target.checked })} className="w-4 h-4 rounded text-primary bg-white border-surface-300 dark:bg-surface-800 dark:border-surface-600" />
              <span className="text-sm">دودندان</span>
            </label>
          </div>
        ) : (
          <div className="flex gap-2">
            {product.hasLamb && <span className="px-2 py-1 bg-surface-100 text-surface-600 rounded-md text-xs dark:bg-surface-800 dark:text-surface-400">بره</span>}
            {product.hasTwoTeeth && <span className="px-2 py-1 bg-surface-100 text-surface-600 rounded-md text-xs dark:bg-surface-800 dark:text-surface-400">دودندان</span>}
            {!product.hasLamb && !product.hasTwoTeeth && <span className="px-2 py-1 bg-surface-50 text-surface-400 rounded-md text-xs dark:bg-surface-800/50">هیچکدام</span>}
          </div>
        )}
      </td>
      <td className="px-6 py-4">
        {isEditing ? (
          <div className="space-y-1.5 min-w-[150px]">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                inputMode="numeric"
                value={editForm.crmProductIndex}
                onChange={e => setEditForm({ ...editForm, crmProductIndex: e.target.value })}
                className={cn(
                  "w-full px-3 py-1.5 rounded-lg border bg-white dark:bg-surface-800 dark:text-white focus:outline-none focus:ring-2 font-mono text-sm text-left",
                  editError ? "border-rose-400 focus:ring-rose-200" : "border-surface-200 dark:border-surface-700 focus:ring-primary/20"
                )}
                placeholder="اختیاری (مثلاً 46)"
                dir="ltr"
              />
              {editForm.crmProductIndex !== '' && (
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, crmProductIndex: '' })}
                  className="p-1.5 text-surface-400 hover:text-rose-500 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800"
                  title="حذف شاخص CRM"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {editError && (
              <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 leading-snug">{editError}</p>
            )}
          </div>
        ) : product.crmProductIndex ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50" dir="ltr">
            <Link2 className="w-3.5 h-3.5" />
            #{product.crmProductIndex}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400">
            <Unlink className="w-3 h-3" />
            ثبت نشده
          </span>
        )}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-2">
          {isEditing ? (
            <>
              <button onClick={() => saveEdit(product.id)} className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200" title="ذخیره"><Save className="w-4 h-4" /></button>
              <button onClick={() => setEditingId(null)} className="p-1.5 bg-surface-200 text-surface-700 rounded-lg hover:bg-surface-300 dark:bg-surface-700 dark:text-surface-300" title="انصراف"><X className="w-4 h-4" /></button>
            </>
          ) : (
            <>
              <button onClick={() => startEdit(product)} className="p-1.5 bg-surface-100 text-surface-600 rounded-lg hover:bg-surface-200 hover:text-primary transition-colors dark:bg-surface-800 dark:text-surface-400 dark:hover:text-primary" title="ویرایش"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => toggleVisibility(product.id)} className="p-1.5 bg-surface-100 text-surface-600 rounded-lg hover:bg-surface-200 transition-colors dark:bg-surface-800 dark:text-surface-400" title={product.isActive ? "پنهان کردن" : "نمایش دادن"}>{product.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</button>
              <button onClick={() => removeProduct(product.id)} className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors dark:bg-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-900/50" title="حذف"><Trash2 className="w-4 h-4" /></button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

export function Products() {

  const { categories, products } = useDB();
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  const [newProductName, setNewProductName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newHasLamb, setNewHasLamb] = useState(true);
  const [newHasTwoTeeth, setNewHasTwoTeeth] = useState(true);
  const [newFontSize, setNewFontSize] = useState<number | null>(null);
  const [newCrmIndex, setNewCrmIndex] = useState('');
  const [addFormError, setAddFormError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [crmFilter, setCrmFilter] = useState<'all' | 'connected' | 'unconnected'>('all');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ 
    name: string, 
    categoryId: string, 
    hasLamb: boolean, 
    hasTwoTeeth: boolean,
    fontSize: number | null,
    crmProductIndex: string
  }>({ name: '', categoryId: '', hasLamb: true, hasTwoTeeth: true, fontSize: null, crmProductIndex: '' });
  const [editError, setEditError] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const validateCrmIndexUniqueness = (rawVal: string, excludeProductId?: string): { ok: boolean; value: number | null; error?: string } => {
    const parsed = parseCrmIndexInput(rawVal);
    if (!parsed.valid) {
      return { ok: false, value: null, error: parsed.error };
    }
    if (parsed.value !== null) {
      const conflict = products.find(p => p.crmProductIndex === parsed.value && p.id !== excludeProductId);
      if (conflict) {
        return {
          ok: false,
          value: null,
          error: `این شاخص CRM قبلاً برای محصول ${conflict.name} ثبت شده است. لطفاً شاخص دیگری وارد کنید.`
        };
      }
    }
    return { ok: true, value: parsed.value };
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddFormError(null);
    if (!newProductName.trim() || !selectedCategory) return;

    const crmCheck = validateCrmIndexUniqueness(newCrmIndex);
    if (!crmCheck.ok) {
      setAddFormError(crmCheck.error || 'شاخص CRM نامعتبر است.');
      showToast(crmCheck.error || 'شاخص CRM نامعتبر است.', 'error');
      return;
    }

    try {
      await db.addProduct(selectedCategory, newProductName.trim(), newHasLamb, newHasTwoTeeth, newFontSize, crmCheck.value);
      setNewProductName('');
      setNewHasLamb(true);
      setNewHasTwoTeeth(true);
      setNewFontSize(null);
      setNewCrmIndex('');
      setAddFormError(null);
      showToast('محصول جدید با موفقیت اضافه شد.');
    } catch (error: any) {
      const msg = error?.message || 'خطا در افزودن محصول.';
      setAddFormError(msg);
      showToast(msg, 'error');
    }
  };

  const toggleVisibility = async (id: string) => {
    try {
      await db.toggleProductActive(id);
      showToast('وضعیت نمایش محصول تغییر کرد.');
    } catch (error) {
      showToast('خطا در تغییر وضعیت محصول.', 'error');
    }
  };

  const removeProduct = async (id: string) => {
    if (confirm('آیا از حذف این محصول اطمینان دارید؟')) {
      try {
        await db.removeProduct(id);
        showToast('محصول با موفقیت حذف شد.');
      } catch (error) {
        showToast('خطا در حذف محصول.', 'error');
      }
    }
  };

  const startEdit = (p: any) => {
    setEditingId(p.id);
    setEditError(null);
    setEditForm({ 
      name: p.name, 
      categoryId: p.categoryId, 
      hasLamb: p.hasLamb ?? true, 
      hasTwoTeeth: p.hasTwoTeeth ?? true,
      fontSize: p.fontSize ?? null,
      crmProductIndex: p.crmProductIndex != null ? String(p.crmProductIndex) : ''
    });
  };

  const saveEdit = async (id: string) => {
    setEditError(null);
    if (!editForm.name.trim() || !editForm.categoryId) return;

    const crmCheck = validateCrmIndexUniqueness(editForm.crmProductIndex, id);
    if (!crmCheck.ok) {
      setEditError(crmCheck.error || 'شاخص CRM نامعتبر است.');
      showToast(crmCheck.error || 'شاخص CRM نامعتبر است.', 'error');
      return;
    }

    try {
      await db.updateProduct(id, editForm.name.trim(), editForm.categoryId, editForm.hasLamb, editForm.hasTwoTeeth, editForm.fontSize, crmCheck.value);
      showToast('محصول با موفقیت ویرایش شد.');
      setEditError(null);
      setEditingId(null);
    } catch (error: any) {
      const msg = error?.message || 'خطا در ویرایش محصول.';
      setEditError(msg);
      showToast(msg, 'error');
    }
  };

  const getNestedCategories = (parentId: string | null, depth = 0): (Category & { depth: number })[] => {
    let result: (Category & { depth: number })[] = [];
    const children = categories.filter(c => c.parentId === parentId);
    for (const child of children) {
      result.push({ ...child, depth });
      result = result.concat(getNestedCategories(child.id, depth + 1));
    }
    return result;
  };
  const orderedCategories = getNestedCategories(null);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = products.findIndex(p => p.id === active.id);
      const newIndex = products.findIndex(p => p.id === over.id);
      const newProducts = arrayMove<any>(products, oldIndex, newIndex);
      const updates = newProducts.map((p, idx) => ({ id: p.id, sortOrder: idx + 1 }));
      try {
        await db.reorderProducts(updates);
      } catch (e) {
        showToast('خطا در تغییر چیدمان', 'error');
      }
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (crmFilter === 'connected' && !p.crmProductIndex) return false;
      if (crmFilter === 'unconnected' && p.crmProductIndex) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim();
      return (
        p.name.includes(q) ||
        (p.crmProductIndex != null && String(p.crmProductIndex).includes(q)) ||
        categories.find(c => c.id === p.categoryId)?.name.includes(q)
      );
    });
  }, [products, searchQuery, crmFilter, categories]);

  const isFilterActive = searchQuery.trim().length > 0 || crmFilter !== 'all';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-surface-900 dark:text-white">مدیریت اقلام</h2>
          <p className="text-surface-600 dark:text-surface-400 mt-1">افزودن، ویرایش، حذف اقلام و تعیین شاخص محصول در CRM.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
          <select
            value={crmFilter}
            onChange={(e) => setCrmFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-surface-200 bg-white dark:bg-surface-800 dark:border-surface-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">همه اقلام ({products.length})</option>
            <option value="connected">متصل به CRM ({products.filter(p => p.crmProductIndex != null).length})</option>
            <option value="unconnected">بدون شاخص CRM ({products.filter(p => p.crmProductIndex == null).length})</option>
          </select>
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="جستجو در نام یا شاخص CRM..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-surface-200 bg-white dark:bg-surface-800 dark:border-surface-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <Search className="w-5 h-5 text-surface-400 absolute left-3 top-2.5" />
          </div>
        </div>
      </div>

      {toast && (
        <div className={cn(
          "p-4 rounded-xl flex items-center gap-3 border shadow-sm transition-all",
          toast.type === 'success' ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-300" : "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-300"
        )}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {/* Add New Product */}
      <form onSubmit={handleAddProduct} className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-6 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-end">
          <div className="flex-1 w-full space-y-1.5">
            <label className="text-sm font-medium text-surface-700 dark:text-surface-300">نام قلم جدید</label>
            <input
              type="text"
              value={newProductName}
              onChange={e => setNewProductName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 dark:bg-surface-800 dark:border-surface-700 dark:text-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="مثال: ران ممتاز..."
              required
            />
          </div>
          <div className="w-full lg:w-44 space-y-1.5">
            <label className="text-sm font-medium text-surface-700 dark:text-surface-300">دسته‌بندی</label>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 dark:bg-surface-800 dark:border-surface-700 dark:text-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            >
              <option value="">انتخاب دسته</option>
              {orderedCategories.map(c => (
                <option key={c.id} value={c.id}>{'\u00A0\u00A0'.repeat(c.depth)}{c.name}</option>
              ))}
            </select>
          </div>
          <div className="w-full lg:w-44 space-y-1.5">
            <label className="text-sm font-medium text-surface-700 dark:text-surface-300 flex items-center gap-1">
              <Link2 className="w-3.5 h-3.5 text-primary" />
              شاخص محصول در CRM
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={newCrmIndex}
              onChange={e => {
                setNewCrmIndex(e.target.value);
                if (addFormError) setAddFormError(null);
              }}
              className={cn(
                "w-full px-3.5 py-2.5 rounded-xl border bg-surface-50 dark:bg-surface-800 dark:text-white focus:bg-white focus:outline-none focus:ring-2 font-mono text-sm text-left",
                addFormError ? "border-rose-400 focus:ring-rose-200" : "border-surface-200 dark:border-surface-700 focus:ring-primary/20"
              )}
              placeholder="اختیاری (مثلاً 46)"
              dir="ltr"
            />
          </div>
          <div className="w-full lg:w-36 space-y-1.5">
            <label className="text-sm font-medium text-surface-700 dark:text-surface-300 flex items-center gap-1">
              <Type className="w-3.5 h-3.5 text-primary" />
              سایز فونت
            </label>
            <select
              value={newFontSize === null ? '' : newFontSize}
              onChange={e => setNewFontSize(e.target.value === '' ? null : Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border border-surface-200 bg-surface-50 dark:bg-surface-800 dark:border-surface-700 dark:text-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
            >
              <option value="">خودکار</option>
              <option value="11">کوچک (11px)</option>
              <option value="12">12px</option>
              <option value="13">استاندارد (13px)</option>
              <option value="14">14px</option>
              <option value="15">بزرگ (15px)</option>
              <option value="16">16px</option>
              <option value="18">خیلی بزرگ (18px)</option>
              <option value="20">20px</option>
            </select>
          </div>
          <div className="flex gap-4 items-center h-[46px] px-2 w-full lg:w-auto">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={newHasLamb} onChange={e => setNewHasLamb(e.target.checked)} className="w-4 h-4 rounded text-primary focus:ring-primary/20 bg-white border-surface-300 dark:border-surface-600 dark:bg-surface-800" />
              <span className="text-sm font-medium text-surface-700 dark:text-surface-300 whitespace-nowrap">قیمت بره</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={newHasTwoTeeth} onChange={e => setNewHasTwoTeeth(e.target.checked)} className="w-4 h-4 rounded text-primary focus:ring-primary/20 bg-white border-surface-300 dark:border-surface-600 dark:bg-surface-800" />
              <span className="text-sm font-medium text-surface-700 dark:text-surface-300 whitespace-nowrap">قیمت دودندان</span>
            </label>
          </div>
          <button
            type="submit"
            className="w-full lg:w-auto px-6 h-[46px] bg-primary text-white rounded-xl font-medium hover:bg-primary-hover flex items-center justify-center gap-2 transition-colors shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span>افزودن</span>
          </button>
        </div>

        {addFormError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{addFormError}</span>
          </div>
        )}
      </form>

      {/* Products List */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <table className="w-full text-right text-sm">
              <thead className="bg-surface-50 dark:bg-surface-800/50 text-surface-600 dark:text-surface-400 border-b border-surface-200 dark:border-surface-800">
                <tr>
                  <th className="pl-2 pr-6 py-4 w-10"></th>
                  <th className="px-6 py-4 font-medium">نام قلم</th>
                  <th className="px-6 py-4 font-medium">دسته‌بندی</th>
                  <th className="px-6 py-4 font-medium">پیکربندی ستون‌ها</th>
                  <th className="px-6 py-4 font-medium">شاخص CRM</th>
                  <th className="px-6 py-4 font-medium text-left">عملیات</th>
                </tr>
              </thead>
              
              <SortableContext items={filteredProducts.map(p => p.id)} strategy={verticalListSortingStrategy}>
                <tbody className="divide-y divide-surface-200 dark:divide-surface-800">
                  {filteredProducts.map(product => {
                    const category = categories.find(c => c.id === product.categoryId);
                    return (
                      <SortableRow 
                        key={product.id} 
                        product={product} 
                        category={category} 
                        isEditing={editingId === product.id} 
                        editForm={editForm} 
                        setEditForm={setEditForm} 
                        editError={editingId === product.id ? editError : null}
                        saveEdit={saveEdit} 
                        startEdit={startEdit} 
                        toggleVisibility={toggleVisibility} 
                        removeProduct={removeProduct} 
                        setEditingId={setEditingId} 
                        orderedCategories={orderedCategories}
                        isFilterActive={isFilterActive}
                      />
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-surface-500">
                        هیچ موردی یافت نشد.
                      </td>
                    </tr>
                  )}
                </tbody>
              </SortableContext>
            </table>
          </DndContext>
        </div>
      </div>
    </div>
  );
}
