# Sınav Oluşturucu

Sınavhane'nin tek modülü: yazılı kâğıdı hazırlama akışı (A4 önizleme, çizim editörü, denklem editörü,
OCR, Sınavlarım kütüphanesi, parolalı sınav dosyası, yazdır / PDF).

## Çizim editörü (v1.2): öğretmen dostu arayüz

v1.2'de eski kip sekmeleri (`Çizim | Fizik | Matematik | Kimya`) ve `Şekiller | Ayarlar` sekme atlaması
kaldırıldı. Pencere üç parçadır:

- **Sol kütüphane** (`components/cizim/SolKutuphane.tsx`): anlık arama + katlanır kategoriler (Hazır Soru
  Sahneleri, Geometri, Matematik & Grafik, İstatistik & Şema, Fizik, Kimya, Akış Şeması, Şablonlarım).
  Karta tıklamak çekmeceyi kapatmaz. Veri `cizim/kutuphane.ts`'ten gelir (`kutuphaneGirdileri`,
  `kutuphaneAra`, `aramaOnerileri`); her girdi `{ id, ad, kategori, altBaslik, aramaKelimeleri, onizleme, ekle }`.
  Kart önizlemesi `KutuphaneOnizleme`: fizik nesnesi `fizikSimgeCiz`, şablonlar gerçek `sekilleriCiz` ile;
  önce taslak tuvalde mürekkep sınırı bulunur, sonra o sınır karta sığdırılır (molekül, gövde–yaprak gibi
  kutusundan küçük çizimler de okunur büyüklükte çıkar). Arama kutusu `y = x^2 - 4` ya da `0,5; 5,15`
  gibi yazıları "Çiz:" önerisine çevirir.
- **Üst araç çubuğu** (sabit): Seç/Taşı, Çizgi, Ok/Bağlayıcı, Dikdörtgen, Daire/Elips, Üçgen, Çokgen,
  Dalga, Serbest çizgi, Metin, Silgi, Geri/İleri al, yakınlaştırma, "Daha fazla". Çizim bitince araç Seç'e
  döner; Esc önce aracı bırakır, modalı kapatmaz.
- **Yüzen araç çubuğu** (`components/cizim/YuzenAracCubugu.tsx`) seçimin üstünde; ayrıntılı veri
  (grafik, istatistik, şema, kimya, geometri, hesaplı sahneler) sağdaki **Ayrıntılar** panelinde.

Doğrudan etkileşim (saf yardımcılar, test edilir):

- `cizim/geometriEtkilesim.ts`: köşe/nokta tutamaçları (`geometriKoseleri`), `geometriKoseTasi` (yeni geo
  verisi) ve `geometriKoseTasiSekil` (köşe kutu dışına çıkarsa şeklin `x, y, w, h` kutusu da büyür,
  köşeler yeniden birimlenir; seçim çerçevesi, vuruş ve PNG kırpma aynı kutuyu görür, dünya konumu
  döndürülmüş/aynalı şekilde de korunur), çift tıklanan köşe/kenar ve etiket yazma.
- `cizim/etkilesim.ts`: bağlantı portları (mavi halkalar; akış kutusu ve fizik nesnesi), grafik noktası
  sürükleme, yatay çevir / 90° döndür, `balonYerlesimi` (çift tıklama balonu şekle değmez, önce yanlara,
  sonra alta/üste açılır; sığmazsa `maxH` ile kısalır ve içi kaydırılır).
- `components/cizim/YerindeDuzenleBalonu.tsx`: köşe adı, açı etiketi/işareti, eş açı/kenar işareti,
  kenar etiketi; akış kutusu metni, fizik ve bağlayıcı etiketi. Değişiklik tek geri alma adımıdır.

Şekil aileleri:

- **Hazır sahneler** `cizim/sahneler.ts` (`HAZIR_SAHNELER`) ← `cizim/fizikSahneSablonlari.ts`. Birleşik
  sahneler (eğik düzlem + makara, Atwood, palanga, tam devre) mevcut nesne + bağlayıcılardan kurulur;
  hesaplı tek nesneler `cizim/fizikSahneler.ts` (`egikKuvvet`), `cizim/optik.ts` (`optikDuzenek`),
  `cizim/sivi.ts` (`siviKabi`); paneli `components/FizikSahnePaneli.tsx`.
- **Geometri** `cizim/geometriSekilleri.ts` (üçgen yardımcı elemanları, çember açıları, benzerlik, çokgen),
  `cizim/geometriEk.ts` (doğruda açılar, özel dörtgenler, katı cisimler, kağıt katlama),
  `cizim/geometriYardimci.ts`; paneli `components/GeometriPaneli.tsx`.
