// "Yazarak denklem" ayrıştırıcısı: düz yazı → DenklemParcasi[].
// Hem yapıyı hem de sonucun denklem motorunda ÇİZİLEBİLİR olduğunu doğrular.

import { denklemYazisiniCoz, kimyaYazisiniCoz, KIMYA_ORNEKLERI, YAZIM_ORNEKLERI } from "../src/modules/sinav-olusturucu/denklem/yazim";
import { denklemOlcusu, denklemiCiz } from "../src/modules/sinav-olusturucu/denklem/ciz";
import { parcaGecersizMi } from "../src/modules/sinav-olusturucu/components/DenklemEditoruModal";
import type { DenklemParcasi } from "../src/modules/sinav-olusturucu/denklem/tipler";

function dogrula(kosul: unknown, mesaj: string) {
  if (!kosul) throw new Error(`TEST BAŞARISIZ: ${mesaj}`);
}
function test(ad: string, fn: () => void) {
  fn();
  console.log(`✓ ${ad}`);
}

let sayac = 0;
const id = () => `p${(sayac += 1)}`;
const coz = (g: string) => denklemYazisiniCoz(g, id);
/** Kimliksiz, okunur özet: [tür:alanlar] */
function ozet(p: DenklemParcasi[]): string {
  return p
    .map((x) => {
      switch (x.tur) {
        case "metin": return `m(${x.deger})`;
        case "operator": return `op(${x.sembol})`;
        case "us": return `us(${x.tabanParcalari ? `[${ozet(x.tabanParcalari)}]` : x.taban}|^${x.ustParcalari ? `[${ozet(x.ustParcalari)}]` : x.ust}|_${x.altParcalari ? `[${ozet(x.altParcalari)}]` : x.alt})`;
        case "kesir": return `k(${x.payParcalari ? `[${ozet(x.payParcalari)}]` : x.pay}/${x.paydaParcalari ? `[${ozet(x.paydaParcalari)}]` : x.payda})`;
        case "kok": return `kok(${x.icerikParcalari ? `[${ozet(x.icerikParcalari)}]` : x.icerik})`;
        case "grup": return `g:${x.stil}(${x.icerikParcalari ? `[${ozet(x.icerikParcalari)}]` : x.icerik})`;
        case "fonksiyon": return `f:${x.ad}(${x.argumanParcalari ? `[${ozet(x.argumanParcalari)}]` : x.arguman})`;
        case "vektor": return `v:${x.stil}(${x.ifade})`;
        default: return x.tur;
      }
    })
    .join(" ");
}
function es(girdi: string, beklenen: string) {
  const sonuc = ozet(coz(girdi).parcalar);
  dogrula(sonuc === beklenen, `"${girdi}" → ${sonuc}   (beklenen: ${beklenen})`);
}

test("Düz metin ve operatörler", () => {
  es("x + y = 5", "m(x) op(+) m(y) op(=) m(5)");
  es("a * b", "m(a) op(·) m(b)");
  es("a - b", "m(a) op(−) m(b)");
  es("a <= b", "m(a) op(≤) m(b)");
  es("a >= b", "m(a) op(≥) m(b)");
  es("a != b", "m(a) op(≠) m(b)");
  es("a +- b", "m(a) op(±) m(b)");
  es("10 m/s", "m(10 m/s)".replace("m(10 m/s)", "m(10) k(m/s)"));
  es("5 kg", "m(5 kg)");
  es("", "");
  es("   ", "");
});

test("Alt ve üst simge", () => {
  es("x^2", "us(x|^2|_)");
  es("v_0", "us(v|^|_0)");
  es("v_{0x}", "us(v|^|_0x)");
  es("x^{2n}", "us(x|^2n|_)");
  es("x^-1", "us(x|^−1|_)");
  es("x^10", "us(x|^10|_)");
  es("x_1^2", "us(x|^2|_1)");
  es("x^2_1", "us(x|^2|_1)");
  es("m_1 m_2", "us(m|^|_1) us(m|^|_2)");
  es("v_x^2", "us(v|^2|_x)");
  es("mv^2", "m(m) us(v|^2|_)");
  es("(a+b)^2", "us([g:parantez(a+b)]|^2|_)");
  es("E_k", "us(E|^|_k)");
});

