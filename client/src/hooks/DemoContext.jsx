/**
 * DemoContext – provides authentication session and role context app-wide.
 * Supports both real backend credential authentication (JWT) and demo mode.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getSession,
  loginAs as serviceLoginAs,
  loginWithCredentials as serviceLoginWithCredentials,
  registerWithCredentials as serviceRegisterWithCredentials,
  logout as serviceLogout,
  restoreSession,
  getDataSourceMode,
  setDataSourceMode,
} from '../services/scopePilotService.js';

const DemoContext = createContext(null);

export function DemoProvider({ children }) {
  const [session, setSession] = useState(() => getSession());
  const [mode, setMode] = useState(() => getDataSourceMode());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restore authenticated session on initial mount
  useEffect(() => {
    let isMounted = true;
    restoreSession()
      .then((user) => {
        if (isMounted) {
          if (user) {
            setSession(user);
            setMode(getDataSourceMode());
          }
          setError(null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to restore session');
          setLoading(false);
        }
      });

    const handleUnauthorized = () => {
      serviceLogout();
      setSession(null);
      setError(null);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('scopepilot:unauthorized', handleUnauthorized);
    }
    return () => {
      isMounted = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('scopepilot:unauthorized', handleUnauthorized);
      }
    };
  }, []);

  const retryRestore = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await restoreSession();
      if (user) {
        setSession(user);
        setMode(getDataSourceMode());
      }
      setLoading(false);
      return user;
    } catch (err) {
      setError(err.message || 'Failed to restore session');
      setLoading(false);
      throw err;
    }
  }, []);

  const loginWithCredentials = useCallback(async (email, password) => {
    setError(null);
    const user = await serviceLoginWithCredentials(email, password);
    setSession(user);
    setMode('live');
    return user;
  }, []);

  const registerWithCredentials = useCallback(async (payload) => {
    setError(null);
    const user = await serviceRegisterWithCredentials(payload);
    setSession(user);
    setMode('live');
    return user;
  }, []);

  const login = useCallback((userId) => {
    setError(null);
    const user = serviceLoginAs(userId);
    setSession(user);
    setMode('demo');
    return user;
  }, []);

  const logout = useCallback(() => {
    setError(null);
    serviceLogout();
    setSession(null);
  }, []);

  const switchRole = useCallback((userId) => {
    setError(null);
    const user = serviceLoginAs(userId);
    setSession(user);
    setMode('demo');
  }, []);

  const toggleDataSourceMode = useCallback((newMode) => {
    setDataSourceMode(newMode);
    setMode(newMode);
  }, []);

  return (
    <DemoContext.Provider
      value={{
        session,
        mode,
        loading,
        error,
        retryRestore,
        login,
        loginWithCredentials,
        registerWithCredentials,
        logout,
        switchRole,
        toggleDataSourceMode,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemoSession() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemoSession must be inside DemoProvider');
  return ctx;
}
