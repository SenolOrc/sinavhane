// Dünya–Güneş şemaları: mevsimler (yörünge) ve aydınlanma çemberi.
import { fizikMetniCiz } from "../fizik";
import { ayarMantik, ayarSec, type CografyaVerisi } from "./sema";

type Kutu = { x: number; y: number; w: number; h: number };
export const EKSEN_EGIKLIGI = 23.45; // derece (23°27′)
const D2R = Math.PI / 180;

function ok(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, s = 6) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - ux * s - uy * s * 0.45, y1 - uy * s + ux * s * 0.45); ctx.lineTo(x1 - ux * s + uy * s * 0.45, y1 - uy * s - ux * s * 0.45); ctx.closePath();
  ctx.save(); ctx.fillStyle = ctx.strokeStyle as string; ctx.fill(); ctx.restore();
}

/** Mevsim adı: (yarımküre, ay) → ad. */
export function mevsimAdi(yarim: string, ay: "mart" | "haziran" | "eylul" | "aralik"): string {
  const kuzey = { mart: "İlkbahar ekinoksu", haziran: "Yaz gündönümü", eylul: "Sonbahar ekinoksu", aralik: "Kış gündönümü" };
  const guney = { mart: "Sonbahar ekinoksu", haziran: "Kış gündönümü", eylul: "İlkbahar ekinoksu", aralik: "Yaz gündönümü" };
  return (yarim === "guney" ? guney : kuzey)[ay];
}

