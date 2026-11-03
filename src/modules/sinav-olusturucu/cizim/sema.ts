// Matematik şemaları: Venn (2–3 küme), olasılık ağacı, sayı doğrusu (aralıklı).
//
// Hepsi tek şekil (kutu = çizim alanı) ve veriyle tanımlı: bölge değerleri,
// dal olasılıkları, aralık uçları panelden yazılır. Çizim saf geometri — Venn
// bölgesi boyama, bölgenin kümelere üyeliğini ızgaradan örnekleyerek buluyor
// (kesişim/fark için tek tek kırpma yolu kurmak yerine; hata payı 2 piksel).

import type { AgacDali, SemaVerisi, Sekil } from "./tipler";
import { MUREKKEP } from "./sabitler";
import { fizikMetniCiz } from "./fizik";
import { sayiYaz } from "./grafik";

type FizikSekli = Extract<Sekil, { tur: "fizik" }>;

// ── Sınırlar ───────────────────────────────────────────────────────────────

/** Sayı doğrusunda kabul edilen en büyük mutlak değer (1e21 gibi girdiler çerçeveyi taşırmasın). */
export const SAYI_DOGRUSU_SINIRI = 1e9;
export const EN_COK_DAL_ADI = 40;
export const EN_COK_OLASILIK = 20;
export const EN_COK_SEMA_BASLIK = 80;
export const EN_COK_SEMA_AD = 40;

// ── Venn ───────────────────────────────────────────────────────────────────

/** Bölge adları: panelde değer kutularını etiketlemek için (veri dizisiyle aynı sıra). */
export function vennBolgeAdlari(kume: number, adlar: string[]): string[] {
  const [a, b, c] = [adlar[0] || "A", adlar[1] || "B", adlar[2] || "C"];
  return kume === 3
    ? [`Yalnız ${a}`, `Yalnız ${b}`, `Yalnız ${c}`, `${a}∩${b} (C hariç)`, `${a}∩${c} (B hariç)`, `${b}∩${c} (A hariç)`, `${a}∩${b}∩${c}`, "Hiçbiri (dışı)"]
    : [`Yalnız ${a}`, `${a}∩${b}`, `Yalnız ${b}`, "Hiçbiri (dışı)"];
}

type Daire = { x: number; y: number; r: number };

/** Kümelerin daireleri: kutunun içine sığacak biçimde. */
export function vennDaireleri(kume: number, k: { x: number; y: number; w: number; h: number }): Daire[] {
  const cx = k.x + k.w / 2;
  if (kume === 3) {
    const r = Math.min(k.w * 0.25, k.h * 0.27);
    const d = r * 0.95;
    const cy = k.y + k.h * 0.5 + r * 0.2;
    return [
      { x: cx - d * 0.62, y: cy - d * 0.5, r },
      { x: cx + d * 0.62, y: cy - d * 0.5, r },
      { x: cx, y: cy + d * 0.58, r },
    ];
  }
  const r = Math.min(k.h * 0.36, k.w * 0.27);
  const cy = k.y + k.h * 0.5;
  return [{ x: cx - r * 0.62, y: cy, r }, { x: cx + r * 0.62, y: cy, r }];
}

/** Bir noktanın hangi bölgede olduğu (veri dizisi indeksi) ya da -1. */
export function vennBolgesi(kume: number, daireler: Daire[], px: number, py: number): number {
  const ic = daireler.map((d) => (px - d.x) ** 2 + (py - d.y) ** 2 <= d.r ** 2);
  if (kume === 2) {
    if (ic[0] && !ic[1]) return 0;
    if (ic[0] && ic[1]) return 1;
    if (!ic[0] && ic[1]) return 2;
    return 3;
  }
  const [a, b, c] = ic;
  if (a && !b && !c) return 0;
  if (!a && b && !c) return 1;
  if (!a && !b && c) return 2;
  if (a && b && !c) return 3;
  if (a && !b && c) return 4;
  if (!a && b && c) return 5;
  if (a && b && c) return 6;
  return 7;
}

