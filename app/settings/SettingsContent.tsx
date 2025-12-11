// app/settings/SettingsContent.tsx
"use client";

import { TopBar } from "../components/auth/TopBar";
import SettingsPanel from "../components/auth/SettingsPanel";
import { useRequireLogin } from "../../lib/auth/useRequireLogin";
import { useAuthInfo } from "../../lib/auth/useAuthInfo";
import { useSearchParams } from "next/navigation";
import { Sparkles, CheckCircle2, XCircle } from "lucide-react";

export default function SettingsContent() {
  const { auth, isLoaded } = useRequireLogin();
  const { auth: authInfo } = useAuthInfo();
  const searchParams = useSearchParams();

  // Google OAuth 결과
  const googleStatus = searchParams.get("google");
  const googleEmail = searchParams.get("email");
  const googleErrorReason = searchParams.get("reason");

  // 로딩
  if (!isLoaded) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 text-indigo-600" />
          </div>
          <p className="text-sm font-medium text-slate-500">Loading settings…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* TopBar */}
      <TopBar 
        salonName={authInfo?.salonName}
        userEmail={auth?.email}
      />

      {/* Page Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-5">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Settings
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Manage your auto-reply preferences and integrations
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-4xl px-6 py-6 space-y-6">
          {/* Google OAuth 상태 배너 */}
          {googleStatus === "connected" && (
            <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 px-5 py-4 shadow-sm">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    Google account connected successfully!
                  </p>
                  {googleEmail && (
                    <p className="text-sm text-emerald-600 mt-0.5">
                      Linked to: <strong>{googleEmail}</strong>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {googleStatus === "error" && (
            <div className="rounded-xl border border-rose-200 bg-gradient-to-r from-rose-50 to-pink-50 px-5 py-4 shadow-sm">
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-rose-500" />
                <div>
                  <p className="text-sm font-semibold text-rose-800">
                    Failed to connect Google account
                  </p>
                  {googleErrorReason && (
                    <p className="text-sm text-rose-600 mt-0.5">
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
