"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { toKorean } from "@/lib/authError";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { company_name: companyName },
        // 인증 메일의 링크가 돌아올 곳. 정적 배포 경로를 그대로 쓴다.
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/vc-platform/login/`
            : undefined,
      },
    });
    setBusy(false);
    if (error) {
      setError(toKorean(error.message));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          인증 메일을 보냈습니다
        </h1>
        <p className="text-sm leading-6 text-slate-700">
          {email} 으로 인증 메일을 보냈습니다. 메일 속 링크를 누르면 가입이 끝납니다.
          메일이 안 보이면 스팸함도 확인해 주세요.
        </p>
        <Link href="/login/" className="text-sm font-medium text-slate-900 underline">
          로그인으로 가기
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">가입하기</h1>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-slate-700">이메일</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-slate-700">비밀번호</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
          <span className="text-xs text-slate-500">8자 이상</span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-slate-700">회사명 (선택)</span>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
        </label>

        {error && (
          <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="rounded bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "가입 중…" : "가입하기"}
        </button>
      </form>

      <p className="text-sm text-slate-600">
        이미 계정이 있으신가요?{" "}
        <Link href="/login/" className="font-medium text-slate-900 underline">
          로그인
        </Link>
      </p>
    </main>
  );
}