/** Bölge yazısının yeri (daire geometrisinden). */
function bolgeYeri(kume: number, daireler: Daire[], i: number, k: { x: number; y: number; w: number; h: number }): { x: number; y: number } {
  if (kume === 2) {
    const [A, B] = daireler;
    const r = A.r;
    return [{ x: A.x - r * 0.5, y: A.y }, { x: (A.x + B.x) / 2, y: A.y }, { x: B.x + r * 0.5, y: B.y }, { x: k.x + k.w - 14, y: k.y + k.h - 14 }][i];
  }
  const [A, B, C] = daireler;
  const g = { x: (A.x + B.x + C.x) / 3, y: (A.y + B.y + C.y) / 3 };
  const dis = (d: Daire, t: number) => {
    const vx = d.x - g.x, vy = d.y - g.y, n = Math.hypot(vx, vy) || 1;
    return { x: d.x + (vx / n) * d.r * t, y: d.y + (vy / n) * d.r * t };
  };
  const orta = (p: Daire, q: Daire, uzak: Daire) => {
    const m = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
    const vx = m.x - uzak.x, vy = m.y - uzak.y, n = Math.hypot(vx, vy) || 1;
    return { x: m.x + (vx / n) * A.r * 0.38, y: m.y + (vy / n) * A.r * 0.38 };
  };
  return [dis(A, 0.55), dis(B, 0.55), dis(C, 0.55), orta(A, B, C), orta(A, C, B), orta(B, C, A), g, { x: k.x + k.w - 14, y: k.y + k.h - 14 }][i];
}

// ── Olasılık ağacı ─────────────────────────────────────────────────────────

/** Yaprak sayısı (alt dalı olmayan dal = 1 yaprak). */
export function agacYaprakSayisi(dallar: AgacDali[]): number {
  return dallar.reduce((t, d) => t + Math.max(1, d.alt?.length ?? 0), 0);
}

// ── Yazımdan okuma ─────────────────────────────────────────────────────────

type Aralik = { bas: number | null; son: number | null; basDahil: boolean; sonDahil: boolean };

/** "(-2, 3]; [5, ∞)" → aralıklar. ∞ / inf / boş = sınırsız uç (açık). */
export function araliklariOku(metin: string): Aralik[] | null {
  const parcalar = metin.split(/;|\n/).map((p) => p.trim()).filter(Boolean);
  if (parcalar.length > 6) return null;
  const sonuc: Aralik[] = [];
  const uc = (t: string): number | null | undefined => {
    const x = t.trim().replace(/\u2212/g, "-").replace(",", ".");
    if (x === "" || /^[+-]?(∞|inf|sonsuz)$/i.test(x)) return null;
    const n = Number(x);
    return Number.isFinite(n) && Math.abs(n) <= SAYI_DOGRUSU_SINIRI ? n : undefined;
  };
  for (const p of parcalar) {
    const m = /^([\[(\]])\s*([^;]*?)\s*[;,]\s*([^;]*?)\s*([\])\[])$/.exec(p);
    if (!m) return null;
    const bas = uc(m[2]);
    const son = uc(m[3]);
    if (bas === undefined || son === undefined) return null;
    if (bas !== null && son !== null && bas > son) return null;
    sonuc.push({ bas, son, basDahil: m[1] === "[" && bas !== null, sonDahil: m[4] === "]" && son !== null });
  }
  return sonuc;
}

export function araliklariYaz(a: Aralik[]): string {
  const f = (x: number | null, bas: boolean) => (x === null ? (bas ? "-∞" : "∞") : String(x));
  return a.map((r) => `${r.basDahil ? "[" : "("}${f(r.bas, true)}, ${f(r.son, false)}${r.sonDahil ? "]" : ")"}`).join("; ");
}

