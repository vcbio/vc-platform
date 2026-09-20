import type { ReactNode } from "react";

/** 페이지 공통 가로 폭(1280px) + 좌우 여백. 모든 화면이 같은 폭을 쓴다. */
export default function Container({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={`pf-container ${className}`.trim()}>{children}</div>;
}
