// v1.2 (M ajanı) saf fonksiyon senaryoları: birim çember, işaret tablosu, fonksiyon ok diyagramı,
// Venn alt küme / ayrık, 3 aşamalı olasılık ağacı, grafik piksel↔veri dönüşümü, şema PNG kırpma payı.

import {
  agacDerinligi,
  agacKur,
  agacOkuAyrinti,
  agacSatirlari,
  agacYaprakSayisi,
  agacYaz,
  SEMA_SABLONLARI,
  semaBoyutu,
  semaCiz,
  semaVerisiGecerliMi,
  vennBolgesi,
  vennDaireleri,
  vennGorunurBolgeler,
} from "../src/modules/sinav-olusturucu/cizim/sema";
import {
  birimCemberDegerleri,
  cozumAraliklari,
  cozumKumesiYaz,
  fonksiyonDurumu,
  isaretleriKuralaGoreDoldur,
  isaretTablosuHesapla,
  isaretTablosuVerisi,
  kokSirasiUyarisi,
  oklariYenidenNumarala,
  polinomOku,
} from "../src/modules/sinav-olusturucu/cizim/semaEk";
import {
  grafikNoktaTasi,
  grafikPikselDonusumu,
  MAT_GRAFIK_SABLONLARI,
  GRAFIK_SABLONLARI,
} from "../src/modules/sinav-olusturucu/cizim/grafik";
import { sekilGecerliMi } from "../src/modules/sinav-olusturucu/cizim/sablon";
import { cizimIcerikSiniri } from "../src/modules/sinav-olusturucu/cizim/sinirlar";
import { sekilleriCiz } from "../src/modules/sinav-olusturucu/cizim/ciz";
import type { GrafikVerisi, IsaretKoku, SemaVerisi, Sekil } from "../src/modules/sinav-olusturucu/cizim/tipler";

let sayac = 0;
function dogrula(kosul: unknown, mesaj: string) {
  if (!kosul) throw new Error(`TEST BAŞARISIZ: ${mesaj}`);
}
function test(ad: string, f: () => void) {
  f();
  sayac += 1;
  console.log(`✓ ${ad}`);
}
const yakin = (a: number | null, b: number, e = 1e-9) => a !== null && Math.abs(a - b) < e;

// ── Birim çember ──────────────────────────────────────────────────────────
test("birim çember: P(cos α, sin α), tan (x=1), cot (y=1), bölge işaretleri", () => {
  const d30 = birimCemberDegerleri(30);
  dogrula(yakin(d30.cos, Math.sqrt(3) / 2) && yakin(d30.sin, 0.5), "30°: P(√3/2, 1/2)");
  dogrula(d30.yazi.cos === "√3/2" && d30.yazi.sin === "1/2" && d30.yazi.tan === "√3/3" && d30.yazi.cot === "√3", `30° tam değerler: ${JSON.stringify(d30.yazi)}`);
  dogrula(d30.bolge === 1 && d30.isaret.tan === "+" && d30.isaret.cot === "+", "30° I. bölge");
  const d135 = birimCemberDegerleri(135);
  dogrula(d135.bolge === 2 && d135.isaret.sin === "+" && d135.isaret.cos === "−" && d135.isaret.tan === "−" && d135.isaret.cot === "−", "135° II. bölge: yalnız sin +");
  dogrula(d135.yazi.cos === "−√2/2" && d135.yazi.tan === "−1", `135° yazı: ${JSON.stringify(d135.yazi)}`);
  // tan α = T noktasının y'si: OP doğrusu x=1'i (1, tan α)'da keser
  dogrula(yakin(d135.tan, -1) && yakin(d135.cot, -1), "135°: tan = cot = −1");
  const d210 = birimCemberDegerleri(210);
  dogrula(d210.bolge === 3 && d210.isaret.tan === "+" && d210.isaret.cot === "+" && d210.isaret.sin === "−" && d210.isaret.cos === "−", "210° III. bölge: tan, cot +");
  dogrula(d210.yazi.sin === "−1/2" && d210.yazi.cos === "−√3/2", "210° tam değer");
  const d300 = birimCemberDegerleri(300);
  dogrula(d300.bolge === 4 && d300.isaret.cos === "+" && d300.isaret.sin === "−" && d300.isaret.tan === "−", "300° IV. bölge: yalnız cos +");
  const d90 = birimCemberDegerleri(90);
  dogrula(d90.bolge === null && d90.tan === null && d90.yazi.tan === "tanımsız" && d90.cot === 0 && d90.yazi.cot === "0", "90°: tan tanımsız, cot 0");
  const d180 = birimCemberDegerleri(180);
  dogrula(d180.cot === null && d180.tan === 0 && d180.cos === -1, "180°: cot tanımsız");
  dogrula(birimCemberDegerleri(-30).bolge === 4 && birimCemberDegerleri(390).yazi.sin === "1/2", "negatif ve 360° üstü açı indirgenir");
  const d20 = birimCemberDegerleri(20);
  dogrula(d20.yazi.sin === "0,342", `özel olmayan açıda ondalık: ${d20.yazi.sin}`);
  // her açıda sin² + cos² = 1 ve tan·cot = 1
  for (let a = -700; a <= 700; a += 37) {
    const d = birimCemberDegerleri(a);
    dogrula(Math.abs(d.sin ** 2 + d.cos ** 2 - 1) < 1e-12, `${a}°: sin²+cos²=1`);
    if (d.tan !== null && d.cot !== null) dogrula(Math.abs(d.tan * d.cot - 1) < 1e-9, `${a}°: tan·cot=1`);
  }
});

