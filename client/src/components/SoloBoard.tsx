import { SoloState } from '../types';
import Bomb from './Bomb';
import WordInput from './WordInput';
import { audio } from '../audio';
import { useState } from 'react';

interface Props {
  state: SoloState;
  timerMs: number;
  rejection: string | null;
  accepted: string | null;
  onSubmitWord: (word: string) => void;
  onRestart: () => void;
  onBack: () => void;
}

export default function SoloBoard({
  state,
  timerMs,
  rejection,
  accepted,
  onSubmitWord,
  onRestart,
  onBack,
}: Props) {
  const isGameOver = state.phase === 'GAMEOVER';
  const [isMuted, setIsMuted] = useState(audio.muted);

  const diffName = {
    EASY: 'Helppo',
    NORMAL: 'Normaali',
    HARD: 'Vaikea',
  }[state.difficulty];

  const maxMs = {
    EASY: 30_000,
    NORMAL: 20_000,
    HARD: 10_000,
  }[state.difficulty];

  if (isGameOver) {
    return (
      <div className="game-over-page" style={{ position: 'relative' }}>
        <button
          onClick={onBack}
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            background: 'none',
            border: 'none',
            color: 'var(--text)',
            cursor: 'pointer',
            fontSize: '1rem',
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
          }}
        >
          <span>←</span> Takaisin
        </button>

        <div className="winner-display">
          <span className="explosion-emoji" role="img" aria-label="boom">
            💥
          </span>
          <div className="winner-name">Aika loppui!</div>
        </div>

        <div className="card" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2>
            Tuloksesi: <span style={{ color: 'var(--green)' }}>{state.score}</span>
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>Paras tulos: {state.highScore}</p>
        </div>

        <button className="btn btn-primary" onClick={onRestart}>
          🔄 Pelaa uudelleen
        </button>
      </div>
    );
  }

  return (
    <div className="game-board solo-mode">
      <header className="game-header" style={{ justifyContent: 'space-between' }}>
        <button onClick={onBack} className="btn-link" style={{ color: 'var(--text-muted)' }}>
          ← Poistu
        </button>
        <div
          style={{
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Vaikeus: <strong style={{ color: 'var(--text)' }}>{diffName}</strong>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'baseline' }}>
          <button
            className="btn-link"
            onClick={() => setIsMuted(audio.toggleMute())}
            style={{
              fontSize: '1.2rem',
              padding: '0',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
            title={isMuted ? 'Äänet päälle' : 'Äänet pois'}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
          <span className="word-counter" title="Käytettyjä sanoja">
            📝 {state.usedWords.length}
          </span>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'baseline' }}>
            <span
              className="score-label"
              style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}
            >
              Pisteet:
            </span>
            <span
              className="score-value"
              style={{ fontSize: '1.5rem', color: 'var(--green)', fontWeight: 800 }}
            >
              {state.score}
            </span>
          </div>
        </div>
      </header>

      <main className="syllable-arena">
        <span className="syllable-label">Löydä sana jossa on</span>
        <Bomb timerMs={timerMs} maxMs={maxMs} syllable={state.currentSyllable} />
      </main>

      <footer className="word-input-section">
        <WordInput
          syllable={state.currentSyllable}
          isMyTurn={true}
          rejection={rejection}
          accepted={accepted}
          onSubmit={onSubmitWord}
        />
      </footer>
    </div>
  );
}
