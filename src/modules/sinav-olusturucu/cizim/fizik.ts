// Fizik şekil kütüphanesi: kütle, makara, eğik düzlem, devre elemanları, mercek…
//
// NEDEN AYRI DOSYA: `ciz.ts` zaten 580 satır ve akış şeması kutusunu taşıyor.
// Fizik nesneleri otuz kadar küçük çizim rutini — hepsi tek bir kutuya
// (x, y, w, h) sığar ve React'ten bağımsızdır, bu yüzden testi bileşeni
// yüklemeden yapılabilir.
//
// ETİKET DİLİ: `m_1`, `v^2`, `v_{0x}`, `\theta`, `\Delta t`. Formülü baştan
// blok blok kurmak yerine ŞEKLİN ÜSTÜNDE hızlıca yazmak için; ağır denklemler
// (kesir, kök, integral) yine denklem editöründen gelir. Sınıf-içi kullanım:
// bağlayıcı etiketleri de aynı yazıyı kullanır (`T_1`, `F_{sür}`).

import type { FizikEtiketYeri, FizikNesnesi, Nokta, Sekil } from "./tipler";
import { MUREKKEP } from "./sabitler";
import { izgaraBoyutu } from "./geometri";
import { grafikCiz, grafikEtiketPayi, varsayilanGrafik } from "./grafik";
import { istatistikCiz, istatistikPayi, varsayilanIstatistik } from "./istatistik";
import { semaCiz, semaPayi, varsayilanSema } from "./sema";
import { KIMYA_LAB_NESNELERI, KIMYA_LAB_TANIMLARI, kimyaCiz, kimyaLabCiz, kimyaPayi, varsayilanKimya } from "./kimya";
import { geometriCiz, geometriIsaretiCiz } from "./geometriSekilleri";
import { fizikEkCiz } from "./fizikEk";
import { YUNANCA } from "../yunanHarfleri";

type FizikSekli = Extract<Sekil, { tur: "fizik" }>;

// ── Katalog ────────────────────────────────────────────────────────────────

export type FizikTanimi = {
  ad: string;
  grup: FizikGrubu;
  /** Yeni eklenen nesnenin varsayılan ölçüsü (tuval birimi). */
  w: number;
  h: number;
  /** Etiketin kutuya göre konumu (öğretmen sonradan değiştirebilir). */
  etiketYeri: FizikEtiketYeri;
  /** Eklenirken hazır gelen etiket; boşsa etiketsiz. */
  etiket: string;
  /** Çevresi elips/daire: bağlayıcı düz çizgide kenara bu şekilde oturur. */
  elips?: boolean;
  /** Başka gruplarda da listelenir (ör. açı yayı: Geometri + Mekanik + Optik). */
  ekGruplar?: FizikGrubu[];
  ipucu: string;
};

export type FizikGrubu = "mekanik" | "elektrik" | "optik" | "vektor" | "grafik" | "matematik" | "geometri" | "kimya" | "diger";

export const FIZIK_GRUPLARI: { id: FizikGrubu; ad: string }[] = [
  { id: "mekanik", ad: "Mekanik" },
  { id: "elektrik", ad: "Elektrik" },
  { id: "optik", ad: "Optik" },
  { id: "vektor", ad: "Vektör / Izgara" },
  { id: "grafik", ad: "Grafik" },
  { id: "matematik", ad: "Matematik / İstatistik" },
  { id: "geometri", ad: "Geometri" },
  { id: "kimya", ad: "Kimya" },
  { id: "diger", ad: "Diğer" },
];

