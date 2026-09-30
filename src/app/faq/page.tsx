import Link from "next/link";
import { Container } from "@/components/ui";

const items = [
  {
    title: "최소 생산 수량(MOQ)",
    answer: "제형·포장 방식·제조사에 따라 달라집니다. 원료와 희망 수량을 알려 주시면 생산 가능 여부와 최소 수량을 확인해 안내합니다.",
  },
  {
    title: "생산 기간",
    answer: "원료와 포장재 준비, 시험, 제조사 일정에 따라 달라집니다. 희망 납품일을 받으면 확인 가능한 일정을 회신합니다.",
  },
  {
    title: "품목제조보고 등 인허가 지원",
    answer: "제품 유형과 원료의 인정 상태에 따라 필요한 절차가 다릅니다. 담당자가 제조사와 신고·보고 주체와 준비 서류를 확인한 뒤 지원 범위를 안내합니다.",
  },
];

export default function FaqPage() {
  return (
    <Container>
      <section className="mx-auto w-full max-w-3xl py-12 sm:py-16">
        <h1 className="text-3xl font-bold">자주 묻는 질문</h1>
        <p className="pf-help mt-4">정확한 수량과 일정은 제품 조건을 받은 뒤 확인합니다.</p>
        <div className="mt-10 border-t">
          {items.map((item) => (
            <details key={item.title} className="group border-b py-5">
              <summary className="cursor-pointer font-semibold focus-visible:outline-2 focus-visible:outline-offset-4">
                {item.title}
              </summary>
              <p className="pf-help mt-4 leading-7">{item.answer}</p>
            </details>
          ))}
        </div>
        <p className="mt-9"><Link href="/quote/ai/" className="pf-btn pf-btn-primary">제품 조건 보내기</Link></p>
      </section>
    </Container>
  );
}
