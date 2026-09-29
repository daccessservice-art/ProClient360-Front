import { io } from 'socket.io-client';
import { forceLogout } from './utils/authSession';

// Initialize the socket connection
const socket = io(process.env.REACT_APP_API_URL, {
  // ✅ Callback → always sends the CURRENT token (not an old one)
  auth: (cb) => cb({ token: localStorage.getItem('token') }),
});

socket.on('connect', () => {
  console.log('Socket connected:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason);
});

// ✅ Token rejected by server → logout
socket.on('connect_error', (err) => {
  const code = err.data?.code;
  const isAuthError =
    ['TOKEN_EXPIRED', 'TOKEN_INVALID', 'NO_TOKEN'].includes(code) ||
    err.message === 'Invalid token' ||
    err.message === 'Authentication error';

  if (!isAuthError) return; // network error → socket.io retries automatically

  socket.disconnect();
  if (localStorage.getItem('token')) {
    forceLogout();
  }
});

// ✅ Server says token expired while connected
socket.on('session_expired', () => {
  socket.disconnect();
  forceLogout();
});

// ✅ After login → connect again with the new token
window.addEventListener('auth:login', () => {
  if (!socket.connected) socket.connect();
});

export default socket;