import { Suspense } from "react";
import Container from "@/components/ui/Container";
import MatchClient from "@/components/match/MatchClient";

// useSearchParams 는 정적 내보내기에서 Suspense 경계 안에 있어야 한다.
export default function MatchPage() {
  return (
    <Suspense
      fallback={
        <Container>
          <div style={{ padding: "64px 0" }}>
            <p className="pf-help">조건을 불러오는 중입니다…</p>
          </div>
        </Container>
      }
    >
      <MatchClient />
    </Suspense>
  );
}
