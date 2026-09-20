"use client";

import { useEffect, useState } from "react";
import type { MatchResult } from "@/lib/data";
import MakerCard from "@/components/match/MakerCard";
import { previewResults } from "./preview";
import s from "./home.module.css";

export default function MatchPreview({ initial }: { initial: MatchResult[] }) {
  const [rows, setRows] = useState(initial);

  useEffect(() => {
    let alive = true;
    previewResults().then((next) => alive && setRows(next));
    return () => {
      alive = false;
    };
  }, []);

  if (rows.length === 0) {
    return <p className="pf-help">조건에 맞는 제조사가 아직 없습니다.</p>;
  }

  return (
    <div className={s.grid3}>
      {rows.map((r, i) => (
        <MakerCard key={r.manufacturer.id} result={r} rank={i} showDetail={false} />
      ))}
    </div>
  );
}
