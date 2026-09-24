/**
 * 플랫폼 데이터 모델.
 * ⚠️ 가격·단가·마진 필드는 두지 않는다(대표 지시). 수수료도 필드로 만들지 않는다.
 */

export type DosageForm = "정제" | "캡슐" | "경질캡슐" | "연질캡슐" | "분말" | "분말스틱" | "과립" | "퀵멜트" | "액상" | "액상스틱" | "젤리" | "환" | "스낵";

export type Manufacturer = {
  id: string;
  /** 익명 표시명. 실명은 쓰지 않는다 — 「A제조 (충북·GMP)」 식. */
  displayName: string;
  region: string;
  certifications: string[];
  dosageForms: DosageForm[];
  /** 공개 가능한 공정 요약. 설비 소유·현재 가동을 뜻하지 않는다. */
  equipmentSummary?: string;
  moqRange: string;
  /** 확인되지 않은 납기는 null. */
  leadTimeWeeks: number | null;
  /** 플랫폼 목록 노출 여부. 공장 영업 상태가 아니다. */
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

  /* ── 아래는 데이터랩 파생본이 채우는 선택 필드다. 로컬 시드에는 없어도 화면이 돈다. ── */

  /** 변화율을 실제로 관측했는지. 기준값이 0·결측이면 "미제공" 이고 changePct 를 읽지 않는다. */
  changeStatus?: "관측" | "미제공";
  /** 인정 지위 — 고시형 / 개별인정 / 비인정 / 의약품. 기능성 표시 가능 여부의 근거다. */
  grade?: string;
  /** 기능성 분류 (수면·관절·혈행 …). 데이터랩이 분류를 붙이지 않았으면 빈 값이다. */
  functionCategory?: string;
  /** 직전 주 기저가 8주 최고의 20% 미만이라 변화율이 크게 튄 줄. 화면에 그 사실을 적는다. */
  lowBase?: boolean;
  /** 유통 형태 (예: 일반식품(마그네슘 제형)). */
  distribution?: string;
  /** 데이터랩의 장기 추세 판정 (예: 신규 상승 / 고점 지남). */
  verdict?: string;
  /** 계절성 판정 (예: 계절반복). */
  season?: string;
  /** 계절 고점 월 ("9" 등). season 이 계절반복일 때만 값이 있다. */
  seasonMonth?: string;
  /** 최근 8주 일평균(검색 상대지수). 미니바가 이 값을 그린다. */
  weeks8?: number[];
  /** 최근 8주 중 직전 주보다 오른 횟수(0~8). 데이터랩의 지속성 지표다. */
  riseWeeks?: number | null;
  /** 이 줄을 어느 탭에서 보여 줄지. */
  tabs?: InsightTab[];
  /** 직전 완전주 같은 규칙으로 매긴 순위에서 몇 계단 올랐는지(양수=상승). 판정 못 하면 필드가 없다. */
  rankDelta?: number;
  /** 직전 주 목록 20위 밖이었으면 true. 판정 못 하면 필드가 없다. */
  isNew?: boolean;
};
