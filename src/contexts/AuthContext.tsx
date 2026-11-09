import React, { createContext, useContext, useEffect, useState } from 'react';
import * as eduai from '@/lib/eduai';

// The account comes from teachingtools.dev: the desktop window Magic Marker is open in, or a
// teachingtools.dev sign-in in the same browser (see src/lib/eduai.ts). Magic Marker never
// asks for a password and never holds the school's AI key: openaiApiKey is a stand-in, and
// AI requests made with it go through the school's relay with a short-lived pass. (The old
// version checked passwords against, and read the key from, a public table.)

export interface User {
  username: string;
  isAdmin: boolean;
  openaiApiKey?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Opens teachingtools.dev to sign in; Magic Marker notices when the person comes back. */
  login: () => Promise<void>;
  logout: () => void;
  /** Use a key the person typed in (Settings) instead of the school's AI. */
  setApiKey: (key: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<eduai.EduaiState>(eduai.getState());
  const [ownKey, setOwnKey] = useState('');

  useEffect(() => {
    // Copies of keys left by the old version.
    ['globalApiKey', 'sharedApiKey', 'auth_cache', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'].forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {
        /* storage blocked */
      }
    });
    const unsubscribe = eduai.subscribe(setState);
    void eduai.connect().then(setState);
    return unsubscribe;
  }, []);

  const user: User | null =
    state.status === 'ready' && state.user
      ? { username: state.user.username, isAdmin: state.user.isAdmin, openaiApiKey: ownKey || state.keys.OPENAI_API_KEY || '' }
      : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading: state.status === 'loading',
        login: async () => eduai.openSignIn(),
        logout: () => void eduai.logout(),
        setApiKey: (key: string) => setOwnKey(key),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
