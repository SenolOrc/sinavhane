// "Yazarak denklem": düz yazıyı denklem parçalarına (kesir, üs, kök…) çevirir.
//
// NEDEN VAR: denklem editörü bir FORM — her yapı ayrı bir kart, her alan ayrı
// bir kutu. `v_0 t + 1/2 a t^2` yazmak için dört kart açmak gerekiyordu. README'deki
// "kalan asıl iş" tam olarak bu. Tam bir matematik imleci yazmak yerine (karar
// öğretmenin; bkz. README) mevcut blok modelini KORUYAN, onu yazıdan üreten bir
// ayrıştırıcı: sonuç yine `DenklemParcasi[]`, yani her parça sonradan kartından
// düzenlenebilir ve kayıtlı belge biçimi değişmez.
//
// YAZIM KURALLARI (öğretmene gösterilen ipuçlarıyla aynı):
//   x^2  x^{2n}  x^-1    üs            v_0  v_{0x}  x_1^2   alt simge
//   a/b                  BİTİŞİK bölme: yalnız yanındaki öğeler. "1/2 m v^2" → ½ · m · v²
//   a / b                BOŞLUKLU bölme: önündeki VE sonraki TÜM terim.
//                        "m v^2 / 2" → (m v²) üzerinde 2;  "\Delta x / \Delta t" → Δx üzerinde Δt
//   sqrt(x)  kok(x)      kök          sin(x) cos x ln(x)  fonksiyon
//   (a+b)  [a+b]  abs(x) gruplar      vec(F) bar(x) hat(n) dot(x)  vektör işaretleri
//   \theta  theta  Delta Yunan harfi  * → ·   <= >= != ~ +-   operatörler
//   sum_{i=1}^{n} a_i   lim_{x->0} sin 3x / (2x)   int_0^1 x^2 dx   toplam, limit, integral
//                        (\sum \lim \int \prod iint iiint de olur; ifade: sonraki terimler,
//                        "+", "-", "=" işaretinde biter)
//   cup cap emptyset in subset infty neq leq geq   küme/ilişki sembolleri (\cup … da olur)
//   \vec{F}  \frac{a}{b}  \sqrt{x}               süslü parantezli LaTeX biçimi
//
// Ayrıştırıcı HİÇ HATA FIRLATMAZ: anlaşılmayan her şey düz metin olarak kalır ve
// bir uyarı listesiyle bildirilir — yazdığını yutmak, yanlış çevirmekten kötüdür.

import type { DenklemParcasi } from "./tipler";
import { YUNANCA, YUNAN_KELIMELERI } from "../yunanHarfleri";

export type YazimSonucu = { parcalar: DenklemParcasi[]; uyarilar: string[] };

/** Düğmelerde gösterilen hazır örnekler (öğretmen tıklayıp dener). */
export const YAZIM_ORNEKLERI: { yazi: string; ad: string }[] = [
  { yazi: "x = v_0 t + 1/2 a t^2", ad: "Yer değiştirme" },
  { yazi: "F = G m_1 m_2 / r^2", ad: "Kütle çekimi" },
  { yazi: "v = sqrt(v_x^2 + v_y^2)", ad: "Bileşke hız" },
  { yazi: "E_k = 1/2 m v^2", ad: "Kinetik enerji" },
  { yazi: "\\Delta x / \\Delta t", ad: "Ortalama hız" },
  { yazi: "n_1 sin \\theta_1 = n_2 sin \\theta_2", ad: "Snell" },
];

const FONKSIYONLAR = new Set(["sin", "cos", "tan", "cot", "sec", "csc", "log", "ln", "arcsin", "arccos", "arctan"]);
/** Ters bölüyle YA DA yalnız başına (tam kelime) yazılabilen semboller. */
const SEMBOL_KELIMELERI: Record<string, string> = {
  cup: "∪", cap: "∩", emptyset: "∅", varnothing: "∅", in: "∈", notin: "∉",
  subset: "⊂", subseteq: "⊆", supset: "⊃", supseteq: "⊇", setminus: "∖",
  infty: "∞", forall: "∀", exists: "∃", partial: "∂", nabla: "∇",
  Rightarrow: "⇒", leftrightarrow: "↔", to: "→",
  rightleftharpoons: "⇌", leftrightharpoons: "⇌", otimes: "⊗", odot: "⊙",
};
/** Bu kelimeler yalın yazıldığında da sembol olur ("to", "forall" gibi uzaklar hariç). */
const YALIN_SEMBOL_KELIMELERI = new Set(["cup", "cap", "emptyset", "in", "subset", "infty"]);
/** Operatör (+, = gibi aralıklı) olan ilişkiler. */
const OPERATOR_KELIMELERI: Record<string, string> = { neq: "≠", leq: "≤", geq: "≥", approx: "≈", times: "×", cdot: "·", pm: "±", div: "÷" };
const YALIN_OPERATOR_KELIMELERI = new Set(["neq", "leq", "geq"]);
/** sum_ lim_ int_ gibi büyük işleçler. */
const BUYUK_ADLARI: Record<string, { tur: "toplam" | "carpim" | "limit" | "integral"; kat: 1 | 2 | 3 }> = {
  sum: { tur: "toplam", kat: 1 },
  prod: { tur: "carpim", kat: 1 },
  lim: { tur: "limit", kat: 1 },
  int: { tur: "integral", kat: 1 },
  iint: { tur: "integral", kat: 2 },
  iiint: { tur: "integral", kat: 3 },
};

