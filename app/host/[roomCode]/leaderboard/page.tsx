'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getRankTitle } from '@/lib/mockPlayers';
import { getSessionPlayers, clearGameSession, GamePlayer } from '@/lib/gameSession';

export default function HostLeaderboardPage(): React.JSX.Element {
    const router = useRouter();
    const [players, setPlayers] = useState<GamePlayer[]>([]);

    // Load players and sort by score
    useEffect(() => {
        const sessionPlayers = getSessionPlayers();
        // Sort by score descending
        const sorted = [...sessionPlayers].sort((a, b) => b.score - a.score);
        setPlayers(sorted);
    }, []);

    const handleExit = () => {
        clearGameSession();
        router.push('/');
    };

    const formatScore = (score: number): string => {
        return score.toLocaleString();
    };

    const top3 = players.slice(0, 3);
    const remaining = players.slice(3);

    return (
        <section className="leaderboard-screen">
            {/* Header */}
            <header className="leaderboard-header">
                <div className="leaderboard-brand">
                    <h1 className="brand-title">ASTRO LEARNING</h1>
                </div>

                <div className="leaderboard-stats">
                    <div className="stat-item">
                        <span className="stat-label">TOTAL PLAYERS</span>
                        <span className="stat-value">{players.length}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">STATUS</span>
                        <span className="stat-value">COMPLETE</span>
                    </div>
                </div>

                <div className="header-actions">
                    <button className="btn-exit" onClick={handleExit}>EXIT</button>
                </div>
            </header>

            {/* The Vanguard - Podium */}
            <div className="vanguard-section">
                <h2 className="vanguard-title">THE WINNER</h2>

                {players.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        <p>No players participated in this game.</p>
                    </div>
                ) : (
                    <div className="podium-container">
                        {/* 2nd Place - Left */}
                        {top3[1] && (
                            <div className="podium-card silver">
                                <div className="rank-badge">#2</div>
                                <div className="podium-image">
                                    {top3[1].spacecraft ? (
                                        <img src={top3[1].spacecraft.image} alt={top3[1].spacecraft.name} />
                                    ) : (
                                        <span style={{ fontSize: '3rem' }}>🚀</span>
                                    )}
                                </div>
                                <h3 className="podium-name">{top3[1].username}</h3>
                                <div className="podium-score">{formatScore(top3[1].score)}</div>
                                <span className="podium-title">{getRankTitle(2)}</span>
                            </div>
                        )}

                        {/* 1st Place - Center */}
                        {top3[0] && (
                            <div className="podium-card gold center">
                                <div className="rank-badge">#1</div>
                                <div className="podium-image">
                                    {top3[0].spacecraft ? (
                                        <img src={top3[0].spacecraft.image} alt={top3[0].spacecraft.name} />
                                    ) : (
                                        <span style={{ fontSize: '3.5rem' }}>🚀</span>
                                    )}
                                </div>
                                <h3 className="podium-name">{top3[0].username}</h3>
                                <div className="podium-score">{formatScore(top3[0].score)}</div>
                                <span className="podium-title gold-title">{getRankTitle(1)}</span>
                            </div>
                        )}

                        {/* 3rd Place - Right */}
                        {top3[2] && (
                            <div className="podium-card bronze">
                                <div className="rank-badge">#3</div>
                                <div className="podium-image">
                                    {top3[2].spacecraft ? (
                                        <img src={top3[2].spacecraft.image} alt={top3[2].spacecraft.name} />
                                    ) : (
                                        <span style={{ fontSize: '2.5rem' }}>🚀</span>
                                    )}
                                </div>
                                <h3 className="podium-name">{top3[2].username}</h3>
                                <div className="podium-score">{formatScore(top3[2].score)}</div>
                                <span className="podium-title">{getRankTitle(3)}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Global Fleet Rankings */}
            {remaining.length > 0 && (
                <div className="rankings-section">
                    <div className="rankings-header">
                        <h3 className="rankings-title">GLOBAL FLEET RANKINGS</h3>
                        <span className="rankings-range">RANKS 4 - {players.length}</span>
                    </div>

                    <div className="rankings-grid">
                        {remaining.map((player, index) => (
                            <div key={player.id} className="ranking-card">
                                <span className="ranking-position">#{index + 4}</span>
                                <div className="ranking-icon">
                                    {player.spacecraft ? (
                                        <img src={player.spacecraft.image} alt={player.spacecraft.name} />
                                    ) : (
                                        <span>🚀</span>
                                    )}
                                </div>
                                <span className="ranking-name">{player.username}</span>
                                <span className="ranking-score">{formatScore(player.score)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}
