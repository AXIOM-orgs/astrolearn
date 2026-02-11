'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/context/GameContext';
import { clearCurrentPlayer, getSessionPlayers, getCurrentPlayer } from '@/lib/gameSession';

export default function JoinResultsPage(): React.JSX.Element {
    const router = useRouter();
    const { gameState, resetGame, showLoading, hideLoading } = useGame();
    const [actualRank, setActualRank] = useState<number>(1);

    // Hide loading overlay when results page loads
    useEffect(() => {
        hideLoading();
    }, [hideLoading]);

    // Calculate actual rank from session players
    useEffect(() => {
        const currentPlayer = getCurrentPlayer();
        if (currentPlayer) {
            const allPlayers = getSessionPlayers();
            // Sort by score descending
            const sorted = [...allPlayers].sort((a, b) => b.score - a.score);
            // Find current player's rank
            const rank = sorted.findIndex(p => p.id === currentPlayer.id) + 1;
            setActualRank(rank > 0 ? rank : 1);
        }
    }, []);

    // Redirect if no player name
    useEffect(() => {
        if (!gameState.playerName) {
            router.push('/');
        }
    }, [gameState.playerName, router]);

    const handleRestart = (): void => {
        clearCurrentPlayer();
        localStorage.removeItem('cosmicquest_joined_game_code');
        resetGame();
        showLoading();
        setTimeout(() => {
            router.push('/');
            hideLoading();
        }, 500);
    };

    // Calculate score per correct answer based on selected questions
    const getScorePerQuestion = (): number => {
        switch (gameState.selectedQuestions) {
            case 5: return 20;
            case 10: return 10;
            case 20: return 5;
            default: return 10;
        }
    };

    const scorePerQuestion = getScorePerQuestion();
    const quizScore = gameState.correctAnswers * scorePerQuestion;

    // Get ordinal suffix for rank
    const getOrdinal = (n: number): string => {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return s[(v - 20) % 10] || s[v] || s[0];
    };

    return (
        <section id="screen-results" className="screen active">
            <div className="results-wrapper">
                {/* Top Card: Spaceship + Pilot Name */}
                <div className="result-top-card">
                    {gameState.selectedSpaceship?.image && (
                        <img
                            src={gameState.selectedSpaceship.image}
                            alt="Spaceship"
                            id="result-character-img"
                            className="result-spaceship-img"
                        />
                    )}
                    <div className="result-top-info">
                        <p className="result-pilot-name" id="result-name-display">{gameState.playerName || '-'}</p>
                        <p className="result-ship-name" id="result-ship">{gameState.selectedSpaceship?.name || '-'}</p>
                    </div>
                </div>

                {/* Eliminated Banner */}
                {gameState.isEliminated && (
                    <div className="eliminated-banner" style={{
                        background: 'linear-gradient(135deg, #ff0044, #cc0033)',
                        color: '#ffffff',
                        padding: '15px 30px',
                        borderRadius: '12px',
                        textAlign: 'center',
                        marginBottom: '10px',
                        boxShadow: '0 4px 20px rgba(255, 0, 68, 0.4)'
                    }}>
                        <span style={{ fontSize: '20px', fontWeight: 'bold', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                            TERELIMINASI 
                        </span>
                    </div>
                )}

                <div className="result-stats-row">
                    <div className="result-stat-card rank-card">
                        <div className="rank-display">
                            <span className="trophy-icon">🏆</span>
                            <span className="result-stat-value rank-value">
                                {gameState.isEliminated ? '-' : <>{actualRank}<sup>{getOrdinal(actualRank)}</sup></>}
                            </span>
                        </div>
                        <span className="result-stat-label">{gameState.isEliminated ? 'Eliminated' : 'Rank'}</span>
                    </div>
                    <div className="result-stat-card">
                        <span className="result-stat-value" id="result-score">{quizScore}</span>
                        <span className="result-stat-label">Score</span>
                    </div>
                    <div className="result-stat-card">
                        <span className="result-stat-value">
                            <span id="result-correct">{gameState.correctAnswers}</span>/<span id="result-total">{gameState.selectedQuestions}</span>
                        </span>
                        <span className="result-stat-label">Correct</span>
                    </div>
                </div>

                {/* Home Button */}
                <button className="btn-home" onClick={handleRestart}>
                    <span>HOME</span>
                </button>
            </div>
        </section>
    );
}
