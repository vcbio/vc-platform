"use client";

import AuthGuard from "@/components/AuthGuard";
import Container from "@/components/ui/Container";

// 관리자 본문은 다음 단계에서 만든다.
export default function AdminPage() {
  return (
    <AuthGuard requireAdmin>
      <Container>
        <div className="py-20">
          <h1>관리자</h1>
          <p className="pf-help mt-4">2단계에서 구현합니다.</p>
        </div>
      </Container>
    </AuthGuard>
  );
}
