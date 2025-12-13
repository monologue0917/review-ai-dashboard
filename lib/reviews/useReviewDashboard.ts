// lib/reviews/useReviewDashboard.ts
"use client";

/**
 * 대시보드에서 사용하는 리뷰 관련 로직을 담당하는 핵심 훅
 * 
 * ✨ SWR 적용:
 * - 캐시된 데이터 즉시 표시 (페이지 이동해도 버벅거림 없음)
 * - 백그라운드에서 최신 데이터 갱신
 * - 자동 재검증 (포커스 시, 네트워크 복구 시)
 */

import { useCallback, useState, useEffect } from "react";
import useSWR from "swr";
import { useAuthInfo, getAuthHeaders } from "@/lib/auth/useAuthInfo";
import { fetchWithTimeout, fetchAI, FetchTimeoutError } from "@/lib/utils/fetchWithTimeout";
import type { 
  ReviewItem, 
  ReviewStatus,
  ReviewsWithRepliesResponse,
  GenerateReplyResponse,
  UpdateStatusResponse,
} from "@/lib/reviews/types";

/* ===== SWR Fetcher ===== */

async function reviewsFetcher(url: string): Promise<ReviewItem[]> {
  const res = await fetchWithTimeout(url, {
    headers: getAuthHeaders(),
    timeout: 15000, // 15초
    retries: 1,
  });
  
  const json = await res.json() as ReviewsWithRepliesResponse;
  
  if (!json.ok) {
    throw new Error(json.error || "Failed to fetch reviews");
  }
  
  return json.data;
}

/* ===== 타입 ===== */

type UseReviewDashboardResult = {
  // 리뷰 데이터
  reviews: ReviewItem[];
  selectedReview: ReviewItem | null;
  selectedReviewId: number | null;
  setSelectedReviewId: (id: number | null) => void;
  
  // 로딩/에러 상태
  isLoading: boolean;
  isValidating: boolean; // 백그라운드 갱신 중
  error: string | null;
  
  // 액션
  refresh: () => Promise<void>;
  generateReply: (reviewId: number) => Promise<void>;
  isGeneratingReply: (reviewId: number) => boolean;
  updateStatus: (reviewId: number, status: ReviewStatus) => Promise<void>;
  isUpdatingStatus: (reviewId: number) => boolean;
  
  // 인증 정보
  salonId: string | null;
  salonName: string | null;
};