/** "3; -1:A; 4:B:bos" → noktalar (x[:ad[:bos]]). */
export function sayiNoktalariniOku(metin: string): { x: number; ad?: string; dolu?: boolean }[] | null {
  const parcalar = metin.split(/;|\n/).map((p) => p.trim()).filter(Boolean);
  if (parcalar.length > 20) return null;
  const sonuc: { x: number; ad?: string; dolu?: boolean }[] = [];
  for (const p of parcalar) {
    const [xs, ad, tur] = p.split(":").map((t) => t.trim());
    const x = Number((xs ?? "").replace(",", ".").replace("\u2212", "-"));
    if (!(xs ?? "").length || !Number.isFinite(x) || Math.abs(x) > SAYI_DOGRUSU_SINIRI) return null;
    sonuc.push({ x, ...(ad ? { ad } : {}), ...(tur && /^(bos|boş|a[cç][ıi]k)$/i.test(tur) ? { dolu: false } : {}) });
  }
  return sonuc;
}

export function sayiNoktalariniYaz(n: { x: number; ad?: string; dolu?: boolean }[]): string {
  return n.map((p) => [p.x, p.ad ?? "", p.dolu === false ? "bos" : ""].join(":").replace(/:+$/, "")).join("; ");
}

/**
 * Olasılık ağacı yazımı — her satır bir dal: "K: 1/3"; alt dal "- K: 1/2" (tire ya da girinti).
 * Okunamazsa null (alt dal ana daldan önce gelemez, en çok 2 düzey). Ad en çok 40, olasılık en çok
 * 20 karakter: uzun metin KESİLİR (şekil geçersiz sayılıp başka bir şekle dönüşmesin); bkz. agacUyarisi.
 */
export function agacOku(metin: string): AgacDali[] | null {
  const r = agacOkuAyrinti(metin);
  return "dallar" in r ? r.dallar : null;
}

/** Okuma sonucu: dallar (+ kesilen metin varsa uyarı) ya da okunamama NEDENİ. */
export function agacOkuAyrinti(metin: string): { dallar: AgacDali[]; uyari?: string } | { hata: string } {
  const satirlar = metin.split(/\r?\n/).filter((s) => s.trim());
  if (!satirlar.length) return { hata: "En az bir dal yazın: K: 1/2" };
  const dallar: AgacDali[] = [];
  let uzunAd = false, uzunOlasilik = false;
  for (const [i, sat] of satirlar.entries()) {
    const m = /^(\s*-*\s*)([^:]+?)\s*:\s*(.*?)\s*$/.exec(sat);
    if (!m) return { hata: `Dal okunamadı: ${i + 1}. satır ("ad: olasılık" yazın)` };
    const alt = /-/.test(m[1]) || m[1].length >= 2;
    let ad = m[2].trim();
    let olasilik = m[3];
    if (ad.length > EN_COK_DAL_ADI) { ad = ad.slice(0, EN_COK_DAL_ADI); uzunAd = true; }
    if (olasilik.length > EN_COK_OLASILIK) { olasilik = olasilik.slice(0, EN_COK_OLASILIK); uzunOlasilik = true; }
    const dal: AgacDali = { ad, olasilik };
    if (alt) {
      const ust = dallar[dallar.length - 1];
      if (!ust) return { hata: "Alt dal (- ile başlayan) bir ana daldan sonra gelmeli" };
      ust.alt = [...(ust.alt ?? []), dal];
    } else dallar.push(dal);
  }
  if (dallar.length > 6) return { hata: "En çok 6 ana dal" };
  if (dallar.some((d) => (d.alt?.length ?? 0) > 6)) return { hata: "Bir dalın en çok 6 alt dalı olabilir" };
  const uyarilar = [uzunAd ? `Dal adı en çok ${EN_COK_DAL_ADI} karakter` : "", uzunOlasilik ? `Olasılık en çok ${EN_COK_OLASILIK} karakter` : ""].filter(Boolean);
  return { dallar, ...(uyarilar.length ? { uyari: `${uyarilar.join("; ")} (fazlası kesildi)` } : {}) };
}

