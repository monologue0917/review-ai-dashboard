// app/components/auth/ReviewDetailPanel.tsx
"use client";

import React, { useState } from "react";
import type { ReviewItem } from "@/lib/reviews/types";
import { RatingStars, SourceBadge, StatusBadge, Button, EmptyState } from "../ui";
import { 
  Sparkles, 
  Copy, 
  Check, 
  MessageSquare,
  Clock,
  RefreshCw,
  Wand2,
  Zap
} from "lucide-react";

type ReviewDetailPanelProps = {
  review: ReviewItem | null;
  onGenerateReply: (id: number) => void;
  isGeneratingReply: (id: number) => boolean;
};

/**
 * ReviewDetailPanel - 선택된 리뷰 상세 패널
 * 
 * 가시성 강화 버전:
 * - 헤더 배경 강화
 * - 정보 계층 명확화
 * - AI 답글 영역 강조
 */
export function ReviewDetailPanel({
  review,
  onGenerateReply,
  isGeneratingReply,
}: ReviewDetailPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (review?.latestReply?.text) {
      await navigator.clipboard.writeText(review.latestReply.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 리뷰 선택 안 됨
  if (!review) {
    return (
      <div className="h-full rounded-2xl border border-slate-200 bg-white p-8 flex items-center justify-center">
        <EmptyState
          icon={<MessageSquare className="h-8 w-8" />}
          title="Select a review"
          description="Click on a review from the list to view details and generate AI replies"
        />
      </div>
    );
  }

  const isGenerating = isGeneratingReply(review.id);
  const hasReply = !!review.latestReply;
  const status = hasReply ? 'approved' : 'new';

  return (
    <div className="h-full rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
      {/* 헤더 - 강화된 배경 */}
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 px-5 py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Review Details
          </h3>
          <StatusBadge status={status} size="sm" />
        </div>
      </div>

      {/* 스크롤 가능한 콘텐츠 영역 */}
      <div className="flex-1 overflow-auto p-5 space-y-5">
        {/* 고객 정보 */}
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-xl font-bold text-slate-600 shadow-sm">
            {(review.customerName || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-lg font-bold text-slate-900 truncate">
              {review.customerName || 'Unknown Customer'}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <RatingStars rating={review.rating} size="md" />
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm font-medium text-slate-600">
                {formatFullDate(review.reviewDate)}
              </span>
              <SourceBadge source={review.source} showLabel={true} />
            </div>
          </div>
        </div>

        {/* 리뷰 텍스트 */}
        <div>
          <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5" />
            Customer Review
          </h5>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
              {review.reviewText || '(No review text)'}
            </p>
          </div>
        </div>

        {/* AI 답글 섹션 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              AI Generated Reply
            </h5>
            {review.latestReply && (
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatReplyDate(review.latestReply.createdAt)}
              </span>
            )}
          </div>

          {review.latestReply ? (
            <div className="rounded-xl bg-gradient-to-br from-indigo-50 via-violet-50 to-purple-50 border-2 border-indigo-200 p-4 relative group shadow-sm">
              {/* 답글 텍스트 */}
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-medium pr-10">
                {review.latestReply.text}
              </p>

              {/* 복사 버튼 */}
              <button
                onClick={handleCopy}
                className="absolute top-3 right-3 p-2 rounded-lg bg-white border border-indigo-200 text-indigo-500 hover:text-indigo-700 hover:border-indigo-300 hover:shadow-md transition-all"
                title="Copy to clipboard"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>

              {/* 메타 정보 */}
              <div className="mt-4 pt-3 border-t border-indigo-200/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-indigo-200 text-xs font-semibold text-indigo-700">
                    {review.latestReply.source === 'auto' ? (
                      <>
                        <Zap className="h-3 w-3" />
                        Auto
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3" />
                        Manual
                      </>
                    )}
                  </span>
                  {review.latestReply.channel && (
                    <span className="px-2.5 py-1 rounded-full bg-white border border-indigo-200 text-xs font-semibold text-slate-600 capitalize">
                      {review.latestReply.channel}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 shadow-lg shadow-indigo-100">
                  <Wand2 className="h-8 w-8 text-indigo-600" />
                </div>
              </div>
              <p className="text-base font-semibold text-slate-700 mb-2">
                No AI reply yet
              </p>
              <p className="text-sm text-slate-500 mb-5">
                Generate a professional reply with one click
              </p>
              <Button
                variant="primary"
                size="md"
                loading={isGenerating}
                onClick={() => onGenerateReply(review.id)}
              >
                <Sparkles className="h-4 w-4" />
                Generate AI Reply
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 푸터 액션 */}
      {review.latestReply && (
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              loading={isGenerating}
              onClick={() => onGenerateReply(review.id)}
              className="flex-1"
            >
              <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
              Regenerate
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCopy}
              className="flex-1"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy Reply'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Utility Functions ===== */
function formatFullDate(dateStr: string | null): string {
  if (!dateStr) return '–';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '–';
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatReplyDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
