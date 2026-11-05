// Doğrudan etkileşim (direct manipulation) yardımcıları — saf geometri.
//
// (Geometri köşe/nokta tutamaçları ve çift tıklama hedefi: geometriEtkilesim.ts.)
// - Grafikte `noktalar` eğrisinin köşe noktası tutamaçları (eksen adımına yakalanır).
// - Akış/fizik şekillerinde 4 bağlantı portu (üst, sağ, alt, sol).
// - Yüzen araç çubuğunun "Yatay çevir" ve "90° döndür" işlemleri.
//
// Editörden ayrı durur: hepsi birim testle yoklanabilir, tuval gerektirmez.

import type { BaglayiciYonu, GrafikVerisi, Nokta, Sekil } from "./tipler";
import { grafikDuzeni, type GrafikDuzeni } from "./grafik";
import { FIZIK_TANIMLARI } from "./fizik";

type FizikSekli = Extract<Sekil, { tur: "fizik" }>;
const RAD = Math.PI / 180;

const dondur = (p: Nokta, m: Nokta, derece: number): Nokta => {
  if (Math.abs(derece) < 0.01) return p;
  const r = derece * RAD, c = Math.cos(r), s = Math.sin(r);
  const dx = p.x - m.x, dy = p.y - m.y;
  return { x: m.x + dx * c - dy * s, y: m.y + dx * s + dy * c };
};

// ── Fizik nesnesinin yerel ↔ dünya dönüşümü (fizikCiz ile aynı: ayna, sonra dönüş) ──

export function fizikMerkezi(s: { x: number; y: number; w: number; h: number }): Nokta {
  return { x: s.x + s.w / 2, y: s.y + s.h / 2 };
}

export function fizikYereldenDunyaya(s: FizikSekli, p: Nokta): Nokta {
  const m = fizikMerkezi(s);
  const aynali = s.ayna ? { x: 2 * m.x - p.x, y: p.y } : p;
  return dondur(aynali, m, s.donus ?? 0);
}

export function fizikDunyadanYerele(s: FizikSekli, p: Nokta): Nokta {
  const m = fizikMerkezi(s);
  const q = dondur(p, m, -(s.donus ?? 0));
  return s.ayna ? { x: 2 * m.x - q.x, y: q.y } : q;
}

// ── Grafik köşe noktaları ──────────────────────────────────────────────────

/** grafikCiz ile aynı pencere (denklemli grafikte eşit birim düzeltmesi dahil). */
export function grafikPenceresi(s: FizikSekli, veri: GrafikVerisi): GrafikDuzeni {
  const d = { ...grafikDuzeni(veri) };
  if (veri.egriler.some((e) => e.tur === "denklem") && s.w > 0 && s.h > 0) {
    const birimX = (d.xMax - d.xMin) / s.w, birimY = (d.yMax - d.yMin) / s.h;
    if (birimY < birimX) {
      const yarim = (birimX * s.h) / 2, m = (d.yMin + d.yMax) / 2;
      d.yMin = m - yarim; d.yMax = m + yarim;
    } else {
      const yarim = (birimY * s.w) / 2, m = (d.xMin + d.xMax) / 2;
      d.xMin = m - yarim; d.xMax = m + yarim;
    }
  }
  return d;
}

export type GrafikNoktaTutamaci = { egri: number; nokta: number; x: number; y: number };

/** `noktalar` (ve adlı nokta) eğrilerinin köşe noktaları, dünya koordinatında. */
export function grafikNoktaTutamaclari(s: Sekil, pencere?: GrafikDuzeni): GrafikNoktaTutamaci[] {
  if (s.tur !== "fizik" || s.nesne !== "grafik" || !s.grafik) return [];
  const veri = s.grafik;
  const d = pencere ?? grafikPenceresi(s, veri);
  if (![d.xMin, d.xMax, d.yMin, d.yMax].every(Number.isFinite) || d.xMax <= d.xMin || d.yMax <= d.yMin) return [];
  const sonuc: GrafikNoktaTutamaci[] = [];
  veri.egriler.forEach((e, ei) => {
    if (e.tur !== "noktalar" && e.tur !== "isaret") return;
    e.noktalar.forEach((p, ni) => {
      const yerel = { x: s.x + ((p.x - d.xMin) / (d.xMax - d.xMin)) * s.w, y: s.y + s.h - ((p.y - d.yMin) / (d.yMax - d.yMin)) * s.h };
      sonuc.push({ egri: ei, nokta: ni, ...fizikYereldenDunyaya(s, yerel) });
    });
  });
  return sonuc;
}

const yuvarla = (v: number, adim: number) => {
  const r = Math.round(v / adim) * adim;
  return Math.round(r * 1e9) / 1e9;
};

/**
 * Grafik köşe noktasını dünya noktasına taşır: değer eksen ADIMINA (kılavuz
 * çizgilerine) yakalanır, pencere içinde kalır; zaman grafiğinde (noktalar)
 * komşu noktaların x'ini geçemez (eğri geri dönmesin). `pencere` sürükleme
 * başında dondurulan penceredir.
 */
