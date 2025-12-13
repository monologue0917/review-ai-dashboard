// app/components/auth/ReviewDetailPanel.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { ReviewItem, ReviewStatus, ReplyStatus } from "@/lib/reviews/types";
import { getAuthHeaders } from "@/lib/auth/useAuthInfo";
import { fetchWithTimeout, FetchTimeoutError } from "@/lib/utils/fetchWithTimeout";
import { RatingStars, SourceBadge, StatusBadge, Button, EmptyState, RiskTagsDisplay, ConfirmModal } from "../ui";
import { 
  Sparkles, 
  Copy, 
  Check, 
  MessageSquare,
  Clock,
  RefreshCw,
  Wand2,
  Zap,
  AlertTriangle,
  Save,
  Send,
  AlertCircle,
  Lock,
  ExternalLink,
} from "lucide-react";

type ReviewDetailPanelProps = {
  review: ReviewItem | null;
  onGenerateReply: (id: number) => void;
  isGeneratingReply: (id: number) => boolean;
  onUpdateStatus?: (id: number, status: ReviewStatus) => void;
  isUpdatingStatus?: (id: number) => boolean;
  onRefresh?: () => void;
};

/**
 * ReviewDetailPanel - 리뷰 상세 + 답글 편집/저장/게시
 */
