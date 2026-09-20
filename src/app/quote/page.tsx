"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  Chip,
  Container,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import Stepper from "@/components/quote/Stepper";
import OptionGrid from "@/components/quote/OptionGrid";
import {
  BUDGET_RANGES,
  DOSAGE_FORMS,
  EMPTY_DRAFT,
  UNITS,
  clearDraft,
  loadDraft,
  saveDraft,
  savedAgo,
  type Draft,
} from "@/components/quote/draft";
import { getData, type DosageForm, type Ingredient, type Quote } from "@/lib/data";
import { getSession } from "@/lib/auth";
import s from "@/components/quote/quote.module.css";

const STEPS = ["제품유형 · 제형", "수량 · 목표일", "원료 · 예산 · 메모", "검토 · 제출"];

type Errors = Partial<Record<keyof Draft, string>>;

/** 단계별 필수값. 여기 없는 항목은 비워 두고 제출해도 된다. */
function validate(draft: Draft, step: number, needEmail: boolean): Errors {
  const e: Errors = {};

  if (step === 1) {
    if (!draft.productType.trim()) e.productType = "제품 유형을 적어 주세요. 예: 간 건강 정제";
  }
  if (step === 2) {
    const qty = Number(draft.quantity);
    if (!draft.quantity.trim() || !Number.isFinite(qty) || qty < 1) {
      e.quantity = "생산 수량을 1 이상으로 적어 주세요.";
    }
    if (!draft.unit) e.unit = "단위를 골라 주세요.";
    if (!draft.targetDate) e.targetDate = "희망 납품일을 골라 주세요.";
  }
  if (step === 4 && needEmail) {
    if (!draft.email.trim()) e.email = "회신받을 이메일을 적어 주세요.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim()))
      e.email = "이메일 형식을 다시 확인해 주세요.";
  }
  return e;
}

