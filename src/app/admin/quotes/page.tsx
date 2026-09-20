"use client";

import AuthGuard from "@/components/AuthGuard";
import QuoteAdmin from "@/components/admin/QuoteAdmin";

/** 견적 접수 관리 — 상태 변경. */
export default function AdminQuotesPage() {
  return (
    <AuthGuard requireAdmin>
      <QuoteAdmin />
    </AuthGuard>
  );
}
