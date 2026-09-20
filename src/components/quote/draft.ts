import type { DosageForm } from "@/lib/data";

export const DOSAGE_FORMS: { value: DosageForm; sub: string; unit: string }[] = [
  { value: "정제", sub: "Tablet", unit: "정" },
  { value: "경질캡슐", sub: "Hard capsule", unit: "캡슐" },
  { value: "연질캡슐", sub: "Soft capsule", unit: "캡슐" },
  { value: "분말스틱", sub: "Powder stick", unit: "포" },
  { value: "액상스틱", sub: "Liquid stick", unit: "포" },
  { value: "젤리", sub: "Gummy", unit: "개" },
  { value: "환", sub: "Pill", unit: "g" },
];

export const UNITS = ["정", "캡슐", "포", "개", "병", "g"];

/** 금액은 받지 않는다. 예산은 확정 단계만 고른다(어댑터 시드와 같은 표현). */
export const BUDGET_RANGES = ["미정", "협의 예정", "상담 후 확정", "사내 확정 · 상담 시 공유"];

export type Draft = {
  productType: string;
  dosageForm: DosageForm;
  quantity: string;
  unit: string;
  targetDate: string;
  ingredients: string[];
  budgetRange: string;
  memo: string;
  email: string;
};

export const EMPTY_DRAFT: Draft = {
  productType: "",
  dosageForm: "정제",
  quantity: "10000",
  unit: "정",
  targetDate: "",
  ingredients: [],
  budgetRange: "미정",
  memo: "",
  email: "",
};

export const DRAFT_KEY = "vcp.quoteDraft";

export function loadDraft(): { draft: Draft; savedAt: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { draft?: Partial<Draft>; savedAt?: number };
    if (!parsed.draft) return null;
    // 저장분이 낡아 필드가 빠져 있어도 화면이 멈추지 않게 기본값 위에 덮는다.
    return { draft: { ...EMPTY_DRAFT, ...parsed.draft }, savedAt: parsed.savedAt ?? 0 };
  } catch {
    return null;
  }
}

export function saveDraft(draft: Draft): number {
  const savedAt = Date.now();
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ draft, savedAt }));
  } catch {
    // 저장 공간이 막혀도 입력은 계속돼야 한다.
  }
  return savedAt;
}

export function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // 지우기 실패는 화면 동작에 영향이 없다.
  }
}

/** 화면에 사람이 읽을 저장 시각을 만든다. */
export function savedAgo(savedAt: number, now: number): string {
  if (!savedAt) return "";
  const min = Math.floor((now - savedAt) / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  return `${Math.floor(min / 60)}시간 전`;
}