// ── İşaret tablosu ─────────────────────────────────────────────────────────
const isaretSirasi = (h: ReturnType<typeof isaretTablosuHesapla>) => ("hata" in h ? `HATA ${h.hata}` : h.isaretler.join(""));
const kokYazilari = (h: ReturnType<typeof isaretTablosuHesapla>) => ("hata" in h ? "" : h.kokler.map((k) => k.deger).join(" "));

test("işaret tablosu: polinom okuma", () => {
  dogrula(JSON.stringify(polinomOku("x^2-x-6")) === "[-6,-1,1]", "x²−x−6");
  dogrula(JSON.stringify(polinomOku("3-x")) === "[3,-1]", "3−x");
  dogrula(JSON.stringify(polinomOku("2x")) === "[0,2]", "2x");
  dogrula(polinomOku("x^2+") === null && polinomOku("x y") === null, "bozuk polinom");
});

test("işaret tablosu: x²−x−6 < 0 → kökler −2, 3; (−2, 3)", () => {
  const h = isaretTablosuHesapla("x^2-x-6", "<");
  dogrula(kokYazilari(h) === "−2 3", `kökler: ${kokYazilari(h)}`);
  dogrula(isaretSirasi(h) === "+-+", `işaretler: ${isaretSirasi(h)}`);
  const v = isaretTablosuVerisi("x^2-x-6", "<");
  dogrula(!("hata" in v) && v.cozum?.join() === "1", "çözüm orta aralık");
  dogrula(!("hata" in v) && cozumKumesiYaz(v.kokler, v.cozum!) === "(−2, 3)", `ÇK: ${!("hata" in v) && cozumKumesiYaz(v.kokler, v.cozum!)}`);
  const v2 = isaretTablosuVerisi("x^2-x-6", ">=");
  dogrula(!("hata" in v2) && cozumKumesiYaz(v2.kokler, v2.cozum!) === "(−∞, −2] ∪ [3, ∞)", "≥ 0 kapalı uçlar");
});

