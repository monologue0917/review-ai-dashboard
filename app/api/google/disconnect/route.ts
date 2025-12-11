// app/api/google/disconnect/route.ts
/**
 * POST /api/google/disconnect
 * 
 * Google 계정 연결 해제
 * 
 * Body: { userId: string, salonId: string }
 * 
 * Returns:
 * {
 *   ok: true,
 *   message: "Disconnected successfully"
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase env vars");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, salonId } = body;

    if (!userId || !salonId) {
      return NextResponse.json(
        { ok: false, error: "Missing userId or salonId" },
        { status: 400 }
      );
    }

    console.log("[POST /api/google/disconnect] Disconnecting:", {
      userId,
      salonId,
    });

    // 1. salon_google_connections 삭제
    const { error: connectionError } = await supabase
      .from("salon_google_connections")
      .delete()
      .eq("salon_id", salonId);

    if (connectionError) {
      console.error(
        "[POST /api/google/disconnect] Connection delete error:",
        connectionError
      );
      return NextResponse.json(
        { ok: false, error: "Failed to disconnect" },
        { status: 500 }
      );
    }

    // 2. google_accounts는 유지 (다른 살롱에서 사용할 수 있음)
    // 만약 완전히 삭제하려면:
    // const { error: accountError } = await supabase
    //   .from("google_accounts")
    //   .delete()
    //   .eq("user_id", userId);

    console.log("[POST /api/google/disconnect] Disconnected successfully");

    return NextResponse.json({
      ok: true,
      message: "Disconnected successfully",
    });
  } catch (err: any) {
    console.error("[POST /api/google/disconnect] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}