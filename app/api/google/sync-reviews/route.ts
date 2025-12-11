// app/api/google/sync-reviews/route.ts
/**
 * POST /api/google/sync-reviews
 * 
 * Google Business Profile 리뷰를 동기화합니다.
 * 
 * Request Body:
 * {
 *   salonId: string
 * }
 * 
 * Response:
 * {
 *   ok: true,
 *   data: {
 *     importedCount: number,
 *     updatedCount: number,
 *     skippedCount: number
 *   }
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { syncReviewsForSalon } from "@/lib/google/syncReviewsForSalon";
import type { ApiResponse, ApiError } from "@/lib/api/types";
import { ErrorCode } from "@/lib/api/types";
import type { SyncReviewsResult } from "@/lib/google/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<SyncReviewsResult>>> {
  try {
    console.log("[POST /api/google/sync-reviews] Request received");

    // 1. Request body 파싱
    const body = await req.json();
    const { salonId } = body;

    if (!salonId) {
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: "Missing salonId in request body",
          code: ErrorCode.INVALID_INPUT,
        },
        { status: 400 }
      );
    }

    console.log(`[POST /api/google/sync-reviews] salonId: ${salonId}`);

    // 2. 인증 확인 (Supabase Auth) - Next.js 15+에서는 await 필요
    const cookieStore = await cookies();
    const authCookie = cookieStore.get("sb-access-token");

    // 인증 체크는 선택적으로 유지 (개발 중에는 비활성화 가능)
    // if (!authCookie) {
    //   return NextResponse.json<ApiError>(
    //     {
    //       ok: false,
    //       error: "Unauthorized",
    //       code: ErrorCode.UNAUTHORIZED,
    //     },
    //     { status: 401 }
    //   );
    // }

    // 3. Salon 존재 확인
    const { data: salon, error: salonError } = await supabase
      .from("salons")
      .select("id, name")
      .eq("id", salonId)
      .single();

    if (salonError || !salon) {
      console.error("[POST /api/google/sync-reviews] Salon not found:", salonError);
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: "Salon not found",
          code: ErrorCode.NOT_FOUND,
        },
        { status: 404 }
      );
    }

    console.log(`[POST /api/google/sync-reviews] Salon: ${salon.name}`);

    // 4. 동기화 실행
    const result = await syncReviewsForSalon(salonId);

    console.log("[POST /api/google/sync-reviews] Sync complete:", result);

    // 5. 성공 응답
    return NextResponse.json<ApiResponse<SyncReviewsResult>>({
      ok: true,
      data: result,
    });
  } catch (err: any) {
    console.error("[POST /api/google/sync-reviews] Error:", err);

    // 에러 메시지에 따라 적절한 에러 코드 반환
    if (err.message?.includes("Google connection not found")) {
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: err.message,
          code: ErrorCode.GOOGLE_NOT_CONNECTED,
        },
        { status: 404 }
      );
    }

    if (err.message?.includes("Google location not configured")) {
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: err.message,
          code: ErrorCode.GOOGLE_NOT_CONNECTED,
        },
        { status: 400 }
      );
    }

    if (err.message?.includes("Failed to refresh token")) {
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: "Failed to refresh Google access token. Please reconnect your Google account.",
          code: ErrorCode.GOOGLE_TOKEN_ERROR,
        },
        { status: 401 }
      );
    }

    if (err.message?.includes("Failed to fetch Google reviews")) {
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: "Failed to fetch reviews from Google. Please try again later.",
          code: ErrorCode.GOOGLE_API_ERROR,
        },
        { status: 502 }
      );
    }

    // 기타 내부 오류
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
