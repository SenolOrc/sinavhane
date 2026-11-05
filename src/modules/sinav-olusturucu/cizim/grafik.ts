// Fizik grafikleri: konum–zaman, hız–zaman, ivme–zaman, sinüs/kosinüs…
//
// NEDEN BÖYLE: Öğretmen bir hız–zaman grafiği çizerken eksen, ok, sayı, kesikli
// kılavuz ve eğriyi tek tek çizmek zorunda kalmasın. Burada grafik TEK BİR şekil:
// kutu (x, y, w, h) = çizim alanı; eksenler, sayılar, eğriler ve etiketler
// `GrafikVerisi`nden hesaplanır. Veri küçük ve düzenlenebilir olduğu için
// (evre listesi, nokta listesi, sinüs katsayıları) grafik sonradan da değişir.
//
// Her şey SAF fonksiyon (tuval/React bilmez): örnekleme, aralık/adım seçimi,
// sayı yazımı testlenebilir. Çizim (`grafikCiz`) bunların üstünde ince bir katman.

import type { GrafikBuyuklugu, GrafikCizgiDeseni, GrafikEgrisi, GrafikVerisi, Nokta, Sekil } from "./tipler";
import { MUREKKEP } from "./sabitler";
import { fizikMetniCiz } from "./fizik";
import { denklemMi, denklemOku, derle, esitsizlikOku, fonksiyonOku } from "./ifade";

type FizikSekli = Extract<Sekil, { tur: "fizik" }>;

export const GRAFIK_EGRI_RENKLERI = ["#2563eb", "#dc2626", "#15803d", "#c2410c", "#7c3aed", "#111827"];

// ── Çizgi desenleri (siyah-beyaz baskıda eğrileri ayırt etmek için) ─────────

export const GRAFIK_CIZGI_DESENLERI: { id: GrafikCizgiDeseni; ad: string }[] = [
  { id: "duz", ad: "Düz" },
  { id: "kesik", ad: "Kesikli" },
  { id: "nokta", ad: "Noktalı" },
  { id: "cizgiNokta", ad: "Çizgi-nokta" },
  { id: "asimptot", ad: "Asimptot (ince)" },
];

/** Eğrinin geçerli deseni: açık `cizgi` seçimi, yoksa eski `kesik` bayrağı. */
export function egriCizgiDeseni(e: { cizgi?: GrafikCizgiDeseni; kesik?: boolean }): GrafikCizgiDeseni {
  return e.cizgi ?? (e.kesik ? "kesik" : "duz");
}

/** Canvas `setLineDash` dizisi ve çizgi kalınlığı çarpanı. */
export function cizgiDeseniDegerleri(d: GrafikCizgiDeseni): { dash: number[]; kalinlik: number } {
  switch (d) {
    case "kesik": return { dash: [8, 5], kalinlik: 1 };
    case "nokta": return { dash: [1.5, 4.5], kalinlik: 1.25 };
    case "cizgiNokta": return { dash: [11, 4, 1.5, 4], kalinlik: 1 };
    case "asimptot": return { dash: [3, 3], kalinlik: 0.55 };
    default: return { dash: [], kalinlik: 1 };
  }
}

// ── Örnekleme ──────────────────────────────────────────────────────────────

export type HareketEvresi = { sure: number; ivme: number };

/** Evrelerin sonundaki toplam süre, son hız ve yer değiştirme. */
export function hareketOzeti(x0: number, v0: number, evreler: HareketEvresi[]) {
  let t = 0;
  let x = x0;
  let v = v0;
  for (const e of evreler) {
    const dt = Math.max(0, e.sure);
    x += v * dt + 0.5 * e.ivme * dt * dt;
    v += e.ivme * dt;
    t += dt;
  }
  return { toplamSure: t, sonHiz: v, sonKonum: x, yerDegistirme: x - x0 };
}

/**
 * Evrelerden istenen büyüklüğün (konum/hız/ivme) çizgi parçaları.
 * Konum ve hız SÜREKLİ tek çizgi; ivme evre başına yatay parça (evre sınırında
 * sıçrar — dik bağlantı çizgisi çizilmez, ders kitabındaki gibi).
 */
export function hareketParcalari(buyukluk: GrafikBuyuklugu, x0: number, v0: number, evreler: HareketEvresi[]): Nokta[][] {
  const sonuc: Nokta[][] = [];
  let t = 0;
  let x = x0;
  let v = v0;
  let surekli: Nokta[] = [];
  if (buyukluk === "konum") surekli.push({ x: 0, y: x0 });
  if (buyukluk === "hiz") surekli.push({ x: 0, y: v0 });
  for (const e of evreler) {
    const dt = Math.max(0, e.sure);
    if (dt === 0) continue;
    if (buyukluk === "ivme") {
      sonuc.push([{ x: t, y: e.ivme }, { x: t + dt, y: e.ivme }]);
    } else if (buyukluk === "hiz") {
      surekli.push({ x: t + dt, y: v + e.ivme * dt });
    } else {
      // Konum: ivme ≠ 0 ise parabol — evre içinde yeterince sık örnekle.
      const n = e.ivme === 0 ? 1 : 28;
      for (let i = 1; i <= n; i += 1) {
        const u = (dt * i) / n;
        surekli.push({ x: t + u, y: x + v * u + 0.5 * e.ivme * u * u });
      }
    }
    x += v * dt + 0.5 * e.ivme * dt * dt;
    v += e.ivme * dt;
    t += dt;
  }
  if (buyukluk !== "ivme" && surekli.length >= 2) sonuc.push(surekli);
  else surekli = [];
  return sonuc;
}

export function sinusParcasi(e: Extract<GrafikEgrisi, { tur: "sinus" }>): Nokta[] {
  const T = Math.abs(e.periyot) > 1e-9 ? Math.abs(e.periyot) : 1;
  const bas = e.baslangic;
  const son = e.bitis > bas ? e.bitis : bas + T;
  const donem = (son - bas) / T;
  const n = Math.min(1200, Math.max(48, Math.ceil(donem * 48)));
  const faz = (e.faz * Math.PI) / 180;
  const f = e.fonksiyon === "cos" ? Math.cos : Math.sin;
  const noktalar: Nokta[] = [];
  for (let i = 0; i <= n; i += 1) {
    const t = bas + ((son - bas) * i) / n;
    noktalar.push({ x: t, y: e.ofset + e.genlik * f((2 * Math.PI * t) / T + faz) });
  }
  return noktalar;
}

export type XAraligi = { xMin: number; xMax: number };

/**
 * y = f(x) örnekleme: tanım aralığıyla pencerenin kesişiminde sık örnek; tanımsız
 * (NaN/∞) noktada ve asimptotta (işaret değiştiren çok büyük sıçrama: 1/x, tan x)
 * çizgi KOPAR — iki dalı birbirine bağlayan çirkin dikey çizgi çıkmaz.
 */
export function fonksiyonParcalari(e: Extract<GrafikEgrisi, { tur: "fonksiyon" }>, aralik: XAraligi): Nokta[][] {
  const yaz = fonksiyonOku(e.ifade);
  if ("hata" in yaz || yaz.tur !== "y") return [];
  const a = Math.max(aralik.xMin, e.baslangic ?? -Infinity);
  const b = Math.min(aralik.xMax, e.bitis ?? Infinity);
  if (!(b > a)) return [];
  const N = 480;
  const parcalar: Nokta[][] = [];
  let simdiki: Nokta[] = [];
  let onceki: number | null = null;
  const kes = () => { if (simdiki.length >= 2) parcalar.push(simdiki); simdiki = []; onceki = null; };
  for (let i = 0; i <= N; i += 1) {
    const x = a + ((b - a) * i) / N;
    let y = yaz.f(x);
    if (!Number.isFinite(y)) { kes(); continue; }
    y = Math.max(-1e6, Math.min(1e6, y));
    if (onceki !== null && onceki * y < 0 && Math.abs(onceki) > 8 && Math.abs(y) > 8) kes();
    simdiki.push({ x, y });
    onceki = y;
  }
  kes();
  return parcalar;
}

/** x0 noktasındaki teğet: y = m·x + c (merkezi sayısal türev). */
export function tegetDogrusu(e: Extract<GrafikEgrisi, { tur: "teget" }>): { m: number; c: number; y0: number } | null {
  const yaz = fonksiyonOku(e.ifade);
  if ("hata" in yaz || yaz.tur !== "y") return null;
  const h = 1e-5 * Math.max(1, Math.abs(e.x0));
  const y0 = yaz.f(e.x0);
  const m = (yaz.f(e.x0 + h) - yaz.f(e.x0 - h)) / (2 * h);
  if (!Number.isFinite(y0) || !Number.isFinite(m)) return null;
  const mm = Math.round(m * 1e6) / 1e6;
  return { m: mm, c: y0 - mm * e.x0, y0 };
}

/** Kapalı denklemin (f(x,y)=0) görünür kısmının sınır kutusu; sınırsızsa (hiperbol) null. */
function denklemKutusu(ifade: string): { x0: number; x1: number; y0: number; y1: number } | null {
  const yaz = denklemOku(ifade);
  if ("hata" in yaz) return null;
  const R = 20, N = 160;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  const deger = (i: number, j: number) => yaz.f(-R + (2 * R * i) / N, -R + (2 * R * j) / N);
  let onceki: number[] = [];
  for (let j = 0; j <= N; j += 1) {
    const satir: number[] = [];
    for (let i = 0; i <= N; i += 1) {
      const v = deger(i, j);
      satir.push(v);
      const kes = (a: number, b: number) => Number.isFinite(a) && Number.isFinite(b) && (a * b < 0 || (a === 0) !== (b === 0));
      const dolas = (X: number, Y: number) => {
        x0 = Math.min(x0, X); x1 = Math.max(x1, X); y0 = Math.min(y0, Y); y1 = Math.max(y1, Y);
      };
      const X = -R + (2 * R * i) / N, Y = -R + (2 * R * j) / N;
      if (i > 0 && kes(satir[i - 1], v)) dolas(X, Y);
      if (j > 0 && kes(onceki[i], v)) dolas(X, Y);
    }
    onceki = satir;
  }
  if (!Number.isFinite(x0)) return null;
  const sinirda = x0 <= -R + 1 || x1 >= R - 1 || y0 <= -R + 1 || y1 >= R - 1;
  return sinirda ? null : { x0, x1, y0, y1 };
}

/** Eğrinin çizgi parçaları (veri uzayında). Fonksiyon için pencere (`aralik`) gerekir. */
export function egriParcalari(e: GrafikEgrisi, aralik: XAraligi = { xMin: -5, xMax: 5 }): Nokta[][] {
  if (e.tur === "noktalar") return e.noktalar.length >= 2 ? [e.noktalar] : [];
  if (e.tur === "hareket") return hareketParcalari(e.buyukluk, e.x0, e.v0, e.evreler);
  if (e.tur === "fonksiyon") return fonksiyonParcalari(e, aralik);
  if (e.tur === "bolge" || e.tur === "isaret" || e.tur === "denklem" || e.tur === "arasi") return [];
  if (e.tur === "teget") {
    const t = tegetDogrusu(e);
    return t ? [[{ x: aralik.xMin, y: t.m * aralik.xMin + t.c }, { x: aralik.xMax, y: t.m * aralik.xMax + t.c }]] : [];
  }
  return [sinusParcasi(e)];
}

/** Köşe noktaları: kılavuz çizgileri ve işaretler bunlara konur. */
export function egriVurguNoktalari(e: GrafikEgrisi): Nokta[] {
  if (e.tur === "noktalar" || e.tur === "isaret") return e.noktalar;
  if (e.tur === "hareket") {
    const sonuc: Nokta[] = [];
    let t = 0;
    let x = e.x0;
    let v = e.v0;
    const deger = (xx: number, vv: number, a: number) => (e.buyukluk === "konum" ? xx : e.buyukluk === "hiz" ? vv : a);
    const ilk = e.evreler.find((ev) => ev.sure > 0);
    if (e.buyukluk !== "ivme") sonuc.push({ x: 0, y: deger(x, v, 0) });
    else if (ilk) sonuc.push({ x: 0, y: ilk.ivme });
    for (const ev of e.evreler) {
      const dt = Math.max(0, ev.sure);
      if (dt === 0) continue;
      x += v * dt + 0.5 * ev.ivme * dt * dt;
      v += ev.ivme * dt;
      t += dt;
      sonuc.push({ x: t, y: deger(x, v, ev.ivme) });
    }
    return sonuc;
  }
  return [];
}

// ── Aralık ve adım ─────────────────────────────────────────────────────────

/** 1-2-5 dizisinden, aralığa ~`hedef` sayı düşecek "güzel" adım. */
export function guzelAdim(aralik: number, hedef = 6): number {
  if (!(aralik > 0) || !Number.isFinite(aralik)) return 1;
  const ham = aralik / hedef;
  const kuvvet = 10 ** Math.floor(Math.log10(ham));
  const n = ham / kuvvet;
  const k = n <= 1.5 ? 1 : n <= 3 ? 2 : n <= 7 ? 5 : 10;
  return k * kuvvet;
}

export type GrafikDuzeni = {
  xMin: number; xMax: number; yMin: number; yMax: number;
  xAdim: number; yAdim: number;
};

const temizle = (v: number) => Math.round(v * 1e9) / 1e9;

