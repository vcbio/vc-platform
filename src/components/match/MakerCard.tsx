"use client";

import { useEffect, useRef } from "react";
import Badge from "@/components/ui/Badge";
import type { MatchResult } from "@/lib/data";
import s from "./match.module.css";

/**
 * 제조사 카드. 홈 미리보기와 매칭 결과가 같은 카드를 쓴다.
 *
 * 일치율은 어댑터 matchManufacturers 가 센 「만족한 조건 수 ÷ 건 조건 수」다.
 * 추정·예측이 아니므로 화면에서도 그렇게만 적는다.
 */
export default function MakerCard({
  result,
  rank,
  showDetail = true,
}: {
  result: MatchResult;
  /** 0이면 「조건 적합 1순위」 뱃지를 붙인다. */
  rank?: number;
  showDetail?: boolean;
}) {
  const { manufacturer: m, score, matched } = result;
  // 조건을 하나도 걸지 않으면 어댑터가 0점을 준다 — 그때 「0% 일치」로 보이면 거짓말이 된다.
  const scored = matched.length > 0;
  const bar = useRef<HTMLElement>(null);

  // 막대는 0에서 자기 비율까지 한 번 자란다. 값이 바뀌면 그 값에서 새로 자란다.
  useEffect(() => {
    const el = bar.current;
    if (!el || !scored) return;
    el.style.transform = "scaleX(0)";
    const id = requestAnimationFrame(() => {
      el.style.transform = `scaleX(${score / 100})`;
    });
    return () => cancelAnimationFrame(id);
  }, [score, scored]);

  // 1순위 주황 표식은 매칭 결과 카드에서만 쓴다. 홈 미리보기까지 주황을 쓰면
  // 한 화면에 신호색이 세 곳이 돼 「이것 하나가 1순위」라는 뜻이 묽어진다
  // (홈에서는 왼쪽 순위 패널 01·02·03 이 같은 정보를 이미 준다).
  const top = scored && rank === 0 && showDetail;

  return (
    <article className={`${s.maker}${top ? " " + s.rank1 : ""}`}>
      <div className={s.makerTop}>
        <div className={s.makerId}>
          <span className={s.makerLogo} aria-hidden="true">
            {m.displayName.match(/\d+/)?.[0] ?? m.displayName.slice(0, 1)}
          </span>
          <span>
            <b className={s.makerName}>{m.displayName.split(" (")[0]}</b>
            <span className={s.makerSub}>
              {m.region} · {m.dosageForms.join(" · ")}
            </span>
          </span>
        </div>
        {scored && (
          <div className={s.rate}>
            <b>{score}%</b>
            <span>조건 일치</span>
          </div>
        )}
      </div>

      {scored && (
        <div className={s.bar} role="img" aria-label={`조건 일치율 ${score}퍼센트`}>
          <i ref={bar} />
        </div>
      )}

      <div className={s.meta}>
        {m.certifications.map((c) => (
          <Badge key={c} tone="ok">
            {c}
          </Badge>
        ))}
        {top && <Badge tone="signal">조건 적합 1순위</Badge>}
      </div>

      {showDetail && (
        <dl className={s.kvList}>
          {m.equipmentSummary && (
            <div className={s.kv}>
              <dt>주요 공정</dt>
              <dd>{m.equipmentSummary}</dd>
            </div>
          )}
          <div className={s.kv}>
            <dt>최소 발주수량</dt>
            <dd>{m.moqRange || "확인 필요"}</dd>
          </div>
          <div className={s.kv}>
            <dt>예상 리드타임</dt>
            <dd>{m.leadTimeWeeks == null ? "확인 필요" : `${m.leadTimeWeeks}주`}</dd>
          </div>
          <div className={s.kv}>
            <dt>충족한 조건</dt>
            <dd>{scored ? matched.join(" · ") : "조건을 걸지 않았습니다"}</dd>
          </div>
        </dl>
      )}
    </article>
  );
}
