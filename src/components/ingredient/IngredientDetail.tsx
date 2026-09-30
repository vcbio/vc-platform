"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ButtonLink, Container } from "@/components/ui";
import type { IngredientDetailRow } from "@/lib/data";
import c from "./ingredient.module.css";

const DATA_URL = "/vc-platform/data/ingredient-details.json";
const nf = new Intl.NumberFormat("ko-KR");
type Payload = { meta: { sourcePage: string }; rows: IngredientDetailRow[] };
let cache: Promise<Payload | null> | null = null;

function load() {
  return cache ??= fetch(DATA_URL, { cache: "no-store" })
    .then((res) => res.ok ? res.json() : null)
    .then((json) => json && Array.isArray(json.rows) ? json as Payload : null)
    .catch(() => null);
}

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

const readId = () => new URLSearchParams(window.location.search).get("id") ?? "";
const serverId = () => "";

function Source({ date, children }: { date?: string | null; children?: React.ReactNode }) {
  return <p className={c.source}>{date ? `기준 ${date}` : "기준일 미제공"} · 데이터랩 공개 JSON{children}</p>;
}

function Weeks({ row }: { row: IngredientDetailRow }) {
  const values = row.weeks8 ?? [];
  if (values.length < 2) return <p className={c.empty}>8주 관측 자료가 없습니다.</p>;
  const min = Math.min(...values), max = Math.max(...values), range = Math.max(max - min, .0001);
  const points = values.map((value, i) => `${12 + i * 276 / (values.length - 1)},${92 - (value - min) / range * 72}`).join(" ");
  return <div className={c.chartWrap}>
    <svg className={c.lineChart} viewBox="0 0 300 108" role="img" aria-label={`최근 8주 검색 상대지수 ${values.join(", ")}`}>
      <line x1="12" y1="92" x2="288" y2="92" /><polyline points={points} />
      {points.split(" ").map((point, i) => { const [cx, cy] = point.split(","); return <circle key={i} cx={cx} cy={cy} r={i === values.length - 1 ? 4 : 2.5} />; })}
    </svg>
    <div className={c.weekLabels}><span>{row.weeks8Dates?.[0]?.start ?? "시작일 미제공"}</span><span>{row.weeks8Dates?.at(-1)?.end ?? row.observedAt}</span></div>
  </div>;
}

function Months({ values }: { values: number[] }) {
  if (values.length !== 12 || values.every((value) => value === 0)) return <p className={c.empty}>월별 계절 자료가 없습니다.</p>;
  const max = Math.max(...values, .0001);
  return <div className={c.monthChart} role="img" aria-label={`1월부터 12월 검색 상대지수 ${values.join(", ")}`}>
    {values.map((value, i) => <span key={i} className={c.monthCol}><i style={{ height: `${Math.max(3, Math.round(value / max * 76))}px` }} /><b>{i + 1}월</b></span>)}
  </div>;
}

