// lib/reviews/types.ts
/**
 * 리뷰 관련 타입 정의
 */

/* ===== UI 컴포넌트용 타입 ===== */

/**
 * 리뷰 상태 (워크플로우)
 * new → drafted → approved → posted
 */
export type ReviewStatus = 'new' | 'drafted' | 'approved' | 'posted';

/**
 * 상태별 메타 정보
 */
export const REVIEW_STATUS_META: Record<ReviewStatus, { 
  label: string; 
  description: string;
  color: string;
  nextStatus?: ReviewStatus;
  nextAction?: string;
}> = {
  new: { 
    label: 'New', 
    description: 'Waiting for AI reply',
    color: 'violet',
  },
  drafted: { 
    label: 'Drafted', 
    description: 'AI reply generated, awaiting approval',
    color: 'amber',
    nextStatus: 'approved',
    nextAction: 'Approve',
  },
  approved: { 
    label: 'Approved', 
    description: 'Ready to post to platform',
    color: 'emerald',
    nextStatus: 'posted',
    nextAction: 'Mark as Posted',
  },
  posted: { 
    label: 'Posted', 
    description: 'Reply posted to platform',
    color: 'sky',
  },
};

/**
 * AI 답글 톤
 */
export type Tone = 'friendly' | 'professional' | 'premium';

/**
 * Risk Tag 타입 - 부정 리뷰 분석용
 */
export type RiskTagType = 
  | 'wait_time'
  | 'service_quality'
  | 'rude_staff'
  | 'cleanliness'
  | 'price'
  | 'booking'
  | 'results'
  | 'communication'
  | 'other';

/**
 * Risk Tag 메타 정보
 */
export const RISK_TAG_META: Record<RiskTagType, { label: string; color: string; emoji: string }> = {
  wait_time: { label: 'Wait Time', color: 'amber', emoji: '⏰' },
  service_quality: { label: 'Service Quality', color: 'rose', emoji: '💅' },
  rude_staff: { label: 'Rude Staff', color: 'red', emoji: '😤' },
  cleanliness: { label: 'Cleanliness', color: 'orange', emoji: '🧹' },
  price: { label: 'Price', color: 'violet', emoji: '💰' },
  booking: { label: 'Booking Issues', color: 'blue', emoji: '📅' },
  results: { label: 'Results', color: 'pink', emoji: '✨' },
  communication: { label: 'Communication', color: 'cyan', emoji: '💬' },
  other: { label: 'Other', color: 'slate', emoji: '📝' },
};

/* ===== 대시보드용 타입 ===== */

/**
 * 답글 상태 (reply workflow)
 */
export type ReplyStatus = 'draft' | 'approved' | 'posted' | 'failed';

/**
 * 최신 답글 요약 정보 (확장)
 */
export type ReviewReplySummary = {
  id: string;
  text: string;
  createdAt: string;
  source: string | null;   // 'auto' | 'manual'
  channel: string | null;  // 'google' | 'yelp' | null
  // 새로 추가된 필드
  aiDraftText?: string | null;
  finalText?: string | null;
  status?: ReplyStatus;
  lastError?: string | null;
  postedAt?: string | null;
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
  // 상태
  status: ReviewStatus;
  hasReply: boolean;
  latestReply: ReviewReplySummary | null;
  // Risk Tags - 부정 리뷰 분석
  riskTags: string[];
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
    riskTags?: string[];
  };
} | {
  ok: false;
  error: string;
  code?: string;
};

/**
 * PATCH /api/reviews/[id]/status 응답 타입
 */
export type UpdateStatusResponse = {
  ok: true;
  data: {
    id: number;
    status: ReviewStatus;
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