const VEKTOR_ADLARI: Record<string, "ok" | "ustcizgi" | "sapka" | "nokta"> = {
  vec: "ok",
  bar: "ustcizgi",
  hat: "sapka",
  dot: "nokta",
};
/** Kesirde yalnız toplama/ilişki işaretleri terim sınırıdır; çarpma değil. */
const TERIM_SINIRI = new Set(["+", "−", "±", "=", "<", ">", "≤", "≥", "≠", "≈", "∝"]);

// ── Belirteç (token) ───────────────────────────────────────────────────────

type Belirtec =
  | { k: "sayi" | "kelime" | "sembol" | "op" | "diger"; s: string; b: boolean; ters?: boolean }
  | { k: "bol" | "us" | "alt"; b: boolean }
  | { k: "ac" | "kapa"; s: string; b: boolean };

const KAPANIS: Record<string, string> = { "(": ")", "[": "]", "{": "}" };

function belirteclereAyir(girdi: string): Belirtec[] {
  const t: Belirtec[] = [];
  let i = 0;
  let b = false;
  const ekle = (x: Belirtec) => {
    t.push(x);
    b = false;
  };
  while (i < girdi.length) {
    const c = girdi[i];
    if (/\s/.test(c)) {
      b = true;
      i += 1;
      continue;
    }
    if (c === "\\") {
      const m = /^\\([A-Za-z]+)/.exec(girdi.slice(i));
      if (m) {
        const ad = m[1];
        i += m[0].length;
        if (ad === "sqrt" || ad === "vec" || ad === "frac" || VEKTOR_ADLARI[ad] || BUYUK_ADLARI[ad]) ekle({ k: "kelime", s: ad, b, ters: true });
        else if (OPERATOR_KELIMELERI[ad]) ekle({ k: "op", s: OPERATOR_KELIMELERI[ad], b });
        else if (SEMBOL_KELIMELERI[ad]) ekle({ k: "sembol", s: SEMBOL_KELIMELERI[ad], b });
        else if (YUNANCA[ad]) ekle({ k: "sembol", s: YUNANCA[ad], b });
        else ekle({ k: "diger", s: m[0], b });
        continue;
      }
      // Tek başına ters bölü ya da kaçışlı karakter: karakteri düz al.
      const sonraki = girdi[i + 1];
      if (sonraki) {
        ekle({ k: "diger", s: sonraki, b });
        i += 2;
      } else {
        i += 1;
      }
      continue;
    }
    const sayi = /^[0-9]+(?:[.,][0-9]+)?/.exec(girdi.slice(i));
    if (sayi) {
      ekle({ k: "sayi", s: sayi[0], b });
      i += sayi[0].length;
      continue;
    }
    const kelime = /^[A-Za-zÀ-ɏ]+/.exec(girdi.slice(i));
    if (kelime) {
      if (YALIN_OPERATOR_KELIMELERI.has(kelime[0])) ekle({ k: "op", s: OPERATOR_KELIMELERI[kelime[0]], b });
      else if (YALIN_SEMBOL_KELIMELERI.has(kelime[0])) ekle({ k: "sembol", s: SEMBOL_KELIMELERI[kelime[0]], b });
      else ekle({ k: "kelime", s: kelime[0], b });
      i += kelime[0].length;
      continue;
    }
    if (/[Ͱ-Ͽ]/.test(c)) {
      ekle({ k: "sembol", s: c, b });
      i += 1;
      continue;
    }
    const iki = girdi.slice(i, i + 2);
    if (iki === "<=") { ekle({ k: "op", s: "≤", b }); i += 2; continue; }
    if (iki === ">=") { ekle({ k: "op", s: "≥", b }); i += 2; continue; }
    if (iki === "!=") { ekle({ k: "op", s: "≠", b }); i += 2; continue; }
    if (iki === "+-") { ekle({ k: "op", s: "±", b }); i += 2; continue; }
    if (iki === "->") { ekle({ k: "sembol", s: "→", b }); i += 2; continue; }
    if (c === "+" || c === "=" || c === "<" || c === ">") { ekle({ k: "op", s: c, b }); i += 1; continue; }
    if (c === "-" || c === "−") { ekle({ k: "op", s: "−", b }); i += 1; continue; }
    if (c === "*" || c === "·") { ekle({ k: "op", s: "·", b }); i += 1; continue; }
    if (c === "×" || c === "±" || c === "≤" || c === "≥" || c === "≠" || c === "≈" || c === "∝") { ekle({ k: "op", s: c, b }); i += 1; continue; }
    if (c === "÷") { ekle({ k: "op", s: "÷", b }); i += 1; continue; }
    if (c === "~") { ekle({ k: "op", s: "≈", b }); i += 1; continue; }
    if (c === "/") { ekle({ k: "bol", b }); i += 1; continue; }
    if (c === "^") { ekle({ k: "us", b }); i += 1; continue; }
    if (c === "_") { ekle({ k: "alt", b }); i += 1; continue; }
    if (c === "(" || c === "[" || c === "{") { ekle({ k: "ac", s: c, b }); i += 1; continue; }
    if (c === ")" || c === "]" || c === "}") { ekle({ k: "kapa", s: c, b }); i += 1; continue; }
    ekle({ k: "diger", s: c, b });
    i += 1;
  }
  return t;
}

