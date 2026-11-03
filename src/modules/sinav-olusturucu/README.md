# Sınav Oluşturucu

v0.11.7 — Yazılı Kağıdı hazırlama akışı uçtan uca aktif.

## 2026-10 Fizik kipi ve "yazarak denklem"

Fizik sınavı hazırlayan öğretmen için çizim editörüne FİZİK kipi, denklem editörüne
"Yazarak ekle" satırı eklendi. Yeni bir AI oturumu bu iki yere dokunmadan önce:

**Fizik kipi (çizim editörü, `Çizim | Fizik | Akış şeması` anahtarı)**

- Şekil türü `fizik` (`cizim/tipler.ts`): `nesne` (30 çeşit: kütle, küre, eğik düzlem,
  makara, araba, yay, kap, duvar/zemin/tavan, direnç, pil, ampul, anahtar, sığaç, bobin,
  ampermetre/voltmetre, iki mercek, üç ayna, prizma, mıknatıs, ± yük, eksen takımı) +
  kutu (`x,y,w,h`) + `etiket` + `etiketYeri` + `ayna` (yatay çevir) + `dolgu`.
  Çizimler `cizim/fizik.ts`'te, katalog (ad, varsayılan ölçü, ipucu) `FIZIK_TANIMLARI`'nda.
  Palet önizlemeleri AYNI çizim rutininden gelir (`fizikSimgeCiz`) — ayrı SVG tutulmaz.
- **Yeni fizik nesnesi eklemek**: `FizikNesnesi` birleşimi (tipler.ts) + `FIZIK_TANIMLARI` +
  `govdeCiz` içine bir `case` — TypeScript üçünden eksik olanı derlemede yakalar
  (`Record<FizikNesnesi, …>` ve `switch` kapsamı). Başka yere dokunmak gerekmez.
- Kutu tabanlı şekil olduğu için taşıma/boyutlandırma/döndürme/kesin ölçü/hizalama mevcut
  yoldan çalışır (`sinirlar.ts`, `geometri.ts`, `vurus.ts`'e `fizik` eklendi; vuruşta kutunun
  İÇİ tıklanabilir, tıpkı akış kutusu gibi).
- **Etiket yazımı** (`fizikMetniParcala`): `m_1`, `v^2`, `v_{0x}`, `\theta`, `\Delta t`.
  Bağlayıcı etiketleri de aynı yazıyı kullanır (`T_1`, `F_{sür}`). Bilinmeyen `\kelime`
  olduğu gibi kalır. Yunan tablosu `yunanHarfleri.ts`'te ve denklem "yazarak ekle" ile ORTAK.
- **Bağlayıcı biçimi** (`baglayici.stil`): `dik` (varsayılan; alan yazılmaz, eski belgeler
  değişmedi) · `duz` (ip/çubuk) · `yay` (zikzak) · `vektor` (kalın, dolu uçlu, etiket yanına).
  Düz biçimlerde yol iki tutunma noktası arasında tek doğru (`baglayiciYolu`); yay zikzağı
  yalnız ÇİZİMDE üretilir (`ciz.ts`), vuruş/sınır hesabı düz yola bakar.
- **Fizik kipinde bağlantının uçları şekil YA DA boş nokta olabilir** (kuvvet oku boşlukta
  başlayıp biter). Akış kipi eskisi gibi yalnız kutulara bağlanır.
- **Yön seçimi EKRANDAKİ yöndür** ("Sol" = gördüğün sol). Döndürülmüş şekilde tutunma
  noktası şekille döner (`tutunmaNoktasi` dönüşü uygular, `yonDondur`). Bu davranış akış
  kutuları için de geçerli: eskiden döndürülmüş akış kutusunda ok kutudan kopuktu.
- Fizik etiketi kutunun DIŞINA yazılabildiği için `cizimIcerikSiniri` etiketi de sayar
  (soruya eklenen görselde kırpılmasın). Harfler (A, V, N, S) gövdeyle dönmez, düz kalır.
- Fizik kipi TÜM çizim araçlarını korur (ok, çizgi, elips, dalga…): fizik şemasında lazım.
  Paletin küçük önizleme tuvalleri de `<canvas>`; testlerde asıl tuvali `canvas[role="img"]`
  ile seç, `querySelector("canvas")` yanlış tuvali verir.
