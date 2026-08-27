import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import CloseIcon from '@mui/icons-material/Close'
import SendIcon from '@mui/icons-material/Send'
import { sendChatMessage } from '../features/chat/chatApi'
import type { ChatMessage } from '../features/chat/chat.types'
import UserLayout from '../layouts/UserLayout'
import type { Section } from '../components/UserSidebar'

function createSessionId() {
  if (crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function ChatPage() {
  const navigate = useNavigate()
  const sessionId = useMemo(createSessionId, [])
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Upload a policy PDF, then ask questions about that document.',
    },
  ])
  const [question, setQuestion] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  async function closeChat() {
    navigate(-1)
  }

  function handleSectionChange(section: Section) {
    if (section === 'chatbot') return
    navigate('/dashboard', { state: { section } })
  }

  async function handleSend(event: FormEvent) {
    event.preventDefault()
    const trimmed = question.trim()
    if (!trimmed || sending) return

    setMessages((current) => [...current, { role: 'user', content: trimmed }])
    setQuestion('')
    setSending(true)
    setError(null)

    try {
      const history = messages.slice(1).map(m => ({ role: m.role, content: m.content }))
      const response = await sendChatMessage(trimmed, sessionId, history)
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: response.answer,
          sources: response.sources,
        },
      ])
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.response?.data?.error || 'Chat request failed.')
    } finally {
      setSending(false)
    }
  }

  return (
    <UserLayout activeSection="chatbot" onSectionChange={handleSectionChange} contentClassName="w-full">
      <main className="min-h-screen bg-background text-text-primary">
        <header className="border-b border-border bg-surface/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">InsureTech Assistant</h1>
              <p className="break-all text-sm text-text-secondary">Session: {sessionId}</p>
            </div>
            <button
              type="button"
              onClick={closeChat}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface-alt text-text-primary transition hover:bg-background"
              aria-label="Close chat"
              title="Close chat"
            >
              <CloseIcon fontSize="small" />
            </button>
          </div>
        </header>

      <div className="mx-auto max-w-3xl px-5 py-6">

        <section className="flex min-h-[72vh] flex-col rounded-2xl border border-border bg-surface shadow-card">
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'text-white'
                      : 'border border-border bg-background text-text-primary'
                  }`}
                  style={message.role === 'user' ? { background: 'var(--color-secondary)' } : undefined}
                >
                  <p>{message.content}</p>
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 border-t border-white/20 pt-2 text-xs opacity-80">
                      {message.sources.map((source) => (
                        <p key={source}>{source}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sending && <p className="text-sm text-text-secondary">Assistant is thinking...</p>}
            <div ref={bottomRef} />
          </div>

          {error && <p className="border-t border-border px-5 py-3 text-sm text-red-700">{error}</p>}

          <form onSubmit={handleSend} className="flex gap-3 border-t border-border p-4">
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-secondary"
              placeholder="Ask a question from the uploaded PDF"
            />
            <button
              type="submit"
              disabled={sending || !question.trim()}
              className="inline-flex h-12 w-12 items-center justify-center rounded-xl text-white transition disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: 'var(--color-cta)' }}
              aria-label="Send message"
              title="Send message"
            >
              <SendIcon fontSize="small" />
            </button>
          </form>
        </section>
      </div>
      </main>
    </UserLayout>
  )
}

export default ChatPage
