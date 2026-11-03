/**
 * AKIŞ ŞEMASINI YAZARAK TARİF ETME — ayrıştırıcı + yerleşim.
 *
 * Öğretmenin isteği: 45 kutuluk şemayı elle kurmak yorucu; yazınca uygulama
 * dizsin. İki karar verildi (DEVAM §19.5): metin BİR KERELİK (kutular
 * dizilince bağ kopar) ve DÖNGÜ DESTEKLENİR.
 *
 * En önemli iddia sondaki: hiçbir ok kutunun üstünden geçmemeli. Döngülü
 * şemayı okunmaz yapan tek şey budur ve göz kararıyla doğrulanamaz.
 */
import { akisMetniniCoz } from "../src/modules/sinav-olusturucu/cizim/akisMetni";
import { akisiYerlestir, geriKenarlariBul } from "../src/modules/sinav-olusturucu/cizim/akisYerlesim";
import { baglayiciYolu, yolOrtaNoktasi } from "../src/modules/sinav-olusturucu/cizim/geometri";
import type { Nokta, Sekil } from "../src/modules/sinav-olusturucu/cizim/tipler";

function dogrula(kosul: unknown, mesaj: string) {
  if (!kosul) throw new Error(`AKIŞ METNİ TESTİ BAŞARISIZ: ${mesaj}`);
}

const DUZ = `
(Başla) -> /Sayıyı oku/ -> <Çift mi?> -evet-> [Çifttir yazdır] -> (Bitir)
<Çift mi?> -hayır-> [Tektir yazdır] -> (Bitir)
`;

/** Öğretmenin gönderdiği örneğin (hangman) çekirdeği: iki geri kenar. */
const DONGULU = `
# Adam asmaca
(Başla) -> [Harf iste] -> <Doğru mu?> -hayır-> [Can azalt] -> <Can bitti mi?> -hayır-> [Harf iste]
<Can bitti mi?> -evet-> (Kaybettin)
<Doğru mu?> -evet-> <Kelime bitti mi?> -hayır-> [Harf iste]
<Kelime bitti mi?> -evet-> (Kazandın)
`;

function ayristirmaSenaryolari() {
  const t = akisMetniniCoz(DUZ);

  // 1) Şekiller işaretlerden geliyor.
  const sekilAdi = (metin: string) => t.dugumler.find((d) => d.metin === metin)?.sekil;
  dogrula(sekilAdi("Başla") === "baslangic", `( ) başla/bitir vermiyor: ${sekilAdi("Başla")}`);
  dogrula(sekilAdi("Sayıyı oku") === "veri", `/ / girdi/çıktı vermiyor: ${sekilAdi("Sayıyı oku")}`);
  dogrula(sekilAdi("Çift mi?") === "karar", `< > karar vermiyor: ${sekilAdi("Çift mi?")}`);
  dogrula(sekilAdi("Çifttir yazdır") === "surec", "[ ] işlem vermiyor");
  dogrula(akisMetniniCoz("Sadece metin").dugumler[0].sekil === "surec", "işaretsiz adım işlem olmalı");

  // 2) DÜZ OK etiketsiz, `-evet->` etiketli. İlk yazışta ok kalıbı düz `->`yi
  //    HİÇ yakalamıyordu; satırın tamamı tek kutu oluyordu.
  const basla = t.dugumler.find((d) => d.metin === "Başla")!;
  const oku = t.dugumler.find((d) => d.metin === "Sayıyı oku")!;
  const ilk = t.kenarlar.find((k) => k.kaynakId === basla.id && k.hedefId === oku.id);
  dogrula(ilk, "düz ok (->) bağlantı üretmedi");
  dogrula(ilk!.etiket === undefined, `düz oka etiket takılmış: ${ilk!.etiket}`);
  const evetOku = t.kenarlar.find((k) => k.etiket === "evet");
  dogrula(evetOku, "-evet-> etiketi okunmadı");
  dogrula(t.kenarlar.some((k) => k.etiket === "hayır"), "-hayır-> etiketi okunmadı");

  // 3) AYNI METİN AYNI KUTU: iki dal da tek "Bitir"e bağlanmalı.
  dogrula(
    t.dugumler.filter((d) => d.metin === "Bitir").length === 1,
    "aynı metin ikinci kez yazılınca yeni kutu açılıyor — dallar birleşemez",
  );
  const bitir = t.dugumler.find((d) => d.metin === "Bitir")!;
  dogrula(
    t.kenarlar.filter((k) => k.hedefId === bitir.id).length === 2,
    "iki dal da Bitir'e bağlanmamış",
  );

  // 4) Türkçe katlama: "HARF İSTE" ile "Harf iste" AYNI kutu olmalı.
  //    `toLowerCase()` kullanılsaydı büyük I noktasız ı'ya inmez ve iki ayrı
  //    kutu çıkardı (§15.6 ailesinin bu modüldeki hâli).
  const katlama = akisMetniniCoz("[Harf iste] -> [Can azalt] -> [HARF İSTE]");
  dogrula(
    katlama.dugumler.length === 2,
    `Türkçe katlama çalışmıyor, ${katlama.dugumler.length} kutu çıktı: ${katlama.dugumler.map((d) => d.metin).join(", ")}`,
  );

  // 5) Yorum satırı ve boş satır atlanmalı.
  const yorumlu = akisMetniniCoz("# başlık\n\n(Başla) -> (Bitir)   # sonu\n");
  dogrula(yorumlu.dugumler.length === 2, `yorum/boş satır kutuya dönüşmüş: ${yorumlu.dugumler.length}`);

  // 6) Kendine bağlanma reddedilmeli (sonsuz kendi kendine ok).
  const kendine = akisMetniniCoz("[A] -> [A]");
  dogrula(kendine.kenarlar.length === 0, "kutu kendine bağlanıyor");
  dogrula(kendine.uyarilar.length > 0, "kendine bağlanma sessizce atlanmış — öğretmen niye olmadığını bilmiyor");

  console.log("✓ Akış metni: şekil işaretleri, etiketli/etiketsiz ok, aynı metin aynı kutu, Türkçe katlama");
}

