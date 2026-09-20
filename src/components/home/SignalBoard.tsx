"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { getData, type Signal } from "@/lib/data";
import Odometer from "./Odometer";
import Sparkline from "./Sparkline";
import IngredientSearch from "./IngredientSearch";
import s from "./home.module.css";

/**
 * 첫 화면 시세판 — 문구 대신 숫자가 말한다.
 *
 * 움직이는 것은 넷뿐이다: ①오도미터 ②스파크라인 그리기 ③순위 롤링 ④LIVE 점.
 * 전부 transform·opacity 로만 움직이고, prefers-reduced-motion 이면 멈추거나 즉시 바뀐다.
 * 숫자는 전부 어댑터 listSignals() 가 준 값이다 — 화면에 손으로 적은 수치가 없다.
 *
 * 고르는 법 셋 — ①순위 행 클릭 ②방향키 ↑↓ ③6초마다 자동 순환.
 * 마우스를 올리거나 포커스가 판 안에 있으면 멈추고, 벗어나면 10초 뒤 다시 돈다.
 */

const LIMIT = 10;
const CYCLE_MS = 6000;
const RESUME_MS = 10000;

/** 순위 변동은 데이터랩 어댑터가 채운다. 없으면 지어내지 않고 「—」로 비운다. */
type Ranked = Signal & { rankDelta?: number; isNew?: boolean; weeks8?: number[] };

const nf = new Intl.NumberFormat("ko-KR");
const pct = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;

/* ── 모션 선호 — 플랫폼 질의를 그대로 구독한다(라이브러리 없음) ── */
const motionQuery = () => window.matchMedia("(prefers-reduced-motion: reduce)");

function subscribeMotion(onChange: () => void) {
  const m = motionQuery();
  m.addEventListener("change", onChange);
  return () => m.removeEventListener("change", onChange);
}

function useReducedMotion() {
  return useSyncExternalStore(subscribeMotion, () => motionQuery().matches, () => false);
}

/**
 * 순위 변동을 그릴 수 있는 주인가.
 * 직전 주 스냅샷이 없으면 어댑터가 전부 「신규」로 계산해 내놓는다 —
 * 그건 진짜 급상승이 아니라 기저가 없다는 뜻이라, 그대로 그리면 거짓말이 된다.
 * 스냅샷이 쌓이면 이 조건이 저절로 풀리며 ▲▼NEW 가 켜진다(코드를 고칠 일이 없다).
 */
function deltaReady(rows: Ranked[]): boolean {
  const hasDelta = rows.some((r) => typeof r.rankDelta === "number");
  const fresh = rows.filter((r) => r.isNew).length;
  return hasDelta && fresh * 2 < rows.length;
}

/** 순위 변동 — 상승 ▲ 주황 · 하락 ▼ 틸 · 유지·미상 — · 신규 NEW. 색 말고 글자도 같이 쓴다. */
function Delta({ row, ready }: { row: Ranked; ready: boolean }) {
  if (!ready) {
    return (
      <span className={s.deltaFlat} aria-label="순위 변동 미표시">
        —
      </span>
    );
  }
  if (row.isNew) {
    return (
      <span className={s.deltaNew}>
        NEW<span className="pf-sr-only"> 신규 진입</span>
      </span>
    );
  }
  const d = row.rankDelta;
  if (typeof d !== "number" || d === 0) {
    return (
      <span className={s.deltaFlat} aria-label="순위 변동 없음">
        —
      </span>
    );
  }
  return (
    <span className={d > 0 ? s.deltaUp : s.deltaDown}>
      {d > 0 ? "▲" : "▼"}
      {Math.abs(d)}
      <span className="pf-sr-only">{d > 0 ? "계단 상승" : "계단 하락"}</span>
    </span>
  );
}

