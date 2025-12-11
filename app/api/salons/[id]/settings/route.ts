// app/api/salons/[id]/settings/route.ts
/**
 * ===================================================================
 * 살롱 설정 API
 * ===================================================================
 * 
 * GET  /api/salons/[id]/settings - 설정 조회
 * PUT  /api/salons/[id]/settings - 설정 전체 업데이트
 * PATCH /api/salons/[id]/settings - 설정 부분 업데이트
 * 
 * 응답 형식: ApiResponse<SalonSettingsDTO>
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { ApiResponse, ApiError } from "@/lib/api/types";
import { ErrorCode } from "@/lib/api/types";

/* ===== 환경변수 ===== */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase env vars");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/* ===== 타입 정의 ===== */

type SalonSettingsDTO = {
  // 기본 정보
  name: string;
  
  // 자동 답글 설정
  autoReplyGoogle: boolean;
  autoReplyYelp: boolean;
  autoReplyMinRating: number;
  
  // 알림 설정
  notificationEmail: string;
  
  // 연동 설정
  googlePlaceId: string;
  yelpBusinessId: string;
  
  // Google 연결 정보
  googleConnected: boolean;
  googleEmail: string | null;
  googleLocationId: string | null;
  googleLocationName: string | null;
};

type SalonRow = {
  id: string;
  name: string | null;
  auto_reply_google: boolean | null;
  auto_reply_yelp: boolean | null;
  auto_reply_min_rating: number | null;
  notification_email: string | null;
  google_place_id: string | null;
  yelp_business_id: string | null;
};

type GoogleConnectionRow = {
  location_id: string | null;
  location_title: string | null;
  google_accounts: {
    email: string | null;
  } | null;
};

/* ===== GET 핸들러 ===== */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<SalonSettingsDTO>>> {
  try {
    // Next.js 15+: params는 Promise
    const { id: salonId } = await params;

    if (!salonId) {
      return NextResponse.json<ApiError>(
        { ok: false, error: "Missing salon ID", code: ErrorCode.INVALID_SALON_ID },
        { status: 400 }
      );
    }

    console.log("[GET /api/salons/:id/settings] salonId:", salonId);

    // 1. Salon 설정 가져오기
    const { data: salon, error: salonError } = await supabase
      .from("salons")
      .select("id, name, auto_reply_google, auto_reply_yelp, auto_reply_min_rating, notification_email, google_place_id, yelp_business_id")
      .eq("id", salonId)
      .single();

    if (salonError || !salon) {
      console.error("[GET /api/salons/:id/settings] Salon not found:", salonError);
      return NextResponse.json<ApiError>(
        { ok: false, error: "Salon not found", code: ErrorCode.SALON_NOT_FOUND },
        { status: 404 }
      );
    }

    const typedSalon = salon as SalonRow;

    // 2. Google 연결 정보 가져오기
    const { data: googleConnection } = await supabase
      .from("salon_google_connections")
      .select(`
        location_id,
        location_title,
        google_accounts(email)
      `)
      .eq("salon_id", salonId)
      .maybeSingle();

    const typedConnection = googleConnection as GoogleConnectionRow | null;

    // 3. 응답 구성
    const response: ApiResponse<SalonSettingsDTO> = {
      ok: true,
      data: {
        // 기본 정보
        name: typedSalon.name || "",
        
        // 자동 답글 설정
        autoReplyGoogle: typedSalon.auto_reply_google || false,
        autoReplyYelp: typedSalon.auto_reply_yelp || false,
        autoReplyMinRating: typedSalon.auto_reply_min_rating ?? 4,
        
        // 알림 설정
        notificationEmail: typedSalon.notification_email || "",
        
        // 연동 설정
        googlePlaceId: typedSalon.google_place_id || "",
        yelpBusinessId: typedSalon.yelp_business_id || "",
        
        // Google 연결 정보
        googleConnected: !!typedConnection,
        googleEmail: typedConnection?.google_accounts?.email || null,
        googleLocationId: typedConnection?.location_id || null,
        googleLocationName: typedConnection?.location_title || null,
      },
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("[GET /api/salons/:id/settings] Error:", err);
    return NextResponse.json<ApiError>(
      { ok: false, error: "Internal server error", code: ErrorCode.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}

/* ===== PUT 핸들러 (전체 업데이트) ===== */

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<{ updated: boolean }>>> {
  const { id: salonId } = await params;
  return handleUpdate(req, salonId);
}

/* ===== PATCH 핸들러 (부분 업데이트) ===== */

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<{ updated: boolean }>>> {
  const { id: salonId } = await params;
  return handleUpdate(req, salonId);
}

/* ===== 공통 업데이트 로직 ===== */

async function handleUpdate(
  req: NextRequest,
  salonId: string
): Promise<NextResponse<ApiResponse<{ updated: boolean }>>> {
  try {
    if (!salonId) {
      return NextResponse.json<ApiError>(
        { ok: false, error: "Missing salon ID", code: ErrorCode.INVALID_SALON_ID },
        { status: 400 }
      );
    }

    const body = await req.json();
    console.log("[PUT/PATCH /api/salons/:id/settings] Updating:", body);

    // 업데이트할 필드 구성 (undefined가 아닌 것만)
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.autoReplyGoogle !== undefined) {
      updates.auto_reply_google = body.autoReplyGoogle;
    }
    if (body.autoReplyYelp !== undefined) {
      updates.auto_reply_yelp = body.autoReplyYelp;
    }
    if (body.autoReplyMinRating !== undefined) {
      updates.auto_reply_min_rating = body.autoReplyMinRating;
    }
    if (body.notificationEmail !== undefined) {
      updates.notification_email = body.notificationEmail;
    }
    if (body.googlePlaceId !== undefined) {
      updates.google_place_id = body.googlePlaceId;
    }
    if (body.yelpBusinessId !== undefined) {
      updates.yelp_business_id = body.yelpBusinessId;
    }

    // Salon 설정 업데이트
    const { error: updateError } = await supabase
      .from("salons")
      .update(updates)
      .eq("id", salonId);

    if (updateError) {
      console.error("[PUT/PATCH /api/salons/:id/settings] Update error:", updateError);
      return NextResponse.json<ApiError>(
        { ok: false, error: "Failed to update settings", code: ErrorCode.DATABASE_ERROR },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<{ updated: boolean }>>({
      ok: true,
      data: { updated: true },
    });
  } catch (err) {
    console.error("[PUT/PATCH /api/salons/:id/settings] Error:", err);
    return NextResponse.json<ApiError>(
      { ok: false, error: "Internal server error", code: ErrorCode.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
