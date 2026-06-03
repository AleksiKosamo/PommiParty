import { io } from 'socket.io-client';

// Connect directly to backend port in development, or use VITE_SERVER_URL / relative path in production.
const SERVER_URL =
  (import.meta as unknown as any).env?.VITE_SERVER_URL ||
  ((import.meta as unknown as any).env?.DEV ? 'http://localhost:3001' : '');

export const socket = io(SERVER_URL, {
  autoConnect: false,
  transports: ['websocket'],
});
