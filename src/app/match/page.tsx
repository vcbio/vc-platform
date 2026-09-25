import Link from "next/link";
import { Container } from "@/components/ui";

/** 이전 제조사 찾기 주소는 남겨 두되 업체 목록은 공개하지 않는다. */
export default function MatchPage() {
  return (
    <Container>
      <div className="mx-auto w-full max-w-lg py-20">
        <h1>제조사 상담</h1>
        <p className="pf-help mt-4">제품 조건을 접수하면 브이씨바이오 담당자가 적합한 제조사를 직접 검토합니다.</p>
        <Link href="/quote/" className="pf-btn pf-btn-primary mt-8">견적 요청하기</Link>
      </div>
    </Container>
  );
}
