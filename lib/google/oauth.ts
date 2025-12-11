// lib/google/oauth.ts
/**
 * Google OAuth 2.0 헬퍼 함수들
 * 
 * 주요 기능:
 * - OAuth URL 생성
 * - Authorization code → 토큰 교환
 * - 토큰 갱신
 * - 유저 정보 조회
 * 
 * ⚠️ 이 모듈은 Google 환경변수가 없어도 앱이 깨지지 않도록 설계됨
 *    - 함수 호출 시점에 환경변수 체크
 *    - 환경변수 없으면 명확한 에러 메시지 반환
 */

import type { GoogleTokens, GoogleUserInfo } from './types';

/* ===== 환경변수 (Lazy Loading) ===== */

// 최상단에서 throw하지 않고, 함수 호출 시점에 체크
function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  return { clientId, clientSecret, redirectUri };
}

// Google Business Profile 관리 scope
const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/business.manage',
].join(' ');

/* ===== 환경변수 검증 ===== */

export function validateGoogleEnvVars(): { valid: boolean; missing: string[] } {
  const { clientId, clientSecret, redirectUri } = getGoogleConfig();
  const missing: string[] = [];
  
  if (!clientId) missing.push('GOOGLE_CLIENT_ID');
  if (!clientSecret) missing.push('GOOGLE_CLIENT_SECRET');
  if (!redirectUri) missing.push('GOOGLE_REDIRECT_URI');

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Google OAuth가 설정되었는지 확인 (UI에서 버튼 표시 여부 결정용)
 */
export function isGoogleOAuthConfigured(): boolean {
  const { clientId } = getGoogleConfig();
  return !!clientId;
}

/* ===== OAuth URL 생성 ===== */

/**
 * Google OAuth 인증 URL 생성
 * @param state - CSRF 방지용 state 값 (userId + salonId 등을 인코딩)
 * @throws 환경변수가 없으면 에러
 */
export function buildGoogleAuthUrl(state: string): string {
  const { clientId, redirectUri } = getGoogleConfig();

  if (!clientId || !redirectUri) {
    throw new Error('Google OAuth not configured. Missing GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',       // refresh_token 받기 위해 필수
    prompt: 'consent',            // 매번 동의 화면 표시 (refresh_token 보장)
    state: state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/* ===== 토큰 교환 ===== */

/**
 * Authorization code를 access_token으로 교환
 * @throws 환경변수가 없으면 에러
 */
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const { clientId, clientSecret, redirectUri } = getGoogleConfig();

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth not configured. Missing environment variables.');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code: code,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[exchangeCodeForTokens] Error:', errorText);
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  const data = await response.json();
  
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    scope: data.scope,
    token_type: data.token_type,
    expiry_date: data.expires_in 
      ? Date.now() + (data.expires_in * 1000) 
      : undefined,
  };
}

/* ===== 토큰 갱신 ===== */

/**
 * Refresh token으로 새 access_token 발급
 * @throws 환경변수가 없으면 에러
 */
export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const { clientId, clientSecret } = getGoogleConfig();

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth not configured. Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[refreshAccessToken] Error:', errorText);
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  const data = await response.json();

  return {
    access_token: data.access_token,
    refresh_token: refreshToken, // refresh_token은 보통 그대로 유지
    scope: data.scope,
    token_type: data.token_type,
    expiry_date: data.expires_in 
      ? Date.now() + (data.expires_in * 1000) 
      : undefined,
  };
}

/* ===== 유저 정보 조회 ===== */

/**
 * Access token으로 Google 유저 정보 조회
 */
export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[getGoogleUserInfo] Error:', errorText);
    throw new Error(`Failed to get user info: ${response.status}`);
  }

  const data = await response.json();

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    picture: data.picture,
  };
}

/* ===== 토큰 유효성 검사 ===== */

/**
 * Access token이 만료되었는지 확인
 * @param expiryAt - ISO 문자열 또는 null
 * @param bufferMs - 만료 전 여유 시간 (기본 5분)
 */
export function isTokenExpired(expiryAt: string | null, bufferMs = 5 * 60 * 1000): boolean {
  if (!expiryAt) return true;
  
  const expiryTime = new Date(expiryAt).getTime();
  return Date.now() > (expiryTime - bufferMs);
}
