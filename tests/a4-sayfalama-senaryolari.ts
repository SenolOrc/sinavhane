// layout/a4.ts sayfalama motoru testleri.
//
// Bu dosya modülün en matematiksel parçası ve uzun süre test dışı kaldı;
// faz6/faz7 süitleri yalnızca kaynak dosyada string arıyor, davranış test
// etmiyordu. Buradaki senaryolar gerçek yerleşim kararlarını doğrular.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  cevapAnahtariYuksekligiMm,
  kabaTahminMm,
  sayfalariOlustur,
} from "../src/modules/sinav-olusturucu/layout/a4";
import { metniBol, uzunSorulariBol } from "../src/modules/sinav-olusturucu/layout/soruBolme";
import { cizimOlcekDegerlendir, etkinMaddeKolon, gorselYerlesimHesapla, maddeHarfi } from "../src/modules/sinav-olusturucu/utils";
import type { SoruOgesi } from "../src/modules/sinav-olusturucu/types";

function verify(condition: unknown, message: string) {
  if (!condition) throw new Error(`A4 SAYFALAMA TESTİ BAŞARISIZ: ${message}`);
}

let sayac = 0;
function soru(ozel: Partial<SoruOgesi> = {}): SoruOgesi {
  sayac += 1;
  return {
    id: `s${sayac}`,
    tur: "metin",
    metinHtml: "soru",
    metinKonumu: "alt",
    hizalama: "sol",
    genislikMm: 60,
    boslukMm: 0,
    punto: 12,
    puan: null,
    maddeler: [],
    maddeKolon: 1,
    tamGenislik: false,
    ...ozel,
  };
}

/** Her soruya sabit yükseklik veren ölçüm fonksiyonu. */
function sabitYukseklik(mm: number) {
  return () => mm;
}

const TEK_SUTUN = { ciftSutun: false, kapasiteIlkMm: 100, kapasiteDevamMm: 200 };

// ─── 1. Boş girdi ──────────────────────────────────────────────────────────
verify(
  sayfalariOlustur([], sabitYukseklik(10), TEK_SUTUN).length === 0,
  "boş soru listesi için sayfa üretilmemeli",
);

// ─── 2. Sığan sorular tek sayfada kalır ────────────────────────────────────
{
  const sayfalar = sayfalariOlustur(
    [soru(), soru(), soru()],
    sabitYukseklik(30),
    TEK_SUTUN,
  );
  verify(sayfalar.length === 1, "3×30mm, 100mm kapasiteye tek sayfada sığmalı");
  verify(sayfalar[0].bantlar.length === 3, "üç soru üç bant üretmeli");
  verify(sayfalar[0].kullanilanMm === 90, `kullanılan 90mm olmalı, ${sayfalar[0].kullanilanMm}`);
}

// ─── 3. Sığmayan soru yeni sayfaya taşınır; devam kapasitesi kullanılır ────
{
  const sayfalar = sayfalariOlustur(
    [soru(), soru(), soru()],
    sabitYukseklik(60),
    TEK_SUTUN,
  );
  verify(sayfalar.length === 2, `60mm×3 iki sayfa olmalı, ${sayfalar.length}`);
  verify(sayfalar[0].bantlar.length === 1, "ilk sayfada tek soru kalmalı");
  verify(
    sayfalar[1].kapasiteMm === 200,
    "ikinci sayfa kapasiteDevamMm kullanmalı (ilk sayfa başlığı yok)",
  );
  verify(sayfalar[1].bantlar.length === 2, "kalan iki soru ikinci sayfada");
  verify(sayfalar[1].sayfaNo === 2, "sayfa numaraları artmalı");
}

// ─── 4. boslukMm yüksekliğe eklenir ────────────────────────────────────────
{
  const sayfalar = sayfalariOlustur(
    [soru({ boslukMm: 10 }), soru({ boslukMm: 10 })],
    sabitYukseklik(30),
    TEK_SUTUN,
  );
  verify(
    sayfalar[0].kullanilanMm === 80,
    `soru arası boşluk kapasiteden düşmeli (80 beklenir, ${sayfalar[0].kullanilanMm})`,
  );
}

// ─── 5. Çift sütun: sol dolunca sağa geçer ─────────────────────────────────
{
  const sayfalar = sayfalariOlustur(
    [soru(), soru(), soru()],
    sabitYukseklik(40),
    { ciftSutun: true, kapasiteIlkMm: 100, kapasiteDevamMm: 100 },
  );
  const bant = sayfalar[0].bantlar[0];
  verify(bant.tip === "sutun", "çift sütunda bant tipi 'sutun' olmalı");
  if (bant.tip === "sutun") {
    verify(bant.sol.length === 2, `sola iki soru sığmalı, ${bant.sol.length}`);
    verify(bant.sag.length === 1, `üçüncü soru sağa geçmeli, ${bant.sag.length}`);
  }
}

// ─── 6. tamGenislik çift sütunda bandı böler ───────────────────────────────
{
  const sayfalar = sayfalariOlustur(
    [soru(), soru({ tamGenislik: true }), soru()],
    sabitYukseklik(20),
    { ciftSutun: true, kapasiteIlkMm: 200, kapasiteDevamMm: 200 },
  );
  const tipler = sayfalar[0].bantlar.map((b) => b.tip);
  verify(
    tipler.join(",") === "sutun,tam,sutun",
    `tam genişlik sütun bandını bölmeli, alınan: ${tipler.join(",")}`,
  );
}

