import { io } from 'socket.io-client';

// Use VITE_SERVER_URL if explicitly set, otherwise derive from the page's own hostname.
// This ensures LAN players connecting via http://192.168.x.x:5173 also reach port 3001 on that IP.
const SERVER_URL =
  (import.meta as unknown as any).env?.VITE_SERVER_URL ||
  `${window.location.protocol}//${window.location.hostname}:3001`;

export const socket = io(SERVER_URL, {
  autoConnect: false,
  transports: ['websocket'],
});
