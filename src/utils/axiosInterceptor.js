import axios from 'axios';
import { forceLogout } from './authSession';

let isLoggingOut = false;

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';

    // Public APIs — never auto logout on these
    const isPublicAuthCall =
      url.includes('/api/login') ||
      url.includes('/api/reset-password') ||
      url.includes('/api/forget-password');

    // Only logout if a token exists (prevents reload loops)
    const hasToken = !!localStorage.getItem('token');

    if (status === 401 && hasToken && !isPublicAuthCall && !isLoggingOut) {
      isLoggingOut = true;
      forceLogout();
    }

    return Promise.reject(error);
  }
);