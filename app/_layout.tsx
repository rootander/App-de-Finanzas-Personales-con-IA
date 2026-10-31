import { Slot, useRouter, useSegments } from "expo-router";
import "react-native-reanimated";

import { supabase } from "@/lib/supabase";
import { Analytics } from "@/lib/analytics";
import { useEffect, useRef, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const segments = useSegments();
  const appOpenLogged = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === "(auth)";
    if (!session && !inAuth) router.replace("/(auth)/login");
    if (session && inAuth) router.replace("/(tabs)/inicio");

    // Registrar APP_OPEN cuando hay sesión y llegamos al primer módulo
    if (session && !appOpenLogged.current && !inAuth) {
      appOpenLogged.current = true;
      Analytics.appOpen(session.user?.id);
    }
  }, [session, loading]);

  if (loading) {
    return (
      <View style={splashStyles.container}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return <Slot />;
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F0B2E",
  },
});

