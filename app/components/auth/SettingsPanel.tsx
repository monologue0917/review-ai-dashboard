// app/components/auth/SettingsPanel.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { 
  AppCard, 
  Button, 
  Toggle,
  SettingsPageSkeleton
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
  AlertCircle
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

  // 설정 불러오기
  useEffect(() => {
    if (!salonId) {
      setIsLoading(false);
      return;
    }

    const fetchSettings = async () => {
      try {
        const res = await fetch(`/api/salons/${salonId}/settings`);
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
        setError("Failed to load settings");
      } finally {
        setIsLoading(false);
      }
    };

    void fetchSettings();
  }, [salonId, auth?.email]);

  // Google 위치 목록 불러오기
  const fetchGoogleLocations = async () => {
    if (!userId) return;

    setIsLoadingLocations(true);
    try {
      const res = await fetch(`/api/google/locations?userId=${userId}`);
      const json = await res.json();

      if (json.ok && json.data) {
        setGoogleLocations(json.data.accounts || []);
        setShowLocationPicker(true);
      } else {
        setError(getErrorMessage(json.error || "unknown"));
      }
    } catch (err) {
      console.error("Failed to fetch locations:", err);
      setError(getErrorMessage("unknown"));
    } finally {
      setIsLoadingLocations(false);
    }
  };

  // Google 위치 연결
  const connectLocation = async (location: GoogleLocation) => {
    if (!salonId || !userId) return;

    setIsConnectingLocation(true);
    try {
      const res = await fetch('/api/google/connect-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId,
          userId,
          locationName: location.name,
          locationId: location.locationId,
          locationTitle: location.title,
        }),
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
      setError(getErrorMessage("unknown"));
    } finally {
      setIsConnectingLocation(false);
    }
  };

  // Google 연결 해제
  const disconnectGoogle = async () => {
    if (!salonId) return;

    if (!confirm("Are you sure you want to disconnect Google?")) return;

    try {
      const res = await fetch(`/api/google/connect-location?salonId=${salonId}`, {
        method: 'DELETE',
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
      } else {
        setError(getErrorMessage(json.error || "unknown"));
      }
    } catch (err) {
      console.error("Failed to disconnect:", err);
      setError(getErrorMessage("unknown"));
    }
  };

  // 설정 저장
  const handleSave = async () => {
    if (!salonId) return;

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/salons/${salonId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          googlePlaceId: form.googlePlaceId,
          yelpBusinessId: form.yelpBusinessId,
          autoReplyGoogle: form.autoReplyGoogle,
          autoReplyYelp: form.autoReplyYelp,
          autoReplyMinRating: form.autoReplyMinRating,
          notificationEmail: form.notificationEmail,
        }),
      });

      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.error || "Failed to save");
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
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
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-green-500 shadow-lg shadow-blue-500/30 text-white font-bold">
              G
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Google Business Profile</h2>
              <p className="text-sm text-slate-500">Connect to sync reviews automatically</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {form.googleConnected && form.googleLocationName ? (
            // 연결됨 상태
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Connected</p>
                    <p className="text-xs text-slate-500">{form.googleLocationName}</p>
                    {form.googleEmail && (
                      <p className="text-xs text-slate-400">{form.googleEmail}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={fetchGoogleLocations}
                    loading={isLoadingLocations}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Change
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={disconnectGoogle}
                    className="text-rose-600 hover:bg-rose-50"
                  >
                    <Unlink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : googleSuccess ? (
            // OAuth 성공했지만 위치 선택 안 함
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                    <MapPin className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Select a location</p>
                    <p className="text-xs text-slate-500">Choose which business to connect</p>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={fetchGoogleLocations}
                  loading={isLoadingLocations}
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
              onChange={(v) => setForm({ ...form, autoReplyGoogle: v })}
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
              onChange={(v) => setForm({ ...form, autoReplyYelp: v })}
            />
          </div>

          {/* Min Rating */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                  <Star className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Minimum Rating</p>
                  <p className="text-xs text-slate-500">Only auto-reply to reviews with this rating or higher</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setForm({ ...form, autoReplyMinRating: rating })}
                    className={`
                      flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition-all
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
    </div>
  );
}
