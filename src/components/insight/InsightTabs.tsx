"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Badge, ButtonLink, Card, Container } from "@/components/ui";
import { getData, type Insight, type InsightExtraRow, type InsightTab, type Signal } from "@/lib/data";
import { datalabLink, getDatalabMeta, getInsightExtra, listSignalRows, type DatalabMeta, type InsightExtraMeta } from "@/lib/data/datalab";
import { KV, Note, PageHead, styles as s } from "@/components/deal/shared";
import SignalTable from "./SignalTable";
import c from "./insight.module.css";

/**
 * 동향 인사이트 — 로그인 없이 봅니다.
 *
 * 표의 숫자는 전부 데이터랩 공개 자료에서 옵니다(빌드 때 받아 둔 파생본).
 * 이 화면은 값을 계산하지 않고 그대로 옮겨 놓습니다 — 예측도 데이터랩이 낸 결과만 보여 줍니다.
 *
 * 탭 상태는 주소창 쿼리(?tab=)에 남긴다 — 링크를 그대로 주고받을 수 있게.
 * 정적 내보내기라 라우터 대신 history.replaceState 로 주소만 바꾼다(페이지 이동 없음).
 */

/**
 * `hash` 는 데이터랩 화면의 view 다. 데이터랩이 허용 목록에 없는 view 를 받으면
 * 원료 화면으로 되돌리므로, 값이 바뀌어도 빈 화면이 뜨지는 않는다.
 */
const TABS: { id: InsightTab; label: string; lead: string; hash: string; more: string }[] = [
  {
    id: "weekly",
    label: "주간 급상승",
    lead: "최근 관측 7일의 검색 관심도가 앞선 7일보다 얼마나 움직였는지 봅니다.",
    hash: "#view=ingredients&tab=trend",
    more: "원료 전체 목록은 데이터랩에서",
  },
  {
    id: "trend",
    label: "계절·예측",
    lead: "해마다 같은 달에 되돌아오는 원료와, 데이터랩이 2주 예측을 낸 원료입니다.",
    hash: "#view=forecast",
    more: "예측·계절 전체는 데이터랩에서",
  },
  {
    id: "safety",
    label: "표시·안전 점검",
    lead: "검색은 많지만 기능성 표시가 제한되는 지위의 원료를 모았습니다.",
    hash: "#view=news",
    more: "공개 소식 전체는 데이터랩에서",
  },
  {
    id: "broadcast",
    label: "홈쇼핑 방송",
    lead: "기준일까지 날짜가 확인된 홈쇼핑 편성 연결 수를 봅니다. 예정 편성은 세지 않습니다.",
    hash: "#view=ingredients",
    more: "원료별 방송 상세는 데이터랩에서",
  },
  {
    id: "report",
    label: "제조보고",
    lead: "C003 건기식 신고와 C002 건강보조식품 후보·보류를 나누어 봅니다. 판매량은 아닙니다.",
    hash: "#view=ingredients",
    more: "원료별 제조보고 상세는 데이터랩에서",
  },
];

function isTab(v: string | null): v is InsightTab {
  return v === "weekly" || v === "trend" || v === "safety" || v === "broadcast" || v === "report";
}

const n = (value: number | undefined) => value == null ? "자료 없음" : value.toLocaleString("ko-KR");

