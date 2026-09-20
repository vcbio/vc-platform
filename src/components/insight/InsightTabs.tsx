"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Badge, Card, Container } from "@/components/ui";
import { getData, type Insight, type InsightTab, type Signal } from "@/lib/data";
import { getDatalabMeta, listSignalRows, type DatalabMeta } from "@/lib/data/datalab";
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

const TABS: { id: InsightTab; label: string; lead: string }[] = [
  {
    id: "weekly",
    label: "주간 급상승",
    lead: "마지막 완전주의 검색이 직전 주보다 얼마나 움직였는지 봅니다.",
  },
  {
    id: "trend",
    label: "계절·예측",
    lead: "해마다 같은 달에 되돌아오는 원료와, 데이터랩이 2주 예측을 낸 원료입니다.",
  },
  {
    id: "safety",
    label: "표시·안전 점검",
    lead: "검색은 많지만 기능성 표시가 제한되는 지위의 원료를 모았습니다.",
  },
];

function isTab(v: string | null): v is InsightTab {
  return v === "weekly" || v === "trend" || v === "safety";
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
  const [loaded, setLoaded] = useState<{ tab: InsightTab; rows: Signal[]; notes: Insight[] } | null>(
    null,
  );
  const [meta, setMeta] = useState<DatalabMeta | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    let alive = true;
    Promise.all([listSignalRows(tab), getData().listInsights(tab)]).then(([rows, notes]) => {
      if (alive) setLoaded({ tab, rows, notes });
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
  const topRow = rows?.[0];

  return (
    <Container>
      <div className={s.page}>
        <PageHead
          eyebrow="Market Signals"
          title="원료 검색 동향"
          sub="지금 시장이 무엇을 찾고 있는지 공개 검색 자료로 봅니다. 눈에 띄는 원료는 그 자리에서 견적으로 넘길 수 있습니다."
          right={<Badge tone="neutral">기준 {meta?.observedAt ?? "—"}</Badge>}
        />

        {meta && (
          <p className={c.caption}>
            <span>
              기준일 <b>{meta.observedAt}</b>
            </span>
            <span>출처 · {meta.source}</span>
            <em>{meta.note}</em>
            <em>월 {meta.minVolume.toLocaleString("ko-KR")}회 이상 원료만 담았습니다</em>
          </p>
        )}

        <div className={s.tabs} role="tablist" aria-label="인사이트 분류">
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
        </div>

        <div
          role="tabpanel"
          id={`insight-panel-${tab}`}
          aria-labelledby={`insight-tab-${tab}`}
          tabIndex={0}
          key={tab}
          className={s.panel}
        >
          {!rows || !notes ? (
            <p className="pf-help">자료를 불러오는 중입니다.</p>
          ) : (
            <div className={s.grid21}>
              <div className={s.stack}>
                <Card title={current.label} hint={current.lead} padded={false}>
                  {rows.length > 0 ? (
                    <SignalTable rows={rows} />
                  ) : (
                    <div style={{ padding: "20px 16px" }}>
                      <p className="pf-help">
                        데이터랩 자료를 아직 받지 못했습니다. 아래 글은 직접 정리해 둔 내용입니다.
                      </p>
                    </div>
                  )}
                </Card>

                <section className={c.notes}>
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
                  {notes.length === 0 && <p className="pf-help">이 분류에 올라온 글이 아직 없습니다.</p>}
                </section>
              </div>

              <aside>
                <Card title="이 탭 요약">
                  <dl>
                    <KV label="목록 원료">{rows.length}종</KV>
                    <KV label="읽는 글">{notes.length}건</KV>
                    <KV label="기준 주">{topRow?.periodLabel ?? "—"}</KV>
                    <KV label="자료 기준일">{meta?.observedAt ?? "—"}</KV>
                  </dl>
                  <Note>
                    월 검색량은 참고값입니다. 정확한 산정 기간이 제공되지 않고, 원료 간 시장 규모를
                    뜻하지도 않습니다. 변화율은 마지막 완전주의 일평균을 직전 주와 견준 값이며, 기준값이
                    0이거나 빠진 원료는 비워 둡니다. 인정 지위와 제품화 가능 여부는 담당자 확인이
                    필요합니다.
                  </Note>
                </Card>
              </aside>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
