// db/seed.ts — Faz 1 elle başlangıç verisi (MASTER §9: "elle 1 sınıf + birkaç öğrenci").
// Gerçek e-Okul verisi Faz 3'te eklenecek. Burası sadece çalışan iskeleti besler.
import type { Sinif, Ogrenci, Kriter, Devamsizlik, DonemAgirlik, DavranisEtiket, DersProgrami, OdevKaydi, OdevPuani } from "@shared/types";
import type { KazanimTanimi } from "@/db/repo";

export const seedSiniflar: Sinif[] = [
  { id: 1, ad: "10-B", brans: "Fizik" },
  { id: 2, ad: "9-A", brans: "Fizik" },
  { id: 3, ad: "9-G", brans: "Fizik" }, // TEST: seyrek/uzun Okul No eşleştirme senaryosu
];

export const seedOgrenciler: Ogrenci[] = [
  { id: 1, sinifId: 1, no: "101", adSoyad: "Ahmet Yılmaz", veliAd: "Mehmet Yılmaz", veliTel: "0532 000 0001" },
  { id: 2, sinifId: 1, no: "102", adSoyad: "Ayşe Demir", veliAd: "Fatma Demir", veliTel: "0532 000 0002" },
  { id: 3, sinifId: 1, no: "103", adSoyad: "Burak Kaya", veliAd: "Ali Kaya", veliTel: "0532 000 0003" },
  { id: 4, sinifId: 1, no: "104", adSoyad: "Cem Şahin", veliAd: "Veli Şahin", veliTel: "0532 000 0004" },
  { id: 5, sinifId: 1, no: "105", adSoyad: "Derya Çelik", veliAd: "Hatice Çelik", veliTel: "0532 000 0005" },
  { id: 6, sinifId: 1, no: "106", adSoyad: "Emre Arslan", veliAd: "Hasan Arslan", veliTel: "0532 000 0006" },
  { id: 7, sinifId: 1, no: "107", adSoyad: "Fatma Aydın", veliAd: "Zeynep Aydın", veliTel: "0532 000 0007" },
  { id: 8, sinifId: 1, no: "108", adSoyad: "Gökhan Öz", veliAd: "Mustafa Öz", veliTel: "0532 000 0008" },
  { id: 9, sinifId: 2, no: "201", adSoyad: "Hande Yıldız", veliAd: "Sema Yıldız", veliTel: "0532 000 0009" },
  { id: 10, sinifId: 2, no: "202", adSoyad: "İsmail Koç", veliAd: "Osman Koç", veliTel: "0532 000 0010" },
  // ── TEST sınıfı 9-G: adapter eşleştirmesini zorlayan Okul No BİÇİMLERİ ──
  // Buradaki isimler ve numaralar UYDURMA. Önemli olan kişiler değil, numara
  // biçimleri: iki haneli, üç haneli ve baştaki sıfırlı numaralar bir arada
  // bulunsun ki e-Okul adapter'ının Okul No anahtarlı eşleştirmesi (string
  // karşılaştırma, sayıya çevirmeden) bu üç durumda da sınansın.
  // GERÇEK ÖĞRENCİ VERİSİ BU DOSYAYA GİRMEZ (KVKK, MASTER §2).
  { id: 11, sinifId: 3, no: "28", adSoyad: "Deniz Aksoy", veliAd: "—", veliTel: "0532 000 0028" },
  { id: 12, sinifId: 3, no: "34", adSoyad: "Elif Naz Toprak", veliAd: "—", veliTel: "0532 000 0034" },
  { id: 13, sinifId: 3, no: "220", adSoyad: "Kerem Ali Doğan", veliAd: "—", veliTel: "0532 000 0220" },
  { id: 14, sinifId: 3, no: "232", adSoyad: "Selin Korkmaz", veliAd: "—", veliTel: "0532 000 0232" },
];

// MASTER §5 Kademe 1 örneği (Fizik/Lise). Faz 1'de seed; Ayarlar ekranı sonra düzenler.
export const seedKriterler: Kriter[] = [
  { id: 1, ad: "Kitap getirdi", tip: "durum", puanDegeri: 1 },
  { id: 3, ad: "Aktif katılım", tip: "arti", puanDegeri: 2 },
  { id: 4, ad: "Soru çözdü", tip: "arti", puanDegeri: 1 },
  { id: 5, ad: "Uyudu", tip: "eksi", puanDegeri: -2 },
  { id: 6, ad: "Dersi bozdu", tip: "eksi", puanDegeri: -3 },
];