function ExtraList({ rows, kind }: { rows: InsightExtraRow[]; kind: InsightExtraRow["kind"] }) {
  return (
    <ol className={c.extraList}>
      {rows.map((row, index) => {
        const quoteBlocked = ["범위 밖", "참고", "보류"].includes(row.category) || row.grade === "의약품" || row.trust === "검색 오염";
        return (
          <li key={`${kind}-${row.id}`} className={c.extraRow}>
            <div className={c.extraName}>
              <span className={c.extraRank}>{index + 1}</span>
              <Link href={`/ingredient/?id=${encodeURIComponent(row.id)}`}>{row.name}</Link>
              <small>{row.name === "젖산마그네슘" ? `${row.category} · 마그네슘 함량·제품 요건 확인` : row.category || row.role}</small>
              {row.trust === "검색 오염" && <small>검색 오염 · 해석 주의</small>}
              {kind === "report" && !!row.aliases?.length && <small className={c.extraAliases}>
                같은 원료명 묶음 · 합산하지 않음: {row.aliases.map((alias, i) => <span key={alias.id}>
                  {i > 0 && " · "}<Link href={`/ingredient/?id=${encodeURIComponent(alias.id)}`}>{alias.name}</Link>
                </span>)}
              </small>}
            </div>
            <dl className={c.extraMetrics}>
              {kind === "broadcast" && <>
                <div><dt>방송 연결</dt><dd>{n(row.count)}회</dd></div>
                <div><dt>최다 채널</dt><dd>{row.channel || "미제공"}</dd></div>
                <div><dt>편성 기간</dt><dd>{row.periodStart}~{row.periodEnd}</dd></div>
              </>}
              {kind === "report" && <>
                <div><dt>건강기능식품 신고 · C003</dt><dd>{n(row.count)}건</dd></div>
                <div><dt>건강보조식품 후보 · C002</dt><dd>{n(row.supportCount)}건</dd></div>
                <div><dt>분류 보류</dt><dd>{n(row.heldCount)}건</dd></div>
                <div><dt>건기식 신고일</dt><dd>{row.healthFunctionalPeriodStart || "미확인"}~{row.healthFunctionalPeriodEnd || "미확인"}</dd></div>
                <div><dt>건강보조식품 후보 신고일</dt><dd>{row.healthSupportPeriodStart || "미확인"}~{row.healthSupportPeriodEnd || "미확인"}</dd></div>
                <div><dt>자료 기준일</dt><dd>{row.asOf || "미제공"}</dd></div>
                {!!row.companies?.length && <div><dt>건기식 신고 상위 업체</dt><dd>{row.companies.map(([name, count]) => `${name} ${n(count)}건`).join(" · ")}</dd></div>}
              </>}
              {kind === "season" && <>
                <div><dt>계절 고점</dt><dd>{row.peakMonth ? `${row.peakMonth}월` : "미제공"}</dd></div>
                <div><dt>원본 기준일</dt><dd>{row.asOf || "미제공"}</dd></div>
              </>}
              {kind === "forecast" && <>
                <div><dt>2주 예상</dt><dd>{row.point == null ? "미제공" : `${n(row.point)} ${row.unit}`}</dd></div>
                <div><dt>대상 기간</dt><dd>{row.targetStart}~{row.targetEnd}</dd></div>
                <div><dt>예측 기준일</dt><dd>{row.asOf || "미제공"}</dd></div>
                <div><dt>해석</dt><dd>통계 조건 통과 · 제품 적합성 확인 아님</dd></div>
              </>}
            </dl>
            {quoteBlocked ? <span className={c.extraNoQuote}>견적 연결 전 확인 필요</span> :
              <ButtonLink href={`/quote/ai/?ingredient=${encodeURIComponent(row.name)}`} variant="secondary" size="sm">견적요청</ButtonLink>}
          </li>
        );
      })}
    </ol>
  );
}

/* ── 주소창을 탭 상태의 원본으로 삼는다 ────────────────────────────────────────
   history.replaceState 는 popstate 를 띄우지 않으므로 구독자를 직접 둔다.
   useSyncExternalStore 를 쓰면 서버가 그린 화면(weekly)과 어긋나도 하이드레이션이
   깨지지 않는다 — 첫 그림 뒤 조용히 맞춰진다.                                   */
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("popstate", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("popstate", cb);
  };
}

const readTab = () => new URLSearchParams(window.location.search).get("tab") ?? "weekly";
const serverTab = () => "weekly";

