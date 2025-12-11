// app/api/reviews/[id]/reply/route.ts
/**
 * ===================================================================
 * 리뷰 AI 답글 생성 API
 * ===================================================================
 * 
 * POST /api/reviews/:reviewId/reply
 * 
 * 특정 리뷰에 대한 AI 답글을 생성하고 review_replies 테이블에 저장합니다.
 * 
 * @param reviewId - 리뷰 ID (URL path parameter)
 * @body trigger - 'auto' | 'manual' (답글 생성 방식)
 * @body source - 리뷰 소스 (선택)
 * @returns ApiResponse<{ replyId: string, replyText: string }>
 * 
 * 성공 응답 예시:
 * {
 *   ok: true,
 *   data: {
 *     replyId: "uuid-123",
 *     replyText: "Thank you for your wonderful review!"
 *   }
 * }
 * 
 * 에러 응답 예시:
 * {
 *   ok: false,
 *   error: "Review not found",
 *   code: "REVIEW_NOT_FOUND"
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { ApiResponse, ApiError } from "@/lib/api/types";
import { ErrorCode } from "@/lib/api/types";

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

type ReplyRequestBody = {
  trigger?: "auto" | "manual";
  source?: string | null;
};

type ReplyResponseData = {
  replyId: string;
  replyText: string;
};

/* ===== 헬퍼 함수 ===== */

/**
 * URL 경로에서 reviewId 추출 및 검증
 */
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

/* ===== POST 핸들러 ===== */

export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<ReplyResponseData>>> {
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
    const body = (await req.json().catch(() => ({}))) as ReplyRequestBody;
    const trigger = body.trigger ?? "auto";

    // 3) 리뷰 정보 조회
    const { data: review, error: reviewError } = await supabase
      .from("reviews")
      .select("id, salon_id, review_text, rating, customer_name, source")
      .eq("id", reviewId)
      .single();

    if (reviewError || !review) {
      console.error(
        "[POST /api/reviews/[id]/reply] review error:",
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

    // 4) OpenAI API 키 확인
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("[POST /api/reviews/[id]/reply] Missing OPENAI_API_KEY");
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: "OpenAI API key not configured",
          code: ErrorCode.INTERNAL_ERROR,
        },
        { status: 500 }
      );
    }

    // 5) 답글 생성 프롬프트
    const systemPrompt =
      "You help small local businesses write warm, professional, concise replies to online reviews. Keep replies within 2–4 sentences.";

    const userPrompt = `
Customer review (source: ${review.source ?? "unknown"}):
"${review.review_text ?? ""}"

Rating: ${review.rating ?? "N/A"}
Customer name: ${review.customer_name ?? "the customer"}.

Write a friendly, professional reply in English as the business owner.
`.trim();

    // 6) OpenAI API 호출
    const completionRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
        }),
      }
    );

    if (!completionRes.ok) {
      const text = await completionRes.text().catch(() => "");
      console.error(
        "[POST /api/reviews/[id]/reply] OpenAI error:",
        completionRes.status,
        text
      );
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: "Failed to generate reply from AI",
          code: ErrorCode.EXTERNAL_API_ERROR,
        },
        { status: 500 }
      );
    }

    const completionJson = (await completionRes.json()) as any;
    const replyText: string =
      completionJson?.choices?.[0]?.message?.content?.trim() ?? "";

    if (!replyText) {
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: "Empty reply generated",
          code: ErrorCode.EXTERNAL_API_ERROR,
        },
        { status: 500 }
      );
    }

    // 7) review_replies 테이블에 저장
    const { data: replyRow, error: replyError } = await supabase
      .from("review_replies")
      .insert({
        review_id: review.id,
        salon_id: review.salon_id,
        source: trigger,
        channel: review.source ?? null,
        reply_text: replyText,
        model: "gpt-4o-mini",
      })
      .select("id")
      .single();

    if (replyError || !replyRow) {
      console.error(
        "[POST /api/reviews/[id]/reply] insert reply error:",
        replyError?.message
      );
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: "Failed to save reply",
          code: ErrorCode.DATABASE_ERROR,
        },
        { status: 500 }
      );
    }

    // 8) 성공 응답
    return NextResponse.json<ApiResponse<ReplyResponseData>>(
      {
        ok: true,
        data: {
          replyId: replyRow.id,
          replyText,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[POST /api/reviews/[id]/reply] unexpected error:", err);
    return NextResponse.json<ApiError>(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to generate reply",
        code: ErrorCode.INTERNAL_ERROR,
      },
      { status: 500 }
    );
  }
}