- **Matematik** `cizim/grafik.ts` + `cizim/ifade.ts`, `cizim/istatistik.ts`, `cizim/sema.ts`,
  `cizim/semaEk.ts` (birim çember, işaret tablosu, fonksiyon ok diyagramı); paneller
  `components/GrafikPaneli.tsx`, `components/MatematikPaneli.tsx`; veri tabloları `components/MiniTablo.tsx`.
- **Kimya** `cizim/kimya.ts` (laboratuvar, Bohr, Lewis, organik iskelet: zincir, sikloalkan, yan gruplar,
  IUPAC adı; orbital, pil, periyodik tablo); paneli `components/KimyaPaneli.tsx`.

Çekirdek kurallar (v1.1'den beri geçerli):

- Şekil türü `fizik` (`cizim/tipler.ts`): `nesne` + kutu (`x,y,w,h`) + `etiket` + `etiketYeri` + `ayna` +
  `dolgu` + nesneye özel veri (`grafik`, `istatistik`, `sema`, `kimya`, `geo`, `kuvvet`, `optik`, `sivi`).
  Katalog `FIZIK_TANIMLARI` (`cizim/fizik.ts`).
- **Yeni nesne eklemek**: `FizikNesnesi` birleşimi + `FIZIK_TANIMLARI` + `govdeCiz` içine bir `case`;
  TypeScript eksik olanı derlemede yakalar. Kütüphaneye grubuna göre kendiliğinden gelir; arama için
  `aramaKelimeleri` verin.
- **Etiket yazımı** (`fizikMetniParcala`): `m_1`, `v^2`, `v_{0x}`, `\theta`, `\Delta t`; bağlayıcı
  etiketleri de aynı yazıyı kullanır. Yunan tablosu `yunanHarfleri.ts`'te, denklem "yazarak ekle" ile ORTAK.
- **Bağlayıcı biçimi** (`baglayici.stil`): `dik` (varsayılan) · `duz` (ip/çubuk) · `yay` (zikzak) ·
  `vektor`. Uçlar şekil ya da boş nokta olabilir; yön seçimi EKRANDAKİ yöndür (döndürülmüş şekilde
  tutunma noktası şekille döner). Bağlayıcının `sekilSinirlari` nöbetçi değerdir (-1e6);
  `birlesikSinir` karışık seçimde bağlayıcıları saymaz.
- Etiket ve eksen yazıları kutunun DIŞINA taşabildiği için `cizimIcerikSiniri` / `fizikDisPayi` /
  `geometriDisPayi` bunları sayar (soruya eklenen PNG'de kırpılmasın).
- Testlerde asıl tuvali `canvas[role="img"]` ile seçin; kütüphane kartlarının önizlemeleri de `<canvas>`.

## Denklem editörü: "Yazarak ekle" (`denklem/yazim.ts`)


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


**Testler**: `tests/fizik-senaryolari.ts` (`test:fizik`), `tests/fizik-kullanici-akisi.tsx` (`test:fizik:ui`),
`tests/denklem-yazim-senaryolari.ts` (`test:denklem-yazim`), v1.2: `tests/v12-g-senaryolari.ts`,
`tests/v12-m-senaryolari.ts`, `tests/v12-f-senaryolari.ts` (+ `-kullanici-akisi.tsx` eşleri) ve
`tests/v12-u-kullanici-akisi.tsx`. Hepsi `npm test`'te. Otomatik testler geometriyi ve PNG kırpmasını
doğrular, estetiği değil: yeni şekil eklerken kütüphane kartını ve tuvali gözle de kontrol edin.

## 2026-08 test turu — bulunan ve düzeltilen sorunlar

İki ajanla (biri "aşırı uç senaryo", biri "orta seviye gerçekçi kullanım")
uçtan uca test edildi, bulunanlar düzeltildi. Yeni bir AI oturumu bu modüle
dokunmadan önce bilmesi gerekenler:

- **Sınav/soru silme "geri al" bildirimi artık GLOBAL** — `src/lib/geriAlKuyrugu.ts`
  + `src/components/GeriAlToast.tsx` (app/Layout.tsx'te bir kez render edilir).
  Eskiden `SinavlarimScreen.tsx`'in kendi `useState`'indeydi: öğretmen 10 sn
  dolmadan başka ekrana geçince (çok normal bir davranış) bildirim ANINDA
  kayboluyordu, "geri al" hakkı süresi dolmadan buharlaşıyordu. **Yeni bir silme akışı eklerken bu kuyruğu kullan, ekran
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

- Sınav taslağı ve soru görselleri SQLite'a kaydedilmez;
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
- Üç dosya hâlâ tek parça olarak büyük (2026-11): `SinavOlusturucuScreen.tsx` ~4.500,
  `CizimEditoruModal.tsx` ~3.400 ve `DenklemEditoruModal.tsx` ~2.000 satır. Çizim
  editöründe geometri/etkileşim hesapları `cizim/` altında saf; kütüphane, yüzen çubuk ve
  balon `components/cizim/` altına ayrıldı. Bölme planı: Faz D.
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

### Çizim editörü özellik notları

- **Vektörler** (Fizik > Vektör): Kuvvet (F), Hız (v), İvme (a, çift çizgi), Bileşen (kesikli). Bir şekil
  seçiliyken eklenirse o şeklin sağ kenarından dışarı doğru başlar. Varsayılan dolgu yok (beyaz dolgu
  komşu çizgileri gizliyordu). Yeni şekil `cizim/yerlesim.ts` ile boş bir yere gelir; boş yer
  kalmamışsa ortaya kaydırılarak konur.
- **Bağlama**: üst çubuktaki Ok / Bağlayıcı aracı sürekli kiptedir (Esc'e kadar); tür Otomatik (iki devre
  elemanı → devre teli, akış kutusu → dik ok) ya da Ok / Dik açılı ok / Devre teli / İp-Çubuk / Yay /
  Kuvvet-Vektör. Fizik nesnesinin ve akış kutusunun mavi port halkalarından sürükleyerek de bağlanır.
  Düz bağlantılar karşılıklı şekillerde hizalanır; makaraya giden ip çemberin teğetine oturur.
- **Kareli alan** (Fizik > Vektör / Izgara): satır, sütun, hücre ölçüsü, çizgi biçimi. Her zaman diğer
  şekillerin ALTINDA çizilir, yalnız çizgilerine tıklayınca seçilir. Vektör köşelere yapışır: Ok /
  Bağlayıcı aracında Kuvvet / Vektör türüyle alanın içine tıklayın ya da alan seçiliyken Ayrıntılar'daki
  "Vektör ekle"yi kullanın. Uçlar `BaglayiciUcu.dugum {c, r}`; alan taşınınca vektörler birlikte gelir.
  Kod: `cizim/geometri.ts` (`izgaraBoyutu`, `izgaraDugumu`, `enYakinDugum`), `FizikPaneli.tsx` (`KareliAlanPaneli`).
- **Hareket grafikleri** (Fizik > Hareket grafikleri): x–t, v–t, a–t, sinüs/kosinüs, noktalarla ve
  "x–t, v–t, a–t üçlü" (aynı hareketin üç grafiği alt alta, zaman eksenleri hizalı). Eğri hareket
  evreleriyle (süre, ivme), noktalarla ya da genlik/periyotla tanımlanır; köşe noktaları tuvalde
  sürüklenir (eksen adımına yakalanır). "Bunu v–t say" x–t ve a–t'yi de üretir. Kod: `cizim/grafik.ts`,
  `components/GrafikPaneli.tsx`.
- **Matematik**: ifade çözücü `cizim/ifade.ts` (`eval` yok; örtük çarpma `2x`, `x^2`, `sqrt`, `|x|`,
  `sin/cos/tan`, `ln/log`, `pi`). Eşitsizlik bölge olarak boyanır; `x^2+y^2=25` gibi kapalı denklemler
  marching squares ile çizilir; `alan(...)`, `teget(...)`, `kesisim`. İstatistik: MEB çeyrek yöntemiyle
  kutu grafiği, ham veriden histogram; tablo Excel'den yapıştırılır. Şemalar: Venn (kesişen / alt küme /
  ayrık), en çok 3 aşamalı olasılık ağacı, sayı doğrusu, birim çember, işaret tablosu
  (`isaretTablosuHesapla`), fonksiyon ok diyagramı.
- **Kimya**: laboratuvar malzemeleri (sıvı = dolgu + seviye), Bohr atomu/iyon (kabuklar otomatik, Cr/Cu
  istisnası), Lewis yapıları (oktet testte doğrulanır), organik iskelet (zincir, sikloalkan 3–8, yan
  gruplar −CH₃ −C₂H₅ −Cl −Br −OH −NH₂; IUPAC adı ve Hill formülü grafikten hesaplanır), fonksiyonel
  gruplar, orbital diyagramları, Daniell / Cu–Ag pili, 118 elementli periyodik tablo, kimya grafikleri.
  Kapsam dışı: alken/alkine yan grup ve sikloalken (doğrulayıcı reddeder).
