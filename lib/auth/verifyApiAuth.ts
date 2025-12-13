// lib/auth/verifyApiAuth.ts
/**
 * ===================================================================
 * API 인증 검증 유틸리티
 * ===================================================================
 * 
 * API Routes에서 사용자 인증을 검증하고,
 * 요청된 리소스에 대한 접근 권한을 확인합니다.
 * 
 * 사용법:
 * ```ts
 * const auth = await verifyAuth(req);
 * if (!auth.ok) {
 *   return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
 * }
 * const { userId, salonId } = auth;
 * ```
 */

import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

/* ===== Supabase 클라이언트 ===== */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service Role로 토큰 검증
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

/* ===== 타입 정의 ===== */

export type AuthResult = 
  | { ok: true; userId: string; email: string; salonId: string }
  | { ok: false; error: string; code: string };

export type VerifyOptions = {
  requireSalon?: boolean; // salonId가 필수인지 (기본: true)
};

/* ===== 메인 함수 ===== */

/**
 * API 요청의 인증을 검증합니다.
 * 
 * 1. Authorization 헤더에서 Bearer 토큰 추출
 * 2. Supabase Auth로 토큰 검증
 * 3. users 테이블에서 해당 유저의 salon 정보 조회
 * 
 * @param req - NextRequest
 * @param options - 검증 옵션
 * @returns AuthResult
 */
export async function verifyAuth(
  req: NextRequest,
  options: VerifyOptions = {}
): Promise<AuthResult> {
  const { requireSalon = true } = options;

  try {
    // 1) Authorization 헤더 추출
    const authHeader = req.headers.get("authorization");
    
    if (!authHeader) {
      return {
        ok: false,
        error: "Missing Authorization header",
        code: "UNAUTHORIZED",
      };
    }

    // 2) Bearer 토큰 파싱
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
      return {
        ok: false,
        error: "Invalid Authorization header format",
        code: "UNAUTHORIZED",
      };
    }

    const accessToken = parts[1];

    // 3) Supabase Auth로 토큰 검증
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !user) {
      console.error("[verifyAuth] Token verification failed:", authError?.message);
      return {
        ok: false,
        error: "Invalid or expired token",
        code: "UNAUTHORIZED",
      };
    }

    // 4) users 테이블에서 salon 정보 조회
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, email, salon_id")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      console.error("[verifyAuth] User not found:", userError?.message);
      return {
        ok: false,
        error: "User not found in database",
        code: "USER_NOT_FOUND",
      };
    }

    // 5) Salon 필수 체크
    if (requireSalon && !userData.salon_id) {
      return {
        ok: false,
        error: "No salon associated with this user",
        code: "NO_SALON",
      };
    }

    return {
      ok: true,
      userId: userData.id,
      email: userData.email || user.email || "",
      salonId: userData.salon_id || "",
    };
  } catch (err) {
    console.error("[verifyAuth] Unexpected error:", err);
    return {
      ok: false,
      error: "Authentication failed",
      code: "AUTH_ERROR",
    };
  }
}

/**
 * 요청된 salonId가 현재 유저의 salon인지 확인합니다.
 * 
 * @param auth - 검증된 인증 정보
 * @param requestedSalonId - 요청된 salonId
 * @returns 권한 있으면 true
 */
export function verifySalonAccess(
  auth: Extract<AuthResult, { ok: true }>,
  requestedSalonId: string
): boolean {
  return auth.salonId === requestedSalonId;
}

/**
 * 인증 + 살롱 접근 권한을 한 번에 검증합니다.
 * 
 * @param req - NextRequest
 * @param requestedSalonId - 요청된 salonId
 * @returns AuthResult
 */
export async function verifyAuthAndSalonAccess(
  req: NextRequest,
  requestedSalonId: string
): Promise<AuthResult> {
  const auth = await verifyAuth(req);
  
  if (!auth.ok) {
    return auth;
  }

  if (!verifySalonAccess(auth, requestedSalonId)) {
    return {
      ok: false,
      error: "Access denied to this salon",
      code: "FORBIDDEN",
    };
  }

  return auth;
}
