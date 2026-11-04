import {
  GorselAssetKaydi,
  hafifSnapshotGeriYukle,
  hafifSnapshotOlustur,
  type SinavGecmisDurumu,
} from "../src/modules/sinav-olusturucu/history";
import {
  sanalPencereHesapla,
  sinirliAllSettled,
  soruListesiniFiltrele,
  soruOzetMetni,
  soruListeEtiketi,
  taslakAnlamliMi,
  yazdirmaKaynaklariniBekle,
} from "../src/modules/sinav-olusturucu/dayaniklilik";
import { gorselSoruYap } from "../src/modules/sinav-olusturucu/soruFabrikasi";
import {
  bepPuaniniUygula,
  bepPuanlariniEsitDagit,
  bepPuanlariniTemizle,
  cevapAnahtariOlustur,
  deterministikKaristir,
  ISARETSIZ_CEVAP,
  maddeHarfi,
  paketFarkindaKaristir,
  puanlariMantiksalEsitDagit,
  siklariKaristir,
  bGrubuSiklariniKaristir,
  soruPuani,
  TEST_SIK_HARFLERI,
} from "../src/modules/sinav-olusturucu/utils";
import {
} from "../src/modules/sinav-olusturucu/utils";
import { parcaOzeti } from "../src/modules/sinav-olusturucu/denklemOzet";
import { OPERATORLER, sembolGruplariniSuz } from "../src/modules/sinav-olusturucu/denklemSemboller";
import { araclariSuz } from "../src/modules/sinav-olusturucu/denklemArama";
// Katlama artık modülün DIŞINDA (@/lib/turkceMetin): ders-kitabi de aynı kapıyı
// kullanıyor ve bir modül başkasının kodunu çağıramaz (CLAUDE.md).
import { aramaIcinKucult } from "../src/lib/turkceMetin";
import type { DenklemParcasi } from "../src/modules/sinav-olusturucu/denklem/tipler";
import { altPunto, TABAN_PUNTO } from "../src/modules/sinav-olusturucu/denklem/ciz";
import {
  parcaGecersizMi,
  tohumParcalari,
} from "../src/modules/sinav-olusturucu/components/DenklemEditoruModal";
import {
  belgeDurumunuNormallestir,
  belgeReducer,
  bosBelgeDurumu,
  type SinavBelgeDurumu,
  type SinavBelgeEylemi,
} from "../src/modules/sinav-olusturucu/belgeDurumu";
import type { LogoBoyut, SinavTaslagi, SoruOgesi } from "../src/modules/sinav-olusturucu/types";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function dogrula(kosul: unknown, mesaj: string) {
  if (!kosul) throw new Error(`SINAV DAYANIKLILIK TESTİ BAŞARISIZ: ${mesaj}`);
}

/**
 * Görsel soru fabrikasını ve tek-kaynak kuralını korur.
 *
 * KORUDUĞU ŞEY: `tur: "gorsel"` bir SoruOgesi beş ayrı yerde elle kuruluyordu;
 * `SoruOgesi`'ne alan eklenince beşi birden güncellenmezse fark SESSİZ kalıyordu.
 * Buradaki iki iddia ayrı ayrı gerekli:
 *  1) Fabrika varsayılanları gerçekten uyguluyor ve `ek` ile ezilebiliyor.
 *  2) Ekran dosyası artık kendi başına görsel soru KURMUYOR — yoksa altıncı
 *     bir kopya sessizce geri gelir ve (1) hâlâ geçer.
 */
function soruFabrikasiSenaryolari() {
  const temel = gorselSoruYap({
    gorselDataUrl: "data:image/png;base64,AAA",
    dosyaAdi: "a.png",
    genislikMm: 40,
    boslukMm: 8,
  });
  dogrula(temel.tur === "gorsel", "fabrika tur alanını gorsel yapmıyor");
  dogrula(temel.punto === 10 && temel.puan === null, "fabrika punto/puan varsayılanını uygulamıyor");
  dogrula(Array.isArray(temel.maddeler) && temel.maddeler.length === 0, "fabrika boş maddeler vermiyor");
  dogrula(temel.maddeKolon === 1 && temel.tamGenislik === false, "fabrika kolon/tamGenislik varsayılanını uygulamıyor");
  dogrula(temel.metinKonumu === "alt" && temel.hizalama === "sol", "fabrika konum/hizalama varsayılanını uygulamıyor");

  const ikinci = gorselSoruYap({
    gorselDataUrl: "data:image/png;base64,BBB",
    dosyaAdi: "b.png",
    genislikMm: 40,
    boslukMm: 8,
  });
  dogrula(temel.id !== ikinci.id, "fabrika her çağrıda yeni id üretmiyor");

  const ezilmis = gorselSoruYap(
    { gorselDataUrl: "data:image/png;base64,CCC", dosyaAdi: "c.png", genislikMm: 40, boslukMm: 8 },
    { tamGenislik: true, punto: 12, kaynakAd: "Kitap, s. 3" },
  );
  dogrula(ezilmis.tamGenislik === true && ezilmis.punto === 12, "`ek` varsayılanları ezemiyor");
  dogrula(ezilmis.kaynakAd === "Kitap, s. 3", "`ek` fabrikada olmayan alanı taşımıyor");

  // Ekran dosyası kendi `tur: "gorsel"` nesnesini kurmamalı. Yorumlarda geçen
  // kelimeyi yakalamamak için gerçek nesne alanı biçimi aranıyor (§13.6.2).
  const ekranKaynagi = readFileSync(
    resolve("src/modules/sinav-olusturucu/SinavOlusturucuScreen.tsx"),
    "utf8",
  );
  dogrula(
    !/\btur:\s*"gorsel"/.test(ekranKaynagi),
    "ekran dosyası görsel soruyu fabrikayı atlayarak kuruyor (soruFabrikasi.ts tek kapı olmalı)",
  );
  dogrula(
    ekranKaynagi.includes("gorselSoruYap"),
    "ekran dosyası soru fabrikasını hiç çağırmıyor",
  );

  console.log("✓ Görsel soru fabrikası: varsayılanlar, ek ile ezme, benzersiz id ve tek-kaynak kuralı");
}

/**
 * Geri al'ın HER belge alanını kapsadığını doğrular (§9.6).
 *
 * KORUDUĞU ŞEY: taslağa yeni bir başlık/ayar alanı eklendiğinde o alan
 *  1) değiştiğinde geçmişe adım yazılmalı (yoksa "bu alanı değiştirdim,
 *     Ctrl+Z çalışmıyor"),
 *  2) geri alındığında eski değerine dönmeli (yoksa geri alma sessizce alan
 *     kaybeder — DEVAM §9.6'nın madde 4 için yazdığı asıl risk).
 *
 * Bu iddia ÖNCE kaynak metnini okuyordu: alan listesi ekranda BEŞ yerde elle
 * tekrarlanıyordu (taslakOlustur / taslakUygula / gecmisAdimiUygula / geçmiş
 * ve autosave bağımlılık dizileri) ve korunacak şey o beş listenin
 * birbiriyle tutarlılığıydı. `belgeDurumu.ts` gelince listeler ORTADAN KALKTI,
 * yani iddia silinmedi, taşındı: artık kaynak metni değil DAVRANIŞ yokluyor —
 * alan adları `bosBelgeDurumu()`'ndan türediği için yeni alan eklendiğinde
 * kapsama kendiliğinden giriyor.
 */
