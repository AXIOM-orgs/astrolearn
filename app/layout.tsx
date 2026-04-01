import './globals.css';
import { Orbitron, Space_Mono } from 'next/font/google';
import { GameProvider } from '@/context/GameContext';
import { AuthProvider } from '@/context/AuthContext';
import { Metadata } from 'next';
import { ClientLayout } from './ClientLayout';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, getLocale } from 'next-intl/server';

const orbitron = Orbitron({
    subsets: ['latin'],
    weight: ['400', '700', '900'],
    variable: '--font-orbitron',
});

const spaceMono = Space_Mono({
    subsets: ['latin'],
    weight: ['400', '700'],
    variable: '--font-space-mono',
});

export const metadata: Metadata = {
    icons: {
        icon: '/assets/images/logo/favicon.png',
    },
    title: 'Axiom',
    description: 'Answer the quiz and complete the mission',
    openGraph: {
        title: 'Axiom',
        description: 'Answer the quiz and complete the mission',
        images: [
            {
                url: '/assets/images/logo/logo2new.webp',
                width: 1200,
                height: 630,
                alt: 'Axiom Logo',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Axiom',
        description: 'Answer the quiz and complete the mission',
        images: ['/assets/images/logo/logo2new.webp'],
    },
};

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const locale = await getLocale();
    const messages = await getMessages();

    const NAMESPACES = [
        'SelectQuiz', 'Categories', 'HostSettings',
        'WaitingRoom', 'Monitor', 'PlayerResult', 'Leaderboard', 'Lobby'
    ];

    await Promise.all(NAMESPACES.map(namespace => getTranslations({ locale, namespace })));

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
