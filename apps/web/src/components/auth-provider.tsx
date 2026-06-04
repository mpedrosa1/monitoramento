"use client";

import { createContext, useContext, type ReactNode } from "react";

type AuthContextValue = {
  isAuthenticated: boolean;
  // token?: string — habilitar quando auth for implementada
};

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={{ isAuthenticated: true }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
