import React from 'react';
import { useTranslations, useLocale } from 'next-intl';

interface KickPlayerDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    playerNickname: string;
    playerSpacecraft: string | null;
}

export function KickPlayerDialog({
    isOpen,
    onClose,
    onConfirm,
    playerNickname,
    playerSpacecraft
}: KickPlayerDialogProps): React.JSX.Element | null {
    const t = useTranslations('Lobby');
    const locale = useLocale();
    const isArabic = locale === 'ar';

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
        <div className="kick-dialog-overlay">
            <div className="kick-dialog-content">
                <div className="kick-icon-wrapper">
                    {playerSpacecraft ? (
                        <img
                            src={`/assets/images/characters/players/${playerSpacecraft}`}
                            alt="spacecraft"
                            className="kick-spaceship-img"
                        />
                    ) : (
                        <span className="text-4xl">🚀</span>
                    )}
                </div>

                <h2 className="kick-dialog-title" dir={isArabic ? 'rtl' : 'ltr'}>
                    {t('kickTitle', { name: playerNickname })}
                </h2>

                <div className="kick-dialog-actions">
                    <button
                        className="btn-kick-cancel"
                        onClick={onClose}
                    >
                        {t('cancel')}
                    </button>
                    <button
                        className="btn-kick-confirm"
                        onClick={onConfirm}
                    >
                        {t('kick')}
                    </button>
                </div>
            </div>
        </div>
    );
}
