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
const TTL_MS = 5 * 60 * 1000;

export type DatalabMeta = {
  observedAt: string;
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
 * weekly 는 급상승 20건(signals.json), trend·safety 는 원료 상위 목록에서 태그로 갈라 온다.
 */
export async function listSignalRows(tab: InsightTab): Promise<Signal[]> {
  if (tab === "weekly") return (await load<Signal>("signals.json"))?.rows ?? [];
  const rows = (await load<Signal>("ingredients-top.json"))?.rows ?? [];
  return rows.filter((r) => r.tabs?.includes(tab));
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
