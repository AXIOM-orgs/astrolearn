'use client';

import { useRouter, useParams } from 'next/navigation';
import { useGame } from '@/context/GameContext';
import { useDialog } from '@/context/AlertContext';
import { spaceships } from '@/lib/data';
import { useEffect, useState } from 'react';
import { supabaseGame } from '@/lib/supabase';

export default function SelectCharacterPage(): React.JSX.Element {
    const router = useRouter();
    const params = useParams();
    const roomCode = params.roomCode as string;
    const { gameState, setGameState, showLoading, hideLoading } = useGame();
    const { showError, showWarning } = useDialog();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [participantId, setParticipantId] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);

    // Load data from localStorage on mount
    useEffect(() => {
        const pId = localStorage.getItem('cosmicquest_participant_id');
        const sId = localStorage.getItem('cosmicquest_session_id');

        if (!pId || !sId) {
            showWarning('Session not found. Please join from home page.');
            router.push('/');
            return;
        }

        setParticipantId(pId);
        setSessionId(sId);
        setIsReady(true);
        hideLoading()
    }, [router, showWarning]);

    const selectSpaceship = (shipId: number): void => {
        const ship = spaceships.find(s => s.id === shipId);
        if (ship) {
            setGameState(prev => ({ ...prev, selectedSpaceship: ship }));
        }
    };

    const handleJoinAndWait = async (): Promise<void> => {
        if (!gameState.selectedSpaceship) {
            showWarning('Please select a spacecraft first!');
            return;
        }

        if (!participantId || isSubmitting) return;

        setIsSubmitting(true);
        showLoading();

        try {
            // Update participant spacecraft in Supabase
            // Store only the filename, not the full path
            const spacecraftFilename = gameState.selectedSpaceship.image.replace('/assets/', '');

            const { error } = await supabaseGame
                .from('participants')
                .update({ spacecraft: spacecraftFilename })
                .eq('id', participantId);

            if (error) {
                console.error('Update spacecraft error:', error);
                showError('Failed to save spacecraft. Please try again.');
                hideLoading();
                setIsSubmitting(false);
                return;
            }

            // Save spacecraft to localStorage for later use
            localStorage.setItem('cosmicquest_spacecraft', spacecraftFilename);

            // Navigate to player lobby
            router.push(`/player/${roomCode}/lobby`);
        } catch (err) {
            console.error('Exception:', err);
            showError('Something went wrong. Please try again.');
            hideLoading();
            setIsSubmitting(false);
        }
    };

    // Show loading while checking session
    if (!isReady) {
        return (
            <section id="screen-hangar" className="screen active">
                <div className="container">
                    <div className="glass-panel wide" style={{ textAlign: 'center', padding: '3rem' }}>
                        <p>Loading...</p>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section id="screen-hangar" className="screen active">
            <div className="container">
                <div className="glass-panel wide">
                    <h2 className="section-title" style={{ marginBottom: '1.5rem' }}>Select Your Spacecraft</h2>

                    <div className="spaceship-grid" id="spaceship-grid">
                        {spaceships.map(ship => (
                            <div
                                key={ship.id}
                                className={`spaceship-card ${gameState.selectedSpaceship?.id === ship.id ? 'selected' : ''}`}
                                onClick={() => selectSpaceship(ship.id)}
                            >
                                <img src={ship.image} alt={ship.name} className="spaceship-image" />
                                <div className="spaceship-name" style={{ color: ship.color }}>{ship.name}</div>
                            </div>
                        ))}
                    </div>

                    <button
                        className="btn-primary"
                        id="btn-start-quiz"
                        onClick={handleJoinAndWait}
                        disabled={!gameState.selectedSpaceship || isSubmitting}
                    >
                        <span>{isSubmitting ? 'Loading...' : 'Continue'}</span>
                        <div className="btn-glow"></div>
                    </button>
                </div>
            </div>
        </section>
    );
}
