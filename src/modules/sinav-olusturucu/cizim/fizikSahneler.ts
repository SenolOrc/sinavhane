// Eğik düzlemde kütle + kuvvet bileşenleri (tek, HESAPLI nesne: `egikKuvvet`).
//
// NEDEN TEK NESNE: kuvvet okları kütleye ve açıya BAĞLI büyüklükler. Ayrı vektör
// şekilleriyle kurulsaydı öğretmen kütleyi değiştirince N ve mg uzamazdı (geçmişte
// yakalanan kusur). Burada her çizimde yeniden hesaplanıyor:
//   G = m·g (g = 10 m/s²), G∥ = mg·sinα, G⊥ = mg·cosα, N = mg·cosα,
//   fs,max = μ·N; mg·sinα ≤ fs,max → cisim durgun, fs = mg·sinα (statik);
//   aksi hâlde cisim kayar, fs = μ·N (kinetik), a = g(sinα − μ·cosα).
// Ok boyu = kuvvet (N) × ölçek (px/N): oranlar korunur, kütle artınca hepsi uzar.
// Kütle eğik yüzeye TAM paralel oturur (alt yüzü eğik yüzeyin üstünde).

import type { EgikKuvvetVerisi, Sekil } from "./tipler";
import { MUREKKEP } from "./sabitler";
import { fizikMetniCiz, fizikMetniOlcu } from "./fizik";

type FizikSekli = Extract<Sekil, { tur: "fizik" }>;
type P = { x: number; y: number };

export const YER_CEKIMI = 10;

export const varsayilanEgikKuvvet = (ek: Partial<EgikKuvvetVerisi> = {}): EgikKuvvetVerisi => ({
  aci: 30,
  kutle: 5,
  mu: 0,
  olcek: 2,
  goster: { mg: true, bilesen: true, normal: true, surtunme: false },
  degerler: false,
  konum: 0.5,
  aciEtiketi: "\\alpha",
  kutleEtiketi: "m",
  ...ek,
});

export function egikKuvvetVerisiGecerliMi(v: unknown): v is EgikKuvvetVerisi {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  const sayi = (x: unknown, a: number, b: number) => typeof x === "number" && Number.isFinite(x) && x >= a && x <= b;
  const g = o.goster as Record<string, unknown> | undefined;
  return sayi(o.aci, 5, 70) && sayi(o.kutle, 0.1, 100) && sayi(o.mu, 0, 1.5) && sayi(o.olcek, 0.2, 20) && sayi(o.konum, 0, 1) &&
    !!g && typeof g === "object" && ["mg", "bilesen", "normal", "surtunme"].every((k) => typeof g[k] === "boolean") &&
    typeof o.degerler === "boolean" && typeof o.aciEtiketi === "string" && o.aciEtiketi.length <= 24 &&
    typeof o.kutleEtiketi === "string" && o.kutleEtiketi.length <= 24;
}

export type EgikKuvvetler = {
  G: number;
  paralel: number;
  dik: number;
  N: number;
  fsMax: number;
  fs: number;
  durgun: boolean;
  /** Kayıyorsa ivme (m/s², eğim aşağı); durgunsa 0. */
  ivme: number;
};

export function egikKuvvetleri(v: Pick<EgikKuvvetVerisi, "aci" | "kutle" | "mu">): EgikKuvvetler {
  const a = (v.aci * Math.PI) / 180;
  const G = v.kutle * YER_CEKIMI;
  const paralel = G * Math.sin(a);
  const dik = G * Math.cos(a);
  const N = dik;
  const fsMax = v.mu * N;
  const durgun = paralel <= fsMax + 1e-9;
  const fs = durgun ? paralel : fsMax;
  return { G, paralel, dik, N, fsMax, fs, durgun, ivme: durgun ? 0 : (paralel - fsMax) / v.kutle };
}

const sayiYaz = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");

