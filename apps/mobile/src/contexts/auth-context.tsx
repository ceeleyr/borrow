import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { services, setAuthToken, setUnauthorizedHandler } from '@/services/client';
import type { Profile } from '@/services/types';

type AuthContextType = {
  user: Profile | null;
  isLoading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (fullName: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const TOKEN_KEY = 'access_token';

// SecureStore untuk native, localStorage untuk web
async function readToken(): Promise<string | null> {
  if (Platform.OS === 'web') return typeof localStorage === 'undefined' ? null : localStorage.getItem(TOKEN_KEY);
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function writeToken(token: string | null) {
  if (Platform.OS === 'web') {
    if (typeof localStorage === 'undefined') return;
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
    return;
  }
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(async () => {
    setUser(null);
    setAuthToken(null);
    await writeToken(null).catch(() => {});
  }, []);

  // Pulihkan sesi: token tersimpan -> validasi ke server lewat /auth/me (juga mengambil role).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await readToken();
        if (stored) {
          setAuthToken(stored);
          const me = await services.auth.me();
          if (!cancelled) setUser(me);
        }
      } catch (e: any) {
        // 401 -> token kedaluwarsa. Error jaringan: biarkan token, user diminta login ulang.
        if (e?.response?.status === 401) await clearSession();
        else setAuthToken(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  // Sesi habis di tengah pemakaian -> otomatis kembali ke login.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void clearSession();
    });
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  const login = useCallback(async (email: string, password: string) => {
    const { user: profile, access_token } = await services.auth.login(email.trim(), password);
    setAuthToken(access_token);
    await writeToken(access_token);
    setUser(profile);
  }, []);

  const register = useCallback(
    async (email: string, password: string, fullName: string) => {
      await services.auth.register(email.trim(), password, fullName.trim());
      await login(email, password); // setelah daftar langsung masuk
    },
    [login]
  );

  const updateProfile = useCallback(async (fullName: string) => {
    setUser(await services.auth.updateProfile({ full_name: fullName.trim() }));
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isLoading,
      isAdmin: user?.role === 'admin' || user?.role === 'superadmin',
      isSuperAdmin: user?.role === 'superadmin',
      login,
      register,
      logout: clearSession,
      updateProfile,
    }),
    [user, isLoading, login, register, clearSession, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
