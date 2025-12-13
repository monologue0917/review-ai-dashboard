// app/api/auth/signup/route.ts
/**
 * ===================================================================
 * 회원가입 API (Supabase Auth 버전)
 * ===================================================================
 * 
 * POST /api/auth/signup
 * 
 * 1. Supabase Auth로 유저 생성
 * 2. users 테이블에 프로필 저장 (auth_id 연결)
 * 3. salons 테이블에 살롱 생성
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type SignupPayload = {
  email: string;
  password: string;
  contactName: string;
  phoneNumber: string;
  salonName: string;
  country: string;
  state: string;
  city: string;
};

// Service Role 클라이언트 (Auth 관리용)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<SignupPayload>;

    // 1) 이메일 정규화
    const rawEmail = body.email?.trim();
    const email = rawEmail ? rawEmail.toLowerCase() : undefined;

    const {
      password,
      contactName,
      phoneNumber,
      salonName,
      country,
      state,
      city,
    } = body;

    // 2) 필수값 체크
    if (
      !email ||
      !password ||
      !contactName ||
      !phoneNumber ||
      !salonName ||
      !country ||
      !state ||
      !city
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 비밀번호 최소 길이
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // 3) Supabase Auth로 유저 생성
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 이메일 인증 스킵 (개발용)
    });

    if (authError || !authData.user) {
      console.error("[signup] Supabase Auth error:", authError);
      
      // 이미 존재하는 이메일
      if (authError?.message?.includes("already")) {
        return NextResponse.json(
          { error: "This email is already registered." },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: authError?.message || "Failed to create account" },
        { status: 500 }
      );
    }

    const authId = authData.user.id;
    console.log("[signup] Auth user created:", authId);

    // 4) users 테이블에 프로필 저장
    const { data: userRow, error: userError } = await supabaseAdmin
      .from("users")
      .insert({
        auth_id: authId,
        email,
        contact_name: contactName,
        phone_number: phoneNumber,
      })
      .select()
      .single();

    if (userError || !userRow) {
      console.error("[signup] users insert error:", userError);
      
      // 롤백: Auth 유저 삭제
      await supabaseAdmin.auth.admin.deleteUser(authId);
      
      return NextResponse.json(
        { error: userError?.message || "Failed to create user profile" },
        { status: 500 }
      );
    }

    // 5) salons 테이블에 살롱 생성
    const { data: salonRow, error: salonError } = await supabaseAdmin
      .from("salons")
      .insert({
        owner_user_id: userRow.id,
        name: salonName,
        country,
        state,
        city,
      })
      .select()
      .single();

    if (salonError || !salonRow) {
      console.error("[signup] salons insert error:", salonError);
      
      // 롤백: users, Auth 유저 삭제
      await supabaseAdmin.from("users").delete().eq("id", userRow.id);
      await supabaseAdmin.auth.admin.deleteUser(authId);
      
      return NextResponse.json(
        { error: salonError?.message || "Failed to create salon" },
        { status: 500 }
      );
    }

    console.log("[signup] ✅ Signup complete:", { 
      authId, 
      userId: userRow.id, 
      salonId: salonRow.id 
    });

    return NextResponse.json(
      {
        success: true,
        userId: userRow.id,
        salonId: salonRow.id,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[signup] Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        detail: String(error?.message ?? error),
      },
      { status: 500 }
    );
  }
}
