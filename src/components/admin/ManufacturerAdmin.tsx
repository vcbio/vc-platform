"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Container, Input, Select } from "@/components/ui";
import { getData, type DosageForm, type Manufacturer } from "@/lib/data";
import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Empty, Note, PageHead, TableWrap, styles as s } from "@/components/deal/shared";
import { AdminNav, CheckGroup, ConfirmDialog, useRows } from "./parts";

/**
 * 제조사 등록·수정·삭제.
 * ⚠️ 돈에 관한 칸은 일체 두지 않는다. 공장 실명 대신 익명 표시명만 받는다.
 */

const FORMS: DosageForm[] = [
  "정제",
  "캡슐",
  "경질캡슐",
  "연질캡슐",
  "분말",
  "분말스틱",
  "과립",
  "퀵멜트",
  "액상",
  "액상스틱",
  "젤리",
  "환",
  "스낵",
];

const PRIMARY_PARTNER_MARKER = "주력 거래처(대표 지정, 2026-09-25)";

type PrivateManufacturer = {
  public_id: string;
  real_name: string;
  permit_ids: string[];
  forms_detail: string | null;
  equipment_detail: string | null;
  product_examples: string | null;
  certifications_claim: string | null;
  source_urls: string[];
  caveat: string | null;
};

function PrivateManufacturerDetails({ data }: { data: PrivateManufacturer }) {
  return (
    <details>
      <summary>
        {data.real_name}{" "}
        {data.caveat?.includes(PRIMARY_PARTNER_MARKER) && (
          <Badge tone="info">주력 거래처</Badge>
        )}
      </summary>
      <p>인허가번호: {data.permit_ids.join(" · ") || "미확인"}</p>
      <p>제형: {data.forms_detail || "미확인"}</p>
      <p>설비: {data.equipment_detail || "미확인"}</p>
      <p>대표 제품: {data.product_examples || "미확인"}</p>
      <p>인증 표기: {data.certifications_claim || "미확인"}</p>
      <p>주의: {data.caveat || "현행 생산 여부 확인 필요"}</p>
      {data.source_urls.map((url) =>
        url.startsWith("https://") ? (
          <a key={url} href={url} target="_blank" rel="noopener noreferrer">출처 ↗ </a>
        ) : null,
      )}
    </details>
  );
}

async function loadPrivateManufacturers(): Promise<PrivateManufacturer[] | null> {
  if (!supabase || !(await getSession())?.isAdmin) return null;
  const { data, error } = await supabase
    .from("vcp_manufacturer_private")
    .select("public_id,real_name,permit_ids,forms_detail,equipment_detail,product_examples,certifications_claim,source_urls,caveat");
  return error ? null : (data ?? []) as PrivateManufacturer[];
}

type Draft = {
  displayName: string;
  region: string;
  certifications: string;
  dosageForms: DosageForm[];
  equipmentSummary: string;
  moqRange: string;
  leadTimeWeeks: string;
  isActive: string;
};

const EMPTY: Draft = {
  displayName: "",
  region: "",
  certifications: "",
  dosageForms: [],
  equipmentSummary: "",
  moqRange: "",
  leadTimeWeeks: "",
  isActive: "노출",
};

const toDraft = (m: Manufacturer): Draft => ({
  displayName: m.displayName,
  region: m.region,
  certifications: m.certifications.join(", "),
  dosageForms: m.dosageForms,
  equipmentSummary: m.equipmentSummary ?? "",
  moqRange: m.moqRange,
  leadTimeWeeks: m.leadTimeWeeks == null ? "" : String(m.leadTimeWeeks),
  isActive: m.isActive ? "노출" : "숨김",
});

const fromDraft = (d: Draft): Omit<Manufacturer, "id"> => ({
  displayName: d.displayName.trim(),
  region: d.region.trim(),
  certifications: d.certifications
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean),
  dosageForms: d.dosageForms,
  equipmentSummary: d.equipmentSummary.trim(),
  moqRange: d.moqRange.trim(),
  leadTimeWeeks: d.leadTimeWeeks.trim() === "" ? null : Number(d.leadTimeWeeks),
  isActive: d.isActive === "노출",
});

