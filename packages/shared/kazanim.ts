// packages/shared/kazanim.ts — kazanım kimliği ve öğretim yılı için saf fonksiyonlar.
// Hem apps/desktop (db/repo.ts) hem apps/extension (adapters/eokul-kazanim.ts)
// bunları kullanır; bu yüzden core/ değil packages/shared altında.

// e-Okul/MEB kazanım kodu deseni: "FİZ.9.3.1." (Lise, 3 basamak) VE
// "F.3.1.1.1." (İlkokul/Ortaokul, 4 basamak) gibi — basamak SAYISI kademeye
// göre değişiyor (gerçek bir "FEN BİLİMLERİ" yıllık planında bulundu, bkz.
// yillikPlanExcel.ts). {2,5} aralığı ikisini de kapsar; regex backtracking
// harf/nokta önekini (ör. "T.C.İNK.") doğru ayırır. Kaynak string olarak
// dışa açılıyor ki apps/extension/src/adapters/eokul-kazanim.ts AYNI deseni
// (farklı bir bayrakla, /g) kullanabilsin — iki yerde elle senkron tutmak
// yerine tek kaynak.
export const KAZANIM_KODU_DESENI_KAYNAK = "[A-ZÇĞİÖŞÜ.]+(?:\\.\\d{1,2}){2,5}\\.";
const KAZANIM_KODU_DESENI = new RegExp(`(${KAZANIM_KODU_DESENI_KAYNAK})`);

export function kazanimKoduTespitEt(metin: string): string | null {
  return metin.match(KAZANIM_KODU_DESENI)?.[1] ?? null;
}

/**
 * Bir hücre/madde metnini AYRI kazanımlara böler: mevcut satır sonları
 * KORUNMAZ (aşağıya bkz.) — bitişik kazanım kodları (aynı satırda birden
 * fazla kod, satır sonu olsun ya da olmasın) tespit edilip her kodun başına
 * bölme noktası eklenir. Hem e-Okul DOM hücreleri
 * (apps/extension/src/adapters/eokul-kazanim.ts) hem yıllık plan Excel
 * hücreleri (apps/desktop .../yillikPlanExcel.ts) için ortak — gerçek bir MEB
 * yıllık planında TEK hücrede "\r\n\r\n" ile ayrılmış birden çok kazanım
 * bulunması YAYGIN, bunu tek kazanım sanmak metinleri birbirine karıştırırdı.
 *
 * Önce TÜM satır sonları boşluğa çevrilip SONRA kod öncesi bölme noktası
 * ekleniyor — tersi (satır sonunu koru + kod ekle) gerçek dosyada bir kazanımı
 * YANLIŞLIKLA ikiye bölüyordu: Excel'de yazar bazen aynı kazanımın içinde
 * salt okunabilirlik için TEK "\r\n" ile satır kaydırması yapmış (çift
 * "\r\n\r\n" değil) — "...yeri hakkında\r\nçıkarımlarda bulunur." gibi, bu
 * kazanımın DEVAMI, yeni bir kazanım değil. Bölme artık SADECE kod tespitine
 * dayandığı için kaynağın satır sonu biçimi (tek/çift \r\n, <br>) fark etmiyor.
 */
export function kazanimSatirlariniAyir(hamMetin: string): string[] {
  const kodDeseni = new RegExp(KAZANIM_KODU_DESENI_KAYNAK, "g");
  const text = hamMetin.replace(/\r\n|\r|\n/g, " ").replace(kodDeseni, "\n$&");
  return text.split("\n").map((x) => x.replace(/\s+/g, " ").trim()).filter((x) => x.length >= 3);
}

export function kazanimMetniNormalle(metin: string): string {
  return metin.trim().toLocaleLowerCase("tr").replace(/\s+/g, " ");
}

/**
 * Kazanım kimliği: öğretim yılı + kademe + ders + (kod ya da normalize metin).
 * e-Okul'un ham DOM id'sinden (rdMadde<konu>_<id>) TAMAMEN BAĞIMSIZ — o id sayfa
 * başına sıfırlanıyor, kademe/derse göre benzersiz değil. Kimlik burada üretilen
 * bileşik anahtardan türediği için farklı kademelerin kazanımları asla çakışmaz.
 */
export function kazanimKimlikUret(alan: {
  ogretimYili: string;
  kademe: string;
  ders: string;
  kod: string | null;
  metin: string;
}): string {
  const dersNorm = alan.ders.toLocaleUpperCase("tr").replace(/\s+/g, " ").trim();
  const anahtar = alan.kod ?? kazanimMetniNormalle(alan.metin);
  return `${alan.ogretimYili}::${alan.kademe}::${dersNorm}::${anahtar}`;
}

/** "2025-2026" gibi, verilen tarihe göre o an içinde bulunulan öğretim yılı. */
export function varsayilanOgretimYili(simdi: Date = new Date()): string {
  const ay = simdi.getMonth() + 1; // 1-12
  const baslangic = ay >= 8 ? simdi.getFullYear() : simdi.getFullYear() - 1;
  return `${baslangic}-${baslangic + 1}`;
}

/** "2025-2026" -> "2026-2027". Format bozuksa aynı değeri değiştirmeden döner. */
export function sonrakiOgretimYili(kapananYil: string): string {
  const m = kapananYil.match(/^(\d{4})-(\d{4})$/);
  if (!m) return kapananYil;
  const baslangic = Number(m[1]) + 1;
  return `${baslangic}-${baslangic + 1}`;
}

export const AY_ADLARI = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

/** "Ekim" ya da "Ekim · 3. hafta" — yıllık plandan gelen ay/hafta rozeti için. */
export function ayHaftaEtiketi(ay?: number, hafta?: number): string | null {
  if (!ay || ay < 1 || ay > 12) return null;
  const adi = AY_ADLARI[ay - 1];
  return hafta ? `${adi} · ${hafta}. hafta` : adi;
}
