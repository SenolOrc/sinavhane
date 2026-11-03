// lib/yilGecisi.ts — Yeni Öğretim Yılı sıfırlamasının TAM sırası tek yerde.
//
// Neden lib/: sıfırlama iki ayrı depoyu ilgilendiriyor — repo'nun senkron JSON
// blob'u (sınıf/öğrenci/föy METADATA'sı) ve ders-kitabi modülünün IndexedDB föy
// İÇERİK deposu. Ayarlar modülü ders-kitabi'nin deposunu doğrudan çağıramaz
// (CLAUDE.md: modüller birbirini çağırmaz); modüller arası orkestrasyon lib'e
// çıkar — lib/tamYedek.ts ile aynı kalıp.
//
// Bu dosya var olmadan önce sihirbaz yalnız yeniYilIcinSifirla() çağırıyordu;
// o fonksiyon IndexedDB'ye hiç dokunmadığı için her yıl geçişinde föy görselleri
// (gömülü JPEG'ler, onlarca-yüzlerce MB) erişilemez ama silinemez hâlde kalıyor,
// üstelik foyDeposuSnapshotiAl tüm anahtarları okuduğundan bu ölü veri sonraki
// HER tam yedeğe tekrar giriyordu.
import { planlariTemizle } from "@/modules/oturma-plani/storage/depo";
import { foyDeposunuTemizle } from "@/modules/ders-kitabi/storage/foyDepo";
import { donemGecisiUygula, ogretimYiliIlerlet, yeniYilIcinSifirla, yilArsiviEkle } from "@/db/repo";

/** Yeni Öğretim Yılı sihirbazının son adımı. GERİ DÖNÜŞÜ YOK — çağırmadan önce
 *  sihirbaz zorunlu tam yedek + riskli öğrenciler raporunu almış olmalı.
 *
 *  `guvenceler` bunu yalnız UI'da (disabled buton) değil, ÇAĞRI ANINDA
 *  zorunlu kılar: sihirbazın "Devam" butonları atlanabilir bir UI akışıdır,
 *  bu fonksiyon veri katmanının son kapısıdır. İleride bu fonksiyon başka
 *  bir yerden (yeni ekran, test, konsol) çağrılırsa da yedeksiz/raporsuz
 *  sıfırlama İMKANSIZ olur — sessizce true geçmek çağıranın kendi seçimidir,
 *  yanlışlıkla atlanamaz. */
export async function yilGecisiniTamamla(
  yilAdi: string,
  guvenceler: { yedekAlindi: boolean; raporIndirildi: boolean },
): Promise<void> {
  if (!guvenceler.yedekAlindi || !guvenceler.raporIndirildi) {
    throw new Error(
      "Yıl geçişi tamamlanamadı: zorunlu tam yedek ve riskli öğrenciler raporu alınmadan sıfırlama yapılamaz.",
    );
  }

  // SIRA 1 — föy içerikleri. Yıkıcı adımların İLKİ olması bilinçli: bu adım
  // başarısız olursa (IndexedDB kotası/erişimi) henüz hiçbir şey silinmemiştir,
  // hata çağırana çıkar ve öğretmen aynı sihirbazdan tekrar deneyebilir.
  // Tersi sırada, sıfırlama başarılı olup temizlik patlarsa geriye yine yetim
  // içerik kalırdı — düzeltmeye çalıştığımız durumun ta kendisi.
  await foyDeposunuTemizle();

  // SIRA 2 — arşiv izi. Mevcut dönem snapshot'larına referans verir, sıfırlama
  // snapshot'ları sildiği için ARŞİVLEME SIFIRLAMADAN ÖNCE olmalı.
  yilArsiviEkle(yilAdi);

  // SIRA 3 — asıl sıfırlama (kitaplar/kırpmalar/sınavlar korunur, gerisi gider).
  yeniYilIcinSifirla();

  // SIRA 3b — oturma planları (ayrı localStorage deposu; sihirbaz "silinir" diyordu
  // ama silinmiyordu, 2026-09 denetimi).
  planlariTemizle();

  // SIRA 4 — yeni yıl 1. dönemle açılır.
  donemGecisiUygula({ aktifDonem: 1 });

  // SIRA 5 — aktif öğretim yılı ilerletilir. Bunsuz yeni yılın kazanımları
  // eski yıl etiketiyle yazılır ve kazanım kimliğinin "aynı öğretim yılının
  // kazanımı asla iki kere gelmez" varsayımı bozulur (bkz. db/repo.ts::ogretimYiliIlerlet).
  ogretimYiliIlerlet(yilAdi);
}
