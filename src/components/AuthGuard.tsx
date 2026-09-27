"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getCustomerProfile } from "@/lib/customerProfile";

/**
 * 로그인/관리자 화면 가드.
 *
 * ⚠️ 이건 보안 경계가 아니다 — 정적 사이트라 HTML·JS 는 누구나 받아갈 수 있다.
 * 여기는 "안 보여주기"까지만 한다. 실제 차단은 나중에 붙일 supabase RLS 가 한다.
 */
export default function AuthGuard({
  children,
  requireAdmin = false,
  requireCustomerProfile = false,
}: {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireCustomerProfile?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "ok" | "error">("checking");

  useEffect(() => {
    let alive = true;

    (async () => {
      const session = await getSession();
      if (!alive) return;
      if (!session) {
        const next = window.location.pathname.includes("/quote/ai/") ? "quote-ai"
          : window.location.pathname.includes("/quote/") ? "quote" : "deal";
        router.replace(requireCustomerProfile ? `/login/?next=${next}` : "/login/");
        return;
      }
      if (requireAdmin && !session.isAdmin) {
        router.replace("/");
        return;
      }
      if (requireCustomerProfile && session.isAdmin) {
        router.replace("/admin/quotes/");
        return;
      }
      if (requireCustomerProfile) {
        try {
          const profile = await getCustomerProfile();
          if (!alive) return;
          if (!profile) {
            const pending = (() => { try { return window.sessionStorage.getItem("vcp.afterAuth"); } catch { return null; } })();
            const next = pending === "quote-ai" || window.location.pathname.includes("/quote/ai/") ? "quote-ai"
              : pending === "quote" || window.location.pathname.includes("/quote/") ? "quote" : "deal";
            router.replace(`/profile/?next=${next}`);
            return;
          }
        } catch {
          if (alive) setState("error");
          return;
        }
      }
      if (requireCustomerProfile && window.location.pathname.includes("/deal/")) {
        try {
          const pending = window.sessionStorage.getItem("vcp.afterAuth");
          if (pending === "quote" || pending === "quote-ai") {
            window.sessionStorage.removeItem("vcp.afterAuth");
            router.replace(pending === "quote-ai" ? "/quote/ai/" : "/quote/");
            return;
          }
        } catch { /* 저장소 차단 시 현재 화면을 유지 */ }
      }
      setState("ok");
    })();

    return () => {
      alive = false;
    };
  }, [router, requireAdmin, requireCustomerProfile]);

  if (state === "error") {
    return <p className="pf-container pf-alert" role="alert">고객 정보를 확인하지 못했습니다. 잠시 후 새로고침해 주세요.</p>;
  }

  if (state === "checking") {
    return (
      <p className="pf-container pf-help" style={{ paddingBlock: "64px" }}>
        확인 중입니다.
      </p>
    );
  }

  return <>{children}</>;
}
