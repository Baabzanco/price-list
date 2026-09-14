import { useState } from 'react';
import { useDB } from '../../lib/useDB';
import { formatPersianDate, formatNumber, cn } from '../../lib/utils';
import { ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react';

export function History() {
  const { history, products, categories } = useDB();
  const [filter, setFilter] = useState('all');

  const now = new Date();
  
  const filteredHistory = history.filter(h => {
    if (filter === 'all') return true;
    
    const hDate = new Date(h.changedAt);
    const diffTime = Math.abs(now.getTime() - hDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (filter === 'today') return diffDays <= 1;
    if (filter === '7days') return diffDays <= 7;
    if (filter === '30days') return diffDays <= 30;
    
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-surface-900 dark:text-white">تاریخچه تغییرات قیمت</h2>
          <p className="text-surface-600 dark:text-surface-400 mt-1">رهگیری دقیق تمام تغییرات قیمت اعمال شده در سیستم.</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-surface-500 dark:text-surface-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">همه زمان‌ها</option>
            <option value="today">امروز</option>
            <option value="7days">۷ روز گذشته</option>
            <option value="30days">۳۰ روز گذشته</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-surface-50 dark:bg-surface-800/50 text-surface-600 dark:text-surface-400 border-b border-surface-200 dark:border-surface-800">
              <tr>
                <th className="px-6 py-4 font-medium">نام کالا</th>
                <th className="px-6 py-4 font-medium">دسته‌بندی</th>
                <th className="px-6 py-4 font-medium">نوع گوشت</th>
                <th className="px-6 py-4 font-medium">قیمت قبلی</th>
                <th className="px-6 py-4 font-medium">قیمت جدید</th>
                <th className="px-6 py-4 font-medium">درصد تغییر</th>
                <th className="px-6 py-4 font-medium">تاریخ و زمان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-surface-500 dark:text-surface-400">
                    رکوردی برای نمایش وجود ندارد.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((change) => {
                  const product = products.find(p => p.id === change.productId);
                  const category = categories.find(c => c.id === product?.categoryId);
                  
                  const diff = (change.newPrice || 0) - (change.oldPrice || 0);
                  const percent = change.oldPrice ? (diff / change.oldPrice) * 100 : 0;
                  const isUp = diff > 0;

                  return (
                    <tr key={change.id} className="hover:bg-surface-50/50 dark:hover:bg-surface-800/50">
                      <td className="px-6 py-4 font-medium text-surface-900 dark:text-white">{product?.name || 'نامشخص'}</td>
                      <td className="px-6 py-4 text-surface-600 dark:text-surface-400">{category?.name || 'نامشخص'}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-md bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 text-xs font-medium">
                          {change.priceType === 'lamb' ? 'بره' : 'دو دندان'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-surface-500 dark:text-surface-500 line-through decoration-surface-300 dark:decoration-surface-600">
                        {formatNumber(change.oldPrice)}
                      </td>
                      <td className="px-6 py-4 font-bold text-surface-900 dark:text-white">
                        {formatNumber(change.newPrice)}
                      </td>
                      <td className="px-6 py-4">
                        {diff !== 0 ? (
                          <div className={cn(
                            "flex items-center gap-1 font-bold",
                            isUp ? "text-rose-600" : "text-emerald-600"
                          )}>
                            {isUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                            <span dir="ltr">{Math.abs(percent).toFixed(1)}%</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-6 py-4 text-surface-500 font-medium">
                        {formatPersianDate(change.changedAt, true)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
