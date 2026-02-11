'use client';

import React, { useEffect, useState } from 'react';

interface CountdownOverlayProps {
    isActive: boolean;
    onComplete?: () => void;
    targetDate?: string; // ISO string when countdown should end
}

export function CountdownOverlay({ isActive, onComplete, targetDate }: CountdownOverlayProps) {
    const [count, setCount] = useState<number | null>(null);

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

            setCount(Math.ceil(difference / 1000));
        };

        calculateTimeLeft(); // Initial calc
        const timer = setInterval(calculateTimeLeft, 100);

        return () => clearInterval(timer);
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
