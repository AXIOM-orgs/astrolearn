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
    metadataBase: new URL('https://axiom.gameforsmart.com'),
    icons: {
        icon: [
            { url: '/assets/images/logo/favicon.png' },
            { url: '/assets/images/logo/favicon.png', type: 'image/png' },
        ],
        apple: '/assets/images/logo/axiom.png',
    },
    title: 'Axiom',
    description: 'Answer the quiz and complete the mission',
    keywords: 'Axiom, answer quiz, complete mission, educational game, quiz mission',
    authors: [{ name: 'Axiom Team' }],
    robots: 'index, follow',
    alternates: {
        canonical: 'https://axiom.gameforsmart.com/',
    },
    openGraph: {
        title: 'Axiom',
        description: 'Answer the quiz and complete the mission',
        url: 'https://axiom.gameforsmart.com',
        siteName: 'Axiom',
        images: [
            {
                url: '/assets/images/logo/axiom.png',
                width: 1200,
                height: 630,
                alt: 'Axiom Logo',
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Axiom',
        description: 'Answer the quiz and complete the mission',
        images: ['/assets/images/logo/axiom.png'],
        creator: '@Gameforsmart',
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
        'WaitingRoom', 'Monitor', 'PlayerResult', 'Leaderboard', 'Lobby',
        'QuizDetail', 'Logout', 'Common', 'SoundSettings'
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
