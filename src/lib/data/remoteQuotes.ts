import { supabase } from "@/lib/supabase";
import type { DataAdapter } from "./index";
import type { Quote, QuoteStatus } from "./types";

type QuoteRow = {
  id: string;
  profile_id: string;
  product_type: string;
  dosage_form: Quote["dosageForm"];
  quantity: number;
  unit: string;
  ingredients: string[];
  target_date: string;
  budget_range: string;
  memo: string;
  status: QuoteStatus;
  created_at: string;
  updated_at: string;
};

type ProfileRow = {
  id: string;
  user_id: string | null;
  email: string;
  company_name: string;
  brand_name: string;
  contact_name: string;
  contact_phone: string;
  withdrawn_at: string | null;
  purge_at: string | null;
};

type ReviewRow = { quote_id: string; assigned_partner_ids: string[]; internal_note: string };

const configured = () => {
  if (!supabase) throw new Error("견적 접수 설정이 없습니다.");
  return supabase;
};

const fromRow = (row: QuoteRow, email: string, profile?: ProfileRow, review?: ReviewRow): Quote => ({
  id: row.id,
  userEmail: email,
  productType: row.product_type,
  dosageForm: row.dosage_form,
  quantity: row.quantity,
  unit: row.unit,
  ingredients: row.ingredients,
  targetDate: row.target_date,
  budgetRange: row.budget_range,
  memo: row.memo,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  ...(profile && { customer: {
    profileId: profile.id,
    companyName: profile.company_name,
    brandName: profile.brand_name,
    contactName: profile.contact_name,
    contactPhone: profile.contact_phone,
    ...(profile.withdrawn_at && { withdrawnAt: profile.withdrawn_at }),
    ...(profile.purge_at && { purgeAt: profile.purge_at }),
  } }),
  ...(review && { assignedPartnerIds: review.assigned_partner_ids, internalNote: review.internal_note }),
});

export const remoteQuotes: Pick<DataAdapter, "listQuotes" | "getQuote" | "createQuote" | "updateQuote" | "removeQuote"> = {
  async listQuotes() {
    const db = configured();
    const { data: auth, error: authError } = await db.auth.getUser();
    if (authError || !auth.user?.email || auth.user.is_anonymous)
      throw new Error("로그인 상태를 확인하지 못했습니다.");

    const { data, error } = await db.from("vcp_quote_requests").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    const rows = (data ?? []) as QuoteRow[];
    const isAdmin = auth.user.app_metadata?.vcp_role === "admin";
    if (!isAdmin) return rows.map((row) => fromRow(row, auth.user!.email!));

    const [profiles, reviews] = await Promise.all([
      db.from("vcp_customer_profiles").select("id,user_id,email,company_name,brand_name,contact_name,contact_phone,withdrawn_at,purge_at"),
      db.from("vcp_quote_reviews").select("quote_id,assigned_partner_ids,internal_note"),
    ]);
    if (profiles.error) throw profiles.error;
    if (reviews.error) throw reviews.error;
    const people = new Map(((profiles.data ?? []) as ProfileRow[]).map((p) => [p.id, p]));
    const notes = new Map(((reviews.data ?? []) as ReviewRow[]).map((r) => [r.quote_id, r]));
    return rows.map((row) => fromRow(row, people.get(row.profile_id)?.email ?? "미확인", people.get(row.profile_id), notes.get(row.id)));
  },

  async getQuote(id) {
    return (await this.listQuotes()).find((row) => row.id === id) ?? null;
  },

  async createQuote(input) {
    const db = configured();
    const { data: auth, error: authError } = await db.auth.getUser();
    if (authError || !auth.user?.email || auth.user.is_anonymous)
      throw new Error("견적 요청은 로그인 후에만 가능합니다.");
    const profile = await db.from("vcp_customer_profiles").select("id").eq("user_id", auth.user.id).single();
    if (profile.error || !profile.data) throw profile.error ?? new Error("고객 정보를 먼저 저장해 주세요.");
    const { data, error } = await db.from("vcp_quote_requests").insert({
      profile_id: profile.data.id,
      product_type: input.productType,
      dosage_form: input.dosageForm,
      quantity: input.quantity,
      unit: input.unit,
      ingredients: input.ingredients,
      target_date: input.targetDate,
      budget_range: input.budgetRange,
      memo: input.memo,
    }).select("*").single();
    if (error || !data) throw error ?? new Error("견적 저장 결과가 없습니다.");
    return fromRow(data as QuoteRow, auth.user.email);
  },

  async updateQuote(id, patch) {
    if (!patch.status) throw new Error("관리자만 진행 상태를 변경할 수 있습니다.");
    const db = configured();
    const { data, error } = await db.from("vcp_quote_requests")
      .update({ status: patch.status }).eq("id", id).select("*").single();
    if (error) throw error;
    return data ? fromRow(data as QuoteRow, "") : null;
  },

  async removeQuote() {
    throw new Error("접수된 견적은 화면에서 삭제할 수 없습니다.");
  },
};

export async function saveQuoteReview(quoteId: string, assignedPartnerIds: string[], internalNote: string) {
  const db = configured();
  const current = await db.from("vcp_quote_reviews").select("quote_id").eq("quote_id", quoteId).maybeSingle();
  if (current.error) throw current.error;
  const saved = current.data
    ? await db.from("vcp_quote_reviews").update({ assigned_partner_ids: assignedPartnerIds, internal_note: internalNote }).eq("quote_id", quoteId).select("quote_id").single()
    : await db.from("vcp_quote_reviews").insert({ quote_id: quoteId, assigned_partner_ids: assignedPartnerIds, internal_note: internalNote }).select("quote_id").single();
  if (saved.error || !saved.data) throw saved.error ?? new Error("저장된 검토 내용이 없습니다.");
}

/** 탈퇴 고객의 철회·삭제 요청을 관리자가 확인한 뒤에만 호출한다. 연결된 견적도 함께 삭제된다. */
export async function deleteArchivedCustomerProfile(profileId: string): Promise<void> {
  const db = configured();
  const { data: auth, error: authError } = await db.auth.getUser();
  if (authError || auth.user?.app_metadata?.vcp_role !== "admin")
    throw new Error("관리자 권한을 확인하지 못했습니다.");
  const result = await db.from("vcp_customer_profiles").delete()
    .eq("id", profileId).is("user_id", null).select("id").single();
  if (result.error || !result.data) throw result.error ?? new Error("삭제한 고객 정보가 없습니다.");
}
