// Fizik şekilleri – Karma devre: "R1 + (R2 // R3)" gibi seri–paralel ifadeden otomatik çizilen devre.
// Üç katman: (1) ifade ayrıştırıcı, (2) hesap (R_eş, akım, gerilim, ölçü aleti okumaları),
// (3) yerleşim (ağacı dik açılı şemaya çeviren özyinelemeli düzen) + çizim. Yalnız gri/siyah.
//
// Gramer:  ifade := terim ('+' terim)*          (seri)
//          terim := çarpan (('//' | '∥' | '|') çarpan)*   (paralel; '+' ten daha sıkı bağlanır)
//          çarpan := ELEMAN | '(' ifade ')'
//          ELEMAN := R<n> direnç · L<n> lamba · S<n> anahtar · A<n> ampermetre (R_1, r1 de olur)
import { fizikMetniCiz, fizikMetniOlcu } from "../fizik";
import { ayarMantik, ayarMetin, ayarSayi, ayarSec, type CografyaVerisi } from "./sema";
import { sayiYaz, type Kutu } from "./fizikYardim";

type Ctx = CanvasRenderingContext2D;

// ════════════════════════════════════════════════════════════════════════════
// 1) AYRIŞTIRICI
// ════════════════════════════════════════════════════════════════════════════
export type DevreTur = "R" | "L" | "S" | "A" | "V";
export type DevreYaprak = { t: "e"; ad: string; tur: DevreTur };
export type DevreDugum = DevreYaprak | { t: "s" | "p"; c: DevreDugum[] };
export type Ayristirma = { ok: true; agac: DevreDugum; adlar: string[] } | { ok: false; hata: string };

const EN_COK_ELEMAN = 12, EN_COK_DERINLIK = 8;
type Jeton = { t: "ad" | "(" | ")" | "+" | "|"; s: string; i: number };

/** Yazım: "R_1", "r1", "R 1" değil → "R1". Gösterim adı: R1 → "R_1". */
export const devreAdi = (ad: string) => { const m = /^([A-Z])(\d+)$/.exec(ad); return m ? `${m[1]}_${m[2]}` : ad; };
const ALT = "₀₁₂₃₄₅₆₇₈₉";
const altSimge = (ad: string) => ad.replace(/\d/g, (d) => ALT[+d]);

function jetonla(src: string): Jeton[] | string {
  const j: Jeton[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === "(" || c === "[") { j.push({ t: "(", s: c, i }); i++; continue; }
    if (c === ")" || c === "]") { j.push({ t: ")", s: c, i }); i++; continue; }
    if (c === "+") { j.push({ t: "+", s: c, i }); i++; continue; }
    if (c === "|" || c === "∥" || c === "‖" || c === "/") {
      const b = i; while (i < src.length && "|∥‖/".includes(src[i])) i++;
      j.push({ t: "|", s: src.slice(b, i), i: b }); continue;
    }
    if (/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(c)) {
      const m = /^([A-Za-zÇĞİÖŞÜçğıöşü])(?:_?(\d+))?/.exec(src.slice(i))!;
      const tur = m[1].toUpperCase();
      if (!"RLSA".includes(tur)) return `'${m[1]}' tanınmıyor (R direnç, L lamba, S anahtar, A ampermetre kullanın)`;
      j.push({ t: "ad", s: tur + (m[2] ?? ""), i }); i += m[0].length; continue;
    }
    if (/\d/.test(c)) return `'${c}' tek başına yazılamaz (eleman adı R1, L2 gibi olmalı)`;
    return `'${c}' simgesi tanınmıyor`;
  }
  return j;
}

export function devreAyristir(ifade: string): Ayristirma {
  const j = jetonla(ifade);
  if (typeof j === "string") return { ok: false, hata: j };
  if (!j.length) return { ok: false, hata: "ifade boş" };
  let p = 0, adet = 0, hata = "";
  const adlar: string[] = [];
  const HATA = Symbol();
  const bozuk = (m: string): never => { hata = m; throw HATA; };
  const ifadeOku = (d: number): DevreDugum => {
    if (d > EN_COK_DERINLIK) bozuk(`çok iç içe parantez (en çok ${EN_COK_DERINLIK})`);
    const t = [terimOku(d)];
    while (j[p]?.t === "+") { p++; t.push(terimOku(d)); }
    return t.length === 1 ? t[0] : { t: "s", c: t };
  };
  const terimOku = (d: number): DevreDugum => {
    const t = [carpanOku(d)];
    while (j[p]?.t === "|") { p++; t.push(carpanOku(d)); }
    return t.length === 1 ? t[0] : { t: "p", c: t };
  };
  const carpanOku = (d: number): DevreDugum => {
    const g = j[p];
    if (!g) return bozuk("ifade eksik bitti (eleman bekleniyordu)");
    if (g.t === "ad") {
      p++;
      if (adlar.includes(g.s)) bozuk(`'${g.s}' birden fazla yazılmış (adlar farklı olmalı)`);
      if (++adet > EN_COK_ELEMAN) bozuk(`en çok ${EN_COK_ELEMAN} eleman çizilebilir`);
      adlar.push(g.s);
      return { t: "e", ad: g.s, tur: g.s[0] as DevreTur };
    }
    if (g.t === "(") {
      p++;
      if (j[p]?.t === ")") bozuk("boş parantez");
      const n = ifadeOku(d + 1);
      if (j[p]?.t !== ")") bozuk("')' eksik");
      p++;
      return n;
    }
    return bozuk(g.t === ")" ? "fazladan ')' var" : `'${g.s}' burada olamaz (eleman bekleniyordu)`);
  };
  try {
    const agac = ifadeOku(0);
    if (p < j.length) bozuk(j[p].t === ")" ? "fazladan ')' var" : `'${j[p].s}' öncesinde '+' ya da '//' eksik`);
    return { ok: true, agac: duzle(agac), adlar };
  } catch (e) {
    if (e === HATA) return { ok: false, hata };
    throw e;
  }
}

