// app/api/google/connection/route.ts
/**
 * GET /api/google/connection?userId=xxx&salonId=xxx
 * 
 * Google 계정 연결 상태 조회
 * 
 * Returns:
 * {
 *   ok: true,
 *   data: {
 *     connected: boolean,
 *     email?: string,
 *     lastSync?: string
 *   }
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const salonId = searchParams.get("salonId");

    if (!userId || !salonId) {
      return NextResponse.json(
        { ok: false, error: "Missing userId or salonId" },
        { status: 400 }
      );
    }

    console.log("[GET /api/google/connection] Checking connection:", {
      userId,
      salonId,
    });

    // 1. salon_google_connections에서 연결 확인
    const { data: connection, error: connectionError } = await supabase
      .from("salon_google_connections")
      .select(
        `
        *,
        google_account:google_accounts(email, updated_at)
      `
      )
      .eq("salon_id", salonId)
      .maybeSingle();

    if (connectionError) {
      console.error(
        "[GET /api/google/connection] Connection query error:",
        connectionError
      );
      return NextResponse.json(
        { ok: false, error: "Database query failed" },
        { status: 500 }
      );
    }

    // 2. 연결 없음
    if (!connection || !connection.google_account) {
      console.log("[GET /api/google/connection] Not connected");
      return NextResponse.json({
        ok: true,
        data: {
          connected: false,
        },
      });
    }

    // 3. 연결 있음
    console.log("[GET /api/google/connection] Connected:", {
      email: connection.google_account.email,
    });

    return NextResponse.json({
      ok: true,
      data: {
        connected: true,
        email: connection.google_account.email || undefined,
        lastSync: connection.google_account.updated_at || undefined,
      },
    });
  } catch (err: any) {
    console.error("[GET /api/google/connection] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}