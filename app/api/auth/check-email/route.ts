// app/api/auth/check-email/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.error("[check-email api] Missing Supabase env vars");
    throw new Error("Missing Supabase configuration");
  }

  return createClient(url, anonKey);
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

    const supabase = getSupabaseServer();

    // 이메일 존재 여부만 체크
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error("[check-email api] error:", error);
      return NextResponse.json(
        { error: "Failed to check email", exists: false },
        { status: 500 }
      );
    }

    return NextResponse.json({ exists: !!data });
  } catch (err: any) {
    console.error("[check-email api] unexpected:", err);
    return NextResponse.json(
      { error: "Internal server error", exists: false },
      { status: 500 }
    );
  }
}
