import { pageMetadata } from "@/lib/pageMetadata";
export const metadata = pageMetadata("원료 관리", "관리자 전용 원료 관리 화면입니다.", "/admin/ingredients/", "page-admin-ingredients", false);
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
