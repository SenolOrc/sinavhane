// "Hazır Soru Sahneleri" — fizik düzenekleri (kayıt: `sahneler.ts` → HAZIR_SAHNELER).
//
// İKİ TÜR SAHNE:
// 1. BİRLEŞİK (mevcut nesneler + bağlayıcılar): eğik düzlem + tepe makarası + iki
//    kütle, Atwood, palanga, tam elektrik devresi. Öğretmen her parçayı sonradan
//    tek tek seçip düzenleyebilir; ipler/teller şekillere TUTUNUR (taşıyınca gelir).
//    Konumlar geometriyle hesaplanır: kütle eğik yüzeye tam paralel (açı = takozun
//    gerçek açısı), ip makaraya TEĞET (bağlayıcı makarada teğet noktasını kendisi
//    bulur; konumlar ipin tam eğime paralel / tam düşey düşeceği yerde), Atwood ve
//    palanga ipleri düşey.
// 2. TEK HESAPLI NESNE (egikKuvvet, optikDuzenek, siviKabi) hazır ayarlarla:
//    kuvvet okları, ışınlar ve görüntü, denge yükseklikleri veriden hesaplanır.
//
// Bu dosya yalnız VERİ üretir (çizim fonksiyonu içe aktarmaz) — modül döngüsü olmasın.

import type { BaglayiciYonu, EgikKuvvetVerisi, OptikVerisi, Sekil, SiviVerisi } from "./tipler";

type FizikSekli = Extract<Sekil, { tur: "fizik" }>;
type Baglayici = Extract<Sekil, { tur: "baglayici" }>;

export type FizikHazirSahne = {
  id: string;
  ad: string;
  ipucu: string;
  aramaKelimeleri: string[];
  olustur: () => Sekil[];
};

function kimlikUretici(on: string) {
  let n = 0;
  return () => `${on}-${(n += 1)}`;
}

function fizik(id: string, nesne: FizikSekli["nesne"], x: number, y: number, w: number, h: number, ek: Partial<FizikSekli> = {}): FizikSekli {
  return { id, tur: "fizik", nesne, kalinlik: 2, x, y, w, h, ...ek };
}

function ip(id: string, kaynak: Baglayici["kaynak"], hedef: Baglayici["hedef"], stil: Baglayici["stil"] = "duz"): Baglayici {
  return { id, tur: "baglayici", kalinlik: 2, kaynak, hedef, okUcu: "yok", ...(stil !== "dik" ? { stil } : {}) };
}

const uc = (sekilId: string, yon: BaglayiciYonu) => ({ sekilId, yon });

/** Ekranda istenen yönün, şeklin `donus` derecesi altında YEREL `hedefYerel` kenarına düşmesi için gereken ekran yönü. */
function ekranYonu(hedefYerel: "ust" | "sag" | "alt" | "sol", donus: number): "ust" | "sag" | "alt" | "sol" {
  const sira = ["ust", "sag", "alt", "sol"] as const;
  const adim = Math.round(donus / 90);
  return sira[(((sira.indexOf(hedefYerel) + adim) % 4) + 4) % 4];
}

// ── Eğik düzlem + tepe makarası + iki kütle ────────────────────────────────

