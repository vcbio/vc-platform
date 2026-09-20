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

/**
 * 시장 신호 — 데이터랩(공개데이터)에서 오는 "지금 뜨는 원료" 한 줄.
 * 홈 히어로·「오늘의 신호」 띠·인사이트가 이걸 쓴다. 값은 전부 공개 검색량 기반이며 가격 정보는 없다.
 */
export type Signal = {
  id: string;
  name: string;              // 원료명 (예: 젖산마그네슘)
  category?: string;         // 건강기능식품 원료 / 일반식품 원료 …
  monthlyVolume: number;     // 월 검색량(회)
  changePct: number;         // 직전 기간 대비 변화율(%) — 양수 상승
  periodLabel: string;       // 비교 기간 설명 (예: "주간 08-31~09-06")
  observedAt: string;        // 데이터 기준일 ISO (예: 2026-09-07)
  source: string;            // 출처 표기 (예: "한국 공개자료 · 데이터랩")
  href?: string;             // 데이터랩 원료 상세 URL
};
