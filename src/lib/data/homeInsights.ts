import type { Insight } from "./types";

const DAY_MS = 86_400_000;
const GROUPS = [
  ["dl-weekly-top", "dl-weekly-persistent", "dl-weekly-spike"],
  ["dl-broadcast-week", "dl-trend-next-season", "dl-trend-forecast"],
  ["dl-safety-notes", "dl-safety-unapproved", "dl-trend-category"],
  ["dl-safety-medicinal", "dl-broadcast-week", "dl-trend-forecast"],
] as const;

/** 방문일 기준으로 다시 거른다. 수집이 멈춰 예전 정적 페이지가 남아도 오래된 글은 안 보인다. */
export function todayKst(now = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function selectHomeInsights(rows: Insight[], today: string): Insight[] {
  const todayUtc = Date.parse(`${today}T00:00:00Z`);
  if (!Number.isFinite(todayUtc)) return [];
  const monday = todayUtc - ((new Date(todayUtc).getUTCDay() + 6) % 7) * DAY_MS;
  const anchor = Date.parse("2026-09-28T00:00:00Z");
  const week = Math.floor((monday - anchor) / (7 * DAY_MS));
  const group = GROUPS[((week % GROUPS.length) + GROUPS.length) % GROUPS.length];
  const byId = new Map(rows.map((row) => [row.id, row]));
  return group.map((id) => byId.get(id)).filter((row): row is Insight => {
    if (!row || !/^\d{4}-\d{2}-\d{2}$/.test(row.publishedAt)) return false;
    const age = Math.round((todayUtc - Date.parse(`${row.publishedAt}T00:00:00Z`)) / DAY_MS);
    return age >= 0 && age <= 7 && (!row.homeValidThrough || today <= row.homeValidThrough);
  });
}
