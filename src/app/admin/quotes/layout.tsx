import { pageMetadata } from "@/lib/pageMetadata";
export const metadata = pageMetadata("견적 접수 관리", "관리자 전용 견적 접수 관리 화면입니다.", "/admin/quotes/", "page-admin-quotes", false);
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
