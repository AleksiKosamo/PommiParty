import { useEffect, useRef } from 'react';
import { GameState, GameOverPayload } from '../types';

interface Props {
  gameState: GameState;
  myId: string;
  gameOverData: GameOverPayload;
  onPlayAgain: () => void;
  isHost: boolean;
  onBack?: () => void;
}

// Simple confetti burst
function spawnConfetti() {
  const colors = ['#00ff88', '#ff3366', '#ffe000', '#4488ff', '#aa55ff', '#ff9000'];
  for (let i = 0; i < 60; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-particle';
    el.style.left = `${Math.random() * 100}vw`;
    el.style.top = `-10px`;
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.width = `${6 + Math.random() * 8}px`;
    el.style.height = `${6 + Math.random() * 8}px`;
    el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    el.style.animationDuration = `${2 + Math.random() * 3}s`;
    el.style.animationDelay = `${Math.random() * 1.5}s`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 5500);
  }
}

export default function GameOver({
  gameState,
  myId,
  gameOverData,
  onPlayAgain,
  isHost,
  onBack,
}: Props) {
  const hasSpawned = useRef(false);

  useEffect(() => {
    if (!hasSpawned.current) {
      hasSpawned.current = true;
      spawnConfetti();
    }
  }, []);

  const sorted = [...gameOverData.scores].sort((a, b) => b.wordsAnswered - a.wordsAnswered);
  const winner = gameState.players.find((p) => p.id === gameOverData.winner);
  const iWon = gameOverData.winner === myId;
  const isRanked = gameState.isRanked;

  return (
    <div className="game-over-page">
      <div className="winner-display">
        <span className="trophy-emoji" role="img" aria-label="troféE">
          🏆
        </span>
        {winner ? (
          <>
            <div className="winner-name">{winner.username}</div>
            <div className="winner-label">
              {iWon ? '🎉 Sinä voitit! Mahtavaa!' : 'voitti pelin!'}
            </div>
            {isRanked && iWon && (
              <div className="ranked-win-msg">🏆 Tuloksesi tallennettiin listalle!</div>
            )}
          </>
        ) : (
          <div className="winner-name">Tasapeli!</div>
        )}
      </div>

      <div className="scoreboard" role="list" aria-label="Tulokset">
        <h3 style={{ textAlign: 'center', marginBottom: '1rem', opacity: 0.8 }}>Sanapisteet</h3>
        {sorted.map((p, i) => (
          <div
            key={p.id}
            role="listitem"
            className={`score-row ${i === 0 ? 'first-place' : ''}`}
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <span className="rank">{['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`}</span>
            <span className="name">
              {p.username}
              {p.id === myId && (
                <span style={{ fontSize: '0.75rem', color: 'var(--green)', marginLeft: '0.4rem' }}>
                  (sinä)
                </span>
              )}
            </span>
            <span className="pts">
              {p.wordsAnswered} sanaa
              {gameOverData.eloChanges && gameOverData.eloChanges[p.username] !== undefined && (
                <span
                  className={`elo-delta ${gameOverData.eloChanges[p.username] >= 0 ? 'plus' : 'minus'}`}
                >
                  {gameOverData.eloChanges[p.username] >= 0 ? '+' : ''}
                  {gameOverData.eloChanges[p.username]} Elo
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      {isHost ? (
        <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column' }}>
          <button id="play-again-btn" className="btn btn-primary" onClick={onPlayAgain}>
            🔄 Pelaa uudelleen
          </button>
          <button className="btn btn-secondary" onClick={onBack}>
            🏠 Takaisin alkuun
          </button>
        </div>
      ) : (
        <div
          style={{ display: 'flex', gap: '1rem', flexDirection: 'column', alignItems: 'center' }}
        >
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Odotetaan isäntää aloittamaan uusi peli...
          </p>
          <button className="btn btn-secondary" onClick={onBack} style={{ marginTop: '0.5rem' }}>
            🏠 Poistu huoneesta
          </button>
        </div>
      )}
    </div>
  );
}
