'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
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

            {/* Main Content */}
            <div className="waiting-content">

                {/* Player Panel Wrapper */}
                <div className="relative">
                    {/* Title (Overlapping Border) */}
                    <h1 className="absolute -top-5 md:-top-7 left-1/2 -translate-x-1/2 text-4xl md:text-5xl font-black tracking-widest text-center drop-shadow-[0_0_15px_rgba(0,212,255,0.8)] z-20 pointer-events-none"
                        style={{
                            fontFamily: 'var(--font-orbitron)',
                            background: 'linear-gradient(180deg, #E0F7FA 0%, #00E5FF 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            textShadow: '0 4px 10px rgba(0,0,0,0.5)'
                        }}>
                        WAITING ROOM
                    </h1>

                    {/* Player Panel*/}
                    <div className="player-panel">
                    <div className="w-full bg-white/5 backdrop-blur-md border border-[#00d4ff] rounded-[20px] flex flex-col overflow-hidden">
                        <div className="waiting-panel-header flex items-center justify-start px-8 py-6 border-b border-white/10 w-full bg-white/5">
                            <div className="waiting-player-badge flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-sm text-gray-300">
                                <Users size={16} color='var(--primary-color)' />
                                <span>{fleetCapacity.current}</span>
                            </div>
                        </div>

                        {/* Player Grid */}
                        <div className="player-content p-10 w-full waiting-grid-container">
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
                            </div>
                        </div>
                    </div>
                </div>
                </div>

                {/* Refit Button - Moved outside wrapper */}
                <div className="refit-section mt-8">
                    <button
                        className="btn-refit"
                        onClick={() => setShowRefitDialog(true)}
                    >
                        <span>CHANGE ROCKET</span>
                    </button>
                </div>

                {/* Refit Dialog */}
                <DialogRocketSelect
                    isOpen={showRefitDialog}
                    onClose={() => setShowRefitDialog(false)}
                    onSelect={handleRefitSelect}
                    currentSpaceship={currentSpacecraft}
                />
            </div> {/* End Waiting Content */}
        </section>
    );
}