/** Aynı türden iç içe grupları birleştirir: a+(b+c) → a+b+c, tek çocuklu grubu açar. */
export function duzle(n: DevreDugum): DevreDugum {
  if (n.t === "e") return n;
  const c: DevreDugum[] = [];
  for (const x of n.c.map(duzle)) { if (x.t === n.t) c.push(...x.c); else c.push(x); }
  return c.length === 1 ? c[0] : { t: n.t, c };
}
export const yapraklar = (n: DevreDugum): DevreYaprak[] => (n.t === "e" ? [n] : n.c.flatMap(yapraklar));

/** "R1=2, R2=3,5 , L1=6" → {R1:2, R2:3.5, L1:6} */
export function degerleriOku(s: string): Record<string, number> {
  const o: Record<string, number> = {};
  const re = /([A-Za-z])_?(\d*)\s*=\s*(\d+(?:[.,]\d+)?)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) o[m[1].toUpperCase() + m[2]] = Number(m[3].replace(",", "."));
  return o;
}

// ════════════════════════════════════════════════════════════════════════════
// 2) MODEL VE HESAP
// ════════════════════════════════════════════════════════════════════════════
export type DevreModel = {
  hata?: string;
  agac: DevreDugum;
  kl: boolean;
  deger: Record<string, number>;
  acik: boolean;               // anahtarlar açık mı
  V: number; r: number;
  anaAnahtar?: DevreYaprak; anaAmper?: DevreYaprak; ekAmper?: DevreYaprak; ekVolt?: DevreYaprak;
  voltUretec: boolean;
};
const bosAgac: DevreDugum = { t: "e", ad: "R1", tur: "R" };

const olcerYaprak = (tur: "A" | "V"): DevreYaprak => ({ t: "e", ad: "~" + tur, tur });
const adNorm = (s: string) => s.replace(/[\s_]/g, "").toUpperCase();

export function devreModeli(v: CografyaVerisi): DevreModel {
  const kl = ayarSec(v, "mod") === "kl";
  const tem = { kl, deger: degerleriOku(ayarMetin(v, "degerler")), acik: ayarSec(v, "anahtarDurum") === "acik", V: ayarSayi(v, "V"), r: ayarSayi(v, "r"), voltUretec: false };
  const ay = devreAyristir(ayarMetin(v, "ifade"));
  if (!ay.ok) return { ...tem, agac: bosAgac, hata: `İfade okunamadı: ${ay.hata}` };
  let agac = ay.agac;
  const m: DevreModel = { ...tem, agac };
  if (!kl) {
    const amp = ayarSec(v, "ampermetre"), volt = ayarSec(v, "voltmetre");
    const bul = (ad: string) => yapraklar(agac).find((y) => y.ad === adNorm(ad));
    const sar = (n: DevreDugum, hedef: DevreYaprak, f: (y: DevreYaprak) => DevreDugum): DevreDugum =>
      n.t === "e" ? (n === hedef ? f(n) : n) : { t: n.t, c: n.c.map((x) => sar(x, hedef, f)) };
    if (amp === "eleman") {
      const ad = ayarMetin(v, "ampermetreEleman"), h = bul(ad);
      if (!h) return { ...m, hata: `Eleman bulunamadı: '${ad.trim()}' (ampermetre için ifadede olmayan ad)` };
      m.ekAmper = olcerYaprak("A"); const a = m.ekAmper;
      agac = sar(agac, h, (y) => ({ t: "s", c: [y, a] }));
    }
    if (volt === "eleman") {
      const ad = ayarMetin(v, "voltmetreEleman"), h = bul(ad);
      if (!h) return { ...m, hata: `Eleman bulunamadı: '${ad.trim()}' (voltmetre için ifadede olmayan ad)` };
      m.ekVolt = olcerYaprak("V"); const vm = m.ekVolt;
      agac = sar(agac, h, (y) => ({ t: "p", c: [y, vm] }));
    }
    m.voltUretec = volt === "uretec";
    const bas: DevreDugum[] = [];
    if (ayarMantik(v, "anahtar")) bas.push((m.anaAnahtar = { t: "e", ad: "~S", tur: "S" }));
    if (amp === "ana") bas.push((m.anaAmper = olcerYaprak("A")));
    agac = duzle(bas.length ? { t: "s", c: [...bas, agac] } : agac);
  }
  return { ...m, agac };
}

