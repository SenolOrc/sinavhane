// Asal eksenli optik ışın düzeneği: çukur/tümsek ayna, ince/kalın kenarlı mercek.
//
// FİZİK: ince ayna/mercek, paraksiyel yaklaşım. Işınlar ayna/mercek düzlemine
// (x = X0) çarpar. İşaret kuralı: 1/f = 1/do + 1/di; toplayıcıda (çukur ayna,
// ince kenarlı mercek) f > 0, dağıtıcıda (tümsek ayna, kalın kenarlı mercek)
// f < 0; di > 0 gerçek görüntü, di < 0 sanal görüntü; büyütme m = −di/do.
//
// Özel ışınlar görüntüden BAĞIMSIZ olarak kurallarıyla çizilir (paralel gelen →
// odaktan geçer; odaktan gelen → paralel gider; merkezden geçen sapmaz / tepeye
// gelen simetrik yansır; eğrilik merkezinden gelen kendi üstüne döner). Kurallar
// doğru olduğu için çıkan ışınlar denklemle bulunan görüntü noktasında kesişir
// (testte sayısal olarak doğrulanır). Sanal görüntüde ışınların uzantıları ve
// görüntü KESİKLİ çizilir.

import type { OptikVerisi, Sekil } from "./tipler";
import { MUREKKEP } from "./sabitler";
import { fizikMetniCiz } from "./fizik";

type FizikSekli = Extract<Sekil, { tur: "fizik" }>;
type P = { x: number; y: number };

export const OPTIK_TURLERI: { deger: OptikVerisi["tur"]; ad: string }[] = [
  { deger: "cukurAyna", ad: "Çukur ayna" },
  { deger: "tumsekAyna", ad: "Tümsek ayna" },
  { deger: "inceMercek", ad: "İnce kenarlı mercek" },
  { deger: "kalinMercek", ad: "Kalın kenarlı mercek" },
];

export const varsayilanOptik = (ek: Partial<OptikVerisi> = {}): OptikVerisi => ({
  tur: "cukurAyna",
  f: 10,
  uzaklik: 30,
  boy: 6,
  isinlar: { paralel: true, odak: true, merkez: true },
  goruntu: true,
  isaretler: true,
  bilgi: true,
  ...ek,
});

export function optikVerisiGecerliMi(v: unknown): v is OptikVerisi {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  const sayi = (x: unknown, a: number, b: number) => typeof x === "number" && Number.isFinite(x) && x >= a && x <= b;
  const isin = o.isinlar as Record<string, unknown> | undefined;
  return ["cukurAyna", "tumsekAyna", "inceMercek", "kalinMercek"].includes(String(o.tur)) &&
    sayi(o.f, 0.5, 200) && sayi(o.uzaklik, 0.1, 500) && sayi(o.boy, 0.1, 100) &&
    !!isin && typeof isin === "object" && ["paralel", "odak", "merkez"].every((k) => typeof isin[k] === "boolean") &&
    (isin.egrilik === undefined || typeof isin.egrilik === "boolean") &&
    typeof o.goruntu === "boolean" && typeof o.isaretler === "boolean" && typeof o.bilgi === "boolean";
}

export const aynaMi = (tur: OptikVerisi["tur"]) => tur === "cukurAyna" || tur === "tumsekAyna";
export const toplayiciMi = (tur: OptikVerisi["tur"]) => tur === "cukurAyna" || tur === "inceMercek";

export type OptikSonuc = {
  /** İşaretli odak uzaklığı. */
  f: number;
  /** Görüntü uzaklığı; cisim odaktaysa ±Infinity. */
  di: number;
  /** Büyütme −di/do (sonsuzda NaN). */
  m: number;
  sonsuz: boolean;
  gercek: boolean;
  /** Düz (dik) görüntü mü? */
  duz: boolean;
  buyukluk: "büyük" | "küçük" | "eşit" | "—";
};

/** Ayna/mercek denklemi: 1/f = 1/do + 1/di. */
export function optikHesapla(v: OptikVerisi): OptikSonuc {
  const f = toplayiciMi(v.tur) ? Math.abs(v.f) : -Math.abs(v.f);
  const d0 = Math.abs(v.uzaklik);
  const payda = 1 / f - 1 / d0;
  if (Math.abs(payda) < 1e-9) return { f, di: Infinity, m: NaN, sonsuz: true, gercek: false, duz: false, buyukluk: "—" };
  const di = 1 / payda;
  const m = -di / d0;
  const am = Math.abs(m);
  return { f, di, m, sonsuz: false, gercek: di > 0, duz: m > 0, buyukluk: Math.abs(am - 1) < 1e-6 ? "eşit" : am > 1 ? "büyük" : "küçük" };
}

const sayiYaz = (n: number) => {
  const r = Math.round(n * 100) / 100;
  return String(r).replace(".", ",").replace(/^-/, "−");
};

/** Görüntü niteliği yazısı: "Gerçek, ters, küçük (m = −0,5)". */
export function optikNitelik(v: OptikVerisi): string {
  const r = optikHesapla(v);
  if (r.sonsuz) return "Cisim odakta: görüntü sonsuzda (ışınlar paralel)";
  return `${r.gercek ? "Gerçek" : "Sanal"}, ${r.duz ? "düz" : "ters"}, ${r.buyukluk === "eşit" ? "boyu eşit" : r.buyukluk}`;
}

// ── Yerleşim (çizim, test ve dış pay AYNI hesabı kullanır) ──────────────────

export type OptikIsin = {
  /** Gelen ışının parçası (düz). */
  gelen: [P, P];
  /** Çıkan ışın: çarpma noktasından yönü. */
  cikis: P;
  yon: P;
  /** Kesikli yardımcı çizgiler (sanal uzantı, odağa nişan). */
  kesikli: [P, P][];
  ad: "paralel" | "odak" | "merkez" | "egrilik";
};