function geriKenarSenaryolari() {
  const t = akisMetniniCoz(DONGULU);
  const geri = geriKenarlariBul(t);
  dogrula(geri.size === 2, `geri kenar sayısı 2 değil: ${geri.size}`);
  // Geri kenarların ikisi de "Harf iste"ye dönmeli.
  const harf = t.dugumler.find((d) => d.metin === "Harf iste")!;
  dogrula(
    [...geri].every((i) => t.kenarlar[i].hedefId === harf.id),
    "geri kenarlar döngü başına dönmüyor",
  );
  // Düz şemada geri kenar OLMAMALI — yoksa iddia her şeyi "geri" sayıyordur.
  dogrula(geriKenarlariBul(akisMetniniCoz(DUZ)).size === 0, "düz şemada geri kenar bulundu");
  console.log("✓ Akış metni: döngü (geri kenar) tespiti");
}

function kesisiyorMu(a: Nokta, b: Nokta, k: { x: number; y: number; w: number; h: number }) {
  // Eksen hizalı parçayı örnekleyerek kutunun İÇİNDEN geçip geçmediğine bak.
  // Kenara değmek sorun değil (ok kenardan çıkıyor) — pay o yüzden var.
  const PAY = 3;
  const N = 80;
  for (let i = 0; i <= N; i += 1) {
    const t = i / N;
    const px = a.x + (b.x - a.x) * t;
    const py = a.y + (b.y - a.y) * t;
    if (px > k.x + PAY && px < k.x + k.w - PAY && py > k.y + PAY && py < k.y + k.h - PAY) return true;
  }
  return false;
}

/** Hiçbir ok, ucundaki iki kutu dışında bir kutunun üstünden geçmemeli. */
function oklarKutuKesmiyor(sekiller: Sekil[], ad: string) {
  const kutular = sekiller.filter((s): s is Extract<Sekil, { tur: "akis" }> => s.tur === "akis");
  const oklar = sekiller.filter((s): s is Extract<Sekil, { tur: "baglayici" }> => s.tur === "baglayici");
  dogrula(oklar.length > 0, `${ad}: hiç ok yok — iddia bir şey yoklamıyor`);
  for (const ok of oklar) {
    const yol = baglayiciYolu(sekiller, ok);
    dogrula(yol, `${ad}: ${ok.id} için yol hesaplanamadı`);
    const kaynakId = "sekilId" in ok.kaynak ? ok.kaynak.sekilId : "";
    const hedefId = "sekilId" in ok.hedef ? ok.hedef.sekilId : "";
    for (let i = 0; i < yol!.length - 1; i += 1) {
      for (const k of kutular) {
        if (k.id === kaynakId || k.id === hedefId) continue;
        dogrula(
          !kesisiyorMu(yol![i], yol![i + 1], k),
          `${ad}: ${kaynakId}→${hedefId} oku "${k.metin}" kutusunun üstünden geçiyor`,
        );
      }
    }
  }
}

