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

export const metadata: Metadata = {
    title: 'Axiom',
    description: 'Answer the quiz and complete the mission',
};

interface RootLayoutProps {
    children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): React.JSX.Element {
    return (
        <html lang="en">
            <body className={`${orbitron.variable} ${spaceMono.variable}`}>
                <AuthProvider>
                    <GameProvider>
                        <ClientLayout>
                            {children}
                        </ClientLayout>
                    </GameProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
