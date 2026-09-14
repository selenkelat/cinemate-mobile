import { createContext, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';

import { authApi } from '@/api/auth';
import { setAuthHandlers } from '@/api/client';
import type { UserDto } from '@/api/types';
import { secureStorage } from '@/auth/secureStorage';

interface AuthContextValue {
  user: UserDto | null;
  // True only while restoring a session from the stored refresh token on cold start — the
  // (auth) and (app) route guards hold off redirecting until this settles, so a valid session
  // never flashes the login screen first.
  isLoading: boolean;
  // The raw token, for callers that can't go through apiRequest (e.g. a WebSocket handshake
  // header) — everything else should keep using client.ts's auth: true, not this directly.
  getAccessToken: () => string | null;
  register: (username: string, password: string, displayName: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // A ref, not state: api/client.ts reads this synchronously from a plain callback (not a
  // hook), and nothing in the UI needs to re-render off the token itself — only off `user`.
  const accessTokenRef = useRef<string | null>(null);

  const refreshAccessToken = async (): Promise<string | null> => {
    const stored = await secureStorage.getRefreshToken();
    if (!stored) return null;

    try {
      const response = await authApi.refresh({ refreshToken: stored });
      accessTokenRef.current = response.accessToken;
      // Rotated: the token just presented is now revoked server-side, so the old value in
      // storage would fail on the very next refresh if we didn't overwrite it here.
      await secureStorage.setRefreshToken(response.refreshToken);
      setUser(response.user);
      return response.accessToken;
    } catch {
      // Expired, revoked, or reused (theft — the backend already killed every session for this
      // user in that case). Either way, drop to a signed-out state locally.
      accessTokenRef.current = null;
      await secureStorage.clearRefreshToken();
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    setAuthHandlers({ getAccessToken: () => accessTokenRef.current, refreshAccessToken });
  }, []);

  useEffect(() => {
    refreshAccessToken().finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cold-start restore, intentionally once
  }, []);

  const register = async (username: string, password: string, displayName: string) => {
    const response = await authApi.register({ username, password, displayName, letterboxdUsername: null });
    accessTokenRef.current = response.accessToken;
    await secureStorage.setRefreshToken(response.refreshToken);
    setUser(response.user);
  };

  const login = async (username: string, password: string) => {
    const response = await authApi.login({ username, password });
    accessTokenRef.current = response.accessToken;
    await secureStorage.setRefreshToken(response.refreshToken);
    setUser(response.user);
  };

  const logout = async () => {
    const stored = await secureStorage.getRefreshToken();
    if (stored) {
      // Best-effort: an already-expired or offline logout shouldn't block signing out locally.
      // On success, the backend also closes this user's live chat socket immediately.
      await authApi.logout({ refreshToken: stored }).catch(() => {});
    }
    accessTokenRef.current = null;
    await secureStorage.clearRefreshToken();
    setUser(null);
  };

  const getAccessToken = () => accessTokenRef.current;

  const value = useMemo(
    () => ({ user, isLoading, getAccessToken, register, login, logout }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
