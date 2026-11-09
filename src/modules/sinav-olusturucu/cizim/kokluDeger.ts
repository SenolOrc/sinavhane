// Köklü değer girişi ve yazımı: "5√2", "√3/2", "2√3/3", "sqrt(8)", "3 kök 2", "2+√3", "1,5".
//
//  - `kokluCoz`: yazıyı sayıya çevirir (geometri/fizik hesapları sayıyla çalışır).
//  - `kokluYaz`: bir sayı TAM bir köklü değerse (k√n/m) onu yazar: 7,0711 → "5√2".
//  - `kokluEtiket`: yazıdan şekle yazılacak metni üretir ("√12" → "2√3").
//
// Çözücü `ifade.ts` (eval yok). Yalnız sayı/işlem/kök karakterlerine izin verilir; harf (x, y…) reddedilir.
import { derle } from "./ifade";

const IZINLI = /^[0-9.,+\-*/()\s√×÷−–]*$/;

/** Klavyede √ olmayanlar için: "sqrt", "kök", "kok", "kare kök" → √ */
function normalle(metin: string): string {
  return metin
    .replace(/kare\s*k[öo]k/gi, "√")
    .replace(/sqrt/gi, "√")
    .replace(/k[öo]k/gi, "√")
    .replace(/\s+/g, " ")
    .trim();
}

/** Yazı → sayı. Çözülemezse undefined. √ yoksa Türkçe ondalık virgül de kabul edilir. */
export function kokluCoz(metin: string): number | undefined {
  const t = normalle(metin);
  if (!t || t.length > 40 || !IZINLI.test(t)) return undefined;
  const d = derle(t);
  if (!d.ok) return undefined;
  let n: number;
  try { n = d.f({}); } catch { return undefined; }
  return Number.isFinite(n) ? n : undefined;
}

/** Yazıda kök işareti var mı (köklü giriş mi)? */
export const kokluMu = (metin: string): boolean => /√|sqrt|k[öo]k/i.test(metin);

const KARESIZ: number[] = [];
for (let n = 2; n <= 99; n += 1) {
  let karesiz = true;
  for (let k = 2; k * k <= n; k += 1) if (n % (k * k) === 0) { karesiz = false; break; }
  if (karesiz) KARESIZ.push(n);
}
const ebob = (a: number, b: number): number => (b === 0 ? a : ebob(b, a % b));

/**
 * x tam bir k√n/m değeriyse (n karesiz, k ≤ 200, m ≤ 9) yazısını döndürür, değilse null.
 * Temiz ondalıklar (7, 2,5, 0,35) kök sayılmaz: önce sayı mı diye bakılır.
 */
export function kokluYaz(x: number): string | null {
  if (!Number.isFinite(x) || x === 0) return null;
  const ab = Math.abs(x);
  if (ab > 1e4) return null;
  if (Math.abs(ab - Math.round(ab * 1000) / 1000) < 1e-9) return null; // temiz ondalık
  const tol = 1e-9 * Math.max(1, ab);
  for (let m = 1; m <= 9; m += 1) {
    for (const n of KARESIZ) {
      const kok = Math.sqrt(n);
      const k = Math.round((ab * m) / kok);
      if (k < 1 || k > 200) continue;
      if (Math.abs((k * kok) / m - ab) > tol) continue;
      if (ebob(k, m) !== 1) continue;
      const pay = `${k === 1 ? "" : k}√${n}`;
      return `${x < 0 ? "−" : ""}${m === 1 ? pay : `${pay}/${m}`}`;
    }
  }
  return null;
}

/** Yazıdan şekle yazılacak metin: tam köklü değerse sadeleştirilmiş, değilse yazılanın temizlenmişi. */
export function kokluEtiket(metin: string): string {
  const n = kokluCoz(metin);
  if (n !== undefined) {
    const k = kokluYaz(n);
    if (k) return k;
  }
  return normalle(metin).replace(/\*/g, "·");
}
