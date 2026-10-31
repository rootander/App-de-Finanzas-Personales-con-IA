import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "@/lib/supabase";
import { Analytics } from "@/lib/analytics";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Easing,
} from "react-native";

const { width } = Dimensions.get("window");

function SpinLoader({ color = "#fff", size = 20 }: { color?: string; size?: number }) {
  const [spinValue] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View style={{ transform: [{ rotate: spin }], marginRight: 8 }}>
      <Ionicons name="sync-outline" size={size} color={color} />
    </Animated.View>
  );
}

export default function Registro() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registerDuration, setRegisterDuration] = useState<string | null>(null);
  const router = useRouter();

  // Animated values
  const [buttonScale] = useState(() => new Animated.Value(1));

  function handlePressIn() {
    Animated.spring(buttonScale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }

  async function handleRegistro() {
    if (!nombre || !email || !password || !confirmPassword) {
      Alert.alert("Error", "Por favor completa todos los campos");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Las contraseñas no coinciden");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setLoading(true);
    setRegisterDuration(null);
    const startTime = Date.now();
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: nombre } },
    });
    const duracion = Date.now() - startTime;
    const segundos = (duracion / 1000).toFixed(1);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      // Crear fila en tabla perfil con el nombre que el usuario escribió
      if (signUpData?.user) {
        await supabase.from("perfil").upsert({
          id: signUpData.user.id,
          nombre: nombre.trim(),
        });
        Analytics.register(signUpData.user.id, nombre.trim());
      }
      setRegisterDuration(`${segundos}s`);
      Alert.alert(
        "¡Cuenta creada! 🎉",
        `Tu cuenta ha sido creada exitosamente en ${segundos}s. Ahora inicia sesión.`,
        [
          {
            text: "Iniciar sesión",
            onPress: () => router.replace("/(auth)/login"),
          },
        ]
      );
    }
    setLoading(false);
  }

  // Password strength indicator
  function getPasswordStrength() {
    if (!password) return { level: 0, label: "", color: "transparent" };
    if (password.length < 6)
      return { level: 1, label: "Débil", color: "#EF4444" };
    if (password.length < 10)
      return { level: 2, label: "Media", color: "#F59E0B" };
    return { level: 3, label: "Fuerte", color: "#10B981" };
  }

  const strength = getPasswordStrength();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0B2E" />
      <LinearGradient
        colors={["#0F0B2E", "#1A1145", "#0F0B2E"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative gradient orbs */}
      <View style={styles.orbContainer}>
        <LinearGradient
          colors={["rgba(6, 182, 212, 0.25)", "transparent"]}
          style={[styles.orb, styles.orbTopLeft]}
          start={{ x: 1, y: 1 }}
          end={{ x: 0, y: 0 }}
        />
        <LinearGradient
          colors={["rgba(124, 58, 237, 0.25)", "transparent"]}
          style={[styles.orb, styles.orbBottomRight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <View style={styles.backButtonInner}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.headerContainer}>
            <View style={styles.headerIconRow}>
              <LinearGradient
                colors={["#06B6D4", "#7C3AED"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerIconBg}
              >
                <Ionicons name="person-outline" size={38} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.titulo}>Crear cuenta</Text>
            <Text style={styles.subtitulo}>
              Únete y toma el control de tus finanzas
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            {/* Name Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <Ionicons name="person-outline" size={20} color="#06B6D4" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Nombre completo"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={nombre}
                onChangeText={setNombre}
                autoCapitalize="words"
              />
            </View>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <Ionicons name="mail-outline" size={20} color="#06B6D4" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Correo electrónico"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#06B6D4"
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Contraseña"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color="rgba(255,255,255,0.5)"
                />
              </TouchableOpacity>
            </View>

            {/* Password Strength Indicator */}
            {password.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBars}>
                  {[1, 2, 3].map((level) => (
                    <View
                      key={level}
                      style={[
                        styles.strengthBar,
                        {
                          backgroundColor:
                            level <= strength.level
                              ? strength.color
                              : "rgba(255,255,255,0.1)",
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text
                  style={[styles.strengthLabel, { color: strength.color }]}
                >
                  {strength.label}
                </Text>
              </View>
            )}

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#06B6D4" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Confirmar contraseña"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={
                    showConfirmPassword ? "eye-outline" : "eye-off-outline"
                  }
                  size={20}
                  color="rgba(255,255,255,0.5)"
                />
              </TouchableOpacity>
            </View>

            {/* Password match indicator */}
            {confirmPassword.length > 0 && (
              <View style={styles.matchContainer}>
                <Ionicons
                  name={
                    password === confirmPassword
                      ? "checkmark-circle"
                      : "close-circle"
                  }
                  size={16}
                  color={password === confirmPassword ? "#10B981" : "#EF4444"}
                />
                <Text
                  style={[
                    styles.matchText,
                    {
                      color:
                        password === confirmPassword ? "#10B981" : "#EF4444",
                    },
                  ]}
                >
                  {password === confirmPassword
                    ? "Las contraseñas coinciden"
                    : "Las contraseñas no coinciden"}
                </Text>
              </View>
            )}

            {/* Register Button */}
            <Animated.View
              style={[
                styles.botonContainer,
                { transform: [{ scale: buttonScale }] },
              ]}
            >
              <TouchableOpacity
                onPress={handleRegistro}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={loading}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={
                    loading
                      ? ["#4338CA", "#5B21B6"]
                      : ["#06B6D4", "#7C3AED", "#4338CA"]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.boton}
                >
                  {loading ? (
                    <View style={styles.loadingRow}>
                      <SpinLoader size={20} color="#fff" />
                      <Text style={styles.botonTexto}>Creando cuenta...</Text>
                    </View>
                  ) : (
                    <View style={styles.loadingRow}>
                      <Ionicons name="rocket-outline" size={20} color="#fff" />
                      <Text style={styles.botonTexto}>Crear mi cuenta</Text>
                      {registerDuration && (
                        <Text style={[styles.botonTexto, { fontSize: 12, opacity: 0.8 }]}>
                          ({registerDuration})
                        </Text>
                      )}
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Terms */}
            <Text style={styles.termsText}>
              Al registrarte, aceptas nuestros{" "}
              <Text style={styles.termsLink}>Términos de Servicio</Text> y{" "}
              <Text style={styles.termsLink}>Política de Privacidad</Text>
            </Text>
          </View>

          {/* Login Link */}
          <TouchableOpacity
            style={styles.linkContainer}
            onPress={() => router.replace("/(auth)/login")}
          >
            <Text style={styles.linkText}>¿Ya tienes cuenta? </Text>
            <Text style={styles.linkHighlight}>Inicia sesión</Text>
            <Ionicons
              name="arrow-forward"
              size={16}
              color="#7C3AED"
              style={{ marginLeft: 4 }}
            />
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F0B2E",
  },
  orbContainer: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
  },
  orb: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  orbTopLeft: {
    top: -100,
    left: -80,
  },
  orbBottomRight: {
    bottom: -100,
    right: -80,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 40,
  },
  backButton: {
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  backButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 28,
  },
  headerIconRow: {
    marginBottom: 16,
  },
  headerIconBg: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  titulo: {
    fontSize: 30,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitulo: {
    fontSize: 15,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  formCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  inputIconContainer: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 15,
    color: "#FFFFFF",
  },
  eyeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  strengthContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    marginTop: -6,
    paddingHorizontal: 4,
  },
  strengthBars: {
    flexDirection: "row",
    flex: 1,
    gap: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 10,
    width: 50,
    textAlign: "right",
  },
  matchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    marginTop: -6,
    paddingHorizontal: 4,
    gap: 6,
  },
  matchText: {
    fontSize: 12,
    fontWeight: "500",
  },
  botonContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  boton: {
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  botonTexto: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.3,
  },
  termsText: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  termsLink: {
    color: "rgba(255,255,255,0.5)",
    textDecorationLine: "underline",
  },
  linkContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
    paddingVertical: 8,
  },
  linkText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
  },
  linkHighlight: {
    color: "#7C3AED",
    fontSize: 14,
    fontWeight: "700",
  },
});
