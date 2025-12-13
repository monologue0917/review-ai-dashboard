// lib/rateLimit/loginRateLimit.ts
/**
 * ===================================================================
 * 로그인 Rate Limit
 * ===================================================================
 * 
 * 브루트포스 공격 방지:
 * - IP당 분당 10회 시도 제한
 * - 5회 연속 실패 시 5분 대기
 * 
 * 메모리 기반 (서버리스 환경에서는 인스턴스별로 동작)
 * 프로덕션에서는 Redis(Upstash) 사용 권장
 */

/* ===== 설정 상수 ===== */

export const LOGIN_RATE_LIMIT = {
  /** IP당 분당 최대 시도 횟수 */
  MAX_ATTEMPTS_PER_MINUTE: 10,
  
  /** 연속 실패 시 잠금까지의 횟수 */
  MAX_CONSECUTIVE_FAILURES: 5,
  
  /** 잠금 시간 (밀리초) - 5분 */
  LOCKOUT_DURATION_MS: 5 * 60 * 1000,
  
  /** 시도 기록 유지 시간 (밀리초) - 1분 */
  ATTEMPT_WINDOW_MS: 60 * 1000,
} as const;

/* ===== 타입 ===== */

type AttemptRecord = {
  /** 최근 시도 타임스탬프 배열 */
  attempts: number[];
  /** 연속 실패 횟수 */
  consecutiveFailures: number;
  /** 잠금 해제 시간 (null이면 잠금 아님) */
  lockoutUntil: number | null;
};

type RateLimitResult = {
  allowed: boolean;
  reason?: 'too_many_attempts' | 'locked_out';
  retryAfter?: number; // 초 단위
  remainingAttempts?: number;
};

/* ===== 메모리 저장소 ===== */

// IP별 시도 기록
const attemptStore = new Map<string, AttemptRecord>();

// 주기적으로 오래된 기록 정리 (메모리 누수 방지)
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10분
let lastCleanup = Date.now();

function cleanupOldRecords() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  
  lastCleanup = now;
  const cutoff = now - LOGIN_RATE_LIMIT.LOCKOUT_DURATION_MS;
  
  for (const [ip, record] of attemptStore.entries()) {
    // 잠금 해제됐고, 최근 시도도 없으면 삭제
    const isUnlocked = !record.lockoutUntil || record.lockoutUntil < now;
    const hasRecentAttempts = record.attempts.some(t => t > cutoff);
    
    if (isUnlocked && !hasRecentAttempts) {
      attemptStore.delete(ip);
    }
  }
}

/* ===== IP 추출 ===== */

/**
 * 요청에서 클라이언트 IP 추출
 * Vercel/Cloudflare 환경 고려
 */
export function getClientIP(req: Request): string {
  const headers = req.headers;
  
  // Vercel
  const xForwardedFor = headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  
  // Cloudflare
  const cfConnectingIP = headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  // X-Real-IP
  const xRealIP = headers.get('x-real-ip');
  if (xRealIP) {
    return xRealIP;
  }
  
  // 기본값
  return 'unknown';
}

/* ===== Rate Limit 체크 ===== */

/**
 * 로그인 시도 전 Rate Limit 체크
 */
export function checkLoginRateLimit(ip: string): RateLimitResult {
  cleanupOldRecords();
  
  const now = Date.now();
  const record = attemptStore.get(ip);
  
  // 기록 없으면 허용
  if (!record) {
    return { allowed: true, remainingAttempts: LOGIN_RATE_LIMIT.MAX_ATTEMPTS_PER_MINUTE };
  }
  
  // 1) 잠금 상태 체크
  if (record.lockoutUntil && record.lockoutUntil > now) {
    const retryAfter = Math.ceil((record.lockoutUntil - now) / 1000);
    return {
      allowed: false,
      reason: 'locked_out',
      retryAfter,
    };
  }
  
  // 잠금 해제됐으면 리셋
  if (record.lockoutUntil && record.lockoutUntil <= now) {
    record.lockoutUntil = null;
    record.consecutiveFailures = 0;
  }
  
  // 2) 분당 시도 횟수 체크
  const windowStart = now - LOGIN_RATE_LIMIT.ATTEMPT_WINDOW_MS;
  const recentAttempts = record.attempts.filter(t => t > windowStart);
  
  if (recentAttempts.length >= LOGIN_RATE_LIMIT.MAX_ATTEMPTS_PER_MINUTE) {
    const oldestAttempt = Math.min(...recentAttempts);
    const retryAfter = Math.ceil((oldestAttempt + LOGIN_RATE_LIMIT.ATTEMPT_WINDOW_MS - now) / 1000);
    
    return {
      allowed: false,
      reason: 'too_many_attempts',
      retryAfter: Math.max(1, retryAfter),
    };
  }
  
  return {
    allowed: true,
    remainingAttempts: LOGIN_RATE_LIMIT.MAX_ATTEMPTS_PER_MINUTE - recentAttempts.length,
  };
}

/**
 * 로그인 시도 기록
 */
export function recordLoginAttempt(ip: string, success: boolean): void {
  const now = Date.now();
  
  let record = attemptStore.get(ip);
  
  if (!record) {
    record = {
      attempts: [],
      consecutiveFailures: 0,
      lockoutUntil: null,
    };
    attemptStore.set(ip, record);
  }
  
  // 시도 기록 추가
  record.attempts.push(now);
  
  // 오래된 시도 제거 (메모리 절약)
  const windowStart = now - LOGIN_RATE_LIMIT.ATTEMPT_WINDOW_MS;
  record.attempts = record.attempts.filter(t => t > windowStart);
  
  if (success) {
    // 성공하면 연속 실패 리셋
    record.consecutiveFailures = 0;
  } else {
    // 실패하면 연속 실패 증가
    record.consecutiveFailures += 1;
    
    // 연속 실패 한도 초과 시 잠금
    if (record.consecutiveFailures >= LOGIN_RATE_LIMIT.MAX_CONSECUTIVE_FAILURES) {
      record.lockoutUntil = now + LOGIN_RATE_LIMIT.LOCKOUT_DURATION_MS;
      console.log(`[loginRateLimit] IP locked out: ${ip}, until: ${new Date(record.lockoutUntil).toISOString()}`);
    }
  }
}

/* ===== 에러 메시지 ===== */

export function getRateLimitErrorMessage(result: RateLimitResult): string {
  if (result.reason === 'locked_out') {
    const minutes = Math.ceil((result.retryAfter || 0) / 60);
    return `Too many failed attempts. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`;
  }
  
  if (result.reason === 'too_many_attempts') {
    return `Too many login attempts. Please wait ${result.retryAfter} seconds before trying again.`;
  }
  
  return 'Rate limit exceeded';
}

/* ===== 테스트/관리용 ===== */

/**
 * 특정 IP의 Rate Limit 리셋 (관리자용)
 */
export function resetRateLimit(ip: string): void {
  attemptStore.delete(ip);
}

/**
 * 현재 Rate Limit 상태 조회 (디버깅용)
 */
export function getRateLimitStatus(ip: string): AttemptRecord | null {
  return attemptStore.get(ip) || null;
}
