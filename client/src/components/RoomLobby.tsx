import { GameState } from '../types';

interface Props {
  gameState: GameState;
  myId: string;
  countdown: number | null;
  onStartGame: () => void;
  onLeave: () => void;
}

export default function RoomLobby({ gameState, myId, countdown, onStartGame, onLeave }: Props) {
  const isHost = gameState.players.find((p) => p.id === myId)?.isHost ?? false;
  const canStart = gameState.players.length >= 2;

  return (
    <div className="page home-page">
      <div className="lobby-logo">
        <span className="logo-emoji">💣</span>
        <h1>Huone {gameState.roomCode}</h1>
        {gameState.isRanked && <span className="ranked-badge-room">🏆 Rankattu peli</span>}
      </div>

      <div className="card" style={{ maxWidth: 520, margin: '0 auto' }}>
        <div className="room-code-display">
          <div className="label">Huonekoodi</div>
          <div className="code">{gameState.roomCode}</div>
        </div>

        <div className="lobby-players">
          <h3>Pelaajat ({gameState.players.length})</h3>
          {gameState.players.map((player) => (
            <div
              key={player.id}
              className="lobby-player-row"
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
            >
              {player.isHost && (
                <span className="crown" title="Isäntä" style={{ marginRight: '0.25rem' }}>
                  👑
                </span>
              )}
              <span className="name">{player.username}</span>
              {player.id === myId && <span className="you-badge">Sinä</span>}
            </div>
          ))}
        </div>

        <div className="form-actions" style={{ marginTop: '2rem' }}>
          {countdown !== null && countdown > 0 ? (
            <div
              style={{
                textAlign: 'center',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                color: 'var(--yellow)',
                marginBottom: '1rem',
              }}
            >
              🎮 Peli alkaa... {countdown}
            </div>
          ) : isHost ? (
            <button
              id="start-game-btn"
              className="btn btn-primary btn-full"
              onClick={onStartGame}
              disabled={!canStart}
            >
              🚀 Aloita peli
            </button>
          ) : (
            <div
              style={{
                textAlign: 'center',
                color: 'var(--text-muted)',
                marginBottom: '1rem',
                fontSize: '0.95rem',
              }}
            >
              ⏳ Odotetaan, että isäntä aloittaa pelin...
            </div>
          )}

          <button className="btn btn-secondary btn-full" onClick={onLeave}>
            🚪 Poistu huoneesta
          </button>
        </div>
      </div>
    </div>
  );
}
