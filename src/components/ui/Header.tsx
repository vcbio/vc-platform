"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { getSession, signOut, type Session } from "@/lib/auth";
import Container from "./Container";

const MENU = [
  { href: "/", label: "홈" },
  { href: "/deal/", label: "견적요청" },
  { href: "/manufacturers/", label: "제조사 찾기" },
  { href: "/insights/", label: "동향" },
  { href: "/dashboard/", label: "거래관리" },
];

function isCurrent(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** 상단 GNB. 반투명 레이어 + 스크롤 엣지 마스크(하드 1px 보더 대신). */
export default function Header() {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [open, setOpen] = useState(false);

  // 세션은 localStorage 라 브라우저에서만 읽힌다. 경로가 바뀔 때마다 다시 본다.
  // (모바일 메뉴는 링크 onClick 에서 닫는다 — 여기서 닫으면 렌더가 한 번 더 돈다.)
  useEffect(() => {
    let alive = true;
    getSession().then((s) => alive && setSession(s));
    return () => {
      alive = false;
    };
  }, [pathname]);

  async function onSignOut() {
    await signOut();
    setSession(null);
  }

  return (
    <header className="pf-gnb">
      <Container>
        <div className="pf-gnb-in">
          <Link href="/" className="pf-brand">
            <span className="mark" aria-hidden="true">
              VC
            </span>
            VCBio
          </Link>

          <nav className="pf-gnb-nav" aria-label="주요 메뉴">
            {MENU.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                aria-current={isCurrent(pathname, m.href) ? "page" : undefined}
              >
                {m.label}
              </Link>
            ))}
          </nav>

          <div className="pf-gnb-right">
            {session ? (
              <>
                <span className="pf-gnb-user">
                  <span className="pf-avatar" aria-hidden="true">
                    {session.email.slice(0, 2).toUpperCase()}
                  </span>
                  {session.email}
                </span>
                <button type="button" className="pf-btn pf-btn-ghost pf-btn-sm" onClick={onSignOut}>
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link href="/login/" className="pf-btn pf-btn-ghost pf-btn-sm">
                  로그인
                </Link>
                <Link href="/signup/" className="pf-btn pf-btn-primary pf-btn-sm">
                  가입하기
                </Link>
              </>
            )}

            <button
              type="button"
              className="pf-burger"
              aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
              aria-expanded={open}
              aria-controls="pf-gnb-mobile"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={22} strokeWidth={1.75} /> : <Menu size={22} strokeWidth={1.75} />}
            </button>
          </div>
        </div>

        {open && (
          <nav className="pf-gnb-mobile" id="pf-gnb-mobile" aria-label="주요 메뉴 (모바일)">
            {MENU.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                aria-current={isCurrent(pathname, m.href) ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {m.label}
              </Link>
            ))}
          </nav>
        )}
      </Container>
    </header>
  );
}