export const FIZIK_TANIMLARI: Record<FizikNesnesi, FizikTanimi> = {
  kutle: { ad: "Kütle", grup: "mekanik", w: 90, h: 60, etiketYeri: "ic", etiket: "m", ipucu: "Dikdörtgen blok — içine kütle yazılır" },
  kure: { ad: "Küre / Top", grup: "mekanik", w: 70, h: 70, etiketYeri: "ic", etiket: "m", elips: true, ipucu: "Daire biçimli cisim" },
  egikDuzlem: { ad: "Eğik düzlem", grup: "mekanik", w: 260, h: 150, etiketYeri: "ic", etiket: "\\theta", ipucu: "Dik üçgen takoz; açı yayı ve etiketi hazır. Yönü çevir ile değişir" },
  makara: { ad: "Makara", grup: "mekanik", w: 70, h: 70, etiketYeri: "ust", etiket: "", elips: true, ipucu: "Sabit makara — ipi sol/sağ yönden bağlayın" },
  araba: { ad: "Araba", grup: "mekanik", w: 120, h: 60, etiketYeri: "ic", etiket: "M", ipucu: "Tekerlekli araba/vagon" },
  nokta: { ad: "Nokta cisim", grup: "mekanik", w: 14, h: 14, etiketYeri: "ust", etiket: "A", elips: true, ipucu: "Noktasal kütle / konum işareti" },
  yay: { ad: "Yay", grup: "mekanik", w: 140, h: 40, etiketYeri: "ust", etiket: "k", ipucu: "Tek başına yay. İki şekli yayla bağlamak için Bağlantı > Yay" },
  kap: { ad: "Kap", grup: "mekanik", w: 110, h: 130, etiketYeri: "alt", etiket: "", ipucu: "Üstü açık kap; Dolgu seçilirse sıvı gösterilir" },
  duvar: { ad: "Duvar", grup: "mekanik", w: 22, h: 170, etiketYeri: "alt", etiket: "", ipucu: "Taralı sabit duvar (yüzü sağda; Çevir ile solda)" },
  zemin: { ad: "Zemin", grup: "mekanik", w: 300, h: 22, etiketYeri: "alt", etiket: "", ipucu: "Taralı zemin çizgisi" },
  tavan: { ad: "Tavan", grup: "mekanik", w: 300, h: 22, etiketYeri: "ust", etiket: "", ipucu: "Taralı tavan — makara/yay asmak için" },
  direnc: { ad: "Direnç", grup: "elektrik", w: 100, h: 34, etiketYeri: "ust", etiket: "R", ipucu: "Zikzaklı direnç" },
  pil: { ad: "Pil / Üreteç", grup: "elektrik", w: 80, h: 44, etiketYeri: "ust", etiket: "\\varepsilon", ipucu: "Uzun çizgi (+), kısa kalın çizgi (−). Çevir ile kutup değişir" },
  ampul: { ad: "Ampul", grup: "elektrik", w: 90, h: 44, etiketYeri: "ust", etiket: "L", elips: true, ipucu: "Çarpılı daire" },
  anahtarAcik: { ad: "Anahtar (açık)", grup: "elektrik", w: 90, h: 36, etiketYeri: "ust", etiket: "K", ipucu: "Açık anahtar" },
  anahtarKapali: { ad: "Anahtar (kapalı)", grup: "elektrik", w: 90, h: 36, etiketYeri: "ust", etiket: "K", ipucu: "Kapalı anahtar" },
  kondansator: { ad: "Sığaç", grup: "elektrik", w: 70, h: 50, etiketYeri: "ust", etiket: "C", ipucu: "Paralel iki levha" },
  bobin: { ad: "Bobin", grup: "elektrik", w: 110, h: 36, etiketYeri: "alt", etiket: "L", ipucu: "Sarmallı bobin" },
  ampermetre: { ad: "Ampermetre", grup: "elektrik", w: 90, h: 44, etiketYeri: "ust", etiket: "", elips: true, ipucu: "İçinde A yazan daire" },
  voltmetre: { ad: "Voltmetre", grup: "elektrik", w: 90, h: 44, etiketYeri: "ust", etiket: "", elips: true, ipucu: "İçinde V yazan daire" },
  mercekTumsek: { ad: "İnce kenarlı mercek", grup: "optik", w: 40, h: 170, etiketYeri: "alt", etiket: "", ipucu: "Yakınsak (ince kenarlı) mercek" },
  mercekCukur: { ad: "Kalın kenarlı mercek", grup: "optik", w: 40, h: 170, etiketYeri: "alt", etiket: "", ipucu: "Iraksak (kalın kenarlı) mercek" },
  aynaCukur: { ad: "Çukur ayna", grup: "optik", w: 50, h: 170, etiketYeri: "alt", etiket: "", ipucu: "Yansıtan yüz solda; Çevir ile sağda" },
  aynaTumsek: { ad: "Tümsek ayna", grup: "optik", w: 50, h: 170, etiketYeri: "alt", etiket: "", ipucu: "Yansıtan yüz solda; Çevir ile sağda" },
  aynaDuzlem: { ad: "Düzlem ayna", grup: "optik", w: 30, h: 170, etiketYeri: "alt", etiket: "", ipucu: "Arkası taralı düz ayna" },
  prizma: { ad: "Prizma", grup: "optik", w: 150, h: 130, etiketYeri: "alt", etiket: "", ipucu: "Üçgen prizma" },
  miknatis: { ad: "Mıknatıs", grup: "diger", w: 140, h: 44, etiketYeri: "ust", etiket: "", ipucu: "N–S çubuk mıknatıs" },
  yukArti: { ad: "(+) Yük", grup: "diger", w: 46, h: 46, etiketYeri: "alt", etiket: "q", elips: true, ipucu: "Artı yüklü küre" },
  yukEksi: { ad: "(−) Yük", grup: "diger", w: 46, h: 46, etiketYeri: "alt", etiket: "-q", elips: true, ipucu: "Eksi yüklü küre" },
  vektorKuvvet: { ad: "Kuvvet", grup: "vektor", w: 110, h: 26, etiketYeri: "ust", etiket: "F", ipucu: "Kuvvet vektörü: boyunu ve yönünü kutu tutamaçlarıyla/döndürmeyle ayarlayın" },
  vektorHiz: { ad: "Hız", grup: "vektor", w: 110, h: 26, etiketYeri: "ust", etiket: "v", ipucu: "Hız vektörü" },
  vektorIvme: { ad: "İvme", grup: "vektor", w: 110, h: 26, etiketYeri: "ust", etiket: "a", ipucu: "İvme vektörü (çift çizgili)" },
  vektorBilesen: { ad: "Bileşen", grup: "vektor", w: 110, h: 26, etiketYeri: "ust", etiket: "F_x", ipucu: "Kesikli bileşen vektörü" },
  kareliAlan: { ad: "Kareli alan", grup: "vektor", w: 200, h: 150, etiketYeri: "alt", etiket: "", ipucu: "Vektör çizmek için kareli zemin: satır/sütun, hücre boyu, renk seçilir. Vektör ucunu köşelere tıklayarak koyun" },
  grafik: { ad: "Grafik", grup: "grafik", w: 300, h: 190, etiketYeri: "alt", etiket: "", ipucu: "Eksenli grafik: konum/hız/ivme–zaman, sinüs. Şablon seçin ya da noktaları yazın" },
  istatistik: { ad: "İstatistik grafiği", grup: "matematik", w: 320, h: 200, etiketYeri: "alt", etiket: "", ipucu: "Sütun, çubuk, daire, çizgi, histogram, kutu, gövde–yaprak: tabloya sayıları yazın" },
  sema: { ad: "Şema", grup: "matematik", w: 300, h: 200, etiketYeri: "alt", etiket: "", ipucu: "Venn (2–3 küme), olasılık ağacı, sayı doğrusu" },
  ...(Object.fromEntries(
    KIMYA_LAB_NESNELERI.map((n) => [n, { ad: KIMYA_LAB_TANIMLARI[n].ad, grup: "kimya", w: KIMYA_LAB_TANIMLARI[n].w, h: KIMYA_LAB_TANIMLARI[n].h, etiketYeri: "alt", etiket: "", ipucu: KIMYA_LAB_TANIMLARI[n].ipucu }]),
  ) as Record<(typeof KIMYA_LAB_NESNELERI)[number], FizikTanimi>),
  kimya: { ad: "Atom / Molekül / Periyodik tablo", grup: "kimya", w: 200, h: 200, etiketYeri: "alt", etiket: "", ipucu: "Bohr atomu, Lewis yapısı, periyodik tablo" },
  // Geometri
  ucgenABC: { ad: "Üçgen ABC", grup: "geometri", w: 220, h: 170, etiketYeri: "alt", etiket: "", ipucu: "Köşe adlı genel üçgen: kenar uzunlukları ya da iki kenar + açı; açı yayı, dik açı, eş kenar işareti, yükseklik" },
  dikUcgen: { ad: "Dik üçgen + yükseklik", grup: "geometri", w: 220, h: 180, etiketYeri: "alt", etiket: "", ipucu: "A'da dik açılı üçgen; hipotenüse AH yüksekliği" },
  benzerUcgen: { ad: "Benzer üçgenler", grup: "geometri", w: 300, h: 170, etiketYeri: "alt", etiket: "", ipucu: "DE ∥ BC (Thales) ya da yan yana benzer üçgenler; eş açı yayları" },
  cemberGeo: { ad: "Çember (kiriş, teğet)", grup: "geometri", w: 220, h: 220, etiketYeri: "alt", etiket: "", elips: true, ipucu: "Merkez, kiriş, çap, teğet, merkez ve çevre açı; adlar ve konumlar değişir" },
  cokgenAd: { ad: "Çokgen (köşe adlı)", grup: "geometri", w: 200, h: 200, etiketYeri: "alt", etiket: "", ipucu: "Düzgün 3–12 gen; köşe adları, köşegen, merkez, eş kenar işareti" },
  aciYayi: { ad: "Açı yayı", grup: "geometri", ekGruplar: ["mekanik", "optik"], w: 150, h: 110, etiketYeri: "alt", etiket: "", ipucu: "İki kol ve derece etiketli açı yayı. Derece panelden; etiket boşsa derece yazılır" },
  dikAci: { ad: "Dik açı işareti", grup: "geometri", ekGruplar: ["mekanik"], w: 70, h: 70, etiketYeri: "alt", etiket: "", ipucu: "İki kol ve dik açı karesi" },
  esIsaret: { ad: "Eş kenar işareti", grup: "geometri", w: 100, h: 24, etiketYeri: "alt", etiket: "", ipucu: "Doğru parçası ortasında 1–3 tırtık (eş uzunluk işareti)" },
  // Fizik ek şekilleri
  isinOk: { ad: "Işın + ara ok", grup: "optik", w: 170, h: 26, etiketYeri: "ust", etiket: "", ipucu: "Işın çizgisi; üzerinde yön oku (1–4 ara ok). Döndürerek eğik ışın yapın" },
  halkaAkim: { ad: "Halka akım", grup: "elektrik", w: 210, h: 170, etiketYeri: "alt", etiket: "", ipucu: "Halka akımın kesiti (⊙ ⊗) ve manyetik alan çizgileri. Yön ayarı panelden" },
  solenoid: { ad: "Solenoid", grup: "elektrik", w: 290, h: 150, etiketYeri: "alt", etiket: "", ipucu: "Sarımlı bobin; iç alan çizgileri ve dış dönüş çizgileri (yön, sarım sayısı panelden)" },
  telAlan: { ad: "Düz tel alanı", grup: "elektrik", w: 170, h: 170, etiketYeri: "alt", etiket: "", elips: true, ipucu: "Telin kesiti (⊙ ya da ⊗) ve çevresinde eş merkezli alan çizgileri, oklu" },
  alanNokta: { ad: "⊗ ⊙ alanı", grup: "elektrik", w: 200, h: 120, etiketYeri: "ust", etiket: "B", ipucu: "Sayfaya giren (⊗) ya da çıkan (⊙) düzgün manyetik alan; satır/sütun panelden" },
  dalgaGirisim: { ad: "Girişim deseni", grup: "optik", w: 270, h: 180, etiketYeri: "alt", etiket: "", ipucu: "İki kaynaklı dalga girişimi: dalga cepheleri ve (isteğe bağlı) sönüm çizgileri" },
  enerjiDuzeyi: { ad: "Enerji düzeyleri", grup: "optik", ekGruplar: ["diger"], w: 290, h: 210, etiketYeri: "alt", etiket: "", ipucu: "Bohr/atom enerji düzeyleri ve geçiş okları (ışıma/soğurma); düzeyleri panelden yazın" },
  dugum: { ad: "Düğüm noktası", grup: "elektrik", w: 11, h: 11, etiketYeri: "ust", etiket: "", elips: true, ipucu: "Devrede T-bağlantı noktası (dolu nokta); teller buna bağlanır" },
  koordinat: { ad: "Eksen takımı", grup: "diger", w: 260, h: 180, etiketYeri: "ic", etiket: "v|t", ipucu: "Grafik için eksenler. Etiket: dikey|yatay (ör. v|t)" },
};

