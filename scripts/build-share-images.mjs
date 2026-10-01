/**
 * Vita Core Platform 공유 미리보기 이미지 생성기.
 *
 * 실행:
 *   node scripts/build-share-images.mjs
 *
 * 입력:
 *   public/data/ingredient-details.json
 *   public/branding/vita-core-platform-horizontal.svg
 *
 * 출력:
 *   public/og/home.png
 *   public/og/<원료 id>.png
 *   public/og/page-<일반 페이지>.png
 */

import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const WIDTH = 1200;
const HEIGHT = 630;
const ROOT = process.cwd();
const DATA_PATH = path.join(ROOT, "public", "data", "ingredient-details.json");
const LOGO_PATH = path.join(ROOT, "public", "branding", "vita-core-platform-horizontal.svg");
const OUT_DIR = path.join(ROOT, "public", "og");

const COLORS = {
  paper: "#F5F3EE",
  paperAlt: "#ECE9E1",
  ink: "#1B1B1A",
  muted: "#6B6864",
  rule: "#D8D4CB",
  green: "#1E3932",
  orange: "#C2410C",
  orangeSoft: "#FBE3D6",
};

const FONT = "Pretendard, 'Apple SD Gothic Neo', 'Noto Sans KR', Inter, sans-serif";
const numberFormat = new Intl.NumberFormat("ko-KR");
const GENERAL_PAGES = [
  ["page-insight", "원료 검색 동향"],
  ["page-faq", "자주 묻는 질문"],
  ["page-match", "제조사 상담"],
  ["page-manufacturer-apply", "제조사 입점 신청"],
  ["page-quote", "직접 견적 입력"],
  ["page-quote-ai", "AI 견적·간편 문의"],
  ["page-ingredient", "원료 상세"],
  ["page-login", "로그인"],
  ["page-signup", "회원가입"],
  ["page-profile", "고객 정보"],
  ["page-deal", "거래관리"],
  ["page-privacy", "개인정보 처리방침"],
  ["page-admin", "관리자"],
  ["page-admin-manufacturers", "제조사 관리"],
  ["page-admin-ingredients", "원료 관리"],
  ["page-admin-quotes", "견적 접수 관리"],
  ["page-admin-inquiries", "문의·입점 접수 관리"],
];

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function splitName(name) {
  const chars = [...name];
  const maxLines = 3;
  const target = chars.length > 48 ? 22 : chars.length > 30 ? 19 : 16;
  const lines = [];
  let rest = name.trim();

  while (rest && lines.length < maxLines) {
    if ([...rest].length <= target || lines.length === maxLines - 1) {
      lines.push(rest);
      break;
    }

    const points = [...rest];
    let cut = target;
    for (let i = target; i >= Math.max(8, target - 7); i--) {
      if (/\s|[·,/()]/u.test(points[i] ?? "")) {
        cut = i + 1;
        break;
      }
    }
    lines.push(points.slice(0, cut).join("").trim());
    rest = points.slice(cut).join("").trim();
  }

  return lines;
}

function titleSize(name, lines) {
  const longest = Math.max(...lines.map((line) => [...line].length));
  if (name.length > 55 || longest > 25) return 47;
  if (name.length > 36 || longest > 20) return 55;
  return 66;
}

function monthlyVolumeLabel(row) {
  const rawStatus = String(row.monthlyVolumeStatus ?? "").toLowerCase();
  const isPrivate = /비공개|private|hidden|suppressed/.test(rawStatus);
  const isMissing = /미제공|결측|missing|not[_ -]?provided|unavailable/.test(rawStatus);
  const hasValue = Number.isFinite(row.monthlyVolume) && row.monthlyVolume >= 0;

  if (isPrivate) return "비공개";
  if (isMissing || !hasValue) return "미제공";
  if (row.monthlyVolume === 0 && row.volumeExact !== true) return "비공개";

  const exact = row.monthlyVolumeStatus
    ? /^(exact|정확|확정)$/u.test(rawStatus)
    : row.volumeExact === true;
  const value = `${numberFormat.format(row.monthlyVolume)}회`;
  return exact ? value : `최소 ${value}`;
}

function dateLabel(row) {
  return /^\d{4}-\d{2}-\d{2}$/.test(row.volumeDate ?? "")
    ? `월 검색량 기준일 ${row.volumeDate}`
    : "월 검색량 기준일 미제공";
}

