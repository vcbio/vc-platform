import type { Ingredient, Insight, Manufacturer, Quote } from "./types";

/**
 * 시연용 더미 데이터.
 *
 * ⚠️ 규칙 3가지 — 고치더라도 이건 지킨다.
 *  1. 실존 거래처·제조사 실명 금지. 제조사는 「A제조 (충북·GMP)」 식 익명.
 *  2. 금액·공급가·마진 표기 금지. 예산은 "협의" 같은 범위 문구까지만.
 *  3. 질병 예방·치료·확정적 효능 단정 금지. 기능성은 고시 카테고리명만.
 */

export const seedManufacturers: Manufacturer[] = [
  {
    id: "mfr-a",
    displayName: "A제조 (충북·GMP·HACCP)",
    region: "충북",
    certifications: ["GMP", "HACCP", "ISO 22000"],
    dosageForms: ["정제", "경질캡슐"],
    moqRange: "10,000 ~ 50,000정",
    leadTimeWeeks: 4,
    isActive: true,
  },
  {
    id: "mfr-b",
    displayName: "B제조 (경기·GMP)",
    region: "경기",
    certifications: ["GMP", "HACCP"],
    dosageForms: ["분말스틱", "액상스틱"],
    moqRange: "30,000 ~ 100,000포",
    leadTimeWeeks: 6,
    isActive: true,
  },
  {
    id: "mfr-c",
    displayName: "C제조 (충남·GMP·ISO)",
    region: "충남",
    certifications: ["GMP", "ISO 22000", "할랄"],
    dosageForms: ["연질캡슐"],
    moqRange: "20,000 ~ 60,000캡슐",
    leadTimeWeeks: 5,
    isActive: true,
  },
  {
    id: "mfr-d",
    displayName: "D제조 (전북·HACCP)",
    region: "전북",
    certifications: ["HACCP"],
    dosageForms: ["젤리", "분말스틱"],
    moqRange: "50,000 ~ 200,000개",
    leadTimeWeeks: 8,
    isActive: true,
  },
  {
    id: "mfr-e",
    displayName: "E제조 (강원·GMP·유기)",
    region: "강원",
    certifications: ["GMP", "유기가공식품"],
    dosageForms: ["환", "정제"],
    moqRange: "5,000 ~ 30,000개",
    leadTimeWeeks: 3,
    isActive: true,
  },
  {
    id: "mfr-f",
    displayName: "F제조 (경남·GMP·수출)",
    region: "경남",
    certifications: ["GMP", "HACCP", "FSSC 22000"],
    dosageForms: ["정제", "경질캡슐", "연질캡슐"],
    moqRange: "100,000정 이상",
    leadTimeWeeks: 10,
    isActive: false,
  },
];

export const seedIngredients: Ingredient[] = [
  { id: "ing-01", name: "밀크씨슬 추출물", category: "간 건강", origin: "독일", spec: "실리마린 80%", dosageForms: ["정제", "경질캡슐"], isActive: true },
  { id: "ing-02", name: "루테인지아잔틴 복합", category: "눈 건강", origin: "인도", spec: "루테인 20% 오일", dosageForms: ["연질캡슐"], isActive: true },
  { id: "ing-03", name: "프로바이오틱스 혼합균", category: "장 건강", origin: "덴마크", spec: "1,000억 CFU/g", dosageForms: ["분말스틱", "경질캡슐"], isActive: true },
  { id: "ing-04", name: "오메가3 (rTG)", category: "혈행 개선", origin: "페루", spec: "EPA+DHA 60%", dosageForms: ["연질캡슐"], isActive: true },
  { id: "ing-05", name: "저분자 콜라겐 펩타이드", category: "피부 건강", origin: "국내", spec: "평균 분자량 500 Da 이하", dosageForms: ["분말스틱", "젤리"], isActive: true },
  { id: "ing-06", name: "홍삼 농축액", category: "면역 기능", origin: "국내", spec: "진세노사이드 Rg1+Rb1+Rg3 7mg/g", dosageForms: ["액상스틱", "환"], isActive: true },
  { id: "ing-07", name: "비타민D3", category: "뼈 건강", origin: "영국", spec: "100,000 IU/g", dosageForms: ["정제", "연질캡슐"], isActive: true },
  { id: "ing-08", name: "마그네슘 (산화)", category: "에너지 대사", origin: "이스라엘", spec: "Mg 60% 이상", dosageForms: ["정제"], isActive: true },
  { id: "ing-09", name: "아연 (글루콘산)", category: "면역 기능", origin: "프랑스", spec: "Zn 13% 이상", dosageForms: ["정제", "경질캡슐"], isActive: true },
  { id: "ing-10", name: "쏘팔메토 추출물", category: "전립선 건강", origin: "미국", spec: "지방산 85%", dosageForms: ["연질캡슐"], isActive: true },
  { id: "ing-11", name: "가르시니아캄보지아 추출물", category: "체지방 감소", origin: "인도", spec: "HCA 60%", dosageForms: ["정제", "경질캡슐"], isActive: true },
  { id: "ing-12", name: "테아닌", category: "긴장 완화", origin: "일본", spec: "순도 98% 이상", dosageForms: ["정제", "분말스틱"], isActive: true },
  { id: "ing-13", name: "MSM (식이유황)", category: "관절 건강", origin: "미국", spec: "순도 99.9%", dosageForms: ["정제", "분말스틱"], isActive: true },
  { id: "ing-14", name: "엽산", category: "임신 준비", origin: "중국", spec: "순도 97% 이상", dosageForms: ["정제"], isActive: true },
  { id: "ing-15", name: "크랜베리 추출물", category: "요로 건강", origin: "캐나다", spec: "프로안토시아니딘 5%", dosageForms: ["경질캡슐", "분말스틱"], isActive: false },
];

