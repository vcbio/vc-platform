import { pageMetadata } from "@/lib/pageMetadata";
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";
import "./globals.css";

export const metadata = pageMetadata("원료 동향과 제조 상담", "주식회사 브이씨바이오의 건강기능식품 B2B OEM/ODM 상담 플랫폼. 원료·시장 동향을 확인하고 제조 문의를 남기세요.", "/");

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
