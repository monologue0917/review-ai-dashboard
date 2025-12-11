// lib/google/oauth-utils.ts
/**
 * Google OAuth 관련 유틸리티 함수
 * - State 생성/검증
 * - HMAC 서명
 */

import { createHmac, timingSafeEqual } from "crypto";

/* ===== 타입 정의 ===== */

export type OAuthState = {
  userId: string;
  salonId: string;
  redirectPath?: string;
  ts: number;
};

/* ===== State 생성/검증 ===== */

/**
 * OAuth state 생성
 * - payload를 JSON → base64url 인코딩
 * - HMAC-SHA256 서명 추가
 * - 최종 형식: "<base64url>.<signature>"
 */
export function createOAuthState(
  payload: OAuthState,
  secret: string
): string {
  const jsonStr = JSON.stringify(payload);
  const base64url = Buffer.from(jsonStr)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const signature = createHmac("sha256", secret)
    .update(base64url)
    .digest("hex");

  return `${base64url}.${signature}`;
}

/**
 * OAuth state 검증 및 파싱
 * - 서명 검증 (timing-safe)
 * - base64url decode → JSON parse
 * 
 * @returns OAuthState | null (검증 실패 시 null)
 */
export function verifyOAuthState(
  state: string,
  secret: string
): OAuthState | null {
  try {
    const parts = state.split(".");
    if (parts.length !== 2) {
      console.error("[verifyOAuthState] Invalid state format");
      return null;
    }

    const [base64url, providedSignature] = parts;

    // 서명 재계산
    const expectedSignature = createHmac("sha256", secret)
      .update(base64url)
      .digest("hex");

    // Timing-safe 비교
    const providedBuffer = Buffer.from(providedSignature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (
      providedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      console.error("[verifyOAuthState] Signature mismatch");
      return null;
    }

    // base64url decode
    const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const jsonStr = Buffer.from(padded, "base64").toString("utf-8");

    const payload = JSON.parse(jsonStr) as OAuthState;

    // 기본 검증
    if (!payload.userId || !payload.salonId) {
      console.error("[verifyOAuthState] Missing userId or salonId");
      return null;
    }

    return payload;
  } catch (err) {
    console.error("[verifyOAuthState] Error:", err);
    return null;
  }
}   