// lib/utils/serverFetch.ts
/**
 * ===================================================================
 * 서버 사이드 Fetch 유틸리티 (타임아웃 + 재시도)
 * ===================================================================
 * 
 * API Routes에서 외부 API 호출 시 사용
 * - OpenAI API
 * - Google API
 * - 기타 외부 서비스
 */

/* ===== 타입 정의 ===== */

export type ServerFetchOptions = RequestInit & {
  /** 타임아웃 (ms), 기본 30초 */
  timeout?: number;
  /** 재시도 횟수, 기본 0 */
  retries?: number;
  /** 재시도 간 딜레이 (ms), 기본 1초 */
  retryDelay?: number;
  /** 재시도할 HTTP 상태 코드 */
  retryStatusCodes?: number[];
};

export class ServerFetchTimeoutError extends Error {
  constructor(message: string = 'Request timed out') {
    super(message);
    this.name = 'ServerFetchTimeoutError';
  }
}

/* ===== 기본값 ===== */

const DEFAULT_TIMEOUT = 30000; // 30초
const DEFAULT_RETRIES = 0;
const DEFAULT_RETRY_DELAY = 1000;
const DEFAULT_RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504];

/* ===== 헬퍼 함수 ===== */

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getBackoffDelay(attempt: number, baseDelay: number): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 200;
  return Math.min(exponentialDelay + jitter, 30000);
}

/* ===== 메인 함수 ===== */

/**
 * 서버 사이드 fetch with timeout
 */
export async function serverFetch(
  url: string | URL,
  options: ServerFetchOptions = {}
): Promise<Response> {
  const {
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    retryStatusCodes = DEFAULT_RETRY_STATUS_CODES,
    ...fetchOptions
  } = options;

  let lastError: Error = new Error('Unknown error');
  let attempt = 0;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 재시도 가능한 상태 코드
      if (retryStatusCodes.includes(response.status) && attempt < retries) {
        console.warn(`[serverFetch] Retryable status ${response.status}, attempt ${attempt + 1}/${retries + 1}`);
        lastError = new Error(`HTTP ${response.status}`);
        attempt++;
        await sleep(getBackoffDelay(attempt, retryDelay));
        continue;
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      // AbortError = 타임아웃
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = new ServerFetchTimeoutError(`Request timed out after ${timeout}ms`);
      } else {
        lastError = error instanceof Error ? error : new Error(String(error));
      }

      // 네트워크 에러는 재시도
      if (attempt < retries) {
        console.warn(`[serverFetch] Error, retrying (${attempt + 1}/${retries + 1}):`, lastError.message);
        attempt++;
        await sleep(getBackoffDelay(attempt, retryDelay));
        continue;
      }

      break;
    }
  }

  throw lastError;
}

/* ===== 프리셋 함수들 ===== */

/**
 * OpenAI API 호출용 (45초 타임아웃)
 */
export function fetchOpenAI(
  url: string,
  options: ServerFetchOptions = {}
): Promise<Response> {
  return serverFetch(url, {
    timeout: 45000, // 45초 (OpenAI는 가끔 느림)
    retries: 1,
    retryDelay: 2000,
    retryStatusCodes: [429, 500, 502, 503, 504], // Rate limit + 서버 에러
    ...options,
  });
}

/**
 * Google API 호출용 (30초 타임아웃, 재시도 2회)
 */
export function fetchGoogle(
  url: string,
  options: ServerFetchOptions = {}
): Promise<Response> {
  return serverFetch(url, {
    timeout: 30000,
    retries: 2,
    retryDelay: 1000,
    retryStatusCodes: [429, 500, 502, 503, 504],
    ...options,
  });
}

/**
 * 일반 외부 API 호출용
 */
export function fetchExternal(
  url: string,
  options: ServerFetchOptions = {}
): Promise<Response> {
  return serverFetch(url, {
    timeout: 30000,
    retries: 1,
    retryDelay: 1000,
    ...options,
  });
}
