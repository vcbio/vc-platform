"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Badge, Card, Container } from "@/components/ui";
import { getData, type Insight, type InsightTab } from "@/lib/data";
import { KV, Note, PageHead, styles as s } from "@/components/deal/shared";

/**
 * 동향 인사이트 (#view-insight 재현). 로그인 없이 봅니다.
 *
 * 탭 상태는 주소창 쿼리(?tab=)에 남긴다 — 링크를 그대로 주고받을 수 있게.
 * 정적 내보내기라 라우터 대신 history.replaceState 로 주소만 바꾼다(페이지 이동 없음).
 *
 * ⚠️ 본문은 데이터 어댑터의 시드(자체 작성분)만 렌더한다. 외부 리포트 문장·표를 옮겨 적지 않는다.
 */

const TABS: { id: InsightTab; label: string }[] = [
  { id: "weekly", label: "주간 업계 동향" },
  { id: "trend", label: "시장·제형 동향" },
  { id: "safety", label: "표시·안전 점검" },
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

  const [rows, setRows] = useState<Insight[] | null>(null);
  const [total, setTotal] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    let alive = true;
    getData()
      .listInsights(tab)
      .then((r) => alive && setRows(r));
    getData()
      .listInsights()
      .then((r) => alive && setTotal(r.length));
    return () => {
      alive = false;
    };
  }, [tab]);

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

  const label = TABS.find((t) => t.id === tab)!.label;
  const latest = rows?.length ? rows[0].publishedAt : "—";

  return (
    <Container>
      <div className={s.page}>
        <PageHead
          eyebrow="Industry Insight"
          title="식품·건기식 동향 인사이트"
          sub="업계 동향과 제형 흐름, 표시·안전 점검 사항을 한 곳에 모았습니다. 공개 자료와 상담 기록을 바탕으로 직접 정리합니다."
          right={<Badge tone="neutral">최근 갱신 {latest}</Badge>}
        />

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
          {!rows ? (
            <p className="pf-help">글을 불러오는 중입니다.</p>
          ) : (
            <div className={s.grid21}>
              <div className={s.stack}>
                {rows.map((it) => (
                  <Card key={it.id} title={it.title} action={<Badge tone="info">{label}</Badge>}>
                    <p>{it.summary}</p>
                    <details className={s.detail}>
                      <summary>자세히 보기</summary>
                      <p style={{ marginTop: 10 }}>{it.body}</p>
                    </details>
                    <div className={s.metaRow}>
                      <span>출처 · {it.source}</span>
                      <time dateTime={it.publishedAt}>{it.publishedAt}</time>
                    </div>
                  </Card>
                ))}
                {rows.length === 0 && (
                  <Card>
                    <p className="pf-help">이 분류에 올라온 글이 아직 없습니다.</p>
                  </Card>
                )}
              </div>

              <aside>
                <Card title={`${label} 요약`}>
                  <dl>
                    <KV label="이 분류 글">{rows.length}건</KV>
                    <KV label="전체 글">{total}건</KV>
                    <KV label="분류">{TABS.length}개</KV>
                    <KV label="최근 갱신">{latest}</KV>
                  </dl>
                  <Note>
                    화면의 건수는 지금 올라와 있는 글을 센 값입니다. 본문은 공개 자료와 상담 기록을
                    간추린 내용이어서 개별 사안은 담당자 확인이 필요합니다.
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
