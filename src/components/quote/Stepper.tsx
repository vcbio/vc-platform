"use client";

import s from "./quote.module.css";

/**
 * 견적요청 4단계 표시줄.
 *
 * 탭이 아니라 순서가 있는 단계라서 ol + aria-current="step" 으로 낸다.
 * 아직 지나오지 않은 단계는 누를 수 없다 — 앞 단계의 필수값을 건너뛰지 않게 하려는 것이다.
 */
export default function Stepper({
  steps,
  current,
  reached,
  onSelect,
}: {
  steps: string[];
  /** 1부터 센다. */
  current: number;
  /** 지금까지 도달해 본 가장 큰 단계. */
  reached: number;
  onSelect: (step: number) => void;
}) {
  return (
    <ol className={s.stepper}>
      {steps.map((label, i) => {
        const n = i + 1;
        const state = n === current ? s.active : n < current ? s.done : "";
        return (
          <li key={label}>
            <button
              type="button"
              className={state}
              aria-current={n === current ? "step" : undefined}
              aria-label={`${n}단계 ${label}`}
              disabled={n > reached}
              onClick={() => onSelect(n)}
            >
              <span className={s.stepNo} aria-hidden="true">
                {n}
              </span>
              <span className={s.stepLabel}>{label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
