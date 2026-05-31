import { io } from 'socket.io-client';

const getBackendUrl = () => {
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  if (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.startsWith('http')) {
    return import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');
  }
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:4000'
    : window.location.origin;
};

const backendUrl = getBackendUrl();

let socket = null;

export const initSocket = () => {
  if (socket) return socket;

  socket = io(backendUrl, {
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('Connected to real-time sync server:', socket.id);
  });

  socket.on('refresh_data', (data) => {
    console.log('Received real-time refresh signal:', data);
    // Dispatch a custom window event that React components can listen to
    const event = new CustomEvent('socket_refresh', { detail: data });
    window.dispatchEvent(event);
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from real-time sync server');
  });

  return socket;
};

export const getSocket = () => socket;
