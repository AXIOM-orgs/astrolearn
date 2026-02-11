'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useGame } from '@/context/GameContext';
import { startMiniGame, cleanupMiniGame, GameStats } from '@/lib/miniGame';
import { supabaseGame } from '@/lib/supabase';
import { Spaceship, spaceships, DifficultyLevel } from '@/lib/data';

// Helper: find Spaceship object from filename (replicated from waiting page)
const findSpaceshipByFilename = (filename: string | null): Spaceship | null => {
    if (!filename) return spaceships[0];
    return spaceships.find(s => s.image.includes(filename)) || spaceships[0];
};

export default function GamePage(): React.JSX.Element {
    const router = useRouter();
    const params = useParams();
    const roomCode = params.roomCode as string;
    const { gameState, setGameState, showLoading, hideLoading } = useGame();
    const [isInitializing, setIsInitializing] = useState(true);
    const hasInitialized = useRef(false);

    // Bootstrap data if needed
    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        const bootstrapRequest = async () => {
            // If we have state, just verify valid spaceship
            if (gameState.selectedSpaceship && gameState.selectedDifficulty) {
                setIsInitializing(false);
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
                        .select('spacecraft, current_question, score') // Added score to sync
                        .eq('id', participantId)
                        .single()
                ]);

                if (sessionRes.error || !sessionRes.data || participantRes.error || !participantRes.data) {
                    throw new Error('Failed to fetch game data');
                }

                const difficulty = (sessionRes.data.difficulty || 'easy') as DifficultyLevel;
                const spacecraftWithExt = participantRes.data.spacecraft;
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
                // Fallback to hangar if critically failed, but try to avoid loops
                // If we can't load data, we probably can't play.
                router.replace(`/player/${roomCode}/quiz`); // Go back to quiz might be safer than hangar
            }
        };

        bootstrapRequest();
    }, [gameState.selectedSpaceship, gameState.selectedDifficulty, roomCode, router, setGameState, showLoading, hideLoading]);


    const handleGameComplete = useCallback(async (stats: GameStats): Promise<void> => {
        const participantId = localStorage.getItem('cosmicquest_participant_id');

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
    }, [gameState.currentQuestionIndex, gameState.selectedQuestions, gameState.score, roomCode, router, setGameState, showLoading, hideLoading]);

    useEffect(() => {
        if (isInitializing) return;

        // Double check spaceship exists before starting
        if (!gameState.selectedSpaceship) {
            // Should have been handled by bootstrap, but if here, something is wrong
            return;
        }

        const initTimeout = setTimeout(() => {
            if (gameState.selectedSpaceship) {
                startMiniGame(
                    gameState.selectedSpaceship,
                    gameState.selectedDifficulty || 'easy',
                    handleGameComplete
                );
            }
        }, 600);

        return () => {
            clearTimeout(initTimeout);
            cleanupMiniGame();
        };
    }, [isInitializing, gameState.selectedSpaceship, gameState.selectedDifficulty, handleGameComplete]);

    if (isInitializing) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#0a0e27]">
                <div className="loading-spinner text-primary" />
            </div>
        );
    }

    return (
        <section id="screen-minigame" className="screen active game-fullscreen">
            <canvas id="minigame-canvas"></canvas>
        </section>
    );
}