export function optikYerlesimi(s: { x: number; y: number; w: number; h: number }, v: OptikVerisi) {
  const ayna = aynaMi(v.tur);
  const r = optikHesapla(v);
  const fA = Math.abs(r.f);
  const d0 = Math.abs(v.uzaklik);
  // Görüntünün yatay konumu (birim, + = sağ): mercekte gerçek görüntü sağda, aynada solda (önde).
  const ixBirim = r.sonsuz ? NaN : ayna ? -r.di : r.di;
  const sinir = Math.max(2 * fA, d0) * 2.2;
  const solGerek = Math.max(d0, 2 * fA, Number.isFinite(ixBirim) && ixBirim < 0 ? Math.min(-ixBirim, sinir) : 0) * 1.12;
  const sagGerek = Math.max(2 * fA, Number.isFinite(ixBirim) && ixBirim > 0 ? Math.min(ixBirim, sinir) : 0) * 1.12;
  const PAY = 12;
  const yatayOlcek = (s.w - PAY * 2) / (solGerek + sagGerek);
  const mAbs = Number.isFinite(r.m) ? Math.min(Math.abs(r.m), 4) : 1;
  const dikeyOlcek = (s.h / 2 - 18) / (Math.max(1, mAbs) * v.boy);
  const olcek = Math.max(0.05, Math.min(yatayOlcek, dikeyOlcek));
  const X0 = s.x + PAY + solGerek * olcek + ((s.w - PAY * 2) - (solGerek + sagGerek) * olcek) / 2;
  const Y0 = s.y + s.h / 2;
  const K: P = { x: X0 - d0 * olcek, y: Y0 - v.boy * olcek };
  const L: P = { x: K.x, y: Y0 };
  const goruntu = r.sonsuz ? null : { x: X0 + ixBirim * olcek, y: Y0 - r.m * v.boy * olcek };
  const hb = v.boy * olcek;
  const isaret = Math.sign(r.f);
  const isinlar: OptikIsin[] = [];
  const yonBirim = (d: P) => { const n = Math.hypot(d.x, d.y) || 1; return { x: d.x / n, y: d.y / n }; };
  // Sanal görüntüde çıkan ışının geriye uzantısı (görüntünün x'ine kadar).
  const sanalUzanti = (c: P, yon: P): [P, P][] => {
    if (!goruntu || r.gercek || Math.abs(yon.x) < 1e-9) return [];
    const t = (c.x - goruntu.x) / yon.x;
    if (t <= 0) return [];
    const ek = Math.min(t * 1.08 + 6 / Math.abs(yon.x), 4000);
    return [[c, { x: c.x - yon.x * ek, y: c.y - yon.y * ek }]];
  };
  const cikYonX = ayna ? -1 : 1;
  if (v.isinlar.paralel) {
    const c = { x: X0, y: K.y };
    // Mercek: d = (|f|, sgn(f)·h) · Ayna: d = (−|f|, sgn(f)·h)  (birimler ölçekli)
    const yon = yonBirim({ x: cikYonX * fA * olcek, y: isaret * hb });
    const kesikli: [P, P][] = [];
    if (isaret < 0) kesikli.push([c, { x: X0 + (ayna ? fA : -fA) * olcek, y: Y0 }]);
    isinlar.push({ ad: "paralel", gelen: [K, c], cikis: c, yon, kesikli: kesikli.concat(isaret < 0 ? [] : sanalUzanti(c, yon)), });
  }
  // Odağa nişanlı ışın: toplayıcıda öndeki F, dağıtıcıda arkadaki F.
  const nisanliIsin = (A: P, ad: OptikIsin["ad"], cikisYatay: boolean): OptikIsin | null => {
    if (Math.abs(A.x - K.x) < 1e-6) return null; // cisim tam odakta/merkezde: ışın düşey, çizilemez
    const yHit = K.y + (Y0 - K.y) * (X0 - K.x) / (A.x - K.x);
    if (!Number.isFinite(yHit) || Math.abs(yHit - Y0) > s.h * 3) return null;
    const c = { x: X0, y: yHit };
    const yon = cikisYatay ? { x: cikYonX, y: 0 } : yonBirim({ x: K.x - c.x, y: K.y - c.y });
    const kesikli: [P, P][] = [];
    // A, K ile çarpma noktası ARASINDA değilse nişan noktası kesikli gösterilir.
    const arada = (A.x - K.x) * (A.x - X0) <= 0;
    if (!arada) kesikli.push(A.x > X0 ? [c, A] : [A, K]);
    return { ad, gelen: [K, c], cikis: c, yon, kesikli: kesikli.concat(sanalUzanti(c, yon)) };
  };
  if (v.isinlar.odak) {
    const A = { x: X0 - r.f * olcek, y: Y0 };
    const isin = nisanliIsin(A, "odak", true);
    if (isin) isinlar.push(isin);
  }
  if (v.isinlar.merkez) {
    const c = { x: X0, y: Y0 };
    // Mercek: optik merkezden sapmadan geçer · Ayna: tepeye gelen asal eksene göre simetrik yansır.
    const yon = yonBirim(ayna ? { x: K.x - X0, y: Y0 - K.y } : { x: X0 - K.x, y: Y0 - K.y });
    isinlar.push({ ad: "merkez", gelen: [K, c], cikis: c, yon, kesikli: sanalUzanti(c, yon) });
  }
  if (ayna && v.isinlar.egrilik) {
    const A = { x: X0 - 2 * r.f * olcek, y: Y0 };
    const isin = nisanliIsin(A, "egrilik", false);
    if (isin) isinlar.push(isin);
  }
  return { X0, Y0, olcek, K, L, goruntu, isinlar, sonuc: r, ayna, fA, hb };
}

// ── Çizim ──────────────────────────────────────────────────────────────────

function cizgi(ctx: CanvasRenderingContext2D, a: P, b: P) {
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
}

function okBasi(ctx: CanvasRenderingContext2D, uc: P, aci: number, boy: number) {
  ctx.beginPath();
  ctx.moveTo(uc.x, uc.y);
  ctx.lineTo(uc.x - boy * Math.cos(aci - 0.4), uc.y - boy * Math.sin(aci - 0.4));
  ctx.lineTo(uc.x - boy * Math.cos(aci + 0.4), uc.y - boy * Math.sin(aci + 0.4));
  ctx.closePath();
  ctx.fill();
}

/** Işın üzerinde (a→b) orta noktada yön oku. */
function araOk(ctx: CanvasRenderingContext2D, a: P, b: P, t = 0.5) {
  if (Math.hypot(b.x - a.x, b.y - a.y) < 18) return;
  const aci = Math.atan2(b.y - a.y, b.x - a.x);
  okBasi(ctx, { x: a.x + (b.x - a.x) * t + Math.cos(aci) * 4, y: a.y + (b.y - a.y) * t + Math.sin(aci) * 4 }, aci, 8);
}