export default function QuotePage() {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [step, setStep] = useState(1);
  const [reached, setReached] = useState(1);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [savedAt, setSavedAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [busy, setBusy] = useState(false);
  /** 데이터랩(「지금 뜨는 원료」)에서 넘어온 원료명. 등록 원료가 아니어도 그대로 싣는다. */
  const [fromSignal, setFromSignal] = useState("");
  const [done, setDone] = useState<Quote | null>(null);
  const restored = useRef(false);

  const needEmail = sessionEmail === null;

  // ── 최초 1회: 임시저장분 복원 · 세션 확인 · 원료 목록 ──
  useEffect(() => {
    let alive = true;

    // 복원·세션·원료를 한 번에 반영한다. 렌더를 세 번 돌리지 않으려는 것이다.
    (async () => {
      const saved = loadDraft();
      const [sess, rows] = await Promise.all([getSession(), getData().listIngredients()]);
      if (!alive) return;

      if (saved) {
        setDraft(saved.draft);
        setSavedAt(saved.savedAt);
      }

      // useSearchParams 대신 주소를 직접 읽는다 — 이 화면은 정적 내보내기라
      // Suspense 경계를 새로 두지 않으려는 것이다(동작은 같다).
      const picked = new URLSearchParams(window.location.search).get("ingredient")?.trim();
      if (picked) {
        setFromSignal(picked);
        setDraft((d) => (d.ingredients.includes(picked)
          ? d
          : { ...d, ingredients: [...d.ingredients, picked] }));
      }
      setSessionEmail(sess?.email ?? null);
      setIngredients(rows.filter((i) => i.isActive));
      restored.current = true;
    })();

    return () => {
      alive = false;
    };
  }, []);

  // ── 입력이 바뀔 때마다 임시저장 ──
  useEffect(() => {
    if (!restored.current || done) return;
    setSavedAt(saveDraft(draft));
  }, [draft, done]);

  // 저장 문구("방금 · 3분 전")를 1분마다 다시 센다.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const set = useCallback(<K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setFormError("");
  }, []);

  /** 제형을 바꾸면 단위 기본값과 원료 후보가 함께 바뀐다. */
  function setDosageForm(value: DosageForm) {
    const spec = DOSAGE_FORMS.find((f) => f.value === value);
    setDraft((d) => ({
      ...d,
      dosageForm: value,
      unit: spec?.unit ?? d.unit,
      // 등록 원료는 제형에 맞는 것만 남기고, 데이터랩에서 가져온 이름은 그대로 둔다.
      ingredients: d.ingredients.filter((name) => {
        const known = ingredients.find((i) => i.name === name);
        return known ? known.dosageForms.includes(value) : true;
      }),
    }));
  }

  /** 등록 원료 목록에 없는데 담겨 있는 이름 = 데이터랩에서 가져온 것 */
  const extraIngredients = useMemo(
    () => draft.ingredients.filter((name) => !ingredients.some((i) => i.name === name)),
    [draft.ingredients, ingredients],
  );

  const ingredientOptions = useMemo(
    () => ingredients.filter((i) => i.dosageForms.includes(draft.dosageForm)),
    [ingredients, draft.dosageForm],
  );

  function goTo(next: number) {
    setStep(next);
    setReached((r) => Math.max(r, next));
    setFormError("");
    window.scrollTo({ top: 0 });
  }

  function onNext() {
    const e = validate(draft, step, needEmail);
    if (Object.keys(e).length > 0) {
      setErrors(e);
      setFormError("표시된 항목을 채우면 다음 단계로 넘어갑니다.");
      return;
    }
    goTo(Math.min(4, step + 1));
  }

  async function onSubmit() {
    // 제출 직전에는 건너뛴 단계까지 전부 다시 본다.
    for (const n of [1, 2, 3, 4]) {
      const e = validate(draft, n, needEmail);
      if (Object.keys(e).length > 0) {
        setErrors(e);
        setFormError(`${n}단계에 빠진 필수 항목이 있습니다. 확인하고 다시 제출해 주세요.`);
        if (n !== step) goTo(n);
        return;
      }
    }

    setBusy(true);
    const quote = await getData().createQuote({
      userEmail: sessionEmail ?? draft.email.trim(),
      productType: draft.productType.trim(),
      dosageForm: draft.dosageForm,
      quantity: Number(draft.quantity),
      unit: draft.unit,
      ingredients: draft.ingredients,
      targetDate: draft.targetDate,
      budgetRange: draft.budgetRange,
      memo: draft.memo.trim(),
    });
    clearDraft();
    setBusy(false);
    setDone(quote);
    window.scrollTo({ top: 0 });
  }

  // ── 제출 완료 ──
  if (done) {
    return (
      <Container>
        <div className={s.done}>
          <div className={s.doneMark} aria-hidden="true">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h1>견적 요청을 접수했습니다</h1>
          <p className="pf-help" style={{ marginTop: 10, fontSize: 15 }}>
            조건은 등록 제조사에 익명으로 전달됩니다. 회신은 {done.userEmail} 으로 받으십니다.
          </p>
          <p className={s.doneId}>
            견적 번호 <b>{done.id}</b>
          </p>
          <div className={s.doneCta}>
            <ButtonLink href="/deal/">거래관리에서 보기</ButtonLink>
            <ButtonLink href={`/match/?form=${encodeURIComponent(done.dosageForm)}`} variant="secondary">
              이 조건으로 제조사 찾기
            </ButtonLink>
          </div>
          <p className={s.noteLine}>견적 금액은 제조사 회신 단계에서 개별 안내됩니다.</p>
        </div>
      </Container>
    );
  }

  const ago = savedAgo(savedAt, now);

  return (
    <Container>
      <div className={s.page}>
        <div className={s.pageHead}>
          <div>
            <span className={s.eyebrow}>Step-by-step Request</span>
            <h1>견적 요청</h1>
            <p className={s.pageSub}>
              네 단계 조건만 넣으면 조건에 맞는 제조사를 추려 드립니다. 입력값은 매칭 결과와
              거래관리로 그대로 이어집니다.
            </p>
          </div>
          <div className={s.headTags}>
            {fromSignal && <Badge tone="signal">데이터랩에서 가져온 원료 · {fromSignal}</Badge>}
            {ago && <Badge tone="neutral">임시저장됨 · {ago}</Badge>}
          </div>
        </div>

        <div className={s.layout}>
          <Card>
            <Stepper steps={STEPS} current={step} reached={reached} onSelect={goTo} />

            <form onSubmit={(e) => e.preventDefault()} noValidate>
              {step === 1 && (
                <>
                  <Input
                    label="제품 유형"
                    required
                    placeholder="예: 간 건강 정제"
                    help="기획 중인 제품을 한 줄로 적어 주세요. 기능성 카테고리와 제형을 함께 적으면 후보가 좁혀집니다."
                    value={draft.productType}
                    error={errors.productType}
                    onChange={(e) => set("productType", e.target.value)}
                  />
                  <OptionGrid
                    name="dosageForm"
                    legend="제형"
                    required
                    options={DOSAGE_FORMS.map((f) => ({
                      value: f.value,
                      label: f.value,
                      sub: f.sub,
                    }))}
                    value={draft.dosageForm}
                    onChange={([v]) => setDosageForm(v as DosageForm)}
                    help="제형을 정하면 단위와 원료 후보가 함께 바뀝니다."
                  />
                </>
              )}

              {step === 2 && (
                <>
                  <div className={s.two}>
                    <Input
                      label="생산 수량"
                      required
                      type="number"
                      min={1}
                      step={1000}
                      inputMode="numeric"
                      help="최소 발주수량은 제조사마다 다릅니다."
                      value={draft.quantity}
                      error={errors.quantity}
                      onChange={(e) => set("quantity", e.target.value)}
                    />
                    <Select
                      label="단위"
                      required
                      value={draft.unit}
                      error={errors.unit}
                      onChange={(e) => set("unit", e.target.value)}
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Input
                    label="희망 납품일"
                    required
                    type="date"
                    help="원료 입고와 포장재 발주까지 넣어 잡으시면 일정이 덜 흔들립니다."
                    value={draft.targetDate}
                    error={errors.targetDate}
                    onChange={(e) => set("targetDate", e.target.value)}
                  />
                </>
              )}

              {step === 3 && (
                <>
                  {extraIngredients.length > 0 && (
                    <div className={s.picked}>
                      <p className={s.pickedLabel}>데이터랩에서 가져온 원료</p>
                      <div className="pf-chips">
                        {extraIngredients.map((name) => (
                          <button
                            key={name}
                            type="button"
                            className="pf-chip pf-chip-selected"
                            aria-pressed="true"
                            onClick={() =>
                              set(
                                "ingredients",
                                draft.ingredients.filter((v) => v !== name),
                              )
                            }
                          >
                            <b>{name}</b>
                            <span aria-hidden="true">×</span>
                            <span className="pf-sr-only">빼기</span>
                          </button>
                        ))}
                      </div>
                      <p className={s.help}>
                        등록 원료 목록에 없는 이름입니다. 이대로 요청에 실어 제조사에 전달합니다.
                      </p>
                    </div>
                  )}

                  {ingredientOptions.length > 0 ? (
                    <OptionGrid
                      name="ingredients"
                      legend="희망 원료 (여러 개 고를 수 있습니다)"
                      multiple
                      row
                      options={ingredientOptions.map((i) => ({
                        value: i.name,
                        label: i.name,
                      }))}
                      value={draft.ingredients}
                      onChange={(v) => set("ingredients", v)}
                      help={`${draft.dosageForm}에 쓸 수 있는 등록 원료입니다. 정하지 않으셨다면 비워 두고 원료 추천을 요청하셔도 됩니다.`}
                    />
                  ) : (
                    <p className={s.help}>{draft.dosageForm}에 등록된 원료가 아직 없습니다.</p>
                  )}

                  <Select
                    label="예산 범위"
                    help="금액은 받지 않습니다. 확정 단계만 알려 주시면 제조사 선별에 씁니다."
                    value={draft.budgetRange}
                    onChange={(e) => set("budgetRange", e.target.value)}
                  >
                    {BUDGET_RANGES.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </Select>

                  <Textarea
                    label="추가 요청사항"
                    placeholder="예: 무카페인, 비건 원료 우선, 기존 제품 리뉴얼 건"
                    value={draft.memo}
                    onChange={(e) => set("memo", e.target.value)}
                  />
                </>
              )}

              {step === 4 && (
                <>
                  <p style={{ fontSize: 15, color: "var(--pf-ink-2)", marginBottom: 16 }}>
                    넣으신 조건입니다. 확인하고 제출하세요.
                  </p>
                  <dl>
                    {(
                      [
                        ["제품 유형", draft.productType || "—"],
                        ["제형", draft.dosageForm],
                        ["생산 수량", `${Number(draft.quantity || 0).toLocaleString("ko-KR")}${draft.unit}`],
                        ["희망 납품일", draft.targetDate || "—"],
                        ["희망 원료", draft.ingredients.join(" · ") || "미정 · 추천 요청"],
                        ["예산 범위", draft.budgetRange],
                        ["추가 요청사항", draft.memo || "—"],
                      ] as [string, string][]
                    ).map(([k, v]) => (
                      <div className={s.summaryRow} key={k}>
                        <dt>{k}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                  </dl>

                  {needEmail && (
                    <div style={{ marginTop: 22 }}>
                      <Input
                        label="회신받을 이메일"
                        required
                        type="email"
                        autoComplete="email"
                        placeholder="name@company.co.kr"
                        help="로그인하지 않고 제출하셔도 됩니다. 이 주소로 진행 상황을 안내합니다."
                        value={draft.email}
                        error={errors.email}
                        onChange={(e) => set("email", e.target.value)}
                      />
                    </div>
                  )}

                  <p className={s.noteLine}>
                    제출한 조건은 등록 제조사에 익명으로 전달됩니다. 기업 정보는 상담 단계에서 직접
                    공유하시면 됩니다.
                  </p>
                </>
              )}

              {formError && (
                <p className="pf-alert" role="alert" style={{ marginTop: 16 }}>
                  {formError}
                </p>
              )}

              <div className={s.formNav}>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={step === 1}
                  onClick={() => goTo(step - 1)}
                >
                  이전
                </Button>
                <div className={s.right}>
                  <span className={s.stepCount}>{step} / 4 단계</span>
                  {step < 4 ? (
                    <Button type="button" onClick={onNext}>
                      다음
                    </Button>
                  ) : (
                    <Button type="button" onClick={onSubmit} disabled={busy}>
                      {busy ? "제출하는 중…" : "견적 요청 제출"}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Card>

          <aside className={s.aside}>
            <div className={s.asideNote}>
              <h2>넣으신 조건</h2>
              <div className="pf-chips">
                <Chip>
                  제형 <b>{draft.dosageForm}</b>
                </Chip>
                <Chip>
                  수량{" "}
                  <b>
                    {Number(draft.quantity || 0).toLocaleString("ko-KR")}
                    {draft.unit}
                  </b>
                </Chip>
                {draft.targetDate && (
                  <Chip>
                    납품일 <b>{draft.targetDate}</b>
                  </Chip>
                )}
                {draft.ingredients.length > 0 && (
                  <Chip>
                    원료 <b>{draft.ingredients.length}종</b>
                  </Chip>
                )}
              </div>
            </div>

            <div className={s.asideNote}>
              <h2>이렇게 진행됩니다</h2>
              <ul>
                <li>조건을 제출하면 등록 제조사를 조건으로 걸러 냅니다.</li>
                <li>일치율 상위 제조사와 대응 가능 여부를 바로 확인합니다.</li>
                <li>제조사를 고르면 거래관리에서 진행 상황을 이어서 봅니다.</li>
                <li>견적 금액은 제조사 회신 단계에서 개별 안내됩니다.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </Container>
  );
}
