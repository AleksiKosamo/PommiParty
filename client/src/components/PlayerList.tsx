import { Player } from '../types';

interface Props {
  players: Player[];
  bombHolderId: string | null;
  myId: string;
  typingUpdates?: Record<string, string>;
}

function renderLives(lives: number, alive: boolean) {
  if (!alive) return <span className="dead-skull">💀</span>;
  const hearts = Math.max(0, Math.min(lives, 3));
  return (
    <div className="lives-container">
      {Array.from({ length: 3 }).map((_, i) => (
        <svg
          key={i}
          className={`heart-icon ${i < hearts ? 'full' : 'empty'}`}
          viewBox="0 0 32 29.6"
        >
          <path d="M23.6,0c-3.4,0-6.3,2.7-7.6,5.6C14.7,2.7,11.8,0,8.4,0C3.8,0,0,3.8,0,8.4c0,9.4,9.5,11.9,16,21.2 c6.1-9.3,16-12.1,16-21.2C32,3.8,28.2,0,23.6,0z" />
        </svg>
      ))}
    </div>
  );
}

const BONUS_ALPHABET = 'abcdefghijklmnopqrstuvwxyzäöå'.split('');

export default function PlayerList({ players, bombHolderId, myId, typingUpdates }: Props) {
  // Sort: bomb holder first, then alive, then dead
  const sorted = [...players].sort((a, b) => {
    if (a.id === bombHolderId) return -1;
    if (b.id === bombHolderId) return 1;
    if (a.alive && !b.alive) return -1;
    if (!a.alive && b.alive) return 1;
    return 0;
  });

  return (
    <div className="player-list" role="list" aria-label="Pelaajat">
      {sorted.map((player) => {
        const hasBomb = player.id === bombHolderId;
        const isMe = player.id === myId;

        return (
          <div
            key={player.id}
            role="listitem"
            className={[
              'player-chip',
              hasBomb ? 'has-bomb' : '',
              isMe ? 'is-me' : '',
              !player.alive ? 'dead' : '',
            ].join(' ')}
            title={`${player.username} – ${player.score} pistettä`}
          >
            {typingUpdates &&
              typingUpdates[player.id] &&
              player.alive &&
              player.id === bombHolderId && (
                <div className="typing-bubble">
                  {typingUpdates[player.id]}
                  <span className="live-typing-cursor">|</span>
                </div>
              )}
            <div className="player-chip-content">
              {hasBomb && (
                <span className="bomb-icon" aria-label="pommi">
                  💣
                </span>
              )}
              <span>{player.username}</span>
              {isMe && (
                <span style={{ fontSize: '0.7rem', color: 'var(--green)', fontWeight: 700 }}>
                  (sinä)
                </span>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span className="player-lives" aria-label={`${player.lives} elämää`}>
                  {renderLives(player.lives, player.alive)}
                </span>
                <span className="player-word-count" style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                  • {player.wordsAnswered}
                </span>
              </div>
            </div>

            {/* Bonus Alphabet Tracker */}
            {player.alive && (
              <div className="alphabet-tracker">
                {BONUS_ALPHABET.map((char) => (
                  <span
                    key={char}
                    className={`alpha-char ${player.usedLetters?.includes(char) ? 'used' : ''}`}
                  >
                    {char}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
