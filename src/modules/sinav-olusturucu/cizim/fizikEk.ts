// Fizik ek şekilleri: ışın üzerine ara ok, halka akım, solenoid (alan çizgileriyle),
// düz tel alan çizgileri, ⊗/⊙ alanı, iki kaynaklı girişim deseni, enerji düzeyi diyagramı
// ve devre düğüm noktası.
//
// Hepsi tek kutuya (x, y, w, h) çizilir; küçük ayarlar `s.ek` (FizikEk) içindedir:
// ters (yön), sayi / sayi2 (adet), metin / metin2 (enerji düzeyleri ve geçişleri).
// Siyah-beyaz baskıda okunur: yalnız siyah çizgi, ⊗/⊙ için içi boş daire + çarpı / nokta.

import type { FizikEk, Nokta, Sekil } from "./tipler";
import { MUREKKEP } from "./sabitler";
import { fizikMetniCiz, fizikMetniOlcu } from "./fizik";

type FizikSekli = Extract<Sekil, { tur: "fizik" }>;

export const FIZIK_EK_NESNELERI = ["isinOk", "halkaAkim", "solenoid", "telAlan", "alanNokta", "dalgaGirisim", "enerjiDuzeyi"] as const;
export const fizikEkMi = (nesne: string) => (FIZIK_EK_NESNELERI as readonly string[]).includes(nesne);

const TAM = Math.PI * 2;

function cizgi(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}

/** (x, y) ucunda `aci` yönüne bakan dolu ok başı. */
function okBasi(ctx: CanvasRenderingContext2D, x: number, y: number, aci: number, boy: number) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - boy * Math.cos(aci - 0.42), y - boy * Math.sin(aci - 0.42));
  ctx.lineTo(x - boy * Math.cos(aci + 0.42), y - boy * Math.sin(aci + 0.42));
  ctx.closePath();
  ctx.fill();
}

/** Sayfaya giren (⊗: daire + çarpı) ya da çıkan (⊙: daire + nokta) alan/akım simgesi. */
export function girenCikanSimgesi(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, giren: boolean) {
  ctx.save();
  ctx.lineWidth = Math.max(1, ctx.lineWidth * 0.85);
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAM); ctx.stroke();
  if (giren) {
    const d = r * Math.SQRT1_2;
    cizgi(ctx, cx - d, cy - d, cx + d, cy + d);
    cizgi(ctx, cx - d, cy + d, cx + d, cy - d);
  } else {
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(1.6, r * 0.3), 0, TAM); ctx.fill();
  }
  ctx.restore();
}

const sinirla = (v: number | undefined, varsayilan: number, a: number, b: number) =>
  Math.max(a, Math.min(b, Math.round(Number.isFinite(v as number) ? (v as number) : varsayilan)));

// ── Işın üzerine ara ok ────────────────────────────────────────────────────

function isinOkCiz(ctx: CanvasRenderingContext2D, s: FizikSekli, ek: FizikEk) {
  const { x, y, w, h } = s;
  const cy = y + h / 2;
  const n = sinirla(ek.sayi, 1, 0, 4);
  const sonOk = ek.sayi2 === 1;
  const ters = ek.ters === true;
  const boy = 9 + s.kalinlik * 1.2;
  cizgi(ctx, x, cy, x + w, cy);
  const aci = ters ? Math.PI : 0;
  for (let i = 1; i <= n; i += 1) {
    const px = x + (w * i) / (n + 1);
    okBasi(ctx, px + (ters ? -boy * 0.5 : boy * 0.5), cy, aci, boy);
  }
  if (sonOk) okBasi(ctx, ters ? x : x + w, cy, aci, boy);
}

// ── Halka akım ─────────────────────────────────────────────────────────────

/** Yarı-elips yay üstünde, yönü (dx, dy) olan küçük ok. */
function yayOku(ctx: CanvasRenderingContext2D, x: number, y: number, dx: number, dy: number, boy = 7) {
  okBasi(ctx, x + dx * boy * 0.5, y + dy * boy * 0.5, Math.atan2(dy, dx), boy);
}

function halkaAkimCiz(ctx: CanvasRenderingContext2D, s: FizikSekli, ek: FizikEk) {
  const { x, y, w, h } = s;
  const cx = x + w / 2, cy = y + h / 2;
  const ters = ek.ters === true;
  // Halkanın kesiti: solda ⊙, sağda ⊗ (eksen yukarı); ters → tersi.
  const d = Math.min(w * 0.16, 40);
  const r = 7;
  girenCikanSimgesi(ctx, cx - d, cy, r, ters);
  girenCikanSimgesi(ctx, cx + d, cy, r, !ters);
  // Merkez ekseni (yukarı = +, ters → aşağı)
  const yon = ters ? 1 : -1;
  cizgi(ctx, cx, y + 4, cx, y + h - 4);
  okBasi(ctx, cx, yon < 0 ? y + 2 : y + h - 2, yon < 0 ? -Math.PI / 2 : Math.PI / 2, 10);
  // Her telin etrafında kapalı alan çizgileri: iç taraf eksen yönünde, dış taraf tersine
  const adet = sinirla(ek.sayi, 2, 1, 3);
  for (let k = 1; k <= adet; k += 1) {
    const u = (d * k) / (adet + 0.6); // iç taraf (merkeze yakın)
    const v = d + (w / 2 - d - 6) * (k / adet); // dış taraf
    for (const taraf of [1, -1]) {
      const iX = cx + taraf * u, oX = cx + taraf * v;
      const ort = (iX + oX) / 2, a = Math.abs(oX - iX) / 2;
      const b = Math.min(h / 2 - 6, 24 + k * (h / 2 - 30) / adet);
      ctx.beginPath(); ctx.ellipse(ort, cy, a, b, 0, 0, TAM); ctx.stroke();
      // iç kenarda eksen yönünde, dış kenarda ters yönde ok
      yayOku(ctx, iX, cy, 0, yon, 8);
      yayOku(ctx, oX, cy, 0, -yon, 8);
    }
  }
}

// ── Solenoid ───────────────────────────────────────────────────────────────

function solenoidCiz(ctx: CanvasRenderingContext2D, s: FizikSekli, ek: FizikEk) {
  const { x, y, w, h } = s;
  const cy = y + h / 2;
  const sarim = sinirla(ek.sayi, 6, 3, 14);
  const x0 = x + w * 0.24, x1 = x + w * 0.76;
  const ry = Math.min(h * 0.2, 30);
  const adim = (x1 - x0) / sarim;
  const yon = ek.ters ? -1 : 1;
  // Sarımlar: eğik ön teller (alt-sol → üst-sağ yarı elips)
  ctx.save();
  for (let i = 0; i < sarim; i += 1) {
    const cx = x0 + adim * (i + 0.5);
    ctx.beginPath();
    ctx.ellipse(cx, cy, adim * 0.55, ry, 0, -Math.PI / 2, Math.PI / 2, false);
    ctx.stroke();
  }
  // Uç telleri (üst kenar boyunca arka teller ince)
  ctx.lineWidth = Math.max(0.8, ctx.lineWidth * 0.55);
  cizgi(ctx, x0 - adim * 0.05, cy - ry, x1, cy - ry);
  ctx.restore();
  // Besleme telleri
  cizgi(ctx, x, cy + ry, x0 + adim * 0.5, cy + ry);
  cizgi(ctx, x1 + adim * 0.05, cy - ry, x + w, cy - ry);
  // İç alan çizgileri: eksene paralel, ortada ok
  for (const k of [-0.45, 0, 0.45]) {
    const yy = cy + ry * k;
    ctx.save(); ctx.lineWidth = Math.max(0.9, ctx.lineWidth * 0.7);
    cizgi(ctx, x0 - 6, yy, x1 + 6, yy);
    ctx.restore();
    okBasi(ctx, (x0 + x1) / 2 + yon * 8, yy, yon > 0 ? 0 : Math.PI, 8);
  }
  // Dış dönüş çizgileri: sağ uçtan çıkıp yukarı/aşağıdan dolanarak sola döner
  for (const taraf of [-1, 1]) {
    const dis = taraf * Math.min(h * 0.46, ry + 26);
    for (const katsayi of [0.62, 1]) {
      const yy = cy + dis * katsayi;
      ctx.save(); ctx.lineWidth = Math.max(0.9, ctx.lineWidth * 0.7);
      ctx.beginPath();
      const sagUc = yon > 0 ? x1 + 6 : x0 - 6, solUc = yon > 0 ? x0 - 6 : x1 + 6;
      ctx.moveTo(sagUc, cy + ry * 0.45 * taraf);
      ctx.bezierCurveTo(sagUc + yon * w * 0.2, yy, solUc - yon * w * 0.2, yy, solUc, cy + ry * 0.45 * taraf);
      ctx.stroke();
      ctx.restore();
      okBasi(ctx, (x0 + x1) / 2 - yon * 6, yy, yon > 0 ? Math.PI : 0, 8);
    }
  }
}

