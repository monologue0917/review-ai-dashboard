// app/settings/SettingsContent.tsx
"use client";

import { TopBar } from "../components/auth/TopBar";
import SettingsPanel from "../components/auth/SettingsPanel";
import { useRequireLogin } from "../../lib/auth/useRequireLogin";
import { useAuthInfo } from "../../lib/auth/useAuthInfo";
import { useSearchParams, useRouter } from "next/navigation";
import { SettingsPageSkeleton } from "../components/ui";
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

// 에러 메시지 매핑 (lib/google/errors.ts와 동기화)
const ERROR_MESSAGES: Record<string, { title: string; description: string; canRetry: boolean }> = {
  user_cancelled: {
    title: 'Connection cancelled',
    description: 'You cancelled the Google connection. Click "Connect Google" to try again.',
    canRetry: true,
  },
  invalid_state: {
    title: 'Security error',
    description: 'Security validation failed. Please try connecting again.',
    canRetry: true,
  },
  state_expired: {
    title: 'Request expired',
    description: 'The connection request expired. Please try again.',
    canRetry: true,
  },
  token_expired: {
    title: 'Session expired',
    description: 'Your Google connection has expired. Please reconnect your account.',
    canRetry: true,
  },
  token_revoked: {
    title: 'Access revoked',
    description: 'Google access was revoked. Please reconnect your account.',
    canRetry: true,
  },
  insufficient_scope: {
    title: 'Permissions required',
    description: 'Additional permissions are required. Please reconnect and grant all requested permissions.',
    canRetry: true,
  },
  location_not_found: {
    title: 'Location not found',
    description: 'The selected business location was not found. Please select a different location.',
    canRetry: false,
  },
  location_access_denied: {
    title: 'Access denied',
    description: "You don't have permission to access this location. Please check your Google Business Profile permissions.",
    canRetry: false,
  },
  rate_limited: {
    title: 'Too many requests',
    description: 'Please wait a moment and try again.',
    canRetry: true,
  },
  api_unavailable: {
    title: 'Service unavailable',
    description: 'Google services are temporarily unavailable. Please try again later.',
    canRetry: true,
  },
  config_error: {
    title: 'Configuration error',
    description: 'Google integration is not configured. Please contact support.',
    canRetry: false,
  },
  network_error: {
    title: 'Network error',
    description: 'Please check your connection and try again.',
    canRetry: true,
  },
  unknown: {
    title: 'Connection failed',
    description: 'An unexpected error occurred. Please try again.',
    canRetry: true,
  },
};

export default function SettingsContent() {
  const { auth, isLoaded } = useRequireLogin();
  const { auth: authInfo } = useAuthInfo();
  const searchParams = useSearchParams();
  const router = useRouter();

  // 배너 표시 상태
  const [showBanner, setShowBanner] = useState(true);

  // URL 파라미터 읽기
  const googleSuccess = searchParams.get("google_success");
  const googleEmail = searchParams.get("google_email");
  const googleError = searchParams.get("google_error");
  const googleErrorMessage = searchParams.get("google_error_message");
  const googleErrorDetails = searchParams.get("google_error_details");

  // 기존 파라미터도 지원 (하위 호환)
  const legacyGoogleStatus = searchParams.get("google");
  const legacyGoogleEmail = searchParams.get("email");
  const legacyErrorReason = searchParams.get("reason");

  // 에러 정보 결정
  const errorInfo = googleError 
    ? ERROR_MESSAGES[googleError] || ERROR_MESSAGES.unknown
    : null;

  // 배너 닫기
  const handleDismiss = () => {
    setShowBanner(false);
    // URL에서 파라미터 제거
    const url = new URL(window.location.href);
    url.searchParams.delete("google_success");
    url.searchParams.delete("google_email");
    url.searchParams.delete("google_error");
    url.searchParams.delete("google_error_message");
    url.searchParams.delete("google_error_details");
    url.searchParams.delete("google_account_id");
    url.searchParams.delete("google");
    url.searchParams.delete("email");
    url.searchParams.delete("reason");
    router.replace(url.pathname, { scroll: false });
  };

  // URL 파라미터 변경 시 배너 다시 표시
  useEffect(() => {
    if (googleSuccess || googleError || legacyGoogleStatus) {
      setShowBanner(true);
    }
  }, [googleSuccess, googleError, legacyGoogleStatus]);

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

  // 성공 여부 판단
  const isSuccess = googleSuccess === "true" || legacyGoogleStatus === "connected";
  const displayEmail = googleEmail || legacyGoogleEmail;
  const hasError = googleError || legacyGoogleStatus === "error";

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* TopBar - 데스크탑만 */}
      <div className="hidden lg:block">
        <TopBar 
          salonName={authInfo?.salonName}
          userEmail={auth?.email}
        />
      </div>

      {/* Page Header */}
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
          
          {/* ✅ 성공 배너 */}
          {showBanner && isSuccess && (
            <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 px-4 lg:px-5 py-3 lg:py-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-emerald-800">
                      Google account connected successfully!
                    </p>
                    {displayEmail && (
                      <p className="text-sm text-emerald-600 mt-0.5 truncate">
                        Linked to: <strong>{displayEmail}</strong>
                      </p>
                    )}
                    <p className="text-xs text-emerald-600 mt-1">
                      Now select a location below to start syncing reviews.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className="text-emerald-400 hover:text-emerald-600 p-1"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ❌ 에러 배너 */}
          {showBanner && hasError && errorInfo && (
            <div className="rounded-xl border border-rose-200 bg-gradient-to-r from-rose-50 to-pink-50 px-4 lg:px-5 py-3 lg:py-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-rose-800">
                      {errorInfo.title}
                    </p>
                    <p className="text-sm text-rose-600 mt-0.5">
                      {googleErrorMessage || errorInfo.description}
                    </p>
                    {googleErrorDetails && (
                      <p className="text-xs text-rose-500 mt-1 font-mono">
                        Details: {googleErrorDetails}
                      </p>
                    )}
                    {/* 기존 reason도 표시 */}
                    {legacyErrorReason && !googleErrorMessage && (
                      <p className="text-xs text-rose-500 mt-1">
                        {legacyErrorReason}
                      </p>
                    )}
                    {errorInfo.canRetry && (
                      <p className="text-xs text-rose-600 mt-2 flex items-center gap-1">
                        <RefreshCw className="h-3 w-3" />
                        Click "Connect Google" below to try again.
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className="text-rose-400 hover:text-rose-600 p-1"
                >
                  <XCircle className="h-4 w-4" />
                </button>
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