export type DevreSonuc = {
  tam: boolean; eksik: string[];
  Req: number;            // Ω (Infinity: açık devre)
  I: number; Vu: number;  // ana akım (A), dış devre gerilimi (V)
  yaprak: Map<DevreYaprak, { R: number; I: number; V: number }>;
  r: Map<DevreDugum, number>;
};

function direnc(n: DevreDugum, deger: Record<string, number>, acik: boolean, o: Map<DevreDugum, number>): number {
  let R: number;
  if (n.t === "e") {
    R = n.tur === "R" || n.tur === "L" ? (deger[n.ad] ?? NaN) : n.tur === "S" ? (acik ? Infinity : 0) : n.tur === "A" ? 0 : Infinity;
  } else if (n.t === "s") {
    R = n.c.reduce((t, c) => t + direnc(c, deger, acik, o), 0);
  } else {
    const r = n.c.map((c) => direnc(c, deger, acik, o));
    R = r.some(Number.isNaN) ? NaN : r.some((x) => x === 0) ? 0 : (() => { const g = r.reduce((t, x) => t + 1 / x, 0); return g === 0 ? Infinity : 1 / g; })();
  }
  o.set(n, R);
  return R;
}

/** Üst düğümde (akım I, gerilim Vn) bilindiğine göre alt düğümlere dağıtır. */
function dagit(n: DevreDugum, I: number, Vn: number, o: Map<DevreDugum, number>, y: DevreSonuc["yaprak"]) {
  if (n.t === "e") { y.set(n, { R: o.get(n)!, I, V: Vn }); return; }
  const Rn = o.get(n)!;
  if (n.t === "s") {
    if (Number.isFinite(Rn)) { for (const c of n.c) dagit(c, I, I * o.get(c)!, o, y); return; }
    let ilk = true; // açık devre: gerilim sonsuz dirençli (ilk) elemanda
    for (const c of n.c) { const sonsuz = o.get(c) === Infinity && ilk; if (sonsuz) ilk = false; dagit(c, 0, sonsuz ? Vn : 0, o, y); }
    return;
  }
  if (Rn === 0) { // kısa devre kolu: akım sıfır dirençli kollara eşit bölünür
    const sifir = n.c.filter((c) => o.get(c) === 0).length;
    for (const c of n.c) dagit(c, o.get(c) === 0 ? I / sifir : 0, 0, o, y);
    return;
  }
  for (const c of n.c) { const Rc = o.get(c)!; dagit(c, Rc === Infinity ? 0 : Vn / Rc, Vn, o, y); }
}

export function devreHesapla(m: DevreModel): DevreSonuc {
  const r = new Map<DevreDugum, number>(), yaprak: DevreSonuc["yaprak"] = new Map();
  const Req = direnc(m.agac, m.deger, m.acik, r);
  const eksik = yapraklar(m.agac).filter((y) => (y.tur === "R" || y.tur === "L") && m.deger[y.ad] === undefined).map((y) => y.ad);
  const tam = !eksik.length && !Number.isNaN(Req);
  let I = NaN, Vu = NaN;
  if (tam && !m.kl) {
    const top = Req + m.r;
    I = Number.isFinite(Req) ? (top === 0 ? Infinity : m.V / top) : 0;
    Vu = Number.isFinite(Req) ? (I === Infinity ? 0 : I * Req) : m.V;
    if (Number.isFinite(I)) dagit(m.agac, I, Vu, r, yaprak);
  }
  return { tam, eksik, Req, I, Vu, yaprak, r };
}

const ifadeYaz = (n: DevreDugum, ic = false): string =>
  n.t === "e" ? altSimge(n.ad) : (() => { const s = n.c.map((c) => ifadeYaz(c, true)).join(n.t === "s" ? " + " : " ∥ "); return ic ? `(${s})` : s; })();
const say = (x: number) => (Number.isFinite(x) ? sayiYaz(x, 2) : "∞");