// ─── 7. İmza alanı: dolu son sayfada son bant yeni sayfaya taşınır ─────────
{
  // 3×30mm = 90mm, kapasite 100mm → tek sayfa, 10mm boş. İmza 14mm istiyor.
  const imzasiz = sayfalariOlustur([soru(), soru(), soru()], sabitYukseklik(30), TEK_SUTUN);
  verify(imzasiz.length === 1, "ön koşul: imza olmadan tek sayfa");

  const imzali = sayfalariOlustur([soru(), soru(), soru()], sabitYukseklik(30), {
    ...TEK_SUTUN,
    imzaMm: 14,
  });
  verify(
    imzali.length === 2,
    `imza sığmadığında son bant yeni sayfaya taşınmalı, ${imzali.length} sayfa`,
  );
  verify(imzali[0].bantlar.length === 2, "son sayfada iki bant kalmalı");
  verify(imzali[0].kullanilanMm === 60, `kullanılan yeniden hesaplanmalı, ${imzali[0].kullanilanMm}`);
  verify(imzali[1].bantlar.length === 1, "taşınan bant yeni sayfada tek olmalı");
  verify(
    imzali[0].kapasiteMm - imzali[0].kullanilanMm >= 14,
    "taşımadan sonra imza için yer açılmalı",
  );
}

// ─── 8. İmza alanı: yer varsa taşıma yapılmaz ──────────────────────────────
{
  const sayfalar = sayfalariOlustur([soru(), soru()], sabitYukseklik(30), {
    ...TEK_SUTUN,
    imzaMm: 14,
  });
  verify(sayfalar.length === 1, "2×30mm + 14mm imza 100mm'ye sığmalı");
}

// ─── 9. İmza alanı: tek bantlı son sayfada taşıma yapılmaz (sonsuz döngü yok) ─
{
  const sayfalar = sayfalariOlustur([soru()], sabitYukseklik(95), {
    ...TEK_SUTUN,
    imzaMm: 14,
  });
  verify(
    sayfalar.length === 1,
    "tek bant tek başına sayfayı dolduruyorsa taşınmamalı (taşma uyarısı bunu bildirir)",
  );
  verify(sayfalar[0].bantlar.length === 1, "bant kaybolmamalı");
}

// ─── 9b. Cevap anahtarı: yükseklik formülü ÖLÇÜLMÜŞ değerlerle uyuşuyor ────
//
// KORUDUĞU ŞEY: `cevapAnahtariYuksekligiMm` yerleşimin ayırdığı yeri belirler,
// blok ise SinavKagit'te çizilir. İkisi ayrışırsa hata SESSİZ: baskı sayfası
// `overflow: hidden` olduğu için taşan anahtar kırpılır, ekrandaki önizleme
// ise `minHeight` yüzünden uzayıp sorunu göstermez.
//
// Aşağıdaki sayılar uydurulmadı — bileşen tarayıcıda çizilip ölçüldü
// (önizleme ölçeği, mm'ye çevrilmiş): 3 madde → 26,38 · 12 madde → 43,38 ·
// 25 madde → 77,38. Formülle farkı 0,03 mm'nin altında. Bileşendeki punto,
// sütun sayısı ya da satır yüksekliği değişirse bu iddia düşer.
{
  verify(cevapAnahtariYuksekligiMm(0) === 0, "anahtar yoksa yer ayrılmamalı");

  const olculenler: [number, number][] = [
    [3, 26.38],
    [12, 43.38],
    [25, 77.38],
  ];
  for (const [madde, olculen] of olculenler) {
    const hesap = cevapAnahtariYuksekligiMm(madde);
    verify(
      Math.abs(hesap - olculen) < 0.05,
      `${madde} maddede formül (${hesap.toFixed(2)}mm) ölçülenden (${olculen}mm) sapıyor`,
    );
  }

  // Satır sayısı 4'lük bloklar hâlinde artmalı: 4 ve 5 madde AYNI olamaz.
  verify(
    cevapAnahtariYuksekligiMm(4) < cevapAnahtariYuksekligiMm(5),
    "5. madde ikinci satırı açmalı",
  );
  verify(
    cevapAnahtariYuksekligiMm(5) === cevapAnahtariYuksekligiMm(8),
    "5–8 madde aynı iki satıra sığmalı",
  );
}

