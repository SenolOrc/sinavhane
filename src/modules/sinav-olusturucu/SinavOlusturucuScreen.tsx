import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Columns,
  Download,
  FileImage,
  FileText,
  FileDown,
  FolderOpen,
  Copy,
  HelpCircle,
  Info,
  Maximize2,
  MoreHorizontal,
  Pencil,
  PenTool,
  Plus,
  Printer,
  RotateCcw,
  RotateCw,
  Save,
  ScanText,
  Settings,
  Shuffle,
  Sigma,
  Trash2,
  Type,
  Upload,
  Users,
  X,
} from "lucide-react";

import {
  DONEMLER,
  YAZILI_NUMARALARI,
  SINIF_SEVIYELERI,
  A4_GENISLIK_MM,
  A4_YUKSEKLIK_MM,
  ILK_SAYFA_BASLIK_YUKSEKLIK_MM,
  DEVAM_SAYFA_BASLIK_YUKSEKLIK_MM,
  SAYFA_FOOTER_YUKSEKLIK_MM,
  INPUT_CLASS,
  MIN_KENAR_BOSLUK_MM,
  MAX_KENAR_BOSLUK_MM,
  OGRETMEN_IMZA_YUKSEKLIK_MM,
  LOGO_BOYUT_MM,
  VARSAYILAN_LOGO_BOYUT,
  PT_MM,
  SATIR_MM,
  VARSAYILAN_SORU_BOSLUK_TEST_MM,
  VARSAYILAN_SORU_BOSLUK_YAZILI_MM,
} from "./constants";
import type {
  AracModal,
  EkGorselKonumu,
  GorselTaslak,
  LogoBoyut,
  MetinTaslak,
  SoruOgesi,
  SinavTaslagi,
  YerlesimUyarisi,
} from "./types";
import {
  cevapAnahtariYuksekligiMm,
  kabaTahminMm,
  mmPx,
  sayfalariOlustur,
} from "./layout/a4";
import {
  CIZIM_PNG_KALITE,
  cizimOlcekDegerlendir,
  pngGenislikPx,
  gorselYerlesimHesapla,
  htmlToText,
  mantiksalSoruGruplari,
  mantiksalSoruGrubunuHedefeTasi,
  mantiksalSoruGrubunuSil,
  mantiksalSoruGrubunuTasi,
  mantiksalSoruId,
  mantiksalSoruSiraHaritasi,
  METIN_ALANI_DAR_ESIK_MM,
  paketFarkindaKaristir,
  bGrubuSiklariniKaristir,
  ISARETSIZ_CEVAP,
  cevapAnahtariOlustur,
  puanlariMantiksalEsitDagit,
  bepPuaniniUygula,
  bepPuanlariniEsitDagit,
  bepPuanlariniTemizle,
  sayiSinirla,
  soruPuani,
  trBuyuk,
  yeniId,
} from "./utils";
import { useSoruOlcumu } from "./hooks/useSoruOlcumu";
import { gorselSoruYap } from "./soruFabrikasi";
import { htmlTemizle } from "./security/html";
import { yazdirmayiBaslat } from "@/lib/yazdirma";
import { useDokunmatik, useDokunmatikDar } from "@/lib/dokunmatik";
import { useDarEkran } from "@/lib/useDarEkran";
import {
  sinavIcerigiKaydet,
  sinavIcerigiOku,
  sinavIcerigiSil,
} from "./storage/taslakDepo";
import {
  aktifSinavIdOku,
  aktifSinavIdYaz,
  eskiTekSlotuGocur,
  metadataTuret,
  sinavMetadatasiniEsitle,
  sinavYenidenAdlandir,
  yeniSinavOlusturVeAktifYap,
  iceAktarilanSinaviYeniKayitYap,
} from "./lib/sinavKutuphanesi";
import { sinavBul, sinavEkle, sinavlarGetir } from "@/db/repo";
import { TelefonBilgisi } from "@/components/TelefonBilgisi";
import { okulProfiliOku } from "@/lib/useEokulProfil";
import { sinavTaslakKimlikleriniYenile, sinavTaslakParmakIzi, taslakDosyadanOku, taslakDosyayaIndir } from "./storage/taslakDosya";
import { useModalErisilebilirligi } from "@/lib/modalErisilebilirligi";
import { KaydedilmemisDegisiklikKoruyucu } from "@/components/KaydedilmemisDegisiklikKoruyucu";
import { ConfirmDialog } from "@/components/ui";
import {
  GorselAssetKaydi,
  hafifSnapshotGeriYukle,
  hafifSnapshotOlustur,
  type SinavGecmisDurumu,
} from "./history";
import {
  belgeDurumunuNormallestir,
  belgeReducer,
  bosBelgeDurumu,
  type SinavBelgeDurumu,
  type SinavBelgeEylemi,
} from "./belgeDurumu";
import {
  sinirliAllSettled,
  taslakAnlamliMi,
  yazdirmaKaynaklariniBekle,
} from "./dayaniklilik";
import {
  cekmeceKlavyesiniYonet,
  menuKlavyesiniYonet,
  odaklanabilirOgeler,
} from "./uiErisilebilirlik";
import { A4Onizleme, CevapAnahtariBlogu, SoruIcerik } from "./components/SinavKagit";
import { uzunSorulariBol } from "./layout/soruBolme";
import { metinBlokHtmlleri } from "./layout/metinBloklari";
import { SoruListesi } from "./components/SinavSoruListesi";
import { InlineSoruDuzenlemePanel } from "./components/SinavSoruPanel";
import {
  GorselSoruModal,
  IceAktarOnayModal,
  KisayolYardimModal,
  MetinSoruModal,
  TemizleOnayModal,
} from "./components/SinavModallari";
import { SinavParolaModal } from "./components/SinavParolaModal";
import { GorseldenMetneModal } from "./components/GorseldenMetneModal";
import { GORSELDEN_METNE_AKTIF } from "./ocr/ayar";
import {
  AcilirBolum,
  BosCalismaAlani,
  MmInput,
  PanelBaslik,
  Secenek,
} from "./components/SinavPanelParcalari";
import { AlanEtiket, MiniButon, TogglePill } from "./components/ModalParcalari";
import { GorselParcaModal } from "./components/GorselParcaModal";
import { CizimEditoruModal } from "./components/CizimEditoruModal";
import type { CizimBelgesi, CizimCikti } from "./cizim/tipler";
import { DenklemEditoruModal } from "./components/DenklemEditoruModal";
import type { DenklemBelgesi, DenklemCikti } from "./denklem/tipler";
import {
  PdfKaynakModal,
  type PdfKaynakCikti,
} from "./components/PdfKaynakModal";
import { kisayol } from "./lib/kisayol";
import { useDisariTiklama } from "@/lib/disariTiklama";
import { dosyaKabulu } from "../../lib/platform";
import {
  KAGIT_PIKSEL_GENISLIK,
  zoomAdimla,
  zoomKaydet,
  zoomOku,
  zoomSinirla,
  ZOOM_ADIMLARI,
} from "./lib/onizlemeZoom";

/** Otomatik taslak kaydı debounce süresi (ms). */
const OTOMATIK_KAYIT_GECIKMESI_MS = 500;
const BOLUM_DURUM_KEY = "sinav-olusturucu-panel-durumu-v1";

/**
 * Soru listesinin dar/geniş tercihi. `BOLUM_DURUM_KEY` kaydına EKLENMEDİ,
 * ayrı anahtar: o kaydı `bolumAcKapa` tümüyle yeniden yazıyor, buradaki değer
 * oraya girseydi panel bölümü her açılıp kapandığında birlikte ezilirdi.
 *
 * Neden kalıcı: liste dar olunca önizleme sütunu 828 → 1020 px'e çıkıyor
 * (1200 px pencerede ölçüldü) ve A4 kâğıt %100'de ilk kez rahat sığıyor.
 * Tercih her açılışta sıfırlanınca öğretmen aynı düğmeye her seferinde
 * yeniden basmak zorunda kalıyordu.
 */
const SORU_LISTESI_DAR_KEY = "sinav-olusturucu-soru-listesi-dar-v1";

function soruListesiDarBaslangic(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SORU_LISTESI_DAR_KEY) === "true";
  } catch {
    return false;
  }
}
const VARSAYILAN_BOLUMLER: Record<string, boolean> = {
  // Başlık (okul/sınıf/ders/dönem) sınavın İLK adımı; kapalı ve panelin dibinde
  // olduğu için sıfırdan başlayan öğretmen nereden başlayacağını göremiyordu.
  baslik: true,
  sinav: true,
  seciliSoru: true,
  sayfaDuzeni: true,
  gruplar: false,
  ogretmenler: false,
  cikti: true,
  taslakDosyasi: true,
};

