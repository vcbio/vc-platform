import { pageMetadata } from "@/lib/pageMetadata";
export const metadata = pageMetadata("문의·입점 접수 관리", "관리자 전용 문의·입점 접수 화면입니다.", "/admin/inquiries/", "page-admin-inquiries", false);
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
