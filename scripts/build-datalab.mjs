/**
 * 데이터랩 공개 페이지 → 플랫폼용 파생 JSON 3종.
 *
 *   node scripts/build-datalab.mjs
 *
 * 왜 파생본을 만드나 — 데이터랩 원본(keywords 46.5MB 등)은 브라우저에서 읽을 크기가 아니다.
 * 첫 화면 페이로드를 300KB 아래로 묶으려고 빌드 시 한 번만 내려받아 필요한 줄만 깎아 둔다.
 *
 * 왜 JSON 이 아니라 페이지 HTML 을 읽나 — 공개 페이지가 화면에 쓰는 값(DATA·OBS)을 그대로 인라인으로
 * 갖고 있다. 같은 덩어리를 읽어야 화면 숫자가 데이터랩 화면과 한 자리도 어긋나지 않는다.
 * 페이지 안의 *_REF 상수(해시 파일명)도 함께 읽어 로그에 남긴다 — 갱신되면 파일명이 바뀐다.
 *
 * ⚠️ 실패해도 빌드를 세우지 않는다(exit 0). 기존 public/data 파일이 그대로 남고, 그것도 없으면
 *    화면이 로컬 시드로 떨어진다.
 * ⚠️ 데이터랩 저장소는 읽기 전용이다. 이 스크립트는 아무것도 올리지 않는다.
 */

import { mkdir, writeFile, stat } from "node:fs/promises";
import path from "node:path";

const PAGE = "https://vcbio.github.io/shelf/d/vcbio-market-fable.html";
const BASE = "https://vcbio.github.io/shelf/d/";
const OUT_DIR = path.join(process.cwd(), "public", "data");
const SOURCE = "한국 공개자료 · 데이터랩";
/** 검색량이 작은 원료는 한 주만 튀어도 변화율이 몇 배로 뛴다. 하한을 두고 화면에 그 하한을 적는다. */
const MIN_VOLUME = 1000;
/**
 * 「오늘의 신호」용 하한. 대표 원칙 = 절대 검색량이 먼저고 퍼센트는 그다음이다
 * (2026-09-10 "절대 검색량이 우선이야 %는 별로 안중요해"). 데이터랩 페이블 화면의
 * 「오늘의 한 줄」과 같은 문법 — 오른 원료 중 월 검색량 상위를 앞에 둔다.
 */
const SIGNAL_MIN_VOLUME = 10000;

const log = (...a) => console.log("[build-datalab]", ...a);

/* ── 인라인 리터럴 한 덩어리 떼어내기 ──────────────────────────────────────────
   괄호 깊이를 세되 문자열 안의 괄호는 건너뛴다. 정규식으로 자르면 데이터 안의
   대괄호에 걸려 조용히 잘린 JSON 을 얻는다.                                     */
function carve(src, key, open, close) {
  const at = src.indexOf(key);
  if (at < 0) throw new Error(`페이지에서 ${key} 를 찾지 못했습니다`);
  const start = src.indexOf(open, at);
  let depth = 0;
  for (let p = start; p < src.length; p++) {
    const c = src[p];
    if (c === open) depth++;
    else if (c === close) {
      if (--depth === 0) return JSON.parse(src.slice(start, p + 1));
    } else if (c === '"') {
      p++;
      while (src[p] !== '"') {
        if (src[p] === "\\") p++;
        p++;
      }
    }
  }
  throw new Error(`${key} 의 끝을 찾지 못했습니다`);
}

const mmdd = (iso) => iso.slice(5).replace("-", "-");
const round1 = (n) => Math.round(n * 10) / 10;
/** 미니바용 — 지수가 0.0x 대인 원료가 많아 소수 1자리로 깎으면 막대가 전부 0이 된다. */
const round3 = (n) => Math.round(n * 1000) / 1000;

async function main() {
  log("읽는 중:", PAGE);
  const res = await fetch(PAGE);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  log("페이지", (html.length / 1024 / 1024).toFixed(1) + "MB");

  // 원본 파일명(해시)은 갱신 때마다 바뀐다. 추적용으로 남긴다.
  const refs = [...html.matchAll(/([A-Z0-9_]+_REF)\s*=\s*"([^"]+)"/g)].map(([, k, v]) => `${k}=${BASE}${v}`);
  refs.forEach((r) => log("원본 참조", r));

  const DATA = carve(html, "const DATA=[", "[", "]");
  const OBS = carve(html, ", OBS={", "{", "}");
  // 분류 라벨의 정본. 없으면 DATA 의 s2·s4 만으로 같은 판정을 한다(데이터랩 함수와 동일한 ?? 순서).
  let CLASSIFICATION = { items: [] };
  try {
    CLASSIFICATION = carve(html, "CLASSIFICATION={", "{", "}");
  } catch {
    log("주의 — CLASSIFICATION 을 못 읽었습니다. s2·s4 만으로 분류합니다.");
  }
  const classById = new Map((CLASSIFICATION.items ?? []).map((x) => [x.id, x]));
  log(`DATA ${DATA.length}건 · OBS ${OBS.items.length}건 · 마지막 완전주 ${OBS.completeWeekEnd}`);

  const obsById = new Map(OBS.items.map((o) => [o.id, o]));

  /* ── 주간 변화율 ──────────────────────────────────────────────────────────
     데이터랩과 같은 산식이다 — 마지막 완전주 일평균 ÷ 직전 주 일평균 − 1.
     적격(eligible) 판정도 데이터랩 것을 그대로 따른다. 기준값이 0·결측이면 계산하지 않는다. */
  function weekly(row) {
    const o = obsById.get(row.id);
    const weeks = o?.weeks ?? [];
    if (!o?.eligible || weeks.length < 2) return null;
    const cur = weeks.at(-1);
    const prev = weeks.at(-2);
    if (!(prev.mean > 0)) return null;
    return {
      changePct: round1((cur.mean / prev.mean - 1) * 100),
      periodLabel: `주간 ${mmdd(cur.start)}~${mmdd(cur.end)}`,
      observedAt: cur.end,
      weeks8: weeks.slice(-8).map((w) => round3(w.mean)),
      riseWeeks: o.score8 ?? null,
      // 직전 주가 8주 최고의 20% 에도 못 미치면 퍼센트가 몇 배로 튄다. 화면에 그 사실을 적는다.
      lowBase: prev.mean < Math.max(...weeks.slice(-8).map((w) => w.mean)) * 0.2,
    };
  }

  /* ── 분류 라벨 ── 데이터랩 페이지의 classLabel() 을 그대로 옮겼다.
     우리가 문구를 만들지 않는다 — 데이터랩이 화면에 쓰는 말을 그대로 쓴다. */
  const classInfo = (d) => classById.get(d.id) ?? {};
  const healthScope = (d) => classInfo(d).healthScope ?? d.s2;
  const generalScope = (d) => !healthScope(d) && (classInfo(d).generalScope ?? d.s4);
  const classGrade = (d) => classInfo(d).gradeFilter || d.grade;
  function classLabel(d) {
    const x = classInfo(d);
    if (x.defaultInclude === false) return "원료 아닌 참고 분류";
    if (healthScope(d)) return x.registrationKind === "generic_related_keyword" ? "건기식 관련 검색어" : "건강기능식품 원료";
    if (generalScope(d)) return "일반식품 원료";
    if (d.role?.includes("의약품")) return "의약품 참고";
    // 데이터랩도 모르는 줄이다. 그럴듯한 말을 지어 채우지 않고 비워 둔다.
    return x.displayClassification || "";
  }

  const href = (row) => `${PAGE}#id=${row.id}`;
  const searchAsOf = (row) => row.q?.asOf?.["검색"] ?? OBS.sourceDate;

  /** DATA 한 줄 → Signal. 주간 관측이 없으면 변화율 자리를 비운 채로 낸다(0 으로 꾸미지 않는다). */
  function toSignal(row, tabs) {
    const w = weekly(row);
    return {
      id: row.id,
      name: row.name,
      category: classLabel(row),
      functionCategory: row.cat && row.cat !== "기타" ? row.cat : "",
      monthlyVolume: row.search ?? 0,
      changePct: w ? w.changePct : 0,
      changeStatus: w ? "관측" : "미제공",
      periodLabel: w ? w.periodLabel : "주간 비교 미제공",
      observedAt: w ? w.observedAt : searchAsOf(row),
      source: SOURCE,
      href: href(row),
      grade: classGrade(row),
      distribution: row.dist || "",
      verdict: row.verdict || "",
      season: row.season || "",
      seasonMonth: row.seasonMonth || "",
      weeks8: w?.weeks8 ?? [],
      riseWeeks: w?.riseWeeks ?? null,
      lowBase: w?.lowBase ?? false,
      tabs,
    };
  }

  const ingredients = DATA.filter((d) => d.role === "원료");
  const usable = ingredients.filter((d) => d.trust === "쓸만함");

  /* ── ① 오늘의 신호 (signals.json) ── 오른 원료 중 월 검색량이 큰 순서.
     퍼센트로 줄을 세우면 월 1,150회짜리가 1위로 올라온다 — 절대량이 먼저다. */
  const signals = usable
    .filter((d) => (d.search ?? 0) >= SIGNAL_MIN_VOLUME && (weekly(d)?.changePct ?? 0) > 0)
    .sort((a, b) => (b.search ?? 0) - (a.search ?? 0) || weekly(b).changePct - weekly(a).changePct)
    .slice(0, 20)
    .map((d) => toSignal(d, []));

  /* ── ② 주간 급상승 탭 ── 여기는 변화율 순으로 둔다(무엇이 움직였나를 보는 자리).
     기저가 낮아 퍼센트가 튄 줄에는 lowBase 표시가 붙는다. */
  const risers = usable
    .filter((d) => (d.search ?? 0) >= MIN_VOLUME && weekly(d))
    .sort((a, b) => weekly(b).changePct - weekly(a).changePct)
    .slice(0, 20)
    .map((d) => toSignal(d, ["weekly"]));

  /* ── ③ 계절·예측 ── 데이터랩이 「계절반복」으로 판정했거나 2주 예측 조건을 통과한 원료. */
  const seasonal = usable.filter((d) => d.season === "계절반복");
  const forecastable = usable.filter((d) => d.forecastV4?.status === "eligible");
  const trendRows = [...new Set([...seasonal, ...forecastable])]
    .sort((a, b) => (b.search ?? 0) - (a.search ?? 0))
    .slice(0, 16)
    .map((d) => toSignal(d, ["trend"]));

  /* ── ④ 표시·안전 ── 기능성 표시가 제한되는 지위인데 검색은 많은 원료 + 의약품 성분. */
  // 지위는 CLASSIFICATION 이 덮어쓴 값(classGrade)으로 본다 — 화면에 찍히는 값과 같아야 한다.
  const unapproved = usable
    .filter((d) => classGrade(d) === "비인정" && (d.search ?? 0) >= MIN_VOLUME)
    .sort((a, b) => (b.search ?? 0) - (a.search ?? 0))
    .slice(0, 12);
  const medicinal = DATA.filter((d) => classGrade(d) === "의약품")
    .sort((a, b) => (b.search ?? 0) - (a.search ?? 0))
    .slice(0, 6);
  const safetyRows = [...unapproved, ...medicinal].map((d) => toSignal(d, ["safety"]));

  /* ── 원료 상위 100 (검색량 순) ── 탭 태그를 붙여 화면이 곧바로 갈라 쓸 수 있게 둔다. */
  const tagged = new Map();
  for (const s of [...risers, ...trendRows, ...safetyRows]) {
    const hit = tagged.get(s.id);
    if (hit) hit.tabs = [...new Set([...hit.tabs, ...s.tabs])];
    else tagged.set(s.id, s);
  }
  const top100 = ingredients
    .sort((a, b) => (b.search ?? 0) - (a.search ?? 0))
    .slice(0, 100)
    .map((d) => tagged.get(d.id) ?? toSignal(d, []));
  // 상위 100 밖이지만 탭에 걸린 줄은 뒤에 붙인다 — 화면이 두 파일을 합치지 않아도 되게.
  for (const s of tagged.values()) if (!top100.some((t) => t.id === s.id)) top100.push(s);

  /* ── 인사이트 카드 ── 값은 전부 위에서 뽑은 실값이다. 문장은 관측을 말할 뿐 효능을 말하지 않는다. */
  const asOf = OBS.completeWeekEnd;
  const weekLabel = risers[0]?.periodLabel ?? `주간 ~${asOf}`;
  const num = (n) => n.toLocaleString("ko-KR");
  const pct = (n) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
  const names = (arr, n = 3) => arr.slice(0, n).map((x) => x.name).join(" · ");

  const persistent = [...risers].sort((a, b) => (b.riseWeeks ?? 0) - (a.riseWeeks ?? 0));
  const bigVolume = [...risers].sort((a, b) => b.monthlyVolume - a.monthlyVolume);
  const septemberSeason = trendRows.filter((r) => r.seasonMonth === "9");
  // 기능성 분류는 데이터랩 원본의 cat 값으로 센다. "기타"는 분류가 아니라 미지정이라 빼고 센다.
  const catById = new Map(DATA.map((d) => [d.id, d.cat]));
  const catCount = risers.reduce((acc, r) => {
    const k = catById.get(r.id);
    if (!k || k === "기타") return acc;
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  const topCat = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0];

  const insights = [
    {
      id: "dl-weekly-top",
      tab: "weekly",
      title: `이번 주 가장 크게 오른 원료는 ${risers[0].name}입니다`,
      summary: `${weekLabel} 기준 ${risers[0].name}의 검색이 직전 주보다 ${pct(risers[0].changePct)} 움직였습니다. 월 검색량은 ${num(risers[0].monthlyVolume)}회입니다.`,
      body: `상위 5종은 ${names(risers, 5)}입니다. 변화율은 마지막 완전주의 일평균을 직전 주와 견준 값이고, 월 검색량은 원 제공자의 최근 월간 추정값이라 산정 기간이 서로 다릅니다. 표의 8주 막대로 한 주만 튄 것인지 흐름이 이어지는 것인지 먼저 보시기 바랍니다.`,
      source: SOURCE,
      publishedAt: asOf,
    },
    {
      id: "dl-weekly-persistent",
      tab: "weekly",
      title: `8주 중 ${persistent[0].riseWeeks}주를 오른 ${persistent[0].name}`,
      summary: `직전 주보다 오른 횟수가 가장 잦은 원료는 ${names(persistent, 3)}입니다. 한 주 급등과 달리 흐름이 이어지는 쪽입니다.`,
      body: `데이터랩은 최근 8주 동안 "직전 주보다 올랐는가"를 세어 지속성을 봅니다. 한 번에 크게 뛴 원료는 다음 주에 되돌아오는 경우가 많고, 오른 주가 잦은 원료는 기획을 붙일 시간이 더 있습니다. 두 값을 같이 보셔야 합니다.`,
      source: SOURCE,
      publishedAt: asOf,
    },
    {
      id: "dl-weekly-volume",
      tab: "weekly",
      title: `검색 규모까지 큰 상승 원료 — ${bigVolume[0].name}`,
      summary: `상승 원료 중 월 검색량이 가장 큰 쪽은 ${names(bigVolume, 3)}입니다. ${bigVolume[0].name}은 월 ${num(bigVolume[0].monthlyVolume)}회입니다.`,
      body: `상승률만 보면 검색량이 작은 원료가 앞자리를 차지합니다. 이 목록은 월 ${num(MIN_VOLUME)}회 이상인 원료만 담았고, 그중에서도 규모가 큰 순서로 다시 세운 것입니다. 검색량은 원료 간 시장 규모를 뜻하지 않습니다.`,
      source: SOURCE,
      publishedAt: asOf,
    },
    {
      id: "dl-trend-season",
      tab: "trend",
      title: `9월마다 되돌아오는 원료 ${septemberSeason.length}종`,
      summary: `데이터랩이 계절 반복으로 본 원료 중 9월이 고점인 쪽은 ${names(septemberSeason, 3)} 등 ${septemberSeason.length}종입니다.`,
      body: `계절 반복 판정은 여러 해의 월별 관측에서 같은 달이 거듭 높게 나왔는지를 본 결과입니다. 올해도 같으리라는 보장은 아니지만, 생산 리드타임이 6~10주인 제형이라면 지금 물어볼 이유는 됩니다.`,
      source: SOURCE,
      publishedAt: asOf,
    },
    {
      id: "dl-trend-forecast",
      tab: "trend",
      title: `2주 예측 조건을 통과한 원료 ${forecastable.length}종`,
      summary: `데이터랩의 2주 예측은 과거 오차 시험을 통과한 원료에만 값을 냅니다. 이번 회차에 통과한 원료는 ${forecastable.length}종입니다.`,
      body: `나머지 원료는 "지난주 값을 그대로 쓰는 방법보다 충분히 낫지 않다"는 이유로 값을 내지 않습니다. 예측은 데이터랩이 계산한 결과이고 이 화면은 그 결과를 옮겨 보여 줄 뿐입니다. 이 플랫폼은 예측을 따로 계산하지 않습니다.`,
      source: SOURCE,
      publishedAt: asOf,
    },
    {
      id: "dl-trend-category",
      tab: "trend",
      title: topCat ? `상승 원료가 몰린 분류 — ${topCat[0]}` : "상승 원료의 기능성 분류",
      summary: `주간 상승 상위 ${risers.length}종을 기능성 분류로 나누면 ${topCat ? `${topCat[0]} 분류가 ${topCat[1]}종으로 가장 많습니다` : "한쪽으로 몰리지 않고 고르게 나뉩니다"}. 분류가 붙지 않은 원료는 세지 않았습니다.`,
      body: `분류는 데이터랩이 원료에 붙여 둔 값입니다. 같은 분류에 여러 원료가 동시에 오르면 단일 원료보다 카테고리 자체가 움직이는 경우가 있어, 복합 배합을 검토할 때 먼저 봅니다.`,
      source: SOURCE,
      publishedAt: asOf,
    },
    {
      id: "dl-safety-unapproved",
      tab: "safety",
      title: `검색은 많지만 기능성 인정이 없는 원료 ${unapproved.length}종`,
      summary: `${names(unapproved, 3)} 등은 검색이 많은 편이지만 고시형·개별인정형이 아닙니다. 일반식품으로 만들 수는 있어도 기능성 표시는 할 수 없습니다.`,
      body: `인정 지위는 데이터랩이 정리한 공개 자료 값입니다. 기획 단계에서 이 구분을 놓치면 표시·광고 문구를 다시 써야 하고, 그때는 이미 디자인과 인쇄가 끝나 있는 경우가 많습니다. 최종 판단은 관할 기관 고시와 개별 품목 확인이 우선입니다.`,
      source: SOURCE,
      publishedAt: asOf,
    },
    {
      id: "dl-safety-medicinal",
      tab: "safety",
      title: `식품에 쓸 수 없는 성분도 같이 검색됩니다`,
      summary: `${names(medicinal, 3)} 등 의약품 성분이 원료 검색어와 함께 잡힙니다. 참고로만 두고 제품 기획에는 넣지 않습니다.`,
      body: `검색량이 크다고 해서 식품 원료로 쓸 수 있다는 뜻이 아닙니다. 데이터랩은 이런 항목을 의약품(참고)으로 따로 표시해 둡니다. 이 화면도 같은 표시를 그대로 달아 둡니다.`,
      source: SOURCE,
      publishedAt: asOf,
    },
    {
      id: "dl-safety-notes",
      tab: "safety",
      title: `이 숫자를 읽을 때 같이 봐야 하는 것`,
      summary: `월 검색량은 참고값입니다. 정확한 산정 기간이 제공되지 않고, 원료 간 시장 규모를 뜻하지도 않습니다.`,
      body: `변화율은 마지막 완전주(${weekLabel.replace("주간 ", "")})의 일평균을 직전 주와 견준 값입니다. 기준값이 0이거나 빠진 원료는 변화율을 내지 않고 비워 둡니다. 원자료는 ${OBS.rawSource}이며, 자세한 관측일수와 품질 표시는 데이터랩 화면에서 확인하실 수 있습니다.`,
      source: SOURCE,
      publishedAt: asOf,
    },
  ];

  const meta = {
    generatedAt: new Date().toISOString(),
    observedAt: asOf,
    sourceDate: OBS.sourceDate,
    source: SOURCE,
    sourcePage: PAGE,
    rawSource: OBS.rawSource,
    minVolume: MIN_VOLUME,
    signalMinVolume: SIGNAL_MIN_VOLUME,
    note: "검색량은 참고값(정확 산정기간 미제공) · 원료 간 시장 규모를 뜻하지 않습니다",
  };

  await mkdir(OUT_DIR, { recursive: true });
  const files = [
    ["signals.json", { meta, rows: signals }],
    ["insights.json", { meta, rows: insights }],
    ["ingredients-top.json", { meta, rows: top100 }],
  ];
  for (const [name, payload] of files) {
    const file = path.join(OUT_DIR, name);
    await writeFile(file, JSON.stringify(payload));
    const kb = (await stat(file)).size / 1024;
    log(`생성 ${name} — ${payload.rows.length}건 · ${kb.toFixed(1)}KB${kb > 300 ? "  ⚠️ 300KB 초과" : ""}`);
  }

  // 검산 — 지시받은 대조값이 그대로 나오는지 본다.
  const check = ingredients.find((d) => d.name === "젖산마그네슘");
  if (check) {
    const w = weekly(check);
    log(`검산 젖산마그네슘 — 월 검색량 ${num(check.search)}회 · ${w ? `${pct(w.changePct)} (${w.periodLabel})` : "주간 미제공"}`);
  }
  log(`검산 오늘의 신호 상위 3 — ${signals.slice(0, 3).map((r, i) => `${i + 1}위 ${r.name} ${num(r.monthlyVolume)}회 ${pct(r.changePct)}`).join(" · ")}`);
  log(`검산 급상승 탭 1위 — ${risers[0].name} ${num(risers[0].monthlyVolume)}회 ${pct(risers[0].changePct)}${risers[0].lowBase ? " (기저 낮음 표시)" : ""}`);
}

main().catch((e) => {
  log("실패 —", e.message);
  log("기존 public/data 파일을 그대로 두고 빌드를 이어갑니다.");
  process.exit(0);
});
