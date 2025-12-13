// lib/auth/useAuthInfo.ts
"use client";

import { useEffect, useState, useCallback } from "react";

export type AuthInfo = {
  userId: string;
  email: string;
  salonId: string;
  salonName: string;
  // Supabase 세션 정보
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
};

const STORAGE_KEY = "reviewai_auth";

function loadInitialAuth(): AuthInfo | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    return {
      userId: String(parsed.userId ?? ""),
      email: String(parsed.email ?? ""),
      salonId: String(parsed.salonId ?? ""),
      salonName: String(parsed.salonName ?? ""),
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      expiresAt: parsed.expiresAt,
    };
  } catch (e) {
    console.warn("[useAuthInfo] Failed to parse auth from localStorage:", e);
    return null;
  }
}

/**
 * 세션이 만료되었는지 확인 (5분 여유)
 */
function isSessionExpired(expiresAt?: number): boolean {
  if (!expiresAt) return true;
  const now = Math.floor(Date.now() / 1000);
  return now >= expiresAt - 300; // 5분 전에 만료로 간주
}

export function useAuthInfo() {
  const [auth, setAuthState] = useState<AuthInfo | null>(() => loadInitialAuth());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const current = loadInitialAuth();
    setAuthState(current);
    setIsLoaded(true);

    // 다른 탭에서 로그인/로그아웃 반영
    function handleStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) {
        setAuthState(loadInitialAuth());
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const setAuth = useCallback((info: AuthInfo | null) => {
    if (typeof window === "undefined") return;

    if (info) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
      setAuthState(info);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
      setAuthState(null);
    }
  }, []);

  const clearAuth = useCallback(() => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
    setAuthState(null);
  }, []);

  // 세션 만료 여부
  const isExpired = isSessionExpired(auth?.expiresAt);

  // 토큰 갱신 함수
  const refreshSession = useCallback(async (): Promise<boolean> => {
    if (!auth?.refreshToken) return false;

    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: auth.refreshToken }),
      });

      if (!res.ok) {
        clearAuth();
        return false;
      }

      const data = await res.json();
      if (data.session) {
        setAuth({
          ...auth,
          accessToken: data.session.accessToken,
          refreshToken: data.session.refreshToken,
          expiresAt: data.session.expiresAt,
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error("[useAuthInfo] Refresh failed:", err);
      return false;
    }
  }, [auth, setAuth, clearAuth]);

  return { 
    auth, 
    isLoaded, 
    setAuth, 
    clearAuth,
    isExpired,
    refreshSession,
  };
}

/**
 * API 호출용 헤더 생성 (인증 토큰 포함)
 */
export function getAuthHeaders(): HeadersInit {
  if (typeof window === "undefined") return {};
  
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    
    const parsed = JSON.parse(raw);
    if (parsed?.accessToken) {
      return {
        Authorization: `Bearer ${parsed.accessToken}`,
      };
    }
  } catch {
    // ignore
  }
  return {};
}
