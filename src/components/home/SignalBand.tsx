"use client";

import { useEffect, useState } from "react";
import { getData, type Signal } from "@/lib/data";
import s from "./home.module.css";

/**
 * 「오늘의 신호」 띠 — 데이터랩 「오늘의 한 줄」 문법 그대로.
 * 원료명은 밑줄(= 출처 링크), 변화율만 주황. 매칭 화면도 같은 문법을 쓴다.
 *
 * 히어로 보드와 마찬가지로 빌드 값으로 먼저 그리고 브라우저에서 어댑터로 다시 읽는다.
 */
export default function SignalBand({
  initial,
  hero = false,
}: {
  initial: Signal[];
  /** 히어로 좌측 아래에 세로로 앉힐 때. 마크업은 같고 자리만 바뀐다. */
  hero?: boolean;
}) {
  const [signals, setSignals] = useState(initial);

  useEffect(() => {
    let alive = true;
    getData()
      .listSignals(3)
      .then((next) => {
        if (alive && next.length > 0) setSignals(next);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (signals.length === 0) return null;

  return (
    <div className={hero ? `${s.signal} ${s.signalHero}` : s.signal}>
      <span className={s.signalLabel}>오늘의 신호</span>
      {signals.map((sig) => (
        <span key={sig.id} className={s.signalItem}>
          {sig.href ? (
            <a href={sig.href} target="_blank" rel="noopener noreferrer">
              {sig.name}
            </a>
          ) : (
            <span className={s.signalPlain}>{sig.name}</span>
          )}
          <em>월 {sig.monthlyVolume.toLocaleString("ko-KR")}회</em>
          <b>
            {sig.periodLabel.split(" ")[0]} {sig.changePct > 0 ? "+" : ""}
            {sig.changePct.toFixed(1)}%
          </b>
        </span>
      ))}
      <span className={s.signalTail}>기준일 {signals[0].observedAt}</span>
    </div>
  );
}
