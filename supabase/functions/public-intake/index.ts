// Deno 런타임 선언. Next.js 타입 검사에서도 별도 패키지 없이 이 초안을 검사한다.
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

// 공식 근거:
// https://supabase.com/docs/guides/functions/secrets
// https://supabase.com/docs/guides/functions/cors
const allowedOrigins = (Deno.env.get("PUBLIC_INTAKE_ALLOWED_ORIGINS") || "https://vcbio.github.io")
  .split(",").map((value) => value.trim()).filter(Boolean);
const privacyVersion = "2026-09-30";
const dosageForms = new Set(["정제", "캡슐", "환", "분말", "스틱", "젤리", "액상", "기타"]);
const quantityPattern = /^((?:0\.[0-9]+|[1-9][0-9]{0,8}(?:\.[0-9]+)?|[1-9][0-9]{0,2}(?:,[0-9]{3}){1,2}(?:\.[0-9]+)?))\s*(병|개|포|정|캡슐|박스|세트|kg|g|L|mL)$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const phonePattern = /^(?:\+82|0)(?:10|2|3[123]|4[1-4]|5[1-5]|6[1-4]|70)\d{7,8}$/;

function cors(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function reply(origin: string, status: number, body: Record<string, unknown>) {
  return Response.json(body, { status, headers: cors(origin) });
}

function readText(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/\s+/g, " ");
  return cleaned.length <= max ? cleaned : null;
}

function validContact(value: string) {
  if (emailPattern.test(value)) return true;
  if (!/^[0-9+().\s-]+$/.test(value)) return false;
  return phonePattern.test(value.replace(/[().\s-]/g, ""));
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function readSmallJson(request: Request): Promise<Record<string, unknown> | null> {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16_384) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin") || "";
  if (!allowedOrigins.includes(origin)) return reply(allowedOrigins[0] || "null", 403, { error: "허용되지 않은 요청입니다." });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (request.method !== "POST") return reply(origin, 405, { error: "지원하지 않는 요청입니다." });

  const url = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const salt = Deno.env.get("PUBLIC_INTAKE_RATE_SALT");
  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!url || !serviceKey || !salt || salt.length < 32 || !turnstileSecret) {
    return reply(origin, 503, { error: "접수 서버 설정이 완료되지 않았습니다." });
  }

  const body = await readSmallJson(request);
  if (!body) return reply(origin, 400, { error: "입력 형식이나 길이를 확인해 주세요." });

  const website = readText(body.website, 200);
  if (website === null || website) return reply(origin, 400, { error: "접수할 수 없습니다." });
  const startedAt = Number(body.startedAt);
  if (!Number.isFinite(startedAt) || Date.now() - startedAt < 1200 || Date.now() - startedAt > 86_400_000) {
    return reply(origin, 400, { error: "입력 시간이 올바르지 않습니다. 새로고침 후 다시 작성해 주세요." });
  }
  if (body.consent !== true || body.privacyVersion !== privacyVersion) {
    return reply(origin, 400, { error: "개인정보 수집 동의를 확인해 주세요." });
  }

  // 전달 헤더 하나를 신뢰하지 않는다. 게이트웨이 주소를 우선하고, 없을 때만 전달값을 보조로 쓴다.
  // 헤더는 완전한 신원 증명이 아니므로 DB 전역 60건/시간 제한을 별도로 둔다.
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const gatewayAddress = request.headers.get("x-real-ip") || request.headers.get("cf-connecting-ip") || "";
  const fingerprint = await sha256(`${salt}:${gatewayAddress || forwarded || "unavailable"}`);

  const kind = body.kind;
  const contact = readText(body.contact, 120);
  if (!contact || !validContact(contact)) return reply(origin, 400, { error: "이메일 주소 또는 전화번호를 확인해 주세요." });

  const params: Record<string, string | null> = {
    p_kind: typeof kind === "string" ? kind : "",
    p_ip_hash: fingerprint,
    p_ingredient: null,
    p_dosage_form: null,
    p_quantity: null,
    p_company_name: null,
    p_region: null,
    p_certifications: null,
    p_dosage_forms: null,
    p_contact: contact,
    p_privacy_version: privacyVersion,
  };

  if (kind === "quick_quote") {
    const ingredient = readText(body.ingredient, 100);
    const dosageForm = readText(body.dosageForm, 40);
    const quantity = readText(body.quantity, 32);
    const quantityMatch = quantity?.match(quantityPattern);
    const amount = quantityMatch ? Number(quantityMatch[1].replace(/,/g, "")) : 0;
    if (!ingredient || ingredient.length < 2 || !dosageForm || !dosageForms.has(dosageForm)
      || !quantity || !quantityMatch || !Number.isFinite(amount) || amount <= 0) {
      return reply(origin, 400, { error: "원료·제형·수량 형식을 확인해 주세요." });
    }
    params.p_ingredient = ingredient;
    params.p_dosage_form = dosageForm;
    params.p_quantity = quantity;
  } else if (kind === "manufacturer_application") {
    const companyName = readText(body.companyName, 100);
    const region = readText(body.region, 80);
    const certifications = readText(body.certifications, 300);
    const makerDosageForms = readText(body.dosageForms, 300);
    if (!companyName || companyName.length < 2 || !region || region.length < 2
      || !certifications || certifications.length < 2 || !makerDosageForms || makerDosageForms.length < 2) {
      return reply(origin, 400, { error: "회사명·지역·보유 인증·가능 제형을 확인해 주세요." });
    }
    params.p_company_name = companyName;
    params.p_region = region;
    params.p_certifications = certifications;
    params.p_dosage_forms = makerDosageForms;
  } else {
    return reply(origin, 400, { error: "접수 종류를 확인해 주세요." });
  }

  // Cloudflare 검증은 필수다. 통과 토큰이라도 사이트와 폼 종류가 다르면 접수하지 않는다.
  const turnstileToken = readText(body.turnstileToken, 2048);
  if (!turnstileToken) return reply(origin, 400, { error: "자동 접수 방지 확인을 완료해 주세요." });
  try {
    const verifyResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: turnstileSecret, response: turnstileToken }),
      signal: AbortSignal.timeout(5000),
    });
    if (!verifyResponse.ok) return reply(origin, 503, { error: "자동 접수 방지 확인 서버에 연결하지 못했습니다." });
    const verified = await verifyResponse.json() as { success?: boolean; hostname?: string; action?: string };
    if (verified.success !== true || verified.hostname !== "vcbio.github.io" || verified.action !== kind) {
      return reply(origin, 400, { error: "자동 접수 방지 확인을 다시 해 주세요." });
    }
  } catch {
    return reply(origin, 503, { error: "자동 접수 방지 확인 서버에 연결하지 못했습니다." });
  }

  let rpcResponse: Response;
  try {
    rpcResponse = await fetch(`${url}/rest/v1/rpc/vcp_submit_public_intake`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(params),
    });
  } catch {
    return reply(origin, 503, { error: "접수 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요." });
  }

  const responseText = await rpcResponse.text();
  if (!rpcResponse.ok) {
    const limited = responseText.includes("rate_limit");
    return reply(origin, limited ? 429 : 503, {
      error: limited ? "접수 횟수가 많습니다. 한 시간 뒤 다시 시도해 주세요."
        : "접수 서버에 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    });
  }

  let receiptId: unknown;
  try { receiptId = JSON.parse(responseText); }
  catch { return reply(origin, 503, { error: "접수 결과를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요." }); }
  if (typeof receiptId !== "string") return reply(origin, 503, { error: "접수 결과를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요." });
  return reply(origin, 201, { ok: true, receiptId });
});
