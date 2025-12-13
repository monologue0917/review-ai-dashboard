// lib/google/postReplyToGBP.ts
/**
 * ===================================================================
 * Google Business Profile - 리뷰 답글 게시 함수
 * ===================================================================
 * 
 * Google Business Profile API를 통해 리뷰에 답글을 게시합니다.
 * 
 * 개선사항:
 * - 자동 토큰 갱신 (tokenManager 사용)
 * - 에러 분류 및 재시도 (apiClient 사용)
 * - 7종 에러 케이스 처리
 */

import { postReviewReply } from './apiClient';
import { GoogleError, GoogleErrorCode, GoogleErrorCodeType, GoogleErrorMessages } from './errors';

/* ===== 타입 정의 ===== */

export type PostReplyParams = {
  googleAccountId: string;  // google_accounts.id
  locationName: string;     // accounts/{accountId}/locations/{locationId}
  reviewName: string;       // Google review resource name 또는 review ID
  replyText: string;
};

export type PostReplyResult = {
  success: boolean;
  replyId?: string;
  error?: string;
  errorCode?: string;
  retryable?: boolean;
};

/* ===== 레거시 호환 타입 ===== */

export type LegacyPostReplyParams = {
  accessToken: string;
  refreshToken: string;
  locationName: string;
  reviewName: string;
  replyText: string;
};

/* ===== 메인 함수 (신규) ===== */

/**
 * Google Business Profile에 리뷰 답글 게시 (권장)
 * 
 * - 자동 토큰 갱신
 * - 자동 재시도
 * - 상세 에러 정보
 */
export async function postReplyToGoogleV2(params: PostReplyParams): Promise<PostReplyResult> {
  const { googleAccountId, locationName, reviewName, replyText } = params;

  // 개발 환경 Mock 모드
  if (process.env.NODE_ENV === 'development' && process.env.MOCK_GOOGLE_POST === 'true') {
    console.log('[postReplyToGoogleV2] Mock mode - simulating success');
    await new Promise(resolve => setTimeout(resolve, 500)); // 지연 시뮬레이션
    return {
      success: true,
      replyId: `mock_reply_${Date.now()}`,
    };
  }

  try {
    // Review resource name 구성
    const reviewResourceName = buildReviewResourceName(locationName, reviewName);
    console.log('[postReplyToGoogleV2] Posting reply to:', reviewResourceName);

    // API 호출 (자동 토큰 갱신 + 재시도 포함)
    const result = await postReviewReply(googleAccountId, reviewResourceName, replyText);

    if (!result.ok) {
      const error = result.error;
      return {
        success: false,
        error: GoogleErrorMessages[error.code] || error.message,
        errorCode: error.code,
        retryable: error.retryable,
      };
    }

    console.log('[postReplyToGoogleV2] Success');
    return {
      success: true,
      replyId: result.data.updateTime, // Google은 별도 replyId를 안 줌
    };
  } catch (error) {
    console.error('[postReplyToGoogleV2] Unexpected error:', error);
    
    if (error instanceof GoogleError) {
      return {
        success: false,
        error: GoogleErrorMessages[error.code] || error.message,
        errorCode: error.code,
        retryable: error.retryable,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      errorCode: GoogleErrorCode.UNKNOWN,
      retryable: false,
    };
  }
}

/* ===== 레거시 함수 (하위 호환) ===== */

/**
 * Google Business Profile에 리뷰 답글 게시 (레거시)
 * 
 * @deprecated postReplyToGoogleV2 사용 권장
 */
export async function postReplyToGoogle(params: LegacyPostReplyParams): Promise<PostReplyResult> {
  const { accessToken, refreshToken, locationName, reviewName, replyText } = params;

  // 개발 환경 Mock 모드
  if (process.env.NODE_ENV === 'development' && process.env.MOCK_GOOGLE_POST === 'true') {
    console.log('[postReplyToGoogle] Mock mode - simulating success');
    return {
      success: true,
      replyId: `mock_reply_${Date.now()}`,
    };
  }

  try {
    // Review resource name 구성
    const reviewResourceName = buildReviewResourceName(locationName, reviewName);
    console.log('[postReplyToGoogle] Posting reply to:', reviewResourceName);

    // Google API 호출
    const apiUrl = `https://mybusiness.googleapis.com/v4/${reviewResourceName}/reply`;
    
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ comment: replyText }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[postReplyToGoogle] API error:', response.status, errorText);
      
      // 에러 분류
      let errorCode: GoogleErrorCodeType = GoogleErrorCode.UNKNOWN;
      let errorMessage = `Google API error: ${response.status}`;
      let retryable = false;

      if (response.status === 401) {
        errorCode = GoogleErrorCode.TOKEN_EXPIRED;
        errorMessage = 'Token expired. Please reconnect your Google account.';
        retryable = true;
      } else if (response.status === 403) {
        errorCode = GoogleErrorCode.LOCATION_ACCESS_DENIED;
        errorMessage = 'Access denied. Check your permissions.';
      } else if (response.status === 404) {
        errorCode = GoogleErrorCode.LOCATION_NOT_FOUND;
        errorMessage = 'Review or location not found.';
      } else if (response.status === 429) {
        errorCode = GoogleErrorCode.RATE_LIMITED;
        errorMessage = 'Too many requests. Please wait and try again.';
        retryable = true;
      } else if (response.status >= 500) {
        errorCode = GoogleErrorCode.API_UNAVAILABLE;
        errorMessage = 'Google service temporarily unavailable.';
        retryable = true;
      }

      return {
        success: false,
        error: errorMessage,
        errorCode,
        retryable,
      };
    }

    const result = await response.json();
    console.log('[postReplyToGoogle] Success:', result);

    return {
      success: true,
      replyId: result.name || result.reviewReplyId,
    };
  } catch (error) {
    console.error('[postReplyToGoogle] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      errorCode: GoogleErrorCode.NETWORK_ERROR,
      retryable: true,
    };
  }
}

/* ===== 헬퍼 함수 ===== */

/**
 * Review resource name 구성
 */
function buildReviewResourceName(locationName: string, reviewName: string): string {
  if (reviewName.startsWith('accounts/')) {
    return reviewName;
  }
  return `${locationName}/reviews/${reviewName}`;
}

/**
 * 답글 삭제
 */
export async function deleteReplyFromGoogle(params: {
  accessToken: string;
  reviewResourceName: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const apiUrl = `https://mybusiness.googleapis.com/v4/${params.reviewResourceName}/reply`;
    
    const response = await fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${params.accessToken}`,
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to delete reply: ${response.status}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