// ── Düz tel alanı ──────────────────────────────────────────────────────────

function telAlanCiz(ctx: CanvasRenderingContext2D, s: FizikSekli, ek: FizikEk) {
  const { x, y, w, h } = s;
  const cx = x + w / 2, cy = y + h / 2;
  const giren = ek.ters === true; // ⊗: akım sayfaya giriyor → alan saat yönünde
  const adet = sinirla(ek.sayi, 3, 1, 5);
  const R = Math.min(w, h) / 2 - 4;
  girenCikanSimgesi(ctx, cx, cy, Math.min(9, R / (adet + 1)), giren);
  for (let k = 1; k <= adet; k += 1) {
    const r = Math.max(14, (R * k) / adet);
    ctx.save(); ctx.lineWidth = Math.max(1, ctx.lineWidth * 0.8);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAM); ctx.stroke();
    ctx.restore();
    // Ok: çemberin üstünde (açı -90°), teğet yönü: saat yönü (giren) → +x; saat tersi (çıkan) → −x
    const yon = giren ? 1 : -1;
    okBasi(ctx, cx + yon * 5, cy - r, yon > 0 ? 0 : Math.PI, 8);
  }
}

// ── ⊗ / ⊙ alanı ────────────────────────────────────────────────────────────

function alanNoktaCiz(ctx: CanvasRenderingContext2D, s: FizikSekli, ek: FizikEk) {
  const { x, y, w, h } = s;
  const sutun = sinirla(ek.sayi, 5, 1, 14);
  const satir = sinirla(ek.sayi2, 3, 1, 10);
  const giren = ek.ters === true;
  const cw = w / sutun, ch = h / satir;
  const r = Math.max(3, Math.min(10, Math.min(cw, ch) * 0.28));
  for (let i = 0; i < sutun; i += 1) for (let j = 0; j < satir; j += 1) girenCikanSimgesi(ctx, x + cw * (i + 0.5), y + ch * (j + 0.5), r, giren);
}

// ── Girişim deseni ─────────────────────────────────────────────────────────

/** Düğüm (sönüm) çizgisi: |r1 − r2| = fark; odaklar (sx, cy ± c). */
function dugumCizgisi(ctx: CanvasRenderingContext2D, sx: number, cy: number, c: number, fark: number, kutu: { x: number; y: number; w: number; h: number }, isaret: number) {
  const a = fark / 2;
  const b2 = c * c - a * a;
  if (a <= 0 || b2 <= 0) return;
  const b = Math.sqrt(b2);
  ctx.beginPath();
  let ilk = true;
  for (let u = 0; u <= 3.2; u += 0.08) {
    const X = b * Math.sinh(u), Y = isaret * a * Math.cosh(u);
    const px = sx + X, py = cy + Y;
    if (px > kutu.x + kutu.w + 2 || py < kutu.y - 2 || py > kutu.y + kutu.h + 2) break;
    if (ilk) { ctx.moveTo(px, py); ilk = false; } else ctx.lineTo(px, py);
  }
  ctx.stroke();
}