export type EgikOk = { ad: "mg" | "paralel" | "dik" | "N" | "fs"; bas: P; uc: P; kesik: boolean; etiket: string; buyukluk: number };

/** Geometri: çizim, test ve dış pay (PNG kırpma) aynı hesabı kullanır. */
export function egikYerlesim(s: { x: number; y: number; w: number; h: number }, v: EgikKuvvetVerisi) {
  const a = (v.aci * Math.PI) / 180;
  const tan = Math.tan(a);
  let B = s.w;
  let H = B * tan;
  if (H > s.h) { H = s.h; B = H / tan; }
  const A: P = { x: s.x, y: s.y + s.h };
  const C: P = { x: s.x + B, y: s.y + s.h };
  const T: P = { x: s.x + B, y: s.y + s.h - H };
  const Lh = Math.hypot(B, H);
  const yukari: P = { x: Math.cos(a), y: -Math.sin(a) };
  const asagi: P = { x: -yukari.x, y: -yukari.y };
  const normal: P = { x: -Math.sin(a), y: -Math.cos(a) };
  const bw = Math.max(36, Math.min(100, Lh * 0.24));
  const bh = bw * 0.62;
  const t = bw / 2 + Math.max(0, Lh - bw) * Math.max(0, Math.min(1, v.konum));
  const S: P = { x: A.x + yukari.x * t, y: A.y + yukari.y * t };
  const M: P = { x: S.x + normal.x * (bh / 2), y: S.y + normal.y * (bh / 2) };
  const kose = [
    { x: S.x - yukari.x * bw / 2, y: S.y - yukari.y * bw / 2 },
    { x: S.x + yukari.x * bw / 2, y: S.y + yukari.y * bw / 2 },
  ];
  const blok: P[] = [kose[0], kose[1], { x: kose[1].x + normal.x * bh, y: kose[1].y + normal.y * bh }, { x: kose[0].x + normal.x * bh, y: kose[0].y + normal.y * bh }];
  const k = egikKuvvetleri(v);
  const ae = v.aciEtiketi.trim() || "\\alpha";
  const deg = (f: number) => (v.degerler ? ` = ${sayiYaz(f)} N` : "");
  const uc = (bas: P, yon: P, f: number): P => ({ x: bas.x + yon.x * f * v.olcek, y: bas.y + yon.y * f * v.olcek });
  const oklar: EgikOk[] = [];
  if (v.goster.mg) oklar.push({ ad: "mg", bas: M, uc: uc(M, { x: 0, y: 1 }, k.G), kesik: false, etiket: `mg${deg(k.G)}`, buyukluk: k.G });
  if (v.goster.bilesen) {
    oklar.push({ ad: "paralel", bas: M, uc: uc(M, asagi, k.paralel), kesik: true, etiket: `mg·sin${ae}${deg(k.paralel)}`, buyukluk: k.paralel });
    oklar.push({ ad: "dik", bas: M, uc: uc(M, { x: -normal.x, y: -normal.y }, k.dik), kesik: true, etiket: `mg·cos${ae}${deg(k.dik)}`, buyukluk: k.dik });
  }
  if (v.goster.normal) oklar.push({ ad: "N", bas: M, uc: uc(M, normal, k.N), kesik: false, etiket: `N${deg(k.N)}`, buyukluk: k.N });
  if (v.goster.surtunme && k.fs > 1e-9) {
    // Sürtünme temas yüzeyinde, hareket (eğilim) yönüne zıt: eğim yukarı.
    const bas = { x: S.x + yukari.x * bw * 0.5, y: S.y + yukari.y * bw * 0.5 };
    oklar.push({ ad: "fs", bas, uc: uc(bas, yukari, k.fs), kesik: false, etiket: `f_s${deg(k.fs)}`, buyukluk: k.fs });
  }
  return { A, C, T, B, H, yukari, asagi, normal, S, M, blok, bw, bh, oklar, kuvvet: k };
}

