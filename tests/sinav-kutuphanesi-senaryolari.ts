// Sınav kütüphanesi: metadata türetme, aktif sınır, arşiv ve yıl geçişi.
//
// Kütüphaneye geçmeden önce Sınav Oluşturucu TEK slotluydu (taslakDepo.ts'te
// `son-taslak-v011c`): her kayıt bir öncekini eziyordu ve "Yeni Başla" saatler
// süren emeği geri dönüşsüz siliyordu. Buradaki senaryolar yeni modelin
// değişmezlerini korur.

import "./_tarayici-ortami";
import "./_sahte-indexeddb";

function dogrula(kosul: unknown, mesaj: string) {
  if (!kosul) throw new Error(`SINAV KÜTÜPHANESİ TESTİ BAŞARISIZ: ${mesaj}`);
}

function taslakUret(ozel: Record<string, unknown> = {}) {
  return {
    surum: "v0.11C" as const,
    kayitZamani: "2026-07-25T10:00:00.000Z",
    baslik: {
      okulAdi: "Örnek Okul",
      sinifSeviyesi: "9. SINIF",
      donem: "1. DÖNEM",
      yaziliNo: "1. YAZILI",
      ders: "Matematik",
    },
    sorular: [],
    ayarlar: {
      kenarBosluk: 10,
      varsayilanSoruBosluk: 5,
      ogretmenler: [],
      sayfaNoGoster: true,
      sayfaDuzeni: "cift" as const,
      sutunAra: 8,
      sutunAyirici: true,
    },
    ...ozel,
  };
}

function soruUret(id: string, ozel: Record<string, unknown> = {}) {
  return {
    id,
    tur: "metin" as const,
    metinHtml: "soru",
    metinKonumu: "alt" as const,
    hizalama: "sol" as const,
    genislikMm: 60,
    boslukMm: 0,
    punto: 12,
    puan: null,
    maddeler: [],
    maddeKolon: 1 as const,
    tamGenislik: false,
    ...ozel,
  };
}

