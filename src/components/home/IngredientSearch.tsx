"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import s from "./home.module.css";

/**
 * 원료 검색 한 줄.
 *
 * 후보는 ①지금 시세판에 올라 있는 원료(signals) ②공개 집계 상위 원료 목록(ingredients-top.json)
 * 두 곳에서 **앞글자가 맞는 것**만 고른다. 시세판에 있으면 그 자리에서 대표 카드를 바꾸고,
 * 없으면 견적 폼으로 그 원료를 싣고 넘어간다.
 *
 * ingredients-top 은 어댑터에 없는 파일이라 여기서 한 번만 받아 메모리에 둔다.
 * 실패하면 목록이 비고 드롭다운만 닫힌다 — 화면은 멀쩡히 돌아간다(콘솔 에러 없음).
 */

const TOP_URL = "/vc-platform/data/ingredients-top.json";
const MAX = 5;

type Row = { name: string; monthlyVolume: number };

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

export default function IngredientSearch({
  signals,
  onPick,
}: {
  /** 시세판에 올라 있는 원료(이름 → 검색량). 여기 있으면 화면 안에서 바로 바꾼다. */
  signals: Row[];
  onPick: (name: string) => void;
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
  const pool = [...signals, ...rows];
  const seen = new Set<string>();
  const hits: Row[] = [];
  if (key) {
    for (const r of pool) {
      if (!r?.name || seen.has(r.name) || !r.name.startsWith(key)) continue;
      seen.add(r.name);
      hits.push(r);
      if (hits.length >= MAX) break;
    }
  }

  function choose(name: string) {
    setOpen(false);
    setQ("");
    if (signals.some((r) => r.name === name)) {
      onPick(name);
      return;
    }
    router.push(`/quote/?ingredient=${encodeURIComponent(name)}`);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
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
      choose(hits[Math.min(cursor, hits.length - 1)].name);
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

      {open && hits.length > 0 && (
        <ul className={s.searchList} id={boxId} role="listbox" aria-label="검색 후보">
          {hits.map((r, i) => (
            <li
              key={r.name}
              role="option"
              aria-selected={i === cursor}
              className={i === cursor ? s.searchOn : undefined}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setCursor(i)}
              onClick={() => choose(r.name)}
            >
              <span>{r.name}</span>
              <b>{nf.format(r.monthlyVolume)}</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
