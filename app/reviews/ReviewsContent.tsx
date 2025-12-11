// app/reviews/ReviewsContent.tsx
"use client";

/**
 * 📝 ReviewsContent - 리뷰 관리 페이지 콘텐츠 (반응형)
 */

import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { TopBar } from "../components/auth/TopBar";
import { ReviewCard } from "../components/auth/ReviewCard";
import { ReviewDetailPanel } from "../components/auth/ReviewDetailPanel";
import { Button, EmptyState, ReviewListSkeleton, DetailPanelSkeleton } from "../components/ui";

import { useReviewDashboard } from "../../lib/reviews/useReviewDashboard";
import { useRequireLogin } from "../../lib/auth/useRequireLogin";

import { 
  RotateCw, 
  AlertCircle, 
  MessageSquare,
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

  // 5) 모바일 상세 패널 모달
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  // 6) URL에서 선택된 리뷰 ID 설정
  useEffect(() => {
    if (initialSelected) {
      const id = parseInt(initialSelected, 10);
      if (!isNaN(id)) {
        setSelectedReviewId(id);
      }
    }
  }, [initialSelected, setSelectedReviewId]);

  // 7) 리뷰 선택 시 모바일에서 상세 패널 열기
  const handleSelectReview = (id: number) => {
    setSelectedReviewId(id);
    // 모바일에서만 모달 열기
    if (window.innerWidth < 1024) {
      setShowMobileDetail(true);
    }
  };

  // 8) 필터링된 리뷰
  const filteredReviews = useMemo(() => {
    let filtered = reviews;

    if (statusFilter === "new") {
      filtered = filtered.filter((r) => !r.latestReply);
    } else if (statusFilter === "replied") {
      filtered = filtered.filter((r) => r.latestReply);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((review) =>
        (review.customerName?.toLowerCase().includes(query)) ||
        (review.reviewText?.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [reviews, statusFilter, searchQuery]);

  // 9) 필터 카운트
  const filterCounts = useMemo(() => ({
    all: reviews.length,
    new: reviews.filter((r) => !r.latestReply).length,
    replied: reviews.filter((r) => r.latestReply).length,
  }), [reviews]);

  // 10) 필터 버튼 데이터
  const filterButtons: { key: StatusFilter; label: string; count: number; color?: string }[] = [
    { key: "all", label: "All", count: filterCounts.all },
    { key: "new", label: "New", count: filterCounts.new, color: "amber" },
    { key: "replied", label: "AI Ready", count: filterCounts.replied, color: "emerald" },
  ];

  // 11) 로딩 중 (스켈레톤 UI)
  if (!authLoaded || isLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TopBar - 데스크탑만 */}
        <div className="hidden lg:block h-16 border-b border-slate-200 bg-white" />
        
        {/* Header Skeleton */}
        <div className="border-b border-slate-200 bg-white px-4 lg:px-6 py-3">
          <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="h-6 w-16 sm:w-20 bg-slate-200 rounded animate-pulse" />
              <div className="hidden sm:block h-4 w-px bg-slate-200" />
              <div className="hidden sm:block h-4 w-32 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-10 w-28 sm:w-48 bg-slate-200 rounded-lg animate-pulse" />
              <div className="h-10 w-10 sm:w-24 bg-slate-200 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="flex-1 overflow-hidden px-4 lg:px-6 py-5">
          <div className="mx-auto max-w-7xl h-full grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
            <ReviewListSkeleton count={5} />
            <div className="hidden lg:block">
              <DetailPanelSkeleton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 12) 살롱 없음
  if (authLoaded && !salonId) {
    return (
      <main className="flex flex-1 items-center justify-center p-4 lg:p-6">
        <div className="max-w-md rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6 lg:p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-14 w-14 lg:h-16 lg:w-16 items-center justify-center rounded-2xl bg-amber-100">
            <AlertCircle className="h-7 w-7 lg:h-8 lg:w-8 text-amber-600" />
          </div>
          <h2 className="text-lg lg:text-xl font-bold text-slate-900">No salon connected</h2>
          <p className="mt-2 text-sm text-slate-600">
            Your account isn't linked to any business yet.
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* TopBar - 데스크탑만 */}
      <div className="hidden lg:block">
        <TopBar 
          salonName={salonName}
          userEmail={auth?.email}
        />
      </div>

      {/* Compact Header - 반응형 */}
      <div className="border-b border-slate-200 bg-white px-4 lg:px-6 py-3">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* 좌측: 제목 + 통계 + 필터 */}
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 overflow-x-auto pb-1 sm:pb-0">
            {/* 제목 + 통계 */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <h1 className="text-base lg:text-lg font-bold text-slate-900">
                Reviews
              </h1>
              <div className="hidden sm:block h-4 w-px bg-slate-200" />
              <p className="hidden sm:block text-sm text-slate-500">
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
                      px-2 sm:px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 whitespace-nowrap
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
              relative transition-all duration-200 flex-1 sm:flex-none
              ${isSearchFocused ? 'sm:w-64' : 'sm:w-48'}
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
          <div className="mx-4 lg:mx-6 mt-4">
            <div className="mx-auto max-w-7xl rounded-xl border border-rose-200 bg-gradient-to-r from-rose-50 to-pink-50 px-4 lg:px-5 py-3 lg:py-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />
                <p className="text-sm text-rose-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Grid: Reviews List + Detail Panel */}
        <div className="flex-1 overflow-hidden px-4 lg:px-6 py-4 lg:py-5">
          <div className="mx-auto max-w-7xl h-full grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4 lg:gap-6">
            {/* Reviews List */}
            <div className="overflow-auto space-y-3 pr-1 -mr-1 lg:pr-2 lg:-mr-2">
              {filteredReviews.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 lg:p-12">
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
                    onClick={() => handleSelectReview(review.id)}
                    onGenerateReply={() => void generateReply(review.id)}
                    isGenerating={isGeneratingReply(review.id)}
                  />
                ))
              )}
            </div>

            {/* Detail Panel - 데스크탑만 */}
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

      {/* Mobile Detail Modal */}
      {showMobileDetail && selectedReview && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowMobileDetail(false)}
          />
          
          {/* Modal */}
          <div className="absolute inset-x-0 bottom-0 max-h-[90vh] bg-white rounded-t-2xl overflow-hidden animate-slide-up">
            {/* Handle */}
            <div className="sticky top-0 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between z-10">
              <h3 className="text-base font-semibold text-slate-900">Review Details</h3>
              <button
                onClick={() => setShowMobileDetail(false)}
                className="flex items-center justify-center h-8 w-8 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="overflow-auto max-h-[calc(90vh-56px)] p-4">
              <ReviewDetailPanel
                review={selectedReview}
                onGenerateReply={(id) => void generateReply(id)}
                isGeneratingReply={isGeneratingReply}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
