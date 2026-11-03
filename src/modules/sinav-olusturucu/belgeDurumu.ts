import {
  MAX_KENAR_BOSLUK_MM,
  MIN_KENAR_BOSLUK_MM,
  SATIR_MM,
  VARSAYILAN_LOGO_BOYUT,
} from "./constants";
import type { SinavGecmisDurumu } from "./history";
import type { BaslikBilgileri, SinavTaslagi, SoruOgesi } from "./types";
import { sayiSinirla } from "./utils";

/**
 * Sınav belgesinin TAMAMI: başlık + sorular + sayfa düzeni ayarları.
 *
 * NEDEN tek nesne: bu 26 alan daha önce ekranda 26 ayrı `useState`'ti ve aynı
 * liste BEŞ yerde elle tekrarlanıyordu — `taslakOlustur`, `taslakUygula`,
 * `gecmisAdimiUygula`, geçmiş efektinin bağımlılık dizisi ve autosave
 * efektinin bağımlılık dizisi. Beşi birden güncellenmediğinde hata SESSİZ
 * kalıyordu ve bu sınıf en az üç kez gerçekten oldu (DEVAM §9.6; ekrandaki
 * "sınav türü/başlık değişimleri autosave'i tetiklemiyordu" ve "BEP görünümü
 * kaydedilmiyordu" yorumları o olayların kaydı).
 *
 * Alanlar tek nesnede toplandığında liste diye bir şey KALMIYOR: taslak bu
 * nesneden türetiliyor, iki bağımlılık dizisi de tek bir `belge` girdisine
 * iniyor. Yani düzeltme "listeleri eşit tutmayı hatırlamak" değil, listeyi
 * ortadan kaldırmak.
 *
 * `SinavGecmisDurumu`'na atanabilir olmak ZORUNDA (geçmiş anlık görüntüsü onu
 * bekliyor); buradaki tip ondan yalnız daha DAR: normalleştirmeden sonra
 * opsiyonel ayarların hepsi doludur, bu yüzden ekran onları `undefined`
 * kontrolü yapmadan okuyabilir.
 */
export type SinavBelgeDurumu = {
  baslik: Required<Omit<BaslikBilgileri, "logoDataUrl">> & { logoDataUrl?: string };
  sorular: SoruOgesi[];
  // `sikBicimi`/`sikDuzeni` BİLEREK opsiyonel kalır: yokluğu "kipin varsayılanı"
  // demek (test → A) / otomatik düzen, yazılı → a) / liste).
  ayarlar: Required<Omit<SinavTaslagi["ayarlar"], "sikBicimi" | "sikDuzeni">> &
    Pick<SinavTaslagi["ayarlar"], "sikBicimi" | "sikDuzeni">;
};

type BelgeBaslik = SinavBelgeDurumu["baslik"];
type BelgeAyarlar = SinavBelgeDurumu["ayarlar"];

/** Değer ya da React'in `setState`'indeki gibi bir güncelleyici. Belge
 *  alanlarının hiçbiri fonksiyon tipinde değil, bu yüzden ayrım runtime'da
 *  `typeof === "function"` ile güvenle yapılabiliyor. */
type Yenile<T> = T | ((mevcut: T) => T);

/**
 * Eylemler alan adına göre AYRIŞTIRILMIŞ bir birleşim: `alan: "sutunAra"`
 * seçildiğinde `deger` yalnız `number` kabul eder.
 *
 * Bu ayrıntı §14.5'te bir kümenin geri alınma sebebiydi: oradaki sarmalayıcı
 * dinamik anahtar kullandığı için tip daralmasını KAYBEDİYOR, cast gerektiriyor
 * ve "o varyantta olmayan alanı isteme" hatasını açıyordu. Burada daralma çağrı
 * yerinde korunuyor; cast yalnız reducer'ın İÇİNDE, hesaplanmış anahtarla nesne
 * kurarken var (TypeScript hesaplanmış anahtarı birleşim üyesiyle
 * ilişkilendiremiyor).
 */
