'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface LogoutDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function LogoutDialog({ open, onOpenChange }: LogoutDialogProps): React.JSX.Element | null {
    const [loading, setLoading] = useState(false);

    const handleLogout = async (): Promise<void> => {
        setLoading(true);
        try {
            await supabase.auth.signOut();
            localStorage.clear();
            window.location.replace('/login');
        } catch (error) {
            console.error('Logout failed:', error);
            setLoading(false);
        }
    };

    const handleClose = (): void => {
        if (!loading) {
            onOpenChange(false);
        }
    };

    if (!open) return null;

    return (
        <div className="dialog-overlay" onClick={handleClose}>
            <div className="dialog-content logout-dialog" onClick={(e) => e.stopPropagation()}>
                {/* Close Button */}
                <button className="dialog-close" onClick={handleClose} disabled={loading}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>

                {/* Icon */}
                <div className="logout-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                </div>

                {/* Title */}
                <h2 className="dialog-title">LOGOUT?</h2>

                {/* Message */}
                <p className="dialog-subtitle">
                    Are you sure you want to logout?
                </p>

                {/* Actions */}
                <div className="dialog-actions logout-actions">
                    <button
                        className="btn-dialog-cancel"
                        onClick={handleClose}
                        disabled={loading}
                    >
                        CANCEL
                    </button>
                    <button
                        className="btn-logout-confirm"
                        onClick={handleLogout}
                        disabled={loading}
                    >
                        {loading ? 'LOGOUT...' : 'LOGOUT'}
                    </button>
                </div>
            </div>
        </div>
    );
}
