import { pageMetadata } from "@/lib/pageMetadata";
export const metadata = pageMetadata("로그인", "로그인하고 제조 상담과 진행 상황을 확인하세요.", "/login/", "page-login", false);
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
