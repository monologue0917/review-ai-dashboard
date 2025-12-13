// app/api/reviews/[id]/reply/route.ts
/**
 * ===================================================================
 * 리뷰 AI 답글 생성 API (Rate Limit 적용)
 * ===================================================================
 * 
 * POST /api/reviews/:reviewId/reply
 * 
 * Rate Limit:
 * - 리뷰당 최대 5회 생성
 * - 살롱당 하루 최대 100회 생성
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { ApiResponse, ApiError } from "@/lib/api/types";
import { ErrorCode } from "@/lib/api/types";
import {
  checkAIGenerationLimit,
  incrementSalonDailyCount,
  getRateLimitErrorMessage,
  AI_GENERATION_LIMITS,
} from "@/lib/rateLimit/aiGenerationLimit";
import { verifyAuth } from "@/lib/auth/verifyApiAuth";
import { fetchOpenAI, ServerFetchTimeoutError } from "@/lib/utils/serverFetch";

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
  riskTags?: string[];
  status: string;
  generationCount?: number;
};

/* ===== Risk Tags 상수 ===== */

const VALID_RISK_TAGS = [
  'wait_time',
  'service_quality', 
  'rude_staff',
  'cleanliness',
  'price',
  'booking',
  'results',
  'communication',
  'other'
] as const;

/* ===== 프롬프트 (통일 JSON 버전) ===== */

const SYSTEM_PROMPT = `You help local business owners reply to online reviews in a warm, professional, concise tone.

Rules:
- Output MUST be valid JSON only (no extra text, no markdown).
- Keep the reply 2-4 sentences, max 80 words.
- Be human, specific, and polite.
- NEVER use "Dear" to start the reply.
- Never mention policies you cannot verify.
- Never promise refunds, discounts, or compensation.
- Never admit legal fault or wrongdoing.
- For negative reviews: apologize briefly, acknowledge the issue, invite offline resolution.
- Use the customer's first name naturally if provided; otherwise omit name.
- End with the business name if provided; otherwise omit sign-off.

Risk tags (use exact values only):
wait_time, service_quality, rude_staff, cleanliness, price, booking, results, communication, other

Risk tag rules:
- Choose 0-3 tags based ONLY on explicit issues mentioned in the review.
- If no clear issue (positive review), use empty array [].
- If negative but unclear category, use ["other"].

JSON schema:
{
  "reply": "string",
  "riskTags": ["string", ...]
}`;

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

/**
 * Risk Tags 검증 - 유효한 태그만 필터링 (최대 3개)
 */
function validateRiskTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  
  return tags
    .filter((tag): tag is string => typeof tag === 'string')
    .map(tag => tag.toLowerCase().trim())
    .filter(tag => VALID_RISK_TAGS.includes(tag as any))
    .slice(0, 3);
}

/**
 * AI 응답에서 JSON 추출
 */
