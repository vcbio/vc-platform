import { pageMetadata } from "@/lib/pageMetadata";
export const metadata = pageMetadata("관리자", "관리자 전용 업무 화면입니다.", "/admin/", "page-admin", false);
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
