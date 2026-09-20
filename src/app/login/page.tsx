"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth";
import { Button, Container, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error } = await signIn(email, password);
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    router.push("/deal/");
  }

  return (
    <Container>
      <div className="mx-auto w-full max-w-sm py-20">
        <h1>로그인</h1>

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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <p role="alert" className="pf-alert mb-5">
              {error}
            </p>
          )}

          <Button type="submit" block disabled={busy}>
            {busy ? "로그인 중" : "로그인"}
          </Button>
        </form>

        <p className="pf-help mt-6">
          계정이 없으신가요? <Link href="/signup/">가입하기</Link>
        </p>
      </div>
    </Container>
  );
}
