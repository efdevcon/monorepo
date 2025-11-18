'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Helper function to read cookie value
function getCookie(name: string): string | null {
  if (typeof window === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

interface LanguageToggleProps {
  languages?: string[];
  fontSize?: number;
}

export function LanguageToggle({ languages = ['en', 'es'], fontSize = 16 }: LanguageToggleProps) {
  const router = useRouter();
  const [locale, setLocale] = useState<string>('en');

  // Initialize locale from cookie on mount
  useEffect(() => {
    const cookieLocale = getCookie('NEXT_LOCALE');
    if (cookieLocale && languages.includes(cookieLocale)) {
      setLocale(cookieLocale);
    }
  }, [languages]);

  const handleChange = (newLocale: string) => {
    // Set cookie
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;
    
    // Update local state
    setLocale(newLocale);
    
    // Refresh to re-render with new locale
    router.refresh();
  };

  return (
    <div className="border border-solid border-[#d6d6d6] rounded-[1px] bg-white px-1 py-0.5">
      <div className="flex items-center gap-0">
        {languages.map((lang, index) => (
          <div key={lang} className="flex items-center">
            <button
              onClick={() => handleChange(lang)}
              className={`px-2 py-1 text-[${fontSize}px] font-bold transition-all ${
                locale === lang
                  ? 'text-[#0073de]'
                  : 'text-[#4b4b66] opacity-50 hover:opacity-100'
              }`}
            >
              {lang.toUpperCase()}
            </button>
            {index < languages.length - 1 && (
              <span className="text-[#4b4b66] text-[${fontSize}px] font-light">|</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

