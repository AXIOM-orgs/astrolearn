'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/context/GameContext';
import {
    getSessionPlayers,
    getGameSession,
    endGameSession,
    GamePlayer
} from '@/lib/gameSession';

export default function HostMonitorPage(): React.JSX.Element {
    const router = useRouter();
    const { gameState } = useGame();
    const [players, setPlayers] = useState<GamePlayer[]>([]);
    const [timeRemaining, setTimeRemaining] = useState<number>(300); // 5 minutes
    const [totalQuestions, setTotalQuestions] = useState<number>(10);

    // Load session info and poll for player progress
    useEffect(() => {
        const session = getGameSession();
        if (session) {
            setTotalQuestions(session.selectedQuestions);
        }

        // Poll for player progress
        const pollInterval = setInterval(() => {
            const sessionPlayers = getSessionPlayers();
            setPlayers(sessionPlayers);
        }, 1000);

        return () => clearInterval(pollInterval);
    }, []);

    // Timer countdown
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Handle game end when timer reaches 0
    useEffect(() => {
        if (timeRemaining === 0) {
            handleEndGame();
        }
    }, [timeRemaining]);

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleEndGame = () => {
        endGameSession();
        router.push('/host/leaderboard');
    };

    const completedPlayers = players.filter(p => p.progress >= 100).length;
    const fleetCapacity = `${players.length}/24`;

    return (
        <section className="host-monitor-screen">
            {/* Header */}
            <header className="monitor-header">
                <div className="monitor-brand">
                    <h1 className="brand-title">ASTRO LEARNING</h1>
                </div>

                <div className="monitor-stats-bar">
                    <div className="timer-display">
                        <span className="timer-value">{formatTime(timeRemaining)}</span>
                    </div>
                    <button className="btn-end-game" onClick={handleEndGame}>
                        <span>End Game</span>
                    </button>
                </div>
            </header>

            {/* Title */}
            <div className="monitor-title-section">
                <h2 className="monitor-title">MONITOR</h2>
                <p className="monitor-subtitle">Real-time mission tracking • {gameState.topicTitle || 'Quiz'}</p>
            </div>

            {/* Fleet Capacity Bar */}
            <div className="fleet-capacity-section">
                <div className="capacity-header">
                    <span className="capacity-label">FLEET CAPACITY</span>
                    <span className="capacity-value">{fleetCapacity}</span>
                </div>
                <div className="capacity-bar">
                    <div
                        className="capacity-fill"
                        style={{ width: `${(players.length / 24) * 100}%` }}
                    ></div>
                </div>
                <div className="capacity-stats">
                    <span>{completedPlayers} pilots completed</span>
                    <span>{players.length - completedPlayers} in progress</span>
                </div>
            </div>

            {/* Player Progress Grid */}
            <div className="progress-grid">
                {players.length === 0 ? (
                    <div className="empty-state" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>
                        <p style={{ color: 'var(--text-secondary)' }}>No players have joined yet.</p>
                    </div>
                ) : (
                    players.map((player) => (
                        <div key={player.id} className="progress-card">
                            <div className="progress-card-header">
                                <span className="progress-indicator">
                                    {player.questionsAnswered}/{totalQuestions}
                                </span>
                            </div>
                            <div className="progress-card-body">
                                {player.spacecraft ? (
                                    <img
                                        src={player.spacecraft.image}
                                        alt={player.spacecraft.name}
                                        className="progress-spacecraft"
                                    />
                                ) : (
                                    <div className="progress-icon">🚀</div>
                                )}
                                <span className="progress-player-name">{player.username}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--primary-color)' }}>
                                    Score: {player.score}
                                </span>
                            </div>
                            <div className="progress-bar-container">
                                <div
                                    className={`progress-bar-fill ${player.progress >= 100 ? 'complete' : ''}`}
                                    style={{ width: `${player.progress}%` }}
                                ></div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer */}
            <footer className="monitor-footer">
                <div className="footer-item">
                    <span className="footer-dot green"></span>
                    <span>GAME IN PROGRESS</span>
                </div>
                <div className="footer-item">
                    <span>PLAYERS: {players.length}</span>
                </div>
                <div className="footer-item">
                    <span>COMPLETED: {completedPlayers}</span>
                </div>
            </footer>
        </section>
    );
}