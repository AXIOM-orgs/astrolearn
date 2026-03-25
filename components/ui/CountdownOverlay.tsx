'use client';

import React, { useEffect, useState } from 'react';

interface CountdownOverlayProps {
    isActive: boolean;
    onComplete?: () => void;
    targetDate?: string; // ISO string when countdown should end
    max?: number; // Maximum value to display (e.g. 10)
}

export function CountdownOverlay({ isActive, onComplete, targetDate, max }: CountdownOverlayProps) {
    const [count, setCount] = useState<number | null>(() => {
        if (!isActive || !targetDate) return null;
        const now = new Date().getTime();
        const target = new Date(targetDate).getTime();
        const difference = target - now;
        if (difference <= 0) return 0;
        const calculated = Math.ceil(difference / 1000);
        return max ? Math.min(calculated, max) : calculated;
    });

    useEffect(() => {
        if (!isActive || !targetDate) {
            setCount(null);
            return;
        }

        const calculateTimeLeft = () => {
            const now = new Date().getTime();
            const target = new Date(targetDate).getTime();
            const difference = target - now;

            if (difference <= 0) {
                setCount(0);
                if (onComplete) onComplete();
                return;
            }

            const val = Math.ceil(difference / 1000);
            setCount(max ? Math.min(val, max) : val);
        };

        calculateTimeLeft(); // Initial calc
        const timer = setInterval(calculateTimeLeft, 100);

        // Notify BGM that countdown is active
        window.dispatchEvent(new CustomEvent('cosmicquest_countdown_active', { 
            detail: { active: true } 
        }));

        return () => {
            clearInterval(timer);
            // Notify BGM that countdown is finished
            window.dispatchEvent(new CustomEvent('cosmicquest_countdown_active', { 
                detail: { active: false } 
            }));
        };
    }, [isActive, targetDate, onComplete]);

    if (!isActive || count === null || count <= 0) return null;

    return (
        <div className="countdown-overlay">
            <div className="countdown-number">
                {count}
            </div>
        </div>
    );
}