// Risk motorunu (core/risk.ts) ekranda görmek için örnek devamsızlık.
// Faz 3'te e-Okul'dan gelecek; şimdilik renkleri canlandırmak için.
export const seedDevamsizlik: Devamsizlik[] = [
  { ogrenciId: 3, ozurluGun: 1, ozursuzGun: 9, gec: 2, toplamGun: 10 }, // kritik
  { ogrenciId: 6, ozurluGun: 2, ozursuzGun: 5, gec: 1, toplamGun: 7 },  // dikkat
  { ogrenciId: 11, ozurluGun: 5.5, ozursuzGun: 3, gec: 0, toplamGun: 8.5 }, // yarım gün (0.5) taşıyan tek kayıt
];

// Faz 1'de ödev eksiği elle (Classroom yok). Risk demosu için.
export const seedEksikOdev: Record<number, number> = { 3: 6, 6: 3 };

// MASTER §5 Kademe 2 — Fizik/Lise 1. dönem örneği. Toplam 1.0 olmalı.
// Ayarlar ekranından düzenlenir; döneme bağlıdır (1. ve 2. dönem farklı olabilir).
export const seedAgirliklari: DonemAgirlik[] = [
  { donem: 1, kriterGrubu: "katilim", agirlik: 0.25 }, // ders içi katılım (günlük +/-)
  { donem: 1, kriterGrubu: "odev", agirlik: 0.25 },
  { donem: 1, kriterGrubu: "sinav", agirlik: 0.20 },
  { donem: 1, kriterGrubu: "mebi", agirlik: 0.15 },
  { donem: 1, kriterGrubu: "kitap", agirlik: 0.15 },
];

// MASTER §10.3 — örnek davranış/rehberlik etiketleri (öğretmen düzenler). Olgusal dil.
export const seedDavranisEtiketleri: DavranisEtiket[] = [
  { id: 1, ad: "Olumlu gelişim", renk: "#10b981" },
  { id: 2, ad: "Rehberliğe yönlendirildi", renk: "#a855f7" },
  { id: 3, ad: "Veli görüşmesi yapıldı", renk: "#3b82f6" },
  { id: 4, ad: "Takip", renk: "#f97316" },
];

// MASTER §10.2 — örnek haftalık program (öğretmen düzenler). gun: 1=Pzt..7=Paz.
export const seedDersProgrami: DersProgrami[] = [
  { id: 1, sinifId: 1, gun: 1, sira: 1, ad: "Fizik" }, // 10-B Pzt 1.ders
  { id: 2, sinifId: 1, gun: 3, sira: 3, ad: "Fizik" }, // 10-B Çar 3.ders
  { id: 3, sinifId: 2, gun: 1, sira: 4, ad: "Fizik" }, // 9-A Pzt 4.ders
  { id: 4, sinifId: 2, gun: 4, sira: 1, ad: "Fizik" }, // 9-A Per 1.ders
  { id: 5, sinifId: 3, gun: 2, sira: 1, ad: "Fizik" }, // 9-G Sal 1.ders
  { id: 6, sinifId: 3, gun: 5, sira: 4, ad: "Fizik" }, // 9-G Cum 4.ders
];

// Kazanımlar gerçekte e-Okul Gelişim Düzeyi ekranından eklentiyle gelir (demo yok).
export const seedKazanimlar: KazanimTanimi[] = [];


// Örnek puanlı ödev (9-G) — deneme için.
export const seedOdevler: OdevKaydi[] = [
  { id: 1, sinifId: 3, ad: "Kitap s.45 Basınç Problemleri", tarih: "2026-06-22", mod: "puan", donem: 1 },
];
export const seedOdevPuanlari: OdevPuani[] = [
  { odevId: 1, ogrenciId: 11, puan: 80 },
  { odevId: 1, ogrenciId: 12, puan: "G" },
  { odevId: 1, ogrenciId: 13, puan: 95 },
  { odevId: 1, ogrenciId: 14, puan: 70 },
];
