# Sınavhane — geliştirici notları

Öğretmen Asistanı'ndaki **Sınav Hazırla** modülünün tek başına çalışan masaüstü sürümü (Tauri 2 + React).
Diğer modüller (sınıf, e-Okul, telefon köprüsü, ders kitabı…) **yoktur**.

İçindekiler: A4 yazılı kâğıdı, çizim editörü (fizik şekilleri, vektörler, kareli alan, fizik grafikleri, bağlantılar), denklem
editörü ("Yazarak ekle" dâhil), OCR, Sınavlarım kütüphanesi, parolalı sınav dosyası, yazdır / PDF.

## Grafik ekleme (x–t, v–t, a–t, sinüs)
Çizim editörü > **Fizik** > **Grafik** sekmesi: şablona tıklayın, grafik gelir; altta açılan panelden süre/ivme, noktalar ya da genlik/periyot değiştirilir. **Hızlı çiz** kutusuna noktaları yazın (`0,5; 5,15; 9,15; 11,9`), grafik hazır; "Bunu v–t say" düğmesi x–t ve a–t grafiğini de üretir. "Üçlü grafik" aynı hareketin konum, hız ve ivme grafiğini alt alta ekler.
Ayrıntı: `src/modules/sinav-olusturucu/cizim/grafik.ts`.

## Matematik ve istatistik grafikleri

Fizik kipi > **Matematik / İstatistik** sekmesi:
- **Hızlı çiz** kutusu: `y = x^2 - 4 ; y > x + 1 ; x = 3` yazın, Enter. Eşitsizlik bölge olarak boyanır.
- **Fonksiyon şablonları:** doğru, parabol, mutlak değer, üstel/log, tan x, parçalı, eşitsizlik, koordinat düzlemi, serpme + regresyon doğrusu.
- **Çember/elips/hiperbol, alan, kesişim, teğet:** `x^2+y^2=25`, `alan(x, x^2, 0, 1)`, `teget(x^2, 1)`, `kesisim` yazın ya da şablonlardan seçin.
- **İstatistik:** sütun, gruplu sütun, çubuk, daire, çizgi, histogram, kutu, gövde–yaprak. Tabloyu Excel'den yapıştırabilirsiniz.
- **Şemalar:** Venn (2–3 küme, bölge boyama), olasılık ağacı, sayı doğrusu.

Şekli seçince alttaki panelden sayılar/ifadeler değiştirilir; hepsi Geri al / İleri al ile çalışır.

## Kurulum (bir kez)
1. Node.js 20+ ve Rust (https://rustup.rs). Windows'ta ayrıca "Visual Studio Build Tools (C++)" ve WebView2.
2. Bu klasörde: `npm install`

## Çalıştırma
- Geliştirme penceresi: `npm run tauri:dev`
- Kurulum dosyası (Windows .exe / macOS .dmg): `npm run tauri:build`
  Çıktı: `src-tauri/target/release/bundle/` altında.
- Yalnız tarayıcıda hızlı önizleme (kalıcı depo yok, localStorage kullanır): `npm run dev`

## Testler
`npm test` (çizim, fizik, denklem, A4 sayfalama, sınav kütüphanesi, dayanıklılık…)

## Notlar
- Veri dosyası ve işletim sistemi anahtarı bu uygulamaya özeldir (`fizik-sinav.sqlite3`, kimlik `com.fiziksinav.app`);
  Öğretmen Asistanı'nın verisiyle karışmaz ve otomatik aktarılmaz. Taşımak için Sınavlarım'dan sınavı dışa aktarın.
- Simgeler (`src-tauri/icons`) Öğretmen Asistanı'ndan kalmadır; kendi simgeniz için: `npx tauri icon yeni-simge.png`
- Ders kitabı / soru havuzu olmadığı için "Sınav için ayrılanlar" bölümü boş kalır.
- Rust tarafı yalnız şu komutları içerir: `db_*`, `veri_dosyasi_*`, `dosya_yaz`, `sinav_parola*`, `yazdir`.

## DMG (macOS) üretmek
- Kolay yol: `Dmg-Uret.command` dosyasına çift tıklayın (ilk seferde sağ tık → Aç). Eksik araç varsa söyler.
- GitHub: bir sürüm etiketi (`git tag v1.0.0 && git push --tags`) yüklenince `.github/workflows/surum.yml` Mac ve Windows kurulum dosyalarını otomatik üretir.

## Kimya
Fizik kipi > **Kimya** sekmesi: laboratuvar malzemeleri (sıvı seviyesi ayarlı), Bohr atomu/iyon, Lewis molekül yapıları, periyodik tablo (element boyama, ? işareti) ve ısınma/çözünürlük/enerji profili/titrasyon grafikleri. Organik yapı çizimi sonraki adım.
