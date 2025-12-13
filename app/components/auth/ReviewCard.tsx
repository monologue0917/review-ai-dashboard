// app/components/auth/ReviewCard.tsx
"use client";

import React from "react";
import type { ReviewItem } from "@/lib/reviews/types";
import { RatingStars, SourceBadge, StatusBadge, Button, AIReadyBadge, RiskTagsDisplay } from "../ui";
import { Sparkles, MessageSquare, AlertTriangle, Check } from "lucide-react";

type ReviewCardProps = {
  review: ReviewItem;
  isSelected: boolean;
  onClick: () => void;
  onGenerateReply: () => void;
  isGenerating: boolean;
};

/**
 * ReviewCard - 리뷰 카드 컴포넌트 (워크플로우 상태 + Risk Tags)
 */
export function ReviewCard({
  review,
  isSelected,
  onClick,
  onGenerateReply,
  isGenerating,
}: ReviewCardProps) {
  const hasAIReply = !!review.latestReply;
  
  // Risk Tags 관련
  const hasRiskTags = Array.isArray(review.riskTags) && review.riskTags.length > 0;
  const isNegativeReview = (review.rating ?? 5) <= 3;

  // 상태별 표시
  const isPosted = review.status === 'posted';
  const isApproved = review.status === 'approved';

  return (
    <div
      onClick={onClick}
      className={`
        group relative cursor-pointer rounded-xl border bg-white p-4 transition-all duration-200
        hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-0.5
        ${isSelected 
          ? 'border-indigo-500 ring-2 ring-indigo-100 shadow-lg shadow-indigo-100' 
          : isNegativeReview && review.status === 'new'
            ? 'border-amber-200 hover:border-amber-300'
            : 'border-slate-200 hover:border-slate-300'
        }
      `}
    >
      {/* 부정 리뷰 인디케이터 (좌측 경고색) */}
      {isNegativeReview && review.status === 'new' && (
        <div className="absolute -left-px top-3 bottom-3 w-1 rounded-r-full bg-gradient-to-b from-amber-400 to-orange-500" />
      )}
      
      {/* 선택 인디케이터 */}
      {isSelected && (
        <div className="absolute -left-px top-3 bottom-3 w-1 rounded-r-full bg-gradient-to-b from-indigo-500 to-violet-500" />
      )}

      {/* 상단: 고객 정보 + 소스 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {/* 아바타 */}
          <div className={`
            flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold shadow-sm
            ${isNegativeReview 
              ? 'bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700' 
              : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600'
            }
          `}>
            {(review.customerName || 'U').charAt(0).toUpperCase()}
          </div>
          
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-slate-900">
                {review.customerName || 'Unknown Customer'}
              </h3>
              {/* 부정 리뷰 경고 아이콘 */}
              {isNegativeReview && review.status === 'new' && (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <RatingStars rating={review.rating} size="sm" />
              <span className="text-slate-300">•</span>
              <span className="text-xs font-medium text-slate-500">
                {formatDate(review.reviewDate)}
              </span>
            </div>
          </div>
        </div>

        <SourceBadge source={review.source} showLabel={false} />
      </div>

      {/* 리뷰 텍스트 */}
      <p className="text-[13px] text-slate-700 line-clamp-2 mb-3 leading-relaxed">
        {review.reviewText || '(No review text)'}
      </p>

      {/* Risk Tags - 부정 리뷰이고 태그가 있을 때만 표시 */}
      {hasRiskTags && (
        <div className="mb-3">
          <RiskTagsDisplay 
            tags={review.riskTags} 
            size="sm" 
            maxVisible={2}
          />
        </div>
      )}

      {/* 하단: 상태 + 액션 */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <StatusBadge status={review.status} size="sm" />
          
          {/* Posted 완료 표시 */}
          {isPosted && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-100 text-[10px] font-semibold text-sky-700">
              <Check className="h-2.5 w-2.5" />
              Done
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* New 상태 - 클릭 유도 */}
          {review.status === 'new' && !hasAIReply && (
            <span className="text-xs text-slate-500">
              Click to generate reply →
            </span>
          )}

          {/* 답글 있음 - Review/View 버튼 */}
          {hasAIReply && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className={`
                inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors
                ${isApproved 
                  ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                  : isPosted
                  ? 'text-sky-600 bg-sky-50 hover:bg-sky-100'
                  : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                }
              `}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {isApproved ? 'Ready to Post' : isPosted ? 'View' : 'Review Draft'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===== Utility ===== */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '–';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '–';
  
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}
