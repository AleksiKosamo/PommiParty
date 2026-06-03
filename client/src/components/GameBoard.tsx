import { useCallback } from 'react';
import Bomb from './Bomb';
import PlayerList from './PlayerList';
import WordInput from './WordInput';
import { GameState, EVENTS } from '../types';
import { socket } from '../socket';
import { audio } from '../audio';
import { useState } from 'react';

interface Props {
  gameState: GameState;
  myId: string;
  timerMs: number;
  rejection: string | null;
  accepted: string | null;
  onSubmitWord: (word: string) => void;
  onGiveUp: () => void;
  typingUpdates: Record<string, string>;
}

export default function GameBoard({
  gameState,
  myId,
  timerMs,
  rejection,
  accepted,
  onSubmitWord,
  onGiveUp,
  typingUpdates,
}: Props) {
  const { currentSyllable, currentBombHolder, players, phase, usedWords, wordCount, isRanked } =
    gameState;
  const isMyTurn = currentBombHolder === myId;
  const isPlaying = phase === 'IN_ROUND';
  const [isMuted, setIsMuted] = useState(audio.muted);

  const handleTyping = useCallback((word: string) => {
    socket.emit(EVENTS.TYPING_UPDATE, { word });
  }, []);

  const bombHolder = players.find((p) => p.id === currentBombHolder);

  // Escalation tier (every 5 correct words)
  const tier = Math.floor(wordCount / 5);
  const currentTimerSec = Math.max(7, 15 - tier * 0.5).toFixed(1);
  const threePct = Math.min(80, 10 + tier * 5);

  return (
    <div className="game-board">
      {/* Header */}
      <header className="game-header">
        <span className="round-info">
          {isRanked && <span className="ranked-badge-game">🏆 </span>}
          💣 PommiPeli
        </span>
        <span className="syllable-hint">
          {isMyTurn ? '💣 Sinulla on pommi!' : `💣 ${bombHolder?.username ?? '...'} pelaa`}
        </span>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
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
            📝 {usedWords.length}
          </span>
          <span
            className="tier-badge"
            title={`Ajastin: ${currentTimerSec}s | 3-tavut: ${threePct}%`}
          >
            Taso {tier + 1}
          </span>
        </div>
      </header>

      {/* Main arena */}
      <main className="syllable-arena">
        <span className="syllable-label">Tavu</span>

        <Bomb timerMs={timerMs} maxMs={15000} syllable={currentSyllable} />

        <PlayerList
          players={players}
          bombHolderId={currentBombHolder}
          myId={myId}
          typingUpdates={typingUpdates}
        />
      </main>

      {/* Word input */}
      <footer className="word-input-section">
        <WordInput
          syllable={currentSyllable}
          isMyTurn={isMyTurn && isPlaying}
          rejection={rejection}
          accepted={accepted}
          onSubmit={onSubmitWord}
          onTyping={handleTyping}
        />

        {isRanked && isPlaying && (
          <button
            className="btn btn-secondary give-up-btn"
            onClick={() => {
              if (confirm('Haluatko varmasti luovuttaa? Tämä lasketaan häviöksi.')) {
                onGiveUp();
              }
            }}
          >
            🏳️ Luovuta
          </button>
        )}
      </footer>
    </div>
  );
}
