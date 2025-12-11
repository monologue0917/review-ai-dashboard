// app/settings/page.tsx
"use client";

import { Suspense } from "react";
import SettingsContent from "./SettingsContent";
import { AppLayout } from "../components/auth/AppLayout";
import { SettingsPageSkeleton } from "../components/ui";

export default function SettingsPage() {
  return (
    <AppLayout pageTitle="Settings">
      <Suspense fallback={<SettingsLoading />}>
        <SettingsContent />
      </Suspense>
    </AppLayout>
  );
}

function SettingsLoading() {
  return (
    <div className="flex-1 overflow-auto px-4 lg:px-6 py-6 lg:py-8">
      <div className="mx-auto max-w-3xl">
        <SettingsPageSkeleton />
      </div>
    </div>
  );
}
