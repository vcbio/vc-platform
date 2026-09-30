export type QuickInquiryInput = {
  kind: "quick_quote";
  ingredient: string;
  dosageForm: string;
  quantity: string;
  contact: string;
  turnstileToken: string;
  website?: string;
  startedAt: number;
  consent: true;
  privacyVersion: "2026-09-30";
};

export type ManufacturerApplicationInput = {
  kind: "manufacturer_application";
  companyName: string;
  region: string;
  certifications: string;
  dosageForms: string;
  contact: string;
  turnstileToken: string;
  website?: string;
  startedAt: number;
  consent: true;
  privacyVersion: "2026-09-30";
};

export type PublicIntakeInput = QuickInquiryInput | ManufacturerApplicationInput;

type IntakeResponse = { ok?: boolean; receiptId?: string; error?: string };

function endpoint() {
  const explicit = process.env.NEXT_PUBLIC_INTAKE_ENDPOINT?.trim();
  if (explicit?.startsWith("https://")) return explicit;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (supabaseUrl?.startsWith("https://")) {
    return `${supabaseUrl}/functions/v1/public-intake`;
  }
  return null;
}

export async function submitPublicIntake(input: PublicIntakeInput) {
  const url = endpoint();
  if (!url) throw new Error("접수 서버가 아직 연결되지 않았습니다. 잠시 후 다시 시도해 주세요.");

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(anonKey ? { apikey: anonKey } : {}),
    },
    body: JSON.stringify(input),
  });
  const body = (await response.json().catch(() => ({}))) as IntakeResponse;
  if (!response.ok || !body.ok || !body.receiptId) {
    throw new Error(body.error || "접수하지 못했습니다. 입력 내용을 확인해 다시 시도해 주세요.");
  }
  return body.receiptId;
}
