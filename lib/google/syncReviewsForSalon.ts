// lib/google/syncReviewsForSalon.ts
/**
 * Google Business Profile 리뷰 동기화
 * 
 * 1. Google 연결 정보 조회
 * 2. Access token 갱신 (필요시)
 * 3. Google Reviews API 호출
 * 4. 기존 Webhook 파이프라인으로 전달
 */

import { createClient } from "@supabase/supabase-js";
import type {
  GoogleReview,
  GoogleReviewsResponse,
  GoogleTokenRefreshResponse,
  SyncReviewsResult,
} from "./types";
import type { IncomingReview } from "../reviews/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Star rating 매핑
const starRatingToNumber = (rating: string): number => {
  const map: Record<string, number> = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
  };
  return map[rating] || 0;
};

/**
 * Access token이 만료되었는지 확인 (5분 여유)
 */
function isTokenExpired(expiresAt: string): boolean {
  const expiresAtTime = new Date(expiresAt).getTime();
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  
  return expiresAtTime - now < fiveMinutes;
}

/**
 * Google access token 갱신
 */
async function refreshAccessToken(
  refreshToken: string
): Promise<GoogleTokenRefreshResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;

  if (!clientId || !clientSecret) {
    throw new Error("Missing Google OAuth credentials");
  }

  console.log("[refreshAccessToken] Refreshing token...");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refresh token: ${response.status} ${errorText}`);
  }

  const data: GoogleTokenRefreshResponse = await response.json();
  return data;
}

/**
 * Google Reviews API 호출
 */
async function fetchGoogleReviews(
  accessToken: string,
  locationId: string
): Promise<GoogleReview[]> {
  console.log(`[fetchGoogleReviews] Fetching reviews for ${locationId}`);

  const allReviews: GoogleReview[] = [];
  let nextPageToken: string | undefined = undefined;
  let pageCount = 0;
  const maxPages = 10; // 무한 루프 방지

  do {
    const url = new URL(`https://mybusiness.googleapis.com/v4/${locationId}/reviews`);
    url.searchParams.set("pageSize", "50");
    url.searchParams.set("orderBy", "updateTime desc");
    if (nextPageToken) {
      url.searchParams.set("pageToken", nextPageToken);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch Google reviews: ${response.status} ${errorText}`
      );
    }

    const data: GoogleReviewsResponse = await response.json();
    
    if (data.reviews && data.reviews.length > 0) {
      allReviews.push(...data.reviews);
      console.log(`[fetchGoogleReviews] Page ${pageCount + 1}: ${data.reviews.length} reviews`);
    }

    nextPageToken = data.nextPageToken;
    pageCount++;

    // 무한 루프 방지
    if (pageCount >= maxPages) {
      console.warn(`[fetchGoogleReviews] Reached max pages (${maxPages}), stopping`);
      break;
    }
  } while (nextPageToken);

  console.log(`[fetchGoogleReviews] Total reviews fetched: ${allReviews.length}`);

  return allReviews;
}

/**
 * Google Review → IncomingReview 매핑
 */
function mapGoogleReviewToIncoming(
  review: GoogleReview,
  salonId: string
): IncomingReview {
  return {
    externalId: review.name,
    source: "google",
    salonId: salonId,
    rating: starRatingToNumber(review.starRating),
    reviewText: review.comment || null,
    reviewDate: review.updateTime || review.createTime,
    customerName: review.reviewer?.displayName || null,
    customerEmail: null,
    customerPhone: null,
    rawPayload: review,
  };
}

/**
 * 기존 Webhook 파이프라인 호출
 */
async function processReviewThroughWebhook(
  review: IncomingReview
): Promise<{ imported: boolean; updated: boolean; skipped: boolean }> {
  try {
    console.log(`[processReview] Processing: ${review.externalId}`);

    // /api/integrations/reviews 호출
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/integrations/reviews`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(review),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[processReview] Webhook failed: ${errorText}`);
      return { imported: false, updated: false, skipped: true };
    }

    const result = await response.json();

    // 응답 형식에 따라 imported/updated 판단
    // 기존 Webhook이 { ok: true, data: { created: boolean, ... } } 형식이라고 가정
    const wasCreated = result.data?.created ?? false;

    return {
      imported: wasCreated,
      updated: !wasCreated,
      skipped: false,
    };
  } catch (err: any) {
    console.error(`[processReview] Error:`, err);
    return { imported: false, updated: false, skipped: true };
  }
}

/**
 * 메인 함수: Google Reviews 동기화
 */
export async function syncReviewsForSalon(
  salonId: string
): Promise<SyncReviewsResult> {
  console.log(`[syncReviewsForSalon] Starting sync for salon: ${salonId}`);

  // 1. salon_google_connections 조회
  const { data: connection, error: connectionError } = await supabase
    .from("salon_google_connections")
    .select("google_account_id, location_id, location_name, sync_enabled")
    .eq("salon_id", salonId)
    .eq("sync_enabled", true)
    .single();

  if (connectionError || !connection) {
    throw new Error("Google connection not found for this salon");
  }

  if (!connection.location_id) {
    throw new Error("Google location not configured for this salon");
  }

  console.log(`[syncReviewsForSalon] Connection found: ${connection.location_id}`);

  // 2. google_accounts 조회
  const { data: account, error: accountError } = await supabase
    .from("google_accounts")
    .select("*")
    .eq("id", connection.google_account_id)
    .single();

  if (accountError || !account) {
    throw new Error("Google account not found");
  }

  console.log(`[syncReviewsForSalon] Account found: ${account.email}`);

  // 3. Access token 갱신 (필요시)
  let accessToken = account.access_token;

  if (isTokenExpired(account.token_expires_at)) {
    console.log("[syncReviewsForSalon] Token expired, refreshing...");

    const refreshed = await refreshAccessToken(account.refresh_token);

    // DB 업데이트
    const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

    const { error: updateError } = await supabase
      .from("google_accounts")
      .update({
        access_token: refreshed.access_token,
        token_expires_at: newExpiresAt,
        scope: refreshed.scope,
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id);

    if (updateError) {
      console.error("[syncReviewsForSalon] Failed to update token:", updateError);
      throw new Error("Failed to update access token");
    }

    accessToken = refreshed.access_token;
    console.log("[syncReviewsForSalon] Token refreshed successfully");
  }

  // 4. Google Reviews API 호출
  const googleReviews = await fetchGoogleReviews(accessToken, connection.location_id);

  console.log(`[syncReviewsForSalon] Fetched ${googleReviews.length} reviews`);

  // 5. 리뷰 매핑 및 처리
  let importedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const googleReview of googleReviews) {
    const incomingReview = mapGoogleReviewToIncoming(googleReview, salonId);
    
    const result = await processReviewThroughWebhook(incomingReview);

    if (result.imported) importedCount++;
    if (result.updated) updatedCount++;
    if (result.skipped) skippedCount++;
  }

  console.log(`[syncReviewsForSalon] Sync complete:`, {
    importedCount,
    updatedCount,
    skippedCount,
  });

  return {
    importedCount,
    updatedCount,
    skippedCount,
  };
}