"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { authReady, signInWithGoogle, signUp } from "@/lib/auth";
import { profileError, type CustomerProfileInput } from "@/lib/customerProfile";
import { Button, Container, Input } from "@/components/ui";
import s from "../auth-google.module.css";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState<CustomerProfileInput>({
    companyName: "", brandName: "", contactName: "", contactPhone: "", retentionConsent: false,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("이메일 형식을 확인해 주세요.");
    if (password.length < 8) return setError("비밀번호는 8자 이상이어야 합니다.");
    const invalid = profileError(profile);
    if (invalid) return setError(invalid);
    setBusy(true);
    const { error, session } = await signUp(email.trim(), password, profile);
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    if (session) router.push("/profile/?next=quote");
    else setDone(true);
  }

  async function onGoogleSignIn() {
    setError("");
    setBusy(true);
    const { error } = await signInWithGoogle("quote");
    if (error) {
      setError(error);
      setBusy(false);
    }
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
          <div className="mt-8 flex gap-3">
            <Button onClick={() => router.push("/login/")}>로그인으로 가기</Button>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="mx-auto w-full max-w-sm py-20">
        <h1>가입하기</h1>

        <div className="mt-8">
          <Button
            type="button"
            variant="secondary"
            className={s.googleButton}
            block
            disabled={busy || !authReady()}
            onClick={onGoogleSignIn}
          >
            <Image src="/vc-platform/branding/google-g.png" alt="" width={200} height={204} className={s.googleMark} unoptimized />
            <span>Google로 계속하기</span>
          </Button>
          <p className="pf-help mt-3">Google 가입 후에도 회사·브랜드·담당자 정보를 입력해야 견적을 보낼 수 있습니다.</p>
          {!authReady() && <p className="pf-help mt-3">구글 로그인 설정 중입니다.</p>}
        </div>

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
            label="회사명"
            type="text"
            required
            autoComplete="organization"
            value={profile.companyName}
            onChange={(e) => setProfile((old) => ({ ...old, companyName: e.target.value }))}
          />
          <Input
            label="브랜드명"
            type="text"
            required
            value={profile.brandName}
            onChange={(e) => setProfile((old) => ({ ...old, brandName: e.target.value }))}
          />
          <Input
            label="담당자"
            type="text"
            required
            autoComplete="name"
            value={profile.contactName}
            onChange={(e) => setProfile((old) => ({ ...old, contactName: e.target.value }))}
          />
          <Input
            label="연락처"
            type="tel"
            required
            autoComplete="tel"
            value={profile.contactPhone}
            onChange={(e) => setProfile((old) => ({ ...old, contactPhone: e.target.value }))}
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
        <p className="pf-help mt-3">
          가입 전 <Link className="underline underline-offset-4" href="/privacy/">개인정보 처리방침</Link>을 확인해 주세요.
        </p>
      </div>
    </Container>
  );
}
