// lib/auth/useAuthInfo.ts
"use client";

import { useEffect, useState } from "react";

export type AuthInfo = {
  userId: string;
  email: string;
  salonId: string;
  salonName: string;
};

const STORAGE_KEY = "reviewai_auth";

function loadInitialAuth(): AuthInfo | null {
  // 여기서는 Hook 안 쓰는 순수 함수라 window 체크 가능
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    return {
      userId: String((parsed as any).userId),
      email: String((parsed as any).email),
      salonId: String((parsed as any).salonId),
      salonName: String((parsed as any).salonName ?? ""),
    };
  } catch (e) {
    console.warn("[useAuthInfo] Failed to parse auth from localStorage:", e);
    return null;
  }
}

export function useAuthInfo() {
  // ✅ 항상 같은 순서로 useState/useEffect 호출
  const [auth, setAuthState] = useState<AuthInfo | null>(() => loadInitialAuth());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // 클라이언트에서 한 번 더 동기화
    const current = loadInitialAuth();
    setAuthState(current);
    setIsLoaded(true);

    // (선택) 다른 탭에서 로그인/로그아웃했을 때 반영
    function handleStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) {
        setAuthState(loadInitialAuth());
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const setAuth = (info: AuthInfo | null) => {
    if (typeof window === "undefined") return;

    if (info) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
      setAuthState(info);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
      setAuthState(null);
    }
  };

  const clearAuth = () => setAuth(null);

  return { auth, isLoaded, setAuth, clearAuth };
}
