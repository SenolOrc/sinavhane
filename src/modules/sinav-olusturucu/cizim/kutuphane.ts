// Sol "Şekil ve Şablon Kütüphanesi"nin veri katmanı (saf, React'siz).
//
// NEDEN TOPLAYICI: şekiller ve şablonlar branş dosyalarında kendi listelerinde
// duruyor (FIZIK_TANIMLARI, GRAFIK_SABLONLARI, SEMA_SABLONLARI, KIMYA_*…).
// Kütüphane bunları KOPYALAMAZ, her çağrıda okur: bir branş dosyasına yeni bir
// şablon eklendiğinde kütüphanede ve aramada kendiliğinden görünür.
//
// Arama alanları: ad + Türkçe anahtar kelimeler + kategori/alt başlık (+ ipucu,
// düşük öncelikle). Türkçe karakter duyarsız: "egik duzlem" = "Eğik düzlem".

import { aramaIcinKucult } from "@/lib/turkceMetin";

import { FIZIK_GRUPLARI, FIZIK_TANIMLARI } from "./fizik";
import {
  GRAFIK_SABLONLARI,
  MAT_GRAFIK_SABLONLARI,
  hizliMatematik,
  noktalardanGrafik,
  noktalariOku,
} from "./grafik";
import { ISTATISTIK_SABLONLARI } from "./istatistik";
import { SEMA_SABLONLARI, semaBoyutu } from "./sema";
import {
  KIMYA_ATOM_SABLONLARI,
  KIMYA_GRAFIK_SABLONLARI,
  KIMYA_MOLEKUL_SABLONLARI,
  KIMYA_ORBITAL_SABLONLARI,
  KIMYA_ORGANIK_SABLONLARI,
  KIMYA_PERIYODIK_SABLONLARI,
  KIMYA_PIL_SABLONLARI,
  KIMYA_SIKLO_SABLONLARI,
  kimyaBoyutu,
} from "./kimya";
import { GEOMETRI_KUTUPHANESI } from "./geometriSekilleri";
import { HAZIR_SAHNELER } from "./sahneler";
import { AKIS_VARSAYILAN_H, AKIS_VARSAYILAN_METIN, AKIS_VARSAYILAN_W, AKIS_KARAR_H, AKIS_KARAR_W } from "./sabitler";
import type {
  AkisSekli,
  FizikNesnesi,
  GeometriVerisi,
  GrafikVerisi,
  IstatistikVerisi,
  KimyaVerisi,
  KullaniciSablonu,
  SemaVerisi,
  Sekil,
} from "./tipler";

type FizikSekli = Extract<Sekil, { tur: "fizik" }>;

// ── Kategoriler ────────────────────────────────────────────────────────────

export type KutuphaneKategorisi =
  | "sahne" | "geometri" | "matematik" | "istatistik" | "fizik" | "kimya" | "akis" | "sablonlarim";

export const KUTUPHANE_KATEGORILERI: { id: KutuphaneKategorisi; ad: string }[] = [
  { id: "sahne", ad: "Hazır Soru Sahneleri" },
  { id: "geometri", ad: "Geometri" },
  { id: "matematik", ad: "Matematik & Grafik" },
  { id: "istatistik", ad: "İstatistik & Şema" },
  { id: "fizik", ad: "Fizik" },
  { id: "kimya", ad: "Kimya" },
  { id: "akis", ad: "Akış Şeması" },
  { id: "sablonlarim", ad: "Şablonlarım" },
];

// ── Girdi biçimi ───────────────────────────────────────────────────────────

/** Fizik nesnesiyle birlikte gelen hazır veri. */
export type FizikEkVerisi = {
  grafik?: GrafikVerisi;
  istatistik?: IstatistikVerisi;
  sema?: SemaVerisi;
  kimya?: KimyaVerisi;
  geo?: GeometriVerisi;
};

