// app/login/page.tsx
"use client";

import { Suspense } from "react";
import LoginCard from "../components/auth/LoginCard";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <Suspense fallback={<LoginLoading />}>
        <LoginCard />
      </Suspense>
    </div>
  );
}

function LoginLoading() {
  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white px-8 py-6 shadow-sm">
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 rounded w-1/3"></div>
        <div className="h-4 bg-slate-200 rounded w-2/3"></div>
        <div className="space-y-3 mt-6">
          <div className="h-10 bg-slate-200 rounded"></div>
          <div className="h-10 bg-slate-200 rounded"></div>
          <div className="h-10 bg-slate-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}