export default function ManufacturerAdmin() {
  const load = useCallback(() => getData().listManufacturers(), []);
  const { rows, reload } = useRows<Manufacturer>(load);

  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [toRemove, setToRemove] = useState<Manufacturer | null>(null);
  const [privateRows, setPrivateRows] = useState<Record<string, PrivateManufacturer>>({});
  const [privateError, setPrivateError] = useState(false);

  useEffect(() => {
    let alive = true;
    const authListener = supabase?.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        alive = false;
        setPrivateRows({});
        setPrivateError(true);
      }
    });
    loadPrivateManufacturers().then((privateData) => {
      if (!alive) return;
      setPrivateRows(Object.fromEntries((privateData ?? []).map((row) => [row.public_id, row])));
      setPrivateError(privateData === null);
    });
    return () => {
      alive = false;
      authListener?.data.subscription.unsubscribe();
    };
  }, []);

  const set = (k: keyof Draft, v: string | DosageForm[]) =>
    setDraft((d) => ({ ...d, [k]: v }) as Draft);

  function openNew() {
    setDraft(EMPTY);
    setError(null);
    setEditing("new");
  }

  function openEdit(m: Manufacturer) {
    setDraft(toDraft(m));
    setError(null);
    setEditing(m.id);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.displayName.trim()) return setError("표시명을 적어 주세요.");
    if (draft.dosageForms.length === 0) return setError("가능한 제형을 하나 이상 골라 주세요.");
    if (draft.leadTimeWeeks.trim() && (!Number.isFinite(Number(draft.leadTimeWeeks)) || Number(draft.leadTimeWeeks) < 0))
      return setError("납기는 0 이상의 숫자로 적어 주세요.");
    const input = fromDraft(draft);
    if (editing === "new") await getData().createManufacturer(input);
    else if (editing) await getData().updateManufacturer(editing, input);
    await reload();
    setEditing(null);
  }

  async function remove() {
    if (!toRemove) return;
    await getData().removeManufacturer(toRemove.id);
    setToRemove(null);
    await reload();
  }

  return (
    <Container>
      <div className={s.page}>
        <PageHead
          eyebrow="Admin"
          title="제조사"
          sub="공개 화면은 익명입니다. 실제 업체명과 상세 근거는 관리자에게만 보입니다."
          right={
            <Button size="sm" onClick={openNew}>
              새 제조사 등록
            </Button>
          }
        />
        <AdminNav />

        {editing && (
          <Card
            title={editing === "new" ? "새 제조사" : "제조사 수정"}
            className="mb-5"
            action={<span className="pf-help">가격 항목은 받지 않습니다</span>}
          >
            <form onSubmit={save} noValidate>
              <div className={s.formGrid}>
                <Input
                  label="표시명"
                  required
                  value={draft.displayName}
                  placeholder="A제조 (충북·GMP)"
                  help="실명 대신 지역과 인증이 드러나는 이름을 씁니다."
                  onChange={(e) => set("displayName", e.target.value)}
                />
                <Input
                  label="지역"
                  value={draft.region}
                  placeholder="충북"
                  onChange={(e) => set("region", e.target.value)}
                />
                <Input
                  label="보유 인증"
                  value={draft.certifications}
                  placeholder="GMP, HACCP, ISO 22000"
                  help="쉼표로 나눠 적습니다."
                  onChange={(e) => set("certifications", e.target.value)}
                />
                <Input
                  label="공개 공정 요약"
                  value={draft.equipmentSummary}
                  placeholder="예: 혼합·타정·병 포장"
                  onChange={(e) => set("equipmentSummary", e.target.value)}
                />
                <Input
                  label="최소 발주 수량"
                  value={draft.moqRange}
                  placeholder="10,000 ~ 50,000정"
                  onChange={(e) => set("moqRange", e.target.value)}
                />
                <Input
                  label="리드타임 (주)"
                  type="number"
                  min={0}
                  value={draft.leadTimeWeeks}
                  help="확인된 경우에만 적습니다."
                  onChange={(e) => set("leadTimeWeeks", e.target.value)}
                />
                <Select
                  label="목록 노출"
                  value={draft.isActive}
                  onChange={(e) => set("isActive", e.target.value)}
                >
                  <option value="노출">노출</option>
                  <option value="숨김">숨김</option>
                </Select>
              </div>

              <CheckGroup
                legend="가능한 제형"
                options={FORMS}
                value={draft.dosageForms}
                onChange={(v) => set("dosageForms", v)}
              />

              {error && (
                <p className="pf-alert" role="alert" style={{ marginBottom: 16 }}>
                  {error}
                </p>
              )}

              <div className={s.rowActions} style={{ justifyContent: "flex-start" }}>
                <Button type="submit" size="sm">
                  저장
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setEditing(null)}
                >
                  취소
                </Button>
              </div>
            </form>
          </Card>
        )}

        {!rows ? (
          <p className="pf-help">불러오는 중입니다.</p>
        ) : (
          <Card
            title="등록 제조사"
            padded={false}
            action={<span className="pf-help">전체 {rows.length}곳</span>}
          >
            {rows.length === 0 ? (
              <Empty title="등록된 제조사가 없습니다" />
            ) : (
              <>
                {privateError && <p className="pf-help">실제 업체 정보는 아직 연결되지 않았습니다.</p>}
                <TableWrap>
                  <thead>
                    <tr>
                      <th>표시명</th>
                      <th>실제 업체 · 상세 근거</th>
                      <th>지역</th>
                      <th>인증</th>
                      <th>제형</th>
                      <th>최소 발주 수량</th>
                      <th className={s.num}>리드타임</th>
                      <th>목록 노출</th>
                      <th aria-label="관리" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <b>{m.displayName}</b>
                        </td>
                        <td>
                          {privateRows[m.id] ? (
                            <PrivateManufacturerDetails data={privateRows[m.id]} />
                          ) : "연결 대기"}
                        </td>
                        <td>{m.region}</td>
                        <td>{m.certifications.join(" · ") || "확인 중"}</td>
                        <td>{m.dosageForms.join(" · ")}</td>
                        <td>{m.moqRange || "확인 필요"}</td>
                        <td className={s.num}>{m.leadTimeWeeks == null ? "확인 필요" : `${m.leadTimeWeeks}주`}</td>
                        <td>
                          <Badge tone={m.isActive ? "ok" : "neutral"}>
                            {m.isActive ? "노출" : "숨김"}
                          </Badge>
                        </td>
                        <td>
                          <div className={s.rowActions}>
                            <button
                              type="button"
                              className="pf-btn pf-btn-secondary pf-btn-sm"
                              onClick={() => openEdit(m)}
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              className="pf-btn pf-btn-ghost pf-btn-sm"
                              onClick={() => setToRemove(m)}
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrap>
                <div className="pf-card-body" style={{ paddingTop: 0 }}>
                  <Note>
                    목록을 숨기면 매칭 결과에서 빠집니다. 실제 공장 가동 상태와는 다른 값입니다.
                  </Note>
                </div>
              </>
            )}
          </Card>
        )}

        {rows && Object.values(privateRows).some((data) =>
          data.caveat?.includes(PRIMARY_PARTNER_MARKER) && !rows.some((m) => m.id === data.public_id)
        ) && (
          <Card title="공개 목록에 없는 주력 거래처">
            <p className="pf-help">이 브라우저의 제조사 목록에 연결되지 않아 매칭에는 표시되지 않습니다.</p>
            {Object.values(privateRows)
              .filter((data) => data.caveat?.includes(PRIMARY_PARTNER_MARKER) &&
                !rows.some((m) => m.id === data.public_id))
              .map((data) => <PrivateManufacturerDetails key={data.public_id} data={data} />)}
          </Card>
        )}

        <ConfirmDialog
          open={toRemove !== null}
          title="제조사를 삭제할까요?"
          message={`${toRemove?.displayName ?? ""} 를 목록에서 지웁니다. 지운 뒤에는 되돌릴 수 없습니다.`}
          onConfirm={remove}
          onCancel={() => setToRemove(null)}
        />
      </div>
    </Container>
  );
}
