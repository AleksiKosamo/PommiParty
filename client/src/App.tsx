import { useEffect, useState, useCallback, useRef } from 'react';
import { socket } from './socket';
import { logger } from './logger';
import { audio } from './audio';
import { ErrorBoundary } from './components/ErrorBoundary';
import { storage } from './utils/storage';
import { setupGlobalErrorHandlers } from './utils/errorHandler';
import { UI_CONFIG } from './config';
import {
  GameState,
  SoloState,
  Difficulty,
  LeaderboardEntry,
  GameOverPayload,
  WordAcceptedPayload,
  EVENTS,
} from './types';
import Lobby from './components/Lobby';
import AdminPanel from './components/AdminPanel';
import SoloBoard from './components/SoloBoard';
import RoomLobby from './components/RoomLobby';
import GameBoard from './components/GameBoard';
import GameOver from './components/GameOver';
import RoundEnd from './components/RoundEnd';

type ViewMode = 'LOBBY' | 'SOLO' | 'ADMIN' | 'GAME';

function AppContent() {
  const [viewMode, setViewMode] = useState<ViewMode>('LOBBY');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected'
  >('connecting');

  // Rejection/Acceptance visual highlights
  const [rejection, setRejection] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<string | null>(null);
  const [timerMs, setTimerMs] = useState<number>(0);

  // Solo state
  const [soloState, setSoloState] = useState<SoloState | null>(null);
  const soloStateRef = useRef<SoloState | null>(null);

  // Multiplayer state
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [gameOverData, setGameOverData] = useState<GameOverPayload | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [loserId, setLoserId] = useState<string | null>(null);
  const [typingUpdates, setTypingUpdates] = useState<Record<string, string>>({});

  // Leaderboards
  const [leaderboardDifficulty, setLeaderboardDifficulty] = useState<Difficulty>(
    storage.getLastDifficulty()
  );
  const [soloLeaderboard, setSoloLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [multiLeaderboard, setMultiLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [adminAuthorized, setAdminAuthorized] = useState(false);

  const requestSoloLeaderboard = useCallback((difficulty: Difficulty) => {
    socket.emit(EVENTS.GET_SOLO_LEADERBOARD, { difficulty });
  }, []);

  const requestMultiLeaderboard = useCallback(() => {
    socket.emit(EVENTS.GET_LEADERBOARD);
  }, []);

  const leaveRoom = useCallback(() => {
    socket.disconnect();
    socket.connect();
    setViewMode('LOBBY');
    setGameState(null);
    setGameOverData(null);
    setCountdown(null);
    setLoserId(null);
    setTypingUpdates({});
  }, []);

  // ── Connect & wire up socket events ──────────────────────────────────
  useEffect(() => {
    setupGlobalErrorHandlers();
    socket.connect();

    socket.on(EVENTS.SOLO_LEADERBOARD_DATA, (data: LeaderboardEntry[]) => {
      setSoloLeaderboard(data);
    });

    socket.on(EVENTS.LEADERBOARD_DATA, (data: LeaderboardEntry[]) => {
      setMultiLeaderboard(data);
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
      const message = err.message.includes('auth')
        ? 'Todennusvirhe. Tarkista yhteysasetukset.'
        : 'Yhteyden muodostaminen epäonnistui. Yritetään uudelleen...';
      setErrorMsg(message);
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
      setTimeout(() => setErrorMsg(null), UI_CONFIG.ERROR_MESSAGE_DURATION_MS);
    });

    // ── Solo event listeners ───────────────────────────────────────────
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

    // ── Multiplayer event listeners ────────────────────────────────────
    socket.on(EVENTS.GAME_STATE, (state: GameState) => {
      setGameState(state);
      if (state.phase === 'IN_ROUND' || state.phase === 'ROUND_END') {
        setCountdown(null);
        setGameOverData(null);
      }
      setViewMode('GAME');
    });

    socket.on(EVENTS.WORD_ACCEPTED, ({ word }: WordAcceptedPayload) => {
      audio.playAccept();
      setAccepted(word);
      setRejection(null);
      setTimeout(() => setAccepted(null), 1000);
      setTypingUpdates({}); // Clear all typing visual cues
    });

    socket.on(EVENTS.WORD_REJECTED, ({ reason }: { reason: string }) => {
      audio.playReject();
      setRejection(reason);
      setTimeout(() => setRejection(null), 2500);
    });

    socket.on(EVENTS.BOMB_EXPLODED, ({ loserId }: { loserId: string }) => {
      audio.playExplosion();
      setLoserId(loserId);
      document.body.classList.add('screen-shake');
      setTimeout(() => document.body.classList.remove('screen-shake'), 400);
    });

    socket.on(EVENTS.GAME_OVER, (data: GameOverPayload) => {
      setGameOverData(data);
    });

    socket.on(EVENTS.TIMER_UPDATE, ({ remaining }: { remaining: number }) => {
      setTimerMs(remaining);
    });

    socket.on(EVENTS.STARTING_COUNTDOWN, ({ count }: { count: number }) => {
      setCountdown(count);
    });

    socket.on(EVENTS.TYPING_UPDATE, ({ playerId, word }: { playerId: string; word: string }) => {
      setTypingUpdates((prev) => ({ ...prev, [playerId]: word }));
    });

    socket.on(EVENTS.KICKED, ({ reason }: { reason: string }) => {
      setErrorMsg(reason);
      setViewMode('LOBBY');
      setGameState(null);
      setGameOverData(null);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('reconnect_attempt');
      socket.off(EVENTS.ERROR);
      socket.off(EVENTS.ADMIN_AUTHORIZED);
      socket.off(EVENTS.SOLO_LEADERBOARD_DATA);
      socket.off(EVENTS.LEADERBOARD_DATA);

      socket.off(EVENTS.SOLO_STATE);
      socket.off(EVENTS.SOLO_TIMER_UPDATE);
      socket.off(EVENTS.SOLO_WORD_ACCEPTED);
      socket.off(EVENTS.SOLO_WORD_REJECTED);
      socket.off(EVENTS.SOLO_GAMEOVER);

      socket.off(EVENTS.GAME_STATE);
      socket.off(EVENTS.WORD_ACCEPTED);
      socket.off(EVENTS.WORD_REJECTED);
      socket.off(EVENTS.BOMB_EXPLODED);
      socket.off(EVENTS.GAME_OVER);
      socket.off(EVENTS.TIMER_UPDATE);
      socket.off(EVENTS.STARTING_COUNTDOWN);
      socket.off(EVENTS.TYPING_UPDATE);
      socket.off(EVENTS.KICKED);

      socket.disconnect();
    };
  }, [leaderboardDifficulty, requestSoloLeaderboard]);

  useEffect(() => {
    if (connectionStatus === 'connected') {
      requestSoloLeaderboard(leaderboardDifficulty);
    }
  }, [connectionStatus, leaderboardDifficulty, requestSoloLeaderboard]);

  // Save difficulty preference
  useEffect(() => {
    storage.setLastDifficulty(leaderboardDifficulty);
  }, [leaderboardDifficulty]);

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
        resetTimer = setTimeout(() => {
          buffer = '';
        }, 3000);

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

  // ── Escape key handler for global navigation ─────────────────────────────
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (viewMode === 'SOLO' || viewMode === 'ADMIN' || viewMode === 'GAME') {
          leaveRoom();
        }
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [viewMode, leaveRoom]);

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

  const createRoom = useCallback((username: string, isRanked: boolean) => {
    socket.emit(EVENTS.CREATE_ROOM, { username, isRanked });
  }, []);

  const joinRoom = useCallback((username: string, roomCode: string) => {
    socket.emit(EVENTS.JOIN_ROOM, { username, roomCode });
  }, []);

  const startGame = useCallback(() => {
    socket.emit(EVENTS.START_GAME);
  }, []);

  const submitWord = useCallback((word: string) => {
    socket.emit(EVENTS.SUBMIT_WORD, { word });
  }, []);

  const giveUp = useCallback(() => {
    socket.emit(EVENTS.GIVE_UP);
  }, []);

  const playAgain = useCallback(() => {
    socket.emit(EVENTS.PLAY_AGAIN);
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
          gameState={gameState}
          myId={socket.id || ''}
          adminAuthorized={adminAuthorized}
          onLogin={adminLogin}
          onLogout={adminLogout}
          onKickPlayer={(targetId) => socket.emit(EVENTS.KICK_PLAYER, { targetId })}
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
          multiLeaderboard={multiLeaderboard}
          serverUrlHint={serverUrl}
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
          onRequestMultiLeaderboard={requestMultiLeaderboard}
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
          onBack={leaveRoom}
        />
      </div>
    );
  }

  if (viewMode === 'GAME' && gameState) {
    // 1. If phase is GAME_OVER, show GameOver screen
    if (gameState.phase === 'GAME_OVER' && gameOverData) {
      const myPlayer = gameState.players.find((p) => p.id === socket.id);
      return (
        <div>
          {statusHeader}
          <GameOver
            gameState={gameState}
            myId={socket.id || ''}
            gameOverData={gameOverData}
            onPlayAgain={playAgain}
            isHost={myPlayer?.isHost ?? false}
            onBack={leaveRoom}
          />
        </div>
      );
    }

    // 2. If phase is LOBBY or STARTING, show RoomLobby screen
    if (gameState.phase === 'LOBBY' || gameState.phase === 'STARTING') {
      return (
        <div>
          {statusHeader}
          <RoomLobby
            gameState={gameState}
            myId={socket.id || ''}
            countdown={countdown}
            onStartGame={startGame}
            onLeave={leaveRoom}
          />
        </div>
      );
    }

    // 3. Otherwise (IN_ROUND or ROUND_END), show GameBoard screen
    // We also overlay RoundEnd if phase is ROUND_END and we have a loser
    const loser = gameState.players.find((p) => p.id === loserId);
    return (
      <div>
        {statusHeader}
        <GameBoard
          gameState={gameState}
          myId={socket.id || ''}
          timerMs={timerMs}
          rejection={rejection}
          accepted={accepted}
          onSubmitWord={submitWord}
          onGiveUp={giveUp}
          typingUpdates={typingUpdates}
        />
        {gameState.phase === 'ROUND_END' && loser && <RoundEnd loserName={loser.username} />}
      </div>
    );
  }

  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
