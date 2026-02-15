import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  username: string;
  isAdmin: boolean;
  openaiApiKey?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password?: string) => Promise<void>;
  logout: () => void;
  setApiKey: (key: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    attemptAutoLogin();

    const handleBeforeUnload = () => {
      clearAuthCache();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearAuthCache();
    };
  }, []);

  const isInIframe = () => {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  };

  const attemptAutoLogin = async () => {
    setIsLoading(true);

    if (isInIframe()) {
      const result = await attemptIframeLogin();
      if (result.authenticated && result.user) {
        setUser(result.user);
        setIsAuthenticated(true);
      }
    }

    setIsLoading(false);
  };

  const attemptIframeLogin = (): Promise<{ authenticated: boolean; user?: User }> => {
    return new Promise((resolve) => {
      window.parent.postMessage({ type: 'REQUEST_API_VALUES' }, '*');

      const handleMessage = async (event: MessageEvent) => {
        if (event.data.type === 'API_VALUES_RESPONSE') {
          window.removeEventListener('message', handleMessage);

          const { authToken, SUPABASE_URL, SUPABASE_ANON_KEY, OPENAI_API_KEY } = event.data.data;

          if (authToken && SUPABASE_URL && SUPABASE_ANON_KEY) {
            try {
              const response = await fetch(
                `${SUPABASE_URL}/rest/v1/auth_tokens?token=eq.${authToken}&expires_at=gt.${new Date().toISOString()}&select=username,is_admin,expires_at`,
                {
                  headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json',
                  }
                }
              );

              const tokens = await response.json();

              if (tokens && tokens.length > 0) {
                resolve({
                  authenticated: true,
                  user: {
                    username: tokens[0].username,
                    isAdmin: tokens[0].is_admin,
                    openaiApiKey: OPENAI_API_KEY,
                  }
                });
                return;
              }
            } catch (error) {
              console.error('Token validation failed:', error);
            }
          }

          resolve({ authenticated: false });
        }
      };

      window.addEventListener('message', handleMessage);

      setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        resolve({ authenticated: false });
      }, 2000);
    });
  };

  const standaloneLogin = async (username: string, password: string): Promise<User> => {
    const SUPABASE_URL = 'https://qfitpwdrswvnbmzvkoyd.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmaXRwd2Ryc3d2bmJtenZrb3lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzNTc4NTIsImV4cCI6MjA3NjkzMzg1Mn0.owLaj3VrcyR7_LW9xMwOTTFQupbDKlvAlVwYtbidiNE';

    const loginResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/users_login?username=eq.${encodeURIComponent(username)}&password=eq.${encodeURIComponent(password)}&select=username,is_admin`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        }
      }
    );

    const users = await loginResponse.json();

    if (!users || users.length === 0) {
      throw new Error('Invalid username or password');
    }

    const secretResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/secrets?key_name=eq.OPENAI_API_KEY&select=key_value`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        }
      }
    );

    const secrets = await secretResponse.json();
    const openaiApiKey = secrets && secrets.length > 0 ? secrets[0].key_value : '';

    return {
      username: users[0].username,
      isAdmin: users[0].is_admin || false,
      openaiApiKey,
    };
  };

  const login = async (username: string, password?: string) => {
    setIsLoading(true);
    try {
      if (isInIframe()) {
        const result = await attemptIframeLogin();
        if (result.authenticated && result.user) {
          setUser(result.user);
          setIsAuthenticated(true);
        } else {
          throw new Error('Authentication failed');
        }
      } else {
        if (!password) {
          throw new Error('Password is required for standalone login');
        }
        const loggedInUser = await standaloneLogin(username, password);
        setUser(loggedInUser);
        setIsAuthenticated(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    clearAuthCache();
  };

  const clearAuthCache = () => {
    sessionStorage.clear();
    localStorage.removeItem('auth_cache');
  };

  const setApiKey = (key: string) => {
    if (user) {
      setUser({ ...user, openaiApiKey: key });
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, setApiKey }}>
      {children}
    </AuthContext.Provider>
  );
};
