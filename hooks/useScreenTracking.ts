import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";
import { Analytics } from "@/lib/analytics";

export function useScreenTracking(nombre: string) {
  const entryTs = useRef(Date.now());

  useFocusEffect(
    useCallback(() => {
      entryTs.current = Date.now();

      return () => {
        const duracion_ms = Date.now() - entryTs.current;
        Analytics.screenView(nombre, duracion_ms);
      };
    }, [nombre])
  );
}
