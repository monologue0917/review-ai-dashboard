// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
  try {
    const { email, password } = (await req.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email.trim())
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // ⚠️ 현재는 plain text 비교 (나중에 bcrypt로 교체)
    if (user.password_hash !== password) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const { data: salon } = await supabase
      .from("salons")
      .select("*")
      .eq("owner_user_id", user.id)
      .maybeSingle();

    const authPayload = {
      userId: user.id as string,
      email: user.email as string,
      contactName: (user.contact_name as string | null) ?? null,
      phoneNumber: (user.phone_number as string | null) ?? null,
      salonId: (salon?.id as string | null) ?? null,
      salonName: (salon?.name as string | null) ?? null,
      country: (salon?.country as string | null) ?? null,
      state: (salon?.state as string | null) ?? null,
      city: (salon?.city as string | null) ?? null,
    };

    return NextResponse.json({ auth: authPayload }, { status: 200 });
  } catch (err: any) {
    console.error("[POST /api/auth/login] Unexpected error:", err);
    return NextResponse.json(
      {
        error: "Unexpected server error",
        detail: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}