function yerlesimSenaryolari() {
  const duz = akisiYerlestir(akisMetniniCoz(DUZ));
  const kutular = duz.sekiller.filter((s): s is Extract<Sekil, { tur: "akis" }> => s.tur === "akis");

  // 1) Kutular ÇAKIŞMAMALI.
  for (let i = 0; i < kutular.length; i += 1) {
    for (let j = i + 1; j < kutular.length; j += 1) {
      const a = kutular[i];
      const b = kutular[j];
      const cakisma = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      dogrula(!cakisma, `"${a.metin}" ile "${b.metin}" üst üste binmiş`);
    }
  }

  // 2) İleri akış AŞAĞI inmeli: hedef, kaynağın altında olmalı.
  const tarif = akisMetniniCoz(DUZ);
  const yerBul = (id: string) => kutular.find((k) => k.id === id)!;
  for (const kenar of tarif.kenarlar) {
    const a = yerBul(kenar.kaynakId);
    const b = yerBul(kenar.hedefId);
    dogrula(b.y > a.y, `"${a.metin}" → "${b.metin}" aşağı inmiyor (${a.y} → ${b.y})`);
  }

  // 3) Bildirilen alan bütün kutuları KAPSAMALI — çağıran buna göre tuval seçiyor.
  const enSag = Math.max(...kutular.map((k) => k.x + k.w));
  const enAlt = Math.max(...kutular.map((k) => k.y + k.h));
  dogrula(duz.genislik >= enSag && duz.yukseklik >= enAlt,
    `bildirilen alan (${duz.genislik}×${duz.yukseklik}) içeriği kapsamıyor (${enSag}×${enAlt})`);

  // 4) OKLAR KUTU KESMEMELİ — düz şemada da, döngülüde de.
  oklarKutuKesmiyor(duz.sekiller, "düz şema");
  oklarKutuKesmiyor(akisiYerlestir(akisMetniniCoz(DONGULU)).sekiller, "döngülü şema");

  // 5) KATMAN ATLAYAN İLERİ OK. Gerçek uygulamada çıktı: iki dal farklı
  //    uzunlukta olunca kısa daldaki ok bir katmanı ATLIYOR ve arada kalan
  //    kutunun üstünden geçiyor ("Kazandın → Bitir" oku "Kaybettin"i kesti).
  //    Yalnız geri kenarları dolaştırmak yetmiyor.
  const atlayan = `
(Başla) -> <Kazandı mı?> -evet-> |Kazandın| -> (Bitir)
<Kazandı mı?> -hayır-> [Can azalt] -> |Kaybettin| -> (Bitir)
`;
  oklarKutuKesmiyor(akisiYerlestir(akisMetniniCoz(atlayan)).sekiller, "katman atlayan ok");

  console.log("✓ Akış yerleşimi: çakışma yok, akış aşağı iniyor, oklar kutu kesmiyor (döngü dâhil)");
}

/**
 * DOLAŞAN OKLAR AYNI ŞERİDİ PAYLAŞMAMALI.
 *
 * Öğretmen bildirdi: "aynı çizgide iki tane hayır var." İki geri ok aynı x'i
 * seçince hem çizgiler hem "Evet/Hayır" etiketleri üst üste biniyor ve şema
 * yanlış okunuyor (tek ok sanılıyor).
 */
