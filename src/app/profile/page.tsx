"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Container, Input } from "@/components/ui";
import { getCustomerProfile, profileError, saveCustomerProfile, type CustomerProfileInput } from "@/lib/customerProfile";
import { supabase } from "@/lib/supabase";

const EMPTY: CustomerProfileInput = {
  companyName: "",
  brandName: "",
  contactName: "",
  contactPhone: "",
  retentionConsent: false,
};

const metadataText = (value: unknown) => typeof value === "string" ? value : "";

export default function ProfilePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fields, setFields] = useState<CustomerProfileInput>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!supabase) throw new Error("로그인 설정이 없습니다.");
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!data.user?.email || data.user.is_anonymous) {
        router.replace("/login/");
        return;
      }
      if (data.user.app_metadata?.vcp_role === "admin") {
        router.replace("/admin/");
        return;
      }
      const saved = await getCustomerProfile();
      if (!alive) return;
      setEmail(data.user.email);
      setFields(saved ?? {
        companyName: metadataText(data.user.user_metadata?.company_name),
        brandName: metadataText(data.user.user_metadata?.brand_name),
        contactName: metadataText(data.user.user_metadata?.contact_name ?? data.user.user_metadata?.full_name),
        contactPhone: metadataText(data.user.user_metadata?.contact_phone),
        retentionConsent: false,
      });
      setLoading(false);
    })().catch(() => {
      if (alive) { setLoadFailed(true); setError("고객 정보를 불러오지 못했습니다. 잠시 후 새로고침해 주세요."); setLoading(false); }
    });
    return () => { alive = false; };
  }, [router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const invalid = profileError(fields);
    if (invalid) { setError(invalid); return; }
    setBusy(true);
    setError("");
    try {
      await saveCustomerProfile(fields);
      const next = new URLSearchParams(window.location.search).get("next");
      try { window.sessionStorage.removeItem("vcp.afterAuth"); } catch { /* 저장소 차단 무시 */ }
      router.replace(next === "deal" ? "/deal/" : next === "quote-ai" ? "/quote/ai/" : "/quote/");
    } catch {
      setError("저장하지 못했습니다. 입력값과 인터넷 연결을 확인해 주세요.");
      setBusy(false);
    }
  }

  return (
    <Container>
      <div className="mx-auto w-full max-w-lg py-16">
        <h1>고객 정보 확인</h1>
        <p className="pf-help mt-3">견적 접수와 회신에 필요한 정보입니다. 본인과 관리자만 확인할 수 있습니다.</p>
        {loading ? <p className="pf-help mt-8">불러오는 중입니다.</p> : loadFailed ? (
          <p className="pf-alert mt-8" role="alert">{error}</p>
        ) : (
          <form onSubmit={submit} className="mt-8" noValidate>
            <Input label="이메일" type="email" value={email} readOnly required />
            <Input label="회사명" autoComplete="organization" value={fields.companyName} required
              onChange={(e) => setFields((old) => ({ ...old, companyName: e.target.value }))} />
            <Input label="브랜드명" value={fields.brandName} required
              onChange={(e) => setFields((old) => ({ ...old, brandName: e.target.value }))} />
            <Input label="담당자" autoComplete="name" value={fields.contactName} required
              onChange={(e) => setFields((old) => ({ ...old, contactName: e.target.value }))} />
            <Input label="연락처" type="tel" autoComplete="tel" value={fields.contactPhone} required
              onChange={(e) => setFields((old) => ({ ...old, contactPhone: e.target.value }))} />
            <label className="mb-6 mt-5 flex items-start gap-3 rounded-lg border border-slate-300 bg-white p-4">
              <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-sky-700"
                checked={fields.retentionConsent}
                onChange={(e) => setFields((old) => ({ ...old, retentionConsent: e.target.checked }))} />
              <span className="text-sm leading-6 text-slate-700">
                <strong className="block text-slate-900">선택 동의 · 탈퇴 후 3년 보관</strong>
                상담 이력 확인과 분쟁 대응을 위해 견적 내용, 회사·브랜드명, 담당자, 연락처, 이메일을 탈퇴 후 3년간 보관합니다.
                동의하지 않아도 가입과 견적 요청을 할 수 있습니다. 동의는 이 화면에서 바꿀 수 있습니다.
              </span>
            </label>
            <p className="pf-help mb-5">
              정보 이용·보관과 삭제 요청 방법은 <Link className="underline underline-offset-4" href="/privacy/">개인정보 처리방침</Link>에서 확인할 수 있습니다.
            </p>
            {error && <p className="pf-alert mb-5" role="alert">{error}</p>}
            <Button type="submit" block disabled={busy}>{busy ? "저장 중" : "저장하고 계속하기"}</Button>
          </form>
        )}
      </div>
    </Container>
  );
}
