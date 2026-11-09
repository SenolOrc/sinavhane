# Sınavhane

Öğretmenler için **ücretsiz ve açık kaynaklı** sınav hazırlama uygulaması. A4 yazılı kâğıdı hazırlayın; fizik, matematik, istatistik ve kimya sorularının şekillerini birkaç tıkla çizin. Çıktılar siyah-beyaz baskıya uygundur. Arayüz Türkçedir, internet gerekmez, verileriniz yalnız kendi bilgisayarınızda kalır.

![Çizim penceresi: solda aramalı şekil kütüphanesi, seçili şeklin üstünde yüzen araç çubuğu](docs/ekran/cizim-penceresi.png)

## Neler çizebilirsiniz?

| Alan | Örnekler |
|---|---|
| **Hazır soru sahneleri** | Tek tıkla gelen, parça parça düzenlenebilen düzenekler: eğik düzlemde kuvvet bileşenleri (mg·sinα, mg·cosα, N, sürtünme; kütle değişince oklar kendiliğinden uzar), eğik düzlem + makara + iki kütle, Atwood, palanga, seri/paralel tam devre (ε, r, anahtar, ampermetre, voltmetre), çukur/tümsek ayna ve ince/kalın kenarlı mercek ışın düzenekleri (görüntü 1/f = 1/dₒ + 1/dᵢ ile hesaplanır), bölmeli sıvı kabı, kaldırma kuvveti, U borusu |
| **Geometri** | Adlı üçgenler (dik, ikizkenar, eşkenar), açıortay, kenarortay ve ağırlık merkezi, dış açı, iç teğet ve çevrel çember; çemberde merkez/çevre/teğet-kiriş/iç/dış açı, iki teğet, daire dilimi; Thales ve benzer üçgenler; paralel iki doğru ve kesen (yöndeş, Z, U, M, kalem ucu, zikzak); paralelkenar, eşkenar dörtgen, yamuk, deltoid, kare/dikdörtgen + köşegen; küp, prizma, silindir, koni, piramit, küre; kağıt katlama (Şekil I → Şekil II); **serbest katlama**: kendi çizdiğiniz üçgeni/dörtgeni/çokgeni seçip «Katla» ile üzerinde çizgi çekerek katlama, [DE] boyunca katlama, katlama uçlarını (D, E) ve katlanan köşeyi (A′) fareyle sürükleme, eş açı/eş kenar işaretleri |
| **Matematik** | `y=f(x)` grafikleri (parçalı, mutlak değer, üstel/log, trigonometri), eşitsizlik bölgeleri, çember/elips/hiperbol, iki eğri arası ve eğri altı alan, kesişim ve kökler, teğet, koordinat düzlemi, serpme + regresyon doğrusu; birim çember (sin, cos, tan, cot), işaret tablosu (ifadeden otomatik), fonksiyon ok diyagramı |
| **İstatistik ve şemalar** | Sütun, gruplu sütun, çubuk, daire, çizgi, histogram, kutu grafiği, gövde–yaprak; Venn (2–3 küme, alt küme, ayrık kümeler, bölge boyama), 3 aşamaya kadar olasılık ağacı, sayı doğrusu; tabloyu Excel'den yapıştırma |
| **Fizik** | Kütle, makara, yay, araba, eğik düzlem, devre elemanları, manyetizma (düz tel, halka, solenoid, ⊗ ⊙ alan), mercek, ayna, prizma, girişim deseni, enerji düzeyleri, vektörler ve kareli alan; konum–zaman, hız–zaman, ivme–zaman grafikleri ve üçlü grafik; **ayarlanabilir fizik şekilleri:** akışkanlar (Torricelli, Bernoulli, hidrolik pres, manometre), dalgalar (atma, dalga, rezonans, Doppler, kırınım), elektrik–manyetizma (alan, Coulomb, levhalar, parçacık, iletken çubuk, transformatör), çembersel hareket, yörünge/Kepler, basit harmonik hareket, dönme, hareket kavramları (yol–yer değiştirme, bağıl hareket, serbest düşme, stroboskop, v–t/x–t), fotoelektrik olay, radyoaktif bozunma ve basit makineler (kaldıraç, makara, eğik düzlem); değerler yan panelden değişir, köklü (√) giriş desteklenir |
| **Kimya** | Laboratuvar malzemeleri, Bohr atomu ve iyonlar, Lewis yapıları, organik iskelet (zincir, sikloalkan, yan gruplar; IUPAC adı kendiliğinden yazılır), fonksiyonel gruplar, orbital diyagramları, Daniell pili, periyodik tablo, ısınma/çözünürlük/enerji profili/titrasyon grafikleri |
| **Akış şeması** | Başla/Bitir, işlem, karar, girdi/çıktı kutuları; yazarak dizme (`(Başla) -> [İşlem] -> <Karar?>`) |

Ayrıca: denklem editörü, OCR, sınav kütüphanesi (Sınavlarım), parolalı sınav dosyası, yazdır / PDF.

## Çizim penceresi nasıl kullanılır?