export const seedInsights: Insight[] = [
  {
    id: "ins-01",
    tab: "weekly",
    title: "이번 주 원료 수급 메모: 해외 발효 원료 리드타임",
    summary:
      "이번 주 상담에서 가장 자주 나온 이야기는 해외 발효 원료의 입고 지연이었습니다. 선적 일정이 밀리면서 발주부터 입고까지 걸리는 기간을 기존보다 길게 잡아야 한다는 문의가 이어졌습니다. 신규 품목을 설계할 때는 대체 원료를 함께 올려두고, 생산 일정도 여유를 두어 잡는 편이 안전합니다. 확정된 일정은 제조사별로 다르니 개별 확인이 필요합니다. 같은 원료라도 공급 경로에 따라 입고 시점이 달라지므로, 상담 단계에서 예상 입고 주차를 문서로 남겨 두시길 권합니다.",
    body: "발주 단계에서 원료 입고일을 고정값으로 두면 포장재 발주와 출고 일정이 함께 밀립니다. 설계 단계에서 같은 기능성 카테고리 안의 대체 원료를 1개 이상 확보해 두고, 규격과 사용 가능 제형이 같은지 미리 대조해 두면 일정이 흔들려도 되돌릴 수 있습니다.",
    source: "플랫폼 상담 기록 기준 (자체 집계)",
    publishedAt: "2026-09-15",
  },
  {
    id: "ins-02",
    tab: "weekly",
    title: "이번 주 문의 요약: 소량 시생산 요청이 늘었다",
    summary:
      "신규 브랜드에서 소량 시생산을 먼저 요청하는 사례가 눈에 띄게 늘었습니다. 본생산 전에 시장 반응을 보려는 흐름인데, 제조사 입장에서는 설비 전환 시간이 그대로 들기 때문에 최소 수량 협의가 관건입니다. 시생산을 받아주는 곳은 제형이 제한되는 경우가 많아, 제형을 먼저 정하고 제조사를 찾는 순서가 실패가 적습니다. 시생산 물량과 본생산 물량을 함께 제시하면 협의가 빨라진다는 이야기도 여러 곳에서 나왔습니다.",
    body: "시생산은 라인 점유 시간이 본생산과 크게 다르지 않습니다. 그래서 최소 수량이 낮은 제조사는 대체로 소형 라인을 따로 운영합니다. 매칭 화면에서 최소 수량 범위를 먼저 좁히고, 그다음 인증과 리드타임을 보는 순서를 권합니다.",
    source: "플랫폼 상담 기록 기준 (자체 집계)",
    publishedAt: "2026-09-08",
  },
  {
    id: "ins-03",
    tab: "trend",
    title: "제형 동향: 스틱형 분말과 젤리의 비중 변화",
    summary:
      "정제와 캡슐 중심이던 문의가 스틱형 분말과 젤리로 분산되는 흐름이 이어지고 있습니다. 물 없이 먹을 수 있다는 점과 포장 디자인 자유도가 이유로 꼽힙니다. 다만 젤리는 원료 함량을 올리기 어려운 제형이라 설계 단계에서 기능성 원료의 배합 한계를 먼저 확인해야 합니다. 같은 원료라도 제형에 따라 쓸 수 있는 규격이 달라집니다. 제형을 바꾸면 포장재와 생산 라인이 함께 바뀌므로, 기획 초기에 제형을 고정해 두는 편이 수정이 적습니다.",
    body: "스틱 제형은 흡습 관리와 포장재 선택이 품질을 좌우합니다. 젤리는 가열 공정을 거치므로 열에 약한 원료는 잔존율을 따로 확인해야 합니다. 제형을 먼저 고정하면 원료 후보가 자동으로 좁혀지므로, 설계 순서를 제형 우선으로 두는 편이 수정이 적습니다.",
    source: "공개 시장 자료 및 플랫폼 문의 유형 집계",
    publishedAt: "2026-09-12",
  },
  {
    id: "ins-04",
    tab: "trend",
    title: "수출 대응: 인증 요구가 견적 단계로 앞당겨지고 있다",
    summary:
      "수출을 염두에 둔 문의에서 인증 요건을 견적 단계에서 먼저 묻는 경우가 늘었습니다. 생산이 끝난 뒤 인증 문제로 되돌아오는 손실이 크기 때문입니다. 제조사마다 보유한 인증이 다르고 품목별로 적용 범위도 달라, 매칭 조건에 인증을 넣어 먼저 거르는 방식이 시간을 아낍니다. 세부 적용 범위는 제조사 확인이 필요합니다. 인증을 조건으로 걸면 후보가 크게 줄어드는 경우가 많으니, 필수 인증과 있으면 좋은 인증을 나눠서 적어 두시면 후보를 넓게 볼 수 있습니다.",
    body: "인증은 공장 단위와 품목 단위가 따로 있습니다. 공장이 인증을 보유해도 해당 라인·품목이 범위에 포함되지 않으면 쓸 수 없습니다. 매칭 결과에 나온 인증은 공장 단위 표기이므로, 실제 적용 여부는 상담에서 확인하는 것을 전제로 봅니다.",
    source: "공개 인증 기준 및 플랫폼 문의 유형 집계",
    publishedAt: "2026-09-05",
  },
  {
    id: "ins-05",
    tab: "safety",
    title: "표시·광고 점검: 기능성 문구는 고시 범위 안에서",
    summary:
      "제품 기획 단계에서 기능성 문구를 실제 인정 범위보다 넓게 잡았다가 표시 단계에서 되돌리는 사례가 반복됩니다. 기능성은 고시된 카테고리 표현을 그대로 쓰는 것이 원칙이며, 질병의 예방이나 치료를 떠올리게 하는 표현은 쓸 수 없습니다. 기획 초기에 문구를 확정해 두면 라벨과 상세페이지를 다시 만드는 일을 줄일 수 있습니다. 배합 설계와 표시 문구를 같은 회차에서 함께 검토하는 절차를 두시길 권합니다.",
    body: "원료의 인정 기능성과 완제품에 표시할 수 있는 문구는 별개로 봅니다. 배합량이 일일섭취량 기준에 미치지 못하면 해당 기능성을 표시할 수 없습니다. 설계 확정 전에 배합량과 표시 문구를 함께 검토하는 절차를 권합니다.",
    source: "식약처 공표 자료 기준 (일반 사항 요약)",
    publishedAt: "2026-09-14",
  },
  {
    id: "ins-06",
    tab: "safety",
    title: "품질 서류 점검: 시험성적서 항목이 규격과 맞는지",
    summary:
      "입고 원료의 시험성적서를 받아 두었는데 정작 규격서에 적힌 지표 성분 항목이 빠져 있는 경우가 있습니다. 서류가 있다는 것과 필요한 항목이 들어 있다는 것은 다른 이야기입니다. 발주 전에 규격서와 성적서 항목을 나란히 놓고 대조하는 절차를 두면, 생산 직전에 서류를 다시 받는 상황을 피할 수 있습니다. 대조 결과는 발주 건별로 남겨 두어야 다음 회차에서 같은 확인을 반복하지 않습니다.",
    body: "확인할 항목은 지표 성분 함량, 미생물, 중금속, 잔류 용매 네 갈래로 나눠 보면 빠뜨리기 어렵습니다. 성적서 발행일과 제조번호가 실제 입고분과 일치하는지도 함께 봅니다. 불일치가 있으면 입고 전에 정리하는 편이 항상 저렴합니다.",
    source: "식약처 공표 자료 기준 (일반 사항 요약)",
    publishedAt: "2026-09-02",
  },
];

