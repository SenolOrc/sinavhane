// Jeoloji blok diyagramları: horst–graben, antiklinal, senklinal.
// Eğik (kabine) izdüşümle çizilen 3B blok: ön yüz = kesit, üst yüz = yer yüzeyi, sağ yüz = yan kesit.
// Koordinat: x sağa, z YUKARI (kesit düzlemi), y derinlik (öndeki 0 → arka D).
import { fizikMetniCiz } from "../fizik";
import { ayarMantik, ayarMetin, ayarSayi, ayarSec, type CografyaVerisi } from "./sema";

type Kutu = { x: number; y: number; w: number; h: number };
type N = { x: number; y: number };

const W = 10, H = 6, D = 4.2, TABAN = 0.9;
const CX = 0.46, CY = 0.36;
const GRI = ["#ffffff", "#e4e4e4", "#cfcfcf", "#bababa", "#a6a6a6"];
const RENKLI = ["#f3e9cf", "#e8d6a8", "#dcc690", "#cdb078", "#bf9b62"];
const TABAN_GRI = "#8c8c8c", TABAN_RENKLI = "#7a5230";
const P = (x: number, y: number, z: number): N => ({ x: x + y * CX, y: z + y * CY });

export function jeolojiAdlari(v: CografyaVerisi): string[] {
  return ayarMetin(v, "adlar").split(",").map((t) => t.trim().slice(0, 14));
}

// ── Horst–graben profili ─────────────────────────────────────────────────────
export type FayProfili = { z: number[]; fayX: (taraf: 0 | 1, z: number) => number; atim: number };
export function fayProfili(v: CografyaVerisi): FayProfili {
  const n = Math.round(ayarSayi(v, "katman"));
  const kalin = (H - TABAN) / n;
  const z = Array.from({ length: n + 1 }, (_, i) => H - i * kalin);
  const gen = Math.min(ayarSayi(v, "genislik"), W - 3);
  // Graben tabanda en az 0,8 birim açık kalsın (faylar birbirini kesmesin).
  const e = Math.max(0, Math.min(ayarSayi(v, "egim"), (gen / 2 - 0.4) / H));
  const fayX = (t: 0 | 1, zz: number) => (t === 0 ? W / 2 - gen / 2 + (H - zz) * e : W / 2 + gen / 2 - (H - zz) * e);
  return { z, fayX, atim: Math.min(ayarSayi(v, "atim"), kalin * 1.9) };
}

// ── Kıvrım profili: katman sınırları z_i(x) ─────────────────────────────────
/** Kıvrım: tepe/çukur ortada, kanatlar yanlara iner (antiklinal +, senklinal −). */
export function kivrimSiniri(i: number, n: number, genlik: number, isaret: 1 | -1): (x: number) => number {
  const kalin = (H - TABAN - 1.2) / n; // yüzey kıvrım üstünde 1,2 birim pay
  const taban = H - 1.2 - i * kalin;
  const tepe = genlik * isaret;
  // Üst katmanlar altlardan biraz daha yumuşak: gerçekçi paralel kıvrım.
  const a = tepe * (1 - 0.06 * i);
  return (x) => taban + a * Math.cos(((x - W / 2) / W) * 2 * Math.PI * 0.9);
}

function poligon(ctx: CanvasRenderingContext2D, pts: N[], T: (p: N) => N, dolgu?: string, kapat = true) {
  ctx.beginPath();
  pts.forEach((p, i) => { const q = T(p); if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); });
  if (kapat) ctx.closePath();
  if (dolgu) { ctx.save(); ctx.fillStyle = dolgu; ctx.fill(); ctx.restore(); }
  ctx.stroke();
}
function ok(ctx: CanvasRenderingContext2D, a: N, b: N) {
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  const s = 7;
  ctx.beginPath(); ctx.moveTo(b.x, b.y);
  ctx.lineTo(b.x - ux * s - uy * s * 0.45, b.y - uy * s + ux * s * 0.45);
  ctx.lineTo(b.x - ux * s + uy * s * 0.45, b.y - uy * s - ux * s * 0.45);
  ctx.closePath(); ctx.save(); ctx.fillStyle = ctx.strokeStyle as string; ctx.fill(); ctx.restore();
}

type Duzen = { T: (p: N) => N; olcek: number; punto: number };
function duzen(ctx: CanvasRenderingContext2D, k: Kutu, yazi: boolean, ustPay = 0, hUst = H): Duzen {
  const yaziPay = yazi ? 22 + ustPay : 6 + ustPay;
  const bw = W + D * CX, bh = hUst + D * CY;
  const olcek = Math.max(1e-6, Math.min((k.w - 12) / bw, (k.h - yaziPay - 8 - (yazi ? 16 : 0)) / bh));
  const ox = k.x + (k.w - bw * olcek) / 2;
  const oy = k.y + k.h - (yazi ? 22 : 6);
  void ctx;
  return { T: (p) => ({ x: ox + p.x * olcek, y: oy - p.y * olcek }), olcek, punto: Math.max(11, Math.min(16, olcek * 0.9)) };
}

