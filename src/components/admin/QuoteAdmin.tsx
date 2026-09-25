"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Card, Container, type BadgeTone } from "@/components/ui";
import { getData, type Quote, type QuoteStatus } from "@/lib/data";
import { deleteArchivedCustomerProfile, saveQuoteReview } from "@/lib/data/remoteQuotes";
import { supabase } from "@/lib/supabase";
import { Empty, KV, Note, PageHead, TableWrap, styles as s } from "@/components/deal/shared";
import { AdminNav, useRows } from "./parts";

const STATUSES: QuoteStatus[] = ["접수", "검토중", "회신완료", "종료"];

const TONE: Record<QuoteStatus, BadgeTone> = {
  접수: "info",
  검토중: "warn",
  회신완료: "ok",
  종료: "neutral",
};

type Partner = { public_id: string; real_name: string };

function ReviewEditor({ quote, partners, onSaved }: { quote: Quote; partners: Partner[]; onSaved: () => Promise<void> }) {
  const [selected, setSelected] = useState(quote.assignedPartnerIds ?? []);
  const [note, setNote] = useState(quote.internalNote ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    setError("");
    try {
      await saveQuoteReview(quote.id, selected, note.trim());
      await onSaved();
      setSaved(true);
    } catch {
      setError("내부 검토 내용을 저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={s.stack}>
      <fieldset>
        <legend>검토할 제조사</legend>
        {partners.map((partner) => (
          <label key={partner.public_id} style={{ display: "block", marginTop: 8 }}>
            <input type="checkbox" checked={selected.includes(partner.public_id)}
              onChange={() => setSelected((old) => old.includes(partner.public_id)
                ? old.filter((id) => id !== partner.public_id) : [...old, partner.public_id])} />{" "}
            {partner.real_name}
          </label>
        ))}
      </fieldset>
      <label htmlFor={`review-${quote.id}`}>내부 검토 메모</label>
      <textarea id={`review-${quote.id}`} className="pf-input" rows={3} maxLength={3000}
        value={note} onChange={(e) => setNote(e.target.value)} />
      <Note>여기에 고른 제조사는 내부 검토 후보입니다. 견적 내용이 자동 발송되지 않습니다.</Note>
      {error && <p className="pf-alert" role="alert">{error}</p>}
      {saved && <p className="pf-help" role="status">내부 검토 내용을 저장했습니다.</p>}
      <button type="button" className="pf-btn pf-btn-secondary pf-btn-sm" disabled={busy} onClick={save}>
        {busy ? "저장 중" : "검토 내용 저장"}
      </button>
    </div>
  );
}

/** 견적 접수 목록 — 상태만 바꾼다. 내용 수정은 요청자가 한다. */
export default function QuoteAdmin() {
  const [loadError, setLoadError] = useState(false);
  const load = useCallback(async () => {
    try { setLoadError(false); return await getData().listQuotes(); }
    catch { setLoadError(true); return []; }
  }, []);
  const { rows, reload } = useRows<Quote>(load);
  const [saved, setSaved] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [partners, setPartners] = useState<Partner[] | null>(supabase ? null : []);
  const [partnerError, setPartnerError] = useState(!supabase);

  useEffect(() => {
    let alive = true;
    if (!supabase) return;
    supabase.from("vcp_manufacturer_private").select("public_id,real_name").then(({ data, error }) => {
      if (!alive) return;
      setPartnerError(Boolean(error));
      setPartners(error ? [] : (data ?? []) as Partner[]);
    });
    return () => { alive = false; };
  }, []);

  const picked = rows?.find((q) => q.id === selectedId) ?? rows?.[0] ?? null;

  async function change(id: string, status: QuoteStatus) {
    try {
      await getData().updateQuote(id, { status });
      await reload();
      setSaved(`${id} 상태를 ${status}(으)로 바꿨습니다.`);
    } catch {
      setSaved("상태를 저장하지 못했습니다. 다시 시도해 주세요.");
    }
  }

  async function removeArchivedCustomer(quote: Quote) {
    if (!quote.customer?.withdrawnAt) return;
    const typed = window.prompt(
      `삭제 요청을 확인한 뒤 진행하세요. 이 고객의 보관 정보와 견적을 모두 삭제합니다. 확인하려면 ${quote.userEmail} 을(를) 입력하세요.`,
    );
    if (typed?.trim() !== quote.userEmail) return;
    setDeleting(true);
    try {
      await deleteArchivedCustomerProfile(quote.customer.profileId);
      setSelectedId(null);
      await reload();
      setSaved("탈퇴 고객의 보관 정보와 연결된 견적을 삭제했습니다.");
    } catch {
      setSaved("보관 정보를 삭제하지 못했습니다. 권한과 서버 상태를 확인해 주세요.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Container>
      <div className={s.page}>
        <PageHead
          eyebrow="Admin"
          title="견적 접수"
          sub="고객 의뢰를 검토하고 제조사 후보와 진행 상태를 내부에서 관리합니다. 제조사로 자동 전송되지 않습니다."
        />
        <AdminNav />

        {saved && (
          <p className="pf-help" role="status" aria-live="polite" style={{ marginBottom: 12 }}>
            {saved}
          </p>
        )}

        {loadError ? (
          <p className="pf-alert" role="alert">서버의 견적을 불러오지 못했습니다. 새로고침 후 다시 확인해 주세요.</p>
        ) : !rows ? (
          <p className="pf-help">불러오는 중입니다.</p>
        ) : (
          <Card
            title="접수 목록"
            padded={false}
            action={<span className="pf-help">전체 {rows.length}건</span>}
          >
            {rows.length === 0 ? (
              <Empty title="접수된 견적이 없습니다" />
            ) : (
              <>
                <TableWrap>
                  <thead>
                    <tr>
                      <th>접수일</th>
                      <th>견적 번호</th>
                      <th>회사 · 브랜드</th>
                      <th>제품 유형</th>
                      <th>제형</th>
                      <th className={s.num}>수량</th>
                      <th>희망 납기</th>
                      <th>현재 상태</th>
                      <th>상태 변경</th>
                      <th>상세</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...rows]
                      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                      .map((q) => (
                        <tr key={q.id}>
                          <td className={s.nowrap}>{q.createdAt.slice(0, 10)}</td>
                          <td className={s.nowrap}>
                            <b>{q.id}</b>
                          </td>
                          <td>{q.customer ? `${q.customer.companyName} · ${q.customer.brandName}` : q.userEmail}</td>
                          <td>{q.productType}</td>
                          <td>{q.dosageForm}</td>
                          <td className={s.num}>
                            {q.quantity.toLocaleString("ko-KR")}
                            {q.unit}
                          </td>
                          <td className={s.nowrap}>{q.targetDate}</td>
                          <td>
                            <Badge tone={TONE[q.status]}>{q.status}</Badge>
                          </td>
                          <td>
                            <select
                              className="pf-select"
                              style={{ height: 44, width: 132 }}
                              aria-label={`${q.id} 상태 변경`}
                              value={q.status}
                              onChange={(e) => change(q.id, e.target.value as QuoteStatus)}
                            >
                              {STATUSES.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <button type="button" className="pf-btn pf-btn-secondary pf-btn-sm"
                              aria-pressed={picked?.id === q.id} onClick={() => setSelectedId(q.id)}>
                              보기
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </TableWrap>
                <div className="pf-card-body" style={{ paddingTop: 0 }}>
                  <Note>
                    상태를 고르면 곧바로 저장합니다. 되돌리려면 이전 상태를 다시 고르면 됩니다.
                  </Note>
                </div>
              </>
            )}
          </Card>
        )}

        {picked && !loadError && (
          <Card title="선택한 견적 상세">
            <dl>
              <KV label="견적 번호">{picked.id}</KV>
              <KV label="회사 · 브랜드">{picked.customer
                ? `${picked.customer.companyName} · ${picked.customer.brandName}` : "고객 정보 확인 필요"}</KV>
              <KV label="담당자 · 연락처">{picked.customer
                ? `${picked.customer.contactName} · ${picked.customer.contactPhone}` : "고객 정보 확인 필요"}</KV>
              <KV label="회신 이메일">{picked.userEmail}</KV>
              {picked.customer?.withdrawnAt && (
                <KV label="탈퇴 후 보관 만료일">{picked.customer.purgeAt?.slice(0, 10) ?? "확인 필요"}</KV>
              )}
              <KV label="제품 · 제형">{picked.productType} · {picked.dosageForm}</KV>
              <KV label="수량 · 납품 희망일">{picked.quantity.toLocaleString("ko-KR")}{picked.unit} · {picked.targetDate}</KV>
              <KV label="희망 원료">{picked.ingredients.join(" · ") || "미정"}</KV>
              <KV label="예산 단계">{picked.budgetRange}</KV>
              <KV label="추가 요청">{picked.memo || "없음"}</KV>
            </dl>
            {picked.customer?.withdrawnAt && (
              <div className={s.stack}>
                <Note>고객의 철회·삭제 요청을 확인한 뒤에만 사용하세요. 삭제하면 이 고객의 보관 정보와 견적이 함께 지워집니다.</Note>
                <button type="button" className="pf-btn pf-btn-secondary pf-btn-sm" disabled={deleting}
                  onClick={() => removeArchivedCustomer(picked)}>
                  {deleting ? "삭제 중" : "탈퇴 고객 보관 정보 삭제"}
                </button>
              </div>
            )}
            {partnerError ? <p className="pf-alert" role="alert">제조사 정보를 불러오지 못했습니다. 배분 후보는 저장할 수 없습니다.</p>
              : partners === null ? <p className="pf-help">제조사 후보를 불러오는 중입니다.</p>
              : <ReviewEditor key={picked.id} quote={picked} partners={partners} onSaved={reload} />}
          </Card>
        )}
      </div>
    </Container>
  );
}
