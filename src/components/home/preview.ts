import { getData, type MatchCriteria, type MatchResult } from "@/lib/data";

/** 홈 미리보기가 쓰는 예시 조건. 매칭 화면에도 같은 조건을 그대로 넘긴다. */
export const PREVIEW_CRITERIA: MatchCriteria = {
  certification: "GMP",
  maxLeadTimeWeeks: 6,
};

export async function previewResults(): Promise<MatchResult[]> {
  const rows = await getData().matchManufacturers(PREVIEW_CRITERIA);
  return rows.slice(0, 3);
}
