import { useState, useEffect } from 'react';
import { Difficulty, LeaderboardEntry } from '../types';
import { storage } from '../utils/storage';

interface Props {
  onSoloStart: (difficulty: Difficulty) => void;
  onChangeLeaderboardDifficulty: (difficulty: Difficulty) => void;
  leaderboardDifficulty: Difficulty;
  errorMsg: string | null;
  soloLeaderboard: LeaderboardEntry[];
  multiLeaderboard: LeaderboardEntry[];
  serverUrlHint?: string;
  onCreateRoom: (username: string, isRanked: boolean) => void;
  onJoinRoom: (username: string, roomCode: string) => void;
  onRequestMultiLeaderboard: () => void;
}

export default function Lobby({
  onSoloStart,
  onChangeLeaderboardDifficulty,
  leaderboardDifficulty,
  errorMsg,
  soloLeaderboard,
  multiLeaderboard,
  serverUrlHint,
  onCreateRoom,
  onJoinRoom,
  onRequestMultiLeaderboard,
}: Props) {
  const [activeTab, setActiveTab] = useState<'solo' | 'multi'>('solo');
  const [username, setUsername] = useState(storage.getUsername() || '');
  const [roomCode, setRoomCode] = useState('');
  const [isRanked, setIsRanked] = useState(false);

  // Persistence of username
  const handleUsernameChange = (val: string) => {
    setUsername(val);
    storage.setUsername(val);
  };

  useEffect(() => {
    if (activeTab === 'multi') {
      onRequestMultiLeaderboard();
    }
  }, [activeTab, onRequestMultiLeaderboard]);

  return (
    <div className="page home-page">
      <div className="lobby-logo">
        <span className="logo-emoji">💣</span>
        <h1>PommiPeli</h1>
        <p>Suomalaiset sanat • Moninpeli & Yksinpeli • Testaa sanavarastosi paineen alla!</p>
      </div>

      <div className="home-layout">
        {/* Left: action buttons */}
        <div className="card">
          <div className="lobby-tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <button
              className={`btn btn-secondary ${activeTab === 'solo' ? 'btn-active' : ''}`}
              style={{ flex: 1 }}
              onClick={() => setActiveTab('solo')}
            >
              🎮 Yksinpeli
            </button>
            <button
              className={`btn btn-secondary ${activeTab === 'multi' ? 'btn-active' : ''}`}
              style={{ flex: 1 }}
              onClick={() => setActiveTab('multi')}
            >
              👥 Moninpeli
            </button>
          </div>

          {activeTab === 'solo' ? (
            <div>
              <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '1.5rem' }}>
                🎮 Aloita yksinpeli
              </h2>
              <div
                className="form-actions"
                style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
              >
                <button
                  id="solo-easy-btn"
                  className="btn btn-primary btn-full"
                  onClick={() => onSoloStart('EASY')}
                  style={{ background: 'var(--green)', color: '#000', fontWeight: 'bold' }}
                >
                  🟢 Helppo (30s, +5s)
                </button>
                <button
                  id="solo-normal-btn"
                  className="btn btn-primary btn-full"
                  onClick={() => onSoloStart('NORMAL')}
                  style={{ background: 'var(--yellow)', color: '#000', fontWeight: 'bold' }}
                >
                  🟡 Normaali (20s, +3.5s)
                </button>
                <button
                  id="solo-hard-btn"
                  className="btn btn-primary btn-full"
                  onClick={() => onSoloStart('HARD')}
                  style={{ background: 'var(--red)', color: '#fff', fontWeight: 'bold' }}
                >
                  🔴 Vaikea (10s, +2s)
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '1.5rem' }}>
                👥 Pelaa moninpeliä
              </h2>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label htmlFor="username-input">Nimimerkki</label>
                <input
                  id="username-input"
                  className="input"
                  type="text"
                  placeholder="Kirjoita nimimerkki..."
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  maxLength={15}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <input
                  id="ranked-checkbox"
                  type="checkbox"
                  checked={isRanked}
                  onChange={(e) => setIsRanked(e.target.checked)}
                  style={{ cursor: 'pointer', width: '1.2rem', height: '1.2rem' }}
                />
                <label
                  htmlFor="ranked-checkbox"
                  style={{ fontSize: '0.9rem', cursor: 'pointer', userSelect: 'none' }}
                >
                  🏆 Rankattu peli (vaikuttaa Elo-lukuun)
                </label>
              </div>

              <button
                id="create-room-btn"
                className="btn btn-primary btn-full"
                onClick={() => onCreateRoom(username, isRanked)}
                disabled={!username.trim()}
                style={{ marginBottom: '1rem' }}
              >
                👑 Luo uusi huone
              </button>

              <div className="divider">tai liity huoneeseen</div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label htmlFor="room-code-input">Huonekoodi</label>
                <input
                  id="room-code-input"
                  className="input"
                  type="text"
                  placeholder="Esim. ABCD"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={4}
                />
              </div>

              <button
                id="join-room-btn"
                className="btn btn-secondary btn-full"
                onClick={() => onJoinRoom(username, roomCode)}
                disabled={!username.trim() || roomCode.trim().length !== 4}
              >
                🚪 Liity huoneeseen
              </button>
            </div>
          )}

          {serverUrlHint && (
            <div
              style={{
                marginTop: '1.5rem',
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                lineHeight: 1.4,
                textAlign: 'center',
              }}
            >
              Palvelin: <strong>{serverUrlHint}</strong>
            </div>
          )}
          {errorMsg && (
            <div className="error-msg" style={{ marginTop: '1rem' }}>
              {errorMsg}
            </div>
          )}
        </div>

        {/* Right: leaderboard */}
        <div className="card leaderboard-panel">
          {activeTab === 'solo' ? (
            <>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {(['EASY', 'NORMAL', 'HARD'] as Difficulty[]).map((level) => (
                  <button
                    key={level}
                    className={`btn btn-secondary ${leaderboardDifficulty === level ? 'btn-active' : ''}`}
                    onClick={() => onChangeLeaderboardDifficulty(level)}
                    style={{ flex: 1, minWidth: 90 }}
                  >
                    {level === 'EASY' ? 'Helppo' : level === 'NORMAL' ? 'Normaali' : 'Vaikea'}
                  </button>
                ))}
              </div>
              <h2 className="leaderboard-title">🏆 Parhaat tulokset</h2>
              {soloLeaderboard.length === 0 ? (
                <p className="leaderboard-empty">
                  Ei vielä tuloksia.
                  <br />
                  Pelaa peliä valitulla vaikeudella!
                </p>
              ) : (
                <ol className="leaderboard-list">
                  {soloLeaderboard.map((entry, i) => (
                    <li key={`solo-${i}`} className={`leaderboard-entry rank-${i + 1}`}>
                      <span className="lb-rank">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </span>
                      <span className="lb-username" style={{ flex: 1 }}>Yksinpeli</span>
                      <span className="lb-score">{entry.score} sanaa</span>
                      <span className="lb-date">{entry.date}</span>
                    </li>
                  ))}
                </ol>
              )}
            </>
          ) : (
            <>
              <h2 className="leaderboard-title" style={{ marginTop: '0.5rem' }}>
                🏆 Moninpelin parhaat
              </h2>
              {multiLeaderboard.length === 0 ? (
                <p className="leaderboard-empty">
                  Ei vielä tuloksia.
                  <br />
                  Pelaa rankattuja pelejä!
                </p>
              ) : (
                <ol className="leaderboard-list">
                  {multiLeaderboard.map((entry, i) => (
                    <li key={`multi-${i}`} className={`leaderboard-entry rank-${i + 1}`}>
                      <span className="lb-rank">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </span>
                      <span className="lb-username">{entry.username}</span>
                      <span className="lb-score">{entry.score} Elo</span>
                      <span className="lb-date">{entry.date}</span>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