export function SinavOlusturucuScreen() {
  const nav = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pdfFileInputRef = useRef<HTMLInputElement | null>(null);
  const taslakFileInputRef = useRef<HTMLInputElement | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  // Ölçüm kendi hook'unda: bir ref ver, soru id → yükseklik (mm) al.
  // Dizisizliğin NEDEN bilinçli olduğu hooks/useSoruOlcumu.ts'te yazılı.
  const { olcumRef, yukseklikler, bloklar } = useSoruOlcumu();
  const seciliSoruPanelRef = useRef<HTMLElement | null>(null);
  const onizlemeKaydirRef = useRef<HTMLDivElement | null>(null);
  const sinavTaslakIdRef = useRef<string>(crypto.randomUUID());

  // ── Sınav belgesi: başlık + sorular + sayfa düzeni ayarları ──────────────
  //
  // Bu 26 alan eskiden 26 ayrı `useState`'ti ve aynı liste BEŞ yerde elle
  // tekrarlanıyordu (taslakOlustur / taslakUygula / gecmisAdimiUygula / geçmiş
  // efektinin bağımlılık dizisi / autosave efektinin bağımlılık dizisi). Beşi
  // birden güncellenmediğinde hata sessiz kalıyordu — DEVAM §9.6 bunu madde
  // 4'ün başlıca riski olarak yazmıştı, aşağıdaki iki efektin yorumları da iki
  // gerçek olayın kaydı. Tek nesnede toplanınca liste diye bir şey kalmıyor:
  // taslak buradan türetiliyor, iki bağımlılık dizisi de `belge`'ye iniyor.
  //
  // Okuma yerleri (~226 tane) hiç değişmesin diye durum hemen destructure
  // ediliyor; değişen yalnız yazma tarafı.
  const [belge, belgeGonder] = useReducer(belgeReducer, undefined, () => {
    // Yeni sınav: okul adı Ayarlar → Okul profili'nden gelir (boşsa boş kalır).
    const b = bosBelgeDurumu();
    return { ...b, baslik: { ...b.baslik, okulAdi: okulProfiliOku().okulAdi } };
  });
  const { baslik, sorular, ayarlar } = belge;
  const { okulAdi, sinifSeviyesi, donem, yaziliNo, ders, tarih, sureDakika, logoDataUrl, logoBoyut } = baslik;
  const {
    kenarBosluk, varsayilanSoruBosluk, ogretmenler, sayfaNoGoster, sayfaDuzeni,
    sutunAra, sutunAyirici, bGrubuAktif, bSeed, aktifGrup, sonYazdirilanBSeed,
    sinavTuru, testBaslik, testSonucKutusu, sikBicimi, sikDuzeni, bepAktif, bepSeciliIds, bepPuntoArtis, kaynakSecimSayaci,
  } = ayarlar;

  // Alan yazıcıları. `useCallback` değil çünkü kimlikleri zaten `belgeGonder`
  // üzerinden sabit; JSX'te doğrudan `onChange={...}` olarak verilen ikisi
  // (Secenek) bu yüzden `(v) => ...` ile sarmalanıyor. `setSorular` adı
  // bilerek korundu: 19 çağrı yeri değişmesin ve React setState anlamı
  // (değer ya da güncelleyici) okurken belli olsun.
  function baslikAyarla<K extends keyof SinavBelgeDurumu["baslik"]>(
    alan: K,
    deger: SinavBelgeDurumu["baslik"][K] | ((mevcut: SinavBelgeDurumu["baslik"][K]) => SinavBelgeDurumu["baslik"][K]),
  ) {
    belgeGonder({ tur: "baslik", alan, deger } as SinavBelgeEylemi);
  }
  function ayarAyarla<K extends keyof SinavBelgeDurumu["ayarlar"]>(
    alan: K,
    deger: SinavBelgeDurumu["ayarlar"][K] | ((mevcut: SinavBelgeDurumu["ayarlar"][K]) => SinavBelgeDurumu["ayarlar"][K]),
  ) {
    belgeGonder({ tur: "ayar", alan, deger } as SinavBelgeEylemi);
  }
  function setSorular(
    deger: SoruOgesi[] | ((mevcut: SoruOgesi[]) => SoruOgesi[]),
  ) {
    belgeGonder({ tur: "sorular", deger });
  }
  /** Yazılı ↔ test geçişi. Soru arası boşluk hâlâ ESKİ kipin varsayılanındaysa
   *  (öğretmen elle değiştirmemişse) yeni kipin varsayılanına çekilir: test
   *  kâğıdında 32 mm'lik "cevap alanı" boşluğu sayfaların yarısını boş
   *  bırakıyordu. Elle ayarlanmış değerlere (ve soruya) dokunulmaz. */
  function sinavTuruDegistir(tur: "yazili" | "test") {
    if (tur === sinavTuru) return;
    const eski = tur === "test" ? VARSAYILAN_SORU_BOSLUK_YAZILI_MM : VARSAYILAN_SORU_BOSLUK_TEST_MM;
    const yeni = tur === "test" ? VARSAYILAN_SORU_BOSLUK_TEST_MM : VARSAYILAN_SORU_BOSLUK_YAZILI_MM;
    ayarAyarla("sinavTuru", tur);
    if (varsayilanSoruBosluk === eski) {
      ayarAyarla("varsayilanSoruBosluk", yeni);
      setSorular((mevcut) => mevcut.map((soru) => (soru.boslukMm === eski ? { ...soru, boslukMm: yeni } : soru)));
    }
  }

  const [logoHatasi, setLogoHatasi] = useState("");

  const [onizlemeModu, setOnizlemeModu] = useState<"tasarim" | "cikti">(
    "tasarim",
  );
  const [topluGorselGenislik, setTopluGorselGenislik] = useState(80);
  const [temizleOnayAcik, setTemizleOnayAcik] = useState(false);
  const [aracModal, setAracModal] = useState<AracModal>(null);
  const [yardimAcik, setYardimAcik] = useState(false);
  const [yanPanelModu, setYanPanelModu] = useState<"ayarlar" | "soru" | null>(null);
  const [soruListesiDar, setSoruListesiDar] = useState(soruListesiDarBaslangic);
  /**
   * "Sadece kâğıt" odak kipi — üst şerit ve soru listesi gizli.
   *
   * Kalıcı DEĞİL (localStorage'a yazılmıyor): bu bir anlık çalışma kipi, tercih
   * değil. Uygulama her açıldığında araçların yerinde olması gerekiyor; aksi
   * halde öğretmen "düğmelerim nerede" diye başlıyor.
   */
  const [odakKagit, setOdakKagit] = useState(false);
  /** Klavye dinleyicisi güncel değeri ref'ten okur (efekt bir kez kuruluyor). */
  const odakKagitRef = useRef(false);
  useEffect(() => {
    odakKagitRef.current = odakKagit;
  }, [odakKagit]);
  // ÇOKLU EKRAN (T9/K16/D13/Y23): parmakla kullanılan ya da dar ekranda üst
  // şerit tek satıra iner — ad, "Soru ekle" ve "⋯" menüsü. Masaüstünde (fare,
  // ≥ 640 px) eski şerit aynen kalır. `telefonDuzeni` (dar/dokunmatik dar):
  // şerit yapışkan değil, yüzen soru çubuğu tek satır.
  const dokunmatik = useDokunmatik();
  const darEkran = useDarEkran();
  const telefonDuzeni = useDokunmatikDar();
  const kompaktBaslik = dokunmatik || darEkran;
  // TELEFON SEKMELERİ (OA52): telefonda soru listesi ve kâğıt AYNI ANDA iki ayrı
  // kaydırma kutusuydu (liste ~177 px, kâğıt ~280 px) + sayfanın kendisi; parmak
  // hangisinin üstündeyse o kayıyordu → "sayfa kaymıyor". Artık telefonda tek
  // seferde biri görünür, görünen kutu ekranın kalanını tamamen kullanır.
  const [telefonSekme, setTelefonSekme] = useState<"sorular" | "kagit">("kagit");
  const [yeniSinavIsleniyor, setYeniSinavIsleniyor] = useState(false);
  const [adDuzenleniyor, setAdDuzenleniyor] = useState(false);
  const [adTaslagi, setAdTaslagi] = useState("");
  const [adHatasi, setAdHatasi] = useState("");
  const [ustMenu, setUstMenu] = useState<"ekle" | "dosya" | "diger" | "yazdir" | null>(null);
  const ustMenuAciciRef = useRef<HTMLButtonElement | null>(null);
  const ustMenuRef = useRef<HTMLDivElement | null>(null);
  const yanPanelRef = useRef<HTMLElement | null>(null);
  const yanPanelAciciRef = useRef<HTMLButtonElement | null>(null);
  const [metinModalAcik, setMetinModalAcik] = useState(false);
  const [ocrModalAcik, setOcrModalAcik] = useState(false);
  const [ocrBaslangicMetni, setOcrBaslangicMetni] = useState("");
  const [cizimModal, setCizimModal] = useState<{
    soruId?: string;
    ekGorselId?: string;
    belge?: CizimBelgesi;
  } | null>(null);
  const [denklemModal, setDenklemModal] = useState<{
    soruId?: string;
    ekGorselId?: string;
    belge?: DenklemBelgesi;
  } | null>(null);
  const [gorselTaslak, setGorselTaslak] = useState<GorselTaslak | null>(null);
  const [kirpilacakSoruId, setKirpilacakSoruId] = useState<string | null>(null);
  const [pdfKaynak, setPdfKaynak] = useState<{
    dosyaAdi: string;
    data: ArrayBuffer;
  } | null>(null);
  const [dosyaHatasi, setDosyaHatasi] = useState("");
  const [bekleyenIceAktarTaslak, setBekleyenIceAktarTaslak] = useState<{
    taslak: SinavTaslagi;
    dosyaAdi: string;
    dosyaBoyutu: number;
    dosyaTuru: "parolali" | "eski-json";
    parmakIzi: string;
  } | null>(null);
  const [taslakDosyaHatasi, setTaslakDosyaHatasi] = useState("");
  const [parolaIslemi, setParolaIslemi] = useState<
    | { kip: "kaydet"; taslak: SinavTaslagi }
    | { kip: "ac"; file: File }
    | null
  >(null);
  const [silmeToast, setSilmeToast] = useState<{
    sorular: { soru: SoruOgesi; index: number }[];
    sira: number;
  } | null>(null);
  const silmeToastZamanlayiciRef = useRef<number | null>(null);
  const [seciliSoruId, setSeciliSoruId] = useState<string | null>(null);
  // Aktif sınav ve sayfa sayısı: otomatik kayıt sırasında güncel değerleri
  // okuyabilmek için ref (kütüphane metadata eşitlemesi bunları kullanıyor).
  const aktifSinavIdRef = useRef<string | null>(null);
  const sayfaSayisiRef = useRef(1);
  const gecmisRef = useRef<string[]>([]);
  const gorselAssetKaydiRef = useRef(new GorselAssetKaydi());
  const sonKayitRef = useRef<string>("");
  const geriAlKilitRef = useRef(false);
  const [geriSayisi, setGeriSayisi] = useState(0);
  // İleri al (redo) yığını. Yalnız geri-al ile beslenir; gerçek bir düzenleme
  // yeni bir dal açtığı için redo'yu geçersiz kılar.
  const ileriRef = useRef<string[]>([]);
  const [ileriSayisi, setIleriSayisi] = useState(0);
  const [autosaveHazir, setAutosaveHazir] = useState(false);
  const [autosaveDurum, setAutosaveDurum] = useState(
    "Taslak kontrol ediliyor...",
  );
  // Sınavlarım ekranındaki kayıt adıyla AYNI kaynaktan (db.sinavlar) beslenir;
  // öğretmen orada yeniden adlandırdıysa ya da başlık alanları değiştiyse
  // üst bardaki isim bir sonraki autosave tikinde eşitlenir.
  const [aktifSinavAdi, setAktifSinavAdi] = useState("");
  // Kayıt hatası tek bir durum metnine gömülü olduğu için, gösterimde başarı ile
  // aynı görünüyordu (soluk gri yazı + koşulsuz yeşil nokta). Öğretmen saatlerce
  // kaydedilmediğini fark etmiyordu; bu bayrak hatayı görünür kılar.
  const kayitHatasiVar = autosaveDurum.includes("kaydedilemedi");
  const [yazdirmaHatasi, setYazdirmaHatasi] = useState("");
  const [yazdiriliyor, setYazdiriliyor] = useState(false);
  const printRootRef = useRef<HTMLDivElement | null>(null);
  // B grubu, BEP ve sınav türü alanları belge durumunda (yukarıdaki useReducer);
  // yalnız modalın açık/kapalı olması belgeye ait değil.
  const [bepModalAcik, setBepModalAcik] = useState(false);

  // Yan panel yalnızca özel `min-[1680px]` kırılma noktasının ALTINDA gerçek
  // bir modaldır: orada `fixed inset-y-0` overlay olarak çizilir. Bu eşiğin
  // üstünde sabit bir sütundur (bkz. aside className'i). Bu ayrım
  // yapılmadığında, panel açık çalışan öğretmende Ctrl+Z ve panodan
  // yapıştırma UYARISIZ devre dışı kalıyordu — "bazen çalışıyor bazen
  // çalışmıyor" algısının kaynağı buydu.
  //
  // DİKKAT: bu 1679.98px değeri, aşağıdaki (ve dosyanın geri kalanındaki)
  // `min-[1680px]:` Tailwind sınıflarıyla EL İLE senkron tutulur — Tailwind'in
  // JIT tarayıcısı sınıf adlarını statik metin olarak aradığı için bu sayı
  // buraya bir sabitten enterpole edilemez. İkisi ayrışırsa (CSS bir eşikte
  // sütuna geçer, JS başka bir eşikte modalı kapatır) panel görünmeden
  // "kayıp" gibi davranır — bu yüzden 1536px→1680px değişikliğinde her ikisi
  // BİRLİKTE güncellendi (bkz. aşağıdaki grid tanımındaki gerekçe yorumu).
  const [yanPanelOrtuyor, setYanPanelOrtuyor] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const sorgu = window.matchMedia("(max-width: 1679.98px)");
    const uygula = () => setYanPanelOrtuyor(sorgu.matches);
    uygula();
    sorgu.addEventListener("change", uygula);
    return () => sorgu.removeEventListener("change", uygula);
  }, []);

  // Herhangi bir modal açıkken global Ctrl+Z ve panodan yapıştır dinleyicileri
  // devre dışı kalmalı — aksi halde modal içindeki (çizim/denklem) kendi
  // geri-al'ı ile arka plandaki soru listesi geri-al'ı çift tetiklenir, ya da
  // modal açıkken yapıştırılan görsel arkada yeni bir soru olarak eklenir.
  const herhangiBirModalAcik =
    metinModalAcik ||
    ocrModalAcik ||
    !!cizimModal ||
    !!denklemModal ||
    !!gorselTaslak ||
    temizleOnayAcik ||
    !!bekleyenIceAktarTaslak ||
    bepModalAcik ||
    !!kirpilacakSoruId ||
    !!aracModal ||
    yardimAcik ||
    (!!yanPanelModu && yanPanelOrtuyor);
  // Global dinleyiciler [] bağımlılıkla (yeniden kurulmadan) çalıştığından
  // güncel değeri bir ref üzerinden okuruz (gorselSecRef ile aynı kalıp).
  const herhangiBirModalAcikRef = useRef(herhangiBirModalAcik);
  herhangiBirModalAcikRef.current = herhangiBirModalAcik;
  // Klavye dinleyicisi `[]` bağımlılıkla bir kez kuruluyor; seçili soruyu
  // doğrudan okursa ilk render'daki değerde donar (aynı kalıp yukarıda).
  const seciliSoruIdRef = useRef(seciliSoruId);
  seciliSoruIdRef.current = seciliSoruId;

  useEffect(() => {
    // Odak tuzağı ve Escape-ile-kapat SADECE panel gerçek bir çekmece olduğunda
    // (2xl altı) kurulur. Geniş ekranda panel sabit bir sütun; orada odağı
    // hapsetmek klavye kullanıcısını ekranın geri kalanından koparıyordu.
    if (!yanPanelModu || !yanPanelOrtuyor) return undefined;
    const panel = yanPanelRef.current;
    const ilkOdak = panel ? odaklanabilirOgeler(panel)[0] : undefined;
    ilkOdak?.focus();
    function klavye(e: KeyboardEvent) {
      if (!panel) return;
      cekmeceKlavyesiniYonet(e, panel, () => {
        yanPaneliKapat();
      });
    }
    window.addEventListener("keydown", klavye);
    return () => window.removeEventListener("keydown", klavye);
  }, [yanPanelModu, yanPanelOrtuyor]);

  // Soru listesi + sağdaki panel (Ayarlar/Seçili Soru) aynı anda geniş
  // haldeyken, genel gezinme menüsü de açıksa toplam genişlik sığmayıp
  // sağdaki panel kırpılabiliyordu. Panel açıldığında soru listesini
  // otomatik daraltıp kapanınca eski haline döndürerek yer açarız.
  const soruListesiOncekiRef = useRef(false);
  // Daraltmayı BİZ mi yaptık? Aksi halde panel her açılıp kapandığında
  // kullanıcının elle yaptığı genişlet/daralt tercihi eziliyordu.
  const listeBizDaralttiRef = useRef(false);
  useEffect(() => {
    // Geniş ekranda panel sabit sütun olduğu için yer açmaya gerek yok.
    if (yanPanelModu && yanPanelOrtuyor) {
      if (!listeBizDaralttiRef.current) {
        soruListesiOncekiRef.current = soruListesiDar;
        listeBizDaralttiRef.current = true;
        setSoruListesiDar(true);
      }
    } else if (listeBizDaralttiRef.current) {
      listeBizDaralttiRef.current = false;
      setSoruListesiDar(soruListesiOncekiRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yanPanelModu, yanPanelOrtuyor]);

  // Menü fareyle başka bir yere tıklanınca da kapanmalı. Klavye tarafı
  // (Escape + oklar) aşağıdaki efektte zaten vardı; eksik olan buydu ve
  // menü yalnız açıcıya yeniden basınca kapanıyordu.
  useDisariTiklama(
    !!ustMenu,
    () => setUstMenu(null),
    ustMenuRef,
    ustMenuAciciRef,
  );

  useEffect(() => {
    if (!ustMenu) return undefined;
    const menu = ustMenuRef.current;
    const cerceve = window.requestAnimationFrame(() => {
      menu?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus();
    });
    function menuKlavye(e: KeyboardEvent) {
      if (!menu) return;
      menuKlavyesiniYonet(e, menu, () => {
        setUstMenu(null);
        window.setTimeout(() => ustMenuAciciRef.current?.focus(), 0);
      });
    }
    window.addEventListener("keydown", menuKlavye);
    return () => {
      window.cancelAnimationFrame(cerceve);
      window.removeEventListener("keydown", menuKlavye);
    };
  }, [ustMenu]);

  // Açılır menünün yönü ve azami yüksekliği (T10): yatay telefonda (915×412)
  // "Soru ekle" menüsü ekranın altından taşıyor, "Denklem ekle"ye
  // dokunulamıyordu. Açılırken düğmenin altında/üstünde kalan yer ölçülür;
  // menü sığmayan tarafa açılmaz, sığmıyorsa kendi içinde kayar.
  const [menuKonum, setMenuKonum] = useState<{ yukari: boolean; azamiYukseklik: number }>({ yukari: false, azamiYukseklik: 600 });
  function ustMenuyuAcKapa(
    menu: "ekle" | "dosya" | "diger" | "yazdir",
    acici: HTMLButtonElement,
  ) {
    ustMenuAciciRef.current = acici;
    const kutu = acici.getBoundingClientRect();
    const altta = window.innerHeight - kutu.bottom - 12;
    const ustte = kutu.top - 12;
    const yukari = altta < 240 && ustte > altta;
    setMenuKonum({ yukari, azamiYukseklik: Math.max(140, Math.floor(yukari ? ustte : altta)) });
    setUstMenu((mevcut) => (mevcut === menu ? null : menu));
  }
  const menuKonumSinifi = menuKonum.yukari ? "bottom-full mb-2" : "top-full mt-2";
  const menuKonumStili = { maxHeight: menuKonum.azamiYukseklik };

  // Önizleme ölçeği — YALNIZ ekran. Sayfalama ve çıktı bundan habersiz
  // (bkz. lib/onizlemeZoom.ts). Kâğıdın kendi yüksekliği soru sayısına göre
  // değiştiği için sarmalayıcının boyu ölçülerek besleniyor: `transform`
  // yerleşim boyutunu değiştirmez, ölçülmezse kaydırma alanı büyümez ve
  // yakınlaştırınca sayfanın altı erişilemez olur.
  const [onizlemeZoom, setOnizlemeZoom] = useState(() => zoomOku());
  const zoomIcerikRef = useRef<HTMLDivElement | null>(null);
  const [zoomIcerikYuksekligi, setZoomIcerikYuksekligi] = useState(0);
  const [kagitCizili, setKagitCizili] = useState(false);
  const zoomIcerikRefAyarla = useCallback((el: HTMLDivElement | null) => {
    zoomIcerikRef.current = el;
    setKagitCizili(!!el);
  }, []);

  useEffect(() => {
    const el = zoomIcerikRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const gozlemci = new ResizeObserver(() => setZoomIcerikYuksekligi(el.offsetHeight));
    gozlemci.observe(el);
    setZoomIcerikYuksekligi(el.offsetHeight);
    return () => gozlemci.disconnect();
    // Kâğıt yalnız soru varken çiziliyor: boş sınavla açılıp sonra soru gelince
    // ([] bağımlılığıyla) gözlemci hiç kurulmuyordu → sarmalayıcı ölçeksiz 1192 px
    // kalıyor, %47'de altta ~630 px boşluk, %100 üstünde kâğıdın altı kesiliyordu (OA52).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kagitCizili]);

  function zoomDegistir(yeni: number) {
    setOnizlemeZoom(zoomSinirla(yeni));
    zoomKaydet(yeni);
  }

  // OTOMATİK SIĞDIRMA (Y2/K16). Kap kâğıttan darsa (1024 px tablet, telefon)
  // kâğıt sağdan kırpılıyordu. Açılışta ve kap boyutu değiştikçe (döndürme,
  // liste daraltma) kâğıt kaba sığdırılır. Öğretmen −/+/%100 ile ölçeği ELLE
  // değiştirdiyse bu oturumda bir daha dokunulmaz. Otomatik ölçek
  // localStorage'a YAZILMAZ: tercih edilen ölçek (`zoomTercihRef`) korunur,
  // kap yeniden genişleyince ona dönülür. Masaüstünde (1366) kap 798 px,
  // kâğıt 700 px — koşul hiç tutmaz, davranış değişmez.
  const zoomElleRef = useRef(false);
  const zoomTercihRef = useRef(onizlemeZoom);
  /** Sığdırmada alt sınır zoom adımlarının altına inebilir: 320 px telefonda kap ~270 px. */
  const sigdirmaSiniri = (deger: number) => Math.min(ZOOM_ADIMLARI[ZOOM_ADIMLARI.length - 1], Math.max(0.3, deger));
  /** Sığdırmada bırakılan kenar payı: telefonda kaydırma çubuğu yer kaplamaz, her piksel okunurluk. */
  const kenarPayiRef = useRef(24);
  kenarPayiRef.current = telefonDuzeni ? 6 : 24;
  function zoomElleDegistir(yeni: number) {
    zoomElleRef.current = true;
    zoomTercihRef.current = zoomSinirla(yeni);
    zoomDegistir(yeni);
  }
  function kapGorunurGenislik(): number {
    const kap = onizlemeKaydirRef.current;
    if (!kap) return 0;
    return Math.min(kap.clientWidth, kap.parentElement?.clientWidth ?? kap.clientWidth);
  }

  /**
   * Kâğıdı önizleme sütununun GENİŞLİĞİNE sığdır.
   *
   * NEDEN: kâğıt 700 px çiziliyor (`KAGIT_PIKSEL_GENISLIK`). 1200×800 gerçek
   * pencerede önizleme sütunu — soru listesi geniş ve menü açıkken 632 px.
   * Yani varsayılan durumda kâğıt %100'de SIĞMIYOR ve öğretmenin elle
   * zoom adımı aramaktan başka yolu yoktu. Çizim editöründe bu düğme
   * ("Sığdır") zaten vardı; önizlemede yoktu.
   *
   * Oran kabın GERÇEK genişliğinden okunuyor, sabitten değil: sütun genişliği
   * soru listesine, kenar çubuğuna ve pencereye göre değişiyor.
   */
  function onizlemeyiGenisligeSigdir() {
    // GERÇEKTEN GÖRÜNEN genişlik, kabın kendi genişliği DEĞİL: kabın geniş
    // ekranda `min-w-[700px]`i var, yani sütun daraldığında kap 700 px'te kalıp
    // sütunun içinde yatay kayabiliyor. Kırpan asıl kap ebeveyn.
    const gorunur = kapGorunurGenislik();
    // Kenar payı: kabın iç boşluğu + dikey kaydırma çubuğu.
    const kullanilabilir = gorunur - kenarPayiRef.current;
    if (kullanilabilir <= 0) return;
    const hedef = sigdirmaSiniri(kullanilabilir / KAGIT_PIKSEL_GENISLIK);
    // Elle "Sığdır" otomatik sığdırmayı KAPATMAZ (aynı niyet); tercih olarak da kaydedilir.
    zoomTercihRef.current = zoomSinirla(hedef);
    setOnizlemeZoom(hedef);
    zoomKaydet(hedef);
  }

  useEffect(() => {
    const kap = onizlemeKaydirRef.current;
    if (!kap || typeof ResizeObserver === "undefined") return undefined;
    const uygula = () => {
      if (zoomElleRef.current) return;
      const kullanilabilir = kapGorunurGenislik() - kenarPayiRef.current;
      if (kullanilabilir <= 0) return;
      const sigan = kullanilabilir / KAGIT_PIKSEL_GENISLIK;
      const hedef = sigdirmaSiniri(Math.min(zoomTercihRef.current, sigan));
      setOnizlemeZoom((mevcut) => (Math.abs(mevcut - hedef) < 0.005 ? mevcut : hedef));
    };
    const gozlemci = new ResizeObserver(uygula);
    gozlemci.observe(kap);
    if (kap.parentElement) gozlemci.observe(kap.parentElement);
    uygula();
    return () => gozlemci.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // İKİ PARMAKLA YAKINLAŞTIRMA (OA52). Telefonda kâğıt genişliğe sığınca %40
  // civarında kalıyor ve yazı okunmuyordu; −/+ düğmeleri en az %50'ye iniyordu ve
  // parmakla büyütmek hiç yoktu. Parmakların ortasındaki nokta yerinde kalır.
  // Bırakınca ölçek "elle seçilmiş" sayılır (otomatik sığdırma bir daha ezmez).
  const zoomCanliRef = useRef(onizlemeZoom);
  zoomCanliRef.current = onizlemeZoom;
  useEffect(() => {
    const kap = onizlemeKaydirRef.current;
    if (!kap) return undefined;
    let bas: { mesafe: number; zoom: number; ox: number; oy: number; cx: number; cy: number; dikey: HTMLElement; kapUst: number } | null = null;
    let son = 0;
    const mesafe = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const basla = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      const r = kap.getBoundingClientRect();
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top;
      // Dikeyde kâğıt kendi içinde kaymıyorsa (telefon) sayfanın kaydırıcısı (main) ayarlanır.
      const icKayar = kap.scrollHeight > kap.clientHeight + 2;
      const dikey = icKayar ? kap : (kap.closest("main") as HTMLElement | null) ?? kap;
      const dr = dikey.getBoundingClientRect();
      // kapUst: kâğıt kabının, dikey kaydırıcının içerik başına uzaklığı (pinç boyunca sabit).
      const kapUst = icKayar ? 0 : dikey.scrollTop + r.top - dr.top;
      bas = { mesafe: Math.max(1, mesafe(e.touches)), zoom: zoomCanliRef.current, ox: kap.scrollLeft + cx, oy: (icKayar ? kap.scrollTop : 0) + cy, cx, cy: icKayar ? cy : cy + r.top - dr.top, dikey, kapUst };
    };
    const hareket = (e: TouchEvent) => {
      if (!bas || e.touches.length !== 2) return;
      e.preventDefault();
      // Kâğıt büyüdükçe kabın yüksekliği değişir ve otomatik sığdırma (ResizeObserver)
      // ölçeği geri çekerdi: parmak değdiği an ölçek "elle" sayılır.
      zoomElleRef.current = true;
      const b = bas;
      const yeni = sigdirmaSiniri(b.zoom * (mesafe(e.touches) / b.mesafe));
      son = yeni;
      setOnizlemeZoom(yeni);
      const oran = yeni / b.zoom;
      requestAnimationFrame(() => {
        kap.scrollLeft = Math.max(0, b.ox * oran - b.cx);
        b.dikey.scrollTop = Math.max(0, b.kapUst + b.oy * oran - b.cy);
      });
    };
    const bitir = (e: TouchEvent) => {
      if (!bas || e.touches.length >= 2) return;
      if (son) {
        zoomElleRef.current = true;
        setOnizlemeZoom(son);
        zoomTercihRef.current = zoomSinirla(son);
        zoomKaydet(son);
      }
      bas = null;
      son = 0;
    };
    kap.addEventListener("touchstart", basla, { passive: true });
    kap.addEventListener("touchmove", hareket, { passive: false });
    kap.addEventListener("touchend", bitir);
    kap.addEventListener("touchcancel", bitir);
    return () => {
      kap.removeEventListener("touchstart", basla);
      kap.removeEventListener("touchmove", hareket);
      kap.removeEventListener("touchend", bitir);
      kap.removeEventListener("touchcancel", bitir);
    };
    // Kap ilk çizimde olmayabilir (taslak kurtarma ekranı vb.); kâğıt çizilince bağlanır.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kagitCizili]);

  const ayarlarPanelRef = useRef<HTMLDivElement | null>(null);

  function yanPaneliAc(
    mod: "ayarlar" | "soru",
    acici?: HTMLButtonElement | null,
    bolum?: string,
  ) {
    yanPanelAciciRef.current = acici ?? null;
    setUstMenu(null);
    // Panele/soruya kaydırmak veya drawer'ı açmak, İÇİNDEKİ accordion
    // bölümünü açık YAPMAZ (bolumAc olmadan önce böyleydi — "Tek sütun" gibi
    // kısayollar ilgili bölüm kapalıyken hiçbir şey yapmıyor görünürdü).
    if (bolum) bolumAc(bolum);
    // Geniş ekranda iki bölüm de zaten görünür; mod değiştirmek yerine ilgili
    // bölüme kaydırmak doğru davranış.
    if (!yanPanelOrtuyor) {
      const hedef =
        mod === "ayarlar" ? ayarlarPanelRef.current : seciliSoruPanelRef.current;
      hedef?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setYanPanelModu(mod);
  }

  function yanPaneliKapat() {
    setYanPanelModu(null);
    window.setTimeout(() => yanPanelAciciRef.current?.focus(), 0);
  }

  // Sınavlarım'a geçmeden önce taslak kaydedilir — aksi halde son birkaç
  // saniyenin autosave debounce'u iptal olur ve o değişiklikler kaybolur
  // (flush-then-nav kalıbı).
  function sinavlarimaGit() {
    setAutosaveDurum("Sınavlarım açılmadan önce taslak kaydediliyor...");
    void aktifSinaviKaydet(taslakOlustur())
      .then(() => nav("/sinav-olusturucu/sinavlarim"))
      .catch(() => setAutosaveDurum("Sınavlarım açılamadı; taslak kaydedilemedi."));
  }

  // "Yeni sınav" eskiden yalnız Sınavlarım ekranındaydı; editörde çalışırken
  // ikinci bir yazılıya başlamanın yolu yoktu. Sıra önemli: ÖNCE açık sınav
  // kaydedilir (sinavlarimaGit'teki flush-then-nav kalıbı), sonra yeni kayıt
  // açılır, sonra listeye gidilir — böylece öğretmen yeni sınavın açıldığını
  // ve eskisinin yerinde durduğunu aynı ekranda görür.
  /** Sınav adını kaydeder. Sınavlarım ekranıyla AYNI kapıdan geçer
   *  (`sinavYenidenAdlandir` → ozelAd) — iki ayrı adlandırma mantığı olsaydı
   *  biri `ozelAd` yazmayı unutur ve ad bir sonraki autosave'de başlık
   *  alanlarından yeniden türetilip sessizce eskiye dönerdi. */
  async function sinavAdiniKaydet(disariTiklandi = false) {
    const temiz = adTaslagi.trim();
    if (temiz === (aktifSinavAdi || "")) { setAdDuzenleniyor(false); return; }
    // OA89: ad silinip dışarı dokununca kutu "boş olamaz" hatasıyla açık kalıyordu (dokunmatikte Esc yok,
    // öğretmen sıkışıyordu). Dışarı dokunmak boş adda vazgeçmek sayılır: eski ad kalır.
    if (!temiz && disariTiklandi) { setAdDuzenleniyor(false); setAdHatasi(""); return; }
    if (!temiz) { setAdHatasi("Sınav adı boş olamaz."); return; }
    try {
      // E5: boş açılışta henüz kayıt yok; ad vermek içerik sayılır, kayıt şimdi açılır.
      const id = aktifSinavKaydiniHazirla(taslakOlustur(), true);
      if (!id) { setAdDuzenleniyor(false); return; }
      sinavYenidenAdlandir(id, temiz);
      setAktifSinavAdi(temiz);
      setAdDuzenleniyor(false);
      setAdHatasi("");
    } catch (err) {
      setAdHatasi(err instanceof Error ? err.message : "Sınav adı kaydedilemedi.");
    }
  }

  async function yeniSinavaBasla() {
    if (yeniSinavIsleniyor) return;
    setYeniSinavIsleniyor(true);
    setAutosaveDurum("Yeni sınav açılmadan önce mevcut sınav kaydediliyor...");
    try {
      await aktifSinaviKaydet(taslakOlustur());
      const kayit = await yeniSinavOlusturVeAktifYap();
      aktifSinavIdRef.current = kayit.id;
      sinavTaslakIdRef.current = kayit.id;
      nav("/sinav-olusturucu/sinavlarim");
    } catch (err) {
      setAutosaveDurum(
        err instanceof Error ? `Yeni sınav açılamadı: ${err.message}` : "Yeni sınav açılamadı.",
      );
    } finally {
      setYeniSinavIsleniyor(false);
    }
  }

  const [acikBolumler, setAcikBolumler] = useState<Record<string, boolean>>(
    () => {
      if (typeof window === "undefined") return VARSAYILAN_BOLUMLER;
      try {
        const kayit = window.localStorage.getItem(BOLUM_DURUM_KEY);
        return kayit
          ? { ...VARSAYILAN_BOLUMLER, ...JSON.parse(kayit) }
          : VARSAYILAN_BOLUMLER;
      } catch {
        return VARSAYILAN_BOLUMLER;
      }
    },
  );

  /**
   * Soru listesini ELLE aç/kapa — ve tercihi kaydet.
   *
   * Yalnız bu yol kaydediyor. Yandaki panel açılınca listeyi OTOMATİK daraltan
   * efekt (`listeBizDaralttiRef`) `setSoruListesiDar`i doğrudan çağırmaya devam
   * ediyor: o geçici bir yer açma hamlesi, öğretmenin tercihi değil. İkisi aynı
   * kapıdan geçseydi panel her açılışta kalıcı tercih "dar"a dönerdi.
   */
  function soruListesiniAcKapa() {
    setSoruListesiDar((dar) => {
      const yeni = !dar;
      try {
        window.localStorage.setItem(SORU_LISTESI_DAR_KEY, String(yeni));
      } catch {
        /* localStorage kapalı olabilir; tercih o oturumda yaşar */
      }
      return yeni;
    });
  }

  function bolumAcKapa(anahtar: string) {
    setAcikBolumler((mevcut) => {
      const yeni = { ...mevcut, [anahtar]: !mevcut[anahtar] };
      try {
        window.localStorage.setItem(BOLUM_DURUM_KEY, JSON.stringify(yeni));
      } catch {
        /* localStorage kapalı olabilir; sorun değil */
      }
      return yeni;
    });
  }

  /** Yalnız AÇAR — bolumAcKapa'nın aksine toggle etmez, zaten açıksa no-op.
   *  "Tek sütun"/"Yazılı Kağıdı (A4)" gibi kısayol düğmeleri paneli
   *  kaydırıyordu ama öğretmen ilgili accordion bölümünü (ör. Sayfa Düzeni)
   *  daha önce kapatmışsa (tercih localStorage'da kalıcı) o bölüm kapalı
   *  kalıyor, kısayol hiçbir görünür etki yaratmıyordu — öğretmen "açılmıyor"
   *  diye bildirdi. */
  function bolumAc(anahtar: string) {
    setAcikBolumler((mevcut) => {
      if (mevcut[anahtar]) return mevcut;
      const yeni = { ...mevcut, [anahtar]: true };
      try {
        window.localStorage.setItem(BOLUM_DURUM_KEY, JSON.stringify(yeni));
      } catch {
        /* localStorage kapalı olabilir; sorun değil */
      }
      return yeni;
    });
  }

  const ciftSutun = sayfaDuzeni === "cift";
  const gorunenSorular = useMemo(() => {
    let liste = sorular;
    if (bGrubuAktif && aktifGrup === "B") {
      liste = paketFarkindaKaristir(liste, bSeed);
      // Test kipinde B grubu şıkları da karıştırır; doğru şık harfi yeni
      // sıraya göre eşlenir (cevap anahtarı bu listeden türetilir). Yazılıda
      // a/b/c alt maddeleri sıralı bir soru akışı olabilir: karıştırılmaz.
      // (`testModu` aşağıda tanımlı; memo burada çalıştığı için doğrudan okunur.)
      if (sinavTuru === "test") liste = bGrubuSiklariniKaristir(liste, bSeed);
    }
    if (!bepAktif) return liste;
    const secili = new Set(bepSeciliIds);
    return liste
      .filter((soru) => secili.has(soru.id))
      // BEP kâğıdı kendi puanıyla (`bepPuan`) basılır; atanmamışsa normal puan.
      .map(bepPuaniniUygula)
      .map((soru) => ({
        ...soru,
        punto: soru.punto + bepPuntoArtis,
        tamGenislik: true,
        maddeKolon: 1 as const,
      }));
  }, [
    sorular,
    bGrubuAktif,
    aktifGrup,
    bSeed,
    sinavTuru,
    bepAktif,
    bepSeciliIds,
    bepPuntoArtis,
  ]);
  const mantiksalSoruSayisi = useMemo(
    () => mantiksalSoruGruplari(gorunenSorular).length,
    [gorunenSorular],
  );
  const gorunenSoruSiraHaritasi = useMemo(
    () => mantiksalSoruSiraHaritasi(gorunenSorular),
    [gorunenSorular],
  );
  const soruSiraHaritasi = useMemo(
    () => mantiksalSoruSiraHaritasi(sorular),
    [sorular],
  );
  const etkinCiftSutun = bepAktif ? false : ciftSutun;
  const grupEtiketi = bGrubuAktif ? `${aktifGrup} GRUBU` : undefined;
  const tamIcerikMm = Math.max(80, A4_GENISLIK_MM - kenarBosluk * 2);
  const sutunIcerikMm = etkinCiftSutun
    ? Math.max(40, (tamIcerikMm - sutunAra) / 2)
    : tamIcerikMm;
  // Şekil sütuna sığmak için %70'in altına küçülecekse OTOMATİK tam genişlik
  // (okunabilirlik). Yalnız yerleşim/ölçüm için türetilir; kayıtlı soru değişmez.
  // Değişmeyen sorular AYNI nesne olarak döner (SoruIcerik memo'su tutsun).
  const yerlesimSorulari = useMemo(
    () =>
      etkinCiftSutun
        ? gorunenSorular.map((soru) => {
            const d = cizimOlcekDegerlendir(soru, sutunIcerikMm, tamIcerikMm, true);
            return d?.otoTam ? { ...soru, tamGenislik: true, genislikMm: d.tamGenislikMm } : soru;
          })
        : gorunenSorular,
    [gorunenSorular, etkinCiftSutun, sutunIcerikMm, tamIcerikMm],
  );


  // Öğretmen adı yoksa imza bloğu hiç render edilmez (OgretmenImzaAlani null döner).
  const imzaAlaniMm = ogretmenler.some((ad) => ad.trim())
    ? OGRETMEN_IMZA_YUKSEKLIK_MM
    : 0;
  const kapasiteIlkMm = Math.max(
    60,
    A4_YUKSEKLIK_MM -
      kenarBosluk * 2 -
      ILK_SAYFA_BASLIK_YUKSEKLIK_MM -
      SAYFA_FOOTER_YUKSEKLIK_MM,
  );
  // Görsel/çizim azami yüksekliği: 1. sayfanın kullanılabilir alanı (başlık dâhil
  // en kısıtlı sayfa) eksi pay. Daha uzun görsel orantılı küçültülür; yoksa
  // yazdırmada sayfa dibinde sessizce kırpılıyordu.
  const gorselAzamiYukMm = Math.max(40, kapasiteIlkMm - 8);
  const kapasiteDevamMm = Math.max(
    60,
    A4_YUKSEKLIK_MM -
      kenarBosluk * 2 -
      DEVAM_SAYFA_BASLIK_YUKSEKLIK_MM -
      SAYFA_FOOTER_YUKSEKLIK_MM,
  );

  const testModu = sinavTuru === "test";
  // Şık dizilimi: test kipinde kısa şıklar varsayılan olarak yan yana dizilir.
  const etkinSikDuzeni = sikDuzeni ?? (testModu ? "otomatik" : "liste");

  // ÇIKTI başlığı: boş alanlar ATLANIR ("OKUL ADI SINIF DERS ..." gibi yer
  // tutucular kâğıda basılmaz). Tasarım görünümü için yer tutuculu sürüm ayrıdır.
  const resmiBaslikOlustur = (yerTutucu: boolean) =>
    sinavTuru === "test"
      ? // Test kâğıdı: okul · sınıf · ders · konu (dolu olanlar). Hiçbiri yoksa
        // tasarımda yer tutucu, çıktıda boş.
        (yerTutucu
          ? [
              trBuyuk(okulAdi, "OKUL ADI"),
              trBuyuk(sinifSeviyesi, "SINIF"),
              trBuyuk(ders, "DERS"),
              testBaslik.trim().toLocaleUpperCase("tr-TR") || "KONU BAŞLIĞI",
            ]
          : [okulAdi, sinifSeviyesi, ders, testBaslik].map((p) => p.trim().toLocaleUpperCase("tr-TR"))
        )
          .filter(Boolean)
          .join(" ")
      : [
          yerTutucu ? trBuyuk(okulAdi, "OKUL ADI") : okulAdi.trim().toLocaleUpperCase("tr-TR"),
          yerTutucu ? trBuyuk(sinifSeviyesi, "SINIF") : sinifSeviyesi.trim().toLocaleUpperCase("tr-TR"),
          donem,
          yaziliNo,
          yerTutucu ? trBuyuk(ders, "DERS") : ders.trim().toLocaleUpperCase("tr-TR"),
          "SINAVI SORULARI",
        ]
          .map((p) => p.trim())
          .filter(Boolean)
          .join(" ");
  const resmiBaslik = useMemo(
    () => resmiBaslikOlustur(false),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sinavTuru, testBaslik, okulAdi, sinifSeviyesi, donem, yaziliNo, ders],
  );
  const resmiBaslikTasarim = useMemo(
    () => resmiBaslikOlustur(true),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sinavTuru, testBaslik, okulAdi, sinifSeviyesi, donem, yaziliNo, ders],
  );

  function soruIcerikGenisligi(soru: SoruOgesi) {
    return etkinCiftSutun && !soru.tamGenislik ? sutunIcerikMm : tamIcerikMm;
  }

  function soruYuksekligiMm(soru: SoruOgesi) {
    return (
      yukseklikler[soru.id] ?? kabaTahminMm(soru, soruIcerikGenisligi(soru), testModu)
    );
  }

  // "anahtar" = anahtar TEK BAŞINA ayrı sayfaya basılır (sınav basılmaz).
  // "sinavVeAnahtar" = sınav basılır, anahtar son sayfanın altına eklenir.
  // Öğretmen ikisini de istedi: ayrı sayfa öğrenciye dağıtılan nüshadan
  // ayrılabiliyor, sondaki ise tek yazdırmayla bitiyor (DEVAM §17.5).
  const [yazdirmaHedefi, setYazdirmaHedefi] = useState<
    "sinav" | "anahtar" | "sinavVeAnahtar"
  >("sinav");

  /** Yerleşim/puan uyarısı çıktığında bekleyen yazdırma isteği; onay diyalogu
   *  bu doluyken görünür. `null` = bekleyen istek yok. */
  const [yazdirmaOnayi, setYazdirmaOnayi] = useState<{
    hedef: "sinav" | "sinavVeAnahtar" | "anahtar";
    uyarilar: string[];
  } | null>(null);

  /** Cevap anahtarı: test sorularının TAMAMI. Doğru şıkkı işaretlenmemiş soru
   *  "—" ile basılır; eskiden listeden tümüyle düşüyordu ve öğretmen anahtarda
   *  hangi soruyu işaretlemeyi unuttuğunu göremiyordu. */
  const cevapAnahtari = useMemo(() => cevapAnahtariOlustur(gorunenSorular), [gorunenSorular]);
  /** Doğru şıkkı işaretli soru sayısı (sayaçlar ve "hiç işaret yok" kilidi için). */
  const isaretliCevapSayisi = cevapAnahtari.filter((satir) => satir.cevap !== ISARETSIZ_CEVAP).length;
  const isaretsizCevapSiralari = cevapAnahtari
    .filter((satir) => satir.cevap === ISARETSIZ_CEVAP)
    .map((satir) => satir.sira);

  const yukseklikGetir = (soru: SoruOgesi) =>
    yukseklikler[soru.id] ??
    kabaTahminMm(
      soru,
      etkinCiftSutun && !soru.tamGenislik ? sutunIcerikMm : tamIcerikMm,
      testModu,
    );

  // ÖNİZLEME yerleşimi. Cevap anahtarı rezervi BURAYA GİRMİYOR ve bu bilinçli:
  // yazdırma hedefi ekranda görünmeyen, yazdırmadan yazdırmaya takılı kalan bir
  // durum. Önizlemeyi ona bağlamak, öğretmenin son sorunun altında sebebini
  // göremediği bir boşluk görmesi demekti — ve o boşluğu yok etmek için hedefi
  // yazdırma sonrası sıfırlamak gerekiyordu ki O DA cevap anahtarını bozdu
  // (bkz. yazdirmaBaslat'ın finally'si). İki yerleşim ayrılınca ikisi de düzeldi.
  // Tek sayfadan uzun METİN soruları yalnız yerleşim için paragraf/blok
  // sınırlarında parçalara ayrılır (aksi hâlde baskıda sayfa sonunda KESİLİR).
  // Karar, ölçüm alanında hep TAM hâliyle ölçülen özgün sorudan verilir; parçalar
  // ayrıca ölçüldüğü için bölme kararı salınıma girmez.
  const sayfaSorulari = useMemo(
    () =>
      uzunSorulariBol(yerlesimSorulari, kapasiteIlkMm, kapasiteDevamMm, (soru) => {
        const olcu = bloklar[soru.id];
        if (!olcu) return null;
        const blokHtml = soru.tur === "metin" ? metinBlokHtmlleri(soru.metinHtml) : [];
        if (!blokHtml || blokHtml.length !== olcu.ustMm.length) return null;
        return { blokHtml, olcu };
      }),
    [yerlesimSorulari, bloklar, kapasiteIlkMm, kapasiteDevamMm],
  );

  const sayfalar = useMemo(() => {
    return sayfalariOlustur(sayfaSorulari, yukseklikGetir, {
      ciftSutun: etkinCiftSutun,
      kapasiteIlkMm,
      kapasiteDevamMm,
      imzaMm: imzaAlaniMm,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sayfaSorulari,
    yukseklikler,
    etkinCiftSutun,
    sutunIcerikMm,
    tamIcerikMm,
    kapasiteIlkMm,
    kapasiteDevamMm,
    // `imzaAlaniMm` listede YOKTU: öğretmen adı eklenip silindiğinde son
    // sayfanın rezervi değişiyor ama yerleşim yeniden hesaplanmıyordu.
    imzaAlaniMm,
  ]);

  // YAZDIRMA yerleşimi. Yalnız "sınav + anahtar" hedefinde önizlemeden ayrışır:
  // anahtar son sayfada normal akışta çizildiği için ona yer ayrılmazsa son soru
  // taşar ve baskı sayfası `overflow: hidden` olduğundan SESSİZCE kırpılır.
  const yazdirmaSayfalari = useMemo(() => {
    if (yazdirmaHedefi !== "sinavVeAnahtar" || isaretliCevapSayisi === 0) {
      return sayfalar;
    }
    return sayfalariOlustur(sayfaSorulari, yukseklikGetir, {
      ciftSutun: etkinCiftSutun,
      kapasiteIlkMm,
      kapasiteDevamMm,
      imzaMm: imzaAlaniMm,
      anahtarMm: cevapAnahtariYuksekligiMm(cevapAnahtari.length),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    sayfalar,
    yazdirmaHedefi,
    cevapAnahtari.length,
    isaretliCevapSayisi,
    sayfaSorulari,
    yukseklikler,
    etkinCiftSutun,
    sutunIcerikMm,
    tamIcerikMm,
    kapasiteIlkMm,
    kapasiteDevamMm,
    imzaAlaniMm,
  ]);
  // Kütüphane metadata'sı sayfa sayısını da önbellekliyor; otomatik kayıt
  // sırasında güncel değeri okuyabilmek için ref'e yansıtılır
  // (herhangiBirModalAcikRef ile aynı kalıp).
  sayfaSayisiRef.current = Math.max(1, sayfalar.length);

  const toplamPuan = gorunenSorular.reduce(
    (toplam, soru) => toplam + (soruPuani(soru) ?? 0),
    0,
  );


  // find DEĞİL filter: kaç sorunun etkilendiğini bilmek gerekiyor. Önceden
  // yalnızca ilk sorunlu soru bulunuyor ve tek bir banner gösteriliyordu;
  // öğretmen birini düzeltince ikincisi ortaya çıkıyordu (köstebek vurmaca).
  const genislikUyariSorulari = gorunenSorular.filter(
    (soru) =>
      soru.tur === "gorsel" &&
      soru.genislikMm > soruIcerikGenisligi(soru) + 0.5,
  );
  const sayfaAsanSorular = sayfaSorulari.filter(
    (soru) => soruYuksekligiMm(soru) + soru.boslukMm > kapasiteDevamMm,
  );
  const metinDarSorular = gorunenSorular.filter((soru) => {
    if (soru.tur !== "gorsel") return false;
    if (soru.metinKonumu !== "sag" && soru.metinKonumu !== "sol") return false;
    if (!htmlToText(soru.altMetinHtml)) return false;
    const { metinAlaniMm } = gorselYerlesimHesapla(
      soru,
      soruIcerikGenisligi(soru),
    );
    return metinAlaniMm < METIN_ALANI_DAR_ESIK_MM;
  });
  const sayfaAsimiVar = sayfaAsanSorular.length > 0;
  const metinDarUyarisiVar = metinDarSorular.length > 0;

  // Aktif uyarıların TAMAMI, her biri kendi adedi ve kendi ilk hedefiyle.
  const yerlesimUyarilari: YerlesimUyarisi[] = [
    { tip: "sayfaAsimi" as const, liste: sayfaAsanSorular },
    { tip: "metinDar" as const, liste: metinDarSorular },
    { tip: "genislik" as const, liste: genislikUyariSorulari },
  ]
    .filter(({ liste }) => liste.length > 0)
    .map(({ tip, liste }) => ({
      tip,
      adet: liste.length,
      ilkSoruId: liste[0].devamKaynakId ?? liste[0].id,
    }));

  const bGrubuUyusmazlikVar =
    bGrubuAktif &&
    aktifGrup === "B" &&
    sonYazdirilanBSeed !== null &&
    sonYazdirilanBSeed !== bSeed;

  // ─── Sınav kütüphanesi ────────────────────────────────────────────────────
  // Tek slotlu autosave yerine artık AKTİF sınavın içeriği yazılır. Metadata
  // (ad/soru sayısı/boyut) aynı anda eşitlenir ki kütüphane listesi içeriğe
  // hiç dokunmadan çizilebilsin.
  // DİKKAT — hedef BİLEREK taslağın kendi id'si değil, AKTİF sınav kaydıdır.
  //
  // İçeriğin gerçek adresi kütüphanedeki aktif kayıttır; `taslak.id` ise
  // dosyadan gelmiş olabilir (paylaşılan bir .json `taslakUygula` ile
  // yüklendiğinde `sinavTaslakIdRef` o dosyanın id'sine kayar, aktif kayıt
  // değişmez). O id'ye yazmak kütüphanede karşılığı olmayan yetim bir içerik
  // üretirdi. Bu yüzden payload'ın id'si de hedefe eşitleniyor.
  //
  // Bu davranış §13.3'te "tuzak" diye kayıtlıydı çünkü imza aksini
  // düşündürüyordu; tuzak olan davranış değil, yazılı olmamasıydı.
  // Denetim (2026-10, E5): kütüphane kaydı ilk içerikte açılır. `ilkIcerikVarRef`
  // autosave etkisi belgenin açılıştaki hâlinden farklılaştığını gördüğünde true olur;
  // o zamana dek (ör. açıp hiçbir şey yapmadan Sınavlarım'a gitmek) kayıt açılmaz.
  // `zorla`: ad verilmesi gibi kendisi içerik olan işler.
  const ilkIcerikVarRef = useRef(false);
  function aktifSinavKaydiniHazirla(taslak: SinavTaslagi, zorla = false): string | null {
    const mevcut = aktifSinavIdRef.current;
    if (mevcut) return mevcut;
    if (!zorla && !ilkIcerikVarRef.current) return null;
    const kayit = sinavEkle(metadataTuret(taslak, sayfaSayisiRef.current));
    aktifSinavIdRef.current = kayit.id;
    sinavTaslakIdRef.current = kayit.id;
    aktifSinavIdYaz(kayit.id);
    setAktifSinavAdi(kayit.ad);
    return kayit.id;
  }

  async function aktifSinaviKaydet(taslak: SinavTaslagi): Promise<void> {
    const id = aktifSinavKaydiniHazirla(taslak);
    if (!id) return;
    await sinavIcerigiKaydet(id, { ...taslak, id });
    try {
      sinavMetadatasiniEsitle(id, taslak, sayfaSayisiRef.current);
    } catch {
      // Metadata eşitlemesi başarısız olsa da İÇERİK yazıldı; kullanıcı
      // çalışmasını kaybetmez, liste bir sonraki kayıtta güncellenir.
    }
  }

  function taslakOlustur(): SinavTaslagi {
    // Alan listesi YOK: belge durumu zaten taslağın baslik/sorular/ayarlar
    // üçlüsü. Eskiden buradaki 26 adın dört kopyası daha vardı ve biri
    // eksik kalınca hata sessiz oluyordu (bkz. belge useReducer'ının yorumu).
    return {
      id: sinavTaslakIdRef.current,
      surum: "v0.11C",
      kayitZamani: new Date().toISOString(),
      ...belge,
    };
  }

  function taslakUygula(taslak: SinavTaslagi) {
    sinavTaslakIdRef.current = taslak.id ?? crypto.randomUUID();
    // Güvenlik: taslak dosyadan/IndexedDB'den geliyor olabilir (paylaşılan bir
    // .json ile taşınmış olabilir). Zengin metin editörü innerHTML'i doğrudan
    // DOM'a bastığından, state'e yazılmadan önce tüm HTML alanları burada,
    // tek bir boğum noktasında temizlenir. Geri alma yolu bu adımı ATLAR:
    // oradaki adımlar bu ekranda üretildiği için yeniden temizlenmeleri
    // gereksiz — varsayılanlar ise ortak (belgeDurumunuNormallestir).
    const temizSorular = (taslak.sorular ?? []).map((soru) => ({
      ...soru,
      kazanim: soru.kazanim ?? "",
      logicalQuestionId: soru.logicalQuestionId ?? soru.paketId ?? soru.id,
      ekGorseller: soru.ekGorseller ?? [],
      metinHtml:
        soru.metinHtml !== undefined ? htmlTemizle(soru.metinHtml) : soru.metinHtml,
      altMetinHtml:
        soru.altMetinHtml !== undefined
          ? htmlTemizle(soru.altMetinHtml)
          : soru.altMetinHtml,
      maddeler: soru.maddeler.map((madde) => ({
        ...madde,
        metinHtml:
          madde.metinHtml !== undefined
            ? htmlTemizle(madde.metinHtml)
            : madde.metinHtml,
      })),
    }));
    belgeGonder({
      tur: "belge",
      deger: belgeDurumunuNormallestir(taslak, temizSorular),
    });
    setSeciliSoruId(null);
  }

  useEffect(() => {
    let iptal = false;
    // Kütüphane açılışı:
    //  1) Kütüphane öncesi tek slot varsa ilk sınav olarak taşınır (idempotent).
    //  2) Aktif sınav çözülür: kayıtlı işaretçi geçerliyse o, değilse en son
    //     güncellenen arşivlenmemiş sınav, hiç yoksa yeni boş bir sınav.
    //  3) O sınavın içeriği okunur ve doğrudan yüklenir.
    async function aktifSinaviHazirla(): Promise<SinavTaslagi | null> {
      await eskiTekSlotuGocur(taslakAnlamliMi, 1).catch(() => null);

      const kayitli = aktifSinavIdOku();
      let hedef = kayitli ? sinavBul(kayitli) : undefined;
      if (!hedef || hedef.arsiv) {
        hedef = sinavlarGetir()
          .filter((sinav) => !sinav.arsiv)
          .sort((a, b) => (a.guncelleme < b.guncelleme ? 1 : -1))[0];
      }
      if (!hedef) {
        // Denetim (2026-10, E5): Sınav Oluşturucu'yu yalnız açmak kütüphanede 0 soruluk
        // "Adsız sınav" bırakıyordu (burada hemen sinavEkle çağrılıyordu). Artık kayıt
        // açılmaz; ilk içerikte (ilk soru / başlık değişikliği) `aktifSinavKaydiniHazirla`
        // açar.
        aktifSinavIdRef.current = null;
        setAktifSinavAdi("");
        return null;
      }
      aktifSinavIdRef.current = hedef.id;
      sinavTaslakIdRef.current = hedef.id;
      aktifSinavIdYaz(hedef.id);
      setAktifSinavAdi(hedef.ad);
      return sinavIcerigiOku(hedef.id);
    }

    aktifSinaviHazirla()
      .then(async (taslak) => {
        if (iptal) return;
        if (taslak && taslakAnlamliMi(taslak)) {
          taslakYukleVeGecmisiSifirla(taslak);
          setAutosaveHazir(true);
          setAutosaveDurum("Sınav yüklendi.");
        } else {
          setAutosaveHazir(true);
          setAutosaveDurum("Otomatik kayıt hazır.");
        }
      })
      .catch(() => {
        if (!iptal) {
          setAutosaveHazir(true);
          setAutosaveDurum("Otomatik kayıt başlatılamadı; bu oturumda çalışmaya devam edebilirsiniz.");
        }
      });
    return () => {
      iptal = true;
    };
  }, []);

  // E5 (2026-09 denetimi): açılışta hiçbir şey değişmeden "Taslak
  // kaydedilecek..." görünüp 2 sn içinde çıkışta "kaydedilmemiş değişiklik"
  // diyaloğu açılıyordu. Autosave hazır olduğu andaki belge referansı taban
  // alınır; belge (reducer yeni nesne üretene dek) aynıysa yazılacak bir şey yok.
  const autosaveTabanRef = useRef<unknown>(null);
  const bekleyenKayitRef = useRef<(() => void) | null>(null);
  // Sayfa gizlenirken/kapanırken/yenilenirken bekleyen taslak kaydı hemen başlatılır.
  useEffect(() => {
    const hemenKaydet = () => bekleyenKayitRef.current?.();
    const gorunurlukDegisti = () => { if (document.visibilityState === "hidden") hemenKaydet(); };
    document.addEventListener("visibilitychange", gorunurlukDegisti);
    window.addEventListener("pagehide", hemenKaydet);
    window.addEventListener("beforeunload", hemenKaydet);
    return () => {
      document.removeEventListener("visibilitychange", gorunurlukDegisti);
      window.removeEventListener("pagehide", hemenKaydet);
      window.removeEventListener("beforeunload", hemenKaydet);
    };
  }, []);
  useEffect(() => {
    if (!autosaveHazir) return undefined;
    if (autosaveTabanRef.current === null) autosaveTabanRef.current = belge;
    if (autosaveTabanRef.current === belge) return undefined;
    ilkIcerikVarRef.current = true; // E5: ilk değişiklik — kayıt artık açılabilir
    setAutosaveDurum(`Taslak kaydedilecek...`);
    const kaydet = () => {
      aktifSinaviKaydet(taslakOlustur())
        .then(() => {
          setAutosaveDurum(`Taslak otomatik kaydedildi.`);
          // Başlık alanları değişmiş olabilir (ya da Sınavlarım'dan yeniden
          // adlandırılmış olabilir) — üst bardaki ad metadata ile eşitlenir.
          const aktifId = aktifSinavIdRef.current;
          if (aktifId) setAktifSinavAdi(sinavBul(aktifId)?.ad ?? "");
        })
        .catch(() => setAutosaveDurum(`Taslak otomatik kaydedilemedi.`));
    };
    // Kısa debounce (eskiden 2 sn: düzenlemeden hemen sonra F5/kapanışta son
    // değişiklik kayboluyordu). Bekleyen kayıt, sayfa gizlenirken/kapanırken
    // aşağıdaki dinleyicilerle HEMEN yazılır.
    const id = window.setTimeout(() => {
      bekleyenKayitRef.current = null;
      kaydet();
    }, OTOMATIK_KAYIT_GECIKMESI_MS);
    bekleyenKayitRef.current = () => {
      window.clearTimeout(id);
      bekleyenKayitRef.current = null;
      kaydet();
    };
    return () => {
      window.clearTimeout(id);
      bekleyenKayitRef.current = null;
    };
    // Tek bağımlılık: belgenin TAMAMI. Burada da 26 alan adı elle sayılıydı ve
    // liste iki kez eksik kalmıştı — "sınav türü/başlık değişimleri autosave'i
    // tetiklemiyordu" ve "BEP görünümü/B grubu uyarısı kaydedilmiyordu"
    // yorumları o iki olayın kaydıydı. Ölçüldüğünde üçüncü bir eksik daha
    // vardı: `kaynakSecimSayaci` taslağa yazılıyor ama bu diziye hiç
    // konmamıştı (etkisi dardı, çünkü sayacı artıran akış hemen her zaman
    // `sorular`'ı da değiştirip autosave'i o yoldan tetikliyordu).
  }, [autosaveHazir, belge]);

  // Farklı bir taslağı (kurtarma, dosyadan içe aktarma) toptan yüklerken bunu
  // bir "düzenleme" gibi geri-al geçmişine yazmayız — aksi halde az önce boş
  // sahneden yüklenen taslak, geçmişte "önceki hâl: boş" olarak görünür ve
  // Ctrl+Z / Geri Al tüm taslağı siler (v0.11C'de yaşanan hata).
  function taslakYukleVeGecmisiSifirla(
    taslak: SinavTaslagi,
    sonunaEklenecekSorular: SoruOgesi[] = [],
  ) {
    geriAlKilitRef.current = true;
    gecmisRef.current = [];
    ileriRef.current = [];
    sonKayitRef.current = "";
    setGeriSayisi(0);
    setIleriSayisi(0);
    taslakUygula(taslak);
    if (sonunaEklenecekSorular.length) {
      setSorular((yuklenenTaslakSorulari) => [
        ...yuklenenTaslakSorulari,
        ...sonunaEklenecekSorular,
      ]);
      setSeciliSoruId(sonunaEklenecekSorular[0]?.id ?? null);
    }
  }

  function taslagiDosyayaKaydet() {
    setTaslakDosyaHatasi("");
    setParolaIslemi({ kip: "kaydet", taslak: taslakOlustur() });
  }

  async function okunanTaslagiHazirla(taslak: SinavTaslagi, file: File, dosyaTuru: "parolali" | "eski-json") {
    setAutosaveDurum("Sınav dosyası güvenle doğrulanıyor...");
    const parmakIzi = await sinavTaslakParmakIzi(taslak);
    setBekleyenIceAktarTaslak({ taslak, dosyaAdi: file.name, dosyaBoyutu: file.size, dosyaTuru, parmakIzi });
    setAutosaveDurum("Sınav içe aktarılmaya hazır.");
  }

  function taslakDosyaSecildi(file: File | undefined) {
    setTaslakDosyaHatasi("");
    if (!file) return;
    if (file.name.toLocaleLowerCase("tr-TR").endsWith(".oa27sinav")) {
      setParolaIslemi({ kip: "ac", file });
      return;
    }
    taslakDosyadanOku(file)
      .then((taslak) => okunanTaslagiHazirla(taslak, file, "eski-json"))
      .catch((err) =>
        setTaslakDosyaHatasi(
          err instanceof Error ? err.message : "Dosya okunamadı.",
        ),
      );
  }

  async function iceAktariOnayla() {
    if (!bekleyenIceAktarTaslak) return;
    setTaslakDosyaHatasi("");
    try {
      const izole = sinavTaslakKimlikleriniYenile(bekleyenIceAktarTaslak.taslak);
      const { kayit, taslak: yerelTaslak } = await iceAktarilanSinaviYeniKayitYap(izole, bekleyenIceAktarTaslak.parmakIzi);
      aktifSinavIdRef.current = kayit.id;
      taslakYukleVeGecmisiSifirla(yerelTaslak);
      setBekleyenIceAktarTaslak(null);
      setAutosaveDurum("Sınav yeni yerel kayıt olarak içe aktarıldı.");
    } catch (err) {
      setTaslakDosyaHatasi(err instanceof Error ? err.message : "Sınav yeni kayıt olarak içe aktarılamadı.");
    }
  }

  function iceAktaridanVazgec() {
    setBekleyenIceAktarTaslak(null);
  }

  useEffect(() => {
    if (!seciliSoruId) return;
    setAcikBolumler((mevcut) =>
      mevcut.seciliSoru ? mevcut : { ...mevcut, seciliSoru: true },
    );
    window.setTimeout(() => {
      seciliSoruPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      const kap = onizlemeKaydirRef.current;
      const hedef = kap?.querySelector<HTMLElement>(
        `[data-onizleme-id="${seciliSoruId}"]`,
      );
      if (kap && hedef && kap.scrollHeight <= kap.clientHeight + 2) {
        // Telefonda kâğıt kendi içinde dikey kaymıyor; sayfa kayar.
        hedef.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (kap && hedef) {
        const kapKutu = kap.getBoundingClientRect();
        const hedefKutu = hedef.getBoundingClientRect();
        const yeniKaydir =
          kap.scrollTop +
          (hedefKutu.top - kapKutu.top) -
          kapKutu.height / 2 +
          hedefKutu.height / 2;
        kap.scrollTo({ top: Math.max(0, yeniKaydir), behavior: "smooth" });
      }
    }, 60);
  }, [seciliSoruId]);


  // B Grubu sırası her yazdırma/indirmede işaretlenir; kullanıcı sonradan
  // "Yeniden Karıştır"a basarsa ekrandaki sıra ile dağıtılmış kağıtlar
  // arasındaki uyuşmazlığı fark edebilelim (bkz. bGrubuUyusmazlikVar).
  function bSeedYazdirmaIsaretle() {
    if (bGrubuAktif && aktifGrup === "B") ayarAyarla("sonYazdirilanBSeed", bSeed);
  }

  // Yeni render DOM'a boyandıktan sonra yazdır: sabit bir gecikme (120ms)
  // yerine iç içe iki requestAnimationFrame kullanılır — çok görselli bir
  // belgede render bu süreyi aşabiliyordu ve eski görüntü basılabiliyordu.
  /** Yazdırma işinin ve "PDF olarak kaydet" dosyasının adı (T15): sınav adı +
   *  sınıf. Ad sınıfı zaten içeriyorsa tekrarlanmaz. */
  function yazdirmaIsAdi(ek?: string): string {
    const ad = (aktifSinavAdi || [ders, "sınavı"].filter(Boolean).join(" ") || "Sınav").trim();
    const sinif = sinifSeviyesi.trim();
    const parcalar = [ad];
    if (sinif && !ad.toLocaleLowerCase("tr-TR").includes(sinif.toLocaleLowerCase("tr-TR"))) parcalar.push(sinif);
    if (ek) parcalar.push(ek);
    return parcalar.join(" - ");
  }

  async function yazdirmaBaslat(ek?: string) {
    setYazdirmaHatasi("");
    setYazdiriliyor(true);
    try {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      if (!printRootRef.current) throw new Error("Yazdırma alanı hazırlanamadı.");
      await yazdirmaKaynaklariniBekle(printRootRef.current);
      await yazdirmayiBaslat(yazdirmaIsAdi(ek));
    } catch (err) {
      setYazdirmaHatasi(
        err instanceof Error
          ? `Yazdırma başlatılamadı: ${err.message}`
          : "Yazdırma kaynakları hazırlanamadı.",
      );
    } finally {
      // BURADA `setYazdirmaHedefi` ÇAĞIRMA.
      //
      // Bir tur denendi ve cevap anahtarını BOZDU: hedefi burada sıfırlamak,
      // baskı kökünün içeriğini yazdırma tamamlanmadan sınava geri çeviriyor.
      // Tarayıcıda görünmüyor çünkü `window.print()` bloklar — JS dialog
      // kapanana kadar durur, sıfırlama baskıdan SONRA çalışır. macOS'ta ise
      // `webview.print()` NSPrintOperation'ı açıp HEMEN döner (lib/yazdirma.ts
      // ve src-tauri yazdir), yani sıfırlama sistem sayfayı yakalamadan önce
      // çalışıyor ve öğretmen sınavı basılmış buluyor. §12'nin dersinin aynısı:
      // iki motor aynı JS'i çalıştırır ama aynı ANDA çalıştırmaz.
      //
      // Hedefin takılı kalması zararsız: önizleme yerleşimi ondan artık
      // BESLENMİYOR (bkz. `yazdirmaSayfalari`), her yazdırma yolu da kendi
      // hedefini başta yazıyor.
      setYazdiriliyor(false);
    }
  }

  /** Yazdırmadan önceki yerleşim/puan uyarıları. Sınav ve "sınav + anahtar"
   *  yolları AYNI uyarıları göstermeli: anahtar eklemek sayfa sayısını
   *  artırabildiği için taşma riski orada daha da yüksek. */
  function yazdirmaUyarilariniTopla(hedef: "sinav" | "sinavVeAnahtar" | "anahtar"): string[] {
    const uyarilar: string[] = [];
    // Cevap anahtarı basılacaksa (test kipi) işaretsiz sorular "—" çıkar;
    // öğretmen bunu kâğıt elindeyken değil, yazdırmadan ÖNCE görmeli.
    if (testModu && hedef !== "sinav" && isaretsizCevapSiralari.length > 0) {
      const ornek = isaretsizCevapSiralari.slice(0, 10).join(", ");
      const devam = isaretsizCevapSiralari.length > 10 ? "…" : "";
      uyarilar.push(
        `${isaretsizCevapSiralari.length} sorunun doğru şıkkı işaretlenmemiş (${ornek}${devam}); cevap anahtarında “${ISARETSIZ_CEVAP}” olarak basılacak.`,
      );
    }
    // Yalnız anahtar basılıyorsa kâğıt yerleşimi/puan uyarıları anlamsız.
    if (hedef === "anahtar") return uyarilar;
    // Sayfa aşımı uyarısı BEP görünümünde de kontrol edilir: BEP puntoyu
    // büyüttüğü ve tam genişliğe zorladığı için sayfaya sığmama riski BEP'te
    // de gerçek — diğer uyarılar (puan, metin darlığı) BEP'e özgü olmadığından
    // atlanmaya devam eder.
    if (sayfaAsimiVar) {
      // Soru NUMARASI ve sonucu açıkça yazılır: sığmayan soru bölünmüyor, sayfa
      // sonunda KESİLİYOR (önceden "N soru sığmıyor" deyip "Yine de yazdır"
      // sessizce son paragrafları kaybettiriyordu).
      sayfaAsanSorular.forEach((soru) => {
        const no = gorunenSoruSiraHaritasi.get(soru.devamKaynakId ?? soru.id);
        uyarilar.push(
          `${no ? `${no}. soru` : "Bir soru"} tek sayfaya sığmıyor: yazdırmada sayfa sonunda KESİLECEK (son satırlar/adımlar basılmaz). Önce soruyu kısaltın, ikiye bölün veya yazıyı küçültün.`,
        );
      });
    }
    if (bepAktif) {
      // BEP kâğıdı da öğrenciye 100 tam puan üzerinden verilir. Eskiden BEP
      // görünümünde puan denetimi tümüyle atlanıyordu; 10 sorudan 5'i seçilince
      // kâğıt sessizce "50 puan" basılıyordu.
      if (toplamPuan === 0 && gorunenSorular.length > 0)
        uyarilar.push("BEP sorularına puan girilmemiş (Puan: 0/100); kâğıtta soru puanları görünmeyecek.");
      else if (toplamPuan !== 100)
        uyarilar.push(
          `BEP kâğıdının toplam puanı 100 değil (${toplamPuan}). Çıktı bölümündeki “BEP puanlarını 100'e eşit dağıt” yalnız BEP sorularını puanlar, normal sınav puanları değişmez.`,
        );
    } else {
      if (metinDarUyarisiVar)
        uyarilar.push(
          `${metinDarSorular.length} soruda görselin yanındaki metin için yer kalmamış.`,
        );
      if (toplamPuan > 100)
        uyarilar.push(`Toplam puan 100'ü aşıyor (${toplamPuan}).`);
      // Engellemez, yalnız sorar (T16): "Puan: 0/100" iken yazdıran öğretmen
      // puansız kâğıdı ancak basılınca fark ediyordu.
      if (toplamPuan === 0 && gorunenSorular.length > 0)
        uyarilar.push("Sorulara puan girilmemiş (Puan: 0/100); kâğıtta soru puanları görünmeyecek.");
    }
    return uyarilar;
  }

  /** Uyarı onayı geçildikten SONRA çalışan asıl yazdırma. İki yol (sınav /
   *  sınav+anahtar) tek gövdeden geçsin diye ayrıldı: eskiden onay kontrolü
   *  iki yerde kopyalanıyordu ve birine eklenen adım ötekinde unutulabiliyordu. */
  function yazdirmayiCalistir(hedef: "sinav" | "sinavVeAnahtar" | "anahtar") {
    bSeedYazdirmaIsaretle();
    setYazdirmaHedefi(hedef);
    if (hedef === "anahtar") {
      void yazdirmaBaslat("Cevap anahtarı");
      return;
    }
    setOnizlemeModu("cikti");
    void yazdirmaBaslat();
  }

  /**
   * Yazdırma isteği. Uyarı varsa UYGULAMA İÇİ diyalog sorar.
   *
   * NEDEN `window.confirm` DEĞİL: macOS'ta hiç açılmıyor. Tauri'nin webview'ı
   * (wry) `WKUIDelegate`'te yalnız dosya seçme / medya izni / yeni pencere
   * metotlarını uyguluyor; `runJavaScriptConfirmPanel` YOK. WebKit sözleşmesi
   * gereği delege o metodu uygulamazsa diyalog gösterilmez ve `confirm()`
   * DOĞRUDAN `false` döner. Sonuç sessiz ve kötüydü: puan 100'ü aştığı ya da
   * bir soru sayfaya sığmadığı anda "Yazdır" hiçbir şey yapmıyor, hiçbir
   * mesaj da çıkmıyordu. Tarayıcı önizlemesinde görünmüyor çünkü orada
   * `confirm` gerçekten açılıyor — §12.1/§18.3a'nın aynı ailesi: iki motor
   * aynı JS'i çalıştırır ama aynı şekilde değil.
   *
   * (Windows/WebView2'de ters yönde bozuluyordu — bkz. components/OnayDiyalogu.tsx
   * yorumu: diyalog açılmadan ONAYLANMIŞ gibi davranıyor. İki platformda iki
   * farklı yanlış cevap, bu yüzden yasak platforma bağlı değil.)
   */
  function yazdirmayiIste(hedef: "sinav" | "sinavVeAnahtar" | "anahtar") {
    const uyarilar = yazdirmaUyarilariniTopla(hedef);
    if (uyarilar.length === 0) {
      yazdirmayiCalistir(hedef);
      return;
    }
    setYazdirmaOnayi({ hedef, uyarilar });
  }

  function pdfYazdir() {
    yazdirmayiIste("sinav");
  }

  function cevapAnahtariYazdir() {
    yazdirmayiIste("anahtar");
  }

  /** Sınav + testin sonunda cevap anahtarı, TEK yazdırmada. Sınav yazdırma
   *  yolunun aynısı (uyarı onayı dahil) — tek fark hedef. */
  function sinavVeAnahtarYazdir() {
    yazdirmayiIste("sinavVeAnahtar");
  }

  function bepHazirla(seciliIds: string[], puntoArtis: number) {
    const secili = new Set(seciliIds);
    const butunGrupIdleri = mantiksalSoruGruplari(sorular)
      .filter((grup) => grup.some((soru) => secili.has(soru.id)))
      .flatMap((grup) => grup.map((soru) => soru.id));
    // Seçim değiştiyse eski BEP puan dağıtımı artık 100 tutmaz: temizlenir
    // (yalnız punto değiştiyse öğretmenin dağıtımı korunur).
    const oncekiSecim = new Set(bepSeciliIds);
    const secimDegisti =
      oncekiSecim.size !== butunGrupIdleri.length || butunGrupIdleri.some((id) => !oncekiSecim.has(id));
    if (secimDegisti) setSorular((mevcut) => bepPuanlariniTemizle(mevcut));
    ayarAyarla("bepSeciliIds", butunGrupIdleri);
    ayarAyarla("bepPuntoArtis", puntoArtis);
    ayarAyarla("bepAktif", butunGrupIdleri.length > 0);
    setBepModalAcik(false);
    setSeciliSoruId(null);
  }

  function soruEkle(soru: SoruOgesi) {
    setSorular((mevcut) => [...mevcut, soru]);
    setSeciliSoruId(soru.id);
  }

  function soruGuncelle(id: string, patch: Partial<SoruOgesi>) {
    setSorular((mevcut) =>
      mevcut.map((soru) => (soru.id === id ? { ...soru, ...patch } : soru)),
    );
  }

  function tumGorselleriAyniGenisligeGetir() {
    const gorselSayisi = sorular.filter((soru) => !!soru.gorselDataUrl).length;
    if (!gorselSayisi) return;
    const maxMm = Math.max(20, (etkinCiftSutun ? sutunIcerikMm : tamIcerikMm) - 7);
    const hedef = Math.round(sayiSinirla(topluGorselGenislik, 20, maxMm));
    setTopluGorselGenislik(hedef);
    setSorular((mevcut) => mevcut.map((soru) => soru.gorselDataUrl ? { ...soru, genislikMm: hedef, tamGenislik: false } : soru));
    setAutosaveDurum(`${gorselSayisi} soru görseli ${hedef} mm genişliğe getirildi.`);
  }

  function soruSil(id: string) {
    const index = sorular.findIndex((soru) => soru.id === id);
    const soru = sorular[index];
    if (!soru) return;
    const logicalId = mantiksalSoruId(soru);
    const silinenler = sorular
      .map((oge, ogeIndex) => ({ soru: oge, index: ogeIndex }))
      .filter(({ soru: oge }) => mantiksalSoruId(oge) === logicalId);
    setSorular((mevcut) => mantiksalSoruGrubunuSil(mevcut, id));
    setSeciliSoruId((mevcut) =>
      mevcut && silinenler.some(({ soru: oge }) => oge.id === mevcut) ? null : mevcut,
    );
    if (silmeToastZamanlayiciRef.current != null) {
      window.clearTimeout(silmeToastZamanlayiciRef.current);
    }
    setSilmeToast({ sorular: silinenler, sira: soruSiraHaritasi.get(id) ?? index + 1 });
    silmeToastZamanlayiciRef.current = window.setTimeout(() => {
      setSilmeToast(null);
      silmeToastZamanlayiciRef.current = null;
    }, 6000);
  }

  // Ctrl+Z ile de geri alınabilir (soru silme normal geçmişe yazılır); bu,
  // fare kullanan ve kısayolu bilmeyenler için ayrı, kesin bir yol. Soru
  // Ctrl+Z ile zaten geri geldiyse (aynı id tekrar varsa) ikinci kez eklemez.
  function silmeyiGeriAl() {
    if (!silmeToast) return;
    const { sorular: silinenler } = silmeToast;
    setSorular((mevcut) => {
      const kopya = [...mevcut];
      for (const { soru, index } of [...silinenler].sort((a, b) => a.index - b.index)) {
        if (!kopya.some((oge) => oge.id === soru.id)) {
          kopya.splice(Math.min(index, kopya.length), 0, soru);
        }
      }
      return kopya;
    });
    setSeciliSoruId(silinenler[0]?.soru.id ?? null);
    setSilmeToast(null);
    if (silmeToastZamanlayiciRef.current != null) {
      window.clearTimeout(silmeToastZamanlayiciRef.current);
      silmeToastZamanlayiciRef.current = null;
    }
  }

  function soruTasi(id: string, yon: "yukari" | "asagi") {
    setSorular((mevcut) => mantiksalSoruGrubunuTasi(mevcut, id, yon));
  }

  function soruSirala(kaynakId: string, hedefId: string) {
    setSorular((mevcut) => mantiksalSoruGrubunuHedefeTasi(mevcut, kaynakId, hedefId));
  }

  function soruCogalt(id: string) {
    const index = sorular.findIndex((soru) => soru.id === id);
    if (index < 0) return;
    const kaynak = sorular[index];
    const kaynakLogicalId = mantiksalSoruId(kaynak);
    const kaynakGrup = sorular.filter((soru) => mantiksalSoruId(soru) === kaynakLogicalId);
    const yeniLogicalId = yeniId();
    const kopyalar: SoruOgesi[] = kaynakGrup.map((oge) => ({
      ...oge,
      id: yeniId(),
      logicalQuestionId: yeniLogicalId,
      kirpmaId: undefined,
      maddeler: oge.maddeler.map((madde) => ({ ...madde, id: yeniId() })),
      ekGorseller: (oge.ekGorseller ?? []).map((parca) => ({ ...parca, id: yeniId() })),
    }));
    setSorular((mevcut) => {
      const yer = mevcut.reduce((son, soru, i) => mantiksalSoruId(soru) === kaynakLogicalId ? i : son, -1);
      const kopyaListe = [...mevcut];
      kopyaListe.splice(yer < 0 ? mevcut.length : yer + 1, 0, ...kopyalar);
      return kopyaListe;
    });
    setSeciliSoruId(kopyalar[0]?.id ?? null);
  }

  /** Geri al/ileri al'ın kapsadığı durum. taslakOlustur()'un id/surum/kayitZamani
   *  hariç aynı alanları — geçmiş artık başlık ve sayfa düzeni ayarlarını da
   *  kapsıyor (eskiden yalnız sorular).
   *
   *  Alan listesi DÖRT yerde birden aynı kalmalı: taslakOlustur, aşağıdaki
   *  bağımlılık dizisi, taslakUygula ve gecmisAdimiUygula. Dördünü de
   *  `tests/sinav-dayaniklilik` içindeki `geriAlKapsamiSenaryolari` karşılaştırır
   *  — o iddia bu satır yazıldığında YOKTU, yorum kontrol edildiğini söylüyordu
   *  ama edilen yalnız snapshot modülüydü. */
  function gecmisDurumuOlustur(): SinavGecmisDurumu {
    const taslak = taslakOlustur();
    return { sorular: taslak.sorular, baslik: taslak.baslik, ayarlar: taslak.ayarlar };
  }

  useEffect(() => {
    const zamanlayici = window.setTimeout(() => {
      const imza = hafifSnapshotOlustur(gecmisDurumuOlustur(), gorselAssetKaydiRef.current);
      if (imza === sonKayitRef.current) return;
      if (sonKayitRef.current && !geriAlKilitRef.current) {
        gecmisRef.current.push(sonKayitRef.current);
        if (gecmisRef.current.length > 30) gecmisRef.current.shift();
        setGeriSayisi(gecmisRef.current.length);
        // Geri alıp sonra DÜZENLEME yapmak yeni bir dal açar; eski ileri
        // adımları artık geçersizdir.
        if (ileriRef.current.length > 0) {
          ileriRef.current = [];
          setIleriSayisi(0);
        }
      }
      geriAlKilitRef.current = false;
      sonKayitRef.current = imza;
      // Çöp toplamaya İLERİ yığını da dahil: aksi halde redo snapshot'larının
      // görselleri silinip ileriAl "kayıt okunamadı" ile patlıyordu.
      gorselAssetKaydiRef.current.kullanilmayanlariTemizle([
        ...gecmisRef.current,
        ...ileriRef.current,
        imza,
      ]);
    }, 500);
    return () => window.clearTimeout(zamanlayici);
    // Tek bağımlılık: belgenin TAMAMI. Burada eskiden 26 alan adı elle
    // sayılıydı; eksik kalan bir ad "o alanı değiştirdim, Ctrl+Z çalışmıyor"
    // demekti. Reducer aynı nesneyi döndürerek değişmediğini bildirdiği için
    // bu tetikleme gereksiz yere de çalışmıyor.
  }, [belge]);

  /** Yığından bir snapshot uygular. Snapshot ÖNCE okunur, ancak başarılıysa
   *  yığından çıkarılır: eski hâlde pop() try bloğunun DIŞINDAYDI, bu yüzden
   *  bir asset bulunamadığında adım sessizce kaybolup geri dönülemez oluyordu. */
  function gecmisAdimiUygula(
    kaynak: React.MutableRefObject<string[]>,
    hedefYigin: React.MutableRefObject<string[]>,
  ) {
    const snapshot = kaynak.current[kaynak.current.length - 1];
    if (!snapshot) return;
    let durum: SinavGecmisDurumu;
    try {
      durum = hafifSnapshotGeriYukle(snapshot, gorselAssetKaydiRef.current);
    } catch {
      setAutosaveDurum("Geri alma kaydı okunamadı; mevcut taslak korunuyor.");
      return;
    }
    kaynak.current.pop();
    if (sonKayitRef.current) hedefYigin.current.push(sonKayitRef.current);
    geriAlKilitRef.current = true;
    const sorularYeni = durum.sorular;
    // Başlık ve sayfa düzeni de geri alınır (8c). taslakUygula kullanılmıyor:
    // o, taslak kimliğini ve HTML sanitizasyonunu da yeniden çalıştırır; geçmiş
    // adımları zaten bu ekranda üretildiği için ikisi de gereksiz.
    //
    // Varsayılanlar yükleme yoluyla AYNI fonksiyondan geliyor. Eskiden iki yer
    // ayrı ayrı yazılıydı ve "birebir aynı kalmalı" uyarısı yalnız yorumdaydı;
    // gerçekte `kaynakSecimSayaci` bir yerde türetilirken burada 0'a düşüyordu.
    belgeGonder({ tur: "belge", deger: belgeDurumunuNormallestir(durum) });
    setSeciliSoruId((mevcut) =>
      mevcut && sorularYeni.some((soru) => soru.id === mevcut) ? mevcut : null,
    );
    setGeriSayisi(gecmisRef.current.length);
    setIleriSayisi(ileriRef.current.length);
  }

  function geriAl() {
    gecmisAdimiUygula(gecmisRef, ileriRef);
  }

  function ileriAl() {
    gecmisAdimiUygula(ileriRef, gecmisRef);
  }

  useEffect(() => {
    function tusDinle(e: KeyboardEvent) {
      // Modal ve metin girişi korumaları AŞAĞIDAKİ ile birebir aynı olmalı;
      // bu yüzden tek bir yardımcıda toplandı.
      const yoksay = () => {
        // Bir modal açıkken (ör. Çizim/Denklem editörü) bu global kısayollar
        // devre dışı — modalın kendi Ctrl+Z'si / Escape'i zaten çalışıyor,
        // ikisi birden tetiklenirse çift geri-al ya da çift kapanma olur.
        if (herhangiBirModalAcikRef.current) return true;
        const hedef = e.target as HTMLElement | null;
        const etiket = hedef?.tagName;
        return etiket === "INPUT" || etiket === "TEXTAREA" || !!hedef?.isContentEditable;
      };

      // Escape: soru seçimini bırak. Eskiden bunun TEK yolu "Diğer işlemler"
      // menüsündeki bir maddeydi; Escape hiçbir şey yapmıyordu. Menü o madde
      // için tek başına ayakta duruyordu, madde buraya taşınınca menü de
      // kalktı. Panel çekmece modundayken `herhangiBirModalAcik` zaten true
      // olduğu için panelin kendi Escape'i öncelikli kalır.
      if (e.key === "Escape") {
        if (yoksay()) return;
        // ÖNCE odak kipinden çıkar: kip açıkken üst şerit gizli, yani öğretmen
        // "geri dön" düğmesini önizleme şeridinde arıyor. Escape'in oradaki
        // karşılığı da aynı olmalı. Seçim bırakma bir sonraki basışa kalır.
        if (odakKagitRef.current) {
          e.preventDefault();
          setOdakKagit(false);
          return;
        }
        if (!seciliSoruIdRef.current) return;
        e.preventDefault();
        setSeciliSoruId(null);
        return;
      }

      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const tus = e.key.toLowerCase();
      const geriMi = tus === "z" && !e.shiftKey;
      // Ctrl+Shift+Z ve Ctrl+Y: ileri al. Önceden redo hiç yoktu; Ctrl+Shift+Z
      // açıkça dışlanmıştı (!e.shiftKey) ve karşılığı da yazılmamıştı.
      const ileriMi = (tus === "z" && e.shiftKey) || tus === "y";
      if (!geriMi && !ileriMi) return;
      if (yoksay()) return;
      e.preventDefault();
      if (geriMi) geriAl();
      else ileriAl();
    }
    window.addEventListener("keydown", tusDinle);
    return () => window.removeEventListener("keydown", tusDinle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function metinSoruEkle(taslak: MetinTaslak, devamMi: boolean) {
    const html = htmlTemizle(taslak.html).trim();
    if (!htmlToText(html)) {
      if (!devamMi) setMetinModalAcik(false);
      return;
    }
    soruEkle({
      id: yeniId(),
      tur: "metin",
      metinHtml: html,
      metinKonumu: "alt",
      hizalama: "sol",
      genislikMm: tamIcerikMm,
      boslukMm: taslak.boslukMm,
      punto: taslak.punto,
      puan: null,
      maddeler: taslak.maddeler,
      maddeKolon: 1,
      tamGenislik: false,
      kazanim: "",
    });
    if (!devamMi) setMetinModalAcik(false);
  }

  function gorselSoruEkle(taslak: GorselTaslak) {
    soruEkle(gorselSoruOlustur(taslak));
    setGorselTaslak(null);
  }

  function logoDosyasiSec(file: File | undefined) {
    if (!file) return;
    setLogoHatasi("");
    if (!file.type.startsWith("image/")) {
      setLogoHatasi("Yalnızca görsel dosyaları (PNG, JPG) eklenebilir.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoHatasi("Logo 2 MB'den büyük. Lütfen daha küçük bir görsel seçin.");
      return;
    }
    const okuyucu = new FileReader();
    okuyucu.onload = () => {
      const dataUrl = String(okuyucu.result ?? "");
      if (!dataUrl) {
        setLogoHatasi("Logo okunamadı.");
        return;
      }
      baslikAyarla("logoDataUrl", dataUrl);
    };
    okuyucu.onerror = () => setLogoHatasi("Logo okunamadı. Lütfen tekrar deneyin.");
    okuyucu.readAsDataURL(file);
  }

  function gorselDosyasiniOku(
    file: File,
    adiOverride?: string,
  ): Promise<GorselTaslak> {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) {
        reject(new Error("Yalnızca görsel dosyaları (PNG, JPG) eklenebilir."));
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        reject(
          new Error(
            "Görsel 8 MB'den büyük. Lütfen daha küçük bir görsel seçin.",
          ),
        );
        return;
      }
      const okuyucu = new FileReader();
      okuyucu.onload = () => {
        const dataUrl = String(okuyucu.result ?? "");
        if (!dataUrl) {
          reject(new Error("Görsel okunamadı."));
          return;
        }
        const gorsel = new Image();
        gorsel.onload = () => {
          const oran =
            gorsel.naturalHeight > 0
              ? gorsel.naturalWidth / gorsel.naturalHeight
              : 1.35;
          const baglamMm = Math.max(
            20,
            (etkinCiftSutun ? sutunIcerikMm : tamIcerikMm) - 7,
          );
          resolve({
            dataUrl,
            dosyaAdi: adiOverride ?? file.name,
            genislikMm: Math.round(etkinCiftSutun ? baglamMm : baglamMm * 0.6),
            altMetinHtml: "",
            metinKonumu: "alt",
            hizalama: "sol",
            gorselOran: oran,
            boslukMm: varsayilanSoruBosluk,
            tamGenislik: false,
          });
        };
        gorsel.onerror = () => reject(new Error("Görsel boyutu okunamadı."));
        gorsel.src = dataUrl;
      };
      okuyucu.onerror = () =>
        reject(new Error("Görsel okunamadı. Lütfen tekrar deneyin."));
      okuyucu.readAsDataURL(file);
    });
  }

  function gorselSoruOlustur(taslak: GorselTaslak): SoruOgesi {
    return gorselSoruYap(
      {
        gorselDataUrl: taslak.dataUrl,
        dosyaAdi: taslak.dosyaAdi,
        genislikMm: taslak.genislikMm,
        boslukMm: taslak.boslukMm,
      },
      {
        altMetinHtml: htmlTemizle(taslak.altMetinHtml),
        metinKonumu: taslak.metinKonumu,
        hizalama: taslak.hizalama,
        gorselOran: taslak.gorselOran,
        tamGenislik: taslak.tamGenislik ?? false,
      },
    );
  }

  function cizimSorusuOlustur(cikti: CizimCikti, hedef: "yeni" | "secili" | "inline") {
    if (cizimModal?.soruId) {
      if (cizimModal.ekGorselId) {
        const soru = sorular.find((s) => s.id === cizimModal.soruId);
        soruGuncelle(cizimModal.soruId, {
          ekGorseller: (soru?.ekGorseller ?? []).map((parca) =>
            parca.id === cizimModal.ekGorselId
              ? {
                  ...parca,
                  dataUrl: cikti.dataUrl,
                  oran: cikti.oran,
                  cizimVerisi: cikti.cizimVerisi,
                }
              : parca,
          ),
        });
      } else {
        soruGuncelle(cizimModal.soruId, {
          gorselDataUrl: cikti.dataUrl,
          gorselOran: cikti.oran,
          cizimVerisi: cikti.cizimVerisi,
        });
      }
      setCizimModal(null);
      setAutosaveDurum("Çizim güncellendi.");
      return;
    }
    if (hedef === "secili" && seciliSoruId) {
      const hedefSoru = sorular.find((s) => s.id === seciliSoruId);
      if (hedefSoru?.tur === "gorsel") {
        const baglamMm = Math.max(20, soruIcerikGenisligi(hedefSoru) - 7);
        const parca = {
          id: yeniId(),
          dataUrl: cikti.dataUrl,
          dosyaAdi: "cizim.png",
          konum: "alt" as const,
          genislikMm: Math.round(baglamMm * 0.6),
          oran: cikti.oran,
          cizimVerisi: cikti.cizimVerisi,
        };
        soruGuncelle(seciliSoruId, {
          ekGorseller: [...(hedefSoru.ekGorseller ?? []), parca],
        });
        setCizimModal(null);
        setAutosaveDurum("Çizim seçili soruya eklendi.");
        return;
      }
    }
    const baglamMm = Math.max(
      20,
      (etkinCiftSutun ? sutunIcerikMm : tamIcerikMm) - 7,
    );
    // Çizim DOĞAL boyundan (PNG pikseli / kalite → mm) büyük basılmaz: içeriğe
    // kırpılan küçük bir şema (gövde-yaprak, sayı doğrusu) sütun genişliğine
    // şişirilince yazıları 25-30 pt'ye çıkıyordu. Doğal boyda yazılar ~10 pt.
    const dogalPx = pngGenislikPx(cikti.dataUrl);
    const dogalMm = dogalPx ? ((dogalPx / CIZIM_PNG_KALITE) * 25.4) / 96 : Infinity;
    const genislikMm = Math.round(
      Math.min(etkinCiftSutun ? baglamMm : baglamMm * 0.6, Math.max(25, dogalMm)),
    );
    const yeniSoru = gorselSoruYap(
      {
        gorselDataUrl: cikti.dataUrl,
        dosyaAdi: "cizim.png",
        genislikMm,
        boslukMm: varsayilanSoruBosluk,
      },
      // Soru kökü varsayılan olarak şeklin ÜSTÜNDE (metin → şekil → şıklar).
      { gorselOran: cikti.oran, cizimVerisi: cikti.cizimVerisi, metinKonumu: "ust" },
    );
    soruEkle(yeniSoru);
    setCizimModal(null);
    setAutosaveDurum("Çizim soru olarak eklendi.");
  }

  // Denklem görselinin kağıttaki genişliği. ÖNCEDEN üç ayrı kural vardı ve
  // üçü de içerikten bağımsızdı: satır içi punto*1.5, yeni soru
  // clamp(bağlam*0.4, 30, 70), seçili soruya ek clamp(bağlam*0.5, 24, 60).
  // Aynı denklem üç yerde üç farklı boyda çıkıyordu; tek bir "x²" sütunun
  // %40'ını kaplarken uzun bir denklem aynı 70 mm'ye sıkışıyordu.
  //
  // Tek kural: denklemi kendi DOĞAL boyutunda bas. Editördeki punto artık
  // gerçekten boyutu belirler ve raster görsel doğal boyutunda kaldığı için
  // bulanıklaşmaz. Bağlam genişliği yalnızca ÜST sınırdır.
  function denklemGenisligiMm(cikti: DenklemCikti, baglamMm: number) {
    const dogalYukseklikPt = cikti.denklemVerisi.punto * cikti.yukseklikOrani;
    const dogalGenislikMm = dogalYukseklikPt * cikti.oran * PT_MM;
    return Math.round(Math.max(15, Math.min(dogalGenislikMm, baglamMm)));
  }

  function denklemSorusuOlustur(
    cikti: DenklemCikti,
    hedef: "yeni" | "secili" | "inline",
  ) {
    if (denklemModal?.soruId) {
      if (denklemModal.ekGorselId) {
        const soru = sorular.find((s) => s.id === denklemModal.soruId);
        soruGuncelle(denklemModal.soruId, {
          ekGorseller: (soru?.ekGorseller ?? []).map((parca) =>
            parca.id === denklemModal.ekGorselId
              ? {
                  ...parca,
                  dataUrl: cikti.dataUrl,
                  oran: cikti.oran,
                  denklemVerisi: cikti.denklemVerisi,
                }
              : parca,
          ),
        });
      } else {
        soruGuncelle(denklemModal.soruId, {
          gorselDataUrl: cikti.dataUrl,
          gorselOran: cikti.oran,
          denklemVerisi: cikti.denklemVerisi,
        });
      }
      setDenklemModal(null);
      setAutosaveDurum("Denklem güncellendi.");
      return;
    }
    if (hedef === "secili" && seciliSoruId) {
      const hedefSoru = sorular.find((s) => s.id === seciliSoruId);
      if (hedefSoru?.tur === "gorsel") {
        const baglamMm = Math.max(20, soruIcerikGenisligi(hedefSoru) - 7);
        const parca = {
          id: yeniId(),
          dataUrl: cikti.dataUrl,
          dosyaAdi: "denklem.png",
          konum: "alt" as const,
          genislikMm: denklemGenisligiMm(cikti, baglamMm),
          oran: cikti.oran,
          denklemVerisi: cikti.denklemVerisi,
        };
        soruGuncelle(seciliSoruId, {
          ekGorseller: [...(hedefSoru.ekGorseller ?? []), parca],
        });
        setDenklemModal(null);
        setAutosaveDurum("Denklem seçili soruya eklendi.");
        return;
      }
    }
    const baglamMm = Math.max(
      20,
      (etkinCiftSutun ? sutunIcerikMm : tamIcerikMm) - 7,
    );
    const genislikMm = denklemGenisligiMm(cikti, baglamMm);
    const yeniSoru = gorselSoruYap(
      {
        gorselDataUrl: cikti.dataUrl,
        dosyaAdi: "denklem.png",
        genislikMm,
        boslukMm: varsayilanSoruBosluk,
      },
      { gorselOran: cikti.oran, denklemVerisi: cikti.denklemVerisi },
    );
    soruEkle(yeniSoru);
    setDenklemModal(null);
    setAutosaveDurum("Denklem soru olarak eklendi.");
  }

  function gorselDosyasiSec(file: File | undefined, adiOverride?: string) {
    setDosyaHatasi("");
    if (!file) return;
    gorselDosyasiniOku(file, adiOverride)
      .then(setGorselTaslak)
      .catch((err) =>
        setDosyaHatasi(
          err instanceof Error
            ? err.message
            : "Görsel okunamadı. Lütfen tekrar deneyin.",
        ),
      );
  }

  async function topluGorselDosyalariSec(files: FileList | null) {
    setDosyaHatasi("");
    const tumDosyalar = Array.from(files ?? []).sort((a, b) =>
        a.name.localeCompare(b.name, "tr", {
          numeric: true,
          sensitivity: "base",
        }),
      );
    if (tumDosyalar.length === 0) {
      setDosyaHatasi("Toplu ekleme için en az bir görsel seçin.");
      return;
    }
    const sonuclar = await sinirliAllSettled(tumDosyalar, 4, (file) => {
      if (!file.type.startsWith("image/")) {
        return Promise.reject(new Error("desteklenen bir görsel değil"));
      }
      return gorselDosyasiniOku(file);
    });
    const yeniSorular = sonuclar.flatMap((sonuc) =>
      sonuc.status === "fulfilled" ? [gorselSoruOlustur(sonuc.value)] : [],
    );
    if (yeniSorular.length) {
      setSorular((mevcut) => [...mevcut, ...yeniSorular]);
      setSeciliSoruId(yeniSorular[0]?.id ?? null);
    }
    const hatalar = sonuclar.flatMap((sonuc, index) =>
      sonuc.status === "rejected"
        ? [`${tumDosyalar[index].name} (${sonuc.reason instanceof Error ? sonuc.reason.message : "okunamadı"})`]
        : [],
    );
    setAutosaveDurum(`${yeniSorular.length} görsel soru toplu eklendi${hatalar.length ? ` · ${hatalar.length} dosya eklenemedi` : ""}.`);
    if (hatalar.length) {
      setDosyaHatasi(`Kısmi sonuç: ${yeniSorular.length} eklendi; eklenemeyenler: ${hatalar.slice(0, 5).join(", ")}${hatalar.length > 5 ? ` ve ${hatalar.length - 5} dosya daha` : ""}.`);
    }
  }

  function pdfDosyasiSec(file: File | undefined) {
    setDosyaHatasi("");
    if (!file) return;
    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setDosyaHatasi("Lütfen PDF dosyası seçin.");
      return;
    }
    const okuyucu = new FileReader();
    okuyucu.onload = () => {
      const data = okuyucu.result;
      if (!(data instanceof ArrayBuffer)) {
        setDosyaHatasi("PDF okunamadı.");
        return;
      }
      setPdfKaynak({ dosyaAdi: file.name, data });
      setAracModal("pdf-kaynak");
    };
    okuyucu.onerror = () =>
      setDosyaHatasi("PDF okunamadı. Lütfen tekrar deneyin.");
    okuyucu.readAsArrayBuffer(file);
  }

  function pdfKaynaginiKapat() {
    setAracModal(null);
    setPdfKaynak(null);
  }

  function gorselParcasiEkle(
    soruId: string,
    parca: {
      dataUrl: string;
      oran: number;
      konum: EkGorselKonumu;
      secimNo?: number;
      kaynakSayfaNo?: number;
      kaynakAd?: string;
      anaGorselDataUrl?: string;
      anaGorselOran?: number;
    },
  ): string {
    const genislikMm = Math.round(
      parca.konum === "yan"
        ? Math.max(18, Math.min(sutunIcerikMm * 0.38, 42))
        : Math.max(24, Math.min(sutunIcerikMm, 70)),
    );
    const ekId = yeniId();
    // Kapanıştaki `sorular` yerine functional update: hızlı ardışık
    // eklemelerde (ör. PDF'ten çoklu seçim) eski state üzerinden hesaplanan
    // ekGorseller listesinin bir önceki eklemeyi ezmesini önler.
    setSorular((mevcut) =>
      mevcut.map((soru) =>
        soru.id === soruId
          ? {
              ...soru,
              ...(parca.anaGorselDataUrl
                ? { gorselDataUrl: parca.anaGorselDataUrl }
                : {}),
              ...(parca.anaGorselDataUrl && parca.anaGorselOran
                ? { gorselOran: parca.anaGorselOran }
                : {}),
              ekGorseller: [
                ...(soru.ekGorseller ?? []),
                {
                  id: ekId,
                  dataUrl: parca.dataUrl,
                  dosyaAdi: parca.kaynakSayfaNo
                    ? `pdf-sayfa-${parca.kaynakSayfaNo}-secim-${parca.secimNo ?? ""}.png`
                    : "gorsel-parca.png",
                  konum: parca.konum,
                  genislikMm,
                  oran: parca.oran,
                  secimNo: parca.secimNo,
                  kaynakSayfaNo: parca.kaynakSayfaNo,
                  kaynakAd: parca.kaynakAd,
                },
              ],
            }
          : soru,
      ),
    );
    return ekId;
  }

  function ekGorselGenisligiAyarla(
    soruId: string,
    parcaId: string,
    mm: number,
  ) {
    setSorular((mevcut) =>
      mevcut.map((soru) =>
        soru.id === soruId
          ? {
              ...soru,
              ekGorseller: (soru.ekGorseller ?? []).map((parca) =>
                parca.id === parcaId ? { ...parca, genislikMm: mm } : parca,
              ),
            }
          : soru,
      ),
    );
  }

  function ekGorselParcasiSil(soruId: string, parcaId: string) {
    setSorular((mevcut) =>
      mevcut.map((soru) =>
        soru.id === soruId
          ? {
              ...soru,
              ekGorseller: (soru.ekGorseller ?? []).filter(
                (parca) => parca.id !== parcaId,
              ),
            }
          : soru,
      ),
    );
  }

  function pdfKaynakSil(bag: { soruId: string; ekGorselId?: string }) {
    if (bag.ekGorselId) {
      setSorular((mevcut) =>
        mevcut.map((soru) =>
          soru.id === bag.soruId
            ? {
                ...soru,
                ekGorseller: (soru.ekGorseller ?? []).filter(
                  (parca) => parca.id !== bag.ekGorselId,
                ),
              }
            : soru,
        ),
      );
    } else {
      soruSil(bag.soruId);
    }
  }

  function pdfKaynakSeciminiEkle(
    cikti: PdfKaynakCikti,
  ): { soruId: string; ekGorselId?: string } | null {
    let bag: { soruId: string; ekGorselId?: string } | null = null;
    if (cikti.hedef === "yeni") {
      const genislikMm = Math.round(
        Math.max(32, Math.min(seciliBaglamMm - 7, 85)),
      );
      const yeniSoru = gorselSoruYap(
        {
          gorselDataUrl: cikti.dataUrl,
          dosyaAdi: `pdf-sayfa-${cikti.sayfaNo}-secim-${cikti.secimNo}.png`,
          genislikMm,
          boslukMm: varsayilanSoruBosluk,
        },
        {
          gorselOran: cikti.oran,
          kaynakSecimNo: cikti.secimNo,
          kaynakSayfaNo: cikti.sayfaNo,
          kaynakAd: `${pdfKaynak?.dosyaAdi ?? "PDF"}, s. ${cikti.sayfaNo}`,
        },
      );
      soruEkle(yeniSoru);
      bag = { soruId: yeniSoru.id };
    } else if (seciliSoruId && cikti.konum) {
      const ekId = gorselParcasiEkle(seciliSoruId, {
        dataUrl: cikti.dataUrl,
        oran: cikti.oran,
        konum: cikti.konum,
        secimNo: cikti.secimNo,
        kaynakSayfaNo: cikti.sayfaNo,
        kaynakAd: `${pdfKaynak?.dosyaAdi ?? "PDF"}, s. ${cikti.sayfaNo}`,
      });
      bag = { soruId: seciliSoruId, ekGorselId: ekId };
    }
    ayarAyarla("kaynakSecimSayaci", (mevcut) => Math.max(mevcut + 1, cikti.secimNo + 1));
    return bag;
  }

  // Panodan görsel yapıştırma: ekran görüntüsü alınan soru Ctrl+V ile doğrudan eklenir.
  const gorselSecRef = useRef(gorselDosyasiSec);
  gorselSecRef.current = gorselDosyasiSec;
  useEffect(() => {
    function panodanYapistir(e: ClipboardEvent) {
      // Bir modal açıkken (ör. PDF/Çizim) bu global yapıştırma devre dışı —
      // aksi halde modal içine yapıştırılan görsel arka planda ayrı bir soru
      // olarak da eklenir.
      if (herhangiBirModalAcikRef.current) return;
      const hedef = e.target as HTMLElement | null;
      if (hedef && hedef.closest("input, textarea, [contenteditable]")) return;
      const oge = Array.from(e.clipboardData?.items ?? []).find((item) =>
        item.type.startsWith("image/"),
      );
      const dosya = oge?.getAsFile();
      if (!dosya) return;
      e.preventDefault();
      gorselSecRef.current(dosya, `pano-gorsel-${Date.now()}.png`);
    }
    window.addEventListener("paste", panodanYapistir);
    return () => window.removeEventListener("paste", panodanYapistir);
  }, []);

  function puanlariEsitDagit() {
    // BEP görünümünde 100 puan YALNIZ BEP sorularına (`bepPuan`) dağıtılır;
    // normal sınavın puanları bozulmaz. Eskiden tüm sorulara dağıtılıyor ve
    // BEP kâğıdı ör. 10 sorudan 5'i seçiliyken 50 puanda kalıyordu.
    if (bepAktif) {
      setSorular((mevcut) => bepPuanlariniEsitDagit(mevcut, bepSeciliIds));
      return;
    }
    setSorular((mevcut) => puanlariMantiksalEsitDagit(mevcut));
  }

  function taslagiTemizle() {
    setSorular([]);
    setSeciliSoruId(null);
    ayarAyarla("bepAktif", false);
    ayarAyarla("bepSeciliIds", []);
    { const id = aktifSinavIdRef.current; if (id) sinavIcerigiSil(id).catch(() => undefined); }
    setAutosaveDurum("Taslak temizlendi.");
    setTemizleOnayAcik(false);
  }

  function ogretmenGuncelle(index: number, value: string) {
    ayarAyarla("ogretmenler", (mevcut) =>
      mevcut.map((ad, i) => (i === index ? value : ad)),
    );
  }

  function ogretmenEkle() {
    ayarAyarla("ogretmenler", (mevcut) => (mevcut.length >= 4 ? mevcut : [...mevcut, ""]));
  }

  function ogretmenSil(index: number) {
    ayarAyarla("ogretmenler", (mevcut) =>
      mevcut.length <= 1 ? mevcut : mevcut.filter((_, i) => i !== index),
    );
  }

  const seciliBaglamMm = etkinCiftSutun ? sutunIcerikMm : tamIcerikMm;
  const seciliSoru = seciliSoruId
    ? sorular.find((soru) => soru.id === seciliSoruId)
    : undefined;
  const seciliSoruSirasi = seciliSoru
    ? soruSiraHaritasi.get(seciliSoru.id) ?? 0
    : 0;
  // Kağıttaki numara: B grubu karıştırması veya BEP alt kümesi devredeyken
  // liste sırasından FARKLI olur. Önceden panel yalnız liste numarasını
  // gösteriyordu; "3. soruyu düzenle" derken kağıtta 7 basılıyor ve öğretmen
  // hangi soruya baktığını doğrulayamıyordu. null = soru kağıtta hiç yok (BEP).
  const seciliSoruKagitSirasi = seciliSoru
    ? gorunenSoruSiraHaritasi.get(seciliSoru.id) ?? null
    : null;
  /** "Soru ekle" menüsü — geniş ve kompakt şerit AYNI listeyi kullanır.
   *  Bileşen değil fonksiyon: ekran içinde tanımlı bir bileşen her render'da
   *  yeniden bağlanır ve menüdeki odak her otomatik kayıt tikinde kaybolurdu. */
  function soruEkleMenusu() {
    return (
      <div ref={ustMenuRef} role="menu" aria-label="Soru ekleme seçenekleri" style={menuKonumStili} className={`${menuKonumSinifi} absolute right-0 z-40 w-52 space-y-1 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-2 shadow-xl`}>
        {[
          { etiket: "Görsel yükle", Ikon: FileImage, eylem: () => fileInputRef.current?.click() },
          { etiket: "Metin soru", Ikon: Type, eylem: () => setMetinModalAcik(true) },
          ...(GORSELDEN_METNE_AKTIF ? [{ etiket: "Görselden metne", Ikon: ScanText, eylem: () => setOcrModalAcik(true) }] : []),
          { etiket: "PDF’den seç", Ikon: BookOpen, eylem: () => pdfFileInputRef.current?.click() },
          { etiket: "Çizim ekle", Ikon: PenTool, eylem: () => setCizimModal({}) },
          { etiket: "Denklem ekle", Ikon: Sigma, eylem: () => setDenklemModal({}) },
        ].map(({ etiket, Ikon, eylem }) => (
          <button key={etiket} type="button" role="menuitem" tabIndex={-1} onClick={() => { setUstMenu(null); eylem(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50">
            <Ikon size={14} /> {etiket}
          </button>
        ))}
      </div>
    );
  }

  /** Dokunmatik/dar ekranda tek satırlık üst şerit (T9/K16/D13/Y23).
   *  360 px'te eski şerit 298 px, 1024 px tablette 102–124 px yer kaplıyor,
   *  düğmeler merdiven gibi kırılıyor, ad ve kayıt durumu kesiliyordu. Burada
   *  yalnız ad + kayıt noktası, "Soru ekle" ve "⋯" var; geri kalan her işlem
   *  "⋯" menüsünde. */
  function kompaktBaslikIcerigi() {
    const menuOgesi = "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40";
    const yazdirilamaz = gorunenSorular.length === 0 || yazdiriliyor;
    return (
      <>
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {adDuzenleniyor ? (
            <input
              autoFocus
              value={adTaslagi}
              onChange={(e) => setAdTaslagi(e.target.value)}
              onBlur={() => void sinavAdiniKaydet(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); void sinavAdiniKaydet(); }
                if (e.key === "Escape") { e.preventDefault(); setAdDuzenleniyor(false); setAdHatasi(""); }
              }}
              aria-label="Sınav adı"
              className="min-w-0 flex-1 rounded-lg border border-brand-300 px-2 py-1 text-base font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          ) : (
            <button
              type="button"
              onClick={() => { setAdTaslagi(aktifSinavAdi || ""); setAdHatasi(""); setAdDuzenleniyor(true); }}
              title="Sınav adını değiştir"
              className="flex min-w-0 items-center gap-1.5 rounded-lg px-1 text-left hover:bg-slate-100"
            >
              <h1 className="truncate text-base font-bold text-slate-800">{aktifSinavAdi || "Adsız sınav"}</h1>
              <Pencil size={13} className="shrink-0 text-slate-400" aria-hidden="true" />
            </button>
          )}
          <p
            className={`flex min-w-0 items-center gap-1.5 text-xs font-semibold ${adHatasi || kayitHatasiVar ? "text-rose-600" : "text-slate-400"}`}
            role="status"
            aria-live="polite"
            title={adHatasi || autosaveDurum}
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${kayitHatasiVar ? "bg-rose-500" : "bg-emerald-500"}`} aria-hidden="true" />
            {/* Telefonda metin yalnız ekran okuyucuya ve "⋯" menüsünün başına; nokta görünür kalır. */}
            <span className={`truncate ${darEkran ? "sr-only" : ""}`}>{adHatasi || autosaveDurum}</span>
          </p>
        </div>
        <nav aria-label="Sınav işlemleri" className="flex shrink-0 items-center gap-1.5">
          <div className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={ustMenu === "ekle"}
              onClick={(e) => ustMenuyuAcKapa("ekle", e.currentTarget)}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-brand-600 px-3 py-2 text-xs font-bold text-white hover:bg-brand-700"
            >
              <Plus size={15} /> Soru ekle
            </button>
            {ustMenu === "ekle" && soruEkleMenusu()}
          </div>
          <div className="relative">
            <button
              ref={(el) => { if (yanPanelModu === "ayarlar" && ustMenu === "diger") yanPanelAciciRef.current = el; }}
              type="button"
              aria-haspopup="menu"
              aria-expanded={ustMenu === "diger"}
              aria-label="Diğer işlemler"
              title="Diğer işlemler"
              onClick={(e) => ustMenuyuAcKapa("diger", e.currentTarget)}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
            >
              <MoreHorizontal size={18} />
            </button>
            {ustMenu === "diger" && (
              <div ref={ustMenuRef} role="menu" aria-label="Sınav işlemleri" style={menuKonumStili} className={`${menuKonumSinifi} absolute right-0 z-40 w-64 space-y-0.5 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-2 shadow-xl`}>
                <p className={`px-3 pb-1 pt-0.5 text-[11px] font-semibold ${kayitHatasiVar ? "text-rose-600" : "text-slate-400"}`}>{adHatasi || autosaveDurum}</p>
                <button type="button" role="menuitem" tabIndex={-1} className={menuOgesi} onClick={() => { setUstMenu(null); sinavlarimaGit(); }}><FolderOpen size={14} /> Sınavlarım</button>
                <button type="button" role="menuitem" tabIndex={-1} className={menuOgesi} disabled={yeniSinavIsleniyor} onClick={() => { setUstMenu(null); void yeniSinavaBasla(); }}><Plus size={14} /> {yeniSinavIsleniyor ? "Açılıyor…" : "Yeni sınav"}</button>
                <button type="button" role="menuitem" tabIndex={-1} className={menuOgesi} onClick={() => { const acici = ustMenuAciciRef.current; setUstMenu(null); yanPaneliAc("ayarlar", acici); }}><Settings size={14} /> Ayarlar</button>
                <div className="my-1 border-t border-slate-100" />
                {testModu ? (
                  <>
                    <button type="button" role="menuitem" tabIndex={-1} className={menuOgesi} disabled={yazdirilamaz} onClick={() => { setUstMenu(null); pdfYazdir(); }}><Printer size={14} /> Yazdır: yalnız sınav</button>
                    <button type="button" role="menuitem" tabIndex={-1} className={menuOgesi} disabled={yazdirilamaz || isaretliCevapSayisi === 0} onClick={() => { setUstMenu(null); sinavVeAnahtarYazdir(); }}><FileDown size={14} /> Yazdır: sınav + anahtar</button>
                    <button type="button" role="menuitem" tabIndex={-1} className={menuOgesi} disabled={yazdirilamaz || isaretliCevapSayisi === 0} onClick={() => { setUstMenu(null); cevapAnahtariYazdir(); }}><FileDown size={14} /> Yazdır: yalnız cevap anahtarı</button>
                  </>
                ) : (
                  <button type="button" role="menuitem" tabIndex={-1} className={menuOgesi} disabled={yazdirilamaz} onClick={() => { setUstMenu(null); pdfYazdir(); }}><Printer size={14} /> {yazdiriliyor ? "Hazırlanıyor…" : "Yazdır / PDF olarak kaydet"}</button>
                )}
                <button type="button" role="menuitem" tabIndex={-1} className={menuOgesi} disabled={sorular.length === 0} onClick={() => { setUstMenu(null); taslagiDosyayaKaydet(); }}><Download size={14} /> Sınavı dosyaya kaydet</button>
                <button type="button" role="menuitem" tabIndex={-1} className={menuOgesi} onClick={() => { setUstMenu(null); taslakFileInputRef.current?.click(); }}><Upload size={14} /> Dosyadan sınav aç</button>
                <div className="my-1 border-t border-slate-100" />
                <button type="button" role="menuitem" tabIndex={-1} className={menuOgesi} disabled={geriSayisi === 0} onClick={() => { setUstMenu(null); geriAl(); }}><RotateCcw size={14} /> {geriSayisi > 0 ? `Geri al (${geriSayisi} adım)` : "Geri al"}</button>
                <button type="button" role="menuitem" tabIndex={-1} className={menuOgesi} disabled={ileriSayisi === 0} onClick={() => { setUstMenu(null); ileriAl(); }}><RotateCw size={14} /> {ileriSayisi > 0 ? `İleri al (${ileriSayisi} adım)` : "İleri al"}</button>
                <button type="button" role="menuitem" tabIndex={-1} className={menuOgesi} onClick={() => { setUstMenu(null); setYardimAcik(true); }}><HelpCircle size={14} /> {dokunmatik ? "İpuçları" : "Kısayollar ve ipuçları"}</button>
              </div>
            )}
          </div>
        </nav>
      </>
    );
  }

  return (
    <div className={`sinav-editor-root mx-auto flex max-w-[1720px] flex-col ${telefonDuzeni ? "min-h-full px-1.5 pb-24 pt-2" : "h-full px-3 pb-3 pt-5"}`}>
      {/* Telefonda TEK kaydırma (OA52): kök yükseklikle sınırlanmaz, kâğıt ve liste
          kendi içinde dikey kaymaz — sayfa (main) kayar. Önceki düzende üç iç içe
          kaydırma kutusu vardı ve kâğıda ~230 px kalıyordu. */}
      <KaydedilmemisDegisiklikKoruyucu etkin={autosaveDurum.includes("kaydedilecek") || autosaveDurum.includes("kaydedilemedi")} />
      <TelefonBilgisi anahtar="sinav-olusturucu" metin="Telefonda sınavı açıp düzeltebilir, yazdırabilir ve PDF paylaşabilirsiniz. Kâğıdı iki parmakla büyütün. Uzun düzenleme tablette daha rahattır." />
      <header className={`${telefonDuzeni ? "relative" : "sticky top-0"} z-30 shrink-0 items-center justify-between rounded-2xl border border-slate-200 bg-white/95 px-3 py-1.5 shadow-sm backdrop-blur ${kompaktBaslik ? "flex-nowrap gap-2" : "flex-wrap gap-3"} ${odakKagit ? "hidden" : "flex"}`}>
        {kompaktBaslik ? kompaktBaslikIcerigi() : (<>
        {/* Tek satır: başlık + ad + durum. Eskiden ad salt-okunur bir rozetti ve
            durum ayrı satırdaydı; ikisi de dikey alan yiyordu. Ad artık burada
            düzenlenebiliyor — öğretmen sınavı adlandırmak için Sınavlarım'a
            gitmek zorunda kalmıyor. */}
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="shrink-0 text-brand-600" size={20} />
          {adDuzenleniyor ? (
            <input
              autoFocus
              value={adTaslagi}
              onChange={(e) => setAdTaslagi(e.target.value)}
              onBlur={() => void sinavAdiniKaydet(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); void sinavAdiniKaydet(); }
                if (e.key === "Escape") { e.preventDefault(); setAdDuzenleniyor(false); setAdHatasi(""); }
              }}
              aria-label="Sınav adı"
              className="min-w-0 max-w-[22rem] flex-1 rounded-lg border border-brand-300 px-2 py-1 text-base font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          ) : (
            <button
              type="button"
              onClick={() => { setAdTaslagi(aktifSinavAdi || ""); setAdHatasi(""); setAdDuzenleniyor(true); }}
              title="Sınav adını değiştir"
              className="group flex min-w-0 items-center gap-1.5 rounded-lg px-1.5 py-0.5 text-left hover:bg-slate-100"
            >
              <h1 className="truncate text-base font-bold text-slate-800 sm:text-lg">
                {aktifSinavAdi || "Adsız sınav"}
              </h1>
              <Pencil size={13} className="shrink-0 text-slate-400 group-hover:text-brand-600" />
            </button>
          )}
          {/* Kayıt durumunun TEK yeri. Eskiden ayrıca bir "Sınav durumu"
              şeridi vardı ve aynı metni aynı anda ikinci kez yazıyordu; bu
              satır da `lg` altında gizlendiği için hangisinin asıl olduğu
              belirsizdi. Şerit kaldırıldı, oradaki tek benzersiz öğe olan
              yeşil/kırmızı nokta buraya taşındı — nokta bilerek duruyor:
              hata eskiden yalnız metne gömülüydü ve öğretmen saatlerce
              kaydedilmediğini fark etmiyordu. */}
          <p
            className={`flex min-w-0 items-center gap-1.5 text-xs font-semibold ${adHatasi || kayitHatasiVar ? "text-rose-600" : "text-slate-400"}`}
            role="status"
            aria-live="polite"
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${kayitHatasiVar ? "bg-rose-500" : "bg-emerald-500"}`}
              aria-hidden="true"
            />
            <span className="truncate">{adHatasi || autosaveDurum}</span>
          </p>
        </div>
        <nav aria-label="Sınav işlemleri" className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={sinavlarimaGit}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <FolderOpen size={15} /> Sınavlarım
          </button>
          <button
            type="button"
            onClick={() => void yeniSinavaBasla()}
            disabled={yeniSinavIsleniyor}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            <Plus size={15} /> {yeniSinavIsleniyor ? "Açılıyor…" : "Yeni sınav"}
          </button>
          <button
            type="button"
            onClick={() => setYardimAcik(true)}
            aria-label="Kısayollar ve ipuçları"
            title="Kısayollar ve ipuçları"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
          >
            <HelpCircle size={16} />
          </button>
          <div role="group" aria-label="Soru araçları" className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
          <div className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={ustMenu === "ekle"}
              onClick={(e) => ustMenuyuAcKapa("ekle", e.currentTarget)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-xs font-bold text-white hover:bg-brand-700"
            >
              <Plus size={15} /> Soru ekle
            </button>
            {ustMenu === "ekle" && soruEkleMenusu()}
          </div>
          </div>
          {/* Geri al/ileri al ARAÇ ÇUBUĞUNDA, menüde değil.
              Sebep bir kolaylık değil, erişilebilirlik boşluğu: yan panel
              1680px ALTINDA gerçek bir modal (`aria-modal`) ve global Ctrl+Z
              o sırada bilerek devre dışı — modalların kendi geri-al'ı ile
              çakışmasın diye. Menüde durduğu sürece, ayar panelini açıp bir
              değeri bozan öğretmenin geri alma yolu HİÇ kalmıyordu: ne
              kısayol, ne düğme. Üst şerit panelin dışında olduğu için bu iki
              düğme panel açıkken de tıklanabilir. Ctrl+Z'nin modal kuralına
              DOKUNULMADI; o kural doğru. */}
          <div role="group" aria-label="Geri alma araçları" className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={geriAl}
              disabled={geriSayisi === 0}
              title={geriSayisi > 0 ? `Geri al · ${geriSayisi} adım (${kisayol("Ctrl+Z")})` : "Geri alınacak adım yok"}
              aria-label={geriSayisi > 0 ? `Geri al, ${geriSayisi} adım` : "Geri al, geri alınacak adım yok"}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCcw size={16} />
            </button>
            <button
              type="button"
              onClick={ileriAl}
              disabled={ileriSayisi === 0}
              title={ileriSayisi > 0 ? `İleri al · ${ileriSayisi} adım (${kisayol("Ctrl+Shift+Z")})` : "İleri alınacak adım yok"}
              aria-label={ileriSayisi > 0 ? `İleri al, ${ileriSayisi} adım` : "İleri al, ileri alınacak adım yok"}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RotateCw size={16} />
            </button>
          </div>
          <div role="group" aria-label="Sınav ve çıktı araçları" className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
          <button
            ref={(el) => { if (yanPanelModu === "ayarlar") yanPanelAciciRef.current = el; }}
            type="button"
            onClick={(e) => yanPaneliAc("ayarlar", e.currentTarget)}
            aria-haspopup="dialog"
            aria-expanded={yanPanelModu === "ayarlar"}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Settings size={15} /> Ayarlar
          </button>
          {/* Yazdır: TEST kipinde açılır menü, yazılıda düz düğme.
              Öğretmen "yazdır dediğimde cevaplı/cevapsız seçemiyorum" dedi —
              seçenekler yalnız Ayarlar → Çıktı bölümünün içindeydi, yani asıl
              yazdırma düğmesinden ulaşılamıyordu. Yazılı kipinde cevap anahtarı
              diye bir şey olmadığı için orada menü açmak boş bir tık üretirdi. */}
          {testModu ? (
            <div className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={ustMenu === "yazdir"}
                onClick={(e) => ustMenuyuAcKapa("yazdir", e.currentTarget)}
                disabled={gorunenSorular.length === 0 || yazdiriliyor}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Printer size={15} /> {yazdiriliyor ? "Hazırlanıyor" : "Yazdır"}
              </button>
              {ustMenu === "yazdir" && (
                <div ref={ustMenuRef} role="menu" aria-label="Yazdırma seçenekleri" style={menuKonumStili} className={`${menuKonumSinifi} absolute right-0 z-40 w-64 overflow-y-auto space-y-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl`}>
                  <button type="button" role="menuitem" tabIndex={-1} onClick={() => { setUstMenu(null); pdfYazdir(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50">
                    <Printer size={14} /> Yalnız sınav (cevapsız)
                  </button>
                  <button type="button" role="menuitem" tabIndex={-1} onClick={() => { setUstMenu(null); sinavVeAnahtarYazdir(); }} disabled={isaretliCevapSayisi === 0} title={isaretliCevapSayisi === 0 ? "Önce sorularda doğru şıkkı işaretleyin" : undefined} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                    <FileDown size={14} /> Sınav + anahtar (testin sonunda)
                  </button>
                  <button type="button" role="menuitem" tabIndex={-1} onClick={() => { setUstMenu(null); cevapAnahtariYazdir(); }} disabled={isaretliCevapSayisi === 0} title={isaretliCevapSayisi === 0 ? "Önce sorularda doğru şıkkı işaretleyin" : undefined} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                    <FileDown size={14} /> Yalnız cevap anahtarı (ayrı sayfa)
                  </button>
                  <p className="px-3 pb-1 pt-1 text-[10px] leading-relaxed text-slate-400">
                    {isaretliCevapSayisi === 0
                      ? "Hiçbir soruda doğru şık işaretli değil."
                      : `${isaretliCevapSayisi}/${mantiksalSoruSayisi} soruda doğru şık işaretli.`}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={pdfYazdir}
              disabled={gorunenSorular.length === 0 || yazdiriliyor}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Printer size={15} /> {yazdiriliyor ? "Hazırlanıyor" : "Yazdır"}
            </button>
          )}
          </div>
          <div role="group" aria-label="Dosya araçları" className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
          <div className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={ustMenu === "dosya"}
              onClick={(e) => ustMenuyuAcKapa("dosya", e.currentTarget)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <Save size={15} /> Kaydet / Yükle
            </button>
            {ustMenu === "dosya" && (
              <div ref={ustMenuRef} role="menu" aria-label="Taslak dosyası işlemleri" style={menuKonumStili} className={`${menuKonumSinifi} absolute right-0 z-40 w-56 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl`}>
                <button type="button" role="menuitem" tabIndex={-1} onClick={() => { setUstMenu(null); taslagiDosyayaKaydet(); }} disabled={sorular.length === 0} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"><Download size={14} /> Dosyaya kaydet</button>
                <button type="button" role="menuitem" tabIndex={-1} onClick={() => { setUstMenu(null); taslakFileInputRef.current?.click(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50"><Upload size={14} /> Dosyadan aç</button>
                {/* PDF indirme, yazdırma diyaloğunun "PDF olarak kaydet"
                    seçeneğine dayanır (macOS'ta sol altta, Windows'ta
                    "Microsoft Print to PDF"). Ayrı bir PDF üretici YOK: ne
                    wry ne tauri hazır bir API veriyor, JS kütüphanesi ise
                    kâğıdı görüntüye çevirip metni seçilemez hâle getirirdi.
                    Bu yol çıktının birebir aynısını verir. */}
                <div className="my-1 border-t border-slate-100" />
                <button type="button" role="menuitem" tabIndex={-1} onClick={() => { setUstMenu(null); pdfYazdir(); }} disabled={gorunenSorular.length === 0 || yazdiriliyor} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"><FileDown size={14} /> {yazdiriliyor ? "Hazırlanıyor…" : "Yazdır / PDF olarak kaydet"}</button>
                <p className="px-3 pb-1 text-[10px] leading-relaxed text-slate-400">Açılan pencerede hedef olarak “PDF olarak kaydet”i seçin.</p>
              </div>
            )}
          </div>
          {/* "Diğer işlemler" kebabı KALDIRILDI. İçinde üç madde vardı;
              geri al/ileri al üst şeride sabit düğme oldu, geriye tek bir
              "Soru seçimini bırak" kalmıştı. Tek maddelik bir açılır menü,
              eylemi bulmayı kolaylaştırmak yerine iki tıklık bir engel
              yapıyordu; o eylem artık Escape. */}
          </div>
        </nav>
        </>)}
      </header>

      {/* "Sınav durumu" şeridi buradaydı ve BEŞ öğesinin BEŞİ de başka bir
          yerde birebir tekrarlanıyordu: kayıt durumu üst başlıkta (aynı anda,
          aynı metin), soru/sayfa/puan önizleme satırında, "Tasarım görünümü"
          ise Tasarım/Çıktı düğmesinin zaten gösterdiği durumdu. Tek benzersiz
          öğesi olan yeşil/kırmızı nokta başlığa taşındı; şerit kaldırıldı ve
          kâğıda ~50px dikey alan geri geldi. */}

      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { const secilen = e.target.files; if (secilen && secilen.length > 1) void topluGorselDosyalariSec(secilen); else gorselDosyasiSec(secilen?.[0]); e.target.value = ""; }} />
      <input ref={pdfFileInputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { pdfDosyasiSec(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={taslakFileInputRef} type="file" accept={dosyaKabulu(".oa27sinav,.json,application/json,application/vnd.oa27.encrypted-exam+json")} className="hidden" onChange={(e) => { taslakDosyaSecildi(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={logoFileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { logoDosyasiSec(e.target.files?.[0]); e.target.value = ""; }} />

      {kayitHatasiVar && (
        <div role="alert" className="mt-3 flex shrink-0 flex-wrap items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs text-rose-900">
          <AlertTriangle size={16} className="shrink-0" />
          <span className="min-w-0 flex-1 font-semibold">
            Taslak otomatik kaydedilemedi — çalışmanız şu an yalnızca bu ekranda duruyor.
            Depolama alanı dolmuş olabilir. Kaybetmemek için hemen dosyaya kaydedin.
          </span>
          <button
            type="button"
            onClick={taslagiDosyayaKaydet}
            className="rounded-lg bg-white px-3 py-1.5 font-bold ring-1 ring-rose-200 transition hover:bg-rose-100"
          >
            Hemen dosyaya kaydet
          </button>
        </div>
      )}

      {/* Dosya hatası eskiden soru listesi panelinin İÇİNDE çiziliyordu. Panel
          daraltılınca (68 px) metin harf harf alt alta dizilip okunamaz hâle
          geliyordu — üstelik hata tam da o sırada önemli. Hata ekranın
          tamamına ait olduğu için diğer bantlarla aynı yere alındı. */}
      {dosyaHatasi && (
        <div role="alert" className="mt-3 flex shrink-0 flex-wrap items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-900">
          <AlertTriangle size={16} className="shrink-0" />
          <span className="min-w-0 flex-1 font-semibold">{dosyaHatasi}</span>
          <button
            type="button"
            onClick={() => setDosyaHatasi("")}
            className="rounded-lg bg-white px-3 py-1.5 font-bold ring-1 ring-rose-200 transition hover:bg-rose-100"
          >
            Tamam
          </button>
        </div>
      )}

      {bepAktif && (
        <div className="mt-4 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-violet-300 bg-violet-50 px-4 py-2.5">
          <span className="flex items-center gap-2 text-sm font-bold text-violet-800">
            <Shuffle size={16} className="shrink-0" /> BEP GÖRÜNÜMÜ AKTİF —
            ekranda ve çıktıda yalnızca {mantiksalSoruSayisi} soru gösteriliyor
            (kağıda BEP ibaresi basılmaz).
          </span>
          <button
            type="button"
            onClick={() => ayarAyarla("bepAktif", false)}
            className="rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-xs font-bold text-violet-700 transition hover:bg-violet-100"
          >
            Normal Taslağa Dön
          </button>
        </div>
      )}

      {/* ODAK KİPİ ("Sadece kâğıt"): üst şerit ve soru listesi gizlenir, kâğıt
          tüm genişliği alır. Ölçüldü (1200×800): önizleme sütunu 632 → 1120 px.
          Kâğıt 700 px çizildiği için varsayılan düzende %100'de sığmıyordu.
          Kipten çıkış hem düğmeyle hem Escape ile — düğme önizleme şeridinde
          kalıyor, yani kip açıkken de görünür bir çıkış var.

          Üç sütunlu düzenin kırılma noktası bilinçli olarak Tailwind'in
          `2xl` (1536px) DEĞİL, özel `min-[1680px]`: soru listesi (280px) +
          kâğıt (min 700px) + sağ panel (340px) + boşluklar ~1370px istiyor,
          bu da app/Layout.tsx'teki sol menü AÇIKKEN (272px) toplamda ~1640px
          gerektiriyor. 1536px'te (yaygın bir dizüstü çözünürlüğü) sol menü
          açıkken üç sütun sığmadan zorla açılıyor, sağ panel kesiliyordu.
          Bu eşiğin ALTINDA panel `yanPanelModu` ile açılıp kapanan kayan bir
          çekmeceye (aşağıdaki `<aside>`) düşer — asıl güvenli durum odur. */}
      {/* Satır sınıfı KİPE GÖRE tamamen seçilir (D4): eskiden odak kipinde
          `grid-rows-1` eklenip `grid-rows-[minmax(220px,35vh)…]` yerinde
          kalıyordu; CSS sırası aynı olduğu için 1024 altında kâğıt 35vh'lik
          ilk satıra sıkışıyordu. Boş sınavda liste satırı `auto` (D13): "Henüz
          soru yok" için ~460 px boş alan ayrılıyordu. */}
      {telefonDuzeni && !odakKagit && sorular.length > 0 && (
        <div role="tablist" aria-label="Görünüm" className="sticky top-0 z-20 mt-2 grid shrink-0 grid-cols-2 gap-1 rounded-xl bg-slate-200 p-1 shadow-sm">
          {([["sorular", `Sorular (${mantiksalSoruSayisi})`], ["kagit", `Kâğıt (${Math.max(1, sayfalar.length)} sayfa)`]] as const).map(([deger, ad]) => (
            <button key={deger} type="button" role="tab" aria-selected={telefonSekme === deger} onClick={() => setTelefonSekme(deger)}
              className={`rounded-lg px-2 py-2 text-sm font-bold transition ${telefonSekme === deger ? "bg-white text-brand-700 shadow-sm" : "text-slate-600"}`}>
              {ad}
            </button>
          ))}
        </div>
      )}
      <div className={`${telefonDuzeni ? "mt-2 gap-2" : "mt-3 gap-3"} grid min-h-0 flex-1 ${
        telefonDuzeni
          ? "grid-cols-1"
          : odakKagit
          ? "grid-rows-[minmax(max(520px,calc(100dvh-5rem)),1fr)] lg:grid-rows-1"
          : sorular.length === 0
            ? "grid-rows-[max-content_minmax(520px,1fr)] lg:grid-rows-1"
            : "grid-rows-[minmax(220px,35vh)_minmax(520px,1fr)] lg:grid-rows-1"
      } ${
        telefonDuzeni
          ? ""
          : odakKagit
          ? "lg:grid-cols-[minmax(0,1fr)]"
          : soruListesiDar
            ? "lg:grid-cols-[68px_minmax(0,1fr)] min-[1680px]:grid-cols-[68px_minmax(700px,1fr)_340px]"
            : "lg:grid-cols-[260px_minmax(0,1fr)] min-[1680px]:grid-cols-[280px_minmax(700px,1fr)_340px]"
      }`}>
        <aside aria-label="Soru listesi" className={`flex min-h-0 flex-col ${telefonDuzeni ? "" : "overflow-hidden"} rounded-2xl border border-slate-200 bg-white shadow-sm ${odakKagit || (telefonDuzeni && (telefonSekme !== "sorular" || sorular.length === 0)) ? "hidden" : ""}`}>
          <div className="shrink-0 border-b border-slate-100 p-3">
            <div className="flex items-center justify-between gap-2">
              {!soruListesiDar && <PanelBaslik>Sorular</PanelBaslik>}
              {!soruListesiDar && <span className="text-[10px] font-semibold text-slate-400">{mantiksalSoruSayisi} soru</span>}
              <button type="button" onClick={soruListesiniAcKapa} aria-label={soruListesiDar ? "Soru listesini genişlet" : "Soru listesini daralt"} aria-expanded={!soruListesiDar} className="ml-auto hidden rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:inline-flex">
                {soruListesiDar ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              </button>
            </div>
          </div>

          <section className={`min-h-0 flex-1 ${telefonDuzeni ? "" : "overflow-y-auto"} ${soruListesiDar ? "hidden lg:block lg:p-1.5" : "p-3"}`}>
            {soruListesiDar ? (
              <div className="hidden space-y-1.5 lg:block" aria-label="Daraltılmış soru listesi">
                {Array.from({ length: mantiksalSoruSayisi }, (_, index) => (
                  <button key={index} type="button" onClick={() => { const soru = sorular.find((oge) => (soruSiraHaritasi.get(oge.id) ?? 0) === index + 1); if (soru) setSeciliSoruId(soru.id); }} aria-label={`${index + 1}. soruyu seç`} className={`flex h-10 w-full items-center justify-center rounded-lg text-xs font-bold ${seciliSoruSirasi === index + 1 ? "bg-brand-600 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}>{index + 1}</button>
                ))}
              </div>
            ) : (
            <SoruListesi
              sorular={sorular}
              seciliSoruId={seciliSoruId}
              onSec={(id) => {
                setSeciliSoruId(id);
                // Telefonda listeden seçilen soru kâğıtta gösterilir (seçili soru
                // çubuğu — puan, çoğalt, sil, Tümü — kâğıt görünümünde).
                if (telefonDuzeni && id) setTelefonSekme("kagit");
              }}
              onChange={soruGuncelle}
              onYukari={(id) => soruTasi(id, "yukari")}
              onAsagi={(id) => soruTasi(id, "asagi")}
              onSil={soruSil}
              onSirala={soruSirala}
              onCogalt={soruCogalt}
              ciftSutun={ciftSutun}
              soruIcerikGenisligi={soruIcerikGenisligi}
              duzenlemePaneliGoster={false}
            />
            )}
          </section>
        </aside>

        {/* `section`, `main` DEĞİL (T22): app/Layout.tsx'teki `#main-content`
            zaten ana bölge; iç içe ikinci <main> ekran okuyucuda iki ana bölge
            üretiyordu. */}
        <section aria-label="Sınav kâğıdı" className={`relative min-h-0 min-w-0 flex-col ${telefonDuzeni ? "" : "overflow-hidden"} rounded-2xl border border-slate-200 bg-slate-100/70 shadow-sm ${telefonDuzeni ? "p-1.5" : "p-3"} ${telefonDuzeni && telefonSekme === "sorular" && sorular.length > 0 && !odakKagit ? "hidden" : "flex"}`}>
          <div className={`shrink-0 ${telefonDuzeni ? "pb-1.5" : "pb-3"}`}>
            <div className={`flex flex-wrap items-center text-xs font-semibold text-slate-500 ${telefonDuzeni ? "gap-1.5" : "gap-2"}`}>
              {telefonDuzeni && (
                // Telefonda iki ayar hapı (sınav türü, sütun) + Soru/Sayfa yazısı
                // üç satır kaplıyordu; tek "Ayarlar" düğmesi aynı paneli açar,
                // soru/sayfa sayısı zaten sekme adlarında yazıyor.
                <button
                  type="button"
                  onClick={(e) => yanPaneliAc("ayarlar", e.currentTarget, "sinav")}
                  aria-haspopup="dialog"
                  aria-label={`Sınav ayarları: ${testModu ? "Test" : "Yazılı"}, ${etkinCiftSutun ? "çift" : "tek"} sütun`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 ring-1 ring-slate-200"
                >
                  <Settings size={13} aria-hidden="true" /> {testModu ? "Test" : "Yazılı"} · {etkinCiftSutun ? "2 sütun" : "1 sütun"}
                </button>
              )}
              {!telefonDuzeni && (<>
              {/* Bu satırda eskiden YEDİ rozet vardı ve beşi ölü <span>'dı —
                  ama tıklanabilir ikisiyle (Tasarım/Çıktı) birebir aynı
                  görünüyorlardı: aynı hap biçimi, aynı çerçeve. En sık
                  takılınan yer "Çift sütun"a tıklayıp hiçbir şey olmamasıydı;
                  o bir bilgi değil, AYAR.

                  Ayrım artık biçimde: ayarlar gerçek düğme (çerçeve + imleç +
                  dişli), bilgi ise düz metin. Ayar düğmeleri değeri BURADA
                  çevirmiyor, Ayarlar panelini açıyor — çünkü BEP açıkken sütun
                  düzeni zorlanıyor (etkinCiftSutun ≠ ciftSutun) ve buradan
                  çevirmek "tıkladım, geri döndü" gibi görünürdü. */}
              <button
                type="button"
                onClick={(e) => yanPaneliAc("ayarlar", e.currentTarget, "sinav")}
                aria-haspopup="dialog"
                title="Sınav türünü Ayarlar'dan değiştirin"
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300"
              >
                <Settings size={12} aria-hidden="true" />
                {testModu ? "Test Kağıdı (A4)" : "Yazılı Kağıdı (A4)"}
              </button>
              <button
                type="button"
                onClick={(e) => yanPaneliAc("ayarlar", e.currentTarget, "sayfaDuzeni")}
                aria-haspopup="dialog"
                title="Sayfa düzenini Ayarlar'dan değiştirin"
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300"
              >
                <Columns size={12} aria-hidden="true" />
                {etkinCiftSutun ? "Çift sütun" : "Tek sütun"}
              </button>
              <span className="text-slate-400">
                Soru: {mantiksalSoruSayisi}
              </span>
              <span className="text-slate-400">
                Sayfa: {Math.max(1, sayfalar.length)}
              </span>
              </>)}
              {/* Cevap anahtarının durumu üst çubukta. Önceden bu sayı yalnız
                  "Çıktı" bölümündeki düğmenin üstünde yazıyordu — yani anahtarı
                  basmaya kalkmadan kaç sorunun işaretsiz olduğunu görmenin yolu
                  yoktu. Tıklayınca ilk işaretsiz soruya götürür. */}
              {testModu && mantiksalSoruSayisi > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const ilkEksik = gorunenSorular.find((soru) => !soru.dogruSik);
                    if (ilkEksik) setSeciliSoruId(ilkEksik.id);
                  }}
                  disabled={isaretliCevapSayisi === mantiksalSoruSayisi}
                  title={
                    isaretliCevapSayisi === mantiksalSoruSayisi
                      ? "Tüm soruların doğru şıkkı işaretli"
                      : "İşaretsiz ilk soruya git"
                  }
                  className={`rounded-full px-2 py-0.5 font-semibold transition disabled:cursor-default ${
                    isaretliCevapSayisi === mantiksalSoruSayisi
                      ? "text-emerald-700"
                      : "text-amber-700 hover:bg-amber-50"
                  }`}
                >
                  Cevap anahtarı: {isaretliCevapSayisi}/{mantiksalSoruSayisi}
                </button>
              )}
              {/* Ölçek denetimi bilgi değil AYAR — §15.1'in ayrımı gereği
                  gerçek düğmeler. Yalnız ekranı büyütür; çıktı ve sayfalama
                  etkilenmez (lib/onizlemeZoom.ts). */}
              <div className="flex items-center gap-0.5 rounded-full bg-white px-1 py-0.5 ring-1 ring-slate-200" role="group" aria-label="Önizleme yakınlaştırma">
                <button
                  type="button"
                  aria-label="Önizlemeyi uzaklaştır"
                  disabled={onizlemeZoom <= ZOOM_ADIMLARI[0]}
                  onClick={() => zoomElleDegistir(zoomAdimla(onizlemeZoom, -1))}
                  className="rounded-full px-2 py-0.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40 [@media(pointer:coarse)]:min-w-[44px]"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => zoomElleDegistir(1)}
                  title="Gerçek boyuta dön (%100)"
                  className="min-w-[3.2rem] rounded-full px-1 py-0.5 tabular-nums text-slate-600 hover:bg-slate-100"
                >
                  %{Math.round(onizlemeZoom * 100)}
                </button>
                <button
                  type="button"
                  aria-label="Önizlemeyi yakınlaştır"
                  disabled={onizlemeZoom >= ZOOM_ADIMLARI[ZOOM_ADIMLARI.length - 1]}
                  onClick={() => zoomElleDegistir(zoomAdimla(onizlemeZoom, 1))}
                  className="rounded-full px-2 py-0.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40 [@media(pointer:coarse)]:min-w-[44px]"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={onizlemeyiGenisligeSigdir}
                  title="Kâğıdı sütun genişliğine sığdır"
                  className="rounded-full px-2 py-0.5 text-slate-500 hover:bg-slate-100"
                >
                  Sığdır
                </button>
              </div>
              <button
                type="button"
                onClick={() => setOdakKagit((v) => !v)}
                aria-pressed={odakKagit}
                title={odakKagit ? "Üst şeridi ve soru listesini geri getir (Esc)" : "Üst şeridi ve soru listesini gizle, kâğıdı büyüt"}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ring-1 transition ${
                  odakKagit
                    ? "bg-brand-600 text-white ring-brand-600 hover:bg-brand-700"
                    : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300"
                }`}
              >
                <Maximize2 size={12} aria-hidden="true" />
                {odakKagit ? (telefonDuzeni ? "Geri" : "Şeritleri göster") : (telefonDuzeni ? "Tam ekran" : "Sadece kâğıt")}
              </button>
              <div className="flex items-center gap-1.5" role="group" aria-label="Önizleme modu">
                <TogglePill aktif={onizlemeModu === "tasarim"} onClick={() => setOnizlemeModu("tasarim")}>Tasarım</TogglePill>
                <TogglePill aktif={onizlemeModu === "cikti"} onClick={() => { setOnizlemeModu("cikti"); setSeciliSoruId(null); }}>Çıktı</TogglePill>
              </div>
              {/* Puan da bilgi — ama rengi anlam taşıyor (100 tam, üstü hata),
                  o yüzden hap değil, renkli metin. */}
              <span
                title={bepAktif ? "BEP kâğıdının toplam puanı" : undefined}
                className={
                  toplamPuan === 100
                      ? "text-emerald-700"
                      : toplamPuan > 100
                        ? "text-rose-700"
                        : "text-slate-400"
                }
              >
                Puan: {toplamPuan}/100
              </span>
              {seciliSoru && (
                <button
                  type="button"
                  onClick={(e) => yanPaneliAc("soru", e.currentTarget, "seciliSoru")}
                  aria-haspopup="dialog"
                  className={`ml-auto items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1 font-bold text-white min-[1680px]:hidden ${telefonDuzeni ? "hidden" : "inline-flex"}`}
                >
                  <Pencil size={13} /> {seciliSoruSirasi}. soruyu düzenle
                  {seciliSoruKagitSirasi != null &&
                    seciliSoruKagitSirasi !== seciliSoruSirasi &&
                    ` (kağıtta ${seciliSoruKagitSirasi}.)`}
                </button>
              )}
            </div>
          </div>

          <div
            ref={onizlemeKaydirRef}
            // `min-w-[700px]` yalnız üç sütunlu geniş düzende: daha dar ekranda
            // kap 700 px'te kalıp `overflow-hidden` ebeveyn tarafından sağdan
            // KIRPILIYOR ve kaydırılamıyordu (Y2/K16). Artık kap sütuna uyar,
            // kâğıt otomatik sığdırılır, sığmazsa yatay kayar.
            className={`min-h-0 min-w-0 min-[1680px]:min-w-[700px] flex-1 ${telefonDuzeni ? "overflow-x-auto" : "overflow-auto pr-1"}`}
            // Tarayıcının kendi sayfa yakınlaştırması iki parmak hareketini yutmasın.
            style={{ touchAction: "pan-x pan-y" }}
          >
            {gorunenSorular.length === 0 ? (
              <BosCalismaAlani
                onGorsel={() => fileInputRef.current?.click()}
                onMetin={() => setMetinModalAcik(true)}
                onKirpma={() => pdfFileInputRef.current?.click()}
              />
            ) : (
              /* Ölçek YALNIZ kâğıdı sarar; boş çalışma alanı bir yönlendirme
                 paneli, kâğıt değil — onu da büyütmek anlamsız olurdu.
                 Dıştaki kutu ölçülen yüksekliği zoom'la çarpıp kaydırma
                 alanını besliyor: `transform` yerleşim boyutunu değiştirmez. */
              <div
                style={{
                  width: KAGIT_PIKSEL_GENISLIK * onizlemeZoom,
                  height: zoomIcerikYuksekligi * onizlemeZoom || undefined,
                  // Kâğıt YATAYDA ORTALANIR. Öncesinde bu kutu sola yapışıyordu ve
                  // artan genişliğin TAMAMI sağda birikiyordu: menü ya da soru listesi
                  // daraltılınca sütun büyüyor, kâğıt 700 px'te kalıyor ve sağda
                  // ölçülen 98–306 px'lik boş şerit çıkıyordu (1200×800 pencerede).
                  // margin:auto BLOK kutuda güvenli: kâğıt sütundan genişken (varsayılan
                  // düzende 700 > 632) sol kenar sütunun başında kalır, taşma sağa olur
                  // ve kaydırma her yere erişir. Flex `justify-center` bunu yapamazdı —
                  // taşan içeriğin sol kısmına kaydırılamaz hâle getirirdi.
                  marginInline: "auto",
                }}
              >
              <div
                ref={zoomIcerikRefAyarla}
                // `oa-kompakt-alan`: kâğıt ölçekli bir baskı yüzeyi. Dokunmatikteki
                // genel 44 px kuralı (index.css) buradaki şık/tutamak düğmelerini
                // büyütüp soru yüksekliklerini — dolayısıyla sayfalamayı — bozardı.
                className="oa-kompakt-alan"
                style={{
                  width: KAGIT_PIKSEL_GENISLIK,
                  transform: `scale(${onizlemeZoom})`,
                  transformOrigin: "top left",
                }}
              >
              <A4Onizleme
                sayfalar={sayfalar}
                sorular={sayfaSorulari}
                resmiBaslik={resmiBaslik}
                resmiBaslikTasarim={resmiBaslikTasarim}
                logoDataUrl={logoDataUrl}
                logoBoyut={logoBoyut}
                tarih={tarih}
                sureDakika={sureDakika}
                grupEtiketi={grupEtiketi}
                ogretmenler={ogretmenler}
                sayfaNoGoster={sayfaNoGoster}
                kimlikAlaniGoster
                kimlikPuanGoster={!testModu}
                sikBicimi={sikBicimi}
                sikDuzeni={etkinSikDuzeni}
                testSonucKutusu={testModu && testSonucKutusu}
                testModu={testModu}
                seciliSoruId={seciliSoruId}
                onSec={(id) => setSeciliSoruId(id)}
                onGenislik={(id, mm) =>
                  soruGuncelle(id, { genislikMm: Math.round(mm) })
                }
                onGorselYukseklik={(id, mm) =>
                  soruGuncelle(id, {
                    // `null` = serbest yüksekliği bırak. `undefined` yazmak
                    // Partial birleştirmesinde alanı DEĞİŞTİRMEZ, o yüzden
                    // "orana dön" hiç çalışmazdı — bu yüzden açıkça undefined
                    // atanıyor ve alan gerçekten siliniyor.
                    gorselYukseklikMm: mm === null ? undefined : Math.round(mm),
                  })
                }
                onDogruSik={
                  testModu ? (id, sik) => soruGuncelle(id, { dogruSik: sik }) : undefined
                }
                onEkGorselGenislik={ekGorselGenisligiAyarla}
                onEkGorselSil={ekGorselParcasiSil}
                kenarBosluk={kenarBosluk}
                tamIcerikMm={tamIcerikMm}
                sutunIcerikMm={sutunIcerikMm}
                sutunAraMm={sutunAra}
                sutunAyirici={sutunAyirici}
                onizlemeModu={onizlemeModu}
                soruYuksekligiMm={soruYuksekligiMm}
                kapasiteDevamMm={kapasiteDevamMm}
                gorselAzamiYukMm={gorselAzamiYukMm}
                yerlesimUyarilari={yerlesimUyarilari}
              />
              </div>
              </div>
            )}
            {/* Yüzen soru çubuğu kadar boşluk (Y23/K16/D4): çubuk kâğıdın son
                kısmını örtüyordu; bu boşlukla en alttaki soru da çubuğun
                üstüne kaydırılabilir. Yalnız çubuk görünürken eklenir. */}
            {seciliSoru && onizlemeModu === "tasarim" && gorunenSorular.length > 0 && (
              <div aria-hidden="true" className={dokunmatik ? "h-20" : "h-14"} />
            )}
          </div>

          {/* SEÇİLİ SORU YÜZEN ÇUBUĞU.
              Seçim yapılınca kâğıdın üstünde, önizleme sütununun altına
              yapışık küçük bir çubuk çıkıyor. NEDEN yüzen: dikeyde sıfır yer
              yiyor — soru paneli 1680 px altında çekmece olduğu için tek yol
              "N. soruyu düzenle"ye basıp ekranın yarısını kaplayan paneli
              açmaktı, oysa en sık yapılan üç iş (puan, çoğalt, sil) tek tıkla
              yapılabilir. Ayrıntı hâlâ "Tümü" ile eski panelde.
              Odak kipinde de görünüyor: kâğıda bakarken düzenlemek tam olarak
              o kipin işi. */}
          {seciliSoru && onizlemeModu === "tasarim" && (
            <div
              role="toolbar"
              aria-label={`${seciliSoruSirasi}. soru hızlı işlemler`}
              // Telefonda TEK SATIR (K16/T9): 360 px'te iki satıra kırılıp
              // 108 px yükseliyordu. Etiketler kısalır, Çoğalt/Sil yalnız ikon.
              className={`pointer-events-auto ${telefonDuzeni ? "fixed" : "absolute"} inset-x-0 bottom-3 z-20 mx-auto flex w-max max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-full border border-slate-200 bg-white/95 px-2 py-1.5 text-xs shadow-lg backdrop-blur ${telefonDuzeni ? "flex-nowrap" : "flex-wrap"}`}
            >
              <span className="whitespace-nowrap px-1.5 font-bold text-slate-500">
                {seciliSoruSirasi}.{telefonDuzeni ? "" : " soru"}
                {seciliSoruKagitSirasi != null && seciliSoruKagitSirasi !== seciliSoruSirasi
                  ? ` (kâğıtta ${seciliSoruKagitSirasi}.)`
                  : ""}
              </span>
              <label className="inline-flex items-center gap-1 text-slate-500">
                Puan
                <input
                  type="number"
                  min={0}
                  max={100}
                  aria-label="Seçili sorunun puanı"
                  value={seciliSoru.puan ?? ""}
                  disabled={seciliSoru.maddeler.some((madde) => madde.puan != null)}
                  onChange={(e) =>
                    soruGuncelle(seciliSoru.id, {
                      puan: e.target.value === "" ? null : sayiSinirla(Math.round(Number(e.target.value)), 0, 100),
                    })
                  }
                  className="w-14 rounded-lg border border-slate-200 px-1.5 py-0.5 text-center tabular-nums disabled:bg-slate-100 disabled:text-slate-400"
                />
              </label>
              <span className="mx-0.5 h-5 w-px bg-slate-200" />
              <button
                type="button"
                title="Seçili soruyu çoğalt"
                aria-label="Seçili soruyu çoğalt"
                onClick={() => soruCogalt(seciliSoru.id)}
                className="inline-flex items-center justify-center gap-1 rounded-full px-2 py-1 font-semibold text-slate-600 hover:bg-slate-100 [@media(pointer:coarse)]:min-w-[44px]"
              >
                <Copy size={telefonDuzeni ? 16 : 13} />{telefonDuzeni ? <span className="sr-only">Çoğalt</span> : " Çoğalt"}
              </button>
              <button
                type="button"
                title="Seçili soruyu sil"
                aria-label="Seçili soruyu sil"
                onClick={() => soruSil(seciliSoru.id)}
                className="inline-flex items-center justify-center gap-1 rounded-full px-2 py-1 font-semibold text-rose-600 hover:bg-rose-50 [@media(pointer:coarse)]:min-w-[44px]"
              >
                <Trash2 size={telefonDuzeni ? 16 : 13} />{telefonDuzeni ? <span className="sr-only">Sil</span> : " Sil"}
              </button>
              <span className="mx-0.5 h-5 w-px bg-slate-200" />
              <button
                type="button"
                onClick={(e) => yanPaneliAc("soru", e.currentTarget, "seciliSoru")}
                aria-haspopup="dialog"
                className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-brand-600 px-2.5 py-1 font-bold text-white hover:bg-brand-700"
              >
                <Pencil size={13} /> Tümü
              </button>
            </div>
          )}
        </section>

        {yanPanelModu && (
          <button
            type="button"
            aria-label="Yan paneli kapat"
            onClick={yanPaneliKapat}
            className="fixed inset-0 z-40 bg-slate-950/35 min-[1680px]:hidden"
          />
        )}
        <aside
          ref={yanPanelRef}
          role={yanPanelModu && yanPanelOrtuyor ? "dialog" : undefined}
          aria-modal={yanPanelModu && yanPanelOrtuyor ? "true" : undefined}
          aria-labelledby="sinav-yan-panel-baslik"
          className={`${
            yanPanelModu
              // ÖNCE yanPanelModu kontrol edilir: dar ekranda ("Sadece kâğıt"
              // AÇIKKEN dahil) çekmece bir "position: fixed" perde-üstü katman,
              // ızgara akışına girmez — odak kipinde gizlenmesi GEREKMEZ. Eskiden
              // odakKagit önce kontrol edildiği için "Çift sütun" / "Yazılı
              // Kağıdı (A4)" tıklanınca karartma perdesi açılıyor ama panelin
              // kendisi zorla gizli kaldığı için hiç görünmüyordu (öğretmen
              // "ekran biraz kararıyor, o kadar" diye bildirdi).
              ? "fixed inset-y-0 right-0 z-50 flex w-[min(92vw,430px)] min-[1680px]:static min-[1680px]:inset-auto min-[1680px]:z-auto min-[1680px]:w-auto"
              : odakKagit
                // Panel KAPALIYKEN odak kipinde ("Sadece kâğıt") bu panel de
                // Soru listesi'yle aynı kurala uymalı: 2xl+'de yanPanelModu'dan
                // bağımsız "min-[1680px]:flex" ile HER ZAMAN görünürdü (aşağıdaki
                // dal), ızgara ise odak kipinde tek sütuna düşüyor — sütunsuz
                // kalan bu panel kâğıdın altına tam genişlikte taşıyordu.
                ? "hidden"
                : "hidden min-[1680px]:flex"
          } min-h-0 flex-col overflow-hidden border border-slate-200 bg-white shadow-xl min-[1680px]:rounded-2xl`}
        >
          <div className="shrink-0 border-b border-slate-100 p-3">
            <div className="flex items-center justify-between gap-2">
              <h2 id="sinav-yan-panel-baslik" className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {yanPanelOrtuyor
                  ? yanPanelModu === "ayarlar"
                    ? "Sınav Ayarları"
                    : "Seçili Soru"
                  : "Düzenleme ve Ayarlar"}
              </h2>
              {yanPanelModu && (
                <button type="button" onClick={yanPaneliKapat} aria-label="Paneli kapat" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X size={16} /></button>
              )}
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {/* Geniş ekranda (2xl+) panel sabit bir sütundur; orada Seçili Soru
                ile Ayarlar AYNI ANDA görünür. Önceden tek bir yanPanelModu
                değerine bağlıydılar: öğretmenin en sık döngüsü —soruyu düzenle
                → sığmadı → boşluğu değiştir → tekrar bak— her turda panel
                değiştirmeyi gerektiriyordu. Dar ekranda yer olmadığı için
                mod değişimi korunur. */}
            {(!yanPanelOrtuyor || yanPanelModu !== "ayarlar") && (
            <AcilirBolum
              baslik="Seçili Soru"
              ikon={<Pencil size={14} />}
              acik={acikBolumler.seciliSoru}
              onToggle={() => bolumAcKapa("seciliSoru")}
            >
              <section ref={seciliSoruPanelRef}>
                {seciliSoru ? (
                  <InlineSoruDuzenlemePanel
                    soru={seciliSoru}
                    sira={seciliSoruSirasi}
                    kagitSirasi={seciliSoruKagitSirasi}
                    ciftSutun={ciftSutun}
                    icerikGenislikMm={soruIcerikGenisligi(seciliSoru)}
                    sutunIcerikMm={sutunIcerikMm}
                    tamIcerikMm={tamIcerikMm}
                    onChange={(patch) => soruGuncelle(seciliSoru.id, patch)}
                    onYukari={() => soruTasi(seciliSoru.id, "yukari")}
                    onAsagi={() => soruTasi(seciliSoru.id, "asagi")}
                    onDelete={() => soruSil(seciliSoru.id)}
                    onParcaKirp={
                      seciliSoru.tur === "gorsel"
                        ? () => setKirpilacakSoruId(seciliSoru.id)
                        : undefined
                    }
                    onCizimDuzenle={
                      seciliSoru.cizimVerisi
                        ? () =>
                            setCizimModal({
                              soruId: seciliSoru.id,
                              belge: seciliSoru.cizimVerisi,
                            })
                        : undefined
                    }
                    onEkCizimDuzenle={(parcaId) => {
                      const parca = seciliSoru.ekGorseller?.find(
                        (p) => p.id === parcaId,
                      );
                      if (parca?.cizimVerisi)
                        setCizimModal({
                          soruId: seciliSoru.id,
                          ekGorselId: parca.id,
                          belge: parca.cizimVerisi,
                        });
                    }}
                    onDenklemDuzenle={
                      seciliSoru.denklemVerisi
                        ? () =>
                            setDenklemModal({
                              soruId: seciliSoru.id,
                              belge: seciliSoru.denklemVerisi,
                            })
                        : undefined
                    }
                    onEkDenklemDuzenle={(parcaId) => {
                      const parca = seciliSoru.ekGorseller?.find(
                        (p) => p.id === parcaId,
                      );
                      if (parca?.denklemVerisi) {
                        setDenklemModal({
                          soruId: seciliSoru.id,
                          ekGorselId: parca.id,
                          belge: parca.denklemVerisi,
                        });
                      }
                    }}
                    testModu={testModu}
                    sikBicimi={sikBicimi}
                  />
                ) : (
                  <p className="rounded-xl bg-slate-50 px-3 py-3 text-xs leading-relaxed text-slate-500">
                    Henüz seçili soru yok. Sol listedeki soru kartına tıklayın;
                    düzenleme paneli burada açılacak.
                  </p>
                )}
              </section>
            </AcilirBolum>

            )}

            {(!yanPanelOrtuyor || yanPanelModu === "ayarlar") && (
            <div ref={ayarlarPanelRef} className="space-y-2">
            <AcilirBolum
              baslik="Başlık Bilgileri"
              ikon={<Info size={14} />}
              acik={acikBolumler.baslik}
              onToggle={() => bolumAcKapa("baslik")}
            >
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
                {logoDataUrl ? (
                  <img
                    src={logoDataUrl}
                    alt="Yüklenen logo"
                    className="h-10 w-10 rounded-lg border border-slate-200 bg-white object-contain"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-slate-300">
                    <FileImage size={16} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-700">
                    Okul / MEB logosu
                  </div>
                  <p className="text-[10px] leading-relaxed text-slate-500">
                    Başlığın yanında gösterilir (isteğe bağlı).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => logoFileInputRef.current?.click()}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                >
                  {logoDataUrl ? "Değiştir" : "Yükle"}
                </button>
                {logoDataUrl && (
                  <button
                    type="button"
                    onClick={() => baslikAyarla("logoDataUrl", undefined)}
                    aria-label="Logoyu kaldır"
                    className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              {/* Boyut seçimi yalnız logo VARKEN görünür: logosuz kâğıtta
                  hiçbir şeyi değiştirmeyen bir denetim, öğretmenin "acaba
                  çalışmıyor mu" diye takıldığı yer olur. */}
              {logoDataUrl && (
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Logo boyutu
                  </span>
                  <div className="flex gap-1">
                    {(
                      [
                        ["kucuk", "Küçük"],
                        ["orta", "Orta"],
                        ["buyuk", "Büyük"],
                      ] as [LogoBoyut, string][]
                    ).map(([deger, etiket]) => (
                      <TogglePill
                        key={deger}
                        aktif={(logoBoyut ?? VARSAYILAN_LOGO_BOYUT) === deger}
                        onClick={() => baslikAyarla("logoBoyut", deger)}
                      >
                        {etiket}
                      </TogglePill>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {LOGO_BOYUT_MM[logoBoyut ?? VARSAYILAN_LOGO_BOYUT]} mm
                  </span>
                </div>
              )}
              {logoHatasi && (
                <p className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-600">
                  {logoHatasi}
                </p>
              )}
              <>
                  <label className="block">
                    <AlanEtiket>Okul adı</AlanEtiket>
                    <input
                      value={okulAdi}
                      onChange={(e) => baslikAyarla("okulAdi", e.target.value)}
                      className={INPUT_CLASS}
                      placeholder="Okul adı"
                    />
                  </label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="block">
                      <AlanEtiket>Sınıf</AlanEtiket>
                      <select
                        value={sinifSeviyesi}
                        onChange={(e) => baslikAyarla("sinifSeviyesi", e.target.value)}
                        className={INPUT_CLASS}
                      >
                        <option value="">Seçiniz</option>
                        {SINIF_SEVIYELERI.map((seviye) => (
                          <option key={seviye}>{seviye}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <AlanEtiket>Ders</AlanEtiket>
                      <input
                        value={ders}
                        onChange={(e) => baslikAyarla("ders", e.target.value)}
                        className={INPUT_CLASS}
                        placeholder="Ders"
                      />
                    </label>
                  </div>
                  {/* Tarih ve süre HER İKİ kipte de kâğıda basılıyor (SinavKagit
                      antet satırı); bu yüzden giriş kutuları da iki kipte
                      görünür. Eskiden tarih için hiç kutu yoktu, süre kutusu ise
                      Test kipinde gizlenip yazılıda girilen değer test kâğıdına
                      basılmaya devam ediyordu (öğretmen değiştiremiyordu). */}
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="block">
                      <AlanEtiket>Tarih (isteğe bağlı)</AlanEtiket>
                      <input
                        value={tarih ?? ""}
                        onChange={(e) => baslikAyarla("tarih", e.target.value)}
                        className={INPUT_CLASS}
                        placeholder="GG.AA.YYYY"
                        maxLength={50}
                      />
                    </label>
                    <label className="block">
                      <AlanEtiket>Süre dk (isteğe bağlı)</AlanEtiket>
                      <input
                        value={sureDakika ?? ""}
                        onChange={(e) =>
                          baslikAyarla("sureDakika", e.target.value.replace(/[^0-9]/g, ""))
                        }
                        className={INPUT_CLASS}
                        placeholder="40"
                        inputMode="numeric"
                      />
                    </label>
                  </div>
              {testModu ? (
                <div className="mt-2">
                <label className="block">
                  <AlanEtiket>Konu / başlık</AlanEtiket>
                  <input
                    value={testBaslik}
                    onChange={(e) => ayarAyarla("testBaslik", e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="Örn. 6. Ünite — Kuvvet ve Hareket Testi"
                  />
                  <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                    Test kâğıdında okul adı, sınıf, ders ve bu başlık (dolu olanlar) ile öğrenci Ad-Soyad / No alanı basılır; boş alanlar çıktıda görünmez.
                  </p>
                  <span className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      checked={testSonucKutusu}
                      onChange={(e) => ayarAyarla("testSonucKutusu", e.target.checked)}
                      className="h-4 w-4 accent-brand-600"
                    />
                    Doğru / Yanlış / Net alanı
                  </span>
                </label>
                  <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
                    {resmiBaslikTasarim}
                  </p>
                </div>
              ) : (
                <>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="block">
                      <AlanEtiket>Dönem</AlanEtiket>
                      <select
                        value={donem}
                        onChange={(e) => baslikAyarla("donem", e.target.value)}
                        className={INPUT_CLASS}
                      >
                        <option value="">Seçiniz</option>
                        {DONEMLER.map((secim) => (
                          <option key={secim}>{secim}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <AlanEtiket>Yazılı</AlanEtiket>
                      <select
                        value={yaziliNo}
                        onChange={(e) => baslikAyarla("yaziliNo", e.target.value)}
                        className={INPUT_CLASS}
                      >
                        <option value="">Seçiniz</option>
                        {YAZILI_NUMARALARI.map((secim) => (
                          <option key={secim}>{secim}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
                    {resmiBaslikTasarim}
                    {grupEtiketi ? ` · ${grupEtiketi}` : ""}
                  </p>
                </>
              )}
              </>
            </AcilirBolum>

            <AcilirBolum
              baslik="Sınav Türü"
              ikon={<FileText size={14} />}
              acik={acikBolumler.sinav}
              onToggle={() => bolumAcKapa("sinav")}
            >
              {/* Önizleme modu pilleri buradan kaldırıldı: aynı komut önizleme
                  çubuğunda da vardı ve orada davranış FARKLIYDI (Çıktı'ya
                  geçerken soru seçimini bırakıyor). Tek yer: önizleme çubuğu. */}
              <div className="grid grid-cols-2 gap-1.5">
                <TogglePill aktif={sinavTuru === "yazili"} onClick={() => sinavTuruDegistir("yazili")}>Yazılı</TogglePill>
                <TogglePill aktif={sinavTuru === "test"} onClick={() => sinavTuruDegistir("test")}>Test</TogglePill>
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
                Tasarım / Çıktı görünümü, önizlemenin üstündeki çubuktan değişir.
              </p>
            </AcilirBolum>

            <AcilirBolum
              baslik="Sayfa Düzeni"
              ikon={<Columns size={14} />}
              acik={acikBolumler.sayfaDuzeni}
              onToggle={() => bolumAcKapa("sayfaDuzeni")}
            >
              <div className="grid grid-cols-2 gap-1">
                {/* Seçili durum etkinCiftSutun'a bağlı: BEP görünümü çıktıyı
                    zorla tek sütuna düşürdüğü hâlde "Çift Sütun" seçili
                    görünüyordu — aynı ekranda iki kontrol birbiriyle çelişiyordu. */}
                <TogglePill
                  aktif={!etkinCiftSutun}
                  onClick={() => ayarAyarla("sayfaDuzeni", "tek")}
                >
                  Tek Sütun
                </TogglePill>
                <TogglePill
                  aktif={etkinCiftSutun}
                  onClick={() => ayarAyarla("sayfaDuzeni", "cift")}
                >
                  Çift Sütun
                </TogglePill>
              </div>
              {bepAktif && (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-semibold leading-relaxed text-amber-800 ring-1 ring-amber-200">
                  BEP görünümü açıkken çıktı her zaman tek sütundur.
                  {ciftSutun ? " Çift sütun tercihiniz BEP kapatılınca geri gelir." : ""}
                </p>
              )}
              {etkinCiftSutun && (
                <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50/70 p-2">
                  <div className="grid grid-cols-2 items-end gap-2">
                    <MmInput
                      label="Sütun arası"
                      value={sutunAra}
                      onChange={(v) => ayarAyarla("sutunAra", sayiSinirla(v, 4, 20))}
                      min={4}
                      max={20}
                    />
                    <Secenek checked={sutunAyirici} onChange={(v) => ayarAyarla("sutunAyirici", v)}>
                      Araya çizgi çiz
                    </Secenek>
                  </div>
                  <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
                    Sorular önce sol sütunu, sonra sağ sütunu doldurur. Büyük
                    bir sorunun iki sütunu kaplamasını isterseniz o sorunun
                    panelinden "Tam genişlik"i seçin.
                  </p>
                </div>
              )}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <MmInput
                  label="Kenar boşluğu"
                  value={kenarBosluk}
                  onChange={(v) =>
                    ayarAyarla(
                      "kenarBosluk",
                      sayiSinirla(v, MIN_KENAR_BOSLUK_MM, MAX_KENAR_BOSLUK_MM),
                    )
                  }
                  min={MIN_KENAR_BOSLUK_MM}
                  max={MAX_KENAR_BOSLUK_MM}
                />
                <MmInput
                  label="Soru arası boşluk"
                  value={varsayilanSoruBosluk}
                  onChange={(v) =>
                    ayarAyarla("varsayilanSoruBosluk", sayiSinirla(v, 0, 40))
                  }
                  min={0}
                  max={40}
                />
              </div>
              <p className="mt-1 text-[10px] text-slate-400">
                İpucu: 1 el yazısı cevap satırı ≈ {SATIR_MM} mm.
                {testModu ? ` Test kipinde varsayılan ${VARSAYILAN_SORU_BOSLUK_TEST_MM} mm'dir.` : ""}
              </p>
              <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/70 p-2">
                <div className="mb-1 text-[11px] font-bold text-slate-600">Şık harfleri</div>
                <div className="grid grid-cols-2 gap-1">
                  <TogglePill
                    aktif={(sikBicimi ?? (testModu ? "buyuk" : "kucuk")) === "buyuk"}
                    onClick={() => ayarAyarla("sikBicimi", "buyuk")}
                  >
                    {testModu ? "A) B) C) D) E)" : "A) B) C) Ç) D)"}
                  </TogglePill>
                  <TogglePill
                    aktif={(sikBicimi ?? (testModu ? "buyuk" : "kucuk")) === "kucuk"}
                    onClick={() => ayarAyarla("sikBicimi", "kucuk")}
                  >
                    a) b) c) {testModu ? "d) e)" : "ç) d)"}
                  </TogglePill>
                </div>
                <div className="mb-1 mt-2 text-[11px] font-bold text-slate-600">Şık dizilimi</div>
                <div className="grid grid-cols-2 gap-1">
                  <TogglePill aktif={etkinSikDuzeni === "otomatik"} onClick={() => ayarAyarla("sikDuzeni", "otomatik")}>
                    Otomatik (yan yana)
                  </TogglePill>
                  <TogglePill aktif={etkinSikDuzeni === "liste"} onClick={() => ayarAyarla("sikDuzeni", "liste")}>
                    Alt alta
                  </TogglePill>
                </div>
                <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">
                  Otomatik: kısa şıklar sığdığı kadar yan yana/iki sütun dizilir, uzun
                  şıklar alt alta kalır. Hiçbir şık kısaltılmaz.
                  {testModu ? " Test kipinde şıklar A–E, cevap anahtarıyla aynıdır." : ""}
                </p>
              </div>
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-bold text-slate-700">Tüm soru görsellerini eşitle</div>
                <p className="mt-0.5 text-[10px] leading-4 text-slate-500">Ana soru görsellerini tek genişliğe getirir; metin ve denklem sorularını değiştirmez.</p>
                <div className="mt-2 flex items-end gap-2">
                  <label className="min-w-0 flex-1">
                    <span className="mb-1 block text-[10px] font-semibold text-slate-500">Genişlik (mm)</span>
                    <input type="number" min={20} max={Math.round(Math.max(20, (etkinCiftSutun ? sutunIcerikMm : tamIcerikMm) - 7))} value={topluGorselGenislik} onChange={(e) => setTopluGorselGenislik(Number(e.target.value))} className={INPUT_CLASS} />
                  </label>
                  <button type="button" onClick={tumGorselleriAyniGenisligeGetir} disabled={!sorular.some((soru) => !!soru.gorselDataUrl)} className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-40">Tümüne uygula</button>
                </div>
              </div>
            </AcilirBolum>

            <AcilirBolum
              baslik="Gruplar ve BEP"
              ikon={<Shuffle size={14} />}
              acik={acikBolumler.gruplar}
              onToggle={() => bolumAcKapa("gruplar")}
            >
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2">
                <Secenek
                  checked={bGrubuAktif}
                  onChange={(v) => {
                    ayarAyarla("bGrubuAktif", v);
                    if (!v) ayarAyarla("aktifGrup", "A");
                  }}
                >
                  B Grubu oluştur
                </Secenek>
                {bGrubuAktif && (
                  <div className="mt-2 grid grid-cols-3 gap-1">
                    <TogglePill
                      aktif={aktifGrup === "A"}
                      onClick={() => ayarAyarla("aktifGrup", "A")}
                    >
                      A Grubu
                    </TogglePill>
                    <TogglePill
                      aktif={aktifGrup === "B"}
                      onClick={() => ayarAyarla("aktifGrup", "B")}
                    >
                      B Grubu
                    </TogglePill>
                    <button
                      type="button"
                      onClick={() => ayarAyarla("bSeed", Date.now())}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Yeniden Karıştır
                    </button>
                  </div>
                )}
                {bGrubuUyusmazlikVar && (
                  <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-rose-50 px-2.5 py-2 text-[11px] font-semibold leading-snug text-rose-600 ring-1 ring-rose-200">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    Bu B Grubu sırası, en son yazdırdığınız/indirdiğiniz
                    kağıttan farklı. Cevap anahtarı artık dağıttığınız
                    kağıtlarla eşleşmeyebilir — kağıdı yeniden yazdırın ya da
                    anahtarı elle kontrol edin.
                  </p>
                )}
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBepModalAcik(true)}
                    disabled={sorular.length === 0}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    BEP Versiyonu Hazırla
                  </button>
                  <button
                    type="button"
                    onClick={() => ayarAyarla("bepAktif", false)}
                    disabled={!bepAktif}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Normal Taslak
                  </button>
                </div>
              </div>
            </AcilirBolum>

            <AcilirBolum
              baslik="Öğretmenler"
              ikon={<Users size={14} />}
              acik={acikBolumler.ogretmenler}
              onToggle={() => bolumAcKapa("ogretmenler")}
            >
              <div className="space-y-2">
                {ogretmenler.map((ad, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      value={ad}
                      onChange={(e) => ogretmenGuncelle(index, e.target.value)}
                      placeholder={`Öğretmen ${index + 1}`}
                      className={INPUT_CLASS}
                    />
                    {ogretmenler.length > 1 && (
                      <MiniButon
                        title="Öğretmeni kaldır"
                        onClick={() => ogretmenSil(index)}
                        danger
                      >
                        <X size={13} />
                      </MiniButon>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={ogretmenEkle}
                  disabled={ogretmenler.length >= 4}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus size={13} /> Öğretmen ekle
                </button>
                <Secenek checked={sayfaNoGoster} onChange={(v) => ayarAyarla("sayfaNoGoster", v)}>
                  Sayfa numarası
                </Secenek>
              </div>
            </AcilirBolum>

            <AcilirBolum
              baslik="Çıktı"
              ikon={<Printer size={14} />}
              acik={acikBolumler.cikti}
              onToggle={() => bolumAcKapa("cikti")}
            >
              {bGrubuUyusmazlikVar && (
                <p className="mb-2 flex items-start gap-1.5 rounded-lg bg-rose-50 px-2.5 py-2 text-[11px] font-semibold leading-snug text-rose-600 ring-1 ring-rose-200">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />B Grubu
                  yeniden karıştırıldı. Bu sırayla basarsanız, daha önce
                  dağıttığınız kağıtlarla cevap anahtarı uyuşmayabilir.
                </p>
              )}
              <button
                type="button"
                onClick={puanlariEsitDagit}
                disabled={sorular.length === 0}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {bepAktif ? "BEP puanlarını 100'e eşit dağıt" : "Puanları 100'e eşit dağıt"}
              </button>
              {bepAktif && (
                <p className="mb-2 rounded-lg bg-violet-50 px-2.5 py-2 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-200">
                  BEP görünümü aktif — aşağıdaki butonlar {mantiksalSoruSayisi}{" "}
                  sorudan oluşan bu görünümü basar/indirir.
                </p>
              )}
              <div className="mt-2">
                <button
                  type="button"
                  onClick={pdfYazdir}
                  disabled={gorunenSorular.length === 0 || yazdiriliyor}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    bepAktif
                      ? "border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {yazdiriliyor
                    ? "Yazdırma hazırlanıyor..."
                    : bepAktif
                      ? "BEP Görünümünü Yazdır"
                      : "PDF / Yazdır"}
                </button>
              </div>
              {testModu && (
                <button
                  type="button"
                  onClick={cevapAnahtariYazdir}
                  disabled={isaretliCevapSayisi === 0 || yazdiriliyor}
                  title={
                    isaretliCevapSayisi === 0
                      ? "Önce sorularda doğru şıkkı işaretleyin"
                      : undefined
                  }
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Cevap Anahtarı — Ayrı Sayfa
                  {isaretliCevapSayisi > 0 ? ` · ${isaretliCevapSayisi}` : ""}
                </button>
              )}
              {testModu && (
                <button
                  type="button"
                  onClick={sinavVeAnahtarYazdir}
                  disabled={
                    gorunenSorular.length === 0 ||
                    isaretliCevapSayisi === 0 ||
                    yazdiriliyor
                  }
                  title={
                    isaretliCevapSayisi === 0
                      ? "Önce sorularda doğru şıkkı işaretleyin"
                      : undefined
                  }
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Sınav + Anahtar (testin sonunda)
                  {isaretliCevapSayisi > 0 ? ` · ${isaretliCevapSayisi}` : ""}
                </button>
              )}
            </AcilirBolum>

            <AcilirBolum
              baslik="Taslak Dosyası"
              ikon={<Download size={14} />}
              acik={acikBolumler.taslakDosyasi}
              onToggle={() => bolumAcKapa("taslakDosyasi")}
            >
              <p className="mb-2 text-[11px] leading-relaxed text-slate-400">
                Bu taslağı bir dosyaya kaydedip başka bir bilgisayardaki
                uygulamada açarak kaldığınız yerden devam edebilirsiniz.
              </p>
              {taslakDosyaHatasi && (
                <p className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
                  {taslakDosyaHatasi}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={taslagiDosyayaKaydet}
                  disabled={sorular.length === 0}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Download size={14} /> Dosyaya Kaydet
                </button>
                <button
                  type="button"
                  onClick={() => taslakFileInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <Upload size={14} /> Dosyadan Aç
                </button>
              </div>
              {/* Yıkıcı işlem: önceden "Çıktı" bölümünde, PDF/Yazdır düğmelerinin
                  hemen altındaydı — yanlış tıklama için ideal konum. Taslak
                  yönetiminin yanına alındı ve ayırıcıyla ayrıldı. */}
              <div className="mt-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setTemizleOnayAcik(true)}
                  disabled={sorular.length === 0}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 size={15} /> Taslağı Temizle
                </button>
                <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">
                  Soruları ve otomatik kaydı siler. Silmeden önce yukarıdan dosyaya kaydedin.
                </p>
              </div>
            </AcilirBolum>
            </div>
            )}
          </div>
        </aside>
      </div>

      {/* Gizli ölçüm alanı: önizlemeyle birebir aynı bileşen, aynı genişlik.
          `oa-kompakt-alan`: önizleme ve baskı kökü de bu sınıfı taşıyor; ölçüm
          dokunmatikte 44 px kuralıyla büyürse sayfalama baskıdan ayrışırdı. */}
      <div
        ref={olcumRef}
        aria-hidden
        className="oa-kompakt-alan text-slate-800"
        style={{
          position: "absolute",
          left: -100000,
          top: 0,
          visibility: "hidden",
          pointerEvents: "none",
          // Yükseklik 0 + overflow gizli: içerik yine tam ölçülür (offsetHeight
          // çocuklardan gelir) ama belgenin kaydırma yüksekliğine katılmaz.
          // Katılırsa uzun bir sınavda baskıda sonuna BOŞ sayfalar ekleniyordu.
          height: 0,
          overflow: "hidden",
        }}
      >
        {[...yerlesimSorulari, ...sayfaSorulari.filter((soru) => soru.devamKaynakId)].map((soru, index) => {
          const genislik = soruIcerikGenisligi(soru);
          return (
            <div
              key={soru.id}
              data-olcum-id={soru.id}
              style={{ width: mmPx(genislik) }}
            >
              <SoruIcerik
                soru={soru}
                sira={gorunenSoruSiraHaritasi.get(soru.devamKaynakId ?? soru.id) ?? index + 1}
                icerikGenislikMm={genislik}
                tasarimModu={false}
                /* ÖLÇÜM ALANI da test kipini bilmeli: harf kutusu aynı ama
                   metin farklı ("ç" ↔ "D"), ölçüm ile çizim ayrışmasın. */
                testModu={testModu}
                sikBicimi={sikBicimi}
                sikDuzeni={etkinSikDuzeni}
                gorselAzamiYukMm={gorselAzamiYukMm}
              />
            </div>
          );
        })}
      </div>

      {metinModalAcik && (
        <MetinSoruModal
          testModu={testModu}
          sikBicimi={sikBicimi}
          varsayilanBosluk={varsayilanSoruBosluk}
          baslangicMetni={ocrBaslangicMetni}
          onClose={() => { setMetinModalAcik(false); setOcrBaslangicMetni(""); }}
          onSave={metinSoruEkle}
        />
      )}
      {ocrModalAcik && GORSELDEN_METNE_AKTIF && (
        <GorseldenMetneModal
          onKapat={() => setOcrModalAcik(false)}
          onAktar={(metin) => {
            setOcrBaslangicMetni(metin);
            setOcrModalAcik(false);
            setMetinModalAcik(true);
          }}
        />
      )}
      {cizimModal && (
        <CizimEditoruModal
          onClose={() => setCizimModal(null)}
          onOlustur={cizimSorusuOlustur}
          baslangicBelgesi={cizimModal.belge}
          seciliSoruVar={
            !!seciliSoruId &&
            sorular.find((s) => s.id === seciliSoruId)?.tur === "gorsel"
          }
          duzenlemeModu={!!cizimModal.soruId}
        />
      )}
      {denklemModal && (
        <DenklemEditoruModal
          onClose={() => setDenklemModal(null)}
          onOlustur={denklemSorusuOlustur}
          seciliSoruVar={
            !!seciliSoruId &&
            sorular.find((s) => s.id === seciliSoruId)?.tur === "gorsel"
          }
          baslangicBelgesi={denklemModal.belge}
          duzenlemeModu={!!denklemModal.soruId}
        />
      )}
      {gorselTaslak && (
        <GorselSoruModal
          taslak={gorselTaslak}
          baglamGenislikMm={Math.max(20, seciliBaglamMm - 7)}
          onChange={setGorselTaslak}
          onClose={() => setGorselTaslak(null)}
          onSave={gorselSoruEkle}
        />
      )}
      {yardimAcik && <KisayolYardimModal onClose={() => setYardimAcik(false)} />}

      {temizleOnayAcik && (
        <TemizleOnayModal
          onVazgec={() => setTemizleOnayAcik(false)}
          onOnayla={taslagiTemizle}
        />
      )}
      {bekleyenIceAktarTaslak && (
        <IceAktarOnayModal
          taslak={bekleyenIceAktarTaslak.taslak}
          mevcutSoruSayisi={sorular.length}
          dosyaAdi={bekleyenIceAktarTaslak.dosyaAdi}
          dosyaBoyutu={bekleyenIceAktarTaslak.dosyaBoyutu}
          dosyaTuru={bekleyenIceAktarTaslak.dosyaTuru}
          hata={taslakDosyaHatasi}
          onVazgec={iceAktaridanVazgec}
          onOnayla={iceAktariOnayla}
        />
      )}
      {parolaIslemi && (
        <SinavParolaModal
          kip={parolaIslemi.kip}
          onVazgec={() => setParolaIslemi(null)}
          onOnayla={async (parola) => {
            if (parolaIslemi.kip === "kaydet") {
              await taslakDosyayaIndir(parolaIslemi.taslak, parola);
            } else {
              const taslak = await taslakDosyadanOku(parolaIslemi.file, parola);
              await okunanTaslagiHazirla(taslak, parolaIslemi.file, "parolali");
            }
            setParolaIslemi(null);
          }}
        />
      )}
      {bepModalAcik && (
        <BepModal
          sorular={sorular}
          varsayilanSeciliIds={
            bepSeciliIds.length > 0
              ? bepSeciliIds
              : sorular.map((soru) => soru.id)
          }
          varsayilanPuntoArtis={bepPuntoArtis}
          onClose={() => setBepModalAcik(false)}
          onHazirla={bepHazirla}
        />
      )}
      {kirpilacakSoruId && (
        <GorselParcaModal
          soru={sorular.find((soru) => soru.id === kirpilacakSoruId)!}
          onClose={() => setKirpilacakSoruId(null)}
          onEkle={(parca) => {
            gorselParcasiEkle(kirpilacakSoruId, parca);
            setKirpilacakSoruId(null);
          }}
        />
      )}
      {aracModal === "pdf-kaynak" && pdfKaynak && (
        <PdfKaynakModal
          dosyaAdi={pdfKaynak.dosyaAdi}
          pdfData={pdfKaynak.data}
          seciliSoruVar={!!seciliSoru}
          sonrakiSecimNo={kaynakSecimSayaci}
          onClose={pdfKaynaginiKapat}
          onEkle={pdfKaynakSeciminiEkle}
          onKaynakSil={pdfKaynakSil}
        />
      )}
      {silmeToast && (
        <div role="status" aria-live="polite" className="fixed top-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-2xl">
          <Trash2 size={15} className="shrink-0 text-slate-400" />
          <span>
            {silmeToast.sira}. soru silindi
            {silmeToast.sorular.length > 1 ? ` (${silmeToast.sorular.length} paket parçası)` : ""}.
          </span>
          <button
            type="button"
            onClick={silmeyiGeriAl}
            className="font-bold text-brand-300 underline underline-offset-2 transition hover:text-brand-200"
          >
            Geri Al
          </button>
          <button
            type="button"
            title="Kapat"
            onClick={() => setSilmeToast(null)}
            className="ml-1 text-slate-400 transition hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}
      {yazdirmaHatasi && (
        <p role="alert" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-rose-700 px-4 py-3 text-sm font-semibold text-white shadow-2xl">
          {yazdirmaHatasi}
        </p>
      )}
      {/* Baskı kökünün DIŞINDA duruyor: §18.3a'nın kuralı gereği yazdırma
          sırasında `printRootRef` içeriğine dokunulmuyor. */}
      <ConfirmDialog
        open={!!yazdirmaOnayi}
        tone="primary"
        title="Yine de yazdırılsın mı?"
        description={
          <>
            <ul className="list-disc space-y-1 pl-4">
              {(yazdirmaOnayi?.uyarilar ?? []).map((uyari) => (
                <li key={uyari}>{uyari}</li>
              ))}
            </ul>
            <p className="mt-2">Bu uyarılara rağmen yazdırabilirsiniz.</p>
          </>
        }
        confirmLabel={
          (yazdirmaOnayi?.uyarilar ?? []).some((u) => u.includes("KESİLECEK"))
            ? "Yine de yazdır (kesilecek)"
            : "Yine de yazdır"
        }
        cancelLabel={
          (yazdirmaOnayi?.uyarilar ?? []).some((u) => u.includes("KESİLECEK"))
            ? "Soruyu kısaltacağım"
            : "Vazgeç"
        }
        onConfirm={() => {
          const hedef = yazdirmaOnayi?.hedef;
          setYazdirmaOnayi(null);
          if (hedef) yazdirmayiCalistir(hedef);
        }}
        onClose={() => setYazdirmaOnayi(null)}
      />

      <div ref={printRootRef} className="sinav-print-root oa-kompakt-alan" aria-busy={yazdiriliyor}>
        {yazdirmaHedefi === "anahtar" ? (
          <div
            className="sinav-a4-page"
            style={{
              width: "210mm",
              minHeight: "297mm",
              background: "#fff",
              boxSizing: "border-box",
              padding: `${kenarBosluk}mm`,
              fontFamily: "'Times New Roman', Times, serif",
              color: "#0f172a",
            }}
          >
            {/* Izgaranın kendisi testin sonuna basılan anahtarla AYNI bileşen:
                sütun sayısı/punto burada değişip orada kalırsa, oradaki blok
                yerleşimin ayırdığı yere sığmaz. */}
            <CevapAnahtariBlogu
              satirlar={cevapAnahtari}
              ustBaslik={resmiBaslik}
              grupEtiketi={grupEtiketi}
              yazdirmaModu
            />
          </div>
        ) : (
          <A4Onizleme
            sayfalar={yazdirmaSayfalari}
            sorular={sayfaSorulari}
            resmiBaslik={resmiBaslik}
            logoDataUrl={logoDataUrl}
            logoBoyut={logoBoyut}
            cevapAnahtari={
              yazdirmaHedefi === "sinavVeAnahtar" ? cevapAnahtari : undefined
            }
            tarih={tarih}
            sureDakika={sureDakika}
            grupEtiketi={grupEtiketi}
            ogretmenler={ogretmenler}
            sayfaNoGoster={sayfaNoGoster}
            kimlikAlaniGoster
                kimlikPuanGoster={!testModu}
                sikBicimi={sikBicimi}
                sikDuzeni={etkinSikDuzeni}
            testSonucKutusu={testModu && testSonucKutusu}
            testModu={testModu}
            seciliSoruId={null}
            onSec={() => undefined}
            onGenislik={() => undefined}
            kenarBosluk={kenarBosluk}
            tamIcerikMm={tamIcerikMm}
            sutunIcerikMm={sutunIcerikMm}
            sutunAraMm={sutunAra}
            sutunAyirici={sutunAyirici}
            onizlemeModu="cikti"
            soruYuksekligiMm={soruYuksekligiMm}
            kapasiteDevamMm={kapasiteDevamMm}
            gorselAzamiYukMm={gorselAzamiYukMm}
            yerlesimUyarilari={[]}
            yazdirmaModu
          />
        )}
      </div>
      <style>{`
        .sinav-print-root { display: none; }
        @media print {
          @page { size: A4; margin: 0; }
          html, body {
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #fff !important;
          }
          body * { visibility: hidden !important; }
          .sinav-print-root, .sinav-print-root * { visibility: visible !important; }
          .sinav-print-root {
            display: block !important;
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            z-index: 2147483647 !important;
          }
          .sinav-print-root .sinav-a4-page {
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .sinav-print-root .shadow-xl,
          .sinav-print-root .ring-1 {
            box-shadow: none !important;
          }
          .sinav-print-root > div { padding-bottom: 0 !important; }
        }
      `}</style>
    </div>
  );
}

function BepModal({
  sorular,
  varsayilanSeciliIds,
  varsayilanPuntoArtis,
  onClose,
  onHazirla,
}: {
  sorular: SoruOgesi[];
  varsayilanSeciliIds: string[];
  varsayilanPuntoArtis: number;
  onClose: () => void;
  onHazirla: (seciliIds: string[], puntoArtis: number) => void;
}) {
  const [seciliIds, setSeciliIds] = useState<string[]>(varsayilanSeciliIds);
  const [puntoArtis, setPuntoArtis] = useState(varsayilanPuntoArtis);
  const diyalogRef = useRef<HTMLDivElement | null>(null);
  const kapatRef = useRef<HTMLButtonElement | null>(null);
  const seciliSet = new Set(seciliIds);
  const mantiksalGruplar = useMemo(() => mantiksalSoruGruplari(sorular), [sorular]);

  useModalErisilebilirligi({ containerRef: diyalogRef, ilkOdakRef: kapatRef, onKapat: onClose });

  function secimDegistir(id: string, checked: boolean) {
    const grupIds = mantiksalGruplar.find((grup) => grup.some((soru) => soru.id === id))?.map((soru) => soru.id) ?? [id];
    setSeciliIds((mevcut) =>
      checked ? [...new Set([...mevcut, ...grupIds])] : mevcut.filter((x) => !grupIds.includes(x)),
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4">
      <div ref={diyalogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="bep-modal-baslik" className="w-full max-w-2xl rounded-2xl bg-white p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 id="bep-modal-baslik" className="text-lg font-bold text-slate-800">
              BEP Versiyonu Hazırla
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Bu geçici görünüm asıl taslağı değiştirmez. Kağıda BEP ibaresi
              basılmaz.
            </p>
          </div>
          <button
            ref={kapatRef}
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100"
          >
            Kapat
          </button>
        </div>
        <label className="mt-3 block max-w-[220px]">
          <AlanEtiket>Punto artışı</AlanEtiket>
          <input
            value={puntoArtis}
            onChange={(e) =>
              setPuntoArtis(sayiSinirla(Number(e.target.value), 0, 8))
            }
            type="number"
            min={0}
            max={8}
            className={INPUT_CLASS}
          />
        </label>
        <div className="mt-3 max-h-[420px] space-y-2 overflow-auto rounded-xl border border-slate-100 bg-slate-50 p-2">
          {mantiksalGruplar.map((grup, index) => {
            const soru = grup[0];
            return (
            <label
              key={soru.id}
              className="flex items-start gap-2 rounded-lg bg-white p-2 text-sm text-slate-700 ring-1 ring-slate-100"
            >
              <input
                type="checkbox"
                checked={grup.every((parca) => seciliSet.has(parca.id))}
                onChange={(e) => secimDegistir(soru.id, e.target.checked)}
                className="mt-1"
              />
              <span>
                <b>{index + 1}. soru</b>
                <span className="ml-2 text-xs text-slate-500">
                  {htmlToText(
                    soru.tur === "metin" ? soru.metinHtml : soru.altMetinHtml,
                  ).slice(0, 120) ||
                    soru.dosyaAdi ||
                    "Görsel soru"}
                  {grup.length > 1 ? ` · ${grup.length} sayfalık paket` : ""}
                </span>
              </span>
            </label>
            );
          })}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={() => onHazirla(seciliIds, puntoArtis)}
            disabled={seciliIds.length === 0}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Görünümü Hazırla
          </button>
        </div>
      </div>
    </div>
  );
}
