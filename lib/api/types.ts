// lib/api/types.ts
/**
 * 표준 API 응답 타입
 * 
 * 모든 API 엔드포인트는 이 형식을 따릅니다:
 * - 성공: { ok: true, data: T }
 * - 실패: { ok: false, error: string, code?: ErrorCode }
 */

/* ===== 응답 타입 ===== */

export type ApiSuccess<T> = {
  ok: true;
  data: T;
};

export type ApiError = {
  ok: false;
  error: string;
  code?: string;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/* ===== 에러 코드 ===== */

export const ErrorCode = {
  // 400번대 - 클라이언트 에러
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_FIELD: "MISSING_FIELD",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",

  // 비즈니스 로직 에러
  SALON_NOT_FOUND: "SALON_NOT_FOUND",
  REVIEW_NOT_FOUND: "REVIEW_NOT_FOUND",
  INVALID_SALON_ID: "INVALID_SALON_ID",
  INVALID_REVIEW_ID: "INVALID_REVIEW_ID",

  // Google 관련
  GOOGLE_NOT_CONNECTED: "GOOGLE_NOT_CONNECTED",
  GOOGLE_TOKEN_ERROR: "GOOGLE_TOKEN_ERROR",
  GOOGLE_API_ERROR: "GOOGLE_API_ERROR",

  // 500번대 - 서버 에러
  DATABASE_ERROR: "DATABASE_ERROR",
  DB_ERROR: "DB_ERROR",  // 호환성용 alias
  EXTERNAL_API_ERROR: "EXTERNAL_API_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];
