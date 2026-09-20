"use client";

import { useCallback, useState } from "react";
import { Badge, Card, Container, type BadgeTone } from "@/components/ui";
import { getData, type Quote, type QuoteStatus } from "@/lib/data";
import { Empty, Note, PageHead, TableWrap, styles as s } from "@/components/deal/shared";
import { AdminNav, useRows } from "./parts";

const STATUSES: QuoteStatus[] = ["접수", "검토중", "회신완료", "종료"];

const TONE: Record<QuoteStatus, BadgeTone> = {
  접수: "info",
  검토중: "warn",
  회신완료: "ok",
  종료: "neutral",
};

/** 견적 접수 목록 — 상태만 바꾼다. 내용 수정은 요청자가 한다. */
export default function QuoteAdmin() {
  const load = useCallback(() => getData().listQuotes(), []);
  const { rows, reload } = useRows<Quote>(load);
  const [saved, setSaved] = useState<string | null>(null);

  async function change(id: string, status: QuoteStatus) {
    await getData().updateQuote(id, { status });
    await reload();
    setSaved(`${id} 상태를 ${status}(으)로 바꿨습니다.`);
  }

  return (
    <Container>
      <div className={s.page}>
        <PageHead
          eyebrow="Admin"
          title="견적 접수"
          sub="요청자가 올린 견적의 진행 상태를 바꿉니다. 바꾼 상태는 요청자의 거래관리 화면에 그대로 보입니다."
        />
        <AdminNav />

        {saved && (
          <p className="pf-help" role="status" aria-live="polite" style={{ marginBottom: 12 }}>
            {saved}
          </p>
        )}

        {!rows ? (
          <p className="pf-help">불러오는 중입니다.</p>
        ) : (
          <Card
            title="접수 목록"
            padded={false}
            action={<span className="pf-help">전체 {rows.length}건</span>}
          >
            {rows.length === 0 ? (
              <Empty title="접수된 견적이 없습니다" />
            ) : (
              <>
                <TableWrap>
                  <thead>
                    <tr>
                      <th>접수일</th>
                      <th>견적 번호</th>
                      <th>요청자</th>
                      <th>제품 유형</th>
                      <th>제형</th>
                      <th className={s.num}>수량</th>
                      <th>희망 납기</th>
                      <th>현재 상태</th>
                      <th>상태 변경</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...rows]
                      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                      .map((q) => (
                        <tr key={q.id}>
                          <td className={s.nowrap}>{q.createdAt.slice(0, 10)}</td>
                          <td className={s.nowrap}>
                            <b>{q.id}</b>
                          </td>
                          <td>{q.userEmail}</td>
                          <td>{q.productType}</td>
                          <td>{q.dosageForm}</td>
                          <td className={s.num}>
                            {q.quantity.toLocaleString("ko-KR")}
                            {q.unit}
                          </td>
                          <td className={s.nowrap}>{q.targetDate}</td>
                          <td>
                            <Badge tone={TONE[q.status]}>{q.status}</Badge>
                          </td>
                          <td>
                            <select
                              className="pf-select"
                              style={{ height: 44, width: 132 }}
                              aria-label={`${q.id} 상태 변경`}
                              value={q.status}
                              onChange={(e) => change(q.id, e.target.value as QuoteStatus)}
                            >
                              {STATUSES.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </TableWrap>
                <div className="pf-card-body" style={{ paddingTop: 0 }}>
                  <Note>
                    상태를 고르면 곧바로 저장합니다. 되돌리려면 이전 상태를 다시 고르면 됩니다.
                  </Note>
                </div>
              </>
            )}
          </Card>
        )}
      </div>
    </Container>
  );
}