/** Pencere hesabı; çok büyük/belirsiz değerlerde sonlu olmayabilir (bkz. duzenSonluMu). */
export function grafikDuzeniHam(veri: GrafikVerisi): GrafikDuzeni {
  const xs: number[] = [];
  const ys: number[] = [];
  const topla = (parcalar: Nokta[][]) => {
    for (const parca of parcalar) {
      for (const p of parca) {
        if (Number.isFinite(p.x) && Number.isFinite(p.y)) { xs.push(p.x); ys.push(p.y); }
      }
    }
  };
  const fonks = veri.egriler.filter((e): e is Extract<GrafikEgrisi, { tur: "fonksiyon" }> => e.tur === "fonksiyon");
  // Alan ve teğet, kendi fonksiyonlarını pencereye katar (görünmez fonksiyon gibi).
  for (const e of veri.egriler) {
    if (e.tur === "arasi") {
      fonks.push({ tur: "fonksiyon", ifade: e.ifade, baslangic: e.baslangic, bitis: e.bitis });
      if (e.ifade2.trim()) fonks.push({ tur: "fonksiyon", ifade: e.ifade2, baslangic: e.baslangic, bitis: e.bitis });
    } else if (e.tur === "teget") {
      fonks.push({ tur: "fonksiyon", ifade: e.ifade });
      xs.push(e.x0);
    }
  }
  const denklemler = veri.egriler.filter((e): e is Extract<GrafikEgrisi, { tur: "denklem" }> => e.tur === "denklem");
  const bolgeVar = veri.egriler.some((e) => e.tur === "bolge");
  const matematik = fonks.length > 0 || bolgeVar || denklemler.length > 0;
  for (const e of denklemler) {
    const k = denklemKutusu(e.ifade);
    if (k) { xs.push(k.x0 - 1, k.x1 + 1); ys.push(k.y0 - 1, k.y1 + 1); }
  }
  // 1) Veri noktaları (fonksiyon/bölge hariç)
  for (const e of veri.egriler) {
    if (e.tur === "fonksiyon" || e.tur === "bolge" || e.tur === "denklem" || e.tur === "arasi" || e.tur === "teget") continue;
    topla(egriParcalari(e));
    if (e.tur === "isaret") topla([e.noktalar]);
  }
  // Dikey doğrular ve tanım aralığı uçları x'i genişletir
  for (const f of fonks) {
    const yaz = fonksiyonOku(f.ifade);
    if (!("hata" in yaz) && yaz.tur === "dikey") xs.push(yaz.x);
    if (f.baslangic !== undefined) xs.push(f.baslangic);
    if (f.bitis !== undefined) xs.push(f.bitis);
  }
  const tumFonksiyonAralikli = fonks.length > 0 && fonks.every((f) => f.baslangic !== undefined && f.bitis !== undefined);
  let dxMin = xs.length ? Math.min(...xs) : matematik ? -5 : 0;
  let dxMax = xs.length ? Math.max(...xs) : matematik ? 5 : 10;
  if (matematik && (!xs.length || (!tumFonksiyonAralikli && fonks.length))) {
    // Tanım aralığı verilmemiş fonksiyon: pencere eğrilerin İLGİNÇ NOKTALARINA (kökler, tepe,
    // kesişimler, y-kesim, dikey doğrular, adlı noktalar) göre sıkı seçilir. Hiç ilginç nokta
    // yoksa (1/x, tan x…) eski standart pencere (−5…5).
    const ilgin = fonks.length ? ilginNoktalar(veri) : [];
    if (ilgin.length && !denklemler.length && !bolgeVar) {
      const xk = [...xs, ...ilgin.map((q) => q.x), 0];
      let lo = Math.min(...xk), hi = Math.max(...xk);
      const pay = Math.max(1, (hi - lo) * 0.3);
      lo -= pay; hi += pay;
      if (hi - lo < 6) { const m = (lo + hi) / 2; lo = m - 3; hi = m + 3; }
      dxMin = lo; dxMax = hi;
    } else {
      dxMin = Math.min(dxMin, -5);
      dxMax = Math.max(dxMax, 5);
    }
  } else if (matematik && fonks.length) {
    dxMin -= 1;
    dxMax += 1;
  }

  // X
  const hedefX = matematik ? 8 : 6;
  const xAdim = veri.xAdim && veri.xAdim > 0 ? veri.xAdim : veri.piEksen ? Math.PI / 2 : guzelAdim(Math.max(dxMax, 0) - Math.min(dxMin, 0), hedefX);
  const xMin = veri.xMin ?? (dxMin >= 0 && !matematik ? 0 : Math.floor(dxMin / xAdim + 1e-9) * xAdim);
  let xMax = veri.xMax ?? Math.ceil(dxMax / xAdim - 1e-9) * xAdim;
  if (!(xMax > xMin)) xMax = xMin + xAdim;

  // Fonksiyon örnekleri (pencere belli olduktan sonra): çok büyük değerler eksen aralığını şişirmesin.
  const pencere = { xMin: veri.xMin ?? xMin, xMax: veri.xMax ?? xMax };
  // Pencere "kareye yakın" kalsın: |y| ≤ x aralığı olanlar eksen aralığını belirler (1/x, tan x,
  // hızlı büyüyen eğriler ekseni şişirmez; eğri pencereden taşar). Hiçbiri sığmazsa tümü alınır.
  const kirp = Math.max(8, pencere.xMax - pencere.xMin);
  for (const f of fonks) {
    const tum: number[] = [];
    let sigan = 0;
    for (const parca of fonksiyonParcalari(f, pencere)) {
      for (const p of parca) {
        tum.push(p.y);
        if (Math.abs(p.y) <= kirp) { ys.push(p.y); sigan += 1; }
      }
    }
    if (!sigan) ys.push(...tum.filter((v) => Math.abs(v) < 1e4));
  }
  if (matematik && !ys.length) ys.push(pencere.xMin * 0.6, pencere.xMax * 0.6);
  const dyMin = ys.length ? Math.min(...ys) : 0;
  const dyMax = ys.length ? Math.max(...ys) : 10;

  // Y: 0 her zaman görünür; üstte/altta küçük pay, yarım adıma yuvarla.
  const gMin = Math.min(0, dyMin);
  const gMax = Math.max(0, dyMax);
  const ham = gMax - gMin || 1;
  const pay = ham * 0.06;
  const yAdim = veri.yAdim && veri.yAdim > 0 ? veri.yAdim : guzelAdim(ham + pay * 2, matematik ? 8 : 6);
  const yarim = yAdim / 2;
  let yMin = veri.yMin ?? (gMin < 0 ? Math.floor((gMin - pay) / yarim + 1e-9) * yarim : 0);
  let yMax = veri.yMax ?? (gMax > 0 ? Math.ceil((gMax + pay) / yarim - 1e-9) * yarim : 0);
  if (!(yMax > yMin)) yMax = yMin + yAdim;
  return {
    xMin: temizle(xMin), xMax: temizle(xMax), yMin: temizle(yMin), yMax: temizle(yMax),
    xAdim, yAdim,
  };
}

/**
 * y=f(x) eğrilerinin pencere seçimini belirleyen ilginç noktaları: x-kesimler (kökler), y-kesim,
 * yerel uçlar (tepe) ve eğrilerin kesişimleri. Geniş bir aralıkta (−20…20) aranır.
 */
export function ilginNoktalar(veri: GrafikVerisi): Nokta[] {
  const fonksiyonlar: GrafikEgrisi[] = [];
  for (const e of veri.egriler) {
    if (e.tur === "fonksiyon") fonksiyonlar.push({ ...e, baslangic: e.baslangic, bitis: e.bitis });
    else if (e.tur === "arasi") {
      fonksiyonlar.push({ tur: "fonksiyon", ifade: e.ifade, baslangic: e.baslangic, bitis: e.bitis });
      if (e.ifade2.trim()) fonksiyonlar.push({ tur: "fonksiyon", ifade: e.ifade2, baslangic: e.baslangic, bitis: e.bitis });
    } else if (e.tur === "teget") fonksiyonlar.push({ tur: "fonksiyon", ifade: e.ifade });
  }
  if (!fonksiyonlar.length) return [];
  const sanal: GrafikVerisi = { ...veri, egriler: fonksiyonlar };
  const pencere = { xMin: -20, xMax: 20 };
  const sonuc: Nokta[] = [];
  const ekle = (q: Nokta) => { if (Number.isFinite(q.x) && Number.isFinite(q.y) && Math.abs(q.y) < 1e3) sonuc.push(q); };
  for (const q of kesisimNoktalari(sanal, pencere)) ekle(q);
  for (const q of ekstremumNoktalari(sanal, pencere)) ekle(q);
  for (const f of fonksiyonlar) {
    if (f.tur !== "fonksiyon") continue;
    const yaz = fonksiyonOku(f.ifade);
    if ("hata" in yaz || yaz.tur !== "y") continue;
    if ((f.baslangic ?? -Infinity) <= 0 && (f.bitis ?? Infinity) >= 0) ekle({ x: 0, y: yaz.f(0) });
  }
  return sonuc;
}

export function grafikDuzeni(veri: GrafikVerisi): GrafikDuzeni {
  const duzen = grafikDuzeniHam(veri);
  // Çok büyük/belirsiz değerlerde (1e300 …) pencere sonlu hesaplanamaz: çizim NaN'a düşmesin.
  return duzenSonluMu(duzen) ? duzen : { xMin: -5, xMax: 5, yMin: -5, yMax: 5, xAdim: 1, yAdim: 1 };
}

/** Pencere sonlu, sıfırdan büyük ve makul büyüklükte mi? (hızlı yazımda "çizilemez" uyarısı için de kullanılır) */
export function duzenSonluMu(d: GrafikDuzeni): boolean {
  const sayilar = [d.xMin, d.xMax, d.yMin, d.yMax, d.xAdim, d.yAdim];
  return sayilar.every((v) => Number.isFinite(v)) && d.xMax > d.xMin && d.yMax > d.yMin && d.xAdim > 0 && d.yAdim > 0 &&
    sayilar.every((v) => Math.abs(v) <= 1e12);
}

/** Adımın katları (min..max içinde). Kayan nokta hatasından arınmış. */
export function eksenSayilari(min: number, max: number, adim: number): number[] {
  if (!(adim > 0)) return [];
  const bas = Math.ceil(min / adim - 1e-9);
  const son = Math.floor(max / adim + 1e-9);
  const sonuc: number[] = [];
  for (let k = bas; k <= son && sonuc.length < 60; k += 1) sonuc.push(temizle(k * adim));
  return sonuc;
}

// ── Sayı yazımı ────────────────────────────────────────────────────────────

const EKSI = "−";

/** 2.5 → "2,5" (Türkçe ondalık virgül), −3 → "−3". */
export function sayiYaz(v: number): string {
  if (Math.abs(v) < 1e-9) return "0";
  const r = Math.abs(v) >= 1000 ? Math.round(v) : Math.round(v * 1000) / 1000;
  return String(r).replace(".", ",").replace("-", EKSI);
}

/**
 * sayiYaz gibi, ama çok küçük değerleri ("0" yerine) anlamlı yazar: 1e-7 → "10^-7", 2,5e-5 → "2,5×10^-5".
 * Üs, fizik yazısının üst simge gösterimidir (fizikMetniCiz).
 */
export function sayiYazDuyarli(v: number): string {
  const a = Math.abs(v);
  if (!(a < 0.001) || a < 1e-300 || !Number.isFinite(v)) return sayiYaz(v);
  const m = Number(a.toPrecision(2));
  const us = Math.floor(Math.log10(m));
  const mant = Math.round((m / 10 ** us) * 100) / 100;
  const govde = mant === 1 ? `10^${us}` : `${String(mant).replace(".", ",")}×10^${us}`;
  return v < 0 ? `${EKSI}${govde}` : govde;
}

/** Radyan değeri π katı olarak: π/2, π, 3π/2, 2π… Uymuyorsa ondalık yazar. */
export function piYaz(v: number): string {
  if (Math.abs(v) < 1e-9) return "0";
  const k = v / Math.PI;
  for (const d of [1, 2, 3, 4, 6]) {
    const n = Math.round(k * d);
    if (Math.abs(k * d - n) < 1e-6) {
      const isaret = n < 0 ? EKSI : "";
      const a = Math.abs(n);
      const pay = a === 1 ? "π" : `${a}π`;
      return d === 1 ? `${isaret}${pay}` : `${isaret}${pay}/${d}`;
    }
  }
  return sayiYaz(v);
}

// ── Hazır grafikler ────────────────────────────────────────────────────────

export const varsayilanGrafik = (): GrafikVerisi => ({
  egriler: [{ tur: "noktalar", noktalar: [{ x: 0, y: 0 }, { x: 4, y: 20 }, { x: 8, y: 20 }, { x: 10, y: 0 }], renk: "#2563eb", kilavuz: true }],
  xEtiket: "t (s)",
  yEtiket: "v (m/s)",
  izgara: false,
  sayilar: "kilavuz",
});

const ETIKETLER: Record<GrafikBuyuklugu, string> = { konum: "x (m)", hiz: "v (m/s)", ivme: "a (m/s^2)" };
export const GRAFIK_BUYUKLUK_ADLARI: Record<GrafikBuyuklugu, string> = { konum: "Konum–zaman", hiz: "Hız–zaman", ivme: "İvme–zaman" };

export function buyuklukEtiketi(b: GrafikBuyuklugu): string {
  return ETIKETLER[b];
}

/** Hareket evrelerinden tek bir grafik. */
export function hareketGrafigi(buyukluk: GrafikBuyuklugu, x0: number, v0: number, evreler: HareketEvresi[], ek: Partial<GrafikVerisi> = {}): GrafikVerisi {
  return {
    egriler: [{ tur: "hareket", buyukluk, x0, v0, evreler: evreler.map((e) => ({ ...e })), renk: "#2563eb", kilavuz: buyukluk !== "konum" || evreler.length <= 3 }],
    xEtiket: "t (s)",
    yEtiket: ETIKETLER[buyukluk],
    izgara: false,
    sayilar: "kilavuz",
    ...ek,
  };
}

/**
 * Aynı evrelerden konum + hız + ivme grafikleri. Üçü AYNI zaman aralığını
 * (xMin..xMax sabitlenir) kullanır; alt alta dizildiklerinde evre sınırları
 * hizalı görünür.
 */
