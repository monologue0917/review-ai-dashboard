// app/components/auth/LoginCard.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import type { AuthInfo } from "@/lib/auth/useAuthInfo";

const STORAGE_KEY = "reviewai_auth";

export default function LoginCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultEmail = searchParams.get("email") ?? "";

  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("[LoginCard] /api/auth/login failed:", text);

        let message = "Login failed. Please check your email and password.";
        try {
          const json = JSON.parse(text);
          if (json?.error) message = json.error;
        } catch {}
        setError(message);
        return;
      }

      const json = await res.json();
      
      // 새 API 응답 형식 처리
      const auth: AuthInfo = {
        userId: json.user?.id ?? "",
        email: json.user?.email ?? "",
        salonId: json.salon?.id ?? "",
        salonName: json.salon?.name ?? "",
        // Supabase 세션 정보
        accessToken: json.session?.accessToken,
        refreshToken: json.session?.refreshToken,
        expiresAt: json.session?.expiresAt,
      };

      // 🔐 세션 저장
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));

      // 🚀 대시보드 이동
      router.push("/dashboard");
    } catch (err) {
      console.error("[LoginCard] Unexpected error:", err);
      setError("Unexpected error while logging in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white px-8 py-6 shadow-sm">
      <h1 className="text-lg font-semibold text-slate-900">Log in</h1>
      <p className="mt-1 text-sm text-slate-500">
        Enter the email and password you used to sign up.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            type="email"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            type="password"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>
    </div>
  );
}
