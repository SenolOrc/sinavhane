// Matematik ifadesi çözücü: "2x+1", "x^2-4", "sin(x)/x", "sqrt(x+3)", "y>=x^2".
//
// `eval`/`Function` YOK: yazım kendi küçük çözücümüzle işlenir (öğretmenin
// yazdığı metin hiçbir zaman kod olarak çalışmaz). Örtük çarpma desteklenir
// ("2x", "3(x+1)", "x(x-1)", "2sin x"); `^` sağdan birleşir ve tekli eksiden
// güçlüdür (−x^2 = −(x^2)). Trigonometri RADYAN çalışır; π için `pi` ya da "π".

export type Degiskenler = { x?: number; y?: number };
export type Derlenmis = { ok: true; f: (v: Degiskenler) => number } | { ok: false; hata: string };

const FONKSIYONLAR: Record<string, (a: number) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  cot: (a) => 1 / Math.tan(a), sec: (a) => 1 / Math.cos(a), csc: (a) => 1 / Math.sin(a),
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  sqrt: Math.sqrt, abs: Math.abs, exp: Math.exp, ln: Math.log, log: Math.log10, lg: Math.log10,
  floor: Math.floor, ceil: Math.ceil, round: Math.round, sign: Math.sign,
  cbrt: Math.cbrt,
};
const SABITLER: Record<string, number> = { pi: Math.PI, e: Math.E };
const ADLAR = [...Object.keys(FONKSIYONLAR), ...Object.keys(SABITLER)].sort((a, b) => b.length - a.length);

/** Çözücü özyinelemeli: iç içe parantez / ardışık eksi / belirteç sayısı sınırlı (yığın taşmasın). */
export const EN_COK_DERINLIK = 200;
const EN_COK_BELIRTEC = 2000;

type Belirtec =
  | { t: "sayi"; v: number }
  | { t: "ad"; v: string }
  | { t: "isaret"; v: string };

/** Yazımı çözücünün anladığı düz metne çevirir (virgül, Unicode işaretleri). */
export function ifadeTemizle(metin: string): string {
  return metin
    .replace(/−|–|—/g, "-")
    .replace(/[×·]/g, "*")
    .replace(/÷/g, "/")
    .replace(/π/g, "pi")
    .replace(/√/g, "sqrt")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/,/g, ".")
    .trim();
}

function belirtecle(metin: string): Belirtec[] | string {
  const sonuc: Belirtec[] = [];
  let i = 0;
  while (i < metin.length) {
    const c = metin[i];
    if (/\s/.test(c)) { i += 1; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < metin.length && /[0-9.]/.test(metin[j])) j += 1;
      // Bilimsel gösterim: 1e308, 2.5e-3, 1E5. Yalnız e'den hemen sonra rakam (ya da işaretli rakam)
      // geliyorsa; "2e", "2*e", "2ex" Euler sabiti olarak kalır.
      const bil = /^[eE][+-]?\d+/.exec(metin.slice(j));
      if (bil) j += bil[0].length;
      const v = Number(metin.slice(i, j));
      if (!Number.isFinite(v)) return `Sayı okunamadı: ${metin.slice(i, j)}`;
      sonuc.push({ t: "sayi", v });
      i = j;
      continue;
    }
    if (/[a-zA-Z]/.test(c)) {
      let j = i;
      while (j < metin.length && /[a-zA-Z]/.test(metin[j])) j += 1;
      let parca = metin.slice(i, j).toLowerCase();
      // "xsin", "2xy", "ex" gibi bitişik yazımı bilinen adlara/tek harfli değişkene böl.
      while (parca) {
        const ad = ADLAR.find((a) => parca.startsWith(a));
        if (ad) { sonuc.push({ t: "ad", v: ad }); parca = parca.slice(ad.length); continue; }
        if (parca[0] === "x" || parca[0] === "y") { sonuc.push({ t: "ad", v: parca[0] }); parca = parca.slice(1); continue; }
        return `Tanınmayan ad: ${parca}`;
      }
      i = j;
      continue;
    }
    if ("+-*/^()|".includes(c)) { sonuc.push({ t: "isaret", v: c }); i += 1; continue; }
    return `Tanınmayan karakter: ${c}`;
  }
  if (sonuc.length > EN_COK_BELIRTEC) return "İfade çok uzun";
  return sonuc;
}

type Dugum = (v: Degiskenler) => number;

