import { useEffect, useRef, useState } from 'react'
import { compareChat } from './comparisonApi'
import type { CompareChatRequest, CompareChatResponse, CompareRequest } from './comparison.types'
import './ComparisonChatPopUp.css'

interface ComparisonChatPopUpProps {
  compareParams: CompareRequest
}

interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
  sources?: { policy_label: string; text: string; section_name: string }[]
}

export default function ComparisonChatPopUp({ compareParams }: ComparisonChatPopUpProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: 'assistant',
      content: 'Ask me anything about these two policies — coverage differences, exclusions, or which one suits your needs better.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const q = input.trim()
    if (!q || loading) return

    setInput('')
    setError(null)

    const userMsg: ChatMsg = { role: 'user', content: q }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      const history = messages
        .filter((m) => m.role !== 'assistant' || messages.indexOf(m) !== 0)
        .map((m) => ({ role: m.role, content: m.content }))

      const payload: CompareChatRequest = {
        business_profile_id: compareParams.business_profile_id,
        policy_id_a: compareParams.policy_id_a,
        policy_id_b: compareParams.policy_id_b,
        query: q,
        history,
      }

      const res: CompareChatResponse = await compareChat(payload)

      const assistantMsg: ChatMsg = {
        role: 'assistant',
        content: res.answer,
        sources: res.sources,
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      <button
        type="button"
        className="comparison-chat-toggle"
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close chat' : 'Open chat'}
        disabled={!compareParams.policy_id_a || !compareParams.policy_id_b}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        <div className="comparison-chat-popup" role="dialog" aria-modal="true" aria-label="Policy comparison chat">
          <div className="comparison-chat-header">
            <div className="comparison-chat-header-left">
              <div className="comparison-chat-avatar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a8.5 8.5 0 1 1-3.6-6.9" />
                  <path d="M21 4l-9.4 9.4" />
                  <path d="M17 4h4v4" />
                </svg>
              </div>
              <div>
                <p className="comparison-chat-title">Policy Comparison Chat</p>
                <p className="comparison-chat-subtitle">Ask about these two policies</p>
              </div>
            </div>
            <button
              className="comparison-chat-close"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="comparison-chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`comparison-chat-row ${msg.role === 'user' ? 'is-user' : 'is-assistant'}`}>
                <div className={`comparison-chat-bubble ${msg.role === 'user' ? 'bubble-user' : 'bubble-assistant'}`}>
                  <p className="comparison-chat-text">{msg.content}</p>
                  {msg.sources && msg.sources.length > 0 && (
                    <details className="comparison-chat-sources">
                      <summary>Sources ({msg.sources.length})</summary>
                      <ul>
                        {msg.sources.map((s, j) => (
                          <li key={j}>
                            <strong>Policy {s.policy_label}</strong>
                            {s.section_name && <> &mdash; {s.section_name}</>}
                            <br />
                            {s.text.slice(0, 120)}{s.text.length > 120 ? '...' : ''}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="comparison-chat-row is-assistant">
                <div className="comparison-chat-bubble bubble-assistant">
                  <div className="comparison-chat-typing">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="comparison-chat-error">{error}</div>
            )}

            <div ref={endRef} />
          </div>

          <div className="comparison-chat-input-bar">
            <input
              className="comparison-chat-input"
              type="text"
              placeholder="Ask about these policies..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button
              className="comparison-chat-send"
              onClick={handleSend}
              disabled={loading || !input.trim()}
              aria-label="Send message"
              type="button"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
