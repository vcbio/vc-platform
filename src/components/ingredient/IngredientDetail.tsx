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
  return <p className={c.source}>{date ? `기준 ${date}` : "기준일 미제공"} · 헬스푸드 데이터랩{children}</p>;
}

function Weeks({ row }: { row: IngredientDetailRow }) {
  const values = row.weeks8 ?? [];
  if (values.length < 2) return <p className={c.empty}>8주 관측 자료가 없습니다.</p>;
  const min = Math.min(...values), max = Math.max(...values), range = Math.max(max - min, .0001);
  const points = values.map((value, i) => `${12 + i * 276 / (values.length - 1)},${92 - (value - min) / range * 72}`).join(" ");
  return <div className={c.chartWrap}>
    <svg className={c.lineChart} viewBox="0 0 300 108" preserveAspectRatio="none" role="img" aria-label={`최근 8주 검색 상대지수 ${values.join(", ")}`}>
      <line x1="12" y1="92" x2="288" y2="92" /><polyline points={points} />
      {points.split(" ").map((point, i) => { const [cx, cy] = point.split(","); return <circle key={i} cx={cx} cy={cy} r={i === values.length - 1 ? 4 : 2.5} />; })}
    </svg>
    <div className={c.weekLabels}><span>{row.weeks8Dates?.[0]?.start ?? "시작일 미제공"}</span><span>{row.weeks8Dates?.at(-1)?.end ?? row.observedAt}</span></div>
  </div>;
}

