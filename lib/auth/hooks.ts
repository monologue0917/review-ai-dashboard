// lib/auth/hooks.ts
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export const AUTH_STORAGE_KEY = "reviewai_auth";

export type AuthSession = {
  email: string;
  userId: string;
  salonId?: string;
  salonName?: string;
};

export function readAuthFromStorage(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.email || !parsed?.userId) return null;
    return parsed as AuthSession;
  } catch {
    return null;
  }
}

export function writeAuthToStorage(session: AuthSession | null) {
  if (typeof window === "undefined") return;
  if (!session) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify(session)
  );
}

export function useAuth() {
  const [auth, setAuthState] = useState<AuthSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const stored = readAuthFromStorage();
    setAuthState(stored);
    setIsReady(true);
  }, []);

  const setAuth = (value: AuthSession | null) => {
    setAuthState(value);
    writeAuthToStorage(value);
  };

  return { auth, setAuth, isReady };
}

// 👉 보호된 페이지(/dashboard 등)에서 사용
export function useRequireAuth() {
  const router = useRouter();
  const { auth, isReady } = useAuth();

  useEffect(() => {
    if (!isReady) return;
    if (!auth) {
      router.replace("/start");
    }
  }, [auth, isReady, router]);

  return { auth, isReady };
}

// 👉 로그아웃용 헬퍼
export function clearAuth() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}
