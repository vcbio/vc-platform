"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import DealDashboard from "@/components/deal/DealDashboard";
import PublicIntakePage from "@/components/intake/PublicIntakePage";
import { Container } from "@/components/ui";
import { getSession } from "@/lib/auth";

/** 거래관리 대시보드 — 로그인한 사람의 견적만 보여준다. */
export default function DealPage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    getSession().then((session) => alive && setSignedIn(Boolean(session)));
    return () => { alive = false; };
  }, []);

  if (signedIn === null) return <p className="pf-container pf-help" style={{ paddingBlock: 64 }}>확인 중입니다.</p>;
  if (!signedIn) return <Container><PublicIntakePage context="deal" /></Container>;

  return (
    <AuthGuard requireCustomerProfile>
      <DealDashboard />
    </AuthGuard>
  );
}