export function ReviewDetailPanel({
  review,
  onGenerateReply,
  isGeneratingReply,
  onUpdateStatus,
  isUpdatingStatus,
  onRefresh,
}: ReviewDetailPanelProps) {
  // 로컬 상태
  const [editedText, setEditedText] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [postError, setPostError] = useState<string | null>(null);
  
  // ⚠️ 게시 확인 모달
  const [showPostConfirm, setShowPostConfirm] = useState(false);

  // 리뷰 변경 시 텍스트 초기화
  useEffect(() => {
    if (review?.latestReply) {
      const text = review.latestReply.finalText || review.latestReply.text || "";
      setEditedText(text);
      setOriginalText(text);
      setSaveError(null);
      setPostError(review.latestReply.lastError || null);
    } else {
      setEditedText("");
      setOriginalText("");
      setSaveError(null);
      setPostError(null);
    }
  }, [review?.id, review?.latestReply?.id]);

  // 변경사항 있는지 확인
  const hasChanges = editedText !== originalText;

  // 복사
  const handleCopy = async () => {
    if (editedText) {
      await navigator.clipboard.writeText(editedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 드래프트 저장
  const handleSaveDraft = useCallback(async () => {
    if (!review?.latestReply?.id) return;
    
    setIsSaving(true);
    setSaveError(null);

    try {
      const res = await fetchWithTimeout(`/api/replies/${review.latestReply.id}`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ finalText: editedText }),
        timeout: 10000,
        retries: 1,
      });

      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || "Failed to save");
      }

      setOriginalText(editedText);
      onRefresh?.();
    } catch (err) {
      if (err instanceof FetchTimeoutError) {
        setSaveError("Request timed out. Please try again.");
      } else {
        setSaveError(err instanceof Error ? err.message : "Save failed");
      }
    } finally {
      setIsSaving(false);
    }
  }, [review?.latestReply?.id, editedText, onRefresh]);

  // Post 버튼 클릭 → 모달 열기
  const handlePostClick = () => {
    setShowPostConfirm(true);
  };

  // 실제 게시 (모달에서 확인 후)
  const handleConfirmPost = useCallback(async () => {
    if (!review?.latestReply?.id) return;
    
    // 변경사항 있으면 먼저 저장
    if (hasChanges) {
      await handleSaveDraft();
    }

    setIsPosting(true);
    setPostError(null);

    try {
      // 게시는 Google API 호출이므로 30초 타임아웃
      const res = await fetchWithTimeout(`/api/replies/${review.latestReply.id}/post`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        timeout: 30000, // 30초
        retries: 1,
      });

      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || "Failed to post");
      }

      if (json.data.status === 'failed') {
        setPostError(json.data.lastError || "Post failed");
      } else {
        setShowPostConfirm(false);
        onRefresh?.();
      }
    } catch (err) {
      if (err instanceof FetchTimeoutError) {
        setPostError("Request timed out. Google may be slow. Please try again.");
      } else {
        setPostError(err instanceof Error ? err.message : "Post failed");
      }
    } finally {
      setIsPosting(false);
    }
  }, [review?.latestReply?.id, hasChanges, handleSaveDraft, onRefresh]);

  // 리뷰 선택 안 됨
  if (!review) {
    return (
      <div className="h-full rounded-xl border border-slate-200 bg-white p-6 flex items-center justify-center">
        <EmptyState
          icon={<MessageSquare className="h-7 w-7" />}
          title="Select a review"
          description="Click on a review from the list to view details and generate AI replies"
        />
      </div>
    );
  }

  const isGenerating = isGeneratingReply(review.id);
  const hasReply = !!review.latestReply;
  const replyStatus = review.latestReply?.status || 'draft';
  const isPosted = replyStatus === 'posted';
  const isFailed = replyStatus === 'failed';
  
  // Risk Tags 관련
  const hasRiskTags = Array.isArray(review.riskTags) && review.riskTags.length > 0;
  const isNegativeReview = (review.rating ?? 5) <= 3;

  return (
    <>
      <div className="h-full rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Review Details
            </h3>
            <StatusBadge status={review.status} size="sm" />
          </div>
        </div>

        {/* 스크롤 가능한 콘텐츠 영역 */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* 고객 정보 */}
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 text-base font-bold text-slate-600 shadow-sm">
              {(review.customerName || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-base font-bold text-slate-900 truncate">
                {review.customerName || 'Unknown Customer'}
              </h4>
              <div className="flex items-center gap-2 mt-0.5">
                <RatingStars rating={review.rating} size="sm" />
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs font-medium text-slate-500">
                  {formatFullDate(review.reviewDate)}
                </span>
                <SourceBadge source={review.source} showLabel={true} />
              </div>
            </div>
          </div>

          {/* 리뷰 텍스트 */}
          <div>
            <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <MessageSquare className="h-3 w-3" />
              Customer Review
            </h5>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
              <p className="text-[13px] text-slate-800 leading-relaxed whitespace-pre-wrap">
                {review.reviewText || '(No review text)'}
              </p>
            </div>
          </div>

          {/* Risk Tags 섹션 */}
          {(hasRiskTags || isNegativeReview) && (
            <div>
              <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                Risk Analysis
              </h5>
              
              {hasRiskTags ? (
                <div className="rounded-lg bg-amber-50/50 border border-amber-200 p-3">
                  <RiskTagsDisplay 
                    tags={review.riskTags} 
                    size="md" 
                    maxVisible={5}
                  />
                  <p className="mt-2 text-[11px] text-amber-700">
                    AI detected these issues in this review
                  </p>
                </div>
              ) : isNegativeReview ? (
                <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/30 p-3 text-center">
                  <p className="text-xs text-amber-600">
                    {hasReply 
                      ? "Risk analysis not available for this review"
                      : "Generate a reply to analyze risk factors"
                    }
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {/* AI 답글 섹션 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-indigo-500" />
                AI Generated Reply
                {isPosted && (
                  <span className="ml-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-sky-100 text-[9px] font-semibold text-sky-700">
                    <Lock className="h-2.5 w-2.5" />
                    Posted
                  </span>
                )}
              </h5>
              {review.latestReply && (
                <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  {formatReplyDate(review.latestReply.createdAt)}
                </span>
              )}
            </div>

            {hasReply ? (
              <div className="space-y-2">
                {/* 편집 가능한 Textarea */}
                <div className="relative">
                  <textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    disabled={isPosted}
                    rows={5}
                    className={`
                      w-full p-3 rounded-lg border-2 text-[13px] leading-relaxed resize-none
                      focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all
                      ${isPosted 
                        ? 'bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed' 
                        : 'bg-white border-indigo-200 text-slate-800'
                      }
                    `}
                    placeholder="Edit your reply..."
                  />
                  
                  {/* 복사 버튼 */}
                  <button
                    onClick={handleCopy}
                    className="absolute top-2 right-2 p-1.5 rounded-md bg-white border border-slate-200 text-slate-500 hover:text-indigo-700 hover:border-indigo-300 hover:shadow-md transition-all"
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                {/* 변경사항 표시 */}
                {hasChanges && !isPosted && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Unsaved changes
                  </p>
                )}

                {/* 에러 표시 */}
                {(saveError || postError) && (
                  <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2">
                    <p className="text-xs text-rose-700 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {saveError || postError}
                    </p>
                  </div>
                )}

                {/* 메타 정보 */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-semibold text-slate-600">
                      {review.latestReply?.source === 'auto' ? (
                        <>
                          <Zap className="h-2.5 w-2.5" />
                          Auto
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-2.5 w-2.5" />
                          Manual
                        </>
                      )}
                    </span>
                    {/* Reply Status Badge */}
                    <ReplyStatusBadge status={replyStatus} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/50 p-6 text-center">
                <div className="flex justify-center mb-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 shadow-lg shadow-indigo-100">
                    <Wand2 className="h-6 w-6 text-indigo-600" />
                  </div>
                </div>
                <p className="text-sm font-semibold text-slate-700 mb-1">
                  No AI reply yet
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  {isNegativeReview 
                    ? "Generate a reply to analyze issues and respond professionally"
                    : "Generate a professional reply with one click"
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 푸터 액션 버튼 */}
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
          {!hasReply ? (
            // 답글 없음 - Generate 버튼만
            <Button
              variant="primary"
              size="sm"
              loading={isGenerating}
              onClick={() => onGenerateReply(review.id)}
              className="w-full"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generate AI Reply
            </Button>
          ) : isPosted ? (
            // Posted 상태 - 완료 표시
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-100 text-emerald-700">
                <Check className="h-4 w-4" />
                <span className="text-sm font-semibold">Reply Posted to Google</span>
              </div>
            </div>
          ) : (
            // Draft/Failed 상태 - 3개 버튼
            <div className="flex items-center gap-2">
              {/* Regenerate */}
              <Button
                variant="secondary"
                size="sm"
                loading={isGenerating}
                onClick={() => onGenerateReply(review.id)}
                className="flex-1"
                title="Generate new AI reply"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Regenerate</span>
              </Button>

              {/* Save Draft */}
              <Button
                variant="secondary"
                size="sm"
                loading={isSaving}
                disabled={!hasChanges || isSaving}
                onClick={handleSaveDraft}
                className="flex-1"
                title={hasChanges ? "Save your edits" : "No changes to save"}
              >
                <Save className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Save</span>
              </Button>

              {/* Post - 모달 트리거 */}
              <Button
                variant="primary"
                size="sm"
                disabled={!editedText.trim()}
                onClick={handlePostClick}
                className="flex-1"
                title={isFailed ? "Retry posting" : "Post to Google"}
              >
                <Send className="h-3.5 w-3.5" />
                {isFailed ? 'Retry' : 'Post'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ⚠️ 게시 확인 모달 */}
      <ConfirmModal
        isOpen={showPostConfirm}
        onClose={() => setShowPostConfirm(false)}
        onConfirm={handleConfirmPost}
        title="Post Reply to Google?"
        icon={<Send className="h-6 w-6" />}
        variant="warning"
        loading={isPosting}
        confirmText="Yes, Post Reply"
        cancelText="Cancel"
        message={
          <div className="space-y-3 text-left mt-2">
            {/* 경고 메시지 */}
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-800">
                  <p className="font-semibold mb-1">This action cannot be undone</p>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                    <li>Reply will be publicly visible on Google</li>
                    <li>Cannot be edited or deleted from this dashboard</li>
                    <li>Must be modified directly in Google Business Profile</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 리뷰 미리보기 */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Review from {review?.customerName || 'Customer'}
              </p>
              <div className="rounded-lg bg-slate-100 border border-slate-200 p-2.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <RatingStars rating={review?.rating ?? 5} size="sm" />
                </div>
                <p className="text-xs text-slate-700 line-clamp-2">
                  {review?.reviewText || '(No review text)'}
                </p>
              </div>
            </div>

            {/* 답글 미리보기 */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Your Reply
              </p>
              <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-2.5">
                <p className="text-xs text-slate-800 line-clamp-3">
                  {editedText}
                </p>
              </div>
            </div>

            {/* 게시 후 에러 표시 */}
            {postError && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5">
                <p className="text-xs text-rose-700 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {postError}
                </p>
              </div>
            )}
          </div>
        }
      />
    </>
  );
}

/* ===== Reply Status Badge ===== */

function ReplyStatusBadge({ status }: { status: ReplyStatus }) {
  const config: Record<ReplyStatus, { label: string; className: string }> = {
    draft: { label: 'Draft', className: 'bg-amber-100 border-amber-200 text-amber-700' },
    approved: { label: 'Approved', className: 'bg-emerald-100 border-emerald-200 text-emerald-700' },
    posted: { label: 'Posted', className: 'bg-sky-100 border-sky-200 text-sky-700' },
    failed: { label: 'Failed', className: 'bg-rose-100 border-rose-200 text-rose-700' },
  };

  const { label, className } = config[status] || config.draft;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold ${className}`}>
      {label}
    </span>
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
