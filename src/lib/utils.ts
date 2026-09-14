import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPersianDate(isoString: string | null | undefined, includeTime = false): string {
  if (!isoString) return '—';
  
  try {
    const date = new Date(isoString);
    
    const dateOptions: Intl.DateTimeFormatOptions = {
      calendar: 'persian',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    };

    let formatted = new Intl.DateTimeFormat('fa-IR', dateOptions).format(date);
    
    // fa-IR default often outputs standard slashes, but sometimes relies on locale.
    // Ensure we use standard persian digits and slashes
    
    if (includeTime) {
      const timeOptions: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
      };
      const timeStr = new Intl.DateTimeFormat('fa-IR', timeOptions).format(date);
      return `${formatted} - ${timeStr}`;
    }
    
    return formatted;
  } catch (e) {
    return 'تاریخ نامعتبر';
  }
}

export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '—';
  return new Intl.NumberFormat('fa-IR').format(num);
}

export function toPersianDigits(str: string | number): string {
  const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.toString().replace(/\d/g, x => farsiDigits[parseInt(x)]);
}