/** Karta tıklanınca editörün yapacağı iş (editör uygular; burada yan etki yok). */
export type KutuphaneEylemi =
  | { tur: "fizik"; nesne: FizikNesnesi; ek?: FizikEkVerisi }
  | { tur: "akis"; sekil: AkisSekli }
  | { tur: "sekiller"; sekiller: Sekil[] }
  | { tur: "uclu" };

export type KutuphaneOnizlemesi =
  /** `fizikSimgeCiz` ile nesnenin varsayılan simgesi. */
  | { tur: "simge"; nesne: FizikNesnesi }
  /** Verilen şekiller kutuya sığdırılıp çizilir. */
  | { tur: "sekiller"; sekiller: () => Sekil[] }
  | { tur: "yazi"; metin: string };

export type KutuphaneGirdisi = {
  id: string;
  ad: string;
  kategori: KutuphaneKategorisi;
  /** Kategori içindeki alt başlık (ör. "Elektrik", "Organik"). */
  altBaslik?: string;
  ipucu: string;
  aramaKelimeleri: string[];
  onizleme: KutuphaneOnizlemesi;
  ekle: () => KutuphaneEylemi;
  /** Şablonlarım: silme düğmesi için. */
  kullaniciSablonuId?: string;
};

// ── Akış kutuları ──────────────────────────────────────────────────────────

export const AKIS_ARACLARI: { sekil: AkisSekli; etiket: string; ipucu: string }[] = [
  { sekil: "baslangic", etiket: "Başla/Bitir", ipucu: "Yuvarlatılmış uç kutusu" },
  { sekil: "surec", etiket: "İşlem", ipucu: "Dikdörtgen işlem adımı" },
  { sekil: "karar", etiket: "Karar", ipucu: "Eşkenar dörtgen — evet/hayır dallanması" },
  { sekil: "veri", etiket: "Girdi/Çıktı", ipucu: "Paralelkenar" },
  { sekil: "hazirlik", etiket: "Hazırlık", ipucu: "Altıgen — döngü hazırlığı" },
  { sekil: "belge", etiket: "Belge", ipucu: "Alt kenarı dalgalı çıktı belgesi" },
];

// ── Arama ──────────────────────────────────────────────────────────────────

/**
 * Arama anahtarı: `aramaIcinKucult` (I/ı → i) + Türkçe harfleri ASCII'ye
 * katlar. Öğretmen telefonda/İngilizce klavyede "egik duzlem" yazabiliyor.
 */
export function kutuphaneAramaAnahtari(metin: string): string {
  return aramaIcinKucult(metin)
    .replace(/[çç]/g, "c").replace(/ğ/g, "g").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
    .replace(/[âà]/g, "a").replace(/[îì]/g, "i").replace(/[ûù]/g, "u")
    .replace(/[₀-₉]/g, (c) => String(c.charCodeAt(0) - 0x2080))
    .replace(/\s+/g, " ")
    .trim();
}

/** Her girdiye puan verir; tüm sözcükleri içermeyenler elenir. Yüksek puan önce. */
export function kutuphaneAra(girdiler: KutuphaneGirdisi[], sorgu: string): KutuphaneGirdisi[] {
  const sozcukler = kutuphaneAramaAnahtari(sorgu).split(" ").filter(Boolean);
  if (!sozcukler.length) return girdiler;
  const kategoriAdi = new Map(KUTUPHANE_KATEGORILERI.map((k) => [k.id, k.ad]));
  const puanli: { g: KutuphaneGirdisi; puan: number; sira: number }[] = [];
  girdiler.forEach((g, sira) => {
    const ad = kutuphaneAramaAnahtari(g.ad);
    const kelimeler = kutuphaneAramaAnahtari(g.aramaKelimeleri.join(" "));
    const kategori = kutuphaneAramaAnahtari(`${kategoriAdi.get(g.kategori) ?? ""} ${g.altBaslik ?? ""}`);
    const ipucu = kutuphaneAramaAnahtari(g.ipucu);
    let puan = 0;
    for (const s of sozcukler) {
      if (ad.startsWith(s) || ad.includes(` ${s}`)) puan += 10;
      else if (ad.includes(s)) puan += 7;
      else if (kelimeler.includes(s)) puan += 6;
      else if (kategori.includes(s)) puan += 3;
      else if (ipucu.includes(s)) puan += 1;
      else return;
    }
    puanli.push({ g, puan, sira });
  });
  return puanli.sort((a, b) => b.puan - a.puan || a.sira - b.sira).map((x) => x.g);
}