/** Çözücü: örtük çarpma + sağdan birleşen kuvvet. */
function cozumle(bel: Belirtec[]): Dugum | string {
  let p = 0;
  let hata: string | null = null;
  const bak = () => bel[p];
  const hataVer = (m: string): Dugum => { hata ??= m; return () => NaN; };
  let derinlik = 0;
  const cokIcIce = () => derinlik > 2 * EN_COK_DERINLIK; // her iç içe düzey tekli+atom = 2 çağrı
  let cubuk = 0; // açık mutlak değer çubuğu sayısı: kapanış "|" örtük çarpma başlatmaz
  const operandBasi = (b: Belirtec | undefined) =>
    !!b && (b.t === "sayi" || b.t === "ad" || (b.t === "isaret" && (b.v === "(" || (b.v === "|" && cubuk === 0))));

  function ifade(): Dugum {
    let sol = terim();
    for (;;) {
      const b = bak();
      if (b?.t === "isaret" && (b.v === "+" || b.v === "-")) {
        p += 1;
        const a = sol, c = terim();
        sol = b.v === "+" ? (v) => a(v) + c(v) : (v) => a(v) - c(v);
      } else return sol;
    }
  }
  function terim(): Dugum {
    let sol = tekli();
    for (;;) {
      const b = bak();
      if (b?.t === "isaret" && (b.v === "*" || b.v === "/")) {
        p += 1;
        const a = sol, c = tekli();
        sol = b.v === "*" ? (v) => a(v) * c(v) : (v) => a(v) / c(v);
      } else if (operandBasi(b)) {
        // Örtük çarpma: "2x", "x(x+1)", "3sin x"
        const a = sol, c = tekli();
        sol = (v) => a(v) * c(v);
      } else return sol;
    }
  }
  function tekli(): Dugum {
    derinlik += 1;
    try {
      if (cokIcIce()) { p = bel.length; return hataVer("İfade çok iç içe"); }
      const b = bak();
      if (b?.t === "isaret" && (b.v === "-" || b.v === "+")) {
        p += 1;
        const a = tekli();
        return b.v === "-" ? (v) => -a(v) : a;
      }
      return kuvvet();
    } finally { derinlik -= 1; }
  }
  function kuvvet(): Dugum {
    const taban = atom();
    const b = bak();
    if (b?.t === "isaret" && b.v === "^") {
      p += 1;
      const us = tekli(); // sağdan birleşir, 2^-x geçerli
      return (v) => taban(v) ** us(v);
    }
    return taban;
  }
  function atom(): Dugum {
    derinlik += 1;
    try { return atomIc(); } finally { derinlik -= 1; }
  }
  function atomIc(): Dugum {
    if (cokIcIce()) { p = bel.length; return hataVer("İfade çok iç içe"); }
    const b = bak();
    if (!b) return hataVer("İfade yarım kaldı");
    if (b.t === "sayi") { p += 1; const s = b.v; return () => s; }
    if (b.t === "isaret" && b.v === "(") {
      p += 1;
      const ic = ifade();
      if (bak()?.t === "isaret" && (bak() as { v: string }).v === ")") p += 1;
      else return hataVer("Parantez kapanmadı");
      return ic;
    }
    if (b.t === "isaret" && b.v === "|") {
      p += 1;
      cubuk += 1;
      const ic = ifade();
      cubuk -= 1;
      if (bak()?.t === "isaret" && (bak() as { v: string }).v === "|") p += 1;
      else return hataVer("Mutlak değer çubuğu kapanmadı");
      return (v) => Math.abs(ic(v));
    }
    if (b.t === "ad") {
      p += 1;
      if (b.v === "x") return (v) => v.x ?? NaN;
      if (b.v === "y") return (v) => v.y ?? NaN;
      if (b.v in SABITLER) { const s = SABITLER[b.v]; return () => s; }
      const fn = FONKSIYONLAR[b.v];
      // "sin(x)^2" = (sin x)^2: parantezli argümanda kuvvet fonksiyonun sonucuna uygulanır;
      // parantezsiz "sin x^2" = sin(x^2).
      const parantezli = bak()?.t === "isaret" && (bak() as { v: string }).v === "(";
      const arg = parantezli ? atom() : kuvvet();
      return (v) => fn(arg(v));
    }
    p += 1;
    return hataVer(`Beklenmeyen "${b.v}"`);
  }

  const kok = ifade();
  if (hata) return hata;
  if (p < bel.length) return `Beklenmeyen "${(bel[p] as { v: string | number }).v}"`;
  return kok;
}