function okluDikey(ctx: CanvasRenderingContext2D, taban: P, uc: P, kesik: boolean) {
  ctx.save();
  ctx.lineWidth = Math.max(1.6, ctx.lineWidth * 1.3);
  ctx.setLineDash(kesik ? [6, 4] : []);
  const yon = Math.sign(uc.y - taban.y) || -1;
  cizgi(ctx, taban, { x: uc.x, y: uc.y - yon * 6 });
  ctx.setLineDash([]);
  okBasi(ctx, uc, yon > 0 ? Math.PI / 2 : -Math.PI / 2, 10);
  ctx.restore();
}

/** Ayna/mercek gövdesi (asal eksen üstünde, X0'da). */
function elemanCiz(ctx: CanvasRenderingContext2D, tur: OptikVerisi["tur"], X0: number, Y0: number, H: number) {
  const ust = Y0 - H / 2, alt = Y0 + H / 2;
  ctx.save();
  ctx.lineWidth = Math.max(1.6, ctx.lineWidth * 1.2);
  if (tur === "inceMercek") {
    const b = Math.max(6, H * 0.07);
    ctx.beginPath();
    ctx.moveTo(X0, ust);
    ctx.quadraticCurveTo(X0 - b * 2, Y0, X0, alt);
    ctx.quadraticCurveTo(X0 + b * 2, Y0, X0, ust);
    ctx.stroke();
  } else if (tur === "kalinMercek") {
    const b = Math.max(7, H * 0.08);
    ctx.beginPath();
    ctx.moveTo(X0 - b, ust);
    ctx.lineTo(X0 + b, ust);
    ctx.quadraticCurveTo(X0 + b * 0.1 - b, Y0, X0 + b, alt);
    ctx.lineTo(X0 - b, alt);
    ctx.quadraticCurveTo(X0 - b * 0.1 + b, Y0, X0 - b, ust);
    ctx.closePath();
    ctx.stroke();
  } else {
    // Çukur: kenarlar cisme (sola) doğru kıvrık; tümsek: kenarlar arkaya (sağa).
    const b = Math.max(6, H * 0.08) * (tur === "cukurAyna" ? -1 : 1);
    ctx.beginPath();
    ctx.moveTo(X0 + b, ust);
    ctx.quadraticCurveTo(X0 - b, Y0, X0 + b, alt);
    ctx.stroke();
    // Arka yüz taraması (sağda)
    ctx.lineWidth = 1;
    const adet = Math.max(4, Math.floor(H / 10));
    for (let i = 0; i <= adet; i += 1) {
      const t = i / adet;
      const u = 1 - t;
      const px = u * u * (X0 + b) + 2 * u * t * (X0 - b) + t * t * (X0 + b);
      const py = u * u * ust + 2 * u * t * Y0 + t * t * alt;
      cizgi(ctx, { x: px, y: py }, { x: px + 8, y: py - 6 });
    }
  }
  ctx.restore();
}

