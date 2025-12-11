// lib/google/types.ts
/**
 * Google OAuth 및 Business Profile API 관련 타입 정의
 */

/* ===== OAuth 토큰 ===== */

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  expiry_date?: number; // Unix timestamp in milliseconds
}

export interface GoogleUserInfo {
  id: string;           // Google user ID (sub)
  email: string;
  name?: string;
  picture?: string;
}

export interface GoogleTokenRefreshResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

/* ===== DB Row 타입 ===== */

export interface GoogleAccountRow {
  id: string;
  user_id: string;
  google_user_id: string;
  email: string;
  access_token: string;
  refresh_token: string | null;
  scope: string | null;
  token_type: string | null;
  expiry_at: string | null;
  token_expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalonGoogleConnectionRow {
  id: string;
  salon_id: string;
  google_account_id: string;
  location_name: string;
  location_id: string | null;
  location_title: string | null;
  sync_enabled: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

/* ===== Google Business Profile API 타입 ===== */

/**
 * GBP Account (My Business Account Management API)
 */
export interface GBPAccount {
  name: string;           // accounts/123456789
  accountName: string;    // 표시 이름
  type: string;           // PERSONAL, LOCATION_GROUP, etc.
  role?: string;          // OWNER, MANAGER, etc.
  state?: {
    status: string;
  };
}

/**
 * GBP Location (My Business Business Information API)
 */
export interface GBPLocation {
  name: string;           // accounts/123/locations/456
  title: string;          // 비즈니스 이름
  storefrontAddress?: {
    addressLines?: string[];
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
    regionCode?: string;
  };
  websiteUri?: string;
  phoneNumbers?: {
    primaryPhone?: string;
  };
  metadata?: {
    placeId?: string;
  };
}

/**
 * GBP Review (Google Business Profile API)
 */
export interface GBPReview {
  name: string;           // accounts/xxx/locations/yyy/reviews/zzz
  reviewId: string;
  reviewer: {
    displayName?: string;
    profilePhotoUrl?: string;
  };
  starRating: 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE';
  comment?: string;
  createTime: string;
  updateTime: string;
  reviewReply?: {
    comment: string;
    updateTime: string;
  };
}

/**
 * Google Review (API 응답용 - 다른 형식)
 */
export interface GoogleReview {
  name: string;
  reviewId?: string;
  reviewer: {
    displayName?: string;
    profilePhotoUrl?: string;
  };
  starRating: string;
  comment?: string;
  createTime: string;
  updateTime?: string;
  reviewReply?: {
    comment: string;
    updateTime: string;
  };
}

/**
 * Google Reviews API 응답
 */
export interface GoogleReviewsResponse {
  reviews?: GoogleReview[];
  averageRating?: number;
  totalReviewCount?: number;
  nextPageToken?: string;
}

/* ===== API 응답 타입 ===== */

export interface GoogleAuthStartResponse {
  authUrl: string;
}

export interface GoogleAuthCallbackResponse {
  success: boolean;
  googleAccountId: string;
  email: string;
}

export interface GoogleLocationDTO {
  name: string;           // resource name
  locationId: string;     // 짧은 ID
  title: string;          // 비즈니스 이름
  address?: string;       // 포맷된 주소
  placeId?: string;
}

export interface GoogleLocationsResponse {
  accounts: {
    accountName: string;
    accountId: string;
    locations: GoogleLocationDTO[];
  }[];
}

/**
 * 리뷰 동기화 결과
 */
export interface SyncReviewsResult {
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
}

/* ===== 유틸리티 타입 ===== */

/**
 * 별점 문자열 → 숫자 변환
 */
export function starRatingToNumber(rating: GBPReview['starRating'] | string): number {
  const map: Record<string, number> = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
  };
  return map[rating] ?? 0;
}
