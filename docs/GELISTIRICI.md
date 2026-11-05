# Sınavhane — geliştirici notları

Tauri 2 + React + TypeScript masaüstü uygulaması (aynı kod tarayıcıda / iPad'de PWA olarak da çalışır).
Uygulamanın tamamı tek modüldür: `src/modules/sinav-olusturucu` (A4 yazılı kâğıdı, çizim editörü, denklem
editörü, OCR, Sınavlarım kütüphanesi, parolalı sınav dosyası, yazdır / PDF).

## Kurulum (bir kez)
1. Node.js 20+ ve Rust (https://rustup.rs). Windows'ta ayrıca "Visual Studio Build Tools (C++)" ve WebView2.
2. Bu klasörde: `npm install`

## Çalıştırma
- Geliştirme penceresi: `npm run tauri:dev`
- Kurulum dosyası (Windows .exe / macOS .dmg): `npm run tauri:build`
  Çıktı: `src-tauri/target/release/bundle/` altında.
- Yalnız tarayıcıda hızlı önizleme (kalıcı depo yok, localStorage kullanır): `npm run dev`

## Testler
`npm test`: çizim modeli ve arayüz akışı, fizik/matematik/kimya senaryoları, denklem, A4 sayfalama, sınav
kütüphanesi, dayanıklılık, v1.2 geometri (`test:v12-g`), matematik (`test:v12-m`), fizik sahneleri
(`test:v12-f`) ve yeni çizim arayüzü (`test:v12-u:ui`). Testler esbuild ile paketlenip Node'da çalışır;
arayüz testleri JSDOM kullanır, PNG kırpma testleri `@napi-rs/canvas` varsa gerçek tuvalde çizer.

## Çizim editörü mimarisi (v1.2)

Çizim kodu `src/modules/sinav-olusturucu/cizim/` altında, React'ten bağımsız ve saf. Arayüz
`components/` altında yalnız durumu tutar ve bu fonksiyonları çağırır.

- **Arayüz kabuğu** `components/CizimEditoruModal.tsx`: üst araç çubuğu, tuval, sağdaki "Ayrıntılar" paneli.
  - `components/cizim/SolKutuphane.tsx`: aramalı, katlanır kategorili sol kütüphane. Kart önizlemeleri
    gerçek çizim rutinleriyle (`fizikSimgeCiz`, `sekilleriCiz`) çizilir ve mürekkep sınırına sığdırılır.
  - `components/cizim/YuzenAracCubugu.tsx`: seçili şeklin üstündeki hızlı araç çubuğu.
  - `components/cizim/YerindeDuzenleBalonu.tsx`: çift tıklama balonu (köşe/kenar etiketi, akış metni,
    fizik ve bağlayıcı etiketi). Konumu `etkilesim.ts::balonYerlesimi`'nden gelir; balon şekle değmez.
- **Kütüphane** `cizim/kutuphane.ts`: bütün kaynakları (hazır sahneler, fizik tanımları, geometri,
  grafik/istatistik/şema/kimya şablonları, akış kutuları, kullanıcı şablonları) tek `KutuphaneGirdisi`
  listesinde toplar; Türkçe duyarsız arama (`kutuphaneAra`) ve "Çiz:" önerisi (`aramaOnerileri`).
  Yeni bir şablon listesi eklenince buraya bağlanması yeter.
- **Doğrudan etkileşim** `cizim/etkilesim.ts` (bağlantı portları, grafik noktası sürükleme, yatay çevir /
  90° döndür, balon yeri) ve `cizim/geometriEtkilesim.ts` (köşe tutamaçları, `geometriKoseTasiSekil`:
  köşe kutu dışına çıkınca şeklin kutusu da büyür; çift tıklanan köşe/kenar, etiket yazma).
- **Hazır sahneler** `cizim/sahneler.ts` (`HAZIR_SAHNELER`) ← `cizim/fizikSahneSablonlari.ts`. Hesaplı tek
  nesneler: `cizim/fizikSahneler.ts` (eğik düzlem kuvvetleri), `cizim/optik.ts` (ayna/mercek ışınları),
  `cizim/sivi.ts` (bölmeli kap, kaldırma, U borusu); paneli `components/FizikSahnePaneli.tsx`.
- **Geometri** `cizim/geometriSekilleri.ts` (üçgen, çember, benzerlik, çokgen), `cizim/geometriEk.ts`
  (doğruda açılar, özel dörtgenler, katı cisimler, kağıt katlama), ortak çizim yardımcıları
  `cizim/geometriYardimci.ts`; paneli `components/GeometriPaneli.tsx`.
- **Matematik** `cizim/grafik.ts` + `cizim/ifade.ts` (fonksiyon, bölge, kapalı denklem, alan, teğet),
  `cizim/istatistik.ts`, `cizim/sema.ts` (Venn, olasılık ağacı, sayı doğrusu) ve `cizim/semaEk.ts`
  (birim çember, işaret tablosu, fonksiyon ok diyagramı). Veri tabloları ortak `components/MiniTablo.tsx`
  ile girilir (Tab/Enter gezinme, Excel'den yapıştırma, hatalı hücre uyarısı).
- **Kimya** `cizim/kimya.ts` (laboratuvar, Bohr, Lewis, organik iskelet + IUPAC adı, orbital, pil,
  periyodik tablo); paneli `components/KimyaPaneli.tsx`.
- **Ortak çekirdek**: `tipler.ts` (şekil türleri), `ciz.ts`, `sinirlar.ts` (seçim/PNG kırpma sınırları),
  `vurus.ts`, `hizalama.ts`, `yerlesim.ts` (boş yer bulma), `sablon.ts` (veri doğrulayıcıları).

Yeni bir fizik/geometri nesnesi: `FizikNesnesi` birleşimi (`tipler.ts`) + `FIZIK_TANIMLARI` +
`govdeCiz` içinde bir `case`; TypeScript eksik olanı derlemede yakalar. Kütüphaneye kendiliğinden gelir.

## Notlar
- Veri dosyası ve işletim sistemi anahtarı bu uygulamaya özeldir (`fizik-sinav.sqlite3`, kimlik `com.fiziksinav.app`).
  Başka bilgisayara taşımak için Sınavlarım'dan sınavı dışa aktarın.
- Kendi simgeniz için: `npx tauri icon yeni-simge.png`
- Rust tarafı yalnız şu komutları içerir: `db_*`, `veri_dosyasi_*`, `dosya_yaz`, `sinav_parola*`, `yazdir`.

## DMG (macOS) üretmek
- Kolay yol: `Dmg-Uret.command` dosyasına çift tıklayın (ilk seferde sağ tık → Aç). Eksik araç varsa söyler.
- GitHub: bir sürüm etiketi (`git tag v1.0.0 && git push --tags`) yüklenince `.github/workflows/surum.yml` Mac ve Windows kurulum dosyalarını otomatik üretir.
