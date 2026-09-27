"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import AiQuotePanel from "@/components/quote/AiQuotePanel";
import { Container } from "@/components/ui";
import { getSession } from "@/lib/auth";
import s from "@/components/quote/quote.module.css";

export default function AiQuotePage() {
  const router = useRouter();
  const [mode, setMode] = useState<"checking" | "admin" | "customer">("checking");

  useEffect(() => {
    let alive = true;
    getSession().then((session) => {
      if (alive && session) setMode(session.isAdmin ? "admin" : "customer");
    });
    return () => { alive = false; };
  }, []);

  return (
    <AuthGuard requireCustomerProfile allowAdminPreview>
      <Container>
        <div className={s.page}>
          <div className={s.pageHead}>
            <div>
              <span className={s.eyebrow}>Quote Assistant</span>
              <h1>AI 견적 상담</h1>
              <p className={s.pageSub}>{mode === "admin"
                ? "고객에게 보이는 AI 견적 화면의 미리보기입니다. 관리자는 이 화면에서 견적을 제출하지 않습니다."
                : "제품 조건을 함께 정리하는 기능입니다. AI 연결 전에도 직접 견적을 요청할 수 있습니다."}</p>
            </div>
          </div>
          <nav className={s.quoteTabs} aria-label="견적 작성 방식">
            {mode === "customer" && <Link href="/quote/">직접 견적 요청</Link>}
            <Link href="/quote/ai/" aria-current="page">AI 견적 상담</Link>
          </nav>
          <AiQuotePanel mode={mode} onUseForm={() => router.push("/quote/")} />
        </div>
      </Container>
    </AuthGuard>
  );
}
