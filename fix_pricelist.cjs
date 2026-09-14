const fs = require('fs');
const content = fs.readFileSync('src/pages/public/PriceList.tsx', 'utf8');

const regex = /const renderCategoryRecursive = \([\s\S]*?\);[\s\S]*?  \};/m;

const newRender = `const renderCategoryRecursive = (
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
      headerRow = (
        <tr className="bg-gray-100 dark:bg-gray-200">
          <td colSpan={3} className={\`py-1.5 px-3 font-black text-right text-[#124A57] \${depth === 0 ? 'text-[14px]' : 'text-[13px]'}\`}>
            {'\u00A0\u00A0'.repeat(depth)}{category.name}
          </td>
        </tr>
      );
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
              {'\u00A0\u00A0'.repeat(depth)}{category.name}
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
                <td colSpan={2} className="py-1 px-1 font-bold text-center text-[15px] text-[#CD78B3]">
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
                <td colSpan={2} className="py-1 px-1 font-bold text-center text-[15px] text-[#CD78B3]">
                  {product.hasLamb && product.priceLamb ? formatNumber(product.priceLamb) : '-'}
                </td>
              );
            } else if (category.hasTwoTeeth) {
              priceCells = (
                <td colSpan={2} className="py-1 px-1 font-bold text-center text-[15px] text-[#CD78B3]">
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
                <td colSpan={2} className="py-1 px-2 font-bold text-center text-[15px] text-[#CD78B3]">
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
          }
        })}
        {children.map(child => renderCategoryRecursive(child, colIndex, depth + 1))}
      </React.Fragment>
    );
  };`;

fs.writeFileSync('src/pages/public/PriceList.tsx', content.replace(regex, newRender));
