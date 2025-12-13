// app/api/google/sync-reviews/route.ts
/**
 * ===================================================================
 * Google 리뷰 동기화 API
 * ===================================================================
 * 
 * POST /api/google/sync-reviews
 * 
 * Request Body:
 * {
 *   salonId: string
 * }
 * 
 * Response (성공):
 * {
 *   ok: true,
 *   data: {
 *     importedCount: number,
 *     updatedCount: number,
 *     skippedCount: number
 *   }
 * }
 * 
 * Response (실패):
 * {
 *   ok: false,
 *   error: string,
 *   code: ErrorCode
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { syncReviewsForSalon, SyncError, canSyncReviews } from "@/lib/google/syncReviewsForSalon";
import type { ApiResponse, ApiError } from "@/lib/api/types";
import { ErrorCode } from "@/lib/api/types";
import type { SyncReviewsResult } from "@/lib/google/types";
import { verifyAuthAndSalonAccess } from "@/lib/auth/verifyApiAuth";

/* ===== Supabase 클라이언트 ===== */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/* ===== 에러 코드 매핑 ===== */

function mapSyncErrorToApiError(syncError: SyncError): {
  code: string;
  status: number;
} {
  const mapping: Record<string, { code: string; status: number }> = {
    // 연결 관련
    NO_CONNECTION: { code: ErrorCode.GOOGLE_NOT_CONNECTED, status: 404 },
    NO_LOCATION: { code: ErrorCode.GOOGLE_NOT_CONNECTED, status: 400 },
    ACCOUNT_NOT_FOUND: { code: ErrorCode.GOOGLE_NOT_CONNECTED, status: 404 },

    // 인증 관련
    TOKEN_EXPIRED: { code: ErrorCode.GOOGLE_TOKEN_ERROR, status: 401 },
    NO_REFRESH_TOKEN: { code: ErrorCode.GOOGLE_TOKEN_ERROR, status: 401 },
    TOKEN_REFRESH_FAILED: { code: ErrorCode.GOOGLE_TOKEN_ERROR, status: 401 },
    SESSION_EXPIRED: { code: ErrorCode.SESSION_EXPIRED, status: 401 },

    // API 관련
    RATE_LIMITED: { code: ErrorCode.RATE_LIMITED, status: 429 },
    PERMISSION_DENIED: { code: ErrorCode.FORBIDDEN, status: 403 },
    LOCATION_NOT_FOUND: { code: ErrorCode.NOT_FOUND, status: 404 },
    GOOGLE_API_ERROR: { code: ErrorCode.GOOGLE_API_ERROR, status: 502 },

    // DB 관련
    DATABASE_ERROR: { code: ErrorCode.DATABASE_ERROR, status: 500 },
  };

  return mapping[syncError.code] || { code: ErrorCode.INTERNAL_ERROR, status: 500 };
}

/* ===== POST 핸들러 ===== */

export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<SyncReviewsResult>>> {
  const startTime = Date.now();

  try {
    console.log("\n[POST /api/google/sync-reviews] ========== START ==========");

    // 1. Request body 파싱
    let body: { salonId?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: "Invalid JSON in request body",
          code: ErrorCode.INVALID_INPUT,
        },
        { status: 400 }
      );
    }

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

    // ✅ 1-1) 인증 + 살롱 접근 권한 검증
    const auth = await verifyAuthAndSalonAccess(req, salonId);
    if (!auth.ok) {
      return NextResponse.json<ApiError>(
        { ok: false, error: auth.error, code: auth.code },
        { status: auth.code === 'FORBIDDEN' ? 403 : 401 }
      );
    }

    console.log(`[POST /api/google/sync-reviews] salonId: ${salonId}`);

    // 2. Salon 존재 확인
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
          code: ErrorCode.SALON_NOT_FOUND,
        },
        { status: 404 }
      );
    }

    console.log(`[POST /api/google/sync-reviews] Salon: ${salon.name}`);

    // 3. 동기화 가능 여부 확인 (선택적 - 더 나은 에러 메시지용)
    const syncStatus = await canSyncReviews(salonId);
    if (!syncStatus.canSync) {
      console.log(`[POST /api/google/sync-reviews] Cannot sync: ${syncStatus.reason}`);
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: syncStatus.reason || "Cannot sync reviews",
          code: ErrorCode.GOOGLE_NOT_CONNECTED,
        },
        { status: 400 }
      );
    }

    // 4. 동기화 실행
    console.log("[POST /api/google/sync-reviews] Starting sync...");
    
    const result = await syncReviewsForSalon(salonId);

    const duration = Date.now() - startTime;
    console.log(`[POST /api/google/sync-reviews] Sync complete in ${duration}ms:`, result);
    console.log("[POST /api/google/sync-reviews] ========== END ==========\n");

    // 5. 성공 응답
    return NextResponse.json<ApiResponse<SyncReviewsResult>>({
      ok: true,
      data: result,
    });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    console.error(`[POST /api/google/sync-reviews] Error after ${duration}ms:`, err);

    // SyncError 처리
    if (err instanceof SyncError) {
      const { code, status } = mapSyncErrorToApiError(err);
      
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: err.message,
          code,
        },
        { status }
      );
    }

    // 기타 에러
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

/* ===== GET 핸들러 - 동기화 상태 확인 ===== */

export async function GET(
  req: NextRequest
): Promise<NextResponse<ApiResponse<{ canSync: boolean; reason?: string; lastSyncedAt?: string }>>> {
  try {
    const url = new URL(req.url);
    const salonId = url.searchParams.get("salonId");

    if (!salonId) {
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: "Missing salonId query parameter",
          code: ErrorCode.INVALID_INPUT,
        },
        { status: 400 }
      );
    }

    // ✅ 인증 + 살롱 접근 권한 검증
    const auth = await verifyAuthAndSalonAccess(req, salonId);
    if (!auth.ok) {
      return NextResponse.json<ApiError>(
        { ok: false, error: auth.error, code: auth.code },
        { status: auth.code === 'FORBIDDEN' ? 403 : 401 }
      );
    }

    // 1. 동기화 가능 여부 확인
    const syncStatus = await canSyncReviews(salonId);

    // 2. 마지막 동기화 시간 조회
    const { data: connection } = await supabase
      .from("salon_google_connections")
      .select("last_synced_at")
      .eq("salon_id", salonId)
      .single();

    return NextResponse.json<ApiResponse<{ canSync: boolean; reason?: string; lastSyncedAt?: string }>>({
      ok: true,
      data: {
        canSync: syncStatus.canSync,
        reason: syncStatus.reason,
        lastSyncedAt: connection?.last_synced_at || undefined,
      },
    });
  } catch (err: any) {
    console.error("[GET /api/google/sync-reviews] Error:", err);
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
