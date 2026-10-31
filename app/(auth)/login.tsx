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

const { width, height } = Dimensions.get("window");

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

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginDuration, setLoginDuration] = useState<string | null>(null);
  const router = useRouter();

  // Animated values
  const [buttonScale] = useState(() => new Animated.Value(1));

  useEffect(() => {
    // No llamar appOpen aquí porque no hay userId aún
    // Se llama en inicio.tsx con el userId correcto
  }, []);

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

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert("Error", "Por favor completa todos los campos");
      return;
    }
    setLoading(true);
    setLoginDuration(null);
    const startTime = Date.now();
    const { data: signInData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    const duracion = Date.now() - startTime;
    const segundos = (duracion / 1000).toFixed(1);
    if (error) Alert.alert("Error", error.message);
    else if (signInData?.user) {
      Analytics.login(signInData.user.id, email);
      setLoginDuration(`${segundos}s`);
    }
    setLoading(false);
  }

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
          colors={["rgba(124, 58, 237, 0.3)", "transparent"]}
          style={[styles.orb, styles.orbTopRight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <LinearGradient
          colors={["rgba(6, 182, 212, 0.2)", "transparent"]}
          style={[styles.orb, styles.orbBottomLeft]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
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
          {/* Hero Image */}
          <View style={styles.heroContainer}>
            <Image
              source={require("@/assets/images/login-hero.png")}
              style={styles.heroImage}
              resizeMode="contain"
            />
          </View>

          {/* Branding */}
          <View style={styles.brandContainer}>
            <View style={styles.logoRow}>
              <LinearGradient
                colors={["#7C3AED", "#06B6D4"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoIconBg}
              >
                <Ionicons name="wallet" size={24} color="#fff" />
              </LinearGradient>
              <Text style={styles.titulo}>FinanzasIA</Text>
            </View>
            <Text style={styles.subtitulo}>
              Controla tu dinero con inteligencia artificial
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <Ionicons name="mail-outline" size={20} color="#7C3AED" />
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
                  color="#7C3AED"
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

            {/* Login Button */}
            <Animated.View
              style={[
                styles.botonContainer,
                { transform: [{ scale: buttonScale }] },
              ]}
            >
              <TouchableOpacity
                onPress={handleLogin}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={loading}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={
                    loading
                      ? ["#4338CA", "#5B21B6"]
                      : ["#7C3AED", "#4338CA", "#06B6D4"]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.boton}
                >
                  {loading ? (
                    <View style={styles.loadingRow}>
                      <SpinLoader size={20} color="#fff" />
                      <Text style={styles.botonTexto}>Entrando...</Text>
                    </View>
                  ) : (
                    <View style={styles.loadingRow}>
                      <Ionicons
                        name="log-in-outline"
                        size={20}
                        color="#fff"
                      />
                      <Text style={styles.botonTexto}>Iniciar sesión</Text>
                      {loginDuration && (
                        <Text style={[styles.botonTexto, { fontSize: 12, opacity: 0.8 }]}>
                          ({loginDuration})
                        </Text>
                      )}
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o continúa con</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Buttons */}
            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialButton}>
                <Ionicons name="logo-google" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton}>
                <Ionicons name="logo-apple" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton}>
                <Ionicons name="finger-print-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Register Link */}
          <TouchableOpacity
            style={styles.linkContainer}
            onPress={() => router.push("/(auth)/registro")}
          >
            <Text style={styles.linkText}>¿No tienes cuenta? </Text>
            <Text style={styles.linkHighlight}>Regístrate gratis</Text>
            <Ionicons
              name="arrow-forward"
              size={16}
              color="#06B6D4"
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
  orbTopRight: {
    top: -80,
    right: -80,
  },
  orbBottomLeft: {
    bottom: -80,
    left: -80,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: "center",
  },
  heroContainer: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 8,
  },
  heroImage: {
    width: width * 0.55,
    height: width * 0.45,
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  logoIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  titulo: {
    fontSize: 34,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  subtitulo: {
    fontSize: 15,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    marginTop: 4,
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
  botonContainer: {
    marginTop: 8,
    marginBottom: 20,
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
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  dividerText: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 13,
    marginHorizontal: 16,
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  socialButton: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  linkContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 28,
    paddingVertical: 8,
  },
  linkText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
  },
  linkHighlight: {
    color: "#06B6D4",
    fontSize: 14,
    fontWeight: "700",
  },
});