function dalgaGirisimCiz(ctx: CanvasRenderingContext2D, s: FizikSekli, ek: FizikEk) {
  const { x, y, w, h } = s;
  const cy = y + h / 2;
  const lam = Math.max(8, Math.min(60, ek.sayi ?? 20));
  const d = Math.max(lam * 1.2, Math.min(h * 0.8, ek.sayi2 ?? h * 0.4));
  const sx = x + 8;
  const kaynaklar = [cy - d / 2, cy + d / 2];
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.lineWidth = Math.max(0.9, ctx.lineWidth * 0.55);
  for (const ky of kaynaklar) {
    for (let r = lam; r < w * 1.4 && r < 700; r += lam) {
      ctx.beginPath(); ctx.arc(sx, ky, r, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    }
  }
  if (ek.ters) {
    // Düğüm çizgileri (sönümlü girişim): kalın kesikli hiperboller; merkez çizgisi (yapıcı) düz
    ctx.lineWidth = Math.max(1.4, ctx.lineWidth * 2.2);
    ctx.setLineDash([7, 5]);
    for (let m = 0; (m + 0.5) * lam < d; m += 1) {
      const fark = (m + 0.5) * lam;
      dugumCizgisi(ctx, sx, cy, d / 2, fark, { x, y, w, h }, 1);
      dugumCizgisi(ctx, sx, cy, d / 2, fark, { x, y, w, h }, -1);
    }
    ctx.setLineDash([]);
  }
  ctx.restore();
  for (const [i, ky] of kaynaklar.entries()) {
    ctx.beginPath(); ctx.arc(sx, ky, 3.4, 0, TAM); ctx.fill();
    fizikMetniCiz(ctx, `S_${i + 1}`, sx - 4, ky + (i === 0 ? -13 : 13), 16, "sag");
  }
}

// ── Enerji düzeyi diyagramı ────────────────────────────────────────────────

export type EnerjiDuzeyi = { ad: string; e: number };
export type EnerjiGecisi = { bas: number; son: number; etiket: string };

const sayiOku = (t: string) => Number(t.trim().replace(",", ".").replace(/[−–]/g, "-"));

/** "n=1:-13,6; n=2:-3,4" → düzeyler (yazılış sırası). Okunamazsa hata metni. */
export function enerjiDuzeyleriOku(metin: string): { duzeyler: EnerjiDuzeyi[] } | { hata: string } {
  const parcalar = metin.split(/[;\n]/).map((p) => p.trim()).filter(Boolean);
  if (parcalar.length < 2) return { hata: "En az 2 düzey yazın: n=1:-13,6; n=2:-3,4" };
  if (parcalar.length > 10) return { hata: "En çok 10 düzey" };
  const duzeyler: EnerjiDuzeyi[] = [];
  for (const p of parcalar) {
    const i = p.lastIndexOf(":");
    const ad = i > 0 ? p.slice(0, i).trim() : `${duzeyler.length + 1}`;
    const e = sayiOku(i > 0 ? p.slice(i + 1) : p);
    if (!Number.isFinite(e)) return { hata: `"${p.slice(0, 24)}": ad:değer biçiminde yazın (n=1:-13,6)` };
    duzeyler.push({ ad, e });
  }
  return { duzeyler };
}

/** "3>1; 3>2:Hα" → geçişler (1 tabanlı düzey sırası; üst>alt = ışıma, alt>üst = soğurma). */
export function enerjiGecisleriOku(metin: string, duzeySayisi: number): { gecisler: EnerjiGecisi[] } | { hata: string } {
  const parcalar = metin.split(/[;\n]/).map((p) => p.trim()).filter(Boolean);
  if (parcalar.length > 12) return { hata: "En çok 12 geçiş" };
  const gecisler: EnerjiGecisi[] = [];
  for (const p of parcalar) {
    const m = /^(\d+)\s*[>→-]\s*(\d+)\s*(?::\s*(.*))?$/.exec(p);
    if (!m) return { hata: `"${p.slice(0, 24)}": geçiş "3>1" ya da "3>2:Hα" biçiminde yazılır` };
    const bas = Number(m[1]), son = Number(m[2]);
    if (bas < 1 || son < 1 || bas > duzeySayisi || son > duzeySayisi || bas === son) return { hata: `"${p}": düzey sırası 1–${duzeySayisi} arasında ve farklı olmalı` };
    gecisler.push({ bas, son, etiket: (m[3] ?? "").trim() });
  }
  return { gecisler };
}

export const ENERJI_VARSAYILAN_DUZEYLER = "n=1:-13,6; n=2:-3,4; n=3:-1,51; n=4:-0,85";
export const ENERJI_VARSAYILAN_GECISLER = "2>1; 3>1; 4>2";

const eVYaz = (e: number) => `${String(Math.round(e * 100) / 100).replace(".", ",").replace("-", "−")} eV`;

/**
 * Enerji diyagramının yerleşimi — çizim ve dış pay (PNG kırpma sınırı) AYNI
 * hesabı kullansın diye tek yerde.
 */
function enerjiYerlesimi(s: FizikSekli, ek: FizikEk) {
  const { x, y, w, h } = s;
  const d = enerjiDuzeyleriOku(ek.metin ?? ENERJI_VARSAYILAN_DUZEYLER);
  const varsayilanD = enerjiDuzeyleriOku(ENERJI_VARSAYILAN_DUZEYLER) as { duzeyler: EnerjiDuzeyi[] };
  const duzeyler = "duzeyler" in d ? d.duzeyler : varsayilanD.duzeyler;
  const g = enerjiGecisleriOku(ek.metin2 ?? ENERJI_VARSAYILAN_GECISLER, duzeyler.length);
  const gecisler = "gecisler" in g ? g.gecisler : [];
  const sol = x + w * 0.2, sag = x + w * 0.8;
  const ust = y + 10, alt = y + h - 10;
  const es = ek.ters === true; // eşit aralıklı
  const sirali = [...duzeyler.keys()].sort((a, b) => duzeyler[a].e - duzeyler[b].e);
  const emin = Math.min(...duzeyler.map((q) => q.e)), emax = Math.max(...duzeyler.map((q) => q.e));
  const konumY = (i: number) => {
    if (es || emax - emin < 1e-9) return alt - ((alt - ust) * sirali.indexOf(i)) / Math.max(1, duzeyler.length - 1);
    return alt - ((duzeyler[i].e - emin) / (emax - emin)) * (alt - ust);
  };
  const ys = duzeyler.map((_, i) => konumY(i));
  // Yazı konumları: gerçek ölçekte birbirine çok yakın düzeylerin (n=3, n=4…)
  // yazıları üst üste binmesin diye aşağıdan yukarı en az 15 px aralıkla açılır;
  // çizgiler gerçek konumunda kalır, kayan yazıya ince bir kılavuz çizilir.
  const yaziY = [...ys];
  const asagidan = [...ys.keys()].sort((a, b) => ys[b] - ys[a]);
  for (let k = 1; k < asagidan.length; k += 1) {
    const onceki = yaziY[asagidan[k - 1]];
    if (onceki - yaziY[asagidan[k]] < 15) yaziY[asagidan[k]] = onceki - 15;
  }
  const gecisX = (i: number) => sol + ((sag - sol) * (i + 1)) / (gecisler.length + 1);
  return { duzeyler, gecisler, sol, sag, ys, yaziY, gecisX };
}

/**
 * Enerji diyagramında yazıların kutu DIŞINA taşan payı (yerel, dönüşsüz).
 * Düzey adları solda sağa yaslı, eV değerleri sağda sola yaslı yazılıyor;
 * dar kutuda ya da uzun adlarda (ör. "n=∞ (iyon)") kutunun dışına çıkıyor ve
 * PNG dışa aktarımında kırpılıyordu (ölçüldü: 0,55 ölçekli varsayılan
 * diyagramda sağda 19 px).
 */
export function enerjiDuzeyiDisPayi(ctx: CanvasRenderingContext2D, s: FizikSekli) {
  const ek: FizikEk = s.ek ?? {};
  const { duzeyler, gecisler, sol, sag, ys, yaziY, gecisX } = enerjiYerlesimi(s, ek);
  const PAY = 4;
  let x0 = s.x, x1 = s.x + s.w, y0 = s.y, y1 = s.y + s.h;
  const kat = (sx: number, ex: number, cy: number, yh: number) => {
    x0 = Math.min(x0, sx - PAY); x1 = Math.max(x1, ex + PAY);
    y0 = Math.min(y0, cy - yh / 2 - PAY); y1 = Math.max(y1, cy + yh / 2 + PAY);
  };
  duzeyler.forEach((q, i) => {
    const ad = fizikMetniOlcu(ctx, q.ad, 16);
    kat(sol - 8 - ad.w, sol - 8, yaziY[i], ad.h);
    const ev = fizikMetniOlcu(ctx, eVYaz(q.e), 15);
    kat(sag + 8, sag + 8 + ev.w, yaziY[i], ev.h);
  });
  gecisler.forEach((gc, i) => {
    if (!gc.etiket) return;
    const o = fizikMetniOlcu(ctx, gc.etiket, 15);
    kat(gecisX(i) + 5, gecisX(i) + 5 + o.w, (ys[gc.bas - 1] + ys[gc.son - 1]) / 2, o.h);
  });
  return { sol: s.x - x0, ust: s.y - y0, sag: x1 - (s.x + s.w), alt: y1 - (s.y + s.h) };
}

function enerjiDuzeyiCiz(ctx: CanvasRenderingContext2D, s: FizikSekli, ek: FizikEk) {
  const { duzeyler, gecisler, sol, sag, ys, yaziY, gecisX } = enerjiYerlesimi(s, ek);
  // Düzey çizgileri ve yazıları
  duzeyler.forEach((q, i) => {
    cizgi(ctx, sol, ys[i], sag, ys[i]);
    if (Math.abs(yaziY[i] - ys[i]) > 0.5) {
      ctx.save(); ctx.lineWidth = 0.8;
      cizgi(ctx, sol - 6, yaziY[i], sol, ys[i]);
      cizgi(ctx, sag, ys[i], sag + 6, yaziY[i]);
      ctx.restore();
    }
    fizikMetniCiz(ctx, q.ad, sol - 8, yaziY[i], 16, "sag");
    fizikMetniCiz(ctx, eVYaz(q.e), sag + 8, yaziY[i], 15, "sol");
  });
  // Geçiş okları: birbirinden ayrık x konumlarında
  gecisler.forEach((gc, i) => {
    const px = gecisX(i);
    const y1 = ys[gc.bas - 1], y2 = ys[gc.son - 1];
    const yon = y2 > y1 ? 1 : -1;
    cizgi(ctx, px, y1, px, y2 - yon * 6);
    okBasi(ctx, px, y2, yon > 0 ? Math.PI / 2 : -Math.PI / 2, 10);
    if (gc.etiket) fizikMetniCiz(ctx, gc.etiket, px + 5, (y1 + y2) / 2, 15, "sol");
  });
}

// ── Dışa açık ──────────────────────────────────────────────────────────────

/** Ek şekillerin gövdesi (dönüş/ayna `fizikCiz`de uygulanır). */
export function fizikEkCiz(ctx: CanvasRenderingContext2D, s: FizikSekli) {
  const ek: FizikEk = s.ek ?? {};
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  switch (s.nesne) {
    case "isinOk": isinOkCiz(ctx, s, ek); break;
    case "halkaAkim": halkaAkimCiz(ctx, s, ek); break;
    case "solenoid": solenoidCiz(ctx, s, ek); break;
    case "telAlan": telAlanCiz(ctx, s, ek); break;
    case "alanNokta": alanNoktaCiz(ctx, s, ek); break;
    case "dalgaGirisim": dalgaGirisimCiz(ctx, s, ek); break;
    case "enerjiDuzeyi": enerjiDuzeyiCiz(ctx, s, ek); break;
    default: break;
  }
  ctx.restore();
  ctx.fillStyle = MUREKKEP;
}

export type { Nokta };
