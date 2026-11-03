/**
 * lib/turkceMetin.ts — Türkçe metin kıyaslamasının tek kapısı.
 *
 * Neden `src/lib/`: aynı katlamayı İKİ FARKLI modül kullanıyor
 * (`sinav-olusturucu` ve `ders-kitabi`). Eskiden yalnız
 * `sinav-olusturucu/denklemArama.ts`'te duruyordu; ders-kitabi başka bir
 * modülün kodunu çağıramadığı için (CLAUDE.md) aynı hata orada üç ayrı yerde
 * tekrar etti. Ortak ihtiyaç modülün dışına çıkar.
 */

/**
 * Aramayı Türkçe kıyaslamaya hazırlar.
 *
 * `toLocaleLowerCase("tr-TR")` TEK BAŞINA yetmiyor: büyük "I" Türkçe'de
 * NOKTASIZ "ı"ya iner, yani "FIZIK" → "fızık" olur ve "Fizik" ile eşleşmez.
 * Öğretmen büyük harfle (ya da Caps Lock açıkken) yazdığında aradığını
 * bulamıyordu. Bu yüzden iki taraf da ayrıca ı→i katlanıyor; aramada ı/i
 * ayrımını korumanın faydası yok, kaybı var.
 *
 * EŞİTLİK kıyaslamasında KULLANMA. İki depolanmış değeri karşılaştıran
 * yerlerde (konu süzgeci gibi, seçenekler zaten mevcut kayıtlardan kuruluyor)
 * katlama gerçekten farklı iki adı tek grupta toplar; oralarda düz
 * `toLocaleLowerCase("tr-TR")` doğru olan.
 *
 * RegExp'in `i` bayrağı bu işi YAPMAZ: JS, büyük hâli ASCII'ye düşen
 * ASCII-dışı karakterleri eşleştirmez, `/ı/i.test("I")` FALSE döner. Soru
 * Havuzu'ndaki `/sınıf/i.test("9. SINIF")` bu yüzden false dönüyor ve etiket
 * "9. SINIF. sınıf" çıkıyordu. Türkçe metinde `i` bayrağına güvenme, buradan
 * geçir.
 */
export function aramaIcinKucult(metin: string): string {
  return metin.toLocaleLowerCase("tr-TR").replace(/ı/g, "i");
}