export function agacYaz(dallar: AgacDali[]): string {
  return dallar.flatMap((d) => [`${d.ad}: ${d.olasilik}`, ...(d.alt ?? []).map((a) => `- ${a.ad}: ${a.olasilik}`)]).join("\n");
}

// ── Doğrulama ──────────────────────────────────────────────────────────────

const sayi = (v: unknown) => typeof v === "number" && Number.isFinite(v);

function dalGecerli(d: unknown, derinlik: number): boolean {
  if (!d || typeof d !== "object") return false;
  const x = d as AgacDali;
  if (typeof x.ad !== "string" || typeof x.olasilik !== "string" || x.ad.length > 40 || x.olasilik.length > 20) return false;
  if (x.alt === undefined) return true;
  return derinlik < 2 && Array.isArray(x.alt) && x.alt.length <= 6 && x.alt.every((a) => dalGecerli(a, derinlik + 1));
}

export function semaVerisiGecerliMi(v: unknown): v is SemaVerisi {
  if (!v || typeof v !== "object") return false;
  const g = v as Record<string, unknown>;
  if (g.baslik !== undefined && typeof g.baslik !== "string") return false;
  if (g.tur === "venn") {
    return (g.kume === 2 || g.kume === 3) && Array.isArray(g.adlar) && g.adlar.length <= 3 && g.adlar.every((a) => typeof a === "string") &&
      Array.isArray(g.bolgeler) && g.bolgeler.length <= 8 && g.bolgeler.every((a) => typeof a === "string") && typeof g.evrensel === "boolean" &&
      (g.boyali === undefined || (Array.isArray(g.boyali) && g.boyali.every((i) => Number.isInteger(i))));
  }
  if (g.tur === "agac") return Array.isArray(g.dallar) && g.dallar.length >= 1 && g.dallar.length <= 6 && g.dallar.every((d) => dalGecerli(d, 1));
  if (g.tur === "sayiDogrusu") {
    return sayi(g.min) && sayi(g.max) && sayi(g.adim) && (g.max as number) > (g.min as number) && (g.adim as number) > 0 &&
      Array.isArray(g.araliklar) && g.araliklar.length <= 6 &&
      g.araliklar.every((a) => !!a && ((a as { bas: unknown }).bas === null || sayi((a as { bas: unknown }).bas)) && ((a as { son: unknown }).son === null || sayi((a as { son: unknown }).son))) &&
      Array.isArray(g.noktalar) && g.noktalar.length <= 20 && g.noktalar.every((n) => !!n && sayi((n as { x: unknown }).x));
  }
  return false;
}

// ── Varsayılanlar / şablonlar ──────────────────────────────────────────────

export type SemaSablonu = { id: string; ad: string; ipucu: string; olustur: () => SemaVerisi };

export const SEMA_SABLONLARI: SemaSablonu[] = [
  { id: "venn2", ad: "Venn (2 küme)", ipucu: "İki küme; bölge değerleri yazılır, bölgeler boyanabilir", olustur: () => ({ tur: "venn", kume: 2, adlar: ["A", "B"], bolgeler: ["5", "3", "4", "2"], evrensel: true, evrenselAd: "E" }) },
  { id: "venn3", ad: "Venn (3 küme)", ipucu: "Üç küme", olustur: () => ({ tur: "venn", kume: 3, adlar: ["A", "B", "C"], bolgeler: ["4", "5", "3", "2", "1", "2", "1", "3"], evrensel: true, evrenselAd: "E" }) },
  { id: "venn-boyali", ad: "Venn (A\\B boyalı)", ipucu: "Fark kümesi boyalı örnek", olustur: () => ({ tur: "venn", kume: 2, adlar: ["A", "B"], bolgeler: ["", "", "", ""], evrensel: true, evrenselAd: "E", boyali: [0] }) },
  {
    id: "agac", ad: "Olasılık ağacı", ipucu: "İki aşamalı ağaç; dal olasılıkları yazılır",
    olustur: () => ({
      tur: "agac",
      dallar: [
        { ad: "K", olasilik: "1/3", alt: [{ ad: "K", olasilik: "1/2" }, { ad: "M", olasilik: "1/2" }] },
        { ad: "M", olasilik: "2/3", alt: [{ ad: "K", olasilik: "1/2" }, { ad: "M", olasilik: "1/2" }] },
      ],
    }),
  },
  {
    id: "sayi", ad: "Sayı doğrusu", ipucu: "Aralık: açık/kapalı uçlar; nokta işaretleme",
    olustur: () => ({
      tur: "sayiDogrusu", min: -5, max: 6, adim: 1,
      araliklar: [{ bas: -2, son: 3, basDahil: false, sonDahil: true }],
      noktalar: [],
    }),
  },
];

