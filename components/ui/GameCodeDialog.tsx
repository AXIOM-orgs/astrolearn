'use client';

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface GameCodeDialogProps {
    isOpen: boolean;
    onClose: () => void;
    gameCode: string;
    joinUrl: string;
}

export function GameCodeDialog({ isOpen, onClose, gameCode, joinUrl }: GameCodeDialogProps): React.JSX.Element | null {
    const [copySuccess, setCopySuccess] = useState<boolean>(false);

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

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(joinUrl);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error('Failed to copy link:', err);
        }
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="dialog-overlay qr-overlay-dark" onClick={handleBackdropClick}>
            <div className="dialog-content qr-dialog">
                <button className="dialog-close" onClick={onClose}>
                    <span>✕</span>
                </button>

                <div className="qr-code-large">
                    <div className="qr-frame">
                        <QRCodeSVG
                            value={joinUrl}
                            size={600}
                            bgColor="#ffffff"
                            fgColor="#000000"
                            level="H"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
