// app/api/auth/check-email/route.ts
/**
 * 이메일 존재 여부 확인 API
 * 
 * POST /api/auth/check-email
 * 
 * - 존재하면: { exists: true } → 로그인 페이지로
 * - 없으면: { exists: false } → 회원가입 페이지로
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Service Role Key 사용 (RLS 우회)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[check-email] Missing Supabase env vars");
    throw new Error("Missing Supabase configuration");
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(req: Request) {
  try {
    const { email } = (await req.json()) as { email?: string };

    if (!email) {
      return NextResponse.json(
        { error: "Email is required", exists: false },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const normalizedEmail = email.trim().toLowerCase();

    // users 테이블에서 이메일 존재 여부 체크
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (error) {
      console.error("[check-email] DB error:", error);
      return NextResponse.json(
        { error: "Failed to check email", exists: false },
        { status: 500 }
      );
    }

    const exists = !!data;
    console.log("[check-email]", normalizedEmail, "exists:", exists);

    return NextResponse.json({ exists });
  } catch (err: any) {
    console.error("[check-email] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error", exists: false },
      { status: 500 }
    );
  }
}
