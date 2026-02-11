'use client';

import React from 'react';

interface ExitConfirmationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export function ExitConfirmationDialog({ isOpen, onClose, onConfirm }: ExitConfirmationDialogProps): React.JSX.Element | null {
    if (!isOpen) return null;

    return (
        <div className="exit-dialog-overlay">
            <div className="exit-dialog-content">
                <div className="exit-icon-wrapper">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                </div>

                <h2 className="exit-dialog-title">EXIT</h2>
                <p className="exit-dialog-message">
                    Are you sure you want to end this game session?<br />
                </p>

                <div className="exit-dialog-actions">
                    <button
                        className="btn-dialog-cancel"
                        onClick={onClose}
                    >
                        CANCEL
                    </button>
                    <button
                        className="btn-dialog-confirm-exit"
                        onClick={onConfirm}
                    >
                        {/* <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg> */}
                        EXIT
                    </button>
                </div>
            </div>
        </div>
    );
}
