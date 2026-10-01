import { pageMetadata } from "@/lib/pageMetadata";
export const metadata = pageMetadata("원료 검색 동향", "검색량·최근 변화·계절·제조보고·홈쇼핑 자료로 원료 동향을 살펴보세요.", "/insight/", "page-insight", true);
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
