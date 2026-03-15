'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

interface EndGameConfirmationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export function EndGameConfirmationDialog({ isOpen, onClose, onConfirm }: EndGameConfirmationDialogProps): React.JSX.Element | null {
    const t = useTranslations('Monitor');

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="exit-dialog-overlay"> {/* gunakan class yang sama agar styling konsisten */}
            <div className="exit-dialog-content">
                <div className="exit-icon-wrapper">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                </div>

                <h2 className="exit-dialog-title">{t('endDialogTitle')}</h2>
                <p className="exit-dialog-message">
                    {t('endDialogMessage')}
                </p>

                <div className="exit-dialog-actions">
                    <button className="btn-dialog-cancel" onClick={onClose}>
                        {t('cancel')}
                    </button>
                    <button className="btn-dialog-confirm-exit" onClick={onConfirm}>
                        {t('end')}
                    </button>
                </div>
            </div>
        </div>
    );
}