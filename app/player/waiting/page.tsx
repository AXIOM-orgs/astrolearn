'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/context/GameContext';
import { DialogRocketSelect } from '@/app/components/ui/DialogRocketSelect';
import { Spaceship, spaceships } from '@/lib/data';
import {
    getSessionPlayers,
    hasGameStarted,
    getCurrentPlayer,
    updatePlayerSpacecraft,
    GamePlayer
} from '@/lib/gameSession';

export default function PlayerWaitingPage(): React.JSX.Element {
    const router = useRouter();
    const { gameState, setGameState } = useGame();
    const [players, setPlayers] = useState<GamePlayer[]>([]);
    const [showRefitDialog, setShowRefitDialog] = useState<boolean>(false);
    const [currentPlayer, setCurrentPlayerState] = useState<GamePlayer | null>(null);
    const [currentSpacecraft, setCurrentSpacecraft] = useState<Spaceship | null>(
        gameState.selectedSpaceship || spaceships[0]
    );

    // Load current player and poll for updates
    useEffect(() => {
        const player = getCurrentPlayer();
        setCurrentPlayerState(player);

        // Poll for players and game status
        const pollInterval = setInterval(() => {
            // Check if game has started
            if (hasGameStarted()) {
                clearInterval(pollInterval);
                router.push('/join/quiz');
                return;
            }

            // Update player list
            const sessionPlayers = getSessionPlayers();
            setPlayers(sessionPlayers);
        }, 1000);

        return () => clearInterval(pollInterval);
    }, [router]);

    const handleRefitSelect = (ship: Spaceship) => {
        setCurrentSpacecraft(ship);
        setGameState(prev => ({ ...prev, selectedSpaceship: ship }));

        // Update in session
        if (currentPlayer) {
            updatePlayerSpacecraft(currentPlayer.id, ship);
        }
    };

    const fleetCapacity = {
        current: players.length,
        max: 24
    };

    return (
        <section className="waiting-screen">
            {/* Header */}
            <header className="waiting-header">
                <div className="waiting-brand">
                    <div className="brand-text">
                        <h1 className="brand-title">ASTRO LERNING</h1>
                    </div>
                </div>

                <div className="waiting-status">
                    <div className="status-pulse">
                        <span className="pulse-dot"></span>
                        <span className="status-text">WAITING HOST TO START</span>
                    </div>
                </div>  
            </header>

            {/* Main Content */}
            <div className="waiting-content">
                {/* Section Header */}
                <div className="section-header">
                    <div className="section-left">
                        <h2 className="section-title">WAITING FOR OTHER PLAYERS</h2>
                    </div>
                    <div className="section-right">
                        <span className="capacity-label">PLAYERS</span>
                        <div className="capacity-display">
                            <span className="capacity-current">{fleetCapacity.current.toString().padStart(2, '0')}</span>
                            <span className="capacity-separator">/</span>
                            <span className="capacity-max">{fleetCapacity.max}</span>
                            <div className="capacity-bar-mini">
                                <div
                                    className="capacity-fill-mini"
                                    style={{ width: `${(fleetCapacity.current / fleetCapacity.max) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Player Grid */}
                <div className="waiting-player-grid">
                    {players.map((player) => {
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
                                            src={player.spacecraft.image}
                                            alt={player.spacecraft.name}
                                            className="player-spacecraft-icon"
                                        />
                                    ) : '🚀'}
                                </div>
                                <span className="player-name">{player.username}</span>
                            </div>
                        );
                    })}
                    {/* Empty slots */}
                    {Array.from({ length: Math.max(0, 12 - players.length) }).map((_, i) => (
                        <div key={`empty-${i}`} className="waiting-player-card empty">
                            <span className="empty-icon">+</span>
                        </div>
                    ))}
                </div>

                {/* Refit Button */}
                <div className="refit-section">
                    <button
                        className="btn-refit"
                        onClick={() => setShowRefitDialog(true)}
                    >
                        <span>CHANGE ROCKET</span>
                    </button>
                </div>
            </div>

            {/* Refit Dialog */}
            <DialogRocketSelect
                isOpen={showRefitDialog}
                onClose={() => setShowRefitDialog(false)}
                onSelect={handleRefitSelect}
                currentSpaceship={currentSpacecraft}
            />
        </section>
    );
}