export default function SignalBoard({ initial }: { initial: Signal[] }) {
  // 빌드 때 심은 값으로 먼저 그리고, 브라우저에서 같은 어댑터로 다시 읽는다.
  const [signals, setSignals] = useState<Ranked[]>(initial);
  const [sel, setSel] = useState(0);
  /** 사용자가 손댄 동안은 롤링을 멈춘다. */
  const [held, setHeld] = useState(false);

  const selRef = useRef(0);
  const resume = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    let alive = true;
    getData()
      .listSignals(LIMIT)
      .then((next) => {
        if (alive && next.length > 0) setSignals(next);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    selRef.current = sel;
  }, [sel]);

  // 롤링 — 6초마다 다음 순위로. 손대는 동안·모션을 줄일 때는 돌지 않는다.
  useEffect(() => {
    if (reduced || held || signals.length < 2) return;
    const id = setInterval(() => setSel((selRef.current + 1) % signals.length), CYCLE_MS);
    return () => clearInterval(id);
  }, [reduced, held, signals.length]);

  useEffect(() => {
    return () => {
      if (resume.current) clearTimeout(resume.current);
    };
  }, []);

  const hold = useCallback(() => {
    if (resume.current) clearTimeout(resume.current);
    setHeld(true);
  }, []);

  const release = useCallback(() => {
    if (resume.current) clearTimeout(resume.current);
    resume.current = setTimeout(() => setHeld(false), RESUME_MS);
  }, []);

  const ready = deltaReady(signals);
  const top = signals[Math.min(sel, signals.length - 1)];

  if (!top) return null;

  function pick(i: number) {
    hold();
    setSel(i);
    release();
  }

  /** 검색에서 고른 원료가 시세판에 있으면 그 자리에서 대표 카드를 바꾼다. */
  function pickByName(name: string) {
    const i = signals.findIndex((r) => r.name === name);
    if (i >= 0) pick(i);
  }

  function onListKeyDown(e: React.KeyboardEvent<HTMLOListElement>) {
    const last = signals.length - 1;
    let next: number | null = null;
    if (e.key === "ArrowDown") next = Math.min(last, sel + 1);
    else if (e.key === "ArrowUp") next = Math.max(0, sel - 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    else if (e.key === "Enter" || e.key === " ") next = sel;
    if (next === null) return;
    e.preventDefault();
    hold();
    setSel(next);
  }

  /**
   * 판 안에 포커스가 있으면 롤링을 멈춘다. 포커스가 **밖으로** 나갈 때만 풀어 준다 —
   * 안 그러면 CTA 에 포커스를 둔 채 대표 원료가 바뀌어 다른 원료로 견적이 나간다.
   */
  function onDeckBlur(e: React.FocusEvent<HTMLElement>) {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    release();
  }

  return (
    <section
      className={s.deck}
      aria-label="지금 뜨는 원료 실시간 순위"
      onMouseEnter={hold}
      onMouseLeave={release}
      onFocus={hold}
      onBlur={onDeckBlur}
    >
      <div className={s.deckHead}>
        <span className={s.deckEyebrow}>
          지금 뜨는 원료 · {top.observedAt} 기준 · {top.source}
        </span>
        <span className={s.live}>
          <i className={reduced ? s.liveDotStill : s.liveDot} aria-hidden="true" />
          LIVE
        </span>
      </div>

      <div className={s.deckGrid}>
        <div className={s.deckMain}>
          {/* 이 화면의 제목은 문구가 아니라 지금 뜨는 원료 이름이다 */}
          <h1 className={s.deckName}>
            {top.href ? (
              <a href={top.href} target="_blank" rel="noopener noreferrer">
                {top.name}
                <span className="pf-sr-only"> (새 탭에서 열림)</span>
              </a>
            ) : (
              top.name
            )}
            {top.category && <em>{top.category}</em>}
          </h1>

          <p className={s.deckNum}>
            <Odometer text={nf.format(top.monthlyVolume)} reduced={reduced} className={s.odoBig} />
            <span className={s.deckUnit}>회 / 월</span>
          </p>

          {/* 변화율은 숫자와 같은 줄에 두지 않는다 — 자릿수가 길면 줄이 감겨
              아래 블록이 통째로 밀린다(자동 순환마다 52px 점프, 2026-09-21 실측) */}
          <p className={s.deckMove}>
            <span className={s.up}>
              <Odometer text={pct(top.changePct)} reduced={reduced} duration={600} stagger={30} />
            </span>
            <em>{top.periodLabel}</em>
          </p>

          {top.weeks8 && top.weeks8.length > 1 && (
            <Sparkline
              key={top.id}
              points={top.weeks8}
              reduced={reduced}
              endLabel={top.observedAt}
              label={`${top.name} 최근 ${top.weeks8.length}주 흐름`}
            />
          )}

          <IngredientSearch
            signals={signals.map((r) => ({
              name: r.name,
              monthlyVolume: r.monthlyVolume,
              category: r.category,
              functionCategory: (r as { functionCategory?: string }).functionCategory,
            }))}
            onPick={pickByName}
          />

          <div className={s.deckCta}>
            <Link
              href={`/quote/?ingredient=${encodeURIComponent(top.name)}`}
              className={`pf-btn pf-btn-primary ${s.ctaBig}`}
            >
              이 원료로 견적요청
            </Link>
            <Link href="/insight/" className="pf-link">
              동향 전체 보기
            </Link>
          </div>
        </div>

        <div className={s.rankWrap}>
          <h2 className="pf-sr-only">지금 뜨는 원료 순위</h2>
          <ol
            className={s.rankList}
            role="listbox"
            tabIndex={0}
            aria-label="원료 순위 1위부터 10위 — 위아래 방향키로 고릅니다"
            aria-activedescendant={`sig-opt-${sel}`}
            onKeyDown={onListKeyDown}
          >
            {signals.map((sig, i) => (
            <li
              key={sig.id}
              id={`sig-opt-${i}`}
              role="option"
              aria-selected={i === sel}
              className={i === sel ? s.rowOn : undefined}
              onClick={() => pick(i)}
            >
              <span className={s.boardRowRank}>{String(i + 1).padStart(2, "0")}</span>
              <span className={s.boardRowName}>{sig.name}</span>
              <span className={s.boardRowNum}>
                {/* 네 자리가 넘는 값만 굴린다 — 짧은 수는 굴려도 읽히지 않는다 */}
                {sig.monthlyVolume >= 1000 ? (
                  <Odometer
                    text={nf.format(sig.monthlyVolume)}
                    reduced={reduced}
                    duration={600}
                    stagger={25}
                  />
                ) : (
                  nf.format(sig.monthlyVolume)
                )}
              </span>
              <span className={s.boardRowDelta}>
                <Delta row={sig} ready={ready} />
              </span>
            </li>
            ))}
          </ol>
        </div>
      </div>

      <p className={s.deckFoot}>
        {top.periodLabel} · 기준일 {top.observedAt} · {top.source}
        {!ready && <em>순위 변동은 다음 주부터 표시됩니다 (기준 주 누적 중)</em>}
      </p>
    </section>
  );
}