// ─── 9c. Cevap anahtarı: son sayfada yer ayırıyor, imzayla TOPLANIYOR ──────
{
  // 3×30mm = 90mm, kapasite 100mm → 10mm boş. Anahtar 14mm istiyor.
  const anahtarsiz = sayfalariOlustur([soru(), soru(), soru()], sabitYukseklik(30), TEK_SUTUN);
  verify(anahtarsiz.length === 1, "ön koşul: anahtarsız tek sayfa");

  const anahtarli = sayfalariOlustur([soru(), soru(), soru()], sabitYukseklik(30), {
    ...TEK_SUTUN,
    anahtarMm: 14,
  });
  verify(
    anahtarli.length === 2,
    `anahtar sığmadığında son bant yeni sayfaya taşınmalı, ${anahtarli.length} sayfa`,
  );

  // ASIL İDDİA: ikisi ayrı ayrı değil TOPLANARAK değerlendirilmeli. 8+8=16mm
  // 10mm'lik boşluğa sığmaz; ayrı ayrı bakılsaydı ikisi de tek tek sığar
  // görünür ve taşıma HİÇ yapılmazdı.
  const ikisi = sayfalariOlustur([soru(), soru(), soru()], sabitYukseklik(30), {
    ...TEK_SUTUN,
    imzaMm: 8,
    anahtarMm: 8,
  });
  verify(
    ikisi.length === 2,
    "imza + anahtar TOPLAMI sığmıyorsa taşıma yapılmalı (ayrı ayrı bakılırsa ikisi de sığar görünür)",
  );
  verify(
    ikisi[0].kapasiteMm - ikisi[0].kullanilanMm >= 16,
    "taşımadan sonra İKİ blok için birden yer açılmalı",
  );

  // Yer varsa taşıma yok.
  const sigan = sayfalariOlustur([soru(), soru()], sabitYukseklik(30), {
    ...TEK_SUTUN,
    anahtarMm: 14,
  });
  verify(sigan.length === 1, "2×30mm + 14mm anahtar 100mm'ye sığmalı");
}

// ─── 10. İmza alanı 0 iken davranış değişmez ───────────────────────────────
{
  const a = sayfalariOlustur([soru(), soru(), soru()], sabitYukseklik(30), TEK_SUTUN);
  const b = sayfalariOlustur([soru(), soru(), soru()], sabitYukseklik(30), {
    ...TEK_SUTUN,
    imzaMm: 0,
  });
  verify(
    a.length === b.length && a[0].bantlar.length === b[0].bantlar.length,
    "imzaMm=0, parametre hiç verilmemişle aynı sonucu vermeli",
  );
}

// ─── 11. Hiçbir soru kaybolmaz / çoğalmaz ──────────────────────────────────
{
  const girdi = Array.from({ length: 17 }, () => soru());
  for (const ayar of [
    TEK_SUTUN,
    { ...TEK_SUTUN, imzaMm: 14 },
    { ciftSutun: true, kapasiteIlkMm: 100, kapasiteDevamMm: 120, imzaMm: 14 },
  ]) {
    const sayfalar = sayfalariOlustur(girdi, sabitYukseklik(25), ayar);
    const cikan = sayfalar.flatMap((sayfa) =>
      sayfa.bantlar.flatMap((bant) =>
        bant.tip === "tam" ? [bant.soru] : [...bant.sol, ...bant.sag],
      ),
    );
    verify(
      cikan.length === girdi.length,
      `soru sayısı korunmalı: girdi ${girdi.length}, çıktı ${cikan.length}`,
    );
    verify(
      cikan.map((s) => s.id).join(",") === girdi.map((s) => s.id).join(","),
      "soru SIRASI korunmalı",
    );
  }
}

// ─── Tam sayfa aktarımı KENDİ sayfasını alır ───────────────────────────────
//
// İçerik Hazırlama'dan "tam sayfa" / "sayfa aralığı" ile gelen görseller kitabın
// tam sayfasıdır. Eskiden alıcı taraf bunları sütun genişliğine küçültüyordu
// (okunmuyorlardı); artık tam genişlikte basılıyorlar. Bu da geometrik bir
// zorunluluk getiriyor: A4 oranında tam genişlik ≈ 269mm, ilk sayfanın
// kapasitesi ise 58mm'lik başlık yüzünden ~215mm. Aynı sayfayı paylaşırsa kâğıt
// 297mm'yi aşıyor ve SONRAKİ TÜM sayfaların hizası kayıyordu.
{
  const oncesi = soru({ id: "onces" });
  const tam = soru({ id: "tamsayfa", tur: "gorsel", tamGenislik: true, tamSayfa: true });
  const sonrasi = soru({ id: "sonras" });
  const sayfalar = sayfalariOlustur(
    [oncesi, tam, sonrasi],
    sabitYukseklik(30),
    { ciftSutun: true, kapasiteIlkMm: 200, kapasiteDevamMm: 260 },
  );
  const tamSayfaIndex = sayfalar.findIndex((s) =>
    s.bantlar.some((b) => b.tip === "tam" && b.soru.id === "tamsayfa"),
  );
  verify(tamSayfaIndex > 0, "tam sayfa sorusu, üstünde içerik varken YENİ sayfa açmalı");
  const oSayfa = sayfalar[tamSayfaIndex];
  verify(oSayfa.bantlar.length === 1, "tam sayfa sorusu sayfayı paylaşmamalı");
  verify(
    sayfalar[tamSayfaIndex + 1]?.bantlar.some((b) => b.tip !== "tam" || b.soru.id === "sonras"),
    "tam sayfadan sonraki soru YENİ sayfaya geçmeli",
  );
  // Çift sütun açıkken bile: öğretmen "tek/çift sütun" seçse de tam sayfa
  // tam sayfadır (kullanıcı isteği).
  verify(
    oSayfa.bantlar[0].tip === "tam",
    "tam sayfa sorusu çift sütun modunda bile tam bant olmalı",
  );
}

