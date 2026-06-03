import { useState } from 'react';
import { GameState } from '../types';

interface Props {
  gameState: GameState | null;
  myId: string;
  adminAuthorized: boolean;
  onLogin: (password: string) => void;
  onLogout: () => void;
  onKickPlayer: (playerId: string) => void;
  onBack: () => void;
  errorMsg: string | null;
}

export default function AdminPanel({
  gameState,
  myId,
  adminAuthorized,
  onLogin,
  onLogout,
  onKickPlayer,
  onBack,
  errorMsg,
}: Props) {
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    onLogin(password);
    setPassword('');
  };

  return (
    <div className="page home-page">
      <div className="lobby-logo">
        <span className="logo-emoji">🔒</span>
        <h1>Admin</h1>
        <p>Ylläpitäjän sivu on suojattu salasanalla.</p>
      </div>

      <div className="card" style={{ maxWidth: 520, margin: '0 auto' }}>
        {!adminAuthorized ? (
          <div
            className="form-actions"
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <div className="form-group">
              <label htmlFor="admin-password">Salasana</label>
              <input
                id="admin-password"
                className="input"
                type="password"
                placeholder="Kirjoita admin-salasana"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                autoFocus
              />
            </div>
            <button
              className="btn btn-primary btn-full"
              onClick={handleLogin}
              disabled={!password.trim()}
            >
              🔓 Kirjaudu sisään
            </button>
            <button className="btn btn-secondary btn-full" onClick={onBack}>
              ← Takaisin
            </button>
            {errorMsg && <div className="error-msg">{errorMsg}</div>}
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
              📌 Olet kirjautunut ylläpitäjänä. Käytä tätä sivua huoneen pelaajien hallintaan.
            </div>

            {gameState ? (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <h3>Huone {gameState.roomCode}</h3>
                  <p>Pelaajia: {gameState.players.length}</p>
                </div>
                <div className="lobby-players">
                  {gameState.players.map((player) => (
                    <div
                      key={player.id}
                      className="lobby-player-row"
                      style={{ alignItems: 'center', gap: '0.75rem' }}
                    >
                      {player.isHost && (
                        <span className="crown" title="Isäntä">
                          👑
                        </span>
                      )}
                      <span className="name">{player.username}</span>
                      {player.id === myId && <span className="you-badge">Sinä</span>}
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{
                          fontSize: '0.85rem',
                          padding: '0.4rem 0.65rem',
                          marginLeft: 'auto',
                        }}
                        onClick={() => onKickPlayer(player.id)}
                      >
                        Potki
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Liity tai luo huone, jotta voit käyttää ylläpitäjän moderointityökaluja.
              </div>
            )}

            <div
              style={{
                marginTop: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <button className="btn btn-secondary btn-full" onClick={onLogout}>
                🚪 Kirjaudu ulos
              </button>
              <button className="btn btn-secondary btn-full" onClick={onBack}>
                ← Takaisin
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
