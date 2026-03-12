'use client';

import React, { useState, useEffect } from 'react';
import { LucideMaximize, LucideMinimize } from 'lucide-react';

export function FullscreenToggle(): React.JSX.Element {
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
            } else {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                }
            }
        } catch (err) {
            console.error('Error toggling fullscreen:', err);
        }
    };

    return (
        <button
            onClick={toggleFullscreen}
            className="fullscreen-toggle"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
            {isFullscreen ? (
                <LucideMinimize size={22} />
            ) : (
                <LucideMaximize size={22} />
            )}
        </button>
    );
}
