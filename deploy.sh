#!/usr/bin/env bash

set -Eeuo pipefail

APP_DIR="/var/www/price-list"
BRANCH="main"
APP_NAME="price-list"
BACKUP_DIR="/var/backups/price-list"

log() {
  echo
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

fail() {
  echo
  echo "ERROR: $1"
  exit 1
}

cd "$APP_DIR"

log "شروع Deploy پروژه"

# بررسی وجود ابزارهای ضروری
command -v git >/dev/null 2>&1 || fail "git نصب نیست"
command -v npm >/dev/null 2>&1 || fail "npm نصب نیست"
command -v pm2 >/dev/null 2>&1 || fail "pm2 نصب نیست"

# بررسی وضعیت Git
log "بررسی وضعیت Git"

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  fail "تغییرات محلی ثبت‌نشده وجود دارد. ابتدا آن‌ها را بررسی کن."
fi

# اطمینان از خارج بودن دیتابیس از Git
if [[ -n "$(git ls-files data/)" ]]; then
  fail "فایل‌هایی از پوشه data هنوز تحت Git هستند. Deploy متوقف شد."
fi

# ساخت Backup از دیتابیس
log "ساخت Backup از دیتابیس"

mkdir -p "$BACKUP_DIR"

BACKUP_PATH="$BACKUP_DIR/data-$(date '+%Y%m%d-%H%M%S')"

if [[ -d "$APP_DIR/data" ]]; then
  cp -a "$APP_DIR/data" "$BACKUP_PATH"
else
  log "هشدار: پوشه data وجود ندارد"
fi

# دریافت آخرین کد
log "دریافت آخرین تغییرات از GitHub"

git pull --ff-only origin "$BRANCH"

# نصب وابستگی‌ها
log "نصب وابستگی‌ها"

npm install

# ساخت نسخه Production
log "ساخت Build جدید"

npm run build

# ری‌استارت فقط بعد از موفقیت Build
log "ری‌استارت PM2"

pm2 restart "$APP_NAME"

# ذخیره فهرست PM2
log "ذخیره وضعیت PM2"

pm2 save

# نمایش وضعیت نهایی
log "وضعیت نهایی برنامه"

pm2 status

log "Deploy با موفقیت انجام شد"
