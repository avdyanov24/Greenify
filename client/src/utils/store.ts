import { create } from "zustand";
import { apiClient } from "../services/api";

/**
 * Global auth store using Zustand.
 *
 * The token is persisted in localStorage; the full user object is hydrated from
 * the API on app load (`bootstrap`) so a page refresh keeps the user signed in
 * and ownership/level checks keep working. `refreshUser` re-pulls GP/XP/level
 * after actions that change them (post, endorse, subscribe, redeem, …).
 */

export interface AuthUser {
  id: string;
  email?: string;
  username: string;
  displayName: string | null;
  bio?: string | null;
  bioForHire?: string | null;
  profileImage?: string | null;
  role?: string;
  isBanned?: boolean;
  level: number;
  xp: number;
  greenPoints: number;
  availableForHire?: boolean;
  averageRating?: number | null;
  hexCount?: number;
  postCount?: number;
  subscription?: { type: string; status: string } | null;
  achievements?: unknown[];
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  setUser: (user: AuthUser) => void;
  /** Hydrate the user from the stored token on app startup. */
  bootstrap: () => Promise<void>;
  /** Re-fetch the current user (after earning GP/XP, subscribing, etc.). */
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem("auth_token"),
  user: null,
  // Start in a loading state when a token exists so guards can wait for hydration.
  isLoading: !!localStorage.getItem("auth_token"),

  login: (token: string, user: AuthUser) => {
    localStorage.setItem("auth_token", token);
    set({ token, user, isLoading: false });
  },

  logout: () => {
    localStorage.removeItem("auth_token");
    set({ token: null, user: null, isLoading: false });
  },

  setUser: (user: AuthUser) => {
    set({ user });
  },

  bootstrap: async () => {
    const token = get().token;
    if (!token) {
      set({ isLoading: false });
      return;
    }
    set({ isLoading: true });
    try {
      const user = await apiClient.getMyProfile();
      set({ user, isLoading: false });
    } catch {
      // Token is invalid/expired — clear it.
      localStorage.removeItem("auth_token");
      set({ token: null, user: null, isLoading: false });
    }
  },

  refreshUser: async () => {
    if (!get().token) return;
    try {
      const user = await apiClient.getMyProfile();
      set({ user });
    } catch {
      /* ignore transient refresh failures */
    }
  },
}));