/** Etiket orta noktası: okun ucundan biraz ileride. */
function etiketYeri(ok: EgikOk, punto: number, w: number): { x: number; y: number } {
  const dx = ok.uc.x - ok.bas.x, dy = ok.uc.y - ok.bas.y;
  const n = Math.hypot(dx, dy) || 1;
  const ux = dx / n, uy = dy / n;
  return { x: ok.uc.x + ux * (8 + w / 2), y: ok.uc.y + uy * (punto * 0.9) };
}

function cizgi(ctx: CanvasRenderingContext2D, a: P, b: P) {
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
}

function okCiz(ctx: CanvasRenderingContext2D, ok: EgikOk) {
  const dx = ok.uc.x - ok.bas.x, dy = ok.uc.y - ok.bas.y;
  const n = Math.hypot(dx, dy);
  if (n < 1) return;
  const aci = Math.atan2(dy, dx);
  const boy = Math.min(11, n * 0.45);
  ctx.save();
  ctx.lineWidth = Math.max(1.6, ctx.lineWidth * 1.15);
  ctx.setLineDash(ok.kesik ? [6, 4] : []);
  cizgi(ctx, ok.bas, { x: ok.uc.x - Math.cos(aci) * boy * 0.7, y: ok.uc.y - Math.sin(aci) * boy * 0.7 });
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(ok.uc.x, ok.uc.y);
  ctx.lineTo(ok.uc.x - boy * Math.cos(aci - 0.4), ok.uc.y - boy * Math.sin(aci - 0.4));
  ctx.lineTo(ok.uc.x - boy * Math.cos(aci + 0.4), ok.uc.y - boy * Math.sin(aci + 0.4));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

const ETIKET_PUNTO = 15;

export function egikKuvvetCiz(ctx: CanvasRenderingContext2D, s: FizikSekli) {
  const v = s.kuvvet && egikKuvvetVerisiGecerliMi(s.kuvvet) ? s.kuvvet : varsayilanEgikKuvvet();
  const y = egikYerlesim(s, v);
  ctx.save();
  ctx.strokeStyle = MUREKKEP;
  ctx.fillStyle = MUREKKEP;
  ctx.lineWidth = Math.max(1.2, s.kalinlik);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.setLineDash([]);
  // Eğik düzlem (dik üçgen takoz)
  ctx.beginPath();
  ctx.moveTo(y.A.x, y.A.y); ctx.lineTo(y.C.x, y.C.y); ctx.lineTo(y.T.x, y.T.y); ctx.closePath();
  if (s.dolgu) { ctx.fillStyle = s.dolgu; ctx.fill(); ctx.fillStyle = MUREKKEP; }
  ctx.stroke();
  // Açı yayı ve etiketi
  const r = Math.min(y.B, y.H) * 0.28 + 14;
  const a = (v.aci * Math.PI) / 180;
  ctx.beginPath(); ctx.arc(y.A.x, y.A.y, r, -a, 0); ctx.stroke();
  fizikMetniCiz(ctx, v.aciEtiketi.trim() || "\\alpha", y.A.x + (r + 12) * Math.cos(a / 2), y.A.y - (r + 9) * Math.sin(a / 2), 16);
  // Kütle: eğik yüzeye paralel blok
  ctx.beginPath();
  y.blok.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = "#ffffff"; ctx.fill(); ctx.fillStyle = MUREKKEP;
  ctx.stroke();
  // Bileşenlerin paralelkenar tamamlama çizgileri (mg ucundan bileşen uçlarına, ince kesikli)
  const mg = y.oklar.find((o) => o.ad === "mg");
  const par = y.oklar.find((o) => o.ad === "paralel");
  const dik = y.oklar.find((o) => o.ad === "dik");
  if (mg && par && dik) {
    ctx.save();
    ctx.lineWidth = 0.9; ctx.setLineDash([3, 3]);
    cizgi(ctx, mg.uc, par.uc); cizgi(ctx, mg.uc, dik.uc);
    ctx.restore();
    // mg (düşey) ile mg·cosα (yüzeye dik, içe) arasındaki açı = α
    const ra = Math.min(26, Math.hypot(dik.uc.x - dik.bas.x, dik.uc.y - dik.bas.y) * 0.45);
    if (ra > 8) {
      ctx.save(); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(y.M.x, y.M.y, ra, Math.PI / 2 - a, Math.PI / 2); ctx.stroke();
      ctx.restore();
      fizikMetniCiz(ctx, v.aciEtiketi.trim() || "\\alpha", y.M.x + (ra + 9) * Math.cos(Math.PI / 2 - a / 2), y.M.y + (ra + 9) * Math.sin(Math.PI / 2 - a / 2), 13);
    }
  }
  for (const ok of y.oklar) okCiz(ctx, ok);
  // Kütle etiketi (düz yazılır)
  const ke = v.kutleEtiketi.trim();
  // Oklar merkezden çıktığı için yazı bloğun eğim-yukarı yarısına (okların geçmediği yere) konur.
  if (ke) {
    const kayik = y.oklar.length ? y.bw * 0.26 : 0;
    fizikMetniCiz(ctx, v.degerler ? `${ke} = ${sayiYaz(v.kutle)} kg` : ke, y.M.x + y.yukari.x * kayik, y.M.y + y.yukari.y * kayik, ETIKET_PUNTO, "orta", undefined, y.oklar.length ? y.bw * 0.45 : y.bw - 6);
  }
  for (const ok of y.oklar) {
    const olcu = fizikMetniOlcu(ctx, ok.etiket, ETIKET_PUNTO - 1);
    const p = etiketYeri(ok, ETIKET_PUNTO, olcu.w);
    fizikMetniCiz(ctx, ok.etiket, p.x, p.y, ETIKET_PUNTO - 1);
  }
  if (v.degerler && v.goster.surtunme && v.mu > 0) {
    const k = y.kuvvet;
    const durum = k.durgun ? `Durgun: f_s = mg·sin${v.aciEtiketi.trim() || "\\alpha"} ≤ μN` : `Kayar: a = ${sayiYaz(k.ivme)} m/s²`;
    fizikMetniCiz(ctx, `μ = ${sayiYaz(v.mu)} · ${durum}`, y.A.x, y.A.y + 16, 13, "sol");
  }
  ctx.restore();
}

/** Okların ve yazıların kutu dışına taşma payı (yerel, dönüşsüz). */
export function egikKuvvetDisPayi(ctx: CanvasRenderingContext2D, s: FizikSekli) {
  const v = s.kuvvet && egikKuvvetVerisiGecerliMi(s.kuvvet) ? s.kuvvet : varsayilanEgikKuvvet();
  const y = egikYerlesim(s, v);
  let x0 = s.x, x1 = s.x + s.w, y0 = s.y, y1 = s.y + s.h;
  const kat = (p: P, w = 0, h = 0) => {
    x0 = Math.min(x0, p.x - w / 2 - 6); x1 = Math.max(x1, p.x + w / 2 + 6);
    y0 = Math.min(y0, p.y - h / 2 - 6); y1 = Math.max(y1, p.y + h / 2 + 6);
  };
  for (const ok of y.oklar) {
    kat(ok.uc);
    const o = fizikMetniOlcu(ctx, ok.etiket, ETIKET_PUNTO - 1);
    kat(etiketYeri(ok, ETIKET_PUNTO, o.w), o.w, o.h);
  }
  for (const p of y.blok) kat(p);
  if (v.degerler && v.goster.surtunme && v.mu > 0) kat({ x: y.A.x + 160, y: y.A.y + 16 }, 320, 18);
  return { sol: s.x - x0, ust: s.y - y0, sag: x1 - (s.x + s.w), alt: y1 - (s.y + s.h) };
}
