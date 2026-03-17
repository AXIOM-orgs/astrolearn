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

        // Global sound effects setup
        const sfxAudio = {
            click: new Audio('/assets/audio/efek/klik.mp3'),
            disabled: new Audio('/assets/audio/efek/btn_disabled.mp3'),
            popup: new Audio('/assets/audio/efek/pop_up.mp3'),
        };
        
        // Adjust volume if necessary
        sfxAudio.click.volume = 0.5;
        sfxAudio.disabled.volume = 0.5;
        sfxAudio.popup.volume = 0.5;
        
        // Track state locally to avoid rapid localStorage reads and sync with CustomEvents
        let isSfxEnabled = localStorage.getItem('cosmicquest_sfx_enabled') !== 'false';

        const handleSoundChange = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail && customEvent.detail.type === 'sfx') {
                isSfxEnabled = customEvent.detail.enabled;
            }
        };
        window.addEventListener('cosmicquest_sound_settings_changed', handleSoundChange);

        const playGlobalSound = (e: MouseEvent) => {
            if (!isSfxEnabled) return;

            const target = e.target as HTMLElement;
            // Check if closest element is a disabled button or element
            const closestBtn = target.closest('button, .btn, [role="button"]');
            
            if (closestBtn && (
                closestBtn.hasAttribute('disabled') || 
                closestBtn.classList.contains('disabled') ||
                closestBtn.getAttribute('aria-disabled') === 'true'
            )) {
                // Play disabled sound
                const sound = sfxAudio.disabled.cloneNode() as HTMLAudioElement;
                sound.play().catch((e) => console.log('Audio error:', e));
            } else {
                // Normal click sound
                const sound = sfxAudio.click.cloneNode() as HTMLAudioElement;
                sound.play().catch((e) => console.log('Audio error:', e));
            }
        };

        // MutationObserver to detect dialogs/popups opening
        const observer = new MutationObserver((mutations) => {
            if (!isSfxEnabled) return;
            
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const el = node as HTMLElement;
                            // Check common classes for dialog overlays and modals
                            if (el.classList && 
                                (el.classList.contains('cyan-dialog-overlay') || 
                                 el.classList.contains('dialog-overlay') ||
                                 el.classList.contains('exit-dialog-overlay') ||
                                 el.classList.contains('kick-dialog-overlay') ||
                                 el.classList.contains('custom-dialog-overlay') ||
                                 el.querySelector?.('.cyan-dialog-overlay, .dialog-overlay, .exit-dialog-overlay, .kick-dialog-overlay, .custom-dialog-overlay'))) {
                                
                                const sound = sfxAudio.popup.cloneNode() as HTMLAudioElement;
                                sound.play().catch((e) => console.log('Audio error:', e));
                                return; // Play once per mutation batch
                            }
                        }
                    }
                }
            }
        });

        // Start observing body for added dialog overlays
        observer.observe(document.body, { childList: true, subtree: true });

        // Use capture phase so we check the button state BEFORE React onClick handles it and disables it
        document.addEventListener('click', playGlobalSound, { capture: true });

        // Cleanup
        return () => {
            clearInterval(asteroidInterval);
            fallingAsteroidsContainer.remove();
            document.removeEventListener('click', playGlobalSound, { capture: true });
            window.removeEventListener('cosmicquest_sound_settings_changed', handleSoundChange);
            observer.disconnect();
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