export function hareketUcluGrafik(x0: number, v0: number, evreler: HareketEvresi[]): GrafikVerisi[] {
  const { toplamSure } = hareketOzeti(x0, v0, evreler);
  const ortak = { xMin: 0, xMax: toplamSure > 0 ? toplamSure : 10 };
  return (["konum", "hiz", "ivme"] as GrafikBuyuklugu[]).map((b) => hareketGrafigi(b, x0, v0, evreler, ortak));
}

export const ORNEK_EVRELER: HareketEvresi[] = [
  { sure: 4, ivme: 5 },
  { sure: 4, ivme: 0 },
  { sure: 2, ivme: -10 },
];

function sinusGrafigi(fonksiyon: "sin" | "cos", pi: boolean): GrafikVerisi {
  const periyot = pi ? 2 * Math.PI : 4;
  return {
    egriler: [{ tur: "sinus", fonksiyon, genlik: pi ? 1 : 2, periyot, faz: 0, ofset: 0, baslangic: 0, bitis: periyot * 2, renk: "#2563eb" }],
    xEtiket: pi ? "θ (rad)" : "t (s)",
    yEtiket: pi ? "y" : "x (cm)",
    izgara: true,
    sayilar: "oto",
    piEksen: pi,
  };
}

export type GrafikSablonu = {
  id: string; ad: string; ipucu: string; olustur: () => GrafikVerisi;
  /** Sol kütüphane araması için Türkçe anahtar kelimeler. */
  aramaKelimeleri?: string[];
};

export const GRAFIK_SABLONLARI: GrafikSablonu[] = [
  {
    id: "x-t-sabit",
    ad: "x–t (sabit hız)",
    ipucu: "Konum–zaman: doğrusal, eğim = hız",
    olustur: () => hareketGrafigi("konum", 0, 5, [{ sure: 6, ivme: 0 }]),
  },
  {
    id: "x-t-ivmeli",
    ad: "x–t (ivmeli)",
    ipucu: "Konum–zaman: parabol",
    olustur: () => hareketGrafigi("konum", 0, 0, [{ sure: 6, ivme: 2 }]),
  },
  {
    id: "v-t",
    ad: "v–t",
    ipucu: "Hız–zaman: hızlanma, sabit hız, yavaşlama",
    olustur: () => hareketGrafigi("hiz", 0, 0, ORNEK_EVRELER),
  },
  {
    id: "a-t",
    ad: "a–t",
    ipucu: "İvme–zaman: evre başına yatay parça",
    olustur: () => hareketGrafigi("ivme", 0, 0, ORNEK_EVRELER),
  },
  { id: "sin", ad: "Sinüs", ipucu: "y = A·sin(2πt/T). Genlik, periyot, faz panelden değişir", olustur: () => sinusGrafigi("sin", false) },
  { id: "cos", ad: "Kosinüs", ipucu: "y = A·cos(2πt/T)", olustur: () => sinusGrafigi("cos", false) },
  { id: "sin-pi", ad: "sin θ (π eksenli)", ipucu: "Yatay eksen radyan: π/2, π, 3π/2, 2π", olustur: () => sinusGrafigi("sin", true) },
  { id: "ozel", ad: "Noktalarla", ipucu: "Köşe noktalarını kendiniz yazın: 0,0; 4,20; 8,20; 10,0", olustur: () => varsayilanGrafik() },
];

// ── Matematik grafikleri ───────────────────────────────────────────────────

const MAT_RENKLER = ["#2563eb", "#dc2626", "#16a34a", "#ea580c", "#7c3aed"];

function matGrafik(egriler: GrafikEgrisi[], ek: Partial<GrafikVerisi> = {}): GrafikVerisi {
  return { egriler, xEtiket: "x", yEtiket: "y", izgara: true, sayilar: "oto", ...ek };
}

const fn = (ifade: string, renk = MAT_RENKLER[0], ek: object = {}): GrafikEgrisi => ({ tur: "fonksiyon", ifade, renk, ...ek });

/** En küçük kareler doğrusu y = a·x + b ve korelasyon katsayısı r. En az 2 farklı x gerekir. */
export function dogrusalRegresyon(noktalar: Nokta[]): { a: number; b: number; r: number } | null {
  const n = noktalar.length;
  if (n < 2) return null;
  const mx = noktalar.reduce((t, p) => t + p.x, 0) / n;
  const my = noktalar.reduce((t, p) => t + p.y, 0) / n;
  let sxx = 0, sxy = 0, syy = 0;
  for (const p of noktalar) { sxx += (p.x - mx) ** 2; sxy += (p.x - mx) * (p.y - my); syy += (p.y - my) ** 2; }
  if (sxx < 1e-12) return null;
  const a = sxy / sxx;
  return { a, b: my - a * mx, r: syy < 1e-12 ? 0 : sxy / Math.sqrt(sxx * syy) };
}

export const MAT_GRAFIK_SABLONLARI: GrafikSablonu[] = [
  { id: "m-dogru", ad: "Doğru", ipucu: "y = 2x + 1", olustur: () => matGrafik([fn("2x+1")]) },
  // Kökler ve tepe SABİT nokta olarak değil, fonksiyondan otomatik hesaplanır: fonksiyonu değiştirince işaretler de güncellenir.
  { id: "m-parabol", ad: "Parabol", ipucu: "y = x² − 4; kökleri ve tepe noktası otomatik işaretlenir", olustur: () => matGrafik([fn("x^2-4")], { kesisim: true, tepe: true }) },
  { id: "m-mutlak", ad: "Mutlak değer", ipucu: "y = |x − 2|", olustur: () => matGrafik([fn("|x-2|")]) },
  { id: "m-ustel", ad: "Üstel / log", ipucu: "y = 2^x ve y = log₂ x (ln x/ln 2)", olustur: () => matGrafik([fn("2^x"), fn("ln(x)/ln(2)", MAT_RENKLER[1], { cizgi: "kesik" }), fn("x", "#6b7280", { cizgi: "cizgiNokta" })], { xMin: -4, xMax: 6, yMin: -4, yMax: 6, xAdim: 1, yAdim: 1 }) },
  { id: "m-tan", ad: "tan x", ipucu: "Asimptotlu; yatay eksen π", olustur: () => matGrafik([fn("tan(x)")], { piEksen: true, xMin: -2 * Math.PI, xMax: 2 * Math.PI, yMin: -4, yMax: 4, yAdim: 1, xEtiket: "x", yEtiket: "y" }) },
  { id: "m-parcali", ad: "Parçalı", ipucu: "Açık/kapalı uç daireleriyle üç parça", olustur: () => matGrafik([
      fn("x+3", MAT_RENKLER[0], { baslangic: -4, bitis: 0, ucBas: "yok", ucSon: "bos" }),
      fn("2", MAT_RENKLER[0], { baslangic: 0, bitis: 2, ucBas: "dolu", ucSon: "bos" }),
      fn("-x+5", MAT_RENKLER[0], { baslangic: 2, bitis: 5, ucBas: "dolu", ucSon: "dolu" }),
    ], { xMin: -5, xMax: 6, yMin: -2, yMax: 6, xAdim: 1, yAdim: 1 }) },
  { id: "m-parcali-yazim", ad: "Parçalı (yazımla)", ipucu: "{x<0: -x, x>=0: x^2} yazımıyla; uçlarda açık/kapalı nokta", olustur: () => {
      const r = hizliMatematik("{x<0: -x, x>=0: x^2}; A(0,0)");
      return "veri" in r ? r.veri : matGrafik([fn("x")]);
    } },
  { id: "m-hiperbol-asimptot", ad: "Hiperbol + asimptot", ipucu: "x²/9 − y²/4 = 1 ve ince kesikli asimptotları y = ±2x/3", olustur: () => {
      const r = hizliMatematik("x^2/9-y^2/4=1; y=2x/3; y=-2x/3; F1(-3.6,0); F2(3.6,0)");
      return "veri" in r ? r.veri : matGrafik([fn("x")]);
    } },
  { id: "m-bolge", ad: "Eşitsizlik", ipucu: "y > x + 1 ve y ≤ −x + 4 bölgesi", olustur: () => matGrafik([
      { tur: "bolge", ifade: "y>x+1", renk: MAT_RENKLER[0] },
      { tur: "bolge", ifade: "y<=-x+4", renk: MAT_RENKLER[1] },
    ], { xMin: -5, xMax: 5, yMin: -5, yMax: 5, xAdim: 1, yAdim: 1 }) },
  { id: "m-cember", ad: "Çember", ipucu: "x² + y² = 25", olustur: () => matGrafik([{ tur: "denklem", ifade: "x^2+y^2=25", renk: MAT_RENKLER[0] }]) },
  { id: "m-elips", ad: "Elips", ipucu: "x²/9 + y²/4 = 1", olustur: () => matGrafik([{ tur: "denklem", ifade: "x^2/9+y^2/4=1", renk: MAT_RENKLER[0] }]) },
  { id: "m-hiperbol", ad: "Hiperbol", ipucu: "x²/9 − y²/4 = 1", olustur: () => matGrafik([{ tur: "denklem", ifade: "x^2/9-y^2/4=1", renk: MAT_RENKLER[0] }], { xMin: -6, xMax: 6, yMin: -6, yMax: 6, xAdim: 1, yAdim: 1 }) },
  { id: "m-arasi", ad: "İki eğri arası alan", ipucu: "y = x² ile y = x arası, [0, 1]; kesişim noktaları işaretli", olustur: () => matGrafik([
      { tur: "arasi", ifade: "x", ifade2: "x^2", baslangic: 0, bitis: 1, renk: MAT_RENKLER[0] },
      fn("x^2", MAT_RENKLER[0], { baslangic: -1, bitis: 2 }),
      fn("x", MAT_RENKLER[1], { baslangic: -1, bitis: 2, cizgi: "kesik" }),
    ], { kesisim: true, xMin: -1, xMax: 2, yMin: -1, yMax: 3, xAdim: 1, yAdim: 1 }) },
  { id: "m-alt-alan", ad: "Eğri altı alan", ipucu: "y = x² − 4x + 5, x∈[1,3] (integral)", olustur: () => matGrafik([
      { tur: "arasi", ifade: "x^2-4x+5", ifade2: "", baslangic: 1, bitis: 3, renk: MAT_RENKLER[0] },
      fn("x^2-4x+5", MAT_RENKLER[0], { baslangic: 0, bitis: 4 }),
    ], { xMin: 0, xMax: 4, yMin: 0, yMax: 6, xAdim: 1, yAdim: 1 }) },
  { id: "m-teget", ad: "Teğet doğrusu", ipucu: "y = x² eğrisine x=1 noktasında teğet", olustur: () => matGrafik([
      fn("x^2", MAT_RENKLER[0], { baslangic: -3, bitis: 3 }),
      { tur: "teget", ifade: "x^2", x0: 1, renk: MAT_RENKLER[1], kesik: true },
    ], { xMin: -3, xMax: 3, yMin: -2, yMax: 9, xAdim: 1, yAdim: 1 }) },
  { id: "m-noktalar", ad: "Koordinat düzlemi", ipucu: "Adlı noktalar: A(2,3), B(−1,2)…", olustur: () => matGrafik([{ tur: "isaret", noktalar: [{ x: 2, y: 3, ad: "A" }, { x: -1, y: 2, ad: "B" }, { x: -3, y: -2, ad: "C" }, { x: 4, y: -1, ad: "D" }], renk: "#111827", kilavuz: true }], { xMin: -5, xMax: 5, yMin: -4, yMax: 5, xAdim: 1, yAdim: 1, sayilar: "oto" }) },
  { id: "m-serpme", ad: "Serpme + doğru", ipucu: "Dağılım diyagramı ve en küçük kareler doğrusu", olustur: () => {
      const n = [{ x: 1, y: 2 }, { x: 2, y: 3.5 }, { x: 3, y: 3 }, { x: 4, y: 5.5 }, { x: 5, y: 6 }, { x: 6, y: 8 }, { x: 7, y: 7.5 }];
      const r = dogrusalRegresyon(n)!;
      return matGrafik([{ tur: "noktalar", noktalar: n, nokta: true, cizgisiz: true, renk: "#111827" }, fn(`${temizle(r.a)}x+${temizle(r.b)}`, MAT_RENKLER[1], { baslangic: 0, bitis: 8, kesik: true })], { xMin: 0, xMax: 8, yMin: 0, yMax: 10, xAdim: 1, yAdim: 1, xEtiket: "x", yEtiket: "y" });
    } },
];

