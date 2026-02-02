'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/context/GameContext';
import { startMiniGame, cleanupMiniGame, GameStats } from '@/lib/miniGame';

export default function GamePage(): React.JSX.Element {
    const router = useRouter();
    const { gameState, setGameState, showLoading, hideLoading } = useGame();

    const handleGameComplete = useCallback((stats: GameStats): void => {
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
        setTimeout(() => {
            // If player is eliminated, go directly to results
            if (stats.isEliminated) {
                router.push('/join/results');
            } else if (gameState.currentQuestionIndex < gameState.selectedQuestions) {
                router.push('/join/quiz');
            } else {
                router.push('/join/results');
            }
            hideLoading();
        }, 500);
    }, [gameState.currentQuestionIndex, gameState.selectedQuestions, router, setGameState, showLoading, hideLoading]);

    useEffect(() => {
        if (!gameState.selectedSpaceship) {
            router.push('/join/hangar');
            return;
        }

        const initTimeout = setTimeout(() => {
            if (gameState.selectedSpaceship) {
                startMiniGame(
                    gameState.selectedSpaceship,
                    gameState.selectedDifficulty,
                    handleGameComplete
                );
            }
        }, 600);

        return () => {
            clearTimeout(initTimeout);
            cleanupMiniGame();
        };
    }, [gameState.selectedSpaceship, gameState.selectedDifficulty, handleGameComplete, router]);

    return (
        <section id="screen-minigame" className="screen active game-fullscreen">
            <canvas id="minigame-canvas"></canvas>
        </section>
    );
}
