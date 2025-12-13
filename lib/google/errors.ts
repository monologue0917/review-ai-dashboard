// lib/google/errors.ts
/**
 * ===================================================================
 * Google OAuth/API 에러 정의
 * ===================================================================
 * 
 * 7종 에러 케이스 + 추가 에러 타입
 */

/* ===== 에러 코드 ===== */

export const GoogleErrorCode = {
  // OAuth 에러 (1~4번)
  USER_CANCELLED: 'user_cancelled',        // 1. 동의 화면에서 취소
  INVALID_STATE: 'invalid_state',          // 2. state 불일치
  STATE_EXPIRED: 'state_expired',          // 2. state 만료
  TOKEN_EXPIRED: 'token_expired',          // 3. refresh token 만료
  TOKEN_REVOKED: 'token_revoked',          // 3. refresh token 회수됨
  INSUFFICIENT_SCOPE: 'insufficient_scope', // 4. 권한 부족
  
  // API 에러 (5~7번)
  LOCATION_NOT_FOUND: 'location_not_found', // 5. location 없음
  LOCATION_ACCESS_DENIED: 'location_access_denied', // 5. location 접근 거부
  RATE_LIMITED: 'rate_limited',            // 7. quota 초과
  API_UNAVAILABLE: 'api_unavailable',      // 7. 서버 장애
  
  // 기타
  CONFIG_ERROR: 'config_error',            // 환경변수 누락
  NETWORK_ERROR: 'network_error',          // 네트워크 오류
  UNKNOWN: 'unknown',                      // 알 수 없는 오류
} as const;

export type GoogleErrorCodeType = typeof GoogleErrorCode[keyof typeof GoogleErrorCode];

/* ===== 에러 클래스 ===== */

export class GoogleError extends Error {
  code: GoogleErrorCodeType;
  statusCode: number;
  retryable: boolean;
  details?: string;

  constructor(
    code: GoogleErrorCodeType,
    message: string,
    options?: {
      statusCode?: number;
      retryable?: boolean;
      details?: string;
    }
  ) {
    super(message);
    this.name = 'GoogleError';
    this.code = code;
    this.statusCode = options?.statusCode ?? 500;
    this.retryable = options?.retryable ?? false;
    this.details = options?.details;
  }
}

/* ===== 에러 메시지 (사용자용) ===== */

export const GoogleErrorMessages: Record<GoogleErrorCodeType, string> = {
  user_cancelled: 'You cancelled the Google connection. Click "Connect Google" to try again.',
  invalid_state: 'Security validation failed. Please try connecting again.',
  state_expired: 'The connection request expired. Please try again.',
  token_expired: 'Your Google connection has expired. Please reconnect your account.',
  token_revoked: 'Google access was revoked. Please reconnect your account.',
  insufficient_scope: 'Additional permissions are required. Please reconnect and grant all requested permissions.',
  location_not_found: 'The selected business location was not found. Please select a different location.',
  location_access_denied: 'You don\'t have permission to access this location. Please check your Google Business Profile permissions.',
  rate_limited: 'Too many requests. Please wait a moment and try again.',
  api_unavailable: 'Google services are temporarily unavailable. Please try again later.',
  config_error: 'Google integration is not configured. Please contact support.',
  network_error: 'Network error. Please check your connection and try again.',
  unknown: 'An unexpected error occurred. Please try again.',
};

/* ===== 에러 파싱 헬퍼 ===== */

/**
 * Google API 응답에서 에러 코드 추출
 */
export function parseGoogleApiError(response: Response, body?: any): GoogleError {
  const status = response.status;
  
  // 401: 토큰 만료 또는 회수
  if (status === 401) {
    const errorType = body?.error;
    if (errorType === 'invalid_token') {
      return new GoogleError(
        GoogleErrorCode.TOKEN_REVOKED,
        'Google access token was revoked',
        { statusCode: 401, retryable: false }
      );
    }
    return new GoogleError(
      GoogleErrorCode.TOKEN_EXPIRED,
      'Google access token expired',
      { statusCode: 401, retryable: true }
    );
  }
  
  // 403: 권한 없음
  if (status === 403) {
    const reason = body?.error?.errors?.[0]?.reason;
    if (reason === 'insufficientPermissions') {
      return new GoogleError(
        GoogleErrorCode.INSUFFICIENT_SCOPE,
        'Insufficient permissions to access this resource',
        { statusCode: 403, retryable: false }
      );
    }
    return new GoogleError(
      GoogleErrorCode.LOCATION_ACCESS_DENIED,
      'Access denied to this location',
      { statusCode: 403, retryable: false }
    );
  }
  
  // 404: 리소스 없음
  if (status === 404) {
    return new GoogleError(
      GoogleErrorCode.LOCATION_NOT_FOUND,
      'Location not found',
      { statusCode: 404, retryable: false }
    );
  }
  
  // 429: Rate limit
  if (status === 429) {
    return new GoogleError(
      GoogleErrorCode.RATE_LIMITED,
      'API rate limit exceeded',
      { statusCode: 429, retryable: true }
    );
  }
  
  // 5xx: 서버 에러
  if (status >= 500) {
    return new GoogleError(
      GoogleErrorCode.API_UNAVAILABLE,
      'Google API is temporarily unavailable',
      { statusCode: status, retryable: true }
    );
  }
  
  // 기타
  return new GoogleError(
    GoogleErrorCode.UNKNOWN,
    body?.error?.message || 'Unknown error',
    { statusCode: status, retryable: false, details: JSON.stringify(body) }
  );
}

/**
 * OAuth 에러 파라미터 파싱
 */
export function parseOAuthError(error: string): GoogleError {
  switch (error) {
    case 'access_denied':
      return new GoogleError(
        GoogleErrorCode.USER_CANCELLED,
        'User denied access',
        { statusCode: 400, retryable: false }
      );
    case 'invalid_scope':
      return new GoogleError(
        GoogleErrorCode.INSUFFICIENT_SCOPE,
        'Invalid or insufficient scope',
        { statusCode: 400, retryable: false }
      );
    default:
      return new GoogleError(
        GoogleErrorCode.UNKNOWN,
        `OAuth error: ${error}`,
        { statusCode: 400, retryable: false }
      );
  }
}
