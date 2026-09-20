"use client";

import type { TextareaHTMLAttributes } from "react";
import { Field, useField, type FieldProps } from "./Input";

export default function Textarea({
  label,
  help,
  error,
  required,
  className = "",
  ...rest
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
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
      <textarea
        className={`pf-textarea ${className}`.trim()}
        required={required}
        {...f.aria}
        {...rest}
      />
    </Field>
  );
}