export function devreOzet(v: CografyaVerisi): string | null | undefined {
  if (v.yapi !== "karmaDevre") return undefined;
  const m = devreModeli(v);
  if (m.hata) return m.hata;
  const s = devreHesapla(m);
  if (!s.tam) return s.eksik.length ? `Değer eksik: ${s.eksik.map(altSimge).join(", ")} için "degerler" alanına R=… yazın (R_eş hesaplanamadı).` : null;
  const adimlar: string[] = [];
  const gez = (n: DevreDugum, kok: boolean) => {
    if (n.t === "e") return;
    n.c.forEach((c) => gez(c, false));
    const ytr = yapraklar(n);
    if (!kok && !ytr.some((y) => y.ad[0] === "~")) adimlar.push(`${ifadeYaz(n, true)} = ${say(s.r.get(n)!)} Ω`);
  };
  gez(m.agac, true);
  const isl = adimlar.length ? adimlar.join(" · ") + " · " : "";
  const REq = `R_eş = ${say(s.Req)} Ω`;
  if (m.kl) return `${isl}${REq} (K–L arası)`;
  const p: string[] = [`${isl}${REq}`];
  if (!Number.isFinite(s.Req)) { p.push("devre açık: akım 0 (anahtar açık ya da kol kopuk)"); return p.join(" · "); }
  if (!Number.isFinite(s.I)) return `${REq} · üreteç kısa devre (R_eş + r = 0)`;
  p.push(`I = V/(R_eş + r) = ${say(m.V)}/${say(s.Req + m.r)} = ${say(s.I)} A`);
  if (m.r > 0) p.push(`dış gerilim = V − I·r = ${say(s.Vu)} V`);
  const el = yapraklar(m.agac).filter((y) => (y.tur === "R" || y.tur === "L") && s.yaprak.has(y));
  p.push(el.map((y) => { const q = s.yaprak.get(y)!; return `${altSimge(y.ad)}: ${say(q.V)} V, ${say(q.I)} A`; }).join(" · "));
  const ol: string[] = [];
  for (const [ad, y] of [["Ampermetre", m.anaAmper ?? m.ekAmper], ["Voltmetre", m.ekVolt]] as const) if (y) { const q = s.yaprak.get(y); if (q) ol.push(`${ad} ${say(ad === "Ampermetre" ? q.I : q.V)} ${ad === "Ampermetre" ? "A" : "V"}`); }
  if (m.voltUretec) ol.push(`Voltmetre ${say(s.Vu)} V (üreteç uçları)`);
  if (ol.length) p.push(ol.join(" · "));
  if (m.acik) p.push("anahtar açık");
  return p.join(" · ");
}

// ════════════════════════════════════════════════════════════════════════════
// 3) YERLEŞİM
// ════════════════════════════════════════════════════════════════════════════
export type Prim =
  | { t: "tel"; x0: number; y0: number; x1: number; y1: number }
  | { t: "nokta"; x: number; y: number; dugum?: boolean; ad?: string }
  | { t: "el"; tur: DevreTur; cx: number; cy: number; bw: number; acik?: boolean }
  | { t: "pil"; x0: number; y0: number; x1: number; y1: number; arti: 0 | 1; nx: number; ny: number }
  | { t: "ok"; x0: number; y0: number; x1: number; y1: number }
  | { t: "yazi"; x: number; y: number; m: string; hiza: "orta" | "sol" | "sag" };

type Blok = { w: number; ust: number; alt: number; yerles: (x: number, y: number) => void };
type Baglam = {
  punto: number; olc: (m: string) => number; prims: Prim[]; acik: boolean;
  etiket: (y: DevreYaprak) => string;
};
export type DevreSecenek = {
  punto: number; olc: (m: string) => number;
  etiket: "adDeger" | "ad" | "deger" | "yok"; soru: boolean; okuma: boolean;
  uretecYeri: "sol" | "ust" | "alt"; uretecYaz: boolean; akim: boolean; dugum: boolean;
};
export type DevreDuzen = { prims: Prim[]; kutu: { x0: number; y0: number; x1: number; y1: number } };

const PAD_BARA = 14, YOL_BOSLUK = 4, GOVDE_YARI = 13;
const GOVDE_GEN: Record<DevreTur, number> = { R: 40, L: 24, A: 24, V: 24, S: 36 };
const DUGUM_HARF = "KLMNPRST";

function yaprakBlok(n: DevreYaprak, b: Baglam): Blok {
  const gv = GOVDE_GEN[n.tur], lab = b.etiket(n), lw = lab ? b.olc(lab) : 0;
  const w = Math.max(gv + 14, lw + 12);
  return {
    w, ust: 14 + (lab ? b.punto + 7 : 0), alt: 14,
    yerles(x, y) {
      const cx = x + w / 2;
      b.prims.push({ t: "tel", x0: x, y0: y, x1: cx - gv / 2, y1: y });
      b.prims.push({ t: "el", tur: n.tur, cx, cy: y, bw: gv, acik: n.tur === "S" ? b.acik : undefined });
      b.prims.push({ t: "tel", x0: cx + gv / 2, y0: y, x1: x + w, y1: y });
      if (lab) b.prims.push({ t: "yazi", x: cx, y: y - 14 - (b.punto * 0.5 + 3), m: lab, hiza: "orta" });
    },
  };
}