export default function IngredientDetail() {
  const id = useSyncExternalStore(subscribe, readId, serverId);
  const [payload, setPayload] = useState<Payload | null | undefined>();
  useEffect(() => { let alive = true; load().then((data) => alive && setPayload(data)); return () => { alive = false; }; }, []);
  const row = payload?.rows.find((item) => item.id === id);

  if (payload === undefined) return <Container><p className={c.state}>원료 자료를 불러오는 중입니다.</p></Container>;
  if (!payload || !row) return <Container><div className={c.state}><h1>원료 자료를 찾지 못했습니다</h1><p>공개 자료에 연결된 원료를 다시 골라 주세요.</p><Link href="/">홈으로 돌아가기</Link></div></Container>;

  const observed = row.changeStatus !== "미제공";
  const quoteBlocked = row.grade === "의약품";
  const needsReview = row.category?.includes("규격 확인 필요");
  return <section className={c.page}><Container>
    <nav className={c.breadcrumb} aria-label="현재 위치"><Link href="/">홈</Link><span aria-hidden="true">/</span><span>원료 상세</span></nav>
    <header className={c.head}>
      <div><p className={c.kicker}>원료 상세</p><h1>{row.name}</h1><p className={c.classification}>{[row.category, row.grade, row.functionCategory].filter(Boolean).join(" · ") || "분류 미제공"}</p></div>
      <div className={c.headMetric}><span>월 검색량</span><strong>{row.monthlyVolume == null ? "자료 없음" : <>{row.volumeExact === false ? "≥ " : ""}{nf.format(row.monthlyVolume)}<small>회</small></>}</strong><Source date={row.volumeDate} /></div>
    </header>
    <section className={c.grid} aria-label="검색 흐름">
      <article className={c.metricCard}><h2>최근 변화</h2><strong className={observed && row.changePct > 0 ? c.up : observed && row.changePct < 0 ? c.down : c.unknown}>{observed ? `${row.changePct > 0 ? "+" : ""}${row.changePct.toFixed(1)}%` : "미제공"}</strong><p>{row.periodLabel}</p><Source date={row.observedAt} /></article>
      <article className={c.metricCard}><h2>8주 흐름</h2><Weeks row={row} /><Source date={row.weeks8Dates?.at(-1)?.end ?? row.observedAt}> · 검색 상대지수</Source></article>
    </section>
    <section className={c.section}><div className={c.sectionHead}><div><h2>계절 흐름</h2><p>월별 검색 상대지수입니다.</p></div>{row.seasonMonth && <span className={c.peak}>고점 {row.seasonMonth}월</span>}</div><Months values={row.seasonalMonths} />{row.seasonalMonths.length !== 12 ? <p className={c.source}>원본 월별 자료 미제공</p> : row.seasonalMonths.every((value) => value === 0) ? <p className={c.source}>원본 월별 값이 모두 0이라 자료 없음으로 표시</p> : <Source date={row.seasonalAsOf}> · 1~12월 계절 지수</Source>}</section>
    <section className={c.factGrid} aria-label="공개 연결 자료">
      <article><h2>최근 제조보고</h2><strong>{row.reportCount == null ? "자료 없음" : `${nf.format(row.reportCount)}건`}</strong><p>원료명에 연결된 신고 건수입니다. 제품 수나 현재 생산 능력이 아닙니다.</p><p className={c.warning}>일반식품 신고가 섞인 값, 집계 기준 수정 중</p><Source date={row.reportAsOf}> · 수집 시작일 미확인</Source></article>
      <article><h2>홈쇼핑 편성</h2><strong>{row.broadcastCount == null ? "자료 없음" : `${nf.format(row.broadcastCount)}회`}</strong><p>{row.broadcastTopChannel ? `${row.broadcastTopChannel} 최다` : "최다 채널 미제공"}</p><Source date={row.broadcastPeriodEnd}>{row.broadcastPeriodStart ? ` · 수집 ${row.broadcastPeriodStart}~${row.broadcastPeriodEnd}` : ""}</Source></article>
      <article><h2>가능 제형</h2><strong>{row.dosageFormStatus === "확인" && row.availableDosageForms.length ? row.availableDosageForms.join(" · ") : "미확인"}</strong><p>공개 자료에 현재 제조 가능 제형이 없습니다. 과거 신고 제형으로 대신하지 않습니다.</p><Source> · 현재 생산 가능 여부는 상담 때 확인</Source></article>
    </section>
    <footer className={c.actions}>{quoteBlocked ? <p className={c.blocked}>식품 원료가 아닌 참고 항목이라 견적에 연결하지 않습니다.</p> : <>{needsReview && <p className={c.blocked}>원료 규격과 사용 가능 여부는 상담에서 확인합니다.</p>}<ButtonLink href={`/quote/ai/?ingredient=${encodeURIComponent(row.name)}`} variant="primary">이 원료로 견적</ButtonLink></>}<a href={row.href ?? payload.meta.sourcePage} target="_blank" rel="noopener noreferrer">데이터랩에서 더 보기 ↗<span className="pf-sr-only"> (새 탭에서 열림)</span></a></footer>
  </Container></section>;
}