// ── Ek Türkçe anahtar kelimeler (mevcut kayıtlar için) ─────────────────────
// Kayıtta `aramaKelimeleri`/`anahtarlar` varsa onlar da eklenir; bu tablo
// yalnız eski kayıtlarda alan olmadığı için var.

const EK_KELIMELER: Record<string, string[]> = {
  kutle: ["blok", "cisim", "kutu", "m"],
  kure: ["top", "bilye", "daire"],
  egikDuzlem: ["eğim", "rampa", "takoz", "sürtünme"],
  makara: ["palanga", "atwood", "ip", "çıkrık"],
  araba: ["vagon", "tekerlek"],
  yay: ["esneklik", "hooke", "k"],
  kap: ["sıvı", "su", "basınç", "beher"],
  duvar: ["engel"],
  zemin: ["yer", "yatay düzlem", "sürtünme"],
  tavan: ["asma", "askı"],
  direnc: ["rezistans", "ohm", "devre", "r"],
  pil: ["üreteç", "batarya", "emk", "devre"],
  ampul: ["lamba", "devre"],
  anahtarAcik: ["şalter", "devre", "açık"],
  anahtarKapali: ["şalter", "devre", "kapalı"],
  kondansator: ["kondansatör", "kapasitör", "devre"],
  bobin: ["indüktör", "devre"],
  ampermetre: ["akım", "ölçer", "devre"],
  voltmetre: ["gerilim", "potansiyel", "ölçer", "devre"],
  mercekTumsek: ["yakınsak", "mercek", "optik", "ince kenarlı"],
  mercekCukur: ["ıraksak", "mercek", "optik", "kalın kenarlı"],
  aynaCukur: ["ayna", "optik", "çukur"],
  aynaTumsek: ["ayna", "optik", "tümsek"],
  aynaDuzlem: ["ayna", "yansıma", "optik"],
  prizma: ["kırılma", "renk", "optik"],
  miknatis: ["manyetik", "kutup", "n s"],
  yukArti: ["elektrik yükü", "pozitif", "proton"],
  yukEksi: ["elektrik yükü", "negatif", "elektron"],
  vektorKuvvet: ["ok", "kuvvet", "f"],
  vektorHiz: ["ok", "hız", "v"],
  vektorIvme: ["ok", "ivme", "a"],
  vektorBilesen: ["ok", "bileşen", "izdüşüm"],
  kareliAlan: ["ızgara", "kareli", "vektör", "birim kare"],
  isinOk: ["ışın", "optik", "ok"],
  halkaAkim: ["manyetik alan", "akım"],
  solenoid: ["bobin", "manyetik alan", "akım"],
  telAlan: ["manyetik alan", "akım", "tel"],
  alanNokta: ["manyetik alan", "sayfa", "giren çıkan"],
  dalgaGirisim: ["dalga", "girişim", "çift yarık"],
  enerjiDuzeyi: ["bohr", "atom", "foton", "ışıma", "soğurma"],
  dugum: ["nokta", "devre", "bağlantı"],
  koordinat: ["eksen", "grafik", "koordinat"],
  aciYayi: ["açı", "derece", "yay"],
  dikAci: ["dik", "90", "açı"],
  esIsaret: ["tırtık", "eş", "kenar"],
  beher: ["sıvı", "laboratuvar", "kap"],
  erlenmayer: ["laboratuvar", "şişe"],
  balonJoje: ["laboratuvar", "balon"],
  mezur: ["laboratuvar", "ölçü", "silindir"],
  denemeTupu: ["deney tüpü", "laboratuvar", "tüp"],
  buret: ["titrasyon", "laboratuvar"],
  ayirmaHunisi: ["laboratuvar", "ayrıştırma", "huni"],
  bunsenBeki: ["ısıtma", "alev", "laboratuvar"],
  huni: ["süzme", "laboratuvar"],
  damitma: ["laboratuvar", "ayrıştırma", "kaynama"],
  damlalik: ["pipet", "laboratuvar"],
  gazKabi: ["piston", "gaz", "basınç"],
  "g-genel": ["üçgen", "abc", "kenar"],
  "g-dik-yukseklik": ["dik üçgen", "üçgen", "yükseklik", "öklid", "pisagor"],
  "g-ikizkenar": ["üçgen", "ikizkenar"],
  "g-eskenar": ["üçgen", "eşkenar"],
  "g-iki-kenar-aci": ["üçgen", "açı"],
  "c-kiris": ["çember", "daire", "kiriş"],
  "c-merkez-aci": ["çember", "açı", "merkez", "çevre"],
  "c-teget": ["çember", "teğet"],
  "c-cap": ["çember", "çap", "çevre açı"],
  "b-ic": ["benzerlik", "thales", "paralel", "üçgen"],
  "b-yan": ["benzerlik", "üçgen"],
  "p-5": ["çokgen", "beşgen"],
  "p-6": ["çokgen", "altıgen", "köşegen"],
  "p-4": ["kare", "dörtgen", "çokgen"],
};

