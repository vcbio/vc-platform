import { pageMetadata } from "@/lib/pageMetadata";
export const metadata = pageMetadata("고객 정보", "상담에 필요한 회사·담당자·연락 정보를 관리합니다.", "/profile/", "page-profile", false);
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
