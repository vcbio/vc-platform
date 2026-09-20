import { localData } from "./local";
import { datalabData } from "./datalab";
import type {
  Ingredient,
  Manufacturer,
  MatchCriteria,
  MatchResult,
  Insight,
  InsightTab,
  Quote,
  Signal,
} from "./types";

export * from "./types";

/**
 * 화면 코드는 이 인터페이스만 부른다. 나중에 supabase 어댑터를 같은 모양으로 추가하면
 * 화면은 한 줄도 고치지 않는다.
 */
export type DataAdapter = {
  listManufacturers(): Promise<Manufacturer[]>;
  getManufacturer(id: string): Promise<Manufacturer | null>;
  createManufacturer(input: Omit<Manufacturer, "id">): Promise<Manufacturer>;
  updateManufacturer(id: string, patch: Partial<Manufacturer>): Promise<Manufacturer | null>;
  removeManufacturer(id: string): Promise<void>;

  listIngredients(): Promise<Ingredient[]>;
  getIngredient(id: string): Promise<Ingredient | null>;
  createIngredient(input: Omit<Ingredient, "id">): Promise<Ingredient>;
  updateIngredient(id: string, patch: Partial<Ingredient>): Promise<Ingredient | null>;
  removeIngredient(id: string): Promise<void>;

  listQuotes(userEmail?: string): Promise<Quote[]>;
  getQuote(id: string): Promise<Quote | null>;
  createQuote(input: Omit<Quote, "id" | "createdAt" | "updatedAt" | "status">): Promise<Quote>;
  updateQuote(id: string, patch: Partial<Quote>): Promise<Quote | null>;
  removeQuote(id: string): Promise<void>;

  listInsights(tab?: InsightTab): Promise<Insight[]>;

  /** 지금 뜨는 원료 상위 n건 (변화율 내림차순). 데이터랩 연결 전엔 로컬 시드 스텁. */
  listSignals(limit?: number): Promise<Signal[]>;

  matchManufacturers(criteria: MatchCriteria): Promise<MatchResult[]>;
};

/**
 * 기본값은 데이터랩 합성 어댑터다 — 시장 신호·인사이트만 데이터랩 파생본을 읽고
 * 나머지는 local 에 그대로 넘긴다. 파생본이 없으면 그 두 가지도 local 시드로 떨어진다.
 *
 * `NEXT_PUBLIC_DATA_ADAPTER=local` 이면 데이터랩을 아예 읽지 않는다(폴백 확인·오프라인 작업용).
 */
export function getData(): DataAdapter {
  if (process.env.NEXT_PUBLIC_DATA_ADAPTER === "supabase") {
    throw new Error("supabase 어댑터는 아직 없습니다. NEXT_PUBLIC_DATA_ADAPTER 를 비우고 쓰십시오.");
  }
  if (process.env.NEXT_PUBLIC_DATA_ADAPTER === "local") return localData;
  return datalabData;
}
