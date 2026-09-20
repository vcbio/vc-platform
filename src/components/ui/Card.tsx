import type { ReactNode } from "react";

/**
 * 흰 카드 + 연한 회색 배경으로 층위를 만든다.
 * title 을 주면 머리줄(제목 + 보조문구)이 붙고, 없으면 본문만 들어간다.
 */
export default function Card({
  title,
  hint,
  action,
  padded = true,
  className = "",
  children,
}: {
  title?: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  /** 표를 꽉 채워 넣을 때만 false. */
  padded?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`pf-card ${className}`.trim()}>
      {title && (
        <header className="pf-card-head">
          <h3>{title}</h3>
          {action ?? (hint && <span className="hint">{hint}</span>)}
        </header>
      )}
      <div className={padded ? "pf-card-body" : ""}>{children}</div>
    </section>
  );
}
