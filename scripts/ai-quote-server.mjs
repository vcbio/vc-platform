import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, renameSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { dirname, isAbsolute } from "node:path";
import { tmpdir } from "node:os";
import { join } from "node:path";

const host = process.env.VC_AI_HOST || "127.0.0.1";
const port = Number(process.env.VC_AI_PORT || 4317);
const model = "gpt-6-luna";
const backend = process.env.VC_AI_BACKEND || "codex_oauth";
const openaiKey = process.env.OPENAI_API_KEY;
const codexBin = process.env.VC_AI_CODEX_BIN || "/opt/homebrew/bin/codex";
const rateStatePath = process.env.VC_AI_RATE_STATE_PATH;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const allowedOrigins = new Set(
  (process.env.VC_AI_ALLOWED_ORIGINS || "https://vcbio.github.io")
    .split(",").map((origin) => origin.trim()).filter(Boolean),
);
const foodSource = "https://www.foodsafetykorea.go.kr/portal/safefoodlife/foodMeterial/foodMeterialDB.do?menu_grp=MENU_NEW04&menu_no=2968&search_type=2";
const limits = new Map();
const market = (() => {
  try {
    const data = JSON.parse(readFileSync(new URL("../public/data/ingredients-top.json", import.meta.url), "utf8"));
    return { meta: data.meta, rows: data.rows };
  } catch {
    return { meta: null, rows: [] };
  }
})();

if (!supabaseUrl?.startsWith("https://") || !publishableKey || !["codex_oauth", "openai_api"].includes(backend) ||
  (backend === "openai_api" && !openaiKey) || !isAbsolute(rateStatePath || "") ||
  !Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("Supabase 공개 설정, AI 인증 방식, VC_AI_RATE_STATE_PATH 또는 VC_AI_PORT가 올바르지 않습니다.");
}