// `-?` ŞART: `logoDataUrl` opsiyonel olduğu için eşlenmiş tip opsiyonelliği
// taşır, indeksleme birleşime `undefined` sokar ve switch içindeki daralma
// tamamen bozulur (alan/deger "yok" görünür).
export type SinavBelgeEylemi =
  | {
      [K in keyof BelgeBaslik]-?: { tur: "baslik"; alan: K; deger: Yenile<BelgeBaslik[K]> };
    }[keyof BelgeBaslik]
  | {
      [K in keyof BelgeAyarlar]-?: { tur: "ayar"; alan: K; deger: Yenile<BelgeAyarlar[K]> };
    }[keyof BelgeAyarlar]
  | { tur: "sorular"; deger: Yenile<SoruOgesi[]> }
  /** Toptan yükleme (dosyadan içe aktarma, kurtarma, geri alma adımı). */
  | { tur: "belge"; deger: SinavBelgeDurumu };

function coz<T>(deger: Yenile<T>, mevcut: T): T {
  return typeof deger === "function" ? (deger as (m: T) => T)(mevcut) : deger;
}

export function belgeReducer(
  durum: SinavBelgeDurumu,
  eylem: SinavBelgeEylemi,
): SinavBelgeDurumu {
  switch (eylem.tur) {
    case "baslik": {
      const mevcut = durum.baslik[eylem.alan];
      const yeni = coz(eylem.deger as Yenile<unknown>, mevcut);
      // Değişmediyse AYNI nesne dönüyor: React o render'ı atlar, geçmiş ve
      // autosave efektleri boşuna tetiklenmez.
      if (Object.is(mevcut, yeni)) return durum;
      return {
        ...durum,
        baslik: { ...durum.baslik, [eylem.alan]: yeni } as BelgeBaslik,
      };
    }
    case "ayar": {
      const mevcut = durum.ayarlar[eylem.alan];
      const yeni = coz(eylem.deger as Yenile<unknown>, mevcut);
      if (Object.is(mevcut, yeni)) return durum;
      return {
        ...durum,
        ayarlar: { ...durum.ayarlar, [eylem.alan]: yeni } as BelgeAyarlar,
      };
    }
    case "sorular": {
      const yeni = coz(eylem.deger, durum.sorular);
      if (Object.is(durum.sorular, yeni)) return durum;
      return { ...durum, sorular: yeni };
    }
    case "belge":
      return eylem.deger;
  }
}

/**
 * Boş sahnenin başlangıç durumu.
 *
 * DİKKAT — bu, `belgeDurumunuNormallestir`'in varsayılanlarıyla BİLEREK aynı
 * değil: boş ekranda `sinifSeviyesi` ve `donem` BOŞ başlar (öğretmen kendi
 * seçsin), oysa alanı eksik bir taslak yüklenirken "9. SINIF"/"1. DÖNEM"
 * varsayılır. İkisini eşitlemek, boş sınavın seçilmemiş alanlarını seçilmiş
 * gibi göstermek olurdu.
 */
export function bosBelgeDurumu(): SinavBelgeDurumu {
  return {
    baslik: {
      okulAdi: "",
      sinifSeviyesi: "",
      donem: "",
      yaziliNo: "",
      ders: "",
      tarih: "",
      sureDakika: "",
      logoDataUrl: undefined,
      logoBoyut: VARSAYILAN_LOGO_BOYUT,
    },
    sorular: [],
    ayarlar: {
      kenarBosluk: 10,
      varsayilanSoruBosluk: 4 * SATIR_MM, // 4 satırlık boşluk
      ogretmenler: [""],
      sayfaNoGoster: true,
      sayfaDuzeni: "cift",
      sutunAra: 8,
      sutunAyirici: true,
      bGrubuAktif: false,
      bSeed: 20260706,
      aktifGrup: "A",
      sonYazdirilanBSeed: null,
      sinavTuru: "yazili",
      testBaslik: "",
      testSonucKutusu: true,
      sikBicimi: undefined,
      sikDuzeni: undefined,
      bepAktif: false,
      bepSeciliIds: [],
      bepPuntoArtis: 2,
      kaynakSecimSayaci: 1,
    },
  };
}