const kayitKelimeleri = (kayit: unknown): string[] => {
  const k = kayit as { aramaKelimeleri?: unknown; anahtarlar?: unknown; etiketler?: unknown };
  const topla = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  return [...topla(k.aramaKelimeleri), ...topla(k.anahtarlar)];
};

// ── Önizleme şekilleri ─────────────────────────────────────────────────────

function fizikOnizlemeSekli(nesne: FizikNesnesi, ek: FizikEkVerisi = {}, w = 300, h = 190): FizikSekli {
  return { id: "onizleme", tur: "fizik", nesne, kalinlik: 3, x: 0, y: 0, w, h, ...ek };
}

const grafikOnizleme = (olustur: () => GrafikVerisi): KutuphaneOnizlemesi => ({
  tur: "sekiller",
  sekiller: () => [fizikOnizlemeSekli("grafik", { grafik: { ...olustur(), sade: true } })],
});

const kimyaOnizleme = (olustur: () => KimyaVerisi): KutuphaneOnizlemesi => ({
  tur: "sekiller",
  sekiller: () => {
    const ham = olustur();
    // Küçük kartta başlık/geometri yazısı okunmaz (KimyaSeridi ile aynı ayar).
    const v: KimyaVerisi = ham.tur === "molekul" ? { ...ham, geometri: false } : ham.tur === "atom" ? { ...ham, baslik: "" } : ham;
    const b = kimyaBoyutu(v);
    return [fizikOnizlemeSekli("kimya", { kimya: v }, b.w, b.h)];
  },
});

// ── Toplayıcı ──────────────────────────────────────────────────────────────

/** Nesnesi bir şablon listesiyle zaten kapsanan (kartı şablonlardan gelen) geometri nesneleri. */
const SABLONLA_KAPSANAN: string[] = ["ucgenABC", "dikUcgen", "benzerUcgen", "cemberGeo", "cokgenAd"];
/** Tek kartı anlamsız, şablonlarla gelen nesneler. */
const SABLONLU_NESNELER: string[] = ["grafik", "istatistik", "sema", "kimya"];

