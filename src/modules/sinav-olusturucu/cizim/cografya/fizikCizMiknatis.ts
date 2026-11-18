// Fizik şekilleri – Manyetizma ve indüksiyon: mıknatıs alan çizgileri (çubuk, U, karşılıklı iki mıknatıs, Dünya),
// pusula iğneleri, mıknatıs–bobin–galvanometre düzeneği (Lenz) ve alana giren çerçeve. Yalnız siyah/gri.
// Alan modeli: kutup yüzleri üzerine dağıtılmış ±q "manyetik yükler" (B = Σ q·r/|r|³). Alan çizgileri bu alanın
// N yüzlerinden başlayıp S yüzlerine kadar izlenir; pusula iğnesinin N ucu B yönünü gösterir.
import { fizikMetniCiz } from "../fizik";
import { ayarMantik, ayarSayi, ayarSayilar, ayarSec, type CografyaVerisi } from "./sema";
import { cizgi, ok, puntoOlc, type Kutu } from "./fizikYardim";

type Ctx = CanvasRenderingContext2D;
type Nk = { x: number; y: number };
type Kutup = "N" | "S";
const PI = Math.PI;
const ters = (k: Kutup): Kutup => (k === "N" ? "S" : "N");
const KOYU = "#555555";

// ════════════════════════════════════════════════════════════════════════════
// ALAN MODELİ
// ════════════════════════════════════════════════════════════════════════════
type Yuk = { x: number; y: number; q: number };
type Dik = { x: number; y: number; w: number; h: number };
type Daire = { x: number; y: number; r: number };
type Kati = Dik | Daire;
type Bas = { x: number; y: number; ters: boolean; /** Çizginin ORTASINDAN başlar: hem ileri hem geri izlenir (mıknatıs orta dikmesi). */ orta?: boolean };
type Cubuk = Dik & { sol: Kutup; sag: Kutup };
type UMik = { x0: number; x1: number; x2: number; x3: number; y0: number; y1: number; yi: number; sol: Kutup; sag: Kutup };
type Sahne = {
  yukler: Yuk[]; katilar: Kati[]; baslar: Bas[]; cubuklar: Cubuk[]; u?: UMik; dunya?: Daire;
  govde: Dik; ekPusula: Nk[]; sinir: Dik; yaricap: number; s: number;
};

/** (x, y) noktasındaki B (yüklerin toplamı; yumuşatma 2 px). */
export function alanVektoru(yukler: Yuk[], x: number, y: number): Nk {
  let bx = 0, by = 0;
  for (const c of yukler) {
    const dx = x - c.x, dy = y - c.y, r2 = dx * dx + dy * dy + 4, r = Math.sqrt(r2);
    bx += (c.q * dx) / (r2 * r); by += (c.q * dy) / (r2 * r);
  }
  return { x: bx, y: by };
}

type Yuz = { cx: number; cy: number; nx: number; ny: number; yari: number; q: number; /** Yüzün köşesinden mıknatısın yan kenarı boyunca başlangıç noktası verilen uzunluk (px). */ kenar?: number };
/** Kutup yüzünün içine (3–4 px) gömülü m adet yük: alan yüzden fışkırır, yüz noktasında tekil olmaz. */
function yuzYukleri(yz: Yuz, ic: number, m = 9): Yuk[] {
  const tx = -yz.ny, ty = yz.nx, r: Yuk[] = [];
  for (let i = 0; i < m; i++) {
    const f = m === 1 ? 0 : (i / (m - 1)) * 2 - 1;
    r.push({ x: yz.cx + tx * f * yz.yari * 0.9 - yz.nx * ic, y: yz.cy + ty * f * yz.yari * 0.9 - yz.ny * ic, q: yz.q / m });
  }
  return r;
}
function yuzBaslari(yz: Yuz, kesirler: number[]): Bas[] {
  const tx = -yz.ny, ty = yz.nx, e = yz.kenar ?? 0, T = yz.yari + e;
  return kesirler.map((f) => {
    const sg = f < 0 ? -1 : 1, d = (Math.abs(f) / 0.9) * T * 0.98;
    if (d <= yz.yari) return { x: yz.cx + tx * sg * d + yz.nx * 0.7, y: yz.cy + ty * sg * d + yz.ny * 0.7, ters: yz.q < 0 };
    const ge = d - yz.yari; // köşeden mıknatısın içine doğru (−n) yan kenar üzerinde
    return { x: yz.cx + tx * sg * (yz.yari + 1.2) - yz.nx * ge, y: yz.cy + ty * sg * (yz.yari + 1.2) - yz.ny * ge, ters: yz.q < 0 };
  });
}
const icindeMi = (kt: Kati[], x: number, y: number) => kt.some((a) => "r" in a ? Math.hypot(x - a.x, y - a.y) < a.r - 0.5 : x > a.x + 0.5 && x < a.x + a.w - 0.5 && y > a.y + 0.5 && y < a.y + a.h - 0.5);

/** Alan çizgisini ds = 2 px adımla RK2 ile izler. ters: B'ye ters yönde (S yüzünden geriye). */
export function alanCizgisi(yukler: Yuk[], katilar: Kati[], sinir: Dik, b: Bas, ds = 2): Nk[] {
  const yon = b.ters ? -1 : 1;
  let p: Nk = { x: b.x, y: b.y };
  const pts: Nk[] = [p];
  let onceki: Nk | null = null;
  for (let i = 0; i < 1800; i++) {
    const b1 = alanVektoru(yukler, p.x, p.y), L1 = Math.hypot(b1.x, b1.y);
    if (L1 < 1e-12) break;
    const mx = p.x + (yon * b1.x / L1) * ds / 2, my = p.y + (yon * b1.y / L1) * ds / 2;
    const b2 = alanVektoru(yukler, mx, my), L2 = Math.hypot(b2.x, b2.y);
    if (L2 < 1e-12) break;
    const u = { x: yon * b2.x / L2, y: yon * b2.y / L2 };
    if (onceki && u.x * onceki.x + u.y * onceki.y < 0.2) break; // nötr nokta: yön aniden döner
    p = { x: p.x + u.x * ds, y: p.y + u.y * ds };
    pts.push(p); onceki = u;
    if (i > 2 && icindeMi(katilar, p.x, p.y)) break;
    if (p.x < sinir.x || p.x > sinir.x + sinir.w || p.y < sinir.y || p.y > sinir.y + sinir.h) break;
  }
  return pts;
}

