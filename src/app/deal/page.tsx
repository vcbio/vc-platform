"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import DealDashboard from "@/components/deal/DealDashboard";
import { ButtonLink, Container } from "@/components/ui";
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
  if (!signedIn) return <Container><section style={{ paddingBlock: 64 }}><h1>거래관리</h1><p>로그인하면 진행 상황을 볼 수 있습니다.</p><ButtonLink href="/login/?next=deal">로그인</ButtonLink></section></Container>;

  return (
    <AuthGuard requireCustomerProfile>
      <DealDashboard />
    </AuthGuard>
  );
}