// ── Ara ağaç ───────────────────────────────────────────────────────────────

type Dugum =
  | { t: "m"; s: string; b: boolean }
  | { t: "op"; s: string; b: boolean }
  | { t: "us"; taban: Dugum; ust: Dugum[] | null; alt: Dugum[] | null; b: boolean }
  | { t: "kesir"; pay: Dugum[]; payda: Dugum[]; b: boolean }
  | { t: "grup"; stil: "parantez" | "koseli" | "mutlak"; ic: Dugum[]; b: boolean }
  | { t: "gorunmez"; ic: Dugum[]; b: boolean }
  | { t: "kok"; ic: Dugum[]; b: boolean }
  | { t: "fonk"; ad: string; arg: Dugum[]; b: boolean }
  | { t: "vek"; stil: "ok" | "ustcizgi" | "sapka" | "nokta"; ic: Dugum[]; b: boolean }
  | {
      t: "buyuk";
      tur: "toplam" | "carpim" | "limit" | "integral";
      kat: 1 | 2 | 3;
      alt: Dugum[];
      ust: Dugum[];
      ic: Dugum[];
      b: boolean;
    };

class Ayristirici {
  private p = 0;
  readonly uyarilar: string[] = [];
  constructor(private readonly T: Belirtec[]) {}

  tumu(): Dugum[] {
    const sonuc: Dugum[] = [];
    while (this.p < this.T.length) {
      const onceki = this.p;
      sonuc.push(...this.dizi(null));
      // Dizi, eşleşmeyen bir kapanışta durmuş olabilir: düz metin olarak al.
      if (this.p === onceki && this.p < this.T.length) {
        const t = this.T[this.p];
        this.p += 1;
        sonuc.push({ t: "m", s: "s" in t ? t.s : "", b: t.b });
      }
    }
    return sonuc;
  }

  private dizi(kapanis: string | null): Dugum[] {
    const cikti: Dugum[] = [];
    while (this.p < this.T.length) {
      const t = this.T[this.p];
      if (t.k === "kapa") {
        if (kapanis === null) {
          // Açılmamış kapanış: düz metin.
          this.p += 1;
          cikti.push({ t: "m", s: t.s, b: t.b });
          this.uyarilar.push(`Fazladan "${t.s}" işareti düz metin olarak bırakıldı.`);
          continue;
        }
        if (t.s === kapanis) {
          this.p += 1;
          return cikti;
        }
        // Başka türde kapanış: bu düzeyi sonlandır, üst düzey karar versin.
        this.uyarilar.push(`"${kapanis}" kapatılmadı.`);
        return cikti;
      }
      if (t.k === "bol") {
        this.p += 1;
        this.bol(cikti, t.b);
        continue;
      }
      cikti.push(...this.terim());
    }
    if (kapanis !== null) this.uyarilar.push(`"${kapanis}" kapatılmadı.`);
    return cikti;
  }

  /** Bir bölme çubuğu: önündeki öğeleri pay, sonrasındaki bitişik öğeleri payda yapar. */
  private bol(cikti: Dugum[], bosluklu: boolean) {
    const sonraki = this.T[this.p];
    const aralikli = bosluklu && !!sonraki && sonraki.b;
    // Payda. BİTİŞİK bölmede bitişik öğe dizisi (boşluk dizisini bitirir; ilk
    // öğe boşlukla gelebilir: "a/ b" yazanı cezalandırmanın anlamı yok).
    // BOŞLUKLU bölmede pay gibi payda da bir TERİMDİR: "\Delta x / \Delta t"
    // paydası "Δ t"dir; terim toplama/ilişki işaretinde ya da yeni "/" de biter.
    const payda: Dugum[] = [];
    let ilk = true;
    while (this.p < this.T.length) {
      const t = this.T[this.p];
      if (t.k === "bol" || t.k === "kapa") break;
      if (t.k === "op" && (!aralikli || TERIM_SINIRI.has(t.s))) break;
      if (!ilk && t.b && !aralikli) break;
      payda.push(...this.terim());
      ilk = false;
    }
    // Pay.
    let j = cikti.length - 1;
    if (j >= 0 && cikti[j].t === "op") {
      j = cikti.length; // "a+/b": önünde pay yok
    } else if (aralikli) {
      while (j >= 0 && !(cikti[j].t === "op" && TERIM_SINIRI.has((cikti[j] as { s: string }).s))) j -= 1;
      j += 1;
    } else {
      while (j > 0 && !cikti[j].b && cikti[j - 1].t !== "op") j -= 1;
      if (j >= 0 && cikti[j]?.t === "op") j += 1;
    }
    const pay = j >= 0 && j < cikti.length ? cikti.splice(j) : [];
    if (pay.length === 0) {
      this.uyarilar.push("Bölmenin önünde pay yok; \"/\" düz metin olarak bırakıldı.");
      cikti.push({ t: "m", s: "/", b: bosluklu });
      cikti.push(...payda);
      return;
    }
    if (payda.length === 0) this.uyarilar.push("Kesrin paydası boş.");
    cikti.push({ t: "kesir", pay, payda, b: pay[0].b });
  }

