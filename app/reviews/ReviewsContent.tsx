// app/reviews/ReviewsContent.tsx
"use client";

/**
 * 📝 ReviewsContent - 리뷰 관리 페이지 (드롭다운 필터)
 */

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { TopBar } from "../components/auth/TopBar";
import { ReviewCard } from "../components/auth/ReviewCard";
import { ReviewDetailPanel } from "../components/auth/ReviewDetailPanel";
import { ReviewsTable, SortField, SortDirection } from "../components/auth/ReviewsTable";
import { 
  Button, 
  EmptyState, 
  ReviewListSkeleton, 
  DetailPanelSkeleton,
  ReviewTableSkeleton,
  ViewModeToggle,
  ViewMode,
  StatusFilterSelect,
  StatusFilterOption,
} from "../components/ui";

import { useReviewDashboard } from "../../lib/reviews/useReviewDashboard";
import { useRequireLogin } from "../../lib/auth/useRequireLogin";
import type { ReviewStatus } from "@/lib/reviews/types";

import { 
  RotateCw, 
  AlertCircle, 
  MessageSquare,
  Search,
  X,
  AlertTriangle,
} from "lucide-react";

// localStorage 키
const VIEW_MODE_STORAGE_KEY = 'reviewai_view_mode';

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
    updateStatus,
    isUpdatingStatus,
    salonId,
    salonName,
  } = useReviewDashboard();

  // 3) URL 파라미터에서 초기값 설정
  const initialFilter = searchParams.get("filter") as StatusFilterOption | null;
  const initialSelected = searchParams.get("selected");

  // 4) 필터 & 검색 상태
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>(initialFilter || "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // 5) 뷰 모드 상태 (localStorage에서 복원)
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [isMobile, setIsMobile] = useState(false);

  // 6) 정렬 상태
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // 7) 모바일 상세 패널 모달
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  // 8) 클라이언트에서만 localStorage 읽기 + 화면 크기 감지
  useEffect(() => {
    const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (saved === 'card' || saved === 'table') {
      setViewMode(saved);
    }

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 9) 뷰 모드 변경 핸들러
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  }, []);

  // 10) 정렬 핸들러
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }, [sortField]);

  // 11) URL에서 선택된 리뷰 ID 설정
  useEffect(() => {
    if (initialSelected) {
      const id = parseInt(initialSelected, 10);
      if (!isNaN(id)) {
        setSelectedReviewId(id);
      }
    }
  }, [initialSelected, setSelectedReviewId]);

  // 12) 리뷰 선택 시 모바일에서 상세 패널 열기
  const handleSelectReview = useCallback((id: number) => {
    setSelectedReviewId(id);
    if (window.innerWidth < 1024) {
      setShowMobileDetail(true);
    }
  }, [setSelectedReviewId]);

  // 13) 필터링된 리뷰
  const filteredReviews = useMemo(() => {
    let filtered = reviews;

    // 상태 필터
    if (statusFilter !== 'all') {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    // 검색 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((review) =>
        (review.customerName?.toLowerCase().includes(query)) ||
        (review.reviewText?.toLowerCase().includes(query)) ||
        (Array.isArray(review.riskTags) && review.riskTags.some(tag => tag.toLowerCase().includes(query)))
      );
    }

    return filtered;
  }, [reviews, statusFilter, searchQuery]);

  // 14) 정렬된 리뷰
  const sortedReviews = useMemo(() => {
    const sorted = [...filteredReviews];
    
    const statusOrder: Record<ReviewStatus, number> = {
      new: 0,
      drafted: 1,
      approved: 2,
      posted: 3,
    };
    
    sorted.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'date':
          const dateA = a.reviewDate ? new Date(a.reviewDate).getTime() : 0;
          const dateB = b.reviewDate ? new Date(b.reviewDate).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'rating':
          comparison = (a.rating ?? 0) - (b.rating ?? 0);
          break;
        case 'status':
          comparison = statusOrder[a.status] - statusOrder[b.status];
          break;
        case 'source':
          comparison = (a.source ?? '').localeCompare(b.source ?? '');
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [filteredReviews, sortField, sortDirection]);

  // 15) 필터 카운트
  const filterCounts = useMemo(() => ({
    all: reviews.length,
    new: reviews.filter((r) => r.status === 'new').length,
    drafted: reviews.filter((r) => r.status === 'drafted').length,
    approved: reviews.filter((r) => r.status === 'approved').length,
    posted: reviews.filter((r) => r.status === 'posted').length,
  }), [reviews]);

  // 16) 실제 뷰 모드 (모바일에서는 카드 뷰 강제)
  const effectiveViewMode = isMobile ? 'card' : viewMode;

  // 17) 로딩 중 (스켈레톤 UI)
  if (!authLoaded || isLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="hidden lg:block h-16 border-b border-slate-200 bg-white" />
        
        <div className="border-b border-slate-200 bg-white px-4 lg:px-6 py-3">
          <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-6 w-20 bg-slate-200 rounded animate-pulse" />
              <div className="h-10 w-32 bg-slate-200 rounded-lg animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-10 w-20 bg-slate-200 rounded-lg animate-pulse" />
              <div className="h-10 w-48 bg-slate-200 rounded-lg animate-pulse" />
              <div className="h-10 w-24 bg-slate-200 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden px-4 lg:px-5 py-4">
          <div className="mx-auto max-w-7xl h-full grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
            {effectiveViewMode === 'table' ? (
              <ReviewTableSkeleton rows={8} />
            ) : (
              <ReviewListSkeleton count={5} />
            )}
            <div className="hidden lg:block">
              <DetailPanelSkeleton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 18) 살롱 없음
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

      {/* Header - 한 줄로 정리 */}
      <div className="border-b border-slate-200 bg-white px-4 lg:px-6 py-3">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
          {/* 좌측: 제목 + 필터 드롭다운 */}
          <div className="flex items-center gap-3">
            <h1 className="text-base lg:text-lg font-bold text-slate-900">
              Reviews
            </h1>
            
            {/* 필터 드롭다운 */}
            <StatusFilterSelect
              value={statusFilter}
              onChange={setStatusFilter}
              counts={filterCounts}
            />
          </div>

          {/* 우측: 뷰 토글 + 검색 + 새로고침 */}
          <div className="flex items-center gap-2">
            {/* 뷰 모드 토글 - 데스크탑에서만 */}
            <div className="hidden lg:block">
              <ViewModeToggle 
                mode={viewMode} 
                onChange={handleViewModeChange}
              />
            </div>

            {/* 검색 - 모바일 반응형 개선 */}
            <div className={`
              relative transition-all duration-200
              ${isSearchFocused ? 'w-40 sm:w-64' : 'w-28 sm:w-48'}
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

        {/* Main Grid */}
        <div className="flex-1 overflow-hidden px-4 lg:px-5 py-4">
          <div className="mx-auto max-w-7xl h-full grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
            {/* Reviews List or Table */}
            <div className="overflow-auto pr-1 -mr-1 lg:pr-2 lg:-mr-2">
              {sortedReviews.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 lg:p-12">
                  <EmptyState
                    icon={<MessageSquare className="h-8 w-8" />}
                    title={
                      searchQuery 
                        ? "No matching reviews" 
                        : statusFilter !== "all" 
                        ? `No ${statusFilter} reviews` 
                        : "No reviews yet"
                    }
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
              ) : effectiveViewMode === 'table' ? (
                <ReviewsTable
                  reviews={sortedReviews}
                  selectedReviewId={selectedReviewId}
                  onSelectReview={handleSelectReview}
                  onGenerateReply={(id) => void generateReply(id)}
                  isGeneratingReply={isGeneratingReply}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                />
              ) : (
                <div className="space-y-2.5">
                  {sortedReviews.map((review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      isSelected={review.id === selectedReviewId}
                      onClick={() => handleSelectReview(review.id)}
                      onGenerateReply={() => void generateReply(review.id)}
                      isGenerating={isGeneratingReply(review.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Detail Panel - 데스크탑만 */}
            <div className="hidden lg:block overflow-auto">
              <div className="sticky top-0">
                <ReviewDetailPanel
                  review={selectedReview}
                  onGenerateReply={(id) => void generateReply(id)}
                  isGeneratingReply={isGeneratingReply}
                  onUpdateStatus={updateStatus}
                  isUpdatingStatus={isUpdatingStatus}
                  onRefresh={refresh}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Detail Modal */}
      {showMobileDetail && selectedReview && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowMobileDetail(false)}
          />
          
          <div className="absolute inset-x-0 bottom-0 max-h-[90vh] bg-white rounded-t-2xl overflow-hidden animate-slide-up">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between z-10">
              <h3 className="text-base font-semibold text-slate-900">Review Details</h3>
              <button
                onClick={() => setShowMobileDetail(false)}
                className="flex items-center justify-center h-8 w-8 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="overflow-auto max-h-[calc(90vh-56px)] p-4">
              <ReviewDetailPanel
                review={selectedReview}
                onGenerateReply={(id) => void generateReply(id)}
                isGeneratingReply={isGeneratingReply}
                onUpdateStatus={updateStatus}
                isUpdatingStatus={isUpdatingStatus}
                onRefresh={refresh}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
