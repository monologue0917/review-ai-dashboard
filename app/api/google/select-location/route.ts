// app/api/google/select-location/route.ts
/**
 * POST /api/google/select-location
 * 
 * 사용자가 선택한 Google Business Profile location을 DB에 저장
 * 
 * Request Body:
 * {
 *   "salonId": "6ed4ff93-6920-4698-8bcf-ff35b5c0434a",
 *   "locationId": "accounts/123/locations/456",
 *   "locationName": "Sunny Nails Downtown"
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { ApiResponse, ApiError } from "@/lib/api/types";
import { ErrorCode } from "@/lib/api/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase env vars");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

interface SelectLocationResult {
  salonId: string;
  locationId: string;
  locationName?: string;
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<SelectLocationResult>>> {
  try {
    console.log("[POST /api/google/select-location] Request received");

    // 1. Request body 파싱
    const body = await req.json();
    const { salonId, locationId, locationName } = body;

    console.log("[POST /api/google/select-location] Body:", {
      salonId,
      locationId,
      locationName,
    });

    // 2. Validation
    if (!locationId) {
      console.error("[POST /api/google/select-location] Missing locationId");
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: "Missing locationId",
          code: ErrorCode.INVALID_INPUT,
        },
        { status: 400 }
      );
    }

    if (!salonId) {
      console.error("[POST /api/google/select-location] Missing salonId");
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: "Missing salonId",
          code: ErrorCode.INVALID_SALON_ID,
        },
        { status: 400 }
      );
    }

    // 3. Salon 존재 확인
    const { data: salon, error: salonError } = await supabaseAdmin
      .from("salons")
      .select("id, name")
      .eq("id", salonId)
      .maybeSingle();

    if (salonError) {
      console.error("[POST /api/google/select-location] Salon query error:", salonError);
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: "Database error",
          code: ErrorCode.DATABASE_ERROR,
        },
        { status: 500 }
      );
    }

    if (!salon) {
      console.error("[POST /api/google/select-location] Salon not found");
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: "Salon not found",
          code: ErrorCode.SALON_NOT_FOUND,
        },
        { status: 400 }
      );
    }

    console.log("[POST /api/google/select-location] Salon found:", salon.name);

    // 4. salon_google_connections 조회
    const { data: connection, error: connectionError } = await supabaseAdmin
      .from("salon_google_connections")
      .select("*")
      .eq("salon_id", salonId)
      .maybeSingle();

    if (connectionError) {
      console.error(
        "[POST /api/google/select-location] Connection query error:",
        connectionError
      );
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: "Database error",
          code: ErrorCode.DATABASE_ERROR,
        },
        { status: 500 }
      );
    }

    if (!connection) {
      console.error("[POST /api/google/select-location] No Google connection found");
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: "No Google connection found. Please connect Google first.",
          code: ErrorCode.GOOGLE_NOT_CONNECTED,
        },
        { status: 404 }
      );
    }

    console.log("[POST /api/google/select-location] Google connection found");

    // 5. location_id, location_name 업데이트
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("salon_google_connections")
      .update({
        location_id: locationId,
        location_name: locationName || null,
        sync_enabled: true,
        updated_at: new Date().toISOString(),
      })
      .eq("salon_id", salonId)
      .select()
      .single();

    if (updateError) {
      console.error(
        "[POST /api/google/select-location] Update error:",
        updateError
      );
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: "Failed to update location",
          code: ErrorCode.DATABASE_ERROR,
        },
        { status: 500 }
      );
    }

    console.log("[POST /api/google/select-location] Location updated successfully");

    // 6. 성공 응답
    return NextResponse.json<ApiResponse<SelectLocationResult>>({
      ok: true,
      data: {
        salonId: salonId,
        locationId: locationId,
        locationName: locationName,
      },
    });
  } catch (err: any) {
    console.error("[POST /api/google/select-location] Unexpected error:", err);

    return NextResponse.json<ApiError>(
      {
        ok: false,
        error: err.message || "Internal server error",
        code: ErrorCode.INTERNAL_ERROR,
      },
      { status: 500 }
    );
  }
}