  /** Bir öğe ve ona bitişik alt/üst simgeler. Birden çok düğüm dönebilir ("mv^2" → m, v²). */
  private terim(): Dugum[] {
    const t = this.T[this.p];
    this.p += 1;
    let on: Dugum[] = [];
    let atom: Dugum;
    switch (t.k) {
      case "sayi":
      case "diger":
      case "sembol":
        atom = { t: "m", s: t.s, b: t.b };
        break;
      case "op":
        return [{ t: "op", s: t.s, b: t.b }];
      case "kapa":
        // `dizi` bunu kendisi işler; buraya düşerse düz metin.
        return [{ t: "m", s: t.s, b: t.b }];
      case "bol":
        return [{ t: "m", s: "/", b: t.b }];
      case "us":
      case "alt":
        // Tabansız simge: karakter olarak bırak.
        this.uyarilar.push(`"${t.k === "us" ? "^" : "_"}" işaretinin önünde öğe yok.`);
        return [{ t: "m", s: t.k === "us" ? "^" : "_", b: t.b }];
      case "ac": {
        const ic = this.dizi(KAPANIS[t.s]);
        if (t.s === "{") atom = { t: "gorunmez", ic, b: t.b };
        else atom = { t: "grup", stil: t.s === "[" ? "koseli" : "parantez", ic, b: t.b };
        break;
      }
      case "kelime": {
        const buyuk = this.buyukIslec(t.s, t.b, !!t.ters);
        if (buyuk) return [buyuk];
        const ozel = this.ozelKelime(t.s, t.b, !!t.ters);
        if (ozel) return this.simgeler(ozel, []);
        if (YUNAN_KELIMELERI[t.s]) {
          atom = { t: "m", s: YUNAN_KELIMELERI[t.s], b: t.b };
          break;
        }
        const simge = this.T[this.p];
        if (t.s.length > 1 && simge && (simge.k === "us" || simge.k === "alt") && !simge.b) {
          // "mv^2": simge yalnız SON harfe ait.
          on = [{ t: "m", s: t.s.slice(0, -1), b: t.b }];
          atom = { t: "m", s: t.s.slice(-1), b: false };
        } else {
          atom = { t: "m", s: t.s, b: t.b };
        }
        break;
      }
    }
    return this.simgeler(atom, on);
  }

  /**
   * sum_{i=1}^{n} a_i · lim_{x->a} f(x) · int_0^1 x^2 dx. Alt/üst sınır `_`/`^`
   * ile (her sırada); ifade: sonraki terimler — "+", "−", "=", kapanış ya da
   * yazı sonunda biter. Yalın `sum`/`int`/`lim` kelimesi YALNIZ sınır simgesi
   * bitişikse işleç sayılır (`int` bir değişken adı olabilir); `\sum` her zaman.
   */
  private buyukIslec(kelime: string, b: boolean, ters: boolean): Dugum | null {
    const tanim = BUYUK_ADLARI[kelime];
    if (!tanim) return null;
    const ilk = this.T[this.p];
    if (!ters && !(ilk && (ilk.k === "us" || ilk.k === "alt") && !ilk.b)) return null;
    let alt: Dugum[] = [];
    let ust: Dugum[] = [];
    while (this.p < this.T.length) {
      const t = this.T[this.p];
      if ((t.k !== "us" && t.k !== "alt") || t.b) break;
      this.p += 1;
      const deger = this.simgeOperandi();
      if (t.k === "alt") alt = deger;
      else ust = deger;
    }
    const ic: Dugum[] = [];
    while (this.p < this.T.length) {
      const t = this.T[this.p];
      if (t.k === "kapa") break;
      if (t.k === "op" && TERIM_SINIRI.has(t.s)) break;
      if (t.k === "bol") {
        this.p += 1;
        this.bol(ic, t.b);
        continue;
      }
      ic.push(...this.terim());
    }
    if (ic.length === 0) this.uyarilar.push(`"${kelime}" işlecinin ifadesi boş.`);
    return { t: "buyuk", tur: tanim.tur, kat: tanim.kat, alt, ust, ic, b };
  }

