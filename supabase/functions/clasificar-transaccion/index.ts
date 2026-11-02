// eslint-disable-next-line import/no-unresolved
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!

const CATEGORIAS = [
  // Gastos - Alimentación
  'Restaurantes', 'Supermercado', 'Comida rápida', 'Cafetería', 'Delivery',
  // Gastos - Transporte
  'Transporte público', 'Taxi / Uber', 'Combustible', 'Estacionamiento', 'Mantenimiento auto',
  // Gastos - Salud
  'Farmacia', 'Médico / Clínica', 'Seguro médico', 'Gimnasio', 'Salud mental',
  // Gastos - Educación
  'Matrícula / Pensión', 'Libros y útiles', 'Cursos online', 'Idiomas',
  // Gastos - Hogar
  'Alquiler', 'Electricidad', 'Agua', 'Internet / Cable', 'Celular', 'Limpieza', 'Reparaciones',
  // Gastos - Entretenimiento
  'Streaming', 'Videojuegos', 'Salidas / Ocio', 'Viajes', 'Deportes',
  // Gastos - Personal
  'Ropa y calzado', 'Peluquería / Belleza', 'Accesorios',
  // Gastos - Finanzas
  'Cuotas / Deudas', 'Impuestos', 'Seguros',
  // Gastos - Otros
  'Mascotas', 'Regalos', 'Donaciones', 'Otros gastos',
  // Ingresos
  'Salario', 'Freelance', 'Negocio propio', 'Inversiones', 'Alquiler cobrado', 'Bonos / Comisiones', 'Otros ingresos',
  // Ambos
  'Transferencias', 'Ahorro',
]

const CATEGORIAS_GASTO = CATEGORIAS.filter(c => ![
  'Salario', 'Freelance', 'Negocio propio', 'Inversiones',
  'Alquiler cobrado', 'Bonos / Comisiones', 'Otros ingresos',
].includes(c))

const CATEGORIAS_INGRESO = [
  'Salario', 'Freelance', 'Negocio propio', 'Inversiones',
  'Alquiler cobrado', 'Bonos / Comisiones', 'Otros ingresos',
  'Transferencias', 'Ahorro',
]

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: CORS_HEADERS })
}

function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
}

function validarCategoria(sugerida: string, tipo: string) {
  const permitidas = tipo === 'ingreso' ? CATEGORIAS_INGRESO : CATEGORIAS_GASTO
  const fallback = tipo === 'ingreso' ? 'Otros ingresos' : 'Otros gastos'
  if (!sugerida.trim()) return fallback

  const exacta = permitidas.find(c => normalizar(c) === normalizar(sugerida))
  if (exacta) return exacta

  const encontrada = permitidas.find(c => {
    const nCat = normalizar(c)
    const nSug = normalizar(sugerida)
    return nCat.includes(nSug) || nSug.includes(nCat) ||
      nCat.split(' ')[0] === nSug.split(' ')[0] ||
      nCat.split('/')[0].trim() === nSug.split('/')[0].trim()
  })

  return encontrada || (tipo === 'ingreso' ? 'Otros ingresos' : 'Otros gastos')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  try {
    const body = await req.json()
    const descripcion = String(body?.descripcion || '').trim()
    const tipoSolicitado = String(body?.tipo || 'gasto').toLowerCase()
    const tipo = tipoSolicitado === 'ingreso' ? 'ingreso' : 'gasto'

    if (descripcion.length < 3) {
      return json({ error: 'La descripción es demasiado corta' }, 400)
    }

    if (!GROQ_API_KEY) {
      return json({ error: 'GROQ_API_KEY no configurada en Supabase' }, 500)
    }

    const categoriasPermitidas = tipo === 'ingreso' ? CATEGORIAS_INGRESO : CATEGORIAS_GASTO

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        reasoning_effort: 'low',
        messages: [
          {
            role: 'system',
            content: 'Eres un clasificador de movimientos financieros personales. Respondes ÚNICAMENTE con JSON válido, sin markdown, sin razonamiento, sin explicaciones.',
          },
          {
            role: 'user',
            content: `Clasifica esta descripción de un movimiento financiero peruano.

Tipo de movimiento: ${tipo}
Descripción: "${descripcion}"

Categorías permitidas (elige EXACTAMENTE una):
${categoriasPermitidas.join(', ')}

Reglas:
- Elige la categoría más específica que corresponda.
- Si no hay certeza, usa "Otros gastos" o "Otros ingresos" según el tipo.
- Devuelve una confianza entre 0 y 1.
- Responde SOLO el objeto JSON, nada más.

Formato exacto:
{"categoria_sugerida":"nombre exacto de la categoría","tipo":"${tipo}","confianza":0.9,"razon":"breve"}`,
          },
        ],
        max_tokens: 300,
        temperature: 0,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Error de Groq:', errorText)
      return json({ error: 'Error al clasificar la descripción', detalle: errorText }, response.status)
    }

    const groqData = await response.json()
    const texto = groqData?.choices?.[0]?.message?.content
    if (!texto) return json({ error: 'Groq no devolvió contenido' }, 502)

    let resultado: any
    try {
      resultado = JSON.parse(texto)
    } catch {
      const match = texto.match(/\{[\s\S]*\}/)
      if (!match) return json({ error: 'Respuesta inválida del modelo' }, 502)
      resultado = JSON.parse(match[0])
    }

    const categoria = validarCategoria(String(resultado?.categoria_sugerida || ''), tipo)

    return json({
      categoria_sugerida: categoria,
      tipo,
      confianza: Number(resultado?.confianza) || 0,
      razon: String(resultado?.razon || ''),
      modelo: 'openai/gpt-oss-20b',
    })
  } catch (error) {
    console.error('ERROR CRÍTICO:', error)
    return json({ error: 'Error interno en la Edge Function' }, 500)
  }
})
