// Eş yükselti (izohips) haritası: yapay araziden (tepe, vadi, sırt, boyun, yamaç) eğriler çıkarır
// (marching squares), yükseklik yazar, istenirse A–B profil grafiği ekler.
import { fizikMetniCiz } from "../fizik";
import { ayarMantik, ayarSayi, ayarSec, type CografyaVerisi } from "./sema";

type Kutu = { x: number; y: number; w: number; h: number };
type N = [number, number];

const g2 = (x: number, y: number, cx: number, cy: number, sx: number, sy: number) =>
  Math.exp(-(((x - cx) ** 2) / (2 * sx * sx) + ((y - cy) ** 2) / (2 * sy * sy)));
const ys = (t: number) => Math.max(0, Math.min(1, t));

/** Birim kare (0–1, y yukarı) üzerinde yükseklik (m). */
export function arazi(tur: string, H: number): (x: number, y: number) => number {
  switch (tur) {
    case "ikiTepe": return (x, y) => H * Math.max(g2(x, y, 0.3, 0.42, 0.17, 0.2), 0.72 * g2(x, y, 0.7, 0.62, 0.15, 0.17)) + 4;
    case "vadi": return (x, y) => H * (0.12 + 0.88 * ys(y)) * (0.3 + 0.7 * Math.min(1, Math.abs(x - 0.5) * 2) ** 1.3);
    case "sirt": return (x, y) => H * (0.12 + 0.88 * ys(y)) * (1 - 0.7 * Math.min(1, Math.abs(x - 0.5) * 2) ** 1.3);
    case "boyun": return (x, y) => H * (g2(x, y, 0.27, 0.5, 0.14, 0.14) + g2(x, y, 0.73, 0.5, 0.14, 0.14)) + 0.25 * H * (1 - Math.abs(y - 0.5) * 1.4) * 0 + 6;
    case "yamac": return (x, y) => H * (1 - Math.exp(-3.2 * ys(x))) / (1 - Math.exp(-3.2)) * (0.92 + 0.08 * Math.sin(y * 3));
    default: return (x, y) => H * g2(x, y, 0.5, 0.5, 0.21, 0.26) + 4; // tepe
  }
}

type Parca = { a: N; b: N };
/** Marching squares: bir kot için kesik doğru parçaları (birim kare koordinatı). */
export function kotParcalari(f: (x: number, y: number) => number, kot: number, n = 90): Parca[] {
  const out: Parca[] = [];
  const v = (i: number, j: number) => f(i / n, j / n);
  const ara = (p: N, q: N, vp: number, vq: number): N => { const t = (kot - vp) / (vq - vp); return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; };
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const a = v(i, j), b = v(i + 1, j), c = v(i + 1, j + 1), d = v(i, j + 1);
    const idx = (a >= kot ? 1 : 0) | (b >= kot ? 2 : 0) | (c >= kot ? 4 : 0) | (d >= kot ? 8 : 0);
    if (idx === 0 || idx === 15) continue;
    const x0 = i / n, x1 = (i + 1) / n, y0 = j / n, y1 = (j + 1) / n;
    const alt = () => ara([x0, y0], [x1, y0], a, b), sag = () => ara([x1, y0], [x1, y1], b, c);
    const ust = () => ara([x0, y1], [x1, y1], d, c), sol = () => ara([x0, y0], [x0, y1], a, d);
    const ekle = (p: N, q: N) => out.push({ a: p, b: q });
    switch (idx) {
      case 1: case 14: ekle(sol(), alt()); break;
      case 2: case 13: ekle(alt(), sag()); break;
      case 3: case 12: ekle(sol(), sag()); break;
      case 4: case 11: ekle(sag(), ust()); break;
      case 6: case 9: ekle(alt(), ust()); break;
      case 7: case 8: ekle(sol(), ust()); break;
      case 5: ekle(sol(), ust()); ekle(alt(), sag()); break;
      case 10: ekle(sol(), alt()); ekle(sag(), ust()); break;
    }
  }
  return out;
}

