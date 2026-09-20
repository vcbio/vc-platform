"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/auth";

/**
 * 로그인/관리자 화면 가드.
 *
 * ⚠️ 이건 보안 경계가 아니다 — 정적 사이트라 HTML·JS 는 누구나 받아갈 수 있다.
 * 여기는 "안 보여주기"까지만 한다. 실제 차단은 나중에 붙일 supabase RLS 가 한다.
 */
export default function AuthGuard({
  children,
  requireAdmin = false,
}: {
  children: React.ReactNode;
  requireAdmin?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "ok">("checking");

  useEffect(() => {
    let alive = true;

    getSession().then((session) => {
      if (!alive) return;
      if (!session) {
        router.replace("/login/");
        return;
      }
      if (requireAdmin && !session.isAdmin) {
        router.replace("/");
        return;
      }
      setState("ok");
    });

    return () => {
      alive = false;
    };
  }, [router, requireAdmin]);

  if (state === "checking") {
    return (
      <p className="pf-container pf-help" style={{ paddingBlock: "64px" }}>
        확인 중입니다.
      </p>
    );
  }

  return <>{children}</>;
}
