"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button, Input, Select } from "@/components/ui";
import { submitPublicIntake } from "@/lib/intake";
import TurnstileField from "./TurnstileField";
import s from "./intake.module.css";

export default function QuickInquiryForm() {
  const startedAt = useRef(0);
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receiptId, setReceiptId] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [challengeRound, setChallengeRound] = useState(0);

  useEffect(() => {
    startedAt.current = Date.now();
    const picked = new URLSearchParams(window.location.search).get("ingredient")?.trim();
    const field = formRef.current?.elements.namedItem("ingredient");
    if (picked && field instanceof HTMLInputElement) field.value = picked.slice(0, 100);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    try {
      const id = await submitPublicIntake({
        kind: "quick_quote",
        ingredient: String(data.get("ingredient") || "").trim(),
        dosageForm: String(data.get("dosageForm") || "").trim(),
        quantity: String(data.get("quantity") || "").trim(),
        contact: String(data.get("contact") || "").trim(),
        turnstileToken,
        website: String(data.get("website") || ""),
        startedAt: startedAt.current,
        consent: true,
        privacyVersion: "2026-09-30",
      });
      setReceiptId(id);
      form.reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "접수하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setTurnstileToken("");
      setChallengeRound((value) => value + 1);
    } finally {
      setBusy(false);
    }
  }

  if (receiptId) {
    return (
      <section className={s.result} aria-live="polite">
        <h2>문의가 접수되었습니다</h2>
        <p>접수 번호는 {receiptId}입니다. 남겨주신 연락처로 개별 회신드립니다.</p>
        <p>가입하면 이후 새로 요청한 견적의 진행 상황을 볼 수 있습니다. 이번 비회원 문의는 계정에 자동 연결되지 않습니다.</p>
        <div className={s.actions}>
          <Link className="pf-btn pf-btn-primary" href="/signup/">가입하기</Link>
          <button className="pf-btn pf-btn-secondary" type="button" onClick={() => { setTurnstileToken(""); setChallengeRound((value) => value + 1); setReceiptId(""); }}>새 문의 작성</button>
        </div>
      </section>
    );
  }

  return (
    <form ref={formRef} className={s.form} onSubmit={submit} noValidate={false}>
      <div className={s.grid}>
        <Input label="원료" name="ingredient" required minLength={2} maxLength={100} autoComplete="off" />
        <Select label="제형" name="dosageForm" required defaultValue="">
          <option value="" disabled>제형 선택</option>
          <option>정제</option><option>캡슐</option><option>환</option><option>분말</option>
          <option>스틱</option><option>젤리</option><option>액상</option><option>기타</option>
        </Select>
        <Input label="수량" name="quantity" required minLength={2} maxLength={32}
          pattern="(?:0\.[0-9]+|[1-9][0-9]{0,8}(?:\.[0-9]+)?|[1-9][0-9]{0,2}(?:,[0-9]{3}){1,2}(?:\.[0-9]+)?)\s*(병|개|포|정|캡슐|박스|세트|kg|g|L|mL)"
          title="0보다 큰 숫자와 단위를 함께 입력해 주세요. 예: 3,000병" placeholder="예: 3,000병" />
        <Input label="연락처" name="contact" required minLength={5} maxLength={120} autoComplete="email" placeholder="전화번호 또는 이메일" />
      </div>
      <div className={s.honeypot} aria-hidden="true">
        <label htmlFor="quick-website">웹사이트</label>
        <input id="quick-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <label className={s.consent}>
        <input type="checkbox" required />
        <span><Link href="/privacy/">개인정보 처리방침</Link>의 수집 목적과 접수 후 3년 보관에 동의합니다.</span>
      </label>
      <TurnstileField key={challengeRound} action="quick_quote" onToken={setTurnstileToken} />
      {error && <p className="pf-alert" role="alert">{error}</p>}
      <Button type="submit" block disabled={busy || !turnstileToken}>{busy ? "접수 중" : "문의 접수"}</Button>
    </form>
  );
}
