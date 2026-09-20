"use client";

import AuthGuard from "@/components/AuthGuard";
import Container from "@/components/ui/Container";

// 견적 요청 본문은 다음 단계에서 만든다.
export default function DealPage() {
  return (
    <AuthGuard>
      <Container>
        <div className="py-20">
          <h1>견적 요청</h1>
          <p className="pf-help mt-4">2단계에서 구현합니다.</p>
        </div>
      </Container>
    </AuthGuard>
  );
}
