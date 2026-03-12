'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';

type DialogType = 'success' | 'error' | 'warning' | 'info';

interface DialogData {
    type: DialogType;
    title?: string;
    message: string;
    onClose?: () => void;
}

interface DialogContextType {
    showDialog: (type: DialogType, message: string, title?: string, onClose?: () => void) => void;
    showSuccess: (message: string, title?: string, onClose?: () => void) => void;
    showError: (message: string, title?: string, onClose?: () => void) => void;
    showWarning: (message: string, title?: string, onClose?: () => void) => void;
    showInfo: (message: string, title?: string, onClose?: () => void) => void;
    closeDialog: () => void;
}

const DialogContext = createContext<DialogContextType | null>(null);

export function useDialog() {
    const context = useContext(DialogContext);
    if (!context) {
        throw new Error('useDialog must be used within DialogProvider');
    }
    return context;
}

// Icons for different dialog types
const DialogIcons: Record<DialogType, string> = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
};

// Colors for different dialog types
const DialogColors: Record<DialogType, { accent: string; glow: string }> = {
    success: { accent: '#06ffa5', glow: 'rgba(6, 255, 165, 0.3)' },
    error: { accent: '#ff4757', glow: 'rgba(255, 71, 87, 0.3)' },
    warning: { accent: '#ffc107', glow: 'rgba(255, 193, 7, 0.3)' },
    info: { accent: '#00d4ff', glow: 'rgba(0, 212, 255, 0.3)' },
};

export function DialogProvider({ children }: { children: React.ReactNode }) {
    const [dialog, setDialog] = useState<DialogData | null>(null);
    const t = useTranslations('Common');

    const closeDialog = useCallback(() => {
        if (dialog?.onClose) dialog.onClose();
        setDialog(null);
    }, [dialog]);

    const showDialog = useCallback(
        (type: DialogType, message: string, title?: string, onClose?: () => void) => {
            setDialog({ type, message, title: title || t(type), onClose });
        },
        [t]
    );

    const showSuccess = useCallback(
        (message: string, title?: string, onClose?: () => void) => showDialog('success', message, title, onClose),
        [showDialog]
    );

    const showError = useCallback(
        (message: string, title?: string, onClose?: () => void) => showDialog('error', message, title, onClose),
        [showDialog]
    );

    const showWarning = useCallback(
        (message: string, title?: string, onClose?: () => void) => showDialog('warning', message, title, onClose),
        [showDialog]
    );

    const showInfo = useCallback(
        (message: string, title?: string, onClose?: () => void) => showDialog('info', message, title, onClose),
        [showDialog]
    );

    const colors = dialog ? DialogColors[dialog.type] : DialogColors.info;
    const icon = dialog ? DialogIcons[dialog.type] : '';

    return (
        <DialogContext.Provider value={{ showDialog, showSuccess, showError, showWarning, showInfo, closeDialog }}>
            {children}

            {/* Dialog Overlay */}
            {dialog && (
                <div
                    className="custom-dialog-overlay"
                    onClick={closeDialog}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.8)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        animation: 'dialogFadeIn 0.2s ease-out',
                    }}
                >
                    {/* Dialog Box */}
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'linear-gradient(145deg, rgba(20, 20, 40, 0.95), rgba(10, 10, 25, 0.98))',
                            border: `1px solid ${colors.accent}40`,
                            borderRadius: '16px',
                            padding: '2rem',
                            minWidth: '320px',
                            maxWidth: '420px',
                            boxShadow: `0 0 40px ${colors.glow}, 0 20px 60px rgba(0, 0, 0, 0.5)`,
                            animation: 'dialogSlideIn 0.3s ease-out',
                            textAlign: 'center',
                        }}
                    >
                        {/* Icon */}
                        <div
                            style={{
                                width: '60px',
                                height: '60px',
                                borderRadius: '50%',
                                background: `${colors.accent}20`,
                                border: `2px solid ${colors.accent}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 1.5rem',
                                fontSize: '24px',
                                color: colors.accent,
                                fontWeight: 'bold',
                            }}
                        >
                            {icon}
                        </div>

                        {/* Title */}
                        <h3
                            style={{
                                color: '#fff',
                                fontSize: '1.4rem',
                                fontWeight: 700,
                                marginBottom: '0.75rem',
                                letterSpacing: '0.5px',
                            }}
                        >
                            {dialog.title}
                        </h3>

                        {/* Message */}
                        <p
                            style={{
                                color: 'rgba(255, 255, 255, 0.7)',
                                fontSize: '1rem',
                                lineHeight: 1.6,
                                marginBottom: '2rem',
                            }}
                        >
                            {dialog.message}
                        </p>

                        {/* OK Button */}
                        <button
                            onClick={closeDialog}
                            style={{
                                background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent}99)`,
                                border: 'none',
                                borderRadius: '8px',
                                padding: '0.75rem 2.5rem',
                                color: dialog.type === 'warning' ? '#000' : '#fff',
                                fontSize: '1rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: `0 4px 15px ${colors.glow}`,
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = `0 6px 20px ${colors.glow}`;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = `0 4px 15px ${colors.glow}`;
                            }}
                        >
                            OK
                        </button>
                    </div>
                </div>
            )}

            <style jsx global>{`
                @keyframes dialogFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes dialogSlideIn {
                    from {
                        opacity: 0;
                        transform: scale(0.9) translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
            `}</style>
        </DialogContext.Provider>
    );
}
