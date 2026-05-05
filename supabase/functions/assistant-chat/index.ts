import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `Voce e o assistente do site Arena Quadras, uma aplicacao para gestao e reserva de quadras esportivas (volei, basquete, beach tennis).
Ajude de forma breve e cordial em portugues do Brasil.
Explique: cadastro/login, navegacao para empresa e quadras, fluxo geral de reserva (sem inventar precos ou horarios especificos — diga que variam por empresa e que o usuario deve ver na tela ou perguntar ao gestor).
Se perguntarem algo que dependa da conta ou dados ao vivo (minhas reservas, disponibilidade exata), oriente a usar as telas do site ou contatar o administrador da empresa.
Nao peca nem armazene senhas. Nao afirme ter acesso a banco de dados ou sistemas internos.`

type ChatMessage = { role: 'user' | 'assistant'; content: string }

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function clampMessages(raw: unknown): ChatMessage[] | null {
  if (!Array.isArray(raw)) return null
  const out: ChatMessage[] = []
  for (const item of raw.slice(-24)) {
    if (!item || typeof item !== 'object') continue
    const role = (item as ChatMessage).role
    const content = (item as ChatMessage).content
    if (role !== 'user' && role !== 'assistant') continue
    if (typeof content !== 'string') continue
    const trimmed = content.slice(0, 8000)
    if (trimmed.length === 0) continue
    out.push({ role, content: trimmed })
  }
  return out.length ? out : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const apiKey = Deno.env.get('OPENAI_API_KEY')?.trim()
  if (!apiKey) {
    return jsonResponse({ error: 'Assistente indisponivel: OPENAI_API_KEY nao configurada no servidor.' }, 503)
  }

  let payload: { messages?: unknown }
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'JSON invalido' }, 400)
  }

  const messages = clampMessages(payload.messages)
  if (!messages) {
    return jsonResponse({ error: 'Envie messages: array de { role, content }' }, 400)
  }

  const openaiBody = {
    model: Deno.env.get('OPENAI_CHAT_MODEL')?.trim() || 'gpt-4o-mini',
    messages: [{ role: 'system' as const, content: SYSTEM_PROMPT }, ...messages],
    temperature: 0.5,
    max_tokens: 900,
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(openaiBody),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error('OpenAI error:', res.status, errText)
    return jsonResponse({ error: 'Falha ao consultar o modelo. Tente novamente.' }, 502)
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const reply = data.choices?.[0]?.message?.content?.trim()
  if (!reply) {
    return jsonResponse({ error: 'Resposta vazia do modelo.' }, 502)
  }

  return jsonResponse({ reply })
})
