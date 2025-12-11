// app/account/page.tsx
"use client";

/**
 * 👤 Account Page - 계정 관리 (반응형)
 */

import { AppLayout } from "../components/auth/AppLayout";
import { TopBar } from "../components/auth/TopBar";
import AccountPanel from "../components/auth/AccountPanel";
import { useRequireLogin } from "../../lib/auth/useRequireLogin";
import { useAuthInfo } from "../../lib/auth/useAuthInfo";
import { SettingsPageSkeleton } from "../components/ui";

export default function AccountPage() {
  const { auth, isLoaded } = useRequireLogin();
  const { auth: authInfo } = useAuthInfo();

  if (!isLoaded) {
    return (
      <AppLayout pageTitle="Account">
        <div className="flex-1 overflow-auto px-4 lg:px-6 py-6 lg:py-8">
          <div className="mx-auto max-w-3xl">
            <SettingsPageSkeleton />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Account">
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
              Account
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Manage your profile and account settings
            </p>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-3xl px-4 lg:px-6 py-4 lg:py-6 safe-area-inset-bottom">
            <AccountPanel auth={{ auth, isLoaded }} />
          </div>
        </main>
      </div>
    </AppLayout>
  );
}
