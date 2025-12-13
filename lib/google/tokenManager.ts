// lib/google/tokenManager.ts
/**
 * ===================================================================
 * Google 토큰 관리자
 * ===================================================================
 * 
 * 주요 기능:
 * - 토큰 갱신 시 레이스 컨디션 방지
 * - 만료된 토큰 자동 갱신
 * - DB에 갱신된 토큰 저장
 */

import { createClient } from '@supabase/supabase-js';
import { refreshAccessToken, isTokenExpired } from './oauth';
import { GoogleError, GoogleErrorCode } from './errors';

/* ===== Supabase 클라이언트 ===== */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ===== 진행 중인 갱신 요청 캐시 (레이스 컨디션 방지) ===== */

const refreshPromises = new Map<string, Promise<string>>();

/* ===== 타입 ===== */

export interface GoogleAccount {
  id: string;
  user_id: string;
  google_user_id: string;
  email: string;
  access_token: string;
  refresh_token: string | null;
  expiry_at: string | null;
}

/* ===== 메인 함수 ===== */

/**
 * 유효한 Access Token 가져오기
 * 
 * - 토큰이 유효하면 그대로 반환
 * - 만료되었으면 자동 갱신 후 반환
 * - 동시 요청 시 하나의 갱신만 실행 (레이스 컨디션 방지)
 * 
 * @param googleAccountId - google_accounts.id
 * @throws GoogleError - 갱신 실패 시
 */
export async function getValidAccessToken(googleAccountId: string): Promise<string> {
  // 1) DB에서 계정 정보 조회
  const { data: account, error: fetchError } = await supabase
    .from('google_accounts')
    .select('*')
    .eq('id', googleAccountId)
    .single();

  if (fetchError || !account) {
    throw new GoogleError(
      GoogleErrorCode.TOKEN_REVOKED,
      'Google account not found',
      { statusCode: 404, retryable: false }
    );
  }

  // 2) 토큰이 아직 유효하면 그대로 반환
  if (!isTokenExpired(account.expiry_at)) {
    return account.access_token;
  }

  // 3) Refresh token 없으면 재연결 필요
  if (!account.refresh_token) {
    throw new GoogleError(
      GoogleErrorCode.TOKEN_REVOKED,
      'No refresh token available. Please reconnect your Google account.',
      { statusCode: 401, retryable: false }
    );
  }

  // 4) 이미 갱신 중이면 그 Promise를 기다림 (레이스 컨디션 방지)
  const existingPromise = refreshPromises.get(googleAccountId);
  if (existingPromise) {
    console.log(`[TokenManager] Waiting for existing refresh: ${googleAccountId}`);
    return existingPromise;
  }

  // 5) 새 갱신 시작
  console.log(`[TokenManager] Starting token refresh: ${googleAccountId}`);
  
  const refreshPromise = refreshAndSaveToken(account);
  refreshPromises.set(googleAccountId, refreshPromise);

  try {
    const newToken = await refreshPromise;
    return newToken;
  } finally {
    // 완료되면 캐시에서 제거
    refreshPromises.delete(googleAccountId);
  }
}

/**
 * 토큰 갱신 및 DB 저장
 */
async function refreshAndSaveToken(account: GoogleAccount): Promise<string> {
  try {
    // 1) Google API로 토큰 갱신
    const newTokens = await refreshAccessToken(account.refresh_token!);

    // 2) DB 업데이트
    const expiryAt = newTokens.expiry_date
      ? new Date(newTokens.expiry_date).toISOString()
      : null;

    const { error: updateError } = await supabase
      .from('google_accounts')
      .update({
        access_token: newTokens.access_token,
        expiry_at: expiryAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', account.id);

    if (updateError) {
      console.error('[TokenManager] Failed to save refreshed token:', updateError);
      // DB 저장 실패해도 새 토큰은 반환 (일시적 사용 가능)
    }

    console.log(`[TokenManager] Token refreshed successfully: ${account.id}`);
    return newTokens.access_token;
  } catch (err) {
    console.error('[TokenManager] Token refresh failed:', err);

    // Google에서 refresh token이 회수된 경우
    if (err instanceof Error && err.message.includes('invalid_grant')) {
      // DB에서 토큰 무효화 표시
      await supabase
        .from('google_accounts')
        .update({
          access_token: null,
          refresh_token: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', account.id);

      throw new GoogleError(
        GoogleErrorCode.TOKEN_REVOKED,
        'Google access was revoked. Please reconnect your account.',
        { statusCode: 401, retryable: false }
      );
    }

    throw new GoogleError(
      GoogleErrorCode.TOKEN_EXPIRED,
      'Failed to refresh token',
      { statusCode: 401, retryable: true }
    );
  }
}

/**
 * Salon에 연결된 Google 계정 조회
 */
export async function getGoogleAccountForSalon(salonId: string): Promise<GoogleAccount | null> {
  // salon_google_connections에서 연결된 google_account_id 조회
  const { data: connection } = await supabase
    .from('salon_google_connections')
    .select('google_account_id')
    .eq('salon_id', salonId)
    .eq('sync_enabled', true)
    .single();

  if (!connection) {
    return null;
  }

  // google_accounts에서 계정 정보 조회
  const { data: account } = await supabase
    .from('google_accounts')
    .select('*')
    .eq('id', connection.google_account_id)
    .single();

  return account || null;
}

/**
 * 토큰이 유효한지 빠르게 확인 (DB 조회만)
 */
export async function isGoogleAccountValid(googleAccountId: string): Promise<boolean> {
  const { data: account } = await supabase
    .from('google_accounts')
    .select('access_token, refresh_token, expiry_at')
    .eq('id', googleAccountId)
    .single();

  if (!account) return false;
  if (!account.access_token && !account.refresh_token) return false;
  
  return true;
}