/**
 * Kütüphanedeki tüm girdiler (sıralı: kategori sırası, sonra kayıt sırası).
 * Saf: aynı kayıtlarla aynı listeyi verir; `ekle()` her çağrıda yeni veri üretir.
 */
export function kutuphaneGirdileri(kullaniciSablonlari: KullaniciSablonu[] = []): KutuphaneGirdisi[] {
  const liste: KutuphaneGirdisi[] = [];
  const grupAdi = new Map(FIZIK_GRUPLARI.map((g) => [g.id as string, g.ad]));

  // 1) Hazır soru sahneleri: çok şekilli kayıtlar + `sahne` işaretli tek nesneler.
  for (const s of HAZIR_SAHNELER) {
    liste.push({
      id: `sahne:${s.id}`, ad: s.ad, kategori: "sahne", ipucu: s.ipucu,
      aramaKelimeleri: [...(s.aramaKelimeleri ?? []), "sahne", "düzenek", "hazır soru"],
      onizleme: { tur: "sekiller", sekiller: s.olustur },
      ekle: () => ({ tur: "sekiller", sekiller: s.olustur() }),
    });
  }
  const nesneler = Object.keys(FIZIK_TANIMLARI) as FizikNesnesi[];
  const sahneMi = (n: FizikNesnesi) => {
    const t = FIZIK_TANIMLARI[n] as { grup: string; sahne?: boolean };
    return t.sahne === true || t.grup === "sahne";
  };
  for (const n of nesneler.filter(sahneMi)) {
    const t = FIZIK_TANIMLARI[n];
    liste.push({
      id: `nesne:${n}`, ad: t.ad, kategori: "sahne", ipucu: t.ipucu,
      aramaKelimeleri: [...kayitKelimeleri(t), ...(EK_KELIMELER[n] ?? []), "sahne", "düzenek"],
      onizleme: { tur: "simge", nesne: n }, ekle: () => ({ tur: "fizik", nesne: n }),
    });
  }

  // 2) Geometri: şablon listeleri + diğer geometri nesneleri (açı yayı, yeni şekiller…).
  const geoAltBasliklari: Record<string, string> = {
    ucgen: "Üçgen", cember: "Çember", benzer: "Benzerlik", cokgen: "Çokgen", dogruAci: "Doğruda açılar",
    dortgen: "Dörtgenler", kati: "Katı cisimler", katlama: "Kağıt katlama",
  };
  const geoVarsayilanNesne: Record<string, FizikNesnesi> = {
    ucgen: "ucgenABC", cember: "cemberGeo", benzer: "benzerUcgen", cokgen: "cokgenAd",
  };
  const kapsananGeo = new Set<string>(SABLONLA_KAPSANAN);
  for (const sb of GEOMETRI_KUTUPHANESI) {
    const ornek = sb.olustur();
    const n = (sb.nesne && sb.nesne in FIZIK_TANIMLARI ? sb.nesne : geoVarsayilanNesne[ornek.tur]) as FizikNesnesi | undefined;
    if (!n) continue;
    kapsananGeo.add(n);
    const t = FIZIK_TANIMLARI[n];
    liste.push({
      id: `geo:${sb.id}`, ad: sb.ad, kategori: "geometri", altBaslik: geoAltBasliklari[ornek.tur] ?? "Geometri", ipucu: sb.ipucu,
      aramaKelimeleri: [...kayitKelimeleri(sb), ...(EK_KELIMELER[sb.id] ?? [])],
      onizleme: { tur: "sekiller", sekiller: () => [fizikOnizlemeSekli(n, { geo: sb.olustur() }, t.w, t.h)] },
      ekle: () => ({ tur: "fizik", nesne: n, ek: { geo: sb.olustur() } }),
    });
  }
  for (const n of nesneler) {
    const t = FIZIK_TANIMLARI[n];
    if (sahneMi(n) || t.grup !== "geometri" || kapsananGeo.has(n)) continue;
    liste.push({
      id: `nesne:${n}`, ad: t.ad, kategori: "geometri", altBaslik: "Şekil ve işaretler", ipucu: t.ipucu,
      aramaKelimeleri: [...kayitKelimeleri(t), ...(EK_KELIMELER[n] ?? [])],
      onizleme: { tur: "simge", nesne: n }, ekle: () => ({ tur: "fizik", nesne: n }),
    });
  }

  // 3) Matematik & Grafik
  for (const sb of MAT_GRAFIK_SABLONLARI) {
    liste.push({
      id: `mat:${sb.id}`, ad: sb.ad, kategori: "matematik", altBaslik: "Fonksiyon grafikleri", ipucu: sb.ipucu,
      aramaKelimeleri: [...kayitKelimeleri(sb), "grafik", "fonksiyon"],
      onizleme: grafikOnizleme(sb.olustur), ekle: () => ({ tur: "fizik", nesne: "grafik", ek: { grafik: sb.olustur() } }),
    });
  }

  // 4) İstatistik & Şema
  for (const sb of ISTATISTIK_SABLONLARI) {
    liste.push({
      id: `ist:${sb.id}`, ad: sb.ad, kategori: "istatistik", altBaslik: "İstatistik grafikleri", ipucu: sb.ipucu,
      aramaKelimeleri: [...kayitKelimeleri(sb), "istatistik", "veri", "grafik"],
      onizleme: { tur: "sekiller", sekiller: () => [fizikOnizlemeSekli("istatistik", { istatistik: { ...sb.olustur(), sade: true } })] },
      ekle: () => ({ tur: "fizik", nesne: "istatistik", ek: { istatistik: sb.olustur() } }),
    });
  }
  for (const sb of SEMA_SABLONLARI) {
    liste.push({
      id: `sema:${sb.id}`, ad: sb.ad, kategori: "istatistik", altBaslik: "Şemalar", ipucu: sb.ipucu,
      aramaKelimeleri: [...kayitKelimeleri(sb), "şema", "küme"],
      onizleme: { tur: "sekiller", sekiller: () => { const v = sb.olustur(); const b = semaBoyutu(v); return [fizikOnizlemeSekli("sema", { sema: v }, b.w, b.h)]; } },
      ekle: () => ({ tur: "fizik", nesne: "sema", ek: { sema: sb.olustur() } }),
    });
  }

  // 5) Fizik: grup grup nesneler, sonra hareket grafikleri.
  for (const grup of FIZIK_GRUPLARI) {
    for (const n of nesneler) {
      const t = FIZIK_TANIMLARI[n];
      if (t.grup !== grup.id || sahneMi(n) || SABLONLU_NESNELER.includes(n)) continue;
      if (["geometri", "kimya", "matematik", "grafik"].includes(t.grup)) continue;
      liste.push({
        id: `nesne:${n}`, ad: t.ad, kategori: "fizik", altBaslik: grup.ad, ipucu: t.ipucu,
        aramaKelimeleri: [...kayitKelimeleri(t), ...(EK_KELIMELER[n] ?? [])],
        onizleme: { tur: "simge", nesne: n }, ekle: () => ({ tur: "fizik", nesne: n }),
      });
    }
  }
  // Grubu FIZIK_GRUPLARI'nda olmayan (yeni eklenmiş) nesneler de kaybolmasın.
  for (const n of nesneler) {
    const t = FIZIK_TANIMLARI[n];
    if (grupAdi.has(t.grup) || sahneMi(n)) continue;
    liste.push({
      id: `nesne:${n}`, ad: t.ad, kategori: "fizik", altBaslik: "Diğer", ipucu: t.ipucu,
      aramaKelimeleri: [...kayitKelimeleri(t), ...(EK_KELIMELER[n] ?? [])],
      onizleme: { tur: "simge", nesne: n }, ekle: () => ({ tur: "fizik", nesne: n }),
    });
  }
  for (const sb of GRAFIK_SABLONLARI) {
    liste.push({
      id: `grafik:${sb.id}`, ad: sb.ad, kategori: "fizik", altBaslik: "Hareket grafikleri", ipucu: sb.ipucu,
      aramaKelimeleri: [...kayitKelimeleri(sb), "grafik", "hareket", "zaman"],
      onizleme: grafikOnizleme(sb.olustur), ekle: () => ({ tur: "fizik", nesne: "grafik", ek: { grafik: sb.olustur() } }),
    });
  }
  liste.push({
    id: "grafik:uclu", ad: "x–t, v–t, a–t üçlü", kategori: "fizik", altBaslik: "Hareket grafikleri",
    ipucu: "Aynı hareketin konum, hız ve ivme grafiği alt alta, zaman eksenleri hizalı",
    aramaKelimeleri: ["grafik", "konum", "hız", "ivme", "üçlü"],
    onizleme: { tur: "yazi", metin: "x · v · a" }, ekle: () => ({ tur: "uclu" }),
  });

  // 6) Kimya
  for (const n of nesneler) {
    const t = FIZIK_TANIMLARI[n];
    if (t.grup !== "kimya" || sahneMi(n) || SABLONLU_NESNELER.includes(n)) continue;
    liste.push({
      id: `nesne:${n}`, ad: t.ad, kategori: "kimya", altBaslik: "Laboratuvar", ipucu: t.ipucu,
      aramaKelimeleri: [...kayitKelimeleri(t), ...(EK_KELIMELER[n] ?? []), "laboratuvar"],
      onizleme: { tur: "simge", nesne: n }, ekle: () => ({ tur: "fizik", nesne: n }),
    });
  }
  const kimyaListeleri: [string, string, { id: string; ad: string; ipucu: string; olustur: () => KimyaVerisi }[], string[]][] = [
    ["atom", "Atom ve iyon", KIMYA_ATOM_SABLONLARI, ["atom", "bohr", "iyon", "elektron"]],
    ["molekul", "Molekül (Lewis)", KIMYA_MOLEKUL_SABLONLARI, ["molekül", "lewis", "bağ"]],
    ["organik", "Organik", KIMYA_ORGANIK_SABLONLARI, ["organik", "karbon", "iskelet"]],
    ["siklo", "Organik", KIMYA_SIKLO_SABLONLARI, ["organik", "halka", "sikloalkan", "dallanmış"]],
    ["orbital", "Orbital", KIMYA_ORBITAL_SABLONLARI, ["orbital", "elektron dizilimi", "hund"]],
    ["pil", "Elektrokimya", KIMYA_PIL_SABLONLARI, ["pil", "elektrot", "tuz köprüsü"]],
    ["periyodik", "Periyodik tablo", KIMYA_PERIYODIK_SABLONLARI, ["periyodik", "element", "tablo"]],
  ];
  for (const [onek, alt, sablonlar, kelimeler] of kimyaListeleri) {
    for (const sb of sablonlar) {
      liste.push({
        id: `kimya-${onek}:${sb.id}`, ad: sb.ad, kategori: "kimya", altBaslik: alt, ipucu: sb.ipucu,
        aramaKelimeleri: [...kayitKelimeleri(sb), ...kelimeler],
        onizleme: kimyaOnizleme(sb.olustur), ekle: () => ({ tur: "fizik", nesne: "kimya", ek: { kimya: sb.olustur() } }),
      });
    }
  }
  for (const sb of KIMYA_GRAFIK_SABLONLARI) {
    liste.push({
      id: `kimya-grafik:${sb.id}`, ad: sb.ad, kategori: "kimya", altBaslik: "Grafik", ipucu: sb.ipucu,
      aramaKelimeleri: [...kayitKelimeleri(sb), "grafik"],
      onizleme: grafikOnizleme(sb.olustur), ekle: () => ({ tur: "fizik", nesne: "grafik", ek: { grafik: sb.olustur() } }),
    });
  }

  // 7) Akış şeması
  for (const a of AKIS_ARACLARI) {
    liste.push({
      id: `akis:${a.sekil}`, ad: a.etiket, kategori: "akis", ipucu: a.ipucu,
      aramaKelimeleri: ["akış", "algoritma", "kutu", "diyagram"],
      onizleme: { tur: "sekiller", sekiller: () => [akisOnizlemeSekli(a.sekil)] },
      ekle: () => ({ tur: "akis", sekil: a.sekil }),
    });
  }

  // 8) Şablonlarım
  for (const sb of kullaniciSablonlari) {
    liste.push({
      id: `kullanici:${sb.id}`, ad: sb.ad, kategori: "sablonlarim", ipucu: `${sb.sekiller.length} şekilli kayıtlı şablon`,
      aramaKelimeleri: ["şablon", "kayıtlı"], kullaniciSablonuId: sb.id,
      onizleme: { tur: "sekiller", sekiller: () => sb.sekiller },
      ekle: () => ({ tur: "sekiller", sekiller: sb.sekiller }),
    });
  }
  return liste;
}

