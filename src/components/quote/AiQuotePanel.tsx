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
};

const endpoint = (process.env.NEXT_PUBLIC_VC_AI_ENDPOINT || "").replace(/\/$/, "");
const examples = [
  "정제와 분말스틱 중 어떤 제형을 검토하면 좋을까요?",
  "원료 사용 조건을 확인하려면 무엇을 알려드려야 하나요?",
  "견적 요청 전에 수량과 납품일을 어떻게 정하나요?",
];
const contactPattern = /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?:\+?82[- .]?)?0\d{1,2}[- .]?\d{3,4}[- .]?\d{4}|주소|거주지|우편번호|담당자|회사\s*위치|회사명\s*[:：]|연락처|(?:제\s*이름|저는|제가)\s*[가-힣]{2,5}|^[가-힣]{2,4}(?:입니다|이에요|예요)/;

export default function AiQuotePanel({ onUseForm, mode }: {
  onUseForm: () => void;
  mode: "checking" | "admin" | "customer";
}) {
  const ready = Boolean(mode === "customer" && endpoint && supabase);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = input.trim();
    if (!ready || busy || !question) return;
    if (contactPattern.test(question)) {
      setError("이름·전화번호·이메일은 대화에 적지 마세요. 고객정보 화면에 이미 저장되어 있습니다.");
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
      }]);
    } catch {
      setError("맥북 AI에 연결되지 않았습니다. 직접 입력으로 견적을 계속 작성할 수 있습니다.");
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
          <p>제품 조건을 대화로 정리하고, 최종 견적은 직접 확인해 제출합니다.</p>
        </div>
        <span className={ready ? s.aiStatusReady : s.aiStatusWaiting}>
          {mode === "admin" ? "관리자 미리보기" : mode === "checking" ? "계정 확인 중" : ready ? "맥북 AI 연결 설정됨" : "AI 연결 전"}
        </span>
      </div>

      <div className={s.aiConversation} role="log" aria-label="AI 견적 대화" aria-live="polite" aria-relevant="additions">
        {messages.length === 0 && (
          <div className={s.aiEmpty}>
            <p className={s.aiEmptyTitle}>{mode === "admin" ? "고객 화면 미리보기" : ready ? "어떤 제품을 만들고 싶으신가요?" : "대화 기능을 연결할 준비를 하고 있습니다."}</p>
            <p>{mode === "admin" ? "AI 대화 입력과 견적 제출은 관리자 미리보기에서 사용할 수 없습니다."
              : ready ? "제형·수량·희망일을 말씀해 주세요. 연락처는 적지 않아도 됩니다."
                : "현재는 AI 답변을 받을 수 없습니다. 아래의 직접 입력으로 견적을 요청할 수 있습니다."}</p>
          </div>
        )}
        {messages.map((message, index) => (
          <div className={message.role === "user" ? s.aiUserMessage : s.aiAssistantMessage} key={`${index}-${message.role}`}>
            <strong>{message.role === "user" ? "나" : "AI 도우미"}</strong>
            <p>{message.content}</p>
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
          placeholder={ready ? "예: 일반식품 분말스틱 1만 포를 기획하고 있어요." : "AI 연결 후 질문을 입력할 수 있습니다."} />
        <div className={s.aiActions}>
          <p>견적은 자동 제출되지 않습니다. 원료 사용 여부는 공식 원문 확인이 필요합니다.</p>
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