export function izohipsCiz(ctx: CanvasRenderingContext2D, v: CografyaVerisi, k: Kutu) {
  const H = ayarSayi(v, "yukseklik"), aralik = ayarSayi(v, "aralik");
  const f = arazi(ayarSec(v, "arazi"), H);
  const profil = ayarMantik(v, "profil");
  const yaz = ayarMantik(v, "yaz");
  const punto = Math.max(8, Math.min(12, k.w / 34));
  const profilH = profil ? Math.min(k.h * 0.34, 120) : 0;
  const harita = { x: k.x + 6, y: k.y + 6, w: k.w - 12, h: k.h - 12 - profilH - (profil ? 26 : 0) };
  const kare = Math.min(harita.w, harita.h * 1.25);
  const mw = kare, mh = Math.min(harita.h, kare / 1.25);
  const mx = harita.x + (harita.w - mw) / 2, my = harita.y;
  const T = (p: N): N => [mx + p[0] * mw, my + (1 - p[1]) * mh];
  const taban = ctx.lineWidth;

  ctx.save();
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  // Çerçeve
  ctx.lineWidth = Math.max(1, taban * 0.6);
  ctx.strokeRect(mx, my, mw, mh);

  // Zirve
  let zi = 0, zj = 0, zmax = -1;
  const N0 = 60;
  for (let i = 0; i <= N0; i++) for (let j = 0; j <= N0; j++) { const z = f(i / N0, j / N0); if (z > zmax) { zmax = z; zi = i / N0; zj = j / N0; } }
  const ilk = Math.ceil((Math.min(...[f(0, 0), f(1, 0), f(0, 1), f(1, 1)]) + 1) / aralik) * aralik;
  const kotlar: number[] = [];
  for (let z = ilk; z < zmax; z += aralik) kotlar.push(z);
  const cokKot = kotlar.length > 24;
  const eg = cokKot ? kotlar.filter((_, i) => i % 2 === 0) : kotlar;
  eg.forEach((kot) => {
    const parca = kotParcalari(f, kot);
    const ana = Math.round(kot / aralik) % 5 === 0;
    ctx.lineWidth = Math.max(0.9, taban * (ana ? 0.75 : 0.5));
    ctx.beginPath();
    parca.forEach((p) => { const a = T(p.a), b = T(p.b); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); });
    ctx.stroke();
    if (yaz && parca.length > 8) {
      // Etiket: kotun orta parçasına, çizginin üstüne beyaz zeminli
      const p = parca[Math.floor(parca.length * 0.3)];
      const m = T([(p.a[0] + p.b[0]) / 2, (p.a[1] + p.b[1]) / 2]);
      const s = String(Math.round(kot));
      const gw = s.length * punto * 0.62 + 4;
      ctx.save(); ctx.fillStyle = "#fff"; ctx.fillRect(m[0] - gw / 2, m[1] - punto * 0.55, gw, punto * 1.1); ctx.restore();
      fizikMetniCiz(ctx, s, m[0], m[1], punto * 0.85);
    }
  });
  // Zirve işareti
  if (ayarMantik(v, "zirve")) {
    const [x, y] = T([zi, zj]);
    ctx.lineWidth = Math.max(1, taban * 0.6);
    ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x - 4.5, y + 3); ctx.lineTo(x + 4.5, y + 3); ctx.closePath(); ctx.save(); ctx.fillStyle = "#222"; ctx.fill(); ctx.restore();
    fizikMetniCiz(ctx, `${Math.round(zmax)} m`, x + 7, Math.max(my + 9, y - 8), punto * 0.9, "sol");
  }
  // Profil: A–B (yatay, ortadan)
  if (profil) {
    const ay = 0.5, a: N = [0.04, ay], b: N = [0.96, ay];
    const pa = T(a), pb = T(b);
    ctx.save(); ctx.setLineDash([5, 3]); ctx.lineWidth = Math.max(1, taban * 0.6);
    ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke(); ctx.restore();
    fizikMetniCiz(ctx, "A", pa[0] - 8, pa[1], punto * 1.05); fizikMetniCiz(ctx, "B", pb[0] + 8, pb[1], punto * 1.05);
    const gy = my + mh + 22, gh = profilH - 14;
    const gx = mx + 28, gw = mw - 36;
    // eksenler
    ctx.lineWidth = Math.max(1, taban * 0.6);
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();
    const zt = Math.ceil(zmax / aralik) * aralik, z0 = 0;
    const Y = (z: number) => gy + gh - ((z - z0) / (zt - z0)) * gh;
    fizikMetniCiz(ctx, `${zt}`, gx - 4, gy, punto * 0.8, "sag"); fizikMetniCiz(ctx, "0", gx - 4, gy + gh, punto * 0.8, "sag");
    fizikMetniCiz(ctx, "A", gx, gy + gh + 9, punto); fizikMetniCiz(ctx, "B", gx + gw, gy + gh + 9, punto);
    fizikMetniCiz(ctx, "m", gx - 4, gy - 9, punto * 0.8, "sag");
    ctx.lineWidth = Math.max(1.2, taban * 0.9);
    ctx.beginPath();
    for (let i = 0; i <= 80; i++) { const t = i / 80, z = f(a[0] + (b[0] - a[0]) * t, ay); const x = gx + t * gw, y = Y(z); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
    ctx.stroke();
    // kot kılavuz çizgileri (silik)
    ctx.save(); ctx.setLineDash([2, 3]); ctx.lineWidth = 0.6;
    for (const kot of eg.filter((_, i) => i % Math.max(1, Math.ceil(eg.length / 6)) === 0)) { ctx.beginPath(); ctx.moveTo(gx, Y(kot)); ctx.lineTo(gx + gw, Y(kot)); ctx.stroke(); }
    ctx.restore();
  }
  ctx.restore();
}
