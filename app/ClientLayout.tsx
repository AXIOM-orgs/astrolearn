'use client';

import { useEffect, useRef, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useGame } from '@/context/GameContext';
import { DialogProvider } from '@/context/AlertContext';
import AuthGate from '@/components/AuthGate';
import { BackgroundMusic } from '@/components/BackgroundMusic';
import { ToastProvider } from '@/context/ToastContext';

interface ClientLayoutProps {
    children: ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps): React.JSX.Element {
    const { isLoading } = useGame();
    const pathname = usePathname();
    const fallingAsteroidsRef = useRef<HTMLDivElement | null>(null);

    // Initialize falling asteroids
    useEffect(() => {
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

        // Global click sound effect setup
        const sfxAudio = {
            click: new Audio('/assets/audio/efek/klik.mp3'),
        };
        
        // Adjust volume if necessary
        sfxAudio.click.volume = 0.5;
        
        // Track state locally to avoid rapid localStorage reads and sync with CustomEvents
        let isSfxEnabled = true; // Default
        const isPlayerPath = pathname.startsWith('/player') || pathname.startsWith('/join');
        const storageKey = isPlayerPath ? 'player_sfx_enabled' : 'sfx_enabled';
        
        const savedSfx = localStorage.getItem(storageKey);
        if (savedSfx !== null) {
            isSfxEnabled = savedSfx === 'true';
        } else {
            // New user - default: Player/Join = OFF, Others = ON
            isSfxEnabled = !isPlayerPath;
        }

        const handleSoundChange = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail && customEvent.detail.type === 'sfx') {
                isSfxEnabled = customEvent.detail.enabled;
            }
        };
        window.addEventListener('sound_settings_changed', handleSoundChange);

        const playGlobalSound = (e: MouseEvent) => {
            if (!isSfxEnabled) return;

            // Normal click sound
            const sound = sfxAudio.click.cloneNode() as HTMLAudioElement;
            sound.play().catch((e) => console.log('Audio error:', e));
        };

        // Use capture phase so we check the button state BEFORE React onClick handles it and disables it
        document.addEventListener('click', playGlobalSound, { capture: true });

        // Cleanup
        return () => {
            clearInterval(asteroidInterval);
            fallingAsteroidsContainer.remove();
            document.removeEventListener('click', playGlobalSound, { capture: true });
            window.removeEventListener('sound_settings_changed', handleSoundChange);
        };
    }, []);

    return (
        <DialogProvider>
            <ToastProvider>
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

                    <BackgroundMusic />
                    {children}
                </AuthGate>
            </ToastProvider>
        </DialogProvider>
    );
}
