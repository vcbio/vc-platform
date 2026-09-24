"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge, ButtonLink, Card, Chip, Container, Select } from "@/components/ui";
import MakerCard from "./MakerCard";
import {
  getData,
  type DosageForm,
  type Manufacturer,
  type MatchCriteria,
  type MatchResult,
  type Signal,
} from "@/lib/data";
import s from "./match.module.css";

const LEAD_OPTIONS = [3, 4, 6, 8, 10];

/** 쿼리로 넘어온 조건을 읽는다. 견적 폼에서 넘어오면 제형이 미리 채워진다. */
function fromQuery(params: URLSearchParams, forms: string[]): MatchCriteria {
  const form = params.get("form");
  const lead = Number(params.get("lead"));
  return {
    dosageForm: form && forms.includes(form) ? (form as DosageForm) : undefined,
    region: params.get("region") ?? undefined,
    certification: params.get("cert") ?? undefined,
    maxLeadTimeWeeks: Number.isFinite(lead) && lead > 0 ? lead : undefined,
  };
}

export default function MatchClient() {
  const params = useSearchParams();
  const [all, setAll] = useState<Manufacturer[]>([]);
  const [criteria, setCriteria] = useState<MatchCriteria>({});
  const [results, setResults] = useState<MatchResult[]>([]);
  const [ready, setReady] = useState(false);
  const [signals, setSignals] = useState<Signal[]>([]);

  // 선택지는 등록된 제조사에서 뽑는다 — 화면에 목록을 손으로 적지 않는다.
  const forms = useMemo(
    () => [...new Set(all.flatMap((m) => m.dosageForms))].sort(),
    [all],
  );
  const regions = useMemo(() => [...new Set(all.map((m) => m.region))].sort(), [all]);
  const certs = useMemo(
    () => [...new Set(all.flatMap((m) => m.certifications))].sort(),
    [all],
  );
  const hasLeadTime = all.some((m) => m.leadTimeWeeks != null);

  useEffect(() => {
    getData()
      .listManufacturers()
      .then((rows) => {
        const active = rows.filter((m) => m.isActive);
        setAll(active);
        setCriteria(
          fromQuery(
            new URLSearchParams(params.toString()),
            active.flatMap((m) => m.dosageForms),
          ),
        );
        setReady(true);
      });
    // 쿼리 프리필은 첫 진입에서 한 번만 한다. 이후에는 사용자가 고른 조건이 이긴다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 「지금 뜨는 원료」 — 홈과 같은 어댑터·같은 문법이다. 여기서는 링크만 건다.
  useEffect(() => {
    getData().listSignals(3).then(setSignals);
  }, []);

  useEffect(() => {
    if (!ready) return;
    getData().matchManufacturers(criteria).then(setResults);
  }, [criteria, ready]);

  function set<K extends keyof MatchCriteria>(key: K, value: MatchCriteria[K]) {
    setCriteria((c) => ({ ...c, [key]: value }));
  }

  const chips: [keyof MatchCriteria, string][] = [];
  if (criteria.dosageForm) chips.push(["dosageForm", `제형 ${criteria.dosageForm}`]);
  if (criteria.region) chips.push(["region", `지역 ${criteria.region}`]);
  if (criteria.certification) chips.push(["certification", criteria.certification]);
  if (criteria.maxLeadTimeWeeks)
    chips.push(["maxLeadTimeWeeks", `리드타임 ${criteria.maxLeadTimeWeeks}주 이내`]);

  return (
    <Container>
      <div className={s.page}>
        <div className={s.pageHead}>
          <div>
            <span className={s.eyebrow}>Condition-based Matching</span>
            <h1>제조사 찾기</h1>
            <p className={s.pageSub}>
              제형·지역으로 제조사를 찾아보세요. 제형과 설비는 조사 자료 기준이며, 실제 생산 가능 여부는 상담 시 확인합니다.
            </p>
          </div>
          <ButtonLink href="/quote/" variant="ghost" size="sm">
            견적으로 요청하기
          </ButtonLink>
        </div>

        {signals.length > 0 && (
          <div className={s.signal}>
            <span className={s.signalLabel}>지금 뜨는 원료로 조건 잡기</span>
            {signals.map((sig) => (
              <span key={sig.id} className={s.signalItem}>
                {sig.href ? (
                  <a href={sig.href} target="_blank" rel="noopener noreferrer">
                    {sig.name}
                  </a>
                ) : (
                  <span className={s.signalPlain}>{sig.name}</span>
                )}
                <em>월 {sig.monthlyVolume.toLocaleString("ko-KR")}회</em>
                <b>
                  {sig.periodLabel.split(" ")[0]}{" "}
                  {sig.changePct > 0 ? "+" : ""}
                  {sig.changePct.toFixed(1)}%
                </b>
              </span>
            ))}
            <span className={s.signalTail}>기준일 {signals[0].observedAt}</span>
          </div>
        )}

        <Card>
          <div className={s.criteria}>
            <Select
              label="제형"
              value={criteria.dosageForm ?? ""}
              onChange={(e) =>
                set("dosageForm", (e.target.value || undefined) as DosageForm | undefined)
              }
            >
              <option value="">전체</option>
              {forms.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>

            <Select
              label="지역"
              value={criteria.region ?? ""}
              onChange={(e) => set("region", e.target.value || undefined)}
            >
              <option value="">전체</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>

            {certs.length > 0 && (
              <Select
                label="인증"
                value={criteria.certification ?? ""}
                onChange={(e) => set("certification", e.target.value || undefined)}
              >
                <option value="">전체</option>
                {certs.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            )}

            {hasLeadTime && (
              <Select
                label="리드타임"
                value={criteria.maxLeadTimeWeeks ? String(criteria.maxLeadTimeWeeks) : ""}
                onChange={(e) =>
                  set("maxLeadTimeWeeks", e.target.value ? Number(e.target.value) : undefined)
                }
              >
                <option value="">전체</option>
                {LEAD_OPTIONS.map((w) => (
                  <option key={w} value={w}>
                    {w}주 이내
                  </option>
                ))}
              </Select>
            )}
          </div>

          <div className={s.criteriaFoot}>
            <p className="pf-help" style={{ margin: 0 }}>
              인증·최소수량·납기는 제조사 확인 후 안내합니다.
            </p>
            <button
              type="button"
              className="pf-btn pf-btn-ghost pf-btn-sm"
              onClick={() => setCriteria({})}
            >
              조건 모두 지우기
            </button>
          </div>
        </Card>

        <div style={{ marginTop: 22 }}>
          <Card>
            <div className={s.chipRow}>
              <div className="pf-chips">
                {chips.length === 0 ? (
                  <Chip>조건 없음 · 등록 제조사 전체</Chip>
                ) : (
                  chips.map(([key, label]) => (
                    <Chip key={key} selected>
                      {label}
                    </Chip>
                  ))
                )}
              </div>
              <Badge tone="info">
                {chips.length > 0 ? "추천" : "등록"} {results.length}곳
              </Badge>
            </div>
          </Card>
        </div>

        {results.length === 0 ? (
          <div style={{ marginTop: 22 }}>
            <Card>
              <div className={s.empty}>
                <h2>조건에 맞는 제조사가 없습니다</h2>
                <p>
                  조건을 하나씩 빼면서 다시 보십시오. 리드타임을 늘리거나 인증 조건을 빼면 후보가
                  넓어집니다.
                </p>
                <div style={{ marginTop: 20 }}>
                  <button
                    type="button"
                    className="pf-btn pf-btn-secondary"
                    onClick={() => setCriteria({})}
                  >
                    조건 모두 지우기
                  </button>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <>
            <div className={s.grid3} style={{ marginTop: 22 }}>
              {results.map((r, i) => (
                <MakerCard key={r.manufacturer.id} result={r} rank={i} />
              ))}
            </div>

            <div style={{ marginTop: 22 }}>
              <Card title="대응 조건 비교" hint="견적 금액은 제조사 회신 단계에서 개별 안내됩니다." padded={false}>
                <div className={s.tblWrap}>
                  <table className={s.tbl}>
                    <thead>
                      <tr>
                        <th scope="col">제조사</th>
                        <th scope="col">지역</th>
                        <th scope="col">인증</th>
                        <th scope="col" className={s.num}>
                          일치율
                        </th>
                        <th scope="col" className={s.num}>
                          최소 발주수량
                        </th>
                        <th scope="col" className={s.num}>
                          리드타임
                        </th>
                        <th scope="col">조건 충족</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map(({ manufacturer: m, score }) => (
                        <tr key={m.id}>
                          <td>
                            <b>{m.displayName.split(" (")[0]}</b>
                          </td>
                          <td>{m.region}</td>
                          <td>{m.certifications.length ? m.certifications.join(" · ") : "확인 중"}</td>
                          <td className={s.num}>
                            <b>{chips.length === 0 ? "—" : `${score}%`}</b>
                          </td>
                          <td className={s.num}>{m.moqRange || "확인 필요"}</td>
                          <td className={s.num}>{m.leadTimeWeeks == null ? "확인 필요" : `${m.leadTimeWeeks}주`}</td>
                          <td>
                            {chips.length === 0 ? (
                              <Badge tone="neutral">조건 없음</Badge>
                            ) : score === 100 ? (
                              <Badge tone="ok">조건 전부 충족</Badge>
                            ) : (
                              <Badge tone="warn">일부 충족</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </>
        )}

        <p className={s.noteLine}>
          표시명은 익명 처리한 이름입니다. 인증은 공장 단위 표기이므로 품목별 적용 범위는 상담에서
          확인하십시오.
        </p>
      </div>
    </Container>
  );
}
