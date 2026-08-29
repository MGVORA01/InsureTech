import { useEffect, useRef, useState } from 'react'
import { Loader } from '@/components/Loader'
import { sendChatMessage } from './chatApi'
import type { ChatMessage } from './chat.types'

interface ChatPopupProps {
  onClose: () => void
}

function ChatPopup({ onClose }: ChatPopupProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Hi! I\'m your InsureTech AI assistant. Ask me anything about insurance policies, coverage, or claims.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sessionRef = useRef<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  async function handleSend() {
    const q = input.trim()
    if (!q || loading) return

    setInput('')
    setError(null)

    const userMsg: ChatMessage = { role: 'user', content: q }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      const history = messages.slice(1).map((m) => ({ role: m.role, content: m.content }))
      const res = await sendChatMessage(q, sessionRef.current, history)
      sessionRef.current = res.session_id

      const assistantMsg: ChatMessage = {
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
    <div className="fixed bottom-[90px] right-6 z-[60] animate-fadeIn" role="dialog" aria-modal="true" aria-label="Chat assistant">
      <div className="flex h-[70vh] w-[calc(100vw-24px)] flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-[0_16px_48px_rgba(16,42,69,0.28)] sm:h-[600px] sm:w-[400px]">
        <div className="flex items-center justify-between bg-primary px-4 py-3.5 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full bg-cta">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a8.5 8.5 0 1 1-3.6-6.9" />
                <path d="M21 4l-9.4 9.4" />
                <path d="M17 4h4v4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">InsureTech Assistant</p>
              <p className="flex items-center gap-1.5 text-[11px] leading-tight text-white/65">
                <span className="inline-block h-[7px] w-[7px] rounded-full bg-emerald-400" />
                Online
              </p>
            </div>
          </div>
          <button
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-none bg-transparent text-white/75 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
            onClick={onClose}
            aria-label="Close chat"
            type="button"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-background p-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-[var(--radius-md)] px-3.5 py-2.5 text-sm leading-6 ${msg.role === 'user' ? 'rounded-br-[2px] bg-secondary text-white' : 'rounded-bl-[2px] border border-border bg-surface text-text-primary'}`}>
                <p className="whitespace-pre-wrap leading-6">{msg.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-[var(--radius-md)] rounded-bl-[2px] border border-border bg-surface px-3.5 py-2.5 text-sm leading-6 text-text-primary">
                <Loader variant="dots" label="Assistant is typing..." size={18} />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-[var(--radius-sm)] bg-[rgba(231,76,60,0.08)] px-2.5 py-1.5 text-center text-[13px] text-[#e74c3c]">
              {error}
            </div>
          )}

          <div ref={endRef} />
        </div>

        <div className="flex items-center gap-2 border-t border-border bg-surface px-4 py-3">
          <input
            className="flex-1 rounded-[var(--radius-md)] border border-border bg-background px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-secondary"
            type="text"
            placeholder="Ask about your coverage..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button
            className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[var(--radius-md)] border-none bg-cta text-cta-contrast transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleSend}
            disabled={loading || !input.trim()}
            aria-label="Send message"
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatPopup
