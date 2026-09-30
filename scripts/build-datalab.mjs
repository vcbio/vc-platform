/**
 * 데이터랩 공개 페이지 → 플랫폼용 파생 JSON 3종.
 *
 *   node scripts/build-datalab.mjs
 *
 * 왜 파생본을 만드나 — 데이터랩 원본(keywords 46.5MB 등)은 브라우저에서 읽을 크기가 아니다.
 * 첫 화면 페이로드를 300KB 아래로 묶으려고 빌드 시 한 번만 내려받아 필요한 줄만 깎아 둔다.
 *
 * 공개 페이지에서 원료·분류·검색량과 최신 일별 자료 포인터를 읽는다.
 * 일별 변화율은 데이터랩 기간 요약, 8주 차트는 해시 검증된 일별 원본으로 만든다.
 *
 * ⚠️ 원본이 맞지 않으면 빌드를 실패시킨다. 성공처럼 낡은 날짜를 게시하지 않는다.
 * ⚠️ 데이터랩 저장소는 읽기 전용이다. 이 스크립트는 아무것도 올리지 않는다.
 */

import { mkdir, readFile, readdir, writeFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

/** 값을 긁어 오는 대상. 화면 링크용 주소는 `src/lib/data/datalab.ts` 의 DATALAB_URL 이다(같이 바꿀 것). */
const PAGE = "https://vcbio.github.io/shelf/d/vcbio-market-fable.html";
const BASE = "https://vcbio.github.io/shelf/d/";
const OUT_DIR = path.join(process.cwd(), "public", "data");
/** 관측일별 스냅샷 보관소. 순위 변동(▲▼)은 7일 전 파일이 있어야 계산할 수 있다. */
const HISTORY_DIR = path.join(OUT_DIR, "history");
/** 비교 대상으로 인정하는 최소 간격. 같은 주의 파일을 지난주로 착각하지 않게 한다. */
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
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

/**
 * 네트워크가 멈추면 실패한다. GitHub Pages는 이전 배포를 보존한다.
 * unref 라서 정상 종료를 붙잡지 않는다.
 */
const watchdog = setTimeout(() => {
  console.error("[build-datalab] 120초 시간 초과 — 이번 배포를 중단합니다.");
  process.exit(1);
}, 120_000);
watchdog.unref();

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
      // 경계를 반드시 함께 본다 — 닫히지 않은 따옴표를 만나면 여기서 영원히 돈다.
      while (p < src.length && src[p] !== '"') {
        if (src[p] === "\\") p++;
        p++;
      }
      if (p >= src.length) throw new Error(`${key} 안에 닫히지 않은 문자열이 있습니다`);
    }
  }
  throw new Error(`${key} 의 끝을 찾지 못했습니다`);
}

const mmdd = (iso) => iso.slice(5).replace("-", "-");
const round1 = (n) => Math.round(n * 10) / 10;
/** 미니바용 — 지수가 0.0x 대인 원료가 많아 소수 1자리로 깎으면 막대가 전부 0이 된다. */
const round3 = (n) => Math.round(n * 1000) / 1000;
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const dateAt = (iso, offset) => new Date(Date.parse(`${iso}T00:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10);
const kstToday = () => new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
const weekMonday = (iso) => dateAt(iso, -((new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7));
const daysBetween = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

async function main() {
  log("읽는 중:", PAGE);
  const res = await fetch(PAGE);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  log("페이지", (html.length / 1024 / 1024).toFixed(1) + "MB");

  // 원본 파일명(해시)은 갱신 때마다 바뀐다. 추적용으로 남긴다.
  const refs = [...html.matchAll(/([A-Z0-9_]+_REF)\s*=\s*"([^"]+)"/g)].map(([, k, v]) => `${k}=${BASE}${v}`);
  refs.forEach((r) => log("원본 참조", r));
  const detailFolder = html.match(/(data-[0-9a-f]+)\/ing_[0-9a-f]+\.json/)?.[1] ?? "";
  const refPath = (key) => {
    const match = html.match(new RegExp(`(?:const\\s+)?${key}\\s*=\\s*"([^"]+)"`));
    if (!match) throw new Error(`${key} 포인터가 없습니다`);
    return match[1];
  };
  async function fetchSource(relative) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(new URL(relative, BASE));
        if (!response.ok) {
          if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 2)
            throw new Error(`${relative}: HTTP ${response.status}`);
        } else {
          const bytes = Buffer.from(await response.arrayBuffer());
          return { data: JSON.parse(bytes.toString("utf8")), hash: sha256(bytes) };
        }
      } catch (error) {
        if (attempt === 2 || /HTTP (?!429|50[0234])/.test(String(error))) throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  const { data: PERIOD } = await fetchSource(refPath("PERIOD_SUMMARY_REF"));
  const { data: BROADCAST } = await fetchSource(refPath("BROADCAST_REF"));
  const { data: PUBLIC_CLASS } = await fetchSource(refPath("CLASSIFICATION_REF"));
  if (BROADCAST.version !== "homeshopping_view.v1" || !Array.isArray(BROADCAST.rows) ||
      !Array.isArray(BROADCAST.ingredientStats) || BROADCAST.meta?.timezone !== "Asia/Seoul") {
    throw new Error("홈쇼핑 공개 원본의 행·시간대·형식이 맞지 않습니다");
  }
  const broadcastStart = BROADCAST.meta?.allObserved?.periodStart;
  const broadcastEnd = BROADCAST.meta?.allObserved?.periodEnd;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(broadcastStart ?? "") ||
      !/^\d{4}-\d{2}-\d{2}$/.test(broadcastEnd ?? "")) {
    throw new Error("홈쇼핑 공개 원본의 전체 편성 기간을 확인할 수 없습니다");
  }
  const { data: forecastSource } = await fetchSource(refPath("NEW_FORECAST_REF"));
  const mainRef = refPath("MAIN_SERIES_REF");
  const { data: MAIN_INDEX, hash: indexHash } = await fetchSource(mainRef);
  if (PERIOD.status !== "complete" || PERIOD.source?.zeroFill !== false ||
      PERIOD.source?.indexSha256 !== indexHash || PERIOD.source?.asOf !== MAIN_INDEX.asOf ||
      !Array.isArray(PERIOD.ingredients) || !Array.isArray(MAIN_INDEX.items)) {
    throw new Error("일별 요약·원본 색인 날짜/해시가 맞지 않습니다");
  }
  const asOf = PERIOD.source.asOf;
  const todayKst = kstToday();
  const sourceLagDays = daysBetween(asOf, todayKst);
  if (process.env.VC_PLATFORM_ALERT_TEST === "true") {
    console.warn("::warning::[시험] VC 플랫폼 데이터랩 갱신 중단 메일 알림 경로 점검");
    throw new Error("[시험] Actions 실패 알림을 확인하기 위한 중단 — 기존 공개 사이트는 유지됩니다");
  }
  if (!Number.isFinite(sourceLagDays) || sourceLagDays < 0) throw new Error(`데이터랩 기준일 ${asOf}이 현재 ${todayKst}와 맞지 않습니다`);
  if (sourceLagDays > 2) {
    console.warn(`::warning::데이터랩 일별 관측이 ${sourceLagDays}일 지연됐습니다 (${asOf} → ${todayKst}). 관리자 Actions 메일 알림을 확인하세요.`);
    throw new Error("데이터랩 갱신 중단 — 오래된 자료 배포를 중단합니다");
  }
  if (!Array.isArray(forecastSource.items)) throw new Error("예측 원본 배열이 없습니다");
  const forecastCurrent = forecastSource.asOf === asOf;
  // 일별 검색만 먼저 갱신되면 오래된 예측을 숨기고 나머지 자료는 계속 갱신한다.
  const FORECAST = forecastCurrent ? forecastSource : { ...forecastSource, items: [] };
  if (!forecastCurrent) log(`예측 보류 — 검색 ${asOf}, 예측 ${forecastSource.asOf ?? "미제공"} 기준일 불일치`);
  const periodById = new Map(PERIOD.ingredients.map((row) => [row.id, row]));
  const shardById = new Map(MAIN_INDEX.items.map((row) => [row.id, row]));
  log(`일별 관측 ${asOf} · 관측 원료 ${PERIOD.source.observedIngredients}/${PERIOD.source.ingredientCount}`);

  const DATA = carve(html, "const DATA=[", "[", "]");
  const OBS = carve(html, ", OBS={", "{", "}");
  if (PUBLIC_CLASS.schemaVersion !== "healthfood-classification.a348.v1" ||
      PUBLIC_CLASS.denominator !== DATA.length || !Array.isArray(PUBLIC_CLASS.rows) ||
      PUBLIC_CLASS.rows.length !== DATA.length) {
    throw new Error("데이터랩 공개 분류 파일의 형식·분모가 맞지 않습니다");
  }
  const classById = new Map(PUBLIC_CLASS.rows.map((row) => [row.id, row]));
  if (classById.size !== DATA.length || DATA.some((row) =>
    classById.get(row.id)?.name !== row.name || !classById.get(row.id)?.branch ||
    !classById.get(row.id)?.recognitionStatus)) {
    throw new Error("데이터랩 공개 분류 파일의 원료 ID·이름·표시값이 맞지 않습니다");
  }
  const gradeDisplayById = new Map(PUBLIC_CLASS.rows.map((row) => [row.id, row.recognitionStatus]));
  const classDisplayById = new Map(PUBLIC_CLASS.rows.map((row) => [row.id, row.branch]));
  log(`DATA ${DATA.length}건 · 공개 5칸 분류 ${classById.size}건 · 옛 주간 OBS ${OBS.items.length}건은 순위 계산에 사용하지 않음`);

  /* ── 월 검색량 ── 정확일치·실측 하한만 순위에 쓴다. 결측은 0으로 채우지 않는다. */
  let RANKING = { items: [] };
  try {
    RANKING = carve(html, "RANKING={", "{", "}");
  } catch { throw new Error("검색량 원본 RANKING을 못 읽었습니다"); }
  const rankById = new Map((RANKING.items ?? []).map((x) => [x.id, x]));
  function volumeOf(row) {
    const v = rankById.get(row.id)?.volume;
    if (v?.status === "정확일치" && Number.isFinite(v.lower) && v.lower > 0) return v.lower;
    return null;
  }

  /* ── 최근 연속 7일 / 앞선 7일 ── 빈 날이 있으면 변화를 내지 않는다. */
  function weekly(row) {
    const o = periodById.get(row.id);
    const cur = o?.periods?.find((p) => p.days === 7);
    if (o?.status !== "observed" || o.observedEnd !== asOf || cur?.end !== asOf ||
        cur.missingDays !== 0 || cur.observedDays !== 7 || cur.previousObservedDays !== 7 ||
        !(cur.previousMean > 0) || !Number.isFinite(cur.changeRatePct)) return null;
    return {
      changePct: round1(cur.changeRatePct),
      periodLabel: `최근 7일 ${mmdd(cur.start)}~${mmdd(cur.end)}`,
      observedAt: asOf,
      weeks8: [],
      weeks8Dates: [],
      riseWeeks: null,
      lowBase: cur.previousMean < cur.mean * 0.2,
    };
  }

  /* 공개 5칸 분류의 두 화면 라벨. 플랫폼에서 별도 판정을 하지 않는다. */
  const classGrade = (d) => classById.get(d.id)?.recognitionStatus ?? "";
  const classLabel = (d) => classById.get(d.id)?.branch ?? "";

  /**
   * 지난주 스냅샷 읽기 — 이번 기준일보다 7일 이상 이전인 것 중 가장 최근 것.
   * 없으면 null 이고, 그때는 순위 변동을 아예 내지 않는다(모르는 것을 0 으로 채우지 않는다).
   */
  async function loadPreviousSnapshot(currentObservedAt) {
    let names = [];
    try {
      names = await readdir(HISTORY_DIR);
    } catch {
      return null;
    }
    const cutoff = new Date(currentObservedAt).getTime() - WEEK_MS;
    const found = [];
    for (const n of names.filter((n) => n.startsWith("signals-") && n.endsWith(".json"))) {
      try {
        const snap = JSON.parse(await readFile(path.join(HISTORY_DIR, n), "utf8"));
        if (!snap?.observedAt || snap.basis !== "rolling7" || !Array.isArray(snap.rows)) continue;
        if (new Date(snap.observedAt).getTime() <= cutoff) found.push(snap);
      } catch {
        // 깨진 파일 하나 때문에 빌드를 세우지 않는다.
      }
    }
    found.sort((a, b) => a.observedAt.localeCompare(b.observedAt));
    return found.at(-1) ?? null;
  }

  const href = (row) => `${PAGE}#view=ingredients&id=${row.id}&tab=trend`;
  const searchAsOf = (row) => rankById.get(row.id)?.volume?.date ?? row.q?.asOf?.["검색"] ?? "";

  /** DATA 한 줄 → Signal. 주간 관측이 없으면 변화율 자리를 비운 채로 낸다(0 으로 꾸미지 않는다). */
  function toSignal(row, tabs) {
    const w = weekly(row);
    return {
      id: row.id,
      name: row.name,
      category: classLabel(row),
      functionCategory: classGrade(row) === "고시형" ? classById.get(row.id)?.functionCategory ?? "" : "",
      monthlyVolume: volumeOf(row),
      volumeExact: rankById.get(row.id)?.volume?.exact === true,
      volumeDate: searchAsOf(row),
      changePct: w ? w.changePct : 0,
      changeStatus: w ? "관측" : "미제공",
      periodLabel: w ? w.periodLabel : "주간 비교 미제공",
      observedAt: w ? w.observedAt : periodById.get(row.id)?.observedEnd ?? "",
      source: SOURCE,
      href: href(row),
      grade: classGrade(row),
      distribution: row.dist || "",
      verdict: row.verdict || "",
      season: row.season || "",
      seasonMonth: row.seasonMonth || "",
      weeks8: w?.weeks8 ?? [],
      weeks8Dates: w?.weeks8Dates ?? [],
      riseWeeks: w?.riseWeeks ?? null,
      lowBase: w?.lowBase ?? false,
      tabs,
    };
  }

  const ingredients = DATA.filter((d) => d.role === "원료");
  const usable = ingredients.filter((d) => d.trust === "쓸만함");
  // 데이터랩 첫 화면의 식품 검색어 목록을 데이터로 읽는다. 판정 함수가 바뀌면 배포를 멈춘다.
  const homeFoodLiteral = html.match(/const HOME_FOOD_NAMES=new Set\(\[([^\]]*)\]\)/)?.[1];
  const homeFoodRule = html.match(/function isHomeFood\(d\)\{[^{}]+\}/)?.[0];
  if (!homeFoodLiteral || !/^\s*'[^']+'(?:\s*,\s*'[^']+')*\s*$/.test(homeFoodLiteral) ||
      !homeFoodRule || sha256(Buffer.from(homeFoodRule)) !== "e2564c4ba9b59b73372b9e9f17dac7d275a9a1617b2b57513b43c08eb607e793") {
    throw new Error("데이터랩 첫 화면 식품 검색어 분리 규칙이 바뀌었습니다");
  }
  const homeFoodNames = new Set([...homeFoodLiteral.matchAll(/'([^']+)'/g)].map((match) => match[1]));
  // 현재 공개 데이터랩은 치아씨드를 원료로 두지만 대표님은 홈 순위 제외를 직접 지시했다.
  homeFoodNames.add("치아씨드");
  const homeIngredient = (d) => d.role !== "일반 식재료" && !homeFoodNames.has(d.name);
  const articleEligibleIds = new Set(usable.filter(homeIngredient).map((row) => row.id));

  /* ── ① 오늘의 신호 (signals.json) ── 오른 원료 중 월 검색량이 큰 순서.
     퍼센트로 줄을 세우면 월 1,150회짜리가 1위로 올라온다 — 절대량이 먼저다. */
  const signals = usable
    .filter((d) => homeIngredient(d) && volumeOf(d) >= SIGNAL_MIN_VOLUME && (weekly(d)?.changePct ?? 0) > 0)
    .sort((a, b) => volumeOf(b) - volumeOf(a) || weekly(b).changePct - weekly(a).changePct)
    .slice(0, 20)
    .map((d) => toSignal(d, []));

  /* ── 순위 변동 ── 지난주 스냅샷의 순위를 그대로 쓴다.
     같은 주 안에서 여러 번 돌려도 값이 흔들리지 않고, 검색량이 바뀐 것도 반영된다. */
  const previous = await loadPreviousSnapshot(asOf);
  if (previous) {
    const prevRank = new Map(previous.rows.map((r, i) => [r.id, i + 1]));
    signals.forEach((r, i) => {
      const before = prevRank.get(r.id);
      if (before == null) r.isNew = true;
      else {
        r.isNew = false;
        r.rankDelta = before - (i + 1);
      }
    });
    log(`지난주 스냅샷 ${previous.observedAt} (${previous.rows.length}행) 기준으로 순위 변동을 냈습니다.`);
  } else {
    log("지난주 스냅샷이 없습니다 — 순위 변동(rankDelta·isNew)은 이번 회차에 내지 않습니다.");
  }

  /* ── ② 주간 급상승 탭 ── 여기는 변화율 순으로 둔다(무엇이 움직였나를 보는 자리).
     기저가 낮아 퍼센트가 튄 줄에는 lowBase 표시가 붙는다. */
  const risers = usable
    .filter((d) => volumeOf(d) >= MIN_VOLUME && weekly(d))
    .sort((a, b) => weekly(b).changePct - weekly(a).changePct)
    .slice(0, 20)
    .map((d) => toSignal(d, ["weekly"]));

  /* ── ③ 계절·예측 ── 데이터랩이 「계절반복」으로 판정했거나 2주 예측 조건을 통과한 원료. */
  const seasonal = usable.filter((d) => d.season === "계절반복");
  const forecastIds = new Set(FORECAST.items.filter((row) => row.status === "calculated" &&
    row.forecasts?.some((forecast) => forecast.horizon_weeks === 2 && forecast.platform_eligible === true))
    .map((row) => row.id));
  const forecastable = usable.filter((d) => forecastIds.has(d.id));
  const isoReportDate = (value) => /^\d{8}$/.test(String(value ?? ""))
    ? `${String(value).slice(0, 4)}-${String(value).slice(4, 6)}-${String(value).slice(6)}` : null;
  const extraBase = (row, kind) => ({
    kind, id: row.id, name: row.name, href: href(row), role: row.role,
    grade: classGrade(row), category: classLabel(row), trust: row.trust,
  });
  const broadcastStatsById = new Map(BROADCAST.ingredientStats.map((row) => [row.ingredientId, row]));
  const channelSlotsById = new Map();
  for (const item of BROADCAST.rows) {
    if (!item.countEligible || !item.slotKey || !item.channel) continue;
    for (const id of new Set(item.ingredientIds ?? [])) {
      if (!channelSlotsById.has(id)) channelSlotsById.set(id, new Map());
      const channels = channelSlotsById.get(id);
      if (!channels.has(item.channel)) channels.set(item.channel, new Set());
      channels.get(item.channel).add(item.slotKey);
    }
  }
  const topChannelOf = (id) => [...(channelSlotsById.get(id) ?? [])]
    .sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0], "ko"))[0]?.[0] ?? null;
  const broadcastRows = DATA.flatMap((row) => {
    const stat = broadcastStatsById.get(row.id)?.allObserved;
    if (!(stat?.slotCount > 0)) return [];
    return [{ ...extraBase(row, "broadcast"), count: stat.slotCount,
      channel: topChannelOf(row.id),
      periodStart: stat.periodStart ?? broadcastStart, periodEnd: stat.periodEnd ?? broadcastEnd }];
  }).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ko"));
  const rawReportRows = DATA.filter((row) => row.r365 > 0).map((row) => {
    // 새 상세 파일은 옛 r365를 싣지 않는다. 기존 경고가 붙은 탭은 DATA의 옛 집계만 유지한다.
    // 새 REPORT_LINKS_REF의 C003/보류 분리 수치는 별도 검증 전까지 글 틀에 넣지 않는다.
    return { ...extraBase(row, "report"), count: row.r365,
      companies: String(row.rFirm || "").split(/\s+\/\s+/).filter(Boolean).slice(0, 3),
      asOf: isoReportDate(row.rAsOf), periodStart: null };
  }).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ko"));
  /* 신고번호가 공개되지 않았다. 집계값·상위 업체가 같고 이름까지 닮은 행만 화면상 한 묶음으로 표시한다.
     수치는 더하지 않으며 원료별 원본 링크를 모두 보존한다. 실제 동일 신고 판정은 하지 않는다. */
  const simpleName = (name) => name.replace(/[\s·,()]/g, "").toLowerCase();
  const relatedNames = (a, b) => {
    const x = simpleName(a), y = simpleName(b);
    if (x.includes(y) || y.includes(x)) return true;
    for (let i = 0; i <= x.length - 3; i++) if (y.includes(x.slice(i, i + 3))) return true;
    return false;
  };
  const sameAggregate = new Map();
  for (const row of rawReportRows) {
    if (row.count < 30 || !row.companies.length) continue;
    const key = `${row.count}|${row.companies.join("|")}`;
    if (!sameAggregate.has(key)) sameAggregate.set(key, []);
    sameAggregate.get(key).push(row);
  }
  const grouped = new Set();
  const reportRows = [];
  for (const row of rawReportRows) {
    if (grouped.has(row.id)) continue;
    const key = `${row.count}|${row.companies.join("|")}`;
    const pool = sameAggregate.get(key) ?? [row];
    const family = [row];
    for (let i = 0; i < family.length; i++) {
      for (const other of pool) {
        if (!family.includes(other) && relatedNames(family[i].name, other.name)) family.push(other);
      }
    }
    family.forEach((item) => grouped.add(item.id));
    family.sort((a, b) => simpleName(a.name).length - simpleName(b.name).length || a.name.localeCompare(b.name, "ko"));
    reportRows.push({ ...family[0], aliases: family.slice(1).map((item) => ({ id: item.id, name: item.name, href: item.href })) });
  }
  const seasonRows = DATA.filter((row) => row.season === "계절반복").map((row) => ({
    ...extraBase(row, "season"), peakMonth: row.seasonMonth || null,
    asOf: row.spEnd || row.q?.asOf?.["검색"] || null,
  })).sort((a, b) => a.name.localeCompare(b.name, "ko"));
  const forecastRows = FORECAST.items.flatMap((source) => {
    const forecast = source.forecasts?.find((item) => item.horizon_weeks === 2 && item.platform_eligible === true);
    if (!forecast) return [];
    const row = DATA.find((item) => item.id === source.id);
    if (!row || !Number.isFinite(forecast.point)) throw new Error(`${source.id} 2주 예측 원료·수치 불일치`);
    return [{ ...extraBase(row, "forecast"), point: round3(forecast.point),
      unit: forecast.unit, asOf: FORECAST.asOf,
      targetStart: forecast.target_start, targetEnd: forecast.target_end,
      businessApproved: forecast.business_approved === true }];
  });
  const lactate = DATA.find((row) => row.name === "젖산마그네슘");
  const lactateWeek = lactate && weekly(lactate);
  // 업체 실명은 공개 산출물에 넣지 않는다. 내부 중복 묶음 계산에만 사용한다.
  const publicReportRows = reportRows.map((row) => { const copy = { ...row }; delete copy.companies; return copy; });
  const extraRows = [...broadcastRows, ...publicReportRows, ...seasonRows, ...forecastRows];
  log(`동향 추가: 방송 ${broadcastRows.length} · 제조보고 원본 ${rawReportRows.length}/표시 묶음 ${reportRows.length} · 계절 ${seasonRows.length} · 최신 2주 예측 ${forecastRows.length}`);
  const trendRows = [...new Set([...seasonal, ...forecastable])].filter((d) => volumeOf(d) != null)
    .sort((a, b) => volumeOf(b) - volumeOf(a))
    .slice(0, 16)
    .map((d) => toSignal(d, ["trend"]));

  /* ── ④ 표시·안전 ── 기능성 표시가 제한되는 지위인데 검색은 많은 원료 + 의약품 성분. */
  // 지위는 CLASSIFICATION 이 덮어쓴 값(classGrade)으로 본다 — 화면에 찍히는 값과 같아야 한다.
  const unapproved = usable
    .filter((d) => homeIngredient(d) && gradeDisplayById.get(d.id) === "비인정" && volumeOf(d) >= MIN_VOLUME)
    .sort((a, b) => volumeOf(b) - volumeOf(a))
    .slice(0, 12);
  const medicinal = DATA.filter((d) => classGrade(d) === "의약품")
    .filter((d) => volumeOf(d) != null)
    .sort((a, b) => volumeOf(b) - volumeOf(a))
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
    .filter((d) => volumeOf(d) != null)
    .sort((a, b) => volumeOf(b) - volumeOf(a))
    .slice(0, 100)
    .map((d) => tagged.get(d.id) ?? toSignal(d, []));
  // 상위 100 밖이지만 탭에 걸린 줄은 뒤에 붙인다 — 화면이 두 파일을 합치지 않아도 되게.
  for (const s of tagged.values()) if (!top100.some((t) => t.id === s.id)) top100.push(s);

  /* 선택된 원료의 실제 일별 원본으로만 8주 차트를 만든다. 56일 중 하나라도 빠지면 비워 둔다. */
  const selected = new Map(DATA.map((row) => {
    const ready = tagged.get(row.id) ?? toSignal(row, []);
    return [ready.id, ready];
  }));
  const seriesById = new Map();
  const selectedIds = [...selected.keys()];
  for (let start = 0; start < selectedIds.length; start += 10) {
    await Promise.all(selectedIds.slice(start, start + 10).map(async (id) => {
      const shard = shardById.get(id);
      if (shard?.status !== "observed" || !shard.file || shard.observedEnd !== asOf) return;
      const { data, hash } = await fetchSource(`${mainRef.slice(0, mainRef.lastIndexOf("/") + 1)}${shard.file}`);
      if (hash !== shard.sha256 || data.asOf !== asOf) throw new Error(`${id} 일별 원본 해시/날짜 불일치`);
      const row = data.series?.find((x) => x.id === id);
      if (!row || !Array.isArray(row.daily)) throw new Error(`${id} 일별 원본 ID 불일치`);
      const byDate = new Map(row.daily.map((point) => [point.date, point.index]));
      const weeks = [];
      const dates = [];
      for (let week = 7; week >= 0; week--) {
        const end = dateAt(asOf, -7 * week);
        const begin = dateAt(end, -6);
        const values = Array.from({ length: 7 }, (_, day) => byDate.get(dateAt(begin, day)));
        if (values.some((value) => !Number.isFinite(value))) return;
        weeks.push(values.reduce((sum, value) => sum + value, 0) / 7);
        dates.push({ start: begin, end });
      }
      const latestMean = periodById.get(id)?.periods?.find((p) => p.days === 7)?.mean;
      if (Number.isFinite(latestMean) && Math.abs(weeks.at(-1) - latestMean) > 0.001) {
        throw new Error(`${id} 7일 평균과 일별 원본 불일치`);
      }
      seriesById.set(id, { weeks8: weeks.map(round3), weeks8Dates: dates,
        riseWeeks: weeks.slice(1).filter((value, i) => value > weeks[i]).length,
        lowBase: weeks.at(-2) < Math.max(...weeks) * 0.2 });
    }));
  }
  for (const row of [...signals, ...risers, ...trendRows, ...safetyRows, ...top100, ...selected.values()]) {
    const chart = seriesById.get(row.id);
    if (chart) Object.assign(row, chart);
  }
  if (!signals.length || !risers.length || !seriesById.has(signals[0].id)) {
    throw new Error("최신 관측일의 상승 원료·8주 차트를 만들 수 없습니다");
  }

  /* ── 플랫폼 원료 상세 ── 화면에서 실제로 고를 수 있는 원료만 한 장씩 만든다.
     제형은 데이터랩 공개 JSON에 현재 제조 가능 여부가 없으므로 추정하지 않는다. */
  const detailRows = [...selected.values()].map((row) => {
    const source = DATA.find((item) => item.id === row.id);
    const broadcastStat = broadcastStatsById.get(row.id)?.allObserved;
    // 상세 파일의 sp는 최근 12주다. 달력 월별 계절 지수에는 기간 요약 monthly만 쓴다.
    const monthly = periodById.get(row.id)?.monthly;
    const calendarMonths = Array.isArray(monthly) && monthly.length === 12
      ? [...monthly].sort((a, b) => a.month - b.month) : [];
    const seasonalMonths = calendarMonths.length === 12 && calendarMonths.some((item) => Number.isFinite(item.mean))
      ? calendarMonths.map((item) => Number.isFinite(item.mean)
        ? item.mean > 0 && item.mean < .0005 ? item.mean : round3(item.mean)
        : null) : [];
    const highestMonth = seasonalMonths.some((value) => value != null && value > 0)
      ? seasonalMonths.reduce((best, value, index) =>
        value != null && (best == null || value > seasonalMonths[best]) ? index : best, null)
      : null;
    const observedMonths = calendarMonths.filter((item) => Number.isFinite(item.mean));
    const reportDate = isoReportDate(source?.rAsOf);
    return {
      ...row,
      category: classDisplayById.get(row.id),
      gradeDisplay: gradeDisplayById.get(row.id),
      classificationNeedsReview: String(classById.get(row.id)?.old?.displayClassification ?? "").includes("규격 확인 필요"),
      seasonalMonths,
      seasonalPeakMonth: highestMonth == null ? null : highestMonth + 1,
      seasonalAsOf: seasonalMonths.length ? asOf : null,
      seasonalPeriodStart: observedMonths.length ? observedMonths.map((item) => item.actualStart).sort()[0] : null,
      seasonalPeriodEnd: observedMonths.length ? observedMonths.map((item) => item.actualEnd).sort().at(-1) : null,
      reportCount: source?.r365 > 0 ? source.r365 : null,
      reportAsOf: source?.r365 > 0 ? reportDate : null,
      reportPeriodStart: null,
      broadcastCount: broadcastStat?.slotCount > 0 ? broadcastStat.slotCount : null,
      broadcastPeriodStart: broadcastStat?.slotCount > 0 ? broadcastStat.periodStart ?? broadcastStart : null,
      broadcastPeriodEnd: broadcastStat?.slotCount > 0 ? broadcastStat.periodEnd ?? broadcastEnd : null,
      broadcastTopChannel: broadcastStat?.slotCount > 0 ? topChannelOf(row.id) : null,
      availableDosageForms: [],
      dosageFormStatus: "미확인",
    };
  }).sort((a, b) => (b.monthlyVolume ?? -1) - (a.monthlyVolume ?? -1) || a.name.localeCompare(b.name, "ko"));

  /* ── 인사이트 카드 ── 값은 전부 위에서 뽑은 실값이다. 문장은 관측을 말할 뿐 효능을 말하지 않는다. */
  const weekLabel = risers[0]?.periodLabel ?? `최근 7일 ~${asOf}`;
  const num = (n) => n.toLocaleString("ko-KR");
  const pct = (n) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
  const names = (arr, n = 3) => arr.slice(0, n).map((x) => x.name).join(" · ");

  const persistent = [...risers].sort((a, b) => (b.riseWeeks ?? 0) - (a.riseWeeks ?? 0));
  const forecastArticle = forecastable.filter(homeIngredient)
    .sort((a, b) => volumeOf(b) - volumeOf(a));
  const nextMonth = Number(todayKst.slice(5, 7)) % 12 + 1;
  const endOfThisMonth = new Date(Date.UTC(Number(todayKst.slice(0, 4)), Number(todayKst.slice(5, 7)), 0)).toISOString().slice(0, 10);
  const nextSeasonal = detailRows.filter((row) => articleEligibleIds.has(row.id) && row.season === "계절반복" &&
    row.seasonalPeakMonth === nextMonth && row.monthlyVolume != null)
    .sort((a, b) => b.monthlyVolume - a.monthlyVolume);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(BROADCAST.meta?.asOfDate ?? "") ||
      BROADCAST.meta?.timezone !== "Asia/Seoul" || !Array.isArray(BROADCAST.rows)) {
    throw new Error("홈쇼핑 방송 원본의 날짜·시간대·행을 확인할 수 없습니다");
  }
  const broadcastAsOf = BROADCAST.meta.asOfDate;
  if (broadcastAsOf > todayKst) throw new Error(`홈쇼핑 자료 기준일 ${broadcastAsOf}이 현재 ${todayKst}보다 미래입니다`);
  const broadcastMonday = weekMonday(broadcastAsOf);
  const broadcastSlots = new Map();
  for (const item of BROADCAST.rows) {
    if (item.date < broadcastMonday || item.date > broadcastAsOf || item.countEligible !== true ||
        item.scheduleFreshness !== "live_observed_at_capture" || !item.slotKey) continue;
    for (const id of new Set(item.ingredientIds ?? [])) {
      if (!broadcastSlots.has(id)) broadcastSlots.set(id, new Set());
      broadcastSlots.get(id).add(item.slotKey);
    }
  }
  const broadcastWeek = [...broadcastSlots].map(([id, slots]) => ({
    row: DATA.find((item) => item.id === id), count: slots.size,
  })).filter((item) => item.row && articleEligibleIds.has(item.row.id) && item.count > 0)
    .sort((a, b) => b.count - a.count || (volumeOf(b.row) ?? 0) - (volumeOf(a.row) ?? 0) ||
      a.row.name.localeCompare(b.row.name, "ko"));
  log(`이번 주 확인 편성 ${broadcastMonday}~${broadcastAsOf} · 원료명 연결 ${broadcastWeek.length}종 · 최다 ${broadcastWeek[0]?.row.name ?? "없음"} ${broadcastWeek[0]?.count ?? 0}회`);
  const insights = [
    {
      id: "dl-weekly-top",
      tab: "weekly",
      // 대표 카드는 절대량 1위다 — 퍼센트가 아니라 사람이 실제로 많이 찾는 원료를 먼저 본다.
      title: `지금 가장 많이 찾는 상승 원료는 ${signals[0].name}입니다`,
      summary: `${weekLabel} 기준 ${signals[0].name}의 월 검색량은 ${signals[0].volumeExact ? "" : "최소 "}${num(signals[0].monthlyVolume)}회이고, 앞선 7일보다 ${pct(signals[0].changePct)} 움직였습니다.`,
      body: `오른 원료 중 검색 규모가 큰 순서로 ${names(signals, 3)}입니다. 상승률만으로 줄을 세우면 월 몇천 회짜리 원료가 앞자리를 차지해 기획에 쓰기 어렵습니다. 그래서 이 카드는 월 ${num(SIGNAL_MIN_VOLUME)}회 이상인 원료를 검색량 순으로 봅니다. 아래 표는 반대로 변화율 순이라 무엇이 움직였는지를 봅니다.`,
      source: SOURCE,
      publishedAt: asOf,
    },
    {
      id: "dl-weekly-persistent",
      tab: "weekly",
      title: `8주 중 ${persistent[0].riseWeeks}주를 오른 ${persistent[0].name}`,
      summary: `앞선 7일보다 오른 횟수가 가장 잦은 원료는 ${names(persistent, 3)}입니다. 한 구간 급등과 달리 흐름이 이어지는 쪽입니다.`,
      body: `최근 연속 7일 구간 8개에서 바로 앞 구간보다 오른 횟수를 셌습니다. 구간은 서로 겹치지 않습니다. 한 번에 크게 뛴 원료는 이후 되돌아올 수 있으니 두 값을 같이 보셔야 합니다.`,
      source: SOURCE,
      publishedAt: asOf,
    },
    {
      id: "dl-weekly-spike",
      tab: "weekly",
      title: `변화율 1위는 ${risers[0].name}입니다${risers[0].lowBase ? " — 기저가 낮습니다" : ""}`,
      summary: `${risers[0].name}의 검색이 앞선 7일보다 ${pct(risers[0].changePct)} 움직였습니다. 월 검색량은 ${risers[0].volumeExact ? "" : "최소 "}${num(risers[0].monthlyVolume)}회입니다.${risers[0].lowBase ? " 앞선 7일 값이 매우 낮아 퍼센트가 크게 튄 경우라 참고값으로만 보십시오." : ""}`,
      body: `변화율 상위 5종은 ${names(risers, 5)}입니다. 앞선 구간이 8주 최고의 20%에도 못 미치는 줄에는 기저가 낮다고 표시합니다. 8주 막대로 흐름이 이어지는지 먼저 보시기 바랍니다.`,
      source: SOURCE,
      publishedAt: asOf,
    },
    ...(broadcastWeek[0] ? [{
      id: "dl-broadcast-week",
      tab: "broadcast",
      title: `이번 주 확인된 홈쇼핑 편성 연결 최다 — ${broadcastWeek[0].row.name}`,
      summary: `${broadcastMonday}~${broadcastAsOf} 확인 편성에서 ${broadcastWeek[0].row.name} 원료명에 연결된 방송 슬롯은 ${broadcastWeek[0].count}회입니다. 판매량이나 실제 배합 확인은 아닙니다.`,
      body: `상품명에 연결된 원료명을 기준으로 같은 채널·시작시각의 상품 옵션은 한 번만 셌습니다. 아직 방송 전인 예정 편성과 오래된 보존 편성은 이번 집계에서 제외했습니다.`,
      source: SOURCE,
      publishedAt: broadcastAsOf,
      homeValidThrough: dateAt(broadcastMonday, 6),
    }] : []),
    ...(nextSeasonal.length ? [{
      id: "dl-trend-next-season",
      tab: "trend",
      title: `다음 달 ${nextMonth}월이 월평균 최고인 원료 — ${nextSeasonal[0].name} 등 ${nextSeasonal.length}종`,
      summary: `계절반복 판정 원료 중 월평균 최고가 달력 ${nextMonth}월인 원료는 ${nextSeasonal.length}종입니다. 월 검색량 순 첫 원료는 ${nextSeasonal[0].name}(${nextSeasonal[0].volumeExact ? "" : "최소 "}${num(nextSeasonal[0].monthlyVolume)}회)입니다.`,
      body: `달력 월별 지수는 여러 해의 같은 달 관측을 평균한 값입니다. 이 과거 흐름이 다음 달에도 반복된다는 예측이나 제품 적합성 판정은 아닙니다.`,
      source: SOURCE,
      publishedAt: asOf,
      homeValidThrough: endOfThisMonth,
    }] : []),
    ...(forecastCurrent && forecastArticle.length ? [{
      id: "dl-trend-forecast",
      tab: "trend",
      title: `2주 예측 원본 ${forecastIds.size}종 · 플랫폼 표시 ${forecastArticle.length}종`,
      summary: `데이터랩의 2주 예측 통계 조건 통과는 ${forecastIds.size}종이고, 이 플랫폼의 원료 표시 범위에는 ${forecastArticle.length}종입니다. 월 검색량 순으로 보면 ${names(forecastArticle, 3)} 등이 있습니다.`,
      body: `통계 조건을 통과해도 실제 제품 기획에 적합하다는 뜻은 아닙니다. 예측은 데이터랩 원본의 결과이며 이 플랫폼은 따로 계산하지 않습니다.`,
      source: SOURCE,
      publishedAt: FORECAST.asOf,
    }] : []),
    {
      id: "dl-safety-unapproved",
      tab: "safety",
      title: `데이터랩 공개 분류가 비인정으로 표시한 원료 ${unapproved.length}종`,
      summary: `${names(unapproved, 3)} 등은 데이터랩 공개 분류에서 비인정으로 표시됩니다. 이 표시만으로 식품 사용·기능성 표시 가능 여부를 단정하지 않습니다.`,
      body: `월 검색량은 관심 참고값입니다. 실제 제품에 사용할 원료의 규격·국내 인정 상태·표시 문구는 각각 확인해야 합니다.`,
      source: SOURCE,
      publishedAt: PUBLIC_CLASS.asOf,
    },
    {
      id: "dl-safety-medicinal",
      tab: "safety",
      title: `식품에 쓸 수 없는 성분도 같이 검색됩니다`,
      summary: `${names(medicinal, 3)} 등 의약품 성분이 원료 검색어와 함께 잡힙니다. 참고로만 두고 제품 기획에는 넣지 않습니다.`,
      body: `검색량이 크다고 해서 식품 원료로 쓸 수 있다는 뜻이 아닙니다. 데이터랩은 이런 항목을 의약품(참고)으로 따로 표시해 둡니다. 이 화면도 같은 표시를 그대로 달아 둡니다.`,
      source: SOURCE,
      publishedAt: PUBLIC_CLASS.asOf,
    },
    {
      id: "dl-safety-notes",
      tab: "safety",
      title: `이 숫자를 읽을 때 같이 봐야 하는 것`,
      summary: `월 검색량은 참고값입니다. 정확한 산정 기간이 제공되지 않고, 원료 간 시장 규모를 뜻하지도 않습니다.`,
      body: `변화율은 ${weekLabel}의 일평균을 앞선 7일과 견준 값입니다. 빠진 날짜가 있거나 앞선 값이 0이면 변화율을 내지 않습니다. 월 검색량이 범위로 제공되면 확인된 최소값만 표시합니다. 원자료는 ${OBS.rawSource}이며, 자세한 관측일수와 품질 표시는 데이터랩 화면에서 확인하실 수 있습니다.`,
      source: SOURCE,
      publishedAt: asOf,
    },
  ];

  const meta = {
    generatedAt: new Date().toISOString(),
    observedAt: asOf,
    sourceDate: asOf,
    sourceIndexSha256: indexHash,
    observedIngredients: PERIOD.source.observedIngredients,
    totalIngredients: PERIOD.source.ingredientCount,
    source: SOURCE,
    sourcePage: PAGE,
    rawSource: OBS.rawSource,
    catalogCount: DATA.length,
    historyYears: (() => {
      // 가장 이른 관측 시작일로 햇수를 센다. "10년"을 손으로 적어 두면 해가 바뀌어도 그대로 남는다.
      const starts = DATA.map((d) => d.obs0).filter(Boolean).sort();
      if (!starts.length) return undefined;
      return Math.max(1, new Date(asOf).getFullYear() - new Date(starts[0]).getFullYear());
    })(),
    minVolume: MIN_VOLUME,
    signalMinVolume: SIGNAL_MIN_VOLUME,
    note: "월 검색량은 정확 산정기간이 미제공이고 범위값은 최소치만 표시 · 일별 관심도는 최신 관측 7일/앞선 7일 · 시장 규모를 뜻하지 않습니다",
  };

  await mkdir(OUT_DIR, { recursive: true });
  const files = [
    ["signals.json", { meta, rows: signals }],
    ["insights.json", { meta, rows: insights }],
    ["ingredients-top.json", { meta, rows: top100 }],
    ["ingredient-details.json", { meta, rows: detailRows }],
    ["insight-extra.json", { meta: {
      ...meta, detailFolder, broadcastStart, broadcastEnd,
      reportStart: null, reportStartStatus: "미확인",
      reportAsOf: rawReportRows[0]?.asOf ?? null,
      reportRawCount: rawReportRows.length,
      reportDisplayCount: reportRows.length,
      forecastAsOf: forecastSource.asOf ?? "미제공",
      forecastCurrent,
      lactateHomeExclusion: lactateWeek?.changePct < 0
        ? { name: lactate.name, changePct: lactateWeek.changePct, observedAt: asOf,
            reason: "홈 TOP10은 최근 7일 상승 원료만 포함" } : null,
    }, rows: extraRows }],
  ];
  for (const [name, payload] of files) {
    const file = path.join(OUT_DIR, name);
    await writeFile(file, JSON.stringify(payload));
    const kb = (await stat(file)).size / 1024;
    log(`생성 ${name} — ${payload.rows.length}건 · ${kb.toFixed(1)}KB${kb > 300 ? "  ⚠️ 300KB 초과" : ""}`);
  }

  /* ── 이번 관측일 스냅샷 남기기 ──
     파일 이름의 날짜는 실행일이 아니라 **자료의 실제 관측일**이다.
     그래야 같은 자료로 여러 번(매일 cron) 돌아도 파일이 하나만 쌓이고,
     "7일 이상 이전" 비교가 정확해진다. 같은 주면 같은 파일을 덮어쓴다. */
  await mkdir(HISTORY_DIR, { recursive: true });
  const snapFile = path.join(HISTORY_DIR, `signals-${asOf}.json`);
  // ⚠️ 실행 시각을 넣지 않는다. 내용이 같으면 바이트도 같아야 워크플로가 헛커밋을 하지 않는다.
  //    키 순서도 고정하고 2칸 들여쓰기로 박아 둔다(diff 를 사람이 읽을 수 있게).
  await writeFile(
    snapFile,
    JSON.stringify(
      {
          observedAt: asOf,
          basis: "rolling7",
        source: SOURCE,
        rows: signals.map((r) => ({
          id: r.id,
          name: r.name,
          monthlyVolume: r.monthlyVolume,
          changePct: r.changePct,
        })),
      },
      null,
      2,
    ) + "\n",
  );
  log(`스냅샷 history/signals-${asOf}.json — ${signals.length}행 · ${((await stat(snapFile)).size / 1024).toFixed(1)}KB`);

  // 검산 — 지시받은 대조값이 그대로 나오는지 본다.
  const check = ingredients.find((d) => d.name === "젖산마그네슘");
  if (check) {
    const w = weekly(check);
    log(`검산 젖산마그네슘 — 월 검색량 ${volumeOf(check) == null ? "미제공" : `${num(volumeOf(check))}회`} · ${w ? `${pct(w.changePct)} (${w.periodLabel})` : "7일 비교 미제공"}`);
  }
  log(`검산 오늘의 신호 상위 3 — ${signals.slice(0, 3).map((r, i) => `${i + 1}위 ${r.name} ${num(r.monthlyVolume)}회 ${pct(r.changePct)}`).join(" · ")}`);
  log(
    `검산 순위 변동 상위 5 — ${signals
      .slice(0, 5)
      .map((r, i) => `${r.name} ${i + 1}위/${r.isNew ? "NEW" : r.rankDelta != null ? (r.rankDelta > 0 ? `▲${r.rankDelta}` : r.rankDelta < 0 ? `▼${-r.rankDelta}` : "제자리") : "미판정"}`)
      .join(" · ")}`,
  );
  for (const nm of ["글루타치온", "병아리콩", "모링가"]) {
    const d = ingredients.find((x) => x.name === nm);
    if (d) log(`검산 ${nm} — 화면값 ${volumeOf(d) == null ? "미제공" : `${num(volumeOf(d))}회`} (갱신 전 DATA.search ${num(d.search ?? 0)}회)`);
  }
  log(`검산 급상승 탭 1위 — ${risers[0].name} ${num(risers[0].monthlyVolume)}회 ${pct(risers[0].changePct)}${risers[0].lowBase ? " (기저 낮음 표시)" : ""}`);
}

main().catch((e) => {
  console.error("[build-datalab] 실패 —", e.message);
  process.exitCode = 1;
});
