import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['en', 'id', 'ar'],
  defaultLocale: 'en',
  // 'never' means no locale prefix is added to URLs at all.
  // Locale is resolved via cookie/header instead.
  localePrefix: 'never'
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