// Tam sayfa sorusu listenin SONUNCUSUYSA arkasına boş sayfa eklenmemeli:
// tam sayfa kendinden sonra sayfayı kapatıyor, döngü sonundaki kapanış da
// ikinci kez çalışıyordu.
{
  const sayfalar = sayfalariOlustur(
    [soru({ id: "ilk" }), soru({ id: "son", tur: "gorsel", tamGenislik: true, tamSayfa: true })],
    sabitYukseklik(30),
    TEK_SUTUN,
  );
  verify(
    sayfalar.every((s) => s.bantlar.length > 0),
    `tam sayfa sonda iken BOŞ sayfa üretildi (${sayfalar.map((s) => s.bantlar.length).join(",")})`,
  );
}

// ─── Yazdırmada kâğıt yüksekliği SABİT ─────────────────────────────────────
//
// Kaynak metni aranıyor çünkü kusur sayfalama matematiğinde değil, CSS'teydi:
// `minHeight` ile bir sayfa kapasiteyi aşınca 297mm'nin ötesine uzuyor (ölçülen
// örnek: 317,2mm) ve tarayıcı kendi sayfa sonunu atınca SONRAKİ TÜM sayfaların
// hizası kayıyordu. Ekranda kilit olmamalı — önizlemede taşmanın görünmesi
// öğretmenin sorunu fark etmesini sağlayan şey.
{
  const kagit = readFileSync(resolve("src/modules/sinav-olusturucu/components/SinavKagit.tsx"), "utf8");
  // Bu iddia eskiden `height: olcu(A4_YUKSEKLIK_MM)` arıyordu. KORUDUĞU ŞEY
  // hangi sabitin kullanıldığı değil, yüksekliğin SABİT olmasıydı (minHeight
  // değil) — taşan bir soru sonraki sayfaları kaydırmasın diye. Yükseklik
  // 841.5pt'ye taşındığı için iddia da taşındı ve GÜÇLENDİ: artık 297mm'ye
  // geri dönüşü de yakalıyor.
  verify(
    kagit.includes("props.yazdirmaModu") &&
      /height: `\$\{A4_YAZDIRMA_YUKSEKLIK_PT\}pt`/.test(kagit),
    "yazdırma modunda kâğıt yüksekliği sabitlenmiyor — taşan bir soru sonraki sayfaları kaydırır",
  );
  verify(
    !/height: olcu\(A4_YUKSEKLIK_MM\)/.test(kagit),
    "yazdırma yüksekliği 297mm'ye geri dönmüş — her çıktının sonuna boş sayfa gelir ve hizalar kayar (ölçüm: 15 sayfa → 16 sayfa, 2,1 mm sapma)",
  );
  {
    const sabitler = readFileSync(resolve("src/modules/sinav-olusturucu/constants.ts"), "utf8");
    verify(
      /A4_YAZDIRMA_YUKSEKLIK_PT = 841\.5;/.test(sabitler),
      "yazdırma yüksekliği 841.5pt değil — ölçülen tek değer bu: 841.6/841.7/841.89pt de 297mm gibi N+1 sayfa veriyor",
    );
    // Kapasite hesabı BİLEREK 297'de kalıyor; ikisi karışırsa sayfalama —
    // dolayısıyla mevcut sınavların düzeni — değişir.
    verify(
      /A4_YUKSEKLIK_MM = 297;/.test(sabitler),
      "mantıksal sayfa yüksekliği (kapasite hesabı) değişmiş",
    );
  }
  verify(
    kagit.includes('overflow: "hidden"'),
    "yazdırmada taşma kendi sayfasında tutulmuyor",
  );

  // ANTET: logonun yanındaki sütun DİKEYDE ORTALI olmalı.
  //
  // Bu bir ürün kararı ve GERÇEKTEN kırıldı: sütun `flex-1` ile logo boyunca
  // uzayınca içeriği tepeye çakılı kalıyor, logo büyüdükçe altında giderek
  // büyüyen boş bir bant doğuyordu. Test kipinde (kimlik bloğu yok, sütun
  // kısa) en belirgin hâli — öğretmen 28 mm logoda bildirdi. Ölçüm: düzeltme
  // sonrası içeriğin üstünde 5,92 mm, altında 5,92 mm.
  //
  // `\s*` KULLANILMIYOR (§15.8): çok satırlı bir eşleşme başka bir bloğu
  // yakalayıp iddiayı boşa düşürebiliyor; sınıf adı tek parça aranıyor.
  verify(
    kagit.includes("flex min-w-0 flex-1 flex-col justify-center"),
    "antette logonun yanındaki sütun dikeyde ortalanmıyor — logo büyüdükçe altında boş bant kalır",
  );
  verify(
    /minHeight: olcu\(A4_YUKSEKLIK_MM\)/.test(kagit),
    "ekran önizlemesinde alt sınır kaldırılmış — taşma görünmez olur",
  );
}

