// lib/tauri.ts — ortam tespiti. Uygulama hem Tauri penceresinde hem tarayıcıda
// çalışmalı (geliştirme tarayıcıda hızlı; köprü/Tauri özellikleri yalnız Tauri'de).
export function tauriVarMi(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
