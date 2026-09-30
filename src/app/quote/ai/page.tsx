"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import AiQuotePanel from "@/components/quote/AiQuotePanel";
import DirectQuoteForm from "@/components/quote/DirectQuoteForm";
import PublicIntakePage from "@/components/intake/PublicIntakePage";
import { Container } from "@/components/ui";
import { getSession } from "@/lib/auth";
import s from "@/components/quote/quote.module.css";

export default function AiQuotePage() {
  const [mode, setMode] = useState<"checking" | "guest" | "admin" | "customer">("checking");

  useEffect(() => {
    let alive = true;
    getSession().then((session) => {
      if (alive) setMode(session ? (session.isAdmin ? "admin" : "customer") : "guest");
    });
    return () => { alive = false; };
  }, []);

  if (mode === "checking") {
    return <p className="pf-container pf-help" style={{ paddingBlock: 64 }}>확인 중입니다.</p>;
  }

  if (mode === "guest") {
    return <Container><PublicIntakePage /></Container>;
  }

  return (
    <AuthGuard requireCustomerProfile allowAdminPreview>
      <Container>
        <div className={s.page}>
          <div className={s.pageHead}>
            <div>
              <span className={s.eyebrow}>Quote Assistant</span>
              <h1>{mode === "customer" ? "견적 요청" : "AI 견적 상담"}</h1>
              <p className={s.pageSub}>{mode === "admin"
                ? "관리자 전용 GPT-6 Luna 시험입니다. 공개 원료·가상 제품 질문만 허용하며 견적은 제출되지 않습니다."
                : "고객용 AI 대화는 준비 중입니다. 아래 직접 입력으로 견적을 접수할 수 있습니다."}</p>
            </div>
          </div>
          <nav className={s.quoteTabs} aria-label="견적 작성 방식">
            <Link href="/quote/ai/" aria-current="page">{mode === "customer" ? "직접 견적 요청" : "AI 견적 상담"}</Link>
          </nav>
          {mode === "customer" ? <DirectQuoteForm /> : <AiQuotePanel mode={mode} />}
        </div>
      </Container>
    </AuthGuard>
  );
}
