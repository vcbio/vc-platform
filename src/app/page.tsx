import Link from "next/link";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ClipboardList, Factory, TrendingUp } from "lucide-react";
import { Badge, ButtonLink, Card, Container } from "@/components/ui";
import TrustBar from "@/components/home/TrustBar";
import SignalBoard from "@/components/home/SignalBoard";
import { homeStats } from "@/components/home/stats";
import type { Insight, Signal } from "@/lib/data";
import s from "@/components/home/home.module.css";

/** 데이터랩 원본 주소 — 정의는 `src/lib/data/constants.ts` 한 곳(순환 import 방지용 분리, 2026-09-21). */
import { DATALAB_URL } from "@/lib/data/constants";

/** 동향 탭을 사람이 읽는 말로 바꾼다. 색만으로 구분하지 않고 글자를 함께 쓴다. */
const TAB_LABEL = {
  weekly: { text: "주간 메모", tone: "info" as const },
  trend: { text: "시장 동향", tone: "neutral" as const },
  safety: { text: "안전·표시", tone: "warn" as const },
  broadcast: { text: "홈쇼핑 방송", tone: "info" as const },
  report: { text: "제조보고", tone: "neutral" as const },
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
  // prebuild가 검증·생성한 같은 JSON을 정적 첫 화면에도 심는다. 옛 로컬 시드가 잠깐 보이지 않는다.
  const [stats, insightFile, signalFile] = await Promise.all([
    homeStats(),
    readFile(path.join(process.cwd(), "public/data/insights.json"), "utf8"),
    readFile(path.join(process.cwd(), "public/data/signals.json"), "utf8"),
  ]);
  const insights = (JSON.parse(insightFile) as { rows: Insight[] }).rows;
  const signals = (JSON.parse(signalFile) as { rows: Signal[] }).rows.slice(0, 10);

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
            제조사 자료는 내부에서 확인합니다. 조건을 보내 주시면 담당자가 생산 가능 여부를 확인해 회신드립니다.{" "}
            <Link href="/quote/ai/">AI 견적 상담</Link>
          </p>
        </Container>
      </div>

      <section className={`${s.sec} ${s.secBand}`}>
        <Container>
          <Card
            title="업계 자료"
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
        </Container>
      </section>
    </>
  );
}
