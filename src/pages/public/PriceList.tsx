import React, { useRef, useState } from 'react';
import { useDB } from '../../lib/useDB';
import { Category } from '../../lib/db';
import { formatPersianDate } from '../../lib/utils';
import { Printer, Loader2, LogIn, ImageIcon, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '../../components/ThemeToggle';
import { toPng } from 'html-to-image';
import { formatNumber } from '../../lib/utils';

export function PriceList() {
  const { categories, products, settings } = useDB();
  const printRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPNG, setIsGeneratingPNG] = useState(false);
  const [isExportMode, setIsExportMode] = useState(false);

  const activeCategories = categories.filter(c => c.isActive);

  // Split root categories.
  // We put specific root categories in Col 1, and the rest in Col 2.
  const rootCategories = activeCategories.filter(c => !c.parentId);
  const col1RootCategories = rootCategories.filter(c => ['cat_1', 'cat_2', 'cat_3'].includes(c.id));
  const col2RootCategories = rootCategories.filter(c => !['cat_1', 'cat_2', 'cat_3'].includes(c.id));

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPNG = async () => {
    if (!printRef.current) return;
    try {
      setIsGeneratingPNG(true);
      setIsExportMode(true);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const dataUrl = await toPng(printRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#124A57' : '#ffffff',
        style: {
          transform: 'none',
        }
      });
      
      const link = document.createElement('a');
      link.download = `لیست-قیمت-${new Date().toLocaleDateString('fa-IR')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setIsExportMode(false);
      setIsGeneratingPNG(false);
    }
  };

  const getFitTextClass = (name: string) => {
    if (name.length > 25) return 'text-[11.5px] leading-tight whitespace-normal break-words';
    if (name.length > 18) return 'text-[12px] leading-snug whitespace-normal break-words';
    return 'text-[13px] whitespace-normal';
  };

  const renderCategoryRecursive = (
    category: Category, 
    colIndex: number, 
    depth: number
  ): React.ReactNode => {
    const categoryProducts = products.filter(p => p.categoryId === category.id && p.isActive);
    const children = activeCategories.filter(c => c.parentId === category.id);
    
    // If no products and no children, don't render this category at all.
    if (categoryProducts.length === 0 && children.length === 0) return null;

    let headerRow = null;
    
    if (colIndex === 1) {
      // Column 1 style
      if (depth === 0) {
        headerRow = (
          <tr className="bg-[#124A57] text-white">
            <td colSpan={3} className="py-2.5 px-2 font-black text-xl text-center">
              {category.name}
            </td>
          </tr>
        );
      } else if (category.hasLamb && category.hasTwoTeeth) {
        headerRow = (
          <tr className="bg-[#CD78B3] dark:bg-[#d85c96] text-white">
            <td className={`py-1.5 px-3 font-black text-right border-l border-white/30 w-[65%] ${depth === 1 ? 'text-[14px]' : 'text-[13px]'}`}>
              {'\u00A0\u00A0'.repeat(depth)}{category.name}
            </td>
            <td className="py-1.5 px-1 font-bold w-[17.5%] border-l border-white/30 text-center text-[12px]">بره</td>
            <td className="py-1.5 px-1 font-bold w-[17.5%] text-center text-[12px]">دودندان</td>
          </tr>
        );
      } else {
        headerRow = (
          <tr className="bg-[#CD78B3] dark:bg-[#d85c96] text-white">
            <td colSpan={3} className={`py-1.5 px-3 font-black text-right ${depth === 1 ? 'text-[14px]' : 'text-[13px]'}`}>
              {'\u00A0\u00A0'.repeat(depth)}{category.name}
            </td>
          </tr>
        );
      }
    } else {
      // Column 2 style
      if (depth === 0) {
        headerRow = (
          <tr className="bg-[#124A57] text-white">
            <td colSpan={3} className="py-2.5 px-2 font-black text-xl text-center">
              {category.name}
            </td>
          </tr>
        );
      } else {
        headerRow = (
          <tr className="bg-gray-100 dark:bg-gray-200">
            <td colSpan={3} className="py-1.5 px-3 font-black text-right text-[#124A57] text-[13px]">
              {'  '.repeat(depth)}{category.name}
            </td>
          </tr>
        );
      }
    }

    return (
      <React.Fragment key={category.id}>
        {headerRow}
        {categoryProducts.map(product => {
          if (colIndex === 1) {
            // Col 1 has 3 sub-columns: name, lamb, two teeth.
            let priceCells;
            if (!product.hasLamb && !product.hasTwoTeeth) {
              priceCells = (
                <td colSpan={2} className="py-1 px-1 font-bold text-center text-[15px] text-black dark:text-white w-[35%] ">
                  {product.priceLamb ? formatNumber(product.priceLamb) : (product.priceTwoTeeth ? formatNumber(product.priceTwoTeeth) : '-')}
                </td>
              );
            } else if (category.hasLamb && category.hasTwoTeeth) {
              priceCells = (
                <>
                  <td className="py-1 px-1 font-bold border-l border-gray-300 text-center w-[17.5%]">
                    {product.hasLamb && product.priceLamb ? formatNumber(product.priceLamb) : '-'}
                  </td>
                  <td className="py-1 px-1 font-bold text-center w-[17.5%]">
                    {product.hasTwoTeeth && product.priceTwoTeeth ? formatNumber(product.priceTwoTeeth) : '-'}
                  </td>
                </>
              );
            } else if (category.hasLamb) {
              priceCells = (
                <td colSpan={2} className="py-1 px-1 font-bold text-center text-[15px] text-black dark:text-white w-[35%] ">
                  {product.hasLamb && product.priceLamb ? formatNumber(product.priceLamb) : '-'}
                </td>
              );
            } else if (category.hasTwoTeeth) {
              priceCells = (
                <td colSpan={2} className="py-1 px-1 font-bold text-center text-[15px] text-black dark:text-white w-[35%] ">
                  {product.hasTwoTeeth && product.priceTwoTeeth ? formatNumber(product.priceTwoTeeth) : '-'}
                </td>
              );
            } else {
              priceCells = (
                <td colSpan={2} className="py-1 px-1 font-bold text-center text-gray-400 w-[35%] ">
                  -
                </td>
              );
            }

            return (
              <tr key={product.id} className="text-black">
                <td className={`py-1 px-3 font-bold text-right border-l border-gray-300 w-[65%] overflow-hidden ${getFitTextClass(product.name)}`}>
                  {'\u00A0\u00A0'.repeat(depth)}{product.name}
                </td>
                {priceCells}
              </tr>
            );
          } else {
            // Col 2
            let priceCells;
            if (!product.hasLamb && !product.hasTwoTeeth) {
              priceCells = (
                <td colSpan={2} className="py-1 px-1 font-bold text-center text-[15px] text-black dark:text-white w-[35%]">
                  {product.priceLamb ? formatNumber(product.priceLamb) : (product.priceTwoTeeth ? formatNumber(product.priceTwoTeeth) : '-')}
                </td>
              );
            } else if (category.hasLamb && category.hasTwoTeeth) {
              priceCells = (
                <>
                  <td className="py-1 px-1 font-bold border-l border-gray-300 text-center text-[15px] text-black dark:text-white w-[17.5%]">
                    {product.hasLamb && product.priceLamb ? formatNumber(product.priceLamb) : '-'}
                  </td>
                  <td className="py-1 px-1 font-bold text-center text-[15px] text-black dark:text-white w-[17.5%]">
                    {product.hasTwoTeeth && product.priceTwoTeeth ? formatNumber(product.priceTwoTeeth) : '-'}
                  </td>
                </>
              );
            } else if (category.hasLamb || category.hasTwoTeeth) {
              priceCells = (
                <td colSpan={2} className="py-1 px-2 font-bold text-center text-[15px] text-black dark:text-white w-[35%]">
                  {formatNumber(product.priceLamb || product.priceTwoTeeth)}
                </td>
              );
            } else {
              priceCells = (
                <td colSpan={2} className="py-1 px-2 font-bold text-center text-gray-400 w-[35%]">
                  -
                </td>
              );
            }

            return (
              <tr key={product.id} className="text-black">
                <td className={`py-1 px-3 font-bold text-right border-l border-gray-300 w-[65%] overflow-hidden ${getFitTextClass(product.name)}`}>
                  {'\u00A0\u00A0'.repeat(depth)}{product.name}
                </td>
                {priceCells}
              </tr>
            );
          }
        })}
        {children.map(child => renderCategoryRecursive(child, colIndex, depth + 1))}
      </React.Fragment>
    );
  };

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
      <div className={`flex-1 py-8 px-4 flex no-print-padding ${isExportMode ? 'justify-center' : 'justify-center overflow-x-auto'}`} dir="rtl">
        <div 
          ref={printRef}
          className={`print-container bg-white dark:bg-[#124A57] shadow-xl text-black dark:text-white flex flex-col ${
            isExportMode ? 'w-[794px] min-w-[794px] min-h-[1123px]' : 'max-w-[210mm] w-full min-h-[280mm] mx-auto'
          }`}
          style={{ padding: '10mm 15mm' }}
        >
          {/* Header */}
          <header className="flex-none mb-4 flex items-stretch justify-between pb-4 border-b-2 border-[#124A57] dark:border-white/20">
            {/* Right Column: Titles */}
            <div className="flex-1 text-right flex flex-col justify-center">
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

            {/* Middle Column: Date */}
            <div className="flex-[0.5] flex justify-center items-center">
              <div className="text-center flex flex-col items-center justify-center gap-1 bg-gray-50 dark:bg-white/10 px-4 py-2 rounded-xl border border-gray-100 dark:border-transparent shadow-sm">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-300">تاریخ:</span>
                <span className="text-lg font-black text-[#124A57] dark:text-white tracking-wide" dir="ltr">
                  {formatPersianDate(settings.lastUpdated || new Date().toISOString()).split(' ')[0]}
                </span>
              </div>
            </div>

            {/* Left Column: Logo */}
            <div className="flex-1 flex justify-end items-stretch">
              <div className="h-full relative w-full flex justify-end">
                {settings.logoLightUrl && (
                  <img src={settings.logoLightUrl} alt="Logo" className="absolute top-0 right-0 w-full h-full object-contain object-left block dark:hidden" />
                )}
                {settings.logoDarkUrl && (
                  <img src={settings.logoDarkUrl} alt="Logo" className="absolute top-0 right-0 w-full h-full object-contain object-left hidden dark:block" />
                )}
              </div>
            </div>
          </header>

          {/* Tables in 2 Columns - Stretches to fill available height */}
          <div className={`flex-1 print-grid grid gap-x-6 gap-y-4 items-stretch min-h-0 ${
            isExportMode ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2'
          }`}>
            
            {/* Column 1 (Right Side in Persian RTL): Gousfandi, Raste, Khoreshti */}
            <div className="flex flex-col h-full border-[3px] border-[#CD78B3] dark:border-[#d85c96] rounded-xl overflow-hidden shadow-sm bg-white">
              <table className="w-full h-full text-center text-[13px] font-medium bg-white">
                
                <tbody className="divide-y divide-gray-300">
                  {col1RootCategories.map(cat => renderCategoryRecursive(cat, 1, 0))}
                </tbody>
              </table>
            </div>

            {/* Column 2 (Left Side in Persian RTL): Gousale and Morgh */}
            <div className="flex flex-col h-full border-[3px] border-[#CD78B3] dark:border-[#d85c96] rounded-xl overflow-hidden shadow-sm bg-white">
              <table className="w-full h-full text-center text-[13px] font-medium bg-white">
                <tbody className="divide-y divide-gray-300">
                  {col2RootCategories.map(cat => renderCategoryRecursive(cat, 2, 0))}
                </tbody>
              </table>
            </div>

          </div>

          {/* Footer */}
          <footer className="flex-none mt-6 pt-4 border-t-2 border-[#124A57] dark:border-white/20 flex justify-between items-center text-lg font-bold page-break-avoid text-[#124A57] dark:text-white">
            <div className="flex items-center bg-gray-50 dark:bg-white/10 px-5 py-2.5 rounded-xl border border-gray-100 dark:border-transparent">
              {settings.footerTextRight || 'پاسخگویی از ساعت'} <span className="mr-2 text-[#CD78B3] dark:text-[#d85c96] tracking-wide">{settings.hours}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl">{settings.footerTextLeft || 'تماس با خط ویژه:'}</span>
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