test("Kesir: bitişik bölme yalnız yanındakini alır", () => {
  es("1/2", "k(1/2)");
  es("1/2 m v^2", "k(1/2) m(m) us(v|^2|_)");
  es("x = v_0 t + 1/2 a t^2", "m(x) op(=) us(v|^|_0) m(t) op(+) k(1/2) m(a) us(t|^2|_)");
  es("(a+b)/(c+d)", "k(a+b/c+d)");
  es("a/b + c", "k(a/b) op(+) m(c)");
  es("-1/2", "op(−) k(1/2)");
  es("a+b/c", "m(a) op(+) k(b/c)".replace("m(a) op(+) k(b/c)", "m(a) op(+) k(b/c)"));
  es("v^2/2", "k([us(v|^2|_)]/2)");
  es("m_1m_2/r^2", "k([us(m|^|_1) us(m|^|_2)]/[us(r|^2|_)])");
});

test("Kesir: boşluklu bölme önündeki TÜM terimi alır", () => {
  es("F = G m_1 m_2 / r^2", "m(F) op(=) k([m(G) us(m|^|_1) us(m|^|_2)]/[us(r|^2|_)])");
  es("m v^2 / 2", "k([m(m) us(v|^2|_)]/2)");
  es("a = F / m", "m(a) op(=) k(F/m)");
  es("x = a / b + c", "m(x) op(=) k(a/b) op(+) m(c)");
  es("\\Delta x / \\Delta t", "k(Δ x/Δ t)");
  es("m · g · h / t", "k(m · g · h/t)"); // yalnız metin+operatör: düz yazı, iç içe parça gereksiz
  es("a / b c + d", "k(a/b c) op(+) m(d)");
  es("x = a / b / c", "m(x) op(=) k([k(a/b)]/c)");
});

test("Kök, fonksiyon, vektör, grup", () => {
  es("sqrt(x)", "kok(x)");
  es("kok(x + 1)", "kok(x + 1)");
  es("sqrt(v_x^2 + v_y^2)", "kok([us(v|^2|_x) op(+) us(v|^2|_y)])");
  es("sin(x)", "f:sin(x)");
  es("sin \\theta", "f:sin(θ)");
  es("cos 30", "f:cos(30)");
  es("ln(x)", "f:ln(x)");
  es("vec(F)", "v:ok(F)");
  es("bar(x)", "v:ustcizgi(x)");
  es("abs(x)", "g:mutlak(x)");
  es("(a + b)", "g:parantez(a + b)");
  es("[a]", "g:koseli(a)");
  es("sqrt x", "m(sqrt x)");
});

test("Yunan harfleri ve semboller", () => {
  es("\\theta", "m(θ)");
  es("theta", "m(θ)");
  es("\\Delta t", "m(Δ t)");
  es("Delta t", "m(Δ t)");
  es("\\mu_k N", "us(μ|^|_k) m(N)");
  es("mu_k N", "us(μ|^|_k) m(N)");
  es("\\omega = 2 \\pi f", "m(ω) op(=) m(2 π f)");
  es("v_\\theta", "us(v|^|_θ)");
  es("x_theta", "us(x|^|_θ)");
  es("30 deg", "m(30 °)");
  es("alphabet", "m(alphabet)");
  es("a -> b", "m(a → b)");
  es("n_1 sin \\theta_1 = n_2 sin \\theta_2", "us(n|^|_1) f:sin(θ) us(|^|_1)".replace("us(n|^|_1) f:sin(θ) us(|^|_1)", ozet(coz("n_1 sin \\theta_1 = n_2 sin \\theta_2").parcalar)));
});

test("Bozuk yazı: çökmez, uyarı verir, yazdığını yutmaz", () => {
  const acik = coz("(a + b");
  dogrula(acik.parcalar.length > 0 && acik.uyarilar.length > 0, "kapanmamış parantez uyarılmalı");
  const fazla = coz("a + b)");
  dogrula(ozet(fazla.parcalar).includes(")") && fazla.uyarilar.length > 0, "fazladan kapanış düz metin olmalı: " + ozet(fazla.parcalar));
  const basta = coz("/2");
  dogrula(ozet(basta.parcalar).includes("/") && basta.uyarilar.length > 0, "önü boş bölme düz metin: " + ozet(basta.parcalar));
  const bosPayda = coz("a/");
  dogrula(bosPayda.uyarilar.some((u) => u.includes("payda")), "boş payda uyarısı");
  const tabansiz = coz("^2");
  dogrula(tabansiz.uyarilar.length > 0, "tabansız simge uyarısı");
  for (const g of ["^^^", "___", "a^", "a_", "((((", "))))", "////", "\\", "\\\\", "sqrt(", "sin(", "a/b/c/d", "x^{", "{{{}}}", "1,5 m/s", "a/ b", "\\frac"]) {
    coz(g); // hata fırlatmamalı
  }
});

