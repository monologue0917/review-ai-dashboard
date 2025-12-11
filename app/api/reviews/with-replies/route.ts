// app/api/reviews/with-replies/route.ts
/**
 * ===================================================================
 * 대시보드 리뷰 조회 API (답글 포함)
 * ===================================================================
 *
 * GET /api/reviews/with-replies?salonId=xxx
 *
 * 특정 살롱의 리뷰 목록을 최신 답글 정보와 함께 조회합니다.
 * 이 엔드포인트는 대시보드 메인 화면에서 사용됩니다.
 *
 * @param salonId - 조회할 살롱 ID (query parameter, required)
 * @returns ApiResponse<ReviewItem[]>
 *
 * 성공 응답 예시:
 * {
 *   ok: true,
 *   data: [
 *     {
 *       id: 123,
 *       salonId: "xxx",
 *       source: "google",
 *       rating: 5,
 *       reviewText: "Great service!",
 *       reviewDate: "2024-01-15",
 *       customerName: "John Doe",
 *       hasReply: true,
 *       latestReply: {
 *         id: "reply-uuid",
 *         text: "Thank you!",
 *         createdAt: "2024-01-16",
 *         source: "auto",
 *         channel: "google"
 *       }
 *     }
 *   ]
 * }
 *
 * 에러 응답 예시:
 * {
 *   ok: false,
 *   error: "Missing salonId query parameter",
 *   code: "MISSING_FIELD"
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { ApiResponse, ApiError } from "@/lib/api/types";
import { ErrorCode } from "@/lib/api/types";
import type { ReviewItem } from "@/lib/reviews/types";

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
};

type ReplyRow = {
  id: string;
  review_id: number;
  reply_text: string | null;
  created_at: string | null;
  source: string | null;
  channel: string | null;
};

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

    // 2) 살롱의 리뷰 목록 조회
    const { data: reviews, error: reviewsError } = await supabase
      .from("reviews")
      .select(
        "id, salon_id, source, rating, review_text, review_date, customer_name"
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

    // 4) 해당 리뷰들의 답글 조회 (최신순)
    const { data: replies, error: repliesError } = await supabase
      .from("review_replies")
      .select("id, review_id, reply_text, created_at, source, channel")
      .in("review_id", reviewIds)
      .order("created_at", { ascending: false });

    if (repliesError) {
      console.error(
        "[GET /api/reviews/with-replies] replies error:",
        repliesError.message
      );
      // 답글 조회 실패해도 리뷰는 보여줌 (경고만)
    }

    const typedReplies = (replies ?? []) as ReplyRow[];

    // 5) 각 리뷰당 최신 답글 매핑
    const latestReplyByReviewId = new Map<number, ReplyRow>();

    for (const reply of typedReplies) {
      const rid = reply.review_id;
      // created_at 내림차순이므로 처음 만나는 것이 최신
      if (!latestReplyByReviewId.has(rid)) {
        latestReplyByReviewId.set(rid, reply);
      }
    }

    // 6) 최종 응답 조립
    const result: ReviewItem[] = typedReviews.map((r) => {
      const latest = latestReplyByReviewId.get(r.id) ?? null;

      return {
        id: r.id,
        salonId: r.salon_id,
        source: r.source ?? null,
        rating: typeof r.rating === "number" ? r.rating : null,
        reviewText: r.review_text ?? null,
        reviewDate: r.review_date ?? null,
        customerName: r.customer_name ?? null,
        hasReply: !!latest,
        latestReply: latest
          ? {
              id: latest.id,
              text: latest.reply_text ?? "",
              createdAt: latest.created_at ?? "",
              source: latest.source ?? null,
              channel: latest.channel ?? null,
            }
          : null,
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