// Serbest vektör çizimi: 1–6 vektör, bileşen ya da büyüklük+açı girişi, uç uca/aynı noktadan, bileşke.
import { fizikMetniCiz, fizikMetniOlcu } from "../fizik";
import { ayarMantik, ayarMetin, ayarSayi, ayarSayilar, ayarSec, type CografyaVerisi } from "./sema";
import { bol, cizgi, kesik, kokluIle, ok, puntoOlc, sayiYaz, vecAd, type Kutu } from "./fizikYardim";

type Ctx = CanvasRenderingContext2D;
const D2R = Math.PI / 180;
const es = (n: number, o = 1) => sayiYaz(n, o).replace("-", "−");

export function vektorlerHesap(v: CografyaVerisi) {
  const par = ayarSec(v, "yerlesim") === "paralel", n = par ? Math.min(2, Math.round(ayarSayi(v, "n"))) : Math.round(ayarSayi(v, "n")), mod = ayarSec(v, "mod");
  const xs = ayarSayilar(v, "xs"), ys = ayarSayilar(v, "ys"), boy = ayarSayilar(v, "boy"), aci = ayarSayilar(v, "aci");
  const vek = Array.from({ length: n }, (_, i) => mod === "xy"
    ? { x: xs[i] ?? 0, y: ys[i] ?? 0 }
    : { x: (boy[i] ?? 0) * Math.cos((aci[i] ?? 0) * D2R), y: (boy[i] ?? 0) * Math.sin((aci[i] ?? 0) * D2R) });
  // Açı girişinde 90°, 180° gibi değerlerde artık yuvarlama hatasını sil.
  for (const p of vek) { if (Math.abs(p.x) < 1e-9) p.x = 0; if (Math.abs(p.y) < 1e-9) p.y = 0; }
  const R = vek.reduce((t, p) => ({ x: t.x + p.x, y: t.y + p.y }), { x: 0, y: 0 });
  const buy = vek.map((p) => Math.hypot(p.x, p.y));
  return { n, vek, R, buyR: Math.hypot(R.x, R.y), aciR: (Math.atan2(R.y, R.x) * 180) / Math.PI, buy };
}

function beyaz(ctx: Ctx, metin: string, x: number, y: number, punto: number, hiza: "orta" | "sol" | "sag" = "orta") {
  const w = fizikMetniOlcu(ctx, metin, punto).w + 4, x0 = hiza === "orta" ? x - w / 2 : hiza === "sol" ? x - 2 : x - w + 2;
  ctx.save(); ctx.fillStyle = "#fff"; ctx.fillRect(x0, y - punto * 0.62, w, punto * 1.24); ctx.restore();
  fizikMetniCiz(ctx, metin, x, y, punto, hiza);
}