/** "x^2-4" gibi bir ifadeyi derler (x ve y değişkenleri). */
export function derle(metin: string): Derlenmis {
  const temiz = ifadeTemizle(metin);
  if (!temiz) return { ok: false, hata: "Boş ifade" };
  const bel = belirtecle(temiz);
  if (typeof bel === "string") return { ok: false, hata: bel };
  const f = cozumle(bel);
  if (typeof f === "string") return { ok: false, hata: f };
  return { ok: true, f };
}

export type FonksiyonYazimi =
  | { tur: "y"; f: (x: number) => number }
  | { tur: "dikey"; x: number }
  | { hata: string };

/** "y = x^2 - 4", "f(x)=2x+1", "x^2-4" ya da dikey doğru "x = 3". */
export function fonksiyonOku(metin: string): FonksiyonYazimi {
  let t = ifadeTemizle(metin);
  const dikey = /^x\s*=\s*(.+)$/i.exec(t);
  if (dikey) {
    const d = derle(dikey[1]);
    if (!d.ok) return { hata: d.hata };
    const x = d.f({});
    return Number.isFinite(x) ? { tur: "dikey", x } : { hata: "x = sayı olmalı" };
  }
  t = t.replace(/^(y|f\s*\(\s*x\s*\)|g\s*\(\s*x\s*\)|h\s*\(\s*x\s*\))\s*=\s*/i, "");
  const d = derle(t);
  if (!d.ok) return { hata: d.hata };
  return { tur: "y", f: (x) => d.f({ x }) };
}

export type EsitsizlikYazimi =
  | { f: (x: number, y: number) => number; sinir: "dolu" | "kesik"; yon: 1 | -1 }
  | { hata: string };

/** "y > 2x+1", "x+y<=4", "y>=x^2": f = sol − sağ; yon +1 → f>0 bölgesi. */
export function esitsizlikOku(metin: string): EsitsizlikYazimi {
  const t = ifadeTemizle(metin).replace(/≤/g, "<=").replace(/≥/g, ">=").replace(/=</g, "<=").replace(/=>/g, ">=");
  const m = /^(.*?)(<=|>=|<|>)(.*)$/.exec(t);
  if (!m) return { hata: "Eşitsizlik işareti yok (<, >, <=, >=)" };
  const sol = derle(m[1]);
  const sag = derle(m[3]);
  if (!sol.ok) return { hata: sol.hata };
  if (!sag.ok) return { hata: sag.hata };
  const buyuk = m[2].startsWith(">");
  return {
    f: (x, y) => sol.f({ x, y }) - sag.f({ x, y }),
    sinir: m[2].length === 2 ? "dolu" : "kesik",
    yon: buyuk ? 1 : -1,
  };
}

export type DenklemYazimi = { f: (x: number, y: number) => number } | { hata: string };

/** "x^2+y^2=25" → f = sol − sag; f(x,y)=0 eğrisi çizilir. */
export function denklemOku(metin: string): DenklemYazimi {
  const t = ifadeTemizle(metin);
  if (/[<>≤≥]/.test(t)) return { hata: "Eşitsizlik değil, denklem yazın" };
  const parcalar = t.split("=");
  if (parcalar.length !== 2) return { hata: "Denklemde tek “=” olmalı: x^2 + y^2 = 25" };
  const sol = derle(parcalar[0]);
  const sag = derle(parcalar[1]);
  if (!sol.ok) return { hata: sol.hata };
  if (!sag.ok) return { hata: sag.hata };
  return { f: (x, y) => sol.f({ x, y }) - sag.f({ x, y }) };
}

/** Yazı y=f(x) ya da x=sayı biçiminde değil, kapalı denklemse (çember gibi) true. */
export function denklemMi(metin: string): boolean {
  const t = ifadeTemizle(metin);
  if (/[<>≤≥]/.test(t)) return false;
  const i = t.indexOf("=");
  if (i < 0) return false;
  const sol = t.slice(0, i).replace(/\s+/g, "");
  const sag = t.slice(i + 1);
  if (/^(y|[fgh]\(x\))$/i.test(sol)) return false;
  if (/^x$/i.test(sol) && !/y/i.test(sag)) return false;
  return true;
}