function akisOnizlemeSekli(sekil: AkisSekli): Sekil {
  const karar = sekil === "karar";
  return {
    id: "onizleme", tur: "akis", akisSekli: sekil, kalinlik: 2, x: 0, y: 0,
    w: karar ? AKIS_KARAR_W : AKIS_VARSAYILAN_W, h: karar ? AKIS_KARAR_H : AKIS_VARSAYILAN_H,
    metin: AKIS_VARSAYILAN_METIN[sekil],
  };
}

/**
 * "Yazarak çiz": arama kutusuna yazılan şey doğrudan çizilebiliyorsa (ör.
 * "y = x^2 - 4", "0,5; 5,15; 9,15") en üstte gösterilecek öneriler.
 */
export function aramaOnerileri(sorgu: string): KutuphaneGirdisi[] {
  const s = sorgu.trim();
  if (s.length < 2) return [];
  const oneriler: KutuphaneGirdisi[] = [];
  // Yalnız sayı/virgül/; içeriyorsa: hareket grafiği noktaları.
  if (/^[\d\s.,;:\-−]+$/.test(s) && s.includes(";")) {
    const n = noktalariOku(s);
    if (n && n.length >= 2) {
      oneriler.push({
        id: "yaz:noktalar", ad: `Noktalardan grafik: ${s}`, kategori: "fizik", altBaslik: "Yazarak çiz", ipucu: "(zaman, değer) çiftleri",
        aramaKelimeleri: [], onizleme: grafikOnizleme(() => noktalardanGrafik(n, "hiz")),
        ekle: () => ({ tur: "fizik", nesne: "grafik", ek: { grafik: noktalardanGrafik(n, "hiz") } }),
      });
      return oneriler;
    }
  }
  // Matematik ifadesi: içinde x, =, ^ ya da ( olmalı; düz sözcükleri ("makara") denemeyiz.
  if (/[=^<>()]|\bx\b|\d\s*x|sin|cos|tan|log|kok|√/i.test(s)) {
    const r = hizliMatematik(s);
    if ("veri" in r) {
      const veri = r.veri;
      oneriler.push({
        id: "yaz:fonksiyon", ad: `Çiz: ${s}`, kategori: "matematik", altBaslik: "Yazarak çiz", ipucu: "Yazdığınız ifadenin grafiği",
        aramaKelimeleri: [], onizleme: grafikOnizleme(() => veri),
        ekle: () => {
          const yeni = hizliMatematik(s);
          return { tur: "fizik", nesne: "grafik", ek: { grafik: "veri" in yeni ? yeni.veri : veri } };
        },
      });
    }
  }
  return oneriler;
}