export const varsayilanSema = (): SemaVerisi => SEMA_SABLONLARI[0].olustur();

// ── Çizim ──────────────────────────────────────────────────────────────────

/** Şeklin kutu dışına taşan yazı payı. */
export function semaPayi() {
  return { sol: 20, ust: 34, sag: 20, alt: 30 };
}

export function semaCiz(ctx: CanvasRenderingContext2D, s: FizikSekli) {
  const v = s.sema && semaVerisiGecerliMi(s.sema) ? s.sema : varsayilanSema();
  const k = { x: s.x, y: s.y, w: s.w, h: s.h };
  ctx.save();
  ctx.strokeStyle = MUREKKEP;
  ctx.fillStyle = MUREKKEP;
  ctx.lineWidth = Math.max(1.4, Math.min(2.2, s.kalinlik * 0.8));
  ctx.lineJoin = "round";
  ctx.setLineDash([]);
  if (v.tur === "venn") vennCiz(ctx, v, k);
  else if (v.tur === "agac") agacCiz(ctx, v, k);
  else sayiDogrusuCiz(ctx, v, k);
  if (v.baslik?.trim()) fizikMetniCiz(ctx, v.baslik.trim(), k.x + k.w / 2, k.y - 18, 17, "orta", undefined, k.w + 40);
  ctx.restore();
}

type Kutu = { x: number; y: number; w: number; h: number };

function vennCiz(ctx: CanvasRenderingContext2D, v: Extract<SemaVerisi, { tur: "venn" }>, k: Kutu) {
  const daireler = vennDaireleri(v.kume, k);
  const boyali = new Set(v.boyali ?? []);
  // Boyalı bölgeler: ızgaradan örnekle, tek yolda doldur (dikiş yok)
  if (boyali.size) {
    const H = 2;
    ctx.fillStyle = "rgba(100,116,139,0.38)";
    ctx.beginPath();
    for (let j = 0; j * H < k.h; j += 1) {
      let bas = -1;
      const py = k.y + j * H + H / 2;
      const nx = Math.ceil(k.w / H);
      for (let i = 0; i <= nx; i += 1) {
        const px = k.x + i * H + H / 2;
        const ic = i < nx && boyali.has(vennBolgesi(v.kume, daireler, px, py)) && (v.evrensel || vennBolgesi(v.kume, daireler, px, py) !== (v.kume === 2 ? 3 : 7));
        if (ic && bas < 0) bas = i;
        if (!ic && bas >= 0) { ctx.rect(k.x + bas * H, k.y + j * H, (i - bas) * H, H); bas = -1; }
      }
    }
    ctx.fill();
  }
  ctx.strokeStyle = MUREKKEP;
  if (v.evrensel) {
    ctx.lineWidth = 1.8;
    ctx.strokeRect(k.x, k.y, k.w, k.h);
    if (v.evrenselAd?.trim()) fizikMetniCiz(ctx, v.evrenselAd.trim(), k.x + 14, k.y + 14, 17, "sol", undefined, k.w * 0.3);
  }
  ctx.lineWidth = 2;
  for (const d of daireler) { ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.stroke(); }
  // Küme adları
  const adlar = v.adlar;
  daireler.forEach((d, i) => {
    const ad = (adlar[i] ?? "").trim();
    if (!ad) return;
    const ust = v.kume === 3 && i === 2 ? false : true;
    const dx = i === 0 ? -d.r * 0.75 : i === 1 ? d.r * 0.75 : 0;
    fizikMetniCiz(ctx, ad, d.x + dx, ust ? d.y - d.r - 12 : d.y + d.r + 14, 17, "orta", undefined, Math.max(40, d.r * 1.6));
  });
  // Bölge değerleri
  v.bolgeler.forEach((metin, i) => {
    if (!metin?.trim()) return;
    if (i === (v.kume === 2 ? 3 : 7) && !v.evrensel) return;
    const p = bolgeYeri(v.kume, daireler, i, k);
    fizikMetniCiz(ctx, metin.trim(), p.x, p.y, 16, "orta", undefined, Math.max(30, daireler[0].r * 0.9));
  });
}

