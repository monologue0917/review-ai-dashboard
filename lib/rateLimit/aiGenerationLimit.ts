// lib/rateLimit/aiGenerationLimit.ts
/**
 * ===================================================================
 * AI 답글 생성 Rate Limit
 * ===================================================================
 * 
 * 제한:
 * 1. 리뷰당 최대 생성 횟수: 5회
 * 2. 살롱당 일일 생성 횟수: 100회
 * 
 * 비용 보호 + 남용 방지
 */

import { SupabaseClient } from '@supabase/supabase-js';

/* ===== 제한 상수 ===== */

export const AI_GENERATION_LIMITS = {
  /** 리뷰 하나당 최대 생성 횟수 */
  MAX_PER_REVIEW: 5,
  
  /** 살롱당 하루 최대 생성 횟수 */
  MAX_PER_SALON_DAILY: 100,
} as const;

/* ===== 타입 ===== */

export type RateLimitResult = {
  allowed: boolean;
  reason?: 'review_limit' | 'daily_limit';
  current?: number;
  limit?: number;
  resetAt?: string;
};

/* ===== 리뷰당 제한 체크 ===== */

/**
 * 특정 리뷰의 AI 생성 횟수 체크
 * 
 * review_replies 테이블의 레코드 수가 아니라,
 * 실제로 몇 번 "생성"했는지 카운트해야 함.
 * 
 * 현재 구조: 1 review = 1 reply (upsert)
 * → generation_count 컬럼으로 추적하거나
 * → reply 생성 시마다 별도 로그 테이블에 기록
 * 
 * 간단한 방법: review_replies에 generation_count 컬럼 추가
 * 또는 reply가 없으면 0, 있으면 해당 컬럼 값 읽기
 */
export async function getReviewGenerationCount(
  supabase: SupabaseClient,
  reviewId: number
): Promise<number> {
  // review_replies에서 generation_count 조회
  const { data, error } = await supabase
    .from('review_replies')
    .select('generation_count')
    .eq('review_id', reviewId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    // 레코드 없으면 0
    if (error.code === 'PGRST116') {
      return 0;
    }
    console.error('[getReviewGenerationCount] Error:', error);
    return 0;
  }

  return data?.generation_count ?? 0;
}

/**
 * 리뷰당 생성 제한 체크
 */
export async function checkReviewLimit(
  supabase: SupabaseClient,
  reviewId: number
): Promise<RateLimitResult> {
  const current = await getReviewGenerationCount(supabase, reviewId);
  const limit = AI_GENERATION_LIMITS.MAX_PER_REVIEW;

  if (current >= limit) {
    return {
      allowed: false,
      reason: 'review_limit',
      current,
      limit,
    };
  }

  return { allowed: true, current, limit };
}

/* ===== 살롱 일일 제한 체크 ===== */

/**
 * 살롱의 일일 AI 생성 횟수 체크 및 리셋
 * 
 * - 날짜가 바뀌면 자동으로 카운트 리셋
 * - 현재 카운트 반환
 */
export async function getSalonDailyCount(
  supabase: SupabaseClient,
  salonId: string
): Promise<{ count: number; resetAt: string }> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // 살롱 정보 조회
  const { data: salon, error } = await supabase
    .from('salons')
    .select('daily_ai_generation_count, daily_ai_generation_reset_at')
    .eq('id', salonId)
    .single();

  if (error || !salon) {
    console.error('[getSalonDailyCount] Error:', error);
    return { count: 0, resetAt: today };
  }

  const resetAt = salon.daily_ai_generation_reset_at;

  // 날짜가 다르면 리셋
  if (resetAt !== today) {
    await supabase
      .from('salons')
      .update({
        daily_ai_generation_count: 0,
        daily_ai_generation_reset_at: today,
      })
      .eq('id', salonId);

    return { count: 0, resetAt: today };
  }

  return {
    count: salon.daily_ai_generation_count ?? 0,
    resetAt,
  };
}

/**
 * 살롱 일일 제한 체크
 */
export async function checkSalonDailyLimit(
  supabase: SupabaseClient,
  salonId: string
): Promise<RateLimitResult> {
  const { count: current, resetAt } = await getSalonDailyCount(supabase, salonId);
  const limit = AI_GENERATION_LIMITS.MAX_PER_SALON_DAILY;

  if (current >= limit) {
    // 다음 날 자정 계산
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    return {
      allowed: false,
      reason: 'daily_limit',
      current,
      limit,
      resetAt: tomorrow.toISOString(),
    };
  }

  return { allowed: true, current, limit };
}

/**
 * 살롱 일일 카운트 증가
 */
export async function incrementSalonDailyCount(
  supabase: SupabaseClient,
  salonId: string
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  // 먼저 오늘 날짜로 리셋되었는지 확인
  const { data: salon } = await supabase
    .from('salons')
    .select('daily_ai_generation_count, daily_ai_generation_reset_at')
    .eq('id', salonId)
    .single();

  if (!salon) return;

  if (salon.daily_ai_generation_reset_at !== today) {
    // 날짜 다르면 1로 설정
    await supabase
      .from('salons')
      .update({
        daily_ai_generation_count: 1,
        daily_ai_generation_reset_at: today,
      })
      .eq('id', salonId);
  } else {
    // 같은 날이면 증가
    await supabase
      .from('salons')
      .update({
        daily_ai_generation_count: (salon.daily_ai_generation_count ?? 0) + 1,
      })
      .eq('id', salonId);
  }
}

/* ===== 통합 체크 함수 ===== */

/**
 * AI 생성 Rate Limit 통합 체크
 * 
 * 리뷰당 제한 + 살롱 일일 제한 모두 체크
 */
export async function checkAIGenerationLimit(
  supabase: SupabaseClient,
  salonId: string,
  reviewId: number
): Promise<RateLimitResult> {
  // 1) 리뷰당 제한 체크
  const reviewLimit = await checkReviewLimit(supabase, reviewId);
  if (!reviewLimit.allowed) {
    return reviewLimit;
  }

  // 2) 살롱 일일 제한 체크
  const dailyLimit = await checkSalonDailyLimit(supabase, salonId);
  if (!dailyLimit.allowed) {
    return dailyLimit;
  }

  return { allowed: true };
}

/* ===== 에러 메시지 ===== */

export function getRateLimitErrorMessage(result: RateLimitResult): string {
  if (result.reason === 'review_limit') {
    return `This review has reached the maximum of ${result.limit} AI generations. Please edit the existing reply instead.`;
  }
  
  if (result.reason === 'daily_limit') {
    return `Daily AI generation limit (${result.limit}) reached. Limit resets at midnight.`;
  }

  return 'Rate limit exceeded';
}
