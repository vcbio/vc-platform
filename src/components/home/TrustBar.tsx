"use client";

import { useEffect, useState } from "react";
import { homeStats, type HomeStats } from "./stats";
import s from "./home.module.css";

/**
 * 신뢰 지표. 서버에서 센 값으로 먼저 그리고, 브라우저에서 저장분 기준으로 다시 센다.
 * (견적을 제출하면 「누적 견적 요청」이 곧바로 올라간다.)
 */
export default function TrustBar({ initial }: { initial: HomeStats }) {
  const [stats, setStats] = useState(initial);

  useEffect(() => {
    let alive = true;
    homeStats().then((next) => alive && setStats(next));
    return () => {
      alive = false;
    };
  }, []);

  const rows: [string, string, string][] = [
    ["등록 제조사", stats.manufacturers.toLocaleString("ko-KR"), "개사"],
    ["보유 원료 DB", stats.ingredients.toLocaleString("ko-KR"), "종"],
    ["누적 견적 요청", stats.quotes.toLocaleString("ko-KR"), "건"],
    ["평균 리드타임", String(stats.avgLeadTimeWeeks), "주"],
  ];

  return (
    <dl className={s.trust}>
      {rows.map(([label, value, unit]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>
            {value}
            <small>{unit}</small>
          </dd>
        </div>
      ))}
    </dl>
  );
}
