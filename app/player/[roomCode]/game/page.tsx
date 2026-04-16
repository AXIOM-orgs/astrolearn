'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useGame } from '@/context/GameContext';
import { startMiniGame, cleanupMiniGame, GameStats, preloadPhase3 } from '@/lib/miniGame';
import { supabaseGame } from '@/lib/supabase';
import { Spaceship, spaceships, DifficultyLevel } from '@/lib/data';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';
import { syncServerTime, getSyncedServerTime } from '@/lib/serverTime';

// Helper: find Spaceship object from filename (replicated from waiting page)
const findSpaceshipByFilename = (filename: string | null): Spaceship | null => {
    if (!filename) return spaceships[0];
    return spaceships.find(s => s.image.includes(filename)) || spaceships[0];
};

export default function GamePage(): React.JSX.Element {
    const t = useTranslations('MiniGame');
    const router = useRouter();
    const params = useParams();
    const roomCode = params.roomCode as string;
    const { gameState, setGameState, showLoading, hideLoading } = useGame();
    const [isInitializing, setIsInitializing] = useState(true);
    const [isGameOver, setIsGameOver] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const hasInitialized = useRef(false);

    // Session Timer State
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [sessionEndTime, setSessionEndTime] = useState<number | null>(null);

    // Bootstrap data if needed
    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        const bootstrapRequest = async () => {
            // Always fetch session time data for the timer
            try {
                const { data: sessionTimeData } = await supabaseGame
                    .from('sessions')
                    .select('started_at, total_time_minutes')
                    .eq('game_pin', roomCode)
                    .single();

                if (sessionTimeData?.started_at && sessionTimeData?.total_time_minutes) {
                    const start = new Date(sessionTimeData.started_at).getTime();
                    const end = start + sessionTimeData.total_time_minutes * 60 * 1000;
                    setSessionEndTime(end);
                }
            } catch (e) {
                console.log('Could not fetch session time:', e);
            }

            // If we have state, just verify valid spaceship
            if (gameState.selectedSpaceship && gameState.selectedDifficulty) {
                setIsInitializing(false);
                // Note: hideLoading() is called after preloadPhase3 completes, not here
                return;
            }

            try {
                showLoading();
                const participantId = localStorage.getItem('participant_id');

                if (!participantId || !roomCode) {
                    throw new Error('Missing ID or RoomCode');
                }

                // Fetch Session & Participant
                const [sessionRes, participantRes] = await Promise.all([
                    supabaseGame
                        .from('sessions')
                        .select('difficulty, started_at, total_time_minutes')
                        .eq('game_pin', roomCode)
                        .single(),
                    supabaseGame
                        .from('participants')
                        .select('spacecraft, current_question, score, eliminated, minigame') // Added eliminated and minigame
                        .eq('id', participantId)
                        .single()
                ]);

                if (sessionRes.error || !sessionRes.data || participantRes.error || !participantRes.data) {
                    throw new Error('Failed to fetch game data');
                }

                const difficulty = (sessionRes.data.difficulty || 'easy') as DifficultyLevel;
                const session = sessionRes.data;
                const participant = participantRes.data;

                // Calculate session end time for timer
                if (session.started_at && session.total_time_minutes) {
                    const start = new Date(session.started_at).getTime();
                    const end = start + session.total_time_minutes * 60 * 1000;
                    setSessionEndTime(end);
                }

                // Check if player is eliminated
                if (participant.eliminated) {
                    router.replace(`/player/${roomCode}/result`);
                    return;
                }

                // Check if player should actually be in a minigame
                // Kunjungan pertama (current_question === 0): izinkan masuk game tanpa flag minigame
                if (!participant.minigame && (participant.current_question || 0) > 0) {
                    router.replace(`/player/${roomCode}/quiz`);
                    return;
                }

                const spacecraftWithExt = participant.spacecraft;
                const spaceship = findSpaceshipByFilename(spacecraftWithExt);

                setGameState(prev => ({
                    ...prev,
                    selectedDifficulty: difficulty,
                    selectedSpaceship: spaceship || spaceships[0],
                    score: participantRes.data.score || prev.score,
                    currentQuestionIndex: participantRes.data.current_question || prev.currentQuestionIndex
                }));

            } catch (err) {
                console.error('Game bootstrap error:', err);
                hideLoading(); // Ensure loading is hidden on error
                router.replace(`/player/${roomCode}/quiz`);
            } finally {
                setIsInitializing(false);
            }
        };

        bootstrapRequest();
        return () => {
            hasInitialized.current = false;
        };

    }, [gameState.selectedSpaceship, gameState.selectedDifficulty, roomCode, router, setGameState, showLoading, hideLoading]);

    // Session Timer Countdown
    useEffect(() => {
        if (!sessionEndTime) return;

        let timerInterval: ReturnType<typeof setInterval>;

        const startTimer = async () => {
            // Sync time with server for accurate countdown
            await syncServerTime();

            timerInterval = setInterval(() => {
                const now = getSyncedServerTime();
                const remaining = Math.max(0, Math.ceil((sessionEndTime - now) / 1000));
                setTimeLeft(remaining);
            }, 1000);

            // Initial update
            const now = getSyncedServerTime();
            const remaining = Math.max(0, Math.ceil((sessionEndTime - now) / 1000));
            setTimeLeft(remaining);
        };

        startTimer();

        return () => {
            if (timerInterval) clearInterval(timerInterval);
        };
    }, [sessionEndTime]);

    // Format time as mm:ss
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };


    const handleGameComplete = useCallback(async (stats: GameStats): Promise<void> => {
        const participantId = localStorage.getItem('participant_id');

        // Clear persisted game state on completion
        localStorage.removeItem('lives');
        localStorage.removeItem('hp');

        // Optimistic Update
        setGameState(prev => ({
            ...prev,
            miniGamesCompleted: stats.success ? prev.miniGamesCompleted + 1 : prev.miniGamesCompleted,
            score: prev.score + stats.score,
            gameStats: {
                hits: stats.hits,
                asteroidsDestroyed: stats.asteroidsDestroyed,
                gameScore: stats.score,
                bossDestroyed: stats.bossDestroyed,
                success: stats.success
            },
            isEliminated: stats.isEliminated
        }));

        // RETRY: game failed but player is not eliminated — restart without touching DB
        // minigame stays true in DB while player is still in the minigame
        if (!stats.success && !stats.isEliminated) {
            localStorage.removeItem('lives');
            localStorage.removeItem('hp');

            setTimeout(() => {
                setRetryCount(prev => prev + 1);
                setIsGameOver(false);
            }, 2500);
            return;
        }

        // Game truly finished (success or eliminated) — sync with Supabase
        if (participantId) {
            try {
                const updateData: any = { minigame: false };

                if (stats.isEliminated) {
                    updateData.eliminated = true;
                    updateData.finished_at = new Date().toISOString();
                }

                await supabaseGame
                    .from('participants')
                    .update(updateData)
                    .eq('id', participantId);

            } catch (e) {
                console.error("Failed to sync status", e);
            }
        }

        // Navigating away — show global loading to cover transition
        showLoading();
        setTimeout(() => {
            if (stats.isEliminated) {
                router.replace(`/player/${roomCode}/result`);
            } else if (gameState.currentQuestionIndex < (gameState.selectedQuestions || 10)) {
                router.replace(`/player/${roomCode}/quiz`);
            } else {
                router.replace(`/player/${roomCode}/result`);
            }
            hideLoading();
        }, 500);
    }, [gameState.currentQuestionIndex, gameState.selectedQuestions, roomCode, router, setGameState, showLoading, hideLoading]);

    // Realtime Session Subscription to handle "End Game" from Host
    useEffect(() => {
        if (!roomCode) return;

        const channel = supabaseGame
            .channel(`minigame-session-${roomCode}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `game_pin=eq.${roomCode}` },
                (payload) => {
                    const newSession = payload.new;
                    if (newSession.status === 'finished') {
                        // Stop any running game loops
                        cleanupMiniGame();
                        // Clear state on abrupt end
                        localStorage.removeItem('lives');
                        localStorage.removeItem('hp');
                        router.replace(`/player/${roomCode}/result`);
                    }
                }
            )
            .subscribe();

        return () => {
            supabaseGame.removeChannel(channel);
        };
    }, [roomCode, router]);

    useEffect(() => {
        if (isInitializing) return;

        // Double check spaceship exists before starting
        if (!gameState.selectedSpaceship) {
            console.warn('[GamePage] No selected spaceship found, hiding loading.');
            hideLoading();
            return;
        }

        // Restore persisted state
        const savedLives = localStorage.getItem('lives');
        const savedHP = localStorage.getItem('hp');

        const initialLives = savedLives ? parseInt(savedLives) : undefined;
        const initialHP = savedHP ? parseInt(savedHP) : undefined;

        const handleStateChange = (lives: number, hp: number) => {
            localStorage.setItem('lives', lives.toString());
            localStorage.setItem('hp', hp.toString());
        };

        // Ensure audio & assets are loaded before starting.
        // - Normal flow (from waiting room): preloadPhase3 is already done → returns instantly
        // - Refresh on game page: loads audio now (global loading is still shown during this)
        preloadPhase3(gameState.selectedSpaceship.image).then(() => {
            if (!gameState.selectedSpaceship) return;

            hideLoading();

            const translations = {
                mobileControls: t('mobileControls'),
                desktopControls: t('desktopControls'),
                bossWarning: t('bossWarning'),
                bossApproaching: t('bossApproaching'),
                bossLabel: t('bossLabel'),
                victory: t('victory'),
                gameOver: t('gameOver'),
                tryAgain: t('tryAgain'),
                continuing: t('continuing')
            };

            startMiniGame(
                gameState.selectedSpaceship,
                gameState.selectedDifficulty || 'easy',
                handleGameComplete,
                initialLives,
                initialHP,
                handleStateChange,
                translations,
                () => setIsGameOver(true)
            );
        }).catch(err => {
            console.error('Preload failed on game page:', err);
            hideLoading();
        });

        return () => {
            cleanupMiniGame();
        };
    }, [isInitializing, gameState.selectedSpaceship, gameState.selectedDifficulty, handleGameComplete, t, retryCount, hideLoading]);



    return (
        <section id="screen-minigame" className="screen active game-fullscreen">
            {/* Logos Header */}
            {!isGameOver && (
                <header className="game-header">
                    <div className="game-brand">
                        <Link href="/">
                            <Image
                                src="/assets/logo2new.webp"
                                alt="Logo Left"
                                width={150}
                                height={50}
                                className="brand-logo-image"
                                unoptimized
                            />
                        </Link>
                    </div>
                </header>
            )}
            {/* Session Timer Overlay */}
            {timeLeft !== null && !isGameOver && (
                <div className="game-timer-overlay">
                    <div className={`game-timer-pill ${timeLeft < 10 ? 'urgent' : ''}`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <span>{formatTime(timeLeft)}</span>
                    </div>
                </div>
            )}
            <canvas id="minigame-canvas"></canvas>
        </section>
    );
}
