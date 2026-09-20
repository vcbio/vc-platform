"use client";

import { useEffect, useState } from "react";
import { Badge, Card, Chip, Container, type BadgeTone } from "@/components/ui";
import { getSession, type Session } from "@/lib/auth";
import { getData, type Quote, type QuoteStatus } from "@/lib/data";
import {
  Empty,
  Feed,
  FeedItem,
  KV,
  Note,
  PageHead,
  TableWrap,
  styles as s,
} from "./shared";

/**
 * 거래관리 대시보드 (#view-deal 재현).
 *
 * 로그인한 사람의 견적만 부른다 — listQuotes(session.email). 다른 사람 건은 목록에 들어오지 않는다.
 * ⚠️ 이건 보안 경계가 아니다. 정적 사이트라 실제 차단은 나중에 붙일 supabase RLS 가 한다.
 */

const STATUSES: QuoteStatus[] = ["접수", "검토중", "회신완료", "종료"];

/** 상태는 색만으로 구분하지 않는다 — 뱃지에 글자를 함께 쓴다. */
const TONE: Record<QuoteStatus, BadgeTone> = {
  접수: "info",
  검토중: "warn",
  회신완료: "ok",
  종료: "neutral",
};

const STEPS = ["기획", "소싱", "매칭", "생산", "품질", "출시"] as const;

/** 상태 4종을 6단계 진행바 위치로 옮긴다. 추정이 아니라 고정 대응표다. */
const STEP_OF: Record<QuoteStatus, number> = {
  접수: 2,
  검토중: 3,
  회신완료: 4,
  종료: 6,
};

const NOTICE: Record<QuoteStatus, string> = {
  접수: "견적 요청이 접수되었습니다",
  검토중: "제조사가 조건을 검토하고 있습니다",
  회신완료: "제조사 회신이 등록되었습니다",
  종료: "거래가 종료되었습니다",
};

/** 준비 중인 서류함이 어떤 서류를 다루게 될지만 미리 보여준다. */
const DOCS = [
  { name: "견적 회신서", owner: "제조사" },
  { name: "품목제조보고서", owner: "제조사" },
  { name: "시험성적서 (COA)", owner: "제조사" },
  { name: "표시사항 검토서", owner: "브이씨바이오" },
  { name: "거래 조건 합의서", owner: "양측" },
];

const day = (iso: string) => iso.slice(0, 10);

