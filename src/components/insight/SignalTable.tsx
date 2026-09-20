import { ButtonLink } from "@/components/ui";
import { TableWrap } from "@/components/deal/shared";
import type { Signal } from "@/lib/data";
import c from "./insight.module.css";

const num = (n: number) => n.toLocaleString("ko-KR");

/** 최근 8주 일평균을 막대 8개로. 밑변은 0 이고, 마지막 주만 방향색으로 찍는다. */
function Spark({ weeks, dir }: { weeks: number[]; dir: "up" | "down" | "flat" }) {
  const max = Math.max(...weeks, 0.0001);
  const tone = dir === "up" ? c.sparkUp : dir === "down" ? c.sparkDown : "";
  return (
    <span
      className={`${c.spark} ${tone}`.trim()}
      role="img"
      aria-label={`최근 8주 일평균 검색지수 ${weeks.join(", ")}`}
    >
      {weeks.map((w, i) => (
        <i key={i} style={{ height: `${Math.max(2, Math.round((w / max) * 26))}px` }} />
      ))}
    </span>
  );
}

/**
 * 순위 표 — 데이터랩 키워드 목록의 축약판이다.
 * 순위 · 원료(데이터랩 상세로 나감) · 월 검색량 · 주간 변화 · 8주 흐름 · 견적요청.
 *
 * 변화율은 색만으로 뜻을 전하지 않는다. 화살표·부호·기간을 늘 함께 적는다.
 */
export default function SignalTable({ rows }: { rows: Signal[] }) {
  return (
    <TableWrap>
      <thead>
        <tr>
          <th className={c.rank} scope="col">
            순위
          </th>
          <th scope="col">원료</th>
          <th className={c.vol} scope="col">
            월 검색량
          </th>
          <th className={c.chg} scope="col">
            주간 변화
          </th>
          <th className={c.sparkCell} scope="col">
            8주 흐름
          </th>
          <th className={c.act} scope="col">
            <span className="pf-sr-only">견적</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const observed = r.changeStatus !== "미제공";
          const dir = !observed || r.changePct === 0 ? "flat" : r.changePct > 0 ? "up" : "down";
          const mark = dir === "up" ? "▲" : dir === "down" ? "▼" : "";
          return (
            <tr key={r.id}>
              <td className={c.rank}>{i + 1}</td>
              <td className={c.nameCell}>
                <a className={c.nameLink} href={r.href} target="_blank" rel="noreferrer">
                  {r.name}
                </a>
                <span className={c.sub}>
                  {r.grade && (
                    <span
                      className={`${c.gradeTag} ${
                        r.grade === "고시형" || r.grade === "개별인정" ? c.gradeOn : ""
                      }`.trim()}
                    >
                      {r.grade}
                    </span>
                  )}
                  {[r.category, r.functionCategory].filter(Boolean).join(" · ")}
                </span>
              </td>
              <td className={c.vol}>
                {num(r.monthlyVolume)}
                <small>회 · 참고값</small>
              </td>
              <td className={`${c.chg} ${dir === "up" ? c.up : dir === "down" ? c.down : c.flat}`}>
                {observed ? `${mark} ${r.changePct > 0 ? "+" : ""}${r.changePct.toFixed(1)}%` : "—"}
                {/* 기저가 낮으면 퍼센트가 몇 배로 튄다. 숫자 옆에서 바로 말해 준다. */}
                {r.lowBase && <span className={c.lowBase}>직전 주 기저 매우 낮음</span>}
                <span className={c.period}>{r.periodLabel}</span>
              </td>
              <td className={c.sparkCell}>
                {r.weeks8?.length ? (
                  <>
                    <Spark weeks={r.weeks8} dir={dir} />
                    {r.riseWeeks != null && <span className={c.rise}>8주 중 {r.riseWeeks}주 상승</span>}
                  </>
                ) : (
                  <span className={c.rise}>관측 미제공</span>
                )}
              </td>
              <td className={c.act}>
                {/* 의약품 성분은 식품 원료가 아니다 — 견적으로 넘기는 길을 아예 두지 않는다. */}
                {r.grade === "의약품" ? (
                  <span className={c.noQuote}>식품 원료 아님</span>
                ) : (
                  <ButtonLink
                    href={`/quote/?ingredient=${encodeURIComponent(r.name)}`}
                    variant="secondary"
                    size="sm"
                  >
                    견적요청
                  </ButtonLink>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </TableWrap>
  );
}
