// app/api/google/auth/callback/route.ts
/**
 * ===================================================================
 * Google OAuth 콜백 API
 * ===================================================================
 * 
 * GET /api/google/auth/callback?code=xxx&state=yyy
 * 
 * Google OAuth 인증 완료 후 호출됩니다.
 * 1. Authorization code를 access_token으로 교환
 * 2. Google 유저 정보 조회
 * 3. google_accounts 테이블에 저장 (upsert)
 * 4. /settings 페이지로 리다이렉트
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  exchangeCodeForTokens, 
  getGoogleUserInfo,
  validateGoogleEnvVars 
} from '@/lib/google/oauth';

/* ===== Supabase 클라이언트 ===== */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/* ===== State 디코딩 타입 ===== */

interface OAuthState {
  userId: string;
  salonId: string;
  timestamp: number;
}

/* ===== GET 핸들러 ===== */

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  try {
    // 1) 환경변수 검증
    const envCheck = validateGoogleEnvVars();
    if (!envCheck.valid) {
      console.error('[Google Callback] Missing env vars:', envCheck.missing);
      return NextResponse.redirect(
        `${baseUrl}/settings?google_error=config_error`
      );
    }

    // 2) 파라미터 추출
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // 2-1) 유저가 취소한 경우
    if (error) {
      console.log('[Google Callback] User cancelled:', error);
      return NextResponse.redirect(
        `${baseUrl}/settings?google_error=cancelled`
      );
    }

    // 2-2) 필수 파라미터 검증
    if (!code || !state) {
      console.error('[Google Callback] Missing code or state');
      return NextResponse.redirect(
        `${baseUrl}/settings?google_error=missing_params`
      );
    }

    // 3) State 디코딩
    let stateData: OAuthState;
    try {
      const decoded = Buffer.from(state, 'base64url').toString('utf-8');
      stateData = JSON.parse(decoded) as OAuthState;
    } catch (e) {
      console.error('[Google Callback] Invalid state:', e);
      return NextResponse.redirect(
        `${baseUrl}/settings?google_error=invalid_state`
      );
    }

    const { userId, salonId } = stateData;
    console.log('[Google Callback] State decoded:', { userId, salonId });

    // 4) State 타임스탬프 검증 (10분 이내)
    const stateAge = Date.now() - stateData.timestamp;
    if (stateAge > 10 * 60 * 1000) {
      console.error('[Google Callback] State expired:', stateAge);
      return NextResponse.redirect(
        `${baseUrl}/settings?google_error=state_expired`
      );
    }

    // 5) Authorization code → 토큰 교환
    console.log('[Google Callback] Exchanging code for tokens...');
    const tokens = await exchangeCodeForTokens(code);
    console.log('[Google Callback] Tokens received');

    // 6) Google 유저 정보 조회
    console.log('[Google Callback] Fetching user info...');
    const userInfo = await getGoogleUserInfo(tokens.access_token);
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
      return NextResponse.redirect(
        `${baseUrl}/settings?google_error=db_error`
      );
    }

    console.log('[Google Callback] Google account saved:', googleAccount.id);

    // 8) 성공 - Settings 페이지로 리다이렉트
    return NextResponse.redirect(
      `${baseUrl}/settings?google_success=true&google_email=${encodeURIComponent(userInfo.email)}`
    );
  } catch (err) {
    console.error('[Google Callback] Unexpected error:', err);
    return NextResponse.redirect(
      `${baseUrl}/settings?google_error=unknown`
    );
  }
}
