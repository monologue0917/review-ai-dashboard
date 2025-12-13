// app/api/replies/[replyId]/route.ts
/**
 * ===================================================================
 * Reply 드래프트 저장 API
 * ===================================================================
 * 
 * PATCH /api/replies/:replyId
 * 
 * 편집된 답글을 드래프트로 저장합니다.
 * posted 상태인 reply는 수정할 수 없습니다.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { ApiResponse, ApiError } from "@/lib/api/types";
import { ErrorCode } from "@/lib/api/types";
import { verifyAuth } from "@/lib/auth/verifyApiAuth";

/* ===== Supabase 클라이언트 ===== */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase env vars");
}

const supabase = createClient(supabaseUrl, supabaseKey);

/* ===== 타입 정의 ===== */

type ReplyStatus = 'draft' | 'approved' | 'posted' | 'failed';

type PatchRequestBody = {
  finalText: string;
  userId?: string;
};

type PatchResponseData = {
  replyId: string;
  finalText: string;
  status: ReplyStatus;
  editedAt: string;
};

/* ===== PATCH 핸들러 ===== */

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ replyId: string }> }
): Promise<NextResponse<ApiResponse<PatchResponseData>>> {
  try {
    // 1) replyId 추출
    const { replyId } = await params;

    if (!replyId) {
      return NextResponse.json<ApiError>(
        { ok: false, error: "Missing reply ID", code: ErrorCode.INVALID_INPUT },
        { status: 400 }
      );
    }

    // ✅ 1-1) 인증 검증
    const auth = await verifyAuth(req);
    if (!auth.ok) {
      return NextResponse.json<ApiError>(
        { ok: false, error: auth.error, code: auth.code },
        { status: 401 }
      );
    }

    // 2) Body 파싱
    const body = (await req.json().catch(() => ({}))) as PatchRequestBody;
    const { finalText, userId } = body;

    if (typeof finalText !== 'string') {
      return NextResponse.json<ApiError>(
        { ok: false, error: "finalText is required", code: ErrorCode.INVALID_INPUT },
        { status: 400 }
      );
    }

    // 3) 현재 reply 상태 확인 (살롱 정보 포함)
    const { data: existingReply, error: fetchError } = await supabase
      .from("review_replies")
      .select("id, status, final_text, salon_id")
      .eq("id", replyId)
      .single();

    if (fetchError || !existingReply) {
      console.error("[PATCH /api/replies/:id] Reply not found:", fetchError);
      return NextResponse.json<ApiError>(
        { ok: false, error: "Reply not found", code: ErrorCode.NOT_FOUND },
        { status: 404 }
      );
    }

    // ✅ 3-1) 살롱 접근 권한 확인
    if (auth.salonId !== existingReply.salon_id) {
      return NextResponse.json<ApiError>(
        { ok: false, error: "Access denied to this reply", code: ErrorCode.FORBIDDEN },
        { status: 403 }
      );
    }

    // 4) posted 상태면 수정 불가
    if (existingReply.status === 'posted') {
      return NextResponse.json<ApiError>(
        { 
          ok: false, 
          error: "Cannot edit a posted reply", 
          code: ErrorCode.FORBIDDEN 
        },
        { status: 409 }
      );
    }

    // 5) 업데이트 실행
    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = {
      final_text: finalText,
      reply_text: finalText, // 기존 컬럼도 동기화
      edited_at: now,
      updated_at: now,
      status: 'draft', // 수정하면 draft로
    };

    if (userId) {
      updateData.edited_by = userId;
    }

    const { error: updateError } = await supabase
      .from("review_replies")
      .update(updateData)
      .eq("id", replyId);

    if (updateError) {
      console.error("[PATCH /api/replies/:id] Update error:", updateError);
      return NextResponse.json<ApiError>(
        { ok: false, error: "Failed to update reply", code: ErrorCode.DATABASE_ERROR },
        { status: 500 }
      );
    }

    console.log("[PATCH /api/replies/:id] Draft saved:", replyId);

    // 6) 성공 응답
    return NextResponse.json<ApiResponse<PatchResponseData>>({
      ok: true,
      data: {
        replyId,
        finalText,
        status: 'draft',
        editedAt: now,
      },
    });
  } catch (err) {
    console.error("[PATCH /api/replies/:id] Unexpected error:", err);
    return NextResponse.json<ApiError>(
      { 
        ok: false, 
        error: err instanceof Error ? err.message : "Internal server error", 
        code: ErrorCode.INTERNAL_ERROR 
      },
      { status: 500 }
    );
  }
}

/* ===== GET 핸들러 (단일 reply 조회) ===== */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ replyId: string }> }
): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const { replyId } = await params;

    // ✅ 인증 검증
    const auth = await verifyAuth(req);
    if (!auth.ok) {
      return NextResponse.json<ApiError>(
        { ok: false, error: auth.error, code: auth.code },
        { status: 401 }
      );
    }

    const { data: reply, error } = await supabase
      .from("review_replies")
      .select("*")
      .eq("id", replyId)
      .single();

    if (error || !reply) {
      return NextResponse.json<ApiError>(
        { ok: false, error: "Reply not found", code: ErrorCode.NOT_FOUND },
        { status: 404 }
      );
    }

    // ✅ 살롱 접근 권한 확인
    if (auth.salonId !== reply.salon_id) {
      return NextResponse.json<ApiError>(
        { ok: false, error: "Access denied to this reply", code: ErrorCode.FORBIDDEN },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: reply,
    });
  } catch (err) {
    console.error("[GET /api/replies/:id] Error:", err);
    return NextResponse.json<ApiError>(
      { ok: false, error: "Internal server error", code: ErrorCode.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
