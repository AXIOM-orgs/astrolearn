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
import { getMessages } from 'next-intl/server';
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

    return (
        <html lang={locale} dir="ltr">
            <body className={`${orbitron.variable} ${spaceMono.variable}`}>
                <NextIntlClientProvider messages={messages}>
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