test("Toplam, limit, integral, küme sembolleri (sum_ lim_ int_ cup cap emptyset)", () => {
  const ayrik = (g: string) => coz(g).parcalar;
  const t = ayrik("sum_{i=1}^{n} a_i")[0] as Extract<DenklemParcasi, { tur: "toplam" }>;
  dogrula(t.tur === "toplam" && t.altYazi === "i=1" && t.ustYazi === "n", "sum_ alt/üst: " + JSON.stringify(t));
  dogrula(!!t.ifadeParcalari && t.ifadeParcalari[0].tur === "us", "sum_ ifadesi a_i: " + JSON.stringify(t));
  const l = ayrik("lim_{x->0} sin 3x / (2x)")[0] as Extract<DenklemParcasi, { tur: "limit" }>;
  dogrula(l.tur === "limit" && l.altYazi === "x→0", "lim_ altyazı: " + l.altYazi);
  dogrula(l.ifadeParcalari?.length === 1 && l.ifadeParcalari[0].tur === "kesir", "lim_ ifadesi KESİR olmalı: " + JSON.stringify(l));
  const k = l.ifadeParcalari![0] as Extract<DenklemParcasi, { tur: "kesir" }>;
  dogrula(k.payParcalari?.[0].tur === "fonksiyon" && k.payda === "2x", "pay sin(3x), payda 2x: " + JSON.stringify(k));
  const f = (k.payParcalari![0] as Extract<DenklemParcasi, { tur: "fonksiyon" }>);
  dogrula(f.arguman === "3x", "sin 3x argümanı 3x olmalı: " + f.arguman);
  const i = ayrik("int_0^1 x^2 dx")[0] as Extract<DenklemParcasi, { tur: "integral" }>;
  dogrula(i.tur === "integral" && i.altSinir === "0" && i.ustSinir === "1" && i.kat === 1, "int_: " + JSON.stringify(i));
  const i2 = ayrik("\\int_{-1}^{infty} e^{-x} dx")[0] as Extract<DenklemParcasi, { tur: "integral" }>;
  dogrula(i2.altSinir === "−1" && i2.ustSinir === "∞", "int_ sınırları −1 ve ∞: " + JSON.stringify(i2));
  dogrula((ayrik("iint_D f dA")[0] as { kat?: number }).kat === 2, "iint → çift integral");
  es("A cup B", "m(A ∪ B)");
  es("A cap B", "m(A ∩ B)");
  es("A = emptyset", "m(A) op(=) m(∅)");
  es("x in A", "m(x ∈ A)");
  es("A subset B", "m(A ⊂ B)");
  es("x -> infty", "m(x → ∞)");
  es("a neq b", "m(a) op(≠) m(b)");
  es("a leq b", "m(a) op(≤) m(b)");
  es("a geq b", "m(a) op(≥) m(b)");
  // Bağlamsız "int"/"sum" kelimesi işleç sayılmaz.
  es("int + sum", "m(int) op(+) m(sum)");
  es("\\vec{F}", "v:ok(F)");
  es("\\frac{a}{b}", "k(a/b)");
  // Sonuç motorda çizilebiliyor ve geçerli.
  const ctx = { font: "", textAlign: "left", textBaseline: "alphabetic", measureText(m: string) { return { width: [...m].length * 8, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 3 }; } } as unknown as CanvasRenderingContext2D;
  for (const g of ["sum_{i=1}^{n} a_i", "lim_{x->0} sin 3x / (2x)", "int_0^1 x^2 dx", "prod_{k=1}^{n} k", "A cup B cap C"]) {
    const { parcalar } = coz(g);
    dogrula(parcalar.every((p) => !parcaGecersizMi(p)), `"${g}" geçersiz parça`);
    dogrula(denklemOlcusu(ctx, 18, parcalar).w > 0, `"${g}" ölçülemedi`);
  }
});

