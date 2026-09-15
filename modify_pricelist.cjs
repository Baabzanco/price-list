const fs = require('fs');
let content = fs.readFileSync('src/pages/public/PriceList.tsx', 'utf8');

// 1. Fix getFitTextClass
content = content.replace(
  /const getFitTextClass = \(name: string\) => \{[\s\S]*?\};\n/,
  `const getFitTextClass = (name: string) => {
    if (name.length > 25) return 'text-[11.5px] leading-tight whitespace-normal break-words';
    if (name.length > 18) return 'text-[12px] leading-snug whitespace-normal break-words';
    return 'text-[13px] whitespace-normal';
  };\n`
);

// 2. Modify Column widths globally in the table
// name column: w-[50%] -> w-[60%]
content = content.replace(/w-\[50%\]/g, 'w-[65%]');
// price single column: w-[25%] -> w-[17.5%]
content = content.replace(/w-\[25%\]/g, 'w-[17.5%]');

// 3. Remove text-[#CD78B3] from Col 2 (Gousale and Morgh)
const col2Start = content.indexOf('// Col 2');
const block2 = content.substring(col2Start, col2Start + 2500);
// replace pink color specifically in this block
const block2Fixed = block2.replace(/text-\[\#CD78B3\]/g, 'text-black dark:text-white');
content = content.substring(0, col2Start) + block2Fixed + content.substring(col2Start + 2500);

// Add width class to colSpan={2} priceCells if missing
content = content.replace(/<td colSpan=\{2\} className="(.*?)"/g, (match, p1) => {
  if (p1.includes('w-[35%]')) return match;
  if (p1.includes('w-[65%]')) {
    return `<td colSpan={2} className="${p1.replace('w-[65%]', 'w-[35%]')} "`;
  }
  return `<td colSpan={2} className="${p1} w-[35%]"`;
});

// Also fix the other price cells widths if missing
content = content.replace(/<td className="(.*?) w-\[17\.5%\]">/g, (match) => match); // keep existing ones
content = content.replace(/<td className="py-1 px-1 font-bold border-l border-gray-300 text-center( text-\[15px\] text-black dark:text-white)?">/g, '<td className="py-1 px-1 font-bold border-l border-gray-300 text-center$1 w-[17.5%]">');
content = content.replace(/<td className="py-1 px-1 font-bold text-center( text-\[15px\] text-black dark:text-white)?">/g, '<td className="py-1 px-1 font-bold text-center$1 w-[17.5%]">');

fs.writeFileSync('src/pages/public/PriceList.tsx', content);
