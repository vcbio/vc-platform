import type {
  Signal, DataAdapter } from "./index";
import { seedIngredients, seedInsights, seedManufacturers, seedQuotes } from "./seed";
import type {
  Ingredient,
  InsightTab,
  Manufacturer,
  MatchCriteria,
  MatchResult,
  Quote,
} from "./types";

/**
 * localStorage 어댑터. Supabase 가 붙기 전까지 화면을 실제로 굴리기 위한 저장소다.
 *
 * SSR(정적 빌드) 때는 window 가 없으므로 시드 데이터를 그대로 돌려준다 —
 * 그래야 빌드 시점 HTML 에도 내용이 들어가고, 브라우저에서 다시 읽을 때 저장분으로 바뀐다.
 */

const KEY = {
  manufacturers: "vcp.manufacturers",
  ingredients: "vcp.ingredients",
  quotes: "vcp.quotes",
} as const;

// localStorage 가 막힌 브라우저(사파리 시크릿·쿠키 전면 차단)에서도 화면이 돌게
// 메모리 저장소로 조용히 내려앉는다. (2026-09-20 검증 지적 — SecurityError 로 가입 버튼 정지)
const mem = new Map<string, string>();
function getRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key) ?? mem.get(key) ?? null;
  } catch {
    return mem.get(key) ?? null;
  }
}
function setRaw(key: string, value: string) {
  mem.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // 저장소 차단 — 메모리에만 남긴다(탭을 닫으면 사라진다).
  }
}

function load<T>(key: string, seed: T[]): T[] {
  if (typeof window === "undefined") return seed;
  try {
    const raw = getRaw(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as T[];
    }
  } catch {
    // 저장분이 깨졌으면 시드로 되돌린다. 화면이 멈추는 것보다 낫다.
  }
  setRaw(key, JSON.stringify(seed));
  return seed;
}

function save<T>(key: string, rows: T[]) {
  if (typeof window === "undefined") return;
  setRaw(key, JSON.stringify(rows));
}

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** 목록/단건/생성/수정/삭제는 세 테이블이 완전히 같은 모양이라 한 번만 쓴다. */
function table<T extends { id: string }>(key: string, seed: T[], idPrefix: string) {
  const all = () => load<T>(key, seed);
  return {
    list: async () => all(),
    get: async (id: string) => all().find((r) => r.id === id) ?? null,
    create: async (input: Omit<T, "id">) => {
      const row = { ...input, id: newId(idPrefix) } as T;
      save(key, [...all(), row]);
      return row;
    },
    update: async (id: string, patch: Partial<T>) => {
      const rows = all();
      const i = rows.findIndex((r) => r.id === id);
      if (i < 0) return null;
      const next = { ...rows[i], ...patch, id } as T;
      rows[i] = next;
      save(key, rows);
      return next;
    },
    remove: async (id: string) => {
      save(
        key,
        all().filter((r) => r.id !== id),
      );
    },
  };
}

const manufacturers = table<Manufacturer>(KEY.manufacturers, seedManufacturers, "mfr");
const ingredients = table<Ingredient>(KEY.ingredients, seedIngredients, "ing");
const quotes = table<Quote>(KEY.quotes, seedQuotes, "qt");

export const localData: DataAdapter = {
  listManufacturers: manufacturers.list,
  getManufacturer: manufacturers.get,
  createManufacturer: manufacturers.create,
  updateManufacturer: manufacturers.update,
  removeManufacturer: manufacturers.remove,

  listIngredients: ingredients.list,
  getIngredient: ingredients.get,
  createIngredient: ingredients.create,
  updateIngredient: ingredients.update,
  removeIngredient: ingredients.remove,

  async listQuotes(userEmail) {
    const rows = await quotes.list();
    return userEmail ? rows.filter((q) => q.userEmail === userEmail) : rows;
  },
  getQuote: quotes.get,
  async createQuote(input) {
    const now = new Date().toISOString();
    return quotes.create({ ...input, status: "접수", createdAt: now, updatedAt: now });
  },
  async updateQuote(id, patch) {
    return quotes.update(id, { ...patch, updatedAt: new Date().toISOString() });
  },
  removeQuote: quotes.remove,

  async listInsights(tab?: InsightTab) {
    const rows = tab ? seedInsights.filter((i) => i.tab === tab) : seedInsights;
    return [...rows].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  },

  /**
   * 조건을 몇 개 만족했는지 세어 비율로 낸다. 추정·예측 모델이 아니다.
   * 조건을 하나도 주지 않으면 가동 중인 제조사를 전부 돌려준다.
   */
  async listSignals(limit = 3): Promise<Signal[]> {
    // 데이터랩 연결 전 임시 스텁 — 값은 2026-09-20 데이터랩 공개 화면 실측(젖산마그네슘 137,200 등)과 같게 둔다.
    const rows: Signal[] = [
      { id: "sig-1", name: "젖산마그네슘", category: "건강기능식품 원료", monthlyVolume: 137200, changePct: 26.1, periodLabel: "주간 08-31~09-06", observedAt: "2026-09-06", source: "한국 공개자료 · 데이터랩", href: "https://vcbio.github.io/shelf/d/vcbio-market-fable.html" },
      { id: "sig-2", name: "마그네슘", category: "건강기능식품 원료", monthlyVolume: 124700, changePct: 7.6, periodLabel: "주간 08-31~09-06", observedAt: "2026-09-06", source: "한국 공개자료 · 데이터랩", href: "https://vcbio.github.io/shelf/d/vcbio-market-fable.html" },
      { id: "sig-3", name: "유산균", category: "건기식 관련 검색어", monthlyVolume: 116800, changePct: 4.6, periodLabel: "주간 08-31~09-06", observedAt: "2026-09-06", source: "한국 공개자료 · 데이터랩", href: "https://vcbio.github.io/shelf/d/vcbio-market-fable.html" },
    ];
    return rows.slice(0, limit);
  },

  async matchManufacturers(criteria: MatchCriteria): Promise<MatchResult[]> {
    const rows = (await manufacturers.list()).filter((m) => m.isActive);

    const checks: { label: string; ok: (m: Manufacturer) => boolean }[] = [];
    if (criteria.dosageForm)
      checks.push({
        label: `제형 ${criteria.dosageForm}`,
        ok: (m) => m.dosageForms.includes(criteria.dosageForm!),
      });
    if (criteria.region)
      checks.push({ label: `지역 ${criteria.region}`, ok: (m) => m.region === criteria.region });
    if (criteria.certification)
      checks.push({
        label: criteria.certification,
        ok: (m) => m.certifications.includes(criteria.certification!),
      });
    if (criteria.maxLeadTimeWeeks != null)
      checks.push({
        label: `리드타임 ${criteria.maxLeadTimeWeeks}주 이내`,
        ok: (m) => m.leadTimeWeeks <= criteria.maxLeadTimeWeeks!,
      });

    if (checks.length === 0) {
      return rows.map((m) => ({ manufacturer: m, score: 0, matched: [] }));
    }

    return rows
      .map((m) => {
        const matched = checks.filter((c) => c.ok(m)).map((c) => c.label);
        return {
          manufacturer: m,
          score: Math.round((matched.length / checks.length) * 100),
          matched,
        };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || a.manufacturer.leadTimeWeeks - b.manufacturer.leadTimeWeeks);
  },
};
