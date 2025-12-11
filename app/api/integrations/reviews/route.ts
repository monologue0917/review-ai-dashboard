// app/api/integrations/reviews/route.ts (리팩토링 버전)
/**
 * POST /api/integrations/reviews
 * 
 * Webhook endpoint for external platforms (Google, Yelp, etc.)
 * 
 * Request Body:
 * {
 *   salonId: string,
 *   source: "google" | "yelp" | "facebook",
 *   externalId: string,
 *   customerName: string,
 *   rating: number,
 *   reviewText?: string,
 *   reviewDate: string
 * }
 * 
 * Response:
 * {
 *   ok: true,
 *   data: {
 *     reviewId: string,
 *     isNew: boolean
 *   }
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  ingestExternalReview,
  type ExternalReviewPayload,
} from "@/lib/integrations/ingestExternalReview";
import { ApiResponse, ApiErrorCode } from "@/lib/types/api";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase env vars");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

type IngestReviewResponse = ApiResponse<{
  reviewId: string;
  isNew: boolean;
}>;

export async function POST(
  req: NextRequest
): Promise<NextResponse<IngestReviewResponse>> {
  try {
    console.log("[POST /api/integrations/reviews] Request received");

    const body = await req.json();
    const {
      salonId,
      source,
      externalId,
      customerName,
      rating,
      reviewText,
      reviewDate,
      reviewerProfileUrl,
    } = body;

    // Validation
    if (!salonId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing salonId",
          code: ApiErrorCode.INVALID_REQUEST,
        },
        { status: 400 }
      );
    }

    if (!source || !["google", "yelp", "facebook"].includes(source)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid source",
          code: ApiErrorCode.INVALID_REQUEST,
        },
        { status: 400 }
      );
    }

    if (!externalId || !customerName || !rating || !reviewDate) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing required fields",
          code: ApiErrorCode.INVALID_REQUEST,
        },
        { status: 400 }
      );
    }

    // Payload 구성
    const payload: ExternalReviewPayload = {
      source,
      externalId,
      customerName,
      rating,
      reviewText,
      reviewDate,
      reviewerProfileUrl,
    };

    // 공통 ingestion 함수 호출
    const result = await ingestExternalReview(supabase, salonId, payload);

    console.log("[POST /api/integrations/reviews] Success:", result);

    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (err: any) {
    console.error("[POST /api/integrations/reviews] Error:", err);

    return NextResponse.json(
      {
        ok: false,
        error: err.message || "Internal server error",
        code: ApiErrorCode.INTERNAL_ERROR,
      },
      { status: 500 }
    );
  }
}