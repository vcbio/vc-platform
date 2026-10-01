import Image from "next/image";
import Link from "next/link";
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
            제조사 제형·설비는 조사 자료 기준이며 실제 생산 여부는 상담에서 확인합니다.
          </p>
          <p><Link href="/privacy/">개인정보 처리방침</Link></p>
        </div>
        <div style={{ marginTop: 24, fontSize: 13, lineHeight: 1.8, overflowWrap: "anywhere" }}>
          <p>주식회사 브이씨바이오 · 대표자 김민식 · 사업자등록번호 540-86-03514</p>
          <p>대전광역시 유성구 장대로 106, 2층-제이69호(장대동)</p>
          <p>문의 <a href="mailto:vcplatform@gmail.com">vcplatform@gmail.com</a></p>
        </div>
      </Container>
    </footer>
  );
}
