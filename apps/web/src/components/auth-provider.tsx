"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  clearAuthSession,
  getAuthToken,
  jwtExpiresAtMs,
  loadAuthSession,
  saveAuthSession,
  sessaoCompativelComAuthVersion,
  type AuthSession,
  type AuthUser,
  type LoginResponse,
} from "@/lib/auth-session";

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_CHECK_MS = 30_000;
const SESSION_ME_POLL_MS = 60_000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    clearAuthSession();
    setUser(null);
    router.replace("/");
  }, [router]);

  const ensureSessionValid = useCallback(() => {
    const session = loadAuthSession();
    if (!session) {
      if (user) setUser(null);
      if (pathname.startsWith("/dashboard")) {
        router.replace("/");
      }
      return false;
    }
    const jwtExp = jwtExpiresAtMs(session.token);
    if (jwtExp && jwtExp <= Date.now()) {
      clearAuthSession();
      setUser(null);
      if (pathname.startsWith("/dashboard")) {
        router.replace("/");
      }
      return false;
    }
    if (!user || user.id !== session.user.id) {
      setUser(session.user);
    }
    return true;
  }, [pathname, router, user]);

  useEffect(() => {
    const session = loadAuthSession();
    if (!session) {
      setIsLoading(false);
      return;
    }
    setUser(session.user);
    apiFetch<AuthUser>("/api/v1/auth/me")
      .then((fresh) => {
        if (!sessaoCompativelComAuthVersion(session.token, fresh.authVersion)) {
          logout();
          return;
        }
        const updatedUser = { ...session.user, ...fresh };
        const updatedSession: AuthSession = {
          ...session,
          user: updatedUser,
        };
        saveAuthSession(updatedSession);
        setUser(updatedUser);
      })
      .catch(() => {
        if (!loadAuthSession()) {
          setUser(null);
          if (pathname.startsWith("/dashboard")) {
            router.replace("/");
          }
        }
      })
      .finally(() => setIsLoading(false));
  }, [logout, pathname, router]);

  useEffect(() => {
    if (isLoading) return;
    ensureSessionValid();
    const id = window.setInterval(ensureSessionValid, SESSION_CHECK_MS);
    return () => window.clearInterval(id);
  }, [ensureSessionValid, isLoading]);

  useEffect(() => {
    if (isLoading || !user) return;
    const pollMe = () => {
      const session = loadAuthSession();
      if (!session) return;
      void apiFetch<AuthUser>("/api/v1/auth/me")
        .then((fresh) => {
          if (!sessaoCompativelComAuthVersion(session.token, fresh.authVersion)) {
            logout();
          }
        })
        .catch(() => {
          if (!loadAuthSession()) {
            logout();
          }
        });
    };
    const id = window.setInterval(pollMe, SESSION_ME_POLL_MS);
    return () => window.clearInterval(id);
  }, [isLoading, logout, user]);

  useEffect(() => {
    const session = loadAuthSession();
    if (!session) return;
    const remaining = new Date(session.expiresAt).getTime() - Date.now();
    if (remaining <= 0) {
      logout();
      return;
    }
    const timeoutId = window.setTimeout(logout, remaining);
    return () => window.clearTimeout(timeoutId);
  }, [user, logout]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<LoginResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });
    const session: AuthSession = {
      token: res.token,
      expiresAt: res.expiresAt,
      user: res.user,
    };
    saveAuthSession(session);
    setUser(res.user);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: user !== null && getAuthToken() !== null,
      isLoading,
      login,
      logout,
    }),
    [user, isLoading, login, logout]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return ctx;
}
