// Kimya şekilleri: laboratuvar malzemeleri, Bohr atomu, Lewis/molekül yapıları,
// periyodik tablo. Hepsi tek kutuya (x, y, w, h) çizilir, React'siz ve testlenebilir.
//
// Laboratuvar malzemesinin sıvısı `dolgu` (renk) + `seviye` (0–1) ile gösterilir.
// Veri taşıyan şekiller (atom, molekül, periyodik tablo) `kimya` alanını kullanır.

import { MUREKKEP } from "./sabitler";
import { fizikMetniCiz } from "./fizik";
import type { GrafikEgrisi, GrafikVerisi, KimyaVerisi, OrganikYanGrup, Sekil } from "./tipler";

type FizikSekli = Extract<Sekil, { tur: "fizik" }>;
type Kutu = { x: number; y: number; w: number; h: number };

// ═══════════════════════════════════════════════════════════════════════════
// Laboratuvar malzemeleri
// ═══════════════════════════════════════════════════════════════════════════

export const KIMYA_LAB_NESNELERI = [
  "beher", "erlenmayer", "balonJoje", "mezur", "denemeTupu", "buret", "ayirmaHunisi", "bunsenBeki", "huni", "damitma", "damlalik", "gazKabi",
] as const;
export type KimyaLabNesnesi = (typeof KIMYA_LAB_NESNELERI)[number];

export const kimyaLabMi = (nesne: string): nesne is KimyaLabNesnesi => (KIMYA_LAB_NESNELERI as readonly string[]).includes(nesne);

/** Sıvı gösterilebilen kaplar (panelde "Sıvı seviyesi" çıkar). */
export const kimyaSiviliMi = (nesne: string) => kimyaLabMi(nesne) && nesne !== "bunsenBeki";

export const KIMYA_LAB_TANIMLARI: Record<KimyaLabNesnesi, { ad: string; w: number; h: number; ipucu: string }> = {
  beher: { ad: "Beher", w: 90, h: 110, ipucu: "Dereceli beher. Dolgu rengi seçerseniz sıvı görünür; seviye panelden ayarlanır" },
  erlenmayer: { ad: "Erlenmayer", w: 100, h: 120, ipucu: "Konik erlenmayer" },
  balonJoje: { ad: "Balon joje", w: 100, h: 150, ipucu: "Boyunlu balon joje (hacim ölçme)" },
  mezur: { ad: "Mezür", w: 50, h: 150, ipucu: "Dereceli silindir" },
  denemeTupu: { ad: "Deney tüpü", w: 34, h: 120, ipucu: "Yuvarlak tabanlı deney tüpü" },
  buret: { ad: "Büret", w: 50, h: 220, ipucu: "Musluklu büret (titrasyon)" },
  ayirmaHunisi: { ad: "Ayırma hunisi", w: 100, h: 150, ipucu: "Musluklu, kapaklı ayırma hunisi" },
  bunsenBeki: { ad: "Bunsen beki", w: 50, h: 120, ipucu: "Alevli Bunsen beki" },
  huni: { ad: "Huni", w: 100, h: 100, ipucu: "Süzme hunisi" },
  damitma: { ad: "Damıtma düzeneği", w: 360, h: 200, ipucu: "Balon, termometre, soğutucu ve toplama kabı hazır çizili" },
  damlalik: { ad: "Damlalık", w: 40, h: 150, ipucu: "Lastik başlıklı cam damlalık; Dolgu rengiyle sıvı, seviye panelden" },
  gazKabi: { ad: "Gaz kabı (piston)", w: 130, h: 160, ipucu: "Pistonlu gaz kabı; gaz taneciklerini gösterir. Piston konumu panelden (gaz yüksekliği)" },
};

const cl = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function cizgi(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}

/** Kabın içini seviyeye kadar boyar; yüzeye ince çizgi çeker. `yol` kabın iç yolunu kurar. */
function sivi(ctx: CanvasRenderingContext2D, s: FizikSekli, yol: () => void, kutu: Kutu = s) {
  if (!s.dolgu) return;
  const seviye = cl(s.seviye ?? 0.5, 0.05, 1);
  const ly = kutu.y + kutu.h * (1 - seviye);
  ctx.save();
  yol();
  ctx.clip();
  ctx.fillStyle = s.dolgu;
  ctx.fillRect(kutu.x - 4, ly, kutu.w + 8, kutu.h - (ly - kutu.y) + 4);
  ctx.lineWidth = Math.max(1, ctx.lineWidth * 0.7);
  cizgi(ctx, kutu.x - 4, ly, kutu.x + kutu.w + 4, ly);
  ctx.restore();
  ctx.fillStyle = MUREKKEP;
}

/** Sağ kenardan içeri doğru derece çizgileri. */
function dereceler(ctx: CanvasRenderingContext2D, xKenar: number, y0: number, y1: number, adet: number, uzun: number, kisa: number, ice = -1) {
  ctx.save();
  ctx.lineWidth = Math.max(1, ctx.lineWidth * 0.6);
  for (let i = 0; i < adet; i += 1) {
    const ly = adet === 1 ? y0 : y0 + ((y1 - y0) * i) / (adet - 1);
    cizgi(ctx, xKenar, ly, xKenar + ice * (i % 2 === 0 ? uzun : kisa), ly);
  }
  ctx.restore();
}

function beherCiz(ctx: CanvasRenderingContext2D, s: FizikSekli) {
  const { x, y, w, h } = s;
  const r = Math.max(1, Math.min(8, w * 0.1, h * 0.1));
  const yol = () => {
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x, y + h - r); ctx.arcTo(x, y + h, x + r, y + h, r);
    ctx.lineTo(x + w - r, y + h); ctx.arcTo(x + w, y + h, x + w, y + h - r, r); ctx.lineTo(x + w, y);
  };
  sivi(ctx, s, yol);
  yol(); ctx.stroke();
  // Ölçeklenince bozulmasın: ağız ve derece çizgileri KUTU boyuyla değil, sınırlı mutlak ölçüyle (en çok 8 / 20 / 11 px)
  cizgi(ctx, x, y, x - Math.min(8, w * 0.07), y - Math.min(5, h * 0.03)); // ağız
  const adet = Math.max(3, Math.min(9, Math.round(h / 24)));
  dereceler(ctx, x + w, y + h * 0.25, y + h * 0.85, adet, Math.min(20, w * 0.2), Math.min(11, w * 0.11));
}

function erlenmayerCiz(ctx: CanvasRenderingContext2D, s: FizikSekli) {
  const { x, y, w, h } = s;
  const cx = x + w / 2;
  const nw = w * 0.15;
  const yol = () => {
    ctx.beginPath();
    ctx.moveTo(cx - nw, y); ctx.lineTo(cx - nw, y + h * 0.34); ctx.lineTo(x, y + h); ctx.lineTo(x + w, y + h);
    ctx.lineTo(cx + nw, y + h * 0.34); ctx.lineTo(cx + nw, y);
  };
  sivi(ctx, s, yol);
  yol(); ctx.stroke();
  cizgi(ctx, cx - nw - 3, y, cx + nw + 3, y);
}

function balonJojeCiz(ctx: CanvasRenderingContext2D, s: FizikSekli) {
  const { x, y, w, h } = s;
  const cx = x + w / 2;
  const r = Math.min(w / 2, h * 0.6);
  const nw = Math.min(w * 0.11, r * 0.5);
  const cy2 = y + h - r;
  const dy = Math.sqrt(Math.max(0, r * r - nw * nw));
  const ny = cy2 - dy;
  const aR = Math.atan2(-dy, nw);
  const aL = Math.atan2(-dy, -nw) + Math.PI * 2;
  const yol = () => {
    ctx.beginPath();
    ctx.moveTo(cx - nw, y); ctx.lineTo(cx - nw, ny);
    ctx.arc(cx, cy2, r, aL, aR, true);
    ctx.lineTo(cx + nw, y);
  };
  sivi(ctx, s, yol);
  yol(); ctx.stroke();
  cizgi(ctx, cx - nw - 2, y, cx + nw + 2, y);
  cizgi(ctx, cx - nw, y + (ny - y) * 0.45, cx + nw, y + (ny - y) * 0.45); // hacim çizgisi
}

function mezurCiz(ctx: CanvasRenderingContext2D, s: FizikSekli) {
  const { x, y, w, h } = s;
  const cx = x + w / 2;
  const tl = cx - w * 0.22, tr = cx + w * 0.22, yb = y + h * 0.93;
  const yol = () => {
    ctx.beginPath();
    ctx.moveTo(tl, y); ctx.lineTo(tl, yb); ctx.lineTo(x + w * 0.04, yb); ctx.lineTo(x, y + h); ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w * 0.96, yb); ctx.lineTo(tr, yb); ctx.lineTo(tr, y);
  };
  sivi(ctx, s, yol);
  yol(); ctx.stroke();
  cizgi(ctx, tr, y, tr + w * 0.08, y - h * 0.02); // gaga
  dereceler(ctx, tr, y + h * 0.12, yb - 8, 9, w * 0.2, w * 0.11);
}

function denemeTupuCiz(ctx: CanvasRenderingContext2D, s: FizikSekli) {
  const { x, y, w, h } = s;
  const r = w / 2;
  const yol = () => {
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x, y + h - r); ctx.arc(x + r, y + h - r, r, Math.PI, 0, true); ctx.lineTo(x + w, y);
  };
  sivi(ctx, s, yol);
  yol(); ctx.stroke();
  cizgi(ctx, x - 3, y, x + w + 3, y);
}

function buretCiz(ctx: CanvasRenderingContext2D, s: FizikSekli) {
  const { x, y, w, h } = s;
  const cx = x + w / 2;
  const tw = w * 0.3;
  const yb = y + h * 0.8;
  const yol = () => {
    ctx.beginPath();
    ctx.moveTo(cx - tw / 2, y); ctx.lineTo(cx - tw / 2, yb); ctx.lineTo(cx - tw * 0.15, yb + h * 0.04);
    ctx.lineTo(cx - tw * 0.15, y + h * 0.9); ctx.lineTo(cx - tw * 0.03, y + h);
    ctx.lineTo(cx + tw * 0.03, y + h); ctx.lineTo(cx + tw * 0.15, y + h * 0.9);
    ctx.lineTo(cx + tw * 0.15, yb + h * 0.04); ctx.lineTo(cx + tw / 2, yb); ctx.lineTo(cx + tw / 2, y);
  };
  sivi(ctx, s, yol);
  yol(); ctx.stroke();
  // musluk gövdesi ve kolu
  ctx.beginPath(); ctx.rect(cx - tw * 0.32, y + h * 0.835, tw * 0.64, h * 0.035); ctx.stroke();
  ctx.save(); ctx.lineWidth = ctx.lineWidth * 1.6; cizgi(ctx, cx + tw * 0.32, y + h * 0.852, x + w * 0.95, y + h * 0.852); ctx.restore();
  dereceler(ctx, cx + tw / 2, y + h * 0.08, y + h * 0.76, 18, tw * 0.5, tw * 0.28);
}

function ayirmaHunisiCiz(ctx: CanvasRenderingContext2D, s: FizikSekli) {
  const { x, y, w, h } = s;
  const cx = x + w / 2;
  const nw = w * 0.07, sw = w * 0.06;
  const yol = () => {
    ctx.beginPath();
    ctx.moveTo(cx - nw, y + h * 0.1); ctx.lineTo(cx + nw, y + h * 0.1); ctx.lineTo(cx + nw, y + h * 0.2);
    ctx.bezierCurveTo(cx + nw, y + h * 0.3, x + w, y + h * 0.35, x + w, y + h * 0.55);
    ctx.bezierCurveTo(x + w, y + h * 0.72, cx + sw + 6, y + h * 0.74, cx + sw, y + h * 0.84);
    ctx.lineTo(cx + sw, y + h); ctx.lineTo(cx - sw, y + h); ctx.lineTo(cx - sw, y + h * 0.84);
    ctx.bezierCurveTo(cx - sw - 6, y + h * 0.74, x, y + h * 0.72, x, y + h * 0.55);
    ctx.bezierCurveTo(x, y + h * 0.35, cx - nw, y + h * 0.3, cx - nw, y + h * 0.2);
    ctx.closePath();
  };
  sivi(ctx, s, yol);
  yol(); ctx.stroke();
  // kapak
  ctx.beginPath(); ctx.moveTo(cx - nw * 1.4, y); ctx.lineTo(cx + nw * 1.4, y); ctx.lineTo(cx + nw, y + h * 0.1); ctx.lineTo(cx - nw, y + h * 0.1); ctx.closePath(); ctx.stroke();
  // musluk
  cizgi(ctx, cx - sw * 1.5, y + h * 0.89, cx + sw * 1.5, y + h * 0.89);
  ctx.save(); ctx.lineWidth = ctx.lineWidth * 1.6; cizgi(ctx, cx + sw * 1.5, y + h * 0.89, x + w * 0.82, y + h * 0.89); ctx.restore();
}

function bunsenCiz(ctx: CanvasRenderingContext2D, s: FizikSekli) {
  const { x, y, w, h } = s;
  const cx = x + w / 2;
  const bw = w * 0.11;
  // alev
  const alev = (k: number, ust: number) => {
    ctx.beginPath();
    ctx.moveTo(cx, y + ust);
    ctx.bezierCurveTo(cx + w * 0.32 * k, y + h * 0.13, cx + w * 0.18 * k, y + h * 0.28, cx, y + h * 0.3);
    ctx.bezierCurveTo(cx - w * 0.18 * k, y + h * 0.28, cx - w * 0.32 * k, y + h * 0.13, cx, y + ust);
    ctx.stroke();
  };
  alev(1, 0); alev(0.45, h * 0.12);
  // boru, hava halkası, taban
  ctx.beginPath(); ctx.rect(cx - bw, y + h * 0.3, bw * 2, h * 0.52); ctx.stroke();
  ctx.beginPath(); ctx.rect(cx - bw * 1.5, y + h * 0.6, bw * 3, h * 0.08); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - bw, y + h * 0.82); ctx.lineTo(cx - bw * 1.6, y + h * 0.9); ctx.lineTo(x, y + h * 0.92); ctx.lineTo(x, y + h);
  ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h * 0.92); ctx.lineTo(cx + bw * 1.6, y + h * 0.9); ctx.lineTo(cx + bw, y + h * 0.82);
  ctx.stroke();
}

function huniCiz(ctx: CanvasRenderingContext2D, s: FizikSekli) {
  const { x, y, w, h } = s;
  const cx = x + w / 2;
  const sw = w * 0.07;
  const yol = () => {
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(cx - sw, y + h * 0.52); ctx.lineTo(cx - sw, y + h); ctx.lineTo(cx + sw, y + h);
    ctx.lineTo(cx + sw, y + h * 0.52); ctx.lineTo(x + w, y);
  };
  sivi(ctx, s, yol);
  yol(); ctx.stroke();
  cizgi(ctx, x - 3, y, x + w + 3, y);
}

