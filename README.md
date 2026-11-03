# Sınavhane

Öğretmenler için **ücretsiz ve açık kaynaklı** sınav hazırlama uygulaması. A4 yazılı kâğıdı hazırlayın; fizik, matematik, istatistik ve kimya sorularının şekillerini birkaç tıkla çizin. Çıktılar siyah-beyaz baskıya uygundur. Arayüz Türkçedir, internet gerekmez, verileriniz yalnız kendi bilgisayarınızda kalır.

![Çizim penceresi](docs/ekran/cizim-penceresi.png)

![Matematik grafikleri](docs/ekran/matematik-cember-alan-teget.png)

## Neler çizebilirsiniz?

| Alan | Örnekler |
|---|---|
| **Fizik** | Vektörler, eğik düzlem, makara, devre, optik, yay, kuvvet şemaları; konum–zaman, hız–zaman, ivme–zaman grafikleri |
| **Matematik** | `y=f(x)` grafikleri (parçalı, mutlak değer, üstel, trigonometri), eşitsizlik bölgeleri, çember/elips/hiperbol, iki eğri arası alan, kesişim ve kökler, teğet, koordinat düzlemi |
| **İstatistik** | Sütun, çubuk, daire, çizgi, histogram, kutu grafiği, gövde–yaprak; tabloyu Excel'den yapıştırma |
| **Şemalar** | Venn (2–3 küme, bölge boyama), olasılık ağacı, sayı doğrusu |
| **Kimya** | Laboratuvar malzemeleri, atom ve iyon (Bohr), Lewis yapıları, periyodik tablo, ısınma/çözünürlük/titrasyon grafikleri |

Ayrıca: denklem editörü, OCR, sınav kütüphanesi (Sınavlarım), parolalı sınav dosyası, yazdır / PDF.

**Hızlı yazarak çizim:** Matematik sekmesindeki kutuya `y = x^2 - 4; x^2+y^2=25; alan(x, x^2, 0, 1); teget(x^2, 1); kesisim` gibi ifadeler yazıp Enter'a basın.

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