test("işaret tablosu: çift katlı kökte işaret değişmez, tanımsız nokta, en sağ = baş katsayı", () => {
  const h = isaretTablosuHesapla("(x+2)(x-1)^2/(x-4)", ">=");
  dogrula(!("hata" in h), "okunmalı");
  if ("hata" in h) return;
  dogrula(kokYazilari(h) === "−2 1 4", `kökler: ${kokYazilari(h)}`);
  dogrula(h.kokler[1].kat === "cift" && h.kokler[0].kat === "tek" && h.kokler[2].tanimsiz === true, "1 çift katlı, 4 tanımsız");
  dogrula(h.isaretler.join("") === "+--+", `işaretler: ${h.isaretler.join("")}`);
  dogrula(h.kokler[2].dahil !== true && h.kokler[0].dahil === true && h.kokler[1].dahil === true, "tanımsız nokta dahil olamaz");
  const v = isaretTablosuVerisi("(x+2)(x-1)^2/(x-4)", ">=", true);
  dogrula(!("hata" in v) && v.satirlar.length === 4 && v.satirlar[3].ad === "f(x)", "3 çarpan satırı + f(x)");
  dogrula(!("hata" in v) && v.satirlar[1].isaretler.join("") === "++++", `(x−1)² hep +: ${!("hata" in v) && v.satirlar[1].isaretler.join("")}`);
  dogrula(!("hata" in v) && v.satirlar[2].noktalar?.[2] === "||", "payda çarpanında || işareti");
  dogrula(!("hata" in v) && cozumKumesiYaz(v.kokler, v.cozum!) === "(−∞, −2] ∪ {1} ∪ (4, ∞)", `ÇK: ${!("hata" in v) && cozumKumesiYaz(v.kokler, v.cozum!)}`);
  // Baş katsayı negatifse en sağ aralık −
  dogrula(isaretSirasi(isaretTablosuHesapla("(3-x)(x+1)")) === "-+-", "−x² baş katsayı: en sağ −");
  dogrula(isaretSirasi(isaretTablosuHesapla("-2(x-1)^3")) === "+-", "üç katlı kök tek sayılır");
  dogrula(isaretSirasi(isaretTablosuHesapla("x^2+1")) === "+", "Δ<0: hep +");
  dogrula(isaretSirasi(isaretTablosuHesapla("(x-2)^2")) === "++", "tam kare");
  dogrula(isaretSirasi(isaretTablosuHesapla("x(x-2)/(x+1)^2")) === "++-+", `x(x−2)/(x+1)²: ${isaretSirasi(isaretTablosuHesapla("x(x-2)/(x+1)^2"))}`);
  dogrula(kokYazilari(isaretTablosuHesapla("2x^2-3x+1")) === "1/2 1", "kesirli kök");
  dogrula(kokYazilari(isaretTablosuHesapla("x^2-2x-1")) === "1 − √2 1 + √2", `irrasyonel kök: ${kokYazilari(isaretTablosuHesapla("x^2-2x-1"))}`);
  dogrula("hata" in isaretTablosuHesapla("x^3-2x+1"), "3. derece çarpanı reddeder");
  dogrula("hata" in isaretTablosuHesapla("(x+1)(x-2)+3"), "çarpanlara ayrılmamış ifade");
  dogrula("hata" in isaretTablosuHesapla("(x+1"), "parantez");
  // (x−1)² ≤ 0 → {1};  (x−1)² > 0 → (−∞,1) ∪ (1,∞)
  const t1 = isaretTablosuVerisi("(x-1)^2", "<=");
  dogrula(!("hata" in t1) && cozumKumesiYaz(t1.kokler, t1.cozum!) === "{1}", "tek nokta çözüm");
  const t2 = isaretTablosuVerisi("(x-1)^2", ">");
  dogrula(!("hata" in t2) && cozumKumesiYaz(t2.kokler, t2.cozum!) === "(−∞, 1) ∪ (1, ∞)", "1 hariç");
  const t3 = isaretTablosuVerisi("(x-1)^2", ">=");
  dogrula(!("hata" in t3) && cozumKumesiYaz(t3.kokler, t3.cozum!) === "ℝ", "tüm gerçel sayılar");
  const t4 = isaretTablosuVerisi("x^2+1", "<");
  dogrula(!("hata" in t4) && cozumKumesiYaz(t4.kokler, t4.cozum!) === "∅", "boş küme");
  // Sayısal sağlama: her aralığın test noktasında ifadenin işareti tabloyla aynı
  const f = (x: number) => ((x + 2) * (x - 1) ** 2) / (x - 4);
  for (const [x, i] of [[-3, 0], [0, 1], [2, 2], [5, 3]] as const) dogrula(Math.sign(f(x)) === (h.isaretler[i] === "+" ? 1 : -1), `x=${x} işareti`);
});

