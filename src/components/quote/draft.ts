import type { DosageForm } from "@/lib/data";

export const DOSAGE_FORMS: { value: DosageForm; sub: string; unit: string }[] = [
  { value: "정제", sub: "Tablet", unit: "정" },
  { value: "캡슐", sub: "Capsule", unit: "캡슐" },
  { value: "경질캡슐", sub: "Hard capsule", unit: "캡슐" },
  { value: "연질캡슐", sub: "Soft capsule", unit: "캡슐" },
  { value: "분말", sub: "Powder", unit: "g" },
  { value: "분말스틱", sub: "Powder stick", unit: "포" },
  { value: "과립", sub: "Granule", unit: "g" },
  { value: "퀵멜트", sub: "Quick melt", unit: "포" },
  { value: "액상", sub: "Liquid", unit: "병" },
  { value: "액상스틱", sub: "Liquid stick", unit: "포" },
  { value: "젤리", sub: "Jelly", unit: "개" },
  { value: "환", sub: "Pill", unit: "g" },
  { value: "스낵", sub: "Snack", unit: "개" },
];

export const UNITS = ["정", "캡슐", "포", "개", "병", "g", "kg"];

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
};

export const DRAFT_KEY = "vcp.quoteDraft";

/** 과거 임시견적은 계정 귀속이 불명확하다. 어느 계정에도 복원하지 않고 지운다. */
export function purgeStoredDrafts(): void {
  if (typeof window === "undefined") return;
  try {
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const key = window.localStorage.key(i);
      if (key === DRAFT_KEY || key?.startsWith(`${DRAFT_KEY}.`)) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // 저장소가 차단되어도 견적 입력은 계속된다.
  }
}