/** Eksen sayısı/başlık gibi kutunun DIŞINA taşan yazıların payı (yeni şekil yerleşimi için). */
export function fizikDisPayi(nesne: FizikNesnesi): { sol: number; ust: number; sag: number; alt: number } {
  if (nesne === "grafik") return grafikEtiketPayi({ etiket: "" } as FizikSekli);
  if (nesne === "istatistik") return istatistikPayi();
  if (nesne === "sema") return semaPayi();
  if (nesne === "kimya") return kimyaPayi();
  return { sol: 0, ust: 0, sag: 0, alt: 0 };
}

export function fizikElipsMi(nesne: FizikNesnesi): boolean {
  return FIZIK_TANIMLARI[nesne]?.elips === true;
}

export function fizikNesnesiGecerliMi(nesne: unknown): nesne is FizikNesnesi {
  return typeof nesne === "string" && Object.prototype.hasOwnProperty.call(FIZIK_TANIMLARI, nesne);
}

// ── Etiket yazımı: m_1, v^2, \theta ────────────────────────────────────────



export type MetinParcasi = {
  t: string;
  /** n: düz · alt/ust: indis · ok: üstünde vektör oku · cizgi: üstçizgi ·
   *  istif: üstte `t`, altta `t2` (⁵⁶₂₆Fe) · daire: ⊗ (t="x") ya da ⊙ (t=".") */
  m: "n" | "alt" | "ust" | "ok" | "cizgi" | "istif" | "daire";
  t2?: string;
  /** istif: önünde taban yok (⁵⁶₂₆Fe): sayılar sağa yaslanır; tabanlıda (SO₄²⁻) sola. */
  tabansiz?: boolean;
};

/** İyon yükü / üs işareti: "2-" → "2−", "-1" → "−1" (kısa tire değil eksi). */
function eksiDuzelt(t: string) {
  return t.replace(/^-(?=\d|$)/, "−").replace(/(\d)-$/, "$1−");
}

/** ^ ya da _ işaretinin (i konumunda) OPERANDI: `{…}`, `\yunan`, rakam dizisi ya da tek karakter. */
function simgeOperandi(metin: string, i: number): { t: string; son: number } | null {
  const yunancaCoz = (s: string) => s.replace(/\\([A-Za-z]+)/g, (tum, ad: string) => YUNANCA[ad] ?? tum);
  if (metin[i + 1] === "{") {
    const kapanis = metin.indexOf("}", i + 2);
    if (kapanis > 0) return { t: eksiDuzelt(yunancaCoz(metin.slice(i + 2, kapanis))), son: kapanis + 1 };
  }
  // Tek karakter ya da \yunan: `m_1`, `x^2`, `v_\theta`
  const kalan = metin.slice(i + 1);
  const yn = /^\\([A-Za-z]+)/.exec(kalan);
  if (yn) return { t: YUNANCA[yn[1]] ?? yn[0], son: i + 1 + yn[0].length };
  if (kalan.length > 0) {
    // Rakam dizisi bir bütün: `x^10` → üs "10"; harf tek karakter.
    const sayi = /^[0-9]+/.exec(kalan);
    const alinan = sayi ? sayi[0] : kalan[0] === "-" && /^-[0-9]/.test(kalan) ? kalan.slice(0, 2) : kalan[0];
    return { t: eksiDuzelt(alinan), son: i + 1 + alinan.length };
  }
  return null;
}

/**
 * `m_1`, `x^2`, `v_{0x}`, `\theta` gibi yazımı parçalara ayırır.
 * Kaçış: `\_` ve `\^` düz karakter olarak kalır. Bilinmeyen `\kelime` olduğu
 * gibi bırakılır (sessizce yutmak, öğretmenin yazdığını gizlemek olurdu).
 *
 * Ek yazımlar:
 *   `\vec{F}`  `vec(F)`  `\vec F`  F⃗ (birleşik ok U+20D7)   harfin ÜSTÜNDE ok
 *   `\bar{x}`  `\overline{x}`                                üstçizgi
 *   `^{56}_{26}Fe`  `_{26}^{56}Fe`   tabansız çift simge: aynı yerde ÜST ÜSTE
 *   `\otimes` `\odot` (ve ⊗ ⊙)       daire içinde çarpı / nokta (canvas'ta çizilir)
 */
