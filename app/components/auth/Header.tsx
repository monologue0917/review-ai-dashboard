// app/components/auth/Header.tsx
"use client";

import React from "react";

type HeaderProps = {
  title?: string;
  subtitle?: string;
  salonName?: string;
};

export function Header({
  title = "Reviews dashboard",
  subtitle = "Reply to your Google & Yelp reviews in minutes with one AI dashboard.",
  salonName = "Jenny's Nails",
}: HeaderProps) {
  const initial =
    salonName.trim().charAt(0).toUpperCase() || "R";

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      {/* 왼쪽: 타이틀 + 서브텍스트 */}
      <div>
        <h1 className="text-lg font-semibold text-slate-900 md:text-xl">
          {title}
        </h1>
        <p className="mt-1 text-xs text-slate-500 md:text-sm">
          {subtitle}
        </p>
      </div>

      {/* 오른쪽: 살롱 정보(아바타 + 이름) */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 text-xs font-semibold text-white md:h-9 md:w-9">
          <span>{initial}</span>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-sm font-medium text-slate-900">
            {salonName}
          </span>
          <span className="text-[11px] text-slate-400">
            Demo account
          </span>
        </div>
      </div>
    </header>
  );
}