test("işaret tablosu: elle giriş kuralı, sıra uyarısı, doğrulayıcı", () => {
  const kokler: IsaretKoku[] = [{ deger: "-2", kat: "tek" }, { deger: "1", kat: "cift" }, { deger: "4", kat: "tek", tanimsiz: true }];
  dogrula(isaretleriKuralaGoreDoldur(kokler, "+").join("") === "+--+", "kural: çift katlıda değişmez");
  dogrula(isaretleriKuralaGoreDoldur(kokler, "-").join("") === "-++-", "en sağ − ise");
  dogrula(cozumAraliklari(["+", "-", "-", "+"], "<").join() === "1,2", "< 0 aralıkları");
  dogrula(kokSirasiUyarisi([{ deger: "3", kat: "tek" }, { deger: "1", kat: "tek" }]) !== null && kokSirasiUyarisi(kokler) === null, "sıra uyarısı");
  const v = isaretTablosuVerisi("x^2-x-6", "<") as SemaVerisi;
  dogrula(semaVerisiGecerliMi(v), "hesaplanan tablo geçerli");
  dogrula(!semaVerisiGecerliMi({ ...v, kokler: Array.from({ length: 9 }, () => ({ deger: "1", kat: "tek" })) }), "9 kök reddedilir");
  dogrula(!semaVerisiGecerliMi({ ...v, satirlar: [{ ad: "f", isaretler: ["*"] }] }), "geçersiz işaret reddedilir");
  dogrula(!semaVerisiGecerliMi({ ...v, satirlar: [] }), "satırsız tablo reddedilir");
});

// ── Fonksiyon ok diyagramı ─────────────────────────────────────────────────
test("fonksiyon şeması: fonksiyon / bire bir / örten", () => {
  const f = { a: ["1", "2", "3"], b: ["a", "b", "c"], oklar: [[0, 0], [1, 1], [2, 2]] as [number, number][] };
  dogrula(fonksiyonDurumu(f).fonksiyon && fonksiyonDurumu(f).birebir && fonksiyonDurumu(f).orten, "bire bir örten");
  const g = { ...f, b: ["a", "b", "c", "d"], oklar: [[0, 0], [1, 2], [2, 2]] as [number, number][] };
  const dg = fonksiyonDurumu(g);
  dogrula(dg.fonksiyon && !dg.birebir && !dg.orten && dg.ozet.includes("içine"), dg.ozet);
  const h = { ...f, oklar: [[0, 0], [0, 1], [1, 2], [2, 2]] as [number, number][] };
  dogrula(!fonksiyonDurumu(h).fonksiyon && fonksiyonDurumu(h).ozet.includes("birden çok görüntüsü"), "iki görüntü");
  const e = { ...f, oklar: [[0, 0], [1, 1]] as [number, number][] };
  dogrula(!fonksiyonDurumu(e).fonksiyon && fonksiyonDurumu(e).ozet.includes("3 elemanı eşlenmemiş"), "eşlenmeyen eleman");
  dogrula(JSON.stringify(oklariYenidenNumarala([[0, 0], [1, 2], [2, 1]], "a", 1)) === "[[0,0],[1,1]]", "A'dan silme");
  dogrula(JSON.stringify(oklariYenidenNumarala([[0, 0], [1, 2], [2, 1]], "b", 0)) === "[[1,1],[2,0]]", "B'den silme");
  const sema: SemaVerisi = { tur: "fonksiyonSema", adlar: ["A", "B"], fonkAd: "f", ...g };
  dogrula(semaVerisiGecerliMi(sema), "geçerli");
  dogrula(!semaVerisiGecerliMi({ ...sema, oklar: [[0, 9]] }), "aralık dışı ok reddedilir");
  dogrula(!semaVerisiGecerliMi({ ...sema, a: Array.from({ length: 9 }, (_, i) => String(i)) }), "9 eleman reddedilir");
});