const kesirler = (n: number, eksen: boolean) => {
  const r: number[] = eksen ? [0] : [];
  for (let i = 1; i <= n; i++) r.push((0.9 * i) / n, -(0.9 * i) / n);
  return r;
};

function sahneKur(v: CografyaVerisi, k: Kutu): Sahne {
  const tip = ayarSec(v, "tip"), s = Math.min(k.w / 420, k.h / 250);
  const cx = k.x + k.w / 2, cy = k.y + k.h / 2;
  const n = Math.round(ayarSayi(v, "cizgi")), eksen = ayarMantik(v, "eksen");
  const sinir: Dik = { x: k.x + 3, y: k.y + 3, w: k.w - 6, h: k.h - 6 };
  const S: Sahne = { yukler: [], katilar: [], baslar: [], cubuklar: [], govde: { x: cx, y: cy, w: 0, h: 0 }, ekPusula: [], sinir, yaricap: 0, s };
  /** yelpaze: "pozitif" yalnız N yüzlerinden demet; "hepsi" S yüzlerine giren demet de; "yok" yalnız eksen çizgisi. */
  const bigil = (yzler: Yuz[], yelpaze: "pozitif" | "hepsi" | "yok" = "pozitif") => {
    for (const yz of yzler) {
      S.yukler.push(...yuzYukleri(yz, 4 * s));
      const demet = yelpaze === "hepsi" || (yelpaze === "pozitif" && yz.q > 0);
      S.baslar.push(...yuzBaslari(yz, demet ? kesirler(n, eksen) : eksen ? [0] : []));
    }
  };
  /** Çubuk mıknatısın orta dikmesinden geçen iç içe kapalı çizgiler (tepe yükseklikleri geometrik dizi). */
  const ortaCizgiler = (c: Cubuk) => {
    const hmin = c.h / 2 + 0.6 * c.h, hmax = Math.max(hmin * 1.5, k.h / 2 - 12 * s);
    for (let i = 1; i <= n; i++) {
      const h = hmin * Math.pow(hmax / hmin, (i - 0.5) / n);
      for (const sg of [-1, 1]) S.baslar.push({ x: c.x + c.w / 2, y: c.y + c.h / 2 + sg * h, ters: false, orta: true });
    }
  };
  if (tip === "cubuk") {
    const L = 124 * s, H = 36 * s, sol = ayarSec(v, "kutup") === "NS" ? "N" : "S";
    const c: Cubuk = { x: cx - L / 2, y: cy - H / 2, w: L, h: H, sol, sag: ters(sol) };
    S.cubuklar.push(c); S.katilar.push(c); S.govde = c;
    bigil([
      { cx: c.x, cy, nx: -1, ny: 0, yari: H / 2, q: sol === "N" ? 1 : -1, kenar: 0.3 * L },
      { cx: c.x + L, cy, nx: 1, ny: 0, yari: H / 2, q: sol === "N" ? -1 : 1, kenar: 0.3 * L },
    ], "yok");
    ortaCizgiler(c);
  } else if (tip === "iki") {
    const yuz = ayarSec(v, "yuz"), solYuz = yuz[0] as Kutup, sagYuz = yuz[1] as Kutup;
    const L = 86 * s, H = 34 * s, gap = (ayarSayi(v, "ara") / 100) * 420 * s;
    const sx = cx - gap / 2 - L, rx = cx + gap / 2;
    const m1: Cubuk = { x: sx, y: cy - H / 2, w: L, h: H, sol: ters(solYuz), sag: solYuz };
    const m2: Cubuk = { x: rx, y: cy - H / 2, w: L, h: H, sol: sagYuz, sag: ters(sagYuz) };
    S.cubuklar.push(m1, m2); S.katilar.push(m1, m2);
    S.govde = { x: sx, y: m1.y, w: gap + 2 * L, h: H };
    const q = (kp: Kutup) => (kp === "N" ? 1 : -1);
    // Dış yüzler: yalnız eksen çizgisi; karşılıklı yüzler: yüzden çıkan (ya da yüze giren) çizgi demeti
    bigil([
      { cx: m1.x, cy, nx: -1, ny: 0, yari: H / 2, q: q(m1.sol) },
      { cx: m2.x + L, cy, nx: 1, ny: 0, yari: H / 2, q: q(m2.sag) },
    ], "yok");
    bigil([
      { cx: m1.x + L, cy, nx: 1, ny: 0, yari: H / 2, q: q(m1.sag) },
      { cx: m2.x, cy, nx: -1, ny: 0, yari: H / 2, q: q(m2.sol) },
    ], solYuz === "S" && sagYuz === "S" ? "hepsi" : "pozitif");
    ortaCizgiler(m1); ortaCizgiler(m2);
    S.ekPusula.push({ x: cx, y: cy });
  } else if (tip === "u") {
    const sol = ayarSec(v, "kutup") === "NS" ? "N" : "S";
    const gap = 78 * s, a = 30 * s, Hu = 150 * s, y0 = cy - Hu / 2 - 4 * s, y1 = y0 + Hu;
    const u: UMik = { x0: cx - gap / 2 - a, x1: cx - gap / 2, x2: cx + gap / 2, x3: cx + gap / 2 + a, y0, y1, yi: y1 - a, sol, sag: ters(sol) };
    S.u = u;
    S.katilar.push({ x: u.x0, y: y0, w: a, h: Hu }, { x: u.x2, y: y0, w: a, h: Hu }, { x: u.x0, y: u.yi, w: u.x3 - u.x0, h: a });
    S.govde = { x: u.x0, y: y0, w: u.x3 - u.x0, h: Hu };
    const pl = 0.52 * (u.yi - y0);
    bigil([
      { cx: u.x1, cy: y0 + pl / 2, nx: 1, ny: 0, yari: pl / 2, q: sol === "N" ? 1 : -1 },
      { cx: u.x2, cy: y0 + pl / 2, nx: -1, ny: 0, yari: pl / 2, q: sol === "N" ? -1 : 1 },
    ]);
    S.ekPusula.push({ x: cx, y: y0 + pl / 2 });
  } else {
    const R = 46 * s, d = 0.5 * R, dn: Daire = { x: cx, y: cy, r: R };
    S.dunya = dn; S.katilar.push(dn); S.govde = { x: cx - R, y: cy - R, w: 2 * R, h: 2 * R }; S.yaricap = R;
    // Coğrafi güney kutbu yakınında N kutbu gibi davranır: alan güneyde yüzeyden çıkar, kuzeyde girer.
    S.yukler.push({ x: cx, y: cy + d, q: 1 }, { x: cx, y: cy - d, q: -1 });
    const psi = (eksen ? [0] : []).concat(...Array.from({ length: n }, (_, i) => { const a = n === 1 ? 55 : 76 - (i * 44) / (n - 1); return [a, -a]; }));
    for (const a of psi) { const r = a * PI / 180; S.baslar.push({ x: cx + (R + 0.7) * Math.sin(r), y: cy + (R + 0.7) * Math.cos(r), ters: false }); }
    if (eksen) S.baslar.push({ x: cx, y: cy - R - 0.7, ters: true });
  }
  return S;
}

