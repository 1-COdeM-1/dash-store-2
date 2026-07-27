import { create } from 'zustand';

export interface User {
  id: string;
  email?: string;
}

export interface Session {
  access_token: string;
  user: User | null;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  initialized: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  setSession: (session: Session | null) => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  loading: false,
  initialized: false,

  setSession: (session) => {
    set({ session, user: session?.user ?? null });
  },

  initialize: async () => {
    const savedSession = localStorage.getItem('auth_session');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        set({ session, user: session.user, initialized: true });
        return;
      } catch {
        // ignore
      }
    }
    set({
      session: null,
      user: null,
      initialized: true,
    });
  },

  signIn: async (email, password) => {
    set({ loading: true });
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        set({ loading: false });
        return { error: data.error || 'Login failed' };
      }

      localStorage.setItem('auth_session', JSON.stringify(data.session));
      set({ 
        loading: false,
        session: data.session,
        user: data.session.user
      });
      return { error: null };
    } catch (err: any) {
      set({ loading: false });
      return { error: err.message };
    }
  },

  signOut: async () => {
    set({ loading: true });
    localStorage.removeItem('auth_session');
    set({ session: null, user: null, loading: false });
  },
}));
