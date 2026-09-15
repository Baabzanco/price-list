const fs = require('fs');

let content = fs.readFileSync('src/pages/admin/Products.tsx', 'utf8');

// Add imports
content = content.replace(
  "import { CheckCircle2, Eye, EyeOff, Plus, Trash2, Search, Edit2, Save, X } from 'lucide-react';",
  "import { CheckCircle2, Eye, EyeOff, Plus, Trash2, Search, Edit2, Save, X, GripVertical } from 'lucide-react';\nimport { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';\nimport { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';\nimport { CSS } from '@dnd-kit/utilities';"
);

// Create SortableRow component above Products
const sortableRowCode = `
function SortableRow({ product, category, isEditing, editForm, setEditForm, saveEdit, startEdit, toggleVisibility, removeProduct, setEditingId, orderedCategories, isSearchActive }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 1 : 0, position: isDragging ? 'relative' as const : undefined };
  return (
    <tr ref={setNodeRef} style={style} className={\`hover:bg-surface-50/50 dark:hover:bg-surface-800/50 transition-colors \${isDragging ? 'bg-surface-100 dark:bg-surface-800 shadow-lg' : ''}\`}>
      <td className="pl-2 pr-6 py-4 w-10">
        {!isEditing && !isSearchActive && (
          <div {...attributes} {...listeners} className="cursor-grab text-surface-400 hover:text-surface-600 dark:hover:text-surface-300">
            <GripVertical className="w-4 h-4" />
          </div>
        )}
      </td>
      <td className="px-6 py-4">
        {isEditing ? (
          <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-3 py-1.5 rounded-lg border border-surface-200 bg-white dark:bg-surface-800 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary/20" />
        ) : (
          <span className="font-medium text-surface-900 dark:text-white">{product.name}</span>
        )}
      </td>
      <td className="px-6 py-4">
        {isEditing ? (
          <select value={editForm.categoryId} onChange={e => setEditForm({ ...editForm, categoryId: e.target.value })} className="w-full px-3 py-1.5 rounded-lg border border-surface-200 bg-white dark:bg-surface-800 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary/20">
            {orderedCategories.map((c: any) => <option key={c.id} value={c.id}>{'\u00A0\u00A0'.repeat(c.depth)}{c.name}</option>)}
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
`;
content = content.replace('export function Products() {', sortableRowCode);

// Add sensors and drag end handler
const dndHooks = `  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = products.findIndex(p => p.id === active.id);
      const newIndex = products.findIndex(p => p.id === over.id);
      const newProducts = arrayMove(products, oldIndex, newIndex);
      const updates = newProducts.map((p, idx) => ({ id: p.id, sortOrder: idx + 1 }));
      try {
        await db.reorderProducts(updates);
      } catch (e) {
        showToast('خطا در تغییر چیدمان', 'error');
      }
    }
  };

  const filteredProducts =`;

content = content.replace('  const filteredProducts =', dndHooks);

// Replace table header to add grip column
content = content.replace(
  '<th className="px-6 py-4 font-medium">نام قلم</th>',
  '<th className="pl-2 pr-6 py-4 w-10"></th>\n                <th className="px-6 py-4 font-medium">نام قلم</th>'
);

// Replace tbody rendering
const oldTbodyStart = '<tbody className="divide-y divide-surface-200 dark:divide-surface-800">';
const oldTbodyEnd = '</tbody>';

// regex to replace tbody contents entirely
content = content.replace(
  /<tbody className="divide-y divide-surface-200 dark:divide-surface-800">([\s\S]*?)<\/tbody>/,
  `
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
                        saveEdit={saveEdit} 
                        startEdit={startEdit} 
                        toggleVisibility={toggleVisibility} 
                        removeProduct={removeProduct} 
                        setEditingId={setEditingId} 
                        orderedCategories={orderedCategories}
                        isSearchActive={searchQuery.trim().length > 0}
                      />
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-surface-500">
                        هیچ موردی یافت نشد.
                      </td>
                    </tr>
                  )}
                </tbody>
              </SortableContext>
            </DndContext>
  `
);

fs.writeFileSync('src/pages/admin/Products.tsx', content);
