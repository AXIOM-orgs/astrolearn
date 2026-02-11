'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Home, RotateCcw } from 'lucide-react';
import { supabaseGame } from '@/lib/supabase'; // pastikan path sesuai
import { useGame } from '@/context/GameContext';

interface Participant {
  id: string;
  nickname: string;
  spacecraft: string;
  score: number;
  duration: number | null;
  finished_at: string | null;
  joined_at: string;
}

export default function HostLeaderboardPage(): React.JSX.Element {
  const router = useRouter();
  const params = useParams();
  const gamePin = params.roomCode as string;
  const { showLoading, hideLoading } = useGame();

  const [players, setPlayers] = useState<Participant[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [visibleRanks, setVisibleRanks] = useState<number[]>([]);

  // Fetch session + participants yang sudah selesai
  useEffect(() => {
    if (!gamePin) return;

    const init = async () => {
      // Ambil session untuk dapatkan ID
      const { data: sess } = await supabaseGame
        .from('sessions')
        .select('id')
        .eq('game_pin', gamePin)
        .single();

      if (!sess) {
        router.push('/host');
        return;
      }

      setSessionId(sess.id);

      // Ambil participants yang sudah finished
      const { data: parts } = await supabaseGame
        .from('participants')
        .select('id, nickname, spacecraft, score, duration, finished_at, joined_at')
        .eq('session_id', sess.id)
        .not('finished_at', 'is', null)
        .order('score', { ascending: false });

      if (parts) {
        setPlayers(parts);
      }

      hideLoading();
    };

    init();
  }, [gamePin, router]);

  // Realtime update participants (jika ada yang baru selesai setelah leaderboard dibuka)
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabaseGame
      .channel(`leaderboard-${gamePin}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participants', filter: `session_id=eq.${sessionId}` },
        payload => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const p = payload.new as Participant;
            if (p.finished_at) {
              setPlayers(prev => {
                const filtered = prev.filter(x => x.id !== p.id);
                const updated = [...filtered, p];
                return updated.sort((a, b) => b.score - a.score);
              });
            }
          } else if (payload.eventType === 'DELETE') {
            setPlayers(prev => prev.filter(x => x.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabaseGame.removeChannel(channel);
    };
  }, [sessionId, gamePin]);

  // Sequential reveal podium (tetap sama)
  useEffect(() => {
    if (players.length > 0) {
      setVisibleRanks([]);

      const timers: NodeJS.Timeout[] = [];

      if (players.length >= 3) {
        timers.push(setTimeout(() => setVisibleRanks(prev => [...prev, 3]), 500));
      }
      if (players.length >= 2) {
        timers.push(setTimeout(() => setVisibleRanks(prev => [...prev, 2]), 1500));
      }
      if (players.length >= 1) {
        timers.push(setTimeout(() => setVisibleRanks(prev => [...prev, 1]), 2500));
      }

      return () => timers.forEach(clearTimeout);
    }
  }, [players]);

  const handleHome = () => {
    router.push('/');
  };

  const handleRestart = () => {
    router.push('/host/select-quiz');
  };

  const formatScore = (score: number): string => score.toLocaleString();

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const truncateName = (name: string): { display: string; full: string; isTruncated: boolean } => {
    const words = name.trim().split(' ');
    if (words.length > 1) {
      return { display: `${words[0]}...`, full: name, isTruncated: true };
    }
    return { display: name, full: name, isTruncated: false };
  };

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const top3 = sortedPlayers.slice(0, 3);

  return (
    <>
    <section className="leaderboard-screen">
      {/* Header - tetap sama */}
      <header className="leaderboard-header">
        <div className="leaderboard-brand">
          <img src="/assets/logo2.webp" alt="Astro Learning" className="brand-logo-image" />
        </div>
        <img src="/assets/logo.webp" alt="Gameforsmart Logo" className="header-logo" />
      </header>

      {/* Floating Buttons - tetap sama */}
      <button className="floating-btn home-btn" onClick={handleHome} title="Home">
        <Home size={28} />
      </button>
      <button className="floating-btn restart-btn" onClick={handleRestart} title="Restart">
        <RotateCcw size={28} />
      </button>

      {/* Podium - tetap sama, tanpa duration */}
      <div className="vanguard-section">
        {players.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <p>No players participated in this game.</p>
          </div>
        ) : (
          <div className="podium-container">
            {/* 2nd Place */}
            {top3[1] && (
              <div className={`podium-card silver ${visibleRanks.includes(2) ? 'visible' : 'hidden'}`}>
                <div className="rank-badge">#2</div>
                <div className="podium-image">
                  {top3[1].spacecraft ? (
                    <img src={`/assets/${top3[1].spacecraft}`} alt="spacecraft" />
                  ) : (
                    <span style={{ fontSize: '3rem' }}>🚀</span>
                  )}
                </div>
                <h3 className="podium-name has-tooltip" data-tooltip={top3[1].nickname}>
                  {truncateName(top3[1].nickname).display}
                </h3>
                <div className="podium-score">{formatScore(top3[1].score)}</div>
              </div>
            )}

            {/* 1st Place */}
            {top3[0] && (
              <div className={`podium-card gold center ${visibleRanks.includes(1) ? 'visible' : 'hidden'}`}>
                <div className="rank-badge">#1</div>
                <div className="podium-image">
                  {top3[0].spacecraft ? (
                    <img src={`/assets/${top3[0].spacecraft}`} alt="spacecraft" />
                  ) : (
                    <span style={{ fontSize: '3.5rem' }}>🚀</span>
                  )}
                </div>
                <h3 className="podium-name has-tooltip" data-tooltip={top3[0].nickname}>
                  {truncateName(top3[0].nickname).display}
                </h3>
                <div className="podium-score">{formatScore(top3[0].score)}</div>
              </div>
            )}

            {/* 3rd Place */}
            {top3[2] && (
              <div className={`podium-card bronze ${visibleRanks.includes(3) ? 'visible' : 'hidden'}`}>
                <div className="rank-badge">#3</div>
                <div className="podium-image">
                  {top3[2].spacecraft ? (
                    <img src={`/assets/${top3[2].spacecraft}`} alt="spacecraft" />
                  ) : (
                    <span style={{ fontSize: '2.5rem' }}>🚀</span>
                  )}
                </div>
                <h3 className="podium-name has-tooltip" data-tooltip={top3[2].nickname}>
                  {truncateName(top3[2].nickname).display}
                </h3>
                <div className="podium-score">{formatScore(top3[2].score)}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rankings Table - tambah kolom Duration */}
      {sortedPlayers.length > 0 && (
        <div className="rankings-table-container">
          <table className="rankings-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Time</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((player, index) => (
                <tr key={player.id}>
                  <td className="rank-cell">#{index + 1}</td>
                  <td className="player-cell">{player.nickname}</td>
                  <td className="score-cell">{formatDuration(player.duration)}</td>
                  <td className="score-cell">{formatScore(player.score)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
    <style jsx>{`
    .rankings-table {
  table-layout: fixed;
  width: 100%; 
}

.rankings-table th:nth-child(1),
.rankings-table td:nth-child(1) {
  width: 10%;
  text-align: left;
}

.rankings-table th:nth-child(2),
.rankings-table td:nth-child(2) {
  width: 60%;   
  text-align: left;
}

.rankings-table th:nth-child(3),
.rankings-table td:nth-child(3) {
  width: 15%;         
  text-align: left;
}

.rankings-table th:nth-child(4),
.rankings-table td:nth-child(4) {
  width: 15%;          
  text-align: left;
}
    `}</style>
    </>
  );
}