import { useDB } from '../../lib/useDB';
import { formatNumber, formatPersianDate } from '../../lib/utils';
import { Printer, Download, LogIn, Image as ImageIcon, Loader2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '../../components/ThemeToggle';
import { toPng } from 'html-to-image';

export function PriceList() {
  const { categories, products, settings } = useDB();
  const printRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPNG, setIsGeneratingPNG] = useState(false);
  const [isExportMode, setIsExportMode] = useState(false);
  
  useEffect(() => {
    document.title = settings.title || 'لیست قیمت';
  }, [settings.title]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPNG = async () => {
    if (!printRef.current) return;
    setIsGeneratingPNG(true);
    setIsExportMode(true);
    
    setTimeout(async () => {
      try {
        const el = printRef.current;
        if (!el) return;
        
        const width = 794; // A4 pixel width at 96 DPI
        const height = Math.max(1123, el.scrollHeight);

        const dataUrl = await toPng(el, {
          quality: 1.0,
          pixelRatio: 2,
          width: width,
          height: height,
          style: {
            width: `${width}px`,
            maxWidth: `${width}px`,
            height: `${height}px`,
            minHeight: `${height}px`,
            margin: '0',
            transform: 'none',
          },
          backgroundColor: document.documentElement.classList.contains('dark') ? '#124A57' : '#ffffff',
        });
        
        const link = document.createElement('a');
        link.download = `price_list_${new Date().toISOString().split('T')[0]}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error('Error generating PNG:', err);
        alert('خطا در ایجاد تصویر. لطفا دوباره تلاش کنید.');
      } finally {
        setIsExportMode(false);
        setIsGeneratingPNG(false);
      }
    }, 150);
  };
  
  // Filter out inactive categories first
  const activeCategories = categories.filter(c => c.isActive);

  return (
    <div className="min-h-screen bg-surface-100 dark:bg-[#124A57] flex flex-col print-bg transition-colors">
      {/* Floating Action Bar (Not visible in Print) */}
      <div className="no-print bg-white dark:bg-black/20 border-b border-surface-200 dark:border-white/10 shadow-sm sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="font-bold text-lg text-surface-900 dark:text-white flex items-center gap-4">
            <span>{settings.title} - {settings.companyName}</span>
            <Link to="/admin" className="flex items-center gap-1.5 text-sm bg-surface-100 hover:bg-surface-200 dark:bg-black/20 dark:hover:bg-black/30 dark:text-white text-surface-700 px-3 py-1.5 rounded-lg transition-colors border dark:border-white/10">
              <LogIn className="w-4 h-4" />
              پنل مدیریت
            </Link>
          </h1>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={handleDownloadPNG}
              disabled={isGeneratingPNG}
              className="flex items-center gap-2 bg-white dark:bg-black/20 text-surface-700 dark:text-white border border-surface-200 dark:border-white/10 px-4 py-2 rounded-lg hover:bg-surface-50 dark:hover:bg-black/30 shadow-sm font-medium transition-colors hidden sm:flex disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingPNG ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
              {isGeneratingPNG ? 'در حال آماده‌سازی...' : 'تصویر'}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-hover shadow-sm font-medium transition-colors"
            >
              <Printer className="w-4 h-4" />
              چاپ (A4)
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-white dark:bg-black/20 text-surface-700 dark:text-white border border-surface-200 dark:border-white/10 px-4 py-2 rounded-lg hover:bg-surface-50 dark:hover:bg-black/30 shadow-sm font-medium transition-colors hidden md:flex"
            >
              <Download className="w-4 h-4" />
              دانلود PDF
            </button>
          </div>
        </div>
      </div>

      {/* A4 Print Container */}
      <div className="flex-1 py-8 px-4 flex justify-center no-print-padding overflow-x-auto">
        <div 
          ref={printRef}
          className={`print-container bg-white dark:bg-[#124A57] shadow-xl mx-auto relative text-black dark:text-white flex flex-col ${
            isExportMode ? 'w-[794px] min-w-[794px] min-h-[1123px]' : 'max-w-[210mm] w-full min-h-[280mm]'
          }`}
          style={{ padding: '10mm 15mm' }}
        >
          {/* Header */}
          <header className="flex-none mb-4 flex justify-between items-end pb-4 border-b-2 border-[#124A57] dark:border-white/20">
            <div className="flex items-center gap-4">
              {/* Logos */}
              {settings.logoLightUrl && (
                <img src={settings.logoLightUrl} alt="Logo" className="w-16 h-16 object-contain block dark:hidden" />
              )}
              {settings.logoDarkUrl && (
                <img src={settings.logoDarkUrl} alt="Logo" className="w-16 h-16 object-contain hidden dark:block" />
              )}
              <div className="text-right flex flex-col">
                <h1 className="text-2xl font-black text-[#124A57] dark:text-white leading-tight">
                  {settings.title}
                  <span className="text-3xl text-[#CD78B3] dark:text-[#d85c96] block mt-1">{settings.companyName}</span>
                </h1>
                {settings.subtitle && (
                  <p className="text-sm font-bold text-gray-600 dark:text-gray-300 mt-2">
                    {settings.subtitle}
                  </p>
                )}
              </div>
            </div>

            <div className="text-left flex items-center gap-2 bg-gray-50 dark:bg-white/10 px-5 py-2.5 rounded-xl border border-gray-100 dark:border-transparent">
              <span className="text-lg font-bold text-gray-500 dark:text-gray-300">تاریخ:</span>
              <span className="text-2xl font-black text-[#124A57] dark:text-white tracking-wide" dir="ltr">
                {formatPersianDate(settings.lastUpdated || new Date().toISOString()).split(' ')[0]}
              </span>
            </div>
          </header>

          {/* Tables in 2 Columns - Stretches to fill available height */}
          <div className={`flex-1 print-grid grid gap-x-6 gap-y-4 items-stretch min-h-0 ${
            isExportMode ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2'
          }`}>
            
            {/* Column 1 (Right Side in Persian RTL): Gousfandi, Raste, Khoreshti */}
            <div className="flex flex-col h-full border-[3px] border-[#CD78B3] dark:border-[#d85c96] rounded-xl overflow-hidden shadow-sm bg-white">
              <table className="w-full h-full text-center text-[13px] font-medium bg-white">
                <thead>
                  <tr className="bg-[#124A57] text-white">
                    <th colSpan={3} className="py-2.5 px-2 font-black text-xl">اقلام گوسفندی</th>
                  </tr>
                  <tr className="bg-[#CD78B3] dark:bg-[#d85c96] text-white">
                    <th className="py-1.5 px-3 font-bold w-[50%] text-right border-l border-white/30">نام کالا</th>
                    <th className="py-1.5 px-1 font-bold w-[25%] border-l border-white/30 text-center">بره</th>
                    <th className="py-1.5 px-1 font-bold w-[25%] text-center">دودندان</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {activeCategories.filter(c => ['cat_1', 'cat_2', 'cat_3'].includes(c.id)).map(category => {
                    const categoryProducts = products.filter(p => p.categoryId === category.id && p.isActive);
                    if (categoryProducts.length === 0) return null;

                    return (
                      <React.Fragment key={category.id}>
                        <tr className="bg-gray-100 dark:bg-gray-200">
                          <td colSpan={3} className="py-1.5 px-3 font-black text-right text-[#124A57] text-[14px]">
                            {category.name}
                          </td>
                        </tr>
                        {categoryProducts.map((product) => (
                          <tr key={product.id} className="text-black">
                            <td className="py-1 px-3 font-bold text-right border-l border-gray-300">
                              {product.name}
                            </td>
                            <td className="py-1 px-1 font-bold border-l border-gray-300 text-center">
                              {product.priceLamb ? formatNumber(product.priceLamb) : '-'}
                            </td>
                            <td className="py-1 px-1 font-bold text-center">
                              {product.priceTwoTeeth ? formatNumber(product.priceTwoTeeth) : '-'}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Column 2 (Left Side in Persian RTL): Gousale and Morgh */}
            <div className="flex flex-col h-full border-[3px] border-[#CD78B3] dark:border-[#d85c96] rounded-xl overflow-hidden shadow-sm bg-white">
              <table className="w-full h-full text-center text-[13px] font-medium bg-white">
                <tbody className="divide-y divide-gray-300">
                  {activeCategories.filter(c => !['cat_1', 'cat_2', 'cat_3'].includes(c.id)).map(category => {
                    const categoryProducts = products.filter(p => p.categoryId === category.id && p.isActive);
                    if (categoryProducts.length === 0) return null;

                    return (
                      <React.Fragment key={category.id}>
                        <tr className="bg-[#124A57] text-white">
                          <td colSpan={2} className="py-2.5 px-2 font-black text-xl text-center">
                            {category.name}
                          </td>
                        </tr>
                        {categoryProducts.map((product) => (
                          <tr key={product.id} className="text-black">
                            <td className="py-1 px-3 font-bold text-right border-l border-gray-300 w-[65%]">
                              {product.name}
                            </td>
                            <td className="py-1 px-2 font-bold text-center w-[35%] text-lg text-[#CD78B3]">
                              {formatNumber(product.priceLamb || product.priceTwoTeeth)}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>

          {/* Footer */}
          <footer className="flex-none mt-6 pt-4 border-t-2 border-[#124A57] dark:border-white/20 flex justify-between items-center text-lg font-bold page-break-avoid text-[#124A57] dark:text-white">
            <div className="flex items-center bg-gray-50 dark:bg-white/10 px-5 py-2.5 rounded-xl border border-gray-100 dark:border-transparent">
              پاسخگویی از ساعت <span className="mr-2 text-[#CD78B3] dark:text-[#d85c96] tracking-wide">{settings.hours}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl">تماس با خط ویژه:</span>
              <span dir="ltr" className="text-2xl font-black text-[#CD78B3] dark:text-[#d85c96] tracking-widest bg-gray-50 dark:bg-white/10 px-5 py-2.5 rounded-xl border border-gray-100 dark:border-transparent">
                {settings.phone}
              </span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