export function fizikMetniParcala(metin: string): MetinParcasi[] {
  const sonuc: MetinParcasi[] = [];
  const ekle = (t: string, m: "n" | "alt" | "ust") => {
    if (!t) return;
    const son = sonuc[sonuc.length - 1];
    if (son && son.m === m) son.t += t;
    else sonuc.push({ t, m });
  };
  /** `vec(F_1)`: düz kısım okla işaretlenir, indis ("_1") sonrasında kalır. */
  const okParcalari = (ic: string, m: "ok" | "cizgi" = "ok") => {
    for (const q of fizikMetniParcala(ic)) sonuc.push(q.m === "n" ? { ...q, m } : q);
  };
  let i = 0;
  while (i < metin.length) {
    const c = metin[i];
    // Birleşik ok (F⃗): harfi okla birlikte tek parça yap.
    if (metin[i + 1] === "⃗" && c !== "\\") {
      sonuc.push({ t: c, m: "ok" });
      i += 2;
      continue;
    }
    if (c === "⊗" || c === "⊙") {
      sonuc.push({ t: c === "⊗" ? "x" : ".", m: "daire" });
      i += 1;
      continue;
    }
    // `vec(F)`: yalnız tam kelime başında.
    if (c === "v" && !/[A-Za-z]/.test(metin[i - 1] ?? "")) {
      const v = /^vec\(([^)]*)\)/.exec(metin.slice(i));
      if (v) {
        okParcalari(v[1]);
        i += v[0].length;
        continue;
      }
    }
    if (c === "\\") {
      const sonraki = metin[i + 1];
      if (sonraki === "_" || sonraki === "^" || sonraki === "\\") {
        ekle(sonraki, "n");
        i += 2;
        continue;
      }
      const vektor = /^\\(vec|overrightarrow|bar|overline)\s*(?:\{([^}]*)\}|([A-Za-zͰ-Ͽ]))/.exec(metin.slice(i));
      if (vektor) {
        okParcalari(vektor[2] ?? vektor[3], vektor[1] === "vec" || vektor[1] === "overrightarrow" ? "ok" : "cizgi");
        i += vektor[0].length;
        continue;
      }
      const daire = /^\\(otimes|odot)(?![A-Za-z])/.exec(metin.slice(i));
      if (daire) {
        sonuc.push({ t: daire[1] === "otimes" ? "x" : ".", m: "daire" });
        i += daire[0].length;
        continue;
      }
      const eslesme = /^\\([A-Za-z]+)/.exec(metin.slice(i));
      if (eslesme) {
        ekle(YUNANCA[eslesme[1]] ?? eslesme[0], "n");
        i += eslesme[0].length;
        continue;
      }
    }
    if (c === "_" || c === "^") {
      const mod = c === "_" ? "alt" : "ust";
      const op = simgeOperandi(metin, i);
      if (op) {
        // Yan yana ^ ve _ : AYNI yerde ÜST ÜSTE (SO₄²⁻, x₁², ⁵⁶₂₆Fe). Öncesinde
        // harf/rakam yoksa (tabansız) sayılar sağa yaslanır.
        const oncekiKarakter = metin[i - 1] ?? "";
        const tabansiz = oncekiKarakter === "" || /[\s([+\-−=·×,;:]/.test(oncekiKarakter);
        const karsi = c === "^" ? "_" : "^";
        if (metin[op.son] === karsi) {
          const op2 = simgeOperandi(metin, op.son);
          if (op2) {
            sonuc.push({ t: c === "^" ? op.t : op2.t, t2: c === "^" ? op2.t : op.t, m: "istif", tabansiz });
            i = op2.son;
            continue;
          }
        }
        ekle(op.t, mod);
        i = op.son;
        continue;
      }
    }
    ekle(c, "n");
    i += 1;
  }
  return sonuc;
}

const ALT_USTE_OLCEK = 0.7;
const SATIR_ARALIGI = 1.25;

function fizikFontu(punto: number, italik = false) {
  return `${italik ? "italic " : ""}${punto}px "Times New Roman", Times, serif`;
}

function daireYaricapi(punto: number) {
  return punto * 0.42;
}

/** Bir parçanın genişliği (ctx yazı tipi bu fonksiyon içinde ayarlanır). */
function parcaGenisligi(ctx: CanvasRenderingContext2D, p: MetinParcasi, punto: number): number {
  if (p.m === "daire") return daireYaricapi(punto) * 2 + punto * 0.14;
  if (p.m === "istif") {
    ctx.font = fizikFontu(punto * ALT_USTE_OLCEK);
    return Math.max(ctx.measureText(p.t).width, ctx.measureText(p.t2 ?? "").width);
  }
  const boy = p.m === "alt" || p.m === "ust" ? punto * ALT_USTE_OLCEK : punto;
  ctx.font = fizikFontu(boy);
  const w = ctx.measureText(p.t).width;
  return p.m === "ok" || p.m === "cizgi" ? Math.max(w, punto * 0.3) : w;
}

/** Tek satırın genişliği (ctx yazı tipi bu fonksiyon içinde ayarlanır). */
function satirGenisligi(ctx: CanvasRenderingContext2D, satir: string, punto: number): number {
  let w = 0;
  for (const p of fizikMetniParcala(satir)) w += parcaGenisligi(ctx, p, punto);
  return w;
}

