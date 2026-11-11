import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { login } from '../api/auth.api';
import type { LoginCredentials } from '../types/auth.types';
import {
  getTokenExpiration,
  isTokenStorageEvent,
  isTokenUsable,
  readRawStoredToken,
  readStoredToken,
  removeToken,
  saveToken,
} from '../utils/token';
import { AuthContext } from './auth-context';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [accessToken, setAccessToken] = useState<string | null>(
    readStoredToken,
  );

  async function signIn(credentials: LoginCredentials): Promise<void> {
    const response = await login(credentials);

    if (!isTokenUsable(response.accessToken)) {
      throw new Error('The server returned an invalid or expired token');
    }

    saveToken(response.accessToken);
    setAccessToken(response.accessToken);
  }

  const signOut = useCallback(() => {
    try {
      removeToken();
    } finally {
      setAccessToken(null);
    }
  }, []);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const expiration = getTokenExpiration(accessToken);

    if (expiration === null) {
      return;
    }

    const remaining = Math.max(expiration - Date.now(), 0);

    const timeout = window.setTimeout(() => {
      const storedToken = readRawStoredToken();

      if (storedToken && storedToken !== accessToken) {
        setAccessToken((currentToken) =>
          currentToken === accessToken ? readStoredToken() : currentToken,
        );
        return;
      }

      try {
        if (storedToken === accessToken) {
          removeToken();
        }
      } finally {
        setAccessToken((currentToken) =>
          currentToken === accessToken ? null : currentToken,
        );
      }
    }, remaining);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [accessToken]);

  useEffect(() => {
    function handleStorageChange(event: StorageEvent) {
      if (isTokenStorageEvent(event)) {
        setAccessToken(readStoredToken());
      }
    }

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        isAuthenticated: accessToken !== null,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
