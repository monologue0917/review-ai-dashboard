// app/api/google/connect-location/route.ts
/**
 * ===================================================================
 * 살롱-Google 위치 연결 API
 * ===================================================================
 * 
 * POST /api/google/connect-location
 * Body: {
 *   salonId: string,
 *   userId: string,
 *   locationName: string,      // accounts/xxx/locations/yyy
 *   locationId: string,
 *   locationTitle: string
 * }
 * 
 * 살롱을 특정 Google Business Profile 위치와 연결합니다.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { ApiResponse, ApiError } from '@/lib/api/types';
import { ErrorCode } from '@/lib/api/types';
import { verifyAuthAndSalonAccess } from '@/lib/auth/verifyApiAuth';

/* ===== Supabase 클라이언트 ===== */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/* ===== 요청 타입 ===== */

interface ConnectLocationRequest {
  salonId: string;
  userId: string;
  locationName: string;
  locationId: string;
  locationTitle: string;
}

interface ConnectLocationResponse {
  connectionId: string;
  connected: boolean;
}

/* ===== POST 핸들러 ===== */

export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<ConnectLocationResponse>>> {
  try {
    // 1) Body 파싱
    const body = (await req.json()) as ConnectLocationRequest;
    const { salonId, userId, locationName, locationId, locationTitle } = body;

    // 2) 필수 필드 검증
    if (!salonId || !userId || !locationName) {
      return NextResponse.json<ApiError>(
        { ok: false, error: 'Missing required fields', code: ErrorCode.MISSING_FIELD },
        { status: 400 }
      );
    }

    // ✅ 2-1) 인증 + 살롱 접근 권한 검증
    const auth = await verifyAuthAndSalonAccess(req, salonId);
    if (!auth.ok) {
      return NextResponse.json<ApiError>(
        { ok: false, error: auth.error, code: auth.code },
        { status: auth.code === 'FORBIDDEN' ? 403 : 401 }
      );
    }

    console.log('[Connect Location] Request:', { salonId, userId, locationName, locationTitle });

    // 3) 해당 유저의 Google 계정 조회
    const { data: googleAccount, error: accountError } = await supabase
      .from('google_accounts')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (accountError || !googleAccount) {
      console.error('[Connect Location] Google account not found:', accountError);
      return NextResponse.json<ApiError>(
        { ok: false, error: 'Google account not connected', code: ErrorCode.NOT_FOUND },
        { status: 404 }
      );
    }

    // 4) 기존 연결 확인 (같은 살롱에 대한)
    const { data: existingConnection } = await supabase
      .from('salon_google_connections')
      .select('id')
      .eq('salon_id', salonId)
      .single();

    let connectionId: string;

    if (existingConnection) {
      // 5-1) 기존 연결 업데이트
      const { error: updateError } = await supabase
        .from('salon_google_connections')
        .update({
          google_account_id: googleAccount.id,
          location_name: locationName,
          location_id: locationId,
          location_title: locationTitle,
          sync_enabled: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingConnection.id);

      if (updateError) {
        console.error('[Connect Location] Update error:', updateError);
        return NextResponse.json<ApiError>(
          { ok: false, error: 'Failed to update connection', code: ErrorCode.DATABASE_ERROR },
          { status: 500 }
        );
      }

      connectionId = existingConnection.id;
      console.log('[Connect Location] Updated existing connection:', connectionId);
    } else {
      // 5-2) 새 연결 생성
      const { data: newConnection, error: insertError } = await supabase
        .from('salon_google_connections')
        .insert({
          salon_id: salonId,
          google_account_id: googleAccount.id,
          location_name: locationName,
          location_id: locationId,
          location_title: locationTitle,
          sync_enabled: true,
        })
        .select('id')
        .single();

      if (insertError || !newConnection) {
        console.error('[Connect Location] Insert error:', insertError);
        return NextResponse.json<ApiError>(
          { ok: false, error: 'Failed to create connection', code: ErrorCode.DATABASE_ERROR },
          { status: 500 }
        );
      }

      connectionId = newConnection.id;
      console.log('[Connect Location] Created new connection:', connectionId);
    }

    // 6) 성공 응답
    return NextResponse.json<ApiResponse<ConnectLocationResponse>>({
      ok: true,
      data: {
        connectionId,
        connected: true,
      },
    });
  } catch (err) {
    console.error('[Connect Location] Unexpected error:', err);
    return NextResponse.json<ApiError>(
      { ok: false, error: 'Internal server error', code: ErrorCode.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}

/* ===== DELETE 핸들러 - 연결 해제 ===== */

export async function DELETE(
  req: NextRequest
): Promise<NextResponse<ApiResponse<{ disconnected: boolean }>>> {
  try {
    const url = new URL(req.url);
    const salonId = url.searchParams.get('salonId');

    if (!salonId) {
      return NextResponse.json<ApiError>(
        { ok: false, error: 'Missing salonId', code: ErrorCode.MISSING_FIELD },
        { status: 400 }
      );
    }

    // ✅ 인증 + 살롱 접근 권한 검증
    const auth = await verifyAuthAndSalonAccess(req, salonId);
    if (!auth.ok) {
      return NextResponse.json<ApiError>(
        { ok: false, error: auth.error, code: auth.code },
        { status: auth.code === 'FORBIDDEN' ? 403 : 401 }
      );
    }

    // 연결 삭제
    const { error: deleteError } = await supabase
      .from('salon_google_connections')
      .delete()
      .eq('salon_id', salonId);

    if (deleteError) {
      console.error('[Disconnect Location] Delete error:', deleteError);
      return NextResponse.json<ApiError>(
        { ok: false, error: 'Failed to disconnect', code: ErrorCode.DATABASE_ERROR },
        { status: 500 }
      );
    }

    console.log('[Disconnect Location] Disconnected salon:', salonId);

    return NextResponse.json<ApiResponse<{ disconnected: boolean }>>({
      ok: true,
      data: { disconnected: true },
    });
  } catch (err) {
    console.error('[Disconnect Location] Unexpected error:', err);
    return NextResponse.json<ApiError>(
      { ok: false, error: 'Internal server error', code: ErrorCode.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
