'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/context/GameContext';
import { useAuth } from '@/context/AuthContext';
import { useDialog } from '@/context/AlertContext';
import { getRandomSciFiName } from '@/lib/randomNames';
import { FullscreenToggle } from '@/components/FullscreenToggle';
import { ProfileMenu } from '@/components/ProfileSidebar';
import { LogoutDialog } from '@/components/LogoutDialog';
import { SoundSettingsDialog } from '@/components/SoundSettingsDialog';
import { supabaseGame } from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslations, useLocale } from 'next-intl';

const PLAYER_NAME_KEY = 'cosmicquest_player_name';
const GAME_CODE_KEY = 'cosmicquest_joined_game_code';

export default function LandingPage(): React.JSX.Element {
    const router = useRouter();
    const { setGameState, showLoading, hideLoading } = useGame();
    const { user, profile, loading } = useAuth();
    const { showWarning, showError } = useDialog();
    const t = useTranslations('ProfileSidebar');
    const te = useTranslations('Errors');
    const locale = useLocale();
    const isRtl = locale === 'ar';
    const [isJoining, setIsJoining] = useState(false);

    const [sectorCode, setSectorCode] = useState('');
    const [nickname, setNickname] = useState('');
    const [profileName, setProfileName] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
    const [isSoundDialogOpen, setIsSoundDialogOpen] = useState(false);
    const nicknameInputRef = useRef<HTMLInputElement>(null);

    // Sync Auth user with local state
    useEffect(() => {
        if (loading || !user) return;

        const displayName = profile?.nickname || profile?.fullname || profile?.username || user?.email?.split('@')[0] || '';
        setProfileName(displayName);

        // Check localStorage first
        const savedNickname = localStorage.getItem(PLAYER_NAME_KEY);
        if (savedNickname) {
            setNickname(savedNickname);
        } else {
            setNickname(displayName); // Fallback to profile name
        }

        // Check URL params
        const params = new URLSearchParams(window.location.search);
        const codeFromUrl = params.get('code');
        if (codeFromUrl) {
            setSectorCode(codeFromUrl.toUpperCase());
        }
        hideLoading();
    }, [user, profile, loading]);

    const handleNicknameChange = (value: string): void => {
        setNickname(value);
        localStorage.setItem(PLAYER_NAME_KEY, value);
    };

    const handleRandomizeName = (): void => {
        const randomName = getRandomSciFiName();
        handleNicknameChange(randomName);
        if (nicknameInputRef.current) {
            nicknameInputRef.current.focus();
        }
    };

    const executeJoinGame = async (code: string, name: string): Promise<void> => {
        if (isJoining) return;

        setIsJoining(true);
        showLoading();

        try {
            // Call Supabase RPC to join game
            const { data, error } = await supabaseGame.rpc('join_game', {
                p_room_code: code,
                p_nickname: name,
                p_user_id: profile?.id || null
            });

            if (error) {
                console.error('Join game error:', error);
                showError(te('failedJoin'));
                hideLoading();
                setIsJoining(false);
                return;
            }

            // Check for RPC-level errors
            if (data?.error) {
                switch (data.error) {
                    case 'room_not_found':
                        showError(te('invalidCode'));
                        break;
                    case 'session_locked':
                        showError(te('sessionLocked'));
                        break;
                    case 'room_full':
                        showError(te('roomFull'));
                        break;
                    default:
                        showError(te('failedJoin'));
                }
                hideLoading();
                setIsJoining(false);
                return;
            }

            // Success - save to localStorage and navigate
            localStorage.setItem(PLAYER_NAME_KEY, name);
            localStorage.setItem(GAME_CODE_KEY, code);
            localStorage.setItem('cosmicquest_participant_id', data.participant_id);
            localStorage.setItem('cosmicquest_session_id', data.session_id);
            localStorage.setItem('cosmicquest_spacecraft', data.spacecraft || '');

            // Clean up pending code
            localStorage.removeItem('pendingRoomCode');

            setGameState(prev => ({
                ...prev,
                playerName: name
            }));

            // Navigate to select character page
            router.push(`/player/${code}/waiting`);
        } catch (err) {
            console.error('Join game exception:', err);
            showError(te('somethingWrong'));
            hideLoading();
            setIsJoining(false);
        }
    };

    const autoJoinAttempted = useRef(false);
    useEffect(() => {
        if (loading || autoJoinAttempted.current) return;

        const pendingCode = localStorage.getItem("pendingRoomCode");

        // Ada pending code dan user sudah login → auto-join langsung
        if (pendingCode && user && profile?.id) {
            autoJoinAttempted.current = true;
            const nameToUse = profile.nickname || profile.fullname || user.email?.split('@')[0] || nickname;
            executeJoinGame(pendingCode, nameToUse);
        }
    }, [loading, user, profile, router, nickname]);

    const handleCreateRoom = (): void => {
        if (!nickname.trim()) {
            showWarning(t('enterNicknameWarning'));
            return;
        }

        localStorage.setItem(PLAYER_NAME_KEY, nickname);
        setGameState(prev => ({ ...prev, playerName: nickname }));

        showLoading();
        setTimeout(() => {
            router.push('/host/select-quiz');
        }, 500);
    };

    const handleLaunchMission = async (): Promise<void> => {
        if (!sectorCode.trim()) {
            showWarning(t('enterGameCodeWarning'));
            return;
        }
        if (!nickname.trim()) {
            showWarning(t('enterNicknameWarningJoin'));
            return;
        }

        await executeJoinGame(sectorCode.trim(), nickname.trim());
    };

    const toggleSidebar = (): void => {
        setIsSidebarOpen(prev => !prev);
    };

    return (
        <section className="landing-page">
            {/* Brand Logo Top Left */}
            <img src="/assets/logo.webp" className="brand-logo" alt="AstroLearn" />

            {/* Profile Indicator */}
            <button className="profile-indicator" onClick={toggleSidebar}>
                <div className="profile-info">
                    <div className="hidden md:flex items-center has-tooltip" data-tooltip={profileName} style={{ minWidth: 0, maxWidth: '140px' }}>
                        <span className="profile-name">{profileName}</span>
                    </div>
                    <div className="profile-avatar shrink-0 w-8 h-8 md:w-9 md:h-9">
                        {/* Use profile avatar or default */}
                        {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                        ) : (
                            <Avatar className="rounded-full">
                                <AvatarImage src={profile?.avatar_url} alt={profileName} />
                                <AvatarFallback className="rounded-lg">
                                    {profileName.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                </div>
                <svg className="profile-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" />
                </svg>
            </button>


            {/* Profile Menu */}
            <ProfileMenu
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                username={profileName}
                onLogoutClick={() => setIsLogoutDialogOpen(true)}
                onSoundClick={() => setIsSoundDialogOpen(true)}
            />

            {/* Logout Dialog */}
            <LogoutDialog
                open={isLogoutDialogOpen}
                onOpenChange={setIsLogoutDialogOpen}
            />

            {/* Sound Settings Dialog */}
            <SoundSettingsDialog
                open={isSoundDialogOpen}
                onOpenChange={setIsSoundDialogOpen}
            />



            {/* Main Content */}
            <div className="landing-content">
                {/* Header */}
                <header className="landing-header">
                    <img src="/assets/logo2new.webp" className="cosmic-logo" alt="AXIOM" />
                    {/* <p className="cosmic-subtitle">ENTER THE COSMIC ARENA</p> */}
                </header>

                {/* Cards Container */}
                <div className="landing-cards">
                    {/* Host Game Card */}
                    <div className="landing-card host-card">
                        <div className="card-icon host-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2L4 7v10l8 5 8-5V7l-8-5zm0 2.5l5 3.1v6.8l-5 3.1-5-3.1V7.6l5-3.1z" />
                                <path d="M12 8v8M8 12h8" />
                            </svg>
                        </div>
                        <h2 className="card-title">{t('hostTitle')}</h2>
                        <p className="card-description card-description-host">
                            {t('hostDescription')}
                        </p>
                        <button className="btn-create-room" onClick={handleCreateRoom}>
                            {t('createGame')}
                        </button>
                    </div>

                    {/* Join Race Card */}
                    <div className="landing-card join-card">
                        <div className="card-icon join-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                                <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                                <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
                                <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
                            </svg>
                        </div>
                        <h2 className="card-title">{t('joinTitle')}</h2>
                        <p className="card-description">
                            {t('joinDescription')}
                        </p>

                        <div className="input-group">
                            <input
                                type="text"
                                className="landing-input"
                                placeholder={t('gameCodePlaceholder')}
                                value={sectorCode}
                                onChange={(e) => setSectorCode(e.target.value.toUpperCase())}
                                maxLength={6}
                                dir={isRtl ? 'rtl' : 'ltr'}
                            />
                        </div>

                        {/* <div className="input-group">
                            <input
                                ref={nicknameInputRef}
                                type="text"
                                className="landing-input"
                                placeholder={t('nicknamePlaceholder')}
                                value={nickname}
                                onChange={(e) => handleNicknameChange(e.target.value)}
                                maxLength={20}
                            />
                            <button
                                className="input-icon randomize-btn"
                                onClick={handleRandomizeName}
                                title="Generate random name"
                            >
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                    <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
                                </svg>
                            </button>
                        </div> */}

                        <button className="btn-launch-mission" onClick={handleLaunchMission}>
                            {t('goMission')}
                        </button>
                    </div>
                </div>
            </div>
            {/* Fullscreen Toggle */}
            <FullscreenToggle />
        </section>
    );
}
