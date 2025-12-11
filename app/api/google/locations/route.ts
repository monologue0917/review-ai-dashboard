// app/api/google/locations/route.ts
/**
 * ===================================================================
 * Google Business Profile 위치 목록 조회 API
 * ===================================================================
 * 
 * GET /api/google/locations?userId=xxx
 * 
 * 연결된 Google 계정의 모든 비즈니스 위치를 조회합니다.
 * 
 * 응답 예시:
 * {
 *   ok: true,
 *   data: {
 *     accounts: [
 *       {
 *         accountName: "My Business",
 *         accountId: "123456789",
 *         locations: [
 *           { name: "accounts/123/locations/456", locationId: "456", title: "Leo Nails" }
 *         ]
 *       }
 *     ]
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { refreshAccessToken, isTokenExpired } from '@/lib/google/oauth';
import type { 
  GoogleAccountRow, 
  GBPAccount, 
  GBPLocation,
  GoogleLocationDTO,
  GoogleLocationsResponse 
} from '@/lib/google/types';
import type { ApiResponse, ApiError } from '@/lib/api/types';
import { ErrorCode } from '@/lib/api/types';

/* ===== Supabase 클라이언트 ===== */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/* ===== GET 핸들러 ===== */

export async function GET(
  req: NextRequest
): Promise<NextResponse<ApiResponse<GoogleLocationsResponse>>> {
  try {
    // 1) 파라미터 추출
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json<ApiError>(
        { ok: false, error: 'Missing userId', code: ErrorCode.MISSING_FIELD },
        { status: 400 }
      );
    }

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

    for (const account of googleAccounts as GoogleAccountRow[]) {
      try {
        // 3-1) 토큰 갱신 (필요시)
        let accessToken = account.access_token;
        
        if (isTokenExpired(account.expiry_at) && account.refresh_token) {
          console.log('[Google Locations] Refreshing token for:', account.email);
          
          const newTokens = await refreshAccessToken(account.refresh_token);
          accessToken = newTokens.access_token;

          // DB 업데이트
          await supabase
            .from('google_accounts')
            .update({
              access_token: newTokens.access_token,
              expiry_at: newTokens.expiry_date 
                ? new Date(newTokens.expiry_date).toISOString() 
                : null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', account.id);
        }

        // 3-2) GBP 계정 목록 조회
        const gbpAccounts = await fetchGBPAccounts(accessToken);

        for (const gbpAccount of gbpAccounts) {
          // 3-3) 각 계정의 위치 목록 조회
          const locations = await fetchGBPLocations(accessToken, gbpAccount.name);
          
          const accountId = gbpAccount.name.replace('accounts/', '');

          result.accounts.push({
            accountName: gbpAccount.accountName || gbpAccount.name,
            accountId: accountId,
            locations: locations.map((loc) => ({
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
        // 개별 계정 오류는 건너뛰고 계속 진행
      }
    }

    return NextResponse.json<ApiResponse<GoogleLocationsResponse>>({
      ok: true,
      data: result,
    });
  } catch (err) {
    console.error('[Google Locations] Unexpected error:', err);
    return NextResponse.json<ApiError>(
      { ok: false, error: 'Internal server error', code: ErrorCode.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}

/* ===== GBP API 호출 함수들 ===== */

/**
 * My Business Account Management API - 계정 목록 조회
 */
async function fetchGBPAccounts(accessToken: string): Promise<GBPAccount[]> {
  const response = await fetch(
    'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[fetchGBPAccounts] Error:', response.status, errorText);
    throw new Error(`Failed to fetch GBP accounts: ${response.status}`);
  }

  const data = await response.json();
  return (data.accounts || []) as GBPAccount[];
}

/**
 * My Business Business Information API - 위치 목록 조회
 */
async function fetchGBPLocations(accessToken: string, accountName: string): Promise<GBPLocation[]> {
  // accountName: "accounts/123456789"
  const response = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title,storefrontAddress,metadata`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[fetchGBPLocations] Error:', response.status, errorText);
    
    // 위치가 없는 계정일 수 있음
    if (response.status === 404) {
      return [];
    }
    throw new Error(`Failed to fetch locations: ${response.status}`);
  }

  const data = await response.json();
  return (data.locations || []) as GBPLocation[];
}

/**
 * 주소 포맷팅
 */
function formatAddress(location: GBPLocation): string | undefined {
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
