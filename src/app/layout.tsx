import type { Metadata } from "next";
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "VC 플랫폼 — Value Chain Platform · 건강기능식품 B2B OEM/ODM 매칭",
  description:
    "건강기능식품 제조사와 유통사를 잇는 B2B OEM/ODM 매칭 플랫폼. 견적 요청, 제조사 찾기, 원료·규제 동향을 한 곳에서 봅니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col">
        <a href="#main" className="pf-skip">
          본문으로 건너뛰기
        </a>
        <Header />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
