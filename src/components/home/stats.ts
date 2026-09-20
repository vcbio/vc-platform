import { getData } from "@/lib/data";

export type HomeStats = {
  manufacturers: number;
  ingredients: number;
  quotes: number;
  avgLeadTimeWeeks: number;
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
  const avg = active.length
    ? active.reduce((sum, m) => sum + m.leadTimeWeeks, 0) / active.length
    : 0;

  return {
    manufacturers: active.length,
    ingredients: ingredients.filter((i) => i.isActive).length,
    quotes: quotes.length,
    avgLeadTimeWeeks: Math.round(avg * 10) / 10,
  };
}