export function egikMakaraSahnesi(aciDerece = 30): Sekil[] {
  const id = kimlikUretici("egm");
  const a = (aciDerece * Math.PI) / 180;
  const X = 40, W = 300, H = W * Math.tan(a), Y = 40;
  const duzlem = fizik(id(), "egikDuzlem", X, Y, W, H, { etiket: "\\alpha" });
  const A = { x: X, y: Y + H };
  const T = { x: X + W, y: Y };
  const yukari = { x: Math.cos(a), y: -Math.sin(a) };
  const normal = { x: -Math.sin(a), y: -Math.cos(a) };
  const Lh = Math.hypot(W, H);
  // m1: eğik yüzeye tam paralel; alt yüzü yüzeyde.
  const bw = 70, bh = 44;
  const t = Lh * 0.45;
  const S = { x: A.x + yukari.x * t, y: A.y + yukari.y * t };
  const M1 = { x: S.x + normal.x * bh / 2, y: S.y + normal.y * bh / 2 };
  const donus = -aciDerece;
  const m1 = fizik(id(), "kutle", M1.x - bw / 2, M1.y - bh / 2, bw, bh, { donus, etiket: "m_1" });
  // Makara: ip doğrusu (m1 merkezinden eğime paralel) makaraya ÜSTTEN teğet olsun diye
  // merkez bu doğrudan r kadar içeride; tepe köşesinin biraz ilerisinde.
  const r = 18;
  const ileri = 22;
  const Pc = { x: T.x + normal.x * (bh / 2 - r) + yukari.x * ileri, y: T.y + normal.y * (bh / 2 - r) + yukari.y * ileri };
  const makara = fizik(id(), "makara", Pc.x - r, Pc.y - r, 2 * r, 2 * r);
  const destek: Sekil = { id: id(), tur: "dogru", kalinlik: 2, x1: T.x, y1: T.y, x2: Pc.x, y2: Pc.y };
  // m2: makaranın sağ teğetinden düşey sarkar.
  const m2w = 44;
  const m2 = fizik(id(), "kutle", Pc.x + r - m2w / 2, Pc.y + 92, m2w, m2w, { etiket: "m_2" });
  const zemin = fizik(id(), "zemin", X - 20, Y + H, (Pc.x + 70) - (X - 20), 22);
  const ip1 = ip(id(), uc(m1.id, ekranYonu("sag", donus)), uc(makara.id, "ust"));
  const ip2 = ip(id(), uc(makara.id, "sag"), uc(m2.id, "ust"));
  return [zemin, duzlem, destek, makara, m1, m2, ip1, ip2];
}

// ── Atwood (sabit makara) ──────────────────────────────────────────────────

export function atwoodSahnesi(): Sekil[] {
  const id = kimlikUretici("atw");
  const tavan = fizik(id(), "tavan", 0, 0, 220, 22);
  const cx = 110, cy = 84, r = 30;
  const aski: Sekil = { id: id(), tur: "dogru", kalinlik: 2, x1: cx, y1: 22, x2: cx, y2: cy };
  const makara = fizik(id(), "makara", cx - r, cy - r, 2 * r, 2 * r);
  const mw = 48;
  const m1 = fizik(id(), "kutle", cx - r - mw / 2, 190, mw, 48, { etiket: "m_1" });
  const m2 = fizik(id(), "kutle", cx + r - mw / 2, 240, mw, 48, { etiket: "m_2" });
  return [tavan, aski, makara, m1, m2, ip(id(), uc(makara.id, "sol"), uc(m1.id, "ust")), ip(id(), uc(makara.id, "sag"), uc(m2.id, "ust"))];
}

// ── Palanga: sabit + hareketli makara ──────────────────────────────────────

export function palangaSahnesi(): Sekil[] {
  const id = kimlikUretici("plg");
  const tavan = fizik(id(), "tavan", 0, 0, 260, 22);
  const r = 24;
  const A = { x: 170, y: 70 };
  // Hareketli makaranın sağ teğeti = sabit makaranın sol teğeti (ip düşey).
  const B = { x: A.x - 2 * r, y: 190 };
  const sabit = fizik(id(), "makara", A.x - r, A.y - r, 2 * r, 2 * r);
  const hareketli = fizik(id(), "makara", B.x - r, B.y - r, 2 * r, 2 * r);
  const aski: Sekil = { id: id(), tur: "dogru", kalinlik: 2, x1: A.x, y1: 22, x2: A.x, y2: A.y };
  const kanca: Sekil = { id: id(), tur: "dogru", kalinlik: 2, x1: B.x, y1: B.y, x2: B.x, y2: 240 };
  const yuk = fizik(id(), "kutle", B.x - 30, 240, 60, 46, { etiket: "m_1" });
  const m2 = fizik(id(), "kutle", A.x + r - 20, 150, 40, 40, { etiket: "m_2" });
  return [
    tavan, aski, sabit, hareketli, kanca, yuk, m2,
    // İpin bir ucu tavana bağlı (B'nin sol teğetinin tam üstü), hareketli makaranın altından dolanır.
    ip(id(), { x: B.x - r, y: 22 }, uc(hareketli.id, "sol")),
    ip(id(), uc(hareketli.id, "sag"), uc(sabit.id, "sol")),
    ip(id(), uc(sabit.id, "sag"), uc(m2.id, "ust")),
  ];
}

// ── Tam elektrik devresi ───────────────────────────────────────────────────

