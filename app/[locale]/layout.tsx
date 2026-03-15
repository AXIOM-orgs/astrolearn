import '../globals.css';
import { Orbitron, Space_Mono } from 'next/font/google';
import { GameProvider } from '@/context/GameContext';
import { AuthProvider } from '@/context/AuthContext';
import { Metadata } from 'next';
import { ClientLayout } from '../ClientLayout';

const orbitron = Orbitron({
    subsets: ['latin'],
    weight: ['400', '700', '900'],
    variable: '--font-orbitron',
    display: 'swap',
});

const spaceMono = Space_Mono({
    subsets: ['latin'],
    weight: ['400', '700'],
    variable: '--font-space-mono',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'Axiom',
    description: 'Answer the quiz and complete the mission',
};

import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

interface RootLayoutProps {
    children: React.ReactNode;
    params: {
        locale: string;
    };
}

export default async function RootLayout({ children, params }: RootLayoutProps): Promise<React.JSX.Element> {
    const { locale } = await params;

    if (!routing.locales.includes(locale as any)) {
      notFound();
    }
   
    const messages = await getMessages();
    
    // Explicitly preload problematic namespaces to ensure they are available for Client Components
    // deeply nested in dynamic routes on client-side navigation.
    await getTranslations({ locale, namespace: 'SelectQuiz' });
    await getTranslations({ locale, namespace: 'Categories' });
    await getTranslations({ locale, namespace: 'HostSettings' });
    await getTranslations({ locale, namespace: 'WaitingRoom' });
    await getTranslations({ locale, namespace: 'Monitor' });
    await getTranslations({ locale, namespace: 'PlayerResult' });
    await getTranslations({ locale, namespace: 'Leaderboard' });
    await getTranslations({ locale, namespace: 'Lobby' });

    return (
        <NextIntlClientProvider messages={messages} locale={locale}>
            {children}
        </NextIntlClientProvider>
    );
}
