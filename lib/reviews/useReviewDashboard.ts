"use client";

/**
 * lib/reviews/useReviewDashboard.ts
 * 
 * 대시보드에서 사용하는 리뷰 관련 로직을 담당하는 핵심 훅
 * 
 * 주요 기능:
 * - 현재 로그인된 유저의 살롱 리뷰 자동 조회
 * - GET /api/reviews/with-replies 로 리뷰 목록 조회
 * - 선택된 리뷰 상태 관리
 * - POST /api/reviews/[id]/reply 로 AI 답글 생성
 * - 리뷰 목록 새로고침
 */

import { useCallback, useEffect, useState } from "react";
import { useAuthInfo } from "@/lib/auth/useAuthInfo";
import type { 
  ReviewItem, 
  ReviewsWithRepliesResponse,
  GenerateReplyResponse 
} from "@/lib/reviews/types";

type UseReviewDashboardResult = {
  // 리뷰 데이터
  reviews: ReviewItem[];
  selectedReview: ReviewItem | null;
  selectedReviewId: number | null;
  setSelectedReviewId: (id: number | null) => void;
  
  // 로딩/에러 상태
  isLoading: boolean;
  error: string | null;
  
  // 액션
  refresh: () => Promise<void>;
  generateReply: (reviewId: number) => Promise<void>;
  isGeneratingReply: (reviewId: number) => boolean;
  
  // 인증 정보
  salonId: string | null;
  salonName: string | null;
};

export function useReviewDashboard(): UseReviewDashboardResult {
  // 1) 인증 정보 가져오기
  const { auth, isLoaded: authLoaded } = useAuthInfo();
  const salonId = auth?.salonId ?? null;
  const salonName = auth?.salonName ?? null;

  // 2) 상태 관리
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [selectedReviewId, setSelectedReviewId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingMap, setGeneratingMap] = useState<Record<number, boolean>>({});

  // 3) 리뷰 목록 조회
  const fetchReviews = useCallback(
    async () => {
      if (!authLoaded) {
        return;
      }

      if (!salonId) {
        setReviews([]);
        setSelectedReviewId(null);
        setError("No salon associated with your account. Please contact support.");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/reviews/with-replies?salonId=${encodeURIComponent(salonId)}`
        );

        const json = await res.json() as ReviewsWithRepliesResponse;

        if (!json.ok) {
          throw new Error(json.error);
        }

        const incoming = json.data;
        setReviews(incoming);

        // 선택된 리뷰 유지 or 기본 선택
        if (incoming.length === 0) {
          setSelectedReviewId(null);
        } else if (
          selectedReviewId === null ||
          !incoming.some((r) => r.id === selectedReviewId)
        ) {
          setSelectedReviewId(incoming[0].id);
        }
      } catch (err) {
        console.error("[useReviewDashboard] Failed to load reviews", err);
        setError(
          err instanceof Error ? err.message : "Unexpected error loading reviews"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [authLoaded, salonId, selectedReviewId]
  );

  // 4) 초기 로드
  useEffect(() => {
    void fetchReviews();
  }, [fetchReviews]);

  // 5) 새로고침
  const refresh = useCallback(async () => {
    await fetchReviews();
  }, [fetchReviews]);

  // 6) AI 답글 생성
  const generateReply = useCallback(
    async (reviewId: number) => {
      setGeneratingMap((prev) => ({ ...prev, [reviewId]: true }));
      setError(null);

      try {
        const res = await fetch(`/api/reviews/${reviewId}/reply`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ trigger: "manual" }),
        });

        const json = await res.json() as GenerateReplyResponse;

        if (!json.ok) {
          throw new Error(json.error);
        }

        // 답글 생성 성공 후 리뷰 목록 새로고침
        await fetchReviews();
      } catch (err) {
        console.error("[useReviewDashboard] Failed to generate reply", err);
        setError(
          err instanceof Error
            ? err.message
            : "Unexpected error generating reply"
        );
      } finally {
        setGeneratingMap((prev) => {
          const next = { ...prev };
          delete next[reviewId];
          return next;
        });
      }
    },
    [fetchReviews]
  );

  // 7) 답글 생성 중 체크
  const isGeneratingReply = useCallback(
    (reviewId: number) => Boolean(generatingMap[reviewId]),
    [generatingMap]
  );

  // 8) 선택된 리뷰 찾기
  const selectedReview =
    reviews.find((r) => r.id === selectedReviewId) ?? null;

  return {
    reviews,
    selectedReview,
    selectedReviewId,
    setSelectedReviewId,
    isLoading,
    error,
    refresh,
    generateReply,
    isGeneratingReply,
    salonId,
    salonName,
  };
}