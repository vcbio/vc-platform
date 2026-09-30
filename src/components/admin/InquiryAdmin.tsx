"use client";

import { useCallback, useState } from "react";
import { Container, Card } from "@/components/ui";
import { AdminNav, useRows } from "./parts";
import { Empty, PageHead, TableWrap, styles as s } from "@/components/deal/shared";
import { supabase } from "@/lib/supabase";

type Inquiry = {
  id: string;
  kind: "quick_quote" | "manufacturer_application";
  ingredient: string | null;
  dosage_form: string | null;
  quantity: string | null;
  company_name: string | null;
  region: string | null;
  certifications: string | null;
  dosage_forms: string | null;
  contact: string;
  created_at: string;
  purge_after: string;
};

export default function InquiryAdmin() {
  const [loadError, setLoadError] = useState("");
  const load = useCallback(async () => {
    if (!supabase) {
      setLoadError("접수 서버가 연결되지 않았습니다.");
      return [];
    }
    const { data, error } = await supabase.rpc("vcp_list_public_inquiries");
    if (error) {
      setLoadError("관리자 접수함을 불러오지 못했습니다. 권한과 서버 설정을 확인해 주세요.");
      return [];
    }
    setLoadError("");
    return (data ?? []) as Inquiry[];
  }, []);
  const { rows } = useRows<Inquiry>(load);

  return (
    <Container>
      <div className={s.page}>
        <PageHead eyebrow="Admin" title="비회원 접수" sub="간편 문의와 제조사 입점 신청을 관리자만 읽습니다. 공개 목록에는 표시되지 않습니다." />
        <AdminNav />
        {loadError ? <p className="pf-alert" role="alert">{loadError}</p> : !rows ? (
          <p className="pf-help">불러오는 중입니다.</p>
        ) : (
          <Card title="접수 목록" padded={false} action={<span className="pf-help">전체 {rows.length}건</span>}>
            {rows.length === 0 ? <Empty title="접수된 문의가 없습니다" /> : (
              <TableWrap>
                <thead><tr><th>접수일</th><th>구분</th><th>회사·원료</th><th>지역·제형</th><th>수량·인증</th><th>연락처</th><th>보관 기한</th></tr></thead>
                <tbody>{rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.created_at.slice(0, 10)}</td>
                    <td>{row.kind === "quick_quote" ? "간편 문의" : "입점 신청"}</td>
                    <td>{row.ingredient || row.company_name}</td>
                    <td>{row.dosage_form || `${row.region} · ${row.dosage_forms}`}</td>
                    <td>{row.quantity || row.certifications}</td>
                    <td>{row.contact}</td>
                    <td>{row.purge_after.slice(0, 10)}</td>
                  </tr>
                ))}</tbody>
              </TableWrap>
            )}
          </Card>
        )}
      </div>
    </Container>
  );
}