export function devreSahnesi(baglanti: "seri" | "paralel" = "seri"): Sekil[] {
  const id = kimlikUretici(baglanti === "seri" ? "dvs" : "dvp");
  const tel = (k: Baglayici["kaynak"], h: Baglayici["hedef"]) => ip(id(), k, h, "dik");
  const dugum = (cx: number, cy: number) => fizik(id(), "dugum", cx - 5.5, cy - 5.5, 11, 11);
  const ust = 62, alt = 260;
  const pil = fizik(id(), "pil", 200, ust - 22, 80, 44, { etiket: "\\varepsilon, r" });
  const anahtar = fizik(id(), "anahtarKapali", 330, ust - 18, 90, 36, { etiket: "K" });
  const amp = fizik(id(), "ampermetre", 435, 138, 90, 44, { donus: 90 });
  const sekiller: Sekil[] = [pil, anahtar, amp];
  const teller: Sekil[] = [tel(uc(anahtar.id, "sag"), uc(amp.id, "ust"))];
  if (baglanti === "seri") {
    const r1 = fizik(id(), "direnc", 160, alt - 17, 100, 34, { etiket: "R_1" });
    const r2 = fizik(id(), "direnc", 330, alt - 17, 100, 34, { etiket: "R_2" });
    const d1 = dugum(130, alt);
    const d2 = dugum(295, alt);
    const volt = fizik(id(), "voltmetre", 167, 320, 90, 44);
    sekiller.push(r1, r2, d1, d2, volt);
    teller.push(
      tel(uc(pil.id, "sag"), uc(anahtar.id, "sol")),
      tel(uc(amp.id, "alt"), uc(r2.id, "sag")),
      tel(uc(r2.id, "sol"), uc(d2.id, "sag")),
      tel(uc(d2.id, "sol"), uc(r1.id, "sag")),
      tel(uc(r1.id, "sol"), uc(d1.id, "sag")),
      tel(uc(d1.id, "ust"), uc(pil.id, "sol")),
      // Voltmetre R1'e paralel
      tel(uc(d1.id, "alt"), uc(volt.id, "sol")),
      tel(uc(volt.id, "sag"), uc(d2.id, "alt")),
    );
  } else {
    const r1 = fizik(id(), "direnc", 230, alt - 17, 100, 34, { etiket: "R_1" });
    const r2 = fizik(id(), "direnc", 230, 330 - 17, 100, 34, { etiket: "R_2" });
    const dl = dugum(130, alt);
    const dr = dugum(430, alt);
    const dp1 = dugum(160, ust);
    const dp2 = dugum(305, ust);
    const volt = fizik(id(), "voltmetre", 195, -32, 90, 44);
    sekiller.push(r1, r2, dl, dr, dp1, dp2, volt);
    teller.push(
      tel(uc(amp.id, "alt"), uc(dr.id, "sag")),
      tel(uc(dr.id, "sol"), uc(r1.id, "sag")),
      tel(uc(dr.id, "alt"), uc(r2.id, "sag")),
      tel(uc(r1.id, "sol"), uc(dl.id, "sag")),
      tel(uc(r2.id, "sol"), uc(dl.id, "alt")),
      tel(uc(dl.id, "ust"), uc(dp1.id, "sol")),
      tel(uc(dp1.id, "sag"), uc(pil.id, "sol")),
      tel(uc(pil.id, "sag"), uc(dp2.id, "sol")),
      tel(uc(dp2.id, "sag"), uc(anahtar.id, "sol")),
      // Voltmetre üretecin uçlarına (R1 ∥ R2 uçlarındaki gerilim) paralel
      tel(uc(dp1.id, "ust"), uc(volt.id, "sol")),
      tel(uc(volt.id, "sag"), uc(dp2.id, "ust")),
    );
  }
  return [...sekiller, ...teller];
}

// ── Tek hesaplı nesne hazırları ────────────────────────────────────────────

/** Varsayılan ölçüler `FIZIK_TANIMLARI` ile aynı (döngü olmasın diye burada sayı). */
export const SAHNE_OLCULERI = {
  egikKuvvet: { w: 320, h: 185 },
  optikDuzenek: { w: 460, h: 220 },
  siviKabi: { w: 260, h: 220 },
} as const;

export function egikKuvvetSekli(kuvvet: EgikKuvvetVerisi, idOn = "egk"): FizikSekli {
  const w = SAHNE_OLCULERI.egikKuvvet.w;
  const h = Math.round(Math.max(40, Math.min(400, w * Math.tan((kuvvet.aci * Math.PI) / 180))));
  return fizik(`${idOn}-1`, "egikKuvvet", 40, 40, w, h, { kuvvet });
}