/** Bir parçayı çizer; (cx, cy) = sol-orta ("middle" taban çizgisi). Genişliği döndürür. */
function parcaCiz(ctx: CanvasRenderingContext2D, p: MetinParcasi, cx: number, cy: number, punto: number): number {
  const w = parcaGenisligi(ctx, p, punto);
  if (p.m === "daire") {
    const r = daireYaricapi(punto);
    const mx = cx + w / 2;
    ctx.save();
    ctx.lineWidth = Math.max(1, punto * 0.07);
    ctx.strokeStyle = ctx.fillStyle as string;
    ctx.beginPath();
    ctx.arc(mx, cy + punto * 0.02, r, 0, Math.PI * 2);
    ctx.stroke();
    if (p.t === "x") {
      const d = r * 0.68;
      ctx.beginPath();
      ctx.moveTo(mx - d, cy + punto * 0.02 - d);
      ctx.lineTo(mx + d, cy + punto * 0.02 + d);
      ctx.moveTo(mx + d, cy + punto * 0.02 - d);
      ctx.lineTo(mx - d, cy + punto * 0.02 + d);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(mx, cy + punto * 0.02, Math.max(1.2, r * 0.22), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return w;
  }
  if (p.m === "istif") {
    ctx.font = fizikFontu(punto * ALT_USTE_OLCEK);
    ctx.textAlign = p.tabansiz ? "right" : "left";
    const ix = p.tabansiz ? cx + w : cx;
    ctx.fillText(p.t, ix, cy - punto * 0.38);
    ctx.fillText(p.t2 ?? "", ix, cy + punto * 0.22);
    ctx.textAlign = "left";
    return w;
  }
  const boy = p.m === "alt" || p.m === "ust" ? punto * ALT_USTE_OLCEK : punto;
  ctx.font = fizikFontu(boy);
  const dy = p.m === "alt" ? punto * 0.22 : p.m === "ust" ? -punto * 0.38 : 0;
  const metinW = ctx.measureText(p.t).width;
  ctx.fillText(p.t, cx + (w - metinW) / 2, cy + dy);
  if (p.m === "ok" || p.m === "cizgi") {
    const y = cy - punto * 0.5;
    const x1 = cx + punto * 0.04;
    const x2 = cx + w - punto * 0.04;
    ctx.save();
    ctx.lineWidth = Math.max(1, punto * 0.06);
    ctx.strokeStyle = ctx.fillStyle as string;
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    if (p.m === "ok") {
      const ok = punto * 0.17;
      ctx.moveTo(x2 - ok, y - ok * 0.6);
      ctx.lineTo(x2, y);
      ctx.lineTo(x2 - ok, y + ok * 0.6);
    }
    ctx.stroke();
    ctx.restore();
  }
  return w;
}

/**
 * Serbest metin etiketinin BİR satırını çizer (sol-TABAN çapa: x = sol, taban = yazının taban çizgisi).
 * Şekil etiketleriyle AYNI yazım: alt/üst simge, vektör oku, ⊗ ⊙, ⁵⁶₂₆Fe istifi.
 */
export function fizikSatiriTabandanCiz(ctx: CanvasRenderingContext2D, satir: string, x: number, taban: number, punto: number) {
  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const cy = taban - punto * 0.34;
  let cx = x;
  for (const p of fizikMetniParcala(satir)) cx += parcaCiz(ctx, p, cx, cy, punto);
  ctx.restore();
}

/** Serbest metin satırının genişliği (sinirlar.ts ölçümü ile çizim aynı hesabı kullanır). */
export function fizikSatirGenisligi(ctx: CanvasRenderingContext2D, satir: string, punto: number): number {
  ctx.save();
  const w = satirGenisligi(ctx, satir, punto);
  ctx.restore();
  return w;
}

export function fizikMetniOlcu(
  ctx: CanvasRenderingContext2D,
  metin: string,
  punto: number,
): { w: number; h: number; satirlar: string[] } {
  const satirlar = metin.split("\n");
  const w = Math.max(0, ...satirlar.map((s) => satirGenisligi(ctx, s, punto)));
  return { w, h: satirlar.length * punto * SATIR_ARALIGI, satirlar };
}

/**
 * Etiketi çizer. (x, y) = bloğun merkezi (hiza "orta") ya da sol-orta / sağ-orta
 * noktası. Alt/üst simge asıl satırın taban çizgisine göre kayar.
 */
export function fizikMetniCiz(
  ctx: CanvasRenderingContext2D,
  metin: string,
  x: number,
  y: number,
  punto: number,
  hiza: "orta" | "sol" | "sag" = "orta",
  renk?: string,
  /** Verilirse: metin bundan genişse önce yazı küçülür (en çok 9 punto'ya), yine sığmazsa "…" ile kesilir. */
  enCokGenislik?: number,
) {
  if (enCokGenislik !== undefined && enCokGenislik > 0) {
    const ilk = fizikMetniOlcu(ctx, metin, punto);
    if (ilk.w > enCokGenislik) {
      const kucuk = Math.max(9, Math.floor(punto * (enCokGenislik / ilk.w)));
      const ikinci = fizikMetniOlcu(ctx, metin, kucuk);
      if (ikinci.w <= enCokGenislik) return fizikMetniCiz(ctx, metin, x, y, kucuk, hiza, renk);
      const kisa = metin.split("\n").map((sat) => {
        const sw = satirGenisligi(ctx, sat, kucuk);
        return sw <= enCokGenislik ? sat : `${sat.slice(0, Math.max(1, Math.floor(sat.length * (enCokGenislik / sw)) - 1))}…`;
      }).join("\n");
      return fizikMetniCiz(ctx, kisa, x, y, kucuk, hiza, renk);
    }
  }
  const { w, h, satirlar } = fizikMetniOlcu(ctx, metin, punto);
  const satirYuk = punto * SATIR_ARALIGI;
  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = renk ?? MUREKKEP;
  satirlar.forEach((satir, si) => {
    const sw = satirGenisligi(ctx, satir, punto);
    let cx = hiza === "orta" ? x - sw / 2 : hiza === "sol" ? x : x - sw;
    const cy = y - h / 2 + satirYuk * (si + 0.5);
    for (const p of fizikMetniParcala(satir)) cx += parcaCiz(ctx, p, cx, cy, punto);
  });
  ctx.restore();
  return { w, h };
}

// ── Zikzak (yay, direnç) ───────────────────────────────────────────────────

/**
 * Bir doğru üzerinde zikzak: iki ucu düz "kuyruk", ortası `halka` kadar diş.
 * Yay bağlayıcısı ve direnç/yay nesneleri aynı rutini kullanır.
 */
export function zigzagNoktalari(bas: Nokta, son: Nokta, halka: number, genlik: number, kuyruk = 0.14): Nokta[] {
  const dx = son.x - bas.x;
  const dy = son.y - bas.y;
  const uzunluk = Math.hypot(dx, dy);
  if (uzunluk < 1e-6) return [bas, son];
  const ux = dx / uzunluk;
  const uy = dy / uzunluk;
  const nx = -uy;
  const ny = ux;
  // Kısa mesafede kuyruk dişlere yer bırakmalı.
  const k = Math.min(kuyruk * uzunluk, 40);
  const govde = Math.max(0, uzunluk - 2 * k);
  const noktalar: Nokta[] = [bas, { x: bas.x + ux * k, y: bas.y + uy * k }];
  for (let i = 0; i < halka; i += 1) {
    const t = (i + 0.5) / halka;
    const yon = i % 2 === 0 ? 1 : -1;
    noktalar.push({
      x: bas.x + ux * (k + govde * t) + nx * genlik * yon,
      y: bas.y + uy * (k + govde * t) + ny * genlik * yon,
    });
  }
  noktalar.push({ x: son.x - ux * k, y: son.y - uy * k }, son);
  return noktalar;
}

// ── Nesne çizimi ───────────────────────────────────────────────────────────

function cizgi(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function yol(ctx: CanvasRenderingContext2D, noktalar: Nokta[]) {
  ctx.beginPath();
  noktalar.forEach((n, i) => (i === 0 ? ctx.moveTo(n.x, n.y) : ctx.lineTo(n.x, n.y)));
  ctx.stroke();
}

function doldurVeCiz(ctx: CanvasRenderingContext2D, dolgu: string | undefined, bos?: string) {
  // Varsayılan dolgu YOK: beyaz dolgu yan yana/üst üste şekillerin ve bağlantı
  // uçlarının çizgisini gizliyordu. Öğretmen isterse Dolgu seçer.
  const renk = dolgu ?? bos;
  if (renk) {
    ctx.fillStyle = renk;
    ctx.fill();
  }
  ctx.stroke();
  ctx.fillStyle = MUREKKEP;
}

function okBasi(ctx: CanvasRenderingContext2D, uc: Nokta, aci: number, boy: number) {
  ctx.beginPath();
  ctx.moveTo(uc.x, uc.y);
  ctx.lineTo(uc.x - boy * Math.cos(aci - Math.PI / 7), uc.y - boy * Math.sin(aci - Math.PI / 7));
  ctx.lineTo(uc.x - boy * Math.cos(aci + Math.PI / 7), uc.y - boy * Math.sin(aci + Math.PI / 7));
  ctx.closePath();
  ctx.fill();
}

/** Kutu içinde kırpılmış tarama çizgileri (duvar/zemin/tavan/ayna). */
function taramaCiz(
  ctx: CanvasRenderingContext2D,
  kutu: { x: number; y: number; w: number; h: number },
  cizgiler: [number, number, number, number][],
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(kutu.x, kutu.y, kutu.w, kutu.h);
  ctx.clip();
  ctx.lineWidth = Math.max(1, ctx.lineWidth * 0.7);
  for (const [x1, y1, x2, y2] of cizgiler) cizgi(ctx, x1, y1, x2, y2);
  ctx.restore();
}

const TARAMA_ARALIGI = 10;

/** Yaylı aynada eğri üzerindeki nokta (ikinci dereceden Bézier). */
function bezier2(p0: Nokta, c: Nokta, p2: Nokta, t: number): Nokta {
  const u = 1 - t;
  return { x: u * u * p0.x + 2 * u * t * c.x + t * t * p2.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p2.y };
}

function aynaTaramasi(ctx: CanvasRenderingContext2D, p0: Nokta, c: Nokta, p2: Nokta, kutuH: number) {
  const adet = Math.max(2, Math.floor(kutuH / TARAMA_ARALIGI));
  const ciz: [number, number, number, number][] = [];
  let enSol = Infinity;
  for (let i = 0; i <= adet; i += 1) {
    const p = bezier2(p0, c, p2, i / adet);
    enSol = Math.min(enSol, p.x);
    ciz.push([p.x, p.y, p.x + 9, p.y + 7]);
  }
  // Kırpma yalnız altta/üstte taşan çizgi uçlarını keser; yatayda geniş bırakılır.
  taramaCiz(ctx, { x: enSol - 2, y: p0.y, w: 400, h: kutuH }, ciz);
}

/** Dönüşsüz ve ayna'sız çıplak gövde. `s` kutusunun içine çizer. */
function govdeCiz(ctx: CanvasRenderingContext2D, s: FizikSekli) {
  const { x, y, w, h } = s;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const kalinlik = s.kalinlik;
  switch (s.nesne) {
    case "kutle":
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      doldurVeCiz(ctx, s.dolgu);
      return;
    case "kure":
      ctx.beginPath();
      ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
      doldurVeCiz(ctx, s.dolgu);
      return;
    case "egikDuzlem": {
      ctx.beginPath();
      ctx.moveTo(x, y + h);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x + w, y);
      ctx.closePath();
      doldurVeCiz(ctx, s.dolgu);
      const aci = Math.atan2(h, w);
      const r = Math.min(w, h) * 0.22;
      ctx.beginPath();
      ctx.arc(x, y + h, r, -aci, 0);
      ctx.stroke();
      return;
    }
    case "makara": {
      const r = Math.min(w, h) / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      doldurVeCiz(ctx, s.dolgu);
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.62, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(2, r * 0.12), 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    case "araba": {
      const gov = h * 0.72;
      const r = h * 0.14;
      ctx.beginPath();
      ctx.rect(x, y, w, gov);
      doldurVeCiz(ctx, s.dolgu);
      for (const tx of [x + w * 0.22, x + w * 0.78]) {
        ctx.beginPath();
        ctx.arc(tx, y + h - r, r, 0, Math.PI * 2);
        doldurVeCiz(ctx, undefined);
      }
      return;
    }
    case "nokta":
      ctx.beginPath();
      ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    case "yay":
      yol(ctx, zigzagNoktalari({ x, y: cy }, { x: x + w, y: cy }, 8, h * 0.4, 0.12));
      return;
    case "kap": {
      if (s.dolgu) {
        ctx.fillStyle = s.dolgu;
        ctx.fillRect(x, y + h * 0.4, w, h * 0.6);
        ctx.fillStyle = MUREKKEP;
      }
      yol(ctx, [{ x, y }, { x, y: y + h }, { x: x + w, y: y + h }, { x: x + w, y }]);
      return;
    }
    case "duvar": {
      cizgi(ctx, x + w, y, x + w, y + h);
      const c: [number, number, number, number][] = [];
      for (let yy = y - w; yy <= y + h; yy += TARAMA_ARALIGI) c.push([x + w, yy, x, yy + w]);
      taramaCiz(ctx, { x, y, w, h }, c);
      return;
    }
    case "zemin": {
      cizgi(ctx, x, y, x + w, y);
      const c: [number, number, number, number][] = [];
      for (let xx = x; xx <= x + w + h; xx += TARAMA_ARALIGI) c.push([xx, y, xx - h, y + h]);
      taramaCiz(ctx, { x, y, w, h }, c);
      return;
    }
    case "tavan": {
      cizgi(ctx, x, y + h, x + w, y + h);
      const c: [number, number, number, number][] = [];
      for (let xx = x; xx <= x + w + h; xx += TARAMA_ARALIGI) c.push([xx, y + h, xx - h, y]);
      taramaCiz(ctx, { x, y, w, h }, c);
      return;
    }
    case "direnc":
      yol(ctx, zigzagNoktalari({ x, y: cy }, { x: x + w, y: cy }, 6, h * 0.38, 0.2));
      return;
    case "pil": {
      const g = Math.max(3, w * 0.06);
      cizgi(ctx, x, cy, cx - g, cy);
      cizgi(ctx, cx + g, cy, x + w, cy);
      cizgi(ctx, cx - g, cy - h * 0.45, cx - g, cy + h * 0.45);
      ctx.lineWidth = kalinlik * 2.4;
      cizgi(ctx, cx + g, cy - h * 0.22, cx + g, cy + h * 0.22);
      return;
    }
    case "ampul": {
      const r = Math.min(h / 2, w * 0.3);
      cizgi(ctx, x, cy, cx - r, cy);
      cizgi(ctx, cx + r, cy, x + w, cy);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      doldurVeCiz(ctx, s.dolgu);
      const d = r * Math.SQRT1_2;
      cizgi(ctx, cx - d, cy - d, cx + d, cy + d);
      cizgi(ctx, cx - d, cy + d, cx + d, cy - d);
      return;
    }
    case "anahtarAcik":
    case "anahtarKapali": {
      const sol = x + w * 0.2;
      const sag = x + w * 0.8;
      cizgi(ctx, x, cy, sol, cy);
      cizgi(ctx, sag, cy, x + w, cy);
      for (const px of [sol, sag]) {
        ctx.beginPath();
        ctx.arc(px, cy, Math.max(2.5, kalinlik * 1.4), 0, Math.PI * 2);
        ctx.fill();
      }
      if (s.nesne === "anahtarKapali") cizgi(ctx, sol, cy, sag, cy);
      else cizgi(ctx, sol, cy, x + w * 0.7, cy - h * 0.55);
      return;
    }
    case "kondansator": {
      const g = Math.max(4, w * 0.09);
      cizgi(ctx, x, cy, cx - g, cy);
      cizgi(ctx, cx + g, cy, x + w, cy);
      cizgi(ctx, cx - g, cy - h * 0.42, cx - g, cy + h * 0.42);
      cizgi(ctx, cx + g, cy - h * 0.42, cx + g, cy + h * 0.42);
      return;
    }
    case "bobin": {
      const bas = x + w * 0.16;
      const son = x + w * 0.84;
      const halka = 4;
      const seg = (son - bas) / halka;
      cizgi(ctx, x, cy, bas, cy);
      cizgi(ctx, son, cy, x + w, cy);
      for (let i = 0; i < halka; i += 1) {
        ctx.beginPath();
        ctx.arc(bas + seg * (i + 0.5), cy, seg / 2, Math.PI, Math.PI * 2);
        ctx.stroke();
      }
      return;
    }
    case "ampermetre":
    case "voltmetre": {
      const r = Math.min(h / 2, w * 0.3);
      cizgi(ctx, x, cy, cx - r, cy);
      cizgi(ctx, cx + r, cy, x + w, cy);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      doldurVeCiz(ctx, s.dolgu);
      return;
    }
    case "mercekTumsek": {
      ctx.beginPath();
      ctx.moveTo(cx, y);
      ctx.quadraticCurveTo(x - w * 0.1, cy, cx, y + h);
      ctx.quadraticCurveTo(x + w * 1.1, cy, cx, y);
      ctx.closePath();
      if (s.dolgu) { ctx.fillStyle = s.dolgu; ctx.fill(); ctx.fillStyle = MUREKKEP; }
      ctx.stroke();
      return;
    }
    case "mercekCukur": {
      const ic = w * 0.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.quadraticCurveTo(x + w - ic * 1.1, cy, x + w, y + h);
      ctx.lineTo(x, y + h);
      ctx.quadraticCurveTo(x + ic * 1.1, cy, x, y);
      ctx.closePath();
      if (s.dolgu) { ctx.fillStyle = s.dolgu; ctx.fill(); ctx.fillStyle = MUREKKEP; }
      ctx.stroke();
      return;
    }
    case "aynaCukur": {
      const p0 = { x, y };
      const p2 = { x, y: y + h };
      const c = { x: x + w * 1.2, y: cy };
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.quadraticCurveTo(c.x, c.y, p2.x, p2.y);
      ctx.stroke();
      aynaTaramasi(ctx, p0, c, p2, h);
      return;
    }
    case "aynaTumsek": {
      const ucX = x + w * 0.6;
      const p0 = { x: ucX, y };
      const p2 = { x: ucX, y: y + h };
      const c = { x: x - w * 0.6, y: cy };
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.quadraticCurveTo(c.x, c.y, p2.x, p2.y);
      ctx.stroke();
      aynaTaramasi(ctx, p0, c, p2, h);
      return;
    }
    case "aynaDuzlem": {
      const lx = x + w * 0.2;
      cizgi(ctx, lx, y, lx, y + h);
      const c: [number, number, number, number][] = [];
      for (let yy = y; yy <= y + h; yy += TARAMA_ARALIGI) c.push([lx, yy, lx + 10, yy + 8]);
      taramaCiz(ctx, { x: lx, y, w: 20, h }, c);
      return;
    }
    case "prizma":
      ctx.beginPath();
      ctx.moveTo(cx, y);
      ctx.lineTo(x, y + h);
      ctx.lineTo(x + w, y + h);
      ctx.closePath();
      if (s.dolgu) { ctx.fillStyle = s.dolgu; ctx.fill(); ctx.fillStyle = MUREKKEP; }
      ctx.stroke();
      return;
    case "miknatis": {
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.fillStyle = "#cbd5e1";
      ctx.fillRect(cx, y, w / 2, h);
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.stroke();
      cizgi(ctx, cx, y, cx, y + h);
      ctx.fillStyle = MUREKKEP;
      return;
    }
    case "yukArti":
    case "yukEksi": {
      const r = Math.min(w, h) / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      doldurVeCiz(ctx, s.dolgu);
      cizgi(ctx, cx - r * 0.5, cy, cx + r * 0.5, cy);
      if (s.nesne === "yukArti") cizgi(ctx, cx, cy - r * 0.5, cx, cy + r * 0.5);
      return;
    }
    case "vektorKuvvet":
    case "vektorHiz":
    case "vektorIvme":
    case "vektorBilesen": {
      const orta = y + h / 2;
      const kalin = s.nesne === "vektorKuvvet" ? 1.5 : 1.2;
      ctx.save();
      if (s.renk) { ctx.strokeStyle = s.renk; ctx.fillStyle = s.renk; }
      ctx.lineWidth = s.kalinlik * kalin;
      const boy = 9 + s.kalinlik * 2;
      if (s.nesne === "vektorIvme") {
        const f = Math.max(2.2, s.kalinlik * 1.2);
        cizgi(ctx, x, orta - f, x + w - boy, orta - f);
        cizgi(ctx, x, orta + f, x + w - boy, orta + f);
      } else {
        if (s.nesne === "vektorBilesen") ctx.setLineDash([6, 4]);
        cizgi(ctx, x, orta, x + w - boy * 0.6, orta);
      }
      ctx.setLineDash([]);
      okBasi(ctx, { x: x + w, y: orta }, 0, boy);
      ctx.restore();
      return;
    }
    case "kareliAlan": {
      const { satir, sutun } = izgaraBoyutu(s);
      ctx.save();
      ctx.strokeStyle = s.renk ?? "#b9c3cf";
      ctx.lineWidth = s.izgaraKalinlik ?? 1;
      ctx.lineCap = "butt";
      const ic = s.cerceve === false ? 1 : 0;
      for (let c = ic; c <= sutun - ic; c += 1) cizgi(ctx, x + (w * c) / sutun, y, x + (w * c) / sutun, y + h);
      for (let r = ic; r <= satir - ic; r += 1) cizgi(ctx, x, y + (h * r) / satir, x + w, y + (h * r) / satir);
      ctx.restore();
      return;
    }
    case "grafik":
      grafikCiz(ctx, s);
      return;
    case "istatistik":
      istatistikCiz(ctx, s);
      return;
    case "sema":
      semaCiz(ctx, s);
      return;
    case "beher": case "erlenmayer": case "balonJoje": case "mezur": case "denemeTupu":
    case "buret": case "ayirmaHunisi": case "bunsenBeki": case "huni": case "damitma":
      kimyaLabCiz(ctx, s);
      return;
    case "damlalik": case "gazKabi":
      kimyaLabCiz(ctx, s);
      return;
    case "kimya":
      kimyaCiz(ctx, s);
      return;
    case "ucgenABC": case "dikUcgen": case "benzerUcgen": case "cemberGeo": case "cokgenAd":
      geometriCiz(ctx, s);
      return;
    case "aciYayi": case "dikAci": case "esIsaret":
      geometriIsaretiCiz(ctx, s);
      return;
    case "isinOk": case "halkaAkim": case "solenoid": case "telAlan": case "alanNokta": case "dalgaGirisim": case "enerjiDuzeyi":
      fizikEkCiz(ctx, s);
      return;
    case "dugum":
      ctx.beginPath();
      ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    case "koordinat": {
      const sag = x + w;
      const alt = y + h;
      cizgi(ctx, x, alt, x, y + 4);
      cizgi(ctx, x, alt, sag - 4, alt);
      okBasi(ctx, { x, y }, -Math.PI / 2, 11);
      okBasi(ctx, { x: sag, y: alt }, 0, 11);
      return;
    }
    default: {
      // Yeni bir `FizikNesnesi` eklenip buraya `case` yazılmazsa DERLEME hatası:
      // `s.nesne` burada `never` olmak zorunda.
      const eksik: never = s.nesne;
      void eksik;
    }
  }
}

/**
 * Gövdenin İÇİNDEKİ harfler (A, V, N, S). Gövde döndürülüp aynalanırken harf
 * de dönerse 90° çevrilmiş ampermetrede "A" yan yatardı; bu yüzden harfin
 * YERİ gövdeyle birlikte taşınır ama harfin kendisi hep düz yazılır.
 */
function govdeYazilariCiz(ctx: CanvasRenderingContext2D, s: FizikSekli) {
  const { x, y, w, h } = s;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const harfler: { t: string; px: number; py: number; boy: number }[] = [];
  if (s.nesne === "ampermetre" || s.nesne === "voltmetre") {
    const r = Math.min(h / 2, w * 0.3);
    harfler.push({ t: s.nesne === "ampermetre" ? "A" : "V", px: cx, py: cy + r * 0.06, boy: r * 1.15 });
  } else if (s.nesne === "miknatis") {
    // Aynalı mıknatısta gri yarım solda: harfler yer değiştirir.
    harfler.push({ t: s.ayna ? "S" : "N", px: x + w / 4, py: cy + h * 0.03, boy: h * 0.5 });
    harfler.push({ t: s.ayna ? "N" : "S", px: x + (w * 3) / 4, py: cy + h * 0.03, boy: h * 0.5 });
  }
  if (!harfler.length) return;
  const r = ((s.donus ?? 0) * Math.PI) / 180;
  ctx.save();
  ctx.fillStyle = MUREKKEP;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const hf of harfler) {
    // Aynalama yatay eksende: gövdede x merkeze göre yansır, sonra dönüş.
    let px = s.ayna ? 2 * cx - hf.px : hf.px;
    let py = hf.py;
    if (Math.abs(r) > 1e-4) {
      const dx = px - cx;
      const dy = py - cy;
      px = cx + dx * Math.cos(r) - dy * Math.sin(r);
      py = cy + dx * Math.sin(r) + dy * Math.cos(r);
    }
    ctx.font = `bold ${Math.round(hf.boy)}px "Times New Roman", Times, serif`;
    ctx.fillText(hf.t, px, py);
  }
  ctx.restore();
}

type EtiketKonumu = { x: number; y: number; hiza: "orta" | "sol" | "sag" };

/** Etiketin DÖNMEMİŞ, aynalanmamış kutuya göre yeri. */
function etiketKonumu(s: FizikSekli, punto: number): EtiketKonumu {
  const { x, y, w, h } = s;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const yer = s.etiketYeri ?? FIZIK_TANIMLARI[s.nesne].etiketYeri;
  if (yer === "ic") {
    if (s.nesne === "egikDuzlem") {
      const r = Math.min(w, h) * 0.22;
      return { x: x + r * 1.55, y: y + h - r * 0.42, hiza: "orta" };
    }
    return { x: cx, y: cy, hiza: "orta" };
  }
  if (yer === "ust") return { x: cx, y: y - punto * 0.85, hiza: "orta" };
  if (yer === "alt") return { x: cx, y: y + h + punto * 0.85, hiza: "orta" };
  if (yer === "sag") return { x: x + w + 8, y: cy, hiza: "sol" };
  return { x: x - 8, y: cy, hiza: "sag" };
}

export const FIZIK_ETIKET_PUNTO = 18;

/**
 * Fizik nesnesini tam olarak çizer: gövde (aynalı/dönük) + DİK duran etiket.
 * Etiket döndürmeden sonra çizilir — 90° döndürülmüş direncin "R"si yan yatmasın.
 */
export function fizikCiz(ctx: CanvasRenderingContext2D, s: FizikSekli) {
  const merkezX = s.x + s.w / 2;
  const merkezY = s.y + s.h / 2;
  const donus = s.donus ?? 0;
  const punto = FIZIK_ETIKET_PUNTO;

  ctx.save();
  ctx.translate(merkezX, merkezY);
  if (Math.abs(donus) >= 0.01) ctx.rotate((donus * Math.PI) / 180);
  if (s.ayna) ctx.scale(-1, 1);
  ctx.translate(-merkezX, -merkezY);
  ctx.strokeStyle = MUREKKEP;
  ctx.fillStyle = MUREKKEP;
  ctx.lineWidth = s.kalinlik;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.setLineDash(s.cizgiTipi === "kesik" ? [8, 5] : []);
  govdeCiz(ctx, s);
  ctx.restore();
  ctx.setLineDash([]);
  govdeYazilariCiz(ctx, s);

  const etiket = s.etiket?.trim();
  if (!etiket) return;
  // Grafikte başlık (etiket) grafiğin kendi çiziminde, eksen sayılarının altında.
  if (s.nesne === "grafik" || s.nesne === "istatistik" || s.nesne === "sema" || s.nesne === "kimya") return;
  // Geometri şekilleri ve açı yayı etiketlerini köşeye/yaya bağlı kendileri çizer.
  if (["ucgenABC", "dikUcgen", "benzerUcgen", "cemberGeo", "cokgenAd", "aciYayi"].includes(s.nesne)) return;

  if (s.nesne === "koordinat") {
    const [dikey, yatay] = etiket.split("|");
    if (dikey?.trim()) fizikMetniCiz(ctx, dikey.trim(), s.x, s.y - punto * 0.7, punto);
    if (yatay?.trim()) fizikMetniCiz(ctx, yatay.trim(), s.x + s.w + 8, s.y + s.h, punto, "sol");
    return;
  }

  // Etiket yerel (dönmemiş/aynasız) koordinatta hesaplanıp aynı dönüşümle
  // dünyaya taşınır; yazının kendisi ise düz çizilir.
  const k = etiketKonumu(s, punto);
  let px = k.x;
  const py = k.y;
  let hiza = k.hiza;
  if (s.ayna) {
    px = 2 * merkezX - px;
    hiza = hiza === "sol" ? "sag" : hiza === "sag" ? "sol" : hiza;
  }
  let dunya = { x: px, y: py };
  if (Math.abs(donus) >= 0.01) {
    const r = (donus * Math.PI) / 180;
    const dx = px - merkezX;
    const dy = py - merkezY;
    dunya = { x: merkezX + dx * Math.cos(r) - dy * Math.sin(r), y: merkezY + dx * Math.sin(r) + dy * Math.cos(r) };
    // Dönmüş şekilde yan hizalı etiket yönünü kaybeder: ortaya al.
    if (hiza !== "orta") hiza = "orta";
  }
  fizikMetniCiz(ctx, etiket, dunya.x, dunya.y, punto, hiza, s.nesne.startsWith("vektor") ? s.renk : undefined);
}

/** Araç çubuğundaki küçük önizleme: nesneyi (w×h) kutusuna sığdırıp etiketsiz çizer. */
export function fizikSimgeCiz(ctx: CanvasRenderingContext2D, nesne: FizikNesnesi, w: number, h: number) {
  const t = FIZIK_TANIMLARI[nesne];
  const pay = 3;
  const olcek = Math.min((w - pay * 2) / t.w, (h - pay * 2) / t.h);
  const gw = t.w * olcek;
  const gh = t.h * olcek;
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.translate((w - gw) / 2, (h - gh) / 2);
  ctx.scale(olcek, olcek);
  ctx.strokeStyle = "#334155";
  ctx.fillStyle = "#334155";
  ctx.lineWidth = Math.max(1.2, 1.4 / olcek);
  const simge: FizikSekli = {
    id: "simge", tur: "fizik", nesne, kalinlik: Math.max(1.2, 1.4 / olcek), x: 0, y: 0, w: t.w, h: t.h,
    ...(nesne === "grafik" ? { grafik: { ...varsayilanGrafik(), sade: true } } : {}),
    ...(nesne === "istatistik" ? { istatistik: { ...varsayilanIstatistik(), sade: true } } : {}),
    ...(nesne === "sema" ? { sema: varsayilanSema() } : {}),
    ...(nesne === "kimya" ? { kimya: varsayilanKimya() } : {}),
  };
  govdeCiz(ctx, simge);
  govdeYazilariCiz(ctx, simge);
  ctx.restore();
}
