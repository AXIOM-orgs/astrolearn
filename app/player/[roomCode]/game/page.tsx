'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useGame } from '@/context/GameContext';
import { startMiniGame, cleanupMiniGame, GameStats } from '@/lib/miniGame';
import { supabaseGame } from '@/lib/supabase';
import { Spaceship, spaceships, DifficultyLevel } from '@/lib/data';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';

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
    const hasInitialized = useRef(false);

    // Bootstrap data if needed
    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        const bootstrapRequest = async () => {
            // If we have state, just verify valid spaceship
            if (gameState.selectedSpaceship && gameState.selectedDifficulty) {
                setIsInitializing(false);
                hideLoading();
                return;
            }

            try {
                showLoading();
                const participantId = localStorage.getItem('cosmicquest_participant_id');

                if (!participantId || !roomCode) {
                    throw new Error('Missing ID or RoomCode');
                }

                // Fetch Session & Participant
                const [sessionRes, participantRes] = await Promise.all([
                    supabaseGame
                        .from('sessions')
                        .select('difficulty')
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
                const participant = participantRes.data;

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

                setIsInitializing(false);
                hideLoading();
            } catch (err) {
                console.error('Game bootstrap error:', err);
                router.replace(`/player/${roomCode}/quiz`); // Go back to quiz might be safer than hangar
            }
        };

        bootstrapRequest();
    }, [gameState.selectedSpaceship, gameState.selectedDifficulty, roomCode, router, setGameState, showLoading, hideLoading]);


    const handleGameComplete = useCallback(async (stats: GameStats): Promise<void> => {
        const participantId = localStorage.getItem('cosmicquest_participant_id');

        // Clear persisted game state on completion
        localStorage.removeItem('cosmicquest_lives');
        localStorage.removeItem('cosmicquest_hp');

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

        showLoading();

        // Sync with Supabase
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

        setTimeout(() => {
            // Navigation Logic
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
                        localStorage.removeItem('cosmicquest_lives');
                        localStorage.removeItem('cosmicquest_hp');
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
            // Should have been handled by bootstrap, but if here, something is wrong
            return;
        }

        // Restore persisted state
        const savedLives = localStorage.getItem('cosmicquest_lives');
        const savedHP = localStorage.getItem('cosmicquest_hp');

        const initialLives = savedLives ? parseInt(savedLives) : undefined;
        const initialHP = savedHP ? parseInt(savedHP) : undefined;

        const handleStateChange = (lives: number, hp: number) => {
            localStorage.setItem('cosmicquest_lives', lives.toString());
            localStorage.setItem('cosmicquest_hp', hp.toString());
        };

        const initTimeout = setTimeout(() => {
            if (gameState.selectedSpaceship) {
                const translations = {
                    mobileControls: t('mobileControls'),
                    desktopControls: t('desktopControls'),
                    bossWarning: t('bossWarning'),
                    bossApproaching: t('bossApproaching'),
                    bossLabel: t('bossLabel'),
                    victory: t('victory'),
                    gameOver: t('gameOver'),
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
            }
        }, 600);

        return () => {
            clearTimeout(initTimeout);
            cleanupMiniGame();
        };
    }, [isInitializing, gameState.selectedSpaceship, gameState.selectedDifficulty, handleGameComplete, t]);

    if (isInitializing) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#0a0e27]">
                <div className="loading-spinner text-primary" />
            </div>
        );
    }

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
            <canvas id="minigame-canvas"></canvas>
        </section>
    );
}
