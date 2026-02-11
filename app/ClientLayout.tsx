'use client';

import { useEffect, useRef, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useGame } from '@/context/GameContext';
import { DialogProvider } from '@/context/AlertContext';
import AuthGate from '@/app/components/AuthGate';

interface ClientLayoutProps {
    children: ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps): React.JSX.Element {
    const { isLoading } = useGame();
    const pathname = usePathname();
    const customCursorRef = useRef<HTMLDivElement | null>(null);
    const fallingAsteroidsRef = useRef<HTMLDivElement | null>(null);

    // Initialize custom cursor and falling asteroids
    useEffect(() => {
        // Custom cursor
        const customCursor = document.createElement('div');
        customCursor.className = 'custom-cursor';
        customCursor.innerHTML = '<div class="cursor-asteroid"></div>';
        document.body.appendChild(customCursor);
        customCursorRef.current = customCursor;

        const handleMouseMove = (e: MouseEvent): void => {
            customCursor.style.left = e.clientX + 'px';
            customCursor.style.top = e.clientY + 'px';
        };
        document.addEventListener('mousemove', handleMouseMove);

        // Falling asteroids container
        const fallingAsteroidsContainer = document.createElement('div');
        fallingAsteroidsContainer.className = 'falling-asteroids';
        document.body.appendChild(fallingAsteroidsContainer);
        fallingAsteroidsRef.current = fallingAsteroidsContainer;

        const createFallingAsteroid = (): void => {
            const asteroid = document.createElement('div');
            asteroid.className = 'asteroid';

            const size = Math.random() * 15 + 5;
            asteroid.style.width = size + 'px';
            asteroid.style.height = size + 'px';
            asteroid.style.left = Math.random() * 100 + '%';
            asteroid.style.animationDuration = (Math.random() * 10 + 15) + 's';
            asteroid.style.animationDelay = Math.random() * 5 + 's';

            fallingAsteroidsContainer.appendChild(asteroid);

            setTimeout(() => {
                asteroid.remove();
            }, (parseFloat(asteroid.style.animationDuration) + parseFloat(asteroid.style.animationDelay)) * 1000);
        };

        // Create initial asteroids
        for (let i = 0; i < 10; i++) {
            createFallingAsteroid();
        }

        // Create new asteroids periodically
        const asteroidInterval = setInterval(createFallingAsteroid, 2000);

        // Cleanup
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            clearInterval(asteroidInterval);
            customCursor.remove();
            fallingAsteroidsContainer.remove();
        };
    }, []);

    // Hide cursor when mini-game is active
    useEffect(() => {
        if (customCursorRef.current) {
            customCursorRef.current.style.display = pathname === '/join/game' ? 'none' : 'block';
        }
    }, [pathname]);

    return (
        <DialogProvider>
                <AuthGate>
                    {/* Loading Overlay */}
                    <div className={`loading-overlay ${!isLoading ? 'hidden' : ''}`} id="loading-overlay">
                        <img src="/assets/loading.gif" alt="Loading" className="loading-gif" />
                        <div className="loading-text">Loading...</div>
                    </div>

                    {/* Animated Background */}
                    <div className="stars"></div>
                    <div className="stars2"></div>
                    <div className="stars3"></div>

                    {children}
                </AuthGate>
        </DialogProvider>
    );
}