console.log("✓ Boş girdi, sığma, sayfa taşma ve devam kapasitesi doğru");
console.log("✓ Çift sütun dağılımı ve tam genişlik bant bölmesi doğru");
console.log("✓ İmza alanı rezervasyonu: taşıma, taşımama ve sonsuz döngü koruması doğru");
console.log("✓ Cevap anahtarı: yükseklik formülü ölçülenle uyuşuyor, rezerv imzayla toplanıyor");
console.log("✓ Sayfalama soruları kaybetmiyor, çoğaltmıyor, sırasını bozmuyor");
console.log("✓ Tam sayfa aktarımı kendi sayfasını alıyor, arkasına boş sayfa bırakmıyor");
console.log("✓ Yazdırmada kâğıt yüksekliği sabit, ekranda esnek");
// ——— Görselin SERBEST yüksekliği ilk-boyama tahminine giriyor ———
// KORUDUĞU ŞEY: sayfa sayısının ilk karede doğru çıkması. Gerçek sayfalama
// DOM'dan ölçüyor, ama ölçüm gelmeden önceki tahmin `kabaTahminMm`den geliyor.
// Görsel dikeyde esnetilmişse orandan hesaplanan yükseklik ARTIK GEÇERSİZ;
// tahmin oranı kullanmayı sürdürseydi 250 mm'lik bir görsel 62 mm sanılır ve
// öğretmen ilk karede yanlış sayfa sayısı görürdü.
const gorselTaban = soru({
  tur: "gorsel",
  metinHtml: undefined,
  gorselDataUrl: "data:image/png;base64,x",
  genislikMm: 84,
  gorselOran: 1.35,
});
const orantili = kabaTahminMm(gorselTaban, 180);
const serbest = kabaTahminMm({ ...gorselTaban, gorselYukseklikMm: 250 }, 180);
verify(
  Math.abs(orantili - (6 + 84 / 1.35)) < 0.01,
  `orantılı tahmin bozuldu: ${orantili}`,
);
verify(
  Math.abs(serbest - (6 + 250)) < 0.01,
  `serbest yükseklik tahmine girmiyor: ${serbest} (beklenen 256)`,
);
verify(serbest > orantili + 100, "serbest yükseklik tahmini oranınkinden ayrışmıyor");
console.log("✓ Görselin serbest yüksekliği ilk boyama tahminine yansıyor");

// ─── Sığma denetimi soru SONRASI boşluğu saymaz ───────────────────────────
{
  // Kapasite 100: 1. soru 40+5 boşluk → kalan 55; 2. soru 50 (+30 boşluk).
  // Boşluk dâhil 80 > 55 idi ve soru gereksiz yere 2. sayfaya atılıyordu.
  const yuk = (s: SoruOgesi) => (s.id === "bosluk-1" ? 40 : 50);
  const a = soru({ id: "bosluk-1", boslukMm: 5 });
  const b = soru({ id: "bosluk-2", boslukMm: 30 });
  const tek = sayfalariOlustur([a, b], yuk, TEK_SUTUN);
  verify(tek.length === 1, `tek sütun: soru boşluk yüzünden sonraki sayfaya atıldı (${tek.length} sayfa)`);
  const cift = sayfalariOlustur([a, b], yuk, { ...TEK_SUTUN, ciftSutun: true });
  verify(cift.length === 1 && cift[0].bantlar.length === 1, "çift sütun: ikinci soru aynı sütun bandına sığmalı");
  // Gerçekten sığmayan soru hâlâ taşınır.
  const buyuk = soru({ id: "bosluk-3", boslukMm: 0 });
  const iki = sayfalariOlustur([a, buyuk], () => 60, TEK_SUTUN);
  verify(iki.length === 2, "sığmayan soru sonraki sayfaya geçmeli");
  console.log("✓ Sayfalama: soru sonrası boşluk sığma denetimine girmiyor");
}

// ─── Sayfaya sığmayan görsel/çizim orantılı küçülür ───────────────────────
{
  const dikey = soru({ tur: "gorsel", metinHtml: undefined, gorselDataUrl: "data:image/png;base64,x", genislikMm: 100, gorselOran: 0.25 });
  const serbest = gorselYerlesimHesapla(dikey, 180);
  verify(Math.abs(serbest.gorselMm - 100) < 0.01, "sınır verilmezse eski davranış korunmalı");
  const sinirli = gorselYerlesimHesapla(dikey, 180, 200);
  verify(Math.abs(sinirli.gorselMm / 0.25 - 200) < 0.01, `yükseklik sınırı uygulanmadı: ${sinirli.gorselMm}`);
  const sigan = gorselYerlesimHesapla({ ...dikey, gorselOran: 2 }, 180, 200);
  verify(Math.abs(sigan.gorselMm - 100) < 0.01, "zaten sığan görsel küçülmemeli");
  const tamSayfa = gorselYerlesimHesapla({ ...dikey, tamSayfa: true }, 180, 200);
  verify(Math.abs(tamSayfa.gorselMm - 100) < 0.01, "tam sayfa soruya sınır uygulanmamalı");
  console.log("✓ Görsel/çizim sayfa yüksekliğine sığacak şekilde orantılı küçülüyor");
}

