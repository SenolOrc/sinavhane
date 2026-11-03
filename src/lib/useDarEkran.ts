// lib/useDarEkran.ts — telefon genişliği (< 640 px) mi? Android tam uygulama ve
// dar tarayıcı pencereleri için yoğun ızgaralar yerine telefon düzeni seçilir.
import { useEffect, useState } from "react";

const SORGU = "(max-width: 639px)";

export function darEkranMi(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(SORGU).matches;
}

export function useDarEkran(): boolean {
  const [dar, setDar] = useState(darEkranMi);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const m = window.matchMedia(SORGU);
    const degis = () => setDar(m.matches);
    m.addEventListener("change", degis);
    return () => m.removeEventListener("change", degis);
  }, []);
  return dar;
}
