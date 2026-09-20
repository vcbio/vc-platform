"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { getData, type Signal } from "@/lib/data";
import s from "./home.module.css";

/**
 * 히어로 오른쪽 「지금 뜨는 원료 · 실시간 순위」 보드 (1~10위).
 *
 * 문법은 인기검색어 위젯이다 — 평소에는 한 줄 티커가 6초마다 다음 순위로 굴러가고,
 * 손을 대면(마우스 올림·포커스·탭) 1~10 전체가 펼쳐지며 롤링이 멈춘다.
 * 숫자는 전부 어댑터 listSignals() 가 준 값이다 — 화면에 손으로 적은 수치가 없다.
 * 데이터랩 어댑터가 붙어도 이 파일은 그대로다(같은 Signal 타입만 본다).
 *
 * prefers-reduced-motion 이면 롤링도 카운트업도 하지 않는다(교체만 한다).
 */

const LIMIT = 10;
const CYCLE_MS = 6000;
const RESUME_MS = 10000;
/** 펼친 목록 높이(행 34px × 10 + 여유) — 아래 공간이 이만큼 없으면 위로 펼친다. */
const LIST_H = 352;

/** 순위 변동은 데이터랩 어댑터가 채운다. 없으면 지어내지 않고 「—」로 비운다. */
type Ranked = Signal & { rankDelta?: number; isNew?: boolean };

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
 * 직전 값에서 새 값까지 900ms 동안 센다.
 * 감속만 하고 되튀지 않는다(easeOutCubic ≒ 임계감쇠) — 지표는 튀면 값이 잘못 읽힌다.
 * null = 지금 세고 있지 않다 → 그때는 언제나 최종값을 그린다.
 * (값이 바뀌었는데 모션이 꺼져 있으면 옛 숫자가 남는 사고를 막는다 — 2026-09-21 실측)
 */
