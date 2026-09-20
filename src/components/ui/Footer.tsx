import Container from "./Container";

/** 푸터. 브랜드 줄 · 이름 풀이 · 시연 고지 세 덩어리로만 둔다. */
export default function Footer() {
  return (
    <footer className="pf-foot">
      <Container>
        <div className="pf-foot-in">
          <div>
            <b>VC 플랫폼</b>
            <em>Value Chain Platform</em>
            <p>건강기능식품 제조사와 유통사를 잇는 B2B OEM/ODM 매칭</p>
          </div>
          <p>
            시연용 화면입니다. 표시된 제조사·원료·견적은 실제 자료가 아닙니다.
          </p>
        </div>
      </Container>
    </footer>
  );
}
