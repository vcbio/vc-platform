"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { styles as s } from "@/components/deal/shared";

/** 관리자 화면 공통 조각 — 하위 메뉴, 삭제 확인 창, 목록 새로고침. */

const MENU = [
  { href: "/admin/", label: "요약" },
  { href: "/admin/quotes/", label: "견적 접수" },
  { href: "/admin/manufacturers/", label: "제조사" },
  { href: "/admin/ingredients/", label: "원료" },
];  // as const 를 쓰지 않는다 — href 가 리터럴로 좁혀지면 타입드 라우트와 어긋난다

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className={s.tabs} aria-label="관리자 메뉴">
      {MENU.map((m) => (
        <Link
          key={m.href}
          href={m.href}
          className={s.tab}
          aria-current={pathname.replace(/\/?$/, "/") === m.href ? "page" : undefined}
        >
          {m.label}
        </Link>
      ))}
    </nav>
  );
}

/**
 * 삭제 확인 창. 브라우저가 가진 <dialog> 를 그대로 쓴다 —
 * Esc 닫기·포커스 가두기·배경 비활성이 공짜로 따라온다.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "삭제",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog ref={ref} className={s.dialog} onCancel={onCancel} onClose={onCancel}>
      <div className={s.dialogBody}>
        <h2>{title}</h2>
        <p>{message}</p>
      </div>
      <div className={s.dialogFoot}>
        <button type="button" className="pf-btn pf-btn-secondary pf-btn-sm" onClick={onCancel}>
          취소
        </button>
        <button
          type="button"
          className={`pf-btn pf-btn-primary pf-btn-sm ${s.danger}`}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

/**
 * 목록을 불러오고, 바뀔 때마다 다시 불러오는 자리.
 * `load` 는 부르는 쪽에서 useCallback 으로 고정해 넘긴다(안 그러면 매 렌더마다 다시 부른다).
 */
export function useRows<T>(load: () => Promise<T[]>) {
  const [rows, setRows] = useState<T[] | null>(null);

  const reload = useCallback(() => load().then(setRows), [load]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { rows, reload };
}

/** 여러 값을 고르는 칸(제형 등). 체크박스라 키보드로도 다룰 수 있다. */
export function CheckGroup<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: readonly T[];
  value: T[];
  onChange: (next: T[]) => void;
}) {
  return (
    <fieldset className={s.checkRow} style={{ display: "block" }}>
      <legend className="pf-label" style={{ marginBottom: 8 }}>
        {legend}
      </legend>
      <div className="pf-chips">
        {options.map((o) => {
          const on = value.includes(o);
          return (
            <label key={o} className={`pf-chip ${on ? "pf-chip-selected" : ""}`.trim()}>
              <input
                type="checkbox"
                checked={on}
                onChange={() => onChange(on ? value.filter((v) => v !== o) : [...value, o])}
                style={{ width: 16, height: 16, accentColor: "var(--pf-blue-strong)" }}
              />
              {o}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