function seritSenaryosu() {
  const metin = `
(Başla) -> [Harf iste] -> <Doğru mu?> -hayır-> [Can azalt] -> <Can bitti mi?> -hayır-> [Harf iste]
<Doğru mu?> -evet-> <Kelime bitti mi?> -hayır-> [Harf iste]
<Can bitti mi?> -evet-> (Bitir)
<Kelime bitti mi?> -evet-> (Bitir)
`;
  const yerlesim = akisiYerlestir(akisMetniniCoz(metin));
  const oklar = yerlesim.sekiller.filter((s): s is Extract<Sekil, { tur: "baglayici" }> => s.tur === "baglayici");

  /** Dolaşan okun dikey şeridi: yolun EN UZUN dikey parçasının x'i. */
  const serit = (ok: Extract<Sekil, { tur: "baglayici" }>) => {
    const yol = baglayiciYolu(yerlesim.sekiller, ok);
    if (!yol) return null;
    let enUzun = 0;
    let x: number | null = null;
    for (let i = 0; i < yol.length - 1; i += 1) {
      if (Math.abs(yol[i].x - yol[i + 1].x) > 0.01) continue;
      const boy = Math.abs(yol[i].y - yol[i + 1].y);
      if (boy > enUzun) { enUzun = boy; x = yol[i].x; }
    }
    return x;
  };

  // DOLAŞAN OK = iki ucu da AYNI YATAY yönden çıkan ok (geri = sağ/sağ,
  //   atlayan = sol/sol). `baglayiciYolu`daki şerit seçimi tam olarak bu dala
  //   girer. Seçici eskiden "yönü verilmiş her ok" diyordu; komşu katman okları
  //   da alt→üst yönü alınca bu tanım onları da içine aldı ve iddia, dikey
  //   inişleri "aynı şeridi paylaşıyor" diye kırdı. İddia korundu, SEÇİCİ
  //   düzeltildi — dikey inişlerin aynı x'te olması zaten doğru davranış.
  const dolasan = oklar.filter(
    (o) =>
      "sekilId" in o.kaynak &&
      "sekilId" in o.hedef &&
      (o.kaynak.yon === "sag" || o.kaynak.yon === "sol") &&
      o.kaynak.yon === o.hedef.yon,
  );
  dogrula(dolasan.length >= 2, `iddia bir şey yoklamıyor: ${dolasan.length} dolaşan ok var`);
  const seritler = dolasan.map(serit);
  const benzersiz = new Set(seritler.map((x) => Math.round(x ?? Number.NaN)));
  dogrula(
    benzersiz.size === seritler.length,
    `dolaşan oklar aynı şeridi paylaşıyor (${seritler.map((x) => Math.round(x ?? -1)).join(", ")}) — çizgiler ve etiketler üst üste biner`,
  );

  // Etiketler de ayrışmalı: aynı noktaya iki "hayır" basılmamalı.
  const etiketNoktalari = dolasan
    .filter((o) => o.etiket)
    .map((o) => {
      const yol = baglayiciYolu(yerlesim.sekiller, o)!;
      const orta = yolOrtaNoktasi(yol);
      return `${Math.round(orta.x)},${Math.round(orta.y)}`;
    });
  dogrula(
    new Set(etiketNoktalari).size === etiketNoktalari.length,
    `iki etiket aynı noktaya basılıyor: ${etiketNoktalari.join(" | ")}`,
  );

  // Sol şerit tuvalin dışına taşmamalı (negatif x kırpılır).
  for (const ok of dolasan) {
    const yol = baglayiciYolu(yerlesim.sekiller, ok)!;
    dogrula(yol.every((n) => n.x >= 0), `ok tuvalin soluna taşıyor: ${ok.id}`);
  }

  console.log("✓ Akış yerleşimi: dolaşan okların şeritleri ayrı, etiketler üst üste binmiyor");
}

