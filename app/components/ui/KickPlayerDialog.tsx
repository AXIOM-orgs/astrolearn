'use client';

import React from 'react';
import { X } from 'lucide-react';

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
    if (!isOpen) return null;

    return (
        <div className="kick-dialog-overlay">
            <div className="kick-dialog-content">
                <button className="kick-dialog-close" onClick={onClose}>
                    <X size={20} />
                </button>

                <div className="kick-dialog-body">
                    <div className="kick-player-avatar">
                        {playerSpacecraft ? (
                            <img
                                src={`/assets/${playerSpacecraft}`}
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
                </div>

                <div className="kick-dialog-actions">
                    <button
                        className="btn-kick-cancel"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn-kick-confirm"
                        onClick={onConfirm}
                    >
                        Kick
                    </button>
                </div>
            </div>
        </div>
    );
}
