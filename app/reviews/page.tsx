// app/reviews/page.tsx
"use client";

import { Suspense } from "react";
import ReviewsContent from "./ReviewsContent";
import { AppLayout } from "../components/auth/AppLayout";
import { ReviewListSkeleton, DetailPanelSkeleton } from "../components/ui";

export default function ReviewsPage() {
  return (
    <AppLayout pageTitle="Reviews">
      <Suspense fallback={<ReviewsLoading />}>
        <ReviewsContent />
      </Suspense>
    </AppLayout>
  );
}

function ReviewsLoading() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header Skeleton */}
      <div className="border-b border-slate-200 bg-white px-4 lg:px-6 py-3">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-6 w-20 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-32 bg-slate-200 rounded animate-pulse hidden sm:block" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-32 sm:w-48 bg-slate-200 rounded-lg animate-pulse" />
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
