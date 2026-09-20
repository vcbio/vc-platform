import Link from "next/link";
import { ClipboardList, Factory, TrendingUp } from "lucide-react";
import { Badge, ButtonLink, Card, Container } from "@/components/ui";
import TrustBar from "@/components/home/TrustBar";
import SignalBoard from "@/components/home/SignalBoard";
import { homeStats } from "@/components/home/stats";
import { getData, type Insight } from "@/lib/data";
import s from "@/components/home/home.module.css";

/** 데이터랩 원본 주소 — 정의는 `src/lib/data/constants.ts` 한 곳(순환 import 방지용 분리, 2026-09-21). */
import { DATALAB_URL } from "@/lib/data/constants";

/** 동향 탭을 사람이 읽는 말로 바꾼다. 색만으로 구분하지 않고 글자를 함께 쓴다. */
const TAB_LABEL = {
  weekly: { text: "주간 메모", tone: "info" as const },
  trend: { text: "시장 동향", tone: "neutral" as const },
  safety: { text: "안전·표시", tone: "warn" as const },
};

/** 쓰는 순서 세 단계. 「준비 중」이 없는, 지금 되는 것만 적는다. */
const STEPS = [
  {
    no: "01",
    Icon: TrendingUp,
    name: "뜨는 원료 고르기",
    desc: "공개 검색 데이터에서 지금 찾는 원료를 봅니다",
  },
  {
    no: "02",
    Icon: ClipboardList,
    name: "제형·물량·일정 입력",
    desc: "네 단계 조건만 넣으면 됩니다",
  },
  {
    no: "03",
    Icon: Factory,
    name: "맞는 제조사 붙여 견적 회신",
    desc: "조건에 맞는 제조사를 추려 회신드립니다",
  },
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
  const [stats, insights, signals] = await Promise.all([
    homeStats(),
    getData().listInsights(),
    getData().listSignals(10),
  ]);

  return (
    <>
      {/* ── 첫 화면 = 시세판 ── 문구 대신 숫자가 말한다(대표 결정 2026-09-21 D11) ── */}
      <section className={s.hero}>
        <Container>
          <SignalBoard initial={signals} />
        </Container>
      </section>

      {/* ── 어떻게 되나 ── 세 단계로 끝난다 ── */}
      <section className={s.howSec}>
        <Container>
          <ol className={s.how}>
            {STEPS.map(({ no, Icon, name, desc }) => (
              <li key={no}>
                <span className={s.howIcon} aria-hidden="true">
                  <Icon size={22} strokeWidth={1.5} />
                </span>
                <span className={s.howNo}>{no}</span>
                <b>{name}</b>
                <p>{desc}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* ── 제조사 ── 주인공이 아니므로 사실 한 줄로만 ── */}
      <div className={s.band}>
        <Container>
          <TrustBar initial={stats} />
          <p className={s.bandNote}>
            제조사 정보는 플랫폼에 등록된 시연용 데모 데이터를 그대로 센 값입니다. 표시명은 익명
            처리한 이름입니다. 조건에 맞는 제조사는{" "}
            <Link href="/match/">제조사 찾기</Link>에서 직접 봅니다.
          </p>
        </Container>
      </div>

      <section className={`${s.sec} ${s.secBand}`}>
        <Container>
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
              <div className={s.feedFoot}>
                <a
                  href={DATALAB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pf-btn pf-btn-secondary pf-btn-sm"
                >
                  데이터랩에서 전체 보기 ↗<span className="pf-sr-only"> (새 탭에서 열림)</span>
                </a>
              </div>
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
        </Container>
      </section>
    </>
  );
}
