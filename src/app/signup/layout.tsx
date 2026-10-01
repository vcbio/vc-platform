import { pageMetadata } from "@/lib/pageMetadata";
export const metadata = pageMetadata("회원가입", "회원가입하고 제조 문의 진행 상황을 확인하세요.", "/signup/", "page-signup", false);
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
