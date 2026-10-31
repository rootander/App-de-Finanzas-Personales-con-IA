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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      }
    })
  }

  try {
    console.log('1. Función iniciada (Groq + Llama 4 Vision)')

    const body = await req.json()
    const { imagen_base64, mime_type, descripcion_usuario } = body

    if (!imagen_base64) {
      return Response.json({ error: 'imagen_base64 es requerido' }, { status: 400 })
    }

    if (!GROQ_API_KEY) {
      return Response.json({ error: 'GROQ_API_KEY no configurada en Supabase' }, {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' }
      })
    }

    const contextoUsuario = descripcion_usuario
      ? `CONTEXTO DEL USUARIO: "${descripcion_usuario}". Usa esto para mejorar la clasificación.`
      : ''

    const promptTexto = `Eres un experto en finanzas personales analizando un comprobante de pago peruano.

${contextoUsuario}

Analiza la imagen y extrae TODOS los datos posibles. Esta puede ser una captura de:
- Yape (app de pagos móvil peruana)
- Plin (app de pagos móvil peruana)  
- Voucher bancario (BCP, Interbank, BBVA, Scotiabank, etc.)
- Boleta o factura
- Recibo de servicio

INSTRUCCIONES DE CLASIFICACIÓN DE CATEGORÍAS (DEBES ELEGIR UNA DE ESTAS):
- Si ves "Yape", "Plin", "transferencia" entre personas → "Transferencias"
- Si ves restaurante, menú, almuerzo, cena, café, comida, pizzería, pollería → "Restaurantes"
- Si ves mercado, supermercado, bodega, Metro, Wong, Plaza Vea, tambo, Real Plaza, Cencosud → "Supermercado"
- Si ves taxi, Uber, InDrive, bus, combi, metro, estacionamiento → "Taxi / Uber"
- Si ves farmacia, InkaFarma, Mifarma, MiFarma, medicamento, pastillas → "Farmacia"
- Si ves clínica, hospital, doctor, médico, consulta, dentista, odontología → "Médico / Clínica"
- Si ves Movistar, Claro, Entel, Bitel, recibo celular, plan celular → "Celular"
- Si ves luz, recibo Enel, Luz del Sur, luz eléctrica → "Electricidad"
- Si ves agua, Sedapal, recibo de agua → "Agua"
- Si ves internet, WiFi, recibo internet, fibra óptica → "Internet / Cable"
- Si ves alquiler, renta, depósito, mensualidad vivienda → "Alquiler"
- Si ves Netflix, Spotify, Disney, HBO, YouTube, Amazon Prime, streaming → "Streaming"
- Si ves videojuegos, Steam, PlayStation, Xbox, Nintendo → "Videojuegos"
- Si ves gimnasio, fitness, crossfit, entrenamiento → "Gimnasio"
- Si ves universidad, colegio, pensión, matrícula → "Matrícula / Pensión"
- Si ves libros, útiles escolares, cuadernos, lapiceros → "Libros y útiles"
- Si ves cursos online, Udemy, Coursera, Platzi, Domestika → "Cursos online"
- Si ves idiomas, inglés, español, francés, alemán → "Idiomas"
- Si ves sueldo, salario, planilla, haberes, bonificación → "Salario"
- Si ves freelance, honorarios, servicio profesional, consulta profesional → "Freelance"
- Si ves ropa, calzado, tienda de moda, Zara, H&M, Nike, Adidas → "Ropa y calzado"
- Si ves peluquería, barbería, belleza, salón → "Peluquería / Belleza"
- Si ves viajes, hotel, vuelo, pasaje, agencia de viajes → "Viajes"
- Si ves deportes, fútbol, basketball, entrada cancha → "Deportes"
- Si ves mascota, veterinaria, alimento mascota → "Mascotas"
- Si ves regalo, obsequio, detalle → "Regalos"
- Si ves donación, aporte, contribución → "Donaciones"
- Si ves impuestos, sunat, MUNI, impuesto municipal → "Impuestos"
- Si ves seguros, póliza, seguro → "Seguros"
- Si ves cuotas, deudas, préstamo, crédito → "Cuotas / Deudas"
- Si ves transferencia bancaria, BCP, Interbank, BBVA, Scotiabank, transferencia → "Transferencias"
- Si no puedes determinar con certeza → "Otros gastos" para gastos, "Otros ingresos" para ingresos

UNIVERSIDADES PERUANAS RECONOCIDAS (si ves estas siglas o nombres → "Matrícula / Pensión"):
- UNI (Universidad Nacional de Ingeniería)
- UTP (Universidad Tecnológica del Perú)
- ULima (Universidad de Lima)
- UPC (Universidad Peruana de Ciencias Aplicadas)
- PUCP (Pontificia Universidad Católica del Perú)
- UDEP (Universidad del Pacífico)
- USMP (Universidad San Martín de Porres)
- UCV (Universidad César Vallejo)
- UNMSM (Universidad Nacional Mayor de San Marcos)
- UANCV (Universidad Alas Peruanas)
- UGEL (Unidad de Gestión Educativa Local)
- IES (Instituto de Educación Superior)
- SENATI (Servicio Nacional de Capacitación para la Industria)
- SENCICO (Servicio Nacional de Capacitación para la Industria de la Construcción)
- CIB (Centro de Investigación Bacteriológica)
- La Salle, Recoletos, Regina, Carmelitas, Inmaculado Corazón (colegios)
- any que contenga "universidad", "instituto", "colegio", "escuela", "facultad"

CATEGORÍAS DISPONIBLES (usa exactamente estos nombres):
${CATEGORIAS.join(', ')}

TIPOS DE MEDIO DE PAGO:
- "Yape": si ves el logo verde de Yape o dice "Yape"
- "Plin": si ves el logo de Plin o dice "Plin"  
- "Banco": si es un voucher bancario o transferencia bancaria directa
- "Efectivo": si menciona efectivo o no hay evidencia de pago digital
- "Tarjeta": si ves cargo a tarjeta de crédito o débito
- "Otro": si no puedes determinar

REGLAS IMPORTANTES:
- El monto SIEMPRE debe ser positivo (número absoluto)
- La fecha usa formato YYYY-MM-DD (si no hay año, usa ${new Date().getFullYear()})
- Si ves "S/" o "PEN" es moneda peruana (soles)
- La descripción debe ser breve (máx 60 caracteres) y descriptiva
- SIEMPRE debes incluir "categoria_sugerida" con una categoría válida de la lista
- Si ves siglas de universidad o nombre de institución educativa → SIEMPRE "Matrícula / Pensión"
- Evalúa la nitidez de la imagen: si el texto principal no se puede leer con claridad, si la foto está desenfocada, movida o con muy poca luz, marca "imagen_borrosa": true. Si el comprobante es legible, marca false.

Responde ÚNICAMENTE con JSON válido, sin explicaciones, sin markdown:
{"monto":0.00,"fecha":"YYYY-MM-DD","descripcion":"texto descriptivo breve","categoria_sugerida":"nombre exacto de la categoría de la lista","tipo":"gasto","medio_pago":"Yape","receptor":"nombre del receptor si aparece o null","emisor":"nombre del emisor si aparece o null","imagen_borrosa":false}`

    // Limpiamos el prefijo data:image/... si viene incluido
    const base64Data = imagen_base64.includes(',')
      ? imagen_base64.split(',')[1]
      : imagen_base64

    const imageUrl = `data:${mime_type || 'image/jpeg'};base64,${base64Data}`

    console.log('2. Enviando imagen a Groq (Llama 4 Scout Vision)...')
    console.log('Tamaño base64:', base64Data.length, 'chars')

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en OCR y análisis de comprobantes de pago peruanos. Siempre respondes con JSON válido y sin texto adicional.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              },
              {
                type: 'text',
                text: promptTexto
              }
            ]
          }
        ],
        max_tokens: 600,
        temperature: 0.05,
        response_format: { type: 'json_object' }
      })
    })

    console.log('3. Respuesta de Groq status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Error de Groq:', errorText)
      let detalle = errorText
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.error?.message) detalle = errorJson.error.message
      } catch (e) { /* no es json */ }
      return Response.json({ error: 'Error en Groq API', detalle }, {
        status: response.status,
        headers: { 'Access-Control-Allow-Origin': '*' }
      })
    }

    const groqData = await response.json()
    const texto = groqData?.choices?.[0]?.message?.content

    if (!texto) {
      console.error('Groq no devolvió contenido:', JSON.stringify(groqData))
      return Response.json({ error: 'Groq no devolvió contenido', detalle: groqData }, {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' }
      })
    }

    console.log('4. Respuesta de Groq:', texto)

    let resultado
    try {
      resultado = JSON.parse(texto)
    } catch (e) {
      // Intentamos extraer JSON con regex como fallback
      const jsonMatch = texto.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        return Response.json({ error: 'No se encontró JSON en la respuesta', texto }, {
          status: 500,
          headers: { 'Access-Control-Allow-Origin': '*' }
        })
      }
      try {
        resultado = JSON.parse(jsonMatch[0])
      } catch (e2) {
        return Response.json({ error: 'JSON inválido en respuesta del modelo', texto }, {
          status: 500,
          headers: { 'Access-Control-Allow-Origin': '*' }
        })
      }
    }

    // Validamos y normalizamos la categoría
    console.log('5a. Categoría IA:', resultado.categoria_sugerida, '| Tipo:', resultado.tipo)
    
    // Si no viene categoría, asignamos una por defecto
    if (!resultado.categoria_sugerida) {
      resultado.categoria_sugerida = resultado.tipo === 'ingreso' ? 'Otros ingresos' : 'Otros gastos'
      console.log('5b. Sin categoría, asignada:', resultado.categoria_sugerida)
    }
    
    if (resultado.categoria_sugerida && !CATEGORIAS.includes(resultado.categoria_sugerida)) {
      // Buscamos la más similar (mejorado)
      const catLower = resultado.categoria_sugerida.toLowerCase()
      const encontrada = CATEGORIAS.find(cat => {
        const catLow = cat.toLowerCase()
        return catLow.includes(catLower) || 
               catLower.includes(catLow) ||
               catLow.split(' ')[0] === catLower.split(' ')[0] ||
               catLow.split('/')[0].trim() === catLower.split('/')[0].trim()
      })
      console.log('5c. Categoría no encontrada, similar:', encontrada || 'NINGUNA')
      resultado.categoria_sugerida = encontrada || (resultado.tipo === 'ingreso' ? 'Otros ingresos' : 'Otros gastos')
    }
    
    console.log('5d. Categoría final:', resultado.categoria_sugerida)

    resultado.imagen_borrosa = resultado.imagen_borrosa === true ||
      String(resultado.imagen_borrosa).toLowerCase() === 'true'
    console.log('5e. Imagen borrosa:', resultado.imagen_borrosa)

    // Generamos recomendaciones NLP básicas
    const recomendaciones = generarRecomendaciones(resultado)
    resultado.recomendaciones = recomendaciones

    console.log('5. Resultado OK:', JSON.stringify(resultado))
    return Response.json(resultado, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    })

  } catch (error) {
    console.error('ERROR CRÍTICO:', error.message)
    return Response.json(
      { error: 'Error interno en la Edge Function', detalle: error.message },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    )
  }
})