function geriAlKapsamiSenaryolari() {
  const temelSoru = soru("s1", 64);

  /** Alanın MEVCUT değerinden kesinlikle farklı, aynı tipte bir değer üretir.
   *  İki kez uygulandığında üç ayrı değer verir (taban ≠ değişmiş ≠ varsayılan). */
  function farkliDeger(mevcut: unknown, alan: string): unknown {
    if (alan === "logoDataUrl") {
      const uzunluk = typeof mevcut === "string" ? mevcut.length + 1 : 32;
      return `data:image/png;base64,${"L".repeat(uzunluk)}`;
    }
    // `logoBoyut` sınırlı bir küme; genel string dalı "orta-degisti" üretir ve
    // iddia GEÇER ama hiç var olmayan bir değerle — yani alan aslında
    // sınanmamış olur (§15.8: mutasyon test VERİSİNİN darlığını da yakalar).
    // Üçlü küme, sırayla dolaşınca "iki kez uygula → üç ayrı değer" şartını
    // tam karşılıyor.
    if (alan === "logoBoyut") {
      const sira: LogoBoyut[] = ["kucuk", "orta", "buyuk"];
      const yer = sira.indexOf(mevcut as LogoBoyut);
      return sira[(yer < 0 ? 0 : yer + 1) % sira.length];
    }
    if (typeof mevcut === "boolean") return !mevcut;
    if (typeof mevcut === "number") return mevcut + 1;
    if (typeof mevcut === "string") return `${mevcut}-degisti`;
    if (Array.isArray(mevcut)) return [...mevcut, "eklendi"];
    if (mevcut === null || mevcut === undefined) return 4242;
    throw new Error(`farkliDeger: ${alan} için değer üretilemedi`);
  }

  // TABAN DURUM HİÇBİR ALANDA VARSAYILANI KULLANMIYOR — bu şart.
  // İlk yazışında taban `bosBelgeDurumu()`'ydu ve testin kendisinde boşluk
  // vardı: geri yükleme yolunda bir alanı varsayılanına SABİTLEMEK
  // (`sutunAra: 8`) süiti düşürmüyordu, çünkü beklenen değer zaten 8'di.
  // Mutasyon denemesinde yakalandı (§14.8'deki dersin aynısı).
  const bos = bosBelgeDurumu();
  const temel: SinavBelgeDurumu = {
    baslik: Object.fromEntries(
      Object.entries(bos.baslik).map(([alan, deger]) => [alan, farkliDeger(deger, alan)]),
    ) as SinavBelgeDurumu["baslik"],
    sorular: [temelSoru],
    ayarlar: Object.fromEntries(
      Object.entries(bos.ayarlar).map(([alan, deger]) => [alan, farkliDeger(deger, alan)]),
    ) as SinavBelgeDurumu["ayarlar"],
  };

  // Normalleştirme, ZATEN eksiksiz bir belgeye dokunmamalı. Tek satırlık ama
  // en geniş ağ: herhangi bir alanın sabite bağlanması burada yakalanır.
  dogrula(
    JSON.stringify(belgeDurumunuNormallestir(temel)) === JSON.stringify(temel),
    "belgeDurumunuNormallestir eksiksiz bir belgeyi değiştiriyor — bir alan gelen değeri yok sayıp sabite/varsayılana bağlanmış olabilir",
  );

  const alanlar: { tur: "baslik" | "ayar"; alan: string }[] = [
    ...Object.keys(temel.baslik).map((alan) => ({ tur: "baslik" as const, alan })),
    ...Object.keys(temel.ayarlar).map((alan) => ({ tur: "ayar" as const, alan })),
  ];
  dogrula(alanlar.length >= 25, `belge durumundan yalnız ${alanlar.length} alan okundu; kapsam daralmış olabilir`);

  for (const { tur, alan } of alanlar) {
    const kayit = new GorselAssetKaydi();
    const oncekiImza = hafifSnapshotOlustur(temel, kayit);
    const kapsayici = tur === "baslik" ? temel.baslik : temel.ayarlar;
    const yeniDeger = farkliDeger((kapsayici as Record<string, unknown>)[alan], alan);
    const sonra = belgeReducer(temel, {
      tur,
      alan,
      deger: yeniDeger,
    } as unknown as SinavBelgeEylemi);

    dogrula(
      sonra !== temel,
      `"${alan}" değiştirildi ama reducer aynı durumu döndürdü — değişiklik hiç uygulanmıyor`,
    );
    // 1) Değişiklik geçmişe YENİ bir adım olarak yazılabiliyor mu?
    dogrula(
      hafifSnapshotOlustur(sonra, kayit) !== oncekiImza,
      `"${alan}" değiştiğinde geçmiş imzası değişmiyor — o alanın değişimi geçmişe adım yazmaz (Ctrl+Z sessizce çalışmaz)`,
    );
    // 2) Eski adım geri yüklenince alan ESKİ değerine dönüyor mu? Ekranın geri
    //    alma yolu tam olarak bu ikilidir: hafifSnapshotGeriYukle + normalleştir.
    const geri = belgeDurumunuNormallestir(hafifSnapshotGeriYukle(oncekiImza, kayit));
    const geriKapsayici = tur === "baslik" ? geri.baslik : geri.ayarlar;
    const beklenen = (kapsayici as Record<string, unknown>)[alan];
    dogrula(
      JSON.stringify((geriKapsayici as Record<string, unknown>)[alan]) === JSON.stringify(beklenen),
      `"${alan}" geri alındığında eski değerine dönmüyor (beklenen ${JSON.stringify(beklenen)}, gelen ${JSON.stringify((geriKapsayici as Record<string, unknown>)[alan])})`,
    );
  }

  // `sorular` ayrı: değeri bir dizi soru, üreteciyle kurulamaz.
  {
    const kayit = new GorselAssetKaydi();
    const oncekiImza = hafifSnapshotOlustur(temel, kayit);
    const sonra = belgeReducer(temel, { tur: "sorular", deger: [temelSoru, soru("s2", 64)] });
    dogrula(
      hafifSnapshotOlustur(sonra, kayit) !== oncekiImza,
      "soru eklemek geçmiş imzasını değiştirmiyor",
    );
    const geri = belgeDurumunuNormallestir(hafifSnapshotGeriYukle(oncekiImza, kayit));
    dogrula(
      geri.sorular.length === 1 && geri.sorular[0].id === "s1",
      "geri alma soru listesini eski hâline döndürmüyor",
    );
  }

  // Reducer değişmeyen değerde AYNI nesneyi döndürmeli: iki efekt de tek
  // bağımlılık olarak `belge`'yi izliyor, aksi halde her tuşta boşuna tetiklenir.
  dogrula(
    belgeReducer(temel, { tur: "ayar", alan: "sutunAra", deger: temel.ayarlar.sutunAra }) === temel,
    "reducer aynı değeri yazarken yeni nesne üretiyor (geçmiş ve autosave boşuna tetiklenir)",
  );

  // Yapısal ağ: alanlar ekranda tekrar `useState`'e dağıtılırsa bu iddianın
  // kendisi anlamsızlaşır (dağıtılan alan tekrar geçmiş ve autosave dışında
  // kalır). Olumsuz iddia, ekran dosyasının TAMAMI taranarak yazıldı (§11.3).
  const ekran = readFileSync(
    resolve("src/modules/sinav-olusturucu/SinavOlusturucuScreen.tsx"),
    "utf8",
  );
  for (const { alan } of alanlar) {
    const buyuk = alan[0].toUpperCase() + alan.slice(1);
    dogrula(
      !new RegExp(`const \\[${alan}, set${buyuk}\\]`).test(ekran),
      `"${alan}" ekranda tekrar useState'e dağıtılmış — belge durumundan çıkan alan geçmiş ve autosave kapsamından da çıkar`,
    );
  }
  dogrula(
    /\.\.\.belge,/.test(ekran),
    "taslakOlustur belge durumunu yaymıyor; alan listesi geri gelmiş olabilir",
  );
  dogrula(
    ekran.includes("}, [belge]);"),
    "geçmiş efekti artık tek bağımlılık olarak `belge`'yi izlemiyor",
  );
  dogrula(
    /\[autosaveHazir, belge[,\]]/.test(ekran),
    "autosave efekti artık tek bağımlılık olarak `belge`'yi izlemiyor",
  );

  console.log(
    `✓ Geri al kapsamı: ${alanlar.length + 1} belge alanının her biri geçmişe adım yazıyor ve geri alınınca eski değerine dönüyor`,
  );
}

function soru(id: string, gorselBoyutu: number): SoruOgesi {
  return {
    id,
    tur: "gorsel",
    gorselDataUrl: `data:image/png;base64,${id}-${"x".repeat(gorselBoyutu)}`,
    dosyaAdi: `${id}.png`,
    metinKonumu: "alt",
    hizalama: "sol",
    genislikMm: 50,
    boslukMm: 32,
    punto: 10,
    puan: null,
    maddeler: [],
    maddeKolon: 1,
    tamGenislik: false,
    kaynakAd: "Kaynak A, s. 12",
    kaynakSinif: "9",
    kaynakKonu: Number(id.replace("s", "")) % 2 ? "Tek" : "Çift",
  };
}

// Geçmiş artık soruların YANINDA başlık ve sayfa düzenini de taşıyor (8c).
// Testlerin çoğu yalnız sorularla ilgileniyor; bu fabrika gerisini sabitler.
const VARSAYILAN_AYARLAR: SinavGecmisDurumu["ayarlar"] = {
  kenarBosluk: 10,
  varsayilanSoruBosluk: 32,
  ogretmenler: [""],
  sayfaNoGoster: true,
  sayfaDuzeni: "cift",
  sutunAra: 8,
  sutunAyirici: true,
};

function durum(
  sorular: SoruOgesi[],
  ozel: Partial<SinavGecmisDurumu> = {},
): SinavGecmisDurumu {
  return {
    sorular,
    baslik: { okulAdi: "", sinifSeviyesi: "", donem: "", yaziliNo: "", ders: "" },
    ayarlar: VARSAYILAN_AYARLAR,
    ...ozel,
  };
}

function gecmisMetrigi(adet: number, gorselBoyutu: number) {
  const kayit = new GorselAssetKaydi();
  const sorular = Array.from({ length: adet }, (_, i) => soru(`s${i}`, gorselBoyutu));
  const snapshotlar = Array.from({ length: 30 }, (_, adim) =>
    hafifSnapshotOlustur(
      durum(sorular.map((oge, i) => ({ ...oge, puan: i === 0 ? adim : oge.puan }))),
      kayit,
    ),
  );
  const snapshotBayti = snapshotlar.reduce((toplam, x) => toplam + x.length, 0);
  const geri = hafifSnapshotGeriYukle(snapshotlar[12], kayit).sorular;
  dogrula(geri[0].gorselDataUrl === sorular[0].gorselDataUrl, `${adet} görsel geri yüklenemedi`);
  dogrula(kayit.assetSayisi === adet, `${adet} görsel geçmiş adımı başına çoğaltıldı`);
  return { adet, gorselBoyutu, snapshotBayti, assetBayti: kayit.gorselBaytSayisi };
}

for (const adet of [25, 50, 100, 200]) {
  const kucuk = gecmisMetrigi(adet, 256);
  const buyuk = gecmisMetrigi(adet, 128 * 1024);
  const oran = buyuk.snapshotBayti / kucuk.snapshotBayti;
  dogrula(oran < 1.02, `${adet} görselde snapshot boyutu görsel baytıyla büyüdü (${oran})`);
  const eskiTahmini = buyuk.assetBayti * 30;
  console.log(
    `UNDO ${adet}: asset ${(buyuk.assetBayti / 1024 / 1024).toFixed(2)} MiB (1 kez), ` +
      `30 hafif snapshot ${(buyuk.snapshotBayti / 1024 / 1024).toFixed(2)} MiB, ` +
      `eski tam snapshot tahmini ${(eskiTahmini / 1024 / 1024).toFixed(2)} MiB`,
  );
}

{
  const kayit = new GorselAssetKaydi();
  let anlik = hafifSnapshotOlustur(
    durum(Array.from({ length: 200 }, (_, i) => soru(`silinen-${i}`, 64 * 1024))),
    kayit,
  );
  const gecmis: string[] = [];
  for (let adim = 0; adim < 32; adim += 1) {
    gecmis.push(anlik);
    if (gecmis.length > 30) gecmis.shift();
    anlik = hafifSnapshotOlustur(
      durum([{ ...soru("kalan", 64 * 1024), puan: adim }]),
      kayit,
    );
    kayit.kullanilmayanlariTemizle([...gecmis, anlik]);
  }
  dogrula(kayit.assetSayisi === 1, `history cap dışındaki 200 görsel reclaim edilmedi (${kayit.assetSayisi})`);
  const geri = hafifSnapshotGeriYukle(gecmis.at(-1)!, kayit).sorular;
  dogrula(geri[0].id === "kalan" && !!geri[0].gorselDataUrl, "GC sonrası kalan undo çalışmıyor");
  console.log("UNDO GC: history cap aşıldı, 200 eski görsel reclaim edildi; kalan undo çalışıyor");
}

// ─── 8c: geçmiş artık başlık ve sayfa düzenini de kapsıyor ─────────────────
// Eskiden yalnız `sorular` snapshot'lanıyordu: punto/kenar boşluğu/sütun düzeni
// ya da okul adı değiştirildikten sonra Ctrl+Z o değişikliği geri almıyordu.
{
  const kayit = new GorselAssetKaydi();
  const once = durum([soru("a", 128)], {
    baslik: { okulAdi: "Atatürk Lisesi", sinifSeviyesi: "9. SINIF", donem: "1. DÖNEM", yaziliNo: "1. YAZILI", ders: "Fizik" },
    ayarlar: { ...VARSAYILAN_AYARLAR, kenarBosluk: 10, sayfaDuzeni: "cift", sutunAra: 8 },
  });
  const snapshot = hafifSnapshotOlustur(once, kayit);

  // Yalnız AYARI değiştir; sorulara dokunma.
  const sonra = durum([soru("a", 128)], {
    baslik: { ...once.baslik, okulAdi: "Başka Lise" },
    ayarlar: { ...once.ayarlar, kenarBosluk: 25, sayfaDuzeni: "tek", sutunAra: 14 },
  });
  dogrula(
    hafifSnapshotOlustur(sonra, kayit) !== snapshot,
    "yalnız başlık/ayar değişimi geçmişte fark üretmiyor (adım hiç kaydedilmez)",
  );

  const geri = hafifSnapshotGeriYukle(snapshot, kayit);
  dogrula(geri.baslik.okulAdi === "Atatürk Lisesi", "geri alma okul adını geri getirmedi");
  dogrula(geri.baslik.ders === "Fizik", "geri alma ders alanını geri getirmedi");
  dogrula(geri.ayarlar.kenarBosluk === 10, "geri alma kenar boşluğunu geri getirmedi");
  dogrula(geri.ayarlar.sayfaDuzeni === "cift", "geri alma sayfa düzenini geri getirmedi");
  dogrula(geri.ayarlar.sutunAra === 8, "geri alma sütun arasını geri getirmedi");
  dogrula(geri.sorular.length === 1 && geri.sorular[0].id === "a", "geri alma soruları bozdu");
}

