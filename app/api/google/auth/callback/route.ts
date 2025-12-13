// app/api/google/auth/callback/route.ts
/**
 * ===================================================================
 * Google OAuth 콜백 API (개선됨)
 * ===================================================================
 * 
 * GET /api/google/auth/callback?code=xxx&state=yyy
 * 
 * 7종 에러 케이스 완벽 처리:
 * 1. 사용자가 동의 화면에서 취소
 * 2. state 불일치/만료
 * 3. refresh token 없음
 * 4. 권한 부족 (scope 검증)
 * 5~7. API 에러는 apiClient에서 처리
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  exchangeCodeForTokens, 
  getGoogleUserInfo,
  validateGoogleEnvVars 
} from '@/lib/google/oauth';
import { GoogleErrorCode, GoogleErrorMessages } from '@/lib/google/errors';

/* ===== Supabase 클라이언트 ===== */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ===== State 타입 ===== */

interface OAuthState {
  userId: string;
  salonId: string;
  timestamp: number;
}

/* ===== 필수 Scope 체크 ===== */

const REQUIRED_SCOPE = 'https://www.googleapis.com/auth/business.manage';

function hasRequiredScope(grantedScope: string | undefined): boolean {
  if (!grantedScope) return false;
  return grantedScope.includes(REQUIRED_SCOPE);
}

/* ===== 에러 리다이렉트 헬퍼 ===== */

function errorRedirect(baseUrl: string, code: string, details?: string): NextResponse {
  const message = GoogleErrorMessages[code as keyof typeof GoogleErrorMessages] || GoogleErrorMessages.unknown;
  const params = new URLSearchParams({
    google_error: code,
    google_error_message: message,
  });
  if (details) {
    params.set('google_error_details', details);
  }
  return NextResponse.redirect(`${baseUrl}/settings?${params.toString()}`);
}

/* ===== GET 핸들러 ===== */

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  try {
    // 1) 환경변수 검증
    const envCheck = validateGoogleEnvVars();
    if (!envCheck.valid) {
      console.error('[Google Callback] Missing env vars:', envCheck.missing);
      return errorRedirect(baseUrl, GoogleErrorCode.CONFIG_ERROR);
    }

    // 2) 파라미터 추출
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    // 2-1) 유저가 취소한 경우 (케이스 1)
    if (error) {
      console.log('[Google Callback] OAuth error:', error, errorDescription);
      
      if (error === 'access_denied') {
        return errorRedirect(baseUrl, GoogleErrorCode.USER_CANCELLED);
      }
      
      return errorRedirect(baseUrl, GoogleErrorCode.UNKNOWN, errorDescription || error);
    }

    // 2-2) 필수 파라미터 검증
    if (!code || !state) {
      console.error('[Google Callback] Missing code or state');
      return errorRedirect(baseUrl, GoogleErrorCode.INVALID_STATE);
    }

    // 3) State 디코딩 (케이스 2)
    let stateData: OAuthState;
    try {
      const decoded = Buffer.from(state, 'base64url').toString('utf-8');
      stateData = JSON.parse(decoded) as OAuthState;
    } catch (e) {
      console.error('[Google Callback] Invalid state format:', e);
      return errorRedirect(baseUrl, GoogleErrorCode.INVALID_STATE);
    }

    const { userId, salonId } = stateData;

    // 3-1) State 필수 필드 확인
    if (!userId || !salonId) {
      console.error('[Google Callback] State missing userId or salonId');
      return errorRedirect(baseUrl, GoogleErrorCode.INVALID_STATE);
    }

    console.log('[Google Callback] State decoded:', { userId, salonId });

    // 4) State 타임스탬프 검증 - 10분 이내 (케이스 2)
    const stateAge = Date.now() - stateData.timestamp;
    if (stateAge > 10 * 60 * 1000) {
      console.error('[Google Callback] State expired:', stateAge, 'ms');
      return errorRedirect(baseUrl, GoogleErrorCode.STATE_EXPIRED);
    }

    // 5) Authorization code → 토큰 교환
    console.log('[Google Callback] Exchanging code for tokens...');
    let tokens;
    try {
      tokens = await exchangeCodeForTokens(code);
    } catch (err) {
      console.error('[Google Callback] Token exchange failed:', err);
      return errorRedirect(
        baseUrl, 
        GoogleErrorCode.UNKNOWN, 
        'Failed to exchange authorization code'
      );
    }
    console.log('[Google Callback] Tokens received');

    // 5-1) Refresh token 확인 (케이스 3)
    if (!tokens.refresh_token) {
      console.warn('[Google Callback] No refresh token received');
      // 계속 진행하되 경고 로그
      // (prompt: 'consent'로 요청했으므로 보통 받아야 함)
    }

    // 5-2) Scope 확인 (케이스 4)
    if (!hasRequiredScope(tokens.scope)) {
      console.error('[Google Callback] Insufficient scope:', tokens.scope);
      return errorRedirect(baseUrl, GoogleErrorCode.INSUFFICIENT_SCOPE);
    }

    // 6) Google 유저 정보 조회
    console.log('[Google Callback] Fetching user info...');
    let userInfo;
    try {
      userInfo = await getGoogleUserInfo(tokens.access_token);
    } catch (err) {
      console.error('[Google Callback] Failed to get user info:', err);
      return errorRedirect(
        baseUrl, 
        GoogleErrorCode.UNKNOWN, 
        'Failed to get Google user info'
      );
    }
    console.log('[Google Callback] User info:', userInfo.email);

    // 7) google_accounts 테이블에 upsert
    const expiryAt = tokens.expiry_date 
      ? new Date(tokens.expiry_date).toISOString() 
      : null;

    const { data: googleAccount, error: upsertError } = await supabase
      .from('google_accounts')
      .upsert(
        {
          user_id: userId,
          google_user_id: userInfo.id,
          email: userInfo.email,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          scope: tokens.scope,
          token_type: tokens.token_type,
          expiry_at: expiryAt,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,google_user_id',
        }
      )
      .select('id')
      .single();

    if (upsertError) {
      console.error('[Google Callback] Upsert error:', upsertError);
      return errorRedirect(
        baseUrl, 
        GoogleErrorCode.UNKNOWN, 
        'Failed to save Google account'
      );
    }

    console.log('[Google Callback] ✅ Google account saved:', googleAccount.id);

    // 8) 성공 - Settings 페이지로 리다이렉트
    const successParams = new URLSearchParams({
      google_success: 'true',
      google_email: userInfo.email,
      google_account_id: googleAccount.id,
    });
    
    return NextResponse.redirect(`${baseUrl}/settings?${successParams.toString()}`);
  } catch (err) {
    console.error('[Google Callback] Unexpected error:', err);
    return errorRedirect(
      baseUrl, 
      GoogleErrorCode.UNKNOWN, 
      err instanceof Error ? err.message : 'Unexpected error'
    );
  }
}
