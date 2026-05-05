import { FormEvent, useEffect, useRef, useState } from 'react'
import { invokeAssistant, type AssistantTurn } from '../lib/assistantApi'
import { isSupabaseConfigured } from '../lib/supabase'
import styles from './AssistantChat.module.css'

const WELCOME: AssistantTurn = {
  role: 'assistant',
  content:
    'Ola! Sou o assistente da Arena Quadras. Posso ajudar com cadastro, login, como encontrar uma empresa ou quadra e o fluxo de reserva. Em que posso ajudar?',
}

export function AssistantChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<AssistantTurn[]>(() => [WELCOME])
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const configured = isSupabaseConfigured()

  useEffect(() => {
    if (!open) return
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [open, messages, pending])

  useEffect(() => {
    if (!open) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  async function sendMessage(e?: FormEvent) {
    e?.preventDefault()
    const text = draft.trim()
    if (!text || pending || !configured) return

    setDraft('')
    setError(null)
    const userMsg: AssistantTurn = { role: 'user', content: text }
    const history = [...messages, userMsg]
    setMessages(history)
    setPending(true)

    const result = await invokeAssistant(history)

    setPending(false)
    if ('error' in result) {
      setError(result.error)
      return
    }

    setMessages((prev) => [...prev, { role: 'assistant', content: result.reply }])
  }

  if (!configured) {
    return null
  }

  return (
    <div className={styles.wrap}>
      {open && (
        <section id="assistant-panel" className={styles.panel} aria-label="Assistente Arena Quadras">
          <header className={styles.head}>
            <div className={styles.headText}>
              <h2 className={styles.headTitle}>Assistente</h2>
              <p className={styles.headSub}>Respostas sobre o uso do site. Sem acesso aos seus dados.</p>
            </div>
            <button type="button" className={styles.close} onClick={() => setOpen(false)} aria-label="Fechar assistente">
              ×
            </button>
          </header>

          <div ref={listRef} className={styles.messages} role="log" aria-live="polite">
            {messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={`${styles.bubble} ${m.role === 'user' ? styles.bubbleUser : styles.bubbleBot}`}
              >
                {m.content}
              </div>
            ))}
            {pending && (
              <div className={`${styles.bubble} ${styles.bubbleBot}`} aria-busy="true">
                Pensando…
              </div>
            )}
            {error && <p className={styles.err}>{error}</p>}
          </div>

          <form className={styles.composer} onSubmit={sendMessage}>
            <textarea
              className={styles.input}
              rows={2}
              placeholder="Escreva sua pergunta…"
              value={draft}
              onChange={(ev) => setDraft(ev.target.value)}
              disabled={pending}
              aria-label="Mensagem para o assistente"
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' && !ev.shiftKey) {
                  ev.preventDefault()
                  void sendMessage()
                }
              }}
            />
            <button type="submit" className={styles.send} disabled={pending || !draft.trim()}>
              Enviar
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className={styles.toggle}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="assistant-panel"
        title={open ? 'Fechar assistente' : 'Abrir assistente'}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 3a7 7 0 00-7 7v1l-2 3h6l2-3V10a3 3 0 016 0v1l2 3h4l-2-3v-1a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 18v2h6v-2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
