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

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  loading: false,
  initialized: false,

  setSession: (session) => {
    set({ session, user: session?.user ?? null });
  },

  initialize: async () => {
    // TODO: Connect to Cloudflare Auth endpoint
    // For now, assume no active session
    set({
      session: null,
      user: null,
      initialized: true,
    });
  },

  signIn: async (email, password) => {
    set({ loading: true });
    // TODO: Connect to Cloudflare Auth endpoint
    // Dummy implementation for now to allow local testing
    console.log('Dummy login:', email, password);
    const mockUser: User = { id: 'dummy-id', email };
    const mockSession: Session = { access_token: 'dummy-token', user: mockUser };
    
    set({ 
      loading: false,
      session: mockSession,
      user: mockUser
    });
    return { error: null };
  },

  signOut: async () => {
    set({ loading: true });
    // TODO: Connect to Cloudflare Auth endpoint
    set({ session: null, user: null, loading: false });
  },
}));
