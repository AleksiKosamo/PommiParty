import { useEffect, useState, useCallback, useRef } from 'react';
import { socket } from './socket';
import { logger } from './logger';
import { audio } from './audio';
import {
  SoloState,
  Difficulty,
  LeaderboardEntry,
  EVENTS,
} from './types';
import Lobby from './components/Lobby';
import AdminPanel from './components/AdminPanel';
import SoloBoard from './components/SoloBoard';

type ViewMode = 'LOBBY' | 'SOLO' | 'ADMIN';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('LOBBY');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected'
  >('connecting');

  // Game/Solo states
  const [rejection, setRejection] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<string | null>(null);
  const [timerMs, setTimerMs] = useState<number>(0);
  const [soloState, setSoloState] = useState<SoloState | null>(null);
  const soloStateRef = useRef<SoloState | null>(null);

  // Leaderboard
  const [leaderboardDifficulty, setLeaderboardDifficulty] = useState<Difficulty>('NORMAL');
  const [soloLeaderboard, setSoloLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [adminAuthorized, setAdminAuthorized] = useState(false);

  const requestSoloLeaderboard = useCallback((difficulty: Difficulty) => {
    socket.emit(EVENTS.GET_SOLO_LEADERBOARD, { difficulty });
  }, []);

  // ── Connect & wire up socket events ──────────────────────────────────
  useEffect(() => {
    socket.connect();

    socket.on(EVENTS.SOLO_LEADERBOARD_DATA, (data: LeaderboardEntry[]) => {
      setSoloLeaderboard(data);
    });

    socket.on('connect', () => {
      setConnectionStatus('connected');
      requestSoloLeaderboard(leaderboardDifficulty);
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
      setErrorMsg('Yhteys katkaistiin.');
    });

    socket.on('connect_error', (err: Error) => {
      setConnectionStatus('disconnected');
      logger.error('Socket connect error:', err);
      setErrorMsg('Yhteyden muodostaminen epäonnistui.');
    });

    socket.on('reconnect_attempt', () => {
      setConnectionStatus('connecting');
    });

    socket.on(EVENTS.ADMIN_AUTHORIZED, () => {
      setAdminAuthorized(true);
      setViewMode('ADMIN');
    });

    socket.on(EVENTS.ERROR, ({ message }: { message: string }) => {
      setErrorMsg(message);
      setTimeout(() => setErrorMsg(null), 3000);
    });

    // Solo events
    socket.on(EVENTS.SOLO_STATE, (state: SoloState) => {
      setSoloState(state);
      soloStateRef.current = state;
      setTimerMs(state.timerRemaining);
      setViewMode('SOLO');
    });

    socket.on(EVENTS.SOLO_TIMER_UPDATE, ({ remaining }: { remaining: number }) => {
      setTimerMs(remaining);
    });

    socket.on(EVENTS.SOLO_WORD_ACCEPTED, ({ word }: { word: string }) => {
      audio.playAccept();
      setAccepted(word);
      setRejection(null);
      setTimeout(() => setAccepted(null), 1000);
    });

    socket.on(EVENTS.SOLO_WORD_REJECTED, ({ reason }: { reason: string }) => {
      audio.playReject();
      setRejection(reason);
      setTimeout(() => setRejection(null), 2500);
    });

    socket.on(
      EVENTS.SOLO_GAMEOVER,
      (data: { score: number; highScore: number; durationMs: number }) => {
        audio.playExplosion();
        document.body.classList.add('screen-shake');
        setTimeout(() => document.body.classList.remove('screen-shake'), 400);
        setSoloState((prev) =>
          prev ? { ...prev, phase: 'GAMEOVER', score: data.score, highScore: data.highScore } : null
        );

        const difficulty = soloStateRef.current?.difficulty ?? 'NORMAL';
        socket.emit(EVENTS.SUBMIT_SOLO_SCORE, {
          score: data.score,
          durationMs: data.durationMs,
          difficulty,
        });
      }
    );

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('reconnect_attempt');
      socket.off(EVENTS.ERROR);
      socket.off(EVENTS.ADMIN_AUTHORIZED);
      socket.off(EVENTS.SOLO_LEADERBOARD_DATA);

      socket.off(EVENTS.SOLO_STATE);
      socket.off(EVENTS.SOLO_TIMER_UPDATE);
      socket.off(EVENTS.SOLO_WORD_ACCEPTED);
      socket.off(EVENTS.SOLO_WORD_REJECTED);
      socket.off(EVENTS.SOLO_GAMEOVER);

      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (connectionStatus === 'connected') {
      requestSoloLeaderboard(leaderboardDifficulty);
    }
  }, [connectionStatus, leaderboardDifficulty, requestSoloLeaderboard]);

  // ── Hidden admin shortcut: press Shift and write admin ───────────────────
  useEffect(() => {
    const SECRET = 'admin';
    let buffer = '';
    let lastShiftTime = 0;
    let resetTimer: ReturnType<typeof setTimeout> | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        lastShiftTime = Date.now();
        buffer = '';
        if (resetTimer) clearTimeout(resetTimer);
        return;
      }

      // Only care about letter keys
      if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
        buffer += e.key.toLowerCase();

        // Keep only the last N characters where N = SECRET.length
        if (buffer.length > SECRET.length) {
          buffer = buffer.slice(-SECRET.length);
        }

        // Reset the idle timer
        if (resetTimer) clearTimeout(resetTimer);
        resetTimer = setTimeout(() => { buffer = ''; }, 3000);

        if (buffer === SECRET) {
          const shiftPressedRecently = Date.now() - lastShiftTime < 5000;
          const shiftHeld = e.shiftKey;
          if (shiftPressedRecently || shiftHeld) {
            buffer = '';
            if (resetTimer) clearTimeout(resetTimer);
            setViewMode('ADMIN');
          }
        }
      } else {
        // Non-letter key pressed — reset
        buffer = '';
        if (resetTimer) clearTimeout(resetTimer);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (resetTimer) clearTimeout(resetTimer);
    };
  }, []);

  // ── Actions ─────────────────────────────────────────────────────────
  const serverUrl = (import.meta as unknown as any).env?.VITE_SERVER_URL ?? '';

  const adminLogin = useCallback((password: string) => {
    socket.emit(EVENTS.ADMIN_LOGIN, { password });
  }, []);

  const adminLogout = useCallback(() => {
    setAdminAuthorized(false);
    setViewMode('LOBBY');
  }, []);

  const startSolo = useCallback((difficulty: Difficulty) => {
    socket.emit(EVENTS.SOLO_START, { difficulty });
  }, []);

  const submitSoloWord = useCallback((word: string) => {
    socket.emit(EVENTS.SOLO_SUBMIT, { word });
  }, []);

  const restartSolo = useCallback(() => {
    socket.emit(EVENTS.SOLO_RESTART);
    setAccepted(null);
    setRejection(null);
  }, []);

  const backToHome = useCallback(() => {
    window.location.reload(); // Quick reset
  }, []);

  // ── Render phase ─────────────────────────────────────────────────────

  const statusHeader = (
    <div
      style={{
        padding: '0.75rem 1rem',
        background:
          connectionStatus === 'connected'
            ? '#172f18'
            : connectionStatus === 'connecting'
              ? '#2f2f2f'
              : '#4a1010',
        color: '#fff',
        textAlign: 'center',
        fontSize: '0.92rem',
      }}
    >
      {connectionStatus === 'connected'
        ? 'Yhdistetty palvelimeen'
        : connectionStatus === 'connecting'
          ? 'Yhdistetään palvelimeen…'
          : 'Yhteys katkaistu — yritetään uudelleen'}
    </div>
  );

  if (viewMode === 'ADMIN') {
    return (
      <div>
        {statusHeader}
        <AdminPanel
          gameState={null}
          myId=""
          adminAuthorized={adminAuthorized}
          onLogin={adminLogin}
          onLogout={adminLogout}
          onKickPlayer={() => {}}
          onBack={() => setViewMode('LOBBY')}
          errorMsg={errorMsg}
        />
      </div>
    );
  }

  if (viewMode === 'LOBBY') {
    return (
      <div>
        {statusHeader}
        <Lobby
          onSoloStart={startSolo}
          errorMsg={errorMsg}
          leaderboardDifficulty={leaderboardDifficulty}
          onChangeLeaderboardDifficulty={setLeaderboardDifficulty}
          soloLeaderboard={soloLeaderboard}
          serverUrlHint={serverUrl}
        />
      </div>
    );
  }

  if (viewMode === 'SOLO' && soloState) {
    return (
      <div>
        {statusHeader}
        <SoloBoard
          state={soloState}
          timerMs={timerMs}
          rejection={rejection}
          accepted={accepted}
          onSubmitWord={submitSoloWord}
          onRestart={restartSolo}
          onBack={backToHome}
        />
      </div>
    );
  }

  return null;
}