export function optikSekli(optik: OptikVerisi, idOn = "opt"): FizikSekli {
  return fizik(`${idOn}-1`, "optikDuzenek", 20, 20, SAHNE_OLCULERI.optikDuzenek.w, SAHNE_OLCULERI.optikDuzenek.h, { optik });
}

export function siviSekli(sivi: SiviVerisi, idOn = "svi"): FizikSekli {
  const o = sivi.tur === "bolmeli" ? { w: 250, h: 200 } : sivi.tur === "kaldirma" ? { w: 320, h: 200 } : SAHNE_OLCULERI.siviKabi;
  return fizik(`${idOn}-1`, "siviKabi", 40, 20, o.w, o.h, { sivi });
}

const EGIK_TEMEL: EgikKuvvetVerisi = {
  aci: 30, kutle: 5, mu: 0, olcek: 2, goster: { mg: true, bilesen: true, normal: true, surtunme: false }, degerler: false, konum: 0.5, aciEtiketi: "\\alpha", kutleEtiketi: "m",
};
const OPTIK_TEMEL: OptikVerisi = {
  tur: "cukurAyna", f: 10, uzaklik: 30, boy: 6, isinlar: { paralel: true, odak: true, merkez: true }, goruntu: true, isaretler: true, bilgi: true,
};