export function vektorSerbestCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  kokluIle(v, () => {
    const punto = puntoOlc(k), kal = ctx.lineWidth, h = vektorlerHesap(v), yer = ayarSec(v, "yerlesim"), zincir = yer === "ucuca", paralel = yer === "paralel" && h.n === 2, ayirma = yer === "bilesenler";
    const ad = bol(ayarMetin(v, "adlar")), birim = ayarMetin(v, "birim").trim();
    const adi = (i: number) => ad[i] || String.fromCharCode(65 + i), adR = ayarMetin(v, "adR").trim() || "R";
    const bir = birim ? " " + birim : "";
    type Seg = { a: { x: number; y: number }; b: { x: number; y: number }; ad: string; deger: number; kalin?: boolean };
    const seg: Seg[] = [];
    let p = { x: 0, y: 0 };
    h.vek.forEach((q, i) => {
      const a = zincir ? p : { x: 0, y: 0 }, b = { x: a.x + q.x, y: a.y + q.y };
      seg.push({ a, b, ad: adi(i), deger: h.buy[i] }); p = b;
    });
    const bileske = ayarMantik(v, "bileske") && h.n > 1 && h.buyR > 1e-9;
    const nok = [{ x: 0, y: 0 }, h.R, ...seg.flatMap((s) => [s.a, s.b])];
    if (ayirma) for (const s of seg) nok.push({ x: s.b.x, y: 0 }, { x: 0, y: s.b.y });
    if ((ayarMantik(v, "eksen") || ayirma)) nok.push({ x: 0, y: 0 });
    let mnx = Math.min(...nok.map((q) => q.x)), mxx = Math.max(...nok.map((q) => q.x)), mny = Math.min(...nok.map((q) => q.y)), mxy = Math.max(...nok.map((q) => q.y));
    const eksenGoster = ayarMantik(v, "eksen") || ayirma;
    if (eksenGoster) { mnx = Math.min(mnx, -1); mny = Math.min(mny, -1); mxx = Math.max(mxx, 1); mxy = Math.max(mxy, 1); }
    const gp = ayarMantik(v, "izgara") ? 2 : 0, sx = Math.max(1, mxx - mnx), sy = Math.max(1, mxy - mny), pay = 22;
    const c = Math.max(6, Math.min(36, (k.w - pay * 2) / (sx + gp), (k.h - pay * 2) / (sy + gp)));
    const ox = k.x + (k.w - sx * c) / 2 - mnx * c, oy = k.y + (k.h - sy * c) / 2 + mxy * c;
    const X = (x: number) => ox + x * c, Y = (y: number) => oy - y * c;
    ctx.save(); ctx.lineJoin = "round";
    if (ayarMantik(v, "izgara")) {
      const sk = ctx.strokeStyle; ctx.save(); ctx.strokeStyle = "#c8c8c8"; ctx.lineWidth = 0.6;
      const gx0 = Math.floor(mnx) - 1, gx1 = Math.ceil(mxx) + 1, gy0 = Math.floor(mny) - 1, gy1 = Math.ceil(mxy) + 1;
      for (let x = gx0; x <= gx1; x++) cizgi(ctx, X(x), Y(gy0), X(x), Y(gy1));
      for (let y = gy0; y <= gy1; y++) cizgi(ctx, X(gx0), Y(y), X(gx1), Y(y));
      ctx.restore(); ctx.strokeStyle = sk;
    }
    if (eksenGoster) {
      ctx.save(); ctx.lineWidth = Math.max(1, kal * 0.8);
      ok(ctx, X(Math.min(mnx, -1) - 0.6), Y(0), X(mxx + 0.8), Y(0), 6); ok(ctx, X(0), Y(Math.min(mny, -1) - 0.6), X(0), Y(mxy + 0.8), 6);
      ctx.restore();
      fizikMetniCiz(ctx, "x", X(mxx + 0.8) - 2, Y(0) + 10, punto * 0.9, "sag"); fizikMetniCiz(ctx, "y", X(0) + 8, Y(mxy + 0.8) + 2, punto * 0.9, "sol");
    }
    // bileşke bileşenleri (kesikli)
    if (bileske && ayarMantik(v, "bilesen")) {
      ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.6);
      kesik(ctx, X(0), Y(0), X(h.R.x), Y(0), [3, 3]); kesik(ctx, X(h.R.x), Y(0), X(h.R.x), Y(h.R.y), [3, 3]); ctx.restore();
      if (Math.abs(h.R.x) > 1e-9) beyaz(ctx, `R_x = ${es(h.R.x)}${bir}`, X(h.R.x / 2), Y(0) + (h.R.y >= 0 ? 11 : -11), punto * 0.82);
      if (Math.abs(h.R.y) > 1e-9) beyaz(ctx, `R_y = ${es(h.R.y)}${bir}`, X(h.R.x) + (h.R.x >= 0 ? 6 : -6), Y(h.R.y / 2), punto * 0.82, h.R.x >= 0 ? "sol" : "sag");
    }
    if (paralel) {
      const A = h.vek[0], B = h.vek[1];
      ctx.save(); ctx.lineWidth = Math.max(0.9, kal * 0.7);
      kesik(ctx, X(A.x), Y(A.y), X(h.R.x), Y(h.R.y), [5, 3]); kesik(ctx, X(B.x), Y(B.y), X(h.R.x), Y(h.R.y), [5, 3]); ctx.restore();
    }
    if (ayirma) {
      const bas = (a: string) => { const t = a.replace(/_.*$/, ""); return t || "A"; };
      seg.forEach((s, i) => {
        const q = h.vek[i];
        ctx.save(); ctx.lineWidth = Math.max(0.9, kal * 0.7);
        kesik(ctx, X(0), Y(0), X(q.x), Y(0), [3, 3]); kesik(ctx, X(q.x), Y(0), X(q.x), Y(q.y), [3, 3]); ctx.restore();
        const ad2 = bas(s.ad), deg = ayarMantik(v, "deger");
        if (Math.abs(q.x) > 1e-9) beyaz(ctx, deg ? `${ad2}_x = ${es(q.x, 2)}${bir}` : `${ad2}_x`, X(q.x / 2), Y(0) + (q.y >= 0 ? 12 : -12), punto * 0.8);
        if (Math.abs(q.y) > 1e-9) beyaz(ctx, deg ? `${ad2}_y = ${es(q.y, 2)}${bir}` : `${ad2}_y`, X(q.x) + (q.x >= 0 ? 6 : -6), Y(q.y / 2), punto * 0.8, q.x >= 0 ? "sol" : "sag");
      });
    }
    // vektörler
    seg.forEach((s) => {
      const dx = X(s.b.x) - X(s.a.x), dy = Y(s.b.y) - Y(s.a.y), L = Math.hypot(dx, dy);
      if (L < 0.5) return;
      ctx.save(); ctx.lineWidth = Math.max(1.5, kal * 1.2); ok(ctx, X(s.a.x), Y(s.a.y), X(s.b.x), Y(s.b.y), 9); ctx.restore();
      const nx = -dy / L, ny = dx / L, tt = zincir ? 0.5 : 0.6, mx = X(s.a.x) + dx * tt, my = Y(s.a.y) + dy * tt;
      // adı çizginin "dışına" (ekranda yukarıya bakan normal) yaz
      const sg = ny <= 0 ? 1 : -1, ofs = 11;
      beyaz(ctx, ayarMantik(v, "deger") ? `${vecAd(s.ad)} = ${sayiYaz(s.deger, 1)}${bir}` : vecAd(s.ad), mx + nx * sg * ofs, my + ny * sg * ofs, punto * 0.88);
    });
    if (bileske) {
      ctx.save(); ctx.lineWidth = Math.max(2.4, kal * 1.9); ctx.setLineDash([]); ok(ctx, X(0), Y(0), X(h.R.x), Y(h.R.y), 10); ctx.restore();
      const dx = X(h.R.x) - X(0), dy = Y(h.R.y) - Y(0), L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L, sg = ny >= 0 ? -1 : 1, rt = ayarMantik(v, "bilesen") ? 0.4 : zincir ? 0.5 : 0.62;
      beyaz(ctx, ayarMantik(v, "deger") ? `${vecAd(adR)} = ${sayiYaz(h.buyR, 1)}${bir}` : vecAd(adR), X(0) + dx * rt + nx * sg * 13, Y(0) + dy * rt + ny * sg * 13, punto * 0.9);
      if (ayarMantik(v, "aciYay")) {
        const r = Math.min(26, L * 0.45), a1 = -(h.aciR * D2R);
        ctx.save(); ctx.lineWidth = Math.max(0.8, kal * 0.6); ctx.beginPath(); ctx.arc(X(0), Y(0), r, 0, a1, a1 < 0); ctx.stroke(); ctx.restore();
        const m = a1 / 2; beyaz(ctx, `θ = ${es(h.aciR, 0)}°`, X(0) + Math.cos(m) * (r + 16), Y(0) + Math.sin(m) * (r + 14), punto * 0.82);
      }
    }
    ctx.save(); ctx.beginPath(); ctx.arc(X(0), Y(0), 2.6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.restore();
  });
}

export function vektorSerbestOzet(v: CografyaVerisi): string {
  return kokluIle(v, () => {
    const h = vektorlerHesap(v), adR = ayarMetin(v, "adR").trim() || "R", bir = ayarMetin(v, "birim").trim();
    const b = bir ? " " + bir : "";
    return `Bileşke ${adR}: ${adR}_x = ${es(h.R.x, 2)}, ${adR}_y = ${es(h.R.y, 2)} · |${adR}| = √(${adR}_x² + ${adR}_y²) = ${sayiYaz(h.buyR, 2)}${b} · +x ekseniyle ${es(h.aciR, 1)}°`;
  });
}
