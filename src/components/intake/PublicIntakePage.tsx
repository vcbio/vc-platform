import QuickInquiryForm from "./QuickInquiryForm";
import s from "./intake.module.css";

export default function PublicIntakePage({ context = "quote" }: { context?: "quote" | "deal" }) {
  return (
    <div className={s.page}>
      <header className={s.head}>
        <span className={s.eyebrow}>Quick Inquiry</span>
        <h1>{context === "deal" ? "진행 상황 확인 전 간편 문의" : "로그인 없는 간편 문의"}</h1>
        <p>원료·제형·수량·연락처만 남기면 담당자가 확인 후 개별 회신드립니다.</p>
      </header>
      <div className={s.layout}>
        <QuickInquiryForm />
        <aside className={s.aside}>
          <h2>접수 안내</h2>
          <ul>
            <li>비회원 문의는 공개되지 않습니다.</li>
            <li>접수 내용은 담당자만 확인합니다.</li>
            <li>가입 후 새 견적부터 진행 상황을 확인할 수 있습니다.</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