export function grafikNoktaTasi(s: FizikSekli, egri: number, nokta: number, dunya: Nokta, pencere: GrafikDuzeni): GrafikVerisi | null {
  const veri = s.grafik;
  const e = veri?.egriler[egri];
  if (!veri || !e || (e.tur !== "noktalar" && e.tur !== "isaret")) return null;
  const p = fizikDunyadanYerele(s, dunya);
  const d = pencere;
  let X = d.xMin + ((p.x - s.x) / s.w) * (d.xMax - d.xMin);
  let Y = d.yMin + ((s.y + s.h - p.y) / s.h) * (d.yMax - d.yMin);
  X = Math.max(d.xMin, Math.min(d.xMax, yuvarla(X, d.xAdim > 0 ? d.xAdim : 1)));
  Y = Math.max(d.yMin, Math.min(d.yMax, yuvarla(Y, d.yAdim > 0 ? d.yAdim : 1)));
  if (e.tur === "noktalar") {
    const onceki = e.noktalar[nokta - 1], sonraki = e.noktalar[nokta + 1];
    if (onceki && X < onceki.x) X = onceki.x;
    if (sonraki && X > sonraki.x) X = sonraki.x;
  }
  const noktalar = e.noktalar.map((q, i) => (i === nokta ? { ...q, x: X, y: Y } : q));
  return { ...veri, egriler: veri.egriler.map((k, i) => (i === egri ? ({ ...k, noktalar } as typeof k) : k)) };
}

// ── Bağlantı portları ──────────────────────────────────────────────────────

const PORTSUZ = ["kareliAlan", "egikKuvvet", "optikDuzenek", "siviKabi", "grafik", "istatistik", "sema", "kimya", "koordinat", "aciYayi", "dikAci", "esIsaret", "ucgenABC", "dikUcgen", "benzerUcgen", "cemberGeo", "cokgenAd"];

/** Kenarlarından bağlayıcı çekilebilen şekil mi? (akış kutusu, fizik nesnesi) */
export function portluMu(s: Sekil): boolean {
  if (s.tur === "akis") return true;
  if (s.tur !== "fizik") return false;
  if (PORTSUZ.includes(s.nesne) || FIZIK_TANIMLARI[s.nesne]?.grup === "geometri") return false;
  // Geometri ailesine yeni eklenen nesneler (veri `geo`) de portsuz.
  return !s.geo;
}

export type BaglantiPortu = { yon: Exclude<BaglayiciYonu, "oto">; x: number; y: number };

/** Dört kenarın ortası (dünyada). Yön, dönmüş şekilde portun DÜNYADAKİ yönüdür. */
export function baglantiPortlari(s: Sekil): BaglantiPortu[] {
  if (!portluMu(s) || (s.tur !== "akis" && s.tur !== "fizik")) return [];
  const m = { x: s.x + s.w / 2, y: s.y + s.h / 2 };
  const yerel = [
    { x: m.x, y: s.y }, { x: s.x + s.w, y: m.y }, { x: m.x, y: s.y + s.h }, { x: s.x, y: m.y },
  ];
  return yerel.map((p) => {
    const d = dondur(p, m, s.donus ?? 0);
    const aci = Math.atan2(d.y - m.y, d.x - m.x) / RAD;
    const yon: BaglantiPortu["yon"] = aci >= -45 && aci < 45 ? "sag" : aci >= 45 && aci < 135 ? "alt" : aci >= -135 && aci < -45 ? "ust" : "sol";
    return { yon, x: d.x, y: d.y };
  });
}

// ── Çevir / döndür ─────────────────────────────────────────────────────────

const aynala = (p: Nokta, cx: number): Nokta => ({ x: 2 * cx - p.x, y: p.y });
const noktaMerkezX = (noktalar: Nokta[]) => (Math.min(...noktalar.map((p) => p.x)) + Math.max(...noktalar.map((p) => p.x))) / 2;
const tersAci = (d?: number) => (d ? ((360 - d) % 360) : undefined);

/** Şekli kendi dikey ekseni etrafında yatay çevirir (dünyada ayna görüntüsü). */
export function sekilYatayCevir(s: Sekil): Sekil {
  const donus = tersAci(s.donus);
  const ortak = donus === undefined ? (() => { const k = { ...s } as Record<string, unknown>; delete k.donus; return k; })() : { ...s, donus };
  switch (s.tur) {
    case "fizik": return { ...(ortak as FizikSekli), ayna: !s.ayna };
    case "dogru": {
      const cx = (s.x1 + s.x2) / 2;
      return { ...(ortak as typeof s), x1: 2 * cx - s.x1, x2: 2 * cx - s.x2 };
    }
    case "ucgen": {
      const cx = noktaMerkezX([{ x: s.x1, y: 0 }, { x: s.x2, y: 0 }, { x: s.x3, y: 0 }]);
      return { ...(ortak as typeof s), x1: 2 * cx - s.x1, x2: 2 * cx - s.x2, x3: 2 * cx - s.x3 };
    }
    case "cokgen": case "dalga": case "serbest": {
      const cx = noktaMerkezX(s.noktalar);
      return { ...(ortak as typeof s), noktalar: s.noktalar.map((p) => aynala(p, cx)) };
    }
    case "dikdortgen":
      if (s.serbestKoseler) {
        const cx = noktaMerkezX(s.serbestKoseler);
        return { ...(ortak as typeof s), serbestKoseler: s.serbestKoseler.map((p) => aynala(p, cx)) };
      }
      return ortak as Sekil;
    case "elips": case "akis":
      return ortak as Sekil;
    default:
      return s;
  }
}

/** 90° saat yönünde döndürür (bağlayıcı ve metin dışında). */
export function sekilDondur90(s: Sekil): Sekil {
  if (s.tur === "baglayici") return s;
  return { ...s, donus: (((s.donus ?? 0) + 90) % 360) } as Sekil;
}

export function cevrilebilirMi(s: Sekil): boolean {
  return s.tur !== "baglayici" && s.tur !== "metin";
}
