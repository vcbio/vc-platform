/**
 * 플랫폼 데이터 모델.
 * ⚠️ 가격·단가·마진 필드는 두지 않는다(대표 지시). 수수료도 필드로 만들지 않는다.
 */

export type DosageForm = "정제" | "경질캡슐" | "연질캡슐" | "분말스틱" | "액상스틱" | "젤리" | "환";

export type Manufacturer = {
  id: string;
  /** 익명 표시명. 실명은 쓰지 않는다 — 「A제조 (충북·GMP)」 식. */
  displayName: string;
  region: string;
  certifications: string[];
  dosageForms: DosageForm[];
  moqRange: string;
  leadTimeWeeks: number;
  isActive: boolean;
};

export type Ingredient = {
  id: string;
  name: string;
  category: string;
  origin: string;
  spec: string;
  dosageForms: DosageForm[];
  isActive: boolean;
};

export type QuoteStatus = "접수" | "검토중" | "회신완료" | "종료";

export type Quote = {
  id: string;
  userEmail: string;
  productType: string;
  dosageForm: DosageForm;
  quantity: number;
  unit: string;
  ingredients: string[];
  targetDate: string;
  /** 예산은 범위 문자열로만 받는다. 단가·금액 계산은 플랫폼에서 하지 않는다. */
  budgetRange: string;
  memo: string;
  status: QuoteStatus;
  createdAt: string;
  updatedAt: string;
};

export type InsightTab = "weekly" | "trend" | "safety";

export type Insight = {
  id: string;
  tab: InsightTab;
  title: string;
  summary: string;
  body: string;
  source: string;
  publishedAt: string;
};

/** 매칭 입력 조건. 비워 둔 항목은 조건에서 제외한다. */
export type MatchCriteria = {
  dosageForm?: DosageForm;
  region?: string;
  certification?: string;
  maxLeadTimeWeeks?: number;
};

export type MatchResult = {
  manufacturer: Manufacturer;
  /** 0~100. 조건을 몇 개 만족했는지의 비율이다(추정·예측이 아니다). */
  score: number;
  matched: string[];
};
