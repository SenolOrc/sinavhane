// Türkiye haritası: 81 il sınırı, nehirler, göller; öğretmenin seçtiği illeri A/B/C ya da 1/2/3 ile işaretler.
import { fizikMetniCiz } from "../fizik";
import { ayarMantik, ayarMetin, ayarSec, type CografyaVerisi } from "./sema";
import { TR_VERI_METNI } from "./trVeri";

type Kutu = { x: number; y: number; w: number; h: number };
type N = [number, number];
export type TrIl = { plaka: number; ad: string; halkalar: N[][]; merkez: N };
export type TrVeri = { iller: TrIl[]; nehirler: { ad: string; cizgi: N[] }[]; goller: { ad: string; halka: N[] }[] };

const LON0 = 24.8, LON1 = 45.0, LAT0 = 35.3, LAT1 = 43.1;
const KOS = Math.cos((39.1 * Math.PI) / 180);
export const HARITA_EN_BOY = ((LON1 - LON0) * KOS) / (LAT1 - LAT0);

function coz(flat: number[]): N[] {
  const p: N[] = [[flat[0] / 100, flat[1] / 100]];
  let x = flat[0], y = flat[1];
  for (let i = 2; i < flat.length; i += 2) { x += flat[i]; y += flat[i + 1]; p.push([x / 100, y / 100]); }
  return p;
}
function alan(r: N[]): { a: number; cx: number; cy: number } {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < r.length; i++) {
    const [x0, y0] = r[i], [x1, y1] = r[(i + 1) % r.length];
    const c = x0 * y1 - x1 * y0; a += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c;
  }
  a /= 2;
  return Math.abs(a) < 1e-9 ? { a: 0, cx: r[0][0], cy: r[0][1] } : { a: Math.abs(a), cx: cx / (6 * a), cy: cy / (6 * a) };
}

let onbellek: TrVeri | null = null;
export function trVerisi(): TrVeri {
  if (onbellek) return onbellek;
  const ham = JSON.parse(TR_VERI_METNI) as { iller: [number, string, number[][]][]; nehirler: [string, number[]][]; goller: [string, number[]][] };
  onbellek = {
    iller: ham.iller.map(([plaka, ad, hs]) => {
      const halkalar = hs.map(coz);
      let en: { a: number; cx: number; cy: number } | null = null;
      for (const h of halkalar) { const t = alan(h); if (!en || t.a > en.a) en = t; }
      return { plaka, ad, halkalar, merkez: [en!.cx, en!.cy] as N };
    }),
    nehirler: ham.nehirler.map(([ad, f]) => ({ ad, cizgi: coz(f) })),
    goller: ham.goller.map(([ad, f]) => ({ ad, halka: coz(f) })),
  };
  return onbellek;
}

/** "34, 6, 35" → [34, 6, 35]; geçersiz/yinelenen/1–81 dışı elenir, en çok 26 (A–Z). */
export function isaretliPlakalar(metin: string): number[] {
  const s: number[] = [];
  for (const t of metin.split(/[,\s]+/)) {
    const n = Number(t);
    if (t && Number.isInteger(n) && n >= 1 && n <= 81 && !s.includes(n)) s.push(n);
  }
  return s.slice(0, 26);
}

