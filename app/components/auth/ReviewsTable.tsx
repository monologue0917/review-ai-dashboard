// app/components/auth/ReviewsTable.tsx
"use client";

import React from "react";
import type { ReviewItem } from "@/lib/reviews/types";

type ReviewsTableProps = {
  reviews: ReviewItem[];
  selectedReviewId: number | null;
  onSelectReview: (id: number) => void;
  onGenerateReply: (id: number) => void;
  isGeneratingReply: (id: number) => boolean;
};

export function ReviewsTable({
  reviews,
  selectedReviewId,
  onSelectReview,
  onGenerateReply,
  isGeneratingReply,
}: ReviewsTableProps) {
  const hasReviews = reviews && reviews.length > 0;

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">All reviews</h2>
        </div>
        <div className="text-sm text-slate-500">
          {hasReviews ? `${reviews.length} reviews` : "No reviews"}
        </div>
      </div>

      {/* 테이블 */}
      {hasReviews ? (
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Source
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Rating
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Review
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  AI Reply
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {reviews.map((review) => {
                const isSelected = review.id === selectedReviewId;

                return (
                  <tr
                    key={review.id}
                    onClick={() => onSelectReview(review.id)}
                    className={`cursor-pointer transition-colors hover:bg-slate-50 ${
                      isSelected ? "bg-blue-50" : ""
                    }`}
                  >
                    {/* Date */}
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                      {formatDate(review.reviewDate)}
                    </td>

                    {/* Source */}
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                      {formatSource(review.source)}
                    </td>

                    {/* Rating */}
                    <td className="whitespace-nowrap px-4 py-4">
                      {review.rating !== null ? (
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <span
                              key={i}
                              className={`text-base ${
                                i < review.rating!
                                  ? "text-yellow-400"
                                  : "text-slate-200"
                              }`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">–</span>
                      )}
                    </td>

                    {/* Customer */}
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-slate-900">
                      {review.customerName || "Unknown"}
                    </td>

                    {/* Review */}
                    <td className="max-w-md px-4 py-4">
                      <p className="line-clamp-2 text-sm text-slate-600">
                        {review.reviewText || "(No review text)"}
                      </p>
                    </td>

                    {/* Status */}
                    <td className="whitespace-nowrap px-4 py-4">
                      {review.hasReply && review.latestReply ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                          Approved
                        </span>
                      ) : review.latestReply ? (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                          Drafted
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
                          New
                        </span>
                      )}
                    </td>

                    {/* AI Reply */}
                    <td className="whitespace-nowrap px-4 py-4">
                      {review.latestReply ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectReview(review.id);
                          }}
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          Ready
                        </button>
                      ) : (
                        <span className="text-sm text-slate-400">–</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <svg
                          className="h-5 w-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center py-12">
          <div className="text-center">
            <p className="text-sm font-medium text-slate-900">No reviews yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Reviews will appear here once they're imported
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Utility Functions ===== */

function formatSource(source: string | null): string {
  if (!source) return "–";
  switch (source.toLowerCase()) {
    case "google":
      return "Google";
    case "yelp":
      return "Yelp";
    case "facebook":
      return "Facebook";
    default:
      return source;
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "–";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "–";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}