// app/(auth)/signup/page.tsx
"use client";

import { Suspense } from "react";
import SignUpForm from "./SignUpForm";

export default function SignUpPage() {
  return (
    <Suspense fallback={<SignUpLoading />}>
      <SignUpForm />
    </Suspense>
  );
}

function SignUpLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#F7F8FA]">
      <div className="w-[440px] bg-white rounded-[12px] border border-[#E5E7EB] p-10 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-3/4"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          <div className="space-y-3 mt-6">
            <div className="h-10 bg-slate-200 rounded"></div>
            <div className="h-10 bg-slate-200 rounded"></div>
            <div className="h-10 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
