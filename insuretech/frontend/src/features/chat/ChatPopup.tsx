import { useEffect, useRef, useState } from 'react'
import { sendChatMessage } from './chatApi'
import type { ChatMessage } from './chat.types'
import './ChatPopup.css'

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
      const history = messages.slice(1).map(m => ({ role: m.role, content: m.content }))
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
    <div className="chat-popup" role="dialog" aria-modal="true" aria-label="Chat assistant">
      <div className="chat-popup-card">
        <div className="chat-popup-header">
          <div className="chat-popup-header-left">
            <div className="chat-popup-avatar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a8.5 8.5 0 1 1-3.6-6.9" />
                <path d="M21 4l-9.4 9.4" />
                <path d="M17 4h4v4" />
              </svg>
            </div>
            <div>
              <p className="chat-popup-title">InsureTech Assistant</p>
              <p className="chat-popup-status">
                <span className="chat-popup-dot" />
                Online
              </p>
            </div>
          </div>
          <button
            className="chat-popup-close"
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

        <div className="chat-popup-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-popup-row ${msg.role === 'user' ? 'is-user' : 'is-assistant'}`}>
              <div className={`chat-popup-bubble ${msg.role === 'user' ? 'bubble-user' : 'bubble-assistant'}`}>
                <p className="chat-popup-text">{msg.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="chat-popup-row is-assistant">
              <div className="chat-popup-bubble bubble-assistant">
                <div className="chat-popup-typing">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="chat-popup-error">
              {error}
            </div>
          )}

          <div ref={endRef} />
        </div>

        <div className="chat-popup-input-bar">
          <input
            className="chat-popup-input"
            type="text"
            placeholder="Ask about your coverage..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button
            className="chat-popup-send"
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
