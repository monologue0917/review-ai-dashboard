// app/components/auth/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard,
  MessageSquare, 
  Settings as SettingsIcon, 
  User, 
  Sparkles,
  LogOut,
  TrendingUp,
  HelpCircle,
  ChevronRight
} from "lucide-react";

/**
 * Sidebar - 다크 테마 네비게이션
 * 
 * 메뉴 구조:
 * - Dashboard (홈, 요약)
 * - Reviews (리뷰 관리, 작업)
 * - Settings
 * - Account
 */
export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const mainNavItems = [
    { 
      href: "/dashboard", 
      label: "Dashboard", 
      icon: LayoutDashboard,
      description: "Overview & insights"
    },
    { 
      href: "/reviews", 
      label: "Reviews", 
      icon: MessageSquare,
      description: "Manage & reply"
    },
  ];

  const settingsNavItems = [
    { 
      href: "/settings", 
      label: "Settings", 
      icon: SettingsIcon,
    },
    { 
      href: "/account", 
      label: "Account", 
      icon: User,
    },
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
    <aside className="flex h-screen w-64 flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-r border-slate-800">
      {/* Logo 영역 */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-slate-800">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight text-white">
            ReviewAI
          </span>
          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
            Dashboard
          </span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-6">
        {/* 메인 메뉴 */}
        <div className="space-y-1">
          <p className="px-3 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Menu
          </p>
          {mainNavItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5
                  transition-all duration-200
                  ${active
                    ? "bg-gradient-to-r from-indigo-500/20 to-violet-500/10 text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                  }
                `}
              >
                {/* 활성 인디케이터 */}
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-gradient-to-b from-indigo-400 to-violet-500" />
                )}
                
                {/* 아이콘 */}
                <div className={`
                  flex h-9 w-9 items-center justify-center rounded-lg transition-all
                  ${active 
                    ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25' 
                    : 'bg-slate-800/80 text-slate-400 group-hover:bg-slate-800 group-hover:text-white'
                  }
                `}>
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                
                {/* 레이블 */}
                <div className="flex-1">
                  <span className={`text-sm ${active ? 'font-semibold' : 'font-medium'}`}>
                    {item.label}
                  </span>
                  {item.description && (
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* 화살표 */}
                {active && (
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                )}
              </Link>
            );
          })}
        </div>

        {/* 설정 메뉴 */}
        <div className="space-y-1">
          <p className="px-3 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Settings
          </p>
          {settingsNavItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  group flex w-full items-center gap-3 rounded-xl px-3 py-2
                  transition-all duration-200
                  ${active
                    ? "bg-white/5 text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                  }
                `}
              >
                <div className={`
                  flex h-8 w-8 items-center justify-center rounded-lg
                  ${active 
                    ? 'bg-slate-800 text-white' 
                    : 'bg-transparent text-slate-500 group-hover:text-white'
                  }
                `}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className={`text-sm ${active ? 'font-medium' : ''}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />

        {/* Pro 업그레이드 카드 */}
        <div className="rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              Pro Plan
            </span>
          </div>
          <p className="text-sm text-slate-300 mb-3">
            Unlock unlimited AI replies & advanced analytics
          </p>
          <button className="w-full rounded-lg bg-gradient-to-r from-indigo-500 to-violet-600 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 hover:scale-[1.02]">
            Upgrade Now
          </button>
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-slate-800 p-3 space-y-1">
        {/* Help */}
        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-400 transition-all hover:text-white hover:bg-white/5">
          <HelpCircle className="h-4 w-4" />
          <span>Help & Support</span>
        </button>
        
        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-400 transition-all hover:text-rose-400 hover:bg-rose-500/10"
        >
          <LogOut className="h-4 w-4" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