function seriBlok(ch: Blok[]): Blok {
  const w = ch.reduce((t, c) => t + c.w, 0);
  return { w, ust: Math.max(...ch.map((c) => c.ust)), alt: Math.max(...ch.map((c) => c.alt)), yerles(x, y) { let cx = x; for (const c of ch) { c.yerles(cx, y); cx += c.w; } } };
}

function paralelBlok(ch: Blok[], b: Baglam): Blok {
  const ic = Math.max(...ch.map((c) => c.w)), w = ic + 2 * PAD_BARA;
  const ara = ch.slice(1).map((c, i) => ch[i].alt + YOL_BOSLUK + c.ust);
  const alt = ara.reduce((t, a) => t + a, 0) + ch[ch.length - 1].alt;
  return {
    w, ust: ch[0].ust, alt,
    yerles(x, y) {
      const xa = x + PAD_BARA, xb = x + w - PAD_BARA;
      const ys = [y]; ara.forEach((a) => ys.push(ys[ys.length - 1] + a));
      b.prims.push({ t: "tel", x0: x, y0: y, x1: xa, y1: y }, { t: "tel", x0: xb, y0: y, x1: x + w, y1: y });
      b.prims.push({ t: "tel", x0: xa, y0: y, x1: xa, y1: ys[ys.length - 1] }, { t: "tel", x0: xb, y0: y, x1: xb, y1: ys[ys.length - 1] });
      ch.forEach((c, i) => {
        const cx = xa + (ic - c.w) / 2;
        if (cx > xa) b.prims.push({ t: "tel", x0: xa, y0: ys[i], x1: cx, y1: ys[i] }, { t: "tel", x0: cx + c.w, y0: ys[i], x1: xb, y1: ys[i] });
        c.yerles(cx, ys[i]);
        if (i < ch.length - 1) b.prims.push({ t: "nokta", x: xa, y: ys[i], dugum: i === 0 }, { t: "nokta", x: xb, y: ys[i], dugum: i === 0 });
      });
    },
  };
}

function agacBlok(n: DevreDugum, b: Baglam): Blok {
  if (n.t === "e") return yaprakBlok(n, b);
  const ch = n.c.map((c) => agacBlok(c, b));
  return n.t === "s" ? seriBlok(ch) : paralelBlok(ch, b);
}