function agacCiz(ctx: CanvasRenderingContext2D, v: Extract<SemaVerisi, { tur: "agac" }>, k: Kutu) {
  const iki = v.dallar.some((d) => d.alt?.length);
  const yaprak = agacYaprakSayisi(v.dallar);
  const satirH = k.h / Math.max(1, yaprak);
  const x0 = k.x + 8;
  const x1 = k.x + k.w * (iki ? 0.42 : 0.72);
  const x2 = k.x + k.w * 0.82;
  const y0 = k.y + k.h / 2;
  ctx.lineWidth = 1.8;
  ctx.fillStyle = MUREKKEP;
  ctx.beginPath(); ctx.arc(x0, y0, 3.4, 0, Math.PI * 2); ctx.fill();
  let sira = 0;
  for (const d of v.dallar) {
    const n = Math.max(1, d.alt?.length ?? 0);
    const y1 = k.y + satirH * (sira + n / 2);
    ctx.strokeStyle = MUREKKEP;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    // Olasılık: çizginin ortasında, çizginin üst/alt tarafına
    const yukari = y1 < y0 - 1;
    fizikMetniCiz(ctx, d.olasilik, (x0 + x1) / 2 + (yukari ? -6 : 6), (y0 + y1) / 2 + (yukari ? -11 : 11), 15, "orta", undefined, Math.max(30, x1 - x0));
    ctx.beginPath(); ctx.arc(x1, y1, 3, 0, Math.PI * 2); ctx.fill();
    if (d.alt?.length) {
      fizikMetniCiz(ctx, d.ad, x1 - 2, y1 - 14, 16, "sag", undefined, Math.max(30, x1 - x0));
      d.alt.forEach((a, j) => {
        const y2 = k.y + satirH * (sira + j + 0.5);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        const yu = y2 < y1 - 1;
        const dikey = Math.abs(y2 - y1) < 1;
        fizikMetniCiz(ctx, a.olasilik, (x1 + x2) / 2, (y1 + y2) / 2 + (dikey ? -12 : yu ? -11 : 11), 15, "orta", undefined, Math.max(30, x2 - x1));
        ctx.beginPath(); ctx.arc(x2, y2, 3, 0, Math.PI * 2); ctx.fill();
        fizikMetniCiz(ctx, `${d.ad}${a.ad}`.replace(/\s+/g, ""), x2 + 10, y2, 16, "sol", undefined, Math.max(40, k.x + k.w - x2 + 20));
      });
    } else {
      fizikMetniCiz(ctx, d.ad, x1 + 10, y1, 16, "sol", undefined, Math.max(40, k.x + k.w - x1 + 20));
    }
    sira += n;
  }
}

/** Verilen alt sınırdan küçük olmayan en küçük 1-2-5 adımı. */
function yukariGuzelAdim(enAz: number): number {
  if (!(enAz > 0) || !Number.isFinite(enAz)) return 1;
  const us = 10 ** Math.floor(Math.log10(enAz));
  for (const c of [1, 2, 5, 10]) if (c * us >= enAz * (1 - 1e-9)) return c * us;
  return 10 * us;
}