function shell(content) {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <rect width="1200" height="630" fill="${COLORS.paper}"/>
      ${content}
    </svg>`;
}

function homeSvg(logoMarkup) {
  return shell(`
    ${logoMarkup}
    <rect x="932" width="268" height="630" fill="${COLORS.green}"/>
    <circle cx="1117" cy="150" r="166" fill="${COLORS.orange}"/>
    <circle cx="1014" cy="500" r="82" fill="${COLORS.paperAlt}" opacity="0.18"/>
    <text x="80" y="245" fill="${COLORS.orange}" font-family="${FONT}" font-size="19" font-weight="700" letter-spacing="2.4">B2B OEM/ODM PLATFORM</text>
    <text x="80" y="330" fill="${COLORS.green}" font-family="${FONT}" font-size="58" font-weight="700" letter-spacing="-1.8">
      <tspan x="80">건강기능식품 제조사와</tspan>
      <tspan x="80" dy="76">유통사를 잇는 매칭</tspan>
    </text>
    <line x1="80" y1="513" x2="852" y2="513" stroke="${COLORS.rule}" stroke-width="2"/>
    <text x="80" y="560" fill="${COLORS.muted}" font-family="${FONT}" font-size="22" font-weight="500">Vita Core Platform</text>
  `);
}

function pageSvg(title, logoMarkup) {
  return shell(`
    ${logoMarkup}
    <rect x="932" width="268" height="630" fill="${COLORS.green}"/>
    <rect x="932" width="268" height="152" fill="${COLORS.orange}"/>
    <text x="80" y="252" fill="${COLORS.green}" font-family="${FONT}" font-size="66" font-weight="700" letter-spacing="-1.8">${escapeXml(title)}</text>
    <line x1="80" y1="391" x2="852" y2="391" stroke="${COLORS.rule}" stroke-width="2"/>
    <text x="80" y="451" fill="${COLORS.ink}" font-family="${FONT}" font-size="28" font-weight="600">건강기능식품 제조사와 유통사를 잇는</text>
    <text x="80" y="495" fill="${COLORS.ink}" font-family="${FONT}" font-size="28" font-weight="600">B2B OEM/ODM 매칭</text>
    <text x="80" y="560" fill="${COLORS.muted}" font-family="${FONT}" font-size="20" font-weight="500">Vita Core Platform</text>
  `);
}

function ingredientSvg(row, logoMarkup) {
  const lines = splitName(row.name);
  const fontSize = titleSize(row.name, lines);
  const lineHeight = Math.round(fontSize * 1.18);
  const titleY = lines.length === 1 ? 256 : lines.length === 2 ? 212 : 178;
  const tspans = lines
    .map((line, index) => `<tspan x="80"${index ? ` dy="${lineHeight}"` : ""}>${escapeXml(line)}</tspan>`)
    .join("");
  const volume = escapeXml(monthlyVolumeLabel(row));
  const observed = escapeXml(dateLabel(row));

  return shell(`
    ${logoMarkup}
    <rect x="1060" width="140" height="630" fill="${COLORS.green}"/>
    <rect x="1060" y="0" width="140" height="152" fill="${COLORS.orange}"/>
    <text x="80" y="162" fill="${COLORS.orange}" font-family="${FONT}" font-size="19" font-weight="700" letter-spacing="2.4">원료 검색 정보</text>
    <text x="80" y="${titleY}" fill="${COLORS.green}" font-family="${FONT}" font-size="${fontSize}" font-weight="700" letter-spacing="-1.5">${tspans}</text>
    <rect x="80" y="462" width="900" height="3" fill="${COLORS.orange}"/>
    <text x="80" y="527" fill="${COLORS.ink}" font-family="${FONT}" font-size="34" font-weight="700" letter-spacing="-0.5">월 검색량 ${volume}</text>
    <text x="80" y="572" fill="${COLORS.muted}" font-family="${FONT}" font-size="19" font-weight="500">${observed}</text>
    <text x="980" y="572" fill="${COLORS.muted}" font-family="${FONT}" font-size="17" font-weight="600" text-anchor="end">Vita Core Platform</text>
  `);
}

async function render(svg, outputPath) {
  await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outputPath);
}

async function main() {
  const [rawData, logoSource] = await Promise.all([
    readFile(DATA_PATH, "utf8"),
    readFile(LOGO_PATH),
  ]);
  const data = JSON.parse(rawData);
  const rows = data.rows;

  if (!Array.isArray(rows) || rows.length !== 631) {
    throw new Error(`원료 데이터가 631행이 아닙니다: ${rows?.length ?? "배열 아님"}`);
  }
  const ids = new Set();
  for (const [index, row] of rows.entries()) {
    if (!/^ing_[a-z0-9]+$/.test(row.id ?? "")) throw new Error(`${index + 1}행 id가 올바르지 않습니다`);
    if (!row.name || typeof row.name !== "string") throw new Error(`${row.id} 이름이 없습니다`);
    if (!("monthlyVolume" in row) || !("observedAt" in row)) throw new Error(`${row.id} 검색량 스키마가 없습니다`);
    if (ids.has(row.id)) throw new Error(`중복 id: ${row.id}`);
    ids.add(row.id);
  }

  await mkdir(OUT_DIR, { recursive: true });
  const logoSvg = logoSource.toString("utf8");
  const viewBox = logoSvg.match(/viewBox="([^"]+)"/)?.[1];
  const logoBody = logoSvg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  if (!viewBox || !logoBody) throw new Error("로고 SVG의 viewBox 또는 본문이 없습니다");
  const logoMarkup = `<svg x="80" y="58" width="390" height="56" viewBox="${viewBox}" preserveAspectRatio="xMinYMid meet">${logoBody}</svg>`;
  await render(homeSvg(logoMarkup), path.join(OUT_DIR, "home.png"));
  await Promise.all(
    GENERAL_PAGES.map(([fileName, title]) =>
      render(pageSvg(title, logoMarkup), path.join(OUT_DIR, `${fileName}.png`)),
    ),
  );

  const concurrency = 12;
  for (let start = 0; start < rows.length; start += concurrency) {
    await Promise.all(
      rows.slice(start, start + concurrency).map((row) =>
        render(ingredientSvg(row, logoMarkup), path.join(OUT_DIR, `${row.id}.png`)),
      ),
    );
  }

  console.log(`[build-share-images] 완료: home 1장 + 일반 ${GENERAL_PAGES.length}장 + 원료 ${rows.length}장 (${WIDTH}x${HEIGHT})`);
  console.log(`[build-share-images] 출력: ${OUT_DIR}`);
}

main().catch((error) => {
  console.error("[build-share-images] 실패:", error.message);
  process.exitCode = 1;
});
