"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/**
 * 로그인/관리자 화면 가드.
 *
 * ⚠️ 이건 보안 경계가 아니다 — 정적 사이트라 HTML·JS 는 누구나 받아갈 수 있다.
 * 실제 차단은 Supabase RLS 가 한다. 여기는 "안 보여주기"까지만 한다.
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

    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!alive) return;

      if (!session) {
        router.replace("/login/");
        return;
      }

      if (requireAdmin) {
        const { data: profile } = await supabase
          .from("vcp_profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();
        if (!alive) return;
        if (profile?.role !== "admin") {
          router.replace("/");
          return;
        }
      }

      setState("ok");
    })();

    return () => {
      alive = false;
    };
  }, [router, requireAdmin]);

  if (state === "checking") {
    return <p className="px-6 py-16 text-sm text-slate-500">확인 중…</p>;
  }

  return <>{children}</>;
}
