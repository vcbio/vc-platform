"use client";

import { useCallback, useState } from "react";
import { Badge, Button, Card, Container, Input, Select } from "@/components/ui";
import { getData, type DosageForm, type Ingredient } from "@/lib/data";
import { Empty, Note, PageHead, TableWrap, styles as s } from "@/components/deal/shared";
import { AdminNav, CheckGroup, ConfirmDialog, useRows } from "./parts";

/**
 * 원료 등록·수정·삭제.
 * ⚠️ 돈에 관한 칸은 두지 않는다. 기능성은 고시 카테고리명까지만 적는다.
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
  name: string;
  category: string;
  origin: string;
  spec: string;
  dosageForms: DosageForm[];
  isActive: string;
};

const EMPTY: Draft = {
  name: "",
  category: "",
  origin: "",
  spec: "",
  dosageForms: [],
  isActive: "취급",
};

const toDraft = (i: Ingredient): Draft => ({
  name: i.name,
  category: i.category,
  origin: i.origin,
  spec: i.spec,
  dosageForms: i.dosageForms,
  isActive: i.isActive ? "취급" : "중지",
});

const fromDraft = (d: Draft): Omit<Ingredient, "id"> => ({
  name: d.name.trim(),
  category: d.category.trim(),
  origin: d.origin.trim(),
  spec: d.spec.trim(),
  dosageForms: d.dosageForms,
  isActive: d.isActive === "취급",
});

export default function IngredientAdmin() {
  const load = useCallback(() => getData().listIngredients(), []);
  const { rows, reload } = useRows<Ingredient>(load);

  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [toRemove, setToRemove] = useState<Ingredient | null>(null);

  const set = (k: keyof Draft, v: string | DosageForm[]) =>
    setDraft((d) => ({ ...d, [k]: v }) as Draft);

  function openNew() {
    setDraft(EMPTY);
    setError(null);
    setEditing("new");
  }

  function openEdit(i: Ingredient) {
    setDraft(toDraft(i));
    setError(null);
    setEditing(i.id);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) return setError("원료명을 적어 주세요.");
    if (draft.dosageForms.length === 0) return setError("적용 가능한 제형을 하나 이상 골라 주세요.");
    const input = fromDraft(draft);
    if (editing === "new") await getData().createIngredient(input);
    else if (editing) await getData().updateIngredient(editing, input);
    await reload();
    setEditing(null);
  }

  async function remove() {
    if (!toRemove) return;
    await getData().removeIngredient(toRemove.id);
    setToRemove(null);
    await reload();
  }

  return (
    <Container>
      <div className={s.page}>
        <PageHead
          eyebrow="Admin"
          title="원료"
          sub="견적·매칭 화면에서 고르는 원료 목록을 관리합니다. 기능성은 고시된 카테고리 이름까지만 적습니다."
          right={
            <Button size="sm" onClick={openNew}>
              새 원료 등록
            </Button>
          }
        />
        <AdminNav />

        {editing && (
          <Card
            title={editing === "new" ? "새 원료" : "원료 수정"}
            className="mb-5"
            action={<span className="pf-help">가격 항목은 받지 않습니다</span>}
          >
            <form onSubmit={save} noValidate>
              <div className={s.formGrid}>
                <Input
                  label="원료명"
                  required
                  value={draft.name}
                  placeholder="밀크씨슬 추출물"
                  onChange={(e) => set("name", e.target.value)}
                />
                <Input
                  label="기능성 구분"
                  value={draft.category}
                  placeholder="간 건강"
                  help="고시된 기능성 카테고리 이름을 그대로 씁니다."
                  onChange={(e) => set("category", e.target.value)}
                />
                <Input
                  label="원산지"
                  value={draft.origin}
                  placeholder="독일"
                  onChange={(e) => set("origin", e.target.value)}
                />
                <Input
                  label="규격"
                  value={draft.spec}
                  placeholder="실리마린 80%"
                  onChange={(e) => set("spec", e.target.value)}
                />
                <Select
                  label="취급 여부"
                  value={draft.isActive}
                  onChange={(e) => set("isActive", e.target.value)}
                >
                  <option value="취급">취급</option>
                  <option value="중지">중지</option>
                </Select>
              </div>

              <CheckGroup
                legend="적용 가능한 제형"
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
            title="등록 원료"
            padded={false}
            action={<span className="pf-help">전체 {rows.length}건</span>}
          >
            {rows.length === 0 ? (
              <Empty title="등록된 원료가 없습니다" />
            ) : (
              <>
                <TableWrap>
                  <thead>
                    <tr>
                      <th>원료명</th>
                      <th>기능성 구분</th>
                      <th>원산지</th>
                      <th>규격</th>
                      <th>제형</th>
                      <th>취급</th>
                      <th aria-label="관리" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((i) => (
                      <tr key={i.id}>
                        <td>
                          <b>{i.name}</b>
                        </td>
                        <td>{i.category}</td>
                        <td>{i.origin}</td>
                        <td>{i.spec}</td>
                        <td>{i.dosageForms.join(" · ")}</td>
                        <td>
                          <Badge tone={i.isActive ? "ok" : "neutral"}>
                            {i.isActive ? "취급" : "중지"}
                          </Badge>
                        </td>
                        <td>
                          <div className={s.rowActions}>
                            <button
                              type="button"
                              className="pf-btn pf-btn-secondary pf-btn-sm"
                              onClick={() => openEdit(i)}
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              className="pf-btn pf-btn-ghost pf-btn-sm"
                              onClick={() => setToRemove(i)}
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
                    취급을 중지로 두면 견적 화면의 선택지에서 빠집니다. 규격이 다른 원료는 같은
                    이름이라도 따로 등록합니다.
                  </Note>
                </div>
              </>
            )}
          </Card>
        )}

        <ConfirmDialog
          open={toRemove !== null}
          title="원료를 삭제할까요?"
          message={`${toRemove?.name ?? ""} 를 목록에서 지웁니다. 지운 뒤에는 되돌릴 수 없습니다.`}
          onConfirm={remove}
          onCancel={() => setToRemove(null)}
        />
      </div>
    </Container>
  );
}
