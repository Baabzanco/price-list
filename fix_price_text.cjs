const fs = require('fs');
let code = fs.readFileSync('src/pages/public/PriceList.tsx', 'utf8');

// The price cells have "text-black dark:text-white" which makes them white in dark mode
code = code.replace(/text-black dark:text-white/g, 'text-black');

fs.writeFileSync('src/pages/public/PriceList.tsx', code);
console.log("Replaced text-black dark:text-white with text-black.");
