import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost";

type Style = {
  variant?: ButtonVariant;
  /** 표·카드 안에 들어갈 때만 쓰는 축소 단계(44px). 기본은 C형 56px. */
  size?: "md" | "sm";
  block?: boolean;
  className?: string;
};

function cls({ variant = "primary", size = "md", block, className = "" }: Style) {
  return [
    "pf-btn",
    `pf-btn-${variant}`,
    size === "sm" && "pf-btn-sm",
    block && "pf-btn-block",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

/** 선택보드 C형(토스식) 버튼 — radius 16 · 600 · 17px · h56 · shadow none. */
export default function Button({
  variant,
  size,
  block,
  className,
  children,
  ...rest
}: Style & ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button className={cls({ variant, size, block, className })} {...rest}>
      {children}
    </button>
  );
}

/** 이동이 목적이면 button 이 아니라 링크로 낸다(키보드·새 탭·크롤러 대응). */
export function ButtonLink({
  href,
  children,
  ...style
}: Style & { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={cls(style)}>
      {children}
    </Link>
  );
}