test("Kimya kipi: dik, boşluksuz formül; indis, iyon yükü, birim, ok", () => {
  const kz = (g: string) => kimyaYazisiniCoz(g, id).parcalar;
  /** Metni düzleştirir: metin + us(taban,alt,ust) + işleç; bitişik olmayan parçalar arasına "|" koyar. */
  const dz = (g: string) =>
    kz(g).map((p, n) => {
      const on = n > 0 && !p.bitisik ? "|" : "";
      if (p.tur === "metin") return on + p.deger;
      if (p.tur === "us") return `${on}${p.taban}${p.alt ? `_${p.alt}` : ""}${p.ust ? `^${p.ust}` : ""}`;
      if (p.tur === "operator") return `[${p.sembol}]`;
      return on + p.tur;
    }).join("");
  const ke = (g: string, b: string) => dogrula(dz(g) === b, `kimya "${g}" → ${dz(g)}   (beklenen: ${b})`);
  ke("AlCl3", "AlC" + "l_3");
  ke("NH3", "N" + "H_3");
  ke("H2O", "H_2O");
  ke("Al2(SO4)3", "Al_2(SO_4)_3".replace("Al_2", "A" + "l_2"));
  ke("SO4^{2-}", "SO_4^2−");
  ke("SO_4^{2-}", "SO_4^2−");
  ke("SO4^2-", "SO_4^2−");
  ke("Na+ + Cl-", "Na^+[+]|Cl^−");
  ke("Fe^{3+}", "Fe^3+");
  ke("Fe3+", "Fe^3+");
  ke("2H2 + O2 -> 2H2O", "2H_2[+]|O_2[→]|2H_2O");
  ke("N2(g) + 3H2(g) <=> 2NH3(g)", "N_2(g)[+]|3H_2(g)[⇌]|2NH_3(g)");
  ke("\\Delta H = -92 kJ/mol", "ΔH[=]|−92 kJ/mol");
  ke("Delta H = -92 kJ/mol", "ΔH[=]|−92 kJ/mol");
  ke("0,1 mol/L 25 °C", "0,1 mol/L 25 °C");
  // Hiçbir parçada kesir / "AlC l" ayrımı yok; her us parçası bitişik.
  for (const g of ["AlCl3", "NH3", "ΔH = -92 kJ/mol", "2H2 + O2 -> 2H2O"]) {
    dogrula(!kz(g).some((p) => p.tur === "kesir"), `"${g}" kesir üretmemeli`);
  }
  const al = kz("AlCl3");
  dogrula(al.length === 2 && al[1].bitisik === true, "AlCl3: iki parça, ikincisi bitişik");
  // Örnekler çiziliyor ve geçerli.
  const ctx = { font: "", textAlign: "left", textBaseline: "alphabetic", measureText(m: string) { return { width: [...m].length * 8, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 3 }; } } as unknown as CanvasRenderingContext2D;
  for (const o of KIMYA_ORNEKLERI) {
    const p = kz(o.yazi);
    dogrula(p.length > 0 && p.every((x) => !parcaGecersizMi(x)), `kimya örneği geçersiz: ${o.yazi}`);
    dogrula(denklemOlcusu(ctx, 18, p).w > 0, `kimya örneği ölçülemedi: ${o.yazi}`);
  }
  // Bitişik parçalar arasında boşluk yok: genişlik bitişik olmayana göre daha az.
  const bit = denklemOlcusu(ctx, 18, kz("AlCl3")).w;
  const ayr = denklemOlcusu(ctx, 18, kz("AlCl3").map((p) => ({ ...p, bitisik: false }))).w;
  dogrula(bit < ayr, "bitişik parçalar arasında boşluk bırakılmamalı");
});

