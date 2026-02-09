'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Home, RotateCcw } from 'lucide-react';
import { getSessionPlayers, clearGameSession, GamePlayer } from '@/lib/gameSession';

export default function HostLeaderboardPage(): React.JSX.Element {
    const router = useRouter();
    const [players, setPlayers] = useState<GamePlayer[]>([]);

    const [visibleRanks, setVisibleRanks] = useState<number[]>([]);

    // Load players and sort by score
    useEffect(() => {
        const sessionPlayers = getSessionPlayers();
        // Sort by score descending
        const sorted = [...sessionPlayers].sort((a, b) => b.score - a.score);
        setPlayers(sorted);
    }, []);

    // Sequential animation for podium (3 -> 2 -> 1)
    useEffect(() => {
        if (players.length > 0) {
            // Reset
            setVisibleRanks([]);

            const timers: NodeJS.Timeout[] = [];

            // Rank 3 (index 2)
            if (players.length >= 3) {
                timers.push(setTimeout(() => {
                    setVisibleRanks(prev => [...prev, 3]);
                    const audio = new Audio('/sounds/reveal.mp3'); // Optional sound
                    audio.volume = 0.5;
                    audio.play().catch(() => { });
                }, 500));
            }

            // Rank 2 (index 1)
            if (players.length >= 2) {
                timers.push(setTimeout(() => {
                    setVisibleRanks(prev => [...prev, 2]);
                    const audio = new Audio('/sounds/reveal.mp3');
                    audio.volume = 0.5;
                    audio.play().catch(() => { });
                }, 1500));
            }

            // Rank 1 (index 0)
            if (players.length >= 1) {
                timers.push(setTimeout(() => {
                    setVisibleRanks(prev => [...prev, 1]);
                    const audio = new Audio('/sounds/win.mp3'); // Special sound for #1
                    audio.volume = 0.6;
                    audio.play().catch(() => { });
                }, 2500));
            }

            return () => timers.forEach(timer => clearTimeout(timer));
        }
    }, [players]);

    const handleHome = () => {
        clearGameSession();
        router.push('/');
    };

    const handleRestart = () => {
        router.push('/host/lobby');
    };

    const formatScore = (score: number): string => {
        return score.toLocaleString();
    };

    // Truncate name to first word with ellipsis if there are more words
    const truncateName = (name: string): { display: string; full: string; isTruncated: boolean } => {
        const words = name.trim().split(' ');
        if (words.length > 1) {
            return { display: `${words[0]}...`, full: name, isTruncated: true };
        }
        return { display: name, full: name, isTruncated: false };
    };

    const top3 = players.slice(0, 3);
    const remaining = players.slice(3);

    return (
        <section className="leaderboard-screen">
            {/* Header */}
            <header className="leaderboard-header">
                <div className="leaderboard-brand">
                    <img
                        src="/assets/logo2.webp"
                        alt="Astro Learning"
                        className="brand-logo-image"
                    />
                </div>
                <img
                    src="/assets/logo.webp"
                    alt="Gameforsmart Logo"
                    className="header-logo"
                />
            </header>

            {/* Floating Action Buttons */}
            <button className="floating-btn home-btn" onClick={handleHome} title="Home">
                <Home size={28} />
            </button>
            <button className="floating-btn restart-btn" onClick={handleRestart} title="Restart">
                <RotateCcw size={28} />
            </button>

            {/* The Vanguard - Podium */}
            <div className="vanguard-section">
                {/* <h2 className="vanguard-title">THE WINNER</h2> */}
                {players.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        <p>No players participated in this game.</p>
                    </div>
                ) : (
                    <div className="podium-container">
                        {/* 2nd Place - Left */}
                        {top3[1] && (
                            <div className={`podium-card silver ${visibleRanks.includes(2) ? 'visible' : 'hidden'}`}>
                                <div className="rank-badge">#2</div>
                                <div className="podium-image">
                                    {top3[1].spacecraft ? (
                                        <img src={top3[1].spacecraft.image} alt={top3[1].spacecraft.name} />
                                    ) : (
                                        <span style={{ fontSize: '3rem' }}>🚀</span>
                                    )}
                                </div>
                                <h3 className="podium-name" title={top3[1].username}>
                                    {truncateName(top3[1].username).display}
                                </h3>
                                <div className="podium-score">{formatScore(top3[1].score)}</div>
                            </div>
                        )}

                        {/* 1st Place - Center */}
                        {top3[0] && (
                            <div className={`podium-card gold center ${visibleRanks.includes(1) ? 'visible' : 'hidden'}`}>
                                <div className="rank-badge">#1</div>
                                <div className="podium-image">
                                    {top3[0].spacecraft ? (
                                        <img src={top3[0].spacecraft.image} alt={top3[0].spacecraft.name} />
                                    ) : (
                                        <span style={{ fontSize: '3.5rem' }}>🚀</span>
                                    )}
                                </div>
                                <h3 className="podium-name" title={top3[0].username}>
                                    {truncateName(top3[0].username).display}
                                </h3>
                                <div className="podium-score">{formatScore(top3[0].score)}</div>
                            </div>
                        )}

                        {/* 3rd Place - Right */}
                        {top3[2] && (
                            <div className={`podium-card bronze ${visibleRanks.includes(3) ? 'visible' : 'hidden'}`}>
                                <div className="rank-badge">#3</div>
                                <div className="podium-image">
                                    {top3[2].spacecraft ? (
                                        <img src={top3[2].spacecraft.image} alt={top3[2].spacecraft.name} />
                                    ) : (
                                        <span style={{ fontSize: '2.5rem' }}>🚀</span>
                                    )}
                                </div>
                                <h3 className="podium-name" title={top3[2].username}>
                                    {truncateName(top3[2].username).display}
                                </h3>
                                <div className="podium-score">{formatScore(top3[2].score)}</div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Rankings Table */}
            {remaining.length > 0 && (
                <div className="rankings-table-container">
                    <table className="rankings-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Player</th>
                                <th>Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {remaining.map((player, index) => (
                                <tr key={player.id}>
                                    <td className="rank-cell">#{index + 4}</td>
                                    <td className="player-cell" title={player.username}>
                                        {truncateName(player.username).display}
                                    </td>
                                    <td className="score-cell">{formatScore(player.score)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
