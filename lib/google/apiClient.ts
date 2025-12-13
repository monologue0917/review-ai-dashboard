// lib/google/apiClient.ts
/**
 * ===================================================================
 * Google API 클라이언트
 * ===================================================================
 * 
 * 주요 기능:
 * - 자동 토큰 갱신
 * - 재시도 (exponential backoff)
 * - 타임아웃 처리 (30초)
 * - 에러 파싱 및 분류
 * - Rate limit 처리
 */

import { getValidAccessToken } from './tokenManager';
import { GoogleError, GoogleErrorCode, parseGoogleApiError } from './errors';
import { serverFetch, ServerFetchTimeoutError } from '@/lib/utils/serverFetch';

/* ===== 설정 ===== */

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000; // 1초
const API_TIMEOUT_MS = 30000; // 30초

/* ===== 타입 ===== */

interface ApiCallOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  retryCount?: number;
}

type ApiResult<T> = {
  ok: true;
  data: T;
} | {
  ok: false;
  error: GoogleError;
};

/* ===== 메인 함수 ===== */

/**
 * Google API 호출 (자동 토큰 갱신 + 재시도 포함)
 * 
 * @param googleAccountId - google_accounts.id
 * @param url - API 엔드포인트 URL
 * @param options - 요청 옵션
 */
export async function callGoogleApi<T = any>(
  googleAccountId: string,
  url: string,
  options: ApiCallOptions = {}
): Promise<ApiResult<T>> {
  const { method = 'GET', body, headers = {}, retryCount = 0 } = options;

  try {
    // 1) 유효한 토큰 가져오기 (자동 갱신)
    const accessToken = await getValidAccessToken(googleAccountId);

    // 2) API 호출 (30초 타임아웃)
    const response = await serverFetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      timeout: API_TIMEOUT_MS,
    });

    // 3) 성공
    if (response.ok) {
      const data = await response.json();
      return { ok: true, data };
    }

    // 4) 에러 파싱
    let errorBody;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = null;
    }

    const error = parseGoogleApiError(response, errorBody);

    // 5) 재시도 가능한 에러인지 확인
    if (error.retryable && retryCount < MAX_RETRIES) {
      const delay = BASE_DELAY_MS * Math.pow(2, retryCount);
      console.log(`[GoogleAPI] Retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      
      await sleep(delay);
      
      return callGoogleApi<T>(googleAccountId, url, {
        ...options,
        retryCount: retryCount + 1,
      });
    }

    // 6) 토큰 만료 시 한 번 더 시도 (갱신 후)
    if (error.code === GoogleErrorCode.TOKEN_EXPIRED && retryCount === 0) {
      console.log('[GoogleAPI] Token expired, refreshing and retrying...');
      
      return callGoogleApi<T>(googleAccountId, url, {
        ...options,
        retryCount: 1,
      });
    }

    return { ok: false, error };
  } catch (err) {
    // 타임아웃 에러 처리
    if (err instanceof ServerFetchTimeoutError) {
      const error = new GoogleError(
        GoogleErrorCode.NETWORK_ERROR,
        'Request timed out. Google API is not responding.',
        { statusCode: 0, retryable: true }
      );

      // 타임아웃도 재시도
      if (retryCount < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, retryCount);
        console.log(`[GoogleAPI] Timeout, retrying in ${delay}ms`);
        
        await sleep(delay);
        
        return callGoogleApi<T>(googleAccountId, url, {
          ...options,
          retryCount: retryCount + 1,
        });
      }

      return { ok: false, error };
    }

    // 기타 네트워크 에러 등
    if (err instanceof GoogleError) {
      return { ok: false, error: err };
    }

    const error = new GoogleError(
      GoogleErrorCode.NETWORK_ERROR,
      err instanceof Error ? err.message : 'Network error',
      { statusCode: 0, retryable: true }
    );

    // 네트워크 에러도 재시도
    if (retryCount < MAX_RETRIES) {
      const delay = BASE_DELAY_MS * Math.pow(2, retryCount);
      console.log(`[GoogleAPI] Network error, retrying in ${delay}ms`);
      
      await sleep(delay);
      
      return callGoogleApi<T>(googleAccountId, url, {
        ...options,
        retryCount: retryCount + 1,
      });
    }

    return { ok: false, error };
  }
}

/**
 * Google Business Profile Accounts 목록 조회
 */
export async function listGBPAccounts(googleAccountId: string) {
  return callGoogleApi<{ accounts: any[] }>(
    googleAccountId,
    'https://mybusinessaccountmanagement.googleapis.com/v1/accounts'
  );
}

/**
 * Google Business Profile Locations 목록 조회
 */
export async function listGBPLocations(googleAccountId: string, accountName: string) {
  return callGoogleApi<{ locations: any[] }>(
    googleAccountId,
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,storefrontAddress`
  );
}

/**
 * 특정 Location의 리뷰 목록 조회
 */
export async function listLocationReviews(
  googleAccountId: string, 
  locationName: string,
  pageSize = 50,
  pageToken?: string
) {
  let url = `https://mybusiness.googleapis.com/v4/${locationName}/reviews?pageSize=${pageSize}`;
  if (pageToken) {
    url += `&pageToken=${pageToken}`;
  }

  return callGoogleApi<{ reviews: any[]; nextPageToken?: string; totalReviewCount?: number }>(
    googleAccountId,
    url
  );
}

/**
 * 리뷰에 답글 게시
 */
export async function postReviewReply(
  googleAccountId: string,
  reviewName: string, // e.g., accounts/123/locations/456/reviews/789
  comment: string
) {
  return callGoogleApi<{ comment: string; updateTime: string }>(
    googleAccountId,
    `https://mybusiness.googleapis.com/v4/${reviewName}/reply`,
    {
      method: 'PUT',
      body: { comment },
    }
  );
}

/* ===== 유틸리티 ===== */

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
