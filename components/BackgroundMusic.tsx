'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export function BackgroundMusic(): React.JSX.Element | null {
    const pathname = usePathname();
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const isPlayerPath = pathname.startsWith('/player') || pathname.startsWith('/join');
    const [isEnabled, setIsEnabled] = useState(!isPlayerPath); // Default to OFF for player/join, else ON
    const [hasInteracted, setHasInteracted] = useState(false);
    const [isCountdownActive, setIsCountdownActive] = useState(false);
    const isHost = pathname.startsWith('/host'); // Used for monitor detection if needed elsewhere

    // Initial load of settings
    useEffect(() => {
        const storageKey = isPlayerPath ? 'cosmicquest_player_bgm_enabled' : 'cosmicquest_bgm_enabled';
        const savedBgm = localStorage.getItem(storageKey);
        
        if (savedBgm !== null) {
            setIsEnabled(savedBgm === 'true');
        } else {
            // New user - default: Player/Join = OFF, Others = ON
            setIsEnabled(!isPlayerPath);
        }

        const handleSettingsChange = (e: any) => {
            if (e.detail?.type === 'bgm') {
                setIsEnabled(e.detail.enabled);
            }
        };

        const handleCountdownChange = (e: any) => {
            setIsCountdownActive(!!e.detail?.active);
        };

        window.addEventListener('cosmicquest_sound_settings_changed', handleSettingsChange as EventListener);
        window.addEventListener('cosmicquest_countdown_active', handleCountdownChange as EventListener);
        
        // Interaction listener to overcome autoplay policy
        const handleFirstInteraction = () => {
            setHasInteracted(true);
            window.removeEventListener('click', handleFirstInteraction);
            window.removeEventListener('keydown', handleFirstInteraction);
        };

        window.addEventListener('click', handleFirstInteraction);
        window.addEventListener('keydown', handleFirstInteraction);

        return () => {
            window.removeEventListener('cosmicquest_sound_settings_changed', handleSettingsChange as EventListener);
            window.removeEventListener('cosmicquest_countdown_active', handleCountdownChange as EventListener);
            window.removeEventListener('click', handleFirstInteraction);
            window.removeEventListener('keydown', handleFirstInteraction);
        };
    }, []);

    // Check if current route is allowed
    const getAudioSource = (): string => {
        const pathParts = pathname.split('/').filter(Boolean);
        const lowerParts = pathParts.map(p => p.toLowerCase());

        // Routes for Quiz BGM
        if (lowerParts.includes('quiz') || lowerParts.includes('monitor')) {
            return "/assets/audio/web/bgm_quiz_monitor.mp3";
        }

        // Default Homepage BGM
        return "/assets/audio/web/bgm_hmpage.wav";
    };

    const isAllowedRoute = (): boolean => {
        const pathParts = pathname.split('/').filter(Boolean);
        
        // Exclude specific routes where BGM should not play
        // game: Active gameplay (MiniGame has its own music/sounds)
        const excludedRoutes = ['game'];
        
        return !pathParts.some(part => excludedRoutes.includes(part.toLowerCase()));
    };

    const currentSrc = getAudioSource();
    const shouldPlay = isEnabled && isAllowedRoute() && !isCountdownActive;

    // Handle track changes
    useEffect(() => {
        if (!audioRef.current) return;
        
        // If track changed while playing, restart with new source
        const currentAudio = audioRef.current;
        const isPlaying = !currentAudio.paused;

        if (isPlaying && currentAudio.src !== currentSrc) {
            currentAudio.load();
            if (shouldPlay && hasInteracted) {
                currentAudio.play().catch(() => {});
            }
        }
    }, [currentSrc, shouldPlay, hasInteracted]);

    useEffect(() => {
        if (!audioRef.current) return;

        if (shouldPlay) {
            if (hasInteracted) {
                audioRef.current.play().catch(err => {
                    console.warn('BGM play failed:', err);
                });
            }
        } else {
            audioRef.current.pause();
        }
    }, [shouldPlay, hasInteracted]);

    // Handle initial play attempt or navigation
    useEffect(() => {
        if (shouldPlay && hasInteracted && audioRef.current && audioRef.current.paused) {
            audioRef.current.play().catch(() => {});
        }
    }, [pathname, shouldPlay, hasInteracted]);

    return (
        <audio
            ref={audioRef}
            src={currentSrc}
            loop
            preload="auto"
            style={{ display: 'none' }}
        />
    );
}
