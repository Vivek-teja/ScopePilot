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

  // Restore authenticated session on initial mount
  useEffect(() => {
    let isMounted = true;
    restoreSession().then((user) => {
      if (isMounted) {
        if (user) {
          setSession(user);
          setMode(getDataSourceMode());
        }
        setLoading(false);
      }
    });

    const handleUnauthorized = () => {
      serviceLogout();
      setSession(null);
    };

    window.addEventListener('scopepilot:unauthorized', handleUnauthorized);
    return () => {
      isMounted = false;
      window.removeEventListener('scopepilot:unauthorized', handleUnauthorized);
    };
  }, []);

  const loginWithCredentials = useCallback(async (email, password) => {
    const user = await serviceLoginWithCredentials(email, password);
    setSession(user);
    setMode('live');
    return user;
  }, []);

  const registerWithCredentials = useCallback(async (payload) => {
    const user = await serviceRegisterWithCredentials(payload);
    setSession(user);
    setMode('live');
    return user;
  }, []);

  const login = useCallback((userId) => {
    const user = serviceLoginAs(userId);
    setSession(user);
    setMode('demo');
    return user;
  }, []);

  const logout = useCallback(() => {
    serviceLogout();
    setSession(null);
  }, []);

  const switchRole = useCallback((userId) => {
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
