// app/api/google/locations/route.ts
/**
 * ===================================================================
 * Google Business Profile 위치 목록 조회 API (개선됨)
 * ===================================================================
 * 
 * GET /api/google/locations?userId=xxx
 * 
 * 7종 에러 케이스 처리:
 * - 토큰 만료 → 자동 갱신
 * - 토큰 회수 → 재연결 유도
 * - 권한 부족 → 명확한 에러
 * - Rate limit → 재시도 안내
 * - 서버 에러 → 재시도 안내
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getValidAccessToken } from '@/lib/google/tokenManager';
import { listGBPAccounts, listGBPLocations } from '@/lib/google/apiClient';
import { GoogleError, GoogleErrorCode, GoogleErrorMessages } from '@/lib/google/errors';
import type { 
  GoogleAccountRow, 
  GoogleLocationDTO,
  GoogleLocationsResponse 
} from '@/lib/google/types';
import type { ApiResponse, ApiError } from '@/lib/api/types';
import { ErrorCode } from '@/lib/api/types';
import { verifyAuth } from '@/lib/auth/verifyApiAuth';

/* ===== Supabase 클라이언트 ===== */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/* ===== 에러 응답 타입 ===== */

type LocationsErrorResponse = {
  ok: false;
  error: string;
  code: string;
  googleErrorCode?: string;
  retryable?: boolean;
};

/* ===== GET 핸들러 ===== */

export async function GET(
  req: NextRequest
): Promise<NextResponse<ApiResponse<GoogleLocationsResponse> | LocationsErrorResponse>> {
  try {
    // 1) ✅ 인증 검증
    const auth = await verifyAuth(req, { requireSalon: false });
    if (!auth.ok) {
      return NextResponse.json<ApiError>(
        { ok: false, error: auth.error, code: auth.code },
        { status: 401 }
      );
    }

    // userId는 인증된 사용자의 ID 사용
    const userId = auth.userId;

    // 2) 유저의 Google 계정 조회
    const { data: googleAccounts, error: accountsError } = await supabase
      .from('google_accounts')
      .select('*')
      .eq('user_id', userId);

    if (accountsError) {
      console.error('[Google Locations] DB error:', accountsError);
      return NextResponse.json<ApiError>(
        { ok: false, error: 'Failed to fetch Google accounts', code: ErrorCode.DATABASE_ERROR },
        { status: 500 }
      );
    }

    if (!googleAccounts || googleAccounts.length === 0) {
      return NextResponse.json<ApiResponse<GoogleLocationsResponse>>({
        ok: true,
        data: { accounts: [] },
      });
    }

    // 3) 각 Google 계정에 대해 위치 조회
    const result: GoogleLocationsResponse = { accounts: [] };
    const errors: { email: string; error: GoogleError }[] = [];

    for (const account of googleAccounts as GoogleAccountRow[]) {
      try {
        // 3-1) GBP 계정 목록 조회 (자동 토큰 갱신 포함)
        const accountsResult = await listGBPAccounts(account.id);
        
        if (!accountsResult.ok) {
          errors.push({ email: account.email, error: accountsResult.error });
          continue;
        }

        const gbpAccounts = accountsResult.data.accounts || [];

        for (const gbpAccount of gbpAccounts) {
          // 3-2) 각 계정의 위치 목록 조회
          const locationsResult = await listGBPLocations(account.id, gbpAccount.name);
          
          if (!locationsResult.ok) {
            console.warn(`[Google Locations] Failed to fetch locations for ${gbpAccount.name}:`, locationsResult.error);
            continue;
          }

          const locations = locationsResult.data.locations || [];
          const accountId = gbpAccount.name.replace('accounts/', '');

          result.accounts.push({
            accountName: gbpAccount.accountName || gbpAccount.name,
            accountId: accountId,
            locations: locations.map((loc: any) => ({
              name: loc.name,
              locationId: loc.name.split('/').pop() || '',
              title: loc.title || 'Unnamed Location',
              address: formatAddress(loc),
              placeId: loc.metadata?.placeId,
            })),
          });
        }
      } catch (err) {
        console.error(`[Google Locations] Error for account ${account.email}:`, err);
        
        if (err instanceof GoogleError) {
          errors.push({ email: account.email, error: err });
        }
      }
    }

    // 4) 모든 계정이 실패한 경우
    if (result.accounts.length === 0 && errors.length > 0) {
      const firstError = errors[0].error;
      
      // 특정 에러 코드에 따른 응답
      if (firstError.code === GoogleErrorCode.TOKEN_REVOKED) {
        return NextResponse.json<LocationsErrorResponse>({
          ok: false,
          error: GoogleErrorMessages.token_revoked,
          code: ErrorCode.UNAUTHORIZED,
          googleErrorCode: GoogleErrorCode.TOKEN_REVOKED,
          retryable: false,
        }, { status: 401 });
      }

      if (firstError.code === GoogleErrorCode.RATE_LIMITED) {
        return NextResponse.json<LocationsErrorResponse>({
          ok: false,
          error: GoogleErrorMessages.rate_limited,
          code: ErrorCode.RATE_LIMITED,
          googleErrorCode: GoogleErrorCode.RATE_LIMITED,
          retryable: true,
        }, { status: 429 });
      }

      if (firstError.code === GoogleErrorCode.INSUFFICIENT_SCOPE) {
        return NextResponse.json<LocationsErrorResponse>({
          ok: false,
          error: GoogleErrorMessages.insufficient_scope,
          code: ErrorCode.FORBIDDEN,
          googleErrorCode: GoogleErrorCode.INSUFFICIENT_SCOPE,
          retryable: false,
        }, { status: 403 });
      }
    }

    // 5) 성공 (일부 계정 실패해도 나머지는 반환)
    return NextResponse.json<ApiResponse<GoogleLocationsResponse>>({
      ok: true,
      data: result,
    });
  } catch (err) {
    console.error('[Google Locations] Unexpected error:', err);
    
    if (err instanceof GoogleError) {
      return NextResponse.json<LocationsErrorResponse>({
        ok: false,
        error: GoogleErrorMessages[err.code] || err.message,
        code: ErrorCode.EXTERNAL_API_ERROR,
        googleErrorCode: err.code,
        retryable: err.retryable,
      }, { status: err.statusCode });
    }

    return NextResponse.json<ApiError>(
      { ok: false, error: 'Internal server error', code: ErrorCode.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}

/* ===== 헬퍼 함수 ===== */

/**
 * 주소 포맷팅
 */
function formatAddress(location: any): string | undefined {
  const addr = location.storefrontAddress;
  if (!addr) return undefined;

  const parts = [
    ...(addr.addressLines || []),
    addr.locality,
    addr.administrativeArea,
    addr.postalCode,
  ].filter(Boolean);

  return parts.join(', ') || undefined;
}
