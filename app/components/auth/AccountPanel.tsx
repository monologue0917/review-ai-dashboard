// app/components/auth/AccountPanel.tsx
"use client";

import { AppCard, Button, Avatar } from "../ui";
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  MapPin, 
  Shield,
  Edit3,
  Key,
  Trash2
} from "lucide-react";

type AuthData = {
  userId?: string;
  email?: string;
  salonId?: string | null;
  salonName?: string | null;
  contactName?: string | null;
  phoneNumber?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
};

type AccountPanelProps = {
  auth: {
    auth: AuthData | null;
    isLoaded: boolean;
  };
};

/**
 * 👤 AccountPanel - 계정 정보 패널
 */
export default function AccountPanel({ auth }: AccountPanelProps) {
  const user = auth.auth;
  const displayName = user?.contactName || user?.email?.split("@")[0] || "User";

  return (
    <div className="space-y-6">
      {/* 프로필 카드 */}
      <AppCard className="overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-violet-600 px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm text-2xl font-bold text-white border border-white/30">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {displayName}
              </h2>
              <p className="text-indigo-100">
                {user?.email || "No email"}
              </p>
              <span className="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white">
                Owner
              </span>
            </div>
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            Account Details
          </h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                <Mail className="h-4 w-4 text-slate-500" />
              </div>
              <div>
                <dt className="text-xs text-slate-500">Email</dt>
                <dd className="text-sm font-medium text-slate-900">
                  {user?.email || "Not set"}
                </dd>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                <User className="h-4 w-4 text-slate-500" />
              </div>
              <div>
                <dt className="text-xs text-slate-500">Name</dt>
                <dd className="text-sm font-medium text-slate-900">
                  {user?.contactName || "Not set"}
                </dd>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                <Phone className="h-4 w-4 text-slate-500" />
              </div>
              <div>
                <dt className="text-xs text-slate-500">Phone</dt>
                <dd className="text-sm font-medium text-slate-900">
                  {user?.phoneNumber || "Not set"}
                </dd>
              </div>
            </div>
          </dl>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <Button variant="secondary" size="sm" disabled>
              <Edit3 className="h-4 w-4" />
              Edit Profile
            </Button>
          </div>
        </div>
      </AppCard>

      {/* 살롱 정보 */}
      <AppCard className="overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <Building2 className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Salon Profile
              </h3>
              <p className="text-sm text-slate-500">
                Your connected business
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                <Building2 className="h-4 w-4 text-slate-500" />
              </div>
              <div>
                <dt className="text-xs text-slate-500">Salon Name</dt>
                <dd className="text-sm font-medium text-slate-900">
                  {user?.salonName || "Not set"}
                </dd>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                <MapPin className="h-4 w-4 text-slate-500" />
              </div>
              <div>
                <dt className="text-xs text-slate-500">Location</dt>
                <dd className="text-sm font-medium text-slate-900">
                  {user?.country || user?.state || user?.city
                    ? [user?.city, user?.state, user?.country].filter(Boolean).join(", ")
                    : "Not set"}
                </dd>
              </div>
            </div>
          </dl>
        </div>
      </AppCard>

      {/* 보안 & 계정 관리 */}
      <AppCard className="overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <Shield className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Security
              </h3>
              <p className="text-sm text-slate-500">
                Manage your account security
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-3">
              <Key className="h-5 w-5 text-slate-500" />
              <div>
                <p className="text-sm font-medium text-slate-900">Password</p>
                <p className="text-xs text-slate-500">Last changed: Never</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" disabled>
              Change
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-rose-50 border border-rose-100">
            <div className="flex items-center gap-3">
              <Trash2 className="h-5 w-5 text-rose-500" />
              <div>
                <p className="text-sm font-medium text-rose-900">Delete Account</p>
                <p className="text-xs text-rose-600">Permanently delete your account and data</p>
              </div>
            </div>
            <Button variant="danger" size="sm" disabled>
              Delete
            </Button>
          </div>
        </div>
      </AppCard>

      {/* 로드맵 안내 */}
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <p className="text-xs font-medium text-slate-700 mb-2">🚀 Coming Soon</p>
        <ul className="text-xs text-slate-500 space-y-1">
          <li>• Password change & 2FA authentication</li>
          <li>• Profile photo upload</li>
          <li>• Multi-salon management</li>
          <li>• Team member invites</li>
        </ul>
      </div>
    </div>
  );
}
