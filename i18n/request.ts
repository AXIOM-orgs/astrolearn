import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
import { cookies, headers } from 'next/headers';

export default getRequestConfig(async () => {
  // Read locale from cookie directly, no middleware needed
  const cookieStore = await cookies();
  const nextLocale = cookieStore.get('NEXT_LOCALE')?.value;
  
  // Default to header accept-language if no cookie
  const headerStore = await headers();
  const acceptLanguage = headerStore.get('accept-language');
  let locale = nextLocale;

  if (!locale && acceptLanguage) {
      if (acceptLanguage.includes('id')) locale = 'id';
      else if (acceptLanguage.includes('ar')) locale = 'ar';
      else locale = 'en';
  }

  // Ensure that a valid locale is used
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  let messages;
  if (process.env.NODE_ENV === 'development') {
    // Hindari cache import() dari Node di server components selama mode development
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(process.cwd(), `locale/${locale}.json`);
    messages = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } else {
    // Mode produksi agar ter-bundle dan lebih cepat
    messages = (await import(`../locale/${locale}.json`)).default;
  }

  return {
    locale,
    messages
  };
});
