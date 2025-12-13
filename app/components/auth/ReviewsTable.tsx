// app/components/auth/ReviewsTable.tsx
"use client";

import React from "react";
import type { ReviewItem } from "@/lib/reviews/types";
import { RatingStars, SourceBadge, StatusBadge, Button, RiskTagsDisplay } from "../ui";
import { Sparkles, MessageSquare, AlertTriangle, ChevronUp, ChevronDown, Check } from "lucide-react";

export type SortField = 'date' | 'rating' | 'status' | 'source';
export type SortDirection = 'asc' | 'desc';

type ReviewsTableProps = {
  reviews: ReviewItem[];
  selectedReviewId: number | null;
  onSelectReview: (id: number) => void;
  onGenerateReply: (id: number) => void;
  isGeneratingReply: (id: number) => boolean;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
};

/**
 * ReviewsTable - 테이블 뷰 컴포넌트 (워크플로우 상태 지원)
 */
export function ReviewsTable({
  reviews,
  selectedReviewId,
  onSelectReview,
  onGenerateReply,
  isGeneratingReply,
  sortField,
  sortDirection,
  onSort,
}: ReviewsTableProps) {
  
  // 정렬 아이콘 렌더링
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronUp className="h-3 w-3 text-slate-300" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-3 w-3 text-indigo-600" />
      : <ChevronDown className="h-3 w-3 text-indigo-600" />;
  };

  // 헤더 클릭 핸들러
  const handleHeaderClick = (field: SortField) => {
    onSort(field);
  };

  if (reviews.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          {/* 헤더 */}
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th 
                className="px-4 py-3 text-left cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleHeaderClick('date')}
              >
                <div className="flex items-center gap-1 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Date
                  {renderSortIcon('date')}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleHeaderClick('source')}
              >
                <div className="flex items-center gap-1 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Source
                  {renderSortIcon('source')}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleHeaderClick('rating')}
              >
                <div className="flex items-center gap-1 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Rating
                  {renderSortIcon('rating')}
                </div>
              </th>
              <th className="px-4 py-3 text-left">
                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Customer
                </div>
              </th>
              <th className="px-4 py-3 text-left">
                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Review
                </div>
              </th>
              <th 
                className="px-4 py-3 text-left cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => handleHeaderClick('status')}
              >
                <div className="flex items-center gap-1 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Status
                  {renderSortIcon('status')}
                </div>
              </th>
              <th className="px-4 py-3 text-center">
                <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </div>
              </th>
            </tr>
          </thead>
          
          {/* 바디 */}
          <tbody className="divide-y divide-slate-100">
            {reviews.map((review) => {
              const isSelected = review.id === selectedReviewId;
              const isNegative = (review.rating ?? 5) <= 3;
              const hasRiskTags = Array.isArray(review.riskTags) && review.riskTags.length > 0;
              const isGenerating = isGeneratingReply(review.id);
              const isNew = review.status === 'new';
              const isPosted = review.status === 'posted';
              const isApproved = review.status === 'approved';
              
              return (
                <tr 
                  key={review.id}
                  onClick={() => onSelectReview(review.id)}
                  className={`
                    cursor-pointer transition-colors
                    ${isSelected 
                      ? 'bg-indigo-50 hover:bg-indigo-100' 
                      : isNegative && isNew
                        ? 'bg-amber-50/50 hover:bg-amber-50'
                        : 'hover:bg-slate-50'
                    }
                  `}
                >
                  {/* Date */}
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-slate-700">
                      {formatDate(review.reviewDate)}
                    </span>
                  </td>
                  
                  {/* Source */}
                  <td className="px-4 py-3">
                    <SourceBadge source={review.source} showLabel={false} />
                  </td>
                  
                  {/* Rating */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <RatingStars rating={review.rating} size="sm" />
                      {isNegative && isNew && (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 ml-1" />
                      )}
                    </div>
                  </td>
                  
                  {/* Customer */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`
                        flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold
                        ${isNegative 
                          ? 'bg-amber-100 text-amber-700' 
                          : 'bg-slate-100 text-slate-600'
                        }
                      `}>
                        {(review.customerName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-slate-900 truncate max-w-[120px]">
                        {review.customerName || 'Unknown'}
                      </span>
                    </div>
                  </td>
                  
                  {/* Review Text + Risk Tags */}
                  <td className="px-4 py-3 max-w-[300px]">
                    <p className="text-sm text-slate-600 truncate">
                      {review.reviewText || '(No text)'}
                    </p>
                    {hasRiskTags && (
                      <div className="mt-1">
                        <RiskTagsDisplay tags={review.riskTags} size="sm" maxVisible={2} />
                      </div>
                    )}
                  </td>
                  
                  {/* Status */}
                  <td className="px-4 py-3">
                    <StatusBadge status={review.status} size="sm" />
                  </td>
                  
                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center">
                      {isNew ? (
                        <Button
                          variant="primary"
                          size="sm"
                          loading={isGenerating}
                          onClick={(e) => {
                            e?.stopPropagation();
                            onGenerateReply(review.id);
                          }}
                          className="text-xs px-2 py-1"
                        >
                          <Sparkles className="h-3 w-3" />
                          <span className="hidden xl:inline">Generate</span>
                        </Button>
                      ) : isPosted ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600">
                          <Check className="h-3.5 w-3.5" />
                          Done
                        </span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectReview(review.id);
                          }}
                          className={`
                            inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-colors
                            ${isApproved
                              ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                              : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                            }
                          `}
                        >
                          <MessageSquare className="h-3 w-3" />
                          <span className="hidden xl:inline">
                            {isApproved ? 'Post' : 'Review'}
                          </span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* 푸터 - 요약 정보 */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
        <p className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-700">{reviews.length}</span> reviews
          {reviews.filter(r => r.status === 'new').length > 0 && (
            <span>
              {' '}· <span className="font-semibold text-violet-600">
                {reviews.filter(r => r.status === 'new').length}
              </span> new
            </span>
          )}
          {reviews.filter(r => r.status === 'drafted').length > 0 && (
            <span>
              {' '}· <span className="font-semibold text-amber-600">
                {reviews.filter(r => r.status === 'drafted').length}
              </span> drafts
            </span>
          )}
          {reviews.filter(r => r.status === 'approved').length > 0 && (
            <span>
              {' '}· <span className="font-semibold text-emerald-600">
                {reviews.filter(r => r.status === 'approved').length}
              </span> ready
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

/* ===== Utility ===== */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '–';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '–';
  
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
