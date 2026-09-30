"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import s from "./home.module.css";

/**
 * 원료 검색 한 줄.
 *
 * 후보는 ①지금 시세판에 올라 있는 원료 ②공개 원료 상세 631개에서 고른다.
 * 선택한 원료는 이 플랫폼의 상세 화면에서 연다.
 *
 * 상세 목록은 여기서 한 번만 받아 메모리에 둔다.
 * 실패하면 목록이 비고 드롭다운만 닫힌다 — 화면은 멀쩡히 돌아간다(콘솔 에러 없음).
 */

const TOP_URL = "/vc-platform/data/ingredient-details.json";
const MAX = 6;

type Row = {
  id: string;
  name: string;
  monthlyVolume: number | null;
  category?: string;
  /** 기능성 분류(혈당·관절 …). 이름이 안 맞아도 이 말로 찾는 사람이 많다. */
  functionCategory?: string;
};

let topCache: Promise<Row[]> | null = null;

function loadTop(): Promise<Row[]> {
  if (!topCache) {
    topCache = fetch(TOP_URL, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (Array.isArray(j?.rows) ? (j.rows as Row[]) : []))
      .catch(() => []);
  }
  return topCache;
}

const nf = new Intl.NumberFormat("ko-KR");

/**
 * 앞글자만 맞추면 「관절」·「콜라겐」·「Q10」 같은 말로는 한 건도 안 걸린다.
 * 그래서 ①이름 앞글자 ②이름 어디든 ③기능성·분류 순으로 점수를 매겨 위에서부터 자른다.
 */
function match(key: string, pool: Row[]): Row[] {
  if (!key) return [];
  const k = key.toLowerCase();
  const seen = new Set<string>();
  const scored: { row: Row; rank: number }[] = [];

  for (const r of pool) {
    if (!r?.name || seen.has(r.name)) continue;
    const name = r.name.toLowerCase();
    const tag = `${r.functionCategory ?? ""} ${r.category ?? ""}`.toLowerCase();
    const rank = name.startsWith(k) ? 0 : name.includes(k) ? 1 : tag.includes(k) ? 2 : -1;
    if (rank < 0) continue;
    seen.add(r.name);
    scored.push({ row: r, rank });
  }

  // 같은 등급 안에서는 검색량이 큰 쪽을 먼저 보여 준다.
  scored.sort((a, b) => a.rank - b.rank || (b.row.monthlyVolume ?? -1) - (a.row.monthlyVolume ?? -1));
  return scored.slice(0, MAX).map((x) => x.row);
}

export default function IngredientSearch({
  signals,
}: {
  /** 시세판에 올라 있는 원료. */
  signals: Row[];
}) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const router = useRouter();
  const boxId = useId();
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    loadTop().then((next) => alive && setRows(next));
    return () => {
      alive = false;
    };
  }, []);

  const key = q.trim();
  const hits = match(key, [...signals, ...rows]);

  function choose(row: Row) {
    setOpen(false);
    setQ("");
    router.push(`/ingredient/?id=${encodeURIComponent(row.id)}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "Enter" && hits.length === 0 && key) {
      e.preventDefault();
      return;
    }
    if (hits.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setCursor((c) => Math.min(hits.length - 1, c + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(hits[Math.min(cursor, hits.length - 1)]);
    }
  }

  return (
    <div
      className={s.search}
      ref={wrap}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <input
        type="search"
        className={s.searchInput}
        placeholder="원료·기능으로 검색 (예: 마그네슘, 관절)"
        aria-label="원료 검색"
        role="combobox"
        aria-expanded={open && hits.length > 0}
        aria-controls={boxId}
        aria-activedescendant={
          open && hits.length > 0 ? `${boxId}-opt-${Math.min(cursor, hits.length - 1)}` : undefined
        }
        aria-autocomplete="list"
        autoComplete="off"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setCursor(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />

      {open && key !== "" && hits.length === 0 && (
        <p className={s.searchEmpty} role="status">
          공개 자료에 연결된 원료가 없습니다.
        </p>
      )}

      {open && hits.length > 0 && (
        <ul className={s.searchList} id={boxId} role="listbox" aria-label="검색 후보">
          {hits.map((r, i) => (
            <li
              key={r.name}
              id={`${boxId}-opt-${i}`}
              role="option"
              aria-selected={i === cursor}
              className={i === cursor ? s.searchOn : undefined}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setCursor(i)}
              onClick={() => choose(r)}
            >
              <span className={s.searchName}><span>{r.name}</span>{r.category && <small>{r.category}</small>}</span>
              <b>{r.monthlyVolume == null ? "자료 없음" : nf.format(r.monthlyVolume)}</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
