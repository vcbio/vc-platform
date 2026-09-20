/**
 * 데이터랩 파생본 어댑터.
 *
 * 시장 신호(listSignals)와 동향 인사이트(listInsights)만 데이터랩 값으로 바꾸고,
 * 제조사·원료·견적 같은 나머지는 전부 로컬 어댑터에 그대로 넘긴다.
 *
 * 읽는 파일은 `scripts/build-datalab.mjs` 가 빌드 때 만들어 둔 파생 JSON 3종이다.
 * 원본(46MB)을 브라우저가 열지 않는다. 파일이 없거나 형식이 다르면 조용히 로컬 시드로 떨어진다 —
 * 화면이 비는 것보다 옛 시드라도 보이는 편이 낫다.
 *
 * ⚠️ 서버(정적 내보내기) 쪽에서는 상대 경로 fetch 가 성립하지 않는다. 그래서 브라우저에서만 읽는다.
 */

import { localData } from "./local";
import type { DataAdapter } from "./index";
import type { Insight, InsightTab, Signal } from "./types";

/** GitHub Pages 하위 경로. next.config.ts 의 basePath 와 같아야 한다. */
const BASE_PATH = "/vc-platform";

/**
 * 데이터랩 공개 화면 주소. **화면에 나가는 링크는 전부 여기 한 곳을 본다** —
 * 정식 버전이 확정되면 이 한 줄만 바꾸면 된다.
 * ⚠️ 빌드 스크립트(`scripts/build-datalab.mjs`)의 `PAGE` 도 같은 주소를 본다.
 *    그쪽은 값을 긁어 오는 대상이라 따로 두었다 — 주소를 바꾸면 두 곳을 같이 바꾼다.
 */
export const DATALAB_URL = "https://vcbio.github.io/shelf/d/vcbio-market-fable.html";

/** 데이터랩 화면의 특정 view 로 바로 보내는 주소. hash 는 "#view=…" 형태로 준다. */
export const datalabLink = (hash = "") => `${DATALAB_URL}${hash}`;

/** 원료 상세(추이 탭)로 바로 보내는 주소. */
export const datalabIngredient = (id: string) =>
  datalabLink(`#view=ingredients&id=${encodeURIComponent(id)}&tab=trend`);
const TTL_MS = 5 * 60 * 1000;

export type DatalabMeta = {
  observedAt: string;
  /** 데이터랩이 다루는 원료·검색어 수. 캡션이 이 값을 읽는다(손으로 적지 않는다). */
  catalogCount?: number;
  /** 관측이 시작된 해부터 지금까지의 햇수. */
  historyYears?: number;
  sourceDate: string;
  source: string;
  sourcePage: string;
  minVolume: number;
  note: string;
};

type Payload<T> = { meta: DatalabMeta; rows: T[] };

const cache = new Map<string, { at: number; value: Promise<Payload<unknown> | null> }>();

function load<T>(name: string): Promise<Payload<T> | null> {
  const hit = cache.get(name);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as Promise<Payload<T> | null>;

  const value = (async (): Promise<Payload<unknown> | null> => {
    if (typeof window === "undefined") return null;
    try {
      const res = await fetch(`${BASE_PATH}/data/${name}`, { cache: "no-store" });
      if (!res.ok) return null;
      const json = await res.json();
      if (!json || !Array.isArray(json.rows) || !json.meta) return null;
      return json as Payload<unknown>;
    } catch {
      return null; // 오프라인·차단·파일 없음 — 어느 쪽이든 시드로 떨어진다.
    }
  })();

  // 실패한 응답을 5분 동안 붙들지 않는다. 다음 호출에서 다시 시도한다.
  value.then((v) => {
    if (v === null) cache.delete(name);
  });
  cache.set(name, { at: Date.now(), value });
  return value as Promise<Payload<T> | null>;
}

/** 캡션에 쓸 기준일·출처. 파생본이 없으면 null 이고, 화면은 캡션을 접는다. */
export async function getDatalabMeta(): Promise<DatalabMeta | null> {
  const p = (await load<Signal>("signals.json")) ?? (await load<Insight>("insights.json"));
  return p?.meta ?? null;
}

/**
 * 탭별 표 데이터. 어댑터 인터페이스 밖의 보조 조회다 — 인사이트 화면만 쓴다.
 * 세 탭 모두 원료 상위 목록에서 태그로 갈라 온다.
 *
 * 정렬은 탭이 묻는 질문에 맞춘다 — 급상승 탭은 "무엇이 움직였나"라서 변화율 순이고,
 * 계절·표시 탭은 "무엇이 큰가"라서 검색량 순이다. signals.json(오늘의 신호)은
 * 언제나 검색량 순이다(절대량 우선).
 */
export async function listSignalRows(tab: InsightTab): Promise<Signal[]> {
  const rows = (await load<Signal>("ingredients-top.json"))?.rows ?? [];
  const picked = rows.filter((r) => r.tabs?.includes(tab));
  return picked.sort((a, b) =>
    tab === "weekly"
      ? b.changePct - a.changePct
      : b.monthlyVolume - a.monthlyVolume || b.changePct - a.changePct,
  );
}

export const datalabData: DataAdapter = {
  ...localData,

  async listSignals(limit = 3): Promise<Signal[]> {
    const rows = (await load<Signal>("signals.json"))?.rows;
    if (!rows?.length) return localData.listSignals(limit);
    return rows.slice(0, limit);
  },

  async listInsights(tab?: InsightTab): Promise<Insight[]> {
    const rows = (await load<Insight>("insights.json"))?.rows;
    if (!rows?.length) return localData.listInsights(tab);
    const picked = tab ? rows.filter((r) => r.tab === tab) : rows;
    return [...picked].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  },
};
