// lib/useKlavyeAcik.ts — ekran klavyesi açık mı?
// 2026-09 denetimi: eski ölçüt (visualViewport < innerHeight*0.75) Android tam
// uygulamada HİÇ tetiklenmiyordu — MainActivity klavye boşluğunu kök görünüme dolgu
// olarak veriyor, WebView'in kendisi küçülüyor ve iki yükseklik birlikte azalıyor.
// Artık iki sinyal: (1) dokunmatik cihazda bir metin alanı odakta, (2) pencere
// görülen en büyük yüksekliğin %80'inin altına indi (yön değişince taban yenilenir).
import { useEffect, useState } from "react";
import { dokunmatikMi } from "./dokunmatik";

const METIN_DISI = new Set(["checkbox", "radio", "button", "submit", "reset", "range", "color", "file", "image"]);

export function metinAlaniMi(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement) return !el.readOnly;
  if (el instanceof HTMLInputElement) return !METIN_DISI.has(el.type) && !el.readOnly;
  return el instanceof HTMLElement && el.isContentEditable;
}

export function useKlavyeAcik(): boolean {
  const [acik, setAcik] = useState(false);
  useEffect(() => {
    let taban = { yon: innerWidth > innerHeight, h: innerHeight };
    const hesapla = () => {
      const yon = innerWidth > innerHeight;
      const vh = window.visualViewport?.height ?? innerHeight;
      if (yon !== taban.yon) taban = { yon, h: innerHeight };
      else if (innerHeight > taban.h) taban.h = innerHeight;
      const kucuk = Math.min(innerHeight, vh) < taban.h * 0.8;
      const odak = dokunmatikMi() && metinAlaniMi(document.activeElement);
      setAcik(kucuk || odak);
    };
    // focusout'ta odak henüz taşınmamış olabilir: bir sonraki karede bak.
    const gec = () => requestAnimationFrame(hesapla);
    addEventListener("resize", hesapla);
    window.visualViewport?.addEventListener("resize", hesapla);
    document.addEventListener("focusin", hesapla);
    document.addEventListener("focusout", gec);
    return () => {
      removeEventListener("resize", hesapla);
      window.visualViewport?.removeEventListener("resize", hesapla);
      document.removeEventListener("focusin", hesapla);
      document.removeEventListener("focusout", gec);
    };
  }, []);
  return acik;
}
