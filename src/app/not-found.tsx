import { ButtonLink, Container } from "@/components/ui";
import styles from "./not-found.module.css";
export default function NotFound() {
  return <Container><section className={styles.page}>
    <p className={styles.code}>404</p><h1>찾는 페이지가 없습니다</h1>
    <p>주소가 바뀌었거나 없는 페이지입니다. 아래에서 다시 시작해 주세요.</p>
    <nav className={styles.links} aria-label="다시 시작하기">
      <ButtonLink href="/" variant="primary">홈</ButtonLink>
      <ButtonLink href="/insight/">원료 동향</ButtonLink>
      <ButtonLink href="/quote/ai/">간편 문의</ButtonLink>
    </nav>
  </section></Container>;
}
