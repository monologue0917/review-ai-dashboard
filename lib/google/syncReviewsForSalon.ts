// lib/google/syncReviewsForSalon.ts
/**
 * ===================================================================
 * Google Business Profile 리뷰 동기화
 * ===================================================================
 * 
 * 전체 플로우:
 * 1. salon_google_connections에서 연결 정보 조회
 * 2. google_accounts에서 토큰 조회
 * 3. 토큰 만료 시 갱신
 * 4. Google Reviews API 호출 (mybusinessreviews.googleapis.com)
 * 5. 리뷰를 /api/integrations/reviews 파이프라인으로 전달
 * 6. 결과 반환
 * 
 * 에러 처리:
 * - Rate Limit: 재시도 로직 (최대 3회, 지수 백오프)
 * - Token 만료: 자동 갱신
 * - API 오류: 상세 에러 메시지
 */

import { createClient } from "@supabase/supabase-js";
import { refreshAccessToken, isTokenExpired } from "./oauth";
import { starRatingToNumber } from "./types";
import type {
  GoogleAccountRow,
  SalonGoogleConnectionRow,
  GBPReview,
  SyncReviewsResult,
} from "./types";

/* ===== Supabase 클라이언트 ===== */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/* ===== 상수 ===== */

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_PAGES = 10;
const PAGE_SIZE = 50;

/* ===== 에러 클래스 ===== */

export class SyncError extends Error {
  code: string;
  retryable: boolean;

  constructor(message: string, code: string, retryable = false) {
    super(message);
    this.name = "SyncError";
    this.code = code;
    this.retryable = retryable;
  }
}

/* ===== 유틸리티 함수들 ===== */

/**
 * 지수 백오프 딜레이
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 재시도 가능한 fetch
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Rate Limit
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const delayMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);

        console.warn(
          `[fetchWithRetry] Rate limited, waiting ${delayMs}ms (attempt ${attempt + 1}/${retries})`
        );

        if (attempt < retries - 1) {
          await sleep(delayMs);
          continue;
        }

        throw new SyncError(
          "Google API rate limit exceeded. Please try again later.",
          "RATE_LIMITED",
          true
        );
      }

      // 서버 에러 (5xx) - 재시도 가능
      if (response.status >= 500 && attempt < retries - 1) {
        const delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
        console.warn(
          `[fetchWithRetry] Server error ${response.status}, retrying in ${delayMs}ms`
        );
        await sleep(delayMs);
        continue;
      }

      return response;
    } catch (err: any) {
      lastError = err;

      // 네트워크 에러 - 재시도 가능
      if (attempt < retries - 1) {
        const delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
        console.warn(
          `[fetchWithRetry] Network error, retrying in ${delayMs}ms:`,
          err.message
        );
        await sleep(delayMs);
        continue;
      }
    }
  }

  throw lastError || new Error("Failed after retries");
}

/* ===== Google Reviews API ===== */

/**
 * Google Reviews API 응답 타입
 */
interface GoogleReviewsApiResponse {
  reviews?: GBPReview[];
  averageRating?: number;
  totalReviewCount?: number;
  nextPageToken?: string;
}

/**
 * Google Business Profile Reviews API 호출
 * 
 * API: https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews
 * 
 * @param accessToken - Google access token
 * @param locationName - Full resource name (accounts/xxx/locations/yyy)
 */
