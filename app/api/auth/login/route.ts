// app/api/auth/login/route.ts
/**
 * ===================================================================
 * 로그인 API (Rate Limit 적용)
 * ===================================================================
 * 
 * POST /api/auth/login
 * 
 * Rate Limit:
 * - IP당 분당 10회 시도
 * - 5회 연속 실패 시 5분 잠금
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  checkLoginRateLimit,
  recordLoginAttempt,
  getClientIP,
  getRateLimitErrorMessage,
} from "@/lib/rateLimit/loginRateLimit";

type LoginPayload = {
  email: string;
  password: string;
};

// 일반 클라이언트 (로그인용)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Service Role 클라이언트 (DB 조회용)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  // 0) 클라이언트 IP 추출
  const clientIP = getClientIP(req);
  
  // 1) Rate Limit 체크
  const rateLimitResult = checkLoginRateLimit(clientIP);
  
  if (!rateLimitResult.allowed) {
    console.log("[login] Rate limited:", {
      ip: clientIP,
      reason: rateLimitResult.reason,
      retryAfter: rateLimitResult.retryAfter,
    });
    
    return NextResponse.json(
      { 
        error: getRateLimitErrorMessage(rateLimitResult),
        retryAfter: rateLimitResult.retryAfter,
      },
      { 
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
        },
      }
    );
  }

  try {
    const body = (await req.json()) as Partial<LoginPayload>;

    // 2) 이메일/비밀번호 검증
    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!email || !password) {
      // 잘못된 입력도 시도로 기록 (자동화 공격 방지)
      recordLoginAttempt(clientIP, false);
      
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // 3) Supabase Auth 로그인
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      // ❌ 로그인 실패 기록
      recordLoginAttempt(clientIP, false);
      
      console.log("[login] Auth failed:", {
        ip: clientIP,
        email,
        error: authError?.message,
      });
      
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // ✅ 로그인 성공 기록
    recordLoginAttempt(clientIP, true);

    const authId = authData.user.id;
    console.log("[login] Auth successful:", { authId, ip: clientIP });

    // 4) users 테이블에서 프로필 조회
    const { data: userRow, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, email, contact_name")
      .eq("auth_id", authId)
      .single();

    if (userError || !userRow) {
      console.error("[login] User not found for auth_id:", authId);
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // 5) salons 테이블에서 살롱 조회
    const { data: salonRow, error: salonError } = await supabaseAdmin
      .from("salons")
      .select("id, name")
      .eq("owner_user_id", userRow.id)
      .single();

    if (salonError) {
      console.warn("[login] Salon not found for user:", userRow.id);
    }

    console.log("[login] ✅ Login complete:", {
      userId: userRow.id,
      salonId: salonRow?.id,
      ip: clientIP,
    });

    // 6) 응답 - 세션 토큰 포함
    return NextResponse.json({
      success: true,
      user: {
        id: userRow.id,
        email: userRow.email,
        name: userRow.contact_name,
      },
      salon: salonRow
        ? {
            id: salonRow.id,
            name: salonRow.name,
          }
        : null,
      // Supabase 세션 정보
      session: {
        accessToken: authData.session?.access_token,
        refreshToken: authData.session?.refresh_token,
        expiresAt: authData.session?.expires_at,
      },
    });
  } catch (error: any) {
    // 예외 발생해도 실패로 기록
    recordLoginAttempt(clientIP, false);
    
    console.error("[login] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
