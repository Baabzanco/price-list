const fs = require('fs');
let content = fs.readFileSync('src/pages/public/PriceList.tsx', 'utf8');

// 1. Remove the hardcoded thead from Col 1
content = content.replace(
  /<thead>[\s\S]*?<\/thead>/,
  ''
);

// 2. Modify renderCategoryRecursive for colIndex === 1
// We need to change the behavior of depth === 0 for col 1.
// Currently it is:
/*
    if (colIndex === 1) {
      // Column 1 style
      if (category.hasLamb && category.hasTwoTeeth) {
        headerRow = (
          <tr className="bg-[#CD78B3] dark:bg-[#d85c96] text-white">
*/

const oldCol1Start = `    if (colIndex === 1) {
      // Column 1 style
      if (category.hasLamb && category.hasTwoTeeth) {`;

const newCol1Start = `    if (colIndex === 1) {
      // Column 1 style
      if (depth === 0) {
        headerRow = (
          <tr className="bg-[#124A57] text-white">
            <td colSpan={3} className="py-2.5 px-2 font-black text-xl text-center">
              {category.name}
            </td>
          </tr>
        );
      } else if (category.hasLamb && category.hasTwoTeeth) {`;

content = content.replace(oldCol1Start, newCol1Start);

// Also need to adjust the depth levels for the pink text sizing, currently depth === 0 ? 'text-[14px]' : 'text-[13px]'
// since depth 0 is now dark blue, the pink ones will be depth >= 1.
// We can change depth === 0 to depth === 1 for the pink headers.
const oldPinkHeader1 = "className={`py-1.5 px-3 font-black text-right border-l border-white/30 w-[65%] ${depth === 0 ? 'text-[14px]' : 'text-[13px]'}`}";
const newPinkHeader1 = "className={`py-1.5 px-3 font-black text-right border-l border-white/30 w-[65%] ${depth === 1 ? 'text-[14px]' : 'text-[13px]'}`}";
content = content.replace(oldPinkHeader1, newPinkHeader1);

const oldPinkHeader2 = "className={`py-1.5 px-3 font-black text-right ${depth === 0 ? 'text-[14px]' : 'text-[13px]'}`}";
const newPinkHeader2 = "className={`py-1.5 px-3 font-black text-right ${depth === 1 ? 'text-[14px]' : 'text-[13px]'}`}";
content = content.replace(oldPinkHeader2, newPinkHeader2);

fs.writeFileSync('src/pages/public/PriceList.tsx', content);
