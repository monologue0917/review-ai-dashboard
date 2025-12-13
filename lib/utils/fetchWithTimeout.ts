// lib/utils/fetchWithTimeout.ts
/**
 * ===================================================================
 * 타임아웃 + 재시도 지원 Fetch 유틸리티
 * ===================================================================
 * 
 * 네트워크 요청에 타임아웃과 자동 재시도를 추가합니다.
 * 
 * 사용법:
 * ```ts
 * const res = await fetchWithTimeout('/api/data', {
 *   timeout: 10000, // 10초
 *   retries: 2,     // 최대 2번 재시도
 * });
 * ```
 */

/* ===== 타입 정의 ===== */

export type FetchWithTimeoutOptions = RequestInit & {
  /** 타임아웃 (ms), 기본 30초 */
  timeout?: number;
  /** 재시도 횟수, 기본 0 (재시도 안 함) */
  retries?: number;
  /** 재시도 간 딜레이 (ms), 기본 1초 */
  retryDelay?: number;
  /** 재시도할 HTTP 상태 코드, 기본 [408, 429, 500, 502, 503, 504] */
  retryStatusCodes?: number[];
};

export class FetchTimeoutError extends Error {
  constructor(message: string = 'Request timed out') {
    super(message);
    this.name = 'FetchTimeoutError';
  }
}

export class FetchRetryError extends Error {
  public attempts: number;
  public lastError: Error;

  constructor(message: string, attempts: number, lastError: Error) {
    super(message);
    this.name = 'FetchRetryError';
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

/* ===== 기본값 ===== */

const DEFAULT_TIMEOUT = 30000; // 30초
const DEFAULT_RETRIES = 0;
const DEFAULT_RETRY_DELAY = 1000; // 1초
const DEFAULT_RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504];

/* ===== 헬퍼 함수 ===== */

/**
 * 지정된 시간만큼 대기
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 지수 백오프 계산 (재시도마다 대기 시간 증가)
 */
function getBackoffDelay(attempt: number, baseDelay: number): number {
  // 지수 백오프 + 약간의 랜덤 지터
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 200; // 0~200ms 랜덤
  return Math.min(exponentialDelay + jitter, 30000); // 최대 30초
}

/* ===== 메인 함수 ===== */

/**
 * 타임아웃과 재시도를 지원하는 fetch 함수
 */
export async function fetchWithTimeout(
  url: string | URL,
  options: FetchWithTimeoutOptions = {}
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
    try {
      // AbortController로 타임아웃 구현
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // 재시도 가능한 상태 코드 체크
        if (retryStatusCodes.includes(response.status) && attempt < retries) {
          console.warn(`[fetchWithTimeout] Retryable status ${response.status}, attempt ${attempt + 1}/${retries + 1}`);
          lastError = new Error(`HTTP ${response.status}`);
          attempt++;
          await sleep(getBackoffDelay(attempt, retryDelay));
          continue;
        }

        return response;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      // AbortError = 타임아웃
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = new FetchTimeoutError(`Request timed out after ${timeout}ms`);
      } else {
        lastError = error instanceof Error ? error : new Error(String(error));
      }

      // 네트워크 에러는 재시도
      if (attempt < retries) {
        console.warn(`[fetchWithTimeout] Error, retrying (${attempt + 1}/${retries + 1}):`, lastError.message);
        attempt++;
        await sleep(getBackoffDelay(attempt, retryDelay));
        continue;
      }

      break;
    }
  }

  // 모든 재시도 실패
  if (retries > 0) {
    throw new FetchRetryError(
      `Failed after ${attempt + 1} attempts: ${lastError.message}`,
      attempt + 1,
      lastError
    );
  }

  throw lastError;
}

/* ===== 프리셋 함수들 ===== */

/**
 * 빠른 API 호출용 (짧은 타임아웃)
 * 설정 저장, 상태 업데이트 등
 */
export function fetchFast(
  url: string | URL,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  return fetchWithTimeout(url, {
    timeout: 10000, // 10초
    retries: 1,
    retryDelay: 500,
    ...options,
  });
}

/**
 * AI 생성 API 호출용 (긴 타임아웃)
 * OpenAI 호출 등 시간이 오래 걸릴 수 있는 작업
 */
export function fetchAI(
  url: string | URL,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  return fetchWithTimeout(url, {
    timeout: 60000, // 60초
    retries: 1,
    retryDelay: 2000,
    ...options,
  });
}

/**
 * 외부 API 호출용 (재시도 있음)
 * Google API 등 외부 서비스
 */
export function fetchExternal(
  url: string | URL,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  return fetchWithTimeout(url, {
    timeout: 30000, // 30초
    retries: 2,
    retryDelay: 1000,
    ...options,
  });
}