// ─── Tek sayfadan uzun METİN sorusu paragraf sınırında bölünür ────────────
{
  // 45 paragraf, her biri 10 mm: toplam 450 mm. 1. sayfa 200, devam 260 mm.
  const blokHtml = Array.from({ length: 45 }, (_, i) => `<p>Paragraf ${i + 1}</p>`);
  const olcu = { ustMm: blokHtml.map((_, i) => i * 10), toplamMm: 450 };
  const uzun = soru({ metinHtml: blokHtml.join(""), boslukMm: 8, puan: 10, maddeler: [{ id: "m", metinHtml: "a", puan: null, cevapSatir: 0 }] });
  const parcalar = metniBol(uzun, blokHtml, olcu, 200, 260);
  verify(parcalar !== null && parcalar.length >= 3, "uzun soru en az 3 parçaya bölünmeli");
  const p = parcalar!;
  verify(p.map((x) => x.metinHtml).join("") === blokHtml.join(""), "bölme hiçbir paragrafı kaybetmemeli/sırayı bozmamalı");
  verify(p.every((x, i) => x.id === `${uzun.id}~d${i}` && x.devamKaynakId === uzun.id), "parça kimlikleri/kaynak bağı yanlış");
  verify(p.every((x) => x.logicalQuestionId === uzun.id), "parçalar aynı mantıksal soruya bağlı olmalı (numara tek)");
  verify(p[0].gosterilenPuan === 10 && p.slice(1).every((x) => x.gosterilenPuan === null), "puan yalnız ilk parçada gösterilmeli");
  verify(!p[0].devamParcasi && p.slice(1).every((x) => x.devamParcasi), "yalnız devam parçaları numarasız olmalı");
  verify(p.slice(0, -1).every((x) => x.maddeler.length === 0 && x.boslukMm === 0), "maddeler ve boşluk yalnız son parçada olmalı");
  verify(p[p.length - 1].maddeler.length === 1 && p[p.length - 1].boslukMm === 8, "son parça maddeleri ve boşluğu taşımalı");
  verify(p[0].metinHtml.split("</p>").length - 1 <= 19, "ilk parça 1. sayfa kapasitesini aşmamalı");

  // Kısa, tek bloklu, ölçümle tutmayan, paket ve görselli sorular bölünmez.
  verify(metniBol(soru({ metinHtml: "x" }), ["<p>a</p>", "<p>b</p>"], { ustMm: [0, 10], toplamMm: 20 }, 200, 260) === null, "kısa soru bölünmemeli");
  verify(metniBol(uzun, [blokHtml.join("")], { ustMm: [0], toplamMm: 450 }, 200, 260) === null, "tek blok bölünemez (uyarı kalmalı)");
  verify(metniBol(uzun, blokHtml, { ustMm: [0, 10], toplamMm: 450 }, 200, 260) === null, "ölçümle blok sayısı tutmuyorsa bölünmemeli");
  verify(metniBol({ ...uzun, paketId: "k" }, blokHtml, olcu, 200, 260) === null, "paket parçası bölünmemeli");
  verify(metniBol({ ...uzun, tur: "gorsel" }, blokHtml, olcu, 200, 260) === null, "görselli soru bölünmemeli");

  // Parçalar yerleşimde sayfa kapasitesini AŞMAZ, paragraflar sırayla çıkar.
  const genisletilmis = uzunSorulariBol([uzun], 200, 260, () => ({ blokHtml, olcu }));
  const yuk = (s: SoruOgesi) => (s.metinHtml!.split("</p>").length - 1) * 10;
  const sayfalar = sayfalariOlustur(genisletilmis, yuk, { ciftSutun: false, kapasiteIlkMm: 200, kapasiteDevamMm: 260 });
  verify(sayfalar.length === 2, `2 sayfa beklenirdi: ${sayfalar.length}`);
  verify(sayfalar.every((sf) => sf.kullanilanMm <= sf.kapasiteMm), "hiçbir sayfa kapasiteyi aşmamalı");
  const gorunen = sayfalar.flatMap((sf) => sf.bantlar.flatMap((b) => (b.tip === "tam" ? [b.soru] : [...b.sol, ...b.sag])));
  verify(gorunen.map((x) => x.metinHtml).join("") === blokHtml.join(""), "yerleşen parçalar tüm paragrafları sırayla içermeli");

  // Bölünecek bir şey yoksa AYNI dizi referansı döner.
  const kisa = [soru({ metinHtml: "x" })];
  verify(uzunSorulariBol(kisa, 200, 260, () => null) === kisa, "bölünmeyen listede aynı referans dönmeli");
  console.log("✓ Uzun metin sorusu paragraf sınırında bölünüyor, içerik kaybolmuyor");
}

