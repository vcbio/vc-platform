import { createServer } from "node:http";
import { readFileSync } from "node:fs";

const host = process.env.VC_AI_HOST || "127.0.0.1";
const port = Number(process.env.VC_AI_PORT || 4317);
const model = process.env.VC_AI_MODEL || "qwen3:14b";
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

if (!supabaseUrl?.startsWith("https://") || !publishableKey || !Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("Supabase 공개 설정 또는 VC_AI_PORT가 올바르지 않습니다.");
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
  return user?.id && user.email && !user.is_anonymous && user.app_metadata?.vcp_role !== "admin" ? user : null;
}

async function hasCustomerProfile(token, userId) {
  const url = new URL(`${supabaseUrl}/rest/v1/vcp_customer_profiles`);
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("select", "id");
  url.searchParams.set("limit", "1");
  const response = await fetch(url, {
    headers: { apikey: publishableKey, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("profile_unavailable");
  return (await response.json()).length === 1;
}

function withinLimit(userId) {
  const now = Date.now();
  const entry = limits.get(userId);
  if (!entry || entry.until <= now) {
    limits.set(userId, { count: 1, until: now + 60_000 });
    if (limits.size > 1000) for (const [key, value] of limits) if (value.until <= now) limits.delete(key);
    return true;
  }
  if (entry.count >= 6) return false;
  entry.count += 1;
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
const riskyReply = /(?:가능|허용|승인|확정|금지|불가|안전|접수|제출|전달|판매|생산|제조|사용|섭취|먹을|출시|합법|문제없|등재|등록|인정|적법|위법|보장|효능|치료|담당자|연락처|주소|이메일)/;
const fixedRegulatoryReply = "사용 가능·불가를 여기서 단정할 수 없습니다. 원료의 정확한 이름·사용 부위와 일반식품/건강기능식품 구분을 알려 주세요. 담당자가 식약처 현행 원문을 확인하겠습니다.";

async function handle(req, res) {
  if (req.url === "/health" && req.method === "GET") return respond(req, res, 200, { ok: true });
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
  let hasProfile;
  try { hasProfile = await hasCustomerProfile(match[1], user.id); }
  catch { return respond(req, res, 503, { error: "고객정보를 확인하지 못했습니다." }); }
  if (!hasProfile) return respond(req, res, 403, { error: "회사와 담당자 정보를 먼저 저장해 주세요." });
  if (!withinLimit(user.id)) return respond(req, res, 429, { error: "잠시 뒤 다시 질문해 주세요." });

  let messages;
  try {
    const body = await readBody(req);
    messages = body?.messages;
    if (!Array.isArray(messages) || messages.length < 1 || messages.length > 10 ||
      messages.some((item) => item?.role !== "user" ||
        typeof item.content !== "string" || !item.content.trim() || item.content.length > 1000) ||
      messages.at(-1).role !== "user") throw new Error("invalid");
    if (messages.some((item) => contactPattern.test(item.content))) throw new Error("contact");
  } catch (error) {
    return respond(req, res, error?.message === "too_large" ? 413 : 400,
      { error: error?.message === "contact" ? "연락처는 대화에 적지 마세요." : "질문 형식을 확인해 주세요." });
  }

  const question = messages.at(-1).content.trim();
  const evidence = matchingMarket(question);
  if (regulatoryQuestion.test(question))
    return respond(req, res, 200, { reply: fixedRegulatoryReply, mode: "source_check", sourceUrl: foodSource, ...(evidence && { market: evidence }) });

  const system = [
    "당신은 브이씨바이오의 한국어 B2B 견적 접수 도우미입니다. 제품 유형·제형·수량·원료·희망일 중 빠진 조건을 한 번에 하나씩 질문하세요. 답변은 한 문장의 질문으로만 쓰세요. 설명이나 판단은 쓰지 마세요.",
    "고객 이름·이메일·전화번호를 다시 묻지 마세요. 견적을 제출하거나 제조사에 보냈다고 말하지 마세요. 가격·생산 가능 여부를 확정하지 마세요.",
    "원료의 허용·금지·기능성을 추정하지 마세요. 공식 근거가 없으면 '공식 원문 확인 필요'라고만 하세요. 검색되지 않음은 사용불가가 아닙니다.",
    "시장 자료는 판매량·매출이 아닙니다. 기준일을 현재로 바꾸거나 없는 수치를 만들지 마세요.",
    evidence ? `공개 검색 관심도 참고: ${evidence.name}, 값 ${evidence.searchInterest}, 관측일 ${evidence.observedAt}. 현재 주간 자료가 아니라 과거 자료라고만 설명하세요.` : "시장 수치를 받지 않았으므로 수치를 말하지 마세요.",
  ].join("\n");

  try {
    const response = await fetch("http://127.0.0.1:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, stream: false, think: false, options: { temperature: 0.2, num_predict: 240 },
        messages: [{ role: "system", content: system }, ...messages] }),
      signal: AbortSignal.timeout(35_000),
    });
    if (!response.ok) throw new Error("ollama_unavailable");
    const data = await response.json();
    let reply = String(data?.message?.content || "").replace(/<think>[\s\S]*?<\/think>/g, "").trim().slice(0, 1200);
    if (!reply || riskyReply.test(reply) || /[.!。\n]/.test(reply) || !reply.endsWith("?"))
      reply = "기획하시는 제품의 유형과 제형은 무엇인가요?";
    return respond(req, res, 200, { reply, mode: "local_ai", ...(evidence && { market: evidence }) });
  } catch {
    return respond(req, res, 503, { error: "맥북 AI에 연결되지 않았습니다. 직접 견적 입력은 계속 사용할 수 있습니다." });
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
