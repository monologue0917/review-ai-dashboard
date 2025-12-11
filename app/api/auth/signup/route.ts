// app/api/auth/signup/route.ts
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

function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.error("[signup api] Missing Supabase env vars");
    throw new Error("Missing Supabase configuration");
  }

  return createClient(url, anonKey);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<SignupPayload>;

    // 1) raw 이메일 받아서 정규화
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

    // 2) 필수값 체크 (email은 위에서 정규화한 값 기준)
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

    const supabase = getSupabaseServer();

    // 3) users insert
    const { data: userRow, error: userError } = await supabase
      .from("users")
      .insert({
        email,               // 항상 소문자+trim 된 값
        password_hash: password, // ⚠️ 나중에 bcrypt로 해시 계획
        contact_name: contactName,
        phone_number: phoneNumber,
      })
      .select()
      .single();

    if (userError || !userRow) {
      const code = (userError as any)?.code;
      if (code === "23505") {
        return NextResponse.json(
          { error: "This email is already registered." },
          { status: 409 }
        );
      }

      console.error("[signup api] user insert error:", userError);
      return NextResponse.json(
        { error: userError?.message || "Failed to create user" },
        { status: 500 }
      );
    }

    // 4) salons insert
    const { data: salonRow, error: salonError } = await supabase
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
      console.error("[signup api] salon insert error:", salonError);
      return NextResponse.json(
        { error: salonError?.message || "Failed to create salon" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        userId: userRow.id,
        salonId: salonRow.id,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[signup api] unexpected error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        detail: String(error?.message ?? error),
      },
      { status: 500 }
    );
  }
}
