'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { useGame } from '@/context/GameContext';
import { GameCodeDialog } from '@/app/components/ui/GameCodeDialog';
import { supabase, supabaseGame } from '@/lib/supabase';
import { syncServerTime, getSyncedServerTime } from '@/lib/serverTime';

type Participant = {
    id: string;
    nickname: string;
    spacecraft: string | null;
    joined_at: string;
};

type SessionData = {
    id: string;
    quiz_id: string;
    host_id: string;
    game_pin: string;
    status: string;
    total_time_minutes: number;
    question_limit: number;
    difficulty: string;
    countdown_started_at: string | null;
};

export default function HostLobbyPage(): React.JSX.Element {
    const router = useRouter();
    const params = useParams();
    const roomCode = params.roomCode as string;
    const { hideLoading } = useGame();

    // State
    const [session, setSession] = useState<SessionData | null>(null);
    const [quizTitle, setQuizTitle] = useState<string>('');
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [countdown, setCountdown] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [gameStarted, setGameStarted] = useState<boolean>(false);

    const [showQRDialog, setShowQRDialog] = useState<boolean>(false);
    const [copySuccess, setCopySuccess] = useState<boolean>(false);
    const [joinUrl, setJoinUrl] = useState<string>('');

    // Kick dialog state
    const [showKickDialog, setShowKickDialog] = useState<boolean>(false);
    const [selectedPlayer, setSelectedPlayer] = useState<Participant | null>(null);

    // Refs
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Sync server time on mount
    useEffect(() => {
        syncServerTime();
    }, []);

    // Set join URL on client side
    useEffect(() => {
        if (roomCode) {
            setJoinUrl(`${window.location.origin}/join/${roomCode}`);
        }
    }, [roomCode]);

    // Countdown calculation
    const calculateCountdown = useCallback((startTimestamp: string, durationSeconds: number = 10): number => {
        const start = new Date(startTimestamp).getTime();
        const now = getSyncedServerTime();
        const elapsed = (now - start) / 1000;
        return Math.max(0, Math.min(durationSeconds, Math.ceil(durationSeconds - elapsed)));
    }, []);

    // Start countdown sync
    const startCountdownSync = useCallback((startTimestamp: string, duration: number = 10) => {
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
        }

        let remaining = calculateCountdown(startTimestamp, duration);
        setCountdown(remaining);
        if (remaining <= 0) return;

        countdownIntervalRef.current = setInterval(() => {
            remaining = calculateCountdown(startTimestamp, duration);
            setCountdown(remaining);

            if (remaining <= 0) {
                clearInterval(countdownIntervalRef.current!);
                setCountdown(0);

                // Redirect to game after countdown
                setTimeout(async () => {
                    const { error } = await supabaseGame
                        .from('sessions')
                        .update({
                            status: 'active',
                            started_at: new Date(getSyncedServerTime()).toISOString(),
                            countdown_started_at: null,
                        })
                        .eq('game_pin', roomCode);

                    if (error) console.error('End countdown error:', error);
                    else router.push(`/host/${roomCode}/game`);
                }, 500);
            }
        }, 100);
    }, [roomCode, router, calculateCountdown]);

    // Stop countdown sync
    const stopCountdownSync = useCallback(() => {
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
        }
        setCountdown(0);
    }, []);

    // Fetch initial data and setup realtime
    useEffect(() => {
        if (!roomCode) return;

        let sessionSubscription: any = null;
        let participantsSubscription: any = null;

        const fetchData = async () => {
            // Fetch session
            const { data: sessionData, error: sessionError } = await supabaseGame
                .from('sessions')
                .select('id, quiz_id, host_id, game_pin, status, total_time_minutes, question_limit, difficulty, countdown_started_at')
                .eq('game_pin', roomCode)
                .single();

            if (sessionError || !sessionData) {
                console.error('Session not found:', sessionError);
                setLoading(false);
                router.push('/host');
                return;
            }

            setSession(sessionData);

            // Fetch quiz title
            const { data: quizData } = await supabase
                .from('quizzes')
                .select('title')
                .eq('id', sessionData.quiz_id)
                .single();

            if (quizData) {
                setQuizTitle(quizData.title);
            }

            // Fetch participants
            const { data: participantsData, count } = await supabaseGame
                .from('participants')
                .select('id, nickname, spacecraft, joined_at', { count: 'exact' })
                .eq('session_id', sessionData.id)
                .order('joined_at', { ascending: true })
                .limit(100);

            setParticipants(participantsData || []);
            setTotalCount(count || 0);
            setLoading(false);
            hideLoading();

            // Handle countdown if already started
            if (sessionData.countdown_started_at) {
                startCountdownSync(sessionData.countdown_started_at, 10);
            }

            // Subscribe to session changes
            sessionSubscription = supabaseGame
                .channel(`session:${roomCode}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'sessions',
                        filter: `game_pin=eq.${roomCode}`,
                    },
                    (payload) => {
                        console.log('Session updated:', payload);
                        const newSession = payload.new as SessionData;
                        setSession(newSession);

                        if (newSession.countdown_started_at) {
                            startCountdownSync(newSession.countdown_started_at, 10);
                        } else {
                            stopCountdownSync();
                        }

                        if (newSession.status === 'active') {
                            router.replace(`/host/${roomCode}/game`);
                        } else if (newSession.status === 'finished') {
                            router.replace(`/host/${roomCode}/result`);
                        }
                    }
                )
                .subscribe((status) => {
                    console.log(`Session subscription status: ${status}`);
                });

            // Subscribe to participants changes
            participantsSubscription = supabaseGame
                .channel(`participants:${roomCode}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'participants',
                        filter: `session_id=eq.${sessionData.id}`,
                    },
                    (payload) => {
                        console.log('Participant change:', payload);

                        if (payload.eventType === 'INSERT') {
                            setParticipants((prev) => {
                                if (prev.some((p) => p.id === payload.new.id)) return prev;
                                return [...prev, payload.new as Participant];
                            });
                            setTotalCount((prev) => prev + 1);
                        }
                        if (payload.eventType === 'UPDATE') {
                            setParticipants((prev) =>
                                prev.map((p) => (p.id === payload.new.id ? payload.new as Participant : p))
                            );
                        }
                        if (payload.eventType === 'DELETE') {
                            setParticipants((prev) =>
                                prev.filter((p) => p.id !== payload.old.id)
                            );
                            setTotalCount((prev) => Math.max(0, prev - 1));
                        }
                    }
                )
                .subscribe((status) => {
                    console.log(`Participants subscription status: ${status}`);
                });
        };

        fetchData();

        return () => {
            stopCountdownSync();
            if (sessionSubscription) supabaseGame.removeChannel(sessionSubscription);
            if (participantsSubscription) supabaseGame.removeChannel(participantsSubscription);
        };
    }, [roomCode, router, hideLoading, startCountdownSync, stopCountdownSync]);

    // Copy to clipboard
    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(roomCode);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    // End session
    const handleEndSession = async () => {
        if (!confirm('Are you sure you want to end this session?')) return;

        try {
            await Promise.allSettled([
                supabase.from('game_sessions').delete().eq('game_pin', roomCode),
                supabaseGame.from('sessions').delete().eq('game_pin', roomCode)
            ]);
            localStorage.removeItem('hostGamePin');
            router.push('/host');
        } catch (err) {
            console.error('Error ending session:', err);
            router.push('/host');
        }
    };

    // Start game with countdown
    const handleLaunch = async () => {
        if (participants.length === 0) {
            if (!confirm('No players have joined. Launch anyway?')) {
                return;
            }
        }

        const countdownTime = new Date(getSyncedServerTime()).toISOString();

        const { error } = await supabaseGame
            .from('sessions')
            .update({
                countdown_started_at: countdownTime,
            })
            .eq('game_pin', roomCode);

        if (error) {
            console.error('Start game error:', error);
            return;
        }

        setGameStarted(true);

        // Broadcast to all players
        const broadcastChannel = supabaseGame.channel(`room:${roomCode}`);
        await broadcastChannel.subscribe();
        await broadcastChannel.send({
            type: 'broadcast',
            event: 'countdown_start',
            payload: { countdown_started_at: countdownTime }
        });
        supabaseGame.removeChannel(broadcastChannel);
    };

    // Kick player
    const handleKickPlayer = (player: Participant) => {
        setSelectedPlayer(player);
        setShowKickDialog(true);
    };

    const confirmKick = async () => {
        if (!selectedPlayer || !session) return;

        const { error } = await supabaseGame
            .from('participants')
            .delete()
            .eq('id', selectedPlayer.id)
            .eq('session_id', session.id);

        if (error) {
            console.error('Kick error:', error);
        }

        setShowKickDialog(false);
        setSelectedPlayer(null);
    };

    // Countdown overlay
    if (countdown > 0) {
        return (
            <section className="countdown-screen">
                <div className="countdown-display">
                    <span className="countdown-number">{countdown}</span>
                    <span className="countdown-label">GET READY!</span>
                </div>
            </section>
        );
    }

    // Loading state
    if (loading) {
        return (
            <section className="host-lobby-screen">
                <div className="loading-container">
                    <span className="loading-text">Loading...</span>
                </div>
            </section>
        );
    }

    return (
        <section className="host-lobby-screen">
            {/* Header */}
            <header className="host-header">
                <div className="host-brand">
                    <div className="brand-text">
                        <h1 className="brand-title">ASTRO LEARNING</h1>
                    </div>
                </div>
                <div className="host-actions">
                    <button className="btn-end-session" onClick={handleEndSession}>
                        <span className="btn-icon">⏻</span>
                        <span>EXIT</span>
                    </button>
                    <button
                        className="btn-launch"
                        onClick={handleLaunch}
                        disabled={gameStarted}
                    >
                        <span>{gameStarted ? 'STARTING...' : 'START'}</span>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="host-lobby-content">
                {/* Left Panel - Player Grid */}
                <div className="host-left-panel">
                    <div className="panel-header">
                        <h2 className="panel-title">WAITING FOR PLAYERS</h2>
                        <div className="connected-count">
                            <span className="count-label">QUIZ:</span>
                            <span className="count-value">{quizTitle || 'Loading...'}</span>
                        </div>
                        <div className="connected-count">
                            <span className="count-label">PLAYERS:</span>
                            <span className="count-value">{totalCount}</span>
                        </div>
                        <div className="connected-count">
                            <span className="count-label">DIFFICULTY:</span>
                            <span className="count-value">{(session?.difficulty || 'medium').toUpperCase()}</span>
                        </div>
                    </div>

                    <div className="player-grid">
                        {participants.map((player) => (
                            <div key={player.id} className="player-card" onClick={() => handleKickPlayer(player)}>
                                <div className="player-icon">
                                    {player.spacecraft ? (
                                        <img
                                            src={`/assets/${player.spacecraft}`}
                                            alt={player.nickname}
                                            style={{ width: '40px', height: '30px', objectFit: 'contain' }}
                                        />
                                    ) : '🚀'}
                                </div>
                                <span className="player-name" title={player.nickname}>{player.nickname}</span>
                            </div>
                        ))}
                        {/* Empty slots */}
                        {participants.length === 0 && (
                            <div className="empty-state">
                                <span className="empty-icon">👥</span>
                                <span className="empty-text">Waiting for players to join...</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel - Game Code & QR */}
                <div className="host-right-panel">
                    <div className="game-code-section">
                        <div className="game-code-display">
                            <span className="game-code">{roomCode}</span>
                        </div>
                        <div className="code-actions">
                            <button
                                className={`btn-code-action w-full ${copySuccess ? 'success' : ''}`}
                                onClick={handleCopyCode}
                            >
                                <span>{copySuccess ? 'COPIED!' : 'COPY'}</span>
                            </button>
                        </div>
                    </div>

                    <div className="qr-section">
                        <div className="qr-container" onClick={() => setShowQRDialog(true)}>
                            <div className="qr-frame">
                                <div className="qr-corner top-left"></div>
                                <div className="qr-corner top-right"></div>
                                <div className="qr-corner bottom-left"></div>
                                <div className="qr-corner bottom-right"></div>
                                <QRCodeSVG
                                    value={joinUrl}
                                    size={160}
                                    bgColor="transparent"
                                    fgColor="#46a7bb"
                                    level="H"
                                />
                            </div>
                        </div>
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

            {/* Kick Dialog */}
            {showKickDialog && selectedPlayer && (
                <div className="dialog-overlay">
                    <div className="dialog-content">
                        <h3 className="dialog-title">Kick Player?</h3>
                        <p className="dialog-message">
                            Remove <strong>{selectedPlayer.nickname}</strong> from the game?
                        </p>
                        <div className="dialog-actions">
                            <button
                                className="btn-cancel"
                                onClick={() => setShowKickDialog(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-confirm"
                                onClick={confirmKick}
                            >
                                Kick
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