export default function DealDashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [pickedId, setPickedId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getSession().then((sess) => {
      if (!alive || !sess) return;
      setSession(sess);
      getData()
        .listQuotes(sess.email)
        .then((rows) => {
          if (!alive) return;
          const sorted = [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          setQuotes(sorted);
          setPickedId(sorted[0]?.id ?? null);
        });
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!quotes) {
    return (
      <Container>
        <div className={s.page}>
          <p className="pf-help">견적을 불러오는 중입니다.</p>
        </div>
      </Container>
    );
  }

  const picked = quotes.find((q) => q.id === pickedId) ?? null;
  const counts = STATUSES.map((st) => ({
    status: st,
    n: quotes.filter((q) => q.status === st).length,
  }));

  return (
    <Container>
      <div className={s.page}>
        <PageHead
          eyebrow="Deal Management"
          title="거래관리 대시보드"
          sub={
            picked
              ? `「${picked.productType}」 프로젝트 · ${picked.dosageForm} · 진행 단계 ${STEP_OF[picked.status]} / 6`
              : "접수한 견적의 진행 단계와 일정을 한 화면에서 봅니다."
          }
          right={<span className="pf-help">{session?.email}</span>}
        />

        {quotes.length === 0 ? (
          <Card>
            <Empty title="아직 접수한 견적이 없습니다">
              <p>견적을 요청하면 이 화면에서 진행 단계를 따라갈 수 있습니다.</p>
            </Empty>
          </Card>
        ) : (
          <div className={s.stack}>
            {/* ── 내 견적 목록 ── */}
            <Card
              title="내 견적"
              padded={false}
              action={
                <span className="pf-help">
                  {counts.map((c) => `${c.status} ${c.n}`).join(" · ")}
                </span>
              }
            >
              <TableWrap>
                <thead>
                  <tr>
                    <th>견적 번호</th>
                    <th>제품 유형</th>
                    <th>제형</th>
                    <th className={s.num}>수량</th>
                    <th>희망 납기</th>
                    <th>상태</th>
                    <th aria-label="선택" />
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q) => (
                    <tr key={q.id} className={q.id === pickedId ? s.selectedRow : undefined}>
                      <td className={s.nowrap}>
                        <b>{q.id}</b>
                      </td>
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
                        <div className={s.rowActions}>
                          <button
                            type="button"
                            className="pf-btn pf-btn-secondary pf-btn-sm"
                            aria-pressed={q.id === pickedId}
                            onClick={() => setPickedId(q.id)}
                          >
                            {q.id === pickedId ? "보는 중" : "자세히"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </Card>

            {picked && (
              <>
                {/* ── 진행 단계 ── */}
                <Card>
                  <div className={s.toolbar} style={{ marginBottom: 16 }}>
                    <div className="pf-chips">
                      <Chip>
                        제형 <b>{picked.dosageForm}</b>
                      </Chip>
                      <Chip>
                        물량 <b>{picked.quantity.toLocaleString("ko-KR")}{picked.unit}</b>
                      </Chip>
                      <Chip>
                        희망 납기 <b>{picked.targetDate}</b>
                      </Chip>
                    </div>
                    <Badge tone={TONE[picked.status]}>
                      {picked.status} · {STEP_OF[picked.status]}단계 / 6단계
                    </Badge>
                  </div>
                  <div className={s.pipe}>
                    {STEPS.map((label, i) => {
                      const no = i + 1;
                      const at = STEP_OF[picked.status];
                      const cls = no < at ? s.done : no === at ? s.now : undefined;
                      return (
                        <div key={label} className={cls}>
                          <span>{String(no).padStart(2, "0")}</span>
                          <b>{label}</b>
                          <small>{no < at ? "완료" : no === at ? "진행 중" : "대기"}</small>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                <div className={s.grid21}>
                  <div className={s.stack}>
                    {/* ── 서류 관리 (준비 중) ── */}
                    <Card
                      title="서류 관리"
                      padded={false}
                      action={<Badge tone="neutral">준비 중</Badge>}
                    >
                      <TableWrap>
                        <thead>
                          <tr>
                            <th>서류</th>
                            <th>담당</th>
                            <th>상태</th>
                          </tr>
                        </thead>
                        <tbody>
                          {DOCS.map((d) => (
                            <tr key={d.name}>
                              <td>
                                <b>{d.name}</b>
                              </td>
                              <td>{d.owner}</td>
                              <td>
                                <Badge tone="neutral">준비 중</Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </TableWrap>
                      <div className="pf-card-body" style={{ paddingTop: 0 }}>
                        <Note>
                          서류를 주고받는 기능은 아직 열지 않았습니다. 지금은 거래에 필요한 서류
                          목록만 보여 드립니다. 실제 파일은 담당자와 직접 주고받습니다.
                        </Note>
                      </div>
                    </Card>

                    {/* ── 생산 일정 (준비 중) ── */}
                    <Card title="생산 일정" action={<Badge tone="neutral">준비 중</Badge>}>
                      <ul className={s.timeline}>
                        <li className={s.hit}>
                          <b>견적 요청 접수</b>
                          <span>{day(picked.createdAt)}</span>
                        </li>
                        <li className={s.hit}>
                          <b>최근 상태 변경 · {picked.status}</b>
                          <span>{day(picked.updatedAt)}</span>
                        </li>
                        <li>
                          <b>희망 납기</b>
                          <span>{picked.targetDate}</span>
                        </li>
                      </ul>
                      <Note>
                        생산 일정은 제조사가 확정한 뒤 담당자가 올립니다. 날짜를 자동으로 잡아 주는
                        기능은 준비 중입니다.
                      </Note>
                    </Card>
                  </div>

                  <aside className={s.stack}>
                    {/* ── 프로젝트 요약 ── */}
                    <Card title="프로젝트 요약">
                      <dl>
                        <KV label="견적 번호">{picked.id}</KV>
                        <KV label="제품 유형">{picked.productType}</KV>
                        <KV label="제형">{picked.dosageForm}</KV>
                        <KV label="물량">
                          {picked.quantity.toLocaleString("ko-KR")}
                          {picked.unit}
                        </KV>
                        <KV label="주요 원료">{picked.ingredients.join(" · ") || "미지정"}</KV>
                        <KV label="희망 납기">{picked.targetDate}</KV>
                        <KV label="예산 구분">{picked.budgetRange || "미정"}</KV>
                        <KV label="접수일">{day(picked.createdAt)}</KV>
                        <KV label="최근 갱신">{day(picked.updatedAt)}</KV>
                      </dl>
                      {picked.memo && (
                        <Note>
                          요청 메모 · {picked.memo}
                        </Note>
                      )}
                    </Card>

                    {/* ── 알림 ── */}
                    <Card
                      title="알림"
                      padded={false}
                      action={<span className="pf-help">{quotes.length}건</span>}
                    >
                      <Feed>
                        {quotes.slice(0, 5).map((q) => (
                          <FeedItem
                            key={q.id}
                            tag={<Badge tone={TONE[q.status]}>{q.status}</Badge>}
                            title={`${q.productType} · ${NOTICE[q.status]}`}
                            meta={`${day(q.updatedAt)} · ${q.id}`}
                          />
                        ))}
                      </Feed>
                    </Card>
                  </aside>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Container>
  );
}
