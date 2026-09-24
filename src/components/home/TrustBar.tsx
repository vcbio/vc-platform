"use client";

import { useEffect, useState } from "react";
import { homeStats, type HomeStats } from "./stats";
import s from "./home.module.css";

/**
 * 제조사 쪽 사실을 한 줄로만 적는다 — 홈의 주인공은 원료 동향이고 제조사는 뒷받침이다.
 * 숫자·인증은 전부 어댑터가 센 값이다(화면에 손으로 적은 값이 없다).
 * 서버에서 센 값으로 먼저 그리고, 브라우저에서 저장분 기준으로 다시 센다.
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

  const certs = stats.certifications;
  const shown = certs.slice(0, 3).join(" · ");
  const rest = certs.length > 3 ? ` 외 ${certs.length - 3}종` : "";

  const cells: [string, string][] = [
    ["등록 제조사", `${stats.manufacturers.toLocaleString("ko-KR")}곳`],
    ["인증 확인", certs.length > 0 ? `${shown}${rest}` : "확인 중"],
    ["평균 리드타임", stats.avgLeadTimeWeeks === null ? "확인 필요" : `${stats.avgLeadTimeWeeks}주`],
    ["제조사 표시", "익명 표시명"],
  ];

  return (
    <dl className={s.facts}>
      {cells.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
