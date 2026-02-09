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
        <div className="dialog-overlay" onClick={handleBackdropClick}>
            <div className="dialog-content qr-dialog">
                <button className="dialog-close" onClick={onClose}>
                    <span>✕</span>
                </button>

                <div className="qr-code-large">
                    <div className="qr-code-frame">
                        <div className="qr-corner top-left"></div>
                        <div className="qr-corner top-right"></div>
                        <div className="qr-corner bottom-left"></div>
                        <div className="qr-corner bottom-right"></div>
                        <QRCodeSVG
                            value={joinUrl}
                            size={435}
                            bgColor="transparent"
                            fgColor="#00d4ff"
                            level="H"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
