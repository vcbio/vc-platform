"use client";

import { useCallback, useState } from "react";
import { Badge, Button, Card, Container, Input, Select } from "@/components/ui";
import { getData, type DosageForm, type Manufacturer } from "@/lib/data";
import { Empty, Note, PageHead, TableWrap, styles as s } from "@/components/deal/shared";
import { AdminNav, CheckGroup, ConfirmDialog, useRows } from "./parts";

/**
 * 제조사 등록·수정·삭제.
 * ⚠️ 돈에 관한 칸은 일체 두지 않는다. 공장 실명 대신 익명 표시명만 받는다.
 */

const FORMS: DosageForm[] = [
  "정제",
  "경질캡슐",
  "연질캡슐",
  "분말스틱",
  "액상스틱",
  "젤리",
  "환",
];

type Draft = {
  displayName: string;
  region: string;
  certifications: string;
  dosageForms: DosageForm[];
  moqRange: string;
  leadTimeWeeks: string;
  isActive: string;
};

const EMPTY: Draft = {
  displayName: "",
  region: "",
  certifications: "",
  dosageForms: [],
  moqRange: "",
  leadTimeWeeks: "4",
  isActive: "가동",
};

const toDraft = (m: Manufacturer): Draft => ({
  displayName: m.displayName,
  region: m.region,
  certifications: m.certifications.join(", "),
  dosageForms: m.dosageForms,
  moqRange: m.moqRange,
  leadTimeWeeks: String(m.leadTimeWeeks),
  isActive: m.isActive ? "가동" : "중지",
});

const fromDraft = (d: Draft): Omit<Manufacturer, "id"> => ({
  displayName: d.displayName.trim(),
  region: d.region.trim(),
  certifications: d.certifications
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean),
  dosageForms: d.dosageForms,
  moqRange: d.moqRange.trim(),
  leadTimeWeeks: Number(d.leadTimeWeeks) || 0,
  isActive: d.isActive === "가동",
});

export default function ManufacturerAdmin() {
  const load = useCallback(() => getData().listManufacturers(), []);
  const { rows, reload } = useRows<Manufacturer>(load);

  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [toRemove, setToRemove] = useState<Manufacturer | null>(null);

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
          sub="매칭에 쓰는 제조사 정보를 관리합니다. 공장 실명은 넣지 않고 지역·인증이 드러나는 표시명만 씁니다."
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
                  onChange={(e) => set("leadTimeWeeks", e.target.value)}
                />
                <Select
                  label="가동 여부"
                  value={draft.isActive}
                  onChange={(e) => set("isActive", e.target.value)}
                >
                  <option value="가동">가동</option>
                  <option value="중지">중지</option>
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
                <TableWrap>
                  <thead>
                    <tr>
                      <th>표시명</th>
                      <th>지역</th>
                      <th>인증</th>
                      <th>제형</th>
                      <th>최소 발주 수량</th>
                      <th className={s.num}>리드타임</th>
                      <th>가동</th>
                      <th aria-label="관리" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <b>{m.displayName}</b>
                        </td>
                        <td>{m.region}</td>
                        <td>{m.certifications.join(" · ")}</td>
                        <td>{m.dosageForms.join(" · ")}</td>
                        <td>{m.moqRange}</td>
                        <td className={s.num}>{m.leadTimeWeeks}주</td>
                        <td>
                          <Badge tone={m.isActive ? "ok" : "neutral"}>
                            {m.isActive ? "가동" : "중지"}
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
                    가동을 중지로 두면 매칭 결과에서 빠집니다. 거래 기록이 있는 곳은 삭제 대신
                    중지를 권합니다.
                  </Note>
                </div>
              </>
            )}
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
