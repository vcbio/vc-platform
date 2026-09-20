"use client";

import s from "./home.module.css";

/**
 * 8주 흐름 한 줄. 축·격자·눈금은 두지 않는다 — 값이 아니라 **모양**만 읽히면 되는 자리다.
 * (dataviz 원칙: 스파크라인은 맥락 안의 소형 그래프이고, 정확한 값은 옆의 숫자가 이미 말한다.)
 *
 * 그려지는 애니메이션은 stroke-dashoffset 하나로 한다(pathLength=1 이라 길이 계산이 필요 없다).
 * 원료가 바뀌면 key 로 다시 마운트돼 왼쪽에서 오른쪽으로 다시 그려진다.
 */

const W = 300;
const H = 44;
const PAD = 4;

export default function Sparkline({
  points,
  reduced,
  endLabel,
  label,
}: {
  points: number[];
  reduced: boolean;
  /** 오른쪽 끝 주 표기(데이터가 준 기준일 그대로). */
  endLabel: string;
  label: string;
}) {
  if (!points || points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const x = (i: number) => (i / (points.length - 1)) * W;
  const y = (v: number) => PAD + (1 - (v - min) / span) * (H - PAD * 2);

  const d = points.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)} ${y(v).toFixed(2)}`).join(" ");
  const lastX = (x(points.length - 1) / W) * 100;
  const lastY = (y(points[points.length - 1]) / H) * 100;

  return (
    <figure className={s.spark}>
      <div className={s.sparkPlot}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={label}>
          <path
            d={d}
            pathLength={1}
            className={reduced ? s.sparkPathStill : s.sparkPath}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {/* 마지막 점은 SVG 밖에 둔다 — preserveAspectRatio:none 안에서는 원이 타원으로 찌그러진다 */}
        <span
          className={reduced ? s.sparkDotStill : s.sparkDot}
          style={{ left: `${lastX}%`, top: `${lastY}%` }}
          aria-hidden="true"
        />
      </div>
      <figcaption className={s.sparkCap}>
        <span>{points.length}주 전</span>
        <span>{endLabel}</span>
      </figcaption>
    </figure>
  );
}
