// lib/dokunmatik.ts — dokunmatik ekran (parmak) algılama.
// 2026-09 çoklu ekran denetimi: telefona özgü düzeltmeler yalnız "< 640 px" koşuluna
// bağlıydı; dokunmatik tablet (640–1279 px) fareye göre tasarlanmış ekranlarla
// kalıyordu (sürükle-bırak, hover'da görünen düğmeler, "Ctrl+V/Enter" ipuçları).
// Dokunma dili ve etkileşimi GENİŞLİĞE değil işaretçiye göre seçilir.
import { useEffect, useState } from "react";

function sorguKancasi(sorgu: string): () => boolean {
  const oku = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(sorgu).matches;
  return function useSorgu() {
    const [deger, setDeger] = useState(oku);
    useEffect(() => {
      if (typeof window.matchMedia !== "function") return;
      const m = window.matchMedia(sorgu);
      const degis = () => setDeger(m.matches);
      degis();
      m.addEventListener("change", degis);
      return () => m.removeEventListener("change", degis);
    }, []);
    return deger;
  };
}

const DOKUNMATIK = "(pointer: coarse)";
/** Parmakla kullanılan, telefon ya da tablet genişliğinde (< 1024 px) veya yatay telefon kadar alçak ekran. */
const DOKUNMATIK_DAR = "(max-width: 639px), (pointer: coarse) and (max-width: 1023px), (pointer: coarse) and (max-height: 500px)";

export function dokunmatikMi(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(DOKUNMATIK).matches;
}

/** Birincil işaretçi parmak mı (telefon/tablet)? Metin dili ("dokun"/"tıkla"), kısayol ipuçları, sürükle-bırak yerine dokun-yerleştir için. */
export const useDokunmatik = sorguKancasi(DOKUNMATIK);

/**
 * Telefon düzeni mi seçilmeli? `useDarEkran`dan (yalnız < 640 px) geniştir: dokunmatik
 * tablette (< 1024) ve yatay telefonda (yükseklik ≤ 500) da tek sütunlu, parmağa uygun düzen.
 */
export const useDokunmatikDar = sorguKancasi(DOKUNMATIK_DAR);