  /** sqrt(), sin(), vec() gibi özel biçimli kelimeler; değilse null. */
  private ozelKelime(kelime: string, b: boolean, ters = false): Dugum | null {
    const acik = this.T[this.p];
    // "{" yalnız ters bölülü (\vec{F}, \sqrt{x}) biçimde de parantez sayılır.
    const parantezli =
      !!acik && acik.k === "ac" && !acik.b && (acik.s === "(" || (ters && acik.s === "{"));
    const kapat = parantezli ? KAPANIS[(acik as { s: string }).s] : ")";
    if (kelime === "frac" && ters) {
      const a = this.T[this.p];
      if (!a || a.k !== "ac" || a.s !== "{") return null;
      const pay = this.simgeOperandi();
      const payda = this.simgeOperandi();
      return { t: "kesir", pay, payda, b };
    }
    if (kelime === "sqrt" || kelime === "kok") {
      if (!parantezli) return null;
      this.p += 1;
      return { t: "kok", ic: this.dizi(kapat), b };
    }
    if (kelime === "abs") {
      if (!parantezli) return null;
      this.p += 1;
      return { t: "grup", stil: "mutlak", ic: this.dizi(kapat), b };
    }
    if (VEKTOR_ADLARI[kelime]) {
      if (!parantezli) return null;
      this.p += 1;
      return { t: "vek", stil: VEKTOR_ADLARI[kelime], ic: this.dizi(kapat), b };
    }
    if (FONKSIYONLAR.has(kelime)) {
      if (parantezli) {
        this.p += 1;
        return { t: "fonk", ad: kelime, arg: this.dizi(")"), b };
      }
      // "sin θ", "cos 30": bir sonraki TEK öğe argüman.
      const sonraki = this.T[this.p];
      if (sonraki && (sonraki.k === "sayi" || sonraki.k === "kelime" || sonraki.k === "sembol")) {
        const arg = this.terim();
        // "sin 3x": sayıya bitişik değişken de argümandır (sin(3x)).
        const yanindaki = this.T[this.p];
        if (sonraki.k === "sayi" && yanindaki && yanindaki.k === "kelime" && !yanindaki.b && !FONKSIYONLAR.has(yanindaki.s)) {
          arg.push(...this.terim());
        }
        return { t: "fonk", ad: kelime, arg, b };
      }
      return null;
    }
    return null;
  }

  /** Atomun arkasındaki bitişik ^ ve _ işaretlerini toplar. */
  private simgeler(atom: Dugum, on: Dugum[]): Dugum[] {
    let sonuc = atom;
    while (this.p < this.T.length) {
      const t = this.T[this.p];
      if ((t.k !== "us" && t.k !== "alt") || t.b) break;
      this.p += 1;
      const ifade = this.simgeOperandi();
      const hedef = t.k === "us" ? "ust" : "alt";
      if (sonuc.t === "us" && sonuc[hedef] === null) {
        // "x_1^2" / "x^2_1": aynı tabana ikinci simge, yeni kat açmaz.
        sonuc = { ...sonuc, [hedef]: ifade };
      } else {
        sonuc = {
          t: "us",
          taban: sonuc,
          ust: hedef === "ust" ? ifade : null,
          alt: hedef === "alt" ? ifade : null,
          b: sonuc.b,
        };
      }
    }
    return [...on, sonuc];
  }

  /** ^ ya da _'den sonra gelen: {grup}, (grup), işaretli sayı, tek harf ya da sayı. */
  private simgeOperandi(): Dugum[] {
    const t = this.T[this.p];
    if (!t) {
      this.uyarilar.push("Simgenin değeri eksik.");
      return [];
    }
    if (t.k === "ac" && (t.s === "{" || t.s === "(")) {
      this.p += 1;
      return this.dizi(KAPANIS[t.s]);
    }
    if (t.k === "op" && (t.s === "−" || t.s === "+")) {
      const sonraki = this.T[this.p + 1];
      if (sonraki && sonraki.k === "sayi" && !sonraki.b) {
        this.p += 2;
        return [{ t: "m", s: t.s + sonraki.s, b: false }];
      }
      if (sonraki && sonraki.k === "kelime" && !sonraki.b) {
        this.p += 1;
        return [{ t: "m", s: t.s, b: false }, ...this.tekKarakter()];
      }
    }
    if (t.k === "sayi" || t.k === "sembol" || t.k === "diger") {
      this.p += 1;
      return [{ t: "m", s: t.s, b: false }];
    }
    if (t.k === "kelime") return this.tekKarakter();
    this.uyarilar.push("Simgenin değeri eksik.");
    return [];
  }

  /** Kelimenin yalnız İLK karakteri (ya da tam Yunan kelimesi); kalanı geri bırakılır. */
  private tekKarakter(): Dugum[] {
    const t = this.T[this.p];
    if (!t || t.k !== "kelime") return [];
    if (YUNAN_KELIMELERI[t.s]) {
      this.p += 1;
      return [{ t: "m", s: YUNAN_KELIMELERI[t.s], b: false }];
    }
    if (SEMBOL_KELIMELERI[t.s] && YALIN_SEMBOL_KELIMELERI.has(t.s)) {
      this.p += 1;
      return [{ t: "m", s: SEMBOL_KELIMELERI[t.s], b: false }];
    }
    if (t.s.length > 1) {
      this.T[this.p] = { k: "kelime", s: t.s.slice(1), b: false };
    } else {
      this.p += 1;
    }
    return [{ t: "m", s: t.s[0], b: false }];
  }
}

// ── Ağaç → parçalar ────────────────────────────────────────────────────────

/** `{…}` gruplarını ana diziye açar (ilk elemanın boşluk bilgisi korunur). */
function gorunmezleriAc(d: Dugum[]): Dugum[] {
  const sonuc: Dugum[] = [];
  for (const n of d) {
    if (n.t === "gorunmez") {
      const ic = gorunmezleriAc(n.ic);
      if (ic.length) ic[0] = { ...ic[0], b: n.b };
      sonuc.push(...ic);
    } else {
      sonuc.push(n);
    }
  }
  return sonuc;
}

