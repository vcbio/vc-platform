import Link from "next/link";
import { Container } from "@/components/ui";

const sectionClass = "mt-9 border-t border-slate-200 pt-7";

export default function PrivacyPage() {
  return (
    <Container>
      <article className="mx-auto w-full max-w-3xl py-12 text-slate-800 sm:py-16">
        <p className="text-sm font-semibold text-slate-600">주식회사 브이씨바이오 · VC 플랫폼</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">개인정보 처리방침</h1>
        <p className="mt-5 leading-7">
          고객정보와 견적은 상담을 위해 받습니다. 견적 내용은 공개되지 않으며 로그인한 고객 본인과
          브이씨바이오 관리자만 볼 수 있습니다. 제조사에 자동으로 전달하지 않습니다.
        </p>

        <section className={sectionClass}>
          <h2 className="text-xl font-bold">1. 받는 정보와 이용 목적</h2>
          <p className="mt-3 leading-7">
            가입과 본인 확인에는 이메일과 로그인 정보를 사용합니다. 견적 접수와 회신에는 회사명,
            브랜드명, 담당자 이름, 연락처, 이메일을 받습니다. 고객이 적은 제품 유형, 제형, 수량,
            원료, 희망 납품일, 예산 구분과 요청 메모도 저장합니다. 관리자는 상담 상태와 제조사 배분에
            필요한 내부 검토 내용을 따로 기록할 수 있습니다.
          </p>
          <p className="mt-3 leading-7">
            Google 로그인을 선택하면 Google 인증을 통해 이메일과 프로필 기본 정보를 받습니다.
            Google 계정 비밀번호는 브이씨바이오가 받지 않습니다.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className="text-xl font-bold">2. 보관 기간과 파기</h2>
          <p className="mt-3 leading-7">
            가입 중에는 계정 운영과 견적 상담을 위해 보관합니다. 탈퇴 후 3년 보관에 별도로 동의하지
            않았다면 탈퇴 처리 때 고객정보와 견적을 삭제합니다. 동의했다면 탈퇴 후 연락처와 견적
            내용을 3년간 보관한 뒤 매일 실행되는 삭제 작업으로 지웁니다. 전자 기록은 운영 데이터베이스의
            해당 행을 삭제합니다. 별도 동의는 고객정보 화면에서
            바꿀 수 있습니다.
          </p>
          <p className="mt-3 leading-7">
            탈퇴 후에도 삭제를 요청할 수 있습니다. 아래 전화로 연락해 주세요.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className="text-xl font-bold">3. 외부 제공과 처리 위탁</h2>
          <p className="mt-3 leading-7">
            견적은 제조사나 다른 고객에게 자동 제공하지 않습니다. 외부 제조사에 개인정보를 전달해야
            할 때는 전달 대상과 항목을 먼저 알리고 별도로 확인받겠습니다. 로그인과 견적 저장에는
            클라우드 서비스 Supabase를 이용합니다.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className="text-xl font-bold">4. 국외 보관</h2>
          <p className="mt-3 leading-7">
            국외 이전의 근거는 개인정보 보호법 제28조의8 제1항 제3호 가목입니다.
            계약 이행에 필요한 인증·데이터 보관을 위탁합니다.
            서비스 제공에 필요한 계정 정보와 고객정보·견적 내용은 Supabase Pte. Ltd.
            (문의: privacy@supabase.com)의 싱가포르 서버에 보관됩니다. 가입, 로그인, 고객정보 저장,
            견적 접수 시 암호화된 인터넷 연결로 전송됩니다. Supabase는 인증과 데이터 보관을 위해
            처리하며 보관 기간은 위 2항을 따릅니다. 이 이전을 원하지 않으면 가입과 온라인 견적 접수를
            이용할 수 없습니다. 아래 전화로 다른 상담 방법을 문의할 수 있습니다.
          </p>
        </section>

        <section className={sectionClass}>
          <h2 className="text-xl font-bold">5. 고객의 권리와 문의처</h2>
          <p className="mt-3 leading-7">
            정보주체 또는 법정대리인은 정보의 열람·정정·삭제·처리정지와 탈퇴 후 보관 동의 철회를
            아래 전화로 요청할 수 있습니다. 요청자의 본인 또는 대리 권한을 확인한 뒤 처리하겠습니다.
            로그인 상태에서는 고객정보 화면에서 연락처와 선택 동의를 수정할 수 있습니다.
          </p>
          <p className="mt-3 rounded-xl border border-slate-200 bg-white p-4 leading-7">
            개인정보 보호업무 및 고충처리 담당: 주식회사 브이씨바이오 대표 김민식<br />
            전화: <a className="underline underline-offset-4" href="tel:023183321">02-318-3321</a>
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600">상담 전용 이메일은 개설 후 안내하겠습니다.</p>
        </section>

        <section className={sectionClass}>
          <h2 className="text-xl font-bold">6. 브라우저 저장 정보와 안전 조치</h2>
          <p className="mt-3 leading-7">
            로그인 상태 유지에는 브라우저 저장소를 사용합니다. 로그아웃하거나 브라우저 데이터를
            지우면 이 기기의 로그인 정보가 제거됩니다. 견적 본문은 이 기기 저장소에 접수 완료본으로
            보관하지 않습니다. 서버에서는 고객 본인과 관리자에게만 조회 권한을 둡니다.
          </p>
        </section>

        <p className="mt-10 text-sm text-slate-600">시행일: 2026년 9월 27일</p>
        <p className="mt-4"><Link className="underline underline-offset-4" href="/">홈으로 돌아가기</Link></p>
      </article>
    </Container>
  );
}
