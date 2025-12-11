// app/components/auth/TopBar.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { 
  ChevronDown, 
  Building2, 
  LogOut, 
  Settings, 
  User,
  Bell,
  Check
} from "lucide-react";

type TopBarProps = {
  salonName?: string | null;
  userEmail?: string | null;
  userName?: string | null;
};

/**
 * TopBar - 상단 네비게이션 바
 * 
 * 기능:
 * - 살롱 정보 표시 (나중에 멀티 살롱 스위처로 확장)
 * - 유저 프로필 드롭다운
 * - 알림 벨 (미래 확장용)
 */
export function TopBar({ salonName, userEmail, userName }: TopBarProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayName = userName || userEmail?.split("@")[0] || "User";
  const initial = displayName.charAt(0).toUpperCase();

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("reviewai_auth");
      window.location.href = "/start";
    }
  };

  return (
    <div className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-sm flex items-center justify-between px-6">
      {/* 좌측: 살롱 정보 */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200">
          <Building2 className="h-4 w-4 text-slate-600" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-slate-900">
              {salonName || "My Salon"}
            </span>
            {/* 나중에 멀티 살롱 스위처로 확장 */}
            {/* <ChevronDown className="h-4 w-4 text-slate-400" /> */}
          </div>
          <span className="text-xs text-slate-500">Free Plan</span>
        </div>
      </div>

      {/* 우측: 알림 + 프로필 */}
      <div className="flex items-center gap-2">
        {/* 알림 벨 */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors">
          <Bell className="h-[18px] w-[18px]" />
          {/* 알림 뱃지 (있으면 표시) */}
          {/* <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500" /> */}
        </button>

        {/* 프로필 드롭다운 */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white pl-1 pr-3 py-1 hover:bg-slate-50 hover:border-slate-300 transition-all"
          >
            {/* 아바타 */}
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
              {initial}
            </div>
            {/* 이름 */}
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-slate-900 leading-tight">
                {displayName}
              </p>
              <p className="text-[11px] text-slate-500 leading-tight">
                Owner
              </p>
            </div>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* 드롭다운 메뉴 */}
          {isProfileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 py-1.5 z-50">
              {/* 유저 정보 */}
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                <p className="text-xs text-slate-500 truncate">{userEmail}</p>
              </div>

              {/* 메뉴 아이템 */}
              <div className="py-1">
                <a
                  href="/account"
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <User className="h-4 w-4 text-slate-400" />
                  My Account
                </a>
                <a
                  href="/settings"
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Settings className="h-4 w-4 text-slate-400" />
                  Settings
                </a>
              </div>

              {/* 로그아웃 */}
              <div className="border-t border-slate-100 pt-1">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