/** Yalnız metin ve operatörden oluşan dizi → tek düz yazı; yapı varsa null. */
function duzYazi(d: Dugum[]): string | null {
  let s = "";
  for (const n of gorunmezleriAc(d)) {
    if (n.t !== "m" && n.t !== "op") return null;
    s += (s && n.b ? " " : "") + n.s;
  }
  return s;
}

function yaklasikYazi(d: Dugum[]): string {
  return gorunmezleriAc(d)
    .map((n) => {
      switch (n.t) {
        case "m":
        case "op":
          return n.s;
        case "us":
          return yaklasikYazi([n.taban]) + (n.alt ? `_${yaklasikYazi(n.alt)}` : "") + (n.ust ? `^${yaklasikYazi(n.ust)}` : "");
        case "kesir":
          return `${yaklasikYazi(n.pay)}/${yaklasikYazi(n.payda)}`;
        case "grup":
          return `(${yaklasikYazi(n.ic)})`;
        case "kok":
          return `√(${yaklasikYazi(n.ic)})`;
        case "fonk":
          return `${n.ad}(${yaklasikYazi(n.arg)})`;
        case "vek":
          return yaklasikYazi(n.ic);
        case "buyuk":
          return `${n.tur}(${yaklasikYazi(n.ic)})`;
        default:
          return "";
      }
    })
    .join(" ");
}

function disParantezAt(d: Dugum[]): Dugum[] {
  const duz = gorunmezleriAc(d);
  if (duz.length === 1 && duz[0].t === "grup" && duz[0].stil === "parantez") return duz[0].ic;
  return duz;
}

function alan(d: Dugum[], idUret: () => string): { yazi: string; parcalar?: DenklemParcasi[] } {
  const duz = duzYazi(d);
  if (duz !== null) return { yazi: duz };
  return { yazi: yaklasikYazi(d), parcalar: parcalaraCevir(d, idUret) };
}

function parcalaraCevir(girdi: Dugum[], idUret: () => string): DenklemParcasi[] {
  const d = gorunmezleriAc(girdi);
  const cikti: DenklemParcasi[] = [];
  let tampon: string | null = null;
  const bosalt = () => {
    if (tampon !== null && tampon.trim()) cikti.push({ id: idUret(), tur: "metin", deger: tampon.trim() });
    tampon = null;
  };
  for (const n of d) {
    if (n.t === "m") {
      tampon = tampon === null ? n.s : tampon + (n.b ? " " : "") + n.s;
      continue;
    }
    bosalt();
    const id = idUret();
    switch (n.t) {
      case "op":
        cikti.push({ id, tur: "operator", sembol: n.s });
        break;
      case "us": {
        const taban = alan([n.taban], idUret);
        const ust = n.ust ? alan(n.ust, idUret) : { yazi: "" };
        const alt = n.alt ? alan(n.alt, idUret) : { yazi: "" };
        cikti.push({
          id,
          tur: "us",
          taban: taban.yazi,
          ust: ust.yazi,
          alt: alt.yazi,
          ...(taban.parcalar ? { tabanParcalari: taban.parcalar } : {}),
          ...(ust.parcalar ? { ustParcalari: ust.parcalar } : {}),
          ...(alt.parcalar ? { altParcalari: alt.parcalar } : {}),
        });
        break;
      }
      case "kesir": {
        const pay = alan(disParantezAt(n.pay), idUret);
        const payda = alan(disParantezAt(n.payda), idUret);
        cikti.push({
          id,
          tur: "kesir",
          pay: pay.yazi,
          payda: payda.yazi,
          ...(pay.parcalar ? { payParcalari: pay.parcalar } : {}),
          ...(payda.parcalar ? { paydaParcalari: payda.parcalar } : {}),
        });
        break;
      }
      case "grup": {
        const ic = alan(n.ic, idUret);
        cikti.push({
          id,
          tur: "grup",
          stil: n.stil === "mutlak" ? "mutlak" : n.stil,
          icerik: ic.yazi,
          ...(ic.parcalar ? { icerikParcalari: ic.parcalar } : {}),
        });
        break;
      }
      case "kok": {
        const ic = alan(disParantezAt(n.ic), idUret);
        cikti.push({
          id,
          tur: "kok",
          derece: "",
          icerik: ic.yazi,
          ...(ic.parcalar ? { icerikParcalari: ic.parcalar } : {}),
        });
        break;
      }
      case "fonk": {
        const ar = alan(disParantezAt(n.arg), idUret);
        cikti.push({
          id,
          tur: "fonksiyon",
          ad: n.ad,
          arguman: ar.yazi,
          ...(ar.parcalar ? { argumanParcalari: ar.parcalar } : {}),
        });
        break;
      }
      case "vek": {
        const ic = alan(n.ic, idUret);
        cikti.push({
          id,
          tur: "vektor",
          stil: n.stil,
          ifade: ic.yazi,
          ...(ic.parcalar ? { ifadeParcalari: ic.parcalar } : {}),
        });
        break;
      }
      case "buyuk": {
        const ic = alan(n.ic, idUret);
        const alt = alan(n.alt, idUret);
        const ust = alan(n.ust, idUret);
        const ifadeAlani = { ifade: ic.yazi, ...(ic.parcalar ? { ifadeParcalari: ic.parcalar } : {}) };
        if (n.tur === "limit") {
          cikti.push({ id, tur: "limit", altYazi: alt.yazi, ...(alt.parcalar ? { altYaziParcalari: alt.parcalar } : {}), ...ifadeAlani });
        } else if (n.tur === "integral") {
          cikti.push({
            id,
            tur: "integral",
            kat: n.kat,
            altSinir: alt.yazi,
            ustSinir: ust.yazi,
            ...(alt.parcalar ? { altSinirParcalari: alt.parcalar } : {}),
            ...(ust.parcalar ? { ustSinirParcalari: ust.parcalar } : {}),
            ...ifadeAlani,
          });
        } else {
          cikti.push({
            id,
            tur: n.tur,
            altYazi: alt.yazi,
            ustYazi: ust.yazi,
            ...(alt.parcalar ? { altYaziParcalari: alt.parcalar } : {}),
            ...(ust.parcalar ? { ustYaziParcalari: ust.parcalar } : {}),
            ...ifadeAlani,
          });
        }
        break;
      }
      default:
        break;
    }
  }
  bosalt();
  return cikti;
}

