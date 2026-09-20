"use client";

import s from "./quote.module.css";

export type Option = { value: string; label: string; sub?: string };

/**
 * 타일형 선택지. 라디오/체크박스를 눈에 보이는 카드로 감싼 것이라 키보드·스크린리더는
 * 그대로 원래 입력을 쓴다(그림만 바꾼 것이다).
 */
export default function OptionGrid({
  name,
  legend,
  required,
  options,
  value,
  onChange,
  multiple = false,
  row = false,
  help,
  error,
}: {
  name: string;
  legend: string;
  required?: boolean;
  options: Option[];
  /** multiple 이면 선택된 값 배열, 아니면 값 하나. */
  value: string | string[];
  /** 단일 선택이어도 배열로 돌려준다 — 부르는 쪽이 한 가지 모양만 다루게. */
  onChange: (next: string[]) => void;
  multiple?: boolean;
  row?: boolean;
  help?: string;
  error?: string;
}) {
  const selected = Array.isArray(value) ? value : [value];
  const errorId = error ? `${name}-error` : undefined;
  const helpId = help ? `${name}-help` : undefined;

  function toggle(v: string) {
    if (!multiple) {
      onChange([v]);
      return;
    }
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  }

  return (
    <fieldset
      className={s.fieldBlock}
      aria-describedby={[helpId, errorId].filter(Boolean).join(" ") || undefined}
    >
      <legend className={s.blockLabel}>
        {legend}
        {required && (
          <span className={s.req} aria-hidden="true">
            *
          </span>
        )}
      </legend>

      <div className={`${s.optGrid} ${row ? s.rows : ""}`.trim()}>
        {options.map((o) => (
          <label key={o.value} className={`${s.opt} ${row ? s.row : ""}`.trim()}>
            <input
              type={multiple ? "checkbox" : "radio"}
              name={name}
              value={o.value}
              checked={selected.includes(o.value)}
              onChange={() => toggle(o.value)}
            />
            <span className={s.optTitle}>{o.label}</span>
            {o.sub && <span className={s.optSub}>{o.sub}</span>}
          </label>
        ))}
      </div>

      {help && (
        <p className={s.help} id={helpId}>
          {help}
        </p>
      )}
      {error && (
        <p className={s.error} id={errorId} role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
