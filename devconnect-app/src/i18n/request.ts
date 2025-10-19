import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';
import { validLocales } from './locales';

export default getRequestConfig(async () => {
  const headersList = await headers();
  const localeHeader = headersList.get('x-locale');
  const locale =
    localeHeader && validLocales.includes(localeHeader) ? localeHeader : 'en';

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
