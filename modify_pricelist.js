const fs = require('fs');
let content = fs.readFileSync('src/pages/public/PriceList.tsx', 'utf8');

// 1. Fix getFitTextClass
content = content.replace(
  /const getFitTextClass = \(name: string\) => \{[\s\S]*?\};\n/,
  `const getFitTextClass = (name: string) => {
    if (name.length > 28) return 'text-[11.5px] leading-[1.25] whitespace-normal';
    if (name.length > 20) return 'text-[12px] leading-snug whitespace-normal';
    return 'text-[13px] leading-snug whitespace-normal';
  };\n`
);

// 2. Col 1 Headers
content = content.replace(
  /w-\[50%\]/g,
  'w-[60%]'
);
content = content.replace(
  /w-\[25%\]/g,
  'w-[20%]'
);

// 3. Col 2 text color and widths
// We need to remove text-[#CD78B3] from Col 2.
// Col 2 starts after `// Col 2`
const col2Start = content.indexOf('// Col 2');
const col2End = content.indexOf('return (', col2Start + 1500); // just to limit

let col2Section = content.substring(col2Start, col2Start + 2500);
col2Section = col2Section.replace(/text-\[\#CD78B3\]/g, ''); // removes pink from col 2 prices
content = content.substring(0, col2Start) + col2Section + content.substring(col2Start + 2500);

// We also need to fix price cell widths in Col 2 and Col 1.
// In Col 1 priceCells, we had w-[50%] which became w-[60%], but wait, price colSpan=2 should be w-[40%].
// Let's just do targeted replaces for priceCells colSpan=2 widths.
content = content.replace(/colSpan=\{2\} className="(.*?) w-\[60%\](.*?)"/g, 'colSpan={2} className="$1 w-[40%]$2"');
content = content.replace(/colSpan=\{2\} className="(.*?)"/g, (match, p1) => {
  if (p1.includes('w-[40%]')) return match;
  return `colSpan={2} className="${p1} w-[40%]"`;
});

// Also replace the single column widths in Col 2 if they lack them
// For Col 2 hasLamb & hasTwoTeeth
// `<td className="py-1 px-1 font-bold border-l border-gray-300 text-center text-[15px] text-[#CD78B3]">`
// Change to `... w-[20%]`
content = content.replace(
  /<td className="py-1 px-1 font-bold border-l border-gray-300 text-center text-\[15px\](.*?)">/g,
  '<td className="py-1 px-1 font-bold border-l border-gray-300 text-center text-[15px] w-[20%]$1">'
);
content = content.replace(
  /<td className="py-1 px-1 font-bold text-center text-\[15px\](.*?)">/g,
  '<td className="py-1 px-1 font-bold text-center text-[15px] w-[20%]$1">'
);


fs.writeFileSync('src/pages/public/PriceList.tsx', content);