function sayiDogrusuCiz(ctx: CanvasRenderingContext2D, v: Extract<SemaVerisi, { tur: "sayiDogrusu" }>, k: Kutu) {
  const y = k.y + k.h * 0.5;
  const sol = k.x + 6, sag = k.x + k.w - 6;
  const x0 = sol + 18, x1 = sag - 18; // çerçevenin içinde kalan çizim aralığı
  const aralik = v.max - v.min;
  const X = (d: number) => x0 + ((d - v.min) / aralik) * (x1 - x0);
  const Xk = (d: number) => Math.min(x1, Math.max(x0, X(d))); // çerçeveye kırpılmış
  ctx.strokeStyle = MUREKKEP;
  ctx.fillStyle = MUREKKEP;
  ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(sol + 6, y); ctx.lineTo(sag - 6, y); ctx.stroke();
  for (const [ux, yon] of [[sol, -1], [sag, 1]] as [number, number][]) {
    ctx.beginPath(); ctx.moveTo(ux, y); ctx.lineTo(ux - yon * 12, y - 5); ctx.lineTo(ux - yon * 12, y + 5); ctx.closePath(); ctx.fill();
  }
  // Çentik ve sayılar: etiketler birbirine binmesin diye adım gerekirse büyütülür (seyreltme)
  ctx.lineWidth = 1.2;
  const uzunEtiket = Math.max(Math.abs(v.min), Math.abs(v.max)) >= 1e5;
  const enAzAdim = (aralik * (uzunEtiket ? 84 : 40)) / (x1 - x0);
  const adim = v.adim >= enAzAdim ? v.adim : yukariGuzelAdim(enAzAdim);
  const bas = Math.ceil(v.min / adim - 1e-9);
  const son = Math.floor(v.max / adim + 1e-9);
  for (let i = bas; i <= son && i - bas < 80; i += 1) {
    const d = Math.round(i * adim * 1e9) / 1e9;
    ctx.beginPath(); ctx.moveTo(X(d), y - 5); ctx.lineTo(X(d), y + 5); ctx.stroke();
    fizikMetniCiz(ctx, sayiYaz(d), X(d), y + 20, 15);
  }
  // Aralıklar: kalın çizgi + uç daireleri (dahil → dolu, değil → boş); sonsuz uç ok.
  // Çerçevenin dışındaki uç kırpılır (daire çizilmez, çizgi kenara kadar uzanır).
  const rVar = 4.6;
  for (const a of v.araliklar) {
    if ((a.bas !== null && a.bas > v.max) || (a.son !== null && a.son < v.min)) continue; // tümüyle dışarıda
    const x1a = a.bas === null ? sol : Xk(a.bas);
    const x2a = a.son === null ? sag : Xk(a.son);
    ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.moveTo(Math.min(x1a, x2a), y); ctx.lineTo(Math.max(x1a, x2a), y); ctx.stroke();
    ctx.lineWidth = 1.8;
    const uc = (ux: number, dahil: boolean) => {
      ctx.beginPath(); ctx.arc(ux, y, rVar, 0, Math.PI * 2);
      ctx.fillStyle = dahil ? MUREKKEP : "#ffffff";
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = MUREKKEP;
    };
    if (a.bas !== null && a.bas >= v.min) uc(x1a, a.basDahil);
    if (a.son !== null && a.son <= v.max) uc(x2a, a.sonDahil);
  }
  for (const n of v.noktalar) {
    if (n.x < v.min - 1e-9 || n.x > v.max + 1e-9) continue; // çerçevenin dışında
    ctx.beginPath(); ctx.arc(X(n.x), y, rVar, 0, Math.PI * 2);
    ctx.fillStyle = n.dolu === false ? "#ffffff" : MUREKKEP;
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = MUREKKEP;
    if (n.ad?.trim()) fizikMetniCiz(ctx, n.ad.trim(), X(n.x), y - 18, 16, "orta", undefined, 60);
  }
}
