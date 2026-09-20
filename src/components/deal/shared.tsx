import type { ReactNode } from "react";
import s from "./shared.module.css";

/**
 * 거래관리·인사이트·관리자 공용 조각.
 * 스타일 정의는 shared.module.css 한 곳에 있고, 여기서는 마크업만 고정한다.
 */

export { s as styles };

export function PageHead({
  eyebrow,
  title,
  sub,
  right,
}: {
  eyebrow: string;
  title: string;
  sub?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className={s.pageHead}>
      <div>
        <span className={s.eyebrow}>{eyebrow}</span>
        <h1>{title}</h1>
        {sub && <p className={s.sub}>{sub}</p>}
      </div>
      {right && <div className={s.headActions}>{right}</div>}
    </div>
  );
}

/** 표는 카드 안쪽을 꽉 채운다 — Card 에 padded={false} 를 함께 쓴다. */
export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className={s.tblWrap}>
      <table className={s.table}>{children}</table>
    </div>
  );
}

export function KV({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={s.kv}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function Feed({ children }: { children: ReactNode }) {
  return <ul className={s.feed}>{children}</ul>;
}

export function FeedItem({
  tag,
  title,
  meta,
}: {
  tag: ReactNode;
  title: string;
  meta: string;
}) {
  return (
    <li>
      <span className={s.feedTag}>{tag}</span>
      <span className={s.feedTxt}>
        <b>{title}</b>
        <span>{meta}</span>
      </span>
    </li>
  );
}

export function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | string;
  unit?: string;
}) {
  return (
    <div className={s.stat}>
      <span className={s.statLabel}>{label}</span>
      <span className={s.statValue}>
        {value}
        {unit && <em>{unit}</em>}
      </span>
    </div>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <p className={s.note}>{children}</p>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className={s.empty}>
      <b>{title}</b>
      {children}
    </div>
  );
}
