import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Role } from '../types';

interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isVerified: boolean;
  avatarUrl?: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: AuthUser, token: string) => void;
  setToken: (token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<AuthUser>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user, token) =>
        set({ user, token, isAuthenticated: true }),

      setToken: (token) =>
        set({ token, isAuthenticated: true }),

      logout: () =>
        set({ user: null, token: null, isAuthenticated: false }),

      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),
    }),
    {
      name: 'moheet-auth',  // localStorage key
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      merge: (persistedState, currentState) => {
        const persistedAuth = persistedState as Partial<AuthState>;

        return {
          ...currentState,
          user: persistedAuth.user ?? null,
          token: null,
          isAuthenticated: Boolean(
            persistedAuth.isAuthenticated && persistedAuth.user,
          ),
        };
      },
    },
  ),
);
