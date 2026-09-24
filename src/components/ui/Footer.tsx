import Image from "next/image";
import Container from "./Container";

/** 푸터. 브랜드 줄 · 이름 풀이 · 자료 범위 고지 세 덩어리로만 둔다. */
export default function Footer() {
  return (
    <footer className="pf-foot">
      <Container>
        <div className="pf-foot-in">
          <div>
            <Image
              src="/vc-platform/branding/vita-core-platform-horizontal.svg"
              width={210}
              height={30}
              alt="Vita Core Platform"
              className="pf-foot-logo"
              unoptimized
            />
            <p>건강기능식품 제조사와 유통사를 잇는 B2B OEM/ODM 매칭</p>
          </div>
          <p>
            제조사 제형·설비는 조사 자료 기준이며 실제 생산 여부는 상담에서 확인합니다. 원료·견적 화면에는 시연용 정보가 포함될 수 있습니다.
          </p>
        </div>
      </Container>
    </footer>
  );
}
