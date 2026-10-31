import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { clasificarDescripcion, procesarImagenConIA, seleccionarImagen, tomarFoto } from "../../lib/ia";
import { supabase } from "../../lib/supabase";
import { Analytics } from "../../lib/analytics";
import { useScreenTracking } from "../../hooks/useScreenTracking";

function norm(t?: string | null) {
  return (t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function timestamp() {
  return Date.now();
}

function normalizarBusqueda(texto?: string | null) {
  return (texto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

async function buscarCategoriaIA(texto: string, tipoMov: "ingreso" | "gasto", cats: any[]) {
  if (texto.trim().length < 4 || cats.length === 0) return null;

  try {
    const res = await clasificarDescripcion(texto.trim(), tipoMov);
    const sugerida = res?.categoria_sugerida || res?.categoria || "";
    if (!sugerida) return null;

    let cat = cats.find(c => norm(c.nombre) === norm(sugerida));
    if (!cat) {
      const palabras = norm(sugerida).split(/\s+/).filter((p: string) => p.length > 2);
      cat = cats.find(c => {
        const nCat = norm(c.nombre);
        return palabras.some((p: string) => nCat.includes(p)) || nCat.includes(norm(sugerida).split(" ")[0]);
      });
    }
    if (!cat) {
      cat = cats.find(c => {
        const nCat = norm(c.nombre);
        const nSug = norm(sugerida);
        return nCat.includes(nSug) || nSug.includes(nCat);
      });
    }
    return cat || null;
  } catch (e) {
    console.log("No se pudo sugerir categoría con IA:", e);
    return null;
  }
}

export default function Agregar() {
  useScreenTracking("agregar");
  const router = useRouter();
  const [tipo, setTipo] = useState<"ingreso" | "gasto">("gasto");
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const toLocalDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const [fecha, setFecha] = useState(toLocalDateStr(new Date()));
  const [categorias, setCategorias] = useState<any[]>([]);
  const [catSel, setCatSel] = useState<string>("");
  const [catIAId, setCatIAId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [loadingIA, setLoadingIA] = useState(false);
  const [clasificandoIA, setClasificandoIA] = useState(false);
  const clasificandoRef = useRef(false);
  const [imagenUri, setImagenUri] = useState<string | null>(null);
  const [imagenBase64, setImagenBase64] = useState<string | null>(null);
  const [tipoReg, setTipoReg] = useState<"manual" | "ia">("manual");
  const [medioPago, setMedioPago] = useState<string>("Efectivo");

  const [modalVisible, setModalVisible] = useState(false);
  const [descModal, setDescModal] = useState("");
  
  const [modalCatVisible, setModalCatVisible] = useState(false);
  const [busquedaCat, setBusquedaCat] = useState("");

  const scrollRef = useRef<ScrollView>(null);

  const cargarCategorias = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("categoria").select("*").or(`usuario_id.is.null,usuario_id.eq.${user.id}`).order("nombre");
    setCategorias(data || []);
  }, []);

  useFocusEffect(useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    cargarCategorias();
  }, [cargarCategorias]));

  function handleElegirFuenteIA() {
    Alert.alert(
      "Escanear comprobante",
      "¿Cómo quieres cargar la imagen?",
      [
        { text: "Tomar foto", onPress: () => handleProcesarIA("camara") },
        { text: "Elegir de galería", onPress: () => handleProcesarIA("galeria") },
        { text: "Cancelar", style: "cancel" },
      ]
    );
  }

  async function handleProcesarIA(fuente: "camara" | "galeria" = "galeria") {
    let startTime = timestamp();
    try {
      setLoadingIA(true);
      Analytics.ocrIniciado();
      const img = fuente === "camara" ? await tomarFoto() : await seleccionarImagen();
      if (!img || !img.base64) {
        setLoadingIA(false);
        return;
      }
      setImagenUri(img.uri);
      setImagenBase64(img.base64);
      
      startTime = timestamp(); // ⏱ Medir solo el tiempo de procesamiento
      const res = await procesarImagenConIA(img.base64);
      const duracion_ms = timestamp() - startTime;
      
      if (!res.descripcion) {
        if (res.imagen_borrosa) {
          Alert.alert(
            "Imagen borrosa",
            "La imagen parece borrosa o con poco texto legible. Intenta tomar otra foto con buena luz. También puedes continuar y completar los datos manualmente."
          );
        }
        setModalVisible(true);
      } else {
        Analytics.ocrExitoso(res.monto, res.categoria_sugerida || res.categoria, duracion_ms);
        aplicarIA(res);
      }
    } catch (e: any) {
      const duracion_ms = timestamp() - startTime;
      Analytics.ocrError(e.message, duracion_ms);
      Alert.alert("Error", e.message);
    }
    finally { setLoadingIA(false); }
  }

  async function handleSugerirCategoria() {
    if (clasificandoRef.current) return;
    if (descripcion.trim().length < 4) {
      Alert.alert("Descripción muy corta", "Escribe una descripción más específica para que la IA pueda sugerir una categoría.");
      return;
    }

    clasificandoRef.current = true;
    setClasificandoIA(true);
    try {
      const cat = await buscarCategoriaIA(descripcion, tipo, categorias);
      if (cat) {
        setCatSel(cat.id);
        setCatIAId(cat.id);
        Analytics.categoriaSeleccionada(cat.nombre, "ia");
      } else {
        Alert.alert("Sin sugerencia", "No se pudo identificar una categoría. Puedes seleccionarla manualmente.");
      }
    } finally {
      clasificandoRef.current = false;
      setClasificandoIA(false);
    }
  }

  useEffect(() => {
    const texto = descripcion.trim();
    if (catSel || texto.length < 4 || categorias.length === 0 || clasificandoRef.current) return;

    let activo = true;
    const timer = setTimeout(async () => {
      clasificandoRef.current = true;
      setClasificandoIA(true);
      try {
        const cat = await buscarCategoriaIA(texto, tipo, categorias);
        if (activo && cat) {
          setCatSel(cat.id);
          setCatIAId(cat.id);
          Analytics.categoriaSeleccionada(cat.nombre, "ia");
        }
      } finally {
        clasificandoRef.current = false;
        if (activo) setClasificandoIA(false);
      }
    }, 1200);

    return () => {
      activo = false;
      clearTimeout(timer);
    };
  }, [descripcion, catSel, tipo, categorias]);

  async function aplicarIA(res: any) {
    if (res.monto) setMonto(res.monto.toString());
    if (res.fecha) setFecha(res.fecha);
    if (res.descripcion) setDescripcion(res.descripcion);
    if (res.tipo) setTipo(res.tipo.toLowerCase().trim() === "ingreso" ? "ingreso" : "gasto");
    setTipoReg("ia");

    if (res.medio_pago) {
      const mp = String(res.medio_pago).trim();
      const match = ["Yape", "Plin", "Efectivo", "Tarjeta", "Banco"].find(
        m => m.toLowerCase() === mp.toLowerCase()
      );
      setMedioPago(match || mp);
    }

    const sugerida = res.categoria_sugerida || res.categoria || "";
    let cat = categorias.find(c => norm(c.nombre) === norm(sugerida));
    if (!cat && sugerida) {
      const palabras = norm(sugerida).split(/\s+/).filter((p: string) => p.length > 2);
      cat = categorias.find(c => {
        const nCat = norm(c.nombre);
        return palabras.some((p: string) => nCat.includes(p)) || nCat.includes(norm(sugerida).split(" ")[0]);
      });
    }
    if (!cat && sugerida) {
      cat = categorias.find(c => {
        const nCat = norm(c.nombre);
        const nSug = norm(sugerida);
        return nCat.includes(nSug) || nSug.includes(nCat);
      });
    }
    if (cat) {
      setCatSel(cat.id);
      setCatIAId(cat.id);
      Analytics.categoriaSeleccionada(cat.nombre, "ia");
    }

    const avisoNitidez = res.imagen_borrosa
      ? "\n\n⚠️ La imagen parece borrosa o con poco texto legible. Revisa los datos con cuidado o intenta con una foto más nítida."
      : "";

    Alert.alert(
      res.imagen_borrosa ? "Imagen borrosa" : "✨ IA: Análisis Completado",
      `Hemos detectado los siguientes detalles:
      
💰 Monto: S/ ${res.monto}
📝 Motivo: ${res.descripcion || "No especificado"}
📂 Categoría: ${sugerida}
🗓️ Fecha: ${res.fecha}
💳 Pago: ${res.medio_pago || "No detectado"}
👤 Receptor: ${res.receptor || "No detectado"}${avisoNitidez}

¿Deseas usar estos datos?`,
      [
        { text: "Editar", style: "cancel" },
        { text: "Confirmar ✅", onPress: () => {} }
      ]
    );
  }

  // FUNCIÓN DE LIMPIEZA AL ELIMINAR CAPTURA
  const handleRemoveImagen = () => {
    setImagenUri(null);
    setImagenBase64(null);
    setMonto("");
    setDescripcion("");
    setFecha(toLocalDateStr(new Date()));
    setCatSel("");
    setCatIAId(null);
    setTipoReg("manual");
    setMedioPago("Efectivo");
  };

  async function handleGuardar() {
    const montoNum = Math.abs(parseFloat(monto));
    if (!monto || !Number.isFinite(montoNum) || montoNum <= 0) {
      Alert.alert("Faltan datos", "Por favor ingresa un monto válido.");
      return;
    }

    let categoriaId = catSel;
    let categoriaPorIA = false;
    if (!categoriaId && descripcion.trim().length >= 4) {
      if (clasificandoRef.current) {
        Alert.alert("Espera un momento", "La IA todavía está sugiriendo una categoría. Intenta guardar de nuevo en unos segundos.");
        return;
      }

      clasificandoRef.current = true;
      setClasificandoIA(true);
      try {
        const cat = await buscarCategoriaIA(descripcion, tipo, categorias);
        if (cat) {
          categoriaId = cat.id;
          categoriaPorIA = true;
          setCatSel(cat.id);
          setCatIAId(cat.id);
        }
      } finally {
        clasificandoRef.current = false;
        setClasificandoIA(false);
      }
    }

    if (!categoriaId) {
      Alert.alert("Faltan datos", "Por favor elige una categoría o escribe una descripción para que la IA la sugiera.");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("Sesión expirada", "Vuelve a iniciar sesión para guardar el movimiento.");
        return;
      }

      const { error } = await supabase.from("movimiento").insert({
        usuario_id: user.id,
        categoria_id: categoriaId,
        tipo,
        tipo_registro: tipoReg,
        monto: montoNum,
        fecha,
        descripcion,
        imagen_url: imagenUri,
        medio_pago: medioPago
      });

      if (error) {
        Alert.alert("Error", error.message);
        return;
      }

      const catNombre = categorias.find(c => c.id === categoriaId)?.nombre || "";
      Analytics.movimientoCreado({
        tipo,
        monto: montoNum,
        categoria: catNombre,
        via_ia: tipoReg === "ia" || categoriaPorIA || catIAId === categoriaId,
        medio_pago: medioPago,
      });
      setMonto("");
      setDescripcion("");
      setImagenUri(null);
      setImagenBase64(null);
      setCatSel("");
      setCatIAId(null);
      setTipoReg("manual");
      setMedioPago("Efectivo");
      setFecha(toLocalDateStr(new Date()));
      
      Alert.alert("¡Éxito!", "Movimiento guardado correctamente.");
      router.replace("/(tabs)/movimientos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{flex:1}}>
      <ScrollView 
        ref={scrollRef}
        style={s.container} 
        contentContainerStyle={s.content} 
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.title}>Registrar Pago</Text>

        <TouchableOpacity style={s.iaBtn} onPress={handleElegirFuenteIA} disabled={loadingIA}>
          {loadingIA ? <ActivityIndicator color="#fff" /> : <Ionicons name="scan-circle" size={32} color="#fff" />}
          <View>
            <Text style={s.iaBtnTitle}>{loadingIA ? "Analizando voucher..." : "Escanear con IA"}</Text>
            <Text style={s.iaBtnSub}>Toma una foto o elige de la galería</Text>
          </View>
        </TouchableOpacity>

        {imagenUri && (
          <View style={s.previewWrap}>
            <Image source={{ uri: imagenUri }} style={s.preview} />
            <TouchableOpacity style={s.closeImg} onPress={handleRemoveImagen}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        <View style={s.card}>
          <View style={s.tipoRow}>
            <TouchableOpacity style={[s.tipoBtn, tipo === "gasto" && s.tipoBtnG]} onPress={() => setTipo("gasto")}>
              <Text style={[s.tipoTxt, tipo === "gasto" && s.tipoTxtActive]}>Gasto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.tipoBtn, tipo === "ingreso" && s.tipoBtnI]} onPress={() => setTipo("ingreso")}>
              <Text style={[s.tipoTxt, tipo === "ingreso" && s.tipoTxtActive]}>Ingreso</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.label}>MONTO</Text>
          <View style={s.montoWrap}>
            <Text style={s.montoSimbolo}>S/</Text>
            <TextInput style={s.montoInput} value={monto} onChangeText={setMonto} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#cbd5e1" />
          </View>

          <Text style={s.label}>DESCRIPCIÓN</Text>
          <TextInput style={s.input} value={descripcion} onChangeText={setDescripcion} placeholder="Ej: Pago de luz, Cena..." placeholderTextColor="#94a3b8" />

        <Text style={s.label}>FECHA</Text>
        <View style={s.fechaWrap}>
          <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]} value={fecha} onChangeText={setFecha} placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8" />
          <View style={s.fechaBtns}>
            <TouchableOpacity style={s.fechaBtn} onPress={() => setFecha(toLocalDateStr(new Date()))}>
              <Text style={s.fechaBtnTxt}>Hoy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.fechaBtn} onPress={() => {
              const ayer = new Date();
              ayer.setDate(ayer.getDate() - 1);
              setFecha(toLocalDateStr(ayer));
            }}>
              <Text style={s.fechaBtnTxt}>Ayer</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={s.label}>MEDIO DE PAGO</Text>
        <View style={s.medioPagoRow}>
          {["Yape", "Plin", "Efectivo", "Tarjeta", "Banco"].map((m) => (
            <TouchableOpacity
              key={m}
              style={[
                s.medioPagoBtn,
                medioPago === m && s.medioPagoBtnSel
              ]}
              onPress={() => setMedioPago(m)}
            >
              <Text style={[
                s.medioPagoTxt,
                medioPago === m && s.medioPagoTxtSel
              ]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>
        </View>

        <View style={s.catLabelRow}>
          <Text style={[s.label, { marginBottom: 0 }]}>CATEGORÍA</Text>
          <TouchableOpacity
            style={s.sugerirBtn}
            onPress={handleSugerirCategoria}
            disabled={clasificandoIA || descripcion.trim().length < 4}
          >
            {clasificandoIA
              ? <ActivityIndicator size="small" color="#f59e0b" />
              : <Ionicons name="sparkles" size={14} color="#f59e0b" />}
            <Text style={s.sugerirTxt}>{clasificandoIA ? "Sugiriendo..." : "Sugerir con IA"}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          style={[s.catChip, catSel ? s.catChipSel : null, { padding: 16, justifyContent: "space-between", marginBottom: 30 }]} 
          onPress={() => setModalCatVisible(true)}
        >
          {catSel ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={{ fontSize: 24 }}>{categorias.find(c => c.id === catSel)?.icono || "📌"}</Text>
              <View>
                <Text style={s.catTxtSel}>{categorias.find(c => c.id === catSel)?.nombre}</Text>
                {catIAId === catSel && <Text style={{ color: "#f59e0b", fontSize: 10, fontWeight: "bold" }}>Sugerencia IA</Text>}
              </View>
            </View>
          ) : (
            <Text style={[s.catTxt, { fontSize: 16 }]}>Seleccionar categoría...</Text>
          )}
          <Ionicons name="chevron-down" size={20} color={catSel ? "#6366f1" : "#94a3b8"} />
        </TouchableOpacity>

        <TouchableOpacity style={s.saveBtn} onPress={handleGuardar} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnTxt}>Guardar Movimiento</Text>}
        </TouchableOpacity>
        
        <View style={{height:60}} />
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>¿Qué compraste? 🛍️</Text>
            <Text style={s.modalSub}>Dime qué fue para que la IA lo clasifique mejor.</Text>
            <TextInput style={s.modalInput} value={descModal} onChangeText={setDescModal} placeholder="Ej: Pollo a la brasa, Gasofa..." autoFocus />
            <TouchableOpacity style={s.modalBtn} onPress={() => { setModalVisible(false); setLoadingIA(true); procesarImagenConIA(imagenBase64!, descModal).then(aplicarIA).finally(() => setLoadingIA(false)); }}>
              <Text style={s.modalBtnTxt}>Procesar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Categorías */}
      <Modal visible={modalCatVisible} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { height: "80%", padding: 20 }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
              <Text style={s.modalTitle}>Seleccionar Categoría</Text>
              <TouchableOpacity onPress={() => setModalCatVisible(false)}>
                <Ionicons name="close" size={28} color="#1e293b" />
              </TouchableOpacity>
            </View>
            <TextInput 
              style={[s.input, { marginBottom: 10 }]} 
              value={busquedaCat} 
              onChangeText={setBusquedaCat} 
              placeholder="Buscar categoría..." 
              placeholderTextColor="#94a3b8" 
            />
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              <View style={s.catGrid}>
                {categorias
                  .filter(c => normalizarBusqueda(c.nombre).includes(normalizarBusqueda(busquedaCat)))
                  .filter(c => c.tipo === tipo || c.tipo === "ambos" || (tipo === "ingreso" && c.tipo === "ingreso")) // Filtro robusto
                  .map(c => (
                  <TouchableOpacity 
                    key={c.id} 
                    style={[s.catChip, catSel === c.id && s.catChipSel, catIAId === c.id && s.catChipIA, { width: "100%", paddingVertical: 14 }]} 
                    onPress={() => { setCatSel(c.id); setModalCatVisible(false); }}
                  >
                    <Text style={{fontSize:22}}>{c.icono}</Text>
                    <Text style={[s.catTxt, catSel === c.id && s.catTxtSel, { fontSize: 16 }]}>{c.nombre}</Text>
                    {catIAId === c.id && <View style={s.iaTag}><Text style={s.iaTagTxt}>Sugerida</Text></View>}
                  </TouchableOpacity>
                ))}
                {categorias.filter(c => normalizarBusqueda(c.nombre).includes(normalizarBusqueda(busquedaCat))).length === 0 && (
                  <Text style={{ color: "#94a3b8", textAlign: "center", marginTop: 20 }}>No se encontraron categorías</Text>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: "900", color: "#1e293b", marginBottom: 20 },
  iaBtn: { backgroundColor: "#6366f1", borderRadius: 20, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20, shadowColor: "#6366f1", shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  iaBtnTitle: { color: "#fff", fontWeight: "800", fontSize: 16 },
  iaBtnSub: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  previewWrap: { position: "relative", marginBottom: 20 },
  preview: { width: "100%", height: 200, borderRadius: 20 },
  closeImg: { position: "absolute", top: 10, right: 10, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 15, padding: 5 },
  card: { backgroundColor: "#fff", borderRadius: 24, padding: 20, marginBottom: 20, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 15, elevation: 2 },
  tipoRow: { flexDirection: "row", backgroundColor: "#f1f5f9", borderRadius: 12, padding: 4, marginBottom: 20 },
  tipoBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
  tipoBtnG: { backgroundColor: "#ef4444" },
  tipoBtnI: { backgroundColor: "#22c55e" },
  tipoTxt: { fontWeight: "700", color: "#64748b" },
  tipoTxtActive: { color: "#fff" },
  label: { fontSize: 11, fontWeight: "800", color: "#94a3b8", letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  catLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  sugerirBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: "#fffbeb" },
  sugerirTxt: { fontSize: 11, fontWeight: "800", color: "#d97706" },
  montoWrap: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  montoSimbolo: { fontSize: 32, fontWeight: "900", color: "#1e293b", marginRight: 8 },
  montoInput: { fontSize: 48, fontWeight: "900", color: "#1e293b", minWidth: 150, textAlign: "center" },
  input: { backgroundColor: "#f8fafc", borderRadius: 12, padding: 14, fontSize: 16, color: "#1e293b", marginBottom: 16, borderWidth: 1, borderColor: "#e2e8f0" },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catChip: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: "#e2e8f0" },
  catChipSel: { borderColor: "#6366f1", backgroundColor: "#eef2ff", borderWidth: 2 },
  catChipIA: { borderColor: "#f59e0b", borderWidth: 2 },
  catTxt: { fontSize: 14, fontWeight: "600", color: "#475569" },
  catTxtSel: { color: "#6366f1", fontWeight: "700" },
  iaTag: { backgroundColor: "#f59e0b", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginLeft: "auto" },
  iaTagTxt: { color: "#fff", fontSize: 10, fontWeight: "900" },
  fechaWrap: { flexDirection: "row", gap: 10, marginBottom: 16 },
  fechaBtns: { flexDirection: "row", gap: 8 },
  fechaBtn: { backgroundColor: "#f1f5f9", paddingHorizontal: 16, justifyContent: "center", borderRadius: 12 },
  fechaBtnTxt: { color: "#475569", fontWeight: "700", fontSize: 13 },
  saveBtn: { backgroundColor: "#1e293b", borderRadius: 20, padding: 20, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  saveBtnTxt: { color: "#fff", fontWeight: "900", fontSize: 16, letterSpacing: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 20 },
  modalCard: { backgroundColor: "#fff", borderRadius: 30, padding: 30 },
  modalTitle: { fontSize: 22, fontWeight: "900", color: "#1e293b", marginBottom: 10 },
  modalSub: { fontSize: 14, color: "#64748b", marginBottom: 20 },
  modalInput: { backgroundColor: "#f1f5f9", borderRadius: 15, padding: 16, fontSize: 18, marginBottom: 20 },
  modalBtn: { backgroundColor: "#6366f1", borderRadius: 15, padding: 16, alignItems: "center" },
  modalBtnTxt: { color: "#fff", fontWeight: "800", fontSize: 16 },
  medioPagoRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4, marginBottom: 16 },
  medioPagoBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "#e2e8f0" },
  medioPagoBtnSel: { backgroundColor: "#6366f1", borderColor: "#6366f1" },
  medioPagoTxt: { fontSize: 13, fontWeight: "700", color: "#64748b" },
  medioPagoTxtSel: { color: "#fff" }
});
