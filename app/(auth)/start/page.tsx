// app/(auth)/start/page.tsx
"use client";

/**
 * 🚀 Start Page - 이메일 입력 (온보딩 시작)
 * 
 * 트렌디한 SaaS 스타일 랜딩/로그인 페이지
 */

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Star, MessageSquare, Zap } from "lucide-react";

export default function StartPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkEmailExists(target: string): Promise<boolean> {
    const value = target.trim().toLowerCase();
    // 임시: 이 이메일만 기존 계정으로 취급
    if (value === "dube000@gmail.com") return true;
    return false;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setError("Please enter your email.");
      return;
    }

    setIsLoading(true);
    try {
      const exists = await checkEmailExists(trimmed);
      const nextUrl = exists
        ? `/login?email=${encodeURIComponent(trimmed)}`
        : `/signup?email=${encodeURIComponent(trimmed)}`;
      router.push(nextUrl);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex">
      {/* 왼쪽: 히어로 섹션 */}
      <div className="hidden lg:flex lg:flex-1 flex-col justify-center px-12 xl:px-20">
        {/* 로고 */}
        <div className="flex items-center gap-3 mb-12">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">ReviewAI</span>
        </div>

        {/* 메인 카피 */}
        <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
          Turn every review into
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
            a 5-star reply
          </span>
        </h1>
        <p className="text-lg text-slate-400 max-w-md mb-12">
          AI-powered review management for local businesses. Reply to Google & Yelp reviews in seconds.
        </p>

        {/* 기능 하이라이트 */}
        <div className="space-y-4">
          {[
            { icon: MessageSquare, text: "Manage all reviews in one dashboard" },
            { icon: Zap, text: "AI generates replies in seconds" },
            { icon: Star, text: "Improve your rating & reputation" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 border border-white/10">
                <item.icon className="h-5 w-5 text-indigo-400" />
              </div>
              <span className="text-slate-300">{item.text}</span>
            </div>
          ))}
        </div>

        {/* 소셜 프루프 */}
        <div className="mt-16 flex items-center gap-4">
          <div className="flex -space-x-2">
            {['🧑‍💼', '👩‍💻', '👨‍🍳', '💇‍♀️'].map((emoji, i) => (
              <div 
                key={i}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 border-2 border-slate-900 text-lg"
              >
                {emoji}
              </div>
            ))}
          </div>
          <div>
            <p className="text-sm text-white font-medium">Trusted by 500+ businesses</p>
            <div className="flex items-center gap-1 text-amber-400 text-sm">
              <Star className="h-4 w-4 fill-current" />
              <Star className="h-4 w-4 fill-current" />
              <Star className="h-4 w-4 fill-current" />
              <Star className="h-4 w-4 fill-current" />
              <Star className="h-4 w-4 fill-current" />
              <span className="text-slate-400 ml-1">4.9/5</span>
            </div>
          </div>
        </div>
      </div>

      {/* 오른쪽: 로그인 폼 */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-12 bg-white lg:rounded-l-[3rem]">
        <div className="w-full max-w-md">
          {/* 모바일 로고 */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">ReviewAI</span>
          </div>

          {/* 헤더 */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Get started
            </h2>
            <p className="text-slate-500">
              Enter your email to sign in or create an account
            </p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {/* 폼 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Work email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@salonname.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={!email.trim() || isLoading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-base font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
            >
              {isLoading ? (
                <>
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Checking...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            We'll check if you have an account or help you create one
          </p>

          {/* 하단 링크 */}
          <div className="mt-12 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              By continuing, you agree to our{" "}
              <a href="#" className="text-indigo-600 hover:text-indigo-700 font-medium">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-indigo-600 hover:text-indigo-700 font-medium">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