/** Ağacı dik açılı şemaya çevirir. Saf veri üretir (çizim `devreCiz`de); testler bunu denetler. */
export function devreDuzenle(m: DevreModel, s: DevreSonuc, o: DevreSecenek): DevreDuzen {
  const soru = o.soru;
  const sayiVar = (y: DevreYaprak) => m.deger[y.ad] !== undefined;
  const okumaYaz = (y: DevreYaprak) => {
    if (!o.okuma || soru) return "";
    const q = s.yaprak.get(y);
    return q ? (y.tur === "A" ? `${say(q.I)} A` : `${say(q.V)} V`) : "";
  };
  const etiket = (y: DevreYaprak): string => {
    if (y.tur === "A" || y.tur === "V") return okumaYaz(y);
    const ad = devreAdi(y.ad.startsWith("~") ? "S" : y.ad), d = sayiVar(y) ? `${say(m.deger[y.ad])} Ω` : "";
    if (y.tur === "S") return o.etiket === "yok" ? "" : ad;
    const mod = soru && (o.etiket === "deger" || o.etiket === "adDeger") ? "ad" : o.etiket;
    return mod === "yok" ? "" : mod === "ad" ? ad : mod === "deger" ? d : d ? `${ad} = ${d}` : ad;
  };
  const prims: Prim[] = [];
  const b: Baglam = { punto: o.punto, olc: o.olc, prims, etiket, acik: m.acik };
  const govde = agacBlok(m.agac, b);

  const P = o.punto;
  const kl = m.kl;

  if (kl) {
    const g = 26;
    prims.push({ t: "tel", x0: 0, y0: 0, x1: g, y1: 0 });
    govde.yerles(g, 0);
    prims.push({ t: "tel", x0: g + govde.w, y0: 0, x1: 2 * g + govde.w, y1: 0 });
    prims.push({ t: "nokta", x: 0, y: 0, ad: "K" }, { t: "nokta", x: 2 * g + govde.w, y: 0, ad: "L" });
    prims.push({ t: "yazi", x: -8, y: 0, m: "K", hiza: "sag" }, { t: "yazi", x: 2 * g + govde.w + 8, y: 0, m: "L", hiza: "sol" });
  } else {
    // Üreteç: sol kolda dikey, üst/alt kolda yatay. Akım saat yönünde: üst telde sağa → "+" ucu akımın çıktığı uçtur.
    const yer = o.uretecYeri;
    const hasV = m.voltUretec;
    // Üretecin yazısı
    const aV = soru || !o.uretecYaz ? (o.uretecYaz ? "V" : "") : `V = ${say(m.V)} V`;
    const aR = m.r > 0 && o.uretecYaz ? (soru ? "r" : `r = ${say(m.r)} Ω`) : "";
    const uretecYazi = [aV, aR].filter(Boolean).join("\n");
    const satir = uretecYazi ? uretecYazi.split("\n").length : 0;
    const yazW = uretecYazi ? Math.max(...uretecYazi.split("\n").map(o.olc)) : 0;

    // Kök zincir: [üst üreteç] + govde (ana kol anahtarı/ampermetre govde içinde)
    let pilBlok: Blok | null = null;
    if (yer === "ust") {
      const w = 56;
      pilBlok = {
        w, ust: 26 + (hasV ? 40 : 0), alt: 14 + (satir ? satir * P * 1.2 + 4 : 0),
        yerles(x, y) {
          prims.push({ t: "pil", x0: x, y0: y, x1: x + w, y1: y, arti: 1, nx: 0, ny: -1 });
          if (uretecYazi) prims.push({ t: "yazi", x: x + w / 2, y: y + 18 + (satir * P * 1.2) / 2, m: uretecYazi, hiza: "orta" });
          if (hasV) voltKopru(x, y, w);
        },
      };
    }
    const voltKopru = (x: number, y: number, w: number) => {
      const yy = y - 40, cx = x + w / 2;
      prims.push({ t: "nokta", x, y }, { t: "nokta", x: x + w, y });
      prims.push({ t: "tel", x0: x, y0: y, x1: x, y1: yy }, { t: "tel", x0: x, y0: yy, x1: cx - 12, y1: yy });
      prims.push({ t: "el", tur: "V", cx, cy: yy, bw: 24 }, { t: "tel", x0: cx + 12, y0: yy, x1: x + w, y1: yy }, { t: "tel", x0: x + w, y0: yy, x1: x + w, y1: y });
      const q = o.okuma && !soru ? `${say(s.Vu)} V` : "";
      if (q) prims.push({ t: "yazi", x: cx, y: yy - 12 - P * 0.6, m: q, hiza: "orta" });
    };
    const kok = pilBlok ? seriBlok([pilBlok, govde]) : govde;
    const bas = 18;
    const yBot = Math.max(yer === "sol" ? 70 : 62, kok.alt + 28 + (yer === "alt" ? 26 + (hasV ? 44 : 0) + (satir ? 0 : 0) : 0));
    const xr = bas + kok.w + bas;
    prims.push({ t: "tel", x0: 0, y0: 0, x1: bas, y1: 0 });
    kok.yerles(bas, 0);
    prims.push({ t: "tel", x0: bas + kok.w, y0: 0, x1: xr, y1: 0 });
    prims.push({ t: "tel", x0: xr, y0: 0, x1: xr, y1: yBot });
    const yc = yBot / 2;
    if (yer === "sol") {
      const h = 22;
      prims.push({ t: "tel", x0: 0, y0: 0, x1: 0, y1: yc - h }, { t: "tel", x0: 0, y0: yc + h, x1: 0, y1: yBot });
      prims.push({ t: "pil", x0: 0, y0: yc + h, x1: 0, y1: yc - h, arti: 1, nx: 1, ny: 0 });
      if (uretecYazi) prims.push({ t: "yazi", x: -20, y: yc, m: uretecYazi, hiza: "sag" });
      prims.push({ t: "tel", x0: 0, y0: yBot, x1: xr, y1: yBot });
      if (hasV) {
        const xv = -(yazW + 50);
        prims.push({ t: "nokta", x: 0, y: 0 }, { t: "nokta", x: 0, y: yBot });
        prims.push({ t: "tel", x0: 0, y0: 0, x1: xv, y1: 0 }, { t: "tel", x0: 0, y0: yBot, x1: xv, y1: yBot });
        prims.push({ t: "tel", x0: xv, y0: 0, x1: xv, y1: yc - 12 }, { t: "tel", x0: xv, y0: yc + 12, x1: xv, y1: yBot });
        prims.push({ t: "el", tur: "V", cx: xv, cy: yc, bw: 24 });
        const q = o.okuma && !soru ? `${say(s.Vu)} V` : "";
        if (q) prims.push({ t: "yazi", x: xv - 16, y: yc, m: q, hiza: "sag" });
      }
    } else if (yer === "ust") {
      prims.push({ t: "tel", x0: 0, y0: 0, x1: 0, y1: yBot }, { t: "tel", x0: 0, y0: yBot, x1: xr, y1: yBot });
    } else {
      prims.push({ t: "tel", x0: 0, y0: 0, x1: 0, y1: yBot });
      const xm = xr / 2, w = 56;
      prims.push({ t: "tel", x0: 0, y0: yBot, x1: xm - w / 2, y1: yBot }, { t: "tel", x0: xm + w / 2, y0: yBot, x1: xr, y1: yBot });
      prims.push({ t: "pil", x0: xm - w / 2, y0: yBot, x1: xm + w / 2, y1: yBot, arti: 0, nx: 0, ny: -1 });
      if (uretecYazi) prims.push({ t: "yazi", x: xm, y: yBot + 18 + (satir * P * 1.2) / 2, m: uretecYazi, hiza: "orta" });
      if (hasV) voltKopru(xm - w / 2, yBot, w);
    }
    if (o.akim) {
      const ya = yBot / 2;
      prims.push({ t: "ok", x0: xr, y0: ya - 11, x1: xr, y1: ya + 11 });
      prims.push({ t: "yazi", x: xr + 9, y: ya, m: "I", hiza: "sol" });
    }
  }

  // Kavşak harfleri: soldan sağa, yukarıdan aşağı
  if (o.dugum) {
    const dn = prims.filter((p): p is Extract<Prim, { t: "nokta" }> => p.t === "nokta" && !!p.dugum)
      .sort((a, c) => a.x - c.x || a.y - c.y);
    let k = kl ? 2 : 0;
    for (const p of dn) { const h = DUGUM_HARF[k++] ?? ""; if (h) prims.push({ t: "yazi", x: p.x, y: p.y - 11, m: h, hiza: "orta" }); }
  }
  return { prims, kutu: kutuHesapla(prims, o) };
}

