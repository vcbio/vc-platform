import Link from "next/link";
import { ClipboardList, Factory, TrendingUp } from "lucide-react";
import { Badge, ButtonLink, Card, Container } from "@/components/ui";
import TrustBar from "@/components/home/TrustBar";
import SignalBoard from "@/components/home/SignalBoard";
import SignalBand from "@/components/home/SignalBand";
import { homeStats } from "@/components/home/stats";
import { getData, type Insight } from "@/lib/data";
import s from "@/components/home/home.module.css";

/**
 * 데이터랩 원본 주소.
 * ⚠️ `@/lib/data/datalab` 의 DATALAB_URL 을 쓰고 싶지만, 그 모듈과 `local.ts` 가 서로를 import 해
 * (local → datalab → local) 서버 렌더에서 초기화 순서가 꼬인다(빌드 실패, 2026-09-21 실측).
 * 어댑터 쪽 순환이 풀리면 이 상수를 지우고 datalabLink() 로 되돌린다.
 */
const DATALAB_URL = "https://vcbio.github.io/shelf/d/vcbio-market-fable.html";

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
      {/* ── 히어로 ── 주인공은 원료 순위 보드다. 왼쪽 카피는 짧게 받친다 ── */}
      <section className={s.hero}>
        <Container>
          <div className="pf-rise">
            <span className={s.eyebrow}>Value Chain Platform</span>
            <h1 className={s.heroTitle}>
              지금 시장이 찾는 원료로 <span className={s.nowrap}>제품을 만드세요</span>
            </h1>
            <div className={s.heroRule} aria-hidden="true" />
          </div>

          <div className={s.heroGrid}>
            <div className={`${s.heroCopy} pf-rise`} style={{ "--d": "60ms" } as React.CSSProperties}>
              <p className={s.heroLead}>
                공개 검색 데이터로 뜨는 원료를 고르고 조건만 입력하면 맞는 제조사를 붙여 견적으로
                회신합니다.
              </p>
              <div className={s.heroCta}>
                <ButtonLink href="/quote/">견적 요청하기</ButtonLink>
                <Link href="/insight/" className="pf-link">
                  동향 전체 보기
                </Link>
              </div>
              <p className={s.heroNote}>
                가입과 조건 입력은 무료입니다. 회신을 보고 진행 여부를 정하시면 됩니다.
              </p>
            </div>

            <SignalBoard initial={signals} />

            {/* 오늘의 신호 — 넓은 화면에선 카피 아래 세로 세 줄, 좁은 화면에선 보드 아래 한 줄 */}
            <SignalBand initial={signals.slice(0, 3)} hero />
          </div>
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
