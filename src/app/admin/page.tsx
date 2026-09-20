"use client";

import AuthGuard from "@/components/AuthGuard";
import AdminSummary from "@/components/admin/AdminSummary";

/** 관리자 요약 — 관리자 세션만 들어온다. */
export default function AdminPage() {
  return (
    <AuthGuard requireAdmin>
      <AdminSummary />
    </AuthGuard>
  );
}
