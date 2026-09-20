"use client";

import { useCallback } from "react";
import { Badge, Card, Container, type BadgeTone } from "@/components/ui";
import { getData, type Quote, type QuoteStatus } from "@/lib/data";
import { Empty, PageHead, Stat, TableWrap, styles as s } from "@/components/deal/shared";
import { AdminNav, useRows } from "./parts";

const STATUSES: QuoteStatus[] = ["접수", "검토중", "회신완료", "종료"];

const TONE: Record<QuoteStatus, BadgeTone> = {
  접수: "info",
  검토중: "warn",
  회신완료: "ok",
  종료: "neutral",
};

/** 관리자 요약 — 상태별 건수와 최근 접수만 본다. 손대는 일은 하위 메뉴에서 한다. */
export default function AdminSummary() {
  const load = useCallback(() => getData().listQuotes(), []);
  const { rows } = useRows<Quote>(load);

  return (
    <Container>
      <div className={s.page}>
        <PageHead
          eyebrow="Admin"
          title="관리자 요약"
          sub="접수된 견적의 상태와 최근 요청을 봅니다. 상태 변경과 원료·제조사 등록은 위 메뉴에서 합니다."
        />
        <AdminNav />

        {!rows ? (
          <p className="pf-help">불러오는 중입니다.</p>
        ) : (
          <div className={s.stack}>
            <div className={s.grid4}>
              {STATUSES.map((st) => (
                <Card key={st}>
                  <Stat
                    label={`${st} 견적`}
                    value={rows.filter((q) => q.status === st).length}
                    unit="건"
                  />
                </Card>
              ))}
            </div>

            <Card
              title="최근 접수"
              padded={false}
              action={<span className="pf-help">전체 {rows.length}건</span>}
            >
              {rows.length === 0 ? (
                <Empty title="접수된 견적이 없습니다" />
              ) : (
                <TableWrap>
                  <thead>
                    <tr>
                      <th>접수일</th>
                      <th>견적 번호</th>
                      <th>요청자</th>
                      <th>제품 유형</th>
                      <th className={s.num}>수량</th>
                      <th>상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...rows]
                      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                      .slice(0, 8)
                      .map((q) => (
                        <tr key={q.id}>
                          <td className={s.nowrap}>{q.createdAt.slice(0, 10)}</td>
                          <td className={s.nowrap}>
                            <b>{q.id}</b>
                          </td>
                          <td>{q.userEmail}</td>
                          <td>{q.productType}</td>
                          <td className={s.num}>
                            {q.quantity.toLocaleString("ko-KR")}
                            {q.unit}
                          </td>
                          <td>
                            <Badge tone={TONE[q.status]}>{q.status}</Badge>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </TableWrap>
              )}
            </Card>
          </div>
        )}
      </div>
    </Container>
  );
}
