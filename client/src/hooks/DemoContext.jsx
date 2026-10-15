/**
 * DemoContext – provides the current demo session (user + role) app-wide.
 * Also exposes helpers for login, logout, and role switching.
 */
import { createContext, useContext, useState, useCallback } from 'react';
import { getSession, loginAs, logout as storeLogout } from '../services/scopePilotService.js';

const DemoContext = createContext(null);

export function DemoProvider({ children }) {
  const [session, setSession] = useState(() => getSession());

  const login = useCallback((userId) => {
    const user = loginAs(userId);
    setSession(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    storeLogout();
    setSession(null);
  }, []);

  const switchRole = useCallback((userId) => {
    const user = loginAs(userId);
    setSession(user);
  }, []);

  return (
    <DemoContext.Provider value={{ session, login, logout, switchRole }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemoSession() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemoSession must be inside DemoProvider');
  return ctx;
}
