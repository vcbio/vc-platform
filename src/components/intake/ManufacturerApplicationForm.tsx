"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import { submitPublicIntake } from "@/lib/intake";
import TurnstileField from "./TurnstileField";
import s from "./intake.module.css";

export default function ManufacturerApplicationForm() {
  const startedAt = useRef(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receiptId, setReceiptId] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [challengeRound, setChallengeRound] = useState(0);

  useEffect(() => { startedAt.current = Date.now(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    try {
      const id = await submitPublicIntake({
        kind: "manufacturer_application",
        companyName: String(data.get("companyName") || "").trim(),
        region: String(data.get("region") || "").trim(),
        certifications: String(data.get("certifications") || "").trim(),
        dosageForms: String(data.get("dosageForms") || "").trim(),
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
      setError(caught instanceof Error ? caught.message : "신청을 접수하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setTurnstileToken("");
      setChallengeRound((value) => value + 1);
    } finally {
      setBusy(false);
    }
  }

  if (receiptId) {
    return (
      <section className={s.result} aria-live="polite">
        <h2>입점 신청이 접수되었습니다</h2>
        <p>접수 번호는 {receiptId}입니다. 검토 후 남겨주신 연락처로 개별 회신드립니다.</p>
        <p>제출한 회사 정보와 제조사 실명은 플랫폼에 공개되지 않습니다.</p>
      </section>
    );
  }

  return (
    <form className={s.form} onSubmit={submit}>
      <div className={s.grid}>
        <Input label="회사명" name="companyName" required minLength={2} maxLength={100} autoComplete="organization" />
        <Input label="지역" name="region" required minLength={2} maxLength={80} placeholder="예: 충북 음성" />
        <Input label="보유 인증" name="certifications" required minLength={2} maxLength={300} placeholder="예: 건강기능식품 GMP" />
        <Input label="가능 제형" name="dosageForms" required minLength={2} maxLength={300} placeholder="예: 정제, 경질캡슐, 분말 스틱" />
        <div className={s.wide}>
          <Input label="연락처" name="contact" required minLength={5} maxLength={120} autoComplete="email" placeholder="전화번호 또는 이메일" />
        </div>
      </div>
      <div className={s.honeypot} aria-hidden="true">
        <label htmlFor="maker-website">웹사이트</label>
        <input id="maker-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <label className={s.consent}>
        <input type="checkbox" required />
        <span><Link href="/privacy/">개인정보 처리방침</Link>의 수집 목적과 접수 후 3년 보관에 동의합니다.</span>
      </label>
      <TurnstileField key={challengeRound} action="manufacturer_application" onToken={setTurnstileToken} />
      {error && <p className="pf-alert" role="alert">{error}</p>}
      <Button type="submit" block disabled={busy || !turnstileToken}>{busy ? "접수 중" : "입점 신청"}</Button>
    </form>
  );
}
