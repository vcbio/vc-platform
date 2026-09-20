import Container from "./Container";

/** 푸터. 딥그린 브랜드색은 로고 글자에만 쓴다(본문·버튼에는 쓰지 않는다). */
export default function Footer() {
  return (
    <footer className="pf-foot">
      <Container>
        <div className="pf-foot-in">
          <div>
            <b>VC 플랫폼</b>
            <p>Value Chain Platform · 건강기능식품 B2B OEM/ODM 매칭</p>
          </div>
          <p>
            시연용 화면입니다. 표시된 제조사·원료·견적은 실제 자료가 아닙니다.
          </p>
        </div>
      </Container>
    </footer>
  );
}