// Logo da soru görselleri gibi asset kaydına girmeli: 30 adımlık geçmiş logonun
// tam data URL'ini 30 kez taşımamalı, ama GC de onu erken silmemeli.
{
  const kayit = new GorselAssetKaydi();
  const logo = `data:image/png;base64,${"L".repeat(64 * 1024)}`;
  const temel = durum([soru("a", 128)]);
  const snapshotlar = Array.from({ length: 30 }, (_, adim) =>
    hafifSnapshotOlustur(
      { ...temel, baslik: { ...temel.baslik, logoDataUrl: logo }, ayarlar: { ...temel.ayarlar, sutunAra: adim } },
      kayit,
    ),
  );
  const toplamBayt = snapshotlar.reduce((t, x) => t + x.length, 0);
  dogrula(toplamBayt < logo.length, `logo her geçmiş adımına kopyalanıyor (${toplamBayt} bayt)`);

  kayit.kullanilmayanlariTemizle(snapshotlar);
  const geri = hafifSnapshotGeriYukle(snapshotlar[0], kayit);
  dogrula(geri.baslik.logoDataUrl === logo, "GC logoyu erken sildi veya logo geri yüklenmiyor");
}

const liste = Array.from({ length: 200 }, (_, i) => soru(`s${i}`, 8));
dogrula(
  soruListesiniFiltrele(liste, { arama: "Kaynak A", konu: "Tek" }).length === 100,
  "kompakt arama/konu filtresi yanlış",
);
const pencere = sanalPencereHesapla(liste, 3_000, 560, 56, 5);
dogrula(pencere.dilim.length < 25 && pencere.ustBosluk > 0 && pencere.altBosluk > 0, "200 satırın görünmeyenleri DOM penceresinden çıkarılmadı");

const bosTaslak: SinavTaslagi = {
  surum: "v0.11C",
  kayitZamani: new Date().toISOString(),
  baslik: { okulAdi: "", sinifSeviyesi: "", donem: "", yaziliNo: "", ders: "" },
  sorular: [],
  ayarlar: {
    kenarBosluk: 10,
    varsayilanSoruBosluk: 32,
    ogretmenler: [""],
    sayfaNoGoster: true,
    sayfaDuzeni: "cift",
    sutunAra: 8,
    sutunAyirici: true,
  },
};
dogrula(!taslakAnlamliMi(bosTaslak), "boş varsayılan taslak kurtarma istememeli");
dogrula(taslakAnlamliMi({ ...bosTaslak, baslik: { ...bosTaslak.baslik, okulAdi: "Atatürk Lisesi" } }), "sorusuz başlık taslağı kurtarılmıyor");
dogrula(taslakAnlamliMi({ ...bosTaslak, ayarlar: { ...bosTaslak.ayarlar, sayfaDuzeni: "tek" } }), "sorusuz ayar taslağı kurtarılmıyor");


/**
 * Soru listesindeki özet metni.
 *
 * KORUDUĞU ŞEY: görsel sorularda gövde metni yok ve liste eskiden hepsine
 * düpedüz "Görsel soru" yazıyordu. PDF'ten ya da Soru Havuzu'ndan gelen bir
 * sınavda liste "Görsel soru / Görsel soru / Görsel soru…" hâline geliyor,
 * yani soru listesi tamamen ayırt edilemez oluyordu — 30 soruluk bir sınavda
 * listede gezinmenin başka yolu yok.
 */
function soruOzetiSenaryolari() {
  // `soru()` yardımcısı kaynakAd/dosyaAdi'yı zaten dolduruyor; alt basamakları
  // sınamak için önce TEMİZLENİYOR, yoksa üst basamak hep kazanır (ilk yazışta
  // tam bu yüzden düştü — kod değil test yanlıştı).
  const gorsel = (ek: Partial<SoruOgesi>): SoruOgesi =>
    ({
      ...soru("g", 8),
      kaynakAd: undefined,
      kaynakSayfaNo: undefined,
      paketBasligi: undefined,
      dosyaAdi: undefined,
      ...ek,
    }) as SoruOgesi;

  dogrula(
    soruOzetMetni(gorsel({ kaynakAd: "Palme Mat 9, s. 147" })) === "Palme Mat 9, s. 147",
    "görsel sorunun kaynağı listede gösterilmiyor",
  );
  dogrula(
    soruOzetMetni(gorsel({ paketBasligi: "Optik paketi", kaynakAd: "Palme, s. 12" })) === "Optik paketi",
    "paket başlığı kaynaktan önce gelmiyor (öğretmenin kendi verdiği ad öncelikli)",
  );
  dogrula(
    soruOzetMetni(gorsel({ kaynakSayfaNo: 41 })) === "Sayfa 41",
    "kaynak adı yokken sayfa numarasına düşülmüyor",
  );
  dogrula(
    soruOzetMetni(gorsel({ dosyaAdi: "fizik-optik-12.png" })) === "fizik-optik-12.png",
    "hiçbir kaynak bilgisi yokken dosya adına düşülmüyor",
  );
  dogrula(
    soruOzetMetni(gorsel({})) === "Görsel soru",
    "hiçbir bilgi yokken eski metne düşülmüyor",
  );
  // İKİ görsel soru BİRBİRİNDEN AYIRT EDİLEBİLMELİ — asıl iddia bu.
  dogrula(
    soruOzetMetni(gorsel({ kaynakAd: "A kitabı, s. 3" })) !==
      soruOzetMetni(gorsel({ kaynakAd: "B kitabı, s. 9" })),
    "farklı kaynaklardan gelen iki görsel soru listede aynı görünüyor",
  );
  // Metin sorusu gövdesini göstermeye devam etmeli, 70 karakterde kesilmeli.
  const uzun = "x".repeat(200);
  const metinli = { ...soru("m", 8), tur: "metin", metinHtml: `<p>${uzun}</p>` } as unknown as SoruOgesi;
  dogrula(soruOzetMetni(metinli).length === 70, "metin sorusu özeti 70 karakterde kesilmiyor");

  console.log("✓ Soru listesi özeti: görsel sorular kaynak/paket/dosya adıyla ayırt ediliyor");
}


/**
 * Denklem parçalarının tek satırlık özeti.
 *
 * KORUDUĞU ŞEY: denklem editöründe kartlar artık akordiyon — kapalı kart
 * gövdesi olarak SADECE bu metni gösteriyor. Yani bir parça tipi burada
 * unutulursa (ya da yanlış alanı okursa) öğretmen kapalı kartta parçanın ne
 * olduğunu göremez. 18 parça tipinin HEPSİ kapsanmalı; tip birleşimine yeni
 * bir tip eklendiğinde `switch` eksik kalırsa tsc zaten kırılır, buradaki
 * iddia ise ÇIKTININ anlamlı olduğunu yokluyor.
 */
function denklemOzetiSenaryolari() {
  const p = (x: unknown) => x as DenklemParcasi;
  const durumlar: { ad: string; parca: DenklemParcasi; bekleniyor: string }[] = [
    { ad: "metin", parca: p({ id: "1", tur: "metin", deger: "v" }), bekleniyor: "v" },
    { ad: "operator", parca: p({ id: "2", tur: "operator", sembol: "≤" }), bekleniyor: "≤" },
    { ad: "sembol", parca: p({ id: "3", tur: "sembol", sembol: "π" }), bekleniyor: "π" },
    { ad: "kesir", parca: p({ id: "4", tur: "kesir", pay: "a", payda: "b" }), bekleniyor: "a/b" },
    { ad: "kok (karekök)", parca: p({ id: "5", tur: "kok", derece: "", icerik: "x" }), bekleniyor: "√x" },
    { ad: "kok (dereceli)", parca: p({ id: "6", tur: "kok", derece: "3", icerik: "x" }), bekleniyor: "3√x" },
    { ad: "us", parca: p({ id: "7", tur: "us", taban: "x", ust: "2", alt: "" }), bekleniyor: "x^2" },
    { ad: "us (alt simge)", parca: p({ id: "8", tur: "us", taban: "a", ust: "", alt: "n" }), bekleniyor: "a_n" },
    { ad: "limit", parca: p({ id: "9", tur: "limit", altYazi: "x→0", ifade: "f" }), bekleniyor: "lim f" },
    { ad: "integral", parca: p({ id: "10", tur: "integral", kat: 2, altSinir: "a", ustSinir: "b", ifade: "f" }), bekleniyor: "∫∫ f" },
    { ad: "toplam", parca: p({ id: "11", tur: "toplam", altYazi: "i=1", ustYazi: "n", ifade: "i" }), bekleniyor: "Σ i" },
    { ad: "carpim", parca: p({ id: "12", tur: "carpim", altYazi: "i=1", ustYazi: "n", ifade: "i" }), bekleniyor: "Π i" },
    { ad: "turev", parca: p({ id: "13", tur: "turev", kismi: false, derece: "", pay: "y", payda: "x" }), bekleniyor: "dy/dx" },
    { ad: "turev (kısmi)", parca: p({ id: "14", tur: "turev", kismi: true, derece: "", pay: "u", payda: "t" }), bekleniyor: "∂u/∂t" },
    { ad: "grup", parca: p({ id: "15", tur: "grup", stil: "koseli", icerik: "x" }), bekleniyor: "[x]" },
    { ad: "grup (mutlak)", parca: p({ id: "16", tur: "grup", stil: "mutlak", icerik: "x" }), bekleniyor: "|x|" },
    { ad: "fonksiyon", parca: p({ id: "17", tur: "fonksiyon", ad: "sin", arguman: "x" }), bekleniyor: "sin(x)" },
    { ad: "vektor", parca: p({ id: "18", tur: "vektor", stil: "ok", ifade: "AB" }), bekleniyor: "AB" },
    // Boyut KARE OLMAYAN seçildi: 2×2 ile denemek, boyutu sabite bağlayan
    // bir mutasyonu kaçırıyordu (mutasyon denemesinde yakalandı).
    { ad: "matris", parca: p({ id: "19", tur: "matris", stil: "parantez", satirlar: [["1", "2", "3"], ["4", "5", "6"]] }), bekleniyor: "2×3 matris" },
    { ad: "determinant", parca: p({ id: "19b", tur: "matris", stil: "determinant", satirlar: [["1", "2"], ["3", "4"]] }), bekleniyor: "2×2 determinant" },
    { ad: "sistem", parca: p({ id: "20", tur: "sistem", satirlar: ["a", "b", "c"] }), bekleniyor: "3 denklem" },
    { ad: "parcali", parca: p({ id: "21", tur: "parcali", satirlar: [{ ifade: "x", kosul: "x>0" }] }), bekleniyor: "1 durum" },
    { ad: "binom", parca: p({ id: "22", tur: "binom", ust: "n", alt: "k" }), bekleniyor: "C(n, k)" },
  ];
  for (const { ad, parca, bekleniyor } of durumlar) {
    const cikan = parcaOzeti(parca);
    dogrula(cikan === bekleniyor, `"${ad}" özeti yanlış: beklenen "${bekleniyor}", gelen "${cikan}"`);
  }

  // 18 parça TİPİNİN hepsi denendi mi? (tip birleşimi büyürse bu sayı artmalı)
  const denenenTurler = new Set(durumlar.map((d) => d.parca.tur));
  dogrula(denenenTurler.size === 18, `18 parça tipi bekleniyordu, ${denenenTurler.size} tip denendi`);

  // İÇ İÇE ifade: düz metin DEĞİL, iç parçalar okunmalı — kapalı kartta
  // "a/b" yerine boş görünmesi bu yolun sessizce kopması demekti.
  const icIce = p({
    id: "n1",
    tur: "kesir",
    pay: "YOKSAYILMALI",
    payda: "2",
    payParcalari: [
      { id: "n2", tur: "metin", deger: "x" },
      { id: "n3", tur: "operator", sembol: "+" },
      { id: "n4", tur: "metin", deger: "y" },
    ],
  });
  dogrula(parcaOzeti(icIce) === "x+y/2", `iç içe ifade özeti yanlış: "${parcaOzeti(icIce)}"`);

  console.log(`✓ Denklem parça özeti: ${durumlar.length} senaryo, 18 tipin tamamı + iç içe ifade`);
}


