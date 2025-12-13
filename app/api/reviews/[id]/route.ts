// app/api/reviews/[id]/route.ts
/**
 * 레거시 리뷰 업데이트 API
 * TODO: 추후 /api/reviews/[id]/status로 통합 필요
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAuth } from "@/lib/auth/verifyApiAuth";

function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error("[reviews:id api] Missing Supabase env vars");
    throw new Error("Missing Supabase configuration");
  }

  return createClient(url, serviceKey);
}

type ReviewUpdatePayload = {
  status?: string;           // "New" | "Drafted" | "Approved"
  aiReply?: string | null;
  hasAiReply?: boolean;
  aiStatus?: string;         // "Idle" | "Generating" | "Ready" | "Error"
  riskTags?: string[];
};

function mapDbRow(row: any) {
  return {
    id: row.id as number,
    reviewId: row.review_id as string | null,
    date: row.date as string,
    source: row.source as string,
    rating: row.rating as number,
    customer: row.customer as string,
    review: row.review as string,
    status: (row.status ?? "New") as string,
    hasAiReply: !!row.has_ai_reply,
    riskTags: (row.risk_tags ?? []) as string[],
    aiReply: row.ai_reply as string | null,
    aiStatus: (row.ai_status ?? "Idle") as string,
  };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Next.js 15+: params는 Promise
    const { id } = await params;
    const reviewIdNum = Number(id);

    if (!reviewIdNum || Number.isNaN(reviewIdNum)) {
      return NextResponse.json(
        { error: "Invalid review id" },
        { status: 400 }
      );
    }

    // ✅ 인증 검증
    const auth = await verifyAuth(req);
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    const body = (await req.json()) as ReviewUpdatePayload;

    const supabase = getSupabaseServer();

    // 리뷰의 salon_id 확인
    const { data: existingReview, error: fetchError } = await supabase
      .from("reviews")
      .select("id, salon_id")
      .eq("id", reviewIdNum)
      .single();

    if (fetchError || !existingReview) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      );
    }

    // ✅ 살롱 접근 권한 확인
    if (auth.salonId !== existingReview.salon_id) {
      return NextResponse.json(
        { error: "Access denied to this review" },
        { status: 403 }
      );
    }

    const patch: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.status !== undefined) {
      patch.status = body.status;
    }
    if (body.aiReply !== undefined) {
      patch.ai_reply = body.aiReply;
      // aiReply가 있으면 has_ai_reply도 true로 맞춰줄 수 있음
      if (body.hasAiReply === undefined && body.aiReply) {
        patch.has_ai_reply = true;
      }
    }
    if (body.hasAiReply !== undefined) {
      patch.has_ai_reply = body.hasAiReply;
    }
    if (body.aiStatus !== undefined) {
      patch.ai_status = body.aiStatus;
    }
    if (body.riskTags !== undefined) {
      patch.risk_tags = body.riskTags;
    }

    const { data, error } = await supabase
      .from("reviews")
      .update(patch)
      .eq("id", reviewIdNum)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("[reviews:id PATCH] supabase error:", error);
      return NextResponse.json(
        { error: "Failed to update review" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      );
    }

    const mapped = mapDbRow(data);
    return NextResponse.json(
      { success: true, review: mapped },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[reviews:id PATCH] unexpected:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
        detail: String(err?.message ?? err),
      },
      { status: 500 }
    );
  }
}
