// app/account/page.tsx
"use client";

/**
 * 👤 Account Page - 계정 관리
 */

import { Sidebar } from "../components/auth/Sidebar";
import { TopBar } from "../components/auth/TopBar";
import AccountPanel from "../components/auth/AccountPanel";
import { useRequireLogin } from "../../lib/auth/useRequireLogin";
import { useAuthInfo } from "../../lib/auth/useAuthInfo";
import { Sparkles } from "lucide-react";

export default function AccountPage() {
  const { auth, isLoaded } = useRequireLogin();
  const { auth: authInfo } = useAuthInfo();

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
            <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 text-indigo-600" />
          </div>
          <p className="text-sm font-medium text-slate-500">Loading account…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100/50">
      <Sidebar />
      
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
              Account
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Manage your profile and account settings
            </p>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-4xl px-6 py-6">
            <AccountPanel auth={{ auth, isLoaded }} />
          </div>
        </main>
      </div>
    </div>
  );
}