/** Asıl kazanç ölçekte: 45 kutuluk şema elle kurulmuyor diye bu iş başladı. */
function buyukSemaSenaryosu() {
  const satirlar: string[] = ["(Başla) -> [Adım 1]"];
  for (let i = 1; i <= 40; i += 1) {
    satirlar.push(i % 7 === 0
      ? `[Adım ${i}] -> <Kontrol ${i}?> -hayır-> [Adım ${Math.max(1, i - 3)}]`
      : `[Adım ${i}] -> [Adım ${i + 1}]`);
    if (i % 7 === 0) satirlar.push(`<Kontrol ${i}?> -evet-> [Adım ${i + 1}]`);
  }
  satirlar.push("[Adım 41] -> (Bitir)");

  const tarif = akisMetniniCoz(satirlar.join("\n"));
  dogrula(tarif.uyarilar.length === 0, `büyük şemada uyarı çıktı: ${tarif.uyarilar[0]}`);
  dogrula(tarif.dugumler.length >= 45, `beklenen ölçek yok, ${tarif.dugumler.length} kutu`);
  dogrula(geriKenarlariBul(tarif).size >= 5, "büyük şemada döngüler tespit edilmedi");

  const yerlesim = akisiYerlestir(tarif);
  dogrula(yerlesim.sekiller.length === tarif.dugumler.length + tarif.kenarlar.length,
    "yerleşim her düğüm ve kenar için şekil üretmemiş");
  oklarKutuKesmiyor(yerlesim.sekiller, "45 kutuluk şema");

  console.log(`✓ Akış yerleşimi: ${tarif.dugumler.length} kutu + ${tarif.kenarlar.length} ok, oklar temiz`);
}

/**
 * GERÇEK BİÇİMLİ ŞEMA — dallanan, birleşen, katman atlayan.
 *
 * NEDEN ayrı bir örnek: `buyukSemaSenaryosu`'ndaki 45 kutuluk şema ÜRETİLMİŞ
 * ve neredeyse doğrusal (her adım bir sonrakine, arada birkaç geri kenar).
 * Öğretmenin gerçek örneğinde ise iki dal AYRILIP tekrar BİRLEŞİYOR ve kolları
 * farklı uzunlukta. O yapıda komşu katmandaki iki kutu yatayda uzak düşüyor,
 * `oto` yön seçimi YAN kenarları seçiyor ve ok katman satırının içinden
 * geçiyordu. Üretilmiş şema bunu HİÇ yakalamıyordu — süit yeşilken gerçek
 * örnekte dört kutu kesiliyordu (§19.3c'nin ailesi: iddia değil, test VERİSİ
 * dardı).
 */
const GERCEK_BICIMLI = `
(Başla) -> {Lives=6} -> {LoopCheck=0} -> {LetterGuess=[]} -> {LetterSpace=[]} -> /Kelime listesini oku/ -> [RandomWord seç] -> [RandomWord uzunluğunu bul]
[RandomWord uzunluğunu bul] -> [Her karakter için LetterSpace'e _ ekle] -> [LetterSpace yazdır] -> <LetterGuess = RandomWord mü?>
<LetterGuess = RandomWord mü?> -hayır-> <Lives > 0 mı?>
<Lives > 0 mı?> -hayır-> /Kaybettin yazdır/ -> [RandomWord'ü göster] -> (Bitir)
<Lives > 0 mı?> -evet-> /Kullanıcıdan harf iste/ -> <Girdi uzunluğu 1 mi?>
<Girdi uzunluğu 1 mi?> -hayır-> |Tek harf gir uyarısı| -> /Kullanıcıdan harf iste/
<Girdi uzunluğu 1 mi?> -evet-> <Girdi alfabede mi?>
<Girdi alfabede mi?> -hayır-> |Geçersiz karakter uyarısı| -> /Kullanıcıdan harf iste/
<Girdi alfabede mi?> -evet-> <Girdi daha önce denendi mi?>
<Girdi daha önce denendi mi?> -evet-> |Zaten denedin uyarısı| -> /Kullanıcıdan harf iste/
<Girdi daha önce denendi mi?> -hayır-> [Denenenler listesine ekle] -> <Girdi RandomWord içinde mi?>
<Girdi RandomWord içinde mi?> -evet-> {LoopCondition=0} -> <LoopCondition < uzunluk mu?>
<LoopCondition < uzunluk mu?> -evet-> <RandomWord[LoopCondition] = girdi mi?>
<RandomWord[LoopCondition] = girdi mi?> -evet-> [LetterSpace[LoopCondition] = girdi] -> [LoopCondition artır] -> <LoopCondition < uzunluk mu?>
<RandomWord[LoopCondition] = girdi mi?> -hayır-> [LoopCondition artır]
<LoopCondition < uzunluk mu?> -hayır-> [LetterSpace yazdır]
<Girdi RandomWord içinde mi?> -hayır-> [Lives azalt] -> /Kalan can yazdır/ -> [Asılan adamı çiz] -> [LetterSpace yazdır]
<LetterGuess = RandomWord mü?> -evet-> [Puanı hesapla] -> /Tebrikler yazdır/ -> [Skoru kaydet] -> (Bitir)
`;

