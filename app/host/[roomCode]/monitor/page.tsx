'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useGame } from '@/context/GameContext';
import { useDialog } from '@/context/AlertContext'; // Import AlertContext
import { supabaseGame, supabase } from '@/lib/supabase'; // pastikan path sesuai supabase.ts kamu
import { generateXID } from '@/lib/id-generator';
import { Users, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EndGameConfirmationDialog } from '@/components/ui/EndGameConfirmationDialog';
import { CountdownOverlay } from '@/components/ui/CountdownOverlay';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { getSpacecraftImage } from '@/lib/data';

interface Participant {
    id: string;
    nickname: string;
    spacecraft: string;
    answers: any;
    current_question?: number;
    finished_at: string | null;
    joined_at: string;
    score?: number;
    user_id?: string;
    correct?: number;
    duration?: number;
    started_at?: string;
    eliminated?: boolean;
}

interface Session {
    id: string;
    game_pin: string;
    status: string;
    question_limit: number;
    total_time_minutes: number;
    started_at: string;
    ended_at?: string;
    current_questions?: any[];
    host_id?: string;
    quiz_id?: string;
    countdown_started_at?: string;
}

export default function HostMonitorPage(): React.JSX.Element {
    const router = useRouter();
    const params = useParams();
    const gamePin = params.roomCode as string;
    const { showLoading, hideLoading } = useGame();
    const { showError } = useDialog(); // Use Dialog Hook
    const t = useTranslations('Monitor');
    const locale = useLocale();
    const isArabic = locale === 'ar';

    const [session, setSession] = useState<Session | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [totalQuestions, setTotalQuestions] = useState<number>(5);
    const [timeRemaining, setTimeRemaining] = useState<number>(300);
    const [isEndConfirmOpen, setIsEndConfirmOpen] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isScrolled, setIsScrolled] = useState(false);

    // Hitung progress & status completed
    const processedPlayers = useMemo(() => {
        return participants.map(p => {
            // Handle JSONB: sudah array, atau null/undefined/other
            const answersArray = Array.isArray(p.answers) ? p.answers : [];

            const questionsAnswered = answersArray.length;

            // Alternatif lebih akurat: pakai current_question jika ada (karena kadang lebih up-to-date)
            // const questionsAnswered = p.current_question ?? answersArray.length;

            const progress = totalQuestions > 0
                ? (questionsAnswered / totalQuestions) * 100
                : 0;

            const isCompleted = !!p.finished_at;

            return {
                ...p,
                questionsAnswered,
                progress,
                isCompleted,
                isEliminated: p.eliminated || false,
            };
        });
    }, [participants, totalQuestions]);

    // Sorting: selesai dulu, lalu progress terbanyak, lalu join paling awal
    const sortedPlayers = useMemo(() => {
        return [...processedPlayers].sort((a, b) => {
            if (a.isCompleted !== b.isCompleted) return b.isCompleted ? 1 : -1;
            if (a.questionsAnswered !== b.questionsAnswered) return b.questionsAnswered - a.questionsAnswered;
            return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
        });
    }, [processedPlayers]);

    // Timer akurat berbasis server time
    useEffect(() => {
        if (!session?.started_at) return;

        const interval = setInterval(() => {
            const start = new Date(session.started_at).getTime();
            const now = Date.now();
            const elapsedSeconds = Math.floor((now - start) / 1000);
            const remaining = Math.max(0, session.total_time_minutes * 60 - elapsedSeconds);
            setTimeRemaining(remaining);

            // Auto end jika waktu habis
            if (remaining <= 0 && session.status === 'active') {
                handleEndGame();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [session]);

    // Auto end jika semua pemain selesai
    useEffect(() => {
        const allDone = sortedPlayers.length > 0 && sortedPlayers.every(p => p.isCompleted);
        if (allDone && session?.status === 'active') {
            handleEndGame();
        }
    }, [sortedPlayers, session]);

    // Fetch initial session + participants
    useEffect(() => {
        if (!gamePin) return;

        const init = async () => {
            // Fetch session
            const { data: sess, error } = await supabaseGame
                .from('sessions')
                .select('*')
                .eq('game_pin', gamePin)
                .single();

            if (error || !sess) {
                console.error('Session tidak ditemukan', error);
                router.push('/host');
                return;
            }

            // Cek jika session masih waiting -> redirect ke lobby
            // KECUALI jika countdown sudah dimulai (status waiting tapi ada countdown_started_at)
            if (sess.status === 'waiting' && !sess.countdown_started_at) {
                router.replace(`/host/${gamePin}/lobby`);
                return;
            }

            // Cek jika session sudah selesai -> redirect ke leaderboard
            if (sess.status === 'finished') {
                router.replace(`/host/${gamePin}/leaderboard`);
                return;
            }

            setSession(sess);
            setTotalQuestions(sess.question_limit || 5);

            // Fetch participants
            const { data: parts } = await supabaseGame
                .from('participants')
                .select('*')
                .eq('session_id', sess.id)
                .order('joined_at', { ascending: true });

            if (parts) setParticipants(parts);

            hideLoading();
            setIsInitialLoading(false);
        };

        init();
    }, [gamePin, router, hideLoading]);

    // Handle Countdown to Active Transition
    useEffect(() => {
        if (session?.status === 'waiting' && session?.countdown_started_at) {
            const startDate = new Date(session.countdown_started_at);
            const targetTime = startDate.getTime() + 10000; // 10 seconds countdown
            const now = Date.now();
            const diff = targetTime - now;

            if (diff > 0) {
                const timer = setTimeout(async () => {
                    // Activate Game
                    try {
                        const { error } = await supabaseGame
                            .from('sessions')
                            .update({
                                status: 'active',
                                started_at: new Date().toISOString()
                            })
                            .eq('id', session.id);

                        if (error) console.error("Failed to activate session:", error);
                    } catch (e) {
                        console.error("Error activating session:", e);
                    }
                }, diff);

                return () => clearTimeout(timer);
            } else {
                // If time already passed, activate immediately
                const activate = async () => {
                    // Double check status to avoid loop if update failed
                    const { data } = await supabaseGame.from('sessions').select('status').eq('id', session.id).single();
                    if (data?.status === 'waiting') {
                        await supabaseGame
                            .from('sessions')
                            .update({
                                status: 'active',
                                started_at: new Date().toISOString()
                            })
                            .eq('id', session.id);
                    }
                }
                activate();
            }
        }
    }, [session]);

    // Realtime session
    useEffect(() => {
        if (!session?.id) return;

        const channel = supabaseGame
            .channel(`host-session-${gamePin}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `game_pin=eq.${gamePin}` },
                payload => {
                    setSession(payload.new as Session);
                    if (payload.new.status === 'finished') {
                        setTimeout(() => router.push(`/host/${gamePin}/leaderboard`), 1500);
                    }
                }
            )
            .subscribe();

        return () => {
            supabaseGame.removeChannel(channel);
        };
    }, [session?.id, gamePin, router]);

    // Realtime participants
    useEffect(() => {
        if (!session?.id) return;

        const channel = supabaseGame
            .channel(`host-participants-${gamePin}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'participants', filter: `session_id=eq.${session.id}` },
                payload => {
                    if (payload.eventType === 'INSERT') {
                        const newP = payload.new as Participant;
                        setParticipants(prev => [...prev, newP]);
                    } else if (payload.eventType === 'UPDATE') {
                        const updated = payload.new as Participant;
                        setParticipants(prev =>
                            prev.map(p => (p.id === updated.id ? updated : p))
                        );
                    } else if (payload.eventType === 'DELETE') {
                        setParticipants(prev => prev.filter(p => p.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabaseGame.removeChannel(channel);
        };
    }, [session?.id, gamePin]);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 20) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const syncResultsToMainSupabase = async (sessionId: string) => {
        try {
            const { data: sess } = await supabaseGame
                .from("sessions")
                .select("id, host_id, quiz_id, question_limit, total_time_minutes, current_questions, started_at, ended_at")
                .eq("id", sessionId)
                .single();

            if (!sess) throw new Error("Session tidak ditemukan");

            const totalQuestionsLimit = sess.question_limit || (sess.current_questions || []).length;

            const { data: participantsData } = await supabaseGame
                .from("participants")
                .select("id, user_id, nickname, spacecraft, score, correct, answers, duration, eliminated, current_question, finished_at")
                .eq("session_id", sessionId);

            if (!participantsData || participantsData.length === 0) return;

            // FORMAT PARTICIPANTS
            const formattedParticipants = participantsData.map(p => {
                const correctCount = p.correct || 0;
                const accuracy = totalQuestionsLimit > 0
                    ? Number(((correctCount / totalQuestionsLimit) * 100).toFixed(2))
                    : 0;

                return {
                    id: p.id,
                    user_id: p.user_id || null,
                    nickname: p.nickname,
                    spacecraft: p.spacecraft || "space1.png",
                    score: p.score || 0,
                    correct: correctCount,
                    eliminated: p.eliminated || false,
                    started: sess.started_at,
                    ended: p.finished_at,
                    total_question: totalQuestionsLimit,
                    current_question: p.current_question || 0,
                    accuracy: accuracy.toFixed(2),
                };
            });

            // FORMAT RESPONSES
            const formattedResponses = participantsData
                .filter(p => (p.answers || []).length > 0)
                .map(p => ({
                    id: generateXID(),
                    participant: p.id,
                    answers: p.answers || [],
                }));

            // INSERT KE SUPABASE UTAMA → WAJIB ADA host_id!
            const { error } = await supabase
                .from("game_sessions")
                .upsert({
                    game_pin: gamePin,
                    quiz_id: sess.quiz_id,
                    host_id: sess.host_id,
                    status: "finished",
                    application: "axiom",
                    total_time_minutes: sess.total_time_minutes || 5,
                    question_limit: totalQuestionsLimit.toString(),
                    started_at: sess.started_at,
                    ended_at: sess.ended_at,
                    participants: formattedParticipants,
                    responses: formattedResponses,
                    current_questions: sess.current_questions,
                }, { onConflict: "game_pin" });

            if (error) throw error;

            console.log("Hasil berhasil disinkronkan ke supabase utama!");
        } catch (err: any) {
            console.error("Gagal sync:", err);
        }
    };

    const handleEndGame = async () => {
        if (!session) return;
        showLoading();

        try {
            // Update session
            const { error: sessError } = await supabaseGame
                .from('sessions')
                .update({
                    status: 'finished',
                    ended_at: new Date().toISOString(),
                })
                .eq('id', session.id);

            if (sessError) throw sessError;

            // Force semua participant yang belum selesai jadi finished DAN eliminated
            const { error: partError } = await supabaseGame
                .from('participants')
                .update({
                    finished_at: new Date().toISOString(),
                    eliminated: true,
                    minigame: false
                })
                .eq('session_id', session.id)
                .is('finished_at', null);

            if (partError) throw partError;

            // SYNC TO MAIN SUPABASE
            await syncResultsToMainSupabase(session.id);

            router.push(`/host/${gamePin}/leaderboard`);
        } catch (err) {
            hideLoading();
            console.error('Gagal mengakhiri game:', err);
            showError('Gagal mengakhiri game. Coba lagi.');
        }
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        return timeStr;
    };

    // Determine if countdown is currently active
    const isCountdownActive = !!session?.countdown_started_at && session?.status === 'waiting';
    const countdownTargetDate = session?.countdown_started_at
        ? new Date(new Date(session.countdown_started_at).getTime() + 10000).toISOString()
        : undefined;

    return (
        <section className="host-monitor-screen">
            {/* Black overlay during initial loading - prevents monitor UI flash */}
            {isInitialLoading && (
                <div className="countdown-overlay" style={{ background: 'black' }} />
            )}

            {/* Countdown Overlay - takes over seamlessly from loading overlay */}
            <CountdownOverlay
                isActive={isCountdownActive}
                targetDate={countdownTargetDate}
            />

            {/* Header */}
            <header className="monitor-header">
                <div className="monitor-brand">
                    <Link href="/">
                        <img
                            src="/assets/logo2new.webp"
                            alt="Astro Learning"
                            className="brand-logo-image"
                            style={{ height: '75px', width: 'auto', objectFit: 'contain' }}
                        />
                    </Link>
                </div>
                <img
                    src="/assets/logo.webp"
                    alt="Gameforsmart Logo"
                    className="header-logo"
                />
            </header>

            {/* Title */}
            {/* <div className="monitor-title-section">
                <h2 className="monitor-title">MONITOR</h2>
            </div> */}

            {/* Monitor Info Bar */}
            <div className={`monitor-info-bar ${isScrolled ? 'scrolled' : ''}`}>
                <div className="info-item timer-central">
                    <div className="timer-display">
                        <span className={`timer-value ${timeRemaining <= 30 ? 'text-red-500 animate-pulse' : ''}`}>
                            {formatTime(timeRemaining)}
                        </span>
                    </div>
                </div>

                <div className="info-row-mobile">
                    <div className="info-item completion-status">
                        <Users />
                        <span className="info-value">{participants.length}</span>
                    </div>

                    <div className="info-item actions">
                        <button className="btn-red-3d" onClick={() => setIsEndConfirmOpen(true)}>
                            <span>{t('endButton')}</span>
                        </button>
                    </div>
                </div>
            </div>

            <EndGameConfirmationDialog
                isOpen={isEndConfirmOpen}
                onClose={() => setIsEndConfirmOpen(false)}
                onConfirm={() => {
                    setIsEndConfirmOpen(false);
                    handleEndGame();
                }}
            />

            <CountdownOverlay
                isActive={!!session?.countdown_started_at && session?.status === 'waiting'}
                targetDate={session?.countdown_started_at ? new Date(new Date(session.countdown_started_at).getTime() + 10000).toISOString() : undefined}
            />

            {/* Player Progress Grid Wrapped in Panel */}
            <div className="monitor-main-content">
                <div className="monitor-panel">
                    <div className="monitor-grid-container">
                        <div className="progress-grid">
                            {sortedPlayers.length === 0 ? (
                                <div className="empty-state" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>
                                    <p style={{ color: 'var(--text-secondary)' }}>{t('noPlayers')}</p>
                                </div>
                            ) : (
                                <AnimatePresence>
                                    {sortedPlayers.map((player) => {
                                        const isActive = !player.isCompleted && player.questionsAnswered > 0;

                                        return (
                                            <motion.div
                                                key={player.id}
                                                layout
                                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                                whileHover={{ scale: 1 }}
                                                className={`progress-card ${player.isEliminated ? 'eliminated' : (player.isCompleted ? 'completed' : '')} ${isActive ? 'animate-pulse-glow' : ''}`}
                                            >
                                                <div className="progress-card-header">
                                                    <div className="progress-bar-container">
                                                        <div
                                                            className={`progress-bar-fill ${player.isEliminated ? 'eliminated' : (player.isCompleted ? 'complete' : '')}`}
                                                            style={{ width: `${player.progress}%` }}
                                                        />
                                                    </div>
                                                    <span className="progress-indicator">
                                                        {player.questionsAnswered}/{totalQuestions}
                                                    </span>
                                                    {player.isEliminated ? (
                                                        <div className="status-overlay">
                                                            <X className="w-8 h-8 text-red-500" />
                                                        </div>
                                                    ) : player.isCompleted ? (
                                                        <div className="status-overlay">
                                                            <Check className="w-8 h-8 text-green-400" />
                                                        </div>
                                                    ) : null}
                                                </div>
                                                <div className="progress-card-body">
                                                    {player.spacecraft ? (
                                                        <img
                                                            src={getSpacecraftImage(player.spacecraft)}
                                                            alt="spacecraft"
                                                            className={`progress-spacecraft ${!player.isCompleted && !player.isEliminated ? 'animate-float' : ''}`}
                                                        />
                                                    ) : (
                                                        <div className="progress-icon">🚀</div>
                                                    )}
                                                    <div className="progress-name-wrapper has-tooltip" data-tooltip={player.nickname}>
                                                        <span className="progress-player-name">{player.nickname}</span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* CSS tambahan untuk animasi yang diminta */}
            <style jsx>{`
        .progress-card.completed {
          border: 3px solid #00ff00;
          box-shadow: 0 0 15px rgba(0, 255, 0, 0.4);
        }
        .progress-bar-fill.complete {
          background: linear-gradient(90deg, #00ff00, #00cc00);
        }
        .progress-card.eliminated {
          border: 3px solid #ff0000 !important;
          box-shadow: 0 0 15px rgba(255, 0, 0, 0.4) !important;
          background: rgba(138, 5, 5, 0.473) !important; /* Similar opacity to completed but red */
        }
        .progress-bar-fill.eliminated {
          background: linear-gradient(90deg, #ff0000, #cc0000);
        }
        .progress-card.eliminated .progress-player-name {
          color: #ff0000;
          text-shadow: 0 0 5px rgba(255, 0, 0, 0.5);
        }
        .animate-pulse-glow {
          animation: glowPulse 2s ease-in-out infinite;
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 10px rgba(0, 255, 255, 0.5); }
          50% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.8); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
        </section>
    );
}