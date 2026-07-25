import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Loader } from "@/components/Loader";
import { compareChat } from "./comparisonApi";
import type {
  CompareChatRequest,
  CompareChatResponse,
  CompareRequest,
} from "./comparison.types";

interface ComparisonChatPopUpProps {
  compareParams: CompareRequest;
  openSignal?: number;
  hasComparison: boolean;
}

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  sources?: { policy_label: string; text: string; section_name: string }[];
}

const UNAVAILABLE_TEXT = "Information not available in the selected policies.";

function splitAssistantText(content: string): string[] {
  const cleaned = content.trim();
  if (!cleaned) return [UNAVAILABLE_TEXT];

  const explicitPoints = cleaned
    .split(/\n+|(?:^|\s)[-*]\s+|(?:^|\s)\d+\.\s+/)
    .map((point) => point.trim())
    .filter(Boolean);

  if (explicitPoints.length > 1) return explicitPoints.slice(0, 6);

  const sentences = cleaned
    .match(/[^.!?]+[.!?]+|[^.!?]+$/g)
    ?.map((point) => point.trim())
    .filter(Boolean);

  if (sentences && sentences.length > 1) return sentences.slice(0, 5);
  return [cleaned];
}

export default function ComparisonChatPopUp({
  compareParams,
  openSignal = 0,
  hasComparison,
}: ComparisonChatPopUpProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content:
        "Ask me anything about these two policies — coverage differences, exclusions, or which one suits your needs better.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (
      openSignal > 0 &&
      compareParams.policy_id_a &&
      compareParams.policy_id_b &&
      hasComparison
    ) {
      setOpen(true);
    }
  }, [
    compareParams.policy_id_a,
    compareParams.policy_id_b,
    hasComparison,
    openSignal,
  ]);

  async function handleSend(event?: FormEvent) {
    event?.preventDefault();
    const q = input.trim();
    if (!q || loading) return;

    setInput("");
    setError(null);

    const userMsg: ChatMsg = { role: "user", content: q };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.role !== "assistant" || messages.indexOf(m) !== 0)
        .map((m) => ({ role: m.role, content: m.content }));

      const payload: CompareChatRequest = {
        business_profile_id: compareParams.business_profile_id,
        policy_id_a: compareParams.policy_id_a,
        policy_id_b: compareParams.policy_id_b,
        session_id: compareParams.session_id,
        query: q,
        history,
      };

      const res: CompareChatResponse = await compareChat(payload);

      const assistantMsg: ChatMsg = {
        role: "assistant",
        content: res.answer,
        sources: res.sources,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      <button
        type="button"
        className="fixed bottom-6 right-6 z-[50] flex h-14 w-14 items-center justify-center rounded-full border-none bg-secondary text-white shadow-[0_4px_16px_rgba(13,115,119,0.3)] transition-transform duration-200 hover:scale-105 hover:shadow-[0_6px_24px_rgba(13,115,119,0.4)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close chat" : "Open chat"}
        disabled={
          !compareParams.policy_id_a ||
          !compareParams.policy_id_b ||
          !hasComparison
        }
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {open ? (
            <line x1="18" y1="6" x2="6" y2="18" />
          ) : (
            <>
              <path d="M21 12a8.5 8.5 0 1 1-3.6-6.9" />
              <path d="M21 4l-9.4 9.4" />
              <path d="M17 4h4v4" />
            </>
          )}
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/35 p-6">
          <div
            className="flex h-[min(76vh,720px)] min-h-[520px] w-[min(760px,calc(100vw-48px))] flex-col overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface shadow-card animation-[chat-slide-in_0.25s_ease-out]"
            role="dialog"
            aria-modal="true"
            aria-label="Policy comparison chat"
          >
            <div className="flex items-center justify-between border-b border-border bg-surface px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-cta">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 12a8.5 8.5 0 1 1-3.6-6.9" />
                    <path d="M21 4l-9.4 9.4" />
                    <path d="M17 4h4v4" />
                  </svg>
                </div>
                <div>
                  <p className="text-[18px] font-semibold leading-tight text-text-primary">
                    Policy Comparison Chat
                  </p>
                  <p className="mt-0.5 text-[12px] leading-tight text-text-secondary">
                    Answers use only the selected policy PDFs
                  </p>
                </div>
              </div>
              <button
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-none bg-transparent text-text-tertiary transition-colors hover:bg-background hover:text-text-primary"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                type="button"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-4 overflow-y-auto bg-background p-5">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[82%] rounded-[var(--radius-md)] px-4 py-3 text-sm leading-[1.65] ${msg.role === "user" ? "rounded-br-[2px] bg-secondary text-white" : "rounded-bl-[2px] border border-border bg-surface text-text-primary"}`}
                  >
                    {msg.role === "assistant" ? (
                      <ul className="ml-0 list-disc space-y-1 pl-[1.1rem]">
                        {splitAssistantText(msg.content).map((point, index) => (
                          <li key={`${point}-${index}`}>{point}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="whitespace-pre-wrap leading-6">
                        {msg.content}
                      </p>
                    )}
                    {msg.sources && msg.sources.length > 0 && (
                      <details className="mt-1.5 text-[11px] text-text-tertiary">
                        <summary className="cursor-pointer font-medium text-secondary">
                          Sources ({msg.sources.length})
                        </summary>
                        <ul className="mt-1 space-y-1 pl-[14px]">
                          {msg.sources.map((s, j) => (
                            <li key={j}>
                              <strong>Policy {s.policy_label}</strong>
                              {s.section_name && <> &mdash; {s.section_name}</>}
                              <br />
                              {s.text.slice(0, 120)}
                              {s.text.length > 120 ? "..." : ""}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="max-w-[82%] rounded-[var(--radius-md)] rounded-bl-[2px] border border-border bg-surface px-4 py-3">
                    <Loader variant="dots" label="Assistant is typing..." size={18} />
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-[var(--radius-sm)] bg-[rgba(231,76,60,0.08)] px-2 py-1 text-center text-[12px] text-[#e74c3c]">
                  {error}
                </div>
              )}

              <div ref={endRef} />
            </div>

            <form
              className="flex items-center gap-3 border-t border-border bg-surface p-4"
              onSubmit={handleSend}
            >
              <input
                className="flex-1 rounded-[var(--radius-md)] border border-border bg-background px-3.5 py-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-secondary"
                type="text"
                placeholder="Ask about these policies..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <button
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)] border-none bg-cta text-cta-contrast transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Send message"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
