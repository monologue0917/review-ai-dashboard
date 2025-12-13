// app/api/reviews/route.ts
/**
 * ===================================================================
 * CSV/히스토리 Bulk Import 전용 API
 * ===================================================================
 *
 * GET  /api/reviews?salonId=xxx  - 특정 살롱의 리뷰 raw data 조회
 * POST /api/reviews              - CSV 리뷰 데이터 bulk import
 *
 * ⚠️ 중요 사항:
 * - 리뷰 기본 정보만 저장 (소스, 별점, 텍스트, 날짜 등)
 * - 답글(reply) 관련 데이터는 저장하지 않음
 * - 답글은 별도로 review_replies 테이블에서 관리
 * - 대시보드 조회는 /api/reviews/with-replies 사용 필수
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { ApiResponse, ApiError } from "@/lib/api/types";
import { ErrorCode } from "@/lib/api/types";

/* ===== 환경변수 체크 ===== */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)"
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

/* ===== 타입 정의 ===== */

/**
 * CSV Import 시 프론트엔드에서 전달하는 리뷰 데이터 형식
 * (ThunderClient / Make JSON과 1:1 매칭)
 *
 * 예:
 * {
 *   "reviewId": "g-001",
 *   "source": "google",
 *   "rating": 5,
 *   "customer": "Jane Doe",
 *   "review": "Amazing service and beautiful nails!",
 *   "date": "2024-11-01",
 *   "status": "new",
 *   "riskTags": []
 * }
 */
type IncomingReview = {
  reviewId: string | null;
  source: string | null;
  rating: number | null;
  customer: string | null;
  review: string | null;
  date: string | null;
  status?: string | null;
  riskTags?: string[] | null;
};

type BulkImportRequestBody = {
  salonId: string;
  reviews: IncomingReview[];
};

type BulkImportData = {
  importedCount: number;
};

/* ===== GET 핸들러 ===== */

/**
 * GET /api/reviews?salonId=xxx
 *
 * 특정 살롱의 리뷰 목록을 조회합니다 (raw data).
 *
 * ⚠️ 주의: 답글 정보는 포함되지 않음
 * 답글과 함께 조회하려면 /api/reviews/with-replies 사용
 *
 * @param salonId - 조회할 살롱 ID (query parameter)
 * @returns ApiResponse<any[]>
 */
export async function GET(
  req: NextRequest
): Promise<NextResponse<ApiResponse<any[]>>> {
  try {
    const url = new URL(req.url);
    const salonId = url.searchParams.get("salonId");

    let query = supabase
      .from("reviews")
      .select(
        "id, salon_id, review_id, source, rating, customer_name, review_text, review_date, status, risk_tags, created_at"
      )
      .order("review_date", { ascending: false })
      .limit(1000);

    if (salonId) {
      query = query.eq("salon_id", salonId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[GET /api/reviews] Supabase error:", error);
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: "Failed to fetch reviews from database",
          code: ErrorCode.DATABASE_ERROR,
        },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<any[]>>(
      {
        ok: true,
        data: data ?? [],
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[GET /api/reviews] Unexpected error:", err);
    return NextResponse.json<ApiError>(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Unexpected server error",
        code: ErrorCode.INTERNAL_ERROR,
      },
      { status: 500 }
    );
  }
}

/* ===== POST 핸들러 ===== */

/**
 * POST /api/reviews
 *
 * CSV/외부 데이터를 reviews 테이블에 bulk import 합니다.
 *
 * Request Body:
 * {
 *   salonId: string,
 *   reviews: IncomingReview[]
 * }
 *
 * Response (성공):
 * {
 *   ok: true,
 *   data: { importedCount: number }
 * }
 */
export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse<BulkImportData>>> {
  try {
    // 1) Body 파싱 및 검증
    const json = (await req.json().catch(() => null)) as
      | BulkImportRequestBody
      | null;

    if (!json) {
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: "Invalid JSON body",
          code: ErrorCode.INVALID_INPUT,
        },
        { status: 400 }
      );
    }

    if (!json.salonId || typeof json.salonId !== "string") {
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: "Missing or invalid salonId in request body",
          code: ErrorCode.MISSING_FIELD,
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(json.reviews)) {
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: "Invalid reviews array in request body",
          code: ErrorCode.INVALID_INPUT,
        },
        { status: 400 }
      );
    }

    const { salonId, reviews: incoming } = json;

    // 2) 빈 배열 처리
    if (incoming.length === 0) {
      return NextResponse.json<ApiResponse<BulkImportData>>(
        {
          ok: true,
          data: { importedCount: 0 },
        },
        { status: 200 }
      );
    }

    // 3) DB 형식으로 매핑 (camelCase → snake_case)
    const rows = incoming.map((r) => {
      const normalizedRating =
        typeof r.rating === "number" && !Number.isNaN(r.rating)
          ? r.rating
          : null;

      return {
        salon_id: salonId,
        review_id: r.reviewId ?? null,
        source: r.source ?? null,
        rating: normalizedRating,
        customer_name: r.customer ?? null,
        review_text: r.review ?? null,
        review_date: r.date ?? null,
        status: r.status ?? "new",
        risk_tags: r.riskTags ?? [],
      };
    });

    // 4) Upsert
    //  - 같은 (salon_id + review_id + source) 한 번 더 넣으면 UPDATE
    //  - UNIQUE (salon_id, review_id, source) 제약조건과 맞추기
    const { data, error } = await supabase
      .from("reviews")
      .upsert(rows, {
        onConflict: "salon_id,review_id,source",
        ignoreDuplicates: false,
      })
      .select("id");

    if (error) {
      console.error(
        "[POST /api/reviews] Supabase upsert error:",
        error,
        "| salonId:",
        salonId,
        "| reviewCount:",
        incoming.length
      );
      return NextResponse.json<ApiError>(
        {
          ok: false,
          error: "Failed to import reviews to database",
          code: ErrorCode.DATABASE_ERROR,
        },
        { status: 500 }
      );
    }

    const importedCount = data?.length ?? 0;

    console.log(
      `[POST /api/reviews] ✅ Successfully imported ${importedCount} reviews for salon ${salonId}`
    );

    return NextResponse.json<ApiResponse<BulkImportData>>(
      {
        ok: true,
        data: { importedCount },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[POST /api/reviews] Unexpected error:", err);
    return NextResponse.json<ApiError>(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Unexpected server error",
        code: ErrorCode.INTERNAL_ERROR,
      },
      { status: 500 }
    );
  }
}
