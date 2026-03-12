import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['en', 'id', 'ar'],
  defaultLocale: 'en',
  // as-needed means no prefix is inserted for the default locale 'en',
  // but it is inserted for other locales like 'id' => /id/path
  localePrefix: 'as-needed'
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