/**
 * Önizleme yakınlaştırması ÇIKTIYA sızmamalı.
 *
 * KORUDUĞU ŞEY: `denklemCiz` hem ekrandaki önizlemeyi hem sınav kâğıdına
 * basılan görseli üretiyor. Zoom yalnız ekran boyutunu büyütsün diye
 * eklendi; üretim çağrısına da geçerse öğretmenin denklemi 2.5 katı
 * çözünürlükte (ve satır içinde yanlış ölçekte) basılır. Tarayıcıda
 * ölçüldü: zoom 2.5'te üretilen görsel 377 px — yani 126×3 (kalite),
 * sızsaydı ~945 olurdu. Bu iddia o ölçümün donmuş hâli.
 */
function denklemZoomSizintisiSenaryolari() {
  const kaynak = readFileSync(
    resolve("src/modules/sinav-olusturucu/components/DenklemEditoruModal.tsx"),
    "utf8",
  );
  // DİKKAT: `\s*` kullanmayın — çok satırlı fonksiyon TANIMI da eşleşiyor ve
  // ilk eşleşme o oluyor (ilk yazışta tam bu yüzden yanlış düştü).
  const uretim = kaynak.match(/denklemCiz\(uretimCanvas,[^)]*\)/);
  dogrula(!!uretim, "üretim çağrısı (denklemCiz(uretimCanvas, ...)) bulunamadı — iddia eskimiş");
  dogrula(
    !/zoom/i.test(uretim![0]),
    `üretim çağrısına zoom geçiyor: ${uretim![0]} — basılan görsel önizleme yakınlaştırmasından etkilenir`,
  );
  dogrula(
    /onizlemeZoom/.test(kaynak.match(/denklemCiz\(canvas,[^)]*\)/)?.[0] ?? ""),
    "önizleme çağrısı zoom'u hiç kullanmıyor — yakınlaştırma ölü",
  );
  // Varsayılan artık MOTORDA: `denklemCiz` çizim motoruna taşındı, ÇAĞRILAR
  // modalda kaldı. İddia bölünmedi, kaynağı ikiye ayrıldı.
  const motor = readFileSync(
    resolve("src/modules/sinav-olusturucu/denklem/ciz.ts"),
    "utf8",
  );
  dogrula(
    /zoom = 1,/.test(motor),
    "denklemCiz'in zoom varsayılanı 1 değil; zoom vermeyen üretim çağrısı sessizce ölçek değiştirir",
  );
  console.log("✓ Denklem önizleme yakınlaştırması çıktıya sızmıyor");
}


/**
 * Denklem editörünün üst alanı: katlanır açıklama + katlanır ileri araçlar.
 *
 * KORUDUĞU ŞEY: açıklama + araç çubuğu modalın %26'sıydı (213 px / 810 px) ve
 * her açılışta oradaydı. İki iddia ayrı ayrı gerekli:
 *  - "Göster (N)" etiketindeki sayı LİSTEDEN türetilmeli; elle yazılırsa yeni
 *    bir ileri araç eklendiğinde etiket sessizce yalan söyler.
 *  - İleri araç tercihi HATIRLANMALI; integral/matris'i düzenli kullanan
 *    öğretmenin her açılışta tekrar açması gerileme olurdu.
 */
