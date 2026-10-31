// eslint-disable-next-line import/no-unresolved
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// La API Key se lee del entorno de Supabase
const GROQ_CHAT_API_KEY = Deno.env.get('GROQ_CHAT_API_KEY') || Deno.env.get('GROQ_API_KEY')!

Deno.serve(async (req) => {
  // Configuración CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      }
    })
  }

  try {
    const { mensaje, contexto_financiero } = await req.json()

    if (!mensaje) {
      return Response.json({ error: 'Falta el mensaje' }, { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } })
    }

    if (!GROQ_CHAT_API_KEY) {
      return Response.json({ error: 'Falta configurar GROQ_CHAT_API_KEY. Ejecuta npx supabase secrets set GROQ_CHAT_API_KEY=tu_clave' }, { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } })
    }

    // Prompt del sistema para guiar al modelo
    const systemPrompt = `Eres "Finanzas IA", el asistente inteligente y amigable de una app de finanzas personales.
Tu objetivo es responder de manera clara, concisa y empática a las preguntas del usuario sobre sus finanzas.

A continuación, tienes el contexto financiero del mes actual del usuario:
${JSON.stringify(contexto_financiero, null, 2)}

REGLAS PARA RESPONDER:
1. Sé breve pero completo (máximo 4-5 oraciones). El usuario está en un dispositivo móvil.
2. Usa emojis sutilmente para hacer la respuesta más amigable.
3. Basa tus respuestas en el contexto financiero proporcionado. Si la respuesta está en los datos, dásela.
4. Si el usuario pregunta algo general ("¿cómo ahorro?"), dale un consejo corto y práctico.
5. No menciones el formato de los datos ni digas "según los datos proporcionados". Actúa como si tú mismo conocieras sus cuentas.
6. Todos los montos son en soles peruanos (S/ o PEN).
7. Si no tienes datos suficientes para responder a una pregunta específica, indícalo amablemente.
8. NUNCA dejes frases incompletas. SIEMPRE termina cada oración y cada respuesta de forma completa. No cortes respuestas a la mitad.
9. Si el usuario pregunta por un gasto específico (como alquiler, servicios, etc.), responde con la información disponible o indica que no tienes ese dato.
10. Cuando te pregunten por "ahorro total" o "balance", muestra el monto exacto del balance y termina con una recomendación concreta y práctica.
11. Siempre termina tus recomendaciones con una acción clara que el usuario pueda realizar.
12. Si el usuario pide "recomendaciones", "consejos" o "qué hacer", da al menos 2-3 recomendaciones específicas y termina cada una completamente.

EJEMPLO de respuesta completa sobre ahorro:
"Tu ahorro total es de S/ 500. Te recomiendo destinar al menos el 20% de tus ingresos mensuales a un fondo de emergencia. 💰"`

    // Llamada a la API de Groq usando Llama 3.3 70B
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_CHAT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: mensaje }
        ],
        max_tokens: 600,
        temperature: 0.5,
        stop: null,
      })
    })

    if (!groqResponse.ok) {
      const errText = await groqResponse.text()
      console.error('Error Groq:', errText)
      return Response.json({ error: 'Error del modelo LLM: ' + errText }, { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } })
    }

    const groqData = await groqResponse.json()
    const respuestaTexto = groqData.choices[0].message.content
    const tokensInput = groqData.usage.prompt_tokens
    const tokensOutput = groqData.usage.completion_tokens

    return Response.json({
      respuesta: respuestaTexto,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    })

  } catch (error: any) {
    console.error('Excepción:', error.message)
    return Response.json({ error: 'Error interno del servidor', detalle: error.message }, { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } })
  }
})