function generarRecomendaciones(datos: any): string[] {
  const tips: string[] = []
  const monto = Number(datos.monto) || 0
  const cat = (datos.categoria_sugerida || '').toLowerCase()
  const tipo = (datos.tipo || '').toLowerCase()

  if (tipo === 'gasto') {
    if (cat.includes('restaurante') || cat.includes('delivery') || cat.includes('comida')) {
      if (monto > 50) tips.push('💡 Cocinar en casa puede ahorrarte hasta 60% en alimentación.')
    }
    if (cat.includes('taxi') || cat.includes('uber')) {
      if (monto > 20) tips.push('🚌 Considera el transporte público para rutas frecuentes y ahorra más.')
    }
    if (cat.includes('streaming')) {
      tips.push('📱 ¿Usas todos tus servicios de streaming? Revisa cuáles realmente aprovechas.')
    }
    if (cat.includes('cuota') || cat.includes('deuda')) {
      tips.push('💳 Prioriza pagar deudas de mayor interés primero (método avalancha).')
    }
    if (monto > 200) {
      tips.push('📊 Este es un gasto significativo. ¿Estaba planificado en tu presupuesto?')
    }
  }

  if (tipo === 'ingreso') {
    tips.push('🏦 Recuerda destinar al menos 20% de tus ingresos al ahorro.')
    if (cat.includes('salario')) {
      tips.push('📈 Considera invertir parte de tu salario en fondos o acciones.')
    }
  }

  if (datos.medio_pago === 'Yape' || datos.medio_pago === 'Plin') {
    tips.push('✅ Pagos digitales: más seguro y con registro automático.')
  }

  return tips.slice(0, 2) // máximo 2 recomendaciones
}