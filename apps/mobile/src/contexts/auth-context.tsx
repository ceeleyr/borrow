import { createContext, useContext, useEffect, useState, PropsWithChildren } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { api, setAuthToken } from '@/services/api';

type User = {
  id: string;
  email: string;
  [key: string]: any;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, full_name: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage helper: SecureStore untuk native, localStorage untuk web
async function getStoredToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem('access_token');
  }
  return SecureStore.getItemAsync('access_token');
}

async function setStoredToken(token: string | null) {
  if (Platform.OS === 'web') {
    if (token) localStorage.setItem('access_token', token);
    else localStorage.removeItem('access_token');
    return;
  }
  if (token) await SecureStore.setItemAsync('access_token', token);
  else await SecureStore.deleteItemAsync('access_token');
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
  async function loadStoredAuth() {
    try {
      const storedToken = await getStoredToken();
      if (storedToken) {
        setToken(storedToken);
        setAuthToken(storedToken);
      }
    } catch (e) {
      console.error('Failed to load stored auth:', e);
    } finally {
      setIsLoading(false);
    }
  }
  loadStoredAuth();
}, []);

  async function login(email: string, password: string) {
    const response = await api.post('/auth/login', { email, password });
    const { user: userData, access_token } = response.data.data;

    setUser(userData);
    setToken(access_token);
    setAuthToken(access_token);
    await setStoredToken(access_token);
  }

  async function register(email: string, password: string, full_name: string) {
    await api.post('/auth/register', { email, password, full_name });
    // Setelah register, langsung login otomatis
    await login(email, password);
  }

  async function logout() {
    setUser(null);
    setToken(null);
    setAuthToken(null);
    await setStoredToken(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}