// ── Venn ───────────────────────────────────────────────────────────────────
test("Venn: alt küme (iç içe) ve ayrık düzenler", () => {
  const k = { x: 0, y: 0, w: 300, h: 200 };
  const [A, B] = vennDaireleri(2, k, "altKume");
  dogrula(Math.hypot(A.x - B.x, A.y - B.y) + A.r < B.r - 2, "A, B'nin içinde (değmeden)");
  dogrula(vennBolgesi(2, [A, B], A.x, A.y) === 1 && vennBolgesi(2, [A, B], B.x + B.r * 0.8, B.y) === 2, "A içi = A∩B, B∖A");
  const [C, D] = vennDaireleri(2, k, "ayrik");
  dogrula(Math.hypot(C.x - D.x, C.y - D.y) > C.r + D.r + 4, "ayrık daireler kesişmez");
  dogrula(C.x - C.r >= k.x && D.x + D.r <= k.x + k.w, "kutuya sığar");
  dogrula(vennGorunurBolgeler(2, "altKume").join() === "1,2,3" && vennGorunurBolgeler(2, "ayrik").join() === "0,2,3", "görünür bölgeler");
  const eski = SEMA_SABLONLARI.find((s) => s.id === "venn2")!.olustur();
  dogrula(semaVerisiGecerliMi(eski) && !("duzen" in eski), "eski Venn alanı olmadan geçerli");
  dogrula(!semaVerisiGecerliMi({ ...eski, duzen: "kayik" } as unknown as SemaVerisi), "bilinmeyen düzen reddedilir");
});

// ── Olasılık ağacı (3 aşama) ───────────────────────────────────────────────
test("olasılık ağacı: 3 aşama yazım/okuma, sınırlar", () => {
  const sb = SEMA_SABLONLARI.find((s) => s.id === "agac3")!.olustur();
  dogrula(sb.tur === "agac" && agacDerinligi(sb.dallar) === 3 && agacYaprakSayisi(sb.dallar) === 8, "zar-para-zar: 3 aşama, 8 uç");
  dogrula(semaVerisiGecerliMi(sb), "3 aşamalı ağaç geçerli");
  if (sb.tur !== "agac") return;
  const metin = agacYaz(sb.dallar);
  dogrula(metin.includes("\n-- 6: 1/6"), `yazım: ${metin}`);
  const geri = agacOkuAyrinti(metin);
  dogrula("dallar" in geri && JSON.stringify(geri.dallar) === JSON.stringify(sb.dallar), "yaz → oku aynı ağaç");
  // Eski 2 aşamalı yazım değişmeden okunur
  const eski = agacOkuAyrinti("K: 1/3\n- K: 1/2\n- M: 1/2\nM: 2/3\n  K: 1/2");
  dogrula("dallar" in eski && eski.dallar[0].alt?.length === 2 && eski.dallar[1].alt?.length === 1, "eski yazım (tire/2 boşluk)");
  dogrula("hata" in agacOkuAyrinti("K: 1/2\n-- M: 1/2"), "3. aşama 2. aşamasız gelemez");
  dogrula("hata" in agacOkuAyrinti("K: 1\n- A: 1\n-- B: 1\n--- C: 1"), "4. aşama reddedilir");
  dogrula(JSON.stringify(agacSatirlari(sb.dallar).slice(0, 3).map((s) => s.asama)) === "[1,2,3]", "düz satırlar");
  const kur = agacKur([{ asama: 1, ad: "A", olasilik: "1/2" }, { asama: 2, ad: "B", olasilik: "1/3" }, { asama: 3, ad: "C", olasilik: "1" }, { asama: 2, ad: "D", olasilik: "2/3" }]);
  dogrula("dallar" in kur && kur.dallar[0].alt?.length === 2 && kur.dallar[0].alt[0].alt?.length === 1, "düz satırdan ağaç");
  // Sınırlar: derinlik 4 ve 36'dan fazla uç doğrulayıcıda reddedilir
  const derin: SemaVerisi = { tur: "agac", dallar: [{ ad: "a", olasilik: "1", alt: [{ ad: "b", olasilik: "1", alt: [{ ad: "c", olasilik: "1", alt: [{ ad: "d", olasilik: "1" }] }] }] }] };
  dogrula(!semaVerisiGecerliMi(derin), "4 aşama geçersiz");
  const alti = () => Array.from({ length: 6 }, (_, i) => ({ ad: String(i), olasilik: "1/6" }));
  const genis: SemaVerisi = { tur: "agac", dallar: alti().map((d) => ({ ...d, alt: alti().map((e) => ({ ...e, alt: alti() })) })) };
  dogrula(!semaVerisiGecerliMi(genis), "216 uç geçersiz");
});