function Months({ values }: { values: (number | null)[] }) {
  if (values.length !== 12 || values.every((value) => value == null)) return <p className={c.empty}>월별 계절 자료가 없습니다.</p>;
  if (values.every((value) => value == null || value === 0)) return <p className={c.empty}>관측된 달의 검색 평균이 모두 0입니다.</p>;
  const max = Math.max(...values.filter((value): value is number => value != null), .0001);
  return <div className={c.monthChart} role="img" aria-label={`1월부터 12월 검색 상대지수 ${values.map((value) => value == null ? "자료 없음" : value).join(", ")}`}>
    {values.map((value, i) => <span key={i} className={c.monthCol}>{value == null ? <span aria-label="자료 없음">—</span> : <i style={{ height: `${Math.max(3, Math.round(value / max * 76))}px` }} />}<b>{i + 1}월</b></span>)}
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
  const quoteBlocked = row.grade === "의약품" || ["범위 밖", "참고", "보류"].includes(row.category ?? "");
  const needsReview = row.grade === "보류" || row.functionCategory === "보류";
  return <section className={c.page}><Container>
    <nav className={c.breadcrumb} aria-label="현재 위치"><Link href="/">홈</Link><span aria-hidden="true">/</span><span>원료 상세</span></nav>
    <header className={c.head}>
      <div><p className={c.kicker}>원료 상세</p><h1>{row.name}</h1><p className={c.classification}>{[row.category, row.gradeDisplay, row.functionCategory].filter(Boolean).join(" · ") || "분류 미제공"}</p><p className={c.source}>국내 유통 {row.distribution || "미확인"} · 제품 제형 {row.productForm || "해당없음(원료)"}{row.recognitionNumbers?.length ? ` · 인정 ${row.recognitionNumbers.slice(0, 2).map((x) => x.number).join(", ")}` : ""}</p></div>      <div className={c.headMetric}><span>월 검색량</span><strong>{row.monthlyVolume == null ? "자료 없음" : <>{row.volumeExact === false ? "≥ " : ""}{nf.format(row.monthlyVolume)}<small>회</small></>}</strong><Source date={row.volumeDate} /></div>
    </header>
    <section className={c.grid} aria-label="검색 흐름">
      <article className={c.metricCard}><h2>최근 변화</h2><strong className={observed && row.changePct > 0 ? c.up : observed && row.changePct < 0 ? c.down : c.unknown}>{observed ? `${row.changePct > 0 ? "+" : ""}${row.changePct.toFixed(1)}%` : "미제공"}</strong><p>{row.periodLabel}</p><Source date={row.observedAt} /></article>
      <article className={c.metricCard}><h2>8주 흐름</h2><Weeks row={row} /><Source date={row.weeks8Dates?.at(-1)?.end ?? row.observedAt}> · 검색 상대지수</Source></article>
    </section>
    <section className={c.section}><div className={c.sectionHead}><div><h2>계절 흐름</h2><p>여러 해의 같은 달을 모은 검색 평균 상대지수입니다.</p></div>{row.seasonalPeakMonth && <span className={c.peak}>월평균 최고 {row.seasonalPeakMonth}월</span>}</div><Months values={row.seasonalMonths} />{row.seasonalMonths.length !== 12 ? <p className={c.source}>원본 월별 자료 미제공</p> : <Source date={row.seasonalAsOf}> · 달력 1~12월{row.seasonalPeriodStart && row.seasonalPeriodEnd ? ` · 관측 ${row.seasonalPeriodStart}~${row.seasonalPeriodEnd}` : ""}</Source>}</section>
    <section className={c.factGrid} aria-label="공개 연결 자료">
      <article><h2>제조신고 원료 연결</h2><strong>건기식 {row.reportCount == null ? "자료 없음" : `${nf.format(row.reportCount)}건`}</strong><p>건강보조식품 후보 {row.healthSupportReportCount == null ? "자료 없음" : `${nf.format(row.healthSupportReportCount)}건`} · 보류 {row.heldGeneralReportCount == null ? "자료 없음" : `${nf.format(row.heldGeneralReportCount)}건`}</p><p>건기식 신고일 {row.healthFunctionalPeriodStart || "미확인"}~{row.healthFunctionalPeriodEnd || "미확인"}<br />건강보조식품 후보 신고일 {row.healthSupportPeriodStart || "미확인"}~{row.healthSupportPeriodEnd || "미확인"}</p><p>신고번호별 중복을 뺐습니다. 일반식품 분류는 잠정 결과이며 판매량이 아닙니다.</p>{!!row.reportTopManufacturers?.length && <details><summary>건기식 신고 업체 상위 3곳</summary><ol>{row.reportTopManufacturers.map(([name, count]) => <li key={name}>{name} · {nf.format(count)}건</li>)}</ol></details>}{!!row.supportTopManufacturers?.length && <details><summary>건강보조식품 후보 업체 상위 3곳</summary><ol>{row.supportTopManufacturers.map(([name, count]) => <li key={name}>{name} · {nf.format(count)}건</li>)}</ol></details>}<Source date={row.reportAsOf}> · C003 / C002 / I1250</Source></article>
      <article><h2>홈쇼핑 편성</h2><strong>{row.broadcastCount == null ? "연결 미확인" : `${nf.format(row.broadcastCount)}회`}</strong><p>{row.broadcastTopChannel ? `${row.broadcastTopChannel} 편성 최다` : "채널 확인 자료 없음"} · 편성 기록이며 실제 판매량은 아닙니다.</p><Source date={row.broadcastPeriodEnd}>{row.broadcastPeriodStart ? ` · 관측 ${row.broadcastPeriodStart}~${row.broadcastPeriodEnd}` : ""}</Source></article>
      {row.dosageFormStatus === "확인" && row.availableDosageForms.length > 0 && <article><h2>가능 제형</h2><strong>{row.availableDosageForms.join(" · ")}</strong><Source> · 현재 생산 가능 여부는 상담 때 확인</Source></article>}
    </section>
    <footer className={c.actions}>{quoteBlocked ? <p className={c.blocked}>식품 원료가 아닌 참고 항목이라 견적에 연결하지 않습니다.</p> : <>{needsReview && <p className={c.blocked}>원료 규격과 사용 가능 여부는 상담에서 확인합니다.</p>}<ButtonLink href={`/quote/ai/?ingredient=${encodeURIComponent(row.name)}`} variant="primary">이 원료로 견적</ButtonLink></>}<a href={row.href ?? payload.meta.sourcePage} target="_blank" rel="noopener noreferrer">데이터랩에서 더 보기 ↗<span className="pf-sr-only"> (새 탭에서 열림)</span></a></footer>
  </Container></section>;
}
