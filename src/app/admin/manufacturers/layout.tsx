import { pageMetadata } from "@/lib/pageMetadata";
export const metadata = pageMetadata("제조사 관리", "관리자 전용 제조사 관리 화면입니다.", "/admin/manufacturers/", "page-admin-manufacturers", false);
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