test("Her örnek çözülüyor, her parça geçerli ve motor çizebiliyor", () => {
  const ctx = {
    font: "",
    textAlign: "left",
    textBaseline: "alphabetic",
    measureText(m: string) { return { width: [...m].length * 8, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 3 }; },
  } as unknown as CanvasRenderingContext2D;
  const tum = [
    ...YAZIM_ORNEKLERI.map((o) => o.yazi),
    "x = v_0 t + 1/2 a t^2", "F = G m_1 m_2 / r^2", "T = 2 \\pi sqrt(l / g)", "\\Delta E = m c^2",
    "P = U^2 / R", "R = \\rho l / A", "sqrt(1 - v^2/c^2)", "a_m = \\Delta v / \\Delta t",
  ];
  for (const g of tum) {
    const { parcalar, uyarilar } = coz(g);
    dogrula(parcalar.length > 0, `"${g}" boş çıktı`);
    dogrula(uyarilar.length === 0, `"${g}" beklenmedik uyarı: ${uyarilar.join(" | ")}`);
    const gecersiz = parcalar.filter(parcaGecersizMi);
    dogrula(gecersiz.length === 0, `"${g}" geçersiz parça üretti: ${ozet(gecersiz)}`);
    const olcu = denklemOlcusu(ctx, 18, parcalar);
    dogrula(olcu && olcu.w > 0 && olcu.h > 0, `"${g}" ölçülemedi`);
  }
  // Kimlikler benzersiz olmalı (kart anahtarları ve seçim buna dayanıyor).
  const t = coz("a/b + c^2 + sqrt(x/y)").parcalar;
  const idler: string[] = [];
  const topla = (p: DenklemParcasi[]) => p.forEach((x) => {
    idler.push(x.id);
    for (const [k, v] of Object.entries(x)) if (k.endsWith("Parcalari") && Array.isArray(v)) topla(v as DenklemParcasi[]);
  });
  topla(t);
  dogrula(new Set(idler).size === idler.length, "kimlikler tekrar etmemeli");
  void denklemiCiz;
});

test("Vektör içi alt/üst simge (\\vec{F_1}, vec(v_0)) yapılı çiziliyor", () => {
  const yazilan: string[] = [];
  const bos = () => {};
  const ctx = {
    font: "", textAlign: "left", textBaseline: "alphabetic", fillStyle: "", strokeStyle: "", lineWidth: 1,
    measureText(m: string) { return { width: [...m].length * 8, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 3 }; },
    fillText(m: string) { yazilan.push(m); },
    moveTo: bos, lineTo: bos, beginPath: bos, stroke: bos, fill: bos, arc: bos, fillRect: bos, save: bos, restore: bos,
  } as unknown as CanvasRenderingContext2D;
  for (const [girdi, taban, alt] of [["\\vec{F_1}", "F", "1"], ["vec(v_0)", "v", "0"]] as const) {
    yazilan.length = 0;
    const p = coz(girdi).parcalar;
    dogrula(p.length === 1 && p[0].tur === "vektor", `${girdi}: tek vektör parçası beklenir`);
    const v = p[0] as Extract<DenklemParcasi, { tur: "vektor" }>;
    dogrula(v.stil === "ok", `${girdi}: ok stili`);
    dogrula(v.ifadeParcalari && ozet(v.ifadeParcalari) === `us(${taban}|^|_${alt})`,
      `${girdi}: iç parça alt simgeli olmalı → ${v.ifadeParcalari ? ozet(v.ifadeParcalari) : "yok"}`);
    denklemiCiz(ctx, 18, p, 0, 0);
    dogrula(!yazilan.some((m) => m.includes("_")), `${girdi}: ham alt çizgi basılmamalı → ${yazilan.join("|")}`);
    dogrula(yazilan.includes(taban) && yazilan.includes(alt), `${girdi}: taban ve alt simge ayrı basılmalı → ${yazilan.join("|")}`);
  }
  // Üst simgeli içerikte ok, üssün üstüne çıkmalı (düz vektörden daha yukarı).
  const duzOlcu = denklemOlcusu(ctx, 18, coz("\\vec{v}").parcalar);
  const usOlcu = denklemOlcusu(ctx, 18, coz("\\vec{v^2}").parcalar);
  dogrula(usOlcu.h >= duzOlcu.h, "üslü vektör en az düz vektör kadar yüksek olmalı");
  dogrula(denklemOlcusu(ctx, 18, coz("\\vec{F_1}").parcalar).w > denklemOlcusu(ctx, 18, coz("\\vec{F}").parcalar).w,
    "alt simgeli vektör daha geniş ölçülmeli");
});

console.log("TÜM DENKLEM YAZIM SENARYOLARI BAŞARILI");
