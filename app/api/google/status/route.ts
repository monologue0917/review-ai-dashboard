// app/api/google/status/route.ts
/**
 * GET /api/google/status
 * 
 * Google OAuth 설정 상태 확인 API
 * - 환경변수가 설정되어 있는지 확인
 * - UI에서 "Connect Google" 버튼 표시 여부 결정에 사용
 */

import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  const isConfigured = !!(clientId && clientSecret && redirectUri);

  return NextResponse.json({
    ok: true,
    data: {
      configured: isConfigured,
      // 디버깅용 (프로덕션에서는 제거 가능)
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasRedirectUri: !!redirectUri,
    },
  });
}
