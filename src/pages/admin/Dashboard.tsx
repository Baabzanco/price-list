import { useDB } from '../../lib/useDB';
import { formatPersianDate, formatNumber } from '../../lib/utils';
import { Layers, Package, TrendingUp, Clock, ArrowUpRight, ArrowDownRight, Edit3, Printer } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const { stats, history, products, categories } = useDB();

  const recentChanges = history.slice(0, 5).map(h => {
    const product = products.find(p => p.id === h.productId);
    const category = categories.find(c => c.id === product?.categoryId);
    const difference = (h.newPrice || 0) - (h.oldPrice || 0);
    const percentChange = h.oldPrice ? (difference / h.oldPrice) * 100 : 0;

    return {
      ...h,
      productName: product?.name || 'نامشخص',
      categoryName: category?.name || 'نامشخص',
      difference,
      percentChange,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-surface-900 dark:text-white">خلاصه وضعیت</h2>
          <p className="text-surface-600 dark:text-surface-400 mt-1">آخرین بروزرسانی: {formatPersianDate(stats.lastUpdated, true)}</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/admin/prices"
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl hover:bg-primary-hover transition-colors shadow-sm font-medium"
          >
            <Edit3 className="w-4 h-4" />
            ویرایش قیمت‌ها
          </Link>
          <Link
            to="/price-list"
            className="flex items-center gap-2 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-200 border border-surface-200 dark:border-surface-700 px-4 py-2 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors shadow-sm font-medium"
          >
            <Printer className="w-4 h-4" />
            چاپ لیست
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="اقلام فعال" 
          value={stats.activeProducts} 
          icon={Package} 
          color="text-blue-600" 
          bg="bg-blue-50" 
        />
        <StatCard 
          title="دسته‌بندی‌ها" 
          value={stats.categoriesCount} 
          icon={Layers} 
          color="text-purple-600" 
          bg="bg-purple-50" 
        />
        <StatCard 
          title="تغییرات امروز" 
          value={stats.changesToday} 
          icon={TrendingUp} 
          color="text-secondary" 
          bg="bg-pink-50" 
        />
        <StatCard 
          title="آخرین ویرایش" 
          value={stats.lastUpdated ? formatPersianDate(stats.lastUpdated) : '—'} 
          icon={Clock} 
          color="text-amber-600" 
          bg="bg-amber-50" 
          valueClassName="text-lg"
        />
      </div>

      <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-800 flex justify-between items-center">
          <h3 className="font-bold text-lg text-surface-900 dark:text-white">آخرین تغییرات قیمت</h3>
          <Link to="/admin/history" className="text-sm text-primary dark:text-primary-hover hover:underline font-medium">
            مشاهده همه
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-surface-50 dark:bg-surface-800/50 text-surface-600 dark:text-surface-400 border-b border-surface-200 dark:border-surface-800">
              <tr>
                <th className="px-6 py-3 font-medium">نام کالا</th>
                <th className="px-6 py-3 font-medium">دسته‌بندی</th>
                <th className="px-6 py-3 font-medium">نوع</th>
                <th className="px-6 py-3 font-medium">قیمت قبلی</th>
                <th className="px-6 py-3 font-medium">قیمت جدید</th>
                <th className="px-6 py-3 font-medium">تغییر</th>
                <th className="px-6 py-3 font-medium">تاریخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
              {recentChanges.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-surface-500 dark:text-surface-400">
                    هیچ تغییر قیمتی ثبت نشده است.
                  </td>
                </tr>
              ) : (
                recentChanges.map((change) => (
                  <tr key={change.id} className="hover:bg-surface-50/50 dark:hover:bg-surface-800/50">
                    <td className="px-6 py-4 font-medium text-surface-900 dark:text-white">{change.productName}</td>
                    <td className="px-6 py-4 text-surface-600 dark:text-surface-400">{change.categoryName}</td>
                    <td className="px-6 py-4 text-surface-600 dark:text-surface-400">
                      {change.priceType === 'lamb' ? 'بره' : 'دو دندان'}
                    </td>
                    <td className="px-6 py-4 text-surface-500 dark:text-surface-500">{formatNumber(change.oldPrice)}</td>
                    <td className="px-6 py-4 font-bold text-surface-900 dark:text-white">{formatNumber(change.newPrice)}</td>
                    <td className="px-6 py-4">
                      {change.difference !== 0 && (
                        <div className={`flex items-center gap-1 font-medium ${change.difference > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {change.difference > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                          <span dir="ltr">{Math.abs(change.percentChange).toFixed(1)}%</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-surface-500">{formatPersianDate(change.changedAt, true)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, bg, valueClassName = "text-3xl" }: any) {
  return (
    <div className="bg-white dark:bg-surface-900 p-6 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm flex items-start gap-4">
      <div className={`p-3 rounded-xl ${bg} ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-surface-500 dark:text-surface-400 text-sm font-medium">{title}</p>
        <p className={`font-bold text-surface-900 dark:text-white mt-1 ${valueClassName}`}>{typeof value === 'number' ? formatNumber(value) : value}</p>
      </div>
    </div>
  );
}