// ════════════════════════════════════════════════════════════════════════════
// PUSULA
// ════════════════════════════════════════════════════════════════════════════
type Pusula = { x: number; y: number; aci: number };
function pusulaNoktalari(v: CografyaVerisi, k: Kutu, S: Sahne): Nk[] {
  const mod = ayarSec(v, "pusula");
  if (mod === "yok") return [];
  if (mod === "ozel") {
    const a = ayarSayilar(v, "pusulaXY"), r: Nk[] = [];
    for (let i = 0; i + 1 < a.length; i += 2) if (a[i] >= 0 && a[i + 1] >= 0) r.push({ x: k.x + (a[i] / 100) * k.w, y: k.y + (a[i + 1] / 100) * k.h });
    return r;
  }
  const g = S.govde, gx = g.x + g.w / 2, gy = g.y + g.h / 2, rd = 12 * S.s;
  if (S.u) {
    const d = 28 * S.s, yu = g.h / 2 + 26 * S.s, xs = g.w / 2 + d;
    return [{ x: gx, y: gy - yu }, { x: gx, y: gy + yu }, ...[-1, 1].flatMap((sg) => [{ x: gx + sg * xs, y: gy - g.h / 4 }, { x: gx + sg * xs, y: gy + g.h / 4 }])].concat(S.ekPusula);
  }
  const pad = (S.u ? 24 : S.dunya ? 30 : 32) * S.s;
  const ra = g.w / 2 + pad, rb = Math.min(g.h / 2 + pad, k.h / 2 - rd - 6);
  const r: Nk[] = [];
  for (let i = 0; i < 8; i++) { const t = (i * PI) / 4; r.push({ x: gx + ra * Math.cos(t), y: gy + rb * Math.sin(t) }); }
  return r.concat(S.ekPusula);
}
/** Alan çizgileri B yönünde sıralı noktalar olarak (çizimde kullanılanın aynısı; test ve dışa aktarım için). */
export function miknatisAlanCizgileri(v: CografyaVerisi, k: Kutu): { pts: Nk[]; orta: boolean }[] {
  if (v.yapi !== "miknatisAlan") return [];
  const S = sahneKur(v, k);
  return S.baslar.map((b) => {
    let pts = alanCizgisi(S.yukler, S.katilar, S.sinir, b);
    if (b.orta) pts = alanCizgisi(S.yukler, S.katilar, S.sinir, { ...b, ters: true }).reverse().concat(pts.slice(1));
    else if (b.ters) pts = pts.reverse();
    return { pts, orta: !!b.orta };
  });
}
export function miknatisPusulalari(v: CografyaVerisi, k: Kutu): Pusula[] {
  if (v.yapi !== "miknatisAlan") return [];
  const S = sahneKur(v, k);
  return pusulaNoktalari(v, k, S).map((p) => { const b = alanVektoru(S.yukler, p.x, p.y); return { x: p.x, y: p.y, aci: Math.atan2(b.y, b.x) }; });
}

function pusulaCiz(ctx: Ctx, x: number, y: number, aci: number | null, rd: number, ink: string) {
  ctx.save(); ctx.strokeStyle = ink; ctx.fillStyle = "#fff"; ctx.lineWidth = Math.max(0.9, ctx.lineWidth * 0.55);
  ctx.beginPath(); ctx.arc(x, y, rd, 0, PI * 2); ctx.fill(); ctx.stroke();
  if (aci === null) { ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(x, y, 1.4, 0, PI * 2); ctx.fill(); ctx.restore(); return; }
  const ux = Math.cos(aci), uy = Math.sin(aci), Ln = rd * 0.8, wn = Ln * 0.3;
  const nx = -uy, ny = ux;
  const uc1 = { x: x + ux * Ln, y: y + uy * Ln }, uc2 = { x: x - ux * Ln, y: y - uy * Ln };
  const yan1 = { x: x + nx * wn, y: y + ny * wn }, yan2 = { x: x - nx * wn, y: y - ny * wn };
  // N yarısı (B yönü): koyu
  ctx.beginPath(); ctx.moveTo(uc1.x, uc1.y); ctx.lineTo(yan1.x, yan1.y); ctx.lineTo(yan2.x, yan2.y); ctx.closePath();
  ctx.fillStyle = "#222"; ctx.fill(); ctx.stroke();
  // S yarısı: beyaz
  ctx.beginPath(); ctx.moveTo(uc2.x, uc2.y); ctx.lineTo(yan1.x, yan1.y); ctx.lineTo(yan2.x, yan2.y); ctx.closePath();
  ctx.fillStyle = "#fff"; ctx.fill(); ctx.stroke();
  ctx.restore();
}