// Arama kelimeleri (sol kütüphane). Şablon tanımlarını kalabalıklaştırmamak için ayrı tablo.
const GRAFIK_ARAMA: Record<string, string[]> = {
  "x-t-sabit": ["konum zaman", "x-t", "sabit hız", "düzgün doğrusal hareket", "hareket grafiği"],
  "x-t-ivmeli": ["konum zaman", "x-t", "ivmeli hareket", "parabol", "hareket grafiği"],
  "v-t": ["hız zaman", "v-t", "hızlanma", "yavaşlama", "hareket grafiği"],
  "a-t": ["ivme zaman", "a-t", "ivme", "hareket grafiği"],
  sin: ["sinüs", "dalga", "basit harmonik hareket", "periyot", "genlik"],
  cos: ["kosinüs", "dalga", "basit harmonik hareket", "periyot"],
  "sin-pi": ["sinüs", "radyan", "pi", "trigonometri", "dalga"],
  ozel: ["noktalar", "grafik", "köşe noktaları", "elle"],
  "m-dogru": ["doğru", "doğrusal fonksiyon", "eğim", "y=ax+b", "fonksiyon grafiği"],
  "m-parabol": ["parabol", "ikinci derece", "kök", "tepe noktası", "x kare"],
  "m-mutlak": ["mutlak değer", "fonksiyon grafiği", "|x|"],
  "m-ustel": ["üstel", "logaritma", "log", "ters fonksiyon"],
  "m-tan": ["tanjant", "tan", "asimptot", "trigonometri"],
  "m-parcali": ["parçalı fonksiyon", "açık uç", "kapalı uç", "süreklilik"],
  "m-parcali-yazim": ["parçalı fonksiyon", "mutlak", "parçalı"],
  "m-hiperbol-asimptot": ["hiperbol", "asimptot", "konik", "odak"],
  "m-bolge": ["eşitsizlik", "bölge", "doğrusal programlama", "taralı bölge"],
  "m-cember": ["çember", "çember denklemi", "konik", "analitik geometri"],
  "m-elips": ["elips", "konik", "analitik geometri"],
  "m-hiperbol": ["hiperbol", "konik", "analitik geometri"],
  "m-arasi": ["integral", "iki eğri arası alan", "alan", "belirli integral"],
  "m-alt-alan": ["integral", "eğri altı alan", "alan", "belirli integral"],
  "m-teget": ["teğet", "türev", "eğim", "teğet doğrusu"],
  "m-noktalar": ["koordinat düzlemi", "nokta", "analitik", "adlı nokta"],
  "m-serpme": ["serpme diyagramı", "regresyon", "korelasyon", "istatistik"],
};
for (const sb of [...GRAFIK_SABLONLARI, ...MAT_GRAFIK_SABLONLARI]) sb.aramaKelimeleri ??= GRAFIK_ARAMA[sb.id];

/** Üst düzey ayırıcı: `;` ve satır sonu, ama `{ … }` parçalı fonksiyon bloğunun içinde değil. */
function ustDuzeyBol(metin: string): string[] {
  const sonuc: string[] = [];
  let derin = 0, bas = 0;
  for (let i = 0; i < metin.length; i += 1) {
    const c = metin[i];
    if (c === "{") derin += 1;
    else if (c === "}") derin = Math.max(0, derin - 1);
    else if ((c === ";" || c === "\n") && derin === 0) { sonuc.push(metin.slice(bas, i)); bas = i + 1; }
  }
  sonuc.push(metin.slice(bas));
  return sonuc.map((p) => p.trim()).filter(Boolean);
}

const SAYI_IFADESI = (t: string): number | null => {
  const d = derle(t);
  if (!d.ok) return null;
  const v = d.f({});
  return Number.isFinite(v) ? v : null;
};

/**
 * Parçalı fonksiyon koşulu: "x<0", "x>=2", "-1<=x<3", "0<x". Okunamazsa null.
 * `x=2` tek nokta (nokta: true).
 */
export function parcaKosuluOku(kosul: string): { alt?: number; ust?: number; altDahil: boolean; ustDahil: boolean; nokta?: number } | null {
  const t = kosul.replace(/\s+/g, "").replace(/≤/g, "<=").replace(/≥/g, ">=").replace(/=</g, "<=").replace(/=>/g, ">=");
  const tek = /^x=(.+)$/i.exec(t);
  if (tek) {
    const v = SAYI_IFADESI(tek[1]);
    return v === null ? null : { altDahil: true, ustDahil: true, nokta: v };
  }
  const par = t.split(/(<=|>=|<|>)/);
  const yon = (op: string) => (op.startsWith("<") ? 1 : -1);
  const dahil = (op: string) => op.endsWith("=");
  if (par.length === 3 && /^x$/i.test(par[0])) {
    const v = SAYI_IFADESI(par[2]);
    if (v === null) return null;
    return yon(par[1]) > 0 ? { ust: v, altDahil: false, ustDahil: dahil(par[1]) } : { alt: v, altDahil: dahil(par[1]), ustDahil: false };
  }
  if (par.length === 3 && /^x$/i.test(par[2])) {
    const v = SAYI_IFADESI(par[0]);
    if (v === null) return null;
    // "2<x" → x>2
    return yon(par[1]) > 0 ? { alt: v, altDahil: dahil(par[1]), ustDahil: false } : { ust: v, altDahil: false, ustDahil: dahil(par[1]) };
  }
  if (par.length === 5 && /^x$/i.test(par[2]) && yon(par[1]) === yon(par[3])) {
    const a = SAYI_IFADESI(par[0]), b = SAYI_IFADESI(par[4]);
    if (a === null || b === null) return null;
    return yon(par[1]) > 0
      ? { alt: a, ust: b, altDahil: dahil(par[1]), ustDahil: dahil(par[3]) }
      : { alt: b, ust: a, altDahil: dahil(par[3]), ustDahil: dahil(par[1]) };
  }
  return null;
}

/**
 * Parçalı fonksiyon: `{x<0: -x, x>=0: x^2}` (başına `y=` yazılabilir). Her parça bir fonksiyon eğrisidir;
 * uçlarda açık (<, >) ya da kapalı (<=, >=) daire çizilir. Parçalar virgülle ayrılır
 * (ondalık için nokta ya da virgül; virgülden sonra bir koşul geliyorsa ayırıcı sayılır).
 */
export function parcaliFonksiyonOku(metin: string, renk: string): { egriler: GrafikEgrisi[] } | { hata: string } | null {
  const m = /^(?:(?:y|f\s*\(\s*x\s*\)|g\s*\(\s*x\s*\)|h\s*\(\s*x\s*\))\s*=\s*)?\{([\s\S]*)\}$/i.exec(metin.trim());
  if (!m) return null;
  const govde = m[1];
  const parcalar = govde.split(/,(?=\s*[^,:]*[<>≤≥=][^,:]*:)/).map((p) => p.trim()).filter(Boolean);
  if (!parcalar.length) return { hata: "Parçalı fonksiyon: {x<0: -x, x>=0: x^2} biçiminde yazın" };
  if (parcalar.length > 6) return { hata: "Parçalı fonksiyonda en çok 6 parça" };
  const egriler: GrafikEgrisi[] = [];
  const noktalar: { x: number; y: number }[] = [];
  for (const p of parcalar) {
    const i = p.indexOf(":");
    if (i < 0) return { hata: `"${kisalt(p)}": parça "koşul: ifade" biçiminde olmalı (x<0: -x)` };
    const kosul = parcaKosuluOku(p.slice(0, i));
    if (!kosul) return { hata: `"${kisalt(p.slice(0, i))}": koşul okunamadı (x<0, x>=2, -1<=x<3 gibi yazın)` };
    const ifade = p.slice(i + 1).trim();
    const f = fonksiyonOku(ifade);
    if ("hata" in f) return { hata: `"${kisalt(ifade)}": ${f.hata}` };
    if (f.tur !== "y") return { hata: `"${kisalt(ifade)}": parça y=f(x) olmalı` };
    if (kosul.nokta !== undefined) {
      const y = f.f(kosul.nokta);
      if (!Number.isFinite(y)) return { hata: `"${kisalt(p)}": bu noktada değer yok` };
      noktalar.push({ x: kosul.nokta, y });
      continue;
    }
    egriler.push({
      tur: "fonksiyon", ifade, renk,
      ...(kosul.alt !== undefined ? { baslangic: kosul.alt, ucBas: kosul.altDahil ? "dolu" as const : "bos" as const } : {}),
      ...(kosul.ust !== undefined ? { bitis: kosul.ust, ucSon: kosul.ustDahil ? "dolu" as const : "bos" as const } : {}),
    });
  }
  if (noktalar.length) egriler.push({ tur: "isaret", noktalar, renk });
  return { egriler };
}