/** Dallanıp birleşen orta ölçekli şema — ara düğüm koridorunun ölçüldüğü yer. */
const DALLI_BIRLESEN = `
(Başla) -> {Canlar=6} -> /Kelime listesi/ -> [Rastgele kelime seç] -> {LetterGuess boş liste} -> <Kelime tamamlandı mı?>
<Kelime tamamlandı mı?> -hayır-> [Harf iste] -> <Harf tek karakter mi?>
<Harf tek karakter mi?> -hayır-> |Uyarı: tek harf gir| -> [Harf iste]
<Harf tek karakter mi?> -evet-> <Harf kelimede var mı?>
<Harf kelimede var mı?> -evet-> [Harfi yerine yaz] -> <Kelime tamamlandı mı?>
<Harf kelimede var mı?> -hayır-> [Can azalt] -> <Can bitti mi?>
<Can bitti mi?> -evet-> /Kaybettin/ -> (Bitir)
<Can bitti mi?> -hayır-> <Kelime tamamlandı mı?>
<Kelime tamamlandı mı?> -evet-> /Kazandın, puan yaz/ -> (Bitir)
`;

function gercekBicimliSenaryo() {
  const tarif = akisMetniniCoz(GERCEK_BICIMLI);
  const yerlesim = akisiYerlestir(tarif);
  dogrula(tarif.uyarilar.length === 0, `gerçek biçimli şemada uyarı: ${tarif.uyarilar[0]}`);

  // 1) ASIL İDDİA: hiçbir ok kutu kesmiyor. Düzeltmeden önce burada DÖRT
  //    kesme vardı ("Lives > 0 mı?" → "Kullanıcıdan harf iste" gibi komşu
  //    katman okları "Puanı hesapla"nın içinden geçiyordu).
  oklarKutuKesmiyor(yerlesim.sekiller, "gerçek biçimli şema");

  const oklar = yerlesim.sekiller.filter(
    (s): s is Extract<Sekil, { tur: "baglayici" }> => s.tur === "baglayici",
  );
  const kutuAl = (id: string) =>
    yerlesim.sekiller.find(
      (s): s is Extract<Sekil, { tur: "akis" }> => s.tur === "akis" && s.id === id,
    )!;

  // 2) KOMŞU KATMAN OKU ALTTAN ÇIKIP ÜSTTEN GİRMELİ.
  //    `oto` bırakılırsa yan kenar seçilebiliyor ve yol katman satırına
  //    giriyor. İddia yönü DOĞRUDAN yokluyor: yalnız "kesmiyor" demek yetmez,
  //    çünkü kesmemek tesadüfen de sağlanabilir.
  let komsuSayisi = 0;
  for (const ok of oklar) {
    if (!("sekilId" in ok.kaynak) || !("sekilId" in ok.hedef)) continue;
    const a = kutuAl(ok.kaynak.sekilId);
    const b = kutuAl(ok.hedef.sekilId);
    // Komşu katman = hedef aşağıda ve arada başka satır yok.
    const arada = yerlesim.sekiller.some(
      (s) => s.tur === "akis" && s.y > a.y + a.h && s.y + s.h < b.y,
    );
    if (!(b.y > a.y + a.h) || arada) continue;
    komsuSayisi += 1;
    dogrula(
      ok.kaynak.yon === "alt" && ok.hedef.yon === "ust",
      `komşu katman oku yan kenardan çıkıyor: ${a.metin} → ${b.metin} (${ok.kaynak.yon}/${ok.hedef.yon})`,
    );
  }
  dogrula(komsuSayisi >= 5, `komşu katman oku bulunamadı (${komsuSayisi}) — iddia boşa çalışıyor`);

  // 3) ARA DÜĞÜMLER ÇİZİLMEZ. Yerleşimde var, belgede yok: şekil sayısı hâlâ
  //    tam olarak düğüm + kenar. Sızarlarsa öğretmen tuvalde tıklanabilen ama
  //    görünmeyen boş kutular bulur.
  dogrula(
    yerlesim.sekiller.length === tarif.dugumler.length + tarif.kenarlar.length,
    "ara düğümler şekil listesine sızmış",
  );
  dogrula(
    !yerlesim.sekiller.some((s) => s.id.startsWith("akis-ara-")),
    "ara düğüm kimliği belgeye çıkmış",
  );

  const enSagKutu = Math.max(
    ...yerlesim.sekiller
      .filter((s): s is Extract<Sekil, { tur: "akis" }> => s.tur === "akis")
      .map((s) => s.x + s.w),
  );
  dogrula(
    yerlesim.genislik > enSagKutu,
    "tuval genişliği en sağdaki kutuya yapışmış — dolaşan oklara yer kalmıyor",
  );

  console.log(
    `✓ Gerçek biçimli şema: ${tarif.dugumler.length} kutu, ${komsuSayisi} komşu ok alt→üst, oklar temiz`,
  );
}

