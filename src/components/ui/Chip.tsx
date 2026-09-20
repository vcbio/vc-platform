"use client";

import type { ReactNode } from "react";

/**
 * 필터·태그 칩. onClick 을 주면 버튼(토글)으로, 없으면 표시 전용 span 으로 난다.
 * 선택 상태는 색 + aria-pressed 로 함께 알린다.
 */
export default function Chip({
  selected = false,
  onClick,
  children,
}: {
  selected?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  const cls = `pf-chip ${selected ? "pf-chip-selected" : ""}`.trim();

  if (!onClick) return <span className={cls}>{children}</span>;

  return (
    <button type="button" className={cls} aria-pressed={selected} onClick={onClick}>
      {children}
    </button>
  );
}
