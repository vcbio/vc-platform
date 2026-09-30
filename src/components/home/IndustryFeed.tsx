"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui";
import type { Insight } from "@/lib/data";
import { selectHomeInsights, todayKst } from "@/lib/data/homeInsights";
import s from "./home.module.css";

const TAB_LABEL = {
  weekly: { text: "주간 메모", tone: "info" as const },
  trend: { text: "시장 동향", tone: "neutral" as const },
  safety: { text: "안전·표시", tone: "warn" as const },
  broadcast: { text: "홈쇼핑 방송", tone: "info" as const },
  report: { text: "제조보고", tone: "neutral" as const },
};

export default function IndustryFeed({ insights }: { insights: Insight[] }) {
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setToday(todayKst());
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  if (!today) return <p className="pf-help">자료 날짜를 확인 중입니다.</p>;

  const visible = selectHomeInsights(insights, today);
  if (!visible.length) return <p className="pf-help">최근 7일 기준 업계 자료가 없습니다. 전체 보기에서 이전 글과 기준일을 확인해 주세요.</p>;

  return <ul className={s.feed}>{visible.map((insight) => {
    const tag = TAB_LABEL[insight.tab];
    return <li key={insight.id}>
      <span className={s.tag}><Badge tone={tag.tone}>{tag.text}</Badge></span>
      <span className={s.feedTxt}>
        <Link href="/insight/#industry-articles">{insight.title}</Link>
        <span className={s.feedMeta}>기준일 {insight.publishedAt} · {insight.source}</span>
      </span>
    </li>;
  })}</ul>;
}
