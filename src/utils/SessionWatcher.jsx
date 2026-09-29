import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  LOGIN_PATH,
  SESSION_EXPIRED_MSG,
  IDLE_LOGOUT_MSG,
  isTokenValid,
  isIdleExpired,
  markActivity,
  getLastActivity,
  forceLogout,
} from './authSession';

// Things that count as "user is working"
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'wheel', 'touchstart'];

// How often to check (every 30 seconds)
const CHECK_EVERY = 30 * 1000;

// Checks token + idle time, logs out if needed
const checkSession = () => {
  if (!localStorage.getItem('token')) return;

  // Token expired (15 days)
  if (!isTokenValid()) {
    forceLogout(SESSION_EXPIRED_MSG);
    return;
  }

  // Old logged-in users (before this update) → start timer now
  if (!getLastActivity()) {
    markActivity();
    return;
  }

  // No activity for 30 minutes
  if (isIdleExpired()) {
    forceLogout(IDLE_LOGOUT_MSG);
  }
};

export default function SessionWatcher() {
  const location = useLocation();

  // ✅ Check on every page change
  useEffect(() => {
    checkSession();
  }, [location.pathname]);

  // ✅ Track activity + check every 30 seconds
  useEffect(() => {
    let lastHandled = 0;

    const onActivity = () => {
      if (!localStorage.getItem('token')) return;

      const now = Date.now();
      if (now - lastHandled < 5000) return; // max once every 5 seconds
      lastHandled = now;

      // User came back AFTER 30 min idle → logout (don't reset the timer)
      if (isIdleExpired()) {
        forceLogout(IDLE_LOGOUT_MSG);
        return;
      }

      // User is working → reset the 30-min timer
      markActivity();
    };

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, onActivity, { passive: true })
    );

    const interval = setInterval(checkSession, CHECK_EVERY);

    // When user returns to the tab / laptop wakes from sleep
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkSession();
    };
    document.addEventListener('visibilitychange', onVisible);

    // Logged out in another tab → go to login page in this tab too
    const onStorage = (e) => {
      if (e.key === 'token' && !e.newValue && window.location.pathname !== LOGIN_PATH) {
        window.location.replace(LOGIN_PATH);
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, onActivity)
      );
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return null;
}