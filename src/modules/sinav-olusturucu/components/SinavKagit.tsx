// A4 kâğıdına basılan her şey: sayfa önizlemesi, soru bloğu, soru içeriği,
// yerleşim uyarıları, öğretmen imza alanı ve tasarım modundaki boyut tutamacı.
//
// Bu dosyanın ayırt edici özelliği: buradaki ölçüler ÇIKTIYA gider. `mmOlcu`/
// `puntoOlcu` yazdırma modunda gerçek mm/pt, ekranda piksel döner — ikisinin
// ayrışması "ekranda sığıyor, kâğıtta taşıyor" sınıfı hataların kaynağıdır.
// Ekrandaki ölçüm alanı da bu bileşenlerin AYNISINI kullanır (bilerek).

import { memo, useMemo } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { LogoBoyut, SoruOgesi, SayfaYerlesimi, YerlesimUyarisi } from "../types";
import {
  A4_GENISLIK_MM,
  A4_YAZDIRMA_YUKSEKLIK_PT,
  A4_YUKSEKLIK_MM,
  LOGO_BOYUT_MM,
  MM_PX,
  SATIR_MM,
  VARSAYILAN_LOGO_BOYUT,
} from "../constants";
import {
  ANAHTAR_BASLIK_ALT_MM,
  ANAHTAR_BASLIK_PUNTO,
  ANAHTAR_PUNTO,
  ANAHTAR_SATIR_ARA_MM,
  ANAHTAR_SATIR_YUKSEKLIK,
  ANAHTAR_SUTUN,
  ANAHTAR_UST_BASLIK_ARA_MM,
  ANAHTAR_UST_BASLIK_PUNTO,
  ANAHTAR_UST_BOSLUK_MM,
  mmPx,
  puntoPx,
} from "../layout/a4";

import {
  gorselYerlesimHesapla,
  hizalamaJustify,
  htmlToText,
  etkinMaddeKolon,
  maddeHarfi,
  OTOMATIK_SUTUN_ARASI_MM,
  METIN_ALANI_DAR_ESIK_MM,
  mantiksalSoruSiraHaritasi,
  sayiSinirla,
  soruPuani,
  type SikBicimi,
  type SikDuzeni,
} from "../utils";

import { RichTextGorunum } from "./SinavZenginMetin";
function mmOlcu(mm: number, yazdirmaModu?: boolean) {
  return yazdirmaModu ? `${mm}mm` : mmPx(mm);
}

function puntoOlcu(punto: number, yazdirmaModu?: boolean) {
  return yazdirmaModu ? `${punto}pt` : puntoPx(punto);
}

