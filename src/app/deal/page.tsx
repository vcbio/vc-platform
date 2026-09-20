"use client";

import AuthGuard from "@/components/AuthGuard";

export default function DealPage() {
  return (
    <AuthGuard>
      <main className="mx-auto w-full max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">견적 요청</h1>
        <p className="mt-3 text-sm text-slate-600">2단계에서 구현합니다.</p>
      </main>
    </AuthGuard>
  );
}