// ─── Maddeli/şıklı soru madde sınırında bölünür (sessiz kırpma YOK) ─────────
{
  const maddeler = Array.from({ length: 30 }, (_, i) => ({ id: `m${i}`, metinHtml: `Madde ${i}`, puan: null, cevapSatir: 0 }));
  // Kök blok 0..20 mm, 30 madde x 10 mm (300 mm) => toplam 320 mm.
  const olcu = { ustMm: [0], toplamMm: 320, maddeUstMm: maddeler.map((_, i) => 20 + i * 10) };
  const m = soru({ metinHtml: "<p>kök</p>", maddeler, boslukMm: 6, puan: 12 });
  const p = metniBol(m, ["<p>kök</p>"], olcu, 200, 260)!;
  verify(p !== null && p.length >= 2, "maddeli uzun soru bölünmeli");
  verify(p.flatMap((x) => x.maddeler).map((x) => x.id).join() === maddeler.map((x) => x.id).join(), "hiçbir madde kaybolmamalı/sırası bozulmamalı");
  verify(p.every((x, i) => x.maddeHarfBaslangic === p.slice(0, i).reduce((t, y) => t + y.maddeler.length, 0)), "devam parçalarında harf sırası sürmeli");
  verify(p[0].metinHtml === "<p>kök</p>" && p.slice(1).every((x) => x.metinHtml === ""), "kök yalnız ilk parçada olmalı");
  verify(p.slice(0, -1).every((x) => x.boslukMm === 0) && p[p.length - 1].boslukMm === 6, "boşluk yalnız son parçada");
  const yukP = (x: SoruOgesi) => (x.metinHtml ? 20 : 0) + x.maddeler.length * 10;
  const sf = sayfalariOlustur(p, yukP, { ciftSutun: false, kapasiteIlkMm: 200, kapasiteDevamMm: 260 });
  verify(sf.every((x) => x.kullanilanMm <= x.kapasiteMm + 0.001), "parçalar sayfa kapasitesini aşmamalı");

  // Görselli soru: görsel+kök ilk parçada, maddeler devam parçalarında (tur metin).
  const g = soru({ tur: "gorsel", metinHtml: undefined, altMetinHtml: "<p>kök</p>", gorselDataUrl: "data:image/png;base64,x", gorselOran: 1, maddeler, boslukMm: 4 });
  const gOlcu = { ustMm: [], toplamMm: 100 + 300, maddeUstMm: maddeler.map((_, i) => 100 + i * 10) };
  const gp = metniBol(g, [], gOlcu, 200, 260)!;
  verify(gp !== null && gp.length >= 2, "görselli maddeli soru bölünmeli");
  verify(gp[0].tur === "gorsel" && !!gp[0].gorselDataUrl, "görsel ilk parçada kalmalı");
  verify(gp.slice(1).every((x) => x.tur === "metin" && !x.gorselDataUrl), "devam parçaları yalnız madde taşımalı");
  verify(gp.flatMap((x) => x.maddeler).length === 30, "görselli soruda da madde kaybolmamalı");
  verify(gp[0].maddeler.length >= 1, "ilk parça sığdığı kadar madde almalı");
  // Maddeler görselin yanında DEĞİL altında dizildiği için yan yana düzende de bölünür.
  verify(metniBol({ ...g, metinKonumu: "sag" }, [], gOlcu, 200, 260) !== null, "yan yana düzende de bölünmeli");
  verify(metniBol(g, [], { ustMm: [], toplamMm: 400 }, 200, 260) === null, "madde ölçümü yoksa görselli soru bölünmemeli");
  // Çok sütunlu maddelerde kesim yalnız satır başında.
  const iki = Array.from({ length: 40 }, (_, i) => ({ id: `k${i}`, metinHtml: "x", puan: null, cevapSatir: 0 }));
  const olcuIki = { ustMm: [0], toplamMm: 20 + 20 * 10, maddeUstMm: iki.map((_, i) => 20 + Math.floor(i / 2) * 10) };
  const ip = metniBol(soru({ metinHtml: "<p>k</p>", maddeler: iki, maddeKolon: 2 }), ["<p>k</p>"], olcuIki, 100, 100)!;
  verify(ip !== null && ip.slice(0, -1).every((x) => x.maddeler.length % 2 === 0), "çok sütunlu maddeler satır ortasından bölünmemeli");
  console.log("✓ Maddeli/şıklı ve görselli sorular madde sınırında bölünüyor");
}

// ─── Sığmayan soru boş SAĞ sütuna zorlanıp sayfa dibinde kesilmez ───────────
{
  const kisa = soru({ id: "kisa" });
  const uzun = soru({ id: "uzun" });
  const yuk = (x: SoruOgesi) => (x.id === "uzun" ? 180 : 20);
  const sf = sayfalariOlustur([kisa, uzun], yuk, { ciftSutun: true, kapasiteIlkMm: 100, kapasiteDevamMm: 200 });
  verify(sf.length === 2, `uzun soru yeni sayfaya geçmeli: ${sf.length} sayfa`);
  const yeni = sf[1].bantlar[0];
  verify(yeni.tip === "sutun" && yeni.sol[0].id === "uzun" && yeni.sag.length === 0, "uzun soru yeni sayfada SOL sütundan başlamalı");
  verify(sf.every((x) => x.kullanilanMm <= x.kapasiteMm), "hiçbir sayfa kapasiteyi aşmamalı");
  console.log("✓ Sığmayan soru sağ sütuna zorlanmıyor");
}