export const seedQuotes: Quote[] = [
  {
    id: "qt-2026-0001",
    userEmail: "demo@example.com",
    productType: "간 건강 정제",
    dosageForm: "정제",
    quantity: 30000,
    unit: "정",
    ingredients: ["밀크씨슬 추출물", "비타민D3"],
    targetDate: "2026-11-30",
    budgetRange: "협의 예정",
    memo: "기존 제품 리뉴얼입니다. 정제 크기를 줄일 수 있는지 함께 봐 주세요.",
    status: "접수",
    createdAt: "2026-09-16T01:20:00.000Z",
    updatedAt: "2026-09-16T01:20:00.000Z",
  },
  {
    id: "qt-2026-0002",
    userEmail: "demo@example.com",
    productType: "장 건강 분말스틱",
    dosageForm: "분말스틱",
    quantity: 60000,
    unit: "포",
    ingredients: ["프로바이오틱스 혼합균", "저분자 콜라겐 펩타이드"],
    targetDate: "2026-12-20",
    budgetRange: "상담 후 확정",
    memo: "스틱 포장재는 저희가 지정한 곳으로 진행 가능한지 확인 부탁드립니다.",
    status: "검토중",
    createdAt: "2026-09-10T04:05:00.000Z",
    updatedAt: "2026-09-17T02:40:00.000Z",
  },
  {
    id: "qt-2026-0003",
    userEmail: "demo@example.com",
    productType: "눈 건강 연질캡슐",
    dosageForm: "연질캡슐",
    quantity: 20000,
    unit: "캡슐",
    ingredients: ["루테인지아잔틴 복합", "오메가3 (rTG)"],
    targetDate: "2026-10-31",
    budgetRange: "미정",
    memo: "소량 시생산을 먼저 진행하고 싶습니다.",
    status: "회신완료",
    createdAt: "2026-08-28T06:30:00.000Z",
    updatedAt: "2026-09-12T07:15:00.000Z",
  },
];