export function optikCiz(ctx: CanvasRenderingContext2D, s: FizikSekli) {
  const v = s.optik && optikVerisiGecerliMi(s.optik) ? s.optik : varsayilanOptik();
  const y = optikYerlesimi(s, v);
  const { X0, Y0, olcek, K, L, goruntu, isinlar, sonuc, ayna, fA } = y;
  ctx.save();
  ctx.strokeStyle = MUREKKEP;
  ctx.fillStyle = MUREKKEP;
  ctx.lineWidth = Math.max(1, s.kalinlik * 0.7);
  ctx.lineCap = "round";
  // Asal eksen
  cizgi(ctx, { x: s.x, y: Y0 }, { x: s.x + s.w, y: Y0 });
  // Ayna/mercek
  elemanCiz(ctx, v.tur, X0, Y0, Math.min(s.h - 8, Math.max(y.hb * 2.6, s.h * 0.7)));
  // İşaretler: 2F(M) – F – O(T) – F – 2F(M)
  if (v.isaretler) {
    const adlar = ayna ? ["M", "F", "T", "F", "M"] : ["2F", "F", "O", "F", "2F"];
    [-2, -1, 0, 1, 2].forEach((k, i) => {
      const px = X0 + k * fA * olcek;
      if (px < s.x + 2 || px > s.x + s.w - 2) return;
      if (k !== 0) {
        ctx.beginPath(); ctx.arc(px, Y0, 2.6, 0, Math.PI * 2); ctx.fill();
      }
      fizikMetniCiz(ctx, adlar[i], px + (k === 0 ? 9 : 0), Y0 + 13, 14);
    });
  }
  // Işınlar (kutuya kırpılı)
  ctx.save();
  ctx.beginPath(); ctx.rect(s.x, s.y, s.w, s.h); ctx.clip();
  ctx.lineWidth = Math.max(1, s.kalinlik * 0.6);
  const uzak = (s.w + s.h) * 2;
  for (const isin of isinlar) {
    cizgi(ctx, isin.gelen[0], isin.gelen[1]);
    araOk(ctx, isin.gelen[0], isin.gelen[1], 0.55);
    const son = { x: isin.cikis.x + isin.yon.x * uzak, y: isin.cikis.y + isin.yon.y * uzak };
    cizgi(ctx, isin.cikis, son);
    // Çıkan ışının oku kutu içinde kalsın: 60 px ilerde.
    const okUc = { x: isin.cikis.x + isin.yon.x * 70, y: isin.cikis.y + isin.yon.y * 70 };
    araOk(ctx, isin.cikis, okUc, 0.8);
    ctx.save();
    ctx.setLineDash([5, 4]);
    for (const [a, b] of isin.kesikli) cizgi(ctx, a, b);
    ctx.restore();
  }
  ctx.restore();
  // Cisim KL
  okluDikey(ctx, L, K, false);
  fizikMetniCiz(ctx, "K", K.x - 10, K.y + 4, 15);
  // L (ve L') bir işaretle (2F, F, M…) çakışırsa daha aşağı yazılır.
  const isaretX = v.isaretler ? [-2, -1, 1, 2].map((k) => X0 + k * fA * olcek) : [];
  const altY = (px: number) => (isaretX.some((m) => Math.abs(m - px) < 16) ? Y0 + 29 : Y0 + 13);
  fizikMetniCiz(ctx, "L", L.x - 9, altY(L.x), 15);
  // Görüntü K'L' (sanal: kesikli)
  if (v.goruntu && goruntu && goruntu.x > s.x && goruntu.x < s.x + s.w && goruntu.y > s.y - 4 && goruntu.y < s.y + s.h + 4) {
    okluDikey(ctx, { x: goruntu.x, y: Y0 }, goruntu, !sonuc.gercek);
    fizikMetniCiz(ctx, "K'", goruntu.x + 12, goruntu.y + (goruntu.y < Y0 ? 4 : -4), 15);
    fizikMetniCiz(ctx, "L'", goruntu.x + 10, goruntu.y < Y0 ? altY(goruntu.x) : Y0 - 13, 15);
  }
  if (v.bilgi) {
    const metin = sonuc.sonsuz
      ? `d_o = ${sayiYaz(v.uzaklik)}, f = ${sayiYaz(sonuc.f)}: görüntü sonsuzda`
      : `d_o = ${sayiYaz(v.uzaklik)}   d_i = ${sayiYaz(sonuc.di)}   m = ${sayiYaz(sonuc.m)}\n${optikNitelik(v)}`;
    // Düz (asal eksenin üstündeki) görüntüde üst bölge dolu: yazı alta.
    const altta = !sonuc.sonsuz && sonuc.duz;
    fizikMetniCiz(ctx, metin, s.x + 4, altta ? s.y + s.h - 22 : s.y + 16 + (sonuc.sonsuz ? 0 : 8), 13, "sol");
    const disarida = goruntu && (goruntu.x < s.x || goruntu.x > s.x + s.w || goruntu.y < s.y - 4 || goruntu.y > s.y + s.h + 4);
    if (disarida) fizikMetniCiz(ctx, "(görüntü çizim alanının dışında)", s.x + 4, altta ? s.y + s.h - 46 : s.y + s.h - 10, 12, "sol");
  }
  ctx.restore();
}
