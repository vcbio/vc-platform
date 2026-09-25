"use client";

import { useState } from "react";
import s from "./home.module.css";

type WeekDate = { start: string; end: string };

const W = 540;
const H = 148;
const TOP = 10;
const BOTTOM = 136;
const indexFormat = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 3 });

function axisCeiling(value: number) {
  if (value <= 0) return 1;
  const unit = 10 ** Math.floor(Math.log10(value));
  const step = value / unit;
  return (step <= 1 ? 1 : step <= 2 ? 2 : step <= 5 ? 5 : 10) * unit;
}

const shortDate = (iso: string) => iso.slice(5).replace("-", ".");
const periodLabel = ({ start, end }: WeekDate) =>
  `${start.replaceAll("-", ".")}~${start.slice(0, 4) === end.slice(0, 4) ? shortDate(end) : end.replaceAll("-", ".")}`;

/** 주간 상대지수의 실제 관측 날짜와 값을 함께 보여 준다. */
export default function Sparkline({
  points,
  dates,
  reduced,
  label,
}: {
  points: number[];
  dates?: WeekDate[];
  reduced: boolean;
  label: string;
}) {
  const [selected, setSelected] = useState(points.length - 1);
  if (points.length < 2 || points.some((v) => !Number.isFinite(v) || v < 0)) return null;

  const active = Math.min(selected, points.length - 1);
  const hasDates = dates?.length === points.length && dates.every(
    (d) => /^\d{4}-\d{2}-\d{2}$/.test(d.start) && /^\d{4}-\d{2}-\d{2}$/.test(d.end),
  );
  const ceiling = axisCeiling(Math.max(...points));
  const x = (i: number) => 8 + (i / (points.length - 1)) * (W - 16);
  const y = (v: number) => BOTTOM - (v / ceiling) * (BOTTOM - TOP);
  const line = points.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)} ${y(v).toFixed(2)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(2)} ${BOTTOM} L${x(0).toFixed(2)} ${BOTTOM} Z`;
  const period = hasDates ? periodLabel(dates[active]) : "주별 날짜 미제공";

  return (
    <figure className={s.spark}>
      <figcaption className={s.sparkHead}>
        <span className={s.sparkTitle}>
          <strong>최근 {points.length}주 검색 관심도</strong>
          <small>일평균 · 상대지수</small>
        </span>
        <span className={s.sparkLatest}>
          마지막 주 <strong>{indexFormat.format(points.at(-1) ?? 0)}</strong>
        </span>
      </figcaption>

      <div className={s.sparkChart}>
        <div className={s.sparkTicks} aria-hidden="true">
          <span>{indexFormat.format(ceiling)}</span>
          <span>{indexFormat.format(ceiling / 2)}</span>
          <span>0</span>
        </div>
        <div className={s.sparkPlot}>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
            {[TOP, (TOP + BOTTOM) / 2, BOTTOM].map((tick) => (
              <line key={tick} x1="0" x2={W} y1={tick} y2={tick} className={s.sparkGrid} />
            ))}
            <path d={area} className={s.sparkArea} />
            <path
              d={line}
              pathLength={1}
              className={reduced ? s.sparkPathStill : s.sparkPath}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {points.map((v, i) => (
            <span
              key={i}
              className={i === active ? s.sparkPointOn : s.sparkPoint}
              style={{ left: `${(x(i) / W) * 100}%`, top: `${(y(v) / H) * 100}%` }}
            />
          ))}
        </div>
      </div>

      <div className={s.sparkReadout} aria-live="polite">
        <span>{period}</span>
        <strong>{indexFormat.format(points[active])} <small>상대지수</small></strong>
      </div>
      <div className={s.sparkWeeks} role="group" aria-label={`${label} 주별 값`}>
        {points.map((v, i) => {
          const week = hasDates ? `${dates[i].start}~${dates[i].end}` : `${i + 1}번째 주, 날짜 미제공`;
          return (
            <button
              key={i}
              type="button"
              className={i === active ? s.sparkWeekOn : s.sparkWeek}
              aria-pressed={i === active}
              aria-label={`${week}, 검색 관심도 ${indexFormat.format(v)} 상대지수`}
              onClick={() => setSelected(i)}
            >
              <span aria-hidden="true">{hasDates ? shortDate(dates[i].end) : `${i + 1}주`}</span>
              <b aria-hidden="true">{indexFormat.format(v)}</b>
            </button>
          );
        })}
      </div>
    </figure>
  );
}
