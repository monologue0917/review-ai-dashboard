// app/components/auth/SettingsPanel.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getAuthHeaders } from "@/lib/auth/useAuthInfo";
import { fetchWithTimeout, fetchExternal, FetchTimeoutError } from "@/lib/utils/fetchWithTimeout";
import { 
  AppCard, 
  Button, 
  Toggle,
  SettingsPageSkeleton,
  ConfirmModal
} from "../ui";
import { 
  Zap, 
  Bell, 
  Link2, 
  Save, 
  Loader2,
  CheckCircle2,
  Star,
  Mail,
  ExternalLink,
  Unlink,
  RefreshCw,
  MapPin,
  AlertCircle,
  AlertTriangle,
  Info
} from "lucide-react";

type SettingsPanelProps = {
  auth: {
    userId: string;
    email: string;
    salonId: string | null;
    salonName: string | null;
    isLoaded?: boolean;
  } | null;
};

type SalonSettings = {
  salonName: string;
  googlePlaceId: string;
  yelpBusinessId: string;
  autoReplyGoogle: boolean;
  autoReplyYelp: boolean;
  notificationEmail: string;
  autoReplyMinRating: number;
  // Google 연결 정보
  googleConnected: boolean;
  googleEmail: string | null;
  googleLocationId: string | null;
  googleLocationName: string | null;
};

type GoogleLocation = {
  name: string;
  locationId: string;
  title: string;
  address?: string;
};

type GoogleAccount = {
  accountName: string;
  accountId: string;
  locations: GoogleLocation[];
};

// 자동 답글 소스 타입
type AutoReplySource = 'google' | 'yelp';

/**
 * 에러 코드를 사용자 친화적 메시지로 변환
 */
function getErrorMessage(error: string): string {
  const messages: Record<string, string> = {
    'RATE_LIMITED': 'Too many requests. Please wait a few minutes and try again.',
    'SESSION_EXPIRED': 'Your Google session has expired. Please reconnect your account.',
    'PERMISSION_DENIED': 'Permission denied. Make sure you have access to Google Business Profile.',
    'GOOGLE_API_ERROR': 'Google service is temporarily unavailable. Please try again later.',
    'GOOGLE_NOT_CONNECTED': 'Google account is not connected.',
    'DATABASE_ERROR': 'Something went wrong. Please try again.',
    'db_error': 'Something went wrong saving your data. Please try again.',
    'cancelled': 'Google sign-in was cancelled.',
    'config_error': 'Google connection is not configured. Please contact support.',
    'missing_params': 'Something went wrong. Please try again.',
    'invalid_state': 'Session expired. Please try connecting again.',
    'state_expired': 'Session expired. Please try connecting again.',
    'unknown': 'An unexpected error occurred. Please try again.',
  };
  
  return messages[error] || error;
}

/**
 * ⚙️ SettingsPanel - 살롱 설정 패널
 * 
 * 섹션:
 * 1. Google Connection - Google 연결 상태
 * 2. Auto Reply - 자동 답글 설정
 * 3. Notifications - 알림 설정
 * 4. Integrations - 기타 연동 설정
 */