function damitmaCiz(ctx: CanvasRenderingContext2D, s: FizikSekli) {
  const { x, y, w, h } = s;
  const X = (f: number) => x + w * f;
  const Y = (f: number) => y + h * f;
  // Balon (yuvarlak tabanlı) + boyun
  const fx = X(0.16), fy = Y(0.55), fr = w * 0.1, nh = w * 0.026;
  const dy = Math.sqrt(fr * fr - nh * nh);
  const aR = Math.atan2(-dy, nh), aL = Math.atan2(-dy, -nh) + Math.PI * 2;
  const balon = () => {
    ctx.beginPath();
    ctx.moveTo(fx - nh, Y(0.18)); ctx.lineTo(fx - nh, fy - dy);
    ctx.arc(fx, fy, fr, aL, aR, true);
    ctx.lineTo(fx + nh, Y(0.18));
  };
  sivi(ctx, s, balon, { x: fx - fr, y: fy - fr, w: fr * 2, h: fr * 2 });
  balon(); ctx.stroke();
  cizgi(ctx, fx - nh - 3, Y(0.18), fx + nh + 3, Y(0.18));
  // termometre
  ctx.beginPath(); ctx.rect(fx - 3, Y(0.04), 6, Y(0.5) - Y(0.04)); ctx.stroke();
  ctx.beginPath(); ctx.arc(fx, Y(0.5) + 3, 4, 0, Math.PI * 2); ctx.fill();
  // yan kol → soğutucu
  const bas = { x: fx + nh, y: Y(0.24) };
  const ux0 = X(0.34), uy0 = Y(0.3);
  cizgi(ctx, bas.x, bas.y, ux0, uy0);
  cizgi(ctx, bas.x, bas.y + 7, ux0, uy0 + 7);
  // soğutucu (eğik): dış ceket + iç boru
  const bx = X(0.34), by = Y(0.3), ex = X(0.78), ey = Y(0.5);
  const L = Math.hypot(ex - bx, ey - by);
  const ux = (ex - bx) / L, uy = (ey - by) / L, px = -uy, py = ux;
  const ceket = w * 0.032, ic = w * 0.011;
  const at = (o: number, t: number): [number, number] => [bx + ux * L * t + px * o, by + uy * L * t + py * o];
  const hat = (p: [number, number], q: [number, number]) => cizgi(ctx, p[0], p[1], q[0], q[1]);
  for (const o of [-ceket, ceket]) hat(at(o, 0.08), at(o, 0.92));
  hat(at(-ceket, 0.08), at(ceket, 0.08));
  hat(at(-ceket, 0.92), at(ceket, 0.92));
  for (const o of [-ic, ic]) hat(at(o, 0), at(o, 1));
  // su giriş (alt uç) ve çıkış (üst uç)
  hat(at(ceket, 0.18), at(ceket + 14, 0.18));
  hat(at(-ceket, 0.82), at(-ceket - 14, 0.82));
  // adaptör: soğutucudan toplama kabına
  const rx = X(0.855);
  cizgi(ctx, ex + px * ic, ey + py * ic, rx + 3, Y(0.64));
  cizgi(ctx, ex - px * ic, ey - py * ic, rx - 3, Y(0.64));
  // toplama kabı (erlenmayer)
  const kw = w * 0.1, kn = w * 0.035;
  const kap = () => {
    ctx.beginPath();
    ctx.moveTo(rx - kn, Y(0.6)); ctx.lineTo(rx - kn, Y(0.74)); ctx.lineTo(rx - kw, Y(0.98)); ctx.lineTo(rx + kw, Y(0.98));
    ctx.lineTo(rx + kn, Y(0.74)); ctx.lineTo(rx + kn, Y(0.6));
  };
  if (s.dolgu) {
    ctx.save(); kap(); ctx.clip(); ctx.fillStyle = s.dolgu; ctx.fillRect(rx - kw - 2, Y(0.88), kw * 2 + 4, Y(1) - Y(0.88) + 2); ctx.restore(); ctx.fillStyle = MUREKKEP;
  }
  kap(); ctx.stroke();
  // ısıtıcı
  ctx.beginPath(); ctx.rect(X(0.05), Y(0.78), w * 0.22, h * 0.07); ctx.stroke();
  for (let i = 0; i < 4; i += 1) cizgi(ctx, X(0.08) + i * w * 0.05, Y(0.85), X(0.08) + i * w * 0.05 - 5, Y(0.95));
}

function damlalikCiz(ctx: CanvasRenderingContext2D, s: FizikSekli) {
  const { x, y, w, h } = s;
  const cx = x + w / 2;
  // Lastik başlık (kalın gövdeli yuvarlak uçlu), boyun halkası, cam boru ve uçta sivrilme
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.14, y + h * 0.24);
  ctx.bezierCurveTo(cx - w * 0.52, y + h * 0.18, cx - w * 0.5, y, cx, y);
  ctx.bezierCurveTo(cx + w * 0.5, y, cx + w * 0.52, y + h * 0.18, cx + w * 0.14, y + h * 0.24);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath(); ctx.rect(cx - w * 0.3, y + h * 0.24, w * 0.6, h * 0.045); ctx.stroke();
  const ty = y + h * 0.285, ub = y + h * 0.78, uc = y + h * 0.92;
  const tw = w * 0.2;
  const yol = () => {
    ctx.beginPath();
    ctx.moveTo(cx - tw, ty); ctx.lineTo(cx - tw, ub); ctx.lineTo(cx - w * 0.04, uc); ctx.lineTo(cx + w * 0.04, uc); ctx.lineTo(cx + tw, ub); ctx.lineTo(cx + tw, ty);
  };
  sivi(ctx, s, yol, { x: cx - tw, y: ty, w: tw * 2, h: uc - ty });
  yol(); ctx.stroke();
  // Damla
  ctx.beginPath();
  ctx.moveTo(cx, y + h * 0.935);
  ctx.bezierCurveTo(cx - w * 0.1, y + h * 0.97, cx - w * 0.08, y + h, cx, y + h);
  ctx.bezierCurveTo(cx + w * 0.08, y + h, cx + w * 0.1, y + h * 0.97, cx, y + h * 0.935);
  ctx.closePath();
  ctx.fill();
}

/** Gaz taneciklerinin sabit (belge ile birlikte değişmeyen) yerleşimi: küçük doğrusal eşlenik üreteç. */
function sahteRastgele(tohum: number) {
  let d = tohum >>> 0;
  return () => { d = (Math.imul(d, 1664525) + 1013904223) >>> 0; return d / 4294967296; };
}

function gazKabiCiz(ctx: CanvasRenderingContext2D, s: FizikSekli) {
  const { x, y, w, h } = s;
  const cx = x + w / 2;
  const gaz = cl(s.seviye ?? 0.6, 0.2, 1);
  // Kap: üstü açık silindir
  ctx.beginPath(); ctx.moveTo(x, y + h * 0.12); ctx.lineTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h * 0.12); ctx.stroke();
  // Piston: gaz yüksekliğine göre
  const gazUst = y + h - (h * 0.88 - 8) * gaz - 8;
  ctx.save(); ctx.lineWidth = ctx.lineWidth * 1.6;
  cizgi(ctx, x + 2, gazUst, x + w - 2, gazUst);
  ctx.restore();
  cizgi(ctx, cx, gazUst, cx, y + 2);
  cizgi(ctx, cx - w * 0.22, y + 2, cx + w * 0.22, y + 2);
  // Gaz tanecikleri
  const r = sahteRastgele(7);
  const alan = { x: x + 8, y: gazUst + 8, w: w - 16, h: y + h - 8 - (gazUst + 8) };
  const adet = Math.max(6, Math.round((alan.w * alan.h) / 420));
  for (let i = 0; i < adet; i += 1) {
    ctx.beginPath(); ctx.arc(alan.x + r() * alan.w, alan.y + r() * Math.max(1, alan.h), 2.2, 0, Math.PI * 2); ctx.fill();
  }
}