/**
 * Yazıyı denklem parçalarına çevirir. Hiç hata fırlatmaz; anlaşılmayanlar düz
 * metin kalır ve `uyarilar`a yazılır. Boş/boşluk girdi → boş sonuç.
 */
export function denklemYazisiniCoz(girdi: string, idUret: () => string): YazimSonucu {
  if (!girdi.trim()) return { parcalar: [], uyarilar: [] };
  const ayristirici = new Ayristirici(belirteclereAyir(girdi));
  const agac = ayristirici.tumu();
  const parcalar = parcalaraCevir(agac, idUret);
  // Tekrarlayan uyarıları sadeleştir (iç içe kapanmayan parantez birkaç kez yazılır).
  const uyarilar = [...new Set(ayristirici.uyarilar)];
  return { parcalar, uyarilar };
}


// ── KİMYA KİPİ ─────────────────────────────────────────────────────────────
//
// NEDEN AYRI: genel ayrıştırıcı matematik içindir — "AlCl_3" → `AlC` + `l₃`
// (harf ve indis ayrı parça, aralarında boşluk), "kJ/mol" kesir, "ΔH" iki parça.
// Kimya formülü ise DİK, BOŞLUKSUZ bir yazıdır. Bu kip:
//   · ardışık harfler tek sözcük ("AlCl", "ΔH", "kJ/mol", "mol/L", "°C");
//   · harfin/")" ın hemen ardındaki rakam ALT İNDİS (H2O → H₂O, Ca(OH)2);
//   · `^` ya da sondaki "+"/"-" iyon yükü (SO4^2-, SO_4^{2-}, Na+, Cl-);
//   · "->" "→", "<=>" "⇌", sözcük aralarında "+" ve "=" işleç parçası;
//   · "(k) (s) (g) (aq)" faz sembolleri düz metin.
// Parçalar `bitisik` işaretlidir: motor aralarına boşluk koymaz.
// Kesir YOKTUR: "/" düz karakterdir (kJ/mol).

export const KIMYA_ORNEKLERI: { yazi: string; ad: string }[] = [
  { yazi: "2H2 + O2 -> 2H2O", ad: "Su oluşumu" },
  { yazi: "N2(g) + 3H2(g) <=> 2NH3(g)", ad: "Amonyak dengesi" },
  { yazi: "\\Delta H = -92 kJ/mol", ad: "Tepkime ısısı" },
  { yazi: "AlCl3", ad: "Alüminyum klorür" },
  { yazi: "Al2(SO4)3", ad: "Alüminyum sülfat" },
  { yazi: "SO4^{2-}", ad: "Sülfat iyonu" },
  { yazi: "Fe^{3+} + e^- -> Fe^{2+}", ad: "İyon yükleri" },
];

