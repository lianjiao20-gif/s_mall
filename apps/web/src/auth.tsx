import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, type User } from './api';

interface AuthState { user: User | null; loading: boolean; login(email: string, password: string): Promise<void>; register(name: string, email: string, password: string): Promise<void>; logout(): void }
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!localStorage.getItem('shop_token')) { setLoading(false); return; }
    api<{ user: User }>('/auth/me').then(data => setUser(data.user)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);
  async function login(email: string, password: string) {
    const data = await api<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    localStorage.setItem('shop_token', data.token);
    setUser(data.user);
  }
  async function register(name: string, email: string, password: string) {
    const data = await api<{ token: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
    localStorage.setItem('shop_token', data.token);
    setUser(data.user);
  }
  function logout() { localStorage.removeItem('shop_token'); setUser(null); }
  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const state = useContext(AuthContext); if (!state) throw new Error('AuthProvider missing'); return state; }
