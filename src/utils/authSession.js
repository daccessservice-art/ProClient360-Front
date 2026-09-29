import toast from 'react-hot-toast';

// Your login page route
export const LOGIN_PATH = '/';

// ✅ Logout after 30 minutes of NO activity
export const IDLE_TIMEOUT = 30 * 60 * 1000;

export const SESSION_EXPIRED_MSG = 'Your session has expired. Please log in again.';
export const IDLE_LOGOUT_MSG = 'You were logged out after 30 minutes of inactivity. Please log in again.';

const LAST_ACTIVITY_KEY = 'lastActivity';

// Read expiry time (exp) from JWT token
export const getTokenExpiry = (token) => {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

// true = token exists and is not expired
export const isTokenValid = () => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  const exp = getTokenExpiry(token);
  if (!exp) return true;
  return Date.now() < exp;
};

// ✅ Save "user was active now"
export const markActivity = () => {
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  } catch {
    // ignore storage errors
  }
};

export const getLastActivity = () => {
  return Number(localStorage.getItem(LAST_ACTIVITY_KEY)) || 0;
};

// ✅ true = no activity for 30 minutes
export const isIdleExpired = () => {
  const last = getLastActivity();
  if (!last) return false;
  return Date.now() - last > IDLE_TIMEOUT;
};

export const clearSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem(LAST_ACTIVITY_KEY);
};

// Called after successful login (already used in useAuth.js)
export const notifyLogin = () => {
  markActivity(); // ✅ start the 30-min timer from login time
  window.dispatchEvent(new Event('auth:login'));
};

// Clear token and send user to login page
export const forceLogout = (message = SESSION_EXPIRED_MSG) => {
  clearSession();

  if (window.location.pathname === LOGIN_PATH) {
    toast.error(message);
    return;
  }

  sessionStorage.setItem('logoutMsg', message);
  window.location.replace(LOGIN_PATH);
};