function kutuHesapla(prims: Prim[], o: DevreSecenek) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const ekle = (xa: number, ya: number, xb: number, yb: number) => { x0 = Math.min(x0, xa, xb); y0 = Math.min(y0, ya, yb); x1 = Math.max(x1, xa, xb); y1 = Math.max(y1, ya, yb); };
  for (const p of prims) {
    if (p.t === "tel" || p.t === "ok" || p.t === "pil") ekle(p.x0, p.y0, p.x1, p.y1);
    else if (p.t === "nokta") ekle(p.x - 3, p.y - 3, p.x + 3, p.y + 3);
    else if (p.t === "el") ekle(p.cx - p.bw / 2, p.cy - GOVDE_YARI, p.cx + p.bw / 2, p.cy + GOVDE_YARI);
    else {
      const w = o.olc(p.m), h = p.m.split("\n").length * o.punto * 1.25;
      const xa = p.hiza === "orta" ? p.x - w / 2 : p.hiza === "sol" ? p.x : p.x - w;
      ekle(xa, p.y - h / 2, xa + w, p.y + h / 2);
    }
  }
  return { x0, y0, x1, y1 };
}

// ════════════════════════════════════════════════════════════════════════════
// 4) ÇİZİM
// ════════════════════════════════════════════════════════════════════════════
const cz = (ctx: Ctx, x0: number, y0: number, x1: number, y1: number) => { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); };

