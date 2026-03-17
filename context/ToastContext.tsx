'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Info, AlertTriangle, XCircle } from 'lucide-react';

type ToastType = 'success' | 'info' | 'warning' | 'error';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
};

const TOAST_COLORS: Record<ToastType, { border: string; glow: string; icon: string; bg: string }> = {
    success: {
        border: 'rgba(6, 255, 165, 0.5)',
        glow: '0 0 30px rgba(6, 255, 165, 0.25), 0 0 60px rgba(6, 255, 165, 0.1)',
        icon: '#06ffa5',
        bg: 'rgba(6, 255, 165, 0.08)',
    },
    info: {
        border: 'rgba(0, 212, 255, 0.5)',
        glow: '0 0 30px rgba(0, 212, 255, 0.25), 0 0 60px rgba(0, 212, 255, 0.1)',
        icon: '#00d4ff',
        bg: 'rgba(0, 212, 255, 0.08)',
    },
    warning: {
        border: 'rgba(255, 193, 7, 0.5)',
        glow: '0 0 30px rgba(255, 193, 7, 0.25), 0 0 60px rgba(255, 193, 7, 0.1)',
        icon: '#ffc107',
        bg: 'rgba(255, 193, 7, 0.08)',
    },
    error: {
        border: 'rgba(255, 71, 87, 0.5)',
        glow: '0 0 30px rgba(255, 71, 87, 0.25), 0 0 60px rgba(255, 71, 87, 0.1)',
        icon: '#ff4757',
        bg: 'rgba(255, 71, 87, 0.08)',
    },
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const toast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);

        // Play notification sound if SFX is enabled
        try {
            const isSfxEnabled = localStorage.getItem('cosmicquest_sfx_enabled') !== 'false';
            if (isSfxEnabled) {
                const audio = new Audio('/assets/audio/efek/notif.mp3');
                audio.volume = 0.5;
                audio.play().catch(e => console.log('Audio error:', e));
            }
        } catch (error) {
            console.log('Could not play notification audio', error);
        }

        setTimeout(() => {
            removeToast(id);
        }, 2500);
    }, [removeToast]);

    const getIcon = (type: ToastType) => {
        const size = 20;
        switch (type) {
            case 'success': return <Check size={size} />;
            case 'warning': return <AlertTriangle size={size} />;
            case 'error': return <XCircle size={size} />;
            default: return <Info size={size} />;
        }
    };

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}

            {/* Toast Container - positioned at bottom center to not overlap dialogs */}
            <div
                style={{
                    position: 'fixed',
                    top: '1.5rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 10001,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    alignItems: 'center',
                    pointerEvents: 'none',
                    width: '100%',
                    maxWidth: '420px',
                    padding: '0 1rem',
                }}
            >
                <AnimatePresence>
                    {toasts.map((t) => {
                        const colors = TOAST_COLORS[t.type];
                        return (
                            <motion.div
                                key={t.id}
                                initial={{ opacity: 0, y: -30, scale: 0.92 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.2 } }}
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                style={{
                                    pointerEvents: 'auto',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.85rem',
                                    padding: '0.9rem 1.25rem',
                                    borderRadius: '16px',
                                    border: `2px solid ${colors.border}`,
                                    background: 'rgba(3, 6, 19, 0.92)',
                                    backdropFilter: 'blur(12px)',
                                    boxShadow: colors.glow,
                                    width: '100%',
                                    position: 'relative',
                                    overflow: 'hidden',
                                }}
                            >
                                {/* Top accent line — matches the dialog's ::before style */}
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: '2px',
                                        background: `linear-gradient(90deg, transparent, ${colors.icon}, transparent)`,
                                    }}
                                />

                                {/* Icon circle */}
                                <div
                                    style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        background: colors.bg,
                                        border: `1.5px solid ${colors.border}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: colors.icon,
                                        flexShrink: 0,
                                        filter: `drop-shadow(0 0 6px ${colors.icon}40)`,
                                    }}
                                >
                                    {getIcon(t.type)}
                                </div>

                                {/* Text */}
                                <p
                                    style={{
                                        color: '#ffffff',
                                        fontFamily: "'Orbitron', sans-serif",
                                        fontSize: '0.8rem',
                                        fontWeight: 700,
                                        letterSpacing: '1.5px',
                                        textTransform: 'uppercase',
                                        textShadow: `0 0 8px ${colors.icon}40`,
                                        margin: 0,
                                        flex: 1,
                                    }}
                                >
                                    {t.message}
                                </p>

                                {/* Auto-dismiss progress bar */}
                                <motion.div
                                    initial={{ scaleX: 1 }}
                                    animate={{ scaleX: 0 }}
                                    transition={{ duration: 2.5, ease: 'linear' }}
                                    style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        right: 0,
                                        height: '2px',
                                        background: `linear-gradient(90deg, ${colors.icon}, transparent)`,
                                        transformOrigin: 'left',
                                    }}
                                />
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};