// ─── Tam genişlik sorudan / belge sonundan önce sütunlar dengelenir ──────────
{
  const dortlu = [0, 1, 2, 3].map((i) => soru({ id: `d${i}` }));
  const tam = soru({ id: "tamsoru", tamGenislik: true });
  const yuk = (x: SoruOgesi) => (x.id === "tamsoru" ? 60 : 20);
  const sf = sayfalariOlustur([...dortlu, tam], yuk, { ciftSutun: true, kapasiteIlkMm: 100, kapasiteDevamMm: 200 });
  const b0 = sf[0].bantlar[0];
  verify(b0.tip === "sutun" && b0.sol.length === 2 && b0.sag.length === 2, "tam soru öncesi sütunlar dengelenmeli (2+2)");
  verify(sf.length === 1, `dengeleme kazanılan yerle tam soruyu aynı sayfaya sığdırmalı: ${sf.length} sayfa`);
  const son = sayfalariOlustur(dortlu, yuk, { ciftSutun: true, kapasiteIlkMm: 100, kapasiteDevamMm: 200 });
  const bs = son[0].bantlar[0];
  verify(bs.tip === "sutun" && bs.sol.map((x) => x.id).join() === "d0,d1" && bs.sag.map((x) => x.id).join() === "d2,d3", "belge sonunda da dengelenmeli, sıra korunmalı");
  console.log("✓ Sütun dengeleme: sayfa israfı azalıyor, okuma sırası korunuyor");
}

// ─── Şık harf biçimi, otomatik şık dizilimi, çizim ölçek alt sınırı ────────
{
  // Yazılıda büyük harf de Türk alfabesi: küçük harfle (a b c ç d) aynı sıra,
  // yoksa aynı madde biçime göre "ç)" ya da "D)" oluyordu.
  verify([0, 1, 2, 3, 4].map((i) => maddeHarfi(i, false, "buyuk")).join("") === "ABCÇD", "yazılıda büyük harf A) B) C) Ç) D) olmalı");
  verify([0, 1, 2, 3, 4].map((i) => maddeHarfi(i)).join("") === "abcçd", "yazılı varsayılanı Türkçe a b c ç d kalmalı");
  verify([0, 1, 2, 3, 4].map((i) => maddeHarfi(i, true)).join("") === "ABCDE", "test varsayılanı A–E kalmalı");
  verify([0, 1, 2, 3, 4].map((i) => maddeHarfi(i, true, "kucuk")).join("") === "abcde", "test küçük harfte anahtarla aynı Latin sıra");
  const m = (metin: string, n = 5) => ({ maddeler: Array.from({ length: n }, (_, i) => ({ id: `${i}`, metinHtml: metin, puan: null, cevapSatir: 0 })), maddeKolon: 1 as const, punto: 10 });
  verify(etkinMaddeKolon(m("2x"), 90, "otomatik") === 5, `kısa 5 şık tek satır olmalı: ${etkinMaddeKolon(m("2x"), 90, "otomatik")}`);
  verify(etkinMaddeKolon(m("2x"), 90, "liste") === 1, "liste düzeninde alt alta kalmalı");
  verify(etkinMaddeKolon(m("Uzun bir şık metni ki satıra zor sığar ve devam eder"), 90, "otomatik") === 1, "uzun şıklar alt alta kalmalı");
  const orta = etkinMaddeKolon(m("I, II ve III"), 90, "otomatik");
  verify(orta === 3 || orta === 2, `orta uzunlukta dengeli sütun beklenirdi: ${orta}`);
  verify(etkinMaddeKolon({ ...m("x"), maddeKolon: 2 }, 90, "otomatik") === 2, "sorunun kendi sütun ayarı korunmalı");
  verify(etkinMaddeKolon(m('<img src="data:image/png;base64,x" class="denklem-inline"><img src="x"><img src="y">'), 40, "otomatik") <= 2, "görselli şıklar geniş sayılmalı");

  // 960 px doğal genişlikli çizim PNG'si (IHDR) — 3x kalite → 320 CSS px ≈ 84,7 mm.
  const png = (px: number) => {
    const b = new Uint8Array(24);
    b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
    b[16] = (px >>> 24) & 255; b[17] = (px >>> 16) & 255; b[18] = (px >>> 8) & 255; b[19] = px & 255;
    return `data:image/png;base64,${Buffer.from(b).toString("base64")}`;
  };
  const cz = (px: number, genislikMm: number) => soru({ tur: "gorsel", metinHtml: undefined, gorselDataUrl: png(px), gorselOran: 2, genislikMm, cizimVerisi: { surum: 1, genislik: 960, yukseklik: 600, sekiller: [] } });
  const genis = cizimOlcekDegerlendir(cz(2880, 84), 91, 190, true)!; // doğal ≈ 254 mm
  verify(genis.otoTam && genis.oran < 0.7, `geniş çizim otomatik tam genişliğe alınmalı: ${JSON.stringify(genis)}`);
  const kucuk = cizimOlcekDegerlendir(cz(900, 84), 91, 190, true)!; // doğal ≈ 79 mm
  verify(!kucuk.otoTam, "sütuna okunur sığan çizim sütunda kalmalı");
  const elle = cizimOlcekDegerlendir(cz(2880, 40), 91, 190, true)!;
  verify(!elle.otoTam, "öğretmenin elle küçülttüğü çizime dokunulmamalı (yalnız ipucu)");
  verify(cizimOlcekDegerlendir(cz(2880, 84), 91, 190, false)?.otoTam === false, "tek sütunda otomatik geçiş yok");
  console.log("✓ Şık harf biçimi, otomatik şık dizilimi ve çizim ölçek alt sınırı");
}

console.log("TÜM A4 SAYFALAMA SENARYOLARI BAŞARILI");
