// lib/reviews/types.ts
/**
 * 리뷰 관련 타입 정의
 */

/* ===== UI 컴포넌트용 타입 ===== */

/**
 * 리뷰 상태
 */
export type ReviewStatus = 'New' | 'Drafted' | 'Approved';

/**
 * AI 답글 톤
 */
export type Tone = 'friendly' | 'professional' | 'premium';

/* ===== 대시보드용 타입 ===== */

/**
 * 최신 답글 요약 정보
 */
export type ReviewReplySummary = {
  id: string;
  text: string;
  createdAt: string;
  source: string | null;   // 'auto' | 'manual'
  channel: string | null;  // 'google' | 'yelp' | null
};

/**
 * 대시보드에서 사용하는 리뷰 아이템
 * GET /api/reviews/with-replies 응답 형식
 */
export type ReviewItem = {
  id: number;
  salonId: string;
  source: string | null;        // 'google' | 'yelp' | null
  rating: number | null;
  reviewText: string | null;
  reviewDate: string | null;
  customerName: string | null;
  hasReply: boolean;
  latestReply: ReviewReplySummary | null;
};

/**
 * GET /api/reviews/with-replies 응답 타입
 */
export type ReviewsWithRepliesResponse = {
  ok: true;
  data: ReviewItem[];
} | {
  ok: false;
  error: string;
  code?: string;
};

/**
 * POST /api/reviews/[id]/reply 응답 타입
 */
export type GenerateReplyResponse = {
  ok: true;
  data: {
    replyId: string;
    replyText: string;
  };
} | {
  ok: false;
  error: string;
  code?: string;
};

/* ===== Webhook/Import용 타입 ===== */

/**
 * 외부 플랫폼에서 들어오는 리뷰 데이터 (Webhook 포맷)
 */
export interface IncomingReview {
  externalId: string;           // 플랫폼별 고유 ID
  source: "google" | "yelp" | "facebook";
  salonId: string;
  rating: number;               // 1-5
  reviewText?: string | null;
  reviewDate: string;           // ISO 8601
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  rawPayload?: unknown;         // 원본 JSON 보관용
}

/* ===== DB 테이블 타입 (참고용) ===== */

/**
 * DB reviews 테이블 행
 */
export interface ReviewRow {
  id: number;
  salon_id: string;
  review_id: string;            // 외부 시스템 리뷰 ID
  source: string | null;
  customer_name: string | null;
  customer_email: string | null;
  rating: number | null;
  review_text: string | null;
  review_date: string | null;
  status: string | null;
  risk_tags: string[] | null;
  raw_payload: unknown | null;
  created_at: string;
  updated_at: string;
}

/**
 * DB review_replies 테이블 행
 */
export interface ReviewReplyRow {
  id: string;
  review_id: number;
  salon_id: string;
  reply_text: string;
  source: string | null;        // 'auto' | 'manual'
  channel: string | null;       // 'google' | 'yelp' | null
  model: string | null;         // 'gpt-4o-mini' 등
  posted_at: string | null;
  posted_success: boolean | null;
  created_at: string;
}

/* ===== Settings 타입 ===== */

/**
 * 살롱 설정 API 응답
 */
export type SalonSettingsResponse = {
  ok: true;
  data: {
    name?: string;
    autoReplyGoogle: boolean;
    autoReplyYelp: boolean;
    autoReplyMinRating?: number;
    notificationEmail: string;
    googlePlaceId: string;
    yelpBusinessId: string;
    // Google 연결 정보
    googleConnected: boolean;
    googleEmail: string | null;
    googleLocationId: string | null;
    googleLocationName: string | null;
  };
} | {
  ok: false;
  error: string;
  code?: string;
};
