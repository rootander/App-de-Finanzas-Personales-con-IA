import * as ImagePicker from 'expo-image-picker'
import { supabase } from './supabase'

export async function seleccionarImagen() {
  const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!permiso.granted) {
    throw new Error('Se necesita permiso para acceder a las fotos')
  }

  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    base64: true,
    quality: 0.7,
  })

  if (resultado.canceled) return null
  return resultado.assets[0]
}

export async function tomarFoto() {
  const permiso = await ImagePicker.requestCameraPermissionsAsync()
  if (!permiso.granted) {
    throw new Error('Se necesita permiso para usar la cámara')
  }

  const resultado = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    base64: true,
    quality: 0.7,
  })

  if (resultado.canceled) return null
  return resultado.assets[0]
}

export async function clasificarDescripcion(descripcion: string, tipo: 'ingreso' | 'gasto') {
  const startTime = Date.now()
  const tokensInput = Math.ceil(descripcion.length / 4)

  let data: any = null
  let error: any = null

  try {
    const result = await supabase.functions.invoke('clasificar-transaccion', {
      body: { descripcion, tipo },
    })
    data = result.data
    error = result.error
  } catch (e: any) {
    error = e
  }

  const duracion_ms = Date.now() - startTime
  const tokensOutput = data ? Math.ceil(JSON.stringify(data).length / 4) : 0

  supabase.auth.getUser().then(({ data: { user } }) => {
    if (!user) return
    supabase.from('metrica_ia').insert({
      usuario_id: user.id,
      proceso: 'clasificacion',
      modelo: 'GPT-OSS 120B',
      duracion_ms,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      exito: !error,
      error: error ? String(error.message || error) : null,
    }).then()
  })

  if (error) {
    let mensaje = error.message || 'No se pudo clasificar la descripción'
    if (error instanceof Error && 'context' in error) {
      try {
        const response = (error as any).context
        if (response && typeof response.text === 'function') {
          const bodyText = await response.text()
          try {
            const bodyJson = JSON.parse(bodyText)
            if (bodyJson.error) mensaje = bodyJson.error
            if (bodyJson.detalle) mensaje += `: ${bodyJson.detalle}`
          } catch {
            mensaje = bodyText
          }
        }
      } catch {
        // mantenemos el mensaje original
      }
    }
    throw new Error(mensaje)
  }

  return data
}

export async function procesarImagenConIA(imagen_base64: string, descripcion_usuario?: string) {
  const startTime = Date.now();

  // tokens_input estimado: tamaño del base64 en bytes / 4 (aprox caracteres) / 4 (aprox tokens)
  const tokensInput = Math.ceil(imagen_base64.length / 16);

  let data: any = null;
  let error: any = null;

  try {
    const result = await supabase.functions.invoke('procesar-imagen', {
      body: {
        imagen_base64,
        mime_type: 'image/jpeg',
        descripcion_usuario: descripcion_usuario || null
      }
    });
    data = result.data;
    error = result.error;
  } catch (e: any) {
    error = e;
  }

  const duracion_ms = Date.now() - startTime;

  // tokens_output: caracteres del JSON de respuesta / 4 (aprox tokens)
  const tokensOutput = data ? Math.ceil(JSON.stringify(data).length / 4) : 0;

  // Registrar métrica completa de IA (fire-and-forget)
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (!user) return;
    supabase.from("metrica_ia").insert({
      usuario_id: user.id,
      proceso: "ocr",
      modelo: "Qwen 3.8 27B",  // modelo real de Groq
      duracion_ms,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      exito: !error,
      error: error ? String(error.message || error) : null,
    }).then();
  });

  // Guardar historial completo del OCR en ocr_historial (fire-and-forget)
  if (data && !error) {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("ocr_historial").insert({
        usuario_id: user.id,
        imagen_url: null,
        monto_detectado: data.monto ? parseFloat(data.monto) : null,
        fecha_detectada: data.fecha || null,
        descripcion_detectada: data.descripcion || null,
        categoria_sugerida: data.categoria_sugerida || data.categoria || null,
        tipo_detectado: data.tipo || null,
        medio_pago_detectado: data.medio_pago || null,
        receptor: data.receptor || null,
        emisor: data.emisor || null,
        recomendaciones: Array.isArray(data.recomendaciones) ? data.recomendaciones.join(' | ') : (data.recomendaciones || null),
        texto_completo_ocr: JSON.stringify(data),
        modelo_ia: "qwen3.8-27b",
        proveedor_ia: "groq",
        duracion_ms,
        exito: true,
        error_mensaje: null,
        metadata: {
          tokens_input: tokensInput,
          tokens_output: tokensOutput,
          mime_type: 'image/jpeg',
        },
      }).then();
    });
  }

  if (error) {
    // Guardar intento fallido en ocr_historial (fire-and-forget)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("ocr_historial").insert({
        usuario_id: user.id,
        imagen_url: null,
        monto_detectado: null,
        fecha_detectada: null,
        descripcion_detectada: null,
        categoria_sugerida: null,
        tipo_detectado: null,
        medio_pago_detectado: null,
        receptor: null,
        emisor: null,
        recomendaciones: null,
        texto_completo_ocr: null,
        modelo_ia: "qwen3.8-27b",
        proveedor_ia: "groq",
        duracion_ms,
        exito: false,
        error_mensaje: String(error.message || error),
        metadata: { tokens_input: tokensInput },
      }).then();
    });

    console.error('--- ERROR EN EDGE FUNCTION ---');
    console.error('Mensaje:', error.message);
    console.error('Status:', (error as any).status);

    let mensajeDetallado = error.message;

    // Intentamos extraer el cuerpo de la respuesta del error
    if (error instanceof Error && 'context' in error) {
      try {
        const response = (error as any).context;
        if (response && typeof response.text === 'function') {
          const bodyText = await response.text();
          console.error('Cuerpo de la respuesta:', bodyText);
          try {
            const bodyJson = JSON.parse(bodyText);
            if (bodyJson.error) mensajeDetallado = bodyJson.error;
            if (bodyJson.detalle) mensajeDetallado += `: ${bodyJson.detalle}`;
          } catch (e) {
            mensajeDetallado = bodyText;
          }
        }
      } catch (e) {
        console.error('No se pudo leer el cuerpo del error:', e);
      }
    }

    throw new Error(mensajeDetallado);
  }

  return data;
}