export function kimyaYazisiniCoz(girdi: string, idUret: () => string): YazimSonucu {
  if (!girdi.trim()) return { parcalar: [], uyarilar: [] };
  // Ön işlem: ters bölülü adlar, oklar, Delta.
  const yazi = girdi
    .replace(/\\([A-Za-z]+)/g, (_m, ad: string) =>
      ad === "rightleftharpoons" || ad === "leftrightharpoons" ? "⇌"
        : ad === "rightarrow" || ad === "to" ? "→"
        : YUNANCA[ad] ?? SEMBOL_KELIMELERI[ad] ?? ad,
    )
    .replace(/\bDelta(?=[A-Z\s])/g, "Δ")
    .replace(/<=>|<->|<-->|⇌/g, "⇌")
    .replace(/-->|->|→/g, "→")
    .replace(/\*/g, "·")
    .replace(/Δ\s+(?=[A-Za-z])/g, "Δ");

  const cikti: DenklemParcasi[] = [];
  let tampon = "";
  let tamponBitisik = false;
  let bosluk = false;
  const sonOperatorMu = () => cikti.length > 0 && cikti[cikti.length - 1].tur === "operator";
  const bitisikMi = () => cikti.length > 0 && !bosluk && !sonOperatorMu();
  const bosalt = () => {
    if (tampon !== "") {
      const deger = tampon.trimEnd();
      if (deger) cikti.push({ id: idUret(), tur: "metin", deger, ...(tamponBitisik ? { bitisik: true } : {}) });
    }
    tampon = "";
  };
  const duzEkle = (ch: string) => {
    if (tampon === "") tamponBitisik = bitisikMi();
    else if (bosluk) tampon += " ";
    tampon += ch;
    bosluk = false;
  };
  const operatorEkle = (sembol: string) => {
    bosalt();
    cikti.push({ id: idUret(), tur: "operator", sembol });
    bosluk = false;
  };
  /** Önceki karakterin (ya da son simge parçasının) üstüne/altına yazı bağlar. */
  const simgeEkle = (hedef: "ust" | "alt", deger: string) => {
    if (!deger) return;
    if (tampon !== "" && !bosluk) {
      const taban = tampon[tampon.length - 1];
      let kalan = tampon.slice(0, -1);
      const bosluklu = kalan.endsWith(" ");
      kalan = kalan.trimEnd();
      const ilkBitisik = tamponBitisik;
      tampon = kalan;
      bosalt();
      const usBitisik = kalan ? !bosluklu : ilkBitisik;
      cikti.push({
        id: idUret(),
        tur: "us",
        taban,
        ust: hedef === "ust" ? deger : "",
        alt: hedef === "alt" ? deger : "",
        ...(usBitisik ? { bitisik: true } : {}),
      });
      return;
    }
    const son = cikti[cikti.length - 1];
    if (tampon === "" && !bosluk && son && son.tur === "us" && !son[hedef]) {
      son[hedef] = deger;
      return;
    }
    // Bağlanacak taban yok: karakter olarak yaz.
    duzEkle((hedef === "ust" ? "^" : "_") + deger);
  };
  const operandOku = (i: number): { deger: string; bitis: number } => {
    if (yazi[i] === "{") {
      const kapanis = yazi.indexOf("}", i);
      const son = kapanis < 0 ? yazi.length : kapanis;
      return { deger: yazi.slice(i + 1, son), bitis: kapanis < 0 ? yazi.length : kapanis + 1 };
    }
    const m = /^(?:\d+[+\-−]?|[+\-−]|[A-Za-z])/.exec(yazi.slice(i));
    return m ? { deger: m[0], bitis: i + m[0].length } : { deger: "", bitis: i };
  };
  const eksiDuzelt = (d: string) => d.replace(/-/g, "−");

  let i = 0;
  while (i < yazi.length) {
    const c = yazi[i];
    const onceki = i > 0 ? yazi[i - 1] : "";
    const sonraki = i + 1 < yazi.length ? yazi[i + 1] : "";
    if (/\s/.test(c)) {
      bosluk = true;
      i += 1;
      continue;
    }
    if (c === "⇌" || c === "→" || c === "⇄") {
      operatorEkle(c);
      i += 1;
      continue;
    }
    if (c === "=") {
      operatorEkle("=");
      i += 1;
      continue;
    }
    const formulSonrasi = /[A-Za-z0-9)\]]/.test(onceki) && !bosluk;
    const bitisSinir = sonraki === "" || /[\s)\],;]/.test(sonraki);
    if (c === "+") {
      if (formulSonrasi && bitisSinir) simgeEkle("ust", "+");
      else operatorEkle("+");
      i += 1;
      continue;
    }
    if (c === "-" || c === "−") {
      if (formulSonrasi && bitisSinir) {
        simgeEkle("ust", "−");
      } else if (/\d/.test(sonraki) && (bosluk || i === 0 || /[=→⇌(]/.test(onceki))) {
        duzEkle("−");
      } else if (bosluk && /\s/.test(sonraki)) {
        operatorEkle("−");
      } else {
        duzEkle("-");
      }
      i += 1;
      continue;
    }
    if (c === "^" || c === "_") {
      const { deger, bitis } = operandOku(i + 1);
      if (bitis === i + 1) {
        duzEkle(c);
        i += 1;
      } else {
        simgeEkle(c === "^" ? "ust" : "alt", eksiDuzelt(deger));
        i = bitis;
      }
      continue;
    }
    if (/\d/.test(c) && /[A-Za-z)\]]/.test(onceki) && !bosluk) {
      // Rakam harfin/parantezin ardında: alt indis ("Fe3+" gibi tek rakam + işaret yük).
      const m = /^\d+/.exec(yazi.slice(i))!;
      const sonrasi = yazi[i + m[0].length] ?? "";
      const sonrasiSonraki = yazi[i + m[0].length + 1] ?? "";
      if (m[0].length === 1 && (sonrasi === "+" || sonrasi === "-" || sonrasi === "−") && (sonrasiSonraki === "" || /[\s)\],;]/.test(sonrasiSonraki))) {
        simgeEkle("ust", m[0] + eksiDuzelt(sonrasi));
        i += 2;
      } else {
        simgeEkle("alt", m[0]);
        i += m[0].length;
      }
      continue;
    }
    duzEkle(c);
    i += 1;
  }
  bosalt();
  return { parcalar: cikti, uyarilar: [] };
}
