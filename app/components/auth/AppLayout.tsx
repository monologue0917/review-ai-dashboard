// app/components/auth/AppLayout.tsx
"use client";

import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { MobileHeader } from "./MobileNav";

/**
 * AppLayout - 반응형 대시보드 레이아웃
 * 
 * - 데스크탑: 사이드바 고정
 * - 모바일: 상단 헤더 + 햄버거 메뉴
 */
type AppLayoutProps = {
  children: ReactNode;
  pageTitle?: string;
};

export function AppLayout({ children, pageTitle }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-slate-100/50">
      {/* 데스크탑 사이드바 - lg 이상에서만 표시 */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 모바일 헤더 - lg 미만에서만 표시 */}
        <MobileHeader title={pageTitle} />

        {/* 페이지 콘텐츠 */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
