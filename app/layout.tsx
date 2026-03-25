import './globals.css';
import { Orbitron, Space_Mono } from 'next/font/google';
import { GameProvider } from '@/context/GameContext';
import { AuthProvider } from '@/context/AuthContext';
import { Metadata } from 'next';
import { ClientLayout } from './ClientLayout';

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

import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, getLocale } from 'next-intl/server';

export const metadata: Metadata = {
    title: 'Axiom',
    description: 'Answer the quiz and complete the mission',
};

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const locale = await getLocale();
    const messages = await getMessages();

    // Preload namespaces to ensure they are available for Client Components
    await getTranslations({ locale, namespace: 'SelectQuiz' });
    await getTranslations({ locale, namespace: 'Categories' });
    await getTranslations({ locale, namespace: 'HostSettings' });
    await getTranslations({ locale, namespace: 'WaitingRoom' });
    await getTranslations({ locale, namespace: 'Monitor' });
    await getTranslations({ locale, namespace: 'PlayerResult' });
    await getTranslations({ locale, namespace: 'Leaderboard' });
    await getTranslations({ locale, namespace: 'Lobby' });

    return (
        <html lang={locale}>
            <body className={`${orbitron.variable} ${spaceMono.variable}`}>
                <NextIntlClientProvider messages={messages} locale={locale}>
                    <AuthProvider>
                        <GameProvider>
                            <ClientLayout>
                                {children}
                            </ClientLayout>
                        </GameProvider>
                    </AuthProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
