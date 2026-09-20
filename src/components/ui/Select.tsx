"use client";

import type { SelectHTMLAttributes } from "react";
import { Field, useField, type FieldProps } from "./Input";

export default function Select({
  label,
  help,
  error,
  required,
  className = "",
  children,
  ...rest
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
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
      <select className={`pf-select ${className}`.trim()} required={required} {...f.aria} {...rest}>
        {children}
      </select>
    </Field>
  );
}
