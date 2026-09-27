import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { UserRole } from "@dsews/shared";
import { api } from "@/lib/api";

const REMEMBER_FLAG_KEY = "dsews-remember-session";

/** "Remember session" (login page checkbox): checked -> localStorage (survives browser restart),
 * unchecked -> sessionStorage (cleared when the tab/browser closes). The flag itself always lives
 * in localStorage so we know which store to read from on the next load. */
export function setRememberSession(remember: boolean) {
  localStorage.setItem(REMEMBER_FLAG_KEY, remember ? "1" : "0");
}

/** Storage-like object (matches the Web Storage interface's sync get/set/removeItem shape). */
const dualStorage = {
  getItem: (name: string): string | null => {
    const remember = localStorage.getItem(REMEMBER_FLAG_KEY) !== "0";
    return (remember ? localStorage : sessionStorage).getItem(name);
  },
  setItem: (name: string, value: string): void => {
    const remember = localStorage.getItem(REMEMBER_FLAG_KEY) !== "0";
    (remember ? localStorage : sessionStorage).setItem(name, value);
  },
  removeItem: (name: string): void => {
    localStorage.removeItem(name);
    sessionStorage.removeItem(name);
  },
};

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  orgId: string;
  locationId: string | null;
  phone: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface CurrentOrganization {
  id: string;
  name: string;
  orgType: string;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  primaryContactPhone: string | null;
  currency: string;
  timezone: string;
  isDemo: boolean;
  orgSetupComplete: boolean;
}

interface AuthState {
  token: string | null;
  user: CurrentUser | null;
  organization: CurrentOrganization | null;
  isHydrating: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearSession: () => void;
  fetchMe: () => Promise<void>;
  setSession: (token: string, user: CurrentUser, organization: CurrentOrganization) => void;
}

type PersistedAuthState = Pick<AuthState, "token">;

export const useAuthStore = create<AuthState>()(
  persist<AuthState, [], [], PersistedAuthState>(
    (set, get) => ({
      token: null,
      user: null,
      organization: null,
      isHydrating: true,

      setSession: (token, user, organization) => set({ token, user, organization, isHydrating: false }),

      login: async (email: string, password: string) => {
        const { data } = await api.post("/auth/login", { email, password });
        set({ token: data.token, user: data.user, organization: data.organization, isHydrating: false });
      },

      logout: async () => {
        try {
          if (get().token) await api.post("/auth/logout");
        } finally {
          set({ token: null, user: null, organization: null });
        }
      },

      clearSession: () => set({ token: null, user: null, organization: null }),

      fetchMe: async () => {
        const token = get().token;
        if (!token) {
          set({ isHydrating: false });
          return;
        }
        try {
          const { data } = await api.get("/auth/me");
          set({ user: data.user, organization: data.organization, isHydrating: false });
        } catch {
          set({ token: null, user: null, organization: null, isHydrating: false });
        }
      },
    }),
    {
      name: "dsews-auth",
      storage: createJSONStorage(() => dualStorage),
      partialize: (state): PersistedAuthState => ({ token: state.token }),
    }
  )
);
