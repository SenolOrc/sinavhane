// Fizik şekilleri için ortak çizim yardımcıları (ok, kesik çizgi, zemin, yazı, köklü yazım kipi).
import { fizikMetniCiz } from "../fizik";
import { kokluYaz } from "../kokluDeger";
import { ayarMantik, type CografyaVerisi } from "./sema";

export type Kutu = { x: number; y: number; w: number; h: number };
export const D2R = Math.PI / 180;
export const GRI = "#ececec";

/** Çizim sırasında açık: tam köklü değerler (5√2, 2√3/3) ondalık yerine √ ile yazılır. */
let kokluModu = false;
/** Köklü giriş yapılmışsa ("10√2") ya da "Köklü değerleri √ ile yaz" açıksa köklü yazım devrede. */
export function kokluAcikMi(v: CografyaVerisi): boolean {
  if (ayarMantik(v, "kokYaz")) return true;
  return Object.values(v.ayar).some((d) => typeof d === "string" && d.includes("√"));
}
export function kokluIle<T>(v: CografyaVerisi, f: () => T): T {
  const onceki = kokluModu;
  kokluModu = kokluAcikMi(v);
  try { return f(); } finally { kokluModu = onceki; }
}

/** 1 ondalık, virgüllü, gereksiz sıfırsız. Köklü kip açıksa tam köklü değer √ ile yazılır. */
export const sayiYaz = (n: number, ond = 1) => {
  if (kokluModu) { const k = kokluYaz(n); if (k) return k; }
  return String(Number(n.toFixed(ond))).replace(".", ",");
};

export function ok(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, s = 7) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy);
  if (L < 0.5) return;
  const ux = dx / L, uy = dy / L, bas = Math.min(s, L * 0.6);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1 - ux * bas * 0.6, y1 - uy * bas * 0.6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - ux * bas - uy * bas * 0.42, y1 - uy * bas + ux * bas * 0.42);
  ctx.lineTo(x1 - ux * bas + uy * bas * 0.42, y1 - uy * bas - ux * bas * 0.42);
  ctx.closePath();
  ctx.save(); ctx.fillStyle = ctx.strokeStyle as string; ctx.fill(); ctx.restore();
}
export const cizgi = (ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) => { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); };
export function kesik(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, d = [4, 3]) {
  ctx.save(); ctx.setLineDash(d); cizgi(ctx, x0, y0, x1, y1); ctx.restore();
}
export function zemin(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, boy = 7) {
  cizgi(ctx, x0, y, x1, y);
  ctx.save(); ctx.lineWidth = Math.max(0.7, ctx.lineWidth * 0.5);
  for (let x = x0 + 4; x < x1; x += 8) cizgi(ctx, x, y, x - boy * 0.7, y + boy);
  ctx.restore();
}
/** Uca göre yazı: ok yönüne bakan tarafa yerleşir. */
export function ucYazi(ctx: CanvasRenderingContext2D, t: string, x: number, y: number, ux: number, uy: number, punto: number) {
  if (!t) return;
  if (ux > 0.35) fizikMetniCiz(ctx, t, x + 5, y + uy * 4, punto, "sol");
  else if (ux < -0.35) fizikMetniCiz(ctx, t, x - 5, y + uy * 4, punto, "sag");
  else fizikMetniCiz(ctx, t, x + 7, y + (uy >= 0 ? 1 : -1) * (punto * 0.35), punto, "sol");
}
export const vecAd = (a: string) => (a.includes("vec(") || a.includes("\\") ? a : `vec(${a})`);
export const bol = (m: string) => m.split(",").map((t) => t.trim());
export function puntoOlc(k: Kutu, taban = 14) { return Math.max(11, Math.min(taban + 1, k.w / 24)); }

