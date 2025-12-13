// app/api/reviews/[id]/status/route.ts
/**
 * ===================================================================
 * 리뷰 상태 변경 API
 * ===================================================================
 * 
 * PATCH /api/reviews/:reviewId/status
 * 
 * 리뷰의 워크플로우 상태를 변경합니다.
 * new → drafted → approved → posted
 * 
 * @body status - 변경할 상태 ('drafted' | 'approved' | 'posted')
 * @returns ApiResponse<{ id: number, status: ReviewStatus }>
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { ApiResponse, ApiError } from "@/lib/api/types";
import { ErrorCode } from "@/lib/api/types";
import type { ReviewStatus } from "@/lib/reviews/types";
import { verifyAuth } from "@/lib/auth/verifyApiAuth";

/* ===== 환경변수 체크 ===== */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)"
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

/* ===== 타입 정의 ===== */

type StatusRequestBody = {
  status: ReviewStatus;
};

type StatusResponseData = {
  id: number;
  status: ReviewStatus;
};

/* ===== 상수 ===== */

const VALID_STATUSES: ReviewStatus[] = ['new', 'drafted', 'approved', 'posted'];

// 허용된 상태 전환 (드롭다운으로 자유롭게 변경 가능)
const ALLOWED_TRANSITIONS: Record<ReviewStatus, ReviewStatus[]> = {
  new: ['drafted'],                          // new → drafted (답글 생성 시)
  drafted: ['new', 'approved', 'posted'],    // drafted → 어디든
  approved: ['drafted', 'posted'],           // approved → 되돌리기 가능
  posted: ['drafted', 'approved'],           // posted → 되돌리기 가능
};

/* ===== 헬퍼 함수 ===== */

function getReviewIdFromRequest(req: NextRequest): number | null {
  const url = new URL(req.url);
  const segments = url.pathname.split("/").filter(Boolean);

  const reviewsIndex = segments.indexOf("reviews");
  if (reviewsIndex === -1 || segments.length <= reviewsIndex + 1) {
    return null;
  }

  const idSegment = segments[reviewsIndex + 1];
  const idNum = Number(idSegment);

  if (!Number.isFinite(idNum) || idNum <= 0) {
    return null;
  }

  return idNum;
}

/* ===== PATCH 핸들러 ===== */

export async function PATCH(
  req: NextRequest
): Promise<NextResponse<ApiResponse<StatusResponseData>>> {
  try {
    // 1) reviewId 추출 및 검증
    const reviewId = getReviewIdFromRequest(req);

    if (!reviewId) {
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: "Missing or invalid review id",
          code: ErrorCode.INVALID_REVIEW_ID,
        },
        { status: 400 }
      );
    }

    // 2) Body 파싱
    const body = (await req.json().catch(() => ({}))) as StatusRequestBody;
    const newStatus = body.status;

    // 3) 상태값 검증
    if (!newStatus || !VALID_STATUSES.includes(newStatus)) {
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
          code: ErrorCode.INVALID_INPUT,
        },
        { status: 400 }
      );
    }

    // ✅ 3-1) 인증 검증
    const auth = await verifyAuth(req);
    if (!auth.ok) {
      return NextResponse.json<ApiError>(
        { ok: false, error: auth.error, code: auth.code },
        { status: 401 }
      );
    }

    // 4) 현재 리뷰 상태 조회 (살롱 정보 포함)
    const { data: review, error: reviewError } = await supabase
      .from("reviews")
      .select("id, status, salon_id")
      .eq("id", reviewId)
      .single();

    if (reviewError || !review) {
      console.error(
        "[PATCH /api/reviews/[id]/status] review error:",
        reviewError?.message
      );
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: "Review not found",
          code: ErrorCode.REVIEW_NOT_FOUND,
        },
        { status: 404 }
      );
    }

    // ✅ 4-1) 살롱 접근 권한 확인
    if (auth.salonId !== review.salon_id) {
      return NextResponse.json<ApiError>(
        { ok: false, error: "Access denied to this review", code: ErrorCode.FORBIDDEN },
        { status: 403 }
      );
    }

    // 5) 현재 상태 확인
    const currentStatus = (review.status as ReviewStatus) || 'new';

    // 6) 상태 전환 유효성 검사
    const allowedNextStatuses = ALLOWED_TRANSITIONS[currentStatus] || [];
    
    if (!allowedNextStatuses.includes(newStatus)) {
      // 같은 상태로 변경하려는 경우는 허용 (멱등성)
      if (currentStatus === newStatus) {
        return NextResponse.json<ApiResponse<StatusResponseData>>(
          {
            ok: true,
            data: {
              id: reviewId,
              status: newStatus,
            },
          },
          { status: 200 }
        );
      }

      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: `Cannot change status from '${currentStatus}' to '${newStatus}'. Allowed: ${allowedNextStatuses.join(', ') || 'none'}`,
          code: ErrorCode.INVALID_INPUT,
        },
        { status: 400 }
      );
    }

    // 7) 상태 업데이트
    const { error: updateError } = await supabase
      .from("reviews")
      .update({ status: newStatus })
      .eq("id", reviewId);

    if (updateError) {
      console.error(
        "[PATCH /api/reviews/[id]/status] update error:",
        updateError.message
      );
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: "Failed to update status",
          code: ErrorCode.DATABASE_ERROR,
        },
        { status: 500 }
      );
    }

    console.log("[PATCH /api/reviews/[id]/status] Updated:", {
      reviewId,
      from: currentStatus,
      to: newStatus,
    });

    // 8) 성공 응답
    return NextResponse.json<ApiResponse<StatusResponseData>>(
      {
        ok: true,
        data: {
          id: reviewId,
          status: newStatus,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[PATCH /api/reviews/[id]/status] unexpected error:", err);
    return NextResponse.json<ApiError>(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to update status",
        code: ErrorCode.INTERNAL_ERROR,
      },
      { status: 500 }
    );
  }
}
