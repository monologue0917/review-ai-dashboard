// app/dashboard/page.tsx
"use client";

/**
 * 🏠 Dashboard - 홈 페이지
 * 
 * 목적: 현황 파악 + 빠른 액션
 * - 통계 요약 카드
 * - Action Required 섹션
 * - 최근 리뷰 미리보기
 * - Quick Actions
 */

import React, { useMemo } from "react";
import Link from "next/link";
import { Sidebar } from "../components/auth/Sidebar";
import { TopBar } from "../components/auth/TopBar";
import { StatCard, Button, AppCard, RatingStars, StatusBadge, AIReadyBadge } from "../components/ui";

import { useReviewDashboard } from "../../lib/reviews/useReviewDashboard";
import { useRequireLogin } from "../../lib/auth/useRequireLogin";

import { 
  MessageSquare, 
  Sparkles, 
  CheckCircle2,
  Clock,
  TrendingUp,
  ArrowRight,
  AlertCircle,
  Zap,
  BarChart3,
  Settings
} from "lucide-react";

export default function DashboardPage() {
  // 1) 로그인 체크
  const { auth, isLoaded: authLoaded } = useRequireLogin();

  // 2) 리뷰 데이터
  const {
    reviews,
    isLoading,
    error,
    salonId,
    salonName,
  } = useReviewDashboard();

  // 3) 통계 계산
  const stats = useMemo(() => {
    const total = reviews.length;
    const needsReply = reviews.filter((r) => !r.latestReply).length;
    const aiReady = reviews.filter((r) => r.latestReply).length;
    const reviewsWithRating = reviews.filter(r => r.rating !== null);
    const avgRating = reviewsWithRating.length > 0
      ? reviewsWithRating.reduce((sum, r) => sum + (r.rating || 0), 0) / reviewsWithRating.length
      : 0;

    return {
      total,
      needsReply,
      aiReady,
      avgRating: avgRating.toFixed(1),
    };
  }, [reviews]);

  // 4) 최근 리뷰 (최대 5개)
  const recentReviews = useMemo(() => {
    return reviews.slice(0, 5);
  }, [reviews]);

  // 5) 답글 필요한 리뷰 (최대 3개)
  const actionRequired = useMemo(() => {
    return reviews.filter(r => !r.latestReply).slice(0, 3);
  }, [reviews]);

  // 6) 로딩 중
  if (!authLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 text-indigo-600" />
          </div>
          <p className="text-sm font-medium text-slate-500">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  // 7) 살롱 없음
  if (authLoaded && !salonId) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-md rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-8 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
              <AlertCircle className="h-8 w-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">No salon connected</h2>
            <p className="mt-2 text-sm text-slate-600">
              Your account isn't linked to any business yet.
            </p>
            <Button variant="primary" size="md" className="mt-6">
              Contact Support
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // 현재 시간에 따른 인사말
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const userName = auth?.email?.split("@")[0] || "there";

  return (
    <div className="flex min-h-screen bg-slate-100/50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TopBar */}
        <TopBar 
          salonName={salonName}
          userEmail={auth?.email}
        />

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
            {/* 인사말 헤더 */}
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {getGreeting()}, {userName}! 👋
              </h1>
              <p className="mt-1 text-slate-600">
                Here's what's happening with your reviews today
              </p>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="rounded-xl border border-rose-200 bg-gradient-to-r from-rose-50 to-pink-50 px-5 py-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />
                  <p className="text-sm font-medium text-rose-700">{error}</p>
                </div>
              </div>
            )}

            {/* Stats Cards - 클릭하면 /reviews로 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/reviews">
                <StatCard
                  label="Total Reviews"
                  value={stats.total}
                  icon={<MessageSquare className="h-5 w-5 text-slate-500" />}
                  className="cursor-pointer hover:border-indigo-300 hover:shadow-lg"
                />
              </Link>
              <Link href="/reviews?filter=new">
                <StatCard
                  label="Needs Reply"
                  value={stats.needsReply}
                  icon={<Clock className="h-5 w-5 text-amber-500" />}
                  className={`cursor-pointer hover:border-amber-300 hover:shadow-lg ${stats.needsReply > 0 ? 'border-amber-200 bg-gradient-to-br from-amber-50/50 to-white' : ''}`}
                />
              </Link>
              <Link href="/reviews?filter=replied">
                <StatCard
                  label="AI Replies Ready"
                  value={stats.aiReady}
                  icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                  className="cursor-pointer hover:border-emerald-300 hover:shadow-lg"
                />
              </Link>
              <StatCard
                label="Avg. Rating"
                value={`${stats.avgRating} ★`}
                icon={<TrendingUp className="h-5 w-5 text-indigo-500" />}
              />
            </div>

            {/* 2-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Action Required + Quick Actions */}
              <div className="lg:col-span-2 space-y-6">
                {/* Action Required */}
                {stats.needsReply > 0 && (
                  <AppCard className="overflow-hidden">
                    <div className="border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30">
                            <Zap className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h2 className="text-base font-bold text-slate-900">
                              Action Required
                            </h2>
                            <p className="text-sm font-medium text-amber-700">
                              {stats.needsReply} reviews need your attention
                            </p>
                          </div>
                        </div>
                        <Link href="/reviews?filter=new">
                          <Button variant="secondary" size="sm">
                            View All
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {actionRequired.map((review) => (
                        <Link 
                          key={review.id}
                          href={`/reviews?selected=${review.id}`}
                          className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-sm font-bold text-slate-600">
                            {(review.customerName || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-bold text-slate-900">
                                {review.customerName || 'Unknown'}
                              </span>
                              <RatingStars rating={review.rating} size="sm" />
                            </div>
                            <p className="text-sm text-slate-600 truncate font-medium">
                              {review.reviewText || '(No review text)'}
                            </p>
                          </div>
                          <Button variant="primary" size="sm">
                            <Sparkles className="h-3.5 w-3.5" />
                            Reply
                          </Button>
                        </Link>
                      ))}
                    </div>
                  </AppCard>
                )}

                {/* 모든 리뷰 답글 완료 */}
                {stats.needsReply === 0 && stats.total > 0 && (
                  <AppCard className="p-6 bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 shadow-lg shadow-emerald-500/30">
                        <CheckCircle2 className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">
                          All caught up! 🎉
                        </h3>
                        <p className="text-sm text-emerald-700 font-medium">
                          Every review has an AI reply ready. Great job!
                        </p>
                      </div>
                    </div>
                  </AppCard>
                )}

                {/* Quick Actions */}
                <div>
                  <h2 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Link href="/reviews">
                      <AppCard hover className="p-5">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
                            <MessageSquare className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-sm font-bold text-slate-900">
                              Manage Reviews
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                              View and reply to all reviews
                            </p>
                          </div>
                          <ArrowRight className="h-5 w-5 text-slate-300" />
                        </div>
                      </AppCard>
                    </Link>

                    <Link href="/settings">
                      <AppCard hover className="p-5">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30">
                            <Settings className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-sm font-bold text-slate-900">
                              Auto-Reply Settings
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                              Configure AI reply preferences
                            </p>
                          </div>
                          <ArrowRight className="h-5 w-5 text-slate-300" />
                        </div>
                      </AppCard>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Right Column - Recent Reviews */}
              <div className="space-y-6">
                <AppCard className="overflow-hidden">
                  <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                        Recent Reviews
                      </h2>
                      <Link 
                        href="/reviews" 
                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                      >
                        View all
                      </Link>
                    </div>
                  </div>

                  {recentReviews.length === 0 ? (
                    <div className="px-5 py-10 text-center">
                      <MessageSquare className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm font-medium text-slate-500">No reviews yet</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Reviews will appear here once imported
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {recentReviews.map((review) => (
                        <Link
                          key={review.id}
                          href={`/reviews?selected=${review.id}`}
                          className="block px-5 py-4 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-slate-900">
                              {review.customerName || 'Unknown'}
                            </span>
                            <StatusBadge 
                              status={review.latestReply ? 'approved' : 'new'} 
                              size="sm"
                            />
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <RatingStars rating={review.rating} size="sm" />
                            <span className="text-xs font-medium text-slate-500">
                              {formatDate(review.reviewDate)}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 line-clamp-2 font-medium">
                            {review.reviewText || '(No review text)'}
                          </p>
                        </Link>
                      ))}
                    </div>
                  )}
                </AppCard>

                {/* Tips Card */}
                <AppCard className="p-5 bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-200">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30 shrink-0">
                      <BarChart3 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Pro Tip 💡
                      </h3>
                      <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                        Responding to reviews within 24 hours can increase customer trust by up to 33%.
                      </p>
                    </div>
                  </div>
                </AppCard>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ===== Utility ===== */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
