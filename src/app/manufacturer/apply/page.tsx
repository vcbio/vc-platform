import ManufacturerApplicationForm from "@/components/intake/ManufacturerApplicationForm";
import { Container } from "@/components/ui";
import s from "@/components/intake/intake.module.css";

export default function ManufacturerApplyPage() {
  return (
    <Container>
      <div className={s.page}>
        <header className={s.head}>
          <span className={s.eyebrow}>Manufacturer Application</span>
          <h1>제조사 입점 신청</h1>
          <p>보유 인증과 생산 가능한 제형을 접수합니다. 제출 내용은 관리자만 확인하며 공개 목록에 자동 등록되지 않습니다.</p>
        </header>
        <div className={s.layout}>
          <ManufacturerApplicationForm />
          <aside className={s.aside}>
            <h2>검토 방식</h2>
            <ul>
              <li>제출 내용은 비공개로 검토합니다.</li>
              <li>현재 허가와 생산 범위는 별도로 확인합니다.</li>
              <li>확인 전에는 제조사 정보가 공개되지 않습니다.</li>
            </ul>
          </aside>
        </div>
      </div>
    </Container>
  );
}