function useCountUp(target: number, reduced: boolean, ms = 900) {
  const [val, setVal] = useState<number | null>(null);
  const from = useRef(0); // 첫 등장은 0에서 센다

  useEffect(() => {
    const start = from.current;
    from.current = target;
    if (reduced || start === target) return;

    let raf = 0;
    let t0 = 0;
    const tick = (now: number) => {
      if (!t0) t0 = now;
      const p = Math.min(1, (now - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(p < 1 ? Math.round(start + (target - start) * eased) : null);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, reduced, ms]);

  return val ?? target;
}

/**
 * 순위 변동을 그릴 수 있는 주인가.
 * 직전 주 스냅샷이 없으면 어댑터가 전부 「신규」로 계산해 내놓는다 —
 * 그건 진짜 급상승이 아니라 기저가 없다는 뜻이라, 그대로 그리면 거짓말이 된다.
 * 그래서 ①변동값이 한 건도 없거나 ②절반 이상이 신규면 변동 칸을 통째로 비운다.
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

function Row({ row, rank, ready }: { row: Ranked; rank: number; ready: boolean }) {
  return (
    <>
      <span className={s.boardRowRank}>{String(rank + 1).padStart(2, "0")}</span>
      <span className={s.boardRowName}>{row.name}</span>
      <span className={s.boardRowNum}>{nf.format(row.monthlyVolume)}</span>
      <span className={s.boardRowDelta}>
        <Delta row={row} ready={ready} />
      </span>
    </>
  );
}

export default function SignalBoard({ initial }: { initial: Signal[] }) {
  // 빌드 때 심은 값으로 먼저 그리고, 브라우저에서 같은 어댑터로 다시 읽는다.
  const [signals, setSignals] = useState<Ranked[]>(initial);
  const [sel, setSel] = useState(0);
  /** 롤링에서 막 밀려 올라가는 줄. 애니메이션이 끝나면 지운다. */
  const [out, setOut] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  /** 아래에 자리가 없으면 위로 펼친다 — 안 그러면 뒤쪽 순위가 화면 밖으로 나가 못 누른다. */
  const [dropUp, setDropUp] = useState(false);
  /** 사용자가 손댄 동안은 롤링을 멈춘다. */
  const [held, setHeld] = useState(false);

  const selRef = useRef(0);
  const resume = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLOListElement>(null);
  /** 포인터로 들어온 포커스인지 — 그때는 펼침을 클릭 토글에 맡긴다(두 번 처리 방지). */
  const byPointer = useRef(false);
  /** 마우스를 올려서 펼쳐진 상태인지 — 그 직후의 첫 클릭은 도로 접지 않는다. */
  const hoverOpened = useRef(false);
  const tickerRef = useRef<HTMLButtonElement>(null);
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
    const id = setInterval(() => {
      const now = selRef.current;
      setOut(now);
      setSel((now + 1) % signals.length);
    }, CYCLE_MS);
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
    setOut(null);
  }, []);

  const release = useCallback(() => {
    if (resume.current) clearTimeout(resume.current);
    resume.current = setTimeout(() => setHeld(false), RESUME_MS);
  }, []);

  const ready = deltaReady(signals);
  const top = signals[Math.min(sel, signals.length - 1)];
  const live = useCountUp(top?.monthlyVolume ?? 0, reduced);

  if (!top) return null;

  function pick(i: number) {
    hold();
    setOut(null);
    setSel(i);
  }

  function expand() {
    hold();
    const r = tickerRef.current?.getBoundingClientRect();
    if (r) setDropUp(window.innerHeight - r.bottom < LIST_H && r.top > LIST_H);
    setOpen(true);
  }

  /**
   * 마우스를 올리면 펼친다 — 단 진짜 마우스가 있을 때만.
   * 손가락 입력은 탭 하나로 mouseenter → click 이 잇달아 와서, 여기서 펼치면
   * 곧바로 오는 click 이 도로 접는다. 그래서 터치에서는 click 에게 맡긴다.
   */
  function onWrapEnter() {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      hold();
      return;
    }
    hoverOpened.current = true;
    expand();
  }

  /** 티커를 눌렀을 때 — 마우스로 막 펼쳐진 참이면 그대로 두고, 아니면 토글한다. */
  function onTickerClick() {
    if (hoverOpened.current) {
      hoverOpened.current = false;
      expand();
      return;
    }
    if (open) collapse();
    else expand();
  }

  function collapse() {
    hoverOpened.current = false;
    setOpen(false);
    release();
  }

  function onListKeyDown(e: React.KeyboardEvent<HTMLOListElement>) {
    const last = signals.length - 1;
    if (e.key === "Escape") {
      e.preventDefault();
      collapse();
      tickerRef.current?.focus();
      return;
    }
    let next: number | null = null;
    if (e.key === "ArrowDown") next = Math.min(last, sel + 1);
    else if (e.key === "ArrowUp") next = Math.max(0, sel - 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    else if (e.key === "Enter" || e.key === " ") next = sel;
    if (next === null) return;
    e.preventDefault();
    pick(next);
  }

  /** 포커스가 티커 묶음 안에서 오갈 때는 접지 않는다. 밖으로 나갈 때만 접는다. */
  function onWrapFocus() {
    if (byPointer.current) {
      byPointer.current = false;
      return; // 클릭이 토글한다
    }
    expand();
  }

  function onWrapBlur(e: React.FocusEvent<HTMLDivElement>) {
    byPointer.current = false;
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    collapse();
  }

  function onTickerKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== "ArrowDown" && e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    expand();
    requestAnimationFrame(() => listRef.current?.focus());
  }

  return (
    <aside
      className={`${s.board} pf-rise`}
      style={{ "--d": "120ms" } as React.CSSProperties}
      aria-label="지금 뜨는 원료 실시간 순위"
      onMouseEnter={hold}
      onMouseLeave={release}
    >
      <div className={s.boardHead}>
        <b>지금 뜨는 원료 · 실시간 순위</b>
        <span>갱신 {top.observedAt} 기준</span>
      </div>

      <div className={s.boardTop}>
        <p className={s.boardRank}>
          <i>{String(sel + 1).padStart(2, "0")}</i>
          {top.category && <span>{top.category}</span>}
        </p>

        <h2 className={s.boardName}>
          {top.href ? (
            <a href={top.href} target="_blank" rel="noopener noreferrer">
              {top.name}
              <span className="pf-sr-only"> (새 탭에서 열림)</span>
            </a>
          ) : (
            top.name
          )}
        </h2>

        <p className={s.boardNum}>
          <b aria-label={`월 검색량 ${nf.format(top.monthlyVolume)}회`}>{nf.format(live)}</b>
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

      {/* 롤링 진행 — 딥그린 2px 한 줄, 6초 선형. 멈추면 함께 멈춘다. */}
      <div className={s.boardProgress} aria-hidden="true">
        {!reduced && !held && signals.length > 1 && (
          <i key={sel} className={s.progressRun} style={{ animationDuration: `${CYCLE_MS}ms` }} />
        )}
      </div>

      {/* ── 한 줄 티커 ── 누르거나 마우스를 올리면 1~10 이 펼쳐진다 ── */}
      <div
        className={s.tickerWrap}
        onMouseEnter={onWrapEnter}
        onMouseLeave={collapse}
        onFocus={onWrapFocus}
        onBlur={onWrapBlur}
      >
        <button
          ref={tickerRef}
          type="button"
          className={s.ticker}
          aria-expanded={open}
          aria-controls="sig-rank-list"
          onMouseDown={() => {
            byPointer.current = true;
          }}
          onClick={onTickerClick}
          onKeyDown={onTickerKeyDown}
        >
          <span className={s.tickerView}>
            {out !== null && out !== sel && signals[out] && (
              <span
                key={`out-${out}`}
                className={s.tickerOut}
                aria-hidden="true"
                onAnimationEnd={() => setOut(null)}
              >
                <Row row={signals[out]} rank={out} ready={ready} />
              </span>
            )}
            <span key={`in-${sel}`} className={out !== null ? s.tickerIn : s.tickerNow}>
              <Row row={top} rank={sel} ready={ready} />
            </span>
          </span>
          <span className={s.tickerMore} aria-hidden="true">
            {open ? "접기" : "전체 순위"}
          </span>
          <span className="pf-sr-only">
            {open ? "전체 순위 접기" : "1위부터 10위까지 전체 순위 펼치기"}
          </span>
        </button>

        {open && (
          <ol
            id="sig-rank-list"
            ref={listRef}
            className={dropUp ? `${s.boardRows} ${s.dropUp}` : s.boardRows}
            role="listbox"
            tabIndex={0}
            aria-label="원료 순위 1위부터 10위 — 위아래 방향키로 고릅니다"
            aria-activedescendant={`sig-opt-${sel}`}
            onKeyDown={onListKeyDown}
            // 눌러도 포커스가 목록 밖으로 빠지지 않게 한다 — 안 그러면 목록이 닫히며 클릭이 사라진다
            onMouseDown={(e) => e.preventDefault()}
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
                <Row row={sig} rank={i} ready={ready} />
              </li>
            ))}
          </ol>
        )}
      </div>

      <p className={s.boardFoot}>
        {top.periodLabel} · 기준일 {top.observedAt} · {top.source}
        {!ready && <em>순위 변동은 다음 주부터 표시됩니다 (기준 주 누적 중)</em>}
      </p>
    </aside>
  );
}