/**
 * Dışarıdan gelen bir taslağı (dosya, kütüphane, geri alma adımı) ekranın
 * beklediği tam durumla eşler.
 *
 * NEDEN tek fonksiyon: bu varsayılanlar eskiden `taslakUygula` ve
 * `gecmisAdimiUygula` içinde AYRI AYRI yazılıydı ve "birebir aynı kalmalı"
 * uyarısı yalnız yorumda duruyordu (§9.6, tuzak 3). İkisi zaten bir yerde
 * ayrışmıştı: `kaynakSecimSayaci` yükleme yolunda mevcut soruların en büyük
 * seçim numarasından türetiliyor, geri alma yolunda `0`'a düşüyordu. Sayaç
 * 0'a düşerse PDF'ten eklenen yeni seçim numaraları mevcut sorularla çakışır;
 * bu yüzden birleştirmede GÜVENLİ olan (türetme) tarafı alındı.
 *
 * `sorular` bilerek dokunulmadan geçiyor: yükleme yolunun HTML temizliği
 * çağıranda kalmalı (geri alma adımları bu ekranda üretildiği için yeniden
 * temizlenmeleri gereksiz).
 */
export function belgeDurumunuNormallestir(
  kaynak: SinavGecmisDurumu,
  sorular: SoruOgesi[] = kaynak.sorular ?? [],
): SinavBelgeDurumu {
  const baslik = kaynak.baslik ?? ({} as BaslikBilgileri);
  const ayarlar = kaynak.ayarlar ?? ({} as SinavTaslagi["ayarlar"]);
  return {
    baslik: {
      okulAdi: baslik.okulAdi ?? "",
      sinifSeviyesi: baslik.sinifSeviyesi ?? "9. SINIF",
      donem: baslik.donem ?? "1. DÖNEM",
      yaziliNo: baslik.yaziliNo ?? "1. YAZILI",
      ders: baslik.ders ?? "",
      tarih: baslik.tarih ?? "",
      sureDakika: baslik.sureDakika ?? "",
      logoDataUrl: baslik.logoDataUrl ?? undefined,
      // Alanı olmayan ESKİ taslaklar buradan geçiyor: 14 mm'lik eski çizim
      // yerine varsayılan "orta" (22 mm) alıyorlar. Bu bilerek: boyut kararı
      // öğretmenin bildirdiği sorunun ta kendisiydi, eski değeri korumak
      // düzeltmeyi yalnız yeni sınavlara uygulardı.
      logoBoyut: baslik.logoBoyut ?? VARSAYILAN_LOGO_BOYUT,
    },
    sorular,
    ayarlar: {
      // Eski taslaklarda 5 mm olabilir; fiziksel asgariye sıkıştırılır.
      kenarBosluk: sayiSinirla(
        ayarlar.kenarBosluk ?? 10,
        MIN_KENAR_BOSLUK_MM,
        MAX_KENAR_BOSLUK_MM,
      ),
      varsayilanSoruBosluk: ayarlar.varsayilanSoruBosluk ?? 4 * SATIR_MM,
      ogretmenler: ayarlar.ogretmenler?.length ? ayarlar.ogretmenler : [""],
      sayfaNoGoster: ayarlar.sayfaNoGoster ?? true,
      sayfaDuzeni: ayarlar.sayfaDuzeni ?? "cift",
      sutunAra: ayarlar.sutunAra ?? 8,
      sutunAyirici: ayarlar.sutunAyirici ?? true,
      bGrubuAktif: ayarlar.bGrubuAktif ?? false,
      bSeed: ayarlar.bSeed ?? 20260706,
      aktifGrup: ayarlar.aktifGrup ?? "A",
      sonYazdirilanBSeed: ayarlar.sonYazdirilanBSeed ?? null,
      sinavTuru: ayarlar.sinavTuru ?? "yazili",
      testBaslik: ayarlar.testBaslik ?? "",
      testSonucKutusu: ayarlar.testSonucKutusu ?? true,
      sikBicimi: ayarlar.sikBicimi,
      sikDuzeni: ayarlar.sikDuzeni,
      bepAktif: ayarlar.bepAktif ?? false,
      bepSeciliIds: ayarlar.bepSeciliIds ?? [],
      bepPuntoArtis: ayarlar.bepPuntoArtis ?? 2,
      // Taslakta kayıtlı sayaç yoksa (eski sürüm dosyası), mevcut sorulardaki
      // en büyük kaynak seçim numarasından türetilir; PDF'ten yeni seçim
      // eklenince numaralar 1'den başlayıp mevcut sorularla çakışmasın diye.
      kaynakSecimSayaci:
        ayarlar.kaynakSecimSayaci ??
        Math.max(1, ...sorular.map((soru) => (soru.kaynakSecimNo ?? 0) + 1)),
    },
  };
}
