// app/components/Logo.tsx
"use client";

import React from "react";

type LogoProps = {
  size?: number;
};

export function LogoMark({ size = 24 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      {/* 말풍선 베이스 */}
      <path
        d="M8 6h12c3.314 0 6 2.686 6 6v4c0 3.314-2.686 6-6 6h-4.5L11 26.5V22H8c-3.314 0-6-2.686-6-6v-4C2 8.686 4.686 6 8 6Z"
        fill="#2563EB"
      />
      {/* AI 스파클 포인트 */}
      <circle cx="24" cy="9" r="3" fill="#F97316" />
      {/* 리뷰 텍스트 라인 */}
      <rect x="9" y="10" width="8" height="1.6" rx="0.8" fill="#EFF6FF" />
      <rect x="9" y="13" width="6" height="1.6" rx="0.8" fill="#DBEAFE" />
    </svg>
  );
}

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <LogoMark size={26} />
      <span className="text-lg font-semibold tracking-tight">
        <span className="text-[#2563EB]">Glow</span>
        <span className="text-slate-900">Reply</span>
      </span>
    </div>
  );
}
