// app/components/auth/MobileNav.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard,
  MessageSquare, 
  Settings as SettingsIcon, 
  User, 
  Sparkles,
  LogOut,
  Menu,
  X,
  HelpCircle
} from "lucide-react";

/**
 * MobileNav - 모바일용 햄버거 메뉴 네비게이션
 */
export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // 페이지 이동 시 메뉴 닫기
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // 메뉴 열렸을 때 스크롤 방지
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/reviews", label: "Reviews", icon: MessageSquare },
    { href: "/settings", label: "Settings", icon: SettingsIcon },
    { href: "/account", label: "Account", icon: User },
  ];

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("reviewai_auth");
    }
    router.push("/start");
  };

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* 햄버거 버튼 - 모바일에서만 표시 */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden flex items-center justify-center h-10 w-10 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* 오버레이 */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 슬라이드 메뉴 */}
      <div className={`
        lg:hidden fixed inset-y-0 left-0 w-72 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 z-50
        transform transition-transform duration-300 ease-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* 헤더 */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight text-white">
              ReviewAI
            </span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 px-3 py-5 space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  group flex w-full items-center gap-3 rounded-xl px-3 py-3
                  transition-all duration-200
                  ${active
                    ? "bg-gradient-to-r from-indigo-500/20 to-violet-500/10 text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                  }
                `}
              >
                <div className={`
                  flex h-10 w-10 items-center justify-center rounded-lg transition-all
                  ${active 
                    ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25' 
                    : 'bg-slate-800/80 text-slate-400'
                  }
                `}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className={`text-base ${active ? 'font-semibold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* 하단 */}
        <div className="border-t border-slate-800 p-3 space-y-1">
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-base font-medium text-slate-400 transition-all hover:text-white hover:bg-white/5">
            <HelpCircle className="h-5 w-5" />
            <span>Help & Support</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-base font-medium text-slate-400 transition-all hover:text-rose-400 hover:bg-rose-500/10"
          >
            <LogOut className="h-5 w-5" />
            <span>Log out</span>
          </button>
        </div>
      </div>
    </>
  );
}

/**
 * MobileHeader - 모바일용 상단 헤더
 */
type MobileHeaderProps = {
  title?: string;
};

export function MobileHeader({ title }: MobileHeaderProps) {
  return (
    <header className="lg:hidden flex items-center justify-between h-14 px-4 border-b border-slate-200 bg-white">
      <MobileNav />
      
      {title ? (
        <h1 className="text-base font-semibold text-slate-900">{title}</h1>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-bold text-slate-900">ReviewAI</span>
        </div>
      )}
      
      {/* 오른쪽 공간 (균형 맞추기) */}
      <div className="w-10" />
    </header>
  );
}
