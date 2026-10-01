import { pageMetadata } from "@/lib/pageMetadata";
export const metadata = pageMetadata("원료 상세", "원료별 검색 동향과 공개 산업 자료를 확인하세요.", "/ingredient/", "page-ingredient", false);
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