- Arayüz `components/FizikPaneli.tsx` (şerit, seçili nesne paneli, bağlayıcı biçim paneli);
  `CizimEditoruModal.tsx` yalnız durumu (`kip`, `baglayiciAyari`, `baglayiciKaynakUcu`) tutar.

**Denklem editörü: "Yazarak ekle" (`denklem/yazim.ts`)**

- README'deki "kalan asıl iş"in KARAR VERİLEN çözümü: imleç modeli ya da MathLive yerine,
  yazıdan mevcut `DenklemParcasi[]`'yi üreten bir ayrıştırıcı. Belge biçimi (`surum: "v1"`)
  DEĞİŞMEDİ; üretilen her parça sonradan kartından düzenlenir. Karar öğretmenin onayına açık:
  tam bir matematik imleci istenirse bu ayrıştırıcı atılmaz, onun giriş katmanı olur.
- Kurallar: `x^2` üs · `v_0` alt simge · `1/2` BİTİŞİK bölme (yalnız yanındakiler) ·
  `m v^2 / 2` BOŞLUKLU bölme (önündeki VE sonraki tüm terim; terim sınırı + − = < > ≤ ≥ ≠ ≈) ·
  `sqrt(x)` · `sin(x)`/`sin \theta` · `vec(F)` · `abs(x)` · `(…)`, `[…]` · `\theta`/`theta`/`Delta`
  Yunan · `*`→· `<=`→≤ `!=`→≠ `~`→≈ `+-`→±. Yalnız metin+operatörden oluşan alanlar düz
  yazı kalır (iç içe parça üretilmez).
- Ayrıştırıcı HİÇ hata fırlatmaz: anlaşılmayan düz metin kalır, `uyarilar` döner, arayüz
  gösterir ama yine de ekler. Giriş kutusunda Enter ekler ve odağı KORUR (arka arkaya yazılır).
- Denklem iç içe parçalarda önizleme vurgusu hâlâ yok (eski açık madde).

**Testler**: `tests/fizik-senaryolari.ts` (`npm run test:fizik`), `tests/fizik-kullanici-akisi.tsx`
(`test:fizik:ui`), `tests/denklem-yazim-senaryolari.ts` (`test:denklem-yazim`). Üçü `test:all`'da.
Görsel doğrulama için 30 nesne gerçek Chromium tuvalinde çizilip gözle kontrol edildi;
otomatik testler geometriyi doğrular, estetiği değil — yeni nesne eklerken yine gözle bak.

## 2026-08 test turu — bulunan ve düzeltilen sorunlar

İki ajanla (biri "aşırı uç senaryo", biri "orta seviye gerçekçi kullanım")
uçtan uca test edildi, bulunanlar düzeltildi. Yeni bir AI oturumu bu modüle
dokunmadan önce bilmesi gerekenler:

- **Sınav/soru silme "geri al" bildirimi artık GLOBAL** — `src/lib/geriAlKuyrugu.ts`
  + `src/components/GeriAlToast.tsx` (app/Layout.tsx'te bir kez render edilir).
  Eskiden `SinavlarimScreen.tsx`'in kendi `useState`'indeydi: öğretmen 10 sn
  dolmadan başka ekrana geçince (çok normal bir davranış) bildirim ANINDA
  kayboluyordu, "geri al" hakkı süresi dolmadan buharlaşıyordu. Bu KIRPMA silme
  için de aynıydı (bkz. `modules/ders-kitabi/README.md`) — ikisi de aynı ortak
  kuyruğa taşındı. **Yeni bir silme akışı eklerken bu kuyruğu kullan, ekran
  içi `useState` + `setTimeout` kalıbına dönme.**
- **Zengin metin araç çubuğu (Kalın/İtalik/Altı çizili) fare tıklamasında
  bazen etkisizdi.** Kök neden: araç çubuğu düğmesine `mousedown` (preventDefault'a
  rağmen) Chrome'da bazen canlı seçimi imlece çökertiyordu; `komutUygula` bu
  çökmüş (boş) seçimi "geçerli" sayıp `execCommand`'i etkisiz çalıştırıyordu.
  `SinavZenginMetin.tsx`'teki `secimYakala`/`aktifAralik` artık çökmüş bir
  canlı seçimin, dolu bir kayıtlı seçimin üzerine yazmasını engelliyor.
- **Sağ panel (Düzenleme ve Ayarlar) kırılma noktası 1536px (Tailwind `2xl`)
  DEĞİL, özel `min-[1680px]`.** Üç sütun (soru listesi + kâğıt + panel)
  app/Layout.tsx'teki sol menü AÇIKKEN de sığmalı; 1536px'te (yaygın dizüstü
  çözünürlüğü) sol menü açıkken panel kesiliyordu. `SinavOlusturucuScreen.tsx`'teki
  `matchMedia("(max-width: 1679.98px)")` ile bu Tailwind sınıfları EL İLE
  senkron tutulur (JIT sınıf adlarını statik arıyor, sabitten enterpole
  edilemez) — birini değiştirirsen diğerini de değiştir.
- **Karmaşık/geniş denklemler artık uyarılıyor**: bir denklemin doğal genişliği
  editörün genişliğini aşarsa (`SinavZenginMetin.tsx::denklemModaldanGeldi`)
  öğretmene "küçülüp okunması zorlaşabilir" uyarısı gösterilir. Otomatik
  yeniden boyutlandırma YAPILMADI — bu, denklem motorunun (aşağıdaki "Kalan
  asıl iş" bölümü) yeniden tasarımına giren daha büyük bir karar.
- Sınav silme artık **onay yerine** (kodun geri kalanıyla tutarlı) geri-al
  toast'ı kullanıyor — bilinçli tercih, bkz. altta not.
- **Doğrulanan/bug OLMAYAN bulgular** (yeniden açmaya gerek yok): B Grubu
  "yeniden karıştırma" uyarısı yalnız "Yeniden Karıştır" butonuna basınca
  tetiklenir (soru metni düzenlemek `bSeed`'i değiştirmez, kasıtlı); Test
  moduna geçince Okul/Sınıf/Dönem alanları kağıttan kalkar ama VERİ silinmez
  (Yazılı'ya dönünce geri gelir, arayüz zaten bunu açıkça yazıyor); denklem/çizim
  görseline TEK tıklama zaten düzenleme modalını açıyor (çift tıklama gerekmiyor).

## 2026-09-30 çoklu ekran (telefon/tablet) turu

- Dokunmatik ya da < 640 px'te üst şerit tek satır: ad + kayıt noktası, "Soru ekle", "⋯"
  (Sınavlarım, Yeni, Ayarlar, Yazdır, dosya, geri/ileri, İpuçları). Telefonda yapışkan değil.
  Masaüstü (fare, ≥ 640 px) şeridi değişmedi.
- Kâğıt kabı kâğıttan darsa otomatik sığdırılır (ResizeObserver); −/+/%100 elle
  değiştirilince o oturumda dokunulmaz, otomatik ölçek localStorage'a yazılmaz.
  `min-w-[700px]` yalnız `min-[1680px]` üstünde.
- `oa-kompakt-alan`: önizleme sarmalayıcısı, gizli ÖLÇÜM alanı ve baskı kökü. Ölçüm alanı
  bu sınıfı kaybederse dokunmatikte 44 px kuralı yükseklikleri büyütür ve sayfalama bozulur.
- Dokunmatikte soru listesinde ↑ ↓ (HTML5 sürükle-bırak dokunmada çalışmıyor); liste
  satırında doğru şık rozeti "✓B". `ModalKabuk` < 640 px'te tam ekran, `ModalAlt`
  dokunmatik/dar ekranda `sticky bottom-0`. Zengin metin araç çubuğu dar ekranda tek satır kayar.
- Yazdırma iş adı: sınav adı + sınıf (`yazdirmaIsAdi`); Puan 0/100 iken yazdırma onay ister.

Temel kararlar:

- Bu modül geçici çalışma alanıdır.
- Sınav taslağı, soru görselleri ve soru bankası kırpıntıları SQLite'a kaydedilmez;
  içerik yalnızca tarayıcı IndexedDB'sinde (`sinav:<id>` anahtarlı, otomatik) ve
  isteğe bağlı `.json` dosyasında (elle dışa/içe aktarım) tutulur.
- **Çok sınavlı kütüphane:** tek taslak slotu yerine `db.sinavlar` metadata tablosu
  + sınav başına bir IndexedDB anahtarı var. Liste ekranı (`SinavlarimScreen.tsx`,
  `/sinav-olusturucu/sinavlarim`) kartları **içeriği hiç okumadan**, yalnız
  metadata'dan çiziyor — föy liste ekranında öğrenilen dersin uygulaması.
  `AZAMI_AKTIF_SINAV = 20` yumuşak sınırı arşivlemeye yönlendirir.
- Çıktı **yalnızca PDF/yazdır** (`window.print()`) ile alınır. **Word çıktısı yok ve
  eklenmeyecek** — HTML içeriği düz metne indirgediği için denklem/kesir gibi zengin
  içerik kayboluyordu; bu bilinçli bir kapsam kararıdır.
- Ders adı öğretmen tarafından manuel yazılır.

Aktif özellikler:

- Metin soru ekleme (zengin metin: kalın/italik/üst-alt simge/kesir).
- Görsel soru ekleme (dosyadan veya panodan yapıştırarak), tekli/çoklu.
- Çizim editörü (`components/CizimEditoruModal.tsx`) — canvas tabanlı şekil/çizim aracı.
  Geometrisi `cizim/` altında ve React'ten bağımsız: `tipler` · `sabitler` ·
  `geometri` (saf) · `sinirlar` (ctx ister, metin ölçümü için) · `vurus`
  (kenara uzaklık — şeklin içi dolu sayılmaz) · `hizalama` (asimetrik
  yakalanma/kopma eşiği) · `sablon` · `ciz`. Testi bileşeni hiç yüklemiyor.
- Denklem editörü (`components/DenklemEditoruModal.tsx`) — blok tabanlı (kesir/kök/üs/
  limit/integral/matris…) dizgi motoru, sonucu PNG olarak soruya ekler.
  Beğenilmeme nedeni artık biliniyor; aşağıdaki ayrı başlığa bakın.
- PDF kaynak modalı (`components/PdfKaynakModal.tsx`) — PDF sayfasını görüntüleyip
  alan seçerek soru olarak kırpma; "yeni soru / altına / yanına" hedefleme.
- Görselden parça kesme (`components/GorselParcaModal.tsx`).
- A4 önizleme, gerçek DOM ölçümüyle otomatik sayfalama.
- Çift sütun sayfa düzeni (`sayfaDuzeni`, `sutunAra`, `sutunAyirici`).
- B Grubu (deterministik karıştırma + yeniden karıştırma uyuşmazlık uyarısı).
- Test modu (doğru şık işaretleme + ayrı cevap anahtarı yazdırma).
- BEP görünümü (punto artışı + soru alt kümesi).
- Kritik yerleşim uyarılarında (sayfaya sığmama, metin alanı daralması, puan 100'ü
  aşması) yazdırmadan önce onay istenir; öğretmen isterse yine de devam edebilir.
- Taslak otomatik kayıt + kurtarma, dosyaya kaydet/yükle, geri al (Ctrl+Z) ve
  ileri al (Ctrl+Shift+Z / Ctrl+Y). Geçmiş **yalnız bellekte** (`gecmisRef`/
  `ileriRef`), açılışta sıfırlanır — bu yüzden snapshot biçimi göç gerektirmeden
  değiştirilebilir. Kapsam artık sorulara ek olarak başlık bilgilerini ve sayfa
  düzeni ayarlarını da içeriyor.

## Denklem editörü — beğenilmeme nedeni ve kalan iş

README uzun süre "nedeni netleşmedi" diyordu; kök neden koddan çıkarıldı ve iki
başlıkta toplandı.

**1) Boyut tutarsızlığı — kapatıldı.** Satır içi denklem yüksekliği `punto * 1.5`
ile sabitleniyordu; kesir/integral gibi gerçekte daha yüksek çizilen yapılar bu
sabite sıkışınca yaklaşık yarıya iniyordu ("denklem ekliyorum, okunmuyor").
`denklemCiz` gerçek CSS boyutunu zaten döndürüyor ama atıyordu; artık
`DenklemCikti.yukseklikOrani` ile taşınıyor ve satır içi / yeni soru / seçili
soruya ek yollarının üçü de tek içerik-güdümlü kuralı kullanıyor
(`SinavZenginMetin.tsx:400`, `SinavOlusturucuScreen.tsx:1870`).

**2) Giriş hızı — kısmen.** Editör bir denklem editöründen çok bir *form*:
her yapı ayrı bir kart, her alan ayrı bir `<input>`. Modal artık boş açılıyor,
eklenen parçanın ilk alanı odaklanıp seçiliyor, parçalar arasında **Alt+←/→** ile
dolaşılıyor, boşalmış parçada **Backspace** parçayı siliyor, **Escape** alan
içinde de çalışıyor.

**Kalan asıl iş (2026-10: BÜYÜK ÖLÇÜDE ÇÖZÜLDÜ, bkz. yukarıdaki "Yazarak ekle"; aşağıdaki
imleç modeli maddesi yalnız satır İÇİ düzenleme için açık):** "yazarken yapı üretme" — `/` ile kesir, `^`/`_` ile üs/indis,
LaTeX yapıştırma. Bu bir yama değil, blok modelinin yeniden tasarımıdır: ortada
matematiksel bir imleç kavramı yok (`seciliParcaId` yalnız üst seviyeyi işaretler).
Gerçek çözüm ya bir imleç modeli yazmak ya da hazır bir matematik giriş bileşenine
(MathLive gibi) geçmektir; mevcut `DenklemBelgesi` formatı korunacaksa dönüştürücü
de gerekir. **Karar öğretmenin** — kodlamadan önce sorulmalı.

Ayrıca açık: iç içe parçalarda önizleme vurgusu yok (`denklemCiz`'deki
`seciliParcaId` kontrolü yalnız en dış döngüde).

Henüz yok (kapsam dışı, bilinçli olarak ertelendi):

- Yaprak test / çok bölümlü deneme sınavı, optik cevap formu — kodda hiç iskelet yok.
- PDF/görselden soru kesme ekranı dışında başka bir "soru bankası" özelliği yok.
- `.oa-sinav.json` ile sınav paylaşımı (kütüphane aşama 3) — kararlar kilitli,
  kod yok.

**Taslak JSON güvenlik kapısı (0.11.18):** Elle içe aktarılan `.json` taslakları
aktif sınava dokunmadan önce `storage/taslakDosya.ts::sinavTaslaginiDogrula`
üzerinden geçer. Dosya 25 MB, sınav 500 soru, soru başına 100 alt madde ve 50 ek
görselle sınırlıdır; tek gömülü görsel 8 MiB'yi aşamaz. Toplam metin/görsel
bütçesi, nesne düğümü ve iç içe derinlik ayrıca sınırlanır. Başlık, sayfa ayarı,
soru/madde/görsel türleri ve sayısal aralıklar doğrulanır; bilinmeyen alanlar,
yinelenen soru kimlikleri ve `__proto__`/`prototype`/`constructor` anahtarları
reddedilir. Başarısız doğrulama mevcut taslağı değiştirmez. Kabul edilen zengin
metin ayrıca mevcut `security/html.ts` temizleme kapısından geçmeye devam eder.

**Parolalı sınav paylaşımı (0.11.19):** Yeni dışa aktarımlar düz JSON yerine
`.oa27sinav` üretir. Taslak önce 0.11.18 doğrulama kapısından geçer, ardından
Rust katmanında Argon2id (64 MiB, 3 tur) ile türetilen anahtar ve AES-256-GCM
ile şifrelenir. Format `oa27-encrypted-exam`, AAD ise yedekten ayrı
`ogretmen-asistani/exam-draft/v1` değeridir; bu yüzden sınav ve yedek zarfları
birbirinin açma komutunda kullanılamaz. Yanlış parola veya değiştirilmiş içerik
reddedilir. Parola saklanmaz. Arayüzde tekrar/güç/göster-gizle ve kriptografik
güçlü parola üretimi bulunur. Eski `.json` sınav taslakları yalnız içe aktarma
için geriye uyumlu desteklenir ve aynı sıkı şema doğrulamasından geçer.

**İçe aktarma önizlemesi (0.11.20):** Doğrulanmış taslak boş sınava bile artık
sessizce uygulanmaz. Zorunlu onay penceresi ders, sınıf, dönem/yazılı, soru
sayısı, toplam puan, gömülü görsel sayısı, kaynak sürümü, dosya adı/boyutu ve
parolalı/eski-JSON türünü gösterir. Eski parolasız JSON sarı güven uyarısı alır.
Ekranda açık taslak varsa kaç sorunun değiştirileceği kırmızı uyarıyla belirtilir
ve onay düğmesi yıkıcı stildedir. Vazgeçme yolunda aktif belge ve kalıcı kayıt
değişmez.

**Kullanıcılar arası kimlik izolasyonu (0.11.21):** Dosyadan gelen sınavın
sınav, soru, alt madde, ek görsel, mantıksal grup, paket ve çizim/denklem belge
kimlikleri yeniden üretilir. BEP soru seçimi yeni soru kimliklerine taşınır;
başka cihazda anlamlı olan `kirpmaId`, `kaynakKitapId` ve `kaynakAktarimId`
referansları atılır. Kaynak nesne mutasyona uğramaz. Onaylanan dış taslak mevcut
aktif kaydın üzerine uygulanmaz: metadata ve içerik yeni bir yerel sınav olarak
atomik oluşturulur, yazma hatasında metadata geri alınır, başarıda yeni kayıt
aktif yapılır. Önceki sınav kütüphanede ve kendi içeriğiyle korunur.

Bilinen teknik borç:

- Zengin metin düzenleme `document.execCommand` üzerinden yapılıyor (deprecated Web
  API); şu an çalışıyor ama tarayıcı/webview güncellemelerinde risk taşıyor.
- İki dosya hâlâ tek parça olarak büyük: `SinavOlusturucuScreen.tsx` 3.619 ve
  `DenklemEditoruModal.tsx` 2.731 satır. Bölme planı Faz D
  (`SINAV-OLUSTURUCU-DEGERLENDIRME.md` §13). `CizimEditoruModal.tsx` 2.593 →
  1.613 satır (geometri `cizim/` altına çıktı).
  `SinavComponents.tsx` (3.651) **bölündü** — altı dosya, kabaca eşit ölçekte:
  `SinavKagit.tsx` (kâğıda basılan her şey) · `SinavZenginMetin.tsx`
  (`RichTextEditor` + salt-okunur ikizi) · `SinavSoruListesi.tsx` ·
  `SinavSoruPanel.tsx` (satır içi düzenleme) · `SinavModallari.tsx` ·
  `SinavPanelParcalari.tsx` (durumsuz küçük parçalar). Her dosyanın başında
  neyi topladığı ve ayrı durmasının nedeni yazılı.
- `SinavOlusturucuScreen.tsx`'te 69 `useState` var. `useReducer`'a toplamak Faz D'nin
  **en riskli** maddesi: geri al'ın bağımlılık listesi `taslakOlustur` ile birebir
  eşleşmek zorunda, dağılırsa geri alma sessizce alan kaybeder.

Faz D'ye dokunmadan önce bilinmesi gereken iki bilinçli tercih:

- Ölçüm `useLayoutEffect`'inin **bağımlılık dizisi yoktur ve bu bilinçlidir**:
  eksik bir bağımlılık listesi ölçümü eski değerde dondurup sessizce yanlış
  sayfalama üretirdi. Döngüyü 0.4 mm toleranslı karşılaştırma kesiyor.
  `sinav-ui` testi bu gerekçe yorumunun yerinde durduğunu kontrol eder.
- Bileşen kaynağının metnini arayan testler artık tek bir listeden okuyor:
  `tests/_sinav-bilesen-kaynagi.ts`. Bileşen dosyası ekleyip çıkaran, oradaki
  listeyi de güncellemeli — yoksa olumsuz iddialar ("bu metin hiçbir yerde
  olmasın") sessizce zayıflar.
- Testlerin bir kısmı kaynak **metni** arar (`ekran.includes(...)`). Dosya bölerken
  kırılırlar; kırılınca iddiayı yeni yerine **taşı**, silme.

### Fizik kipi güncellemesi (vektör, yerleşim, bağlantı)
- **Vektör sekmesi**: Kuvvet (F), Hız (v), İvme (a, çift çizgi), Bileşen (kesikli) tek tıkla eklenir; kutu tutamaçlarıyla boyu, döndürmeyle yönü ayarlanır. Bir şekil seçiliyken eklenirse o şeklin sağ kenarından dışarı doğru başlar.
- Varsayılan dolgu artık yok (beyaz dolgu komşu şekil/çizgileri gizliyordu); Dolgu isteğe bağlı.
- Yeni şekil `cizim/yerlesim.ts` ile mevcut şekillerle kesişmeyen en yakın boş yere gelir.
- Düz bağlantılar (ip/yay/vektör) karşılıklı şekillerde yatay/dikey hizalanır; makaraya giden ip çemberin teğetine oturur.

### Kareli alan (vektör zemini)
- Fizik şeridi > "Vektör / Izgara" > **Kareli alan**. Satır, sütun, hücre genişliği/yüksekliği ("Kare kalsın" ile birlikte), çizgi rengi, kalınlığı, kesikli ve dış çerçeve seçilebilir (varsayılan 3×4, açık gri, ince).
- Alan her zaman diğer şekillerin ALTINDA çizilir; yalnız çizgilerine tıklayınca seçilir (içindeki cisimlere/vektörlere tıklamayı çalmaz).
- Vektör köşelere yapışır: Bağlantı > Kuvvet/Vektör ile alanın içine tıklayınca en yakın köşe alınır; ya da alan seçiliyken "Vektör ekle" kutusuna başlangıç köşesi ve bileşenler (yatay, dikey; yukarı +) yazılır. Uçlar `BaglayiciUcu.dugum {c, r}` olarak saklanır; alan taşınınca/boyutlanınca/döndürülünce vektörler birlikte gelir.
- Kod: `cizim/geometri.ts` (`izgaraBoyutu`, `izgaraDugumu`, `enYakinDugum`), `cizim/fizik.ts` (`kareliAlan` gövdesi), `components/FizikPaneli.tsx` (`KareliAlanPaneli`).

### Fizik grafikleri (konum–zaman, hız–zaman, ivme–zaman, sinüs)
- Fizik şeridi > **Grafik**: hazır şablonlar (x–t sabit hız, x–t ivmeli, v–t, a–t, sinüs, kosinüs, sin θ π eksenli, noktalarla). Tek tıkla eklenir; kutuyu taşıyıp boyutlandırabilirsiniz.
- **x · v · a Üçlü grafik**: aynı hareketin konum, hız ve ivme grafiğini alt alta, zaman eksenleri hizalı ekler.
- **Hızlı çiz**: Grafik sekmesindeki kutuya `0,5; 5,15; 9,15; 11,9` gibi (zaman, değer) noktalarını yazıp Enter → kılavuzlu, sayılı grafik hazır. Noktalar panelindeki **"Bunu v–t say"** düğmesi aynı hareketin x–t ve a–t grafiklerini de üretir.
- Eğri üç şekilde tanımlanır (panelden değişir):
  - **Hareket evreleri**: başlangıç konumu/hızı + evreler (süre, ivme). Konum, hız ve ivme grafiği aynı evrelerden hesaplandığı için birbiriyle tutarlıdır; panelde toplam süre, son hız ve yer değiştirme görünür.
  - **Noktalar**: `0,0; 4,20; 8,20; 10,0` gibi yazılır (ondalık için `2.5` ya da `2,5 10`).
  - **Sinüs / Kosinüs**: genlik, periyot, faz (derece), düşey kayma, başlangıç–bitiş.
- Eğri başına renk, kesikli, **altını boya** (yer değiştirme = v–t alanı), köşe noktaları + eksene kesikli kılavuz, eğri adı (I, x_1). En çok 4 eğri aynı grafikte.
- Eksenler: ad (`m/s^2` üst simge), aralık ve adım (boşsa otomatik), ızgara, sayılar (düzenli / yalnız köşe değerleri / yok), yatay eksen π (radyan: π/2, π, 3π/2…), başlık.
- Kod: `cizim/grafik.ts` (saf: örnekleme, aralık, sayı yazımı, çizim), `components/GrafikPaneli.tsx`. Testler: `tests/fizik-senaryolari.ts`, `tests/fizik-kullanici-akisi.tsx`.

### Matematik: fonksiyon, istatistik, şemalar
Fizik kipi > **Matematik / İstatistik** sekmesi. Her şey tek tıkla hazır şablonla gelir, sayılar sonra değiştirilir; çıktı siyah-beyaz baskıya uygundur (renk isteğe bağlı).
- **Hızlı çiz:** `y = x^2 - 4 ; y > x + 1 ; x = 3` yazıp Enter. Eşitsizlik yazılırsa bölge boyanır (`<` `>` kesikli, `<=` `>=` düz sınır). `eval` yok: `cizim/ifade.ts` kendi çözücüsü (örtük çarpma `2x`, `3(x+1)`, `x^2`, `sqrt`, `|x|`, `sin/cos/tan`, `ln/log`, `pi`).
- **Fonksiyon grafiği** (`grafik.ts`, eğri türleri fonksiyon / bölge / isaret): asimptot kesilir, parçalı fonksiyonda açık-kapalı uç dairesi, adlı noktalar `A(2,3)`, serpme diyagramı + regresyon doğrusu.
- **Denklem, alan, kesişim, teğet:** `x^2+y^2=25`, `x^2/9+y^2/4=1`, `x^2/9-y^2/4=1`, `(x-1)^2+(y+2)^2=4`, `x=y^2` kapalı denklem olarak çizilir (`denklem` eğrisi, marching squares; çember/elipste eksen birimleri eşitlenir). `alan(x, x^2, 0, 1)` iki eğri arası, `alan(x^2-4x+5, 1, 3)` eğri altı alan; `teget(x^2, 1)` x₀ noktasında teğet (sayısal türev, denklemi panelde yazar); `kesisim` ya da panelde “Kesişim ve kökleri işaretle” y=f(x) eğrilerinin kesişim ve eksen kökleri `(x; y)` etiketiyle işaretlenir (asimptot kök sayılmaz; denklem eğrileri bu hesaba girmez).
- **İstatistik** (`istatistik.ts`, `MatematikPaneli.tsx`): sütun, gruplu sütun, çubuk, daire, çizgi, histogram (+ sıklık çokgeni, ham veriden sınıf), kutu (MEB çeyrek yöntemi, aykırı değer), gövde–yaprak (iki grup sırt sırta). Tablo Excel'den yapıştırılabilir. Ortalama/ortanca/tepe değer/standart sapma paneldedir.
- **Şemalar** (`sema.ts`): Venn (2–3 küme, bölge değerleri, bölge boyama), olasılık ağacı (`K: 1/3` / `- K: 1/2` yazımı), sayı doğrusu (aralık `(-2, 3]; [5, ∞)`, açık/kapalı nokta).
- Testler: `npm run test:fizik` (ifade, hesaplar, çizim, doğrulama) ve `npm run test:fizik:ui` (hızlı fonksiyon, tablo yapıştır, Venn boyama).

### Kimya: laboratuvar, atom/molekül, periyodik tablo, grafikler
Fizik kipi > **Kimya** sekmesi (Laboratuvar · Atom / Molekül · Periyodik tablo · Grafik). Kod: `cizim/kimya.ts`, arayüz `components/KimyaPaneli.tsx`.
- **Laboratuvar:** beher, erlenmayer, balon joje, mezür, deney tüpü, büret, ayırma hunisi, Bunsen beki, huni, damıtma düzeneği. Sıvı = `dolgu` rengi + `seviye` (panelde kaydırıcı).
- **Bohr atomu / iyon:** atom numarası ve yük yazılır; kabuklar otomatik dolar (kation dış kabuktan eksilir, Cr/Cu istisnası dâhil). Elle dizilim de yazılabilir.
- **Molekül:** 17 hazır yapı (H₂ … NH₄⁺, NaCl); bağ çizgisi ya da Lewis noktaları, δ+/δ−, formül ve geometri yazısı. Ortaklanmamış çiftler boşluğa otomatik dağılır; testte her molekülün oktet sayımı doğrulanır.
- **Periyodik tablo:** 118 element, lantanit/aktinit satırları; tüm tablo, ilk 20, ilk 3 periyot, ana gruplar. Element boyama (`O, S, 11-13`), simgeyi `?` yapma, kütle ve numara gösterme.
- **Grafikler:** ısınma/soğuma, çözünürlük, derişim–zaman, ekzotermik/endotermik/katalizörlü enerji profili, titrasyon (`grafik.ts` verisi).
- Kapsam dışı: organik yapı çizimi (halkalar, fonksiyonel gruplar) henüz yok.
