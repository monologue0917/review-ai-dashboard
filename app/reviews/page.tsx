// app/reviews/page.tsx
"use client";

import { Suspense } from "react";
import ReviewsContent from "./ReviewsContent";
import { Sidebar } from "../components/auth/Sidebar";
import { Sparkles } from "lucide-react";

export default function ReviewsPage() {
  return (
    <div className="flex min-h-screen bg-slate-100/50">
      <Sidebar />
      <Suspense fallback={<ReviewsLoading />}>
        <ReviewsContent />
      </Suspense>
    </div>
  );
}

function ReviewsLoading() {
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