function denklemUstAlanSenaryolari() {
  const kaynak = readFileSync(
    resolve("src/modules/sinav-olusturucu/components/DenklemEditoruModal.tsx"),
    "utf8",
  );
  dogrula(
    /const ILERI_ARAC_SAYISI = PARCA_TANIMLARI\.filter/.test(kaynak),
    "ileri araç sayısı listeden türetilmiyor — elle yazılan sayı eskir",
  );
  dogrula(
    /Göster \(\$\{ILERI_ARAC_SAYISI\}\)/.test(kaynak),
    "katlama düğmesi türetilen sayıyı kullanmıyor",
  );
  dogrula(
    kaynak.includes("localStorage.getItem(ILERI_ARAC_KEY)") &&
      kaynak.includes("localStorage.setItem(ILERI_ARAC_KEY"),
    "ileri araç tercihi hatırlanmıyor (oku/yaz çiftinden biri eksik)",
  );
  // Kota/gizli kipte localStorage atar; editör bu yüzden açılmamalı.
  dogrula(
    (kaynak.match(/localStorage\.(get|set)Item\(ILERI_ARAC_KEY/g) ?? []).length === 2 &&
      (kaynak.match(/try \{[\s\S]{0,220}?ILERI_ARAC_KEY[\s\S]{0,220}?\} catch/g) ?? []).length === 2,
    "localStorage erişimleri try/catch içinde değil — kota dolu ya da gizli kipte denklem editörü hiç açılmaz",
  );
  dogrula(
    /<details/.test(kaynak) && /Nasıl çalışır\?/.test(kaynak),
    "açıklama katlanır değil; her açılışta kalıcı yer kaplıyor",
  );
  console.log("✓ Denklem üst alanı: türetilen sayı, hatırlanan tercih, katlanır açıklama");
}


/**
 * Sembol araması.
 *
 * KORUDUĞU ŞEY: `≤` için "İşlem", `π` için "Özel Sembol" parçası eklemek
 * gerekiyordu — aynı zihinsel iş iki ayrı parça tipine bölünmüştü ve hangisinde
 * olduğunu bilmeden bulmanın yolu yoktu. Oysa iki tip çizimde BİREBİR aynı
 * işleniyor. Seçici artık ikisini birden gösteriyor; bu iddialar hem "her
 * sembol her yerden bulunuyor" hem de "sık kullanılan set önce geliyor"
 * güvencelerini tutuyor.
 */
function sembolAramaSenaryolari() {
  const tumSemboller = (gruplar: ReturnType<typeof sembolGruplariniSuz>) =>
    gruplar.flatMap((g) => g.semboller);

  // 1) Arama yokken İKİ set de görünür — hangi parça tipiyle girilirse girilsin.
  for (const oncelikli of ["operator", "sembol"] as const) {
    const hepsi = tumSemboller(sembolGruplariniSuz("", oncelikli));
    dogrula(hepsi.includes("≤"), `${oncelikli} parçasında "≤" görünmüyor`);
    dogrula(hepsi.includes("π"), `${oncelikli} parçasında "π" görünmüyor`);
  }

  // 2) Öncelik: parçanın kendi seti ÖNCE gelir.
  dogrula(
    sembolGruplariniSuz("", "operator")[0].baslik === "İşlem / İlişki",
    "işlem parçasında işlem seti önce gelmiyor",
  );
  dogrula(
    sembolGruplariniSuz("", "sembol")[0].baslik === "Yunan harfi / Özel sembol",
    "sembol parçasında özel sembol seti önce gelmiyor",
  );

  // 3) TÜRKÇE ada göre arama — asıl kazanç bu.
  const ara = (q: string) => tumSemboller(sembolGruplariniSuz(q, "operator"));
  dogrula(ara("küçük eşit").join("") === "≤", `"küçük eşit" → ${ara("küçük eşit")}`);
  dogrula(ara("pi").includes("π"), `"pi" → π bulunamadı`);
  dogrula(ara("sonsuz").join("") === "∞", `"sonsuz" → ${ara("sonsuz")}`);
  dogrula(ara("dalga").join("") === "λ", `"dalga" → ${ara("dalga")}`);
  // Türkçe küçük harf: "PI" ve "Pi" de bulmalı (I/İ tuzağı).
  dogrula(ara("PI").includes("π"), "büyük harfle arama çalışmıyor");

  // 4) Sembolün KENDİSİ yazılınca da bulunur (panodan yapıştırma).
  dogrula(ara("≥").join("") === "≥", `glif araması çalışmıyor: ${ara("≥")}`);

  // 5) Eşleşme yoksa grup KALMAZ (arayüz "sonuç yok" mesajını buna bakarak
  //    gösteriyor; boş grup dizisi dönerse mesaj hiç çıkmaz).
  dogrula(sembolGruplariniSuz("zzzz", "operator").length === 0, "eşleşmeyen aramada boş grup dönmüyor");

  // 6) Arama hiçbir sembolü KAYBETMEMELİ: boş sorguda tüm operatörler duruyor.
  dogrula(
    OPERATORLER.every((s) => tumSemboller(sembolGruplariniSuz("", "operator")).includes(s)),
    "boş aramada bazı operatörler eleniyor",
  );

  console.log("✓ Sembol araması: iki set birden, Türkçe ada göre arama, öncelik korunuyor");
}


/**
 * İç içe ifadeye parça ekleme listesi.
 *
 * KORUDUĞU ŞEY: iç içe alanda eskiden 8 tip elle sayılıydı (gerekçesi hiçbir
 * yerde yazılı değildi) ve kesir payına integral, köke toplam konulamıyordu.
 * Tarayıcıda ölçüldü: çizim motoru 18 tipin hepsini İÇ İÇE de doğru çiziyor —
 * `(a∫₀¹f(x)dx)/b` ve `√(x Σᵢ₌₁ⁿ aᵢ)` denendi. Yani sınır koruyucu değil,
 * boşluktu. 18 düğmeyi karta dizmek yerine tek "+ Parça" + arama kondu.
 */
function parcaAramaSenaryolari() {
  const araclar = [
    { tur: "kesir", etiket: "Kesir", esAnlamlilar: ["bölme", "pay", "payda"] },
    { tur: "integral", etiket: "İntegral" },
    { tur: "toplam", etiket: "Toplam (Σ)", esAnlamlilar: ["sigma", "seri"] },
    { tur: "us", etiket: "Üs / Alt Simge", esAnlamlilar: ["üslü", "kuvvet"] },
  ];
  const turler = (q: string) => araclariSuz(araclar, q).map((a) => a.tur);

  dogrula(araclariSuz(araclar, "").length === araclar.length, "boş aramada eleme oluyor");
  dogrula(araclariSuz(araclar, "   ").length === araclar.length, "yalnız boşlukta eleme oluyor");
  dogrula(turler("İntegral").join("") === "integral", "etikete göre arama çalışmıyor");
  dogrula(turler("bölme").join("") === "kesir", "eş anlamlıya göre arama çalışmıyor");
  dogrula(turler("sigma").join("") === "toplam", "eş anlamlı (sigma) bulunamıyor");
  dogrula(turler("kuvvet").join("") === "us", "eş anlamlı (kuvvet) bulunamıyor");
  dogrula(turler("zzzz").length === 0, "eşleşmeyen aramada boş liste dönmüyor");

  // TÜRKÇE KATLAMA: büyük I noktasız ı'ya iner; katlama olmazsa "INTEGRAL"
  // hiçbir şey bulmaz (sembol aramasında bu gerçek bir hataydı).
  dogrula(turler("INTEGRAL").join("") === "integral", "büyük harfle arama çalışmıyor (I/ı tuzağı)");
  dogrula(aramaIcinKucult("PI") === aramaIcinKucult("Pi"), "ı→i katlaması yapılmıyor");
  dogrula(aramaIcinKucult("İNTEGRAL") === "integral", "büyük İ doğru inmiyor");

  // Süzme özgün nesneleri döndürmeli (etiket/ikon kaybolmasın).
  dogrula(araclariSuz(araclar, "kesir")[0].etiket === "Kesir", "süzme nesneyi bozuyor");

  // Yapısal ağ: iç içe liste TAM olmalı. Yukarıdaki iddialar saf fonksiyonu
  // yokluyor; listeyi yeniden daraltan bir değişikliği (ki asıl düzeltilen
  // buydu) yakalamıyorlar — mutasyon denemesinde bu boşluk çıktı.
  const modal = readFileSync(
    resolve("src/modules/sinav-olusturucu/components/DenklemEditoruModal.tsx"),
    "utf8",
  );
  dogrula(
    /araclariSuz\(PARCA_TANIMLARI, aracArama\)/.test(modal),
    "iç içe parça listesi tam tanım listesini kullanmıyor — kesir payına integral/limit yine konulamaz",
  );
  dogrula(
    !/const altTurler: ParcaTuru\[\] = \[/.test(modal),
    "elle sayılan `altTurler` listesi geri gelmiş (gerekçesiz 8 tip sınırı)",
  );
  dogrula(
    (modal.match(/\+ Parça/g) ?? []).length >= 1 && !/altTurler\.map/.test(modal),
    "iç içe çubuk tek '+ Parça' düğmesi değil; kart yeniden 8-18 düğmeyle doluyor",
  );

  console.log("✓ Parça arama: etiket + eş anlamlı, Türkçe katlama, iç içe liste tam");
}


/**
 * Soru listesi aramasında Türkçe büyük/küçük harf.
 *
 * KORUDUĞU ŞEY: `toLocaleLowerCase("tr-TR")` büyük "I"yı NOKTASIZ "ı"ya
 * indiriyor. Öğretmen "FIZIK" yazdığında "Fizik" içeren soru bulunamıyordu —
 * Caps Lock açıkken ya da başlığı büyük harfle yazan biri için arama sessizce
 * çalışmıyordu. Aynı tuzak denklem sembol aramasında da vardı; katlama artık
 * ortak (`denklemArama.ts`).
 *
 * Konu SÜZGECİ bilerek katlanmıyor: iki depolanmış değeri karşılaştırıyor,
 * gerçekten farklı iki konu adı eşit sayılmamalı. O yüzden aşağıda ikisi ayrı
 * yoklanıyor.
 */
function soruAramasiTurkceSenaryolari() {
  const yap = (ek: Partial<SoruOgesi>): SoruOgesi => ({ ...soru("t", 8), ...ek }) as SoruOgesi;
  const liste = [
    yap({ id: "a", kaynakAd: "Fizik Soru Bankası", kaynakKonu: "Işık" }),
    yap({ id: "b", kaynakAd: "Kimya Föyü", kaynakKonu: "Isı" }),
    // METİN de büyük harfli: kaynak adları çoğu zaman böyle yazılıyor.
    // Yalnız SORGUYU katlayıp metni katlamamak bu satırda yakalanır
    // (mutasyon denemesinde çıkan boşluk).
    yap({ id: "c", kaynakAd: "OPTIK KONU TESTI", kaynakKonu: "Optik" }),
  ];
  const bul = (arama: string) =>
    soruListesiniFiltrele(liste, { arama, konu: "" }).map((x) => x.soru.id);

  dogrula(bul("fizik").join("") === "a", "küçük harfle arama çalışmıyor");
  dogrula(bul("Fizik").join("") === "a", "baş harfi büyük arama çalışmıyor");
  // ASIL İDDİA: büyük I noktasız ı'ya indiği için bu eskiden BOŞ dönüyordu.
  dogrula(bul("FIZIK").join("") === "a", "büyük harfle arama çalışmıyor (I/ı tuzağı)");
  dogrula(bul("FİZİK").join("") === "a", "noktalı İ ile arama çalışmıyor");
  dogrula(bul("kImYa").join("") === "b", "karışık harfle arama çalışmıyor");
  dogrula(bul("zzzz").length === 0, "eşleşmeyen arama sonuç döndürüyor");
  dogrula(bul("").length === 3, "boş arama listeyi eliyor");
  // Metin büyük harfli, sorgu küçük — iki taraf da katlanmalı.
  dogrula(bul("optik").join("") === "c", "büyük harfli METİN küçük harfli sorguyla bulunamıyor");
  dogrula(bul("TESTI").join("") === "c", "iki taraf da büyük harfliyken bulunamıyor");

  // Konu süzgeci eşitlikle çalışmaya devam etmeli.
  dogrula(
    soruListesiniFiltrele(liste, { arama: "", konu: "Işık" }).map((x) => x.soru.id).join("") === "a",
    "konu süzgeci çalışmıyor",
  );

  console.log("✓ Soru araması: Türkçe büyük/küçük harf katlaması (FIZIK → Fizik)");
}

/**
 * İç içe ifade alan yeni alanlar (integral sınırı, limit alt yazısı, kök
 * derecesi, toplam/çarpım yazıları) ve küçültme tabanı.
 *
 * İKİ AYRI İDDİA:
 *  1) TABAN. Editördeki `punto` doğrudan KÂĞITTAKİ punto olduğu için her
 *     küçültme fiziksel boyuta iniyor; iç içe zincirler çarpımsal küçültüyor.
 *     Ölçüldü (300 dpi): 6,84 pt → 1,63 mm, 5,32 pt → 1,27 mm, 5,20 → 1,24 mm;
 *     gövde metni 10 pt ≈ 2,4 mm. 7 pt (≈1,67 mm) sıkışık ama okunur.
 *  2) İSTEĞE BAĞLI ALANIN GEÇERSİZLİĞİ. Sınırsız integral GEÇERLİ yazımdır,
 *     yani boşluk hata değil — ama iç içe yapı açılıp yarım bırakılmışsa
 *     çıktıya sessizce yarım parça gider. `ifadeBos` bu ayrımı yapamıyordu:
 *     onu kullanmak sınırsız HER integrali geçersiz ilan ederdi.
 */
function denklemIcIceAlanSenaryolari() {
  // ── 1. Taban ──────────────────────────────────────────────────────────────
  dogrula(altPunto(18, 0.5) === 9, "taban gerekmediğinde oran uygulanmalı");
  dogrula(
    Math.abs(altPunto(18, 0.76) - 13.68) < 0.001,
    "taban gerekmediğinde değer değişmemeli",
  );
  // İntegral sınırı (18 → 9) içine kesir (9 × 0,76 = 6,84) → taban devreye girer.
  dogrula(
    altPunto(9, 0.76) === TABAN_PUNTO,
    `iç içe kesir tabana yükselmeli, gelen ${altPunto(9, 0.76)}`,
  );
  // Satır içi denklem (punto 14) üs→üs: 14 × 0,62² = 5,38 → taban.
  dogrula(altPunto(altPunto(14, 0.62), 0.62) === TABAN_PUNTO, "satır içi üs→üs tabana yükselmeli");
  // Taban ASLA büyütmemeli: zaten tabanın üstündeki değer korunur.
  dogrula(altPunto(100, 0.5) === 50, "taban büyük değerleri aşağı çekmemeli");

  // ── 2. İsteğe bağlı alanların geçersizliği ────────────────────────────────
  const bosMetin: DenklemParcasi = { id: "m1", tur: "metin", deger: "  " };

  const sinirsiz: DenklemParcasi = {
    id: "i1", tur: "integral", kat: 1,
    altSinir: "", ustSinir: "", ifade: "f(x)",
  };
  dogrula(
    !parcaGecersizMi(sinirsiz),
    "SINIRSIZ integral geçersiz sayılıyor — ∫f(x)dx normal bir yazım, boşluk hata değil",
  );

  const yarimSinir: DenklemParcasi = {
    id: "i2", tur: "integral", kat: 1,
    altSinir: "", ustSinir: "", ifade: "f(x)",
    altSinirParcalari: [bosMetin],
  };
  dogrula(
    parcaGecersizMi(yarimSinir),
    "iç içe açılıp BOŞ bırakılmış integral sınırı geçersiz sayılmıyor — yarım parça sessizce çıktıya gider",
  );

  const bosParcaListesi: DenklemParcasi = {
    id: "i3", tur: "integral", kat: 1,
    altSinir: "", ustSinir: "", ifade: "f(x)",
    ustSinirParcalari: [],
  };
  dogrula(parcaGecersizMi(bosParcaListesi), "parçasız açılmış iç içe alan geçersiz sayılmalı");

  // Aynı kural diğer üç türde de bağlı olmalı — biri unutulursa burada düşer.
  dogrula(
    parcaGecersizMi({ id: "l1", tur: "limit", altYazi: "", ifade: "f(x)", altYaziParcalari: [bosMetin] }),
    "limit alt yazısının iç içe parçası denetlenmiyor",
  );
  dogrula(
    parcaGecersizMi({ id: "k1", tur: "kok", derece: "", icerik: "x", dereceParcalari: [bosMetin] }),
    "kök derecesinin iç içe parçası denetlenmiyor",
  );
  dogrula(
    parcaGecersizMi({ id: "t1", tur: "toplam", altYazi: "", ustYazi: "", ifade: "a", ustYaziParcalari: [bosMetin] }),
    "toplam üst yazısının iç içe parçası denetlenmiyor",
  );
  dogrula(
    parcaGecersizMi({ id: "c1", tur: "carpim", altYazi: "", ustYazi: "", ifade: "a", altYaziParcalari: [bosMetin] }),
    "çarpım alt yazısının iç içe parçası denetlenmiyor",
  );
  // Derecesiz kök ve yazısız toplam GEÇERLİ kalmalı.
  dogrula(!parcaGecersizMi({ id: "k2", tur: "kok", derece: "", icerik: "x" }), "karekök geçersiz sayılıyor");
  dogrula(
    !parcaGecersizMi({ id: "t2", tur: "toplam", altYazi: "", ustYazi: "", ifade: "a" }),
    "yazısız toplam geçersiz sayılıyor",
  );

  // ── 3. İç içe yapıya geçerken tohumlama ──────────────────────────────────
  //
  // Öğretmen bildirdi: "indisleri yazınca önceki indis aynı şekilde kalıyor,
  // yazdığın onun yanına yazılıyor." İntegralin alt sınırı varsayılan "0" ile
  // geliyor ve iç içe yapıya geçerken bu "0" metin parçası olarak tohumlanıp
  // eklenen kesrin YANINA diziliyordu.
  //
  // Ayrım YER TUTUCU / ÖĞRETMENİN YAZDIĞI. Tohumlamayı tamamen kaldırmak da
  // yanlış olurdu: x²+1 yazıp onu kesrin payı yapmak isteyen kişi yeniden
  // yazmak zorunda kalırdı.
  dogrula(
    tohumParcalari("0", "0").length === 0,
    "YER TUTUCU tohumlanıyor — eklenen parça eski indisin yanına dizilir",
  );
  dogrula(
    tohumParcalari("i=1", "i=1").length === 0,
    "toplam/çarpım yer tutucusu tohumlanıyor",
  );
  dogrula(
    JSON.stringify(tohumParcalari("x²+3x−5", "0")) === JSON.stringify(["x²+3x−5"]),
    "ÖĞRETMENİN YAZDIĞI metin tohumlanmıyor — kendi ifadesini yeniden yazmak zorunda kalır",
  );
  dogrula(tohumParcalari("   ", "0").length === 0, "boş metin tohumlanmamalı");
  // Varsayılanı OLMAYAN alanlarda (varsayilan verilmemişse) davranış eski
  // hâlinde kalmalı: yazılan metin tohumlanır.
  dogrula(
    JSON.stringify(tohumParcalari("a")) === JSON.stringify(["a"]),
    "varsayılan bilinmeyen alanda tohumlama kaybolmuş",
  );

  console.log("✓ İç içe alanlar: 7 pt tabanı, geçersizlik kuralı ve yer tutucu tohumlaması");
}

/**
 * TEST kipinde şık harfleri cevap anahtarıyla AYNI alfabeden gelmeli.
 *
 * KORUDUĞU ŞEY yanlış puanlama. Cevap anahtarı `SoruOgesi.dogruSik` üzerinden
 * A–E ile çalışıyor. Madde harfleri Türk alfabesinden (`MADDE_HARFLERI`)
 * gelirse kâğıttaki 4. şık "ç", 5. şık "d" oluyor; anahtar aynı şıklara "D" ve
 * "E" diyor. Anahtarda "D" gören öğretmen kâğıtta "d"yi arar ve 5. şıkkı doğru
 * sayar — kastedilen 4. şıktır.
 *
 * GERÇEK BASKI ÇIKTISINDA GÖRÜLDÜ (30 soruluk test, WKWebView + NSPrintOperation
 * üzerinden PDF): anahtar "29) E" diyor, kâğıtta E diye bir şık yok.
 *
 * YAZILI kipi kapsam DIŞI: oradaki a/b/c/ç alt maddeleri cevap anahtarına bağlı
 * değil ve Türkçe sıralama doğru olan — o yüzden iki yön de sınanıyor.
 */
function sikHarfiSenaryolari() {
  const testHarfleri = [0, 1, 2, 3, 4].map((i) => maddeHarfi(i, true));
  dogrula(
    testHarfleri.join("") === "ABCDE",
    `test kipinde şık harfleri A–E olmalı, gelen: ${testHarfleri.join("")}`,
  );
  // 4. ve 5. sıra kritik: Türk alfabesiyle "ç" ve "d" çıkıyordu.
  dogrula(maddeHarfi(3, true) === "D", "4. şık anahtarın D'siyle aynı olmalı");
  dogrula(maddeHarfi(4, true) === "E", "5. şık anahtarın E'siyle aynı olmalı");

  // YAZILI kipi DEĞİŞMEMELİ.
  const yaziliHarfleri = [0, 1, 2, 3, 4].map((i) => maddeHarfi(i));
  dogrula(
    yaziliHarfleri.join("") === "abcçd",
    `yazılı alt maddeleri Türkçe sırayı korumalı, gelen: ${yaziliHarfleri.join("")}`,
  );

  console.log("✓ Test şık harfleri cevap anahtarıyla aynı alfabede; yazılı alt maddeleri Türkçe");
}

/**
 * Yazılı kipinde BÜYÜK harf de Türk alfabesidir (A B C Ç D …) ve sol panel
 * kâğıtla AYNI harfi gösterir. Eskiden büyük harf İngilizce alfabeydi ve
 * panel `sikBicimi`'ni almıyordu: panelde "ç)" görünürken kâğıda "D)" basılıyordu.
 */
function maddeHarfiBuyukTurkceSenaryolari() {
  const yaziliBuyuk = [0, 1, 2, 3, 4].map((i) => maddeHarfi(i, false, "buyuk")).join("");
  dogrula(yaziliBuyuk === "ABCÇD", `yazılı büyük harf Türk alfabesi olmalı, gelen: ${yaziliBuyuk}`);
  const yaziliKucuk = [0, 1, 2, 3, 4].map((i) => maddeHarfi(i, false, "kucuk")).join("");
  dogrula(yaziliKucuk === "abcçd", `yazılı küçük harf değişmemeli, gelen: ${yaziliKucuk}`);
  // Büyük ve küçük aynı SIRADA: her index'te büyüğü küçüğün tr-TR büyüğü.
  for (let i = 0; i < 29; i += 1) {
    dogrula(
      maddeHarfi(i, false, "buyuk") === maddeHarfi(i, false, "kucuk").toLocaleUpperCase("tr-TR"),
      `yazılı ${i + 1}. maddede büyük/küçük harf ayrışıyor`,
    );
  }
  dogrula(maddeHarfi(10, false, "buyuk") === "I" && maddeHarfi(11, false, "buyuk") === "İ", "ı/i büyük harfleri Türkçe (I/İ) olmalı");
  // Test kipi DEĞİŞMEMELİ: A–E (anahtar) ve küçükte Latin a–e.
  dogrula([0, 1, 2, 3, 4].map((i) => maddeHarfi(i, true, "buyuk")).join("") === "ABCDE", "test büyük harf A–E olmalı");
  dogrula([0, 1, 2, 3, 4].map((i) => maddeHarfi(i, true, "kucuk")).join("") === "abcde", "test küçük harf a–e olmalı");

  // Panel ve yeni-soru modalı kâğıdın sikBicimi'ni iletmeli (ayrışmanın kaynağı).
  const panel = readFileSync(resolve("src/modules/sinav-olusturucu/components/SinavSoruPanel.tsx"), "utf8");
  dogrula(/maddeHarfi\(index, testModu, sikBicimi\)/.test(panel), "MaddeSatiri maddeHarfi'ne sikBicimi iletmiyor");
  dogrula(!/maddeHarfi\(index, testModu\)/.test(panel), "panelde sikBicimi'siz maddeHarfi çağrısı kaldı");
  dogrula((panel.match(/sikBicimi=\{sikBicimi\}/g) ?? []).length >= 1, "InlineSoruDuzenlemePanel MaddeSatiri'ye sikBicimi geçmiyor");
  const ekran = readFileSync(resolve("src/modules/sinav-olusturucu/SinavOlusturucuScreen.tsx"), "utf8");
  dogrula((ekran.match(/sikBicimi=\{sikBicimi\}/g) ?? []).length >= 4, "ekran sikBicimi'ni panel/modal/kâğıda iletmiyor");
  dogrula(ekran.includes('"A) B) C) Ç) D)"'), "yazılı kipte büyük harf düğme etiketi Türk alfabesini göstermiyor");
  console.log("✓ Madde harfi: yazılıda büyük harf Türk alfabesi (ABCÇD), panel kâğıtla aynı sikBicimi'ni kullanıyor");
}

/**
 * Test kipinde şıklar için "Cevap satırı" ve (boşsa) "Madde puanı" gösterilmez;
 * başlık "Şıklar (A, B, C...)" olur. Yazılı kipi değişmez.
 */
async function testKipiMaddeAlanlariSenaryolari() {
  const React = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { MaddeSatiri } = await import("../src/modules/sinav-olusturucu/components/SinavSoruPanel");
  const ciz = (testModu: boolean, puan: number | null) =>
    renderToStaticMarkup(
      React.createElement(MaddeSatiri, {
        madde: { id: "m1", metinHtml: "", puan, cevapSatir: 2 },
        index: 3,
        testModu,
        sikBicimi: testModu ? undefined : "buyuk",
        onChange: () => undefined,
        onSil: () => undefined,
      }),
    );
  const yazili = ciz(false, null);
  dogrula(yazili.includes("Cevap satırı") && yazili.includes("Madde puanı"), "yazılı kipte cevap satırı/madde puanı kayboldu");
  dogrula(yazili.includes("Ç)"), "yazılı büyük harfte 4. madde Ç) olmalı");
  const test = ciz(true, null);
  dogrula(!test.includes("Cevap satırı"), "test kipinde işlevsiz 'Cevap satırı' gösteriliyor");
  dogrula(!test.includes("Madde puanı"), "test kipinde işlevsiz 'Madde puanı' gösteriliyor");
  dogrula(test.includes("D)"), "test kipinde 4. şık D) olmalı");
  // Yazılıdan kalma madde puanı Test kipinde de temizlenebilmeli (kâğıda basılıyor).
  dogrula(ciz(true, 5).includes("Madde puanı"), "test kipinde dolu madde puanı temizlenemez hâle geldi");

  const panel = readFileSync(resolve("src/modules/sinav-olusturucu/components/SinavSoruPanel.tsx"), "utf8");
  dogrula(panel.includes('testModu ? "Şıklar (A, B, C...)" : "Maddeler (a, b, c...)"'), "satır içi panel başlığı test kipinde 'Şıklar' demiyor");
  console.log("✓ Test kipinde cevap satırı / boş madde puanı gizli, başlık 'Şıklar'; yazılı kipi aynen");
}

function soruUret(id: string, ek: Partial<SoruOgesi> = {}): SoruOgesi {
  return {
    id, tur: "metin", metinHtml: `<p>${id}</p>`, metinKonumu: "alt", hizalama: "sol", genislikMm: 80,
    boslukMm: 10, punto: 11, puan: null, maddeler: [], maddeKolon: 1, tamGenislik: false, ...ek,
  } as SoruOgesi;
}

/**
 * BEP görünümünde "Puanları 100'e eşit dağıt": yalnız BEP sorularına,
 * `bepPuan` üzerinden. Normal sınavın puanları DEĞİŞMEZ; eski kayıtlar
 * (bepPuan yok) normal puanla açılır.
 */
function bepPuanDagitimiSenaryolari() {
  // 10 soru; 3 ve 4 aynı paket (tek mantıksal soru). Normal dağıtım: 10 × 10.
  const ham = Array.from({ length: 11 }, (_, i) => soruUret(`s${i}`, i === 3 || i === 4 ? { paketId: "p1", paketSira: i - 3 } : {}));
  const normal = puanlariMantiksalEsitDagit(ham);
  const normalToplam = () => normal.reduce((t, s) => t + (soruPuani(s) ?? 0), 0);
  dogrula(normalToplam() === 100, "ön koşul: normal dağıtım 100 olmalı");

  // 5 mantıksal soru BEP'e seçili (paketin iki parçası dahil).
  const bepSecili = ["s0", "s2", "s3", "s4", "s6", "s9"];
  const sonra = bepPuanlariniEsitDagit(normal, bepSecili);
  dogrula(sonra.every((s, i) => s.puan === normal[i].puan), "BEP dağıtımı normal sınav puanlarını değiştirdi");
  dogrula(sonra.filter((s) => !bepSecili.includes(s.id)).every((s) => s.bepPuan === undefined), "BEP dışı soruya bepPuan yazıldı");
  const secili = new Set(bepSecili);
  const bepKagidi = sonra.filter((s) => secili.has(s.id)).map(bepPuaniniUygula);
  const bepToplam = bepKagidi.reduce((t, s) => t + (soruPuani(s) ?? 0), 0);
  dogrula(bepToplam === 100, `BEP kâğıdı 100 tutmuyor (${bepToplam}) — eski hata: 50'de kalıyordu`);
  dogrula(sonra.find((s) => s.id === "s4")?.bepPuan === null, "paketin 2. parçası BEP'te ayrı puan almamalı");
  dogrula(sonra.find((s) => s.id === "s3")?.bepPuan === 20, "paketin ilk parçası mantıksal sorunun BEP puanını taşımalı");
  dogrula(normalToplam() === 100 && sonra.reduce((t, s) => t + (soruPuani(s) ?? 0), 0) === 100, "normal sınav toplamı bozuldu");

  // 3 mantıksal soru: 34 + 33 + 33 (artan ilk sorulara).
  const ucluk = bepPuanlariniEsitDagit(normal, ["s1", "s5", "s7"]);
  dogrula(["s1", "s5", "s7"].map((id) => ucluk.find((s) => s.id === id)?.bepPuan).join(",") === "34,33,33", "kalan puan dağıtımı yanlış");

  // Madde puanlı soru: BEP kâğıdında madde puanları BEP toplamına karışmamalı.
  const maddeli = soruUret("mp", { maddeler: [{ id: "a", metinHtml: "", puan: 7, cevapSatir: 1 }, { id: "b", metinHtml: "", puan: 8, cevapSatir: 1 }] });
  const maddeliBep = bepPuaniniUygula(bepPuanlariniEsitDagit([maddeli], ["mp"])[0]);
  dogrula(soruPuani(maddeliBep) === 100, "madde puanlı soruda BEP puanı uygulanmadı");
  dogrula(maddeli.maddeler[0].puan === 7, "BEP görünümü kaynak sorunun madde puanını değiştirdi");

  // Eski kayıt: bepPuan alanı hiç yok → soru AYNEN (normal puan) kullanılır.
  const eski = soruUret("eski", { puan: 15 });
  dogrula(bepPuaniniUygula(eski) === eski && soruPuani(bepPuaniniUygula(eski)) === 15, "bepPuan'sız eski soru normal puanla açılmıyor");
  // Hiç BEP sorusu seçili değilse dağıtım no-op.
  dogrula(bepPuanlariniEsitDagit(normal, []) === normal, "boş BEP seçiminde dağıtım listeyi değiştirdi");
  // Seçim değişince temizleme: alanlar kalkar, normal puan durur.
  const temiz = bepPuanlariniTemizle(sonra);
  dogrula(temiz.every((s) => !("bepPuan" in s)) && temiz.every((s, i) => s.puan === normal[i].puan), "BEP puanları temizlenemedi");
  dogrula(bepPuanlariniTemizle(normal) === normal, "temizlenecek bir şey yokken liste yeniden üretildi");

  // Ekran: BEP'te dağıtım yalnız BEP sorularına; yazdırmada BEP toplamı denetleniyor.
  const ekran = readFileSync(resolve("src/modules/sinav-olusturucu/SinavOlusturucuScreen.tsx"), "utf8");
  const dagit = ekran.slice(ekran.indexOf("function puanlariEsitDagit()"), ekran.indexOf("function taslagiTemizle()"));
  dogrula(/if \(bepAktif\)[\s\S]*bepPuanlariniEsitDagit\(mevcut, bepSeciliIds\)/.test(dagit), "BEP görünümünde eşit dağıt BEP'e özel yola gitmiyor");
  const uyari = ekran.slice(ekran.indexOf("function yazdirmaUyarilariniTopla("), ekran.indexOf("function yazdirmayiCalistir("));
  dogrula(/if \(bepAktif\) \{[\s\S]*toplamPuan !== 100/.test(uyari), "BEP yazdırmasında 100 puan denetimi yok");
  dogrula(/\.map\(bepPuaniniUygula\)/.test(ekran), "BEP görünümü bepPuan'ı kâğıda uygulamıyor");
  console.log("✓ BEP puanı: 100 yalnız BEP sorularına dağıtılıyor, normal puanlar korunuyor, eski kayıtlar açılıyor");
}

/**
 * B grubu (Test kipi) şık karıştırması: deterministik tohum (seed + soru.id),
 * doğru şık eşlemesi, karıştırılmaması gereken durumlar ve A grubunun
 * bozulmaması. Cevap anahtarında işaretsiz soru "—".
 */
function bGrubuSikKaristirmaSenaryolari() {
  const sikli = (id: string, dogruSik?: string, adet = 5) =>
    soruUret(id, {
      maddeler: Array.from({ length: adet }, (_, i) => ({ id: `${id}-m${i}`, metinHtml: `<p>${id} şık ${i}</p>`, puan: null, cevapSatir: 0 })),
      dogruSik,
    });
  const sorular = Array.from({ length: 30 }, (_, i) => sikli(`q${i}`, TEST_SIK_HARFLERI[i % 5]));
  const seed = 1_731_000_000_123; // Date.now() ölçeğinde bSeed

  // 1) Doğru şık eşlemesi: yeni harfteki şık, asıl doğru şıkla AYNI madde.
  for (const soru of sorular) {
    const k = siklariKaristir(soru, seed);
    const eskiDogru = soru.maddeler[TEST_SIK_HARFLERI.indexOf(soru.dogruSik!)];
    const yeniDogru = k.maddeler[TEST_SIK_HARFLERI.indexOf(k.dogruSik!)];
    dogrula(yeniDogru.id === eskiDogru.id, `${soru.id}: B grubu anahtarı yanlış şıkkı gösteriyor`);
    dogrula(
      [...k.maddeler.map((m) => m.id)].sort().join() === [...soru.maddeler.map((m) => m.id)].sort().join(),
      `${soru.id}: karıştırmada şık kayboldu/çoğaldı`,
    );
  }
  // 2) Deterministik: aynı tohum aynı sıra; farklı tohum en az bir soruda farklı.
  const a1 = bGrubuSiklariniKaristir(sorular, seed);
  const a2 = bGrubuSiklariniKaristir(sorular, seed);
  dogrula(JSON.stringify(a1) === JSON.stringify(a2), "aynı bSeed farklı şık sırası üretti (dağıtılan kâğıtla anahtar uyuşmaz)");
  const b1 = bGrubuSiklariniKaristir(sorular, seed + 1);
  dogrula(JSON.stringify(a1) !== JSON.stringify(b1), "bSeed değişince şık sırası değişmiyor");
  // Soru başına tohum: tüm sorular aynı permütasyonla karışmamalı.
  const permutasyonlar = new Set(a1.map((s) => s.maddeler.map((m) => m.id.split("-m")[1]).join("")));
  dogrula(permutasyonlar.size > 3, "bütün sorular aynı şık permütasyonunu aldı (soru bazlı tohum yok)");
  dogrula(a1.some((s, i) => s.dogruSik !== sorular[i].dogruSik), "hiçbir sorunun doğru şıkkı yer değiştirmedi");
  // Kaynak sorular mutasyona uğramamalı (A grubu / normal kip aynı nesneleri kullanır).
  dogrula(sorular[0].maddeler[0].id === "q0-m0" && sorular[0].dogruSik === "A", "karıştırma kaynak soruyu değiştirdi");

  // 3) Karıştırılmayan durumlar.
  const gorsel = soruUret("g", { tur: "gorsel", dogruSik: "C" }); // şıklar görselin içinde
  dogrula(siklariKaristir(gorsel, seed) === gorsel, "şıksız (görsel) sorunun doğru şıkkı değiştirildi");
  const uyumsuz = sikli("u", "E", 3); // 3 şık ama anahtar E
  dogrula(siklariKaristir(uyumsuz, seed) === uyumsuz, "şık sayısı dışındaki anahtar karıştırmada bozuldu");
  const cokSik = sikli("c", "B", 6);
  dogrula(siklariKaristir(cokSik, seed) === cokSik, "A–E dışına taşan şık listesi karıştırıldı");
  const tekSik = sikli("t", "A", 1);
  dogrula(siklariKaristir(tekSik, seed) === tekSik, "tek şıklı soru karıştırıldı");
  const isaretsiz = sikli("i", undefined, 4);
  const isaretsizK = siklariKaristir(isaretsiz, seed);
  dogrula(isaretsizK.dogruSik === undefined && isaretsizK.maddeler.length === 4, "işaretsiz soru karıştırmada anahtar kazandı");

  // 4) Cevap anahtarı: tüm sorular; işaretsiz "—". B grubu anahtarı karışık sıraya göre.
  const anahtarListe = [sikli("x1", "B"), sikli("x2"), sikli("x3", "D")];
  const anahtar = cevapAnahtariOlustur(anahtarListe);
  dogrula(anahtar.length === 3, "işaretsiz soru cevap anahtarından düştü");
  dogrula(anahtar.map((s) => `${s.sira}${s.cevap}`).join(" ") === `1B 2${ISARETSIZ_CEVAP} 3D`, `anahtar yanlış: ${JSON.stringify(anahtar)}`);
  dogrula(ISARETSIZ_CEVAP === "—", "işaretsiz cevap simgesi '—' olmalı");
  const bListe = bGrubuSiklariniKaristir(paketFarkindaKaristir(sorular, seed), seed);
  const bAnahtar = cevapAnahtariOlustur(bListe);
  bAnahtar.forEach((satir, i) => {
    const kagittaki = bListe[i];
    const asil = sorular.find((s) => s.id === kagittaki.id)!;
    const asilDogruId = asil.maddeler[TEST_SIK_HARFLERI.indexOf(asil.dogruSik!)].id;
    dogrula(kagittaki.maddeler[TEST_SIK_HARFLERI.indexOf(satir.cevap)].id === asilDogruId, `B anahtarı ${satir.sira}. soruda kâğıtla uyuşmuyor`);
  });

  // 5) Ekran: şık karıştırma YALNIZ B grubu + Test kipinde; anahtar tüm soruları içeriyor.
  const ekran = readFileSync(resolve("src/modules/sinav-olusturucu/SinavOlusturucuScreen.tsx"), "utf8");
  const gorunen = ekran.slice(ekran.indexOf("const gorunenSorular = useMemo"), ekran.indexOf("const mantiksalSoruSayisi"));
  dogrula(
    /if \(bGrubuAktif && aktifGrup === "B"\) \{[\s\S]*if \(sinavTuru === "test"\) liste = bGrubuSiklariniKaristir\(liste, bSeed\);[\s\S]*\}/.test(gorunen),
    "şık karıştırma B grubu + Test kipi koşuluna bağlı değil (A grubu/yazılı bozulabilir)",
  );
  dogrula(gorunen.includes("sinavTuru,"), "gorunenSorular memo'su sinavTuru değişimini izlemiyor");
  dogrula(ekran.includes("cevapAnahtariOlustur(gorunenSorular)"), "cevap anahtarı görünen (karışık) sıradan üretilmiyor");
  dogrula(!/\.filter\(\(x\) => Boolean\(x\.harf\)\)/.test(ekran), "işaretsiz sorular cevap anahtarından yine süzülüyor");
  dogrula(/isaretsizCevapSiralari\.length > 0/.test(ekran), "işaretsiz soru için yazdırma uyarısı yok");
  // Karıştırma fonksiyonunun kendisi değişmedi (A/B soru sırası eski tohumlarla aynı kalmalı).
  dogrula(deterministikKaristir([1, 2, 3, 4, 5], 42).join("") === deterministikKaristir([1, 2, 3, 4, 5], 42).join(""), "deterministik karıştırma bozuldu");
  console.log("✓ B grubu: şıklar soru bazlı tohumla karışıyor, anahtar yeni harfe eşleniyor; işaretsiz soru anahtarda '—'");
}

/**
 * Başlık Bilgileri: "Tarih" kutusu var ve "Süre dk" kutusu Test kipinde de
 * görünür (ikisi de kâğıda HER iki kipte basılıyor). Kutular yazılı/test
 * dalının DIŞINDA, ortak bölümde olmalı.
 */
function baslikTarihSureSenaryolari() {
  const ekran = readFileSync(resolve("src/modules/sinav-olusturucu/SinavOlusturucuScreen.tsx"), "utf8");
  const bolum = ekran.slice(ekran.indexOf('baslik="Başlık Bilgileri"'), ekran.indexOf('baslik="Sınav Türü"'));
  dogrula(bolum.length > 0, "Başlık Bilgileri bölümü bulunamadı — test hedefini kaybetti");
  const dal = bolum.indexOf("{testModu ? (");
  const tarihYeri = bolum.indexOf('baslikAyarla("tarih", e.target.value)');
  const sureYeri = bolum.indexOf('baslikAyarla("sureDakika"');
  dogrula(tarihYeri > 0, "Başlık Bilgileri'nde tarih giriş kutusu yok");
  dogrula(bolum.includes('placeholder="GG.AA.YYYY"'), "tarih kutusunda GG.AA.YYYY ipucu yok");
  dogrula(sureYeri > 0, "Başlık Bilgileri'nde süre giriş kutusu yok");
  dogrula(tarihYeri < dal && sureYeri < dal, "tarih/süre kutusu yazılı/test dalının içinde — bir kipte gizleniyor");
  dogrula((bolum.match(/baslikAyarla\("sureDakika"/g) ?? []).length === 1, "süre kutusu iki kez çiziliyor");
  console.log("✓ Başlık Bilgileri: tarih ve süre kutuları iki kipte de görünür");
}

async function main() {
  let aktif = 0;
  let enYuksek = 0;
  const sonuclar = await sinirliAllSettled(
    Array.from({ length: 17 }, (_, i) => i),
    4,
    async (i) => {
      aktif += 1;
      enYuksek = Math.max(enYuksek, aktif);
      await new Promise((resolve) => setTimeout(resolve, 2));
      aktif -= 1;
      if (i === 5 || i === 12) throw new Error(`bozuk-${i}`);
      return i;
    },
  );
  dogrula(enYuksek <= 4, `eşzamanlılık sınırı aşıldı (${enYuksek})`);
  dogrula(sonuclar.filter((x) => x.status === "fulfilled").length === 15, "kısmi başarılar korunmadı");
  dogrula(sonuclar.filter((x) => x.status === "rejected").length === 2, "dosya bazlı hatalar raporlanmadı");

  let fontHazir = false;
  let gorselCozuldu = false;
  const oncekiDocument = globalThis.document;
  const oncekiWindow = globalThis.window;
  Object.assign(globalThis, {
    document: {
      fonts: {
        ready: new Promise<void>((resolve) => setTimeout(() => {
          fontHazir = true;
          resolve();
        }, 2)),
      },
    },
    window: { setTimeout, clearTimeout },
  });
  const sahteGorsel = {
    complete: true,
    naturalWidth: 100,
    decode: async () => {
      await new Promise((resolve) => setTimeout(resolve, 2));
      gorselCozuldu = true;
    },
  };
  await yazdirmaKaynaklariniBekle(
    { querySelectorAll: () => [sahteGorsel] } as unknown as ParentNode,
    100,
  );
  dogrula(fontHazir && gorselCozuldu, "yazdırma font ve görsel decode tamamlanmadan başlatılıyor");
  Object.assign(globalThis, { document: oncekiDocument, window: oncekiWindow });

  console.log("✓ Filtreleme, sanal pencere, sorusuz autosave, yazdırma bekleme ve sınırlı allSettled");

  soruFabrikasiSenaryolari();
  geriAlKapsamiSenaryolari();
  soruOzetiSenaryolari();
  denklemOzetiSenaryolari();
  denklemZoomSizintisiSenaryolari();
  denklemUstAlanSenaryolari();
  sembolAramaSenaryolari();
  parcaAramaSenaryolari();
  soruAramasiTurkceSenaryolari();

  denklemIcIceAlanSenaryolari();
  sikHarfiSenaryolari();
  maddeHarfiBuyukTurkceSenaryolari();
  baslikTarihSureSenaryolari();
  await testKipiMaddeAlanlariSenaryolari();
  bepPuanDagitimiSenaryolari();
  bGrubuSikKaristirmaSenaryolari();

  {
  const cz = (id: string, ek: Record<string, unknown> = {}) => ({
    id, tur: "gorsel", metinHtml: "", altMetinHtml: "", dosyaAdi: "cizim.png", maddeler: [],
    cizimVerisi: { surum: 1, genislik: 640, yukseklik: 400, sekiller: [] }, ...ek,
  }) as unknown as SoruOgesi;
  const liste = [cz("a"), cz("m", { cizimVerisi: undefined, dosyaAdi: "x.png" }), cz("b"), cz("d", { cizimVerisi: undefined, denklemVerisi: {} })];
  dogrula(soruListeEtiketi(liste[0], liste) === "Çizim 1", "ilk çizim etiketi");
  dogrula(soruListeEtiketi(liste[2], liste) === "Çizim 2", "ikinci çizim etiketi");
  dogrula(soruListeEtiketi(liste[3], liste) === "Denklem 1", "denklem etiketi");
  dogrula(!soruListeEtiketi(liste[0], liste).includes(".png"), "dosya adı görünmemeli");
  const denklemBelgesi = { surum: "v1", punto: 20, parcalar: [{ tur: "metin", deger: "x" }, { tur: "us", taban: "", ust: "2", alt: "" }, { tur: "metin", deger: "+3x−4=0 denkleminin kökleri" }] };
  const yalnizDenklem = cz("e", { cizimVerisi: undefined, denklemVerisi: denklemBelgesi, dosyaAdi: "denklem.png" });
  const etiket = soruListeEtiketi(yalnizDenklem, [yalnizDenklem]);
  dogrula(etiket.startsWith("Denklem: x"), `yalnız denklem sorusu kısaltılmış denklemi göstermeli: ${etiket}`);
  const uzunDenklem = cz("g", { cizimVerisi: undefined, denklemVerisi: { ...denklemBelgesi, parcalar: [...denklemBelgesi.parcalar, ...denklemBelgesi.parcalar] } });
  const e3 = soruListeEtiketi(uzunDenklem, [uzunDenklem]);
  dogrula(e3.endsWith("…") && e3.length <= 50, `uzun denklem özeti kısaltılmalı: ${e3}`);
  const satirIci = cz("f", { tur: "metin", cizimVerisi: undefined, metinHtml: `<p><img src="data:image/png;base64,AA" class="denklem-inline" data-denklem="${encodeURIComponent(JSON.stringify(denklemBelgesi))}"> integralinin değeri kaçtır?</p>` });
  const e2 = soruListeEtiketi(satirIci, [satirIci]);
  dogrula(e2.startsWith("⟨x") && e2.includes("integralinin"), `satır içi denklem listede kaybolmamalı: ${e2}`);
  console.log("✓ Soru listesinde çizim/denklem için anlamlı etiket");
}
console.log("TÜM SINAV DAYANIKLILIK SENARYOLARI BAŞARILI");
}

void main();
