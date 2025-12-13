// app/api/replies/[replyId]/post/route.ts
/**
 * ===================================================================
 * Reply 게시 API (Google Business Profile에 실제 게시)
 * ===================================================================
 * 
 * POST /api/replies/:replyId/post
 * 
 * 7종 에러 케이스 처리:
 * - 토큰 만료/회수 → 자동 갱신 또는 재연결 유도
 * - 권한 없음 → 명확한 에러 메시지
 * - Rate limit → 재시도 가능 표시
 * - 서버 에러 → 재시도 가능 표시
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { ApiResponse, ApiError } from "@/lib/api/types";
import { ErrorCode } from "@/lib/api/types";
import { postReplyToGoogleV2 } from "@/lib/google/postReplyToGBP";
import { GoogleErrorCode, GoogleErrorMessages } from "@/lib/google/errors";
import { verifyAuth } from "@/lib/auth/verifyApiAuth";

/* ===== Supabase 클라이언트 ===== */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase env vars");
}

const supabase = createClient(supabaseUrl, supabaseKey);

/* ===== 타입 정의 ===== */

type PostResponseData = {
  replyId: string;
  status: 'posted' | 'failed';
  postedAt: string | null;
  postedSuccess: boolean;
  lastError: string | null;
  errorCode?: string;
  retryable?: boolean;
  platformReplyId: string | null;
};

