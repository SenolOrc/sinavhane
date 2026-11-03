import { tauriVarMi } from "@/lib/tauri";
import { jsParolaAc, jsParolala } from "@/lib/parolaJs";

const PAROLALI_SINAV_FORMAT_DESENI = /^\s*\{\s*"format"\s*:\s*"oa27-encrypted-exam"/;

async function invoke<T>(komut: string, args: Record<string, unknown>): Promise<T> {
  const api = await import("@tauri-apps/api/core");
  return api.invoke<T>(komut, args);
}

export function parolaliSinavMi(ham: string): boolean {
  return PAROLALI_SINAV_FORMAT_DESENI.test(ham.slice(0, 256));
}

export async function sinaviParolala(ham: string, parola: string): Promise<string> {
  if ([...parola].length < 12) throw new Error("Sınav parolası en az 12 karakter olmalı.");
  // Telefonda (Android tam uygulama) Rust yok: aynı biçimi saf JS üretir.
  if (!tauriVarMi()) return jsParolala("sinav", ham, parola);
  return invoke<string>("sinav_parolala", { ham, parola });
}

export async function sinavParolasiniAc(ham: string, parola: string): Promise<string> {
  if (!parola) throw new Error("Bu sınav dosyası için parola gerekli.");
  if (!tauriVarMi()) return jsParolaAc("sinav", ham, parola);
  return invoke<string>("sinav_parolasini_ac", { ham, parola });
}
