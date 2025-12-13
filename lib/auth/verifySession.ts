// lib/auth/verifySession.ts
/**
 * ===================================================================
 * API 세션 검증 헬퍼
 * ===================================================================
 * 
 * API 라우트에서 Supabase Auth 세션을 검증합니다.
 */

import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Service Role 클라이언트
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type VerifiedUser = {
  authId: string;        // Supabase Auth ID
  userId: string;        // users 테이블 ID
  email: string;
  salonId: string | null;
};

export type VerifyResult = 
  | { ok: true; user: VerifiedUser }
  | { ok: false; error: string; status: number };

/**
 * Authorization 헤더에서 Bearer 토큰 추출
 */
function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

/**
 * API 요청에서 세션 검증
 * 
 * @example
 * const result = await verifySession(req);
 * if (!result.ok) {
 *   return NextResponse.json({ error: result.error }, { status: result.status });
 * }
 * const { user } = result;
 */
export async function verifySession(req: NextRequest): Promise<VerifyResult> {
  try {
    // 1) 토큰 추출
    const token = extractToken(req);
    
    if (!token) {
      return { ok: false, error: "Missing authorization token", status: 401 };
    }

    // 2) Supabase Auth로 토큰 검증
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !authUser) {
      console.error("[verifySession] Auth error:", authError?.message);
      return { ok: false, error: "Invalid or expired token", status: 401 };
    }

    // 3) users 테이블에서 프로필 조회
    const { data: userRow, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, email")
      .eq("auth_id", authUser.id)
      .single();

    if (userError || !userRow) {
      console.error("[verifySession] User not found:", authUser.id);
      return { ok: false, error: "User profile not found", status: 404 };
    }

    // 4) 살롱 조회
    const { data: salonRow } = await supabaseAdmin
      .from("salons")
      .select("id")
      .eq("owner_user_id", userRow.id)
      .single();

    return {
      ok: true,
      user: {
        authId: authUser.id,
        userId: userRow.id,
        email: userRow.email,
        salonId: salonRow?.id || null,
      },
    };
  } catch (err) {
    console.error("[verifySession] Error:", err);
    return { ok: false, error: "Session verification failed", status: 500 };
  }
}

/**
 * 살롱 접근 권한 확인
 * 
 * @param user 검증된 유저
 * @param salonId 접근하려는 살롱 ID
 * @returns 접근 가능 여부
 */
export function canAccessSalon(user: VerifiedUser, salonId: string): boolean {
  return user.salonId === salonId;
}

/**
 * 리뷰 접근 권한 확인 (살롱 기반)
 */
export async function canAccessReview(user: VerifiedUser, reviewId: number): Promise<boolean> {
  const { data: review } = await supabaseAdmin
    .from("reviews")
    .select("salon_id")
    .eq("id", reviewId)
    .single();

  if (!review) return false;
  return user.salonId === review.salon_id;
}

/**
 * Reply 접근 권한 확인 (살롱 기반)
 */
export async function canAccessReply(user: VerifiedUser, replyId: string): Promise<boolean> {
  const { data: reply } = await supabaseAdmin
    .from("review_replies")
    .select("salon_id")
    .eq("id", replyId)
    .single();

  if (!reply) return false;
  return user.salonId === reply.salon_id;
}
