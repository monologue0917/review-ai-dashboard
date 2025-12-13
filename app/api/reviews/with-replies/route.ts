// app/api/reviews/with-replies/route.ts
/**
 * ===================================================================
 * 대시보드 리뷰 조회 API (답글 편집/게시 정보 포함)
 * ===================================================================
 *
 * GET /api/reviews/with-replies?salonId=xxx
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { ApiResponse, ApiError } from "@/lib/api/types";
import { ErrorCode } from "@/lib/api/types";
import type { ReviewItem, ReviewStatus, ReplyStatus } from "@/lib/reviews/types";
import { verifyAuthAndSalonAccess } from "@/lib/auth/verifyApiAuth";

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

/* ===== 내부 타입 정의 ===== */

type ReviewRow = {
  id: number;
  salon_id: string;
  source: string | null;
  rating: number | null;
  review_text: string | null;
  review_date: string | null;
  customer_name: string | null;
  status: string | null;
  risk_tags: string[] | null;
};

type ReplyRow = {
  id: string;
  review_id: number;
  reply_text: string | null;
  created_at: string | null;
  source: string | null;
  channel: string | null;
  // 새 컬럼
  ai_draft_text: string | null;
  final_text: string | null;
  status: string | null;
  last_error: string | null;
  posted_at: string | null;
};

/* ===== 유효한 상태값 검증 ===== */
const VALID_REVIEW_STATUSES: ReviewStatus[] = ['new', 'drafted', 'approved', 'posted'];
const VALID_REPLY_STATUSES: ReplyStatus[] = ['draft', 'approved', 'posted', 'failed'];

function normalizeReviewStatus(status: string | null, hasReply: boolean): ReviewStatus {
  if (status && VALID_REVIEW_STATUSES.includes(status as ReviewStatus)) {
    return status as ReviewStatus;
  }
  return hasReply ? 'drafted' : 'new';
}

function normalizeReplyStatus(status: string | null): ReplyStatus {
  if (status && VALID_REPLY_STATUSES.includes(status as ReplyStatus)) {
    return status as ReplyStatus;
  }
  return 'draft';
}

/* ===== GET 핸들러 ===== */

export async function GET(
  req: NextRequest
): Promise<NextResponse<ApiResponse<ReviewItem[]>>> {
  try {
    // 1) Query parameter 검증
    const url = new URL(req.url);
    const salonId = url.searchParams.get("salonId");

    if (!salonId) {
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: "Missing salonId query parameter",
          code: ErrorCode.MISSING_FIELD,
        },
        { status: 400 }
      );
    }

    // ✅ 인증 검증: 요청한 salonId가 현재 유저의 살롱인지 확인
    const auth = await verifyAuthAndSalonAccess(req, salonId);
    if (!auth.ok) {
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: auth.error,
          code: auth.code,
        },
        { status: auth.code === "FORBIDDEN" ? 403 : 401 }
      );
    }

    // 2) 살롱의 리뷰 목록 조회
    const { data: reviews, error: reviewsError } = await supabase
      .from("reviews")
      .select(
        "id, salon_id, source, rating, review_text, review_date, customer_name, status, risk_tags"
      )
      .eq("salon_id", salonId)
      .order("review_date", { ascending: false })
      .limit(500);

    if (reviewsError) {
      console.error(
        "[GET /api/reviews/with-replies] reviews error:",
        reviewsError.message
      );
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: "Failed to load reviews",
          code: ErrorCode.DATABASE_ERROR,
        },
        { status: 500 }
      );
    }

    // 3) 리뷰가 없으면 빈 배열 반환
    if (!reviews || reviews.length === 0) {
      return NextResponse.json<ApiResponse<ReviewItem[]>>(
        {
          ok: true,
          data: [],
        },
        { status: 200 }
      );
    }

    const typedReviews = reviews as ReviewRow[];
    const reviewIds = typedReviews.map((r) => r.id);

    // 4) 해당 리뷰들의 답글 조회 (새 컬럼 포함)
    const { data: replies, error: repliesError } = await supabase
      .from("review_replies")
      .select(`
        id, 
        review_id, 
        reply_text, 
        created_at, 
        source, 
        channel,
        ai_draft_text,
        final_text,
        status,
        last_error,
        posted_at
      `)
      .in("review_id", reviewIds)
      .order("created_at", { ascending: false });

    if (repliesError) {
      console.error(
        "[GET /api/reviews/with-replies] replies error:",
        repliesError.message
      );
    }

    const typedReplies = (replies ?? []) as ReplyRow[];

    // 5) 각 리뷰당 최신 답글 매핑
    const latestReplyByReviewId = new Map<number, ReplyRow>();

    for (const reply of typedReplies) {
      const rid = reply.review_id;
      if (!latestReplyByReviewId.has(rid)) {
        latestReplyByReviewId.set(rid, reply);
      }
    }

    // 6) 최종 응답 조립
    const result: ReviewItem[] = typedReviews.map((r) => {
      const latest = latestReplyByReviewId.get(r.id) ?? null;
      const hasReply = !!latest;

      return {
        id: r.id,
        salonId: r.salon_id,
        source: r.source ?? null,
        rating: typeof r.rating === "number" ? r.rating : null,
        reviewText: r.review_text ?? null,
        reviewDate: r.review_date ?? null,
        customerName: r.customer_name ?? null,
        status: normalizeReviewStatus(r.status, hasReply),
        hasReply,
        latestReply: latest
          ? {
              id: latest.id,
              text: latest.final_text || latest.reply_text || "",
              createdAt: latest.created_at ?? "",
              source: latest.source ?? null,
              channel: latest.channel ?? null,
              // 새 필드
              aiDraftText: latest.ai_draft_text ?? null,
              finalText: latest.final_text ?? null,
              status: normalizeReplyStatus(latest.status),
              lastError: latest.last_error ?? null,
              postedAt: latest.posted_at ?? null,
            }
          : null,
        riskTags: Array.isArray(r.risk_tags) ? r.risk_tags : [],
      };
    });

    return NextResponse.json<ApiResponse<ReviewItem[]>>(
      {
        ok: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[GET /api/reviews/with-replies] Unexpected error:", err);
    return NextResponse.json<ApiError>(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Unexpected server error",
        code: ErrorCode.INTERNAL_ERROR,
      },
      { status: 500 }
    );
  }
}
