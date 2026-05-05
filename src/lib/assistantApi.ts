import { isSupabaseConfigured, supabase } from './supabase'

export type AssistantTurn = { role: 'user' | 'assistant'; content: string }

export async function invokeAssistant(
  messages: AssistantTurn[],
): Promise<{ reply: string } | { error: string }> {
  if (!isSupabaseConfigured()) {
    return { error: 'Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para usar o assistente.' }
  }

  const { data, error } = await supabase.functions.invoke<{ reply?: string; error?: string }>(
    'assistant-chat',
    { body: { messages } },
  )

  if (error) {
    let detail = error instanceof Error ? error.message : String(error)
    const ctx =
      typeof error === 'object' && error !== null && 'context' in error
        ? (error as { context: unknown }).context
        : undefined
    if (ctx instanceof Response) {
      try {
        const body: unknown = await ctx.clone().json()
        if (body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string') {
          detail = (body as { error: string }).error
        }
      } catch {
        /* ignore */
      }
    }
    return { error: detail || 'Nao foi possivel contatar o assistente.' }
  }

  if (data?.error && typeof data.error === 'string') {
    return { error: data.error }
  }

  const reply = data?.reply?.trim()
  if (!reply) {
    return { error: 'Resposta invalida do servidor.' }
  }

  return { reply }
}
