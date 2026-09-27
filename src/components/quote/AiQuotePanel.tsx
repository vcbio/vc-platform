"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import s from "./quote.module.css";

type MarketEvidence = {
  name: string;
  observedAt: string;
  searchInterest: number;
  note: string;
  sourceUrl: string;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  sourceUrl?: string;
  market?: MarketEvidence;
  sentSummary?: string;
  sourceCheck?: boolean;
};

const endpoint = (process.env.NEXT_PUBLIC_VC_AI_ENDPOINT || "").replace(/\/$/, "");
const examples = [
  "가상 정제 제품을 기획할 때 무엇부터 물어야 하나요?",
  "공개 원료 마그네슘을 검토할 때 다음 질문은 무엇인가요?",
  "분말스틱의 희망 일정을 어떻게 물어보면 좋나요?",
];
const contactPattern = /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?:\+?82[- .]?)?0\d{1,2}[- .]?\d{3,4}[- .]?\d{4}|주소|거주지|우편번호|담당자|회사\s*위치|회사명\s*[:：]|연락처|(?:제\s*이름|저는|제가)\s*[가-힣]{2,5}|^[가-힣]{2,4}(?:입니다|이에요|예요)/;
const privatePattern = /원가|단가|마진|거래처|고객사|계약|실제\s*견적|매입|사업자|회사명|브랜드명/;

