'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export function BackgroundMusic(): React.JSX.Element | null {
    const pathname = usePathname();
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isEnabled, setIsEnabled] = useState(true);
    const [hasInteracted, setHasInteracted] = useState(false);

    // Initial load of settings
    useEffect(() => {
        const savedBgm = localStorage.getItem('cosmicquest_bgm_enabled');
        if (savedBgm !== null) {
            setIsEnabled(savedBgm === 'true');
        }

        const handleSettingsChange = (e: any) => {
            if (e.detail?.type === 'bgm') {
                setIsEnabled(e.detail.enabled);
            }
        };

        window.addEventListener('cosmicquest_sound_settings_changed', handleSettingsChange as EventListener);
        
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
            window.removeEventListener('click', handleFirstInteraction);
            window.removeEventListener('keydown', handleFirstInteraction);
        };
    }, []);

    // Check if current route is allowed
    const isAllowedRoute = (): boolean => {
        // Normalize pathname (remove locale prefix if any)
        // Paths: /id, /en, /id/host/..., etc.
        const pathParts = pathname.split('/').filter(Boolean);
        
        // If it starts with a 2-letter locale, remove it for easier matching
        const normalizedPath = (pathParts[0]?.length === 2) 
            ? '/' + pathParts.slice(1).join('/') 
            : pathname;

        // Homepage
        if (normalizedPath === '/' || normalizedPath === '') return true;

        // Host paths: /host/select-quiz, /host/[roomCode]/settings
        const hostPathParts = normalizedPath.split('/').filter(Boolean);
        if (hostPathParts[0] === 'host') {
            if (hostPathParts[1] === 'select-quiz') return true;
            if (hostPathParts[2] === 'settings') return true;
            if (hostPathParts[2] === 'lobby') return true;
        }

        // Player paths: /player/[roomCode]/waiting
        const playerPathParts = normalizedPath.split('/').filter(Boolean);
        if (playerPathParts[0] === 'player') {
            if (playerPathParts[2] === 'waiting') return true;
        }

        return false;
    };

    const shouldPlay = isEnabled && isAllowedRoute();

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

    // Handle initial play attempt if they already interacted elsewhere
    useEffect(() => {
        if (shouldPlay && hasInteracted && audioRef.current && audioRef.current.paused) {
            audioRef.current.play().catch(() => {});
        }
    }, [pathname, shouldPlay, hasInteracted]);

    return (
        <audio
            ref={audioRef}
            src="/assets/audio/web/bgm_hmpage.wav"
            loop
            preload="auto"
            style={{ display: 'none' }}
        />
    );
}
