import { pageMetadata } from "@/lib/pageMetadata";
export const metadata = pageMetadata("제조사 상담", "제조 조건을 남기면 담당자가 적합한 제조 가능 여부를 검토합니다.", "/match/", "page-match", true);
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
