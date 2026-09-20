import type { ReactNode } from "react";

export type BadgeTone = "ok" | "warn" | "danger" | "info" | "neutral";

/**
 * 상태 뱃지. 색만으로 뜻을 전하지 않는다 — 항상 글자를 함께 쓴다(색각이상 대응).
 * soft 배경 + -ink 글자 조합이라 전 톤 WCAG AA 이상.
 */
export default function Badge({
  tone = "neutral",
  children,
}: {
  tone?: BadgeTone;
  children: ReactNode;
}) {
  return <span className={`pf-badge pf-badge-${tone}`}>{children}</span>;
}
