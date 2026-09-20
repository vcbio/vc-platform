import { localData } from "./local";
import type {
  Ingredient,
  Manufacturer,
  MatchCriteria,
  MatchResult,
  Insight,
  InsightTab,
  Quote,
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

  matchManufacturers(criteria: MatchCriteria): Promise<MatchResult[]>;
};

/** `NEXT_PUBLIC_DATA_ADAPTER=supabase` 가 아니면 언제나 local 이다. */
export function getData(): DataAdapter {
  if (process.env.NEXT_PUBLIC_DATA_ADAPTER === "supabase") {
    throw new Error("supabase 어댑터는 아직 없습니다. NEXT_PUBLIC_DATA_ADAPTER 를 비우고 쓰십시오.");
  }
  return localData;
}
