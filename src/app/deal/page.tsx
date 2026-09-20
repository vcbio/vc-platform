"use client";

import AuthGuard from "@/components/AuthGuard";
import DealDashboard from "@/components/deal/DealDashboard";

/** 거래관리 대시보드 — 로그인한 사람의 견적만 보여준다. */
export default function DealPage() {
  return (
    <AuthGuard>
      <DealDashboard />
    </AuthGuard>
  );
}
