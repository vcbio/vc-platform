import { getData } from "@/lib/data";

export type HomeStats = {
  manufacturers: number;
  ingredients: number;
  quotes: number;
  avgLeadTimeWeeks: number | null;
  /** 등록 제조사가 실제로 가진 인증을 많이 가진 순으로. 화면에 인증명을 손으로 적지 않는다. */
  certifications: string[];
};

/**
 * 홈 신뢰 지표. 전부 어댑터가 가진 실제 건수다 — 화면에 숫자를 손으로 적지 않는다.
 * 빌드 때는 시드 기준으로, 브라우저에서는 저장분 기준으로 같은 함수가 다시 돈다.
 */
export async function homeStats(): Promise<HomeStats> {
  const data = getData();
  const [manufacturers, ingredients, quotes] = await Promise.all([
    data.listManufacturers(),
    data.listIngredients(),
    data.listQuotes(),
  ]);

  const active = manufacturers.filter((m) => m.isActive);
  const knownLeadTimes = active
    .map((m) => m.leadTimeWeeks)
    .filter((weeks): weeks is number => typeof weeks === "number" && Number.isFinite(weeks));
  const avg = knownLeadTimes.length
    ? knownLeadTimes.reduce((sum, weeks) => sum + weeks, 0) / knownLeadTimes.length
    : null;

  // 인증은 세어서 많은 순으로 낸다 — "GMP 보유"라고 단정하지 않고 가진 것만 적기 위해서다.
  const tally = new Map<string, number>();
  for (const m of active) {
    for (const c of m.certifications) tally.set(c, (tally.get(c) ?? 0) + 1);
  }
  const certifications = [...tally.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name]) => name);

  return {
    manufacturers: active.length,
    certifications,
    ingredients: ingredients.filter((i) => i.isActive).length,
    quotes: quotes.length,
    avgLeadTimeWeeks: avg === null ? null : Math.round(avg * 10) / 10,
  };
}
