import { supabase } from "@/lib/supabase";
import type { CustomerProfileInput } from "@/lib/customerProfile";

export type Session = {
  email: string;
  company?: string;
  isAdmin: boolean;
};

export type AuthResult = { session?: Session; error?: string };

export type AuthAdapter = {
  getSession(): Promise<Session | null>;
  signIn(email: string, password: string): Promise<AuthResult>;
  signUp(email: string, password: string, company?: string): Promise<AuthResult>;
  signOut(): Promise<void>;
};

const setupError = "로그인 설정이 아직 완료되지 않았습니다.";

export function authReady() {
  return supabase !== null;
}

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) return null;

  return {
    email: data.user.email,
    company:
      typeof data.user.user_metadata?.company_name === "string"
        ? data.user.user_metadata.company_name
        : undefined,
    // app_metadata 는 브라우저 사용자가 수정할 수 없다.
    isAdmin: data.user.app_metadata?.vcp_role === "admin",
  };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { error: setupError };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  const session = await getSession();
  return session ? { session } : { error: "로그인 상태를 확인하지 못했습니다." };
}

export async function signInWithGoogle(next: "quote" | "quote-ai" | "deal" = "deal"): Promise<{ error?: string }> {
  if (!supabase) return { error: setupError };
  try { window.sessionStorage.setItem("vcp.afterAuth", next); } catch { /* 저장 차단 시 거래관리로 이동 */ }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/vc-platform/deal/` },
  });
  return error ? { error: error.message } : {};
}

export async function signUp(
  email: string,
  password: string,
  profile: CustomerProfileInput,
): Promise<AuthResult> {
  if (!supabase) return { error: setupError };
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: {
      company_name: profile.companyName.trim(),
      brand_name: profile.brandName.trim(),
      contact_name: profile.contactName.trim(),
      contact_phone: profile.contactPhone.trim(),
    } },
  });
  if (error) return { error: error.message };
  if (!data.session) return {};
  const session = await getSession();
  return session ? { session } : {};
}

export async function signOut(): Promise<void> {
  if (supabase) await supabase.auth.signOut();
}

export async function isAdmin(): Promise<boolean> {
  return (await getSession())?.isAdmin ?? false;
}
