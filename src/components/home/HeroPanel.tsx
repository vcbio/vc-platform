"use client";

import { useEffect, useState } from "react";
import type { MatchResult } from "@/lib/data";
import { previewResults } from "./preview";
import s from "./home.module.css";

/**
 * 히어로 오른쪽 미니 대시보드. 이미지가 아니라 실제 화면 조각이다.
 * 조건 칩 → 결과 행으로 견적·매칭의 흐름을 한 화면에 보여 준다.
 * 숫자는 전부 어댑터 matchManufacturers 가 센 값이다 — 손으로 적은 값이 없다.
 */
export default function HeroPanel({ initial }: { initial: MatchResult[] }) {
  const [rows, setRows] = useState(initial);

  useEffect(() => {
    let alive = true;
    previewResults().then((next) => alive && setRows(next));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <aside className={`${s.panel} pf-rise`} style={{ "--d": "120ms" } as React.CSSProperties}>
      <div className={s.panelHead}>
        <b>조건 매칭</b>
        <span>미리보기</span>
      </div>

      <div className={s.panelCond}>
        <i>GMP 보유</i>
        <i>리드타임 6주 이내</i>
      </div>

      <p className={s.panelHand}>추천 {rows.length}곳</p>

      <ol className={s.panelRows}>
        {rows.map((r, i) => (
          <li key={r.manufacturer.id}>
            <span className={s.panelRank}>{String(i + 1).padStart(2, "0")}</span>
            <span className={s.panelName}>
              <b>{r.manufacturer.displayName.split(" (")[0]}</b>
              <span>
                {r.manufacturer.region} · 리드타임 {r.manufacturer.leadTimeWeeks}주
              </span>
            </span>
            <span className={s.panelRate}>
              <b>
                {r.score}
                <span style={{ fontSize: 15, fontWeight: 500 }}>%</span>
              </b>
              <span
                className={s.panelBar}
                role="img"
                aria-label={`조건 일치율 ${r.score}퍼센트`}
              >
                <i style={{ width: `${r.score}%` }} />
              </span>
            </span>
          </li>
        ))}
      </ol>

      <p className={s.panelFoot}>
        일치율은 걸어 둔 조건 중 몇 개를 만족했는지 센 값입니다. 추정치가 아닙니다.
      </p>
    </aside>
  );
}
