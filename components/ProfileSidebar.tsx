'use client';

import { useEffect, useRef } from 'react';
import { useDialog } from '@/context/AlertContext';

interface ProfileMenuProps {
    isOpen: boolean;
    onClose: () => void;
    username: string;
    onLogoutClick?: () => void;
    onSoundClick?: () => void;
}

export function ProfileMenu({ isOpen, onClose, username, onLogoutClick, onSoundClick }: ProfileMenuProps): React.JSX.Element {
    const menuRef = useRef<HTMLDivElement>(null);
    const { showInfo } = useDialog();

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent): void => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                const profileBtn = document.querySelector('.profile-indicator');
                if (profileBtn && profileBtn.contains(event.target as Node)) {
                    return;
                }
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    // Close on Escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    const handleLanguageClick = (): void => {
        showInfo('Language settings coming soon!');
        onClose();
    };

    const handleSoundClick = (): void => {
        onClose();
        if (onSoundClick) {
            onSoundClick();
        } else {
            showInfo('Sound settings coming soon!');
        }
    };

    const handleLogoutClick = (): void => {
        onClose();
        if (onLogoutClick) {
            onLogoutClick();
        }
    };

    if (!isOpen) return <></>;

    return (
        <div ref={menuRef} className="profile-menu">
            <button className="profile-menu-item" onClick={handleLanguageClick}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <span>Language</span>
            </button>

            <button className="profile-menu-item" onClick={handleSoundClick}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
                <span>Sound</span>
            </button>

            <button className="profile-menu-item logout" onClick={handleLogoutClick}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
                <span>Logout</span>
            </button>
        </div>
    );
}