function saveDailyCount(value) {
  mkdirSync(dirname(rateStatePath), { recursive: true, mode: 0o700 });
  const temporary = `${rateStatePath}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify(value), { mode: 0o600 });
  renameSync(temporary, rateStatePath);
}

let dailyCount;
try {
  dailyCount = JSON.parse(readFileSync(rateStatePath, "utf8"));
  if (typeof dailyCount?.day !== "string" || !Number.isInteger(dailyCount.count) || dailyCount.count < 0)
    throw new Error("invalid_rate_state");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
  dailyCount = { day: new Date().toISOString().slice(0, 10), count: 0 };
  saveDailyCount(dailyCount);
}

function respond(req, res, status, body) {
  const origin = req.headers.origin;
  if (allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Private-Network", "true");
    res.setHeader("Vary", "Origin");
  }
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 8192) throw new Error("too_large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function verifiedUser(token) {
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: publishableKey, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;
  const user = await response.json();
  return user?.id && user.email && !user.is_anonymous && user.app_metadata?.vcp_role === "admin" ? user : null;
}

function withinLimit(userId) {
  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);
  if (dailyCount.day !== today) dailyCount = { day: today, count: 0 };
  if (dailyCount.count >= (backend === "codex_oauth" ? 8 : 25)) return false;
  const entry = limits.get(userId);
  if (!entry || entry.until <= now) {
    limits.set(userId, { count: 1, until: now + 60_000 });
    if (limits.size > 1000) for (const [key, value] of limits) if (value.until <= now) limits.delete(key);
    dailyCount.count += 1;
    saveDailyCount(dailyCount);
    return true;
  }
  if (entry.count >= 6) return false;
  entry.count += 1;
  dailyCount.count += 1;
  saveDailyCount(dailyCount);
  return true;
}

function matchingMarket(text) {
  const row = market.rows
    .filter((item) => typeof item.name === "string" && item.name.length > 1 && text.includes(item.name))
    .sort((a, b) => b.name.length - a.name.length)[0];
  if (!row) return undefined;
  return {
    name: row.name,
    observedAt: market.meta?.observedAt || "미확인",
    searchInterest: row.monthlyVolume,
    note: market.meta?.note || "검색 관심도 참고자료입니다.",
    sourceUrl: market.meta?.sourcePage || "https://vcbio.github.io/shelf/d/vcbio-market-fable.html",
  };
}

const regulatoryQuestion = /사용.{0,8}(가능|불가|허용|금지)|식품\s*원료|등재|법적|규제|고시|개별\s*인정|식약처|먹어도|넣어도|써도|허가|인정\s*원료/;
const contactPattern = /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?:\+?82[- .]?)?0\d{1,2}[- .]?\d{3,4}[- .]?\d{4}|주소|거주지|우편번호|담당자|회사\s*위치|회사명\s*[:：]|연락처|(?:제\s*이름|저는|제가)\s*[가-힣]{2,5}|^[가-힣]{2,4}(?:입니다|이에요|예요)/;
const riskyReply = /(?:가능|허용|승인|확정|금지|불가|안전|접수|제출|전달|출시|합법|문제없|등재|등록|인정|적법|위법|보장|효능|치료|원가|단가|마진|가격|매출|담당자|연락처|주소|이메일)/;
const fixedRegulatoryReply = "사용 가능·불가를 여기서 단정할 수 없습니다. 원료의 정확한 이름·사용 부위와 일반식품/건강기능식품 구분을 알려 주세요. 담당자가 식약처 현행 원문을 확인하겠습니다.";
const publicForms = ["분말스틱", "정제", "캡슐", "분말", "액상", "젤리", "츄어블", "과립", "파우치"];
const privatePattern = /원가|단가|마진|거래처|고객사|계약|실제\s*견적|매입|사업자|주소|연락처|담당자|회사명|브랜드명|이메일|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/;

/** 외부 API에는 원문을 보내지 않고 공개 사전에서 찾은 단어만 보낸다. */
function publicQuestion(text) {
  const ingredient = matchingMarket(text)?.name.replace(/[^\p{L}\p{N}·\s-]/gu, "").slice(0, 50);
  const form = publicForms.find((value) => text.includes(value));
  const topic = text.includes("납기") || text.includes("일정") ? "희망 일정"
    : text.includes("수량") ? "희망 수량"
      : text.includes("제형") ? "제형"
        : text.includes("원료") ? "원료" : "제품 유형";
  const summary = [ingredient && `공개 원료 ${ingredient}`, form && `제형 ${form}`, `주제 ${topic}`].filter(Boolean).join(" · ");
  return { summary, prompt: `가상 제품 상담입니다. ${summary}. 다음에 확인할 질문을 한 문장으로 작성하세요.` };
}

async function codexOAuthReply(instructions, safeInput) {
  const directory = mkdtempSync(join(tmpdir(), "vc-ai-oauth-"));
  const outputPath = join(directory, "reply.txt");
  const prompt = `${instructions}\n\n${safeInput.map((item) => item.prompt).join("\n")}\n\n` +
    "가상 질문에 이어서 확인할 한국어 질문 한 문장만 답하세요. 파일·도구를 사용하지 마세요.";
  const childEnv = { ...process.env };
  delete childEnv.OPENAI_API_KEY;
  delete childEnv.OPENAI_ADMIN_KEY;
  delete childEnv.CODEX_API_KEY;
  try {
    const exitCode = await new Promise((resolve, reject) => {
      const child = spawn(codexBin, ["exec", "-m", model, "-c", 'model_reasoning_effort="low"',
        "--disable", "shell_tool", "--disable", "skill_search", "-s", "read-only",
        "--ephemeral", "--ignore-user-config", "--ignore-rules", "--skip-git-repo-check",
        "-C", directory, "-o", outputPath, "-"],
      { env: childEnv, cwd: directory, stdio: ["pipe", "ignore", "ignore"] });
      const timer = setTimeout(() => child.kill("SIGKILL"), 35_000);
      child.on("error", (error) => { clearTimeout(timer); reject(error); });
      child.on("close", (code) => { clearTimeout(timer); resolve(code); });
      child.stdin.on("error", () => {});
      child.stdin.end(prompt);
    });
    if (exitCode !== 0) throw new Error("codex_unavailable");
    return readFileSync(outputPath, "utf8").trim().slice(0, 600);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

async function handle(req, res) {
  if (req.url === "/health" && req.method === "GET") return respond(req, res, 200, { ok: true, backend });
  if (req.url !== "/v1/chat") return respond(req, res, 404, { error: "주소를 찾을 수 없습니다." });

  if (!allowedOrigins.has(req.headers.origin)) return respond(req, res, 403, { error: "허용되지 않은 화면입니다." });
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": req.headers.origin,
      "Access-Control-Allow-Private-Network": "true",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Max-Age": "600",
      Vary: "Origin",
    });
    return res.end();
  }
  if (req.method !== "POST") return respond(req, res, 405, { error: "허용되지 않은 요청입니다." });
  if (!/^application\/json(?:;|$)/i.test(req.headers["content-type"] || ""))
    return respond(req, res, 415, { error: "JSON 요청만 받습니다." });
  if (Number(req.headers["content-length"] || 0) > 8192)
    return respond(req, res, 413, { error: "요청이 너무 깁니다." });

  const match = /^Bearer ([A-Za-z0-9._~-]+)$/.exec(req.headers.authorization || "");
  if (!match) return respond(req, res, 401, { error: "로그인이 필요합니다." });
  let user;
  try { user = await verifiedUser(match[1]); } catch { return respond(req, res, 503, { error: "로그인 확인을 잠시 할 수 없습니다." }); }
  if (!user) return respond(req, res, 401, { error: "로그인 상태를 다시 확인해 주세요." });
  if (!withinLimit(user.id)) return respond(req, res, 429, { error: "잠시 뒤 다시 질문해 주세요." });

  let messages;
  try {
    const body = await readBody(req);
    messages = body?.messages;
    if (!Array.isArray(messages) || messages.length < 1 || messages.length > 10 ||
      messages.some((item) => item?.role !== "user" ||
        typeof item.content !== "string" || !item.content.trim() || item.content.length > 1000) ||
      messages.at(-1).role !== "user") throw new Error("invalid");
    if (messages.some((item) => contactPattern.test(item.content) || privatePattern.test(item.content))) throw new Error("contact");
    if (!/[?？]$/.test(messages.at(-1).content.trim())) throw new Error("not_question");
  } catch (error) {
    return respond(req, res, error?.message === "too_large" ? 413 : 400,
      { error: error?.message === "contact" ? "개인정보·거래조건 없이 공개 자료에 관한 질문만 적어 주세요."
        : error?.message === "not_question" ? "질문만 보낼 수 있습니다. 문장 끝에 물음표를 붙여 주세요." : "질문 형식을 확인해 주세요." });
  }

  const question = messages.at(-1).content.trim();
  const evidence = matchingMarket(question);
  if (regulatoryQuestion.test(question))
    return respond(req, res, 200, { reply: fixedRegulatoryReply, mode: "source_check", sourceUrl: foodSource, ...(evidence && { market: evidence }) });

  const safeInput = messages.slice(-4).map((item) => publicQuestion(item.content));

  const system = [
    "당신은 한국어 B2B 견적 상담 시험 도우미입니다. 전달된 것은 공개 원료·제형·주제만 추린 가상 질문입니다. 다음에 확인할 질문 한 문장만 작성하세요. 설명이나 판단은 쓰지 마세요.",
    "고객 이름·이메일·전화번호를 묻지 마세요. 견적을 제출하거나 제조사에 보냈다고 말하지 마세요. 가격·생산 가능 여부를 확정하지 마세요.",
    "원료의 허용·금지·기능성을 추정하지 마세요. 공식 근거가 없으면 '공식 원문 확인 필요'라고만 하세요. 검색되지 않음은 사용불가가 아닙니다.",
    "시장 자료는 판매량·매출이 아닙니다. 기준일을 현재로 바꾸거나 없는 수치를 만들지 마세요.",
    "시장 수치와 실제 고객 자료는 제공되지 않았으므로 말하지 마세요.",
  ].join("\n");

  try {
    let reply;
    if (backend === "codex_oauth") reply = await codexOAuthReply(system, safeInput);
    else {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({ model, instructions: system, input: safeInput.map((item) => item.prompt).join("\n"),
          reasoning: { effort: "none" }, max_output_tokens: 180, store: false }),
        signal: AbortSignal.timeout(35_000),
      });
      if (!response.ok) throw new Error("model_unavailable");
      const data = await response.json();
      if (data?.status !== "completed") throw new Error("model_incomplete");
      reply = Array.isArray(data?.output) ? data.output.flatMap((item) => item.content || [])
        .filter((item) => item.type === "output_text" && typeof item.text === "string")
        .map((item) => item.text).join("").trim().slice(0, 600) : "";
    }
    if (!reply || riskyReply.test(reply) || /[.!。\n]/.test(reply) || !reply.endsWith("?"))
      reply = "기획하시는 제품의 유형과 제형은 무엇인가요?";
    return respond(req, res, 200, { reply, mode: "gpt6_luna_admin_test", backend, sentSummary: safeInput.at(-1).summary,
      ...(evidence && { market: evidence }) });
  } catch {
    return respond(req, res, 503, { error: "GPT-6 Luna 시험 연결을 확인하지 못했습니다." });
  }
}

const server = createServer((req, res) => {
  void handle(req, res).catch(() => {
    if (!res.headersSent) respond(req, res, 500, { error: "요청을 처리하지 못했습니다." });
    else res.end();
  });
});
server.requestTimeout = 15_000;
server.headersTimeout = 10_000;
server.listen(port, host, () => console.info(`VC AI ready on ${host}:${port} (${model})`));