async function fetchGoogleReviews(
  accessToken: string,
  locationName: string
): Promise<GBPReview[]> {
  console.log(`[fetchGoogleReviews] Fetching reviews for: ${locationName}`);

  const allReviews: GBPReview[] = [];
  let nextPageToken: string | undefined;
  let pageCount = 0;

  do {
    // URL 구성
    // Google Business Profile API v1: accounts.locations.reviews.list
    const url = new URL(
      `https://mybusiness.googleapis.com/v4/${locationName}/reviews`
    );
    url.searchParams.set("pageSize", PAGE_SIZE.toString());
    
    if (nextPageToken) {
      url.searchParams.set("pageToken", nextPageToken);
    }

    console.log(`[fetchGoogleReviews] Page ${pageCount + 1}: ${url.toString()}`);

    const response = await fetchWithRetry(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    // 에러 처리
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[fetchGoogleReviews] API Error:`, {
        status: response.status,
        body: errorText,
      });

      // 에러 코드별 처리
      switch (response.status) {
        case 401:
          throw new SyncError(
            "Google access token is invalid or expired.",
            "TOKEN_EXPIRED",
            false
          );

        case 403:
          throw new SyncError(
            "Permission denied. Make sure you have access to this business.",
            "PERMISSION_DENIED",
            false
          );

        case 404:
          throw new SyncError(
            "Location not found. The business may have been removed.",
            "LOCATION_NOT_FOUND",
            false
          );

        case 429:
          throw new SyncError(
            "Rate limit exceeded. Please try again later.",
            "RATE_LIMITED",
            true
          );

        default:
          throw new SyncError(
            `Google API error: ${response.status} ${errorText}`,
            "GOOGLE_API_ERROR",
            response.status >= 500
          );
      }
    }

    // 응답 파싱
    const data: GoogleReviewsApiResponse = await response.json();

    if (data.reviews && data.reviews.length > 0) {
      allReviews.push(...data.reviews);
      console.log(
        `[fetchGoogleReviews] Page ${pageCount + 1}: ${data.reviews.length} reviews`
      );
    } else {
      console.log(`[fetchGoogleReviews] Page ${pageCount + 1}: No reviews`);
    }

    nextPageToken = data.nextPageToken;
    pageCount++;

    // 무한 루프 방지
    if (pageCount >= MAX_PAGES) {
      console.warn(
        `[fetchGoogleReviews] Reached max pages (${MAX_PAGES}), stopping`
      );
      break;
    }
  } while (nextPageToken);

  console.log(`[fetchGoogleReviews] Total reviews fetched: ${allReviews.length}`);

  return allReviews;
}

/* ===== 리뷰 매핑 ===== */

/**
 * API가 기대하는 리뷰 페이로드 타입
 */
interface ReviewPayloadForApi {
  salonId: string;
  source: "google" | "yelp" | "facebook";
  externalId: string;
  customerName: string;
  rating: number;
  reviewText?: string;
  reviewDate: string;
  reviewerProfileUrl?: string;
}

/**
 * Google Review → API 페이로드 변환
 */
function mapGoogleReviewToPayload(
  review: GBPReview,
  salonId: string
): ReviewPayloadForApi {
  // review.name 형식: accounts/xxx/locations/yyy/reviews/zzz
  const reviewId = review.reviewId || review.name.split("/").pop() || review.name;

  return {
    salonId: salonId,
    source: "google",
    externalId: reviewId,
    customerName: review.reviewer?.displayName || "Anonymous",
    rating: starRatingToNumber(review.starRating),
    reviewText: review.comment || undefined,
    reviewDate: review.updateTime || review.createTime,
    reviewerProfileUrl: review.reviewer?.profilePhotoUrl || undefined,
  };
}

/* ===== 리뷰 처리 ===== */

/**
 * 리뷰를 기존 Webhook 파이프라인으로 전달
 */
async function processReviewThroughPipeline(
  payload: ReviewPayloadForApi
): Promise<{ imported: boolean; updated: boolean; skipped: boolean; error?: string }> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const url = `${appUrl}/api/integrations/reviews`;

    console.log(`[processReview] Processing: ${payload.externalId}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[processReview] Pipeline error:`, errorText);
      return {
        imported: false,
        updated: false,
        skipped: true,
        error: errorText,
      };
    }

    const result = await response.json();

    // 응답 형식: { ok: true, data: { reviewId: string, isNew: boolean } }
    if (!result.ok) {
      return {
        imported: false,
        updated: false,
        skipped: true,
        error: result.error,
      };
    }

    // isNew: true = 새로 생성, false = 업데이트
    const wasCreated = result.data?.isNew ?? false;

    return {
      imported: wasCreated,
      updated: !wasCreated,
      skipped: false,
    };
  } catch (err: any) {
    console.error(`[processReview] Exception:`, err);
    return {
      imported: false,
      updated: false,
      skipped: true,
      error: err.message,
    };
  }
}

/* ===== 토큰 관리 ===== */

/**
 * Access token 가져오기 (필요 시 갱신)
 */
async function getValidAccessToken(
  account: GoogleAccountRow
): Promise<string> {
  // 토큰이 유효하면 그대로 반환
  if (!isTokenExpired(account.expiry_at)) {
    return account.access_token;
  }

  // Refresh token이 없으면 에러
  if (!account.refresh_token) {
    throw new SyncError(
      "No refresh token available. Please reconnect your Google account.",
      "NO_REFRESH_TOKEN",
      false
    );
  }

  console.log(`[getValidAccessToken] Refreshing token for: ${account.email}`);

  try {
    const newTokens = await refreshAccessToken(account.refresh_token);

    // DB 업데이트
    const newExpiryAt = newTokens.expiry_date
      ? new Date(newTokens.expiry_date).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString(); // 기본 1시간

    const { error: updateError } = await supabase
      .from("google_accounts")
      .update({
        access_token: newTokens.access_token,
        expiry_at: newExpiryAt,
        scope: newTokens.scope,
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id);

    if (updateError) {
      console.error("[getValidAccessToken] DB update error:", updateError);
      // DB 업데이트 실패해도 새 토큰은 사용 가능
    }

    console.log("[getValidAccessToken] Token refreshed successfully");
    return newTokens.access_token;
  } catch (err: any) {
    console.error("[getValidAccessToken] Refresh failed:", err);

    // refresh_token이 만료된 경우 (보통 6개월 미사용 시)
    if (err.message?.includes("invalid_grant")) {
      throw new SyncError(
        "Google session expired. Please reconnect your Google account.",
        "SESSION_EXPIRED",
        false
      );
    }

    throw new SyncError(
      `Failed to refresh Google token: ${err.message}`,
      "TOKEN_REFRESH_FAILED",
      false
    );
  }
}

/* ===== 메인 함수 ===== */

/**
 * Google Business Profile 리뷰 동기화
 * 
 * @param salonId - 동기화할 살롱 ID
 * @returns 동기화 결과 (imported/updated/skipped 카운트)
 * @throws SyncError
 */
export async function syncReviewsForSalon(
  salonId: string
): Promise<SyncReviewsResult> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`[syncReviewsForSalon] Starting sync for salon: ${salonId}`);
  console.log(`${"=".repeat(60)}\n`);

  // 1. salon_google_connections 조회
  console.log("[Step 1] Fetching salon_google_connections...");

  const { data: connection, error: connectionError } = await supabase
    .from("salon_google_connections")
    .select("*")
    .eq("salon_id", salonId)
    .eq("sync_enabled", true)
    .single();

  if (connectionError) {
    console.error("[Step 1] Connection query error:", connectionError);

    if (connectionError.code === "PGRST116") {
      throw new SyncError(
        "No Google connection found for this salon. Please connect your Google Business Profile first.",
        "NO_CONNECTION",
        false
      );
    }

    throw new SyncError(
      `Database error: ${connectionError.message}`,
      "DATABASE_ERROR",
      true
    );
  }

  if (!connection) {
    throw new SyncError(
      "No active Google connection found for this salon.",
      "NO_CONNECTION",
      false
    );
  }

  const typedConnection = connection as SalonGoogleConnectionRow;

  // location_name 확인 (full resource name: accounts/xxx/locations/yyy)
  if (!typedConnection.location_name) {
    throw new SyncError(
      "Google location not configured. Please select a location in Settings.",
      "NO_LOCATION",
      false
    );
  }

  console.log("[Step 1] Connection found:", {
    connectionId: typedConnection.id,
    locationName: typedConnection.location_name,
    locationTitle: typedConnection.location_title,
  });

  // 2. google_accounts 조회
  console.log("\n[Step 2] Fetching google_accounts...");

  const { data: account, error: accountError } = await supabase
    .from("google_accounts")
    .select("*")
    .eq("id", typedConnection.google_account_id)
    .single();

  if (accountError || !account) {
    console.error("[Step 2] Account query error:", accountError);
    throw new SyncError(
      "Google account not found. Please reconnect your Google account.",
      "ACCOUNT_NOT_FOUND",
      false
    );
  }

  const typedAccount = account as GoogleAccountRow;

  console.log("[Step 2] Account found:", {
    accountId: typedAccount.id,
    email: typedAccount.email,
    hasRefreshToken: !!typedAccount.refresh_token,
    expiryAt: typedAccount.expiry_at,
  });

  // 3. Access token 가져오기 (필요 시 갱신)
  console.log("\n[Step 3] Getting valid access token...");

  const accessToken = await getValidAccessToken(typedAccount);

  console.log("[Step 3] Access token ready");

  // 4. Google Reviews API 호출
  console.log("\n[Step 4] Fetching reviews from Google...");

  const googleReviews = await fetchGoogleReviews(
    accessToken,
    typedConnection.location_name
  );

  console.log(`[Step 4] Fetched ${googleReviews.length} reviews`);

  // 리뷰가 없으면 조기 반환
  if (googleReviews.length === 0) {
    console.log("\n[Result] No reviews to sync");

    // last_synced_at 업데이트
    await supabase
      .from("salon_google_connections")
      .update({
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", typedConnection.id);

    return {
      importedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
    };
  }

  // 5. 리뷰 처리
  console.log("\n[Step 5] Processing reviews through pipeline...");

  let importedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < googleReviews.length; i++) {
    const googleReview = googleReviews[i];
    const progress = `[${i + 1}/${googleReviews.length}]`;

    try {
      const payload = mapGoogleReviewToPayload(googleReview, salonId);

      console.log(
        `${progress} Processing: ${payload.externalId} (${payload.rating}★)`
      );

      const result = await processReviewThroughPipeline(payload);

      if (result.imported) {
        importedCount++;
        console.log(`${progress} ✅ Imported`);
      } else if (result.updated) {
        updatedCount++;
        console.log(`${progress} 🔄 Updated`);
      } else if (result.skipped) {
        skippedCount++;
        console.log(`${progress} ⏭️ Skipped: ${result.error || "unknown"}`);
        if (result.error) {
          errors.push(result.error);
        }
      }
    } catch (err: any) {
      skippedCount++;
      console.error(`${progress} ❌ Error:`, err.message);
      errors.push(err.message);
    }

    // Rate limit 방지를 위한 작은 딜레이
    if (i < googleReviews.length - 1) {
      await sleep(100);
    }
  }

  // 6. last_synced_at 업데이트
  console.log("\n[Step 6] Updating last_synced_at...");

  const { error: updateError } = await supabase
    .from("salon_google_connections")
    .update({
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", typedConnection.id);

  if (updateError) {
    console.warn("[Step 6] Failed to update last_synced_at:", updateError);
  }

  // 결과 로깅
  console.log(`\n${"=".repeat(60)}`);
  console.log("[syncReviewsForSalon] Sync complete!");
  console.log(`${"=".repeat(60)}`);
  console.log(`  ✅ Imported: ${importedCount}`);
  console.log(`  🔄 Updated:  ${updatedCount}`);
  console.log(`  ⏭️ Skipped:  ${skippedCount}`);
  if (errors.length > 0) {
    console.log(`  ❌ Errors:   ${errors.length}`);
  }
  console.log("");

  return {
    importedCount,
    updatedCount,
    skippedCount,
  };
}

/* ===== 추가 유틸리티 ===== */

/**
 * 동기화 가능 여부 확인 (UI에서 버튼 활성화 여부 결정용)
 */
export async function canSyncReviews(salonId: string): Promise<{
  canSync: boolean;
  reason?: string;
}> {
  // 1. Connection 확인
  const { data: connection } = await supabase
    .from("salon_google_connections")
    .select("google_account_id, location_name, sync_enabled")
    .eq("salon_id", salonId)
    .single();

  if (!connection) {
    return {
      canSync: false,
      reason: "Google account not connected",
    };
  }

  if (!connection.location_name) {
    return {
      canSync: false,
      reason: "Business location not selected",
    };
  }

  if (!connection.sync_enabled) {
    return {
      canSync: false,
      reason: "Sync is disabled",
    };
  }

  // 2. Account 확인
  const { data: account } = await supabase
    .from("google_accounts")
    .select("refresh_token")
    .eq("id", connection.google_account_id)
    .single();

  if (!account) {
    return {
      canSync: false,
      reason: "Google account not found",
    };
  }

  if (!account.refresh_token) {
    return {
      canSync: false,
      reason: "Refresh token missing. Please reconnect Google.",
    };
  }

  return { canSync: true };
}