// ── Şablonlar, doğrulama, boyut ────────────────────────────────────────────
test("şablonlar: geçerli, aranabilir, sekilGecerliMi'den geçer", () => {
  for (const sb of SEMA_SABLONLARI) {
    const v = sb.olustur();
    dogrula(semaVerisiGecerliMi(v), `${sb.id} geçersiz`);
    dogrula((sb.aramaKelimeleri ?? []).length >= 2, `${sb.id} arama kelimesi yok`);
    const b = semaBoyutu(v);
    const s = { id: "x", tur: "fizik", nesne: "sema", kalinlik: 3, x: 10, y: 10, w: b.w, h: b.h, sema: v } as Sekil;
    dogrula(sekilGecerliMi(s), `${sb.id}: sekilGecerliMi`);
  }
  for (const ad of ["birim30", "birim-tan", "isaret-x2", "isaret-rasyonel", "fonksiyon-ok", "venn-alt", "venn-ayrik", "agac3"]) {
    dogrula(SEMA_SABLONLARI.some((s) => s.id === ad), `${ad} şablonu yok`);
  }
  dogrula(MAT_GRAFIK_SABLONLARI.every((s) => (s.aramaKelimeleri ?? []).length > 0), "matematik grafik şablonları aranabilir");
  dogrula(GRAFIK_SABLONLARI.every((s) => (s.aramaKelimeleri ?? []).length > 0), "fizik grafik şablonları aranabilir");
  dogrula(!semaVerisiGecerliMi({ tur: "birimCember", aci: 1e9 }), "çok büyük açı reddedilir");
  dogrula(!semaVerisiGecerliMi({ tur: "birimCember", aci: 30, noktaAdi: "x".repeat(50) }), "uzun nokta adı reddedilir");
});

