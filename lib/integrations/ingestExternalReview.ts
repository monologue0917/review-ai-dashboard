// lib/integrations/ingestExternalReview.ts
/**
 * 외부 플랫폼(Google, Yelp 등)의 리뷰를 DB에 저장하는 공통 함수
 * 
 * - 중복 체크 (source + external_id)
 * - Upsert 로직
 * - 생성/업데이트 구분
 */

import { SupabaseClient } from "@supabase/supabase-js";

export interface ExternalReviewPayload {
  source: "google" | "yelp" | "facebook";
  externalId: string;           // 플랫폼별 unique ID
  customerName: string;
  rating: number;               // 1-5
  reviewText?: string;          // null 가능
  reviewDate: string;           // ISO timestamp
  reviewerProfileUrl?: string;  // 리뷰어 프로필 URL (optional)
}

export interface IngestExternalReviewResult {
  reviewId: string;             // DB에 저장된 review.id
  isNew: boolean;               // true: 새로 생성, false: 업데이트
}

/**
 * 외부 리뷰를 DB에 저장 (upsert)
 */
export async function ingestExternalReview(
  supabase: SupabaseClient,
  salonId: string,
  payload: ExternalReviewPayload
): Promise<IngestExternalReviewResult> {
  console.log("[ingestExternalReview] Processing:", {
    salonId,
    source: payload.source,
    externalId: payload.externalId,
  });

  // 1. 기존 리뷰 확인 (source + external_id)
  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("salon_id", salonId)
    .eq("source", payload.source)
    .eq("external_id", payload.externalId)
    .maybeSingle();

  const reviewData = {
    salon_id: salonId,
    source: payload.source,
    external_id: payload.externalId,
    customer_name: payload.customerName,
    rating: payload.rating,
    review_text: payload.reviewText || null,
    review_date: payload.reviewDate,
    reviewer_profile_url: payload.reviewerProfileUrl || null,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    // 2-A. 업데이트
    console.log(`[ingestExternalReview] Updating existing review: ${existing.id}`);

    const { error: updateError } = await supabase
      .from("reviews")
      .update(reviewData)
      .eq("id", existing.id);

    if (updateError) {
      console.error("[ingestExternalReview] Update error:", updateError);
      throw new Error(`Failed to update review: ${updateError.message}`);
    }

    return {
      reviewId: existing.id,
      isNew: false,
    };
  } else {
    // 2-B. 신규 생성
    console.log("[ingestExternalReview] Creating new review");

    const { data: created, error: insertError } = await supabase
      .from("reviews")
      .insert({
        ...reviewData,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError || !created) {
      console.error("[ingestExternalReview] Insert error:", insertError);
      throw new Error(`Failed to insert review: ${insertError?.message}`);
    }

    return {
      reviewId: created.id,
      isNew: true,
    };
  }
}

/**
 * 여러 리뷰를 한 번에 처리
 */
export async function ingestExternalReviews(
  supabase: SupabaseClient,
  salonId: string,
  payloads: ExternalReviewPayload[]
): Promise<{
  total: number;
  created: number;
  updated: number;
  failed: number;
  results: IngestExternalReviewResult[];
}> {
  console.log(`[ingestExternalReviews] Processing ${payloads.length} reviews`);

  const results: IngestExternalReviewResult[] = [];
  let created = 0;
  let updated = 0;
  let failed = 0;

  for (const payload of payloads) {
    try {
      const result = await ingestExternalReview(supabase, salonId, payload);
      results.push(result);

      if (result.isNew) {
        created++;
      } else {
        updated++;
      }
    } catch (err: any) {
      console.error("[ingestExternalReviews] Failed to ingest:", err);
      failed++;
    }
  }

  console.log("[ingestExternalReviews] Summary:", {
    total: payloads.length,
    created,
    updated,
    failed,
  });

  return {
    total: payloads.length,
    created,
    updated,
    failed,
    results,
  };
}