"use client";

import { useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";

export type FieldProps = {
  /** 라벨은 필수다. placeholder 로 대신하지 않는다. */
  label: string;
  help?: ReactNode;
  error?: ReactNode;
  required?: boolean;
};

/** 라벨 위 · 입력 · 도움말 · 오류 순서로 쌓는 공통 필드 껍데기. */
export function Field({
  label,
  help,
  error,
  required,
  id,
  helpId,
  errorId,
  children,
}: FieldProps & {
  id: string;
  helpId: string;
  errorId: string;
  children: ReactNode;
}) {
  return (
    <div className="pf-field">
      <label className="pf-label" htmlFor={id}>
        {label}
        {required && (
          <span className="req" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {help && (
        <p className="pf-help" id={helpId}>
          {help}
        </p>
      )}
      {error && (
        <p className="pf-error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** 필드 내부 공통 배선 — id 생성과 aria-describedby 연결을 한 곳에서 한다. */
export function useField(error?: ReactNode, help?: ReactNode) {
  const id = useId();
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  return {
    id,
    helpId,
    errorId,
    aria: {
      id,
      "aria-invalid": error ? (true as const) : undefined,
      "aria-describedby": [help && helpId, error && errorId].filter(Boolean).join(" ") || undefined,
    },
  };
}

export default function Input({
  label,
  help,
  error,
  required,
  className = "",
  ...rest
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const f = useField(error, help);
  return (
    <Field
      label={label}
      help={help}
      error={error}
      required={required}
      id={f.id}
      helpId={f.helpId}
      errorId={f.errorId}
    >
      <input className={`pf-input ${className}`.trim()} required={required} {...f.aria} {...rest} />
    </Field>
  );
}
