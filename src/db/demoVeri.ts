// db/demoVeri.ts — DENEME/tanıtım veri seti (8 sınıf × 10 öğrenci).
//
// NEDEN AYRI DOSYA: `seed.ts` yalnız GELİŞTİRMEDE yükleniyor (repo.ts::GELISTIRME
// = import.meta.env.DEV), yani paketlenmiş uygulama bomboş açılır. Bu doğru ürün
// davranışı — gerçek bir öğretmen sahte öğrencilerle karşılaşmamalı. Ama deneme
// kullanıcısının da bakacak bir şeyi olmalı. Çözüm: demo veri ÜRÜNDE de var ama
// yalnız Ayarlar'dan ELLE yüklenir. Gerçek kullanıcı hiç görmez, deneme kullanıcısı
// tek tıkla doldurur.
//
// GERÇEK ÖĞRENCİ VERİSİ YOK (§8.3, KVKK). İsimler bilerek YABANCI seçildi: bir
// ekran görüntüsü ya da yedek dosyası ortalıkta kaldığında kimse bunları gerçek
// bir Türk öğrenci sanmasın. Numaralar da uydurma.
//
// DETERMİNİSTİK: rastgelelik sabit tohumlu bir üreticiden geliyor. Rehber için
// alınan ekran görüntüleri her üretimde AYNI veriyi göstersin diye — yoksa her
// tazelemede görseller ile metin birbirini tutmaz.
import type {
  Sinif, Ogrenci, Devamsizlik, GunlukKayit, SinavNotu, OdevKaydi, OdevPuani,
  OgrenciEtiket, TutanakKaydi, Gorev, DersProgrami,
} from "@shared/types";

