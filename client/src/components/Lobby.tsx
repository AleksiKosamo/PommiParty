import { Difficulty, LeaderboardEntry } from '../types';

interface Props {
  onSoloStart: (difficulty: Difficulty) => void;
  onChangeLeaderboardDifficulty: (difficulty: Difficulty) => void;
  leaderboardDifficulty: Difficulty;
  errorMsg: string | null;
  soloLeaderboard: LeaderboardEntry[];
  serverUrlHint?: string;
}

export default function Lobby({
  onSoloStart,
  onChangeLeaderboardDifficulty,
  leaderboardDifficulty,
  errorMsg,
  soloLeaderboard,
  serverUrlHint,
}: Props) {
  return (
    <div className="page home-page">
      <div className="lobby-logo">
        <span className="logo-emoji">💣</span>
        <h1>PommiPeli</h1>
        <p>Suomalaiset sanat • Yksinpeli • Testaa sanavarastosi paineen alla!</p>
      </div>

      <div className="home-layout">
        {/* Left: action buttons */}
        <div className="card">
          <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', fontSize: '1.5rem' }}>
            🎮 Aloita peli
          </h2>
          <div className="form-actions" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                  <span className="lb-score">{entry.score} sanaa</span>
                  <span className="lb-date">{entry.date}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
