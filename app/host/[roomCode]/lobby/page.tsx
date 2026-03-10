'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { useGame } from '@/context/GameContext';
import { supabaseGame } from '@/lib/supabase';
import { GameCodeDialog } from '@/components/ui/GameCodeDialog';
import { ExitConfirmationDialog } from '@/components/ui/ExitConfirmationDialog';
import { CountdownOverlay } from '@/components/ui/CountdownOverlay';
import { KickPlayerDialog } from '@/components/ui/KickPlayerDialog';
import { InviteGroupsDialog } from '@/components/ui/InviteGroupsDialog';
import { InviteFriendsDialog } from '@/components/ui/InviteFriendsDialog';
import { X, Menu, Maximize, Minimize, Volume2, VolumeX, Users, UserPlus } from 'lucide-react';

interface Participant {
    id: string;
    nickname: string;
    spacecraft: string | null;
    joined_at: string;
}

interface SessionData {
    id: string;
    quiz_id: string;
    game_pin: string;
    status: string;
    countdown_started_at?: string;
}

export default function HostLobbyPage(): React.JSX.Element {
    const router = useRouter();
    const params = useParams();
    const roomCode = params.roomCode as string;
    const { showLoading, hideLoading } = useGame();

    const [session, setSession] = useState<SessionData | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [showQRDialog, setShowQRDialog] = useState<boolean>(false);
    const [showExitDialog, setShowExitDialog] = useState<boolean>(false);
    const [isStarting, setIsStarting] = useState<boolean>(false);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [copySuccess, setCopySuccess] = useState<boolean>(false);
    const [urlCopySuccess, setUrlCopySuccess] = useState<boolean>(false);
    const [joinUrl, setJoinUrl] = useState<string>('');
    const [selectedPlayerToKick, setSelectedPlayerToKick] = useState<Participant | null>(null);
    const [isAddingBots, setIsAddingBots] = useState<boolean>(false);
    const [showSettings, setShowSettings] = useState<boolean>(false);
    const [showInviteGroupsDialog, setShowInviteGroupsDialog] = useState<boolean>(false);
    const [showInviteFriendsDialog, setShowInviteFriendsDialog] = useState<boolean>(false);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
    const settingsRef = useRef<HTMLDivElement>(null);

    const prevPlayerCount = useRef<number>(0);
    const channelRef = useRef<ReturnType<typeof supabaseGame.channel> | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startY, setStartY] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);

    // Set joinUrl and load sound preference on client side
    useEffect(() => {
        setJoinUrl(`${window.location.origin}/join/${roomCode}`);

        // Load sound preference
        const savedSound = localStorage.getItem('lobbySoundEnabled');
        if (savedSound !== null) {
            setSoundEnabled(savedSound === 'true');
        }

        // Handle fullscreen changes
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        // Click outside listener for settings dropdown
        const handleClickOutside = (event: MouseEvent) => {
            if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
                setShowSettings(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [roomCode]);

    // Fetch session and participants
    useEffect(() => {
        if (!roomCode) return;

        let sessionSubscription: ReturnType<typeof supabaseGame.channel> | null = null;

        const fetchSessionAndParticipants = async () => {
            try {
                // Fetch session
                const { data: sessionData, error: sessionError } = await supabaseGame
                    .from('sessions')
                    .select('id, quiz_id, game_pin, status')
                    .eq('game_pin', roomCode)
                    .single();

                if (sessionError || !sessionData) {
                    console.error('Session not found:', sessionError);
                    setLoading(false);
                    router.push('/host/select-quiz');
                    return;
                }

                if (sessionData.status === 'active') {
                    router.replace(`/host/${roomCode}/monitor`);
                    return;
                }

                if (sessionData.status === 'finished') {
                    router.replace(`/host/${roomCode}/leaderboard`);
                    return;
                }

                setSession(sessionData);

                // Fetch initial participants
                const { data: participantsData, count } = await supabaseGame
                    .from('participants')
                    .select('id, nickname, spacecraft, joined_at', { count: 'exact' })
                    .eq('session_id', sessionData.id)
                    .order('joined_at', { ascending: true });

                setParticipants(participantsData || []);
                setTotalCount(count || 0);
                prevPlayerCount.current = count || 0;

                setLoading(false);
                hideLoading();

                // Subscribe to session changes
                sessionSubscription = supabaseGame
                    .channel(`session:${roomCode}`)
                    .on(
                        'postgres_changes',
                        {
                            event: 'UPDATE',
                            schema: 'public',
                            table: 'sessions',
                            filter: `game_pin=eq.${roomCode}`
                        },
                        (payload) => {
                            console.log('Session updated:', payload);
                            const newSession = payload.new as SessionData;
                            setSession(newSession);

                            if (newSession.status === 'active') {
                                router.replace(`/host/${roomCode}/monitor`);
                            } else if (newSession.status === 'finished') {
                                router.replace(`/host/${roomCode}/leaderboard`);
                            }
                        }
                    )
                    .subscribe();

            } catch (err) {
                console.error('Error fetching data:', err);
                setLoading(false);
                router.push('/host/select-quiz');
            }
        };

        fetchSessionAndParticipants();

        return () => {
            if (sessionSubscription) {
                supabaseGame.removeChannel(sessionSubscription);
            }
        };
    }, [roomCode, router, hideLoading]);

    // Setup realtime subscription for participants
    useEffect(() => {
        if (!session?.id) return;

        const channel = supabaseGame
            .channel(`participants:${roomCode}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'participants',
                    filter: `session_id=eq.${session.id}`
                },
                (payload) => {
                    console.log('Realtime participant change:', payload);

                    if (payload.eventType === 'INSERT') {
                        const newParticipant = payload.new as Participant;
                        setParticipants(prev => {
                            // Avoid duplicates
                            if (prev.some(p => p.id === newParticipant.id)) return prev;
                            return [...prev, newParticipant];
                        });
                        setTotalCount(prev => prev + 1);

                        // Play join sound if enabled
                        if (soundEnabled) {
                            const audio = new Audio('/sounds/join.mp3');
                            audio.volume = 0.5;
                            audio.play().catch(() => { });
                        }
                    }

                    if (payload.eventType === 'UPDATE') {
                        const updatedParticipant = payload.new as Participant;
                        setParticipants(prev =>
                            prev.map(p => p.id === updatedParticipant.id ? updatedParticipant : p)
                        );
                    }

                    if (payload.eventType === 'DELETE') {
                        const deletedId = (payload.old as { id: string }).id;
                        setParticipants(prev => prev.filter(p => p.id !== deletedId));
                        setTotalCount(prev => Math.max(0, prev - 1));
                    }
                }
            )
            .subscribe((status) => {
                console.log('Participants channel status:', status);
            });

        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabaseGame.removeChannel(channelRef.current);
            }
        };
    }, [session?.id, roomCode]);

    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(roomCode);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleEndSession = () => {
        setShowExitDialog(true);
    };

    const handleConfirmExit = async () => {
        setIsDeleting(true);
        try {
            await supabaseGame
                .from('sessions')
                .delete()
                .eq('game_pin', roomCode);

            localStorage.removeItem('hostGamePin');
            router.push('/host/select-quiz');
        } catch (err) {
            console.error('Error deleting session:', err);
            router.push('/host/select-quiz');
        } finally {
            setIsDeleting(false);
            setShowExitDialog(false);
        }
    };

    const handleKickPlayer = (player: Participant) => {
        setSelectedPlayerToKick(player);
    };

    const handleConfirmKick = async () => {
        if (!selectedPlayerToKick || !session?.id) return;

        try {
            const { error } = await supabaseGame
                .from('participants')
                .delete()
                .eq('id', selectedPlayerToKick.id);

            if (error) throw error;

            console.log(`Player ${selectedPlayerToKick.nickname} kicked`);
        } catch (err) {
            console.error('Error kicking player:', err);
        } finally {
            setSelectedPlayerToKick(null);
        }
    };

    // Countdown Logic
    const [countdownTarget, setCountdownTarget] = useState<string | null>(null);

    useEffect(() => {
        if (session?.countdown_started_at) {
            const startDate = new Date(session.countdown_started_at);
            const targetDate = new Date(startDate.getTime() + 10000); // 10 seconds
            setCountdownTarget(targetDate.toISOString());
        } else {
            setCountdownTarget(null);
        }
    }, [session?.countdown_started_at]);

    const handleLaunch = async () => {
        if (participants.length === 0 || isStarting) return;

        setIsStarting(true);

        try {
            // Start countdown by setting timestamp
            const now = new Date();
            const { error } = await supabaseGame
                .from('sessions')
                .update({
                    countdown_started_at: now.toISOString(),
                    // Status remains 'waiting' during countdown
                })
                .eq('game_pin', roomCode);

            if (error) {
                console.error('Failed to start countdown:', error);
                setIsStarting(false);
                return;
            }

            // Immediately redirect to monitor
            // Monitor page will handle the countdown display and status update to 'active'
            router.replace(`/host/${roomCode}/monitor`);

        } catch (err) {
            console.error('Error initiating launch:', err);
            setIsStarting(false);
        }
    };

    const handleAddBots = async () => {
        if (!session?.id || isAddingBots) return;

        setIsAddingBots(true);
        try {
            // Using spacecrafts from lib/data.ts (stripping /assets/ prefix)
            const spacecrafts = [
                'main_4_2_2.png',
                'galaksi2.webp',
                'galaksi3.webp',
                'galaksi4.webp',
                'galaksi5.gif',
                'galaksi6.png'
            ];
            const existingBotsCount = participants.filter(p => p.nickname.startsWith('Bot-')).length;
            const startIdx = existingBotsCount;
            const bots = Array.from({ length: 15 }, (_, i) => ({
                session_id: session.id,
                nickname: `Bot-${i + 1 + startIdx}`,
                spacecraft: spacecrafts[Math.floor(Math.random() * spacecrafts.length)],
                joined_at: new Date().toISOString()
            }));

            const { error } = await supabaseGame
                .from('participants')
                .insert(bots);

            if (error) throw error;
        } catch (err) {
            console.error('Error adding bots:', err);
        } finally {
            setIsAddingBots(false);
        }
    };

    const toggleFullscreen = async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (err) {
            console.error('Fullscreen error:', err);
        }
    };

    const toggleSound = () => {
        const newValue = !soundEnabled;
        setSoundEnabled(newValue);
        localStorage.setItem('lobbySoundEnabled', String(newValue));
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollContainerRef.current) return;
        setIsDragging(true);
        setStartY(e.pageY - scrollContainerRef.current.offsetTop);
        setScrollTop(scrollContainerRef.current.scrollTop);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollContainerRef.current) return;
        e.preventDefault();
        const y = e.pageY - scrollContainerRef.current.offsetTop;
        const walk = (y - startY) * 2; // Scroll speed
        scrollContainerRef.current.scrollTop = scrollTop - walk;
    };

    if (loading) {
        return (
            <section className="host-lobby-screen">
                <div className="flex items-center justify-center h-screen">
                    <div className="loading-spinner" />
                </div>
            </section>
        );
    }

    return (
        <section className="host-lobby-screen">
            {/* Header */}
            <header className="host-header">
                <div className="host-brand">
                    <img
                        src="/assets/logo2new.webp"
                        alt="Astro Learning"
                        className="brand-logo-image"
                    />
                </div>
                <img
                    src="/assets/logo.webp"
                    alt="Gameforsmart Logo"
                    className="header-logo hidden-mobile"
                />
            </header>

            {/* Main Content */}
            <div className="host-lobby-content">
                {/* Left Panel - Game Code & QR */}
                <div className="host-right-panel">
                    <div className="game-code-section">
                        <div className="game-code-display">
                            <span className="game-code">{roomCode}</span>
                            <button
                                className={`btn-copy-code-inline ${copySuccess ? 'success' : ''}`}
                                onClick={handleCopyCode}
                                title="Copy"
                            >
                                {copySuccess ? (
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                ) : (
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Desktop QR Section */}
                    <div className="qr-section desktop-view">
                        <div className="qr-container" onClick={() => setShowQRDialog(true)}>
                            <div className="qr-frame">
                                {/* <div className="qr-corner top-left"></div>
                                <div className="qr-corner top-right"></div>
                                <div className="qr-corner bottom-left"></div>
                                <div className="qr-corner bottom-right"></div> */}
                                <QRCodeSVG
                                    value={joinUrl}
                                    size={320}
                                    bgColor="#ffffff"
                                    fgColor="#000000"
                                    level="H"

                                />
                            </div>
                        </div>
                    </div>

                    {/* Mobile QR Section (Inline) */}
                    <div className="qr-section mobile-view-inline" style={{ display: 'none' }}>
                        <div className="qr-container flex justify-center" onClick={() => setShowQRDialog(true)}>
                            <div className="qr-frame bg-white p-2 rounded-lg" style={{ maxWidth: '280px' }}>
                                <QRCodeSVG
                                    value={joinUrl}
                                    size={250}
                                    bgColor="#ffffff"
                                    fgColor="#000000"
                                    level="H"
                                />
                            </div>
                        </div>
                    </div>

                    {/* URL Card Panel */}
                    <div className="url-card-panel">
                        <div className="url-card compact">
                            <span className="url-text">
                                {joinUrl}
                            </span>
                            <button
                                className={`url-copy-btn ${urlCopySuccess ? 'success' : ''}`}
                                onClick={() => {
                                    navigator.clipboard.writeText(joinUrl);
                                    setUrlCopySuccess(true);
                                    setTimeout(() => setUrlCopySuccess(false), 2000);
                                }}
                                title="Copy link"
                            >
                                {urlCopySuccess ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="lobby-action-bar right-panel-actions">
                        <button className="btn-end-session" onClick={handleEndSession}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12"></path>
                            </svg>
                            <span>EXIT</span>
                        </button>
                        <button
                            className={`btn-launch ${participants.length === 0 ? 'disabled' : ''}`}
                            onClick={handleLaunch}
                            disabled={participants.length === 0 || isStarting}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                            <span>{isStarting ? 'Starting...' : 'START'}</span>
                        </button>
                    </div>
                </div>

                {/* Right Panel - Player Grid */}
                <div className="host-left-panel">
                    {/* Player Count Badge */}
                    <div className="player-count-header !mb-1">
                        <div className="flex items-center gap-2">
                            <div className="player-count-badge">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                </svg>
                                <span className="font-orbitron">{totalCount} {totalCount <= 1 ? 'Player' : 'Players'}</span>
                            </div>
                            <button
                                className="btn-invite-lobby"
                                title="Invite Group"
                                onClick={() => setShowInviteGroupsDialog(true)}
                            >
                                <Users size={20} />
                            </button>
                            <button
                                className="btn-invite-lobby"
                                title="Invite Friends"
                                onClick={() => setShowInviteFriendsDialog(true)}
                            >
                                <UserPlus size={20} />
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                className={`btn-add-bots ${isAddingBots ? 'opacity-50 cursor-not-allowed' : ''}`}
                                onClick={handleAddBots}
                                disabled={isAddingBots}
                            >
                                {isAddingBots ? '...' : '+'}
                            </button>

                            {/* Settings Menu */}
                            <div className="relative" ref={settingsRef}>
                                <button
                                    className={`w-[38px] h-[38px] flex items-center justify-center bg-white/10 border border-white/20 rounded-lg text-white transition-all backdrop-blur-[10px] hover:bg-white/20 hover:border-[#00d4ff] hover:shadow-[0_0_15px_rgba(0,212,255,0.3)] ${showSettings ? 'bg-[#00d4ff] text-white border-[#00d4ff] shadow-[0_0_20px_rgba(0,212,255,0.5)]' : ''}`}
                                    onClick={() => setShowSettings(!showSettings)}
                                    title="Settings"
                                >
                                    <Menu size={20} />
                                </button>

                                {showSettings && (
                                    <div className="absolute top-[calc(100%+20px)] right-0 w-[290px] bg-[#0a0e27]/95 backdrop-blur-[24px] border border-[#00d4ff]/30 rounded-xl p-0 z-[1000] shadow-[0_25px_60px_rgba(0,0,0,0.9)] animate-in fade-in slide-in-from-top-4 duration-300 ring-1 ring-white/10 overflow-hidden">
                                        <div className="font-orbitron text-[0.9rem] font-bold text-[#00d4ff] bg-white/5 py-4 px-5 tracking-[3px] border-b border-white/10 flex items-center justify-center uppercase">
                                            SETTINGS
                                        </div>

                                        <div className="p-4 !mx-3 !my-2 flex flex-col gap-2">
                                            {/* Fullscreen Toggle */}
                                            <button
                                                className="flex items-center justify-between w-full p-4 pr-6 rounded-lg hover:bg-[#00d4ff]/10 hover:shadow-[inset_0_0_15px_rgba(0,212,255,0.1)] transition-all group"
                                                onClick={toggleFullscreen}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-white/5 text-[#00d4ff] group-hover:scale-110 transition-transform">
                                                        {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                                                    </div>
                                                    <span className="font-space-mono text-sm text-[#b8c1ec] group-hover:text-white transition-colors">Fullscreen</span>
                                                </div>
                                                <div className="text-[10px] text-[#00d4ff] font-orbitron font-bold drop-shadow-[0_0_5px_rgba(0,212,255,0.5)]">{isFullscreen ? 'ON' : 'OFF'}</div>
                                            </button>

                                            {/* Sound Toggle */}
                                            <div
                                                className="flex items-center justify-between w-full p-4 pr-6 rounded-lg hover:bg-[#00d4ff]/10 hover:shadow-[inset_0_0_15px_rgba(0,212,255,0.1)] transition-all group cursor-pointer"
                                                onClick={toggleSound}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-white/5 text-[#00d4ff] group-hover:scale-110 transition-transform">
                                                        {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                                                    </div>
                                                    <span className="font-space-mono text-sm text-[#b8c1ec] group-hover:text-white transition-colors">Sound</span>
                                                </div>

                                                {/* Premium Toggle Switch */}
                                                <div className={`relative w-12 h-6 rounded-full transition-all duration-300 flex items-center px-1 ${soundEnabled ? 'bg-[#00d4ff]' : 'bg-black/40 border border-white/10'}`}>
                                                    <div className={`w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(255,255,255,0.5)] ${soundEnabled ? 'translate-x-[24px]' : 'translate-x-0'}`}></div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Footer decoration */}
                                        <div className="h-1 bg-gradient-to-r from-transparent via-[#00d4ff]/40 to-transparent"></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Player Grid Container - Scrollable */}
                    <div
                        ref={scrollContainerRef}
                        className={`player-grid-container !pt-5 !pb-5 ${isDragging ? ' dragging' : ''}`}
                        onMouseDown={handleMouseDown}
                        onMouseLeave={handleMouseLeave}
                        onMouseUp={handleMouseUp}
                        onMouseMove={handleMouseMove}
                    >
                        {participants.length === 0 ? (
                            /* Waiting Animation */
                            <div className="waiting-animation">
                                <div className="waiting-icon">
                                    <img
                                        src="/assets/waitplayer.webp"
                                        alt="Waiting players"
                                        className="waiting-astronaut"
                                    />
                                </div>
                                <p className="waiting-text">WAITING FOR PLAYERS...</p>
                                <div className="waiting-dots">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        ) : (
                            /* Player Cards */
                            <div className="player-grid p-2">
                                {participants.map((player) => (
                                    <div key={player.id} className="player-card">
                                        <button
                                            className="btn-kick-player"
                                            onClick={() => handleKickPlayer(player)}
                                            title="Kick player"
                                        >
                                            <X size={16} />
                                        </button>
                                        <div className="player-icon">
                                            {player.spacecraft ? (
                                                <img
                                                    src={`/assets/images/characters/players/${player.spacecraft}`}
                                                    alt="spacecraft"
                                                    style={{ width: '40px', height: '30px', objectFit: 'contain' }}
                                                />
                                            ) : '🚀'}
                                        </div>
                                        <span className="player-name">{player.nickname}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* QR Dialog */}
            <GameCodeDialog
                isOpen={showQRDialog}
                onClose={() => setShowQRDialog(false)}
                gameCode={roomCode}
                joinUrl={joinUrl}
            />

            {/* Exit Confirmation Dialog */}
            <ExitConfirmationDialog
                isOpen={showExitDialog}
                onClose={() => setShowExitDialog(false)}
                onConfirm={handleConfirmExit}
            />

            <CountdownOverlay
                isActive={!!countdownTarget}
                targetDate={countdownTarget || undefined}
            />

            <KickPlayerDialog
                isOpen={!!selectedPlayerToKick}
                onClose={() => setSelectedPlayerToKick(null)}
                onConfirm={handleConfirmKick}
                playerNickname={selectedPlayerToKick?.nickname || ''}
                playerSpacecraft={selectedPlayerToKick?.spacecraft || null}
            />

            <InviteGroupsDialog
                isOpen={showInviteGroupsDialog}
                onClose={() => setShowInviteGroupsDialog(false)}
                roomCode={roomCode}
            />

            <InviteFriendsDialog
                isOpen={showInviteFriendsDialog}
                onClose={() => setShowInviteFriendsDialog(false)}
                roomCode={roomCode}
            />
        </section>
    );
}
