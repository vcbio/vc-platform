import { notFound } from "next/navigation";
import IngredientDetail from "@/components/ingredient/IngredientDetail";
import data from "../../../../public/data/ingredient-details.json";
import type { IngredientDetailRow } from "@/lib/data";
import { pageMetadata } from "@/lib/pageMetadata";
export const dynamicParams = false;
const rows = data.rows as IngredientDetailRow[];
export function generateStaticParams() { return rows.map(({ id }) => ({ id })); }
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = rows.find((item) => item.id === id);
  if (!row) return {};
  const volume = row.monthlyVolume == null ? "월 검색량 자료 없음" : row.monthlyVolume === 0 && !row.volumeExact ? "월 검색량 비공개" : `월 검색량 ${row.monthlyVolume.toLocaleString("ko-KR")}회${row.volumeExact ? "" : " 이상"}`;
  return pageMetadata(`${row.name} · ${volume}`, `${row.name} 원료 동향. ${volume}. 월 검색량 기준일 ${row.volumeDate || "미제공"}. 검색 관심도 관측 ${row.observedAt || "미제공"}. 8주 흐름·계절·제조보고·홈쇼핑 자료를 확인하세요.`, `/ingredient/${id}/`, id);
}
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = rows.find((item) => item.id === id);
  if (!row) notFound();
  return <IngredientDetail initialRow={row} sourcePage={data.meta.sourcePage} />;
}
