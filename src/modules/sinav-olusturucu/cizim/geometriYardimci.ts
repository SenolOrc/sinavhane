// Geometri çizimlerinin ortak küçük yardımcıları (açı yayı, dik açı karesi, eş kenar
// tırtığı, köşe adı). `geometriSekilleri.ts` ve `geometriEk.ts` ikisi de kullanır;
// ayrı dosyada durmaları iki dosya arasında döngüsel içe aktarmayı önler.

import type { Nokta } from "./tipler";
import { fizikMetniCiz } from "./fizik";

const TAM = Math.PI * 2;

export function dogru(ctx: CanvasRenderingContext2D, a: Nokta, b: Nokta) {
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
}

export function ince<T>(ctx: CanvasRenderingContext2D, k: number, ciz: () => T): T {
  ctx.save();
  ctx.lineWidth = Math.max(0.9, ctx.lineWidth * k);
  const r = ciz();
  ctx.restore();
  return r;
}

export const aciNormu = (a: number) => { let v = a % TAM; if (v <= -Math.PI) v += TAM; if (v > Math.PI) v -= TAM; return v; };

/** Köşede (V) iki ışın (P1, P2) arasındaki iç açının yayı; `adet` kadar iç içe yay. Yayın orta açısını döndürür. */
export function aciYayiCiz(ctx: CanvasRenderingContext2D, V: Nokta, P1: Nokta, P2: Nokta, r: number, adet = 1): number {
  const t1 = Math.atan2(P1.y - V.y, P1.x - V.x);
  const t2 = Math.atan2(P2.y - V.y, P2.x - V.x);
  const fark = aciNormu(t2 - t1);
  ince(ctx, 0.85, () => {
    for (let i = 0; i < Math.max(1, adet); i += 1) {
      ctx.beginPath();
      ctx.arc(V.x, V.y, r + i * 4, t1, t1 + fark, fark < 0);
      ctx.stroke();
    }
  });
  return t1 + fark / 2;
}

/** Köşede dik açı işareti: iki kenar boyunca küçük kare. */
export function dikAciIsaretiCiz(ctx: CanvasRenderingContext2D, V: Nokta, P1: Nokta, P2: Nokta, boy: number) {
  const l1 = Math.hypot(P1.x - V.x, P1.y - V.y) || 1;
  const l2 = Math.hypot(P2.x - V.x, P2.y - V.y) || 1;
  const u = { x: ((P1.x - V.x) / l1) * boy, y: ((P1.y - V.y) / l1) * boy };
  const v = { x: ((P2.x - V.x) / l2) * boy, y: ((P2.y - V.y) / l2) * boy };
  ince(ctx, 0.85, () => {
    ctx.beginPath();
    ctx.moveTo(V.x + u.x, V.y + u.y);
    ctx.lineTo(V.x + u.x + v.x, V.y + u.y + v.y);
    ctx.lineTo(V.x + v.x, V.y + v.y);
    ctx.stroke();
  });
}

/** Doğru parçası ortasına eş kenar işareti (tırtık): `adet` kadar kısa dik çizgi. */
export function tirtikCiz(ctx: CanvasRenderingContext2D, a: Nokta, b: Nokta, adet: number, boy = 6) {
  const L = Math.hypot(b.x - a.x, b.y - a.y);
  if (L < 1e-6 || adet < 1) return;
  const ux = (b.x - a.x) / L, uy = (b.y - a.y) / L;
  const o = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const aralik = 4;
  ince(ctx, 0.9, () => {
    for (let i = 0; i < adet; i += 1) {
      const t = (i - (adet - 1) / 2) * aralik;
      const cx = o.x + ux * t, cy = o.y + uy * t;
      // Hafif eğik "/" tırtık (ders kitabı gösterimi): dikten biraz yatık.
      ctx.beginPath();
      ctx.moveTo(cx - uy * boy + ux * 2, cy + ux * boy + uy * 2);
      ctx.lineTo(cx + uy * boy - ux * 2, cy - ux * boy - uy * 2);
      ctx.stroke();
    }
  });
}

/** Köşe adı / etiketi: `merkez` noktasından köşeye doğru uzaklaşan yönde `uzak` kadar dışarıda. */
export function koseAdi(ctx: CanvasRenderingContext2D, ad: string, kose: Nokta, merkez: Nokta, uzak: number, punto = 18) {
  const t = ad.trim();
  if (!t) return;
  const dx = kose.x - merkez.x, dy = kose.y - merkez.y;
  const L = Math.hypot(dx, dy) || 1;
  fizikMetniCiz(ctx, t, kose.x + (dx / L) * uzak, kose.y + (dy / L) * uzak, punto);
}

/** Dolu küçük nokta. */
export function noktaCiz(ctx: CanvasRenderingContext2D, p: Nokta, r = 2.6) {
  ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAM); ctx.fill();
}

/** Daire dilimini (O merkezli, t1'den t1+fark'a) eğik çizgilerle tarar. */
export function dilimTara(ctx: CanvasRenderingContext2D, O: Nokta, R: number, t1: number, fark: number) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(O.x, O.y);
  ctx.arc(O.x, O.y, R, t1, t1 + fark, fark < 0);
  ctx.closePath();
  ctx.clip();
  ctx.lineWidth = Math.max(0.8, ctx.lineWidth * 0.5);
  ctx.beginPath();
  for (let c = -2 * R; c <= 2 * R; c += 7) { ctx.moveTo(O.x + c - R, O.y + R); ctx.lineTo(O.x + c + R, O.y - R); }
  ctx.stroke();
  ctx.restore();
}