/**
 * ARA DÜĞÜM GERÇEKTEN YER AYIRIYOR MU?
 *
 * İlk yazışta bunu "tuval şu kadar geniş olmalı" diye yoklamıştım ve mutasyon
 * KAÇTI: ara düğümleri tamamen kapattığımda süit yeşil kaldı. Sebep, iddianın
 * 35 kutuluk şemaya bağlanmış olmasıydı — orada toplam genişliği ZATEN en geniş
 * katman belirliyor, ara düğümler başka katmanlara düşüyor ve toplama hiç
 * dokunmuyor. Yani iddia doğru bir cümleyi yanlış örnek üzerinde ölçüyordu.
 *
 * Şimdi doğrudan KORİDORUN KENDİSİ ölçülüyor: aynı satırdaki iki komşu kutu
 * arasındaki boşluk. Ara düğüm yoksa bu boşluk her yerde tam olarak
 * YATAY_ARALIK (60) olur; ara düğüm varsa araya ARA_DUGUM_W (44) girer ve
 * boşluk 60 + 44 + 60 = 164'e çıkar. Sabit sayı yazmak yerine "en az bir satır
 * içi boşluk YATAY_ARALIK'tan belirgin şekilde büyük" deniyor.
 */
function araDugumKoridoruSenaryosu() {
  const yerlesim = akisiYerlestir(akisMetniniCoz(DALLI_BIRLESEN));
  const kutular = yerlesim.sekiller.filter(
    (s): s is Extract<Sekil, { tur: "akis" }> => s.tur === "akis",
  );

  // Satırlar merkez y'ye göre gruplanıyor: karar kutusu (120) ile işlem kutusu
  // (80) aynı katmanda ortalandığı için y'leri farklı, merkezleri aynı.
  const satirlar = new Map<number, Extract<Sekil, { tur: "akis" }>[]>();
  for (const k of kutular) {
    const merkez = k.y + k.h / 2;
    const anahtar = [...satirlar.keys()].find((a) => Math.abs(a - merkez) < 1) ?? merkez;
    if (!satirlar.has(anahtar)) satirlar.set(anahtar, []);
    satirlar.get(anahtar)!.push(k);
  }

  let enBuyukBosluk = 0;
  for (const liste of satirlar.values()) {
    const sirali = [...liste].sort((a, b) => a.x - b.x);
    for (let i = 1; i < sirali.length; i += 1) {
      enBuyukBosluk = Math.max(enBuyukBosluk, sirali[i].x - (sirali[i - 1].x + sirali[i - 1].w));
    }
  }

  dogrula(
    [...satirlar.values()].some((l) => l.length > 1),
    "örnekte aynı satırda iki kutu yok — koridor iddiası bir şey yoklamıyor",
  );
  dogrula(
    enBuyukBosluk > 100,
    `ara düğüm koridor açmamış: satır içi en büyük boşluk ${Math.round(enBuyukBosluk)} px (yalnız kutu aralığı kadar)`,
  );

  console.log(`✓ Ara düğüm koridoru: satır içi boşluk ${Math.round(enBuyukBosluk)} px`);
}

ayristirmaSenaryolari();
geriKenarSenaryolari();
seritSenaryosu();
yerlesimSenaryolari();
gercekBicimliSenaryo();
araDugumKoridoruSenaryosu();
buyukSemaSenaryosu();
console.log("TÜM AKIŞ METNİ SENARYOLARI BAŞARILI");
