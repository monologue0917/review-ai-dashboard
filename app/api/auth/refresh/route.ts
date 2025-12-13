// app/api/auth/refresh/route.ts
/**
 * ===================================================================
 * 토큰 갱신 API
 * ===================================================================
 * 
 * POST /api/auth/refresh
 * 
 * Supabase Auth 토큰을 갱신합니다.
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RefreshPayload = {
  refreshToken: string;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<RefreshPayload>;
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Refresh token is required" },
        { status: 400 }
      );
    }

    // Supabase Auth로 토큰 갱신
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      console.error("[refresh] Error:", error?.message);
      return NextResponse.json(
        { error: "Failed to refresh session" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
      },
    });
  } catch (error: any) {
    console.error("[refresh] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