function parseAIResponse(content: string): { reply: string; riskTags: string[] } {
  let reply = '';
  let riskTags: string[] = [];

  try {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;
    
    const parsed = JSON.parse(jsonStr.trim());
    reply = (parsed.reply || parsed.replyText || '').trim();
    riskTags = validateRiskTags(parsed.riskTags || parsed.risk_tags);
  } catch {
    reply = content.trim();
  }

  return { reply, riskTags };
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

    // 2) ✅ 인증 검증
    const auth = await verifyAuth(req);
    if (!auth.ok) {
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: auth.error,
          code: auth.code,
        },
        { status: 401 }
      );
    }

    // 3) Body 파싱
    const body = (await req.json().catch(() => ({}))) as ReplyRequestBody;
    const trigger = body.trigger ?? "manual";

    // 4) 리뷰 + 살롱 정보 조회
    const { data: review, error: reviewError } = await supabase
      .from("reviews")
      .select(`
        id, 
        salon_id, 
        review_text, 
        rating, 
        customer_name, 
        source,
        salons ( name )
      `)
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

    const salonId = review.salon_id;
    const salonName = (review.salons as any)?.name || null;

    // ✅ 5) 살롱 접근 권한 확인
    if (auth.salonId !== salonId) {
      return NextResponse.json<ApiError>(
        { ok: false, error: "Access denied to this review", code: ErrorCode.FORBIDDEN },
        { status: 403 }
      );
    }

    // 6) 기존 reply 확인
    const { data: existingReply } = await supabase
      .from("review_replies")
      .select("id, status, generation_count")
      .eq("review_id", reviewId)
      .eq("channel", review.source)
      .single();

    // 4-1) posted면 재생성 불가
    if (existingReply?.status === 'posted') {
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: "Cannot regenerate a posted reply",
          code: ErrorCode.FORBIDDEN,
        },
        { status: 409 }
      );
    }

    // ⚠️ 5) Rate Limit 체크
    const currentGenerationCount = existingReply?.generation_count ?? 0;

    // 5-1) 리뷰당 제한 체크
    if (currentGenerationCount >= AI_GENERATION_LIMITS.MAX_PER_REVIEW) {
      console.log("[POST /api/reviews/[id]/reply] Rate limit: review limit reached", {
        reviewId,
        current: currentGenerationCount,
        limit: AI_GENERATION_LIMITS.MAX_PER_REVIEW,
      });
      
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: `This review has reached the maximum of ${AI_GENERATION_LIMITS.MAX_PER_REVIEW} AI generations. Please edit the existing reply instead.`,
          code: ErrorCode.RATE_LIMITED,
        },
        { status: 429 }
      );
    }

    // 5-2) 살롱 일일 제한 체크
    const dailyLimitResult = await checkAIGenerationLimit(supabase, salonId, reviewId);
    
    if (!dailyLimitResult.allowed) {
      console.log("[POST /api/reviews/[id]/reply] Rate limit:", {
        reviewId,
        salonId,
        reason: dailyLimitResult.reason,
        current: dailyLimitResult.current,
        limit: dailyLimitResult.limit,
      });

      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: getRateLimitErrorMessage(dailyLimitResult),
          code: ErrorCode.RATE_LIMITED,
        },
        { status: 429 }
      );
    }

    // 6) OpenAI API 키 확인
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

    // 7) User 프롬프트 생성
    const customerFirstName = review.customer_name?.split(' ')[0] || null;
    
    const userPrompt = `Source: ${review.source || 'unknown'}
Rating: ${review.rating ?? 'N/A'}/5
Customer name: ${customerFirstName || '(not provided)'}
Business name: ${salonName || '(not provided)'}
Review: "${review.review_text || '(No text)'}"

Write the JSON reply.`;

    // 8) OpenAI API 호출 (45초 타임아웃 + 재시도)
    let completionRes: Response;
    try {
      completionRes = await fetchOpenAI(
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
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 300,
            response_format: { type: "json_object" },
          }),
        }
      );
    } catch (err) {
      // 타임아웃 에러 특별 처리
      if (err instanceof ServerFetchTimeoutError) {
        console.error("[POST /api/reviews/[id]/reply] OpenAI timeout:", err.message);
        return NextResponse.json<ApiError>(
          {
            ok: false,
            error: "AI is taking too long to respond. Please try again.",
            code: ErrorCode.EXTERNAL_API_ERROR,
          },
          { status: 504 }
        );
      }
      throw err;
    }

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
    const rawContent: string =
      completionJson?.choices?.[0]?.message?.content?.trim() ?? "";

    if (!rawContent) {
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: "Empty reply generated",
          code: ErrorCode.EXTERNAL_API_ERROR,
        },
        { status: 500 }
      );
    }

    // 9) AI 응답 파싱
    const { reply: replyText, riskTags } = parseAIResponse(rawContent);

    if (!replyText) {
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: "Failed to parse AI reply",
          code: ErrorCode.EXTERNAL_API_ERROR,
        },
        { status: 500 }
      );
    }

    // 새 generation count
    const newGenerationCount = currentGenerationCount + 1;

    console.log("[POST /api/reviews/[id]/reply] Generated:", {
      reviewId,
      rating: review.rating,
      riskTags,
      replyLength: replyText.length,
      generationCount: newGenerationCount,
    });

    // 10) reviews 테이블 업데이트 (status + risk_tags)
    const reviewUpdateData: { status: string; risk_tags?: string[]; updated_at: string } = {
      status: 'drafted',
      updated_at: new Date().toISOString(),
    };
    
    if (riskTags.length > 0) {
      reviewUpdateData.risk_tags = riskTags;
    }

    await supabase
      .from("reviews")
      .update(reviewUpdateData)
      .eq("id", reviewId);

    // 11) review_replies 테이블에 upsert (generation_count 포함)
    const now = new Date().toISOString();
    const replyData = {
      review_id: review.id,
      salon_id: review.salon_id,
      source: trigger,
      channel: review.source ?? null,
      reply_text: replyText,
      model: "gpt-4o-mini",
      ai_draft_text: replyText,
      final_text: replyText,
      status: 'draft',
      last_error: null,
      generation_count: newGenerationCount,
      updated_at: now,
    };

    let replyRow;

    if (existingReply) {
      // 기존 reply가 있으면 업데이트
      const { data, error } = await supabase
        .from("review_replies")
        .update(replyData)
        .eq("id", existingReply.id)
        .select("id")
        .single();
      
      if (error) throw error;
      replyRow = data;
    } else {
      // 없으면 새로 생성
      const { data, error } = await supabase
        .from("review_replies")
        .insert(replyData)
        .select("id")
        .single();
      
      if (error) throw error;
      replyRow = data;
    }

    if (!replyRow) {
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: "Failed to save reply",
          code: ErrorCode.DATABASE_ERROR,
        },
        { status: 500 }
      );
    }

    // ⚠️ 12) 살롱 일일 카운트 증가
    await incrementSalonDailyCount(supabase, salonId);

    // 13) 성공 응답
    return NextResponse.json<ApiResponse<ReplyResponseData>>(
      {
        ok: true,
        data: {
          replyId: replyRow.id,
          replyText,
          riskTags: riskTags.length > 0 ? riskTags : undefined,
          status: 'draft',
          generationCount: newGenerationCount,
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
