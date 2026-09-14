# AI Studio Agent Instructions

## قانون اصلی — SQLite Production Database

این پروژه از SQLite استفاده میکند و دیتابیس Production در مسیر زیر قرار دارد:
`data/database.sqlite`

فایلهای Runtime SQLite عبارتاند از:
* `data/database.sqlite`
* `data/database.sqlite-wal`
* `data/database.sqlite-shm`

این فایلها حاوی اطلاعات واقعی Production هستند و **نباید هیچوقت وارد Git شوند، Commit شوند، Push شوند، حذف شوند یا با نسخه GitHub جایگزین شوند.**

## Git

اطمینان حاصل کن `.gitignore` شامل موارد زیر باشد:
```gitignore
# SQLite runtime database files
data/database.sqlite
data/database.sqlite-wal
data/database.sqlite-shm
```

همچنین قبل از هر Commit بررسی کن:
```bash
git ls-files data/
```
این دستور باید هیچ خروجیای نداشته باشد.

## بسیار مهم

هرگز این دستورات را برای دیتابیس Production اجرا نکن:
```bash
git clean -fd
git reset --hard
git checkout -- data/
git restore data/
git pull --force
```
همچنین نباید فایلهای SQLite را از GitHub دریافت یا با فایلهای موجود روی سرور جایگزین کنی.

## Deploy

وقتی کد جدید Deploy میشود، فقط فایلهای Source و Build باید از GitHub بهروزرسانی شوند.
دیتابیس Production باید روی خود سرور باقی بماند.

روند Deploy صحیح:
```bash
git pull origin main
npm install
npm run build
pm2 restart price-list
```
اما قبل از `git pull` و بعد از آن، نباید فایلهای SQLite Production حذف یا overwrite شوند.

## Backup

قبل از هر تغییر مهم در Database Schema، Migration یا عملیات خطرناک روی دیتابیس، ابتدا از دیتابیس Production Backup گرفته شود.
مثلاً:
```bash
mkdir -p /var/backups/price-list
cp -a data /var/backups/price-list/data-$(date +%Y%m%d-%H%M%S)
```
هنگام Backup و عملیات SQLite، وضعیت WAL/SHM را نیز در نظر بگیر و بدون دلیل فایلهای SQLite را حذف نکن.

## Database Schema Changes

اگر نیاز به تغییر Schema دیتابیس وجود داشت:
1. ابتدا Migration طراحی کن.
2. Migration باید قابل تکرار و امن باشد.
3. قبل از اجرای Migration روی Production Backup بگیر.
4. Migration نباید باعث حذف اطلاعات موجود شود مگر اینکه صراحتاً درخواست شده باشد.
5. هیچ Migration نباید دیتابیس Production را از GitHub دریافت یا جایگزین کند.

## Code Changes

اگر نیاز به تغییر ساختار دیتابیس یا `server/database.ts` داری، فقط کد مربوط به Database Logic را تغییر بده.
به هیچ عنوان فایل واقعی:
`data/database.sqlite`
را تولید، Commit، Replace یا Reset نکن.

## Git Status

قبل از Commit بررسی کن:
```bash
git status
git ls-files data/
```
اگر فایلهای SQLite در Git Tracking قرار گرفتهاند، ابتدا مشکل Git را اصلاح کن و سپس Commit را انجام بده.

## Production Server

سرور Production در مسیر:
`/var/www/price-list`
و PM2 با نام:
`price-list`
اجرا میشود.

Build Production:
```bash
npm run build
```
Restart:
```bash
pm2 restart price-list
```
و وضعیت:
```bash
pm2 status
```

## هدف

GitHub باید فقط Source Code پروژه را نگهداری کند.
Production Server باید Source/Build جدید را از GitHub دریافت کند، اما **دیتابیس Production همیشه روی خود سرور باقی بماند.**
بهصورت خلاصه:
GitHub → کد پروژه
Production Server → کد + دیتابیس واقعی
هر Deploy جدید نباید باعث از بین رفتن یا جایگزین شدن دیتابیس Production شود.