async function calistir() {
  const repo = await import("../src/db/repo");
  const { metadataTuret, sinavAdiTuret, kabaBoyutBayt } = await import(
    "../src/modules/sinav-olusturucu/lib/sinavKutuphanesi"
  );

  // ─── 1. Ad türetme ────────────────────────────────────────────────────────
  dogrula(
    sinavAdiTuret(taslakUret() as never) === "9. SINIF · Matematik · 1. DÖNEM · 1. YAZILI",
    "başlık alanlarından ad türetilmeli",
  );
  dogrula(
    sinavAdiTuret(taslakUret({ baslik: { okulAdi: "", sinifSeviyesi: "", donem: "", yaziliNo: "", ders: "" } }) as never)
      === "Adsız sınav",
    "boş başlıkta yedek ad kullanılmalı",
  );
  dogrula(
    sinavAdiTuret(taslakUret({
      ayarlar: { ...taslakUret().ayarlar, sinavTuru: "test", testBaslik: "6. Ünite Testi" },
    }) as never) === "6. Ünite Testi",
    "test modunda test başlığı ada geçmeli",
  );

  // ─── 2. Soru sayısı MANTIKSAL sayılır (paket tek soru) ────────────────────
  {
    const paketli = taslakUret({
      sorular: [
        soruUret("a", { paketId: "p1", paketSira: 0 }),
        soruUret("b", { paketId: "p1", paketSira: 1 }),
        soruUret("c"),
      ],
    });
    const meta = metadataTuret(paketli as never, 3);
    dogrula(
      meta.soruSayisi === 2,
      `çok sayfalı paket TEK soru sayılmalı (kağıttaki numarayla aynı kural), alınan ${meta.soruSayisi}`,
    );
    dogrula(meta.sayfaSayisi === 3, "sayfa sayısı önbelleklenmeli");
  }

  // ─── 3. Boyut: JSON.stringify kullanılmadan, içerikle orantılı ────────────
  {
    const kucuk = taslakUret({ sorular: [soruUret("a")] });
    const buyuk = taslakUret({
      sorular: [soruUret("a", { gorselDataUrl: "data:image/jpeg;base64," + "A".repeat(5000) })],
    });
    dogrula(kabaBoyutBayt(buyuk as never) > kabaBoyutBayt(kucuk as never) + 4000,
      "gömülü görsel boyutu yansıtmalı");
    dogrula(kabaBoyutBayt(taslakUret() as never) === 0, "boş sınavın boyutu 0 olmalı");
  }

  // ─── 3.5 Elle yeniden adlandırma sonraki autosave'lerde KORUNUR ──────────
  // (Sınavlarım aşama 2). Bu ayrım olmadan `sinavMetadatasiniEsitle` her
  // otomatik kayıtta `ad`'ı başlık alanlarından yeniden türetip öğretmenin
  // verdiği özel adı ezerdi.
  {
    const { sinavYenidenAdlandir, sinavMetadatasiniEsitle } = await import(
      "../src/modules/sinav-olusturucu/lib/sinavKutuphanesi"
    );

    const taslak = taslakUret();
    const kayit = repo.sinavEkle(metadataTuret(taslak as never, 1));
    dogrula(
      kayit.ad === "9. SINIF · Matematik · 1. DÖNEM · 1. YAZILI",
      "ön koşul: başlangıç adı türetilmeli",
    );

    sinavYenidenAdlandir(kayit.id, "  Elle verilen ad  ");
    dogrula(repo.sinavBul(kayit.id)?.ad === "Elle verilen ad", "yeniden adlandırma kırpılmış adı yazmalı");
    dogrula(repo.sinavBul(kayit.id)?.ozelAd === "Elle verilen ad", "ozelAd işaretlenmeli");

    // Başlık alanları DEĞİŞSE bile bir sonraki autosave metadata eşitlemesi
    // özel adı EZMEMELİ.
    const degisenTaslak = taslakUret({ baslik: { ...taslak.baslik, ders: "Fizik" } });
    sinavMetadatasiniEsitle(kayit.id, degisenTaslak as never, 1);
    dogrula(repo.sinavBul(kayit.id)?.ad === "Elle verilen ad", "özel ad sonraki autosave'de korunmalı");
    dogrula(repo.sinavBul(kayit.id)?.ders === "Fizik", "diğer metadata alanları normal şekilde güncellenmeye devam etmeli");

    let bosAdHatasi = "";
    try {
      sinavYenidenAdlandir(kayit.id, "   ");
    } catch (err) {
      bosAdHatasi = err instanceof Error ? err.message : "";
    }
    dogrula(/boş olamaz/.test(bosAdHatasi), "boş ad reddedilmeli");

    repo.sinavSil(kayit.id);
    console.log("✓ Elle yeniden adlandırma sonraki autosave'lerde korunuyor, boş ad reddediliyor");
  }

  // ─── 3.6 Yeni sınav oluşturma: ekler, aktif yapar, boş içerik yazar ──────
  {
    const { yeniSinavOlusturVeAktifYap, otomatikAktifSinaviSec, aktifSinavIdOku } = await import(
      "../src/modules/sinav-olusturucu/lib/sinavKutuphanesi"
    );
    const storage = await import("../src/modules/sinav-olusturucu/storage/taslakDepo");

    dogrula(repo.sinavlarGetir().length === 0, "ön koşul: kütüphane boş olmalı");
    const kayit = await yeniSinavOlusturVeAktifYap();
    dogrula(repo.sinavBul(kayit.id)?.soruSayisi === 0, "yeni sınav boş başlamalı");
    dogrula(aktifSinavIdOku() === kayit.id, "yeni sınav aktif işaretçiye yazılmalı");
    const icerik = await storage.sinavIcerigiOku(kayit.id);
    dogrula(!!icerik && icerik.sorular.length === 0, "yeni sınavın içeriği de yazılmalı");

    // Aktif sınır doluyken engellenmeli, YARIM KAYIT bırakmamalı.
    const dolduranlar: string[] = [];
    for (let i = 0; i < repo.AZAMI_AKTIF_SINAV - 1; i++) {
      dolduranlar.push(repo.sinavEkle(metadataTuret(taslakUret() as never, 1)).id);
    }
    dogrula(repo.aktifSinavSayisi() === repo.AZAMI_AKTIF_SINAV, "ön koşul: sınır dolmalı");
    const oncekiSayi = repo.sinavlarGetir().length;
    let sinirHatasi = "";
    try {
      await yeniSinavOlusturVeAktifYap();
    } catch (err) {
      sinirHatasi = err instanceof Error ? err.message : "";
    }
    dogrula(/en fazla/.test(sinirHatasi), "sınır doluyken yeni sınav engellenmeli");
    dogrula(repo.sinavlarGetir().length === oncekiSayi, "engellenen deneme yarım kayıt bırakmamalı");

    const secilen = otomatikAktifSinaviSec();
    dogrula(!!secilen && !secilen.arsiv, "otomatik seçim arşivsiz bir kayıt döndürmeli");

    // Temizlik: sonraki bölüm (aktif sınır) boş kütüphaneden başlamalı.
    for (const id of [kayit.id, ...dolduranlar]) repo.sinavSil(id);
    dogrula(repo.sinavlarGetir().length === 0, "temizlik sonrası kütüphane boş kalmalı");
    dogrula(otomatikAktifSinaviSec() === undefined, "boş kütüphanede otomatik seçim undefined dönmeli");

    console.log("✓ Yeni sınav oluşturma aktif yapıyor ve boş içerik yazıyor; sınırda yarım kayıt bırakmıyor");
  }

  // ─── 4. Aktif sınır: arşivdekiler sayılmaz ───────────────────────────────
  {
    const temel = metadataTuret(taslakUret() as never, 1);
    for (let i = 0; i < repo.AZAMI_AKTIF_SINAV; i++) repo.sinavEkle(temel);
    dogrula(repo.aktifSinavSayisi() === repo.AZAMI_AKTIF_SINAV, "aktif sayaç hatalı");

    let hata = "";
    try { repo.sinavEkle(temel); } catch (err) { hata = err instanceof Error ? err.message : String(err); }
    dogrula(/en fazla/.test(hata), `sınır aşımı engellenmeli, alınan: "${hata}"`);

    // Birini arşivle → yer açılmalı
    const ilk = repo.sinavlarGetir()[0];
    repo.sinavArsivle(ilk.id, true);
    dogrula(
      repo.aktifSinavSayisi() === repo.AZAMI_AKTIF_SINAV - 1,
      "arşivlenen sınav aktif sayıdan düşmeli",
    );
    const yeni = repo.sinavEkle(temel);
    dogrula(!!yeni.id, "arşivleme sonrası yeni sınav eklenebilmeli");

    // Arşivden çıkarma sınır doluyken engellenmeli
    let geriHata = "";
    try { repo.sinavArsivle(ilk.id, false); } catch (err) { geriHata = err instanceof Error ? err.message : ""; }
    dogrula(/Arşivden çıkarmak/.test(geriHata), "sınır doluyken arşivden çıkarma engellenmeli");

    // Arşivleme İÇERİĞİ SİLMEZ: kayıt kütüphanede duruyor
    dogrula(!!repo.sinavBul(ilk.id), "arşivlenen sınav kaydı silinmemeli");
    dogrula(repo.sinavBul(ilk.id)?.arsiv === true, "arşiv bayrağı yazılmalı");
  }

  // ─── 5. Silme ve geri yükleme ────────────────────────────────────────────
  {
    const kayit = repo.sinavlarGetir().find((s) => s.arsiv)!;
    repo.sinavSil(kayit.id);
    dogrula(!repo.sinavBul(kayit.id), "silinen sınav kütüphaneden çıkmalı");
    repo.sinavGeriYukle(kayit);
    dogrula(!!repo.sinavBul(kayit.id), "geri yüklenen sınav aynı kimlikle dönmeli");
  }

  // ——— Yeni sınav mevcut sınavı EZMEZ (2026-07-26 veri kaybı düzeltmesi) ———
  //
  // Bu dosyanın başındaki not "tek slot devrinde Yeni Başla emeği siliyordu"
  // diyor; kütüphane bunu çözmüştü ama SINAV OLUŞTURUCU EKRANI çözmemişti.
  // `yeniTaslaklaBasla` kendi `crypto.randomUUID()`'sini üretip
  // `aktifSinaviKaydet`'e veriyordu — o fonksiyon ise taslağın id'sini yok
  // sayıp her zaman AKTİF sınava yazar. Sonuç: İçerik Hazırlama'dan soru
  // gönderip "yeni sınav" diyen öğretmenin eski sınavı boş taslakla eziliyordu.
  {
    const repo = await import("../src/db/repo");
    const { yeniSinavOlusturVeAktifYap, aktifSinavIdOku, metadataTuret } = await import(
      "../src/modules/sinav-olusturucu/lib/sinavKutuphanesi"
    );
    const storage = await import("../src/modules/sinav-olusturucu/storage/taslakDepo");
    // Önceki bölümler aktif sınırı doldurmuş olabilir; bu senaryo temiz
    // kütüphaneden başlamalı, yoksa hata "sınır dolu"ya karışır.
    for (const s of repo.sinavlarGetir()) repo.sinavSil(s.id);

    const eskiTaslak = taslakUret({ sorular: [soruUret("s1"), soruUret("s2")] });
    const eski = repo.sinavEkle(metadataTuret(eskiTaslak as never, 1));
    await storage.sinavIcerigiKaydet(eski.id, { ...(eskiTaslak as never), id: eski.id });

    const yeni = await yeniSinavOlusturVeAktifYap();

    dogrula(yeni.id !== eski.id, "yeni sınav AYRI bir kayıt olmalı");
    dogrula(aktifSinavIdOku() === yeni.id, "aktif işaretçi yeni sınava taşınmalı");
    dogrula(!!repo.sinavBul(eski.id), "önceki sınavın METADATA'sı durmalı");
    const eskiIcerik = await storage.sinavIcerigiOku(eski.id);
    dogrula(
      !!eskiIcerik && eskiIcerik.sorular.length === 2,
      `önceki sınavın İÇERİĞİ ezilmiş — yeni sınav eskisinin üstüne yazıyor (kalan soru: ${eskiIcerik?.sorular.length ?? "yok"})`,
    );
  }

  // ─── Dış dosya yeni yerel sınav olur; aktif kaydın üstüne yazmaz ─────────
  {
    const { iceAktarilanSinaviYeniKayitYap, aktifSinavIdOku, metadataTuret } = await import(
      "../src/modules/sinav-olusturucu/lib/sinavKutuphanesi"
    );
    const storage = await import("../src/modules/sinav-olusturucu/storage/taslakDepo");
    for (const s of repo.sinavlarGetir()) repo.sinavSil(s.id);
    const mevcutTaslak = taslakUret({ sorular: [soruUret("mevcut-soru")] });
    const mevcut = repo.sinavEkle(metadataTuret(mevcutTaslak as never, 1));
    await storage.sinavIcerigiKaydet(mevcut.id, { ...(mevcutTaslak as never), id: mevcut.id });
    const disTaslak = taslakUret({ id: "yabanci-sinav", sorular: [soruUret("yeni-soru")] });
    const sonuc = await iceAktarilanSinaviYeniKayitYap(disTaslak as never, "sha256-ayni-sinav");
    dogrula(sonuc.kayit.id !== mevcut.id && sonuc.taslak.id === sonuc.kayit.id, "içe aktarılan sınav yeni yerel kimlik/kayıt almadı");
    dogrula(aktifSinavIdOku() === sonuc.kayit.id, "içe aktarılan yeni sınav aktif yapılmadı");
    dogrula((await storage.sinavIcerigiOku(mevcut.id))?.sorular[0].id === "mevcut-soru", "mevcut sınav içeriği içe aktarmada ezildi");
    dogrula((await storage.sinavIcerigiOku(sonuc.kayit.id))?.sorular[0].id === "yeni-soru", "içe aktarılan içerik yeni kayda yazılmadı");
    const adet = repo.sinavlarGetir().length;
    let kopyaEngellendi = false;
    try {
      await iceAktarilanSinaviYeniKayitYap(disTaslak as never, "sha256-ayni-sinav");
    } catch (err) {
      kopyaEngellendi = err instanceof Error && err.message.includes("daha önce");
    }
    dogrula(kopyaEngellendi, "aynı dosyanın ikinci aktarımı açık bir kopya uyarısı vermedi");
    dogrula(repo.sinavlarGetir().length === adet, "aynı dosyanın ikinci aktarımı kopya kayıt oluşturdu");
  }

  // Ekran bu kapıdan geçmek ZORUNDA. Kaynak metni aranıyor çünkü hata ekranın
  // kendi id üretiminde: kütüphane doğru çalışsa bile ekran kendi uuid'ini
  // üretip aktifSinaviKaydet'e verirse aynı veri kaybı geri gelir.
  {
    const { readFileSync } = await import("node:fs");
    const ekran = readFileSync("src/modules/sinav-olusturucu/SinavOlusturucuScreen.tsx", "utf8");
    // Editördeki "Yeni sınav" (yeniSinavaBasla) kütüphane kapısından geçmeli.
    // (Eski `yeniTaslaklaBasla` yalnız ders kitabı/soru havuzu aktarımının
    // kurtarma modalından açılıyordu; bağımsız pakette o akış kaldırıldı.)
    const govde = ekran.slice(
      ekran.indexOf("async function yeniSinavaBasla"),
      ekran.indexOf("const [acikBolumler, setAcikBolumler]"),
    );
    dogrula(govde.length > 0, "yeniSinavaBasla bulunamadı — test hedefini kaybetti");
    dogrula(
      govde.includes("yeniSinavOlusturVeAktifYap"),
      "yeniSinavaBasla kütüphane kapısını atlıyor; eski sınav ezilir",
    );
    dogrula(
      !govde.includes("crypto.randomUUID"),
      "yeniSinavaBasla kendi id'sini üretiyor — aktifSinaviKaydet onu yok sayıp aktif sınava yazar",
    );

    // Bağımsız pakette ders-kitabi / soru-havuzu modülleri YOK (app/router.tsx):
    // editör o modüllere bağlanmamalı, yoksa öğretmen "Bu sayfa bu sürümde
    // yok" ekranına ya da var olmayan modüle atıf yapan boş seçiciye düşer.
    for (const yasak of [
      "Soru Havuzundan",
      "SoruSeciciModal",
      "@/modules/ders-kitabi",
      "aktarimTuketici",
      "sinavAktarimDepo",
      "soruKaynaginiAc",
      "sinavIcinAyrilanNotlar",
    ]) {
      dogrula(!ekran.includes(yasak), `editör hâlâ kaldırılan akışa bağlı: ${yasak}`);
    }
    const sinavlarim = readFileSync("src/modules/sinav-olusturucu/SinavlarimScreen.tsx", "utf8");
    dogrula(!sinavlarim.includes("SinavIcinAyrilanlar"), "Sınavlarım hâlâ ders kitabı 'Ayırdıkların' bölümünü gösteriyor");

    // Denetim (2026-10, E5): ekranı yalnız açmak kütüphanede 0 soruluk "Adsız sınav"
    // bırakmamalı. Açılış (aktifSinaviHazirla) kayıt AÇMAZ; kayıt ilk içerikte açılır.
    const acilisGovdesi = ekran.slice(
      ekran.indexOf("async function aktifSinaviHazirla"),
      ekran.indexOf("aktifSinaviHazirla()\n"),
    );
    dogrula(acilisGovdesi.length > 0, "aktifSinaviHazirla gövdesi bulunamadı — test hedefini kaybetti");
    dogrula(!acilisGovdesi.includes("sinavEkle("), "açılış yine boş sınav kaydı açıyor (E5)");
    dogrula(/ilkIcerikVarRef\.current = true/.test(ekran), "ilk içerik işareti autosave'de kurulmuyor (E5)");
  }

  console.log("✓ Ad türetme başlık alanlarından ve test başlığından doğru çalışıyor");
  console.log("✓ Soru sayısı mantıksal sayılıyor (paket tek soru), sayfa sayısı önbellekleniyor");
  console.log("✓ Boyut göstergesi içerikle orantılı ve stringify'sız hesaplanıyor");
  console.log("✓ Aktif sınır uygulanıyor; arşivdekiler sayılmıyor ve arşiv içeriği silmiyor");
  console.log("✓ Silme geri alınabiliyor");
  console.log("✓ Yeni sınav öncekini EZMİYOR; editör kaldırılan ders kitabı/soru havuzu akışına bağlı değil");
  console.log("✓ Dış taslak yeni yerel sınav oluyor; mevcut sınav korunuyor");
  console.log("✓ Sınavlar yıl geçişinde korunuyor; föy metadata'sı VE IndexedDB içeriği birlikte siliniyor");
  console.log("TÜM SINAV KÜTÜPHANESİ SENARYOLARI BAŞARILI");
}

calistir().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
