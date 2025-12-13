// app/components/ui/Skeleton.tsx
"use client";

/**
 * 🦴 Skeleton UI Components
 * 
 * 로딩 상태를 위한 스켈레톤 컴포넌트들
 */

import React from "react";

/* ===== Base Skeleton ===== */

type SkeletonProps = {
  className?: string;
  animate?: boolean;
};

export function Skeleton({ className = "", animate = true }: SkeletonProps) {
  return (
    <div 
      className={`
        bg-slate-200 rounded
        ${animate ? "animate-pulse" : ""}
        ${className}
      `} 
    />
  );
}

/* ===== Review Card Skeleton ===== */

export function ReviewCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <Skeleton className="h-12 w-12 rounded-full shrink-0" />
        
        <div className="flex-1 min-w-0 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          
          {/* Stars */}
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-4 w-4 rounded" />
            ))}
          </div>
          
          {/* Review text */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== Review List Skeleton ===== */

export function ReviewListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <ReviewCardSkeleton key={i} />
      ))}
    </div>
  );
}

/* ===== Detail Panel Skeleton ===== */

export function DetailPanelSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Skeleton className="h-14 w-14 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-28" />
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-5 w-5 rounded" />
            ))}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-100" />

      {/* Review text */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-20 mb-3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
      </div>

      {/* Divider */}
      <div className="border-t border-slate-100" />

      {/* Reply section */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
    </div>
  );
}

/* ===== Settings Card Skeleton ===== */

export function SettingsCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-slate-50">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===== Settings Page Skeleton ===== */

export function SettingsPageSkeleton() {
  return (
    <div className="space-y-6">
      <SettingsCardSkeleton />
      <SettingsCardSkeleton />
      <SettingsCardSkeleton />
    </div>
  );
}

/* ===== Review Table Skeleton ===== */

export function ReviewTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
        <div className="flex gap-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32 flex-1" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      
      {/* Rows */}
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-6 rounded" />
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Skeleton key={s} className="h-3 w-3" />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-7 w-16 rounded-lg" />
          </div>
        ))}
      </div>
      
      {/* Footer */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-2">
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}