function elemanCiz(ctx: Ctx, p: Extract<Prim, { t: "el" }>, acik: boolean, punto: number) {
  const { cx, cy, bw } = p, x0 = cx - bw / 2, x1 = cx + bw / 2, lw = ctx.lineWidth;
  if (p.tur === "R") {
    ctx.beginPath(); ctx.moveTo(x0, cy); ctx.lineTo(x0 + 3, cy);
    const n = 6, a = 6.5, uz = bw - 6;
    for (let i = 0; i < n; i++) ctx.lineTo(x0 + 3 + ((i + 0.5) * uz) / n, cy + (i % 2 ? a : -a));
    ctx.lineTo(x1 - 3, cy); ctx.lineTo(x1, cy); ctx.stroke();
  } else if (p.tur === "S") {
    ctx.save(); ctx.fillStyle = ctx.strokeStyle as string;
    for (const x of [x0, x1]) { ctx.beginPath(); ctx.arc(x, cy, 2.6, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    if (acik) cz(ctx, x0, cy, x1 - 4, cy - 15); else cz(ctx, x0, cy, x1, cy);
  } else {
    const r = bw / 2;
    ctx.save(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    if (p.tur === "L") { const d = r * 0.7071; cz(ctx, cx - d, cy - d, cx + d, cy + d); cz(ctx, cx - d, cy + d, cx + d, cy - d); }
    else fizikMetniCiz(ctx, p.tur, cx, cy + 0.5, punto * 1.05);
  }
  ctx.lineWidth = lw;
}

function pilCiz(ctx: Ctx, p: Extract<Prim, { t: "pil" }>, punto: number) {
  const dx = p.x1 - p.x0, dy = p.y1 - p.y0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
  const mx = (p.x0 + p.x1) / 2, my = (p.y0 + p.y1) / 2, s = p.arti === 1 ? 1 : -1;
  const ka = 4.5; // plakalar arası yarı mesafe
  const uzx = mx + s * ux * ka, uzy = my + s * uy * ka, kix = mx - s * ux * ka, kiy = my - s * uy * ka;
  const tx = -uy, ty = ux, lw = ctx.lineWidth;
  cz(ctx, p.x0, p.y0, mx - ux * ka, my - uy * ka); cz(ctx, mx + ux * ka, my + uy * ka, p.x1, p.y1);
  cz(ctx, uzx - tx * 12, uzy - ty * 12, uzx + tx * 12, uzy + ty * 12);
  ctx.lineWidth = lw * 2; cz(ctx, kix - tx * 6.5, kiy - ty * 6.5, kix + tx * 6.5, kiy + ty * 6.5); ctx.lineWidth = lw;
  const n = 0.9 * punto + 5;
  fizikMetniCiz(ctx, "+", uzx + s * ux * 9 + p.nx * n, uzy + s * uy * 9 + p.ny * n, punto * 0.95);
  fizikMetniCiz(ctx, "−", kix - s * ux * 9 + p.nx * n, kiy - s * uy * 9 + p.ny * n, punto * 0.95);
}

export function devreCiz(ctx: Ctx, v: CografyaVerisi, k: Kutu): boolean {
  if (v.yapi !== "karmaDevre") return false;
  const punto = Math.max(11, Math.min(14, k.w / 30));
  const olc = (t: string) => fizikMetniOlcu(ctx, t, punto).w;
  const renk = ctx.strokeStyle, taban = ctx.lineWidth;
  const m = devreModeli(v);
  if (m.hata) {
    ctx.save();
    fizikMetniCiz(ctx, m.hata, k.x + k.w / 2, k.y + k.h / 2, punto * 1.05, "orta", undefined, k.w - 24);
    ctx.restore();
    return true;
  }
  const s = devreHesapla(m);
  const duzen = devreDuzenle(m, s, {
    punto, olc, etiket: ayarSec(v, "etiket") as DevreSecenek["etiket"], soru: ayarMantik(v, "soru"), okuma: ayarMantik(v, "okuma"),
    uretecYeri: ayarSec(v, "uretecYeri") as DevreSecenek["uretecYeri"], uretecYaz: ayarMantik(v, "uretecYaz"),
    akim: ayarMantik(v, "akim") && !m.kl, dugum: ayarMantik(v, "dugum"),
  });
  const { x0, y0, x1, y1 } = duzen.kutu, bw = x1 - x0, bh = y1 - y0, pay = 10;
  const sc = Math.max(0.4, Math.min(1.3, (k.w - 2 * pay) / bw, (k.h - 2 * pay) / bh));
  const ox = k.x + k.w / 2 - ((x0 + x1) / 2) * sc, oy = k.y + k.h / 2 - ((y0 + y1) / 2) * sc;
  ctx.save();
  ctx.translate(ox, oy); ctx.scale(sc, sc);
  ctx.lineWidth = Math.max(1.4, taban) / sc; ctx.lineCap = "butt"; ctx.lineJoin = "miter";
  ctx.strokeStyle = renk; ctx.fillStyle = renk as string;
  for (const p of duzen.prims) {
    ctx.strokeStyle = renk; ctx.fillStyle = renk as string;
    if (p.t === "tel") cz(ctx, p.x0, p.y0, p.x1, p.y1);
    else if (p.t === "nokta") { ctx.beginPath(); ctx.arc(p.x, p.y, 3.1, 0, Math.PI * 2); ctx.fill(); }
    else if (p.t === "el") elemanCiz(ctx, p, !!p.acik, punto);
    else if (p.t === "pil") pilCiz(ctx, p, punto);
    else if (p.t === "ok") {
      const dx = p.x1 - p.x0, dy = p.y1 - p.y0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, b = 8;
      cz(ctx, p.x0, p.y0, p.x1 - ux * b * 0.6, p.y1 - uy * b * 0.6);
      ctx.beginPath(); ctx.moveTo(p.x1, p.y1);
      ctx.lineTo(p.x1 - ux * b - uy * b * 0.42, p.y1 - uy * b + ux * b * 0.42);
      ctx.lineTo(p.x1 - ux * b + uy * b * 0.42, p.y1 - uy * b - ux * b * 0.42);
      ctx.closePath(); ctx.fill();
    } else fizikMetniCiz(ctx, p.m, p.x, p.y, punto, p.hiza);
  }
  ctx.restore();
  ctx.strokeStyle = renk; ctx.fillStyle = renk as string; ctx.lineWidth = taban;
  return true;
}