/* ===== POST 핸들러 ===== */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ replyId: string }> }
): Promise<NextResponse<ApiResponse<PostResponseData>>> {
  try {
    // 1) replyId 추출
    const { replyId } = await params;

    if (!replyId) {
      return NextResponse.json<ApiError>(
        { ok: false, error: "Missing reply ID", code: ErrorCode.INVALID_INPUT },
        { status: 400 }
      );
    }

    // ✅ 1-1) 인증 검증
    const auth = await verifyAuth(req);
    if (!auth.ok) {
      return NextResponse.json<ApiError>(
        { ok: false, error: auth.error, code: auth.code },
        { status: 401 }
      );
    }

    // 2) Reply 정보 조회 (review, salon 정보 포함)
    const { data: reply, error: fetchError } = await supabase
      .from("review_replies")
      .select(`
        id,
        review_id,
        salon_id,
        channel,
        final_text,
        status,
        posted_at,
        platform_reply_id,
        reviews (
          id,
          review_id,
          source
        )
      `)
      .eq("id", replyId)
      .single();

    if (fetchError || !reply) {
      console.error("[POST /api/replies/:id/post] Reply not found:", fetchError);
      return NextResponse.json<ApiError>(
        { ok: false, error: "Reply not found", code: ErrorCode.NOT_FOUND },
        { status: 404 }
      );
    }

    // ✅ 2-1) 살롱 접근 권한 확인
    if (auth.salonId !== reply.salon_id) {
      return NextResponse.json<ApiError>(
        { ok: false, error: "Access denied to this reply", code: ErrorCode.FORBIDDEN },
        { status: 403 }
      );
    }

    // 3) 이미 posted면 idempotent하게 성공 반환
    if (reply.status === 'posted') {
      console.log("[POST /api/replies/:id/post] Already posted, returning success");
      return NextResponse.json<ApiResponse<PostResponseData>>({
        ok: true,
        data: {
          replyId,
          status: 'posted',
          postedAt: reply.posted_at,
          postedSuccess: true,
          lastError: null,
          platformReplyId: reply.platform_reply_id,
        },
      });
    }

    // 4) final_text 확인
    if (!reply.final_text || reply.final_text.trim() === '') {
      return NextResponse.json<ApiError>(
        { ok: false, error: "Reply text is empty", code: ErrorCode.INVALID_INPUT },
        { status: 400 }
      );
    }

    // 5) Google 연결 정보 조회
    const { data: connection, error: connError } = await supabase
      .from("salon_google_connections")
      .select(`
        id,
        location_name,
        google_account_id
      `)
      .eq("salon_id", reply.salon_id)
      .eq("sync_enabled", true)
      .single();

    if (connError || !connection) {
      console.error("[POST /api/replies/:id/post] No Google connection:", connError);
      
      const errorMessage = 'Google account not connected. Please connect Google in Settings.';
      
      await updateReplyStatus(replyId, {
        status: 'failed',
        lastError: errorMessage,
        errorCode: GoogleErrorCode.TOKEN_REVOKED,
        postedSuccess: false,
      });

      return NextResponse.json<ApiResponse<PostResponseData>>({
        ok: true,
        data: {
          replyId,
          status: 'failed',
          postedAt: null,
          postedSuccess: false,
          lastError: errorMessage,
          errorCode: GoogleErrorCode.TOKEN_REVOKED,
          retryable: false,
          platformReplyId: null,
        },
      });
    }

    // 6) Google API로 게시 (새 버전 - 자동 토큰 갱신 + 재시도)
    const review = reply.reviews as any;
    
    console.log("[POST /api/replies/:id/post] Posting to Google...", {
      replyId,
      googleAccountId: connection.google_account_id,
      locationName: connection.location_name,
      reviewId: review?.review_id,
    });

    const postResult = await postReplyToGoogleV2({
      googleAccountId: connection.google_account_id,
      locationName: connection.location_name,
      reviewName: review?.review_id,
      replyText: reply.final_text,
    });

    if (postResult.success) {
      // 7) 성공 - DB 업데이트
      const now = new Date().toISOString();
      
      await updateReplyStatus(replyId, {
        status: 'posted',
        postedSuccess: true,
        postedAt: now,
        postedText: reply.final_text,
        platformReplyId: postResult.replyId || null,
        lastError: null,
        errorCode: null,
      });

      // reviews 테이블도 posted로 업데이트
      await supabase
        .from("reviews")
        .update({ status: 'posted', updated_at: now })
        .eq("id", reply.review_id);

      console.log("[POST /api/replies/:id/post] ✅ Posted successfully");

      return NextResponse.json<ApiResponse<PostResponseData>>({
        ok: true,
        data: {
          replyId,
          status: 'posted',
          postedAt: now,
          postedSuccess: true,
          lastError: null,
          platformReplyId: postResult.replyId || null,
        },
      });
    } else {
      // 8) 게시 실패 - 상세 에러 정보 저장
      const errorMessage = postResult.error || 'Failed to post to Google';
      const errorCode = postResult.errorCode || GoogleErrorCode.UNKNOWN;
      const retryable = postResult.retryable ?? false;
      
      console.error("[POST /api/replies/:id/post] ❌ Post failed:", {
        error: errorMessage,
        code: errorCode,
        retryable,
      });

      await updateReplyStatus(replyId, {
        status: 'failed',
        postedSuccess: false,
        lastError: errorMessage,
        errorCode: errorCode,
      });

      return NextResponse.json<ApiResponse<PostResponseData>>({
        ok: true,
        data: {
          replyId,
          status: 'failed',
          postedAt: null,
          postedSuccess: false,
          lastError: errorMessage,
          errorCode: errorCode,
          retryable: retryable,
          platformReplyId: null,
        },
      });
    }
  } catch (err) {
    console.error("[POST /api/replies/:id/post] Unexpected error:", err);
    return NextResponse.json<ApiError>(
      { 
        ok: false, 
        error: err instanceof Error ? err.message : "Internal server error", 
        code: ErrorCode.INTERNAL_ERROR 
      },
      { status: 500 }
    );
  }
}

/* ===== 헬퍼 함수 ===== */

async function updateReplyStatus(
  replyId: string, 
  updates: {
    status: string;
    postedSuccess?: boolean;
    postedAt?: string;
    postedText?: string;
    platformReplyId?: string | null;
    lastError?: string | null;
    errorCode?: string | null;
  }
) {
  const { error } = await supabase
    .from("review_replies")
    .update({
      status: updates.status,
      posted_success: updates.postedSuccess,
      posted_at: updates.postedAt,
      posted_text: updates.postedText,
      platform_reply_id: updates.platformReplyId,
      last_error: updates.lastError,
      updated_at: new Date().toISOString(),
    })
    .eq("id", replyId);

  if (error) {
    console.error("[updateReplyStatus] Error:", error);
  }
}
