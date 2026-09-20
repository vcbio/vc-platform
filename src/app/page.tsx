import Link from "next/link";
import { Badge, ButtonLink, Card, Container } from "@/components/ui";
import TrustBar from "@/components/home/TrustBar";
import MatchPreview from "@/components/home/MatchPreview";
import { previewResults } from "@/components/home/preview";
import { homeStats } from "@/components/home/stats";
import { getData, type Insight } from "@/lib/data";
import s from "@/components/home/home.module.css";

/** 동향 탭을 사람이 읽는 말로 바꾼다. 색만으로 구분하지 않고 글자를 함께 쓴다. */
const TAB_LABEL = {
  weekly: { text: "주간 메모", tone: "info" as const },
  trend: { text: "시장 동향", tone: "neutral" as const },
  safety: { text: "안전·표시", tone: "warn" as const },
};

const FLOW: { no: string; name: string; desc: string; soon?: boolean }[] = [
  { no: "01", name: "기획", desc: "제품 컨셉과 기능성 카테고리를 정합니다" },
  { no: "02", name: "소싱", desc: "등록 원료에서 후보를 고릅니다" },
  { no: "03", name: "매칭", desc: "조건에 맞는 제조사를 추천합니다" },
  { no: "04", name: "생산", desc: "진행 단계를 거래관리에서 확인합니다", soon: true },
  { no: "05", name: "품질", desc: "시험성적서를 건별로 보관합니다", soon: true },
  { no: "06", name: "출시", desc: "품목신고 이후 이력을 남깁니다", soon: true },
];

function FeedItem({ insight }: { insight: Insight }) {
  const tag = TAB_LABEL[insight.tab];
  return (
    <li>
      <span className={s.tag}>
        <Badge tone={tag.tone}>{tag.text}</Badge>
      </span>
      <span className={s.feedTxt}>
        <Link href="/insight/">{insight.title}</Link>
        <span className={s.feedMeta}>
          {insight.publishedAt} · {insight.source}
        </span>
      </span>
    </li>
  );
}

export default async function Home() {
  // 빌드 시점에는 시드로, 브라우저에서는 저장분으로 같은 어댑터가 다시 읽는다.
  const [stats, preview, insights] = await Promise.all([
    homeStats(),
    previewResults(),
    getData().listInsights(),
  ]);

  return (
    <Container>
      <div className={s.page}>
        <section className={s.hero}>
          <div className={s.heroIn}>
            <span className={s.eyebrow}>B2B Sourcing Platform</span>
            <h1 className={s.heroTitle}>
              원료 소싱부터 <span className={s.nowrap}>생산·품질 서류까지,</span>
              <br />
              <em>한 곳에서</em> 끝내는 건강기능식품 B2B
            </h1>
            <p className={s.heroLead}>
              제형·물량·일정을 입력하면 조건에 맞는 GMP·HACCP 제조사를 바로 추려 보여 드립니다.
              제조사 열 곳에 따로 문의하던 2주를 조건 입력 3분으로 줄입니다.
            </p>
            <div className={s.heroCta}>
              <ButtonLink href="/quote/">견적 요청하기</ButtonLink>
              <ButtonLink href="/insight/" variant="secondary">
                이번 주 업계 동향 보기
              </ButtonLink>
            </div>
            <p className={s.heroNote}>
              가입과 조건 입력은 무료입니다. 추천 결과를 보고 진행 여부를 정하시면 됩니다.
            </p>
          </div>
        </section>

        <TrustBar initial={stats} />
        <p className="pf-help" style={{ marginTop: 10 }}>
          지표는 플랫폼에 등록된 시연용 데모 데이터를 그대로 센 값입니다.
        </p>

        <div className={s.secHead}>
          <div>
            <h2>제조사 추천 미리보기</h2>
            <p>GMP 보유 · 리드타임 6주 이내 조건으로 지금 추천되는 제조사입니다.</p>
          </div>
          <ButtonLink href="/match/" variant="ghost" size="sm">
            내 조건으로 찾아보기
          </ButtonLink>
        </div>
        <MatchPreview initial={preview} />

        <div className={s.grid21}>
          <Card
            title="오늘의 업계 동향"
            padded={false}
            action={
              <ButtonLink href="/insight/" variant="ghost" size="sm">
                전체 보기
              </ButtonLink>
            }
          >
            <ul className={s.feed}>
              {insights.slice(0, 3).map((i) => (
                <FeedItem key={i.id} insight={i} />
              ))}
            </ul>
          </Card>

          <Card title="이용 안내">
            <dl>
              <div className={s.kv}>
                <dt>플랫폼 가입</dt>
                <dd>무료</dd>
              </div>
              <div className={s.kv}>
                <dt>조건 매칭 · 견적 요청</dt>
                <dd>무료</dd>
              </div>
              <div className={s.kv}>
                <dt>원료 중개 수수료</dt>
                <dd>거래액의 10~15%</dd>
              </div>
              <div className={s.kv}>
                <dt>완제품 중개 수수료</dt>
                <dd>거래액의 5~10%</dd>
              </div>
            </dl>
            <p className={s.noteLine}>
              수수료율은 품목·물량·거래 조건에 따라 위 범위 안에서 협의로 정합니다. 견적 금액은
              제조사 회신 단계에서 개별 안내됩니다.
            </p>
          </Card>
        </div>

        <div className={s.secHead}>
          <div>
            <h2>서비스 흐름</h2>
            <p>기획부터 출시까지 여섯 단계를 플랫폼 안에서 그대로 따라갑니다.</p>
          </div>
        </div>
        <div className={s.flow}>
          {FLOW.map((f) => (
            <div key={f.no}>
              <span className={s.flowNo}>{f.no}</span>
              <b>{f.name}</b>
              <p>{f.desc}</p>
              {f.soon && (
                <span className={s.flowSoon}>
                  <Badge tone="neutral">준비 중</Badge>
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}