export function horstGrabenCiz(ctx: CanvasRenderingContext2D, v: CografyaVerisi, k: Kutu) {
  const pr = fayProfili(v);
  const n = pr.z.length - 1, d = pr.atim;
  const renkli = ayarSec(v, "renk") === "renkli";
  const renkler = renkli ? RENKLI : GRI, taban = renkli ? TABAN_RENKLI : TABAN_GRI;
  const doluRenk = (i: number) => (i >= n ? taban : renkler[Math.min(i, renkler.length - 1)]);
  const yaz = ayarMantik(v, "yaz");
  const { T, punto } = duzen(ctx, k, yaz);
  const A = P, fx = pr.fayX, zUst = pr.z[0];
  ctx.save(); ctx.lineJoin = "round";
  const xl0 = fx(0, zUst), xl1 = fx(0, zUst - d), xr1 = fx(1, zUst - d), xr0 = fx(1, zUst);
  const ustYuz = (x0: number, z0: number, x1: number, z1: number) => poligon(ctx, [A(x0, 0, z0), A(x1, 0, z1), A(x1, D, z1), A(x0, D, z0)], T, doluRenk(0));
  ustYuz(0, zUst, xl0, zUst); ustYuz(xl0, zUst, xl1, zUst - d); ustYuz(xl1, zUst - d, xr1, zUst - d); ustYuz(xr1, zUst - d, xr0, zUst); ustYuz(xr0, zUst, W, zUst);
  for (let i = 0; i < n + 1; i++) {
    const z0 = pr.z[i] ?? pr.z[n], z1 = i < n ? pr.z[i + 1] : 0;
    poligon(ctx, [A(W, 0, z0), A(W, D, z0), A(W, D, z1), A(W, 0, z1)], T, doluRenk(i));
  }
  const blok = (soldan: (z: number) => number, sagdan: (z: number) => number, kayma: number) => {
    for (let i = 0; i < n + 1; i++) {
      const zu = Math.max(0, pr.z[i] - kayma), za = i < n ? Math.max(0, pr.z[i + 1] - kayma) : 0;
      if (zu - za < 1e-9) continue;
      poligon(ctx, [A(soldan(zu), 0, zu), A(sagdan(zu), 0, zu), A(sagdan(za), 0, za), A(soldan(za), 0, za)], T, doluRenk(i));
    }
  };
  blok(() => 0, (z) => fx(0, z), 0); blok((z) => fx(0, z), (z) => fx(1, z), d); blok((z) => fx(1, z), () => W, 0);
  ctx.save(); ctx.lineWidth = Math.max(1.4, ctx.lineWidth * 1.15);
  for (const t of [0, 1] as const) { const a = T(A(fx(t, zUst), 0, zUst)), b = T(A(fx(t, 0), 0, 0)); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  ctx.restore();
  if (ayarMantik(v, "ok")) {
    const zm = zUst * 0.66, dz = 0.55;
    for (const t of [0, 1] as const) {
      const xm = fx(t, zm), e = 0.28 * (t === 0 ? 1 : -1);
      ok(ctx, T(A(xm - e, 0, zm - dz * 0.5)), T(A(xm - e, 0, zm + dz * 0.5))); // horst ↑
      ok(ctx, T(A(xm + e, 0, zm + dz * 0.5)), T(A(xm + e, 0, zm - dz * 0.5))); // graben ↓
    }
  }
  if (yaz) {
    const ad = jeolojiAdlari(v);
    const tepe = (x: number, z: number, s: string) => { const p = T(A(x, D / 2, z)); if (s) fizikMetniCiz(ctx, s, p.x, p.y - 4, punto); };
    tepe(xl0 / 2, zUst, ad[0] ?? ""); tepe(W / 2, zUst - d, ad[1] ?? ""); tepe((xr0 + W) / 2, zUst, ad[2] ?? "");
    for (const t of [0, 1] as const) { const s = ad[3 + t] ?? ""; if (!s) continue; const p = T(A(fx(t, 0), 0, 0)); fizikMetniCiz(ctx, s, p.x + (t === 0 ? -14 : 14), p.y + 13, punto); }
  }
  ctx.restore();
}

export function kivrimCiz(ctx: CanvasRenderingContext2D, v: CografyaVerisi, k: Kutu) {
  const isaret: 1 | -1 = v.yapi === "antiklinal" ? 1 : -1;
  const n = Math.round(ayarSayi(v, "katman")), g = ayarSayi(v, "genlik");
  const renkli = ayarSec(v, "renk") === "renkli";
  const renkler = renkli ? RENKLI : GRI, taban = renkli ? TABAN_RENKLI : TABAN_GRI;
  const doluRenk = (i: number) => (i >= n ? taban : renkler[Math.min(i, renkler.length - 1)]);
  const duz = ayarSec(v, "yuzey") === "duz";
  const yaz = ayarMantik(v, "yaz"), eksen = ayarMantik(v, "eksen");
  const b: ((x: number) => number)[] = Array.from({ length: n }, (_, i) => kivrimSiniri(i, n, g, isaret));
  const kalin = (H - TABAN - 1.2) / n;
  const zDuz = H - 1.2 - Math.min(0.6, g * 0.4); // aşınmış düz yüzey kotu (kıvrımı keser → şeritler)
  const yuzey = (x: number) => (duz ? zDuz : b[0](x) + 0.45);
  const zMax = duz ? zDuz : Math.max(...Array.from({ length: 41 }, (_, j) => yuzey((j / 40) * W)));
  const { T, punto } = duzen(ctx, k, yaz, 0, zMax);
  const sinir = (i: number, x: number) => (i === 0 ? yuzey(x) : i < n ? Math.min(b[i](x), yuzey(x)) : Math.min(TABAN, yuzey(x)));
  const alt = (i: number, x: number) => (i + 1 < n ? Math.min(b[i + 1](x), yuzey(x)) : Math.min(TABAN, yuzey(x)));
  void kalin;
  const NX = 70;
  const xs = Array.from({ length: NX + 1 }, (_, j) => (j / NX) * W);
  ctx.save(); ctx.lineJoin = "round";
  // Üst yüz
  if (duz) {
    const kat = (x: number) => { const z = zDuz; for (let i = 0; i < n; i++) if (z >= (i + 1 < n ? b[i + 1](x) : TABAN) - 1e-9 && (i === 0 || z <= b[i](x) + 1e-9)) return i; return n; };
    const orta = (j: number) => kat((xs[j] + xs[j + 1]) / 2);
    let bas = 0;
    for (let j = 1; j <= NX; j++) {
      if (j === NX || orta(j) !== orta(bas)) {
        const x0 = xs[bas], x1 = xs[j], z = zDuz;
        poligon(ctx, [P(x0, 0, z), P(x1, 0, z), P(x1, D, z), P(x0, D, z)], T, doluRenk(orta(bas)));
        bas = j;
      }
    }
  } else {
    // Kıvrımlı yüzey: dolgu parçaları çizgisiz, sonra yalnız dış hat
    const ust = (y: number) => xs.map((x) => P(x, y, yuzey(x)));
    const on = ust(0), ar = ust(D);
    poligon(ctx, [...on, ...ar.slice().reverse()], T, doluRenk(0));
  }
  // Sağ yüz (x = W): kıvrım ekseni derinlik yönünde → yatay şeritler
  for (let i = 0; i <= n; i++) {
    const zu = i === 0 ? yuzey(W) : sinir(i, W), z1 = i < n ? alt(i, W) : 0;
    if (zu - z1 < 1e-9) continue;
    poligon(ctx, [P(W, 0, zu), P(W, D, zu), P(W, D, z1), P(W, 0, z1)], T, doluRenk(i));
  }
  // Ön yüz: her katman, kendi sınırları arasında
  for (let i = 0; i <= n; i++) {
    const ust: N[] = xs.map((x) => P(x, 0, i === 0 ? yuzey(x) : sinir(i, x)));
    const alts: N[] = xs.slice().reverse().map((x) => P(x, 0, i < n ? alt(i, x) : 0));
    // Kalınlığı sıfıra inen katmanlar (aşınma) görünmez
    if (ust.every((p, j) => Math.abs(p.y - alts[NX - j].y) < 1e-6)) continue;
    poligon(ctx, [...ust, ...alts], T, doluRenk(i));
  }
  if (eksen) {
    ctx.save(); ctx.setLineDash([6, 4]); ctx.lineWidth = Math.max(1, ctx.lineWidth * 0.8);
    const a = T(P(W / 2, 0, zMax + 0.8)), c = T(P(W / 2, 0, 0.35));
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke(); ctx.restore();
  }
  if (yaz) {
    const ad = jeolojiAdlari(v);
    const ust = T(P(W / 2, D / 2, yuzey(W / 2)));
    if (ad[0]) { const bg = ad[0].length * punto * 0.62 + 8; ctx.save(); ctx.fillStyle = "#fff"; ctx.fillRect(ust.x - bg / 2, ust.y - 8 - punto * 0.7, bg, punto * 1.4); ctx.restore(); fizikMetniCiz(ctx, ad[0], ust.x, ust.y - 8, punto); }
    if (eksen && ad[1]) { const p = T(P(W / 2, 0, 0)); fizikMetniCiz(ctx, ad[1], p.x, p.y + 13, punto); }
    if (ad[2]) {
      const x = W * 0.16, p = T(P(x, 0, (alt(1, x) + alt(0, x)) / 2));
      const bg = ad[2].length * punto * 0.55 + 6; ctx.save(); ctx.fillStyle = "#fff"; ctx.fillRect(p.x - bg / 2, p.y - punto * 0.55, bg, punto * 1.1); ctx.restore();
      fizikMetniCiz(ctx, ad[2], p.x, p.y, punto * 0.85);
    }
  }
  ctx.restore();
}