export function useReviewDashboard(): UseReviewDashboardResult {
  // 1) 인증 정보 가져오기
  const { auth, isLoaded: authLoaded } = useAuthInfo();
  const salonId = auth?.salonId ?? null;
  const salonName = auth?.salonName ?? null;

  // 2) SWR로 리뷰 조회
  const apiUrl = salonId 
    ? `/api/reviews/with-replies?salonId=${encodeURIComponent(salonId)}`
    : null;

  const { 
    data: reviews = [], 
    error: swrError, 
    isLoading,
    isValidating,
    mutate 
  } = useSWR<ReviewItem[]>(
    authLoaded ? apiUrl : null, // authLoaded 전까지는 fetch 안 함
    reviewsFetcher,
    {
      revalidateOnFocus: true,       // 탭 포커스 시 재검증
      revalidateOnReconnect: true,   // 네트워크 복구 시 재검증
      dedupingInterval: 5000,        // 5초 내 중복 요청 방지
      keepPreviousData: true,        // 새 데이터 로딩 중 이전 데이터 유지
    }
  );

  // 3) 로컬 상태
  const [selectedReviewId, setSelectedReviewId] = useState<number | null>(null);
  const [generatingMap, setGeneratingMap] = useState<Record<number, boolean>>({});
  const [updatingStatusMap, setUpdatingStatusMap] = useState<Record<number, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  // 4) 첫 로드 시 첫 번째 리뷰 선택
  useEffect(() => {
    if (reviews.length > 0 && selectedReviewId === null) {
      setSelectedReviewId(reviews[0].id);
    }
    // 선택된 리뷰가 목록에 없으면 첫 번째로
    if (selectedReviewId !== null && !reviews.some(r => r.id === selectedReviewId)) {
      setSelectedReviewId(reviews[0]?.id ?? null);
    }
  }, [reviews, selectedReviewId]);

  // 5) 새로고침
  const refresh = useCallback(async () => {
    await mutate();
  }, [mutate]);

  // 6) AI 답글 생성
  const generateReply = useCallback(
    async (reviewId: number) => {
      setGeneratingMap((prev) => ({ ...prev, [reviewId]: true }));
      setActionError(null);

      try {
        // AI 생성은 오래 걸릴 수 있으므로 60초 타임아웃
        const res = await fetchAI(`/api/reviews/${reviewId}/reply`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ trigger: "manual" }),
        });

        const json = await res.json() as GenerateReplyResponse;

        if (!json.ok) {
          throw new Error(json.error);
        }

        // 캐시 갱신
        await mutate();
      } catch (err) {
        console.error("[useReviewDashboard] Failed to generate reply", err);
        
        // 타임아웃 에러 특별 처리
        if (err instanceof FetchTimeoutError) {
          setActionError("Request timed out. The AI is taking longer than expected. Please try again.");
        } else {
          setActionError(
            err instanceof Error
              ? err.message
              : "Unexpected error generating reply"
          );
        }
      } finally {
        setGeneratingMap((prev) => {
          const next = { ...prev };
          delete next[reviewId];
          return next;
        });
      }
    },
    [mutate]
  );

  // 7) 답글 생성 중 체크
  const isGeneratingReply = useCallback(
    (reviewId: number) => Boolean(generatingMap[reviewId]),
    [generatingMap]
  );

  // 8) 상태 변경
  const updateStatus = useCallback(
    async (reviewId: number, status: ReviewStatus) => {
      setUpdatingStatusMap((prev) => ({ ...prev, [reviewId]: true }));
      setActionError(null);

      // 낙관적 업데이트 (즉시 UI 반영)
      mutate(
        reviews.map((r) => r.id === reviewId ? { ...r, status } : r),
        false // 서버 재검증 안 함
      );

      try {
        const res = await fetchWithTimeout(`/api/reviews/${reviewId}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ status }),
          timeout: 10000, // 10초
          retries: 1,
        });

        const json = await res.json() as UpdateStatusResponse;

        if (!json.ok) {
          throw new Error(json.error);
        }

        // 성공 시 캐시 재검증
        await mutate();
      } catch (err) {
        console.error("[useReviewDashboard] Failed to update status", err);
        
        if (err instanceof FetchTimeoutError) {
          setActionError("Request timed out. Please check your connection and try again.");
        } else {
          setActionError(
            err instanceof Error
              ? err.message
              : "Unexpected error updating status"
          );
        }
        // 실패 시 원래대로 복구
        await mutate();
      } finally {
        setUpdatingStatusMap((prev) => {
          const next = { ...prev };
          delete next[reviewId];
          return next;
        });
      }
    },
    [reviews, mutate]
  );

  // 9) 상태 변경 중 체크
  const isUpdatingStatus = useCallback(
    (reviewId: number) => Boolean(updatingStatusMap[reviewId]),
    [updatingStatusMap]
  );

  // 10) 선택된 리뷰 찾기
  const selectedReview = reviews.find((r) => r.id === selectedReviewId) ?? null;

  // 11) 에러 메시지 통합
  const error = swrError?.message || actionError || 
    (!salonId && authLoaded ? "No salon associated with your account." : null);

  return {
    reviews,
    selectedReview,
    selectedReviewId,
    setSelectedReviewId,
    isLoading: isLoading && reviews.length === 0, // 캐시 있으면 로딩 안 보임
    isValidating,
    error,
    refresh,
    generateReply,
    isGeneratingReply,
    updateStatus,
    isUpdatingStatus,
    salonId,
    salonName,
  };
}
