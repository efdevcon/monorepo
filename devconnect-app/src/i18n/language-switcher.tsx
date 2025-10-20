'use client';

import { useRouter } from 'next/navigation';
import { validLocales } from './locales';
import { useState, useEffect } from 'react';
import cn from 'classnames';

// Helper function to read cookie value
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

export function LanguageSwitcher() {
  const router = useRouter();
  const [locale, setLocale] = useState<string>('en');

  // Initialize locale from cookie on mount
  useEffect(() => {
    const cookieLocale = getCookie('NEXT_LOCALE');
    if (cookieLocale && validLocales.includes(cookieLocale)) {
      setLocale(cookieLocale);
    }
  }, []);

  const handleChange = (newLocale: string) => {
    // 1. Set cookie
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;

    // 2. Refresh to re-render with new locale
    router.refresh(); // ✅ Now this is correct!
  };

  return (
    <div className="flex justify-center items-center gap-2">
      {validLocales.map((loc) => (
        <div
          key={loc}
          className={cn(
            'cursor-pointer p-0.5 px-1.5 text-[11px] border border-solid border-gray-700 bg-white opacity-60 hover:opacity-100 transition-opacity',
            locale === loc && 'opacity-100 font-semibold'
          )}
          onClick={() => handleChange(loc)}
        >
          {loc === 'en' && 'English'}
          {loc === 'es' && 'Español'}
          {loc === 'pt' && 'Português'}
        </div>
      ))}
    </div>
  );
}
