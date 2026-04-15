'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useLocale } from 'next-intl';
import { toArabicNumerals } from '@/lib/utils';
import { syncServerTime, getSyncedServerTime } from '@/lib/serverTime';

interface CountdownOverlayProps {
    isActive: boolean;
    onComplete?: () => void;
    targetDate?: string; // ISO string when countdown should end
    max?: number; // Maximum value to display (e.g. 10)
}

export function CountdownOverlay({ isActive, onComplete, targetDate, max }: CountdownOverlayProps) {
    const locale = useLocale();
    const [count, setCount] = useState<number | null>(null);
    const hasSynced = useRef(false);

    // Sync server time once on mount
    useEffect(() => {
        if (hasSynced.current) return;
        hasSynced.current = true;
        syncServerTime();
    }, []);

    useEffect(() => {
        if (!isActive || !targetDate) {
            setCount(null);
            return;
        }

        const calculateTimeLeft = () => {
            const now = getSyncedServerTime();
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

        // Sync server time first, then start countdown
        const startCountdown = async () => {
            await syncServerTime();
            calculateTimeLeft(); // Initial calc with synced time
        };

        startCountdown();
        const timer = setInterval(calculateTimeLeft, 100);

        // Notify BGM that countdown is active
        window.dispatchEvent(new CustomEvent('countdown_active', { 
            detail: { active: true } 
        }));

        return () => {
            clearInterval(timer);
            // Notify BGM that countdown is finished
            window.dispatchEvent(new CustomEvent('countdown_active', { 
                detail: { active: false } 
            }));
        };
    }, [isActive, targetDate, onComplete]);

    if (!isActive || count === null || count <= 0) return null;

    return (
        <div className="countdown-overlay">
            <div className="countdown-number">
                {locale === 'ar' ? toArabicNumerals(count) : count}
            </div>
        </div>
    );
}
