'use client';

import React from 'react';

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

                <h2 className="kick-dialog-title">
                    Kick {playerNickname}?
                </h2>

                <div className="kick-dialog-actions">
                    <button
                        className="btn-kick-cancel"
                        onClick={onClose}
                    >
                        CANCEL
                    </button>
                    <button
                        className="btn-kick-confirm"
                        onClick={onConfirm}
                    >
                        KICK
                    </button>
                </div>
            </div>
        </div>
    );
}