const ADLI_NOKTA = /^([A-Za-zÇĞİÖŞÜçğıöşü][A-Za-z0-9ÇĞİÖŞÜçğıöşü₀-₉'′]*)\s*\(\s*([-+−]?\d+(?:[.,]\d+)?)\s*[,;]\s*([-+−]?\d+(?:[.,]\d+)?)\s*\)$/;
const FONKSIYON_ADLARI = new Set(["sin", "cos", "tan", "cot", "sec", "csc", "asin", "acos", "atan", "sinh", "cosh", "tanh", "sqrt", "abs", "exp", "ln", "log", "lg", "floor", "ceil", "round", "sign", "cbrt", "f", "g", "h", "alan", "teget"]);

/** "A(2,3)", "F1(-3,0)" → adlı nokta; değilse null. `F1` etiketi `F_1` (alt simge) olarak yazılır. */
export function adliNoktaSatiri(p: string): { x: number; y: number; ad: string } | null {
  const m = ADLI_NOKTA.exec(p.trim());
  if (!m || FONKSIYON_ADLARI.has(m[1].toLowerCase())) return null;
  const sayi = (t: string) => Number(t.replace(",", ".").replace(EKSI, "-"));
  const ad = m[1].replace(/^([A-Za-zÇĞİÖŞÜçğıöşü]+)(\d+)$/, "$1_$2").replace(/[₀-₉]/g, (c) => `_${c.charCodeAt(0) - 0x2080}`);
  return { x: sayi(m[2]), y: sayi(m[3]), ad };
}

/** Kapalı denklemin türü: dogrudan ikinci türevlerden (xy terimi yok varsayımı). */
function koniTuru(ifade: string): "cember" | "elips" | "hiperbol" | "diger" {
  const yaz = denklemOku(ifade);
  if ("hata" in yaz) return "diger";
  const f = yaz.f;
  const A = f(1, 0) + f(-1, 0) - 2 * f(0, 0);
  const C = f(0, 1) + f(0, -1) - 2 * f(0, 0);
  const xy = f(1, 1) - f(1, 0) - f(0, 1) + f(0, 0);
  if (![A, C, xy].every(Number.isFinite) || Math.abs(xy) > 1e-9) return "diger";
  if (A * C < -1e-12) return "hiperbol";
  if (A * C > 1e-12) return Math.abs(A - C) < 1e-9 * Math.max(1, Math.abs(A)) ? "cember" : "elips";
  return "diger";
}

/** Orijinden geçen doğru mu (y = kx)? Hiperbolün asimptotu olarak ince kesikli çizilir. */
function orijindenGecenDogruMu(ifade: string): boolean {
  const yaz = fonksiyonOku(ifade);
  if ("hata" in yaz || yaz.tur !== "y") return false;
  const f = yaz.f;
  const [a, b, c] = [f(0), f(1), f(2)];
  return [a, b, c].every(Number.isFinite) && Math.abs(a) < 1e-9 && Math.abs(c - 2 * b) < 1e-9 && Math.abs(f(-1) + b) < 1e-9;
}

const TRIG = /\b(sin|cos|tan|cot|sec|csc)\b/i;

/** f(x+T)=f(x) sağlayan en küçük T (π/6'nın katları, ≤ 8π); bulunamazsa null. */
function trigPeriyodu(ifade: string): number | null {
  const yaz = fonksiyonOku(ifade);
  if ("hata" in yaz || yaz.tur !== "y") return null;
  const f = yaz.f;
  const ornek = [0.31, 0.77, 1.13, 1.9, 2.6, 3.7, 4.4, 5.8, -0.9, -2.2];
  for (let j = 1; j <= 48; j += 1) {
    const T = (j * Math.PI) / 6;
    let ok = true, say = 0;
    for (const x of ornek) {
      const a = f(x), b = f(x + T);
      if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
      say += 1;
      if (Math.abs(a - b) > 1e-6 * (1 + Math.abs(a))) { ok = false; break; }
    }
    if (ok && say >= 5) return T;
  }
  return null;
}

/**
 * "y=x^2-4; y>x+1; x=3" → grafik. Eşitsizlik işareti olanlar bölge, kalanlar fonksiyon.
 * Parçalı fonksiyon: `{x<0: -x, x>=0: x^2}`. Adlı nokta: `A(2,3)`, `F1(-3,0)`.
 * Birden çok eğri çizgi desenleriyle ayrılır (düz, kesikli, noktalı, çizgi-nokta); hiperbolün
 * asimptotu ince kesikli. Yalnız trigonometrik eğrilerde x ekseni π katlarıyla ve iki periyot gösterilir.
 * Hatalı parça için hata metni döner (panel gösterir).
 */
export function hizliMatematik(metin: string): { veri: GrafikVerisi } | { hata: string } {
  const parcalar = ustDuzeyBol(metin);
  if (!parcalar.length) return { hata: "Bir ifade yazın: y = x^2 - 4" };
  if (parcalar.length > 10) return { hata: "En çok 10 ifade" };
  const uzun = parcalar.find((p) => p.length > EN_COK_IFADE);
  if (uzun) return { hata: `Bir ifade en çok ${EN_COK_IFADE} karakter olabilir ("${kisalt(uzun)}")` };
  type Girdi = { egriler: GrafikEgrisi[]; tur: "fonksiyon" | "denklem" | "diger" };
  const girdiler: Girdi[] = [];
  const adliNoktalar: { x: number; y: number; ad: string }[] = [];
  let kesisim = false;
  let tepe = false;
  for (const [i, p] of parcalar.entries()) {
    const renk = MAT_RENKLER[i % MAT_RENKLER.length];
    const alan = /^alan\s*\((.*)\)$/i.exec(p);
    const teg = /^teget\s*\((.*)\)$/i.exec(p);
    const adli = adliNoktaSatiri(p);
    if (/^(kesisim|kesişim)$/i.test(p)) {
      kesisim = true;
    } else if (/^(tepe|uc|uç)$/i.test(p)) {
      tepe = true;
    } else if (adli) {
      adliNoktalar.push(adli);
    } else if (p.startsWith("{") || /^(?:y|[fgh]\s*\(\s*x\s*\))\s*=\s*\{/i.test(p)) {
      const r = parcaliFonksiyonOku(p, renk);
      if (!r) return { hata: `"${kisalt(p)}": parçalı fonksiyon {x<0: -x, x>=0: x^2} biçiminde yazılır` };
      if ("hata" in r) return r;
      girdiler.push({ egriler: r.egriler, tur: "fonksiyon" });
    } else if (alan) {
      // alan(üst, alt, baslangic, bitis)  ·  alan(x^2, x, 0, 1)  ·  alan(x^2, 0, 2) → x eksenine kadar
      const a = alan[1].split(",").map((t) => t.trim());
      const sayisal = (t?: string) => (t === undefined || t === "" ? undefined : Number(t.replace(",", ".")));
      let ust = a[0], alt = "", bas: number | undefined, bit: number | undefined;
      if (a.length >= 4) { alt = a[1]; bas = sayisal(a[2]); bit = sayisal(a[3]); }
      else if (a.length === 3) { bas = sayisal(a[1]); bit = sayisal(a[2]); }
      else if (a.length === 2) { alt = a[1]; }
      if (!ust || [bas, bit].some((v) => v !== undefined && !Number.isFinite(v))) return { hata: `"${kisalt(p)}": alan(f, g, başlangıç, bitiş) biçiminde yazın` };
      for (const t of [ust, alt].filter(Boolean)) {
        const f = fonksiyonOku(t);
        if ("hata" in f || f.tur !== "y") return { hata: `"${kisalt(p)}": alan için y=f(x) yazın` };
      }
      girdiler.push({ egriler: [{ tur: "arasi", ifade: ust, ifade2: alt, baslangic: bas, bitis: bit, renk }], tur: "diger" });
    } else if (teg) {
      const a = teg[1].split(",").map((t) => t.trim());
      const x0 = Number((a[1] ?? "").replace(",", "."));
      const f = fonksiyonOku(a[0] ?? "");
      if ("hata" in f || f.tur !== "y" || a.length !== 2 || !Number.isFinite(x0)) return { hata: `"${kisalt(p)}": teget(f, x₀) biçiminde yazın` };
      girdiler.push({ egriler: [{ tur: "teget", ifade: a[0], x0, renk, kesik: true }], tur: "diger" });
    } else if (/[<>≤≥]/.test(p)) {
      const e = esitsizlikOku(p);
      if ("hata" in e) return { hata: `"${kisalt(p)}": ${e.hata}` };
      girdiler.push({ egriler: [{ tur: "bolge", ifade: p, renk }], tur: "diger" });
    } else if (denklemMi(p)) {
      const e = denklemOku(p);
      if ("hata" in e) return { hata: `"${kisalt(p)}": ${e.hata}` };
      girdiler.push({ egriler: [{ tur: "denklem", ifade: p, renk }], tur: "denklem" });
    } else {
      const f = fonksiyonOku(p);
      if ("hata" in f) return { hata: `"${kisalt(p)}": ${f.hata}` };
      girdiler.push({ egriler: [fn(p, renk)], tur: "fonksiyon" });
    }
  }
  if (adliNoktalar.length) {
    girdiler.push({ egriler: [{ tur: "isaret", noktalar: adliNoktalar, renk: "#111827", kilavuz: false }], tur: "diger" });
  }
  // Çizgi desenleri: hiperbol varsa orijinden geçen doğrular asimptot (ince kesikli); kalan çizgi
  // eğrileri sırayla düz / kesikli / noktalı / çizgi-nokta. Tek eğri düz kalır.
  const hiperbolVar = girdiler.some((g) => g.egriler[0].tur === "denklem" && koniTuru((g.egriler[0] as { ifade: string }).ifade) === "hiperbol");
  const desenler: GrafikCizgiDeseni[] = ["duz", "kesik", "nokta", "cizgiNokta"];
  const cizgiGirdileri = girdiler.filter((g) => g.tur !== "diger");
  const asimptotMu = (g: Girdi) => hiperbolVar && g.tur === "fonksiyon" && g.egriler.length === 1 && orijindenGecenDogruMu((g.egriler[0] as { ifade: string }).ifade);
  const asilar = cizgiGirdileri.filter((g) => !asimptotMu(g));
  for (const g of cizgiGirdileri) {
    let desen: GrafikCizgiDeseni;
    if (asimptotMu(g)) desen = "asimptot";
    else if (asilar.length < 2) continue;
    else desen = desenler[asilar.indexOf(g) % desenler.length];
    for (const e of g.egriler) if (e.tur === "fonksiyon" || e.tur === "denklem") e.cizgi = desen;
  }
  const egriler = girdiler.flatMap((g) => g.egriler);
  if (!egriler.length) return { hata: "Çizilecek bir ifade yazın: y = x^2 - 4" };
  if (egriler.length > 8) return { hata: "En çok 8 eğri çizilebilir" };
  const ek: Partial<GrafikVerisi> = { ...(kesisim ? { kesisim: true } : {}), ...(tepe ? { tepe: true } : {}) };
  // Yalnız trigonometrik fonksiyonlar (ve noktalar): x ekseni π katları, iki periyot.
  const fonksiyonlar = egriler.filter((e): e is Extract<GrafikEgrisi, { tur: "fonksiyon" }> => e.tur === "fonksiyon");
  const trigler = fonksiyonlar.filter((e) => TRIG.test(e.ifade));
  const yalnizTrig = trigler.length > 0 && trigler.length === fonksiyonlar.length &&
    trigler.every((e) => e.baslangic === undefined && e.bitis === undefined) && egriler.every((e) => e.tur === "fonksiyon" || e.tur === "isaret");
  if (yalnizTrig) {
    const T = Math.max(...trigler.map((e) => trigPeriyodu(e.ifade) ?? 0));
    if (T > 0) {
      Object.assign(ek, { piEksen: true, xMin: -T, xMax: T, xAdim: T / 4 });
      if (trigler.some((e) => /\b(tan|cot|sec|csc)\b/i.test(e.ifade))) Object.assign(ek, { yMin: -4, yMax: 4, yAdim: 1 });
      else {
        // y: genliğe göre "güzel" adım; uçlarda %25 pay (sin x için −1,5…1,5, adım 1).
        let lo = 0, hi = 0;
        for (const e of trigler) {
          const f = fonksiyonOku(e.ifade);
          if ("hata" in f || f.tur !== "y") continue;
          for (let i = 0; i <= 240; i += 1) { const v = f.f(-T + (2 * T * i) / 240); if (Number.isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }
        }
        const gen = Math.max(hi, -lo, 1e-6);
        const adim = gen <= 1.0001 ? 1 : guzelAdim(gen, 2);
        const yarim = adim / 2;
        Object.assign(ek, { yAdim: adim, yMin: lo < -1e-9 ? -Math.ceil((-lo * 1.25) / yarim) * yarim : 0, yMax: hi > 1e-9 ? Math.ceil((hi * 1.25) / yarim) * yarim : 0 });
      }
    }
  }
  const veri = matGrafik(egriler, ek);
  if (!grafikVerisiGecerliMi(veri) || !duzenSonluMu(grafikDuzeniHam(veri))) return { hata: BUYUK_IFADE_HATASI };
  return { veri };
}

export const BUYUK_IFADE_HATASI = "Bu ifade çizilemeyecek kadar büyük/belirsiz değerler üretiyor";
/** Grafikte bir ifadenin (ve hızlı yazımda her parçanın) en çok uzunluğu; doğrulamayla aynı. */
export const EN_COK_IFADE = 200;
const kisalt = (m: string) => (m.length > 30 ? `${m.slice(0, 30)}…` : m);

/** Eğri türü değişince makul bir başlangıç. */
export function varsayilanEgri(tur: GrafikEgrisi["tur"], oncekiRenk?: string): GrafikEgrisi {
  const renk = oncekiRenk ?? GRAFIK_EGRI_RENKLERI[0];
  if (tur === "fonksiyon") return { tur, ifade: "x^2-4", renk };
  if (tur === "bolge") return { tur, ifade: "y>x+1", renk };
  if (tur === "denklem") return { tur, ifade: "x^2+y^2=9", renk };
  if (tur === "arasi") return { tur, ifade: "x^2", ifade2: "x", baslangic: 0, bitis: 1, renk };
  if (tur === "teget") return { tur, ifade: "x^2", x0: 1, renk, kesik: true };
  if (tur === "isaret") return { tur, noktalar: [{ x: 2, y: 3, ad: "A" }, { x: -1, y: 2, ad: "B" }], renk };
  if (tur === "hareket") return { tur, buyukluk: "hiz", x0: 0, v0: 0, evreler: ORNEK_EVRELER.map((e) => ({ ...e })), renk, kilavuz: true };
  if (tur === "sinus") return { tur, fonksiyon: "sin", genlik: 2, periyot: 4, faz: 0, ofset: 0, baslangic: 0, bitis: 8, renk };
  return { tur: "noktalar", noktalar: [{ x: 0, y: 0 }, { x: 4, y: 20 }, { x: 8, y: 20 }, { x: 10, y: 0 }], renk, kilavuz: true };
}

// ── "0,0; 2,10; 6,10" yazımı ───────────────────────────────────────────────

export const EN_COK_NOKTA = 80;

/**
 * Noktaları okur; okunamazsa NEDENİ döner (panel kırmızı küçük metinle gösterir).
 * Virgül veya nokta ondalık kabul eder; noktalar `;` ile ayrılır, x ile y boşluk, `,` ya da `:`.
 */
export function noktalariOkuAyrinti(metin: string): { noktalar: Nokta[] } | { hata: string } {
  const parcalar = metin.split(/[;\n]/).map((p) => p.trim()).filter(Boolean);
  if (parcalar.length > EN_COK_NOKTA) return { hata: `En çok ${EN_COK_NOKTA} nokta` };
  const sonuc: Nokta[] = [];
  for (const [i, parca] of parcalar.entries()) {
    // ":" varsa kesin ayırıcı; boşluk varsa ("2,5 10") ondalık virgül serbest;
    // aksi halde virgül ayırıcıdır ("2,10" ya da "2.5, 10").
    const t = parca.trim();
    let sayilar: string[];
    if (t.includes(":")) sayilar = t.split(":");
    else if (/\s/.test(t) && !/,\s/.test(t)) sayilar = t.split(/\s+/);
    else sayilar = t.split(",");
    const hata = { hata: `x,y çifti okunamadı: ${i + 1}. nokta` };
    if (sayilar.length !== 2 || sayilar.some((v) => !v.trim())) return hata;
    const [x, y] = sayilar.map((v) => Number(v.trim().replace(",", ".").replace(EKSI, "-")));
    if (!Number.isFinite(x) || !Number.isFinite(y)) return hata;
    sonuc.push({ x, y });
  }
  if (sonuc.length < 2) return { hata: "En az 2 nokta yazın (ör. 0,0; 4,20)" };
  return { noktalar: sonuc };
}

export function noktalariOku(metin: string): Nokta[] | null {
  const r = noktalariOkuAyrinti(metin);
  return "noktalar" in r ? r.noktalar : null;
}

/** Aynı x değerine birden çok nokta yazıldıysa uyarı metni (eğri o noktada dikey/boş kalır), yoksa null. */
export function ayniXUyarisi(noktalar: Nokta[]): string | null {
  const gorulen = new Set<number>();
  for (const p of noktalar) {
    if (gorulen.has(p.x)) return "Aynı x değerine birden çok nokta yazdınız; eğri düzgün çizilmez";
    gorulen.add(p.x);
  }
  return null;
}

/**
 * v–t köşe noktalarından hareket evreleri: her parça için süre ve ivme (eğim).
 * Böylece öğretmen hız–zaman grafiğini yazınca konum ve ivme grafiği de çıkar.
 * Noktalar t=0'dan başlayıp zamanda artmalı; değilse null.
 */
export function noktalardanEvreler(noktalar: Nokta[]): { v0: number; evreler: HareketEvresi[] } | null {
  if (noktalar.length < 2 || Math.abs(noktalar[0].x) > 1e-9) return null;
  const evreler: HareketEvresi[] = [];
  for (let i = 1; i < noktalar.length; i += 1) {
    const dt = noktalar[i].x - noktalar[i - 1].x;
    if (!(dt > 1e-9)) return null;
    evreler.push({ sure: temizle(dt), ivme: temizle((noktalar[i].y - noktalar[i - 1].y) / dt) });
  }
  return { v0: noktalar[0].y, evreler };
}

/** Hızlı yazımdan tek grafik: noktalar + köşe kılavuzu; eksen adları büyüklüğe göre. */
export function noktalardanGrafik(noktalar: Nokta[], buyukluk: GrafikBuyuklugu): GrafikVerisi {
  return {
    egriler: [{ tur: "noktalar", noktalar, renk: "#2563eb", kilavuz: true }],
    xEtiket: "t (s)",
    yEtiket: ETIKETLER[buyukluk],
    izgara: false,
    sayilar: "kilavuz",
  };
}

/**
 * Adlı noktalar: "A(2,3); B(-1,2)" ya da "A:2,3" ya da yalnız "2,3". Okunamazsa null.
 */
export function adliNoktalariOku(metin: string): { x: number; y: number; ad?: string }[] | null {
  const parcalar = metin.split(/;|\n/).map((p) => p.trim()).filter(Boolean);
  if (!parcalar.length || parcalar.length > 40) return null;
  const sonuc: { x: number; y: number; ad?: string }[] = [];
  for (const p of parcalar) {
    const m = /^([^\d(:\-+.,\s][^(:]*)?\s*[(:]?\s*([-+\u2212]?\d+(?:[.,]\d+)?)\s*[,\s]\s*([-+\u2212]?\d+(?:[.,]\d+)?)\s*\)?$/.exec(p);
    if (!m) return null;
    const x = Number(m[2].replace(",", ".").replace(EKSI, "-"));
    const y = Number(m[3].replace(",", ".").replace(EKSI, "-"));
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    sonuc.push({ x, y, ...(m[1]?.trim() ? { ad: m[1].trim() } : {}) });
  }
  return sonuc;
}

export function adliNoktalariYaz(noktalar: { x: number; y: number; ad?: string }[]): string {
  const f = (v: number) => String(Math.round(v * 1e6) / 1e6);
  return noktalar.map((p) => `${p.ad ?? ""}(${f(p.x)},${f(p.y)})`).join("; ");
}

export function noktalariYaz(noktalar: Nokta[]): string {
  return noktalar.map((p) => `${sayiYaz(p.x).replace(EKSI, "-").replace(",", ".")},${sayiYaz(p.y).replace(EKSI, "-").replace(",", ".")}`).join("; ");
}

// ── Doğrulama ──────────────────────────────────────────────────────────────

const sayi = (v: unknown) => typeof v === "number" && Number.isFinite(v);
const secenek = (v: unknown) => v === undefined || sayi(v);
/** Hareket evresi süre/ivme ve başlangıç değerlerinin mutlak üst sınırı: 1e308/∞ gibi değerler grafiği boş bırakıp sınava girmesin. */
export const HAREKET_SINIRI = 1e6;
const aralikta = (v: unknown, sinir: number) => sayi(v) && Math.abs(v as number) <= sinir;

export function grafikVerisiGecerliMi(v: unknown): v is GrafikVerisi {
  if (!v || typeof v !== "object") return false;
  const g = v as Record<string, unknown>;
  if (!Array.isArray(g.egriler) || g.egriler.length > 8) return false;
  if (typeof g.xEtiket !== "string" || typeof g.yEtiket !== "string") return false;
  for (const a of ["xMin", "xMax", "yMin", "yMax", "xAdim", "yAdim"]) if (!secenek(g[a])) return false;
  if (g.kesisim !== undefined && typeof g.kesisim !== "boolean") return false;
  if (g.tepe !== undefined && typeof g.tepe !== "boolean") return false;
  if (g.sayilar !== undefined && !["oto", "kilavuz", "yok"].includes(String(g.sayilar))) return false;
  return g.egriler.every((e) => {
    if (!e || typeof e !== "object") return false;
    const c = e as Record<string, unknown>;
    if (c.renk !== undefined && !/^#[0-9a-fA-F]{6}$/.test(String(c.renk))) return false;
    if (c.cizgi !== undefined && !["duz", "kesik", "nokta", "cizgiNokta", "asimptot"].includes(String(c.cizgi))) return false;
    if (c.tur === "noktalar") {
      return Array.isArray(c.noktalar) && c.noktalar.length <= 200 && c.noktalar.every((p) => !!p && sayi((p as Nokta).x) && sayi((p as Nokta).y));
    }
    if (c.tur === "hareket") {
      return (
        ["konum", "hiz", "ivme"].includes(String(c.buyukluk)) && aralikta(c.x0, HAREKET_SINIRI) && aralikta(c.v0, HAREKET_SINIRI) &&
        Array.isArray(c.evreler) && c.evreler.length <= 30 &&
        c.evreler.every((ev) => !!ev && aralikta((ev as HareketEvresi).sure, HAREKET_SINIRI) && (ev as HareketEvresi).sure >= 0 && aralikta((ev as HareketEvresi).ivme, HAREKET_SINIRI))
      );
    }
    if (c.tur === "fonksiyon") {
      return typeof c.ifade === "string" && c.ifade.length <= EN_COK_IFADE && secenek(c.baslangic) && secenek(c.bitis) &&
        [c.ucBas, c.ucSon].every((u) => u === undefined || ["yok", "dolu", "bos"].includes(String(u)));
    }
    if (c.tur === "bolge" || c.tur === "denklem") return typeof c.ifade === "string" && c.ifade.length <= EN_COK_IFADE;
    if (c.tur === "arasi") {
      return typeof c.ifade === "string" && c.ifade.length <= EN_COK_IFADE && typeof c.ifade2 === "string" && c.ifade2.length <= EN_COK_IFADE && secenek(c.baslangic) && secenek(c.bitis);
    }
    if (c.tur === "teget") return typeof c.ifade === "string" && c.ifade.length <= EN_COK_IFADE && sayi(c.x0);
    if (c.tur === "isaret") {
      return Array.isArray(c.noktalar) && c.noktalar.length <= 60 &&
        c.noktalar.every((p) => !!p && sayi((p as Nokta).x) && sayi((p as Nokta).y) && ((p as { ad?: unknown }).ad === undefined || typeof (p as { ad?: unknown }).ad === "string"));
    }
    if (c.tur === "sinus") {
      return ["sin", "cos"].includes(String(c.fonksiyon)) && ["genlik", "periyot", "faz", "ofset", "baslangic", "bitis"].every((a) => sayi(c[a]));
    }
    return false;
  });
}

// ── Çizim ──────────────────────────────────────────────────────────────────

/** Grafiğin etiket/sayı payı: kutunun dışına taşan yazıların kapladığı yer. */
export function grafikEtiketPayi(s: FizikSekli) {
  const baslik = s.etiket?.trim() ? 26 : 0;
  return { sol: 46, ust: 32, sag: 84, alt: 26 + baslik };
}

function okBasi(ctx: CanvasRenderingContext2D, uc: Nokta, aci: number, boy: number) {
  ctx.save();
  ctx.translate(uc.x, uc.y);
  ctx.rotate(aci);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-boy, -boy * 0.36);
  ctx.lineTo(-boy, boy * 0.36);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function haleliYaz(ctx: CanvasRenderingContext2D, metin: string, x: number, y: number, hiza: CanvasTextAlign, boy = 13) {
  ctx.save();
  ctx.font = `${boy}px "Times New Roman", Times, serif`;
  ctx.textAlign = hiza;
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#ffffff";
  ctx.setLineDash([]);
  ctx.strokeText(metin, x, y);
  ctx.fillStyle = MUREKKEP;
  ctx.fillText(metin, x, y);
  ctx.restore();
}

function benzersiz(degerler: number[]): number[] {
  const s = [...degerler].sort((a, b) => a - b);
  return s.filter((v, i) => i === 0 || Math.abs(v - s[i - 1]) > 1e-9);
}

/**
 * Çizimde kullanılan pencere: `grafikDuzeni` + çember/elips varsa eşit eksen birimi
 * (kutunun en-boy oranına göre kısa eksenin aralığı genişletilir).
 */
export function grafikPenceresi(veri: GrafikVerisi, w: number, h: number): GrafikDuzeni {
  const d = { ...grafikDuzeni(veri) };
  if (veri.egriler.some((e) => e.tur === "denklem") && w > 0 && h > 0) {
    const orta = (a: number, b: number) => (a + b) / 2;
    const birimX = (d.xMax - d.xMin) / w;
    const birimY = (d.yMax - d.yMin) / h;
    if (birimY < birimX) {
      const yarim = (birimX * h) / 2;
      const m = orta(d.yMin, d.yMax);
      d.yMin = m - yarim; d.yMax = m + yarim;
    } else {
      const yarim = (birimY * w) / 2;
      const m = orta(d.xMin, d.xMax);
      d.xMin = m - yarim; d.xMax = m + yarim;
    }
  }
  return d;
}

/**
 * Grafik şeklinin kutusunda (dönüşsüz, şeklin yerel koordinatı) veri ↔ piksel dönüşümü —
 * `grafikCiz` ile birebir aynı hesap. Tuvalde nokta tutamaçları için: `noktaPikselleri(i)`
 * i. eğrinin (noktalar / adlı noktalar) köşelerinin pikselleri; sürüklerken `veriye(p)`.
 * Döndürülmüş şekilde fare noktası önce şeklin yerel koordinatına çevrilmelidir (sinirlar.ts noktaYerel).
 */
export function grafikPikselDonusumu(veri: GrafikVerisi, kutu: { x: number; y: number; w: number; h: number }) {
  const d = grafikPenceresi(veri, kutu.w, kutu.h);
  const px = (X: number) => kutu.x + ((X - d.xMin) / (d.xMax - d.xMin)) * kutu.w;
  const py = (Y: number) => kutu.y + kutu.h - ((Y - d.yMin) / (d.yMax - d.yMin)) * kutu.h;
  const veriye = (p: Nokta): Nokta => ({
    x: d.xMin + ((p.x - kutu.x) / kutu.w) * (d.xMax - d.xMin),
    y: d.yMin + ((kutu.y + kutu.h - p.y) / kutu.h) * (d.yMax - d.yMin),
  });
  const noktaPikselleri = (egriIndex: number): Nokta[] => {
    const e = veri.egriler[egriIndex];
    if (!e || (e.tur !== "noktalar" && e.tur !== "isaret")) return [];
    return e.noktalar.map((p) => ({ x: px(p.x), y: py(p.y) }));
  };
  return { pencere: d, px, py, veriye, noktaPikselleri };
}

/** Sürükleme başında otomatik pencereyi sabitler (nokta taşındıkça eksenler kaymasın). */
export function grafikPenceresiniSabitle(veri: GrafikVerisi): GrafikVerisi {
  const d = grafikDuzeni(veri);
  return { ...veri, xMin: veri.xMin ?? d.xMin, xMax: veri.xMax ?? d.xMax, yMin: veri.yMin ?? d.yMin, yMax: veri.yMax ?? d.yMax, xAdim: veri.xAdim ?? d.xAdim, yAdim: veri.yAdim ?? d.yAdim };
}

/**
 * `noktalar` / `isaret` eğrisinin bir köşesini taşır (saf: yeni veri döner; indeks geçersizse
 * AYNI nesne). Varsayılan olarak değer eksen adımının yarısına yakalanır (kılavuza oturur) ve
 * ±1 000 000 içine kıstırılır.
 */
export function grafikNoktaTasi(
  veri: GrafikVerisi, egriIndex: number, noktaIndex: number, yeniDeger: Nokta,
  secenek: { yakala?: boolean } = {},
): GrafikVerisi {
  const e = veri.egriler[egriIndex];
  if (!e || (e.tur !== "noktalar" && e.tur !== "isaret") || !e.noktalar[noktaIndex]) return veri;
  if (!Number.isFinite(yeniDeger.x) || !Number.isFinite(yeniDeger.y)) return veri;
  const d = grafikDuzeni(veri);
  const yakala = (v: number, adim: number) => {
    if (secenek.yakala === false || !(adim > 0)) return v;
    const a = adim / 2;
    return temizle(Math.round(v / a) * a);
  };
  const kis = (v: number) => Math.max(-HAREKET_SINIRI, Math.min(HAREKET_SINIRI, v));
  const x = kis(yakala(yeniDeger.x, d.xAdim));
  const y = kis(yakala(yeniDeger.y, d.yAdim));
  const noktalar = e.noktalar.map((p, i) => (i === noktaIndex ? { ...p, x, y } : p));
  return { ...veri, egriler: veri.egriler.map((eg, i) => (i === egriIndex ? ({ ...eg, noktalar } as GrafikEgrisi) : eg)) };
}

export function grafikCiz(ctx: CanvasRenderingContext2D, s: FizikSekli) {
  const veri = s.grafik && grafikVerisiGecerliMi(s.grafik) ? s.grafik : varsayilanGrafik();
  const sade = veri.sade === true;
  const { x, y, w, h } = s;
  const d = grafikPenceresi(veri, w, h);
  const px = (X: number) => x + ((X - d.xMin) / (d.xMax - d.xMin)) * w;
  const py = (Y: number) => y + h - ((Y - d.yMin) / (d.yMax - d.yMin)) * h;
  // Eksenler 0'dan geçer; 0 görünür aralıkta değilse kenara yaslanır.
  const eksenX = d.xMin <= 0 && d.xMax >= 0 ? 0 : d.xMin;
  const eksenY = d.yMin <= 0 && d.yMax >= 0 ? 0 : d.yMin;
  const ax = px(eksenX);
  const ay = py(eksenY);
  const kalin = Math.max(1.3, Math.min(2.2, s.kalinlik * 0.7));
  const sayiModu = veri.sayilar ?? "oto";

  // Kılavuz değerleri (eğrilerin köşe noktaları).
  const vurgular: { p: Nokta; renk: string }[] = [];
  for (const e of veri.egriler) {
    if (!e.kilavuz) continue;
    for (const p of egriVurguNoktalari(e)) vurgular.push({ p, renk: e.renk ?? MUREKKEP });
  }
  const kilavuzX = benzersiz(vurgular.map((v) => v.p.x).filter((v) => Math.abs(v - eksenX) > 1e-9 && v >= d.xMin - 1e-9 && v <= d.xMax + 1e-9));
  const kilavuzY = benzersiz(vurgular.map((v) => v.p.y).filter((v) => Math.abs(v - eksenY) > 1e-9 && v >= d.yMin - 1e-9 && v <= d.yMax + 1e-9));
  const xSayilari = sayiModu === "kilavuz" && kilavuzX.length ? kilavuzX : eksenSayilari(d.xMin, d.xMax, d.xAdim);
  const ySayilari = sayiModu === "kilavuz" && kilavuzY.length ? kilavuzY : eksenSayilari(d.yMin, d.yMax, d.yAdim);

  ctx.save();
  ctx.lineCap = "butt";
  ctx.lineJoin = "round";
  ctx.setLineDash([]);

  // 0) Eşitsizlik bölgeleri: en altta (ızgara ve eğriler üstüne biner)
  let bolgeSirasi = 0;
  for (const e of veri.egriler) if (e.tur === "bolge") bolgeCiz(ctx, e, d, { x, y, w, h }, s.kalinlik, bolgeSirasi++);

  // 1) Izgara
  if (veri.izgara) {
    ctx.strokeStyle = "#d3dae3";
    ctx.lineWidth = 0.8;
    for (const X of eksenSayilari(d.xMin, d.xMax, d.xAdim)) {
      ctx.beginPath(); ctx.moveTo(px(X), y); ctx.lineTo(px(X), y + h); ctx.stroke();
    }
    for (const Y of eksenSayilari(d.yMin, d.yMax, d.yAdim)) {
      ctx.beginPath(); ctx.moveTo(x, py(Y)); ctx.lineTo(x + w, py(Y)); ctx.stroke();
    }
  }

  // 2) Eğri altı alan ve eğriler (çizim alanına kırpılır)
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - 1, y - 1, w + 2, h + 2);
  ctx.clip();
  const taban = py(Math.min(Math.max(0, d.yMin), d.yMax));
  for (const e of veri.egriler) {
    if (!e.alan) continue;
    ctx.fillStyle = hexAlfa(e.renk ?? "#2563eb", 0.13);
    for (const parca of egriParcalari(e, d)) {
      if (parca.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(px(parca[0].x), taban);
      for (const p of parca) ctx.lineTo(px(p.x), py(p.y));
      ctx.lineTo(px(parca[parca.length - 1].x), taban);
      ctx.closePath();
      ctx.fill();
      taramaDoldur(ctx, e.renk ?? "#2563eb", { x, y, w, h }, 0);
    }
  }
  for (const e of veri.egriler) if (e.tur === "arasi") arasiCiz(ctx, e, d, px, py);
  for (const e of veri.egriler) {
    if (e.cizgisiz || e.tur === "arasi") continue;
    ctx.strokeStyle = e.renk ?? MUREKKEP;
    const desen = cizgiDeseniDegerleri(egriCizgiDeseni(e));
    ctx.lineWidth = Math.max(desen.kalinlik < 1 ? 1 : 1.6, (s.kalinlik + 0.4) * desen.kalinlik);
    ctx.lineCap = desen.dash.length && desen.dash[0] < 2 ? "round" : "butt";
    ctx.setLineDash(desen.dash);
    if (e.tur === "denklem") { denklemCiz(ctx, e, d, { x, y, w, h }); continue; }
    if (e.tur === "fonksiyon") {
      const yaz = fonksiyonOku(e.ifade);
      if (!("hata" in yaz) && yaz.tur === "dikey") {
        ctx.beginPath(); ctx.moveTo(px(yaz.x), y); ctx.lineTo(px(yaz.x), y + h); ctx.stroke();
      }
    }
    for (const parca of egriParcalari(e, d)) {
      if (parca.length < 2) continue;
      ctx.beginPath();
      parca.forEach((p, i) => (i === 0 ? ctx.moveTo(px(p.x), py(p.y)) : ctx.lineTo(px(p.x), py(p.y))));
      ctx.stroke();
    }
  }
  ctx.restore();
  ctx.setLineDash([]);
  ctx.lineCap = "butt";

  // 2b) Parçalı fonksiyonun uç daireleri (dolu = dahil, boş = dahil değil) ve adlı/işaretli noktalar
  for (const e of veri.egriler) {
    if (e.tur === "fonksiyon") {
      const yaz = fonksiyonOku(e.ifade);
      if ("hata" in yaz || yaz.tur !== "y") continue;
      const uclar: [number | undefined, string | undefined][] = [[e.baslangic, e.ucBas], [e.bitis, e.ucSon]];
      for (const [X, tur] of uclar) {
        if (X === undefined || !tur || tur === "yok" || X < d.xMin - 1e-9 || X > d.xMax + 1e-9) continue;
        const Y = yaz.f(X);
        if (!Number.isFinite(Y) || Y < d.yMin - 1e-9 || Y > d.yMax + 1e-9) continue;
        ctx.beginPath();
        ctx.arc(px(X), py(Y), 3.6, 0, Math.PI * 2);
        ctx.fillStyle = tur === "dolu" ? (e.renk ?? MUREKKEP) : "#ffffff";
        ctx.fill();
        ctx.strokeStyle = e.renk ?? MUREKKEP;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
    }
    const noktaListesi = e.tur === "isaret" ? e.noktalar : e.tur === "noktalar" && e.nokta ? e.noktalar : null;
    if (noktaListesi) {
      for (const q of noktaListesi) {
        if (q.x < d.xMin - 1e-9 || q.x > d.xMax + 1e-9 || q.y < d.yMin - 1e-9 || q.y > d.yMax + 1e-9) continue;
        ctx.beginPath();
        ctx.arc(px(q.x), py(q.y), e.tur === "isaret" ? 3.4 : 2.8, 0, Math.PI * 2);
        ctx.fillStyle = e.renk ?? MUREKKEP;
        ctx.fill();
        const ad = (q as { ad?: string }).ad?.trim() ?? "";
        if (ad && !sade) fizikMetniCiz(ctx, ad, px(q.x) + 6, py(q.y) - 10, 15, "sol", e.renk);
      }
    }
  }

  // 2c) Teğet değme noktası ve kesişim/kök noktaları
  const noktaIsaretle = (q: Nokta, renk: string, ad?: string) => {
    if (q.x < d.xMin - 1e-9 || q.x > d.xMax + 1e-9 || q.y < d.yMin - 1e-9 || q.y > d.yMax + 1e-9) return;
    ctx.beginPath();
    ctx.arc(px(q.x), py(q.y), 3.6, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = renk;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    if (ad && !sade) fizikMetniCiz(ctx, ad, px(q.x) + 6, py(q.y) - 10, 14, "sol", renk);
  };
  for (const e of veri.egriler) {
    if (e.tur !== "teget") continue;
    const t = tegetDogrusu(e);
    if (t) noktaIsaretle({ x: e.x0, y: t.y0 }, e.renk ?? MUREKKEP);
  }
  if (veri.kesisim) {
    for (const q of kesisimNoktalari(veri, d)) noktaIsaretle(q, MUREKKEP, `(${kesisimSayisi(q.x)}; ${kesisimSayisi(q.y)})`);
  }
  if (veri.tepe) {
    for (const q of ekstremumNoktalari(veri, d)) noktaIsaretle(q, MUREKKEP, `(${kesisimSayisi(q.x)}; ${kesisimSayisi(q.y)})`);
  }

  // 3) Kılavuz çizgileri ve işaretler
  if (!sade) {
    ctx.lineWidth = 1;
    for (const v of vurgular) {
      ctx.strokeStyle = "#64748b";
      ctx.setLineDash([4, 4]);
      if (Math.abs(v.p.x - eksenX) > 1e-9) {
        ctx.beginPath(); ctx.moveTo(px(v.p.x), py(v.p.y)); ctx.lineTo(px(v.p.x), ay); ctx.stroke();
      }
      if (Math.abs(v.p.y - eksenY) > 1e-9) {
        ctx.beginPath(); ctx.moveTo(px(v.p.x), py(v.p.y)); ctx.lineTo(ax, py(v.p.y)); ctx.stroke();
      }
    }
    ctx.setLineDash([]);
    for (const v of vurgular) {
      ctx.fillStyle = v.renk;
      ctx.beginPath();
      ctx.arc(px(v.p.x), py(v.p.y), 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 4) Eksenler
  ctx.strokeStyle = MUREKKEP;
  ctx.fillStyle = MUREKKEP;
  ctx.lineWidth = kalin;
  const ok = 12 + (kalin - 1.3) * 2;
  ctx.beginPath(); ctx.moveTo(ax, y + h); ctx.lineTo(ax, y - ok + 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, ay); ctx.lineTo(x + w + ok - 2, ay); ctx.stroke();
  okBasi(ctx, { x: ax, y: y - ok }, -Math.PI / 2, ok);
  okBasi(ctx, { x: x + w + ok, y: ay }, 0, ok);

  // 5) Çentikler ve sayılar
  if (!sade && sayiModu !== "yok") {
    const merkez0 = Math.abs(eksenX) < 1e-9 && Math.abs(eksenY) < 1e-9;
    ctx.lineWidth = 1.1;
    // Eğri o zamanda eksenin ALTINDAYSA (negatif hız/konum) sayı eksenin üstüne
    // yazılır; aksi halde sayı eğrinin ve kılavuzun üstünü örter (ders kitabındaki gibi).
    const altta = (X: number) =>
      sayiModu === "kilavuz" &&
      veri.egriler.some((e) =>
        egriParcalari(e, d).some((pr) =>
          pr.some((q, i) => {
            const o = pr[i - 1];
            if (!o) return Math.abs(q.x - X) < 1e-9 && q.y < eksenY - 1e-9;
            if (X < Math.min(o.x, q.x) - 1e-9 || X > Math.max(o.x, q.x) + 1e-9 || o.x === q.x) return false;
            return o.y + ((q.y - o.y) * (X - o.x)) / (q.x - o.x) < eksenY - 1e-9;
          }),
        ),
      );
    let sonX = -Infinity;
    for (const X of xSayilari) {
      if (merkez0 && Math.abs(X) < 1e-9) continue;
      if (Math.abs(X - eksenX) < 1e-9) continue;
      const cx = px(X);
      ctx.beginPath(); ctx.moveTo(cx, ay - 3); ctx.lineTo(cx, ay + 3); ctx.stroke();
      if (cx - sonX >= 20) {
        haleliYaz(ctx, veri.piEksen ? piYaz(X) : sayiYaz(X), Math.min(x + w + 8, Math.max(x - 8, cx)), altta(X) ? ay - 12 : ay + 14, "center");
        sonX = cx;
      }
    }
    let sonY = Infinity;
    for (const Y of [...ySayilari].sort((a, b) => b - a)) {
      if (merkez0 && Math.abs(Y) < 1e-9) continue;
      if (Math.abs(Y - eksenY) < 1e-9) continue;
      const cy = py(Y);
      ctx.beginPath(); ctx.moveTo(ax - 3, cy); ctx.lineTo(ax + 3, cy); ctx.stroke();
      if (sonY === Infinity || Math.abs(cy - sonY) >= 15) {
        haleliYaz(ctx, sayiYaz(Y), ax - 8, cy, "right");
        sonY = cy;
      }
    }
    if (merkez0) {
      // Eksenin hemen altında bir y değeri (ör. −2) varsa "0" üstte durur; yoksa o değerin yazısını silerdi.
      const yakin = ySayilari.some((Y) => Math.abs(Y) > 1e-9 && Math.abs(py(Y) - (ay + 13)) < 14);
      haleliYaz(ctx, "0", ax - 8, yakin ? ay - 12 : ay + 13, "right");
    }
  }

  // 6) Eksen adları ve eğri etiketleri
  if (!sade) {
    // Eksen adları payın içinde kalır (yan yana konan grafiğin "0" etiketine binmesin): sığmazsa küçülür/kesilir.
    const pay = grafikEtiketPayi(s);
    if (veri.yEtiket.trim()) fizikMetniCiz(ctx, veri.yEtiket.trim(), Math.max(x - pay.sol + 30, ax), y - ok - 11, 16, "orta", undefined, Math.max(40, w));
    if (veri.xEtiket.trim()) fizikMetniCiz(ctx, veri.xEtiket.trim(), x + w + ok + 8, ay, 16, "sol", undefined, Math.max(24, pay.sag - ok - 12));
    for (const e of veri.egriler) {
      const ad = e.etiket?.trim();
      if (!ad) continue;
      const parcalar = egriParcalari(e, d);
      const son = parcalar[parcalar.length - 1];
      if (!son?.length) continue;
      const u = son[son.length - 1];
      const tx = Math.min(x + w - 4, Math.max(x + 4, px(u.x))) + 4;
      fizikMetniCiz(ctx, ad, tx, Math.min(y + h - 6, Math.max(y + 8, py(u.y) - 12)), 15, "sol", e.renk);
    }
    const baslik = s.etiket?.trim();
    if (baslik) fizikMetniCiz(ctx, baslik, x + w / 2, y + h + 44, 16);
  }
  ctx.restore();
}

/**
 * Eşitsizlik bölgesi: ızgaradan örneklenip satır başına birleştirilmiş dikdörtgenlerle
 * boyanır; sınır eğrisi (f = 0) hücre kenarlarındaki işaret değişiminden (doğrusal
 * ara değerleme) çizilir. "<" ">" kesikli, "≤" "≥" düz sınır.
 */
/** y=f(x) eğrilerinin birbiriyle, x ekseniyle ve dikey doğrularla kesişim noktaları (pencere içinde). */
export function kesisimNoktalari(veri: GrafikVerisi, aralik: XAraligi): Nokta[] {
  type F = { f: (x: number) => number; a: number; b: number };
  const fler: F[] = [];
  const dikeyler: number[] = [];
  for (const e of veri.egriler) {
    if (e.tur !== "fonksiyon") continue;
    const yaz = fonksiyonOku(e.ifade);
    if ("hata" in yaz) continue;
    if (yaz.tur === "dikey") { dikeyler.push(yaz.x); continue; }
    fler.push({ f: yaz.f, a: Math.max(aralik.xMin, e.baslangic ?? -Infinity), b: Math.min(aralik.xMax, e.bitis ?? Infinity) });
  }
  const sonuc: Nokta[] = [];
  const ekle = (x: number, y: number) => {
    if (!Number.isFinite(x) || !Number.isFinite(y) || sonuc.length >= 30) return;
    if (sonuc.some((p) => Math.hypot(p.x - x, p.y - y) < 1e-4)) return;
    sonuc.push({ x: Math.round(x * 1e6) / 1e6, y: Math.round(y * 1e6) / 1e6 });
  };
  const kokBul = (h: (x: number) => number, a: number, b: number): number[] => {
    if (!(b > a)) return [];
    const N = 600;
    const kokler: number[] = [];
    let xo = a, vo = h(a);
    if (vo === 0) kokler.push(a);
    for (let i = 1; i <= N; i += 1) {
      const x = a + ((b - a) * i) / N;
      const v = h(x);
      if (Number.isFinite(vo) && Number.isFinite(v)) {
        if (v === 0) kokler.push(x);
        else if (vo * v < 0) {
          let lo = xo, hi = x, flo = vo;
          for (let k = 0; k < 60; k += 1) {
            const mid = (lo + hi) / 2;
            const fm = h(mid);
            if (flo * fm <= 0) hi = mid; else { lo = mid; flo = fm; }
          }
          const r = (lo + hi) / 2;
          // Asimptot (1/x gibi) işaret değiştirir ama kök değildir: değer küçük kalmalı.
          if (Math.abs(h(r)) < 1e-4 * (1 + Math.abs(vo) + Math.abs(v))) kokler.push(r);
        }
      }
      xo = x; vo = v;
    }
    // Üst üste biner eğriler (ya da y=0 doğrusunun kendi kökleri) "sonsuz kök" olur: işaretlenmez.
    if (kokler.length > N / 10) return [];
    return kokler;
  };
  for (const [i, p] of fler.entries()) {
    for (const x of kokBul(p.f, p.a, p.b)) ekle(x, 0);
    for (const dx of dikeyler) if (dx >= p.a && dx <= p.b) ekle(dx, p.f(dx));
    for (const q of fler.slice(i + 1)) {
      for (const x of kokBul((t) => p.f(t) - q.f(t), Math.max(p.a, q.a), Math.min(p.b, q.b))) ekle(x, p.f(x));
    }
  }
  return sonuc;
}

/**
 * y=f(x) eğrilerinin yerel uç noktaları (tepe / en küçük / en büyük) — pencere içinde.
 * Pencereyi örnekler, türevin işaret değiştirdiği yerde altın oran aramasıyla inceltir.
 * Asimptot sıçramaları (1/x, tan x) ve pencere kenarındaki monoton uçlar uç nokta sayılmaz.
 */
export function ekstremumNoktalari(veri: GrafikVerisi, aralik: XAraligi): Nokta[] {
  const sonuc: Nokta[] = [];
  for (const e of veri.egriler) {
    if (e.tur !== "fonksiyon") continue;
    const yaz = fonksiyonOku(e.ifade);
    if ("hata" in yaz || yaz.tur !== "y") continue;
    const f = yaz.f;
    const a = Math.max(aralik.xMin, e.baslangic ?? -Infinity);
    const b = Math.min(aralik.xMax, e.bitis ?? Infinity);
    if (!(b > a)) continue;
    const N = 600;
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i <= N; i += 1) { const x = a + ((b - a) * i) / N; xs.push(x); ys.push(f(x)); }
    const sicrama = (u: number, v: number) => u * v < 0 && Math.abs(u) > 8 && Math.abs(v) > 8;
    let oncekiYon = 0; // son anlamlı adımın yönü (+1 artış, −1 azalış); düz adımlar (eşit değerler) atlanır
    let oncekiBas = 0; // o adımın başlangıç indeksi
    for (let i = 1; i <= N; i += 1) {
      const [y0, y1] = [ys[i - 1], ys[i]];
      if (![y0, y1].every((v) => Number.isFinite(v) && Math.abs(v) < 1e6) || sicrama(y0, y1)) { oncekiYon = 0; continue; }
      const d = y1 - y0;
      const esik = 1e-12 * (1 + Math.abs(y1));
      if (Math.abs(d) <= esik) continue;
      const yon = d > 0 ? 1 : -1;
      if (oncekiYon !== 0 && yon !== oncekiYon) {
        const enBuyuk = oncekiYon > 0;
        let lo = xs[oncekiBas], hi = xs[i];
        const deger = (x: number) => (enBuyuk ? f(x) : -f(x));
        for (let k = 0; k < 80; k += 1) {
          const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
          if (deger(m1) < deger(m2)) lo = m1; else hi = m2;
        }
        const x = (lo + hi) / 2;
        const y = f(x);
        if (Number.isFinite(y) && Math.abs(y) <= 1e6) {
          const q = { x: Math.round(x * 1e6) / 1e6, y: Math.round(y * 1e6) / 1e6 };
          if (sonuc.length < 30 && !sonuc.some((p) => Math.hypot(p.x - q.x, p.y - q.y) < 1e-4)) sonuc.push(q);
        }
      }
      oncekiYon = yon;
      oncekiBas = i - 1;
    }
  }
  return sonuc;
}

const kesisimSayisi = (v: number) => String(Math.round(v * 100) / 100).replace(".", ",");

function denklemCiz(ctx: CanvasRenderingContext2D, e: Extract<GrafikEgrisi, { tur: "denklem" }>, d: GrafikDuzeni, kutu: { x: number; y: number; w: number; h: number }) {
  const yaz = denklemOku(e.ifade);
  if ("hata" in yaz) return;
  const H = 3;
  const nx = Math.max(1, Math.ceil(kutu.w / H));
  const ny = Math.max(1, Math.ceil(kutu.h / H));
  const cw = kutu.w / nx;
  const ch = kutu.h / ny;
  const v: number[][] = [];
  for (let j = 0; j <= ny; j += 1) {
    const satir: number[] = [];
    const Y = d.yMax - ((d.yMax - d.yMin) * j) / ny;
    for (let i = 0; i <= nx; i += 1) satir.push(yaz.f(d.xMin + ((d.xMax - d.xMin) * i) / nx, Y));
    v.push(satir);
  }
  ctx.beginPath();
  for (let j = 0; j < ny; j += 1) {
    for (let i = 0; i < nx; i += 1) {
      const a = v[j][i], b = v[j][i + 1], c = v[j + 1][i + 1], dd = v[j + 1][i];
      if (![a, b, c, dd].every(Number.isFinite)) continue;
      const x0 = kutu.x + i * cw, y0 = kutu.y + j * ch;
      const gecis: [number, number][] = [];
      const kes = (p: number, q: number) => p * q < 0 || (p === 0) !== (q === 0);
      if (kes(a, b)) gecis.push([x0 + (cw * a) / (a - b), y0]);
      if (kes(b, c)) gecis.push([x0 + cw, y0 + (ch * b) / (b - c)]);
      if (kes(dd, c)) gecis.push([x0 + (cw * dd) / (dd - c), y0 + ch]);
      if (kes(a, dd)) gecis.push([x0, y0 + (ch * a) / (a - dd)]);
      for (let k = 0; k + 1 < gecis.length; k += 2) {
        ctx.moveTo(gecis[k][0], gecis[k][1]);
        ctx.lineTo(gecis[k + 1][0], gecis[k + 1][1]);
      }
    }
  }
  ctx.stroke();
}

/** İki eğri arası alan: üst ve alt eğriler ortak aralıkta örneklenir, kesintisiz dilimler doldurulur. */
function arasiCiz(ctx: CanvasRenderingContext2D, e: Extract<GrafikEgrisi, { tur: "arasi" }>, d: GrafikDuzeni, px: (X: number) => number, py: (Y: number) => number) {
  const f = fonksiyonOku(e.ifade);
  const g = e.ifade2.trim() ? fonksiyonOku(e.ifade2) : null;
  if ("hata" in f || f.tur !== "y" || (g && ("hata" in g || g.tur !== "y"))) return;
  const gf = g && !("hata" in g) && g.tur === "y" ? g.f : () => 0;
  const a = Math.max(d.xMin, e.baslangic ?? -Infinity);
  const b = Math.min(d.xMax, e.bitis ?? Infinity);
  if (!(b > a)) return;
  const N = 300;
  ctx.fillStyle = hexAlfa(e.renk ?? "#2563eb", 0.14);
  let ust: Nokta[] = [], alt: Nokta[] = [];
  const doldur = () => {
    if (ust.length >= 2) {
      ctx.beginPath();
      ust.forEach((p, i) => (i === 0 ? ctx.moveTo(px(p.x), py(p.y)) : ctx.lineTo(px(p.x), py(p.y))));
      for (let i = alt.length - 1; i >= 0; i -= 1) ctx.lineTo(px(alt[i].x), py(alt[i].y));
      ctx.closePath();
      ctx.fill();
      taramaDoldur(ctx, e.renk ?? "#2563eb", { x: px(d.xMin), y: py(d.yMax), w: px(d.xMax) - px(d.xMin), h: py(d.yMin) - py(d.yMax) }, 0);
    }
    ust = []; alt = [];
  };
  for (let i = 0; i <= N; i += 1) {
    const x = a + ((b - a) * i) / N;
    const y1 = f.f(x), y2 = gf(x);
    if (!Number.isFinite(y1) || !Number.isFinite(y2)) { doldur(); continue; }
    ust.push({ x, y: Math.max(-1e6, Math.min(1e6, y1)) });
    alt.push({ x, y: Math.max(-1e6, Math.min(1e6, y2)) });
  }
  doldur();
}

function bolgeCiz(
  ctx: CanvasRenderingContext2D,
  e: Extract<GrafikEgrisi, { tur: "bolge" }>,
  d: GrafikDuzeni,
  kutu: { x: number; y: number; w: number; h: number },
  kalinlik: number,
  tarama = 0,
) {
  const yaz = esitsizlikOku(e.ifade);
  if ("hata" in yaz) return;
  const H = 3;
  const nx = Math.max(1, Math.ceil(kutu.w / H));
  const ny = Math.max(1, Math.ceil(kutu.h / H));
  const cw = kutu.w / nx;
  const ch = kutu.h / ny;
  const X = (i: number) => d.xMin + ((d.xMax - d.xMin) * i) / nx;
  const Y = (j: number) => d.yMax - ((d.yMax - d.yMin) * j) / ny;
  const v: number[][] = [];
  for (let j = 0; j <= ny; j += 1) {
    const satir: number[] = [];
    for (let i = 0; i <= nx; i += 1) satir.push(yaz.f(X(i), Y(j)));
    v.push(satir);
  }
  const renk = e.renk ?? "#2563eb";
  ctx.save();
  // Tek yol + tek dolgu: komşu dikdörtgenler arasında dikiş çıkmaz, iki bölge üst üste
  // bindiğinde kesişim doğal olarak koyulaşır.
  ctx.fillStyle = hexAlfa(renk, 0.1);
  ctx.beginPath();
  for (let j = 0; j < ny; j += 1) {
    let bas = -1;
    for (let i = 0; i <= nx; i += 1) {
      const ic = i < nx && Number.isFinite(v[j][i]) && Number.isFinite(v[j + 1][i + 1]) && yaz.yon * (v[j][i] + v[j + 1][i + 1]) > 0;
      if (ic && bas < 0) bas = i;
      if (!ic && bas >= 0) {
        ctx.rect(kutu.x + bas * cw, kutu.y + j * ch, (i - bas) * cw, ch);
        bas = -1;
      }
    }
  }
  ctx.fill();
  // Eğik çizgi taraması: siyah-beyaz baskıda da bölge belli olsun. Çizim yolu hâlâ
  // yukarıdaki dikdörtgenlerdir; kırpma onunla yapılır.
  taramaDoldur(ctx, renk, kutu, tarama);
  ctx.strokeStyle = renk;
  ctx.lineWidth = Math.max(1.6, kalinlik + 0.4);
  ctx.setLineDash(yaz.sinir === "kesik" ? [7, 5] : []);
  ctx.beginPath();
  for (let j = 0; j < ny; j += 1) {
    for (let i = 0; i < nx; i += 1) {
      const a = v[j][i], b = v[j][i + 1], c = v[j + 1][i + 1], dd = v[j + 1][i];
      if (![a, b, c, dd].every(Number.isFinite)) continue;
      const x0 = kutu.x + i * cw, y0 = kutu.y + j * ch;
      const gecis: [number, number][] = [];
      const kes = (p: number, q: number) => p * q < 0 || (p === 0) !== (q === 0);
      if (kes(a, b)) gecis.push([x0 + (cw * a) / (a - b), y0]);
      if (kes(b, c)) gecis.push([x0 + cw, y0 + (ch * b) / (b - c)]);
      if (kes(dd, c)) gecis.push([x0 + (cw * dd) / (dd - c), y0 + ch]);
      if (kes(a, dd)) gecis.push([x0, y0 + (ch * a) / (a - dd)]);
      for (let k = 0; k + 1 < gecis.length; k += 2) {
        ctx.moveTo(gecis[k][0], gecis[k][1]);
        ctx.lineTo(gecis[k + 1][0], gecis[k + 1][1]);
      }
    }
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * Şu an kurulu yolun içini eğik çizgilerle tarar (yol kırpma olarak kullanılır;
 * çağıran yolu `fill()` ile doldurmuş olabilir, yol korunur). Siyah-beyaz baskıda
 * açık renk dolgu kaybolur; çizgi taraması her baskıda görünür.
 * `yon`: çift = "/", tek = "\\" (üst üste binen bölgeler farklı yönde taranır).
 */
export function taramaDoldur(ctx: CanvasRenderingContext2D, renk: string, kutu: { x: number; y: number; w: number; h: number }, yon: number) {
  if (!(kutu.w > 0) || !(kutu.h > 0)) return;
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = hexAlfa(renk, 0.78);
  ctx.lineWidth = 0.9;
  ctx.setLineDash([]);
  ctx.lineCap = "butt";
  const aralik = 5.5;
  const boy = kutu.w + kutu.h;
  ctx.beginPath();
  const egim = yon % 2 === 0 ? 1 : -1;
  for (let t = 0; t <= boy; t += aralik) {
    if (egim > 0) {
      ctx.moveTo(kutu.x + t, kutu.y + kutu.h);
      ctx.lineTo(kutu.x + t - kutu.h, kutu.y);
    } else {
      ctx.moveTo(kutu.x + kutu.w - t, kutu.y + kutu.h);
      ctx.lineTo(kutu.x + kutu.w - t + kutu.h, kutu.y);
    }
  }
  ctx.stroke();
  ctx.restore();
}

function hexAlfa(hex: string, a: number) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return `rgba(29,78,216,${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