/** Laboratuvar nesnesini çizer. */
export function kimyaLabCiz(ctx: CanvasRenderingContext2D, s: FizikSekli) {
  switch (s.nesne as KimyaLabNesnesi) {
    case "damlalik": return damlalikCiz(ctx, s);
    case "gazKabi": return gazKabiCiz(ctx, s);
    case "beher": return beherCiz(ctx, s);
    case "erlenmayer": return erlenmayerCiz(ctx, s);
    case "balonJoje": return balonJojeCiz(ctx, s);
    case "mezur": return mezurCiz(ctx, s);
    case "denemeTupu": return denemeTupuCiz(ctx, s);
    case "buret": return buretCiz(ctx, s);
    case "ayirmaHunisi": return ayirmaHunisiCiz(ctx, s);
    case "bunsenBeki": return bunsenCiz(ctx, s);
    case "huni": return huniCiz(ctx, s);
    case "damitma": return damitmaCiz(ctx, s);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Elementler
// ═══════════════════════════════════════════════════════════════════════════

export const ELEMENT_SEMBOLLERI = "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og".split(" ");

export const ELEMENT_KUTLELERI = [
  1.008, 4.0026, 6.94, 9.0122, 10.81, 12.011, 14.007, 15.999, 18.998, 20.18, 22.99, 24.305, 26.982, 28.085, 30.974, 32.06, 35.45, 39.948,
  39.098, 40.078, 44.956, 47.867, 50.942, 51.996, 54.938, 55.845, 58.933, 58.693, 63.546, 65.38, 69.723, 72.63, 74.922, 78.971, 79.904, 83.798,
  85.468, 87.62, 88.906, 91.224, 92.906, 95.95, 98, 101.07, 102.91, 106.42, 107.87, 112.41, 114.82, 118.71, 121.76, 127.6, 126.9, 131.29,
  132.91, 137.33, 138.91, 140.12, 140.91, 144.24, 145, 150.36, 151.96, 157.25, 158.93, 162.5, 164.93, 167.26, 168.93, 173.05, 174.97,
  178.49, 180.95, 183.84, 186.21, 190.23, 192.22, 195.08, 196.97, 200.59, 204.38, 207.2, 208.98, 209, 210, 222,
  223, 226, 227, 232.04, 231.04, 238.03, 237, 244, 243, 247, 247, 251, 252, 257, 258, 259, 266,
  267, 268, 269, 270, 277, 278, 281, 282, 285, 286, 289, 290, 293, 294, 294,
];

/**
 * Ortalama atom kütlesini yuvarlamanın doğada en bol bulunan izotopu VERMEDİĞİ
 * elementler (Z → en bol izotopun kütle numarası). Ör. Cu 63,546 → 64 değil
 * ⁶³Cu; Br 79,904 → 80 değil ⁷⁹Br (⁶⁴Cu ve ⁸⁰Br radyoaktif, doğada yok).
 * Z = 1–83 aralığındaki tüm elementler doğal izotop bolluklarıyla (IUPAC)
 * karşılaştırıldı; burada OLMAYAN Z'lerde yuvarlanmış kütle zaten en bol
 * izotoptur. Z ≥ 84 ile Tc (43) ve Pm (61) için tablodaki tam sayı (uzun
 * ömürlü izotop) kullanılır.
 */
const EN_BOL_KUTLE_NO: Record<number, number> = {
  28: 58, 29: 63, 30: 64, 31: 69, 32: 74, 34: 80, 35: 79, 40: 90, 42: 98, 44: 102, 47: 107, 48: 114, 50: 120, 51: 121,
  52: 130, 54: 132, 56: 138, 60: 142, 62: 152, 63: 153, 64: 158, 66: 164, 68: 166, 70: 174, 72: 180, 75: 187, 76: 192,
  77: 193, 80: 202, 81: 205, 82: 208,
};

/** Atom çiziminde varsayılan kütle numarası: doğada en bol bulunan izotop. */
export function enBolKutleNumarasi(z: number): number {
  return EN_BOL_KUTLE_NO[z] ?? Math.round(ELEMENT_KUTLELERI[z - 1] ?? z);
}

/** Elementin tablodaki konumu: satır 0–6 (periyot−1), sütun 0–17 (grup−1). İç geçiş (f) elementleri 8. ve 9. satırda. */
export function elementKonumu(z: number): { satir: number; sutun: number } {
  if (z === 1) return { satir: 0, sutun: 0 };
  if (z === 2) return { satir: 0, sutun: 17 };
  if (z <= 4) return { satir: 1, sutun: z - 3 };
  if (z <= 10) return { satir: 1, sutun: 12 + (z - 5) };
  if (z <= 12) return { satir: 2, sutun: z - 11 };
  if (z <= 18) return { satir: 2, sutun: 12 + (z - 13) };
  if (z <= 36) return { satir: 3, sutun: z - 19 };
  if (z <= 54) return { satir: 4, sutun: z - 37 };
  if (z <= 57) return { satir: 5, sutun: z - 55 }; // Cs, Ba, La
  if (z <= 71) return { satir: 8, sutun: 3 + (z - 58) }; // Ce–Lu
  if (z <= 86) return { satir: 5, sutun: 3 + (z - 72) };
  if (z <= 89) return { satir: 6, sutun: z - 87 }; // Fr, Ra, Ac
  if (z <= 103) return { satir: 9, sutun: 3 + (z - 90) }; // Th–Lr
  return { satir: 6, sutun: 3 + (z - 104) };
}

/** "H, O, Na" · "1,8,11" · "3-10" yazımını atom numaralarına çevirir. Okunamazsa null. */
export function elementListesiOku(metin: string): number[] | null {
  const sonuc = new Set<number>();
  for (const parca of metin.split(/[,;\s]+/).filter(Boolean)) {
    const aralik = /^(\d+)-(\d+)$/.exec(parca);
    if (aralik) {
      const a = Number(aralik[1]), b = Number(aralik[2]);
      if (a < 1 || b > 118 || a > b) return null;
      for (let z = a; z <= b; z += 1) sonuc.add(z);
      continue;
    }
    if (/^\d+$/.test(parca)) {
      const z = Number(parca);
      if (z < 1 || z > 118) return null;
      sonuc.add(z);
      continue;
    }
    const idx = ELEMENT_SEMBOLLERI.findIndex((e) => e.toLowerCase() === parca.toLowerCase());
    if (idx < 0) return null;
    sonuc.add(idx + 1);
  }
  return [...sonuc].sort((a, b) => a - b);
}

export const elementListesiYaz = (liste: number[]) => liste.map((z) => ELEMENT_SEMBOLLERI[z - 1]).join(", ");

const ORBITALLER: [number, number][] = [
  [1, 2], [2, 2], [2, 6], [3, 2], [3, 6], [4, 2], [3, 10], [4, 6], [5, 2], [4, 10], [5, 6], [6, 2], [4, 14], [5, 10], [6, 6], [7, 2], [5, 14], [6, 10], [7, 6],
];
/** Nötr atomda Aufbau'dan sapan, müfredatta geçen istisnalar (yarı dolu / tam dolu d). */
const KABUK_ISTISNALARI: Record<number, number[]> = {
  24: [2, 8, 13, 1], // Cr: [Ar] 4s¹ 3d⁵
  29: [2, 8, 18, 1], // Cu: [Ar] 4s¹ 3d¹⁰
  42: [2, 8, 18, 13, 1], // Mo: [Kr] 5s¹ 4d⁵
  47: [2, 8, 18, 18, 1], // Ag: [Kr] 5s¹ 4d¹⁰
  79: [2, 8, 18, 32, 18, 1], // Au: [Xe] 4f¹⁴ 6s¹ 5d¹⁰
};

/** Elektron dizilimi kabuk kabuk (K, L, M…): iyonlar için kation dış kabuktan eksilir. */
export function kabukDizilimi(z: number, yuk = 0): number[] {
  const doldur = (e: number) => {
    const kabuk: number[] = [];
    let kalan = e;
    for (const [n, kap] of ORBITALLER) {
      if (kalan <= 0) break;
      const al = Math.min(kap, kalan);
      kabuk[n - 1] = (kabuk[n - 1] ?? 0) + al;
      kalan -= al;
    }
    return Array.from(kabuk, (v) => v ?? 0);
  };
  if (yuk <= 0) {
    const e = z - yuk;
    return e === z && KABUK_ISTISNALARI[z] ? [...KABUK_ISTISNALARI[z]] : doldur(e);
  }
  const kabuk = KABUK_ISTISNALARI[z] ? [...KABUK_ISTISNALARI[z]] : doldur(z);
  let sil = yuk;
  for (let i = kabuk.length - 1; i >= 0 && sil > 0; i -= 1) {
    const al = Math.min(kabuk[i], sil);
    kabuk[i] -= al;
    sil -= al;
  }
  while (kabuk.length && kabuk[kabuk.length - 1] === 0) kabuk.pop();
  return kabuk;
}

// ═══════════════════════════════════════════════════════════════════════════
// Bohr atomu
// ═══════════════════════════════════════════════════════════════════════════

const KABUK_ADLARI = ["K", "L", "M", "N", "O", "P", "Q"];

function atomCiz(ctx: CanvasRenderingContext2D, v: Extract<KimyaVerisi, { tur: "atom" }>, k: Kutu) {
  const kabuklar = v.kabuklar?.length ? v.kabuklar : kabukDizilimi(v.z, v.yuk);
  const cx = k.x + k.w / 2, cy = k.y + k.h / 2;
  const R = Math.min(k.w, k.h) / 2 - 4;
  const r0 = Math.min(22, R * 0.22);
  const n = Math.max(1, kabuklar.length);
  const adim = (R - r0) / n;
  // Çekirdek
  ctx.beginPath(); ctx.arc(cx, cy, r0, 0, Math.PI * 2); ctx.stroke();
  const sembol = ELEMENT_SEMBOLLERI[v.z - 1] ?? "?";
  if (v.cekirdek === "pn") {
    const nt = v.notron ?? Math.max(0, enBolKutleNumarasi(v.z) - v.z);
    fizikMetniCiz(ctx, `${v.z}p\n${nt}n`, cx, cy, 11);
  } else if (v.cekirdek === "sembol") fizikMetniCiz(ctx, sembol, cx, cy, 15);
  else fizikMetniCiz(ctx, `+${v.z}`, cx, cy, 14);
  kabuklar.forEach((sayi, i) => {
    const rr = r0 + adim * (i + 1);
    ctx.save(); ctx.lineWidth = Math.max(1, ctx.lineWidth * 0.8);
    ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    const baslangic = -Math.PI / 2 + (i % 2 ? Math.PI / Math.max(1, sayi) : 0);
    for (let j = 0; j < sayi; j += 1) {
      const a = baslangic + (Math.PI * 2 * j) / sayi;
      ctx.beginPath(); ctx.arc(cx + rr * Math.cos(a), cy + rr * Math.sin(a), 3.4, 0, Math.PI * 2); ctx.fill();
    }
    if (v.kabukAdi) fizikMetniCiz(ctx, KABUK_ADLARI[i] ?? "", cx + rr * Math.cos(Math.PI / 4) + 9, cy + rr * Math.sin(Math.PI / 4) + 9, 11);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Molekül / Lewis yapıları
// ═══════════════════════════════════════════════════════════════════════════

/** Atom simgesi boşsa ("" = iskelet formülünde karbon) harf çizilmez ve bağ köşeden köşeye gider. */
type MolAtom = { s: string; x: number; y: number; lp?: number; kismi?: "+" | "-"; koseli?: string };
/** `ic`: halka merkezi (molekül birimi); çift bağın ikinci çizgisi halkanın İÇİNE çizilir (benzen). */
type MolBag = { a: number; b: number; kat: 1 | 2 | 3; stil?: "duz" | "kama" | "kesik"; ic?: { x: number; y: number } };
export type Molekul = { id: string; ad: string; formul: string; atomlar: MolAtom[]; baglar: MolBag[]; geo: string; koseli?: string; grup?: "lewis" | "organik" };

/** "+" → ^+, "-" → ^−, "2-" → ^{2−}: iyon yükünün yazımı. */
export function koseliYaz(k: string): string {
  const m = /^(\d)([+-])$/.exec(k);
  if (m) return `^{${m[1]}${m[2] === "+" ? "+" : "−"}}`;
  return k === "+" ? "^+" : "^−";
}

const A = (s: string, x: number, y: number, ek: Partial<MolAtom> = {}): MolAtom => ({ s, x, y, ...ek });

/** Organik yapılar iskelet formülüyle: benzen halkası altıgen, çift bağın ikinci çizgisi HALKANIN İÇİNDE. */
function organikMolekuller(): Molekul[] {
  const halka = (): { atomlar: MolAtom[]; baglar: MolBag[] } => {
    const atomlar = Array.from({ length: 6 }, (_, i) => A("", Math.cos(-Math.PI / 2 + (Math.PI / 3) * i), Math.sin(-Math.PI / 2 + (Math.PI / 3) * i)));
    const baglar: MolBag[] = Array.from({ length: 6 }, (_, i) => (i % 2 === 0
      ? { a: i, b: (i + 1) % 6, kat: 2 as const, ic: { x: 0, y: 0 } }
      : { a: i, b: (i + 1) % 6, kat: 1 as const }));
    return { atomlar, baglar };
  };
  const benzen = halka();
  const fenol = halka();
  fenol.atomlar.push(A("OH", 0, -2));
  fenol.baglar.push({ a: 0, b: 6, kat: 1 });
  const toluen = halka();
  toluen.atomlar.push(A("CH_3", 0, -2));
  toluen.baglar.push({ a: 0, b: 6, kat: 1 });
  const anilin = halka();
  anilin.atomlar.push(A("NH_2", 0, -2));
  anilin.baglar.push({ a: 0, b: 6, kat: 1 });
  const O = (id: string, ad: string, formul: string, geo: string, atomlar: MolAtom[], baglar: MolBag[]): Molekul => ({ id, ad, formul, geo, atomlar, baglar, grup: "organik" });
  const k = 0.866;
  return [
    O("benzen", "Benzen", "C_6H_6", "Benzen (C₆H₆): düzlemsel altıgen, çift bağlar halkanın içinde", benzen.atomlar, benzen.baglar),
    O("fenol", "Fenol", "C_6H_5OH", "Fenol: benzen halkasına −OH", fenol.atomlar, fenol.baglar),
    O("toluen", "Toluen", "C_6H_5CH_3", "Toluen: benzen halkasına −CH₃", toluen.atomlar, toluen.baglar),
    O("anilin", "Anilin", "C_6H_5NH_2", "Anilin: benzen halkasına −NH₂", anilin.atomlar, anilin.baglar),
    O("etanol", "Etanol", "C_2H_5OH", "Etanol (alkol): CH₃–CH₂–OH", [A("", -2 * k, 0.5), A("", -k, 0), A("OH", 0, 0.5)], [{ a: 0, b: 1, kat: 1 }, { a: 1, b: 2, kat: 1 }]),
    O("asetikAsit", "Asetik asit", "CH_3COOH", "Etanoik asit (karboksilik asit)", [A("", -2 * k, 0.5), A("", -k, 0), A("O", -k, -1), A("OH", 0, 0.5)], [{ a: 0, b: 1, kat: 1 }, { a: 1, b: 2, kat: 2 }, { a: 1, b: 3, kat: 1 }]),
    O("dimetilEter", "Dimetil eter", "CH_3OCH_3", "Dimetil eter: etanolün fonksiyonel grup izomeri", [A("", -2 * k, 0.5), A("O", -k, 0), A("", 0, 0.5)], [{ a: 0, b: 1, kat: 1 }, { a: 1, b: 2, kat: 1 }]),
    O("butan", "n-Bütan", "C_4H_{10}", "n-Bütan (C₄H₁₀): düz zincirli izomer", [A("", -1.5 * k, 0.5), A("", -0.5 * k, 0), A("", 0.5 * k, 0.5), A("", 1.5 * k, 0)], [{ a: 0, b: 1, kat: 1 }, { a: 1, b: 2, kat: 1 }, { a: 2, b: 3, kat: 1 }]),
    O("izobutan", "İzobütan", "C_4H_{10}", "İzobütan (2-metilpropan, C₄H₁₀): dallanmış izomer", [A("CH", 0, 0), A("CH_3", 0, -1.25), A("CH_3", -1.1, 0.7), A("CH_3", 1.1, 0.7)], [{ a: 0, b: 1, kat: 1 }, { a: 0, b: 2, kat: 1 }, { a: 0, b: 3, kat: 1 }]),
    O("neopentan", "Neopentan", "C_5H_{12}", "Neopentan (2,2-dimetilpropan, C₅H₁₂)", [A("C", 0, 0), A("CH_3", 0, -1.3), A("CH_3", 0, 1.3), A("CH_3", -1.3, 0), A("CH_3", 1.3, 0)], [{ a: 0, b: 1, kat: 1 }, { a: 0, b: 2, kat: 1 }, { a: 0, b: 3, kat: 1 }, { a: 0, b: 4, kat: 1 }]),
    // Fonksiyonel gruplar (R: alkil kökü)
    O("fg-alkol", "Alkol (−OH)", "R-OH", "Hidroksil grubu: R–OH", [A("R", -1, 0), A("OH", 0.9, 0)], [{ a: 0, b: 1, kat: 1 }]),
    O("fg-aldehit", "Aldehit (−CHO)", "R-CHO", "Aldehit: R–C(=O)–H", [A("R", -2 * k, 0.5), A("", -k, 0), A("O", -k, -1), A("H", 0, 0.5)], [{ a: 0, b: 1, kat: 1 }, { a: 1, b: 2, kat: 2 }, { a: 1, b: 3, kat: 1 }]),
    O("fg-keton", "Keton (C=O)", "R-CO-R'", "Keton: R–C(=O)–R'", [A("R", -2 * k, 0.5), A("", -k, 0), A("O", -k, -1), A("R'", 0, 0.5)], [{ a: 0, b: 1, kat: 1 }, { a: 1, b: 2, kat: 2 }, { a: 1, b: 3, kat: 1 }]),
    O("fg-asit", "Karboksil (−COOH)", "R-COOH", "Karboksilik asit: R–C(=O)–OH", [A("R", -2 * k, 0.5), A("", -k, 0), A("O", -k, -1), A("OH", 0, 0.5)], [{ a: 0, b: 1, kat: 1 }, { a: 1, b: 2, kat: 2 }, { a: 1, b: 3, kat: 1 }]),
    O("fg-amin", "Amin (−NH₂)", "R-NH_2", "Amin: R–NH₂", [A("R", -1, 0), A("NH_2", 0.95, 0)], [{ a: 0, b: 1, kat: 1 }]),
    O("fg-eter", "Eter (−O−)", "R-O-R'", "Eter: R–O–R'", [A("R", -2 * k, 0.5), A("O", -k, 0), A("R'", 0, 0.5)], [{ a: 0, b: 1, kat: 1 }, { a: 1, b: 2, kat: 1 }]),
    O("fg-ester", "Ester (−COO−)", "R-COO-R'", "Ester: R–C(=O)–O–R'", [A("R", -3 * k, 0.5), A("", -2 * k, 0), A("O", -2 * k, -1), A("O", -k, 0.5), A("R'", 0, 0)], [{ a: 0, b: 1, kat: 1 }, { a: 1, b: 2, kat: 2 }, { a: 1, b: 3, kat: 1 }, { a: 3, b: 4, kat: 1 }]),
  ];
}

const KOK_ADLARI = ["Met", "Et", "Prop", "Büt", "Pent", "Heks", "Hept", "Okt", "Non", "Dek", "Undek", "Dodek"];

/** Alkan / alken / alkin zincir adı: "Bütan", "1-Büten", "2-Pentin". */
export function zincirAdi(n: number, tur: "alkan" | "alken" | "alkin", konum: number): string {
  const kok = KOK_ADLARI[Math.max(0, Math.min(11, n - 1))];
  if (tur === "alkan") return `${kok}an`;
  const ek = tur === "alken" ? "en" : "in";
  // Türkçe: Büt+en → Büten, Prop+en → Propen (ünsüz-ünlü ardışıklığı gereği yalnız "Büt" kökü tek t'yle yazılır)
  const govde = kok === "Büt" ? "Büt" : kok;
  return n <= 3 ? `${kok}${ek}` : `${konum}-${govde}${ek}`;
}

/** Zincir molekülü: zikzak karbon iskeleti (iskelet formülü); çift/üçlü bağ `konum`. karbondan sonraki bağda. */
export function zincirMolekulu(n: number, tur: "alkan" | "alken" | "alkin", konum: number): Molekul {
  const sayi = Math.max(2, Math.min(12, Math.round(n)));
  const k = 0.866;
  const atomlar = Array.from({ length: sayi }, (_, i) => A("", (i - (sayi - 1) / 2) * k, (i % 2) * 0.5));
  const bagNo = Math.max(1, Math.min(sayi - 1, Math.round(konum))) - 1;
  const baglar: MolBag[] = Array.from({ length: sayi - 1 }, (_, i) => ({ a: i, b: i + 1, kat: (tur !== "alkan" && i === bagNo ? (tur === "alken" ? 2 : 3) : 1) as 1 | 2 | 3 }));
  const h = tur === "alkan" ? 2 * sayi + 2 : tur === "alken" ? 2 * sayi : 2 * sayi - 2;
  return { id: "zincir", ad: zincirAdi(sayi, tur, bagNo + 1), formul: `C_${sayi}H_{${h}}`, atomlar, baglar, geo: `${zincirAdi(sayi, tur, bagNo + 1)} (C_${sayi}H_{${h}})`, grup: "organik" };
}

// ═══════════════════════════════════════════════════════════════════════════
// v1.2 — Sikloalkanlar ve yan gruplu (dallanmış / sübstitüe) organik yapılar
// ═══════════════════════════════════════════════════════════════════════════
//
// ADLANDIRMA (IUPAC, Türkçe yazım — MEB: "2-metilbütan", "2-kloropropan", "2-bütanol"):
// Öğretmenin ÇİZDİĞİ ana zincir, IUPAC'ın seçtiği ana zincir olmayabilir (sınav
// sorusunun ta kendisi: "bu yapının adı nedir?"). Bu yüzden ad, çizimden kurulan
// karbon iskeleti GRAFI üzerinden baştan hesaplanır:
//  1. Ana zincir: (a) en çok temel grubu (−OH, yoksa −NH₂) taşıyan, (b) en uzun,
//     (c) en çok sübstitüent taşıyan zincir; eşitlikte (d) numaralandırma ölçütleri.
//  2. Numaralandırma: temel gruba en küçük numara, sonra tüm ön eklere birlikte en
//     küçük numara takımı (ilk farkta), sonra alfabetik sırada ilk yazılana küçük numara.
//  3. Ön ekler alfabetik (çoğaltma ekleri di/tri sayılmaz): bromo, etil, kloro, metil…
// Halka: halka her zaman ana yapıdır (yan gruplar en çok 2 karbon); halkada tek
// sübstitüentin (ya da temel grubun) numarası yazılmaz: "metilsiklohekzan", "siklohekzanol".
// Kapalı formül Hill düzeninde: C, H, sonra Br, Cl, N, O.

export const ORGANIK_YAN_GRUPLAR: { g: OrganikYanGrup; ad: string; yazi: string }[] = [
  { g: "CH3", ad: "metil", yazi: "−CH₃" },
  { g: "C2H5", ad: "etil", yazi: "−C₂H₅" },
  { g: "Cl", ad: "kloro", yazi: "−Cl" },
  { g: "Br", ad: "bromo", yazi: "−Br" },
  { g: "OH", ad: "hidroksi (−ol)", yazi: "−OH" },
  { g: "NH2", ad: "amino (−amin)", yazi: "−NH₂" },
];

const ORG_KOK = ["met", "et", "prop", "büt", "pent", "hekz", "hept", "okt", "non", "dek", "undek", "dodek", "tridek", "tetradek", "pentadek", "hekzadek"];
const CARPAN = ["", "", "di", "tri", "tetra", "penta", "hekza", "hepta", "okta"];
const CARPAN_KARMASIK = ["", "", "bis", "tris", "tetrakis", "pentakis", "hekzakis"];

type Hetero = "Cl" | "Br" | "OH" | "NH2";
type OrgGraf = { n: number; komsu: number[][]; hetero: Hetero[][]; anaZincir: number[]; halka: boolean };

/** Çizimdeki zincirden karbon iskeleti grafı. Değerlik aşılırsa hata. */
export function organikGraf(z: { n: number; halka?: boolean; yanGruplar?: { k: number; g: OrganikYanGrup }[] }): { graf: OrgGraf } | { hata: string } {
  const halka = !!z.halka;
  const n = Math.round(z.n);
  if (halka ? n < 3 || n > 8 : n < 1 || n > 12) return { hata: halka ? "Halka 3–8 karbonlu olmalı" : "Zincir 1–12 karbonlu olmalı" };
  const komsu: number[][] = Array.from({ length: n }, () => []);
  const hetero: Hetero[][] = Array.from({ length: n }, () => []);
  const bagla = (a: number, b: number) => { komsu[a].push(b); komsu[b].push(a); };
  for (let i = 0; i + 1 < n; i += 1) bagla(i, i + 1);
  if (halka) bagla(n - 1, 0);
  let toplam = n;
  for (const y of z.yanGruplar ?? []) {
    const c = Math.round(y.k) - 1;
    if (c < 0 || c >= n) return { hata: `${y.k}. karbon zincirde yok` };
    if (y.g === "CH3" || y.g === "C2H5") {
      const yeni = toplam;
      komsu.push([]); hetero.push([]); toplam += 1; bagla(c, yeni);
      if (y.g === "C2H5") { komsu.push([]); hetero.push([]); toplam += 1; bagla(yeni, yeni + 1); }
    } else hetero[c].push(y.g);
  }
  for (let i = 0; i < toplam; i += 1) {
    if (komsu[i].length + hetero[i].length > 4) return { hata: `${i < n ? `${i + 1}. karbon` : "Bir karbon"} 4'ten fazla bağ yapamaz` };
  }
  return { graf: { n: toplam, komsu, hetero, anaZincir: Array.from({ length: n }, (_, i) => i), halka } };
}

/** Kapalı formül: { yazim: "C_{5}H_{12}", duz: "C5H12" } (Hill düzeni). */
export function organikFormul(g: OrgGraf): { yazim: string; duz: string } {
  let h = 0;
  const say: Record<string, number> = { Br: 0, Cl: 0, N: 0, O: 0 };
  for (let i = 0; i < g.n; i += 1) {
    h += 4 - g.komsu[i].length - g.hetero[i].length;
    for (const x of g.hetero[i]) {
      if (x === "OH") { say.O += 1; h += 1; } else if (x === "NH2") { say.N += 1; h += 2; } else say[x] += 1;
    }
  }
  const parca: [string, number][] = [["C", g.n], ["H", h], ["Br", say.Br], ["Cl", say.Cl], ["N", say.N], ["O", say.O]];
  const kalan = parca.filter(([, k]) => k > 0);
  return {
    yazim: kalan.map(([s, k]) => (k === 1 ? s : `${s}_{${k}}`)).join(""),
    duz: kalan.map(([s, k]) => (k === 1 ? s : `${s}${k}`)).join(""),
  };
}

const alfabetikAnahtar = (ad: string) => ad.replace(/[()\d,\-]/g, "").replace(/^(di|tri|tetra|bis|tris)(?=[a-zçğıöşü])/, "");
const trKarsilastir = (a: string, b: string) => alfabetikAnahtar(a).localeCompare(alfabetikAnahtar(b), "tr");

/** Liste karşılaştırması (ilk farkta küçük olan önce). */
function listeKiyas(a: number[], b: number[]) {
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) if (a[i] !== b[i]) return a[i] - b[i];
  return a.length - b.length;
}

type Onek = { ad: string; konum: number; karmasik: boolean };

/** Bir dalın (kök `kok`, ana zincire `ebeveyn` üzerinden bağlı) alkil adı: metil, etil, izopropil, (2-kloroetil)… */
function dalAdi(g: OrgGraf, kok: number, ebeveyn: number, temel: Hetero | null): { ad: string; karmasik: boolean } {
  // Kökten başlayan en uzun zincir (eşitlikte en çok sübstitüentli).
  const yollar: number[][] = [];
  const gez = (dugum: number, onceki: number, yol: number[]) => {
    const ileri = g.komsu[dugum].filter((k) => k !== onceki);
    if (!ileri.length) { yollar.push(yol); return; }
    for (const k of ileri) gez(k, dugum, [...yol, k]);
  };
  gez(kok, ebeveyn, [kok]);
  const subSayisi = (yol: number[]) => yol.reduce((t, c, i) => t + g.hetero[c].length + g.komsu[c].filter((k) => k !== (i === 0 ? ebeveyn : yol[i - 1]) && k !== yol[i + 1]).length, 0);
  yollar.sort((a, b) => b.length - a.length || subSayisi(b) - subSayisi(a));
  const zincir = yollar[0];
  const onekler: Onek[] = [];
  zincir.forEach((c, i) => {
    for (const h of g.hetero[c]) onekler.push({ ad: heteroOnek(h, temel, true), konum: i + 1, karmasik: false });
    for (const k of g.komsu[c]) {
      if (k === (i === 0 ? ebeveyn : zincir[i - 1]) || k === zincir[i + 1]) continue;
      const alt = dalAdi(g, k, c, temel);
      onekler.push({ ad: alt.ad, konum: i + 1, karmasik: alt.karmasik });
    }
  });
  const kok2 = `${ORG_KOK[zincir.length - 1]}il`;
  if (!onekler.length) return { ad: kok2, karmasik: false };
  if (zincir.length === 2 && onekler.length === 1 && onekler[0].ad === "metil" && onekler[0].konum === 1) return { ad: "izopropil", karmasik: false };
  // Tek karbonlu dalda numara yazılmaz: (klorometil), (hidroksimetil).
  return { ad: `(${onekMetni(onekler, zincir.length === 1)}${kok2})`, karmasik: true };
}

function heteroOnek(h: Hetero, temel: Hetero | null, dalda = false): string {
  if (h === "Cl") return "kloro";
  if (h === "Br") return "bromo";
  if (h === "OH") return "hidroksi";
  void temel; void dalda;
  return "amino";
}

/** Ön ekleri alfabetik sırada yazar: "2-kloro-3,3-dimetil". Sonu tire ile bitmez. */
function onekMetni(onekler: Onek[], konumsuz = false): string {
  const gruplar = new Map<string, { konumlar: number[]; karmasik: boolean }>();
  for (const o of onekler) {
    const g = gruplar.get(o.ad) ?? { konumlar: [], karmasik: o.karmasik };
    g.konumlar.push(o.konum);
    gruplar.set(o.ad, g);
  }
  const adlar = [...gruplar.keys()].sort(trKarsilastir);
  return adlar.map((ad) => {
    const g = gruplar.get(ad)!;
    const sayi = g.konumlar.length;
    const carpan = (g.karmasik ? CARPAN_KARMASIK : CARPAN)[sayi] ?? "";
    const konum = konumsuz ? "" : `${[...g.konumlar].sort((a, b) => a - b).join(",")}-`;
    return `${konum}${carpan}${ad}`;
  }).join("-");
}

type Adlandirma = { ad: string; temelKonum: number[]; onekKonum: number[]; alfaKonum: number[] };

/** Verilen sıralı ana zincir (ya da halka sırası) için ad ve karşılaştırma anahtarları. */
function zinciriAdlandir(g: OrgGraf, zincir: number[], temel: Hetero | null, halka: boolean): Adlandirma {
  const icinde = new Set(zincir);
  const onekler: Onek[] = [];
  const temelKonum: number[] = [];
  zincir.forEach((c, i) => {
    for (const h of g.hetero[c]) {
      if (h === temel) temelKonum.push(i + 1);
      else onekler.push({ ad: heteroOnek(h, temel), konum: i + 1, karmasik: false });
    }
    for (const k of g.komsu[c]) {
      if (icinde.has(k)) continue;
      const d = dalAdi(g, k, c, temel);
      onekler.push({ ad: d.ad, konum: i + 1, karmasik: d.karmasik });
    }
  });
  const onekKonum = onekler.map((o) => o.konum).sort((a, b) => a - b);
  // Alfabetik ölçüt: alfabetik sıraya dizilmiş ön eklerin konumları.
  const alfaKonum = [...onekler].sort((a, b) => trKarsilastir(a.ad, b.ad) || a.konum - b.konum).map((o) => o.konum);
  const n = zincir.length;
  const kok = `${halka ? "siklo" : ""}${ORG_KOK[n - 1]}an`;
  const toplamSub = onekler.length + temelKonum.length;
  // Numarası yazılmayanlar: halkada tek sübstitüent / tek temel grup; 1–2 karbonlu zincirde tek sübstitüent.
  const onekKonumsuz = (halka && toplamSub === 1) || (!halka && n <= 2 && toplamSub === 1);
  const temelKonumsuz = (halka && temelKonum.length === 1) || (!halka && n <= 2 && temelKonum.length === 1);
  let ad: string;
  const on = onekler.length ? onekMetni(onekler, onekKonumsuz) : "";
  if (temel && temelKonum.length) {
    const ek = temel === "OH" ? "ol" : "amin";
    const carpan = CARPAN[temelKonum.length] ?? "";
    const temelYazi = `${kok}${carpan}${ek}`;
    const konum = temelKonumsuz ? "" : `${[...temelKonum].sort((a, b) => a - b).join(",")}-`;
    // MEB yazımı: "3-metil-2-bütanol" (temel grubun numarası kökün önünde).
    ad = on ? `${on}${konum ? `-${konum}` : ""}${temelYazi}` : `${konum}${temelYazi}`;
  } else ad = on ? `${on}${kok}` : kok;
  return { ad, temelKonum: temelKonum.sort((a, b) => a - b), onekKonum, alfaKonum };
}

function adlandirmaKiyas(a: Adlandirma, b: Adlandirma) {
  return listeKiyas(a.temelKonum, b.temelKonum) || listeKiyas(a.onekKonum, b.onekKonum) || listeKiyas(a.alfaKonum, b.alfaKonum);
}

/** Yapının IUPAC adı. */
export function organikAdi(g: OrgGraf): string {
  const temelVar = (h: Hetero) => g.hetero.some((l) => l.includes(h));
  const temel: Hetero | null = temelVar("OH") ? "OH" : temelVar("NH2") ? "NH2" : null;
  if (g.halka) {
    const halka = g.anaZincir;
    const n = halka.length;
    let enIyi: Adlandirma | null = null;
    for (let bas = 0; bas < n; bas += 1) {
      for (const yon of [1, -1]) {
        const sira = Array.from({ length: n }, (_, i) => halka[(((bas + yon * i) % n) + n) % n]);
        const a = zinciriAdlandir(g, sira, temel, true);
        if (!enIyi || adlandirmaKiyas(a, enIyi) < 0) enIyi = a;
      }
    }
    return enIyi!.ad;
  }
  // Ağaç: tüm basit yollar (her yol iki yönde numaralanır).
  const yollar: number[][] = [];
  for (let s = 0; s < g.n; s += 1) {
    const gez = (d: number, onceki: number, yol: number[]) => {
      yollar.push(yol);
      for (const k of g.komsu[d]) if (k !== onceki) gez(k, d, [...yol, k]);
    };
    gez(s, -1, [s]);
  }
  const temelSay = (yol: number[]) => yol.reduce((t, c) => t + g.hetero[c].filter((h) => h === temel).length, 0);
  const subSay = (yol: number[]) => {
    const ic = new Set(yol);
    return yol.reduce((t, c) => t + g.hetero[c].filter((h) => h !== temel).length + g.komsu[c].filter((k) => !ic.has(k)).length, 0);
  };
  let enIyi: { a: Adlandirma; anahtar: number[] } | null = null;
  for (const yol of yollar) {
    const anahtar = [-temelSay(yol), -yol.length, -subSay(yol)];
    if (enIyi && listeKiyas(anahtar, enIyi.anahtar) > 0) continue;
    const a = zinciriAdlandir(g, yol, temel, false);
    if (!enIyi || listeKiyas(anahtar, enIyi.anahtar) < 0 || adlandirmaKiyas(a, enIyi.a) < 0) enIyi = { a, anahtar };
  }
  return enIyi!.a.ad;
}

type ZincirVerisiTam = NonNullable<Extract<KimyaVerisi, { tur: "molekul" }>["zincir"]>;

/** Sikloalkan ya da yan gruplu zincir için çizim (iskelet formülü), ad ve kapalı formül. */
export function organikYapiMolekulu(z: ZincirVerisiTam): Molekul | null {
  const r = organikGraf(z);
  if ("hata" in r) return null;
  const g = r.graf;
  const n = Math.round(z.n);
  const atomlar: MolAtom[] = [];
  const baglar: MolBag[] = [];
  // Ana iskelet konumları ve her karbonun "dışarı" yönü
  const disYon: { x: number; y: number }[] = [];
  if (z.halka) {
    const R = 1 / (2 * Math.sin(Math.PI / n));
    for (let i = 0; i < n; i += 1) {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
      atomlar.push(A("", R * Math.cos(a), R * Math.sin(a)));
      disYon.push({ x: Math.cos(a), y: Math.sin(a) });
    }
    for (let i = 0; i < n; i += 1) baglar.push({ a: i, b: (i + 1) % n, kat: 1 });
  } else {
    const k = 0.866;
    for (let i = 0; i < n; i += 1) atomlar.push(A("", (i - (n - 1) / 2) * k, (i % 2) * 0.5));
    for (let i = 0; i + 1 < n; i += 1) baglar.push({ a: i, b: i + 1, kat: 1 });
    for (let i = 0; i < n; i += 1) {
      if (n === 1) disYon.push({ x: 1, y: 0 });
      // Uçlarda zikzak sürüyormuş gibi: bir sonraki (hayali) karbonun yönü.
      else if (i === 0) disYon.push({ x: -0.866, y: 0.5 });
      else if (i === n - 1) disYon.push({ x: 0.866, y: ((n % 2) - ((n - 1) % 2)) * 0.5 });
      else disYon.push({ x: 0, y: i % 2 ? 1 : -1 });
    }
  }
  // Yan gruplar (aynı karbondaki 2.–3. grup yelpaze gibi açılır)
  const sayac = new Array(n).fill(0);
  const yanlar = z.yanGruplar ?? [];
  const toplamYan = new Array(n).fill(0);
  for (const y of yanlar) toplamYan[Math.round(y.k) - 1] += 1;
  const dondur = (v: { x: number; y: number }, aci: number) => ({ x: v.x * Math.cos(aci) - v.y * Math.sin(aci), y: v.x * Math.sin(aci) + v.y * Math.cos(aci) });
  for (const y of yanlar) {
    const c = Math.round(y.k) - 1;
    const kac = toplamYan[c];
    const sira = sayac[c]++;
    const ac = kac === 1 ? 0 : kac === 2 ? (sira === 0 ? -0.55 : 0.55) : (sira - 1) * 0.75;
    const d = dondur(disYon[c], ac);
    const p = atomlar[c];
    const simge = y.g === "CH3" || y.g === "C2H5" ? "" : y.g === "NH2" ? "NH_2" : y.g;
    const uz = simge ? 1.05 : 1;
    const i1 = atomlar.length;
    atomlar.push(A(simge, p.x + d.x * uz, p.y + d.y * uz));
    baglar.push({ a: c, b: i1, kat: 1 });
    if (y.g === "C2H5") {
      const d2 = dondur(d, sira % 2 ? -1.05 : 1.05);
      atomlar.push(A("", atomlar[i1].x + d2.x, atomlar[i1].y + d2.y));
      baglar.push({ a: i1, b: i1 + 1, kat: 1 });
    }
  }
  const ad = organikAdi(g);
  const f = organikFormul(g);
  return { id: "zincir", ad, formul: f.yazim, atomlar, baglar, geo: `${ad} (${f.yazim})`, grup: "organik" };
}

/** Test/arayüz için: zincir verisinin adı ve kapalı formülü (düz yazı). */
export function organikAdVeFormul(z: ZincirVerisiTam): { ad: string; formul: string } | { hata: string } {
  if (!z.halka && !(z.yanGruplar?.length)) {
    const m = zincirMolekulu(z.n, z.tur, z.konum);
    return { ad: m.ad, formul: m.formul.replace(/[_{}]/g, "") };
  }
  const r = organikGraf(z);
  if ("hata" in r) return r;
  return { ad: organikAdi(r.graf), formul: organikFormul(r.graf).duz };
}

/** Sikloalkan / yan gruplu zincir verisi. */
export const organikZincirVerisi = (n: number, ek: { halka?: boolean; yanGruplar?: { k: number; g: OrganikYanGrup }[] } = {}): KimyaVerisi =>
  molekulVerisi("zincir", { zincir: { n, tur: "alkan", konum: 1, ...ek }, geometri: true });

export const KIMYA_SIKLO_SABLONLARI: (KimyaSablonu & { aramaKelimeleri: string[] })[] = [
  { id: "siklo-3", ad: "Siklopropan", ipucu: "C₃H₆: üçgen halka", olustur: () => organikZincirVerisi(3, { halka: true }), aramaKelimeleri: ["sikloalkan", "halka", "siklopropan"] },
  { id: "siklo-4", ad: "Siklobütan", ipucu: "C₄H₈: kare halka", olustur: () => organikZincirVerisi(4, { halka: true }), aramaKelimeleri: ["sikloalkan", "halka", "siklobütan"] },
  { id: "siklo-5", ad: "Siklopentan", ipucu: "C₅H₁₀: beşgen halka", olustur: () => organikZincirVerisi(5, { halka: true }), aramaKelimeleri: ["sikloalkan", "halka", "siklopentan"] },
  { id: "siklo-6", ad: "Siklohekzan", ipucu: "C₆H₁₂: altıgen halka (çift bağsız; benzenle karıştırmayın)", olustur: () => organikZincirVerisi(6, { halka: true }), aramaKelimeleri: ["sikloalkan", "halka", "siklohekzan", "sikloheksan"] },
  { id: "dal-2metilbutan", ad: "2-Metilbütan", ipucu: "C₅H₁₂: bütan zincirinin 2. karbonuna −CH₃ (izopentan)", olustur: () => organikZincirVerisi(4, { yanGruplar: [{ k: 2, g: "CH3" }] }), aramaKelimeleri: ["dallanmış", "izomer", "metil", "yan grup", "izopentan"] },
  { id: "dal-22dimetilpropan", ad: "2,2-Dimetilpropan", ipucu: "C₅H₁₂: neopentan", olustur: () => organikZincirVerisi(3, { yanGruplar: [{ k: 2, g: "CH3" }, { k: 2, g: "CH3" }] }), aramaKelimeleri: ["dallanmış", "izomer", "neopentan", "metil"] },
  { id: "dal-2kloropropan", ad: "2-Kloropropan", ipucu: "C₃H₇Cl: propanın 2. karbonuna −Cl", olustur: () => organikZincirVerisi(3, { yanGruplar: [{ k: 2, g: "Cl" }] }), aramaKelimeleri: ["halojen", "alkil halojenür", "kloro", "yan grup"] },
  { id: "dal-2butanol", ad: "2-Bütanol", ipucu: "C₄H₁₀O: ikincil alkol", olustur: () => organikZincirVerisi(4, { yanGruplar: [{ k: 2, g: "OH" }] }), aramaKelimeleri: ["alkol", "hidroksi", "OH", "bütanol"] },
  { id: "dal-metilsiklohekzan", ad: "Metilsiklohekzan", ipucu: "C₇H₁₄: halkaya −CH₃", olustur: () => organikZincirVerisi(6, { halka: true, yanGruplar: [{ k: 1, g: "CH3" }] }), aramaKelimeleri: ["sikloalkan", "halka", "metil", "yan grup"] },
];

const SAYI_RE = "[-+−]?\\d+(?:[.,]\\d+)?";
const sayiOku2 = (t: string) => Number(t.replace(",", ".").replace("−", "-"));

/**
 * Özel molekül: atomlar "O(0,-0.35,2); H(-0.85,0.45)" = simge(x, y[, serbest çift sayısı]);
 * bağlar "1-2; 1-3; 2=3; 2#3k" = atom numaraları (1'den), - tek, = çift, # üçlü; sonuna k (kama) ya da s (kesik).
 */
export function ozelMolekulOku(ad: string, atomMetni: string, bagMetni: string): { molekul: Molekul } | { hata: string } {
  const atomSatirlari = atomMetni.split(/[;\n]/).map((t) => t.trim()).filter(Boolean);
  if (atomSatirlari.length < 1) return { hata: "En az bir atom yazın: O(0,0,2)" };
  if (atomSatirlari.length > 16) return { hata: "En çok 16 atom" };
  const atomRe = new RegExp(`^([^(),;]{0,12})\\(\\s*(${SAYI_RE})\\s*,\\s*(${SAYI_RE})\\s*(?:,\\s*(\\d)\\s*)?\\)$`);
  const atomlar: MolAtom[] = [];
  for (const t of atomSatirlari) {
    const m = atomRe.exec(t);
    if (!m) return { hata: `"${t.slice(0, 22)}": atom "simge(x,y)" ya da "simge(x,y,serbestÇift)" biçiminde yazılır` };
    const x = sayiOku2(m[2]), y = sayiOku2(m[3]);
    if (Math.abs(x) > 20 || Math.abs(y) > 20) return { hata: `"${t.slice(0, 22)}": koordinat −20…20 aralığında olmalı` };
    const lp = m[4] === undefined ? 0 : Number(m[4]);
    if (lp > 4) return { hata: `"${t.slice(0, 22)}": serbest çift en çok 4` };
    atomlar.push(A(m[1].trim(), x, y, lp ? { lp } : {}));
  }
  const bagSatirlari = bagMetni.split(/[;\n]/).map((t) => t.trim()).filter(Boolean);
  if (bagSatirlari.length > 30) return { hata: "En çok 30 bağ" };
  const baglar: MolBag[] = [];
  for (const t of bagSatirlari) {
    const m = /^(\d+)\s*([-=#])\s*(\d+)\s*([ks])?$/i.exec(t);
    if (!m) return { hata: `"${t.slice(0, 22)}": bağ "1-2", "1=2" ya da "1#2" biçiminde yazılır` };
    const a = Number(m[1]) - 1, b = Number(m[3]) - 1;
    if (a < 0 || b < 0 || a >= atomlar.length || b >= atomlar.length || a === b) return { hata: `"${t}": atom numarası 1–${atomlar.length} arasında ve farklı olmalı` };
    baglar.push({ a, b, kat: m[2] === "-" ? 1 : m[2] === "=" ? 2 : 3, ...(m[4]?.toLowerCase() === "k" ? { stil: "kama" as const } : m[4]?.toLowerCase() === "s" ? { stil: "kesik" as const } : {}) });
  }
  const adi = ad.trim() || "Molekül";
  return { molekul: { id: "ozel", ad: adi, formul: adi, atomlar, baglar, geo: adi } };
}

export const OZEL_MOLEKUL_ORNEGI = { ad: "H₂O", atomlar: "O(0,-0.35,2); H(-0.85,0.45); H(0.85,0.45)", baglar: "1-2; 1-3" };

export const MOLEKULLER: Molekul[] = [
  { id: "h2", ad: "H₂", formul: "H_2", atomlar: [A("H", -0.55, 0), A("H", 0.55, 0)], baglar: [{ a: 0, b: 1, kat: 1 }], geo: "Doğrusal" },
  { id: "cl2", ad: "Cl₂", formul: "Cl_2", atomlar: [A("Cl", -0.8, 0, { lp: 3 }), A("Cl", 0.8, 0, { lp: 3 })], baglar: [{ a: 0, b: 1, kat: 1 }], geo: "Doğrusal" },
  { id: "o2", ad: "O₂", formul: "O_2", atomlar: [A("O", -0.7, 0, { lp: 2 }), A("O", 0.7, 0, { lp: 2 })], baglar: [{ a: 0, b: 1, kat: 2 }], geo: "Doğrusal" },
  { id: "n2", ad: "N₂", formul: "N_2", atomlar: [A("N", -0.7, 0, { lp: 1 }), A("N", 0.7, 0, { lp: 1 })], baglar: [{ a: 0, b: 1, kat: 3 }], geo: "Doğrusal" },
  { id: "hcl", ad: "HCl", formul: "HCl", atomlar: [A("H", -0.75, 0, { kismi: "+" }), A("Cl", 0.75, 0, { lp: 3, kismi: "-" })], baglar: [{ a: 0, b: 1, kat: 1 }], geo: "Doğrusal" },
  { id: "hf", ad: "HF", formul: "HF", atomlar: [A("H", -0.7, 0, { kismi: "+" }), A("F", 0.7, 0, { lp: 3, kismi: "-" })], baglar: [{ a: 0, b: 1, kat: 1 }], geo: "Doğrusal" },
  { id: "h2o", ad: "H₂O", formul: "H_2O", atomlar: [A("O", 0, -0.35, { lp: 2, kismi: "-" }), A("H", -0.85, 0.45, { kismi: "+" }), A("H", 0.85, 0.45, { kismi: "+" })], baglar: [{ a: 0, b: 1, kat: 1 }, { a: 0, b: 2, kat: 1 }], geo: "Açısal (104,5°)" },
  { id: "co2", ad: "CO₂", formul: "CO_2", atomlar: [A("C", 0, 0, { kismi: "+" }), A("O", -1.2, 0, { lp: 2, kismi: "-" }), A("O", 1.2, 0, { lp: 2, kismi: "-" })], baglar: [{ a: 0, b: 1, kat: 2 }, { a: 0, b: 2, kat: 2 }], geo: "Doğrusal (180°)" },
  { id: "nh3", ad: "NH₃", formul: "NH_3", atomlar: [A("N", 0, -0.2, { lp: 1, kismi: "-" }), A("H", -1, 0.45, { kismi: "+" }), A("H", 0.05, 0.95, { kismi: "+" }), A("H", 1, 0.45, { kismi: "+" })], baglar: [{ a: 0, b: 1, kat: 1 }, { a: 0, b: 2, kat: 1, stil: "kama" }, { a: 0, b: 3, kat: 1, stil: "kesik" }], geo: "Üçgen piramit (107°)" },
  { id: "ch4", ad: "CH₄", formul: "CH_4", atomlar: [A("C", 0, 0), A("H", -0.85, -0.85), A("H", 0.85, -0.85), A("H", -0.7, 0.95), A("H", 0.7, 0.95)], baglar: [{ a: 0, b: 1, kat: 1 }, { a: 0, b: 2, kat: 1 }, { a: 0, b: 3, kat: 1, stil: "kesik" }, { a: 0, b: 4, kat: 1, stil: "kama" }], geo: "Düzgün dörtyüzlü (109,5°)" },
  { id: "bf3", ad: "BF₃", formul: "BF_3", atomlar: [A("B", 0, 0), A("F", 0, -1.15, { lp: 3 }), A("F", -1.0, 0.6, { lp: 3 }), A("F", 1.0, 0.6, { lp: 3 })], baglar: [{ a: 0, b: 1, kat: 1 }, { a: 0, b: 2, kat: 1 }, { a: 0, b: 3, kat: 1 }], geo: "Düzlem üçgen (120°)" },
  { id: "c2h4", ad: "C₂H₄", formul: "C_2H_4", atomlar: [A("C", -0.6, 0), A("C", 0.6, 0), A("H", -1.25, -0.9), A("H", -1.25, 0.9), A("H", 1.25, -0.9), A("H", 1.25, 0.9)], baglar: [{ a: 0, b: 1, kat: 2 }, { a: 0, b: 2, kat: 1 }, { a: 0, b: 3, kat: 1 }, { a: 1, b: 4, kat: 1 }, { a: 1, b: 5, kat: 1 }], geo: "Düzlem (120°)" },
  { id: "c2h2", ad: "C₂H₂", formul: "C_2H_2", atomlar: [A("H", -1.8, 0), A("C", -0.6, 0), A("C", 0.6, 0), A("H", 1.8, 0)], baglar: [{ a: 0, b: 1, kat: 1 }, { a: 1, b: 2, kat: 3 }, { a: 2, b: 3, kat: 1 }], geo: "Doğrusal (180°)" },
  { id: "hcn", ad: "HCN", formul: "HCN", atomlar: [A("H", -1.6, 0), A("C", -0.4, 0), A("N", 0.85, 0, { lp: 1 })], baglar: [{ a: 0, b: 1, kat: 1 }, { a: 1, b: 2, kat: 3 }], geo: "Doğrusal (180°)" },
  { id: "nh4", ad: "NH₄⁺", formul: "NH_4^+", koseli: "+", atomlar: [A("N", 0, 0), A("H", -0.85, -0.85), A("H", 0.85, -0.85), A("H", -0.7, 0.95), A("H", 0.7, 0.95)], baglar: [{ a: 0, b: 1, kat: 1 }, { a: 0, b: 2, kat: 1 }, { a: 0, b: 3, kat: 1, stil: "kesik" }, { a: 0, b: 4, kat: 1, stil: "kama" }], geo: "Düzgün dörtyüzlü (109,5°)" },
  { id: "oh", ad: "OH⁻", formul: "OH^-", koseli: "-", atomlar: [A("O", -0.4, 0, { lp: 3 }), A("H", 0.55, 0)], baglar: [{ a: 0, b: 1, kat: 1 }], geo: "Doğrusal" },
  { id: "nacl", ad: "NaCl (iyonik)", formul: "NaCl", atomlar: [A("Na", -1.05, 0, { koseli: "+" }), A("Cl", 1.05, 0, { lp: 4, koseli: "-" })], baglar: [], geo: "İyonik bağ" },
  { id: "so2", ad: "SO₂", formul: "SO_2", atomlar: [A("S", 0, -0.3, { lp: 1 }), A("O", -1.05, 0.45, { lp: 2 }), A("O", 1.05, 0.45, { lp: 2 })], baglar: [{ a: 0, b: 1, kat: 2 }, { a: 0, b: 2, kat: 2 }], geo: "Açısal (119°)" },
  { id: "o3", ad: "O₃", formul: "O_3", atomlar: [A("O", 0, -0.3, { lp: 1 }), A("O", -1.05, 0.45, { lp: 3 }), A("O", 1.05, 0.45, { lp: 2 })], baglar: [{ a: 0, b: 1, kat: 1 }, { a: 0, b: 2, kat: 2 }], geo: "Açısal (117°)" },
  { id: "h2s", ad: "H₂S", formul: "H_2S", atomlar: [A("S", 0, -0.35, { lp: 2 }), A("H", -0.85, 0.45), A("H", 0.85, 0.45)], baglar: [{ a: 0, b: 1, kat: 1 }, { a: 0, b: 2, kat: 1 }], geo: "Açısal (92°)" },
  { id: "co", ad: "CO", formul: "CO", atomlar: [A("C", -0.7, 0, { lp: 1 }), A("O", 0.7, 0, { lp: 1 })], baglar: [{ a: 0, b: 1, kat: 3 }], geo: "Doğrusal" },
  { id: "ccl4", ad: "CCl₄", formul: "CCl_4", atomlar: [A("C", 0, 0), A("Cl", -1, -1, { lp: 3 }), A("Cl", 1, -1, { lp: 3 }), A("Cl", -0.8, 1.05, { lp: 3 }), A("Cl", 0.8, 1.05, { lp: 3 })], baglar: [{ a: 0, b: 1, kat: 1 }, { a: 0, b: 2, kat: 1 }, { a: 0, b: 3, kat: 1, stil: "kesik" }, { a: 0, b: 4, kat: 1, stil: "kama" }], geo: "Düzgün dörtyüzlü (109,5°)" },
  { id: "pcl3", ad: "PCl₃", formul: "PCl_3", atomlar: [A("P", 0, -0.2, { lp: 1 }), A("Cl", -1.1, 0.55, { lp: 3 }), A("Cl", 0.05, 1.05, { lp: 3 }), A("Cl", 1.1, 0.55, { lp: 3 })], baglar: [{ a: 0, b: 1, kat: 1 }, { a: 0, b: 2, kat: 1, stil: "kama" }, { a: 0, b: 3, kat: 1, stil: "kesik" }], geo: "Üçgen piramit (100°)" },
  { id: "pcl5", ad: "PCl₅", formul: "PCl_5", atomlar: [A("P", 0, 0), A("Cl", 0, -1.5, { lp: 3 }), A("Cl", 0, 1.5, { lp: 3 }), A("Cl", -1.5, 0.25, { lp: 3 }), A("Cl", 1.5, 0.25, { lp: 3 }), A("Cl", 0.3, 0.85, { lp: 3 })], baglar: [{ a: 0, b: 1, kat: 1 }, { a: 0, b: 2, kat: 1 }, { a: 0, b: 3, kat: 1 }, { a: 0, b: 4, kat: 1 }, { a: 0, b: 5, kat: 1, stil: "kama" }], geo: "Üçgen çift piramit (90°, 120°)" },
  { id: "sf6", ad: "SF₆", formul: "SF_6", atomlar: [A("S", 0, 0), A("F", 0, -1.45, { lp: 3 }), A("F", 0, 1.45, { lp: 3 }), A("F", -1.45, 0, { lp: 3 }), A("F", 1.45, 0, { lp: 3 }), A("F", -0.75, 0.75, { lp: 3 }), A("F", 0.75, -0.75, { lp: 3 })], baglar: [{ a: 0, b: 1, kat: 1 }, { a: 0, b: 2, kat: 1 }, { a: 0, b: 3, kat: 1 }, { a: 0, b: 4, kat: 1 }, { a: 0, b: 5, kat: 1, stil: "kesik" }, { a: 0, b: 6, kat: 1, stil: "kama" }], geo: "Düzgün sekizyüzlü (90°)" },
  { id: "no3", ad: "NO₃⁻", formul: "NO_3^-", koseli: "-", atomlar: [A("N", 0, 0), A("O", 0, -1.15, { lp: 2 }), A("O", -1, 0.6, { lp: 3 }), A("O", 1, 0.6, { lp: 3 })], baglar: [{ a: 0, b: 1, kat: 2 }, { a: 0, b: 2, kat: 1 }, { a: 0, b: 3, kat: 1 }], geo: "Düzlem üçgen (120°), rezonans" },
  { id: "so4", ad: "SO₄²⁻", formul: "SO_4^{2-}", koseli: "2-", atomlar: [A("S", 0, 0), A("O", 0, -1.25, { lp: 3 }), A("O", 0, 1.25, { lp: 3 }), A("O", -1.25, 0, { lp: 3 }), A("O", 1.25, 0, { lp: 3 })], baglar: [{ a: 0, b: 1, kat: 1 }, { a: 0, b: 2, kat: 1 }, { a: 0, b: 3, kat: 1 }, { a: 0, b: 4, kat: 1 }], geo: "Düzgün dörtyüzlü (109,5°)" },
  { id: "h2o2", ad: "H₂O₂", formul: "H_2O_2", atomlar: [A("H", -1.5, 0.5), A("O", -0.6, 0, { lp: 2 }), A("O", 0.6, 0, { lp: 2 }), A("H", 1.5, 0.5)], baglar: [{ a: 0, b: 1, kat: 1 }, { a: 1, b: 2, kat: 1 }, { a: 2, b: 3, kat: 1 }], geo: "Kitap açısı (111°)" },
  ...organikMolekuller(),
];

export const molekulBul = (id: string) => MOLEKULLER.find((m) => m.id === id);

type MolekulVerisi = Extract<KimyaVerisi, { tur: "molekul" }>;

/** Verinin molekülü: listeden, özel yazımdan ya da zincir üreticiden. Çözülemezse listenin ilki. */
export function molekulCoz(v: MolekulVerisi): Molekul {
  if (v.id === "ozel" && v.ozel) {
    const r = ozelMolekulOku(v.ozel.ad, v.ozel.atomlar, v.ozel.baglar);
    if ("molekul" in r) return r.molekul;
  }
  if (v.id === "zincir" && v.zincir) {
    if (v.zincir.halka || v.zincir.yanGruplar?.length) {
      const m = organikYapiMolekulu(v.zincir);
      if (m) return m;
    }
    return zincirMolekulu(v.zincir.n, v.zincir.tur, v.zincir.konum);
  }
  return molekulBul(v.id) ?? MOLEKULLER[0];
}

/**
 * Boş açıklıklara `adet` yön yerleştirir: her yön, en geniş boşluğun içinde eşit aralıkla
 * (su: iki çift üst köşelere, Cl₂: üç çift üst/alt/dış). Hiç dolu yön yoksa çember eşit bölünür.
 */
function bosYonler(dolu: number[], adet: number): number[] {
  if (adet <= 0) return [];
  const TAM = Math.PI * 2;
  const norm = (a: number) => ((a % TAM) + TAM) % TAM;
  if (!dolu.length) return Array.from({ length: adet }, (_, i) => norm((TAM * i) / adet));
  const sirali = dolu.map(norm).sort((p, q) => p - q);
  const bosluklar = sirali.map((a, i) => {
    const sonraki = i === sirali.length - 1 ? sirali[0] + TAM : sirali[i + 1];
    return { bas: a, boy: sonraki - a, sayi: 0 };
  });
  for (let i = 0; i < adet; i += 1) {
    let en = bosluklar[0];
    for (const g of bosluklar) if (g.boy / (g.sayi + 1) > en.boy / (en.sayi + 1) + 1e-9) en = g;
    en.sayi += 1;
  }
  const sonuc: number[] = [];
  for (const g of bosluklar) for (let j = 0; j < g.sayi; j += 1) sonuc.push(norm(g.bas + (g.boy * (j + 1)) / (g.sayi + 1)));
  return sonuc;
}

function molekulCiz(ctx: CanvasRenderingContext2D, v: Extract<KimyaVerisi, { tur: "molekul" }>, k: Kutu) {
  const mol = molekulCoz(v);
  const xs = mol.atomlar.map((a) => a.x), ys = mol.atomlar.map((a) => a.y);
  const gx = Math.max(...xs) - Math.min(...xs) || 1, gy = Math.max(...ys) - Math.min(...ys) || 1;
  const kenar = 30;
  const olcek = Math.min(70, (k.w - kenar * 2) / gx, (k.h - kenar * 2) / gy);
  const mx = (Math.max(...xs) + Math.min(...xs)) / 2, my = (Math.max(...ys) + Math.min(...ys)) / 2;
  const P = mol.atomlar.map((a) => ({ x: k.x + k.w / 2 + (a.x - mx) * olcek, y: k.y + k.h / 2 + (a.y - my) * olcek }));
  const yaricap = (a: MolAtom) => {
    const duz = a.s.replace(/[_^{}\\]/g, "");
    return duz === "" ? 0 : duz.length > 2 ? 17 : duz.length > 1 ? 13 : 10;
  };
  const merkezBirim = (c: { x: number; y: number }) => ({ x: k.x + k.w / 2 + (c.x - mx) * olcek, y: k.y + k.h / 2 + (c.y - my) * olcek });
  const lewis = v.gosterim === "lewis";

  const noktaCift = (x: number, y: number, ux: number, uy: number) => {
    // (ux,uy) yön; çiftin iki noktası yönün dikinde
    const px = -uy, py = ux;
    for (const o of [-2.6, 2.6]) { ctx.beginPath(); ctx.arc(x + px * o, y + py * o, 1.9, 0, Math.PI * 2); ctx.fill(); }
  };

  // Bağlar
  mol.baglar.forEach((b) => {
    const pa = P[b.a], pb = P[b.b];
    const L = Math.hypot(pb.x - pa.x, pb.y - pa.y) || 1;
    const ux = (pb.x - pa.x) / L, uy = (pb.y - pa.y) / L, px = -uy, py = ux;
    const ra = yaricap(mol.atomlar[b.a]) ? yaricap(mol.atomlar[b.a]) + 3 : 0, rb = yaricap(mol.atomlar[b.b]) ? yaricap(mol.atomlar[b.b]) + 3 : 0;
    const s0 = { x: pa.x + ux * ra, y: pa.y + uy * ra }, s1 = { x: pb.x - ux * rb, y: pb.y - uy * rb };
    if (lewis) {
      const orta = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
      for (let i = 0; i < b.kat; i += 1) {
        const t = (i - (b.kat - 1) / 2) * 9;
        noktaCift(orta.x + ux * t, orta.y + uy * t, ux, uy);
      }
      return;
    }
    if (b.stil === "kama") {
      ctx.beginPath(); ctx.moveTo(s0.x, s0.y); ctx.lineTo(s1.x + px * 4, s1.y + py * 4); ctx.lineTo(s1.x - px * 4, s1.y - py * 4); ctx.closePath(); ctx.fill();
      return;
    }
    if (b.stil === "kesik") {
      for (let i = 1; i <= 6; i += 1) {
        const t = i / 6.5, hw = 0.6 + 3.6 * t;
        const cx = s0.x + (s1.x - s0.x) * t, cy = s0.y + (s1.y - s0.y) * t;
        cizgi(ctx, cx - px * hw, cy - py * hw, cx + px * hw, cy + py * hw);
      }
      return;
    }
    if (b.ic && b.kat === 2) {
      // Halka içi çift bağ: ana çizgi kenarda, ikinci kısa çizgi halka merkezine doğru içeride (benzen)
      cizgi(ctx, s0.x, s0.y, s1.x, s1.y);
      const mc = merkezBirim(b.ic);
      const orta = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
      const yon = (mc.x - orta.x) * px + (mc.y - orta.y) * py >= 0 ? 1 : -1;
      const ofs = Math.min(7, L * 0.12), kisalt = L * 0.14;
      cizgi(ctx, pa.x + ux * kisalt + px * ofs * yon, pa.y + uy * kisalt + py * ofs * yon, pb.x - ux * kisalt + px * ofs * yon, pb.y - uy * kisalt + py * ofs * yon);
      return;
    }
    for (let i = 0; i < b.kat; i += 1) {
      const o = (i - (b.kat - 1) / 2) * 4.2;
      cizgi(ctx, s0.x + px * o, s0.y + py * o, s1.x + px * o, s1.y + py * o);
    }
  });

  // Atomlar, ortaklanmamış çiftler, kısmi yük
  mol.atomlar.forEach((a, i) => {
    const bagAcilari = mol.baglar.filter((b) => b.a === i || b.b === i).map((b) => {
      const o = P[b.a === i ? b.b : b.a];
      return Math.atan2(o.y - P[i].y, o.x - P[i].x);
    });
    const lpYon = bosYonler(bagAcilari, a.lp ?? 0);
    const dolu = [...bagAcilari, ...lpYon];
    const kismiYon = a.kismi && v.kismiYuk ? bosYonler(dolu, 1)[0] : null;
    // sembol (beyaz hale: çizgi/nokta altında kalmasın); boş simge = iskelet karbonu, harf yok
    if (a.s) fizikMetniCiz(ctx, a.s, P[i].x, P[i].y, 19);
    for (const ac of lpYon) {
      const d = yaricap(a) + 8;
      noktaCift(P[i].x + Math.cos(ac) * d, P[i].y + Math.sin(ac) * d, Math.cos(ac), Math.sin(ac));
    }
    if (kismiYon !== null && a.kismi) {
      fizikMetniCiz(ctx, a.kismi === "+" ? "δ^+" : "δ^−", P[i].x + Math.cos(kismiYon) * 26, P[i].y + Math.sin(kismiYon) * 24, 14);
    }
    if (a.koseli) {
      const r = (a.lp ?? 0) >= 4 ? 26 : 19;
      ctx.save(); ctx.lineWidth = Math.max(1.2, ctx.lineWidth * 0.8);
      const bx0 = P[i].x - r, bx1 = P[i].x + r, by0 = P[i].y - r - 2, by1 = P[i].y + r + 2;
      ctx.beginPath(); ctx.moveTo(bx0 + 6, by0); ctx.lineTo(bx0, by0); ctx.lineTo(bx0, by1); ctx.lineTo(bx0 + 6, by1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx1 - 6, by0); ctx.lineTo(bx1, by0); ctx.lineTo(bx1, by1); ctx.lineTo(bx1 - 6, by1); ctx.stroke();
      ctx.restore();
      fizikMetniCiz(ctx, koseliYaz(a.koseli), bx1 + 7, by0 + 2, 15);
    }
  });

  // Tüm molekül köşeli parantezli iyon (NH₄⁺, OH⁻)
  if (mol.koseli) {
    const ex = P.map((p) => p.x), ey = P.map((p) => p.y);
    const x0 = Math.min(...ex) - 28, x1 = Math.max(...ex) + 28, y0 = Math.min(...ey) - 28, y1 = Math.max(...ey) + 28;
    ctx.save(); ctx.lineWidth = Math.max(1.2, ctx.lineWidth * 0.8);
    ctx.beginPath(); ctx.moveTo(x0 + 8, y0); ctx.lineTo(x0, y0); ctx.lineTo(x0, y1); ctx.lineTo(x0 + 8, y1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x1 - 8, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y1); ctx.lineTo(x1 - 8, y1); ctx.stroke();
    ctx.restore();
    fizikMetniCiz(ctx, koseliYaz(mol.koseli), x1 + 8, y0 + 2, 16);
  }

  if (v.geometri) fizikMetniCiz(ctx, mol.grup === "organik" || mol.id === "ozel" ? mol.geo : `${mol.formul} — ${mol.geo}`, k.x + k.w / 2, k.y + k.h + 18, 14);
}

// ═══════════════════════════════════════════════════════════════════════════
// Periyodik tablo
// ═══════════════════════════════════════════════════════════════════════════

export type PeriyodikVerisi = Extract<KimyaVerisi, { tur: "periyodik" }>;

export const PERIYODIK_HUCRE = 30;

/** Tabloda gösterilen satır sayısı (iç geçiş satırları dâhil, aradaki boşluk yarım satır). */
export function periyodikSatirSayisi(bolge: PeriyodikVerisi["bolge"]): number {
  return bolge === "tum" ? 10.5 : bolge === "ilk3" ? 3 : bolge === "ilk20" ? 4 : 7;
}

export function periyodikGoruluyor(z: number, bolge: PeriyodikVerisi["bolge"]): boolean {
  const { satir, sutun } = elementKonumu(z);
  if (bolge === "tum") return true;
  if (bolge === "ilk3") return z <= 18;
  if (bolge === "ilk20") return z <= 20;
  return satir < 7 && (sutun <= 1 || sutun >= 12) && z !== 57 && z !== 89;
}

/** Yeni şeklin varsayılan ölçüsü (veriye göre). */
export function kimyaBoyutu(v: KimyaVerisi): { w: number; h: number } {
  if (v.tur === "atom") return { w: 200, h: 200 };
  if (v.tur === "orbital") return orbitalBoyutu(v);
  if (v.tur === "pil") return { w: 460, h: 300 };
  if (v.tur === "molekul") {
    const mol = molekulCoz(v);
    if (mol.grup === "organik" || mol.id === "ozel") {
      // İskelet formülü: bağ başına ~60 px; yazı payı eklenir
      const xs = mol.atomlar.map((a) => a.x), ys = mol.atomlar.map((a) => a.y);
      const gx = Math.max(...xs) - Math.min(...xs), gy = Math.max(...ys) - Math.min(...ys);
      return { w: Math.round(Math.max(200, Math.min(420, gx * 62 + 90))), h: Math.round(Math.max(150, Math.min(340, gy * 62 + 90 + (v.geometri ? 24 : 0)))) };
    }
    return { w: 240, h: 160 };
  }
  return { w: 18 * PERIYODIK_HUCRE, h: Math.round(periyodikSatirSayisi(v.bolge) * PERIYODIK_HUCRE) };
}

const kutleYaz = (m: number) => String(Math.round(m * 10) / 10).replace(".", ",");

function periyodikCiz(ctx: CanvasRenderingContext2D, v: PeriyodikVerisi, k: Kutu) {
  const cw = k.w / 18;
  const ch = k.h / periyodikSatirSayisi(v.bolge);
  const boyali = new Set(v.boyali), soru = new Set(v.soru);
  const satirY = (r: number) => k.y + (r >= 8 ? (r - 8 + 7.5) * ch : r * ch);
  ctx.save();
  ctx.lineWidth = Math.max(0.8, Math.min(1.2, ctx.lineWidth * 0.5));
  for (let z = 1; z <= 118; z += 1) {
    if (!periyodikGoruluyor(z, v.bolge)) continue;
    const { satir, sutun } = elementKonumu(z);
    const x = k.x + sutun * cw, y = satirY(satir);
    ctx.beginPath(); ctx.rect(x, y, cw, ch);
    if (boyali.has(z)) { ctx.fillStyle = "#cbd5e1"; ctx.fill(); ctx.fillStyle = MUREKKEP; }
    ctx.stroke();
    const sembol = soru.has(z) ? "?" : ELEMENT_SEMBOLLERI[z - 1];
    const boy = Math.max(7, Math.min(cw, ch) * 0.46);
    if (v.goster === "sembol") fizikMetniCiz(ctx, sembol, x + cw / 2, y + ch / 2, boy);
    else {
      fizikMetniCiz(ctx, String(z), x + 2, y + ch * 0.2, boy * 0.55, "sol");
      fizikMetniCiz(ctx, sembol, x + cw / 2, y + ch * (v.goster === "tam" ? 0.5 : 0.58), boy);
      if (v.goster === "tam") fizikMetniCiz(ctx, kutleYaz(ELEMENT_KUTLELERI[z - 1]), x + cw / 2, y + ch * 0.85, boy * 0.5);
    }
  }
  ctx.restore();
  if (v.grupNo) {
    const gor = new Set<number>();
    for (let z = 1; z <= 118; z += 1) if (periyodikGoruluyor(z, v.bolge) && elementKonumu(z).satir < 7) gor.add(elementKonumu(z).sutun);
    for (const s of gor) fizikMetniCiz(ctx, String(s + 1), k.x + s * cw + cw / 2, k.y - 9, 11);
    const satirlar = v.bolge === "tum" || v.bolge === "ana" ? 7 : v.bolge === "ilk20" ? 4 : 3;
    for (let r = 0; r < satirlar; r += 1) fizikMetniCiz(ctx, String(r + 1), k.x - 10, satirY(r) + ch / 2, 11);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Orbital kutu-ok diyagramı
// ═══════════════════════════════════════════════════════════════════════════

export type OrbitalVerisi = Extract<KimyaVerisi, { tur: "orbital" }>;
export type AltKabuk = { ad: string; n: number; l: number; e: number; kutular: ("yok" | "yukari" | "cift")[] };

/** Aufbau (Madelung) sırası: ad, n, l. */
const AUFBAU: [string, number, number][] = [
  ["1s", 1, 0], ["2s", 2, 0], ["2p", 2, 1], ["3s", 3, 0], ["3p", 3, 1], ["4s", 4, 0], ["3d", 3, 2], ["4p", 4, 1], ["5s", 5, 0], ["4d", 4, 2], ["5p", 5, 1],
  ["6s", 6, 0], ["4f", 4, 3], ["5d", 5, 2], ["6p", 6, 1], ["7s", 7, 0], ["5f", 5, 3], ["6d", 6, 2], ["7p", 7, 1],
];
/** Nötr atomda Aufbau'dan sapan yaygın istisnalar (alt kabuk → elektron). */
const ORBITAL_ISTISNALARI: Record<number, Record<string, number>> = {
  24: { "4s": 1, "3d": 5 }, 29: { "4s": 1, "3d": 10 },
  42: { "5s": 1, "4d": 5 }, 47: { "5s": 1, "4d": 10 }, 79: { "6s": 1, "5d": 10 },
};

/**
 * Elektron dizilimi alt kabuk alt kabuk. Elektron sayısı z − yük: anyonda Aufbau ile doldurulur,
 * katyonda en dış kabuktan (en büyük n, sonra en büyük l) alınır (Fe²⁺: önce 4s).
 * Kutu doldurma HUND kuralıyla: önce her kutuya yukarı ok, sonra aşağı oklarla eşleşme.
 */
export function orbitalDizilimi(z: number, yuk = 0): AltKabuk[] {
  const dolu = new Map<string, number>();
  const doldur = (e: number) => {
    let kalan = e;
    for (const [ad, , l] of AUFBAU) {
      if (kalan <= 0) break;
      const al = Math.min(2 * (2 * l + 1), kalan);
      dolu.set(ad, al);
      kalan -= al;
    }
  };
  if (yuk < 0) doldur(z - yuk);
  else {
    const ist = ORBITAL_ISTISNALARI[z];
    if (ist) {
      doldur(z);
      for (const [ad, e] of Object.entries(ist)) dolu.set(ad, e);
    } else doldur(z);
    let sil = yuk;
    const sirali = AUFBAU.filter(([ad]) => (dolu.get(ad) ?? 0) > 0).sort((a, b) => b[1] - a[1] || b[2] - a[2]);
    for (const [ad] of sirali) {
      if (sil <= 0) break;
      const al = Math.min(dolu.get(ad) ?? 0, sil);
      dolu.set(ad, (dolu.get(ad) ?? 0) - al);
      sil -= al;
    }
  }
  return AUFBAU.filter(([ad]) => (dolu.get(ad) ?? 0) > 0).map(([ad, n, l]) => {
    const e = dolu.get(ad) ?? 0;
    const m = 2 * l + 1;
    const kutular = Array.from({ length: m }, (_, i) => (i < e - m ? "cift" : i < e ? "yukari" : "yok") as "yok" | "yukari" | "cift");
    // Hund: e ≤ m ise ilk e kutuda tek yukarı ok; e > m ise ilk (e−m) kutu çift, kalanı tek.
    return { ad, n, l, e, kutular: e <= m ? kutular.map((_, i) => (i < e ? "yukari" : "yok")) : kutular } as AltKabuk;
  });
}

const ust = (n: number) => String(n).split("").map((c) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(c)]).join("");
/** "1s² 2s² 2p⁶" yazımı. */
export const orbitalDizilimMetni = (z: number, yuk = 0) => orbitalDizilimi(z, yuk).map((a) => `${a.ad}^${a.e}`).join(" ");
void ust;

function orbitalDuzeni(v: OrbitalVerisi, genislik: number) {
  const gruplar = orbitalDizilimi(v.z, v.yuk);
  const toplamKutu = gruplar.reduce((t, g) => t + g.kutular.length, 0);
  const bosluk = 0.55;
  const tekSatir = toplamKutu + (gruplar.length - 1) * bosluk;
  const c = Math.max(15, Math.min(30, genislik / Math.max(tekSatir, 1)));
  // Satırlara böl (kenar boşluğu kadar sar)
  const satirlar: AltKabuk[][] = [[]];
  let imlec = 0;
  for (const g of gruplar) {
    const gw = g.kutular.length * c;
    if (imlec > 0 && imlec + gw > genislik + 0.5) { satirlar.push([]); imlec = 0; }
    satirlar[satirlar.length - 1].push(g);
    imlec += gw + bosluk * c;
  }
  return { gruplar, satirlar, c, bosluk };
}

export function orbitalBoyutu(v: OrbitalVerisi): { w: number; h: number } {
  const w = 420;
  const d = orbitalDuzeni(v, w - 20);
  return { w, h: Math.round(d.satirlar.length * (d.c + 38) + (v.dizilim ? 28 : 6)) };
}

function orbitalCiz(ctx: CanvasRenderingContext2D, v: OrbitalVerisi, k: Kutu) {
  const d = orbitalDuzeni(v, k.w - 8);
  const satirYuk = d.c + 38;
  ctx.save();
  ctx.lineWidth = Math.max(1, ctx.lineWidth * 0.75);
  d.satirlar.forEach((satir, si) => {
    let x = k.x + 4;
    const y = k.y + si * satirYuk + 6;
    for (const g of satir) {
      g.kutular.forEach((durum, i) => {
        const bx = x + i * d.c;
        ctx.beginPath(); ctx.rect(bx, y, d.c, d.c); ctx.stroke();
        const ok = (px: number, yukari: boolean) => {
          const a = y + d.c * 0.14, b = y + d.c * 0.86;
          cizgi(ctx, px, yukari ? b : a, px, yukari ? a : b);
          const uc = yukari ? a : b, yon = yukari ? 1 : -1, bx2 = d.c * 0.16;
          ctx.beginPath(); ctx.moveTo(px, uc); ctx.lineTo(px - bx2, uc + yon * bx2 * 1.4); ctx.moveTo(px, uc); ctx.lineTo(px + bx2, uc + yon * bx2 * 1.4); ctx.stroke();
        };
        if (durum === "cift") { ok(bx + d.c * 0.32, true); ok(bx + d.c * 0.68, false); }
        else if (durum === "yukari") ok(bx + d.c * 0.5, true);
      });
      fizikMetniCiz(ctx, `${g.ad}^${g.e}`, x + (g.kutular.length * d.c) / 2, y + d.c + 14, 15);
      x += g.kutular.length * d.c + d.bosluk * d.c;
    }
  });
  ctx.restore();
  if (v.dizilim) fizikMetniCiz(ctx, orbitalDizilimMetni(v.z, v.yuk), k.x + k.w / 2, k.y + d.satirlar.length * satirYuk + 14, 16);
}

// ═══════════════════════════════════════════════════════════════════════════
// Tuz köprülü pil (Daniell tipi)
// ═══════════════════════════════════════════════════════════════════════════

export type PilVerisi = Extract<KimyaVerisi, { tur: "pil" }>;

function pilCiz(ctx: CanvasRenderingContext2D, v: PilVerisi, k: Kutu) {
  const bw = k.w * 0.3, bh = k.h * 0.5;
  const topY = k.y + k.h * 0.4, botY = topY + bh;
  const lx = k.x + k.w * 0.08, rx = k.x + k.w * 0.62;
  const seviye = topY + bh * 0.28;
  const tel = k.y + k.h * 0.1;
  // Beherler (üstü açık) ve çözelti yüzeyi
  for (const bx of [lx, rx]) {
    ctx.beginPath(); ctx.moveTo(bx, topY); ctx.lineTo(bx, botY); ctx.lineTo(bx + bw, botY); ctx.lineTo(bx + bw, topY); ctx.stroke();
    ctx.save(); ctx.lineWidth = Math.max(0.9, ctx.lineWidth * 0.55); cizgi(ctx, bx + 1, seviye, bx + bw - 1, seviye); ctx.restore();
  }
  // Elektrotlar: çözeltiye batık dikdörtgen çubuklar; anot (−) sol, katot (+) sağ
  const ew = Math.max(9, bw * 0.12);
  const elektrotX = [lx + bw * 0.3, rx + bw * 0.3];
  for (const ex of elektrotX) {
    ctx.beginPath(); ctx.rect(ex - ew / 2, tel + 4, ew, botY - 10 - (tel + 4)); ctx.stroke();
  }
  // Çözelti yazıları (beherin altı) ve elektrot adları (üst)
  fizikMetniCiz(ctx, v.anotCozelti, lx + bw / 2, botY + 18, 15);
  fizikMetniCiz(ctx, v.katotCozelti, rx + bw / 2, botY + 18, 15);
  fizikMetniCiz(ctx, v.anot, elektrotX[0] - ew / 2 - 8, tel + (topY - tel) * 0.55, 17, "sag");
  fizikMetniCiz(ctx, v.katot, elektrotX[1] + ew / 2 + 8, tel + (topY - tel) * 0.55, 17, "sol");
  fizikMetniCiz(ctx, "Anot (−)", lx + bw / 2, botY + 38, 14);
  fizikMetniCiz(ctx, "Katot (+)", rx + bw / 2, botY + 38, 14);
  // Dış devre teli: elektrot üstlerinden yukarı, yatay; ortada voltmetre ya da boşluksuz tel
  const orta = (elektrotX[0] + elektrotX[1]) / 2;
  cizgi(ctx, elektrotX[0], tel + 4, elektrotX[0], tel);
  cizgi(ctx, elektrotX[1], tel + 4, elektrotX[1], tel);
  if (v.voltmetre) {
    const r = 15;
    cizgi(ctx, elektrotX[0], tel, orta - r, tel);
    cizgi(ctx, orta + r, tel, elektrotX[1], tel);
    ctx.beginPath(); ctx.arc(orta, tel, r, 0, Math.PI * 2); ctx.stroke();
    fizikMetniCiz(ctx, "V", orta, tel + 1, 19);
  } else cizgi(ctx, elektrotX[0], tel, elektrotX[1], tel);
  // Elektron yönü: anottan katota (tel üstünde sağa ok) — e⁻
  const okX = elektrotX[0] + (orta - 18 - elektrotX[0]) * 0.55;
  ctx.beginPath(); ctx.moveTo(okX + 10, tel - 9); ctx.lineTo(okX - 4, tel - 14); ctx.lineTo(okX - 4, tel - 4); ctx.closePath(); ctx.fill();
  cizgi(ctx, okX - 24, tel - 9, okX, tel - 9);
  fizikMetniCiz(ctx, "e^−", okX - 14, tel - 24, 15);
  // Tuz köprüsü: ters U, iki bacak çözeltiye batık
  const kx0 = lx + bw * 0.78, kx1 = rx + bw * 0.22;
  const ky = topY - k.h * 0.1, bacakAlt = seviye + bh * 0.22, t = 7;
  ctx.beginPath();
  ctx.moveTo(kx0 - t, bacakAlt); ctx.lineTo(kx0 - t, ky); ctx.lineTo(kx1 + t, ky); ctx.lineTo(kx1 + t, bacakAlt);
  ctx.moveTo(kx0 + t, bacakAlt); ctx.lineTo(kx0 + t, ky + 2 * t); ctx.lineTo(kx1 - t, ky + 2 * t); ctx.lineTo(kx1 - t, bacakAlt);
  ctx.stroke();
  cizgi(ctx, kx0 - t, bacakAlt, kx0 + t, bacakAlt);
  cizgi(ctx, kx1 - t, bacakAlt, kx1 + t, bacakAlt);
  fizikMetniCiz(ctx, "Tuz köprüsü", (kx0 + kx1) / 2, ky - 12, 15);
  if (v.iyonlar) {
    // İyon göçü: anyonlar anota, katyonlar katota (köprü içinde)
    const iy = ky + t;
    const ort = (kx0 + kx1) / 2;
    cizgi(ctx, ort - 2, iy, ort - 34, iy);
    ctx.beginPath(); ctx.moveTo(ort - 40, iy); ctx.lineTo(ort - 30, iy - 4); ctx.lineTo(ort - 30, iy + 4); ctx.closePath(); ctx.fill();
    cizgi(ctx, ort + 2, iy, ort + 34, iy);
    ctx.beginPath(); ctx.moveTo(ort + 40, iy); ctx.lineTo(ort + 30, iy - 4); ctx.lineTo(ort + 30, iy + 4); ctx.closePath(); ctx.fill();
    fizikMetniCiz(ctx, "anyon", ort - 22, iy + 16, 12);
    fizikMetniCiz(ctx, "katyon", ort + 22, iy + 16, 12);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Dışa açık: çizim, doğrulama, şablon
// ═══════════════════════════════════════════════════════════════════════════

export function kimyaPayi() {
  return { sol: 24, ust: 34, sag: 30, alt: 34 };
}

export function kimyaCiz(ctx: CanvasRenderingContext2D, s: FizikSekli) {
  const v = s.kimya && kimyaVerisiGecerliMi(s.kimya) ? s.kimya : varsayilanKimya();
  const k = { x: s.x, y: s.y, w: s.w, h: s.h };
  ctx.save();
  ctx.strokeStyle = MUREKKEP;
  ctx.fillStyle = MUREKKEP;
  ctx.lineWidth = Math.max(1.4, Math.min(2.2, s.kalinlik * 0.8));
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.setLineDash([]);
  if (v.tur === "atom") atomCiz(ctx, v, k);
  else if (v.tur === "molekul") molekulCiz(ctx, v, k);
  else if (v.tur === "orbital") orbitalCiz(ctx, v, k);
  else if (v.tur === "pil") pilCiz(ctx, v, k);
  else periyodikCiz(ctx, v, k);
  if (v.baslik?.trim()) fizikMetniCiz(ctx, v.baslik.trim(), k.x + k.w / 2, k.y - (v.tur === "periyodik" && v.grupNo ? 24 : 16), 16);
  ctx.restore();
}

export function kimyaVerisiGecerliMi(v: unknown): v is KimyaVerisi {
  if (!v || typeof v !== "object") return false;
  const g = v as Record<string, unknown>;
  if (g.baslik !== undefined && typeof g.baslik !== "string") return false;
  const tamSayi = (x: unknown, a: number, b: number) => typeof x === "number" && Number.isInteger(x) && x >= a && x <= b;
  if (g.tur === "atom") {
    return tamSayi(g.z, 1, 118) && tamSayi(g.yuk, -4, 8) && ["yuk", "pn", "sembol"].includes(String(g.cekirdek)) && typeof g.kabukAdi === "boolean" &&
      (g.notron === undefined || tamSayi(g.notron, 0, 200)) &&
      (g.kabuklar === undefined || (Array.isArray(g.kabuklar) && g.kabuklar.length <= 7 && g.kabuklar.every((x) => tamSayi(x, 0, 32))));
  }
  if (g.tur === "molekul") {
    if (typeof g.id !== "string" || !(g.gosterim === "lewis" || g.gosterim === "cizgi") || typeof g.kismiYuk !== "boolean" || typeof g.geometri !== "boolean") return false;
    if (g.id === "ozel") {
      const o = g.ozel as Record<string, unknown> | undefined;
      return !!o && typeof o.ad === "string" && typeof o.atomlar === "string" && typeof o.baglar === "string" && o.ad.length <= 40 && o.atomlar.length <= 800 && o.baglar.length <= 400 &&
        "molekul" in ozelMolekulOku(o.ad, o.atomlar, o.baglar);
    }
    if (g.id === "zincir") {
      const z = g.zincir as Record<string, unknown> | undefined;
      if (!z || !tamSayi(z.n, 2, 12) || !["alkan", "alken", "alkin"].includes(String(z.tur)) || !tamSayi(z.konum, 1, 11)) return false;
      // v1.2: halka (sikloalkan, 3–8) ve yan gruplar yalnız alkanda; değerlik aşılmamalı.
      if (z.halka !== undefined && typeof z.halka !== "boolean") return false;
      if (z.yanGruplar !== undefined) {
        if (!Array.isArray(z.yanGruplar) || z.yanGruplar.length > 8) return false;
        if (!z.yanGruplar.every((y) => !!y && typeof y === "object" && tamSayi((y as Record<string, unknown>).k, 1, 12) && ORGANIK_YAN_GRUPLAR.some((t) => t.g === (y as Record<string, unknown>).g))) return false;
      }
      if ((z.halka || (z.yanGruplar as unknown[] | undefined)?.length) && (z.tur !== "alkan" || "hata" in organikGraf(z as { n: number; halka?: boolean; yanGruplar?: { k: number; g: OrganikYanGrup }[] }))) return false;
      return true;
    }
    return !!molekulBul(g.id);
  }
  if (g.tur === "orbital") return tamSayi(g.z, 1, 118) && tamSayi(g.yuk, -4, 8) && typeof g.dizilim === "boolean";
  if (g.tur === "pil") {
    return ["anot", "katot", "anotCozelti", "katotCozelti"].every((a) => typeof g[a] === "string" && (g[a] as string).length <= 40) && typeof g.voltmetre === "boolean" && typeof g.iyonlar === "boolean";
  }
  if (g.tur === "periyodik") {
    const liste = (x: unknown) => Array.isArray(x) && x.length <= 118 && x.every((z) => tamSayi(z, 1, 118));
    return ["tum", "ilk20", "ilk3", "ana"].includes(String(g.bolge)) && ["sembol", "sembolNo", "tam"].includes(String(g.goster)) && liste(g.boyali) && liste(g.soru) && typeof g.grupNo === "boolean";
  }
  return false;
}

export const atomVerisi = (z: number, yuk = 0, ek: Partial<Extract<KimyaVerisi, { tur: "atom" }>> = {}): KimyaVerisi => ({
  tur: "atom", z, yuk, cekirdek: "yuk", kabukAdi: false,
  baslik: `${ELEMENT_SEMBOLLERI[z - 1]}${yuk ? `^${yuk > 0 ? (yuk > 1 ? yuk : "") : yuk < -1 ? -yuk : ""}${yuk > 0 ? "+" : "−"}` : ""}`,
  ...ek,
});

export const molekulVerisi = (id: string, ek: Partial<Extract<KimyaVerisi, { tur: "molekul" }>> = {}): KimyaVerisi => ({
  tur: "molekul", id, gosterim: "cizgi", kismiYuk: false, geometri: true, ...ek,
});

export const periyodikVerisi = (ek: Partial<PeriyodikVerisi> = {}): KimyaVerisi => ({
  tur: "periyodik", bolge: "tum", goster: "sembolNo", boyali: [], soru: [], grupNo: true, ...ek,
});

export const varsayilanKimya = (): KimyaVerisi => atomVerisi(17);

export type KimyaSablonu = { id: string; ad: string; ipucu: string; olustur: () => KimyaVerisi };

export const KIMYA_ATOM_SABLONLARI: KimyaSablonu[] = [
  { id: "atom-cl", ad: "Bohr atomu (Cl)", ipucu: "Atom numarasını değiştirin; kabuklar otomatik dolar", olustur: () => atomVerisi(17) },
  { id: "atom-na", ad: "Na atomu", ipucu: "1 değerlik elektronlu", olustur: () => atomVerisi(11) },
  { id: "iyon-na", ad: "Na⁺ iyonu", ipucu: "Cation: dış kabuktan elektron eksilir", olustur: () => atomVerisi(11, 1) },
  { id: "iyon-cl", ad: "Cl⁻ iyonu", ipucu: "Anyon: elektron eklenir", olustur: () => atomVerisi(17, -1) },
];

export const KIMYA_MOLEKUL_SABLONLARI: KimyaSablonu[] = MOLEKULLER.filter((m) => m.grup !== "organik").map((m) => ({
  id: `mol-${m.id}`, ad: m.ad, ipucu: `${m.ad}: ${m.geo}`, olustur: () => molekulVerisi(m.id, m.id === "nacl" ? { geometri: false } : {}),
}));

/** Organik yapılar: iskelet formülü, fonksiyonel gruplar, izomerler. */
export const KIMYA_ORGANIK_SABLONLARI: KimyaSablonu[] = MOLEKULLER.filter((m) => m.grup === "organik").map((m) => ({
  id: `org-${m.id}`, ad: m.ad, ipucu: m.geo, olustur: () => molekulVerisi(m.id, { geometri: true }),
}));

export const zincirVerisi = (n: number, tur: "alkan" | "alken" | "alkin", konum = 1): KimyaVerisi =>
  molekulVerisi("zincir", { zincir: { n, tur, konum }, geometri: true });

export const ozelMolekulVerisi = (ad = OZEL_MOLEKUL_ORNEGI.ad, atomlar = OZEL_MOLEKUL_ORNEGI.atomlar, baglar = OZEL_MOLEKUL_ORNEGI.baglar): KimyaVerisi =>
  molekulVerisi("ozel", { ozel: { ad, atomlar, baglar }, gosterim: "lewis", geometri: false });

export const orbitalVerisi = (z: number, yuk = 0, ek: Partial<OrbitalVerisi> = {}): KimyaVerisi => ({
  tur: "orbital", z, yuk, dizilim: true, baslik: `${ELEMENT_SEMBOLLERI[z - 1]}${yuk ? `^${Math.abs(yuk) > 1 ? Math.abs(yuk) : ""}${yuk > 0 ? "+" : "−"}` : ""}`, ...ek,
});

export const KIMYA_ORBITAL_SABLONLARI: KimyaSablonu[] = [
  { id: "orb-n", ad: "Orbital: N (Hund)", ipucu: "1s² 2s² 2p³: 2p'de üç kutuya birer yukarı ok (Hund kuralı)", olustur: () => orbitalVerisi(7) },
  { id: "orb-o", ad: "Orbital: O", ipucu: "1s² 2s² 2p⁴", olustur: () => orbitalVerisi(8) },
  { id: "orb-fe", ad: "Orbital: Fe", ipucu: "[Ar] 4s² 3d⁶; Aufbau sırası 4s → 3d", olustur: () => orbitalVerisi(26) },
  { id: "orb-fe2", ad: "Orbital: Fe²⁺", ipucu: "Katyonda önce 4s elektronları alınır", olustur: () => orbitalVerisi(26, 2) },
  { id: "orb-cl", ad: "Orbital: Cl⁻", ipucu: "Anyon: elektron eklenir", olustur: () => orbitalVerisi(17, -1) },
];

export const pilVerisi = (ek: Partial<PilVerisi> = {}): KimyaVerisi => ({
  tur: "pil", anot: "Zn", katot: "Cu", anotCozelti: "ZnSO_4(aq)", katotCozelti: "CuSO_4(aq)", voltmetre: true, iyonlar: true, ...ek,
});

export const KIMYA_PIL_SABLONLARI: KimyaSablonu[] = [
  { id: "pil-daniell", ad: "Daniell pili", ipucu: "Zn | Zn²⁺ ‖ Cu²⁺ | Cu: anot, katot, tuz köprüsü, e⁻ yönü, voltmetre", olustur: () => pilVerisi() },
  { id: "pil-agcu", ad: "Cu–Ag pili", ipucu: "Cu anot, Ag katot", olustur: () => pilVerisi({ anot: "Cu", katot: "Ag", anotCozelti: "CuSO_4(aq)", katotCozelti: "AgNO_3(aq)" }) },
];

export const KIMYA_PERIYODIK_SABLONLARI: KimyaSablonu[] = [
  { id: "per-tum", ad: "Tam tablo", ipucu: "118 element, iç geçiş satırlarıyla", olustur: () => periyodikVerisi() },
  { id: "per-ilk20", ad: "İlk 20 element", ipucu: "H–Ca", olustur: () => periyodikVerisi({ bolge: "ilk20" }) },
  { id: "per-ilk3", ad: "İlk 3 periyot", ipucu: "H–Ar", olustur: () => periyodikVerisi({ bolge: "ilk3" }) },
  { id: "per-ana", ad: "Ana gruplar (A)", ipucu: "Geçiş metalleri olmadan", olustur: () => periyodikVerisi({ bolge: "ana" }) },
  { id: "per-soru", ad: "Soru: boyalı + ?", ipucu: "Bazı elementleri boyar, bazılarının simgesini ? yapar", olustur: () => periyodikVerisi({ bolge: "ilk20", goster: "sembolNo", boyali: [8, 16], soru: [11, 17] }) },
];

// ═══════════════════════════════════════════════════════════════════════════
// Kimya grafikleri (ısınma eğrisi, çözünürlük, enerji profili…) — `grafik.ts` verisi
// ═══════════════════════════════════════════════════════════════════════════

const SIYAH = "#111827";
const kg = (egriler: GrafikEgrisi[], ek: Partial<GrafikVerisi>): GrafikVerisi => ({ egriler, xEtiket: "", yEtiket: "", izgara: false, sayilar: "yok", ...ek });
const fonk = (ifade: string, ek: object = {}): GrafikEgrisi => ({ tur: "fonksiyon", ifade, renk: SIYAH, ...ek });
const profil = (bas: number, son: number, tepe: number) => `${bas}+(${son - bas})/(1+exp(-1.5*(x-5.5)))+${tepe}*exp(-((x-4)/1.3)^2)`;
const ENERJI = { xEtiket: "Tepkime koordinatı", yEtiket: "Potansiyel enerji", xMin: 0, xMax: 10, yMin: 0, yMax: 70 };

export type KimyaGrafikSablonu = { id: string; ad: string; ipucu: string; olustur: () => GrafikVerisi };

export const KIMYA_GRAFIK_SABLONLARI: KimyaGrafikSablonu[] = [
  { id: "k-isinma", ad: "Isınma eğrisi", ipucu: "Hâl değişimi: erime ve kaynama platoları",
    olustur: () => kg([{ tur: "noktalar", noktalar: [{ x: 0, y: -20 }, { x: 2, y: 0 }, { x: 5, y: 0 }, { x: 9, y: 100 }, { x: 12, y: 100 }, { x: 14, y: 120 }], renk: SIYAH }], { xEtiket: "Verilen ısı", yEtiket: "Sıcaklık (°C)" }) },
  { id: "k-soguma", ad: "Soğuma eğrisi", ipucu: "Yoğuşma ve donma platoları",
    olustur: () => kg([{ tur: "noktalar", noktalar: [{ x: 0, y: 120 }, { x: 2, y: 100 }, { x: 5, y: 100 }, { x: 9, y: 0 }, { x: 12, y: 0 }, { x: 14, y: -20 }], renk: SIYAH }], { xEtiket: "Alınan ısı", yEtiket: "Sıcaklık (°C)" }) },
  { id: "k-cozunurluk", ad: "Çözünürlük eğrisi", ipucu: "KNO₃, KCl ve NaCl çözünürlüğü (g/100 g su)",
    olustur: () => kg([
      { tur: "noktalar", noktalar: [0, 20, 40, 60, 80, 100].map((x, i) => ({ x, y: [13, 32, 64, 110, 169, 246][i] })), renk: SIYAH, etiket: "KNO_3" },
      { tur: "noktalar", noktalar: [0, 20, 40, 60, 80, 100].map((x, i) => ({ x, y: [28, 34, 40, 46, 51, 56][i] })), renk: "#6b7280", etiket: "KCl" },
      { tur: "noktalar", noktalar: [0, 20, 40, 60, 80, 100].map((x, i) => ({ x, y: [35.7, 36, 36.6, 37.3, 38, 39.2][i] })), renk: "#6b7280", kesik: true, etiket: "NaCl" },
    ], { xEtiket: "Sıcaklık (°C)", yEtiket: "Çözünürlük (g/100 g su)", izgara: true, sayilar: "oto", xMin: 0, xMax: 100, xAdim: 20, yMin: 0, yMax: 260, yAdim: 20 }) },
  { id: "k-hiz", ad: "Derişim – zaman", ipucu: "Giren azalır, ürün artar",
    olustur: () => kg([fonk("10*exp(-0.35*x)", { etiket: "Girenler" }), fonk("10-10*exp(-0.35*x)", { kesik: true, etiket: "Ürünler" })], { xEtiket: "Zaman", yEtiket: "Derişim", xMin: 0, xMax: 10, yMin: 0, yMax: 10 }) },
  { id: "k-ekzo", ad: "Ekzotermik enerji", ipucu: "Girenler ürünlerden yüksek; aktivasyon enerjisi tepesi",
    olustur: () => kg([fonk(profil(40, 15, 22)), { tur: "isaret", noktalar: [{ x: 0.9, y: 40, ad: "Girenler" }, { x: 9.1, y: 15, ad: "Ürünler" }], renk: SIYAH }], ENERJI) },
  { id: "k-endo", ad: "Endotermik enerji", ipucu: "Ürünler girenlerden yüksek",
    olustur: () => kg([fonk(profil(15, 35, 22)), { tur: "isaret", noktalar: [{ x: 0.9, y: 15, ad: "Girenler" }, { x: 9.1, y: 35, ad: "Ürünler" }], renk: SIYAH }], ENERJI) },
  { id: "k-katalizor", ad: "Katalizörlü enerji", ipucu: "Katalizör aktivasyon enerjisini düşürür",
    olustur: () => kg([fonk(profil(40, 15, 22)), fonk(profil(40, 15, 10), { kesik: true }), { tur: "isaret", noktalar: [{ x: 4, y: 59.6, ad: "Katalizörsüz" }, { x: 4, y: 47.6, ad: "Katalizörlü" }], renk: SIYAH }], ENERJI) },
  { id: "k-titrasyon", ad: "Titrasyon eğrisi", ipucu: "Kuvvetli asit – kuvvetli baz (eşdeğerlik noktası pH 7)",
    olustur: () => kg([fonk("7+6*tanh(1.2*(x-10))")], { xEtiket: "Eklenen baz (mL)", yEtiket: "pH", izgara: true, sayilar: "oto", xMin: 0, xMax: 20, yMin: 0, yMax: 14, xAdim: 5, yAdim: 2 }) },
];
