const fs = require('fs');
const content = fs.readFileSync('src/pages/public/PriceList.tsx', 'utf8');

const regex = /<header className="flex-none mb-4 flex items-stretch justify-between pb-4 border-b-2 border-\[#124A57\] dark:border-white\/20">([\s\S]*?)<\/header>/;

const newHeader = `<header className="flex-none mb-4 flex items-stretch justify-between pb-4 border-b-2 border-[#124A57] dark:border-white/20">
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
              <div className="text-center flex flex-col items-center justify-center gap-1 bg-gray-50 dark:bg-white/10 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-transparent">
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-300">تاریخ:</span>
                <span className="text-xs font-black text-[#124A57] dark:text-white tracking-wide" dir="ltr">
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
          </header>`;

fs.writeFileSync('src/pages/public/PriceList.tsx', content.replace(regex, newHeader));