const HARFLER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function haritaCiz(ctx: CanvasRenderingContext2D, v: CografyaVerisi, k: Kutu) {
  const veri = trVerisi();
  const olcek = Math.min(k.w / ((LON1 - LON0) * KOS), k.h / (LAT1 - LAT0));
  const gw = (LON1 - LON0) * KOS * olcek, gh = (LAT1 - LAT0) * olcek;
  const ox = k.x + (k.w - gw) / 2, oy = k.y + (k.h - gh) / 2;
  const T = (p: N): [number, number] => [ox + (p[0] - LON0) * KOS * olcek, oy + (LAT1 - p[1]) * olcek];
  const yol = (halka: N[], kapali: boolean) => {
    halka.forEach((p, i) => { const [x, y] = T(p); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    if (kapali) ctx.closePath();
  };
  const punto = Math.max(8, Math.min(14, gw / 46));
  const isaret = isaretliPlakalar(ayarMetin(v, "isaret"));
  const etiket = ayarSec(v, "etiket");
  const tarama = ayarSec(v, "dolgu") === "tarama";
  const taban = ctx.lineWidth;

  ctx.save();
  ctx.lineJoin = "round";
  // İşaretli illerin dolgusu
  for (const il of veri.iller) {
    if (!isaret.includes(il.plaka)) continue;
    ctx.beginPath(); il.halkalar.forEach((h) => yol(h, true));
    if (tarama) {
      ctx.save(); ctx.clip();
      ctx.lineWidth = Math.max(0.6, taban * 0.3);
      for (let t = -gh; t < gw + gh; t += 4) { ctx.beginPath(); ctx.moveTo(ox + t, oy + gh); ctx.lineTo(ox + t + gh, oy); ctx.stroke(); }
      ctx.restore();
    } else { ctx.save(); ctx.fillStyle = "#c9c9c9"; ctx.fill(); ctx.restore(); }
  }
  // İl sınırları (ince) — kapalıysa yalnız ülke dış çizgisi yerine tüm çizgiler kalın tutulur
  const iller = ayarMantik(v, "iller");
  ctx.lineWidth = iller ? Math.max(0.5, taban * 0.3) : Math.max(1, taban * 0.8);
  for (const il of veri.iller) { ctx.beginPath(); il.halkalar.forEach((h) => yol(h, true)); ctx.stroke(); }
  // Göller
  if (ayarMantik(v, "gol")) {
    ctx.lineWidth = Math.max(0.8, taban * 0.45);
    for (const g of veri.goller) {
      ctx.beginPath(); yol(g.halka, true); ctx.save(); ctx.fillStyle = "#ffffff"; ctx.fill(); ctx.restore(); ctx.stroke();
      let sx = 0, sy = 0; g.halka.forEach((p) => { sx += p[0]; sy += p[1]; });
      const [cx, cy] = T([sx / g.halka.length, sy / g.halka.length]);
      fizikMetniCiz(ctx, g.ad.replace(" Gölü", "\nGölü").replace(" Barajı", "\nBarajı"), cx, cy + punto * 1.7, Math.max(7, punto * 0.72));
    }
  }
  // Nehirler
  if (ayarMantik(v, "nehir")) {
    ctx.lineWidth = Math.max(1, taban * 0.6);
    const yazildi = new Set<string>();
    for (const n of veri.nehirler) {
      ctx.beginPath(); yol(n.cizgi, false); ctx.stroke();
      if (!yazildi.has(n.ad) && n.cizgi.length > 3) {
        yazildi.add(n.ad);
        const [mx, my] = T(n.cizgi[Math.floor(n.cizgi.length / 2)]);
        fizikMetniCiz(ctx, n.ad, mx, my - punto * 0.7, Math.max(7, punto * 0.7));
      }
    }
  }
  ctx.lineWidth = taban;
  // Plaka numaraları (tüm iller) — işaretlenenler harf/sayıyla gösterilir
  if (ayarMantik(v, "plaka")) {
    for (const il of veri.iller) {
      if (etiket !== "yok" && isaret.includes(il.plaka)) continue;
      const [x, y] = T(il.merkez);
      fizikMetniCiz(ctx, String(il.plaka), x, y, Math.max(6, punto * 0.62));
    }
  }
  // İşaretler: beyaz zeminli daire içinde harf/sayı
  if (etiket !== "yok") {
    isaret.forEach((p, i) => {
      const il = veri.iller.find((t) => t.plaka === p);
      if (!il) return;
      const [x, y] = T(il.merkez);
      const r = punto * 0.8;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.save(); ctx.fillStyle = "#fff"; ctx.fill(); ctx.restore();
      ctx.lineWidth = Math.max(0.8, taban * 0.5); ctx.stroke();
      fizikMetniCiz(ctx, etiket === "harf" ? HARFLER[i] : String(i + 1), x, y, punto * 0.95);
    });
  }
  // İşaretli il adları (cevap anahtarı için)
  if (ayarMantik(v, "adlar")) {
    isaret.forEach((p) => {
      const il = veri.iller.find((t) => t.plaka === p);
      if (!il) return;
      const [x, y] = T(il.merkez);
      fizikMetniCiz(ctx, il.ad, x, y + punto * 1.35, Math.max(7, punto * 0.8));
    });
  }
  // Deniz adları
  if (ayarMantik(v, "deniz")) {
    const d = Math.max(8, punto * 0.95);
    const yaz = (s: string, lon: number, lat: number) => { const [x, y] = T([lon, lat]); fizikMetniCiz(ctx, s, x, y, d); };
    yaz("KARADENİZ", 35.3, 42.75); yaz("AKDENİZ", 32.8, 35.7); yaz("EGE\nDENİZİ", 25.9, 38.4);
  }
  ctx.restore();
}
