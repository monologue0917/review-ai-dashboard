// lib/auth/useRequireLogin.ts
"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthInfo } from "./useAuthInfo";

const PUBLIC_PATHS = ["/start", "/login", "/signup"];

export function useRequireLogin() {
  const router = useRouter();
  const pathname = usePathname();
  const { auth, isLoaded } = useAuthInfo();

  useEffect(() => {
    // 아직 localStorage에서 auth 로딩이 안 끝난 상태면 아무 것도 안 함
    if (!isLoaded) return;

    // 로그인 안 되어 있고, 지금 위치가 공개 페이지가 아니면 /start로 보냄
    const isPublic = PUBLIC_PATHS.includes(pathname);
    if (!auth && !isPublic) {
      router.replace(`/start?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [auth, isLoaded, pathname, router]);

  return { auth, isLoaded };
}