export function A4Onizleme(props: {
  sayfalar: SayfaYerlesimi[];
  sorular: SoruOgesi[];
  resmiBaslik: string;
  /** Yalnız TASARIM görünümünde gösterilen, yer tutuculu başlık (çıktıda boş alanlar basılmaz). */
  resmiBaslikTasarim?: string;
  logoDataUrl?: string;
  /** Antetteki logo kutusunun ölçüsü; verilmezse varsayılan kullanılır. */
  logoBoyut?: LogoBoyut;
  /** "merkez": logo solda, ortada serbest satırlar, sağ üstte Toplam Puan kutusu, altta tek satır kimlik. */
  baslikDuzeni?: "klasik" | "merkez";
  /** Merkez düzeninde ortadaki satırlar (çıktı) ve tasarım görünümündeki yer tutuculu hâli. */
  ortaSatirlar?: string[];
  ortaSatirlarTasarim?: string[];
  tarih?: string;
  sureDakika?: string;
  grupEtiketi?: string;
  ogretmenler: string[];
  sayfaNoGoster: boolean;
  kimlikAlaniGoster: boolean;
  /** Test kâğıdında doğru/yanlış/net kutusu. */
  testSonucKutusu?: boolean;
  /** Test kipinde şık harfleri A–E olmalı: cevap anahtarı `dogruSik` üzerinden
   *  A–E ile çalışıyor, Türk alfabesi sırası 4./5. şıkkı "ç"/"d" yapıp anahtarla
   *  ayrıştırıyor (bkz. utils.maddeHarfi). */
  testModu?: boolean;
  /** Şık harf biçimi ve dizilimi (bkz. utils.SikBicimi/SikDuzeni). */
  sikBicimi?: SikBicimi;
  sikDuzeni?: SikDuzeni;
  /** Kimlik bloğunda "Puan:" satırı (test kipinde sonuç kutusu var, gerekmez). */
  kimlikPuanGoster?: boolean;
  /** Doluysa cevap anahtarı testin sonuna (son sayfaya) basılır. Ayrı sayfa
   *  seçildiğinde verilmez. Yerleşime `anahtarMm` ile birlikte gitmeli. */
  cevapAnahtari?: { sira: number; cevap: string }[];
  seciliSoruId: string | null;
  onSec: (id: string) => void;
  onGenislik: (id: string, mm: number) => void;
  onGorselYukseklik?: (id: string, mm: number | null) => void;
  /** Verilirse seçili sorunun üstünde hızlı A–E şeridi çıkar (test kipi).
   *  Baskı çağrısı bunu VERMEZ; şerit kâğıda düşemez. */
  onDogruSik?: (soruId: string, sik: string | undefined) => void;
  onEkGorselGenislik?: (soruId: string, parcaId: string, mm: number) => void;
  onEkGorselSil?: (soruId: string, parcaId: string) => void;
  kenarBosluk: number;
  tamIcerikMm: number;
  sutunIcerikMm: number;
  sutunAraMm: number;
  sutunAyirici: boolean;
  onizlemeModu: "tasarim" | "cikti";
  soruYuksekligiMm: (soru: SoruOgesi) => number;
  kapasiteDevamMm: number;
  /** Görsel/çizim azami yüksekliği (mm); aşan görseller orantılı küçültülür. */
  gorselAzamiYukMm?: number;
  /** Aktif yerleşim uyarıları; hepsi birden gösterilir ve adet taşır. */
  yerlesimUyarilari?: YerlesimUyarisi[];
  yazdirmaModu?: boolean;
}) {
  const { sayfalar, sorular } = props;
  const tasarim = props.onizlemeModu === "tasarim";
  const siraMap = useMemo(() => mantiksalSoruSiraHaritasi(sorular), [sorular]);
  const ortalamaSoruMm = useMemo(() => {
    if (sorular.length === 0) return 0;
    const toplam = sorular.reduce(
      (t, soru) => t + props.soruYuksekligiMm(soru) + soru.boslukMm,
      0,
    );
    return toplam / sorular.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorular, props.soruYuksekligiMm]);

  function blok(soru: SoruOgesi, icerikMm: number) {
    return (
      <SoruBlok
        key={soru.id}
        soru={soru}
        sira={siraMap.get(soru.id) ?? 0}
        secili={props.seciliSoruId === (soru.devamKaynakId ?? soru.id)}
        tasarimModu={tasarim}
        testModu={props.testModu}
        sikBicimi={props.sikBicimi}
        sikDuzeni={props.sikDuzeni}
        icerikGenislikMm={icerikMm}
        kapasiteDevamMm={props.kapasiteDevamMm}
        gorselAzamiYukMm={props.gorselAzamiYukMm}
        yukMm={props.soruYuksekligiMm(soru)}
        onSec={() => props.onSec(soru.devamKaynakId ?? soru.id)}
        onGenislikMm={(mm) => props.onGenislik(soru.id, mm)}
        onGorselYukseklikMm={
          props.onGorselYukseklik ? (mm) => props.onGorselYukseklik!(soru.id, mm) : undefined
        }
        onDogruSik={
          props.onDogruSik ? (sik) => props.onDogruSik!(soru.id, sik) : undefined
        }
        onEkGorselGenislik={
          props.onEkGorselGenislik
            ? (parcaId, mm) => props.onEkGorselGenislik!(soru.id, parcaId, mm)
            : undefined
        }
        onEkGorselSil={
          props.onEkGorselSil
            ? (parcaId) => props.onEkGorselSil!(soru.id, parcaId)
            : undefined
        }
        yazdirmaModu={props.yazdirmaModu}
      />
    );
  }

  const olcu = (mm: number) => mmOlcu(mm, props.yazdirmaModu);
  const punto = (pt: number) => puntoOlcu(pt, props.yazdirmaModu);
  const logoBoyutMm = LOGO_BOYUT_MM[props.logoBoyut ?? VARSAYILAN_LOGO_BOYUT];
  function uyariTikla(soruId: string) {
    props.onSec(soruId);
  }

  return (
    <div className={props.yazdirmaModu ? "w-full" : "w-full pb-6"}>
      {sayfalar.map((sayfa, sayfaIndex) => {
        const sonSayfa = sayfaIndex === sayfalar.length - 1;
        return (
          <div
            key={sayfa.sayfaNo}
            className={props.yazdirmaModu ? "sinav-a4-page" : "mb-8"}
            style={
              props.yazdirmaModu
                ? {
                    breakAfter: sonSayfa ? "auto" : "page",
                    pageBreakAfter: sonSayfa ? "auto" : "always",
                  }
                : undefined
            }
          >
            {!props.yazdirmaModu && (
              <SayfaDolulukSatiri
                sayfa={sayfa}
                toplamSayfa={sayfalar.length}
                sonSayfa={sonSayfa}
                ortalamaSoruMm={ortalamaSoruMm}
              />
            )}
            <div
              className="relative mx-auto flex flex-col bg-white shadow-xl ring-1 ring-slate-200"
              style={{
                width: olcu(A4_GENISLIK_MM),
                // YAZDIRMADA yükseklik SABİT, ekranda yalnız alt sınır.
                //
                // `minHeight` ile bir sayfa, içeriği kapasiteyi aşarsa
                // 297mm'nin ötesine uzuyordu (ölçülen örnek: ilk sayfada
                // 317,2mm). Kâğıt uzayınca tarayıcı kendi sayfa sonunu atıyor
                // ve o noktadan itibaren fiziksel sayfalar uygulamanın
                // sayfalarıyla hizalanmıyor — "6. sayfadan sonra başlıklar
                // ortaya kayıyor" şikâyetinin kaynağı buydu. Tek bir taşan
                // soru, kendisinden SONRAKİ HER SAYFAYI bozuyordu.
                //
                // Kilit + overflow:hidden taşmayı kendi sayfasında tutar.
                // Taşan içerik kırpılır; bu sessiz bir kayıp değil: yazdırma
                // öncesi "N soru tek sayfaya sığmıyor" uyarısı çıkıp onay
                // istiyor (bkz. pdfYazdir'daki uyarilar listesi).
                // Ekranda kilit YOK — önizlemede taşmanın görünmesi öğretmenin
                // sorunu fark etmesini sağlayan şey.
                ...(props.yazdirmaModu
                  ? {
                      // 297mm DEĞİL: tam 297mm baskı sayfası kutusuna
                      // sığmıyor, her çıktının sonuna boş sayfa ekliyor ve
                      // hizayı kaydırıyordu. Ölçüm ve gerekçe
                      // A4_YAZDIRMA_YUKSEKLIK_PT'nin başında.
                      height: `${A4_YAZDIRMA_YUKSEKLIK_PT}pt`,
                      overflow: "hidden" as const,
                    }
                  : { minHeight: olcu(A4_YUKSEKLIK_MM) }),
                // Sınır artık girişte uygulanıyor (MIN_KENAR_BOSLUK_MM); burada
                // ikinci kez sıkıştırmak, kapasite hesabıyla sessizce farklı bir
                // değer üretme riskini geri getirir.
                padding: olcu(props.kenarBosluk),
                fontFamily: "'Times New Roman', Times, serif",
              }}
            >
              {sayfaIndex === 0 && props.baslikDuzeni === "merkez" ? (
                <MerkezBaslik
                  satirlar={(tasarim ? props.ortaSatirlarTasarim : props.ortaSatirlar) ?? []}
                  grupEtiketi={props.grupEtiketi}
                  logoDataUrl={props.logoDataUrl}
                  logoMm={logoBoyutMm}
                  puanKutusu={props.kimlikPuanGoster !== false}
                  kimlik={props.kimlikAlaniGoster}
                  tarih={props.tarih}
                  sureDakika={props.sureDakika}
                  olcu={olcu}
                  punto={punto}
                />
              ) : sayfaIndex === 0 ? (
                <div
                  className="text-center"
                  style={{
                    borderBottom: "1.5px solid #334155",
                    paddingBottom: olcu(3),
                  }}
                >
                  {/* Antet: solda logo, sağında BAŞLIK VE kimlik alanı birlikte.
                      Eskiden logo yalnız başlık satırındaydı ve dengelemek için
                      sağına aynı boyda GÖRÜNMEZ bir kutu konuyordu; kimlik alanı
                      da altta ayrı bir tam genişlik satırıydı, yani logoyla hiç
                      hizalanmıyordu. Kimlik alanı sağ sütuna girince logo hem
                      büyüyebiliyor hem de antet KISALIYOR (ölçüm: logolu antet
                      33,4 mm → ~25 mm), çünkü logo artık kendi satırını değil
                      yanındaki sütunun tamamını dengeliyor. */}
                  <div className="flex items-stretch gap-3">
                    {props.logoDataUrl && (
                      <img
                        src={props.logoDataUrl}
                        alt="Logo"
                        style={{
                          height: olcu(logoBoyutMm),
                          width: olcu(logoBoyutMm),
                          objectFit: "contain",
                          // Uzun bir sağ sütunda logo dikeyde ortalanır, kısa
                          // sütunda (test kipi: kimlik bloğu yok) yüksekliği
                          // zaten satırı belirler.
                          alignSelf: "center",
                          flexShrink: 0,
                        }}
                      />
                    )}
                    {/* `justify-center` ŞART: sütun logo kadar uzuyor ama
                        içeriği tepeye çakılı kalırsa logo büyüdükçe altında
                        giderek büyüyen boş bir bant doğuyor. Test kipinde
                        (kimlik bloğu yok, sütun kısa) bu en belirgin hâli:
                        28 mm logonun yanında başlık tepede asılı kalıyordu. */}
                    <div className="flex min-w-0 flex-1 flex-col justify-center">
                      <div
                        className="font-extrabold uppercase leading-snug tracking-wide text-slate-900"
                        style={{ fontSize: punto(12.5) }}
                      >
                        {tasarim && props.resmiBaslikTasarim ? props.resmiBaslikTasarim : props.resmiBaslik}
                        {props.grupEtiketi ? ` · ${props.grupEtiketi}` : ""}
                      </div>
                      {/* `mt-auto`: kimlik/sonuç bloğu antetin ALTINA, çizginin
                          hemen üstüne yapışır. Logo metinden uzunsa artan boşluk
                          bloğun ALTINDA kalıyordu ve öğretmen bunu "çirkin" diye
                          bildirdi. Boşluk yoksa (yazılı kipi: kimlik alanı zaten
                          logodan uzun) bu marj hiçbir şey yapmaz. */}
                      <div
                        className="mt-auto pt-3 text-left text-slate-800"
                        style={{ fontSize: punto(10) }}
                      >
                    {props.kimlikAlaniGoster && (
                      <div
                        className="grid gap-x-5 gap-y-1.5"
                        style={{
                          gridTemplateColumns: props.yazdirmaModu
                            ? "1fr 42mm"
                            : "1fr 140px",
                        }}
                      >
                        <div>
                          <b>Adı Soyadı:</b>
                        </div>
                        <div>
                          <b>Sınıf:</b>
                        </div>
                        <div>
                          <b>No:</b>
                        </div>
                        {props.kimlikPuanGoster !== false && (
                          <div>
                            <b>Puan:</b>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Test kipinde kimlik bloğu bilerek gizli ("kağıdın
                        üstünde yalnızca başlık görünür"), ama öğrencinin
                        sonucunu yazacağı bir yer yoktu. Kutu o kararı
                        bozmadan tek satır ekliyor: ad/okul yine yok, yalnız
                        değerlendirme alanı var. Çizgiler alt kenarlık —
                        arka plan DEĞİL: tarayıcılar yazdırırken arka planları
                        atar (§13.1'in dersi). */}
                    {props.testSonucKutusu && (
                      <div
                        className="mt-1 flex items-center justify-end gap-4"
                        style={{ fontSize: punto(10) }}
                      >
                        {["Doğru", "Yanlış", "Net"].map((etiket) => (
                          <span key={etiket} className="inline-flex items-baseline gap-1.5">
                            <b>{etiket}:</b>
                            <span
                              style={{
                                display: "inline-block",
                                width: olcu(14),
                                borderBottom: "1px solid #334155",
                              }}
                            />
                          </span>
                        ))}
                      </div>
                    )}
                    {(props.tarih || props.sureDakika) && (
                      <div className="mt-2 text-right">
                        {props.tarih && (
                          <span>
                            <b>Tarih:</b> {props.tarih}
                          </span>
                        )}
                        {props.tarih && props.sureDakika && (
                          <span> &nbsp;&nbsp; </span>
                        )}
                        {props.sureDakika && (
                          <span>
                            <b>Süre:</b> {props.sureDakika} dk
                          </span>
                        )}
                      </div>
                    )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Sütun ayırıcısı artık HER SÜTUN BANDININ içinde çiziliyor (sayfa
                  boyu tek çizgi değil): tam genişlik bir soru iki sütunlu
                  düzende araya girince eski sayfa boyu çizgi onun yazısının ve
                  şeklinin ÜSTÜNDEN geçiyordu. Sayfadaki SON bant tam genişlikli
                  bir sorudan önce bitmiyorsa kalan yüksekliği doldurur, yani
                  yalnız sütunlu sayfalar eskisi gibi dibe kadar çizgili kalır. */}
              <div
                className="relative flex-1"
                style={{
                  marginTop: sayfaIndex === 0 ? olcu(4) : 0,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {sayfa.bantlar.map((bant, bantIndex) =>
                  bant.tip === "tam" ? (
                    <div key={`tam-${bant.soru.id}`}>
                      {blok(bant.soru, props.tamIcerikMm)}
                    </div>
                  ) : (
                    <div
                      key={`sutun-${sayfa.sayfaNo}-${bantIndex}`}
                      style={{
                        display: "flex",
                        alignItems: "stretch",
                        flex: bantIndex === sayfa.bantlar.length - 1 ? "1 0 auto" : "0 0 auto",
                      }}
                    >
                      <div style={{ width: olcu(props.sutunIcerikMm) }}>
                        {bant.sol.map((soru) =>
                          blok(soru, props.sutunIcerikMm),
                        )}
                      </div>
                      {/* Sütun boşluğu + (açıksa) ayırıcı çizgi. ÇİZGİ KENARLIKLA
                          çizilir, arka planla DEĞİL: tarayıcılar yazdırırken
                          arka plan renklerini atar, kenarlıkları atmaz. Konum
                          ortada: `olcu` ekranda sayı, yazdırmada "mm" metni
                          döndürdüğü için calc() içinde toplanmaz, %50 kullanılır. */}
                      <div style={{ width: olcu(props.sutunAraMm), position: "relative", flexShrink: 0 }}>
                        {props.sutunAyirici && (
                          <div
                            aria-hidden="true"
                            style={{
                              position: "absolute",
                              top: 0,
                              bottom: 0,
                              left: "50%",
                              width: 0,
                              marginLeft: -0.75,
                              borderLeft: "1.5px solid #000000",
                            }}
                          />
                        )}
                      </div>
                      <div style={{ width: olcu(props.sutunIcerikMm) }}>
                        {bant.sag.map((soru) =>
                          blok(soru, props.sutunIcerikMm),
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>

              {/* Cevap anahtarı testin SONUNDA: son sayfada, son sorunun
                  altında, imzanın üstünde. Yerleşim bu bloğa `anahtarMm` ile
                  yer ayırıyor — ayırmasaydı son soru fiziksel sayfadan taşardı
                  (imza bloğunun §14'te yaşadığı hatanın aynısı). */}
              {sonSayfa && props.cevapAnahtari && props.cevapAnahtari.length > 0 && (
                <div style={{ marginTop: olcu(ANAHTAR_UST_BOSLUK_MM) }}>
                  <CevapAnahtariBlogu
                    satirlar={props.cevapAnahtari}
                    grupEtiketi={props.grupEtiketi}
                    yazdirmaModu={props.yazdirmaModu}
                  />
                </div>
              )}
              {sonSayfa && (
                <OgretmenImzaAlani
                  ogretmenler={props.ogretmenler}
                  yazdirmaModu={props.yazdirmaModu}
                />
              )}
              {props.sayfaNoGoster && (
                <div
                  className="text-slate-400"
                  style={{
                    position: "absolute",
                    right: olcu(5),
                    bottom: olcu(2.5),
                    fontSize: punto(6),
                    lineHeight: 1,
                  }}
                >
                  {sayfa.sayfaNo}/{sayfalar.length}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {!props.yazdirmaModu && (
        <div className="mx-auto" style={{ width: mmPx(A4_GENISLIK_MM) }}>
          {(props.yerlesimUyarilari ?? []).length === 0 ? (
            <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              <CheckCircle2 size={14} className="shrink-0" /> Yerleşim uygun
              görünüyor. Sorular sayfalara gerçek ölçüleriyle dağıtıldı.
            </p>
          ) : (
            <div className="space-y-1.5">
              {(props.yerlesimUyarilari ?? []).map((uyari) => (
                <UyariBanner
                  key={uyari.tip}
                  renk={uyari.tip === "genislik" ? "amber" : "rose"}
                  adet={uyari.adet}
                  onClick={() => uyariTikla(uyari.ilkSoruId)}
                >
                  <AlertTriangle size={14} className="shrink-0" />
                  {uyari.tip === "sayfaAsimi" &&
                    "Tek sayfaya sığmıyor. Görseli küçültün, cevap satırlarını azaltın ya da soruyu tam genişliğe alın."}
                  {uyari.tip === "metinDar" &&
                    "Görselin yanındaki metin için yer kalmamış; kelimeler harf harf bölünüyor. Görseli küçültün ya da metin konumunu değiştirin."}
                  {uyari.tip === "genislik" &&
                    "Görsel bulunduğu alandan geniş; otomatik sığdırıldı. İsterseniz panelden boyutunu netleştirin."}
                </UyariBanner>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UyariBanner({
  renk,
  adet,
  onClick,
  children,
}: {
  renk: "rose" | "amber";
  /** Kaç soruyu etkiliyor. Önceden hiçbir yerde yazmıyordu. */
  adet: number;
  onClick: () => void;
  children: ReactNode;
}) {
  const renkSinif =
    renk === "rose"
      ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
      : "bg-amber-50 text-amber-700 hover:bg-amber-100";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${renkSinif}`}
    >
      <span className="shrink-0 rounded-md bg-white/70 px-1.5 py-0.5 text-[11px] font-bold">
        {adet} soru
      </span>
      <span className="flex flex-1 items-center gap-2">{children}</span>
      <span className="shrink-0 whitespace-nowrap text-[11px] font-bold underline underline-offset-2">
        İlkine git →
      </span>
    </button>
  );
}

function SayfaDolulukSatiri({
  sayfa,
  toplamSayfa,
  sonSayfa,
  ortalamaSoruMm,
}: {
  sayfa: SayfaYerlesimi;
  toplamSayfa: number;
  sonSayfa: boolean;
  ortalamaSoruMm: number;
}) {
  const yuzde = Math.min(
    100,
    Math.round((sayfa.kullanilanMm / sayfa.kapasiteMm) * 100),
  );
  const kalanMm = Math.max(0, sayfa.kapasiteMm - sayfa.kullanilanMm);
  const sigacak = ortalamaSoruMm > 4 ? Math.floor(kalanMm / ortalamaSoruMm) : 0;
  const renk =
    yuzde >= 97
      ? "bg-rose-500"
      : yuzde >= 85
        ? "bg-amber-500"
        : "bg-emerald-500";
  return (
    <div className="mx-auto mb-2" style={{ width: mmPx(A4_GENISLIK_MM) }}>
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
        <span>
          Sayfa {sayfa.sayfaNo} / {toplamSayfa}
        </span>
        <span>
          %{yuzde} dolu
          {sonSayfa &&
            sigacak > 0 &&
            ` · kalan alana ≈ ${sigacak} soru daha sığar`}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full ${renk}`}
          style={{ width: `${yuzde}%` }}
        />
      </div>
    </div>
  );
}

/**
 * "CEVAP ANAHTARI" başlığı + şıkların ızgarası.
 *
 * TEK kaynak: hem ayrı sayfaya basılan anahtar hem testin sonuna eklenen
 * anahtar bunu kullanıyor. İki kopya olsaydı sütun sayısı ya da punto birinde
 * değişip diğerinde kalabilirdi — ve testin sonundaki kopyada bu, yerleşimin
 * ayırdığı yerle (`cevapAnahtariYuksekligiMm`) tutmayan bir blok demek olurdu.
 *
 * `lineHeight` AÇIKÇA veriliyor: yükseklik hesabı bu çarpandan türetiliyor,
 * tarayıcının varsayılanına bırakılırsa hesapla çizim sessizce ayrışır.
 */
export function CevapAnahtariBlogu({
  satirlar,
  ustBaslik,
  grupEtiketi,
  yazdirmaModu,
}: {
  satirlar: { sira: number; cevap: string }[];
  /** Ayrı sayfada sınavın resmi başlığı da yazılır; testin sonunda o başlık
   *  zaten 1. sayfanın tepesinde olduğu için tekrarlanmaz. */
  ustBaslik?: string;
  grupEtiketi?: string;
  yazdirmaModu?: boolean;
}) {
  if (satirlar.length === 0) return null;
  return (
    <div>
      <div style={{ textAlign: "center", fontWeight: 700 }}>
        {ustBaslik && (
          <div
            style={{
              fontSize: puntoOlcu(ANAHTAR_UST_BASLIK_PUNTO, yazdirmaModu),
              lineHeight: ANAHTAR_SATIR_YUKSEKLIK,
            }}
          >
            {ustBaslik}
          </div>
        )}
        <div
          style={{
            fontSize: puntoOlcu(ANAHTAR_BASLIK_PUNTO, yazdirmaModu),
            lineHeight: ANAHTAR_SATIR_YUKSEKLIK,
            // Üst başlık yalnız ayrı sayfada var; testin sonunda çizilmediği
            // için bu boşluk da orada 0 — rezerv hesabı bu yüzden onu saymıyor.
            marginTop: ustBaslik ? mmOlcu(ANAHTAR_UST_BASLIK_ARA_MM, yazdirmaModu) : 0,
            marginBottom: mmOlcu(ANAHTAR_BASLIK_ALT_MM, yazdirmaModu),
          }}
        >
          CEVAP ANAHTARI{grupEtiketi ? ` — ${grupEtiketi}` : ""}
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${ANAHTAR_SUTUN}, 1fr)`,
          columnGap: mmOlcu(8, yazdirmaModu),
          rowGap: mmOlcu(ANAHTAR_SATIR_ARA_MM, yazdirmaModu),
          fontSize: puntoOlcu(ANAHTAR_PUNTO, yazdirmaModu),
          lineHeight: ANAHTAR_SATIR_YUKSEKLIK,
        }}
      >
        {satirlar.map((satir) => (
          <div key={satir.sira} style={{ display: "flex", gap: mmOlcu(2, yazdirmaModu) }}>
            <span style={{ fontWeight: 700, minWidth: mmOlcu(8, yazdirmaModu) }}>
              {satir.sira})
            </span>
            <span>{satir.cevap}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OgretmenImzaAlani({
  ogretmenler,
  yazdirmaModu,
}: {
  ogretmenler: string[];
  yazdirmaModu?: boolean;
}) {
  const gorunecekler = ogretmenler.map((ad) => ad.trim()).filter(Boolean);
  if (gorunecekler.length === 0) return null;
  return (
    <div
      className="mt-auto flex flex-wrap justify-end gap-x-10 gap-y-3 text-right"
      style={{
        fontSize: puntoOlcu(10, yazdirmaModu),
        paddingTop: mmOlcu(6, yazdirmaModu),
      }}
    >
      {gorunecekler.map((ad) => (
        <div key={ad}>
          <div className="font-semibold text-slate-800">{ad}</div>
          <div
            className="text-slate-500"
            style={{ fontSize: puntoOlcu(8, yazdirmaModu) }}
          >
            İmza
          </div>
        </div>
      ))}
    </div>
  );
}

/** Sorunun altındaki boşluğu (marginBottom) çizgili ya da kareli gösterir.
 *  Mutlak konumlu: yerleşim ölçümüne hiç etki etmez, yalnız mevcut boşluğu doldurur.
 *  Kâğıt B/Y basıldığı için tek tonlu ince çizgi kullanılır. */
function CevapAlaniCizgisi({ soru, yazdirmaModu }: { soru: SoruOgesi; yazdirmaModu?: boolean }) {
  const tur = soru.cevapAlani;
  if ((tur !== "cizgi" && tur !== "kare") || !(soru.boslukMm > 0)) return null;
  const adim = tur === "cizgi" ? SATIR_MM : 5;
  const yukseklik = Math.floor(soru.boslukMm / adim) * adim;
  if (yukseklik <= 0) return null;
  const renk = "#8a8a8a";
  // mmOlcu ekranda birimsiz sayı döner (px); gradient boyutu birim ister.
  const birim = (mm: number) => (yazdirmaModu ? `${mm}mm` : `${mmPx(mm)}px`);
  const a = birim(adim);
  const kalin = birim(0.25);
  const cizgi = `linear-gradient(to bottom, transparent calc(100% - ${kalin}), ${renk} 0)`;
  const dikey = `linear-gradient(to right, transparent calc(100% - ${kalin}), ${renk} 0)`;
  return (
    <div
      aria-hidden="true"
      data-testid="cevap-alani-cizgi"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: "100%",
        height: mmOlcu(yukseklik, yazdirmaModu),
        pointerEvents: "none",
        backgroundImage: tur === "cizgi" ? cizgi : `${cizgi}, ${dikey}`,
        backgroundSize: tur === "cizgi" ? `100% ${a}` : `100% ${a}, ${a} 100%`,
        // Karelerde desen yalnız alt/sağ kenarları çizer; üst, sol ve (son kare yarım kalırsa) sağ kenar kapanmazsa ızgara açık kalır.
        boxShadow: tur === "kare" ? `inset 0 ${kalin} 0 ${renk}, inset ${kalin} 0 0 ${renk}, inset -${kalin} 0 0 ${renk}` : undefined,
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    />
  );
}

/** MEB tarzı başlık: solda logo, ortada serbest satırlar, sağ üstte "Toplam Puan" kutusu,
 *  altta tek satırda üç çizgili kimlik alanı. Çizgiler kenarlıkla çizilir (yazdırmada arka plan atılır). */
function MerkezBaslik({
  satirlar, grupEtiketi, logoDataUrl, logoMm, puanKutusu, kimlik, tarih, sureDakika, olcu, punto,
}: {
  satirlar: string[];
  grupEtiketi?: string;
  logoDataUrl?: string;
  logoMm: number;
  puanKutusu: boolean;
  kimlik: boolean;
  tarih?: string;
  sureDakika?: string;
  olcu: (mm: number) => string | number;
  punto: (pt: number) => string | number;
}) {
  const yan = olcu(34);
  const cizgi = "1px solid #334155";
  return (
    <div style={{ paddingBottom: olcu(2) }} data-testid="baslik-merkez">
      <div style={{ display: "flex", alignItems: "center", gap: olcu(3) }}>
        <div style={{ width: yan, flexShrink: 0, display: "flex", alignItems: "center" }}>
          {logoDataUrl && (
            <img src={logoDataUrl} alt="Logo" style={{ width: olcu(logoMm), height: olcu(logoMm), objectFit: "contain" }} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0, textAlign: "center", fontSize: punto(10.5), lineHeight: 1.45, color: "#0f172a" }}>
          {satirlar.map((s, i) => (
            <div key={i}>{s}</div>
          ))}
          {grupEtiketi ? <div style={{ fontWeight: 700 }}>{grupEtiketi}</div> : null}
        </div>
        <div style={{ width: yan, flexShrink: 0, display: "flex", justifyContent: "flex-end" }}>
          {puanKutusu && (
            <div style={{ width: olcu(30), border: cizgi, borderRadius: olcu(1.5), textAlign: "center", fontSize: punto(9.5) }}>
              <div style={{ borderBottom: cizgi, padding: `${olcu(0.8)} 0` }}>Toplam Puan</div>
              <div style={{ height: olcu(9) }} />
            </div>
          )}
        </div>
      </div>
      {kimlik && (
        <div style={{ display: "flex", gap: olcu(5), marginTop: olcu(3), fontSize: punto(10) }}>
          {["Adı ve Soyadı:", "Sınıfı/Şubesi:", "Öğrenci Numarası:"].map((e, i) => (
            <div key={e} style={{ flex: i === 0 ? 1.3 : 1, display: "flex", alignItems: "flex-end", borderBottom: cizgi, paddingBottom: olcu(0.3) }}>
              {e}
            </div>
          ))}
        </div>
      )}
      {(tarih || sureDakika) && (
        <div style={{ marginTop: olcu(1.5), textAlign: "right", fontSize: punto(9.5) }}>
          {tarih && <span><b>Tarih:</b> {tarih}</span>}
          {tarih && sureDakika && <span> &nbsp;&nbsp; </span>}
          {sureDakika && <span><b>Süre:</b> {sureDakika} dk</span>}
        </div>
      )}
    </div>
  );
}

function SoruBlok({
  soru,
  sira,
  secili,
  tasarimModu,
  testModu,
  sikBicimi,
  sikDuzeni,
  onDogruSik,
  icerikGenislikMm,
  kapasiteDevamMm,
  yukMm,
  onSec,
  onGenislikMm,
  onGorselYukseklikMm,
  onEkGorselGenislik,
  onEkGorselSil,
  yazdirmaModu,
  gorselAzamiYukMm,
}: {
  /** Görsel/çizim yüksekliği üst sınırı (mm): sayfaya sığmayan görsel orantılı küçülür. */
  gorselAzamiYukMm?: number;
  soru: SoruOgesi;
  sira: number;
  secili: boolean;
  tasarimModu: boolean;
  testModu?: boolean;
  sikBicimi?: SikBicimi;
  sikDuzeni?: SikDuzeni;
  /** Test kipinde seçili sorunun üstünde çıkan hızlı A–E şeridi. Verilmezse
   *  çizilmez (yazılı kipi ve baskı yolu bu prop'u hiç vermiyor). */
  onDogruSik?: (sik: string | undefined) => void;
  icerikGenislikMm: number;
  kapasiteDevamMm: number;
  yukMm: number;
  onSec: () => void;
  onGenislikMm: (mm: number) => void;
  onGorselYukseklikMm?: (mm: number | null) => void;
  onEkGorselGenislik?: (parcaId: string, mm: number) => void;
  onEkGorselSil?: (parcaId: string) => void;
  yazdirmaModu?: boolean;
}) {
  const toplamMm = yukMm + soru.boslukMm;
  const sayfaYuzde = Math.round((toplamMm / kapasiteDevamMm) * 100);
  const asiyor = toplamMm > kapasiteDevamMm;
  // ERİŞİLEBİLİRLİK: tasarım modunda soru bloğu bir SEÇİM DENETİMİ. Önceden
  // yalnız `onClick`li bir div'di — klavyeyle seçmek imkânsızdı ve ekran
  // okuyucu blokla etkileşilebildiğini hiç bilmiyordu. Kâğıt katmanı çıktıya
  // gitmediği için gözden kaçmıştı.
  //
  // Öznitelikler YALNIZ tasarım modunda veriliyor: çıktı/önizleme modunda blok
  // tıklanabilir değil, oraya `role="button"` koymak ekran okuyucuya var olmayan
  // bir etkileşim vaat ederdi.
  const secimOzellikleri = tasarimModu
    ? {
        role: "button" as const,
        tabIndex: 0,
        "aria-pressed": secili,
        "aria-label": `${sira}. soruyu seç`,
        onKeyDown: (e: React.KeyboardEvent) => {
          // Space sayfayı kaydırır; button semantiği ikisini de bekler.
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSec();
          }
        },
      }
    : {};

  return (
    <div
      onClick={tasarimModu ? onSec : undefined}
      {...secimOzellikleri}
      style={{
        marginBottom: mmOlcu(soru.boslukMm, yazdirmaModu),
        position: "relative",
        cursor: tasarimModu ? "pointer" : "default",
        borderRadius: 6,
        outline: tasarimModu && secili ? "2px solid #93c5fd" : undefined,
        outlineOffset: 3,
      }}
    >
      <CevapAlaniCizgisi soru={soru} yazdirmaModu={yazdirmaModu} />
      {tasarimModu && (
        // Rozet SAĞ ÜSTTE ve tamamen kutunun DIŞINDA duruyor.
        // Eskiden `top:-10, left:8`'di: 18px'lik rozetin alt 8px'i kutunun
        // içine sarkıyor ve tam da soru numarasının ("1)") üstüne biniyordu —
        // beş sorunun beşinde birden, ekranda sürekli.
        // `top:-18` rozetin ALT kenarını kutunun üst kenarına oturtuyor, sağa
        // alınması da ilk satırın metin başlangıcından uzaklaştırıyor.
        // Kutu modeline (padding/margin) DOKUNULMADI: ölçüm alanı bu
        // bileşenlerin aynısını kullanıyor, boyut değiştirmek sayfalamayı ve
        // dolayısıyla çıktıyı kaydırırdı (§13.1'de düzeltilen hata sınıfı).
        <span
          style={{
            position: "absolute",
            top: -18,
            right: 8,
            zIndex: 5,
            pointerEvents: "none",
          }}
          className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ring-1 ${
            asiyor
              ? "bg-rose-50 text-rose-700 ring-rose-200"
              : secili
                ? "bg-brand-50 text-brand-700 ring-brand-200"
                : "bg-white text-slate-400 ring-slate-200"
          }`}
        >
          {asiyor ? "Sığmıyor" : `~%${sayfaYuzde} alan`}
        </span>
      )}
      {/* Hızlı doğru şık — SEÇİLİ soruda, kutunun DIŞINDA, sol üstte.
          Öğretmen "cevap eksikse soruyu seçince hemen işaretleyebilsem" dedi:
          şık yalnız yan paneldeydi, yani kâğıtta soruyu bulup panelde
          işaretlemek iki ayrı yere bakmak demekti. Yalnız tasarım kipinde ve
          `onDogruSik` verildiğinde (test kipi) çizilir; baskı yolu bu prop'u
          hiç vermediği için kâğıda düşmesi mümkün DEĞİL.
          `stopPropagation`: şeride tıklamak soruyu yeniden seçip kaydırma
          efektini boşuna tetikliyordu. */}
      {tasarimModu && secili && onDogruSik && (
        <div
          style={{ position: "absolute", top: -20, left: 8, zIndex: 6 }}
          className="flex items-center gap-1 rounded-full bg-white px-1.5 py-0.5 ring-1 ring-slate-200"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="pr-0.5 text-[9px] font-semibold text-slate-400">Doğru şık</span>
          {["A", "B", "C", "D", "E"].map((harf) => {
            const isaretli = soru.dogruSik === harf;
            return (
              <button
                key={harf}
                type="button"
                aria-pressed={isaretli}
                aria-label={`Doğru şık ${harf}`}
                onClick={() => onDogruSik(isaretli ? undefined : harf)}
                className={`h-4 w-4 rounded-full text-[9px] font-bold leading-none transition ${
                  isaretli
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {harf}
              </button>
            );
          })}
        </div>
      )}
      <SoruIcerik
        soru={soru}
        sira={sira}
        icerikGenislikMm={icerikGenislikMm}
        tasarimModu={tasarimModu}
        testModu={testModu}
        sikBicimi={sikBicimi}
        sikDuzeni={sikDuzeni}
        secili={secili}
        onGenislikMm={onGenislikMm}
        onGorselYukseklikMm={onGorselYukseklikMm}
        onEkGorselGenislik={onEkGorselGenislik}
        onEkGorselSil={onEkGorselSil}
        yazdirmaModu={yazdirmaModu}
        gorselAzamiYukMm={gorselAzamiYukMm}
      />
    </div>
  );
}

// Kağıt üzerindeki soru gösterimi. Hem önizlemede hem gizli ölçüm alanında
// birebir aynı bileşen kullanılır; sayfalama bu yüzden gerçek ölçüye dayanır.
// PERFORMANS: memo şart. Gizli ölçüm katmanı her soruyu İKİNCİ kez render
// ediyor ve her SoruIcerik metni DOMPurify'dan geçiriyor; memo olmadan tek bir
// tuş vuruşu 30 soruluk bir sınavda 60 render + 60 sanitizasyon demekti.
// soruGuncelle dokunulmayan soruların nesne kimliğini koruduğu için (map +
// koşullu kopya) memo burada gerçekten tutuyor.
function SoruIcerikTemel({
  soru,
  sira,
  icerikGenislikMm,
  tasarimModu,
  testModu,
  sikBicimi,
  sikDuzeni,
  secili = false,
  onGenislikMm,
  onGorselYukseklikMm,
  onEkGorselGenislik,
  onEkGorselSil,
  yazdirmaModu,
  gorselAzamiYukMm,
}: {
  gorselAzamiYukMm?: number;
  soru: SoruOgesi;
  sira: number;
  icerikGenislikMm: number;
  tasarimModu: boolean;
  testModu?: boolean;
  sikBicimi?: SikBicimi;
  sikDuzeni?: SikDuzeni;
  secili?: boolean;
  onGenislikMm?: (mm: number) => void;
  /** `null` = serbest yüksekliği bırak, orana dön. */
  onGorselYukseklikMm?: (mm: number | null) => void;
  onEkGorselGenislik?: (parcaId: string, mm: number) => void;
  onEkGorselSil?: (parcaId: string) => void;
  yazdirmaModu?: boolean;
}) {
  const puan = soru.gosterilenPuan !== undefined ? soru.gosterilenPuan : soruPuani(soru);
  const olcu = (mm: number) => mmOlcu(mm, yazdirmaModu);
  const punto = (pt: number) => puntoOlcu(pt, yazdirmaModu);
  // Puanı ayrı bir sağ sütunda tutmak özellikle çift sütunlu sınavlarda soru
  // gövdesini gereksiz daraltıyordu. Numara oluğu puanı da ikinci satırda
  // taşıyacak kadar küçük bir sabit alan olarak kullanılır.
  const numaraMm = 7;
  const { govdeMm, yanYana, maxGorselMm, gorselMm, metinAlaniMm } =
    gorselYerlesimHesapla(soru, icerikGenislikMm, gorselAzamiYukMm);
  const gorselYuzde = Math.round((gorselMm / govdeMm) * 100);

  const ekGorseller = soru.ekGorseller ?? [];
  const ekYan = ekGorseller.filter((parca) => parca.konum === "yan");
  const ekAlt = ekGorseller.filter((parca) => parca.konum === "alt");

  function ekGorselGorunum(
    parca: NonNullable<SoruOgesi["ekGorseller"]>[number],
  ) {
    const parcaMaxMm =
      parca.konum === "yan" ? Math.max(18, govdeMm * 0.38) : govdeMm;
    let parcaMm = Math.min(parca.genislikMm, parcaMaxMm);
    if (gorselAzamiYukMm && parca.oran > 0) {
      parcaMm = Math.min(parcaMm, Math.max(8, gorselAzamiYukMm * parca.oran));
    }
    const duzenlenebilir = tasarimModu && secili;
    return (
      <span
        key={parca.id}
        style={{
          position: "relative",
          display: "inline-block",
          maxWidth: "100%",
        }}
      >
        <img
          src={parca.dataUrl}
          alt={parca.dosyaAdi ?? "Ek görsel parçası"}
          className={
            tasarimModu ? "rounded border border-slate-200 bg-white" : undefined
          }
          style={{
            width: olcu(parcaMm),
            display: "block",
            // Ana görselle aynı gerekçe (bkz. anaGorsel): ölçüm decode'u
            // bekleyemez. Parçada `oran` zorunlu alan, koşul gerekmiyor.
            aspectRatio: String(parca.oran),
          }}
          draggable={false}
        />
        {duzenlenebilir && onEkGorselSil && (
          <button
            type="button"
            title="Bu parçayı sil"
            onClick={(e) => {
              e.stopPropagation();
              onEkGorselSil(parca.id);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              top: -8,
              right: -8,
              width: 18,
              height: 18,
              zIndex: 7,
              lineHeight: 1,
            }}
            className="flex items-center justify-center rounded-full border-2 border-white bg-rose-600 text-[11px] font-bold text-white shadow"
          >
            ×
          </button>
        )}
        {duzenlenebilir && onEkGorselGenislik && (
          <>
            <span
              style={{ position: "absolute", bottom: 3, left: 3 }}
              className="rounded bg-slate-900/70 px-1 py-0.5 text-[9px] font-semibold text-white"
            >
              {Math.round(parcaMm)} mm
            </span>
            <BoyutTutamaci
              baslangicMm={parcaMm}
              maxMm={parcaMaxMm}
              minMm={8}
              onChange={(mm) => onEkGorselGenislik(parca.id, mm)}
            />
          </>
        )}
      </span>
    );
  }

  const anaGorsel = soru.gorselDataUrl ? (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        maxWidth: "100%",
      }}
    >
      <img
        src={soru.gorselDataUrl}
        alt={soru.dosyaAdi ?? "Soru görseli"}
        className={
          tasarimModu ? "rounded border border-slate-200 bg-white" : undefined
        }
        style={{
          width: olcu(gorselMm),
          display: "block",
          // Yükseklik, görsel YÜKLENMEDEN belli olmalı. Yalnız width verildiğinde
          // kutunun yüksekliği img'in doğal oranından gelir, o da decode bitene
          // kadar bilinmez: Screen'deki ölçüm useLayoutEffect'i o an çalışıp
          // olduğundan KISA bir yükseklik kaydeder ve resim sonradan yüklenince
          // React render'ı tetiklenmediği için değer güncellenmez → sayfaya
          // sığmayan soru sessizce sığıyor sanılır. gorselOran zaten kayıtlı
          // (naturalWidth/naturalHeight, CSS aspect-ratio ile aynı yön).
          // SERBEST YÜKSEKLİK varsa oran bırakılır: görsel dikeyde uzayıp
          // kısalabilsin diye `height` doğrudan veriliyor. Yoksa eski davranış
          // aynen sürüyor (yükseklik orandan gelir).
          ...(soru.gorselYukseklikMm
            ? { height: olcu(gorselAzamiYukMm ? Math.min(soru.gorselYukseklikMm, gorselAzamiYukMm) : soru.gorselYukseklikMm), aspectRatio: undefined }
            : { aspectRatio: soru.gorselOran ? String(soru.gorselOran) : undefined }),
        }}
        draggable={false}
      />
      {tasarimModu && secili && onGenislikMm && (
        <>
          <span
            style={{ position: "absolute", top: 3, right: 3 }}
            className="rounded bg-slate-900/70 px-1.5 py-0.5 text-[9px] font-semibold text-white"
          >
            alanın %{gorselYuzde}'i · {Math.round(gorselMm)} mm
            {soru.gorselYukseklikMm ? ` × ${Math.round(soru.gorselYukseklikMm)} mm` : ""}
          </span>
          {/* Serbest yükseklik verilmişken orana dönmenin GÖRÜNÜR yolu.
              Köşe tutamacı da temizliyor ama onu keşfetmek için sürüklemek
              gerekiyor; burada tek tık. */}
          {soru.gorselYukseklikMm && onGorselYukseklikMm && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onGorselYukseklikMm(null); }}
              title="Görselin kendi oranına dön"
              style={{ position: "absolute", top: 3, left: 3 }}
              className="rounded bg-white/90 px-1.5 py-0.5 text-[9px] font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-white"
            >
              orana dön
            </button>
          )}
          <BoyutTutamaci
            baslangicMm={gorselMm}
            maxMm={maxGorselMm}
            minMm={8}
            onChange={(mm) => {
              onGenislikMm(mm);
              // Köşe = ORANTILI. Serbest yükseklik varken köşeden çekmek
              // oranı geri kurar; iki tutamacın anlamı böyle ayrışıyor.
              if (soru.gorselYukseklikMm && onGorselYukseklikMm) onGorselYukseklikMm(null);
            }}
          />
          {onGorselYukseklikMm && (
            <YukseklikTutamaci
              baslangicMm={soru.gorselYukseklikMm ?? gorselMm / Math.max(0.3, soru.gorselOran ?? 1.35)}
              onChange={onGorselYukseklikMm}
            />
          )}
        </>
      )}
    </span>
  ) : null;

  const gorsel = anaGorsel ? (
    <span style={{ display: "inline-block", maxWidth: "100%" }}>
      {ekYan.length > 0 ? (
        <span
          style={{
            display: "inline-flex",
            alignItems: "flex-start",
            gap: olcu(3),
            maxWidth: "100%",
          }}
        >
          {anaGorsel}
          <span
            style={{
              display: "inline-flex",
              flexDirection: "column",
              gap: olcu(2),
            }}
          >
            {ekYan.map(ekGorselGorunum)}
          </span>
        </span>
      ) : (
        anaGorsel
      )}
      {ekAlt.length > 0 && (
        <span
          style={{
            display: "flex",
            flexDirection: "column",
            gap: olcu(2),
            marginTop: olcu(2),
          }}
        >
          {ekAlt.map(ekGorselGorunum)}
        </span>
      )}
    </span>
  ) : null;

  const kokHtml = soru.tur === "metin" ? soru.metinHtml : soru.altMetinHtml;
  const kokVarMi = !!(kokHtml && htmlToText(kokHtml));
  const kok = kokVarMi ? <RichTextGorunum html={kokHtml} /> : null;
  const metinDarMi =
    tasarimModu &&
    yanYana &&
    kokVarMi &&
    metinAlaniMm < METIN_ALANI_DAR_ESIK_MM;

  const maddeKolonEtkin = etkinMaddeKolon(
    soru,
    icerikGenislikMm,
    sikDuzeni,
  );
  const maddeler =
    soru.maddeler.length > 0 ? (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${maddeKolonEtkin}, minmax(0, 1fr))`,
          columnGap: olcu(maddeKolonEtkin > soru.maddeKolon ? OTOMATIK_SUTUN_ARASI_MM : 6),
          rowGap: olcu(1.5),
          marginTop: olcu(2),
        }}
      >
        {soru.maddeler.map((madde, index) => (
          <div key={madde.id} data-madde-oge="1">
            <div
              style={{
                display: "flex",
                gap: olcu(1.5),
                alignItems: "baseline",
              }}
            >
              <span style={{ width: olcu(7), fontWeight: 700, flexShrink: 0 }}>
                <span>{maddeHarfi(index + (soru.maddeHarfBaslangic ?? 0), testModu, sikBicimi)})</span>
                {madde.puan != null && (
                  <span
                    data-madde-puan-konumu="harf-alti"
                    title={`${madde.puan} puan`}
                    aria-label={`${madde.puan} puan`}
                    style={{
                      display: "block",
                      marginTop: olcu(0.4),
                      color: "#475569",
                      fontSize: "0.72em",
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {madde.puan}P
                  </span>
                )}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <RichTextGorunum html={madde.metinHtml} />
              </div>
            </div>
            {madde.cevapSatir > 0 && !testModu && (
              <div
                style={{
                  height: olcu(madde.cevapSatir * SATIR_MM),
                  marginTop: olcu(1),
                }}
                className={
                  tasarimModu
                    ? "rounded border border-dashed border-slate-200"
                    : undefined
                }
              >
                {tasarimModu && (
                  <span className="px-1 text-[9px] text-slate-300">
                    {madde.cevapSatir} satır cevap alanı
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    ) : null;

  return (
    <div
      data-onizleme-id={soru.id}
      data-soru-tur={soru.tur}
      style={{
        fontSize: punto(soru.punto),
        lineHeight: 1.45,
        color: "#0f172a",
        fontFamily: "'Times New Roman', Times, serif",
      }}
    >
      {!soru.devamParcasi && soru.bolumBasligi?.trim() && (
        <div
          style={{
            fontWeight: 700,
            marginBottom: olcu(2),
            paddingBottom: olcu(1),
            borderBottom: "1px solid #94a3b8",
          }}
        >
          {soru.bolumBasligi}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        <span style={{ width: olcu(numaraMm), flexShrink: 0, fontWeight: 700 }}>
          <span>{soru.devamParcasi ? "" : `${sira})`}</span>
          {puan != null && (
            <span
              data-puan-konumu="numara-alti"
              title={`${puan} puan`}
              aria-label={`${puan} puan`}
              style={{
                display: "block",
                marginTop: olcu(0.5),
                color: "#475569",
                fontSize: "0.72em",
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}
            >
              {puan}P
            </span>
          )}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          {soru.tur === "metin" ? (
            <>
              {kok}
              {maddeler}
            </>
          ) : yanYana ? (
            <>
            <div
              style={{
                display: "flex",
                gap: olcu(3),
                flexDirection:
                  soru.metinKonumu === "sol" ? "row-reverse" : "row",
              }}
            >
              <div style={{ flexShrink: 0 }}>{gorsel}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {metinDarMi && (
                  <div
                    className="mb-1 rounded bg-rose-50 px-1.5 py-1 text-[9px] font-semibold leading-tight text-rose-600 ring-1 ring-rose-200"
                    style={{ fontFamily: "inherit" }}
                  >
                    Metne ≈{Math.round(metinAlaniMm)} mm kaldı, çok dar —
                    kelimeler harf harf bölünebilir. Görseli küçültün.
                  </div>
                )}
                {kok}
              </div>
            </div>
            {/* Şıklar/maddeler görselin YANINDA değil ALTINDA, gövdenin TAM
                genişliğinde: "Sağda/Solda" seçilince görsel zaten ~%60'a
                küçülüyor, şıkları da dar metin sütununa sıkıştırmak harf harf
                kırılmaya yol açıyordu. */}
            {maddeler}
            </>
          ) : (
            <>
              {/* Soru kökü ÜSTTE: kâğıtta metin önce, şekil sonra, şıklar altta. */}
              {soru.metinKonumu === "ust" && kok ? (
                <div style={{ marginBottom: olcu(1.5) }}>{kok}</div>
              ) : null}
              <div
                style={{
                  display: "flex",
                  justifyContent: hizalamaJustify(soru.hizalama),
                }}
              >
                {gorsel}
              </div>
              {soru.metinKonumu === "alt" && kok ? (
                <div style={{ marginTop: olcu(1.5) }}>{kok}</div>
              ) : null}
              {maddeler}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export const SoruIcerik = memo(SoruIcerikTemel);

// Görselin köşesinden tutup sürükleyerek boyutlandırma.
/**
 * DİKEY tutamaç — görselin yalnız yüksekliğini değiştirir.
 *
 * NEDEN AYRI: köşe tutamacı yalnız `clientX`i okuyordu, yani aşağı çekmek
 * hiçbir şey yapmıyordu (imleç `nwse-resize` olduğu için çapraz boyutlandırma
 * vaat ediyor, karşılığı yok). Öğretmenin bildirdiği "sadece aşağı/yukarı
 * uzatamıyorum" tam olarak buydu. Köşe orantılı kalıyor, dikey uzatma bu
 * tutamaca ait — ikisi karışmasın diye ayrı imleç ve ayrı konum.
 *
 * Ölçek düzeltmesi köşe tutamacıyla aynı gerekçeyle burada da var: önizleme
 * CSS `transform` ile büyütülmüş olabilir, `clientY` ekran pikseli döner.
 */
function YukseklikTutamaci({
  baslangicMm,
  onChange,
  minMm = 8,
  maxMm = 250,
}: {
  baslangicMm: number;
  onChange: (mm: number) => void;
  minMm?: number;
  maxMm?: number;
}) {
  return (
    <span
      title="Sürükleyerek yalnız yüksekliği değiştir (oran bozulur)"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const baslangicY = e.clientY;
        const ilkMm = baslangicMm;
        const kutu = e.currentTarget.getBoundingClientRect();
        const yerlesimYukseklik = (e.currentTarget as HTMLElement).offsetHeight;
        const olcek = yerlesimYukseklik > 0 ? kutu.height / yerlesimYukseklik : 1;
        const etkinMmPx = MM_PX * (olcek > 0 ? olcek : 1);
        const hareket = (ev: PointerEvent) => {
          onChange(
            sayiSinirla(
              Math.round(ilkMm + (ev.clientY - baslangicY) / etkinMmPx),
              minMm,
              maxMm,
            ),
          );
        };
        const birak = () => {
          window.removeEventListener("pointermove", hareket);
          window.removeEventListener("pointerup", birak);
        };
        window.addEventListener("pointermove", hareket);
        window.addEventListener("pointerup", birak);
      }}
      style={{
        position: "absolute",
        left: "50%",
        marginLeft: -8,
        bottom: -7,
        width: 16,
        height: 16,
        cursor: "ns-resize",
        zIndex: 6,
        touchAction: "none",
        borderRadius: 4,
        background: "#fff",
        border: "2px solid #475569",
      }}
    />
  );
}

function BoyutTutamaci({
  baslangicMm,
  maxMm,
  minMm = 8,
  onChange,
}: {
  baslangicMm: number;
  maxMm: number;
  minMm?: number;
  onChange: (mm: number) => void;
}) {
  const altSinir = Math.min(minMm, maxMm);
  return (
    <span
      title="Sürükleyerek boyutlandır"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const baslangicX = e.clientX;
        const ilkMm = baslangicMm;
        // Önizleme yakınlaştırılmış olabilir (CSS transform). `clientX` EKRAN
        // pikseli döner, `MM_PX` ise ölçeksiz yerleşim pikseli varsayar; ölçek
        // hesaba katılmazsa %200'de tutamaç iki katı hızlı hareket eder.
        // Ölçek DOM'dan türetiliyor — böylece zoom değerini buraya kadar prop
        // olarak taşımak gerekmiyor ve gelecekte başka bir ölçek eklenirse
        // (ör. dış kapsayıcı) kendiliğinden doğru kalır.
        const kutu = e.currentTarget.getBoundingClientRect();
        const yerlesimGenislik = (e.currentTarget as HTMLElement).offsetWidth;
        const olcek = yerlesimGenislik > 0 ? kutu.width / yerlesimGenislik : 1;
        const etkinMmPx = MM_PX * (olcek > 0 ? olcek : 1);
        const hareket = (ev: PointerEvent) => {
          onChange(
            sayiSinirla(
              Math.round(ilkMm + (ev.clientX - baslangicX) / etkinMmPx),
              altSinir,
              maxMm,
            ),
          );
        };
        const birak = () => {
          window.removeEventListener("pointermove", hareket);
          window.removeEventListener("pointerup", birak);
        };
        window.addEventListener("pointermove", hareket);
        window.addEventListener("pointerup", birak);
      }}
      style={{
        position: "absolute",
        right: -7,
        bottom: -7,
        width: 16,
        height: 16,
        cursor: "nwse-resize",
        zIndex: 6,
        touchAction: "none",
      }}
      className="rounded-full border-2 border-white bg-brand-600 shadow"
    />
  );
}
