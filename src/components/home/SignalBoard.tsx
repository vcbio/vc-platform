"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getData, type Signal } from "@/lib/data";
import s from "./home.module.css";

/**
 * 히어로 오른쪽 「지금 뜨는 원료」 라이브 보드.
 *
 * 숫자는 전부 어댑터 listSignals() 가 준 값이다 — 화면에 손으로 적은 수치가 없다.
 * 지금은 로컬 스텁(데이터랩 2026-09-07 실측)이고, 데이터랩 어댑터가 붙으면
 * 같은 Signal 타입으로 실값이 들어온다. 이 파일은 그때 한 줄도 고치지 않는다.
 */

const nf = new Intl.NumberFormat("ko-KR");
const pct = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;

/**
 * 0에서 값까지 900ms 동안 센다.
 * 감속만 하고 되튀지 않는다(easeOutCubic ≒ 임계감쇠) — 지표는 튀면 값이 잘못 읽힌다.
 * 첫 렌더는 최종값이라 자바스크립트가 꺼져 있어도 숫자가 제대로 보이고,
 * prefers-reduced-motion 이면 그 최종값에서 움직이지 않는다.
 */
function useCountUp(target: number, ms = 900) {
  // null = 지금 세고 있지 않다 → 그때는 언제나 최종값을 그린다.
  // (값이 바뀌었는데 모션이 꺼져 있으면 옛 숫자가 남는 사고를 막는다 — 2026-09-21 실측)
  const [val, setVal] = useState<number | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let t0 = 0;
    const tick = (now: number) => {
      if (!t0) t0 = now;
      const p = Math.min(1, (now - t0) / ms);
      setVal(p < 1 ? Math.round(target * (1 - Math.pow(1 - p, 3))) : null);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);

  return val ?? target;
}

function SignalName({ signal }: { signal: Signal }) {
  if (!signal.href) return <>{signal.name}</>;
  return (
    <a href={signal.href} target="_blank" rel="noopener noreferrer">
      {signal.name}
      <span className="pf-sr-only"> (새 탭에서 열림)</span>
    </a>
  );
}

export default function SignalBoard({ initial }: { initial: Signal[] }) {
  // 빌드 때 심은 값으로 먼저 그리고, 브라우저에서 같은 어댑터로 다시 읽는다.
  // (데이터랩 어댑터가 붙으면 그 실값이 여기서 들어온다 — 이 화면은 그대로다.)
  const [signals, setSignals] = useState(initial);

  useEffect(() => {
    let alive = true;
    getData()
      .listSignals(3)
      .then((next) => {
        if (alive && next.length > 0) setSignals(next);
      });
    return () => {
      alive = false;
    };
  }, []);

  const top = signals[0];
  const live = useCountUp(top?.monthlyVolume ?? 0);

  if (!top) return null;
  const rest = signals.slice(1);

  return (
    <aside
      className={`${s.board} pf-rise`}
      style={{ "--d": "120ms" } as React.CSSProperties}
      aria-label="지금 뜨는 원료"
    >
      <div className={s.boardHead}>
        <b>지금 뜨는 원료</b>
        <span>검색량 기준</span>
      </div>

      <div className={s.boardTop}>
        <p className={s.boardRank}>
          <i>01</i>
          {top.category && <span>{top.category}</span>}
        </p>

        <h2 className={s.boardName}>
          <SignalName signal={top} />
        </h2>

        <p className={s.boardNum}>
          <b aria-label={`월 검색량 ${nf.format(top.monthlyVolume)}회`}>
            {nf.format(live)}
          </b>
          <small>회 / 월</small>
        </p>

        <p className={s.boardMove}>
          <span className={s.up}>{pct(top.changePct)}</span>
          <em>{top.periodLabel}</em>
        </p>

        <div className={s.boardCta}>
          <Link
            href={`/quote/?ingredient=${encodeURIComponent(top.name)}`}
            className="pf-btn pf-btn-primary pf-btn-sm"
          >
            이 원료로 견적요청
          </Link>
        </div>
      </div>

      {rest.length > 0 && (
        <ol className={s.boardRows}>
          {rest.map((sig, i) => (
            <li key={sig.id}>
              <span className={s.boardRowRank}>{String(i + 2).padStart(2, "0")}</span>
              <span className={s.boardRowName}>
                <SignalName signal={sig} />
              </span>
              <span className={s.boardRowNum}>{nf.format(sig.monthlyVolume)}</span>
              <span className={s.boardRowPct}>{pct(sig.changePct)}</span>
            </li>
          ))}
        </ol>
      )}

      <p className={s.boardFoot}>
        {top.periodLabel} · 기준일 {top.observedAt} · {top.source}
      </p>
    </aside>
  );
}