export default function InsightTabs() {
  const fromUrl = useSyncExternalStore(subscribe, readTab, serverTab);
  const tab: InsightTab = isTab(fromUrl) ? fromUrl : "weekly";

  /** 받은 자료는 어느 탭 것인지와 함께 들고 있는다 — 탭을 바꿨을 때 앞 탭 표가 남지 않게. */
  const [loaded, setLoaded] = useState<{ tab: InsightTab; rows: Signal[]; notes: Insight[]; extra: { meta: InsightExtraMeta; rows: InsightExtraRow[] } | null } | null>(
    null,
  );
  const [showAllReports, setShowAllReports] = useState(false);
  const [meta, setMeta] = useState<DatalabMeta | null>(null);
  const [allNotes, setAllNotes] = useState<Insight[] | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    let alive = true;
    const ordinary = tab === "weekly" || tab === "safety";
    Promise.all([
      ordinary ? listSignalRows(tab) : Promise.resolve([] as Signal[]),
      ordinary ? getData().listInsights(tab) : Promise.resolve([] as Insight[]),
      ordinary ? Promise.resolve(null) : getInsightExtra(),
    ]).then(([rows, notes, extra]) => {
      if (alive) setLoaded({ tab, rows, notes, extra });
    });
    return () => {
      alive = false;
    };
  }, [tab]);

  useEffect(() => {
    let alive = true;
    getDatalabMeta().then((m) => alive && setMeta(m));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    getData().listInsights().then((rows) => alive && setAllNotes(rows)).catch(() => alive && setAllNotes([]));
    return () => { alive = false; };
  }, []);

  const pick = useCallback((next: InsightTab) => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
    listeners.forEach((l) => l());
  }, []);

  /** 탭 목록은 화살표로 옮겨 다닌다(WAI-ARIA tablist). */
  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, i: number) {
    const last = TABS.length - 1;
    let next = -1;
    if (e.key === "ArrowRight") next = i === last ? 0 : i + 1;
    else if (e.key === "ArrowLeft") next = i === 0 ? last : i - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next < 0) return;
    e.preventDefault();
    pick(TABS[next].id);
    tabRefs.current[next]?.focus();
  }

  const current = TABS.find((t) => t.id === tab)!;
  const ready = loaded?.tab === tab ? loaded : null;
  const rows = ready?.rows;
  const notes = ready?.notes;
  const extra = ready?.extra;
  const extraRows = extra?.rows.filter((row) => {
    if (tab === "trend") return row.kind === "season" || row.kind === "forecast";
    if (row.kind !== tab) return false;
    if (tab !== "report") return true;
    const valid = row.category === "건강기능식품 원료" || row.category === "건강보조식품 원료";
    return valid || (showAllReports && row.category === "보류");
  }) ?? [];
  const visibleCount = tab === "weekly" || tab === "safety" ? rows?.length ?? 0 : extraRows.length;
  const usesExtra = tab === "trend" || tab === "broadcast" || tab === "report";
  // 기준 주는 관측이 있는 첫 줄에서 가져온다 — 맨 윗줄이 「주간 비교 미제공」일 수 있다.
  const topRow = rows?.find((r) => r.changeStatus !== "미제공");

  return (
    <Container>
      <div className={s.page}>
        <PageHead
          eyebrow="Market Signals"
          title="원료 동향"
          sub="공개 검색·방송 편성·제조보고 자료를 축별로 봅니다. 각 숫자의 기준일은 원료마다 따로 확인해 주세요."
          right={
            <span className={c.headRight}>
              <Badge tone="neutral">{tab === "broadcast" ? `편성 ${extra?.meta.broadcastEnd ?? "—"}` : tab === "report" ? `제조보고 ${extra?.meta.reportAsOf ?? "—"}` : tab === "trend" ? extra?.meta.forecastCurrent ? `예측 ${extra.meta.forecastAsOf}` : "예측 대기" : `검색 ${meta?.observedAt ?? "—"}`}</Badge>
              <a
                className={c.cta}
                href={datalabLink()}
                target="_blank"
                rel="noopener noreferrer"
              >
                데이터랩에서 전체 보기 <span aria-hidden="true">↗</span>
              </a>
            </span>
          }
        />

        <p className={c.ctaNote}>
          {meta?.catalogCount ? `${meta.catalogCount.toLocaleString("ko-KR")}개 원료` : "원료 전수"} ·{" "}
          {meta?.historyYears ? `${meta.historyYears}년 검색 흐름` : "장기 검색 흐름"} · 방송·제조보고·예측의 기준일은 각각 다릅니다.
        </p>

        {meta && (
          <p className={c.caption}>
            <span>검색 최근 관측일 <b>{meta.observedAt}</b></span>
            <span>출처 · {meta.source}</span>
            {(tab === "weekly" || tab === "safety") && <>
              <em>{meta.note}</em>
              <em>월 {meta.minVolume.toLocaleString("ko-KR")}회 이상 원료만 담았습니다</em>
            </>}
            {usesExtra && <em>아래 숫자는 각 카드에 적힌 원본 날짜를 따릅니다.</em>}
          </p>
        )}

        <div className={c.tabViewport}><div className={s.tabs} role="tablist" aria-label="인사이트 분류">
          {TABS.map((t, i) => (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`insight-tab-${t.id}`}
              aria-selected={t.id === tab}
              aria-controls={`insight-panel-${t.id}`}
              tabIndex={t.id === tab ? 0 : -1}
              className={s.tab}
              onClick={() => pick(t.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              {t.label}
            </button>
          ))}
        </div></div>
        <p className={c.tabSwipeHint}>탭을 옆으로 밀면 홈쇼핑 방송·제조보고도 볼 수 있습니다.</p>

        <div
          role="tabpanel"
          id={`insight-panel-${tab}`}
          aria-labelledby={`insight-tab-${tab}`}
          tabIndex={0}
          key={tab}
          className={`${s.panel} ${c.panelClip}`}
        >
          {!rows || !notes || (usesExtra && !extra) ? (
            <p className="pf-help">자료를 불러오는 중입니다.</p>
          ) : (
            <div className={s.grid21}>
              <div className={s.stack}>
                <Card title={current.label} hint={current.lead} padded={false}>
                  {tab === "trend" ? (
                    <div className={c.extraGroup}>
                      <h2>계절 반복 <span>{extraRows.filter((row) => row.kind === "season").length}종</span></h2>
                      <ExtraList kind="season" rows={extraRows.filter((row) => row.kind === "season")} />
                      <h2>2주 예측 <span>{extra?.meta.forecastCurrent ? `${extraRows.filter((row) => row.kind === "forecast").length}종` : "자료 대기"}</span></h2>
                      <p className={c.extraCaution}>{extra?.meta.forecastCurrent
                        ? "예측은 상대지수입니다. 검색량·매출 예측이 아니며, 원료별 예측값과 대상 기간을 함께 표시합니다."
                        : `예측 원본 ${extra?.meta.forecastAsOf ?? "미제공"} · 최근 검색 ${meta?.observedAt ?? "미제공"} — 기준일이 달라 예측값을 보류합니다.`}</p>
                      <ExtraList kind="forecast" rows={extraRows.filter((row) => row.kind === "forecast")} />
                      {extra?.meta.lactateHomeExclusion && <p className={c.extraCaution}>
                        젖산마그네슘은 최근 7일 {extra.meta.lactateHomeExclusion.changePct.toFixed(1)}%로 하락해 홈의 상승 원료 TOP10에서 빠졌습니다. 공개 분류는 데이터랩 최신 분류를 따르며 원료 규격은 별도로 확인해야 합니다.
                      </p>}
                    </div>
                  ) : tab === "broadcast" || tab === "report" ? (
                    <div className={c.extraGroup}>
                      {tab === "report" && <p className={c.extraCaution} role="note">2026-09-29 전체 원본: 건기식 {extra?.meta.reportSourceCounts?.C003Total.toLocaleString("ko-KR") ?? "미제공"}건 중 원료 연결 {extra?.meta.reportSourceCounts?.C003LinkedReports.toLocaleString("ko-KR") ?? "미제공"}건 · 일반식품 {Object.values(extra?.meta.reportSourceCounts?.C002 ?? {}).reduce((sum, value) => sum + value, 0).toLocaleString("ko-KR")}건을 건강보조식품 후보·보류·범위 밖으로 나눴습니다. 같은 원료명 묶음은 합산하지 않았습니다.</p>}
                      {tab === "report" && <button type="button" className={c.reportToggle} aria-pressed={showAllReports} onClick={() => setShowAllReports((value) => !value)}>{showAllReports ? "보류 숨기기" : "보류 원료도 보기"}</button>}
                      {tab === "broadcast" && <p className={c.extraCaution}>날짜가 확인된 편성 기록만 셌습니다. 편성은 실제 송출·판매량을 뜻하지 않습니다.</p>}
                      <ExtraList kind={tab} rows={extraRows} />
                    </div>
                  ) : rows.length > 0 ? (
                    <SignalTable rows={rows} />
                  ) : (
                    <div style={{ padding: "20px 16px" }}>
                      <p className="pf-help">
                        데이터랩 자료를 아직 받지 못했습니다. 아래 글은 직접 정리해 둔 내용입니다.
                      </p>
                    </div>
                  )}
                </Card>

                <p className={c.more}>
                  <a
                    href={datalabLink(current.hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {current.more} <span aria-hidden="true">→</span>
                  </a>
                </p>

                {notes.length > 0 && <section className={c.notes}>
                  <h2 className={c.notesHead}>읽는 법</h2>
                  {notes.map((n) => (
                    <article key={n.id} className={c.note}>
                      <h3>{n.title}</h3>
                      <p>{n.summary}</p>
                      <details className={s.detail}>
                        <summary>자세히 보기</summary>
                        <p style={{ marginTop: 10 }}>{n.body}</p>
                      </details>
                      <div className={c.noteMeta}>
                        <span>출처 · {n.source}</span>
                        <time dateTime={n.publishedAt}>{n.publishedAt}</time>
                      </div>
                    </article>
                  ))}
                </section>}
              </div>

              <aside>
                <Card title="이 탭 요약">
                  <dl>
                    <KV label={tab === "trend" ? "표시 항목" : tab === "report" ? "표시 묶음" : "목록 원료"}>{visibleCount}종</KV>
                    {tab === "report" && <KV label="신고 연결 원료명">{extra?.meta.reportRawCount ?? "—"}종</KV>}
                    <KV label="읽는 글">{notes.length}건</KV>
                    <KV label="관측 구간">{usesExtra ? tab === "broadcast" ? `${extra?.meta.broadcastStart}~${extra?.meta.broadcastEnd}` : "원료별 카드 참조" : topRow?.periodLabel ?? "—"}</KV>
                    <KV label="자료 기준일">{tab === "broadcast" ? extra?.meta.broadcastEnd ?? "—" : tab === "report" ? extra?.meta.reportAsOf ?? "—" : tab === "trend" ? extra?.meta.forecastAsOf ?? "—" : meta?.observedAt ?? "—"}</KV>
                  </dl>
                  <Note>
                    {tab === "broadcast" ? "기준일까지 날짜가 확인된 편성 연결 건수입니다. 편성은 실제 송출·판매량이 아닙니다." :
                      tab === "report" ? "건기식 신고·건강보조식품 후보·보류를 나눴습니다. 같은 원료명 묶음은 합산하지 않았고, 원료별 신고일은 각 카드에 적었습니다. 판매량은 아닙니다." :
                      tab === "trend" ? "예측의 기준일과 대상 기간은 각 카드에서 확인합니다. 통계 조건 통과가 제품 적합성 승인은 아닙니다." :
                      "월 검색량은 참고값입니다. 변화율은 최근 관측 7일의 일평균을 앞선 7일과 견준 값이며, 기준값이 0이거나 빠진 원료는 비워 둡니다. 인정 지위와 제품화 가능 여부는 담당자 확인이 필요합니다."}
                  </Note>
                </Card>
              </aside>
            </div>
          )}
        </div>
        <section id="industry-articles" className={c.notes} style={{ scrollMarginTop: 80 }} aria-label="업계 자료 전체 글">
          <h2>이번 생성본 업계 자료 전체</h2>
          <p className="pf-help">이전 기준일의 글도 보존합니다. 각 글의 날짜를 확인해 주세요.</p>
          {allNotes === null ? <p className="pf-help">글을 불러오는 중입니다.</p> : allNotes.length === 0 ? <p className="pf-help">읽을 수 있는 글이 없습니다.</p> :
            allNotes.map((note) => <article key={note.id} className={c.note}>
              <h3>{note.title}</h3>
              <p>{note.summary}</p>
              <details className={s.detail}><summary>자세히 보기</summary><p style={{ marginTop: 10 }}>{note.body}</p></details>
              <div className={c.noteMeta}>
                <span>{TABS.find((item) => item.id === note.tab)?.label ?? "업계 자료"}</span>
                <time dateTime={note.publishedAt}>기준일 {Number(note.publishedAt.slice(5, 7))}월 {Number(note.publishedAt.slice(8, 10))}일</time>
                <span>출처 · {note.source}</span>
              </div>
            </article>)}
        </section>
      </div>
    </Container>
  );
}