// ── Grafik piksel ↔ veri ───────────────────────────────────────────────────
test("grafik: piksel↔veri dönüşümü ve nokta taşıma (kılavuza yakalanır)", () => {
  const veri: GrafikVerisi = { egriler: [{ tur: "noktalar", noktalar: [{ x: 0, y: 0 }, { x: 4, y: 20 }, { x: 8, y: 20 }] }], xEtiket: "t", yEtiket: "v", xMin: 0, xMax: 10, yMin: 0, yMax: 25, xAdim: 2, yAdim: 5 };
  const kutu = { x: 100, y: 50, w: 300, h: 200 };
  const d = grafikPikselDonusumu(veri, kutu);
  dogrula(d.px(0) === 100 && d.px(10) === 400 && d.py(0) === 250 && d.py(25) === 50, "uçlar kutu kenarlarında");
  const p = d.veriye({ x: d.px(3.3), y: d.py(12.2) });
  dogrula(yakin(p.x, 3.3, 1e-9) && yakin(p.y, 12.2, 1e-9), "gidiş-dönüş");
  // Yakalama: x adımı 2 → yarım adım 1'e; y adımı 5 → 2,5'e
  const y1 = grafikNoktaTasi(veri, 0, 1, d.veriye({ x: d.px(5.2), y: d.py(13.4) }));
  const n1 = y1.egriler[0].tur === "noktalar" ? y1.egriler[0].noktalar[1] : null;
  dogrula(n1 && n1.x === 5 && n1.y === 12.5, `yakalanmış nokta: ${JSON.stringify(n1)}`);
  dogrula(veri.egriler[0].tur === "noktalar" && veri.egriler[0].noktalar[1].x === 4, "asıl veri değişmez (saf)");
  const y2 = grafikNoktaTasi(veri, 0, 1, { x: 5.23, y: 13.41 }, { yakala: false });
  dogrula(y2.egriler[0].tur === "noktalar" && y2.egriler[0].noktalar[1].x === 5.23, "yakalamasız");
  const y3 = grafikNoktaTasi(veri, 0, 1, { x: 1e12, y: -1e12 });
  dogrula(y3.egriler[0].tur === "noktalar" && Math.abs(y3.egriler[0].noktalar[1].x) <= 1e6, "aşırı değer sınıra kıstırılır");
  dogrula(grafikNoktaTasi(veri, 5, 0, { x: 1, y: 1 }) === veri && grafikNoktaTasi(veri, 0, 9, { x: 1, y: 1 }) === veri, "geçersiz indeks: aynı veri");
  // Adlı noktalar da taşınır
  const isr: GrafikVerisi = { egriler: [{ tur: "isaret", noktalar: [{ x: 1, y: 1, ad: "A" }] }], xEtiket: "x", yEtiket: "y", xMin: -5, xMax: 5, yMin: -5, yMax: 5, xAdim: 1, yAdim: 1 };
  const y4 = grafikNoktaTasi(isr, 0, 0, { x: 2.1, y: -2.9 });
  dogrula(y4.egriler[0].tur === "isaret" && y4.egriler[0].noktalar[0].x === 2 && y4.egriler[0].noktalar[0].y === -3 && y4.egriler[0].noktalar[0].ad === "A", "adlı nokta taşınır, ad korunur");
  // Otomatik pencere: px/py grafikCiz ile aynı (noktaların pikselleri kutunun içinde)
  const oto: GrafikVerisi = { ...veri, xMin: undefined, xMax: undefined, yMin: undefined, yMax: undefined, xAdim: undefined, yAdim: undefined };
  const d2 = grafikPikselDonusumu(oto, kutu);
  for (const q of [{ x: 0, y: 0 }, { x: 8, y: 20 }]) dogrula(d2.px(q.x) >= 100 && d2.px(q.x) <= 400 && d2.py(q.y) >= 50 && d2.py(q.y) <= 250, "oto pencere içinde");
  const noktalar = grafikPikselDonusumu(veri, kutu).noktaPikselleri(0);
  dogrula(noktalar.length === 3 && noktalar[1].x === d.px(4) && noktalar[1].y === d.py(20), "tutamaç pikselleri");
});