export function mevsimCiz(ctx: CanvasRenderingContext2D, v: CografyaVerisi, k: Kutu) {
  const yarim = ayarSec(v, "yarim");
  const taban = ctx.lineWidth;
  const cx = k.x + k.w / 2, cy = k.y + k.h / 2;
  const punto = Math.max(9, Math.min(14, k.w / 34));
  const re = Math.max(10, Math.min(k.h * 0.085, k.w * 0.055));
  const a = k.w / 2 - re * 3.2, b = k.h / 2 - re * 2.6; // yörünge yarıçapları (elips: perspektif)
  const rs = Math.min(a, b) * 0.28;
  ctx.save(); ctx.lineJoin = "round";
  // Yörünge
  ctx.lineWidth = Math.max(1, taban * 0.6);
  ctx.beginPath(); ctx.ellipse(cx, cy, a, b, 0, 0, Math.PI * 2); ctx.stroke();
  // Yörünge yönü oku (saat yönünün tersi): alt kenar sağa
  ok(ctx, cx + a * 0.55, cy + b * 0.83, cx + a * 0.7, cy + b * 0.72, 7);
  // Güneş
  ctx.lineWidth = Math.max(1, taban * 0.6);
  for (let i = 0; i < 16; i++) {
    const t = (i / 16) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(t) * rs * 1.1, cy + Math.sin(t) * rs * 1.1); ctx.lineTo(cx + Math.cos(t) * rs * 1.5, cy + Math.sin(t) * rs * 1.5); ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(cx, cy, rs, 0, Math.PI * 2); ctx.save(); ctx.fillStyle = "#f2f2f2"; ctx.fill(); ctx.restore(); ctx.stroke();
  fizikMetniCiz(ctx, "Güneş", cx, cy, punto);
  // Dünya konumları (sol: Haziran, sağ: Aralık, üst: Mart, alt: Eylül)
  const konumlar: { ay: "mart" | "haziran" | "eylul" | "aralik"; x: number; y: number; tarih: string; yer: "ust" | "alt" | "sol" | "sag" }[] = [
    { ay: "haziran", x: cx - a, y: cy, tarih: "21 Haziran", yer: "sol" },
    { ay: "aralik", x: cx + a, y: cy, tarih: "22 Aralık", yer: "sag" },
    { ay: "mart", x: cx, y: cy - b, tarih: "21 Mart", yer: "ust" },
    { ay: "eylul", x: cx, y: cy + b, tarih: "23 Eylül", yer: "alt" },
  ];
  const t = EKSEN_EGIKLIGI * D2R;
  const ex = Math.sin(t), ey = -Math.cos(t); // eksenin kuzey ucu (ekran): yukarı ve sağa
  for (const p of konumlar) {
    // Gece yarısı (Güneş'e bakmayan yarı) gri
    const ang = Math.atan2(cy - p.y, cx - p.x);
    ctx.beginPath(); ctx.arc(p.x, p.y, re, 0, Math.PI * 2); ctx.save(); ctx.fillStyle = "#fff"; ctx.fill(); ctx.restore();
    ctx.beginPath(); ctx.arc(p.x, p.y, re, ang + Math.PI / 2, ang + (3 * Math.PI) / 2); ctx.closePath(); ctx.save(); ctx.fillStyle = "#b8b8b8"; ctx.fill(); ctx.restore();
    ctx.lineWidth = Math.max(1, taban * 0.7);
    ctx.beginPath(); ctx.arc(p.x, p.y, re, 0, Math.PI * 2); ctx.stroke();
    // Ekvator (eksene dik elips)
    ctx.save(); ctx.lineWidth = Math.max(0.7, taban * 0.35);
    ctx.beginPath(); ctx.ellipse(p.x, p.y, re, re * 0.26, Math.atan2(ex, -ey) * 0 + (EKSEN_EGIKLIGI * D2R), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    // Eksen
    ctx.lineWidth = Math.max(1, taban * 0.7);
    ctx.beginPath(); ctx.moveTo(p.x - ex * re * 1.5, p.y - ey * re * 1.5); ctx.lineTo(p.x + ex * re * 1.5, p.y + ey * re * 1.5); ctx.stroke();
    fizikMetniCiz(ctx, "K", p.x + ex * re * 1.5 + 4, p.y + ey * re * 1.5 - 4, punto * 0.8);
    // Etiketler
    const yaz = [ayarMantik(v, "tarih") ? p.tarih : "", ayarMantik(v, "mevsimAd") ? mevsimAdi(yarim, p.ay) : ""].filter(Boolean).join("\n");
    if (!yaz) continue;
    const off = re * 1.9;
    if (p.yer === "sol") fizikMetniCiz(ctx, yaz, p.x - off, p.y, punto * 0.95, "sag");
    else if (p.yer === "sag") fizikMetniCiz(ctx, yaz, p.x + off, p.y, punto * 0.95, "sol");
    else if (p.yer === "ust") fizikMetniCiz(ctx, yaz, p.x, p.y - off - punto * 0.4, punto * 0.95);
    else fizikMetniCiz(ctx, yaz, p.x, p.y + off + punto * 0.4, punto * 0.95);
  }
  // 23°27′: Aralık Dünya'sında dikey çizgi ve yay
  if (ayarMantik(v, "aci")) {
    const p = konumlar[1];
    ctx.save(); ctx.setLineDash([3, 3]); ctx.lineWidth = Math.max(0.8, taban * 0.4);
    ctx.beginPath(); ctx.moveTo(p.x, p.y - re * 2.2); ctx.lineTo(p.x, p.y + re * 0.2); ctx.stroke(); ctx.restore();
    ctx.lineWidth = Math.max(0.8, taban * 0.5);
    ctx.beginPath(); ctx.arc(p.x, p.y, re * 1.9, -Math.PI / 2, -Math.PI / 2 + t); ctx.stroke();
    fizikMetniCiz(ctx, "23°27′", p.x + re * 1.2, p.y - re * 2.45, punto * 0.85, "sol");
  }
  ctx.restore();
}

// ── Aydınlanma çemberi ──────────────────────────────────────────────────────
type V3 = [number, number, number];
const sk = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const topla = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const capraz = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/** Eksen yönü (ekran: x sağ, y yukarı, z izleyiciye). Güneş soldan (−x). */
export function dunyaEkseni(tarih: string): V3 {
  const e = EKSEN_EGIKLIGI * D2R;
  if (tarih === "haziran") return [-Math.sin(e), Math.cos(e), 0];
  if (tarih === "aralik") return [Math.sin(e), Math.cos(e), 0];
  return [0, 1, 0];
}
/** Enlem φ (derece), boylam λ (radyan) → ekran uzayında birim küre noktası. */
export function kureNoktasi(ekseni: V3, enlem: number, boylam: number): V3 {
  const a = ekseni;
  const e1 = norm(capraz(a, [0, 0, 1])), e2 = capraz(a, e1);
  const ph = enlem * D2R;
  return topla(sk(topla(sk(e1, Math.cos(boylam)), sk(e2, Math.sin(boylam))), Math.cos(ph)), sk(a, Math.sin(ph)));
}

/** Kuzey kutbu izleyiciye doğru biraz eğik görünür (enlem daireleri elips olarak okunur). */
const BAKIS = 18 * D2R;
export const bakisUygula = (p: V3): V3 => [p[0], p[1] * Math.cos(BAKIS) - p[2] * Math.sin(BAKIS), p[2] * Math.cos(BAKIS) + p[1] * Math.sin(BAKIS)];

export function aydinlanmaCiz(ctx: CanvasRenderingContext2D, v: CografyaVerisi, k: Kutu) {
  const tarih = ayarSec(v, "tarih");
  const taban = ctx.lineWidth;
  const punto = Math.max(9, Math.min(14, k.w / 36));
  const R = Math.max(20, Math.min(k.h * 0.36, k.w * 0.24));
  const cx = k.x + k.w * (ayarMantik(v, "enlem") ? 0.4 : 0.5), cy = k.y + k.h / 2 + 4;
  const a = dunyaEkseni(tarih);
  const E = (p: V3): [number, number] => [cx + p[0] * R, cy - p[1] * R];
  ctx.save(); ctx.lineJoin = "round";
  // Başlık
  const baslik = tarih === "haziran" ? "21 Haziran" : tarih === "aralik" ? "22 Aralık" : "21 Mart / 23 Eylül";
  fizikMetniCiz(ctx, baslik, cx, k.y + 8, punto * 1.05);
  // Küre + gece yarısı
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.save(); ctx.fillStyle = "#fff"; ctx.fill(); ctx.restore();
  ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, Math.PI / 2); ctx.closePath(); ctx.save(); ctx.fillStyle = "#b8b8b8"; ctx.fill(); ctx.restore();
  ctx.lineWidth = Math.max(1.2, taban * 0.9); ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  // Aydınlanma çemberi (dikey çizgi)
  ctx.save(); ctx.lineWidth = Math.max(1, taban * 0.6); ctx.beginPath(); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke(); ctx.restore();
  // Enlem daireleri
  const daireler: { f: number; ad: string; kalin: boolean }[] = [
    { f: 66.55, ad: "Kuzey Kutup Dairesi", kalin: false }, { f: 23.45, ad: "Yengeç Dönencesi", kalin: false },
    { f: 0, ad: "Ekvator", kalin: true }, { f: -23.45, ad: "Oğlak Dönencesi", kalin: false }, { f: -66.55, ad: "Güney Kutup Dairesi", kalin: false },
  ];
  const etiketler: { y: number; x: number; ad: string }[] = [];
  for (const d of daireler) {
    ctx.lineWidth = Math.max(0.8, taban * (d.kalin ? 0.75 : 0.5));
    let on = false, enSag: [number, number] | null = null;
    ctx.beginPath();
    for (let i = 0; i <= 180; i++) {
      const p = bakisUygula(kureNoktasi(a, d.f, (i / 180) * Math.PI * 2));
      if (p[2] >= 0) { const [x, y] = E(p); if (!on) { ctx.moveTo(x, y); on = true; } else ctx.lineTo(x, y); if (!enSag || x > enSag[0]) enSag = [x, y]; } else on = false;
    }
    ctx.stroke();
    if (enSag) etiketler.push({ x: enSag[0], y: enSag[1], ad: d.ad });
  }
  // Dönme ekseni
  ctx.lineWidth = Math.max(1, taban * 0.7);
  const u = E(bakisUygula(sk(a, 1.28))), w = E(bakisUygula(sk(a, -1.28)));
  ctx.beginPath(); ctx.moveTo(w[0], w[1]); ctx.lineTo(u[0], u[1]); ctx.stroke();
  fizikMetniCiz(ctx, "K", u[0] + 7, u[1] - 4, punto * 0.9); fizikMetniCiz(ctx, "G", w[0] + 7, w[1] + 5, punto * 0.9);
  // Güneş ışınları (soldan)
  if (ayarMantik(v, "isin")) {
    ctx.lineWidth = Math.max(0.9, taban * 0.5);
    const x1 = cx - R - 10, x0 = Math.max(k.x + 6, x1 - R * 0.9);
    for (const f of [-0.7, -0.35, 0, 0.35, 0.7]) ok(ctx, x0, cy - f * R, x1, cy - f * R, 6);
    fizikMetniCiz(ctx, "Güneş\nışınları", (x0 + x1) / 2, cy - R * 0.98 - punto * 0.4, punto * 0.85);
  }
  if (ayarMantik(v, "yaz")) {
    fizikMetniCiz(ctx, "Aydınlık", cx - R * 0.5, cy + R * 0.1, punto * 0.8);
    fizikMetniCiz(ctx, "Karanlık", cx + R * 0.5, cy + R * 0.1, punto * 0.8);
  }
  // Enlem adları (sağda, kısa kılavuz çizgiyle)
  if (ayarMantik(v, "enlem")) {
    const bx = cx + R + 14;
    etiketler.sort((p, q) => p.y - q.y);
    let son = -1e9;
    for (const e of etiketler) {
      const y = Math.max(e.y, son + punto * 1.25); son = y;
      ctx.lineWidth = Math.max(0.6, taban * 0.35);
      ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(bx - 3, y); ctx.stroke();
      fizikMetniCiz(ctx, e.ad, bx, y, punto * 0.85, "sol");
    }
  }
  ctx.restore();
}