/** mulberry32 — küçük, sabit tohumlu üreteç. Math.random KULLANILMAZ (belirsizlik). */
function uretec(tohum: number) {
  let t = tohum >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const SINIF_ADLARI = ["9-A", "9-B", "10-C", "10-D", "11-E", "11-F", "12-G", "12-H"] as const;

// 80 ad — sınıf başına 10. Yabancı ve uydurma (bkz. dosya başı).
const ADLAR: string[][] = [
  ["Liam Carter", "Emma Whitfield", "Noah Brennan", "Olivia Sandoval", "Ethan Marsh",
   "Ava Lindqvist", "Mason Delgado", "Sophia Varga", "Lucas Fenwick", "Mia Andersen"],
  ["Oliver Grant", "Amelia Rousseau", "Elijah Novak", "Isabella Moreau", "James Okafor",
   "Charlotte Bergström", "Benjamin Halloran", "Harper Vasquez", "Henry Lindgren", "Evelyn Costa"],
  ["Alexander Reid", "Abigail Ferrari", "Sebastian Marek", "Emily Donovan", "Jack Sorensen",
   "Elizabeth Almeida", "Owen Kovacs", "Sofia Lindberg", "Daniel Mercer", "Ella Nakamura"],
  ["Matthew Sinclair", "Scarlett Dumont", "Joseph Varga", "Grace Bellini", "Samuel Ashford",
   "Chloe Petrov", "David Kilbride", "Victoria Salas", "Julian Hartmann", "Riley Osei"],
  ["Leo Fairbanks", "Nora Castellani", "Isaac Thornton", "Hazel Bjørn", "Miles Aguilar",
   "Aurora Vance", "Felix Lindholm", "Ivy Mendoza", "Adrian Kaminski", "Luna Ferreira"],
  ["Theodore Blake", "Stella Moretti", "Caleb Winslow", "Maya Solberg", "Isaiah Duarte",
   "Clara Voss", "Nathan Ellery", "Ruby Castellanos", "Simon Larsen", "Iris Beaumont"],
  ["Gabriel Renard", "Josephine Halden", "Xavier Moreno", "Adeline Krause", "Marcus Whitlock",
   "Camille Fontaine", "Elias Ramberg", "Delphine Oyelaran", "August Sandoval", "Rosalie Marchetti"],
  ["Vincent Ashby", "Beatrice Salvatore", "Dominic Herrera", "Genevieve Lund", "Rafael Ibarra",
   "Margot Delacroix", "Oscar Tveit", "Cecilia Barbosa", "Emmett Kowalski", "Talia Nkemdirim"],
];

export interface DemoVeri {
  siniflar: Sinif[];
  ogrenciler: Ogrenci[];
  devamsizlik: Devamsizlik[];
  gunlukKayitlar: GunlukKayit[];
  sinavNotlari: SinavNotu[];
  performansNotlari: SinavNotu[];
  odevler: OdevKaydi[];
  odevPuanlari: OdevPuani[];
  ogrenciEtiketleri: OgrenciEtiket[];
  tutanaklar: TutanakKaydi[];
  gorevler: Gorev[];
  dersProgrami: DersProgrami[];
  eksikOdev: Record<number, number>;
  sonGunlukId: number;
  sonOdevId: number;
  sonOgrenciEtiketId: number;
  sonTutanakId: number;
  sonGorevId: number;
  sonDersId: number;
}

/** Tarihi gün ekleyerek ISO döndürür (yerel, saat dilimi kaymasız). */
function gunEkle(temel: Date, gun: number): string {
  const d = new Date(temel.getFullYear(), temel.getMonth(), temel.getDate() + gun);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Deneme veri setini üretir. Saf: hiçbir yere yazmaz, yalnız nesne döndürür —
 * çağıran (repo.demoVerisiniYukle) yazma ve geri alma sorumluluğunu taşır.
 */
export function demoVeriUret(bugun: Date = new Date()): DemoVeri {
  const rnd = uretec(20260809); // sabit tohum — ekran görüntüleri tekrarlanabilir olsun
  const secim = <T,>(dizi: readonly T[]): T => dizi[Math.floor(rnd() * dizi.length)];

  const siniflar: Sinif[] = SINIF_ADLARI.map((ad, i) => ({ id: i + 1, ad, brans: "Fizik" }));

  const ogrenciler: Ogrenci[] = [];
  let ogrenciId = 0;
  siniflar.forEach((s, si) => {
    for (let i = 0; i < 10; i++) {
      ogrenciId++;
      ogrenciler.push({
        id: ogrenciId,
        sinifId: s.id,
        // Okul No biçimleri bilerek karışık: iki/üç haneli ve baştan sıfırlı —
        // e-Okul eşleştirmesi string karşılaştırma yapıyor, demo da onu yansıtsın.
        no: i === 0 ? `0${si + 1}${i + 1}` : `${(si + 1) * 100 + i + 1}`,
        adSoyad: ADLAR[si][i],
        veliAd: "—",
        veliTel: `0532 000 ${String(ogrenciId).padStart(4, "0")}`,
      });
    }
  });

  // ── Devamsızlık: her sınıfta birkaç kritik/dikkat, çoğu temiz ────────────
  const devamsizlik: Devamsizlik[] = [];
  for (const o of ogrenciler) {
    const p = rnd();
    if (p > 0.82) {
      const ozursuz = 6 + Math.floor(rnd() * 6);
      devamsizlik.push({ ogrenciId: o.id, ozurluGun: Math.floor(rnd() * 3), ozursuzGun: ozursuz, gec: Math.floor(rnd() * 4), toplamGun: ozursuz + 1 });
    } else if (p > 0.55) {
      const ozursuz = 1 + Math.floor(rnd() * 4);
      const ozurlu = rnd() > 0.6 ? 0.5 : 1; // yarım gün de bulunsun
      devamsizlik.push({ ogrenciId: o.id, ozurluGun: ozurlu, ozursuzGun: ozursuz, gec: Math.floor(rnd() * 3), toplamGun: ozursuz + ozurlu });
    }
  }

  // ── Günlük katılım kayıtları: son 30 günün ders günlerine yayılmış ───────
  const KRITERLER = [1, 3, 4, 5, 6]; // seedKriterler ile aynı id'ler
  const gunlukKayitlar: GunlukKayit[] = [];
  let gunlukId = 0;
  for (let geriGun = 30; geriGun >= 1; geriGun -= 3) {
    const tarih = gunEkle(bugun, -geriGun);
    for (const o of ogrenciler) {
      if (rnd() > 0.35) continue; // her öğrenci her gün işlenmiyor
      const kriterId = secim(KRITERLER);
      const deger = kriterId === 5 ? -2 : kriterId === 6 ? -3 : kriterId === 3 ? 2 : 1;
      gunlukKayitlar.push({ id: ++gunlukId, ogrenciId: o.id, tarih, kriterId, deger, donem: 1 });
    }
  }

  // ── Sınav ve performans notları ──────────────────────────────────────────
  const sinavNotlari: SinavNotu[] = [];
  const performansNotlari: SinavNotu[] = [];
  for (const o of ogrenciler) {
    for (const ad of ["1. Yazılı", "2. Yazılı"]) {
      const p = rnd();
      // G (girmedi) ve K (kopya) özel değerleri de görünsün — MASTER §3
      const puan: SinavNotu["puan"] = p > 0.96 ? "G" : p > 0.92 ? "K" : 25 + Math.floor(rnd() * 75);
      sinavNotlari.push({ ogrenciId: o.id, ad, puan, donem: 1, kaynak: "senkron" });
    }
    if (rnd() > 0.2) {
      performansNotlari.push({ ogrenciId: o.id, ad: "1.Performans", puan: 40 + Math.floor(rnd() * 60), donem: 1, kaynak: "senkron" });
    }
  }

  // ── Ödevler: her sınıfa biri puanlı biri işaretli iki ödev ───────────────
  const odevler: OdevKaydi[] = [];
  const odevPuanlari: OdevPuani[] = [];
  const eksikOdev: Record<number, number> = {};
  let odevId = 0;
  for (const s of siniflar) {
    const sinifOgr = ogrenciler.filter((o) => o.sinifId === s.id);
    const puanliId = ++odevId;
    odevler.push({ id: puanliId, sinifId: s.id, ad: "Kitap s.45 Basınç Problemleri", tarih: gunEkle(bugun, -12), mod: "puan", donem: 1 });
    const isaretliId = ++odevId;
    odevler.push({ id: isaretliId, sinifId: s.id, ad: "Deney raporu: Serbest düşme", tarih: gunEkle(bugun, -5), mod: "isaret", donem: 1 });
    for (const o of sinifOgr) {
      const p = rnd();
      odevPuanlari.push({ odevId: puanliId, ogrenciId: o.id, puan: p > 0.88 ? "G" : 50 + Math.floor(rnd() * 50) });
      const yapti = rnd() > 0.25;
      odevPuanlari.push({ odevId: isaretliId, ogrenciId: o.id, puan: yapti ? "+" : "-" });
      if (!yapti) eksikOdev[o.id] = (eksikOdev[o.id] ?? 0) + 1;
    }
  }

  // ── Davranış/rehberlik etiketleri (seedDavranisEtiketleri id'leri: 1..4) ──
  const ETIKET_NOTLARI: Record<number, string> = {
    1: "Derse hazırlıklı geliyor, defter düzeni tam.",
    2: "Rehberlik servisiyle görüşme planlandı.",
    3: "Veli ile telefonda görüşüldü, bilgilendirme yapıldı.",
    4: "Ödev teslimleri izleniyor.",
  };
  const ogrenciEtiketleri: OgrenciEtiket[] = [];
  let etiketKayitId = 0;
  for (const o of ogrenciler) {
    if (rnd() > 0.28) continue;
    const etiketId = 1 + Math.floor(rnd() * 4);
    ogrenciEtiketleri.push({
      id: ++etiketKayitId, ogrenciId: o.id, etiketId,
      tarih: gunEkle(bugun, -Math.floor(rnd() * 25)),
      not: ETIKET_NOTLARI[etiketId], donem: 1,
    });
  }

  // ── Tutanak: az sayıda, olgusal dil (KVKK: özel nitelikli, minimum) ──────
  const TUTANAK_KONULARI = [
    "Ders sırasında telefon kullanımı hakkında görüşme yapıldı.",
    "Sınav kurallarına uyulmadığı gözlendi, öğrenciyle konuşuldu.",
    "Derse geç kalma tekrarı hakkında veli bilgilendirildi.",
  ];
  const tutanaklar: TutanakKaydi[] = [];
  let tutanakId = 0;
  for (const o of ogrenciler) {
    if (rnd() > 0.06) continue;
    tutanaklar.push({ id: ++tutanakId, ogrenciId: o.id, tarih: gunEkle(bugun, -Math.floor(rnd() * 40)), konu: secim(TUTANAK_KONULARI), donem: 1 });
  }

  // ── Yapılacaklar ────────────────────────────────────────────────────────
  const gorevler: Gorev[] = [
    { id: 1, metin: "11-E sınıfının 2. yazılı notlarını e-Okul'a gir", durum: "bekliyor", eklenmeZamani: `${gunEkle(bugun, -3)}T09:00:00`, sonTarih: gunEkle(bugun, 2) },
    { id: 2, metin: "Zümre toplantısı sunumunu hazırla", durum: "bekliyor", eklenmeZamani: `${gunEkle(bugun, -6)}T14:20:00`, sonTarih: gunEkle(bugun, 7) },
    { id: 3, metin: "9-A deney raporu föyünü çoğalt", durum: "tamamlandi", eklenmeZamani: `${gunEkle(bugun, -9)}T11:10:00` },
  ];

  // ── Haftalık ders programı: her sınıfa iki saat ─────────────────────────
  const dersProgrami: DersProgrami[] = [];
  let dersId = 0;
  siniflar.forEach((s, i) => {
    dersProgrami.push({ id: ++dersId, sinifId: s.id, gun: (i % 5) + 1, sira: (i % 6) + 1, ad: "Fizik" });
    dersProgrami.push({ id: ++dersId, sinifId: s.id, gun: ((i + 2) % 5) + 1, sira: ((i + 3) % 6) + 1, ad: "Fizik" });
  });

  return {
    siniflar, ogrenciler, devamsizlik, gunlukKayitlar, sinavNotlari, performansNotlari,
    odevler, odevPuanlari, ogrenciEtiketleri, tutanaklar, gorevler, dersProgrami, eksikOdev,
    sonGunlukId: gunlukId, sonOdevId: odevId, sonOgrenciEtiketId: etiketKayitId,
    sonTutanakId: tutanakId, sonGorevId: gorevler.length, sonDersId: dersId,
  };
}
