// app/reviews/ReviewsContent.tsx
"use client";

/**
 * 📝 ReviewsContent - 리뷰 관리 페이지 콘텐츠
 */

import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { TopBar } from "../components/auth/TopBar";
import { ReviewCard } from "../components/auth/ReviewCard";
import { ReviewDetailPanel } from "../components/auth/ReviewDetailPanel";
import { Button, EmptyState } from "../components/ui";

import { useReviewDashboard } from "../../lib/reviews/useReviewDashboard";
import { useRequireLogin } from "../../lib/auth/useRequireLogin";

import { 
  RotateCw, 
  AlertCircle, 
  MessageSquare, 
  Sparkles,
  Search,
  X
} from "lucide-react";

type StatusFilter = "all" | "new" | "replied";

export default function ReviewsContent() {
  const searchParams = useSearchParams();
  
  // 1) 로그인 체크
  const { auth, isLoaded: authLoaded } = useRequireLogin();

  // 2) 리뷰 데이터
  const {
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
  } = useReviewDashboard();

  // 3) URL 파라미터에서 초기값 설정
  const initialFilter = searchParams.get("filter") as StatusFilter | null;
  const initialSelected = searchParams.get("selected");

  // 4) 필터 & 검색 상태
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialFilter || "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // 5) URL에서 선택된 리뷰 ID 설정
  useEffect(() => {
    if (initialSelected) {
      const id = parseInt(initialSelected, 10);
      if (!isNaN(id)) {
        setSelectedReviewId(id);
      }
    }
  }, [initialSelected, setSelectedReviewId]);

  // 6) 필터링된 리뷰
  const filteredReviews = useMemo(() => {
    let filtered = reviews;

    // Status 필터
    if (statusFilter === "new") {
      filtered = filtered.filter((r) => !r.latestReply);
    } else if (statusFilter === "replied") {
      filtered = filtered.filter((r) => r.latestReply);
    }

    // 검색 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((review) =>
        (review.customerName?.toLowerCase().includes(query)) ||
        (review.reviewText?.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [reviews, statusFilter, searchQuery]);

  // 7) 필터 카운트
  const filterCounts = useMemo(() => ({
    all: reviews.length,
    new: reviews.filter((r) => !r.latestReply).length,
    replied: reviews.filter((r) => r.latestReply).length,
  }), [reviews]);

  // 8) 필터 버튼 데이터
  const filterButtons: { key: StatusFilter; label: string; count: number; color?: string }[] = [
    { key: "all", label: "All", count: filterCounts.all },
    { key: "new", label: "New", count: filterCounts.new, color: "amber" },
    { key: "replied", label: "AI Ready", count: filterCounts.replied, color: "emerald" },
  ];

  // 9) 로딩 중
  if (!authLoaded) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 text-indigo-600" />
          </div>
          <p className="text-sm font-medium text-slate-500">Loading reviews…</p>
        </div>
      </div>
    );
  }

  // 10) 살롱 없음
  if (authLoaded && !salonId) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
            <AlertCircle className="h-8 w-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">No salon connected</h2>
          <p className="mt-2 text-sm text-slate-600">
            Your account isn't linked to any business yet.
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* TopBar */}
      <TopBar 
        salonName={salonName}
        userEmail={auth?.email}
      />

      {/* Ultra Compact Header - 완전 한 줄 */}
      <div className="border-b border-slate-200 bg-white px-6 py-3">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
          {/* 좌측: 제목 + 통계 + 필터 */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* 제목 + 통계 */}
            <div className="flex items-center gap-3 shrink-0">
              <h1 className="text-lg font-bold text-slate-900">
                Reviews
              </h1>
              <div className="h-4 w-px bg-slate-200" />
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-slate-700">{filterCounts.all}</span>
                <span className="mx-1">total</span>
                {filterCounts.new > 0 && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="ml-1 font-semibold text-amber-600">{filterCounts.new}</span>
                    <span className="text-amber-600 ml-0.5">needs reply</span>
                  </>
                )}
              </p>
            </div>

            {/* 필터 탭 */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 border border-slate-200">
              {filterButtons.map((btn) => {
                const isActive = statusFilter === btn.key;
                return (
                  <button
                    key={btn.key}
                    onClick={() => setStatusFilter(btn.key)}
                    className={`
                      px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150
                      ${isActive
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                      }
                    `}
                  >
                    {btn.label}
                    <span className={`
                      ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold
                      ${isActive
                        ? btn.color === 'amber' 
                          ? 'bg-amber-100 text-amber-700'
                          : btn.color === 'emerald'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-600'
                        : 'bg-slate-200/70 text-slate-500'
                      }
                    `}>
                      {btn.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 우측: 검색 + 새로고침 */}
          <div className="flex items-center gap-2 shrink-0">
            {/* 검색 */}
            <div className={`
              relative transition-all duration-200
              ${isSearchFocused ? 'w-64' : 'w-48'}
            `}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 bg-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* 새로고침 */}
            <Button
              variant="secondary"
              size="sm"
              loading={isLoading}
              onClick={() => void refresh()}
              className="px-3"
            >
              <RotateCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* 에러 메시지 */}
        {error && (
          <div className="mx-6 mt-4">
            <div className="mx-auto max-w-7xl rounded-xl border border-rose-200 bg-gradient-to-r from-rose-50 to-pink-50 px-5 py-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />
                <p className="text-sm text-rose-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Grid: Reviews List + Detail Panel */}
        <div className="flex-1 overflow-hidden px-6 py-5">
          <div className="mx-auto max-w-7xl h-full grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
            {/* Reviews List */}
            <div className="overflow-auto space-y-3 pr-2 -mr-2">
              {filteredReviews.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-12">
                  <EmptyState
                    icon={<MessageSquare className="h-8 w-8" />}
                    title={searchQuery ? "No matching reviews" : statusFilter !== "all" ? "No reviews in this category" : "No reviews yet"}
                    description={
                      searchQuery
                        ? "Try adjusting your search term"
                        : statusFilter !== "all"
                        ? "Reviews will appear here when available"
                        : "Reviews will appear here once imported from Google or Yelp"
                    }
                    action={
                      (searchQuery || statusFilter !== "all") ? (
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => {
                            setSearchQuery("");
                            setStatusFilter("all");
                          }}
                        >
                          Clear Filters
                        </Button>
                      ) : undefined
                    }
                  />
                </div>
              ) : (
                filteredReviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    isSelected={review.id === selectedReviewId}
                    onClick={() => setSelectedReviewId(review.id)}
                    onGenerateReply={() => void generateReply(review.id)}
                    isGenerating={isGeneratingReply(review.id)}
                  />
                ))
              )}
            </div>

            {/* Detail Panel */}
            <div className="hidden lg:block overflow-auto">
              <div className="sticky top-0">
                <ReviewDetailPanel
                  review={selectedReview}
                  onGenerateReply={(id) => void generateReply(id)}
                  isGeneratingReply={isGeneratingReply}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
