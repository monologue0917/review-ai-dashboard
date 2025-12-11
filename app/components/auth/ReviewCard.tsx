// app/components/auth/ReviewCard.tsx
"use client";

import React from "react";
import type { ReviewItem } from "@/lib/reviews/types";
import { RatingStars, SourceBadge, StatusBadge, Button, AIReadyBadge } from "../ui";
import { Sparkles, MessageSquare } from "lucide-react";

type ReviewCardProps = {
  review: ReviewItem;
  isSelected: boolean;
  onClick: () => void;
  onGenerateReply: () => void;
  isGenerating: boolean;
};

/**
 * ReviewCard - 리뷰 카드 컴포넌트
 * 
 * 가시성 강화 버전:
 * - 이름 더 크게
 * - 날짜 더 눈에 띄게
 * - 상태 뱃지 강화
 * - AI Ready 명확하게
 */
export function ReviewCard({
  review,
  isSelected,
  onClick,
  onGenerateReply,
  isGenerating,
}: ReviewCardProps) {
  const hasAIReply = !!review.latestReply;
  const status = hasAIReply ? 'approved' : 'new';

  return (
    <div
      onClick={onClick}
      className={`
        group relative cursor-pointer rounded-2xl border bg-white p-5 transition-all duration-200
        hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-0.5
        ${isSelected 
          ? 'border-indigo-500 ring-2 ring-indigo-100 shadow-lg shadow-indigo-100' 
          : 'border-slate-200 hover:border-slate-300'
        }
      `}
    >
      {/* 선택 인디케이터 */}
      {isSelected && (
        <div className="absolute -left-px top-4 bottom-4 w-1 rounded-r-full bg-gradient-to-b from-indigo-500 to-violet-500" />
      )}

      {/* 상단: 고객 정보 + 소스 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* 아바타 */}
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-base font-bold text-slate-600 shadow-sm">
            {(review.customerName || 'U').charAt(0).toUpperCase()}
          </div>
          
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {review.customerName || 'Unknown Customer'}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <RatingStars rating={review.rating} size="sm" />
              <span className="text-slate-300">•</span>
              <span className="text-sm font-medium text-slate-600">
                {formatDate(review.reviewDate)}
              </span>
            </div>
          </div>
        </div>

        <SourceBadge source={review.source} showLabel={false} />
      </div>

      {/* 리뷰 텍스트 */}
      <p className="text-sm text-slate-700 line-clamp-2 mb-4 leading-relaxed font-medium">
        {review.reviewText || '(No review text)'}
      </p>

      {/* 하단: 상태 + 액션 */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <div className="flex items-center gap-3">
          <StatusBadge status={status} />
          
          {hasAIReply && (
            <AIReadyBadge ready={true} size="sm" />
          )}
        </div>

        <div className="flex items-center gap-2">
          {!hasAIReply ? (
            <Button
              variant="primary"
              size="sm"
              loading={isGenerating}
              onClick={(e) => {
                e?.stopPropagation();
                onGenerateReply();
              }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generate Reply
            </Button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              View Reply
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
