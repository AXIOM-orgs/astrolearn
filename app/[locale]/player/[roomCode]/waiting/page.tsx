'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Users, LogOut } from 'lucide-react';
import { useGame } from '@/context/GameContext';
import { supabaseGame } from '@/lib/supabase';
import { DialogRocketSelect } from '@/components/ui/DialogRocketSelect';
import { ExitConfirmationDialog } from '@/components/ui/ExitConfirmationDialog';
import { CountdownOverlay } from '@/components/ui/CountdownOverlay';
import { Spaceship, spaceships } from '@/lib/data';
import { Link } from '@/i18n/routing';

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
    started_at?: string;
}

interface CurrentPlayer {
    id: string | null;
    nickname: string;
    spacecraft: string | null;
}

// Helper: find Spaceship object from filename
const findSpaceshipByFilename = (filename: string | null): Spaceship | null => {
    if (!filename) return spaceships[0];
    return spaceships.find(s => s.image.includes(filename)) || spaceships[0];
};

// Helper: extract filename from Spaceship image path
const getFilenameFromSpaceship = (ship: Spaceship): string => {
    return ship.image.replace('/assets/', '');
};

export default function PlayerWaitingPage(): React.JSX.Element {
    const router = useRouter();
    const params = useParams();
    const roomCode = params.roomCode as string;
    const { showLoading, hideLoading } = useGame();

    const [session, setSession] = useState<SessionData | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [showRefitDialog, setShowRefitDialog] = useState<boolean>(false);
    const [showExitDialog, setShowExitDialog] = useState<boolean>(false);
    const [currentPlayer, setCurrentPlayer] = useState<CurrentPlayer>({
        id: null,
        nickname: '',
        spacecraft: null
    });
    const [currentSpaceship, setCurrentSpaceship] = useState<Spaceship | null>(spaceships[0]);

    const hasBootstrapped = useRef(false);
    const isRedirecting = useRef(false);

    // Bootstrap: Fetch session & participants, setup realtime
    useEffect(() => {
        if (hasBootstrapped.current || !roomCode) return;
        hasBootstrapped.current = true;

        let sessionChannel: ReturnType<typeof supabaseGame.channel> | null = null;

        const bootstrap = async () => {
            setLoading(true);

            // Fetch session
            const { data: fetchedSession, error: sessionErr } = await supabaseGame
                .from('sessions')
                .select('id, quiz_id, game_pin, status, countdown_started_at, started_at')
                .eq('game_pin', roomCode)
                .single();

            if (sessionErr || !fetchedSession) {
                console.error('Session not found');
                router.replace('/');
                return;
            }

            setSession(fetchedSession);

            // If already active OR countdown started, redirect to game
            if (fetchedSession.status === 'active' || (fetchedSession.status === 'waiting' && fetchedSession.countdown_started_at)) {
                if (!isRedirecting.current) {
                    isRedirecting.current = true;
                    showLoading();
                    router.replace(`/player/${roomCode}/quiz`);
                }
                return;
            } else if (fetchedSession.status === 'finished') {
                router.replace(`/player/${roomCode}/result`);
                return;
            }

            // Fetch all participants
            const { data: fetchedParticipants, count } = await supabaseGame
                .from('participants')
                .select('id, nickname, spacecraft, joined_at', { count: 'exact' })
                .eq('session_id', fetchedSession.id)
                .order('joined_at', { ascending: true });

            setParticipants(fetchedParticipants || []);
            setTotalCount(count || 0);

            // Find current player from localStorage
            const myParticipantId = localStorage.getItem('cosmicquest_participant_id') || '';
            const me = (fetchedParticipants || []).find((p) => p.id === myParticipantId);

            if (!me) {
                console.warn('Participant not found in session');
                localStorage.removeItem('cosmicquest_participant_id');
                localStorage.removeItem('cosmicquest_session_id');
                router.replace('/');
                return;
            }

            setCurrentPlayer({
                id: me.id,
                nickname: me.nickname,
                spacecraft: me.spacecraft || '/assets/images/characters/players/galaksi2.webp'
            });

            // Set current spaceship object
            setCurrentSpaceship(findSpaceshipByFilename(me.spacecraft));

            // Session realtime subscription
            sessionChannel = supabaseGame
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
                        const newSession = payload.new as SessionData;
                        setSession(newSession);

                        if (newSession.status === 'active' || (newSession.status === 'waiting' && newSession.countdown_started_at)) {
                            if (!isRedirecting.current) {
                                isRedirecting.current = true;
                                showLoading();
                                router.replace(`/player/${roomCode}/quiz`);
                            }
                        } else if (newSession.status === 'finished') {
                            router.replace(`/player/${roomCode}/result`);
                        }
                    }
                )
                .subscribe();

            setLoading(false);
            hideLoading();
        };

        bootstrap();

        return () => {
            if (sessionChannel) {
                supabaseGame.removeChannel(sessionChannel);
            }
        };
    }, [roomCode, router, showLoading, hideLoading]);

    // Participants realtime subscription
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
                        setParticipants(prev => {
                            if (prev.some(p => p.id === (payload.new as Participant).id)) return prev;
                            return [...prev, payload.new as Participant];
                        });
                        setTotalCount(prev => prev + 1);
                    }

                    if (payload.eventType === 'UPDATE') {
                        setParticipants(prev =>
                            prev.map(p => p.id === (payload.new as Participant).id ? payload.new as Participant : p)
                        );
                    }

                    if (payload.eventType === 'DELETE') {
                        const deletedId = (payload.old as { id: string }).id;
                        setParticipants(prev => prev.filter(p => p.id !== deletedId));
                        setTotalCount(prev => Math.max(0, prev - 1));

                        // If current player was kicked
                        const myId = localStorage.getItem('cosmicquest_participant_id');
                        if (deletedId === myId) {
                            console.warn('You have been kicked from the session');
                            showLoading();

                            // Clear local storage immediately
                            localStorage.removeItem('cosmicquest_participant_id');
                            localStorage.removeItem('cosmicquest_session_id');
                            localStorage.removeItem('cosmicquest_spacecraft');

                            // Delay redirection for visual "loading" effect as requested
                            setTimeout(() => {
                                router.push('/');
                                hideLoading();
                            }, 1500);
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabaseGame.removeChannel(channel);
        };
    }, [session?.id, roomCode, router, showLoading]);

    // Handle exit game
    const handleExit = async () => {
        if (!currentPlayer.id) return;

        showLoading();
        const { error } = await supabaseGame
            .from('participants')
            .delete()
            .eq('id', currentPlayer.id);

        if (error) {
            console.error('Error exiting session:', error);
        }

        localStorage.removeItem('cosmicquest_participant_id');
        localStorage.removeItem('cosmicquest_session_id');
        localStorage.removeItem('cosmicquest_spacecraft');
        router.push('/');
        hideLoading();
        setShowExitDialog(false);
    };

    // Handle spacecraft change using DialogRocketSelect
    const handleSpacecraftSelect = async (ship: Spaceship) => {
        if (!currentPlayer.id) return;

        const spacecraftFilename = getFilenameFromSpaceship(ship);

        // Optimistic update
        setCurrentSpaceship(ship);
        setCurrentPlayer(prev => ({ ...prev, spacecraft: spacecraftFilename }));
        setParticipants(prev =>
            prev.map(p => p.id === currentPlayer.id ? { ...p, spacecraft: spacecraftFilename } : p)
        );
        setShowRefitDialog(false);

        // Update in database
        const { error } = await supabaseGame
            .from('participants')
            .update({ spacecraft: spacecraftFilename })
            .eq('id', currentPlayer.id);

        if (error) {
            console.error('Error updating spacecraft:', error);
        }
    };

    // Sort participants: current user first
    const sortedParticipants = [...participants].sort((a, b) => {
        if (a.id === currentPlayer.id) return -1;
        if (b.id === currentPlayer.id) return 1;
        return 0;
    });

    if (loading) {
        return (
            <section className="waiting-screen">
                <div className="flex items-center justify-center h-screen">
                    <div className="loading-spinner" />
                </div>
            </section>
        );
    }

    return (
        <section className="waiting-screen">
            {/* Header */}
            <header className="waiting-header">
                <div className="waiting-brand">
                    <Link href="/">
                        <img
                            src="/assets/logo2new.webp"
                            alt="Astro Learning"
                            className="brand-logo-image"
                        />
                    </Link>
                </div>
                <img
                    src="/assets/logo.webp"
                    alt="Gameforsmart Logo"
                    className="header-logo hidden-mobile"
                />
            </header>

            {/* Main Content */}
            <div className="waiting-content">

                {/* Player Panel Wrapper */}
                <div className="relative">
                    {/* Title (Overlapping Border)
                    <h1 className="absolute -top-5 md:-top-7 left-1/2 -translate-x-1/2 text-4xl md:text-5xl font-black tracking-widest text-center drop-shadow-[0_0_15px_rgba(0,212,255,0.8)] z-20 pointer-events-none"
                        style={{
                            fontFamily: 'var(--font-orbitron)',
                            background: 'linear-gradient(180deg, #E0F7FA 0%, #00E5FF 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            textShadow: '0 4px 10px rgba(0,0,0,0.5)'
                        }}>
                        WAITING ROOM
                    </h1> */}

                    {/* Player Panel*/}
                    <div className="player-panel">
                        <div className="w-full bg-white/5 backdrop-blur-md border border-[#00d4ff] rounded-[20px] flex flex-col">
                            <div className="waiting-panel-header flex items-center justify-start px-8 py-6 border-b border-white/10 w-full bg-white/5">
                                <div className="waiting-player-badge flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-sm text-gray-300">
                                    <Users size={16} color='var(--primary-color)' />
                                    <span>{totalCount}</span>
                                </div>
                            </div>

                            {/* Player Grid */}
                            <div className="player-content p-10 w-full waiting-grid-container">
                                <div className="waiting-player-grid">
                                    {sortedParticipants.map((player) => {
                                        const isCurrentUser = currentPlayer?.id === player.id;
                                        return (
                                            <div
                                                key={player.id}
                                                className={`waiting-player-card ${isCurrentUser ? 'current-user' : ''}`}
                                            >
                                                {isCurrentUser && (
                                                    <div className="you-badge">YOU</div>
                                                )}
                                                <div className="player-icon">
                                                    {player.spacecraft ? (
                                                        <img
                                                            src={`/assets/images/characters/players/${player.spacecraft}`}
                                                            alt="spacecraft"
                                                            className="player-spacecraft-icon"
                                                        />
                                                    ) : '🚀'}
                                                </div>
                                                <div className="waiting-name-wrapper has-tooltip" data-tooltip={player.nickname}>
                                                    <span className="player-name">{player.nickname}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="refit-section mt-8 flex gap-4 justify-center">
                    <button
                        className="btn-exit-player"
                        onClick={() => setShowExitDialog(true)}
                        title="Exit Game"
                    >
                        <LogOut size={24} style={{ transform: 'rotate(180deg)' }} />
                    </button>
                    <button
                        className="btn-refit"
                        onClick={() => setShowRefitDialog(true)}
                    >
                        <span>CHANGE ROCKET</span>
                    </button>
                </div>

                {/* Original DialogRocketSelect */}
                <DialogRocketSelect
                    isOpen={showRefitDialog}
                    onClose={() => setShowRefitDialog(false)}
                    onSelect={handleSpacecraftSelect}
                    currentSpaceship={currentSpaceship}
                />

                {/* Exit Confirmation Dialog */}
                <ExitConfirmationDialog
                    isOpen={showExitDialog}
                    onClose={() => setShowExitDialog(false)}
                    onConfirm={handleExit}
                />
            </div>

            <CountdownOverlay
                isActive={!!session?.countdown_started_at}
                targetDate={session?.countdown_started_at ? new Date(new Date(session.countdown_started_at).getTime() + 10000).toISOString() : undefined}
            />
        </section>
    );
}
