// app/api/google/auth/start/route.ts
/**
 * ===================================================================
 * Google OAuth 시작 API
 * ===================================================================
 * 
 * GET /api/google/auth/start?userId=xxx&salonId=yyy
 * 
 * Google OAuth 인증 URL로 리다이렉트합니다.
 * state 파라미터에 userId와 salonId를 인코딩하여 콜백에서 사용합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildGoogleAuthUrl, validateGoogleEnvVars } from '@/lib/google/oauth';

export async function GET(req: NextRequest) {
  try {
    // 1) 환경변수 검증
    const envCheck = validateGoogleEnvVars();
    if (!envCheck.valid) {
      console.error('[Google Auth Start] Missing env vars:', envCheck.missing);
      return NextResponse.json(
        { ok: false, error: `Missing environment variables: ${envCheck.missing.join(', ')}` },
        { status: 500 }
      );
    }

    // 2) 파라미터 추출
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const salonId = url.searchParams.get('salonId');

    if (!userId || !salonId) {
      return NextResponse.json(
        { ok: false, error: 'Missing userId or salonId' },
        { status: 400 }
      );
    }

    // 3) State 생성 (콜백에서 복원할 정보)
    const stateData = {
      userId,
      salonId,
      timestamp: Date.now(),
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64url');

    // 4) Google OAuth URL 생성
    const authUrl = buildGoogleAuthUrl(state);

    console.log('[Google Auth Start] Redirecting to Google OAuth');
    console.log('[Google Auth Start] State:', { userId, salonId });

    // 5) 리다이렉트
    return NextResponse.redirect(authUrl);
  } catch (err) {
    console.error('[Google Auth Start] Error:', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