export default function AiQuotePanel({ onUseForm, mode }: {
  onUseForm: () => void;
  mode: "checking" | "admin" | "customer";
}) {
  const ready = Boolean(mode === "admin" && endpoint && supabase);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = input.trim();
    if (!ready || busy || !question) return;
    if (!/[?？]$/.test(question)) {
      setError("시험 질문만 보낼 수 있습니다. 문장 끝에 물음표를 붙여 주세요.");
      return;
    }
    if (contactPattern.test(question) || privatePattern.test(question)) {
      setError("실제 견적·거래조건·개인정보는 입력하지 말고 공개 원료·가상 제품만 질문해 주세요.");
      return;
    }
    setError("");
    setBusy(true);
    const next: Message[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setInput("");
    try {
      const { data, error: authError } = await supabase!.auth.getSession();
      if (authError || !data.session?.access_token) throw new Error("로그인 상태를 확인해 주세요.");
      const response = await fetch(`${endpoint}/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ messages: next.filter((message) => message.role === "user").slice(-10).map(({ content }) => ({ role: "user", content })) }),
        signal: AbortSignal.timeout(40_000),
      });
      const payload = await response.json();
      if (!response.ok || typeof payload?.reply !== "string") throw new Error(payload?.error || "답변을 가져오지 못했습니다.");
      setMessages([...next, {
        role: "assistant",
        content: payload.reply,
        ...(typeof payload.sourceUrl === "string" && { sourceUrl: payload.sourceUrl }),
        ...(payload.market && { market: payload.market as MarketEvidence }),
        ...(typeof payload.sentSummary === "string" && { sentSummary: payload.sentSummary }),
        ...(payload.mode === "source_check" && { sourceCheck: true }),
      }]);
    } catch {
      setError("GPT-6 Luna 시험 연결을 확인하지 못했습니다. 관리자에게 연결 상태를 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={s.aiPanel} aria-labelledby="aiQuoteTitle">
      <div className={s.aiHeading}>
        <div>
          <p className={s.aiEyebrow}>VC PLATFORM · QUOTE ASSISTANT</p>
          <h2 id="aiQuoteTitle">AI 견적 상담</h2>
          <p>{mode === "admin" ? "관리자 전용 시험입니다. 공개 원료·가상 제품 질문만 입력해 주세요." : "고객용 AI 대화는 준비 중입니다. 견적은 직접 입력으로 의뢰할 수 있습니다."}</p>
        </div>
        <span className={ready ? s.aiStatusReady : s.aiStatusWaiting}>
          {mode === "admin" ? ready ? "GPT-6 Luna 관리자 시험" : "관리자 시험 준비 중" : mode === "checking" ? "계정 확인 중" : "고객 AI 대화 준비 중"}
        </span>
      </div>

      <div className={s.aiConversation} role="log" aria-label="AI 견적 대화" aria-live="polite" aria-relevant="additions">
        {messages.length === 0 && (
          <div className={s.aiEmpty}>
            <p className={s.aiEmptyTitle}>{mode === "admin" ? ready ? "공개 자료로 시험 질문을 보내 보세요" : "관리자 시험 연결을 준비하고 있습니다" : "고객 AI 대화는 아직 열리지 않았습니다"}</p>
            <p>{mode === "admin" ? "입력 문장 전체 대신 공개 원료·제형·질문 주제만 추려 OpenAI로 전송합니다."
              : "현재는 AI 답변을 받을 수 없습니다. 아래의 직접 입력으로 견적을 요청할 수 있습니다."}</p>
          </div>
        )}
        {messages.map((message, index) => (
          <div className={message.role === "user" ? s.aiUserMessage : s.aiAssistantMessage} key={`${index}-${message.role}`}>
            <strong>{message.role === "user" ? "나" : "AI 도우미"}</strong>
            <p>{message.content}</p>
            {message.sentSummary && <p className={s.aiEvidence}>OpenAI에 보낸 공개 정보: {message.sentSummary}</p>}
            {message.sourceCheck && <p className={s.aiEvidence}>공식 원문 확인 안내 · OpenAI 전송 없음</p>}
            {message.sourceUrl && (
              <a href={message.sourceUrl} target="_blank" rel="noopener noreferrer">식품안전나라 원료 목록 확인 ↗</a>
            )}
            {message.market && (
              <div className={s.aiEvidence}>
                <b>{message.market.name} · 검색 관심도 참고값 {Number(message.market.searchInterest).toLocaleString("ko-KR")}</b>
                <span>기준 {message.market.observedAt} · 현재 판매량이나 매출이 아닙니다.</span>
                <a href={message.market.sourceUrl} target="_blank" rel="noopener noreferrer">자료 출처 ↗</a>
              </div>
            )}
          </div>
        ))}
        {busy && <p className={s.aiWaiting} role="status">답변을 준비하고 있습니다…</p>}
      </div>

      <div className={s.aiExamples} aria-label="질문 예시">
        <span>이런 질문을 할 수 있습니다</span>
        {examples.map((example) => (
          <button type="button" key={example} onClick={() => setInput(example)} disabled={!ready || busy}>{example}</button>
        ))}
      </div>

      <form className={s.aiComposer} onSubmit={onSend}>
        <label htmlFor="aiQuoteQuestion">상담 질문</label>
        <textarea id="aiQuoteQuestion" value={input} onChange={(event) => setInput(event.target.value)}
          maxLength={500} rows={3} disabled={!ready || busy}
          placeholder={ready ? "예: 가상 분말스틱 제품은 무엇부터 확인해야 하나요?" : "AI 연결 후 질문을 입력할 수 있습니다."} />
        <div className={s.aiActions}>
          <p>{mode === "admin"
            ? "실제 견적·연락처는 쓰지 마세요. 공개 정보로 바꾼 질문만 전송되며 OpenAI에 운영 로그가 남을 수 있습니다."
            : "견적은 자동 제출되지 않습니다. 원료 사용 여부는 공식 원문 확인이 필요합니다."}</p>
          <button type="submit" className="pf-btn pf-btn-primary" disabled={!ready || busy || !input.trim()}>질문 보내기</button>
        </div>
        {error && <p className="pf-alert" role="alert">{error}</p>}
      </form>

      {mode === "customer" && (
        <div className={s.aiToForm}>
          <span>지금 바로 견적을 보내시려면</span>
          <button type="button" className="pf-btn pf-btn-secondary" onClick={onUseForm}>직접 입력으로 이동</button>
        </div>
      )}
    </section>
  );
}
