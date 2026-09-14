cat << 'INNER_EOF' > modify_pricelist.js
const fs = require('fs');
const content = fs.readFileSync('src/pages/public/PriceList.tsx', 'utf8');

let newContent = content;

// Replace header section
const headerRegex = /<header className="flex-none mb-4 flex justify-between items-end pb-4 border-b-2 border-\[#124A57\] dark:border-white\/20">([\s\S]*?)<\/header>/;

const newHeader = `<header className="flex-none mb-4 flex items-center justify-between pb-4 border-b-2 border-[#124A57] dark:border-white/20">
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
              <div className="text-center flex flex-col items-center justify-center gap-1 bg-gray-50 dark:bg-white/10 px-4 py-2 rounded-xl border border-gray-100 dark:border-transparent">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-300">تاریخ:</span>
                <span className="text-base font-black text-[#124A57] dark:text-white tracking-wide" dir="ltr">
                  {formatPersianDate(settings.lastUpdated || new Date().toISOString()).split(' ')[0]}
                </span>
              </div>
            </div>

            {/* Left Column: Logo */}
            <div className="flex-1 flex justify-end items-center h-28">
              {settings.logoLightUrl && (
                <img src={settings.logoLightUrl} alt="Logo" className="h-full w-auto object-contain block dark:hidden" />
              )}
              {settings.logoDarkUrl && (
                <img src={settings.logoDarkUrl} alt="Logo" className="h-full w-auto object-contain hidden dark:block" />
              )}
            </div>
          </header>`;

newContent = newContent.replace(headerRegex, newHeader);

// Replace renderCategoryRecursive
const col1Regex = /if \(colIndex === 1\) {[\s\S]*?\} else \{[\s\S]*?\/\/ Col 2[\s\S]*?let priceCells;[\s\S]*?if \(category\.hasLamb && category\.hasTwoTeeth\) {[\s\S]*?\} else if \(category\.hasLamb \|\| category\.hasTwoTeeth\) {[\s\S]*?\} else {[\s\S]*?\}[\s\S]*?return \([\s\S]*?\);[\s\S]*?\}/;

const newColLogic = `if (colIndex === 1) {
            let priceCells;
            if (!product.hasLamb && !product.hasTwoTeeth) {
              priceCells = (
                <td colSpan={2} className="py-1 px-1 font-bold text-center text-lg text-[#CD78B3]">
                  {product.priceLamb ? formatNumber(product.priceLamb) : (product.priceTwoTeeth ? formatNumber(product.priceTwoTeeth) : '-')}
                </td>
              );
            } else if (category.hasLamb && category.hasTwoTeeth) {
              priceCells = (
                <>
                  <td className="py-1 px-1 font-bold border-l border-gray-300 text-center">
                    {product.hasLamb && product.priceLamb ? formatNumber(product.priceLamb) : '-'}
                  </td>
                  <td className="py-1 px-1 font-bold text-center">
                    {product.hasTwoTeeth && product.priceTwoTeeth ? formatNumber(product.priceTwoTeeth) : '-'}
                  </td>
                </>
              );
            } else if (category.hasLamb) {
              priceCells = (
                <td colSpan={2} className="py-1 px-1 font-bold text-center text-lg text-[#CD78B3]">
                  {product.hasLamb && product.priceLamb ? formatNumber(product.priceLamb) : '-'}
                </td>
              );
            } else if (category.hasTwoTeeth) {
              priceCells = (
                <td colSpan={2} className="py-1 px-1 font-bold text-center text-lg text-[#CD78B3]">
                  {product.hasTwoTeeth && product.priceTwoTeeth ? formatNumber(product.priceTwoTeeth) : '-'}
                </td>
              );
            } else {
              priceCells = (
                <td colSpan={2} className="py-1 px-1 font-bold text-center text-gray-400">
                  -
                </td>
              );
            }

            return (
              <tr key={product.id} className="text-black">
                <td className="py-1 px-3 font-bold text-right border-l border-gray-300 w-[50%]">
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
                <td colSpan={2} className="py-1 px-1 font-bold text-center text-[15px] text-[#CD78B3]">
                  {product.priceLamb ? formatNumber(product.priceLamb) : (product.priceTwoTeeth ? formatNumber(product.priceTwoTeeth) : '-')}
                </td>
              );
            } else if (category.hasLamb && category.hasTwoTeeth) {
              priceCells = (
                <>
                  <td className="py-1 px-1 font-bold border-l border-gray-300 text-center text-[15px] text-[#CD78B3]">
                    {product.hasLamb && product.priceLamb ? formatNumber(product.priceLamb) : '-'}
                  </td>
                  <td className="py-1 px-1 font-bold text-center text-[15px] text-[#CD78B3]">
                    {product.hasTwoTeeth && product.priceTwoTeeth ? formatNumber(product.priceTwoTeeth) : '-'}
                  </td>
                </>
              );
            } else if (category.hasLamb || category.hasTwoTeeth) {
              priceCells = (
                <td colSpan={2} className="py-1 px-2 font-bold text-center text-lg text-[#CD78B3]">
                  {formatNumber(product.priceLamb || product.priceTwoTeeth)}
                </td>
              );
            } else {
              priceCells = (
                <td colSpan={2} className="py-1 px-2 font-bold text-center text-gray-400">
                  -
                </td>
              );
            }

            return (
              <tr key={product.id} className="text-black">
                <td className="py-1 px-3 font-bold text-right border-l border-gray-300 w-[50%]">
                  {'\u00A0\u00A0'.repeat(depth)}{product.name}
                </td>
                {priceCells}
              </tr>
            );
          }`;

newContent = newContent.replace(col1Regex, newColLogic);

fs.writeFileSync('src/pages/public/PriceList.tsx', newContent);
console.log('done');
INNER_EOF
node modify_pricelist.js
