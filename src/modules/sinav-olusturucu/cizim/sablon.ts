// Kullanıcı şablonlarının doğrulanması (localStorage'dan okunanlar).
//
// Depodan gelen veri her zaman şüphelidir: elle düzenlenmiş, eski sürümden
// kalmış veya bozulmuş olabilir. Tanınmayan şekil türü sessizce kabul
// edilirse çizim döngüsü ilk karede patlar — bu yüzden tür beyaz listesi
// (`GECERLI_SEKIL_TURLERI`) ve alan alan kontrol var.

import type { CizimSekli, KullaniciSablonu } from "./tipler";
import { GECERLI_SEKIL_TURLERI, RENK_DESENI } from "./sabitler";
import { fizikNesnesiGecerliMi } from "./fizik";
import { grafikVerisiGecerliMi } from "./grafik";
import { istatistikVerisiGecerliMi } from "./istatistik";
import { semaVerisiGecerliMi } from "./sema";
import { kimyaVerisiGecerliMi } from "./kimya";
import { fizikEkGecerliMi, geometriVerisiGecerliMi } from "./geometriSekilleri";
import { egikKuvvetVerisiGecerliMi } from "./fizikSahneler";
import { optikVerisiGecerliMi } from "./optik";
import { siviVerisiGecerliMi } from "./sivi";

// localStorage'daki özel şablonlar dışarıdan (elle düzenlenmiş dosya, eski
// sürümden kalma bozuk kayıt vb.) gelebilir; JSON.parse şemayı doğrulamaz.
// Süzgeci geçemeyen tek bir şekil çizim sırasında runtime hatası fırlatabilir
// (ör. "cokgen" türünde noktalar dizisi eksikse). Şema burada doğrulanır.
export function sekilGecerliMi(sekil: unknown): sekil is CizimSekli {
  if (!sekil || typeof sekil !== "object") return false;
  const s = sekil as Record<string, unknown>;
  if (typeof s.tur !== "string" || !GECERLI_SEKIL_TURLERI.includes(s.tur)) return false;
  if ((s.tur === "cokgen" || s.tur === "dalga" || s.tur === "serbest") && (!Array.isArray(s.noktalar) || s.noktalar.length < 2))
    return false;
  // Fizik nesnesi: bilinmeyen tür (eski/elle düzenlenmiş şablon) çizimde
  // tanımsız katalog girdisine dokunup ilk karede patlardı.
  if (s.tur === "fizik") {
    if (!fizikNesnesiGecerliMi(s.nesne)) return false;
    for (const alan of ["x", "y", "w", "h"]) {
      if (typeof s[alan] !== "number" || !Number.isFinite(s[alan] as number)) return false;
    }
  }
  if (s.tur === "fizik") {
    for (const alan of ["satir", "sutun"]) {
      const v = s[alan];
      if (v !== undefined && (typeof v !== "number" || !Number.isFinite(v) || v < 1 || v > 40)) return false;
    }
    if (s.renk !== undefined && typeof s.renk !== "string") return false;
    if (s.grafik !== undefined && !grafikVerisiGecerliMi(s.grafik)) return false;
    if (s.istatistik !== undefined && !istatistikVerisiGecerliMi(s.istatistik)) return false;
    if (s.sema !== undefined && !semaVerisiGecerliMi(s.sema)) return false;
    if (s.kimya !== undefined && !kimyaVerisiGecerliMi(s.kimya)) return false;
    if (s.geo !== undefined && !geometriVerisiGecerliMi(s.geo)) return false;
    if (s.ek !== undefined && !fizikEkGecerliMi(s.ek)) return false;
    if (s.seviye !== undefined && !(typeof s.seviye === "number" && s.seviye >= 0 && s.seviye <= 1)) return false;
    if (s.kuvvet !== undefined && !egikKuvvetVerisiGecerliMi(s.kuvvet)) return false;
    if (s.optik !== undefined && !optikVerisiGecerliMi(s.optik)) return false;
    if (s.sivi !== undefined && !siviVerisiGecerliMi(s.sivi)) return false;
  }
  // Temel şekillerin rengi/dolgusu yalnız #rrggbb (serbest metin çizime ulaşmasın).
  if (["dogru", "dikdortgen", "elips", "ucgen", "cokgen", "dalga", "serbest", "metin"].includes(s.tur)) {
    if (s.renk !== undefined && !RENK_DESENI.test(String(s.renk))) return false;
    if (s.dolgu !== undefined && !RENK_DESENI.test(String(s.dolgu))) return false;
  }
  if (s.tur === "baglayici" && s.renk !== undefined && !/^#[0-9a-fA-F]{6}$/.test(String(s.renk))) return false;
  if (s.tur === "baglayici" && s.stil !== undefined && !["dik", "duz", "yay", "vektor"].includes(String(s.stil))) return false;
  if (s.tur === "dikdortgen" && s.serbestKoseler !== undefined && !Array.isArray(s.serbestKoseler)) return false;
  // Akış kutusunun denklemi: çizim motoru `parcalar` üzerinde dönüyor ve
  // `punto` ile ölçüyor. Depodan bozuk gelirse (elle düzenlenmiş şablon, eski
  // sürüm) ilk karede patlar — tür kontrolü sessiz düşürmekten iyidir.
  if (s.tur === "akis" && s.denklem !== undefined) {
    const d = s.denklem as Record<string, unknown> | null;
    if (!d || typeof d !== "object") return false;
    if (typeof d.punto !== "number" || !Number.isFinite(d.punto) || d.punto <= 0) return false;
    if (!Array.isArray(d.parcalar)) return false;
    if (!d.parcalar.every((p) => !!p && typeof p === "object" && typeof (p as Record<string, unknown>).tur === "string")) return false;
  }
  return true;
}

export function sablonGecerliMi(sablon: unknown): sablon is KullaniciSablonu {
  if (!sablon || typeof sablon !== "object") return false;
  const s = sablon as Record<string, unknown>;
  return typeof s.id === "string" && typeof s.ad === "string" && Array.isArray(s.sekiller) && s.sekiller.every(sekilGecerliMi);
}