// ════════════════════════════════════════════════════════════════════════════
// MIKNATIS ÇİZİMİ
// ════════════════════════════════════════════════════════════════════════════
function tarama(ctx: Ctx, x: number, y: number, w: number, h: number, ink: string, aralik = 4.5) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.strokeStyle = ink; ctx.lineWidth = Math.max(0.5, ctx.lineWidth * 0.3);
  for (let t = -h; t < w; t += aralik) cizgi(ctx, x + t, y + h, x + t + h, y);
  ctx.restore();
}
function yariDolgu(ctx: Ctx, x: number, y: number, w: number, h: number, kp: Kutup, gizle: boolean, ink: string) {
  ctx.save();
  ctx.fillStyle = gizle ? "#fff" : kp === "N" ? KOYU : "#fff"; ctx.fillRect(x, y, w, h);
  ctx.restore();
  if (!gizle && kp === "S") tarama(ctx, x, y, w, h, ink);
}
function harfCiz(ctx: Ctx, kp: Kutup, x: number, y: number, punto: number) {
  if (kp === "N") fizikMetniCiz(ctx, "N", x, y, punto, "orta", "#fff");
  else {
    ctx.save(); ctx.fillStyle = "#fff"; ctx.fillRect(x - punto * 0.5, y - punto * 0.58, punto, punto * 1.16); ctx.restore();
    fizikMetniCiz(ctx, "S", x, y, punto);
  }
}
function cubukCiz(ctx: Ctx, c: Cubuk, ink: string, gizle: boolean, harf: boolean, punto: number) {
  const yw = c.w / 2;
  yariDolgu(ctx, c.x, c.y, yw, c.h, c.sol, gizle, ink);
  yariDolgu(ctx, c.x + yw, c.y, yw, c.h, c.sag, gizle, ink);
  ctx.strokeStyle = ink; ctx.strokeRect(c.x, c.y, c.w, c.h); cizgi(ctx, c.x + yw, c.y, c.x + yw, c.y + c.h);
  if (harf && !gizle) { harfCiz(ctx, c.sol, c.x + yw / 2, c.y + c.h / 2, punto); harfCiz(ctx, c.sag, c.x + yw * 1.5, c.y + c.h / 2, punto); }
}
function uCiz(ctx: Ctx, u: UMik, ink: string, gizle: boolean, harf: boolean, punto: number, s: number) {
  const yol = () => { ctx.beginPath(); ctx.moveTo(u.x0, u.y0); ctx.lineTo(u.x1, u.y0); ctx.lineTo(u.x1, u.yi); ctx.lineTo(u.x2, u.yi); ctx.lineTo(u.x2, u.y0); ctx.lineTo(u.x3, u.y0); ctx.lineTo(u.x3, u.y1); ctx.lineTo(u.x0, u.y1); ctx.closePath(); };
  const xm = (u.x1 + u.x2) / 2, h = u.y1 - u.y0;
  ctx.save(); yol(); ctx.clip();
  yariDolgu(ctx, u.x0, u.y0, xm - u.x0, h, u.sol, gizle, ink);
  yariDolgu(ctx, xm, u.y0, u.x3 - xm, h, u.sag, gizle, ink);
  ctx.restore();
  ctx.strokeStyle = ink; yol(); ctx.stroke(); cizgi(ctx, xm, u.yi, xm, u.y1);
  if (harf && !gizle) {
    const yy = u.y0 + 15 * s;
    harfCiz(ctx, u.sol, (u.x0 + u.x1) / 2, yy, punto); harfCiz(ctx, u.sag, (u.x2 + u.x3) / 2, yy, punto);
  }
}

function okYerlestir(ctx: Ctx, pts: Nk[], sinir: Dik, buyuk: number) {
  // Yalnız sınır içindeki noktalar; yay boyuna göre ortada (uzun çizgide iki yerde) ok.
  const ic = pts.filter((p) => p.x >= sinir.x && p.x <= sinir.x + sinir.w && p.y >= sinir.y && p.y <= sinir.y + sinir.h);
  if (ic.length < 6) return;
  const cum = [0];
  for (let i = 1; i < ic.length; i++) cum.push(cum[i - 1] + Math.hypot(ic[i].x - ic[i - 1].x, ic[i].y - ic[i - 1].y));
  const T = cum[cum.length - 1];
  if (T < 24) return;
  const konum = (d: number): [Nk, Nk] => {
    let i = 1; while (i < cum.length - 1 && cum[i] < d) i++;
    const a = ic[Math.max(0, i - 2)], b = ic[Math.min(ic.length - 1, i + 2)];
    return [a, b];
  };
  const oranlar = T > 340 ? [0.3, 0.72] : [0.5];
  for (const o of oranlar) { const [a, b] = konum(T * o); ok(ctx, a.x, a.y, b.x, b.y, buyuk); }
}

function miknatisAlanCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const ink = ctx.strokeStyle as string, kal = ctx.lineWidth, punto = puntoOlc(k);
  const S = sahneKur(v, k), s = S.s;
  const gizle = ayarMantik(v, "gizle"), harf = ayarMantik(v, "harf"), oklu = ayarMantik(v, "ok");
  // Alan çizgileri
  ctx.save(); ctx.beginPath(); ctx.rect(S.sinir.x, S.sinir.y, S.sinir.w, S.sinir.h); ctx.clip();
  ctx.lineWidth = Math.max(1, kal * 0.7); ctx.lineJoin = "round"; ctx.lineCap = "round";
  for (const { pts } of miknatisAlanCizgileri(v, k)) {
    if (pts.length < 3) continue;
    ctx.strokeStyle = ink; ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    if (oklu) { ctx.strokeStyle = ink; okYerlestir(ctx, pts, S.sinir, 7); }
  }
  ctx.restore(); ctx.strokeStyle = ink; ctx.lineWidth = kal;
  // Mıknatıs(lar)
  for (const c of S.cubuklar) cubukCiz(ctx, c, ink, gizle, harf, punto * 1.1);
  if (S.u) uCiz(ctx, S.u, ink, gizle, harf, punto * 1.1, s);
  if (S.dunya) dunyaCiz(ctx, S.dunya, ink, gizle, harf, punto, s);
  // Pusulalar
  const rd = 12 * s, nk = pusulaNoktalari(v, k, S), igne = ayarMantik(v, "igne"), no = ayarMantik(v, "pusulaNo");
  nk.forEach((p, i) => {
    const b = alanVektoru(S.yukler, p.x, p.y);
    pusulaCiz(ctx, p.x, p.y, igne ? Math.atan2(b.y, b.x) : null, rd, ink);
    if (no) fizikMetniCiz(ctx, String(i + 1), p.x + rd + 3, p.y - rd * 0.7, Math.max(10, punto - 2), "sol");
  });
  ctx.strokeStyle = ink; ctx.lineWidth = kal;
}

function dunyaCiz(ctx: Ctx, d: Daire, ink: string, gizle: boolean, harf: boolean, punto: number, s: number) {
  ctx.save(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, PI * 2); ctx.fill(); ctx.restore();
  ctx.strokeStyle = ink; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, PI * 2); ctx.stroke();
  // İçteki çubuk mıknatıs: N ucu coğrafi güneye bakar
  const L = 1.15 * d.r, W = 0.42 * d.r;
  ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(PI / 2);
  cubukCiz(ctx, { x: -L / 2, y: -W / 2, w: L, h: W, sol: "S", sag: "N" }, ink, gizle, false, punto);
  ctx.restore();
  if (harf && !gizle) {
    harfCiz(ctx, "S", d.x, d.y - L / 4, punto * 0.95);
    harfCiz(ctx, "N", d.x, d.y + L / 4, punto * 0.95);
  }
  if (harf) {
    fizikMetniCiz(ctx, "K", d.x + 11 * s, d.y - d.r - 11 * s, punto, "sol");
    fizikMetniCiz(ctx, "G", d.x + 11 * s, d.y + d.r + 11 * s, punto, "sol");
  }
}

// ════════════════════════════════════════════════════════════════════════════
// İNDÜKSİYON: MIKNATIS – BOBİN – GALVANOMETRE (LENZ)
// ════════════════════════════════════════════════════════════════════════════
export type IndSonuc = {
  hareket: "yaklasir" | "uzaklasir" | "durgun"; eden: "miknatis" | "bobin"; kutup: Kutup; yer: "sol" | "sag"; sarim: 1 | -1;
  akim: boolean;
  /** Bobinin mıknatısa bakan ucunda indüklenen kutup (akım yoksa null). */
  indKutup: Kutup | null;
  /** Akımın bobin içinden geçiş yönü: +1 soldan sağa (sol uçtan girer), −1 sağdan sola, 0 yok. */
  bobinYon: 1 | -1 | 0;
  /** Galvanometreden geçen akım: +1 soldan sağa, −1 sağdan sola, 0 yok. */
  galvoYon: 1 | -1 | 0;
};
export function induksiyonHesap(v: CografyaVerisi): IndSonuc {
  const hareket = ayarSec(v, "hareket") as IndSonuc["hareket"], eden = ayarSec(v, "eden") as IndSonuc["eden"];
  const kutup = ayarSec(v, "kutup") as Kutup, yer = ayarSec(v, "yer") as "sol" | "sag", sarim = ayarSec(v, "sarim") === "geri" ? -1 : 1;
  const akim = hareket !== "durgun";
  // Lenz: yaklaşırken bakan uç aynı kutup (iter), uzaklaşırken zıt kutup (çeker)
  const indKutup = !akim ? null : hareket === "yaklasir" ? kutup : ters(kutup);
  // Sol uç N ise (sarım "/" iken) akım bobinden soldan sağa geçer; "\" sarımda tersi
  const solKutup = indKutup === null ? null : yer === "sol" ? indKutup : ters(indKutup);
  const bobinYon = (solKutup === null ? 0 : (solKutup === "N" ? 1 : -1) * sarim) as 1 | -1 | 0;
  const galvoYon = (bobinYon === 0 ? 0 : -bobinYon) as 1 | -1 | 0;
  return { hareket, eden, kutup, yer, sarim: sarim as 1 | -1, akim, indKutup, bobinYon, galvoYon };
}

function bobinCiz(ctx: Ctx, xs: number, y0: number, R: number, tur: number, p: number, a: number, c: 1 | -1) {
  // Helis izdüşümü: x = xs + p·t + a·cosθ, y = y0 − c·R·sinθ. Ön teller (cosθ > 0, izleyiciye yakın) KALIN,
  // arka teller ince çizilir; c = +1 için ön teller "/" yönlü (soldan sağa sarılırken yukarı çıkar).
  const t0 = c === 1 ? -PI / 2 : PI / 2, adim = Math.round(tur * 48), kal = ctx.lineWidth;
  ctx.lineCap = "round";
  let px = 0, py = 0;
  for (let i = 0; i <= adim; i++) {
    const t = (i / adim) * tur, th = t0 + 2 * PI * t;
    const x = xs + p * t + a * Math.cos(th), y = y0 - c * R * Math.sin(th);
    if (i > 0) {
      const ort = Math.cos(t0 + 2 * PI * ((i - 0.5) / adim) * tur);
      ctx.lineWidth = ort > 0 ? kal * 1.25 : kal * 0.5;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
    }
    px = x; py = y;
  }
  ctx.lineWidth = kal;
}

