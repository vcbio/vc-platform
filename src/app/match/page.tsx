import Link from "next/link";
import { Container } from "@/components/ui";

/** 이전 제조사 찾기 주소에서 상담 절차를 안내한다. 업체 목록은 공개하지 않는다. */
export default function MatchPage() {
  return (
    <Container>
      <div className="mx-auto w-full max-w-3xl py-14">
        <h1>제조사 상담</h1>
        <p className="pf-help mt-4">제조사 목록은 공개하지 않습니다. 제품 조건을 보내 주시면 담당자가 맞는 제조사를 확인합니다.</p>
        <ol className="mt-10 divide-y border-y" aria-label="제조사 상담 순서">
          <li className="py-5"><strong>1. 제품 조건 접수</strong><p className="pf-help mt-2">원료·제형·희망 수량과 일정을 알려 주세요.</p></li>
          <li className="py-5"><strong>2. 생산 가능 여부 확인</strong><p className="pf-help mt-2">담당자가 제조사와 인허가·제형·일정을 확인합니다. 공개 조사 자료만으로 가능하다고 단정하지 않습니다.</p></li>
          <li className="py-5"><strong>3. 개별 회신</strong><p className="pf-help mt-2">확인한 조건을 고객에게 따로 안내합니다.</p></li>
        </ol>
        <Link href="/quote/ai/" className="pf-btn pf-btn-primary mt-8">제품 조건 보내기</Link>
      </div>
    </Container>
  );
}
