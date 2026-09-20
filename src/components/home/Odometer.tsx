"use client";

import s from "./home.module.css";

/**
 * 자릿수마다 굴러가는 숫자판.
 *
 * 0~9 를 세로로 쌓아 두고 transform 으로 밀어 올린다 — 레이아웃을 건드리지 않으니
 * 합성만으로 그려져 60fps 가 유지된다(width·height 애니메이션 금지).
 * 숫자가 아닌 글자(쉼표·소수점·부호·%)는 그대로 둔다.
 *
 * 읽어 주는 값은 굴러가는 판이 아니라 완성된 문자열이다(판 자체는 aria-hidden).
 */

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

export default function Odometer({
  text,
  reduced,
  className = "",
  stagger = 40,
  duration = 720,
}: {
  /** 이미 다 만든 표시 문자열. 예: "137,200" · "+26.1%" */
  text: string;
  /** 모션을 줄이라고 한 사람에게는 굴리지 않고 곧장 바꾼다. */
  reduced: boolean;
  className?: string;
  stagger?: number;
  duration?: number;
}) {
  const chars = [...text];

  return (
    <span className={`${s.odo} ${className}`.trim()}>
      <span aria-hidden="true" className={s.odoRow}>
        {chars.map((ch, i) => {
          const d = DIGITS.indexOf(ch);
          if (d < 0) {
            return (
              <span key={`${chars.length - i}-sep`} className={s.odoSep}>
                {ch}
              </span>
            );
          }
          return (
            <span key={chars.length - i} className={s.odoCell}>
              <span
                className={s.odoCol}
                style={{
                  transform: `translateY(${-d * 10}%)`,
                  transitionDuration: reduced ? "0ms" : `${duration}ms`,
                  transitionDelay: reduced ? "0ms" : `${i * stagger}ms`,
                }}
              >
                {DIGITS.map((n) => (
                  <span key={n}>{n}</span>
                ))}
              </span>
            </span>
          );
        })}
      </span>
      <span className="pf-sr-only">{text}</span>
    </span>
  );
}