// ── PNG kırpma payı (gerçek rasterleştirici) ──────────────────────────────
test("PNG dışa aktarım: yeni şemaların mürekkebi içerik sınırında", () => {
  let tuvalUret: ((w: number, h: number) => { getContext(t: "2d"): unknown }) | null = null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  try { tuvalUret = require("@napi-rs/canvas").createCanvas; } catch { /* yok */ }
  if (!tuvalUret) { console.log("  (atlandı: @napi-rs/canvas yok)"); return; }
  const W = 1200, H = 900;
  const durumlar: [string, SemaVerisi, number?][] = SEMA_SABLONLARI.map((s) => [s.id, s.olustur()] as [string, SemaVerisi]);
  durumlar.push(["birim çember 0° (P sağ kenarda)", { tur: "birimCember", aci: 0, tan: true, cot: true, bolgeler: true }]);
  durumlar.push(["birim çember 80° tan dışarı", { tur: "birimCember", aci: 80, tan: true, cot: true, aciEtiketi: "80°" }]);
  durumlar.push(["birim çember −400°", { tur: "birimCember", aci: -400, tan: true, cot: true, bolgeler: true }]);
  durumlar.push(["birim çember 30° (90° döndürülmüş)", { tur: "birimCember", aci: 30, tan: true, cot: true }, 90]);
  durumlar.push(["işaret tablosu (uzun kökler)", { tur: "isaretTablosu", kokler: [{ deger: "1 − √2", kat: "tek" }, { deger: "123456", kat: "cift", dahil: true }, { deger: "−7/3", kat: "tek", tanimsiz: true }], satirlar: [{ ad: "x^2-2x-1", isaretler: ["+", "-", "-", "+"] }, { ad: "f(x)", isaretler: ["+", "-", "-", "+"] }], cozum: [1, 2], cozumSatiri: true, katGoster: true }]);
  durumlar.push(["fonksiyon şeması (8 eleman)", { tur: "fonksiyonSema", adlar: ["Tanım", "Değer"], fonkAd: "f", a: Array.from({ length: 8 }, (_, i) => `eleman${i}`), b: Array.from({ length: 8 }, (_, i) => `değer${i}`), oklar: Array.from({ length: 8 }, (_, i) => [i, 7 - i] as [number, number]) }]);
  durumlar.push(["ağaç 3 aşama uzun adlar", { tur: "agac", dallar: [{ ad: "Kırmızı top", olasilik: "1/3", alt: [{ ad: "Mavi top", olasilik: "1/2", alt: [{ ad: "Yeşil top", olasilik: "1/4" }] }] }] }]);
  for (const [ad, v, donus] of durumlar) {
    const b = semaBoyutu(v);
    const s = { id: "s", tur: "fizik", nesne: "sema", kalinlik: 3, x: 400, y: 300, w: b.w, h: b.h, sema: { ...v, baslik: "Başlık" }, ...(donus ? { donus } : {}) } as Sekil;
    const tuval = tuvalUret(W, H);
    const ctx = tuval.getContext("2d") as CanvasRenderingContext2D;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
    sekilleriCiz(ctx, [s]);
    const veri = ctx.getImageData(0, 0, W, H).data;
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
      const i = (y * W + x) * 4;
      if (veri[i] < 245 || veri[i + 1] < 245 || veri[i + 2] < 245) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    dogrula(x1 >= 0, `${ad}: hiç çizilmedi`);
    const sinir = cizimIcerikSiniri(ctx, [s], 14, { w: W, h: H });
    dogrula(x0 >= sinir.x && y0 >= sinir.y && x1 + 1 <= sinir.x + sinir.w && y1 + 1 <= sinir.y + sinir.h,
      `${ad}: mürekkep [${x0},${y0}–${x1},${y1}] içerik sınırının [${sinir.x},${sinir.y} ${sinir.w}×${sinir.h}] dışında`);
  }
  // Sahte ctx ile de çökmeden çizilir (önizleme)
  const sahte = new Proxy({} as Record<string, unknown>, {
    get(h, a: string) { if (a === "measureText") return (m: string) => ({ width: m.length * 8 }); if (a in h) return h[a]; return () => undefined; },
    set(h, a: string, d) { h[a] = d; return true; },
  }) as unknown as CanvasRenderingContext2D;
  for (const sb of SEMA_SABLONLARI) semaCiz(sahte, { id: "o", tur: "fizik", nesne: "sema", kalinlik: 3, x: 0, y: 0, w: 300, h: 190, sema: sb.olustur() } as Extract<Sekil, { tur: "fizik" }>);
});

console.log(`TÜM v1.2 M SENARYOLARI BAŞARILI (${sayac} test)`);
