"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth";
import { Button, Container, Input } from "@/components/ui";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error } = await signUp(email, password, companyName || undefined);
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <Container>
        <div className="mx-auto w-full max-w-sm py-20">
          <h1>인증 메일을 확인하세요</h1>
          <p className="pf-help mt-4">
            {email} 으로 인증 메일을 보냈습니다. 메일 속 링크를 누르면 가입이 끝납니다. 메일이 안
            보이면 스팸함도 확인해 주세요.
          </p>
          <p className="pf-help mt-3">
            지금은 시연 화면이라 메일 인증 없이 바로 로그인된 상태입니다.
          </p>
          <div className="mt-8 flex gap-3">
            <Button onClick={() => router.push("/deal/")}>견적 요청으로 가기</Button>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="mx-auto w-full max-w-sm py-20">
        <h1>가입하기</h1>

        <form onSubmit={onSubmit} className="mt-8" noValidate>
          <Input
            label="이메일"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="비밀번호"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            help="8자 이상"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            label="회사명 (선택)"
            type="text"
            autoComplete="organization"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />

          {error && (
            <p role="alert" className="pf-alert mb-5">
              {error}
            </p>
          )}

          <Button type="submit" block disabled={busy}>
            {busy ? "가입 중" : "가입하기"}
          </Button>
        </form>

        <p className="pf-help mt-6">
          이미 계정이 있으신가요? <Link href="/login/">로그인</Link>
        </p>
      </div>
    </Container>
  );
}
