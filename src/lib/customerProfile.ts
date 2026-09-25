import { supabase } from "@/lib/supabase";

export type CustomerProfileInput = {
  companyName: string;
  brandName: string;
  contactName: string;
  contactPhone: string;
  retentionConsent: boolean;
};

export type CustomerProfile = CustomerProfileInput & { id: string; email: string };

type ProfileRow = {
  id: string;
  email: string;
  company_name: string;
  brand_name: string;
  contact_name: string;
  contact_phone: string;
  retention_consent: boolean;
};

const toProfile = (row: ProfileRow): CustomerProfile => ({
  id: row.id,
  email: row.email,
  companyName: row.company_name,
  brandName: row.brand_name,
  contactName: row.contact_name,
  contactPhone: row.contact_phone,
  retentionConsent: row.retention_consent,
});

export function profileError(input: CustomerProfileInput): string | null {
  if (!input.companyName.trim()) return "회사명을 적어 주세요.";
  if (!input.brandName.trim()) return "브랜드명을 적어 주세요.";
  if (!input.contactName.trim()) return "담당자 이름을 적어 주세요.";
  if (!/^\+?[0-9()\-\s]{7,30}$/.test(input.contactPhone.trim()))
    return "연락처를 숫자와 하이픈으로 적어 주세요.";
  return null;
}

export async function getCustomerProfile(): Promise<CustomerProfile | null> {
  if (!supabase) throw new Error("고객 정보 저장 설정이 없습니다.");
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!auth.user?.email || auth.user.is_anonymous) return null;

  const { data, error } = await supabase
    .from("vcp_customer_profiles")
    .select("id,email,company_name,brand_name,contact_name,contact_phone,retention_consent")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error) throw error;
  return data ? toProfile(data as ProfileRow) : null;
}

export async function saveCustomerProfile(input: CustomerProfileInput): Promise<void> {
  const invalid = profileError(input);
  if (invalid) throw new Error(invalid);
  if (!supabase) throw new Error("고객 정보 저장 설정이 없습니다.");

  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user?.email || auth.user.is_anonymous)
    throw new Error("로그인 상태를 확인해 주세요.");

  const row = {
    email: auth.user.email,
    company_name: input.companyName.trim(),
    brand_name: input.brandName.trim(),
    contact_name: input.contactName.trim(),
    contact_phone: input.contactPhone.trim(),
    retention_consent: input.retentionConsent,
  };
  const existing = await supabase
    .from("vcp_customer_profiles")
    .select("id")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (existing.error) throw existing.error;

  const saved = existing.data
    ? await supabase.from("vcp_customer_profiles").update(row).eq("user_id", auth.user.id).select("id").single()
    : await supabase.from("vcp_customer_profiles").insert({ user_id: auth.user.id, ...row }).select("id").single();
  if (saved.error || !saved.data) throw saved.error ?? new Error("저장된 고객 정보가 없습니다.");
}