export const FIZIK_HAZIR_SAHNELER: FizikHazirSahne[] = [
  {
    id: "egik-kuvvet",
    ad: "Eğik düzlemde kuvvet bileşenleri",
    ipucu: "α açılı eğik düzlem, yüzeye paralel kütle; mg, mg·sinα, mg·cosα, N okları kuvvetle orantılı (g = 10)",
    aramaKelimeleri: ["eğik düzlem", "kuvvet", "bileşen", "normal kuvvet", "mg sin", "mg cos", "serbest cisim diyagramı", "kütle", "vektör"],
    olustur: () => [egikKuvvetSekli({ ...EGIK_TEMEL })],
  },
  {
    id: "egik-surtunme",
    ad: "Sürtünmeli eğik düzlem (fs)",
    ipucu: "μ = 0,3: sürtünme kuvveti eğim yukarı; durgun/kayar durumu ve değerler (N cinsinden)",
    aramaKelimeleri: ["eğik düzlem", "sürtünme", "fs", "statik", "kinetik", "μ", "mü", "ivme"],
    olustur: () => [egikKuvvetSekli({ ...EGIK_TEMEL, aci: 37, mu: 0.3, goster: { mg: true, bilesen: true, normal: true, surtunme: true }, degerler: true })],
  },
  {
    id: "egik-makara",
    ad: "Eğik düzlem + makara + iki kütle",
    ipucu: "Eğik düzlemdeki m₁, tepe makarasından sarkan m₂'ye iple bağlı; ip eğime paralel ve makaraya teğet",
    aramaKelimeleri: ["eğik düzlem", "makara", "ip", "iki kütle", "gerilme", "bağlı cisimler", "dinamik"],
    olustur: () => egikMakaraSahnesi(30),
  },
  {
    id: "atwood",
    ad: "Atwood düzeneği (sabit makara)",
    ipucu: "Tavana asılı sabit makara, iki yanda düşey iplerle m₁ ve m₂",
    aramaKelimeleri: ["atwood", "makara", "sabit makara", "ip", "iki kütle", "gerilme", "tavan"],
    olustur: atwoodSahnesi,
  },
  {
    id: "palanga",
    ad: "Palanga (sabit + hareketli makara)",
    ipucu: "İpin ucu tavanda; hareketli makarayı dolanıp sabit makaradan m₂'ye iner. Yük hareketli makarada",
    aramaKelimeleri: ["palanga", "makara", "hareketli makara", "sabit makara", "ip", "kuvvet kazancı", "atwood"],
    olustur: palangaSahnesi,
  },
  {
    id: "devre-seri",
    ad: "Tam devre: seri R₁, R₂",
    ipucu: "Üreteç (ε, r), anahtar, ampermetre (seri), R₁ ve R₂ seri, voltmetre R₁'e paralel",
    aramaKelimeleri: ["devre", "elektrik devresi", "seri", "direnç", "pil", "üreteç", "ampermetre", "voltmetre", "anahtar", "tel"],
    olustur: () => devreSahnesi("seri"),
  },
  {
    id: "devre-paralel",
    ad: "Tam devre: paralel R₁, R₂",
    ipucu: "Üreteç (ε, r), anahtar, ana koldaki ampermetre, R₁ ∥ R₂, voltmetre üretecin uçlarında",
    aramaKelimeleri: ["devre", "elektrik devresi", "paralel", "direnç", "pil", "üreteç", "ampermetre", "voltmetre", "anahtar", "tel"],
    olustur: () => devreSahnesi("paralel"),
  },
  {
    id: "optik-cukur",
    ad: "Çukur ayna: ışın düzeneği",
    ipucu: "Asal eksen, M–F–T noktaları, KL cismi ve özel ışınlar; görüntü 1/f = 1/dₒ + 1/dᵢ ile otomatik",
    aramaKelimeleri: ["optik", "çukur ayna", "ayna", "odak", "asal eksen", "görüntü", "ışın", "merkez"],
    olustur: () => [optikSekli({ ...OPTIK_TEMEL, isinlar: { paralel: true, odak: true, merkez: true, egrilik: false } })],
  },
  {
    id: "optik-tumsek",
    ad: "Tümsek ayna: ışın düzeneği",
    ipucu: "Görüntü her zaman sanal, düz, küçük (kesikli uzantılar)",
    aramaKelimeleri: ["optik", "tümsek ayna", "ayna", "odak", "asal eksen", "sanal görüntü", "ışın"],
    olustur: () => [optikSekli({ ...OPTIK_TEMEL, tur: "tumsekAyna", uzaklik: 20 })],
  },
  {
    id: "optik-ince",
    ad: "İnce kenarlı mercek: ışın düzeneği",
    ipucu: "2F–F–O–F–2F noktaları; cisim 2F'de → görüntü 2F'de, ters, eşit boy",
    aramaKelimeleri: ["optik", "mercek", "ince kenarlı", "yakınsak", "toplayıcı", "odak", "asal eksen", "görüntü", "ışın"],
    olustur: () => [optikSekli({ ...OPTIK_TEMEL, tur: "inceMercek", uzaklik: 20 })],
  },
  {
    id: "optik-kalin",
    ad: "Kalın kenarlı mercek: ışın düzeneği",
    ipucu: "Iraksak mercek: görüntü sanal, düz, küçük",
    aramaKelimeleri: ["optik", "mercek", "kalın kenarlı", "ıraksak", "dağıtıcı", "odak", "asal eksen", "sanal görüntü"],
    olustur: () => [optikSekli({ ...OPTIK_TEMEL, tur: "kalinMercek", uzaklik: 20 })],
  },
  {
    id: "sivi-bolmeli",
    ad: "Bölmeli sıvı kabı",
    ipucu: "m×n birim bölmeli kap: dolu bölmeler, taralı engel, musluk, K–L noktaları (sıvı basıncı)",
    aramaKelimeleri: ["sıvı basıncı", "bölmeli kap", "kap", "musluk", "engel", "basınç", "sıvı"],
    olustur: () => [siviSekli({ tur: "bolmeli", satir: 4, sutun: 5, dolu: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 5, 6], engel: [7, 8], musluk: { taraf: "sag", konum: 3 }, noktalar: [{ hucre: 15, ad: "K" }, { hucre: 6, ad: "L" }] })],
  },
  {
    id: "sivi-kaldirma",
    ad: "Kaldırma kuvveti: yüzen, askıda, batan",
    ipucu: "Aynı kapta yüzen X, askıda Y, batan Z; isteğe bağlı Fk, G, N okları (orantılı)",
    aramaKelimeleri: ["kaldırma kuvveti", "yüzen", "askıda", "batan", "arşimet", "sıvı", "özkütle", "kap"],
    olustur: () => [siviSekli({ tur: "kaldirma", seviye: 0.7, xBatma: 0.5, zOran: 2, adlar: ["X", "Y", "Z"], kuvvet: false })],
  },
  {
    id: "sivi-u-borusu",
    ad: "U borusu: karışmayan iki sıvı",
    ipucu: "d₁ (altta) ve d₂ sıvıları; denge koşulu d₁·h₁ = d₂·h₂ ile h₂ otomatik",
    aramaKelimeleri: ["u borusu", "sıvı", "özkütle", "karışmayan sıvılar", "basınç", "denge", "bileşik kap"],
    olustur: () => [siviSekli({ tur: "uBorusu", d1: 3, d2: 1, h1: 2, h2: 6, otomatik: true })],
  },
];
