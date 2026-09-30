"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import Script from "next/script";
import s from "./intake.module.css";

type TurnstileApi = {
  render(element: HTMLElement, options: Record<string, unknown>): string;
  remove(id: string): void;
  reset(id: string): void;
};

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();

function api() {
  return (window as Window & { turnstile?: TurnstileApi }).turnstile;
}

/** 공개 폼이 나타날 때만 Cloudflare 검증 화면을 만든다. 키가 없으면 외부 스크립트를 불러오지 않는다. */
export default function TurnstileField({ action, onToken }: {
  action: "quick_quote" | "manufacturer_application";
  onToken: Dispatch<SetStateAction<string>>;
}) {
  const root = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [problem, setProblem] = useState("");

  useEffect(() => () => {
    if (widgetId.current) api()?.remove(widgetId.current);
    widgetId.current = null;
  }, []);

  if (!siteKey) {
    return <p role="status">접수 보안 설정 중입니다. 지금은 제출할 수 없습니다.</p>;
  }

  function renderWidget() {
    const turnstile = api();
    if (!turnstile || !root.current || widgetId.current) return;
    widgetId.current = turnstile.render(root.current, {
      sitekey: siteKey,
      action,
      size: "flexible",
      callback: (token: string) => { setProblem(""); onToken(token); },
      "expired-callback": () => { onToken(""); setProblem("확인 시간이 지났습니다. 다시 확인해 주세요."); },
      "error-callback": () => { onToken(""); setProblem("자동 접수 확인이 멈췄습니다. 다시 시도해 주세요."); },
    });
  }

  function retry() {
    onToken("");
    const turnstile = api();
    if (turnstile && widgetId.current) {
      turnstile.reset(widgetId.current);
      setProblem("");
    } else {
      window.location.reload();
    }
  }

  return <div className={s.challenge} aria-label="자동 접수 방지 확인">
    <p className={s.challengeHelp}>자동 접수 방지를 위해 Cloudflare가 접속·기기 정보를 확인합니다. <a href="https://www.cloudflare.com/turnstile-privacy-policy/" target="_blank" rel="noopener noreferrer">Cloudflare 안내 ↗</a></p>
    <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
      strategy="afterInteractive" onReady={renderWidget}
      onError={() => { onToken(""); setProblem("자동 접수 확인을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요."); }} />
    <div ref={root} />
    {problem && <div className={s.challengeProblem} role="alert">
      <span>{problem}</span>
      <button type="button" className="pf-btn pf-btn-secondary pf-btn-sm" onClick={retry}>다시 시도</button>
    </div>}
  </div>;
}