export default function SettingsPanel({ auth }: SettingsPanelProps) {
  const searchParams = useSearchParams();
  const salonId = auth?.salonId ?? null;
  const userId = auth?.userId ?? null;

  // URL 파라미터에서 Google 연결 결과 확인
  const googleSuccess = searchParams.get('google_success');
  const googleError = searchParams.get('google_error');
  const googleEmail = searchParams.get('google_email');

  const [form, setForm] = useState<SalonSettings>({
    salonName: auth?.salonName ?? "",
    googlePlaceId: "",
    yelpBusinessId: "",
    autoReplyGoogle: false,
    autoReplyYelp: false,
    notificationEmail: auth?.email ?? "",
    autoReplyMinRating: 4,
    googleConnected: false,
    googleEmail: null,
    googleLocationId: null,
    googleLocationName: null,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google 위치 선택 관련
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [googleLocations, setGoogleLocations] = useState<GoogleAccount[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [isConnectingLocation, setIsConnectingLocation] = useState(false);

  // 리뷰 동기화 관련
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ imported: number; updated: number } | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // ⚠️ 자동 답글 경고 모달
  const [showAutoReplyWarning, setShowAutoReplyWarning] = useState(false);
  const [pendingAutoReplySource, setPendingAutoReplySource] = useState<AutoReplySource | null>(null);

  // 🔗 Google 연결 해제 모달
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // 설정 불러오기
  useEffect(() => {
    if (!salonId) {
      setIsLoading(false);
      return;
    }

    const fetchSettings = async () => {
      try {
        const res = await fetchWithTimeout(`/api/salons/${salonId}/settings`, {
          headers: getAuthHeaders(),
          timeout: 10000,
          retries: 1,
        });
        const json = await res.json();

        if (json.ok && json.data) {
          setForm({
            salonName: json.data.name || "",
            googlePlaceId: json.data.googlePlaceId || "",
            yelpBusinessId: json.data.yelpBusinessId || "",
            autoReplyGoogle: json.data.autoReplyGoogle || false,
            autoReplyYelp: json.data.autoReplyYelp || false,
            notificationEmail: json.data.notificationEmail || auth?.email || "",
            autoReplyMinRating: json.data.autoReplyMinRating || 4,
            googleConnected: json.data.googleConnected || false,
            googleEmail: json.data.googleEmail || null,
            googleLocationId: json.data.googleLocationId || null,
            googleLocationName: json.data.googleLocationName || null,
          });
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
        if (err instanceof FetchTimeoutError) {
          setError("Request timed out. Please refresh the page.");
        } else {
          setError("Failed to load settings");
        }
      } finally {
        setIsLoading(false);
      }
    };

    void fetchSettings();
  }, [salonId, auth?.email]);

  // Auto Reply 토글 핸들러 (경고 모달 표시)
  const handleAutoReplyToggle = (source: AutoReplySource, newValue: boolean) => {
    if (newValue) {
      // ON으로 켜려고 할 때 → 경고 모달 표시
      setPendingAutoReplySource(source);
      setShowAutoReplyWarning(true);
    } else {
      // OFF로 끄는 건 바로 적용
      if (source === 'google') {
        setForm({ ...form, autoReplyGoogle: false });
      } else {
        setForm({ ...form, autoReplyYelp: false });
      }
    }
  };

  // 경고 모달에서 확인 클릭
  const handleConfirmAutoReply = () => {
    if (pendingAutoReplySource === 'google') {
      setForm({ ...form, autoReplyGoogle: true });
    } else if (pendingAutoReplySource === 'yelp') {
      setForm({ ...form, autoReplyYelp: true });
    }
    setShowAutoReplyWarning(false);
    setPendingAutoReplySource(null);
  };

  // 경고 모달 닫기
  const handleCancelAutoReply = () => {
    setShowAutoReplyWarning(false);
    setPendingAutoReplySource(null);
  };

  // Google 위치 목록 불러오기
  const fetchGoogleLocations = async () => {
    if (!userId) return;

    setIsLoadingLocations(true);
    try {
      const res = await fetchExternal(`/api/google/locations?userId=${userId}`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();

      if (json.ok && json.data) {
        setGoogleLocations(json.data.accounts || []);
        setShowLocationPicker(true);
      } else {
        setError(getErrorMessage(json.error || "unknown"));
      }
    } catch (err) {
      console.error("Failed to fetch locations:", err);
      if (err instanceof FetchTimeoutError) {
        setError("Request timed out. Google may be slow. Please try again.");
      } else {
        setError(getErrorMessage("unknown"));
      }
    } finally {
      setIsLoadingLocations(false);
    }
  };

  // Google 위치 연결
  const connectLocation = async (location: GoogleLocation) => {
    if (!salonId || !userId) return;

    setIsConnectingLocation(true);
    try {
      const res = await fetchWithTimeout('/api/google/connect-location', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          salonId,
          userId,
          locationName: location.name,
          locationId: location.locationId,
          locationTitle: location.title,
        }),
        timeout: 15000,
        retries: 1,
      });

      const json = await res.json();

      if (json.ok) {
        setForm({
          ...form,
          googleConnected: true,
          googleLocationId: location.locationId,
          googleLocationName: location.title,
        });
        setShowLocationPicker(false);
      } else {
        setError(getErrorMessage(json.error || "unknown"));
      }
    } catch (err) {
      console.error("Failed to connect location:", err);
      if (err instanceof FetchTimeoutError) {
        setError("Request timed out. Please try again.");
      } else {
        setError(getErrorMessage("unknown"));
      }
    } finally {
      setIsConnectingLocation(false);
    }
  };

  // Google 연결 해제 모달 열기
  const disconnectGoogle = () => {
    setShowDisconnectModal(true);
  };

  // Google 연결 해제 실행
  const handleConfirmDisconnect = async () => {
    if (!salonId) return;

    setIsDisconnecting(true);
    try {
      const res = await fetchWithTimeout(`/api/google/connect-location?salonId=${salonId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        timeout: 10000,
      });

      const json = await res.json();

      if (json.ok) {
        setForm({
          ...form,
          googleConnected: false,
          googleEmail: null,
          googleLocationId: null,
          googleLocationName: null,
        });
        setLastSyncedAt(null);
        setShowDisconnectModal(false);
      } else {
        setError(getErrorMessage(json.error || "unknown"));
      }
    } catch (err) {
      console.error("Failed to disconnect:", err);
      if (err instanceof FetchTimeoutError) {
        setError("Request timed out. Please try again.");
      } else {
        setError(getErrorMessage("unknown"));
      }
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Google 리뷰 동기화
  const syncGoogleReviews = async () => {
    if (!salonId) return;

    setIsSyncing(true);
    setError(null);
    setSyncResult(null);

    try {
      // 동기화는 오래 걸릴 수 있으므로 60초 타임아웃
      const res = await fetchWithTimeout('/api/google/sync-reviews', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ salonId }),
        timeout: 60000, // 60초
        retries: 1,
      });

      const json = await res.json();

      if (json.ok && json.data) {
        setSyncResult({
          imported: json.data.importedCount,
          updated: json.data.updatedCount,
        });
        setLastSyncedAt(new Date().toISOString());
        
        // 3초 후 결과 메시지 숨김
        setTimeout(() => setSyncResult(null), 5000);
      } else {
        setError(getErrorMessage(json.code || json.error || "unknown"));
      }
    } catch (err) {
      console.error("Failed to sync:", err);
      if (err instanceof FetchTimeoutError) {
        setError("Sync timed out. This might happen with many reviews. Please try again.");
      } else {
        setError(getErrorMessage("unknown"));
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // 설정 저장
  const handleSave = async () => {
    if (!salonId) return;

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const res = await fetchWithTimeout(`/api/salons/${salonId}/settings`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          googlePlaceId: form.googlePlaceId,
          yelpBusinessId: form.yelpBusinessId,
          autoReplyGoogle: form.autoReplyGoogle,
          autoReplyYelp: form.autoReplyYelp,
          autoReplyMinRating: form.autoReplyMinRating,
          notificationEmail: form.notificationEmail,
        }),
        timeout: 10000,
        retries: 1,
      });

      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || "Failed to save");
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      if (err instanceof FetchTimeoutError) {
        setError("Request timed out. Please try again.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to save settings");
      }
    } finally {
      setIsSaving(false);
    }
  };

  // 로딩 중 (스켈레톤 UI)
  if (isLoading) {
    return <SettingsPageSkeleton />;
  }

  // 살롱 없음
  if (!salonId) {
    return (
      <AppCard className="p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
          <Link2 className="h-8 w-8 text-amber-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">No salon connected</h3>
        <p className="mt-2 text-sm text-slate-500">
          Settings will be available after your salon is set up.
        </p>
      </AppCard>
    );
  }

  // 소스별 라벨
  const sourceLabel = pendingAutoReplySource === 'google' ? 'Google' : 'Yelp';

  return (
    <div className="space-y-6">
      {/* Google OAuth 결과 배너 */}
      {googleSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-800">Google account connected!</p>
            {googleEmail && (
              <p className="text-xs text-emerald-600">Signed in as {decodeURIComponent(googleEmail)}</p>
            )}
          </div>
        </div>
      )}

      {googleError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <p className="text-sm text-rose-700">
            {googleError === 'cancelled' 
              ? 'Google sign-in was cancelled.' 
              : `Failed to connect Google: ${googleError}`}
          </p>
        </div>
      )}

      {/* Google Connection Section */}
      <AppCard className="overflow-hidden">
        <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-green-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-green-500 shadow-lg shadow-blue-500/30 text-white font-bold">
                G
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Google Business Profile</h2>
                <p className="text-sm text-slate-500">Connect to sync reviews automatically</p>
              </div>
            </div>
            {/* 연결된 상태일 때만 해제 버튼 표시 */}
            {(form.googleConnected || googleSuccess) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={disconnectGoogle}
                className="text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                title="Disconnect Google Account"
              >
                <Unlink className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Disconnect</span>
              </Button>
            )}
          </div>
        </div>

        <div className="p-6">
          {form.googleConnected && form.googleLocationName ? (
            // 연결됨 상태 (위치까지 선택 완료)
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">Connected</p>
                    <p className="text-xs text-slate-500 truncate">{form.googleLocationName}</p>
                    {form.googleEmail && (
                      <p className="text-xs text-slate-400 truncate">{form.googleEmail}</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={fetchGoogleLocations}
                  loading={isLoadingLocations}
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="hidden sm:inline">Change Location</span>
                </Button>
              </div>
            </div>
          ) : form.googleConnected || googleSuccess ? (
            // Google 계정 연결됨, 위치 선택 필요
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 shrink-0">
                    <MapPin className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">Select a location</p>
                    <p className="text-xs text-slate-500 truncate">
                      {form.googleEmail || (googleEmail ? decodeURIComponent(googleEmail) : 'Choose which business to connect')}
                    </p>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={fetchGoogleLocations}
                  loading={isLoadingLocations}
                  className="w-full sm:w-auto justify-center"
                >
                  <MapPin className="h-4 w-4" />
                  Select Location
                </Button>
              </div>
            </div>
          ) : (
            // 연결 안 됨 상태
            <div className="text-center py-4">
              <p className="text-sm text-slate-500 mb-4">
                Connect your Google Business Profile to automatically sync reviews
              </p>
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  window.location.href = `/api/google/auth/start?userId=${userId}&salonId=${salonId}`;
                }}
              >
                <ExternalLink className="h-4 w-4" />
                Connect Google Account
              </Button>
            </div>
          )}
        </div>
      </AppCard>

      {/* Location Picker Modal */}
      {showLocationPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Select a Location</h3>
              <p className="text-sm text-slate-500">Choose which business location to connect</p>
            </div>
            
            <div className="overflow-auto max-h-[50vh] p-4">
              {googleLocations.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-500">No locations found</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Make sure you have access to a Google Business Profile
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {googleLocations.map((account) => (
                    <div key={account.accountId}>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 px-1">
                        {account.accountName}
                      </p>
                      {account.locations.map((location) => (
                        <button
                          key={location.name}
                          onClick={() => connectLocation(location)}
                          disabled={isConnectingLocation}
                          className="w-full p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left group"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700">
                                {location.title}
                              </p>
                              {location.address && (
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {location.address}
                                </p>
                              )}
                            </div>
                            {isConnectingLocation ? (
                              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                            ) : (
                              <CheckCircle2 className="h-5 w-5 text-slate-300 group-hover:text-indigo-500" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 px-6 py-4">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setShowLocationPicker(false)}
                className="w-full justify-center"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Auto Reply Section */}
      <AppCard className="overflow-hidden">
        <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-violet-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Auto Reply</h2>
              <p className="text-sm text-slate-500">Automatically generate AI replies for new reviews</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Google Auto Reply */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-green-500 text-white font-bold text-sm">
                G
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Google Reviews</p>
                <p className="text-xs text-slate-500">Auto-reply to Google Business reviews</p>
              </div>
            </div>
            <Toggle
              enabled={form.autoReplyGoogle}
              onChange={(v) => handleAutoReplyToggle('google', v)}
            />
          </div>

          {/* Yelp Auto Reply */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-red-500 to-rose-500 text-white font-bold text-sm">
                Y
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Yelp Reviews</p>
                <p className="text-xs text-slate-500">Auto-reply to Yelp reviews</p>
              </div>
            </div>
            <Toggle
              enabled={form.autoReplyYelp}
              onChange={(v) => handleAutoReplyToggle('yelp', v)}
            />
          </div>

          {/* Min Rating - 모바일 반응형 개선 */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 shrink-0">
                  <Star className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Minimum Rating</p>
                  <p className="text-xs text-slate-500">Only auto-reply to reviews with this rating or higher</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 justify-end">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setForm({ ...form, autoReplyMinRating: rating })}
                    className={`
                      flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg text-xs sm:text-sm font-semibold transition-all
                      ${form.autoReplyMinRating === rating
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                        : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                      }
                    `}
                  >
                    {rating}★
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Auto Reply 경고 문구 */}
          {(form.autoReplyGoogle || form.autoReplyYelp) && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-800">
                  <p className="font-semibold mb-1">Auto Reply is enabled</p>
                  <p>
                    AI replies will be automatically generated for reviews with {form.autoReplyMinRating}+ stars. 
                    Replies are saved as drafts and <strong>not posted automatically</strong> — 
                    you can review and post them from the dashboard.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </AppCard>

      {/* Notifications Section */}
      <AppCard className="overflow-hidden">
        <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-green-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Notifications</h2>
              <p className="text-sm text-slate-500">Get notified about new reviews and AI replies</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Mail className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-900 mb-1.5">
                Notification Email
              </label>
              <input
                type="email"
                value={form.notificationEmail}
                onChange={(e) => setForm({ ...form, notificationEmail: e.target.value })}
                placeholder="your@email.com"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <p className="mt-1.5 text-xs text-slate-500">
                Receive email notifications when new reviews arrive
              </p>
            </div>
          </div>
        </div>
      </AppCard>

      {/* Error Message */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Save Button */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {saveSuccess && (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Settings saved!
          </div>
        )}
        <Button
          variant="primary"
          size="lg"
          loading={isSaving}
          onClick={handleSave}
        >
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>

      {/* ⚠️ Auto Reply 경고 모달 */}
      <ConfirmModal
        isOpen={showAutoReplyWarning}
        onClose={handleCancelAutoReply}
        onConfirm={handleConfirmAutoReply}
        title={`Enable Auto Reply for ${sourceLabel}?`}
        icon={<Zap className="h-6 w-6" />}
        variant="warning"
        confirmText="Yes, Enable"
        cancelText="Cancel"
        message={
          <div className="space-y-3 text-left mt-2">
            {/* 주요 안내 */}
            <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
                <div className="text-xs text-indigo-800">
                  <p className="font-semibold mb-1">How Auto Reply works</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>AI replies are generated automatically for new reviews</li>
                    <li>Only reviews with <strong>{form.autoReplyMinRating}+ stars</strong> get auto-reply</li>
                    <li>Replies are saved as <strong>drafts</strong> (not posted automatically)</li>
                    <li>You can review and edit before posting</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 경고 사항 */}
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-800">
                  <p className="font-semibold mb-1">Please note</p>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                    <li>Lower-rated reviews (1-{form.autoReplyMinRating - 1} stars) require manual reply</li>
                    <li>AI-generated content should be reviewed before posting</li>
                    <li>You can turn this off at any time</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 저장 안내 */}
            <p className="text-xs text-slate-500 text-center">
              Remember to click <strong>"Save Changes"</strong> to apply this setting.
            </p>
          </div>
        }
      />
    </div>
  );
}