- **Soldaki kütüphane:** bütün şekil ve şablonlar kategorilere ayrılmış, önizlemeli kartlarla durur. Arama kutusuna *makara*, *dik üçgen*, *beher*, *venn* yazmanız yeter; Türkçe karakter yazmasanız da bulur. Bir karta tıklayınca şekil tuvalde boş bir yere gelir, kütüphane açık kalır; ardı ardına pil, direnç, ampermetre ekleyebilirsiniz.
- **Yazarak çizim:** aynı arama kutusuna `y = x^2 - 2x - 3; kesisim` gibi bir ifade ya da `0,5; 5,15; 9,15` gibi noktalar yazınca en üstte "Çiz:" kartı çıkar. `x^2+y^2=25`, `alan(x, x^2, 0, 1)`, `teget(x^2, 1)` gibi ifadeler de çalışır; örnek çipleri ve hata açıklamaları "Matematik & Grafik" kategorisinin altındaki **Yazarak çiz ve diğer matematik araçları** bölümündedir.
- **Üst araç çubuğu:** Seç/Taşı, Çizgi, Ok/Bağlayıcı, Dikdörtgen, Daire/Elips, Üçgen, Çokgen, Dalga, Serbest çizgi, Metin, Silgi, Geri al/İleri al her zaman tek tık uzaklıkta.
- **Yüzen araç çubuğu:** şekli seçince hemen üstünde etiket, renk, dolgu/tarama, kalınlık, yatay çevir, 90° döndür, çoğalt ve sil düğmeleri çıkar. Grafik, şema, kimya ve geometri ayrıntıları için sağdaki **Ayrıntılar** paneli açılır.
- **Doğrudan düzenleme:** üçgen, dörtgen ve çember noktalarını fareyle sürükleyin; kenara ya da köşeye **çift tıklayıp** etiket, açı, dik açı ve eş kenar işareti yazın. Fizik nesnesinin üstüne gelince çıkan **mavi noktalardan** sürükleyerek tel, ip ya da ok bağlayın.

<table>
<tr>
<td><img src="docs/ekran/sekil-kutuphanesi.png" alt="Kütüphanede arama: makara" width="420"></td>
<td><img src="docs/ekran/hazir-sahneler.png" alt="Hazır soru sahneleri: sürtünmeli eğik düzlem ve tam devre" width="420"></td>
</tr>
<tr>
<td><img src="docs/ekran/geometri.png" alt="Geometri: ağırlık merkezi, iki teğet, küp, Z kuralı" width="420"></td>
<td><img src="docs/ekran/yerinde-duzenleme.png" alt="Kenara çift tıklayınca açılan düzenleme balonu" width="420"></td>
</tr>
<tr>
<td><img src="docs/ekran/fonksiyon-sablonlari.png" alt="Fonksiyon grafikleri: parabol ve kökleri, mutlak değer, eşitsizlik, parçalı" width="420"></td>
<td><img src="docs/ekran/matematik-cember-alan-teget.png" alt="Çember, iki eğri arası alan, teğet, eğri altı alan" width="420"></td>
</tr>
<tr>
<td><img src="docs/ekran/istatistik-sema-sablonlari.png" alt="Sütun grafiği, Venn, olasılık ağacı, işaret tablosu" width="420"></td>
<td><img src="docs/ekran/kimya-sekilleri.png" alt="Beher, erlenmayer, Bohr atomu, H₂O, 2-metilbütan, benzen" width="420"></td>
</tr>
<tr>
<td><img src="docs/ekran/optik-duzenegi.png" alt="Çukur ayna ışın düzeneği ve ayrıntılar paneli" width="420"></td>
<td></td>
</tr>
</table>

## İndirme ve kurulum

[**Releases**](../../releases) sayfasından işletim sisteminize uygun dosyayı indirin:

- **Windows:** `.exe` ya da `.msi`
- **macOS:** `.dmg`

> Uygulama imzasız olduğu için ilk açılışta uyarı çıkabilir. macOS'ta uygulamaya **sağ tık → Aç**; Windows'ta "Ek bilgi → Yine de çalıştır" deyin.

## Tablet ve web sürümü

Sınavhane tarayıcıda da çalışır; iPad ve Android tablette **Safari/Chrome ile açın, "Ana Ekrana Ekle" deyin**, uygulama gibi
tam ekran açılır ve internetsiz de çalışır. Adres: `https://KULLANICI.github.io/sinavhane/` (GitHub Pages ile otomatik yayınlanır:
repoda Settings → Pages → Source: **GitHub Actions** seçin). Yazdırmak için Paylaş → Yazdır / PDF.
Veri tarayıcı deposunda durur; düzenli olarak "Kaydet / Yükle" ile yedek alın.

iPad için gerçek uygulama (TestFlight) adımları: [docs/IOS.md](docs/IOS.md).

## Kendiniz derlemek isterseniz

Node.js 20+ ve [Rust](https://rustup.rs) gerekir (Windows'ta ayrıca Visual Studio Build Tools ve WebView2).

```bash
npm install
npm run tauri:dev     # geliştirme penceresi
npm run tauri:build   # kurulum dosyası
npm test              # testler
```

Ayrıntılar için [geliştirici notları](docs/GELISTIRICI.md).

## Katkı

Hata bildirimleri, fikirler ve çekme istekleri (pull request) çok değerlidir. Yeni şekil, şablon ya da dil düzeltmesi önermekten çekinmeyin.

## Lisans

[MIT](LICENSE): ücretsiz kullanabilir, değiştirebilir ve paylaşabilirsiniz.

Üçüncü taraf bileşenler kendi lisanslarıyla gelir (ör. OCR için Tesseract, Apache-2.0).
