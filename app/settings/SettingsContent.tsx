// app/settings/SettingsContent.tsx
"use client";

import { TopBar } from "../components/auth/TopBar";
import SettingsPanel from "../components/auth/SettingsPanel";
import { useRequireLogin } from "../../lib/auth/useRequireLogin";
import { useAuthInfo } from "../../lib/auth/useAuthInfo";
import { useSearchParams } from "next/navigation";
import { SettingsPageSkeleton } from "../components/ui";
import { CheckCircle2, XCircle } from "lucide-react";

export default function SettingsContent() {
  const { auth, isLoaded } = useRequireLogin();
  const { auth: authInfo } = useAuthInfo();
  const searchParams = useSearchParams();

  // Google OAuth 결과
  const googleStatus = searchParams.get("google");
  const googleEmail = searchParams.get("email");
  const googleErrorReason = searchParams.get("reason");

  // 로딩 (스켈레톤)
  if (!isLoaded) {
    return (
      <div className="flex-1 overflow-auto px-4 lg:px-6 py-6 lg:py-8">
        <div className="mx-auto max-w-3xl">
          <SettingsPageSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* TopBar - 데스크탑만 */}
      <div className="hidden lg:block">
        <TopBar 
          salonName={authInfo?.salonName}
          userEmail={auth?.email}
        />
      </div>

      {/* Page Header - 반응형 */}
      <div className="border-b border-slate-200 bg-white px-4 lg:px-6 py-4 lg:py-5">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-lg lg:text-xl font-bold text-slate-900 tracking-tight">
            Settings
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Manage your auto-reply preferences and integrations
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl px-4 lg:px-6 py-4 lg:py-6 space-y-4 lg:space-y-6 safe-area-inset-bottom">
          {/* Google OAuth 상태 배너 */}
          {googleStatus === "connected" && (
            <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 px-4 lg:px-5 py-3 lg:py-4 shadow-sm">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-emerald-800">
                    Google account connected successfully!
                  </p>
                  {googleEmail && (
                    <p className="text-sm text-emerald-600 mt-0.5 truncate">
                      Linked to: <strong>{googleEmail}</strong>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {googleStatus === "error" && (
            <div className="rounded-xl border border-rose-200 bg-gradient-to-r from-rose-50 to-pink-50 px-4 lg:px-5 py-3 lg:py-4 shadow-sm">
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-rose-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-rose-800">
                    Failed to connect Google account
                  </p>
                  {googleErrorReason && (
                    <p className="text-sm text-rose-600 mt-0.5 truncate">
                      Reason: {googleErrorReason}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Settings Panel */}
          <SettingsPanel auth={auth} />
        </div>
      </main>
    </div>
  );
}