function galvoCiz(ctx: Ctx, gx: number, gy: number, r: number, sapma: number, ink: string, punto: number) {
  ctx.save(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(gx, gy, r, 0, PI * 2); ctx.fill(); ctx.restore();
  ctx.strokeStyle = ink; ctx.beginPath(); ctx.arc(gx, gy, r, 0, PI * 2); ctx.stroke();
  const px = gx, py = gy + 0.5 * r;
  ctx.save(); ctx.lineWidth = Math.max(0.8, ctx.lineWidth * 0.5);
  for (let i = -4; i <= 4; i++) {
    const t = (i * 11 * PI) / 180, u = i === 0 ? 0.74 : 0.8;
    const sx = Math.sin(t), cy = -Math.cos(t);
    cizgi(ctx, px + sx * r * u, py + cy * r * u, px + sx * r * 0.9, py + cy * r * 0.9);
  }
  ctx.restore();
  // İbre: 0 = dikey (orta sıfır), + sağa
  const th = (sapma * 33 * PI) / 180, bx = px + Math.sin(th) * r * 0.78, by = py - Math.cos(th) * r * 0.78;
  ctx.save(); ctx.lineWidth = Math.max(1.2, ctx.lineWidth * 0.8); cizgi(ctx, px, py, bx, by); ctx.restore();
  ctx.save(); ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(px, py, 2.4, 0, PI * 2); ctx.fill(); ctx.restore();
  fizikMetniCiz(ctx, "G", gx, gy + r + punto * 0.8, punto);
}

function indKutuYaz(ctx: Ctx, kp: string, x: number, y: number, punto: number, ink: string) {
  ctx.save(); ctx.fillStyle = "#fff"; ctx.strokeStyle = ink; ctx.lineWidth = Math.max(1, ctx.lineWidth * 0.6);
  ctx.beginPath(); ctx.arc(x, y, punto * 0.78, 0, PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
  fizikMetniCiz(ctx, kp, x, y, punto);
}

function induksiyonCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const ink = ctx.strokeStyle as string, kal = ctx.lineWidth, punto = puntoOlc(k);
  const s = Math.min(k.w / 460, k.h / 260), h = induksiyonHesap(v);
  const soru = ayarMantik(v, "soru"), tur = Math.round(ayarSayi(v, "tur"));
  const R = 28 * s, Lm = 110 * s, Hm = 34 * s, bosluk = 76 * s, p = 20 * s, a = 5.5 * s;
  const bw = tur * p, genel = Lm + bosluk + bw + a;
  const sol0 = k.x + (k.w - genel) / 2, y0 = k.y + 82 * s;
  const magSol = h.yer === "sol";
  const xm = magSol ? sol0 : sol0 + bw + a + bosluk, xc = magSol ? sol0 + Lm + bosluk : sol0;
  const xe = xc + bw;                                 // bobinin sağ ucu (tel ucu)
  const gx = (xc + xe) / 2, gy = y0 + R + 74 * s, gr = 27 * s;
  // Bobin
  ctx.save(); ctx.lineWidth = Math.max(1.2, kal * 0.85); ctx.lineJoin = "round"; ctx.strokeStyle = ink;
  bobinCiz(ctx, xc, y0, R, tur, p, a, h.sarim);
  ctx.restore();
  // Teller: bobinin iki ucu (altta) → galvanometre uçları
  const yAlt = y0 + R;
  ctx.strokeStyle = ink; ctx.lineWidth = Math.max(1.2, kal * 0.85);
  ctx.beginPath(); ctx.moveTo(xc, yAlt); ctx.lineTo(xc, gy); ctx.lineTo(gx - gr, gy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(xe, yAlt); ctx.lineTo(xe, gy); ctx.lineTo(gx + gr, gy); ctx.stroke();
  ctx.lineWidth = kal;
  // Galvanometre
  const goster = h.akim && !soru && ayarMantik(v, "ibre");
  galvoCiz(ctx, gx, gy, gr, goster ? h.galvoYon : 0, ink, punto);
  ctx.fillStyle = ink;
  for (const dx of [-gr, gr]) { ctx.beginPath(); ctx.arc(gx + dx, gy, 2.2, 0, PI * 2); ctx.fill(); }
  if (ayarMantik(v, "uclarAd")) {
    fizikMetniCiz(ctx, "K", gx - gr - 6 * s, gy + 11 * s, punto, "sag"); fizikMetniCiz(ctx, "L", gx + gr + 6 * s, gy + 11 * s, punto, "sol");
  }
  // İndüksiyon akımı oku (tellerin dikey kısımlarında)
  if (h.akim && !soru && ayarMantik(v, "akimOku")) {
    const ym = (yAlt + gy) / 2, bo = 9 * s, d = h.galvoYon; // +1: sol telde aşağı, sağ telde yukarı
    ctx.strokeStyle = ink; ctx.lineWidth = Math.max(1.2, kal * 0.85);
    ok(ctx, xc, ym - d * bo, xc, ym + d * bo, 8 * s + 2);
    ok(ctx, xe, ym + d * bo, xe, ym - d * bo, 8 * s + 2);
    ctx.lineWidth = kal;
    fizikMetniCiz(ctx, "i", xc - 9 * s, ym, punto, "sag");
  }
  // Mıknatıs
  const mk: Cubuk = { x: xm, y: y0 - Hm / 2, w: Lm, h: Hm, sol: magSol ? ters(h.kutup) : h.kutup, sag: magSol ? h.kutup : ters(h.kutup) };
  cubukCiz(ctx, mk, ink, false, true, punto * 1.1);
  // Hız oku (hareket eden cismin üstünde, diğerine doğru ya da ters)
  const yv = h.eden === "miknatis" ? y0 - Hm / 2 - 20 * s : y0 - R - 32 * s;
  if (ayarMantik(v, "hizYaz")) {
    if (h.hareket === "durgun") fizikMetniCiz(ctx, "v = 0", (magSol ? xm + Lm / 2 : xm + Lm / 2), yv + 2 * s, punto);
    else {
      const digerineYon = magSol ? (h.eden === "miknatis" ? 1 : -1) : (h.eden === "miknatis" ? -1 : 1); // +1 sağa
      const yon = h.hareket === "yaklasir" ? digerineYon : -digerineYon;
      const mx = h.eden === "miknatis" ? xm + Lm / 2 : xc + bw / 2 + a / 2, L = 40 * s;
      ctx.lineWidth = Math.max(1.4, kal);
      ok(ctx, mx - yon * L / 2, yv, mx + yon * L / 2, yv, 8 * s + 2);
      ctx.lineWidth = kal;
      fizikMetniCiz(ctx, "v", mx, yv - 11 * s, punto + 1);
    }
  }
  // Bobinin indüklenen kutbu (mıknatısa bakan uç; isteğe bağlı iki uç)
  if (h.akim && !soru && ayarMantik(v, "kutupYaz") && h.indKutup) {
    const yk = y0 - R - 11 * s, bakanX = magSol ? xc : xe, uzakX = magSol ? xe : xc;
    indKutuYaz(ctx, h.indKutup, bakanX, yk, punto * 0.95, ink);
    if (ayarMantik(v, "ikiUc")) indKutuYaz(ctx, ters(h.indKutup), uzakX, yk, punto * 0.95, ink);
  } else if (soru && h.akim && ayarMantik(v, "kutupYaz")) {
    // Soru modunda bakan uca "?" konur
    const yk = y0 - R - 11 * s, bakanX = magSol ? xc : xe;
    indKutuYaz(ctx, "?", bakanX, yk, punto * 0.95, ink);
  }
  ctx.strokeStyle = ink; ctx.lineWidth = kal;
}

export function induksiyonOzet(v: CografyaVerisi): string {
  const h = induksiyonHesap(v);
  if (!h.akim) return "Mıknatıs ile bobin arasında bağıl hareket yok: bobinden geçen akı değişmez, indüksiyon emk'sı ve akımı oluşmaz (galvanometre sıfırı gösterir).";
  const kl = ayarMantik(v, "uclarAd");
  const yonYaz = h.galvoYon === 1 ? "soldan sağa" : "sağdan sola";
  const kly = kl ? ` (${h.galvoYon === 1 ? "K'den L'ye" : "L'den K'ye"})` : "";
  const eden = h.eden === "miknatis" ? "Mıknatıs" : "Bobin";
  const yak = h.hareket === "yaklasir";
  return `${eden} ${yak ? "yaklaşırken" : "uzaklaşırken"} bobine bakan ${h.kutup} kutbunun alanı bobinde ${yak ? "artar" : "azalır"}. Lenz yasası: indüksiyon akımı bu değişime karşı koyar, bobinin mıknatısa bakan ucu ${h.indKutup} olur (mıknatısı ${yak ? "iter" : "çeker"}); galvanometreden geçen akım ${yonYaz}${kly}.`;
}

// ════════════════════════════════════════════════════════════════════════════
// ÇERÇEVE – ALAN
// ════════════════════════════════════════════════════════════════════════════
export type CerceveSonuc = { durum: "girerken" | "icinde" | "cikarken"; alan: "iceri" | "disari"; akim: boolean; /** +1 saat yönünün tersi, −1 saat yönü, 0 yok */ yon: 1 | -1 | 0 };
export function cerceveHesap(v: CografyaVerisi): CerceveSonuc {
  const durum = ayarSec(v, "durum") as CerceveSonuc["durum"], alan = ayarSec(v, "alan") as "iceri" | "disari";
  // Alan giren (⊗) ve akı artıyorsa: indüksiyon alanı dışarı → saatin tersi. Diğer üç durum buna göre.
  const artar = durum === "girerken" ? 1 : durum === "cikarken" ? -1 : 0;
  const yon = (artar * (alan === "iceri" ? 1 : -1)) as 1 | -1 | 0;
  return { durum, alan, akim: yon !== 0, yon };
}
function alanIsaretiCiz(ctx: Ctx, x: number, y: number, iceri: boolean, ink: string) {
  ctx.save(); ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = Math.max(0.8, ctx.lineWidth * 0.5);
  if (iceri) { const e = 3.4; cizgi(ctx, x - e, y - e, x + e, y + e); cizgi(ctx, x - e, y + e, x + e, y - e); }
  else { ctx.beginPath(); ctx.arc(x, y, 1.9, 0, PI * 2); ctx.fill(); }
  ctx.restore();
}
function cerceveCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu) {
  const ink = ctx.strokeStyle as string, kal = ctx.lineWidth, punto = puntoOlc(k), c = cerceveHesap(v);
  const s = Math.min(k.w / 420, k.h / 240), sag = ayarSec(v, "yon") === "sag", soru = ayarMantik(v, "soru");
  const Rw = 0.46 * k.w, Rh = 0.7 * k.h, Rx = k.x + (k.w - Rw) / 2, Ry = k.y + 0.2 * k.h, Rc = Rx + Rw / 2;
  // Alan bölgesi (kesikli çerçeve) ve ⊗ / ⊙ ızgarası
  ctx.save(); ctx.setLineDash([5, 4]); ctx.lineWidth = Math.max(0.9, kal * 0.6); ctx.strokeRect(Rx, Ry, Rw, Rh); ctx.restore();
  const ar = 26 * s;
  for (let x = Rx + ar / 2; x < Rx + Rw; x += ar) for (let y = Ry + ar / 2; y < Ry + Rh; y += ar) alanIsaretiCiz(ctx, x, y, c.alan === "iceri", ink);
  // Çerçeve konumu (sağa giderken kurulur; sola gidişte alan merkezine göre aynalanır)
  const cw = Math.min(0.22 * k.w, 92 * s), ch = 0.42 * Rh * 1.0;
  let x0: number;
  if (c.durum === "girerken") x0 = Rx - cw * 0.55; else if (c.durum === "icinde") x0 = Rc - cw / 2; else x0 = Rx + Rw - cw * 0.45;
  if (!sag) x0 = 2 * Rc - (x0 + cw);
  const y0 = Ry + (Rh - ch) / 2;
  ctx.save(); ctx.lineWidth = Math.max(1.6, kal * 1.1); ctx.lineJoin = "round"; ctx.strokeRect(x0, y0, cw, ch); ctx.restore();
  // İndüksiyon akımı okları (kenar ortalarında)
  if (c.akim && !soru && ayarMantik(v, "akimOku")) {
    const ccw = c.yon === 1, mx = x0 + cw / 2, my = y0 + ch / 2, e = 9 * s + 3;
    ctx.save(); ctx.lineWidth = Math.max(1.4, kal);
    // Saatin tersi: üst kenar sola, sol kenar aşağı, alt kenar sağa, sağ kenar yukarı
    const d = ccw ? 1 : -1;
    ok(ctx, mx + d * e, y0, mx - d * e, y0, 8 * s + 2);
    ok(ctx, x0, my - d * e, x0, my + d * e, 8 * s + 2);
    ok(ctx, mx - d * e, y0 + ch, mx + d * e, y0 + ch, 8 * s + 2);
    ok(ctx, x0 + cw, my + d * e, x0 + cw, my - d * e, 8 * s + 2);
    ctx.restore();
    const iy = y0 + ch + 13 * s;
    ctx.save(); ctx.fillStyle = "#fff"; ctx.fillRect(mx - 5, iy - 7, 10, 14); ctx.restore();
    fizikMetniCiz(ctx, "i", mx, iy, punto);
  }
  // Hız oku (alanın üstünde)
  if (ayarMantik(v, "hizYaz")) {
    const yv = Ry - 14 * s, mx = x0 + cw / 2, L = 40 * s, yon = sag ? 1 : -1;
    ctx.save(); ctx.lineWidth = Math.max(1.4, kal);
    ok(ctx, mx - yon * L / 2, yv, mx + yon * L / 2, yv, 8 * s + 2);
    ctx.restore();
    fizikMetniCiz(ctx, "v", mx, yv - 11 * s, punto + 1);
  }
  if (ayarMantik(v, "bYaz")) {
    const bx = sag ? Rx + Rw + 8 * s : Rx - 8 * s;
    fizikMetniCiz(ctx, "B", bx, Ry + 10 * s, punto + 1, sag ? "sol" : "sag");
  }
  ctx.strokeStyle = ink; ctx.lineWidth = kal;
}
export function cerceveOzet(v: CerceveSonuc | CografyaVerisi): string {
  const c = "tur" in v ? cerceveHesap(v) : v;
  const al = c.alan === "iceri" ? "sayfaya giren (⊗)" : "sayfadan çıkan (⊙)";
  if (!c.akim) return `Çerçeve ${c.durum === "icinde" ? "tamamen düzgün alanın içinde" : "alana girmedi"}: içinden geçen akı değişmez, indüksiyon akımı oluşmaz.`;
  const gir = c.durum === "girerken";
  return `Çerçeve ${al} alana ${gir ? "girerken akı artar" : "çıkarken akı azalır"}; Lenz: indüksiyon akımının alanı ${gir ? "ters" : "aynı"} yönde olur → akım ${c.yon === 1 ? "saatin tersi" : "saat"} yönünde.`;
}

// ════════════════════════════════════════════════════════════════════════════
// Dağıtıcı
// ════════════════════════════════════════════════════════════════════════════
export function miknatisOzet(v: CografyaVerisi): string | null | undefined {
  switch (v.yapi) {
    case "miknatisAlan": {
      const tip = ayarSec(v, "tip");
      const ad = tip === "cubuk" ? "Çubuk mıknatıs" : tip === "u" ? "U mıknatıs" : tip === "iki" ? `İki mıknatıs (${ayarSec(v, "yuz")[0]}–${ayarSec(v, "yuz")[1]} karşılıklı)` : "Dünya";
      const ek = tip === "iki" ? (ayarSec(v, "yuz")[0] === ayarSec(v, "yuz")[1] ? " Aynı kutuplar karşılıklı: iterler, aralarında B = 0 olan bir nötr nokta vardır." : " Zıt kutuplar karşılıklı: çekerler, aralarında alan çizgileri düz ve sıktır.") : tip === "u" ? " Kutuplar arasında alan yaklaşık düzgündür (çizgiler paralel, eşit aralıklı)." : tip === "dunya" ? " Coğrafi kuzey yakınında manyetik S kutbu bulunur; pusulanın N ucu B yönünü, yani coğrafi kuzeyi gösterir." : "";
      return `${ad}: dışarıda alan çizgileri N kutbundan çıkıp S kutbuna girer (içeride S'den N'ye, kapalı eğriler). Pusula iğnesinin N ucu o noktada B yönünü gösterir.${ek}`;
    }
    case "induksiyon": return induksiyonOzet(v);
    case "cerceveAlan": return cerceveOzet(v);
    default: return undefined;
  }
}
export function miknatisCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu): boolean {
  switch (v.yapi) {
    case "miknatisAlan": miknatisAlanCiz(ctx, v, k); return true;
    case "induksiyon": induksiyonCiz(ctx, v, k); return true;
    case "cerceveAlan": cerceveCiz(ctx, v, k); return true;
    default: return false;
  }
}
