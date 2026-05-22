"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { configureAuth, api } from "@/lib/api";
import { setMockUser } from "@/mocks/api.mock";
import * as cognito from "@/lib/cognito";
import type { AuthClaims, User } from "@shared/types";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setDevUser: (id: "ali" | "sara" | "omar") => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const tokenRef = useRef<string | null>(null);
  const [devClaims, setDevClaims] = useState<AuthClaims | null>(null);

  useEffect(() => {
    configureAuth({
      token: () => tokenRef.current,
      devUser: () => devClaims,
    });
  }, [devClaims]);

  useEffect(() => {
    (async () => {
      try {
        if (USE_MOCKS) {
          const stored = typeof window !== "undefined" ? localStorage.getItem("mock-user") : null;
          if (stored) {
            setMockUser(stored);
            const me = await api.me();
            setDevClaims(toClaims(me));
            setUser(me);
          }
        } else {
          const session = await cognito.getCurrentSession();
          if (session) {
            tokenRef.current = session.idToken;
            const me = await api.me();
            setUser(me);
          }
        }
      } catch (err) {
        console.warn("auth init failed", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function toClaims(u: User): AuthClaims {
    return { sub: u.userId, email: u.email, name: u.name, role: u.role, teamId: u.teamId };
  }

  const value: AuthContextValue = {
    user,
    loading,
    signIn: async (email, password) => {
      const session = await cognito.signIn(email, password);
      tokenRef.current = session.idToken;
      const me = await api.me();
      setUser(me);
    },
    signOut: async () => {
      cognito.signOut();
      tokenRef.current = null;
      setDevClaims(null);
      setUser(null);
      if (typeof window !== "undefined") localStorage.removeItem("mock-user");
    },
    setDevUser: async (id) => {
      setMockUser(id);
      if (typeof window !== "undefined") localStorage.setItem("mock-user", id);
      const me = await api.me();
      setDevClaims(toClaims(me));
      setUser(me);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
