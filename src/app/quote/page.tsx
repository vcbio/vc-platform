"use client";

import { useEffect } from "react";
import Link from "next/link";

/** GitHub Pages 정적 배포에서는 서버 리디렉션을 쓸 수 없어 브라우저에서 옛 주소를 넘긴다. */
export default function LegacyQuotePage() {
  useEffect(() => {
    window.location.replace(`/vc-platform/quote/ai/${window.location.search}${window.location.hash}`);
  }, []);

  return (
    <main className="pf-container" style={{ paddingBlock: 64 }}>
      <h1>AI 견적 화면으로 이동합니다</h1>
      <p><Link href="/quote/ai/">자동으로 이동하지 않으면 여기를 눌러 주세요.</Link></p>
    </main>
  );
}
