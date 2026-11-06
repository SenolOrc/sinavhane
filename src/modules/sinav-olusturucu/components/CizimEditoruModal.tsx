import type { PointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDisariTiklama } from "@/lib/disariTiklama";
import {
  ArrowRight,
  BookOpen,
  Copy,
  Circle,
  Eraser,
  Grid3X3,
  Hexagon,
  Layers,
  Lock,
  Maximize2,
  Minus,
  MousePointer2,
  MoreHorizontal,
  PenTool,
  X,
  Redo2,
  Sigma,
  Square,
  Trash2,
  Triangle,
  Type,
  Undo2,
  Unlock,
  AudioWaveform,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { KaydedilmemisUyarisi, ModalKabuk, TogglePill, VazgecDugmesi } from "./ModalParcalari";
import { DenklemEditoruModal } from "./DenklemEditoruModal";
import { akisMetniniCoz } from "../cizim/akisMetni";
import { akisiYerlestir } from "../cizim/akisYerlesim";
import { useKapatmaOnayi } from "../hooks/useKapatmaOnayi";
import { FIZIK_TANIMLARI, fizikDisPayi } from "../cizim/fizik";
import { varsayilanIstatistik } from "../cizim/istatistik";
import { semaBoyutu, varsayilanSema } from "../cizim/sema";
import { kimyaBoyutu, varsayilanKimya } from "../cizim/kimya";
import { GRAFIK_SABLONLARI, hareketUcluGrafik, noktalardanGrafik, ORNEK_EVRELER } from "../cizim/grafik";
import type { GeometriVerisi, GrafikVerisi, IstatistikVerisi, KimyaVerisi, SemaVerisi } from "../cizim/tipler";
import { BaglayiciBicimPaneli, FizikSecimPaneli } from "./FizikPaneli";
import { fizikSahnePaneliVarMi } from "./FizikSahnePaneli";
import { GrafikSecimPaneli, GrafikSeridi } from "./GrafikPaneli";
import { IstatistikPaneli, MatematikSeridi, SemaPaneli } from "./MatematikPaneli";
import { KimyaPaneli, KimyaSeridi } from "./KimyaPaneli";
import type { BaglayiciAyari } from "./FizikPaneli";
import { AKIS_ARACLARI, kutuphaneGirdileri, type KutuphaneGirdisi } from "../cizim/kutuphane";
import {
  baglantiPortlari,
  cevrilebilirMi,
  grafikNoktaTasi,
  grafikNoktaTutamaclari,
  grafikPenceresi,
  portluMu,
  sekilDondur90,
  sekilYatayCevir,
  type BaglantiPortu,
} from "../cizim/etkilesim";
import { geometriEnYakinKenarVeyaKose, geometriKoseTasi, geometriKoseTasiSekil, geometriKoseleri } from "../cizim/geometriEtkilesim";
import { geometriMi } from "../cizim/geometriSekilleri";
import type { GrafikDuzeni } from "../cizim/grafik";
import { SolKutuphane } from "./cizim/SolKutuphane";
import { YuzenAracCubugu, type YuzenAracAyarlari } from "./cizim/YuzenAracCubugu";
import { YerindeDuzenleBalonu, type BalonHedefi } from "./cizim/YerindeDuzenleBalonu";

import type {
  CizgiTipi,
  CizilenTaslak,
  CizimAraci,
  CizimBelgesi,
  CizimCikti,
  HizalamaCizgileri,
  KenarKilidi,
  KullaniciSablonu,
  Nokta,
  Sekil,
  TaramaTipi,
  TutamacId,
  AkisSekli,
  BaglayiciUcu,
  FizikNesnesi,
} from "../cizim/tipler";
import {
  CANVAS_H,
  CANVAS_W,
  GECMIS_LIMITI,
  HIZALAMA_CIKIS_ORANI,
  IZGARA_ARALIK,
  KULLANICI_SABLONLARI_ANAHTARI,
  METIN_PUNTO,
  METIN_SATIR_ARALIGI,
  SABLON_ADI_SINIRI,
  AKIS_KARAR_H,
  AKIS_KARAR_W,
  AKIS_VARSAYILAN_H,
  AKIS_VARSAYILAN_METIN,
  EN_BUYUK_TUVAL,
  TUVAL_OLCULERI,
  sigdirmaOrani,
  AKIS_VARSAYILAN_W,
  AKIS_DOLGU_PALETI,
  TEMEL_RENK_PALETI,
  MUREKKEP,
  TEMEL_DOLGU_PALETI,
  ASGARI_CIZIM_PX,
} from "../cizim/sabitler";
import type { TuvalOlcusu } from "../cizim/sabitler";

import {
  cokgenNoktalariUret,
  dalgaNoktalariUret,
  dortgenKoseleri,
  kutuNormalle,
  noktaDondur,
  noktaListesiKutusu,
  sekilBoyutlandir,
  enYakinDugum,
  sekilGeometriAyarla,
  sekilGeometriKutusu,
  sekilId,
  taslagiKesinlestir,
  sekilTasi,
  seciliBaglayicilarlaGenislet,
  disUclariSerbestBirak,
  kimlikleriYenile,
  birlikteTasinanBaglayicilar,
  ucgenNoktalari,
} from "../cizim/geometri";
import {
  birlesikSinir,
  cizimIcerikSiniri,
  noktaYerel,
  sekilMerkezi,
  sekilSinirlari,
  sekilTasiSinirli,
  sekilTutamaclari,
  sekilTamKutusu,
} from "../cizim/sinirlar";
import { icerigeKirp } from "../cizim/kirpma";
import { etkilesimBelirle, etkilesimIpucu, imlecSinifi, sekilTurAdi, sekilVuruldu, tutamacPayi } from "../cizim/vurus";
import { bosYerBul, type Kutu } from "../cizim/yerlesim";
import {
  boyutlandirmaAdaylari,
  digerSekillerKenarAdaylari,
  dikeyCizgiUret,
  hizalamaEsigi,
  hizalamaKilitliEslestir,
  hizalamaKilitliEslestirKenar,
  susturulmusTemizle,
  tasimaKenarDegerleri,
  yatayCizgiUret,
} from "../cizim/hizalama";
import { sablonGecerliMi } from "../cizim/sablon";
import { sekilleriCiz, tuvaleCiz } from "../cizim/ciz";
import { kisayol } from "../lib/kisayol";

/** Geri/ileri al yığınlarının bir adımı: şekiller + o anki tuval ölçüsü. */
type GecmisKaydi = { sekiller: Sekil[]; tuvalOlcu: TuvalOlcusu };


/** Düğmedeki küçük şekil önizlemesi — adı okumadan da ayırt edilebilsin. */
function AkisSimge({ sekil }: { sekil: AkisSekli }) {
  const ortak = { fill: "none", stroke: "currentColor", strokeWidth: 1.5 };
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true">
      {sekil === "baslangic" && <rect x="1" y="2" width="14" height="8" rx="4" {...ortak} />}
      {sekil === "surec" && <rect x="1" y="2" width="14" height="8" {...ortak} />}
      {sekil === "karar" && <polygon points="8,1 15,6 8,11 1,6" {...ortak} />}
      {sekil === "veri" && <polygon points="4,2 15,2 12,10 1,10" {...ortak} />}
      {sekil === "hazirlik" && <polygon points="4,2 12,2 15,6 12,10 4,10 1,6" {...ortak} />}
      {sekil === "belge" && <path d="M1 2 H15 V9 Q11 12 8 9.5 Q5 7 1 9 Z" {...ortak} />}
    </svg>
  );
}

/**
 * Akış kipinde görünen genel araçlar. Geri kalanı (üçgen, dalga, çokgen…)
 * akış şemasında kullanılmıyor ve tuvalin üstünü kaplıyordu.
 * "metin" duruyor: kutuya sığmayan bir açıklamayı kenara yazmak isteyen olur.
 */
/** Renk seçicinin uygulandığı temel şekiller; dolgu yalnız kapalı olanlarda. */
const TEMEL_RENKLI_TURLER: string[] = ["dogru", "dikdortgen", "elips", "ucgen", "cokgen", "dalga", "serbest", "metin"];
const TEMEL_DOLGULU_TURLER: string[] = ["dikdortgen", "elips", "ucgen", "cokgen"];


const ARAC_TANIMLARI: { arac: CizimAraci; etiket: string; ipucu?: string; icon: typeof Minus }[] = [
  { arac: "sec", etiket: "Seç / Taşı", icon: MousePointer2 },
  { arac: "dogru", etiket: "Çizgi", ipucu: "Shift ile yatay, dikey veya 45° çizgi", icon: Minus },
  {
    arac: "baglayici",
    etiket: "Ok / Bağlayıcı",
    ipucu: "Şekilleri birbirine bağlayın (ok, devre teli, ip, yay, kuvvet) ya da boşlukta ok çekin. Esc ile bırakılır",
    icon: ArrowRight,
  },
  {
    arac: "dikdortgen",
    etiket: "Dikdörtgen",
    ipucu: "Dikdörtgen (kare için Shift'e basılı tutarak çizin)",
    icon: Square,
  },
  {
    arac: "elips",
    etiket: "Daire / Elips",
    ipucu: "Daire / Elips (tam daire için Shift'e basılı tutarak çizin)",
    icon: Circle,
  },
  {
    arac: "ucgen",
    etiket: "Üçgen",
    ipucu: "Üçgen (çizdikten sonra köşelerini tek tek sürükleyerek dik/çeşitkenar üçgene dönüştürebilirsiniz)",
    icon: Triangle,
  },
  {
    arac: "cokgen",
    etiket: "Çokgen",
    ipucu: "Düzgün çokgen — kaç kenar olacağını aşağıdan seçin; çizdikten sonra her köşeyi ayrı ayrı sürükleyebilirsiniz",
    icon: Hexagon,
  },
  {
    arac: "dalga",
    etiket: "Dalga",
    ipucu: "Dalga — kaç tepe olacağını aşağıdan seçin; her noktayı ayrı ayrı sürükleyerek genliği yerelden değiştirebilirsiniz",
    icon: AudioWaveform,
  },
  { arac: "serbest", etiket: "Serbest çizgi", icon: PenTool },
  { arac: "metin", etiket: "Metin", ipucu: "Tıkladığınız yere yazı ekler", icon: Type },
  { arac: "silgi", etiket: "Silgi", ipucu: "Üzerinden geçtiğiniz şekilleri siler (Esc ile bırakılır)", icon: Eraser },
];

/** Ok / Bağlayıcı aracının türleri (araç seçiliyken tuvalin üstündeki şeritte). */
const BAGLAYICI_TURLERI: { id: string; ad: string; ayar: BaglayiciAyari; ipucu: string }[] = [
  { id: "ok", ad: "Ok", ayar: { stil: "duz", okUcu: "son" }, ipucu: "Düz ok" },
  { id: "dik", ad: "Dik açılı ok", ayar: { stil: "dik", okUcu: "son" }, ipucu: "Akış şemasındaki gibi dik açılı ok" },
  { id: "tel", ad: "Devre teli", ayar: { stil: "dik", okUcu: "yok" }, ipucu: "Dik açılı tel; devre elemanlarını bağlar" },
  { id: "ip", ad: "İp / Çubuk", ayar: { stil: "duz", okUcu: "yok" }, ipucu: "Düz çizgi (ip, çubuk, kablo)" },
  { id: "yay", ad: "Yay", ayar: { stil: "yay", okUcu: "yok" }, ipucu: "Zikzaklı yay" },
  { id: "vektor", ad: "Kuvvet / Vektör", ayar: { stil: "vektor", okUcu: "son" }, ipucu: "Kalın uçlu ok — kuvvet, hız, ivme" },
];

/**
 * Sağ panelin KENDİLİĞİNDEN açılmadığı basit fizik nesneleri: bunlarda etiket,
 * çevir, döndür, dolgu yüzen çubukta. Listede OLMAYAN her nesne (grafik,
 * istatistik, şema, kimya, geometri ve sonradan eklenen düzenekler) seçilince
 * ayrıntılı panel açılır — yeni bir nesnenin ayarları gözden kaçmasın.
 */
const BASIT_FIZIK: string[] = [
  "kutle", "kure", "egikDuzlem", "makara", "araba", "nokta", "yay", "kap", "duvar", "zemin", "tavan",
  "direnc", "pil", "ampul", "anahtarAcik", "anahtarKapali", "kondansator", "bobin", "ampermetre", "voltmetre",
  "mercekTumsek", "mercekCukur", "aynaCukur", "aynaTumsek", "aynaDuzlem", "prizma", "miknatis", "yukArti", "yukEksi",
  "vektorKuvvet", "vektorHiz", "vektorIvme", "vektorBilesen", "dugum", "koordinat",
];

/** Veri `geo` taşıyan geometri nesnesi mi (üçgen, dörtgen, çember, çokgen…)? */
function geometriNesnesiMi(s: Extract<Sekil, { tur: "fizik" }>): boolean {
  return geometriMi(s.nesne) || FIZIK_TANIMLARI[s.nesne]?.grup === "geometri" && !!s.geo;
}

function karmasikMi(s: Sekil | undefined): boolean {
  if (!s || s.tur !== "fizik") return false;
  if (BASIT_FIZIK.includes(s.nesne)) return false;
  return true;
}



export function CizimEditoruModal({
  onClose,
  onOlustur,
  baslangicBelgesi,
  seciliSoruVar = false,
  duzenlemeModu = false,
  inlineMod = false,
  satirIciYukseklik,
}: {
  /** Metnin içine eklenen çizimin kâğıttaki yüksekliği (CSS px). Yalnız
   *  `inlineMod`da gösterilir; en-boy oranı korunur, genişlik ona göre gelir. */
  satirIciYukseklik?: { deger: number; onChange: (px: number) => void };
  onClose: () => void;
  onOlustur: (cikti: CizimCikti, hedef: "yeni" | "secili" | "inline") => void;
  baslangicBelgesi?: CizimBelgesi;
  seciliSoruVar?: boolean;
  duzenlemeModu?: boolean;
  inlineMod?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  /**
   * Seçili şeklin özellik paneli. Araç çubuğu artık kendi içinde kaydığı için
   * panel, seçim yapıldığı anda kaydırma alanının ALTINDA kalabiliyor —
   * öğretmen kutuyu ekliyor ama "Kutu metni"/"Denklem ekle" ekranda değil.
   * Seçim değişince görünür alana getiriliyor.
   */
  const seciliPanelRef = useRef<HTMLDivElement | null>(null);
  const [sekiller, setSekiller] = useState<Sekil[]>(() => baslangicBelgesi?.sekiller ?? []);
  // Geçmiş/ileri yığınları useState yerine ref'te tutulur: geriAl/ileriAl
  // önceden setGecmis'in updater'ı İÇİNDEN setIleri/setSekiller çağırıyordu —
  // React 18 StrictMode dev modunda updater'lar iki kez çalıştığından tek bir
  // Ctrl+Z aynı durumu ileri yığınına iki kez itiyordu. Updater'lar artık saf;
  // buton disabled durumu ve "Geçmiş X/80" sayacı için hafif sayaç state'leri var.
  // Her kayıt şekillerle birlikte TUVAL ÖLÇÜSÜNÜ de taşır: ölçü değişikliği
  // geçmişe yazılıyor ama yalnız şekiller saklandığından Ctrl+Z ölçüyü geri
  // almıyor, boşa bir adım harcıyordu.
  const gecmisRef = useRef<GecmisKaydi[]>([]);
  const ileriRef = useRef<GecmisKaydi[]>([]);
  const [gecmisSayisi, setGecmisSayisi] = useState(0);
  const [ileriSayisi, setIleriSayisi] = useState(0);
  const [arac, setArac] = useState<CizimAraci>("sec");
  const [kalinlik, setKalinlik] = useState(2);
  const [cizgiTipi, setCizgiTipi] = useState<CizgiTipi>("duz");
  const [tarama, setTarama] = useState<TaramaTipi>("yok");
  const [cokgenKenar, setCokgenKenar] = useState(6);
  const [dalgaSayisi, setDalgaSayisi] = useState(2);
  const [metinPunto, setMetinPunto] = useState(METIN_PUNTO);
  const [metinSatirAraligi, setMetinSatirAraligi] = useState(METIN_SATIR_ARALIGI);
  const [izgaraGoster, setIzgaraGoster] = useState(false);
  const [izgarayaYakala, setIzgarayaYakala] = useState(false);
  /**
   * Tuval ölçüsü — artık sabit değil, BELGEDEN geliyor.
   *
   * `CizimBelgesi.genislik/yukseklik` uzun süre yazılıyor ama HİÇ okunmuyordu;
   * tuval sabitken görünmez bir kusurdu. Boyut değişken olunca okunmaması,
   * kaydedilmiş geniş bir çizimi yeniden açınca 960×600'e kırpmak demek olurdu.
   */
  const [tuvalOlcu, setTuvalOlcu] = useState<TuvalOlcusu>(() => ({
    w: baslangicBelgesi?.genislik || CANVAS_W,
    h: baslangicBelgesi?.yukseklik || CANVAS_H,
  }));
  /** Mount'ta bir kez kurulan klavye dinleyicisi (oklar, Ctrl+D) ve geçmiş
   *  kaydı güncel ölçüyü buradan okur; yoksa mount anındaki 960×600'de donar. */
  const tuvalOlcuRef = useRef(tuvalOlcu);
  tuvalOlcuRef.current = tuvalOlcu;
  const [zoom, setZoom] = useState(100);
  const [seciliId, setSeciliId] = useState<string | null>(null);
  const [seciliIds, setSeciliIds] = useState<string[]>([]);
  const [taslak, setTaslak] = useState<CizilenTaslak | null>(null);
  const [metinNoktasi, setMetinNoktasi] = useState<Nokta | null>(null);
  const [metinDeger, setMetinDeger] = useState("");
  const [metinDuzenlenenId, setMetinDuzenlenenId] = useState<string | null>(null);
  // Bağlayıcı İKİ TIKLA kuruluyor: önce kaynak kutu, sonra hedef kutu.
  // Sürükleyerek çizme denenmedi çünkü uçlar şekle tutunuyor — sürükleme
  // sırasında hangi şeklin üstünde olunduğunu göstermek ayrı bir geri bildirim
  // katmanı isterdi; iki tık hem basit hem de yanlış hedefte iptal edilebilir.
  //
  // Kaynak ucu artık ŞEKİL ya da SERBEST NOKTA olabilir (fizik kipinde kuvvet
  // oku boş bir noktadan başlayıp bir kütlede bitebilir).
  const [baglayiciKaynakUcuDurum, setBaglayiciKaynakUcuDurum] = useState<BaglayiciUcu | null>(null);
  // Ref aynası: basış ve bırakış React render'ı araya girmeden art arda gelebilir.
  const baglayiciKaynakUcuRef = useRef<BaglayiciUcu | null>(null);
  const baglayiciKaynakUcu = baglayiciKaynakUcuDurum;
  const setBaglayiciKaynakUcu = (uc: BaglayiciUcu | null) => { baglayiciKaynakUcuRef.current = uc; setBaglayiciKaynakUcuDurum(uc); };
  /** Yeni bağlayıcının biçimi. Akış kipinde dik açılı ok; fizik kipinde paletten. */
  const [baglayiciAyari, setBaglayiciAyariDurum] = useState<BaglayiciAyari>({ stil: "dik", okUcu: "son" });
  /** Öğretmen bağlayıcı türünü kendisi seçti mi? Seçmediyse tür uçlara göre belirlenir. */
  const baglayiciTuruSecildiRef = useRef(false);
  const [baglayiciTuruSecildi, setBaglayiciTuruSecildi] = useState(false);
  const setBaglayiciAyari = (a: BaglayiciAyari) => { baglayiciTuruSecildiRef.current = true; setBaglayiciTuruSecildi(true); setBaglayiciAyariDurum(a); };
  const [hata, setHata] = useState("");
  const [temizleOnayi, setTemizleOnayi] = useState(false);
  const [secimKutusu, setSecimKutusu] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [hizalamaCizgileri, setHizalamaCizgileri] = useState<HizalamaCizgileri>({ dikey: [], yatay: [] });
  // Kilit artık hangi kenarla (taşımada sol/orta/sağ) kilitlendiğini de taşır
  // (bkz. KenarKilidi/hizalamaKilitliEslestirKenar). Nokta-tutamaç yolunda
  // (hizalamaKilitliEslestir, tek değer) kenarIndex anlamsız — hep 0 yazılır,
  // hizalamaKilitliEslestir'in kendi imzası HizalamaAday | null olarak kalır.
  const aktifHizalamaXRef = useRef<KenarKilidi | null>(null);
  const aktifHizalamaYRef = useRef<KenarKilidi | null>(null);
  // Sürükleme/boyutlandırma BAŞLARKEN zaten eşik içindeki aday değerleri
  // burada "susturulur" (bkz. susturulmusTemizle) — ilk dokunuşta anında
  // kilitlenip ince ayarı imkânsızlaştırmasınlar diye.
  const susturulmusXRef = useRef<Set<number>>(new Set());
  const susturulmusYRef = useRef<Set<number>>(new Set());
  const [sablonKaydiAcik, setSablonKaydiAcik] = useState(false);
  const [sablonAdi, setSablonAdi] = useState("");
  const [silinecekSablon, setSilinecekSablon] = useState<KullaniciSablonu | null>(null);
  /** Denklemi düzenlenen akış kutusunun kimliği (null = denklem modalı kapalı). */
  const [denklemKutusuId, setDenklemKutusuId] = useState<string | null>(null);
  /** Yazarak tarif paneli açık mı + metni + son ayrıştırma uyarıları. */
  const [tarifMetni, setTarifMetni] = useState("");
  const [tarifUyarilari, setTarifUyarilari] = useState<string[]>([]);
  /** Tuvalde şekil varken "Diz" denince açılan onay. */
  const [dizmeOnayi, setDizmeOnayi] = useState(false);
  /**
   * Sol kütüphane çekmecesi. Geniş ekranda açık başlar; dar ekranda (iPad
   * dikey) tuvalin üstüne açılan çekmece olduğu için kapalı başlar. Karta
   * tıklamak onu KAPATMAZ (ardı ardına ekleme).
   */
  const [solAcik, setSolAcik] = useState(() => typeof window === "undefined" || (window.innerWidth || 1440) >= 1024);
  /** Ayrıntılı (sağ) panel. Karmaşık nesne seçilince kendiliğinden açılır. */
  const [sagPanelAcik, setSagPanelAcik] = useState(false);
  /** Bağlantı portları gösterilen (fareyle üstüne gelinen) şekil. */
  const [uzerindekiId, setUzerindekiId] = useState<string | null>(null);
  /** Fare altındaki işlemin kısa açıklaması ("Taşımak için sürükle" gibi). */
  const [imlecIpucu, setImlecIpucu] = useState("");
  /** Porttan sürüklenen bağlayıcının önizleme çizgisi. */
  const [portCizgisi, setPortCizgisi] = useState<{ bas: Nokta; son: Nokta } | null>(null);
  /** Çift tıklamada açılan yerinde düzenleme baloncuğu. */
  const [balon, setBalon] = useState<{ hedef: BalonHedefi; nokta: Nokta } | null>(null);
  const balonOncesiRef = useRef<Sekil[] | null>(null);
  /** İşaretçi tuvalde basılıyken yüzen çubuk gizlenir (sürüklenen şeklin üstünde durmasın). */
  const [isaretciBasili, setIsaretciBasili] = useState(false);
  const [sonEklenen, setSonEklenen] = useState<string | null>(null);
  // Yüzen çubuk/balon, kaydırılan/boyu değişen tuvalle birlikte konumlansın diye yeniden çizilir.
  const [, setKaydirmaSayaci] = useState(0);
  /** Ayrıntılı panel açılınca yer açmak için kendiliğinden kapanan kütüphane. */
  const solOtomatikKapandiRef = useRef(false);
  const aracRef = useRef<CizimAraci>("dogru");
  const balonAcikRef = useRef(false);
  /**
   * ODAK KİPİ — "sadece tuval": araç çubukları ve paneller gizlenir; Escape
   * ile çıkılır. "Daha fazla" menüsünden açılır.
   */
  const [odakKipi, setOdakKipi] = useState(false);
  /** Klavye dinleyicisi bir kez kuruluyor ([] bağımlılık); güncel değeri
   *  ref'ten okur, yoksa mount anındaki `false`a donar. */
  const odakKipiRef = useRef(false);
  useEffect(() => {
    odakKipiRef.current = odakKipi;
  }, [odakKipi]);
  /** "Daha fazla" menüsü (ızgara, tuval ölçüsü, temizle…). */
  const [digerAraclarAcik, setDigerAraclarAcik] = useState(false);
  const digerAraclarRef = useRef<HTMLDivElement>(null);
  const dahaFazlaMenuRef = useRef<HTMLDivElement>(null);
  useDisariTiklama(digerAraclarAcik, () => setDigerAraclarAcik(false), digerAraclarRef, dahaFazlaMenuRef);
  const [kullaniciSablonlari, setKullaniciSablonlari] = useState<KullaniciSablonu[]>(() => {
    try {
      const kayit = window.localStorage.getItem(KULLANICI_SABLONLARI_ANAHTARI);
      if (!kayit) return [];
      const ayristirilan: unknown = JSON.parse(kayit);
      // Şemayı geçemeyen tek bir şablon yüzünden TÜM liste atılmaz; yalnızca
      // o şablon elenir, geçerli olanlar yüklenmeye devam eder.
      return Array.isArray(ayristirilan) ? ayristirilan.filter(sablonGecerliMi) : [];
    } catch { return []; }
  });

  const cizimBaslangici = useRef<Nokta | null>(null);
  const surukleBaslangici = useRef<{ nokta: Nokta; sekiller: Sekil[] } | null>(null);
  const boyutlandirmaBaslangici = useRef<{ sekilId: string; handleId: TutamacId; orijinal: Sekil; baslangicAci?: number } | null>(
    null,
  );
  /** Çift tıklamayı tanımak için son basış. */
  const sonBasisRef = useRef<{ t: number; nokta: Nokta } | null>(null);
  /** Porttan bağlayıcı sürükleme. */
  const portSurukleRef = useRef<{ kaynak: BaglayiciUcu; bas: Nokta } | null>(null);
  /** Bağlayıcı aracında basış noktası (sürükle-bırak ile bağlamak için). */
  const baglayiciSurukleRef = useRef<{ nokta: Nokta; yeniKaynak: boolean } | null>(null);
  /** Köşe/nokta tutamacı sürükleme; grafikte pencere sürükleme boyunca dondurulur. */
  const noktaSurukleRef = useRef<{
    sekilId: string; tur: "geo" | "grafik"; i: number; egri?: number;
    pencere?: GrafikDuzeni;
    eskiPencere?: Pick<GrafikVerisi, "xMin" | "xMax" | "yMin" | "yMax" | "xAdim" | "yAdim">;
  } | null>(null);
  const grupDondurmeBaslangici = useRef<{ orijinaller: Sekil[]; merkez: Nokta; baslangicAci: number } | null>(null);
  const silgiAktifRef = useRef(false);
  const secimKutusuBaslangiciRef = useRef<Nokta | null>(null);
  const secimKutusuOncekiRef = useRef<string[]>([]);
  const secimKutusuRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  // Senkron CDP/otomasyon olaylarında pointerdown→pointermove→pointerup art arda,
  // React render'ı araya girmeden tetiklenebiliyor; pointerup o durumda hâlâ eski
  // (render'a girmemiş) `taslak` state'ini görebilir. Geometri burada, ref'te
  // tutulur — state sadece önizleme çizimini tetiklemek için ayna görevi görür.
  const taslakRef = useRef<CizilenTaslak | null>(null);
  const sekillerRef = useRef<Sekil[]>(sekiller);
  const islemDegistiRef = useRef(false);
  const islemOncesiRef = useRef<Sekil[] | null>(null);
  const baslangicSekilleriRef = useRef(JSON.stringify(baslangicBelgesi?.sekiller ?? []));
  // Global keydown dinleyicisi aşağıda [] bağımlılıkla bir kez kurulur; içindeki
  // fonksiyonlar seciliId/seciliIds state'ini doğrudan okursa mount anındaki
  // (genelde boş) değerde donar kalır. sekillerRef ile aynı kalıp: her render'da
  // güncellenen bu ref'ler üzerinden erişilir.
  const seciliIdRef = useRef(seciliId);
  seciliIdRef.current = seciliId;
  aracRef.current = arac;
  balonAcikRef.current = !!balon;
  const seciliIdsRef = useRef(seciliIds);
  seciliIdsRef.current = seciliIds;
  // Metin punto kutusuna odaklanma anındaki punto + tüm şekil listesi: onBlur'da
  // değer değiştiyse geçmişe bu ANLIK GÖRÜNTÜ yazılır (madde 2).
  const metinPuntoOdaklanmaRef = useRef<{ punto: number; anlik: Sekil[] } | null>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    sekillerRef.current = sekiller;
    tuvaleCiz(ctx, sekiller, taslak, seciliIds, true, izgaraGoster, secimKutusu, hizalamaCizgileri, tuvalOlcu);
    etkilesimKatmaniCiz(ctx);
    // tuvalOlcu bağımlılıkta OLMALI: <canvas width/height> değişince tarayıcı
    // tuvali siler; yeniden çizilmezse ölçü değişiminden sonra tuval boş kalır.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sekiller, taslak, seciliIds, izgaraGoster, secimKutusu, hizalamaCizgileri, tuvalOlcu, uzerindekiId, portCizgisi, zoom, arac, baglayiciKaynakUcu]);

  /**
   * Doğrudan etkileşim katmanı (seçim çerçevesinin üstünde): bağlantı portları
   * (mavi halkalar), köşe/nokta tutamaçları, porttan çekilen bağlayıcının
   * önizlemesi. Ekranda sabit boyda görünsün diye yakınlaştırmaya bölünür.
   */
  function etkilesimKatmaniCiz(ctx: CanvasRenderingContext2D) {
    const b = 100 / Math.max(zoom, 1);
    ctx.save();
    ctx.setLineDash([]);
    if (arac === "sec" || arac === "baglayici") {
      for (const sk of portluSekiller()) {
        for (const p of baglantiPortlari(sk)) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6 * b, 0, Math.PI * 2);
          ctx.fillStyle = "#dbeafe";
          ctx.fill();
          ctx.lineWidth = 2 * b;
          ctx.strokeStyle = "#2563eb";
          ctx.stroke();
        }
      }
    }
    if (arac === "sec") {
      for (const t of noktaTutamaclari()) {
        ctx.beginPath();
        ctx.arc(t.x, t.y, 7 * b, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.lineWidth = 2.5 * b;
        ctx.strokeStyle = "#2563eb";
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(t.x, t.y, 2.5 * b, 0, Math.PI * 2);
        ctx.fillStyle = "#2563eb";
        ctx.fill();
      }
    }
    if (portCizgisi) {
      ctx.setLineDash([6 * b, 4 * b]);
      ctx.lineWidth = 2 * b;
      ctx.strokeStyle = "#2563eb";
      ctx.beginPath();
      ctx.moveTo(portCizgisi.bas.x, portCizgisi.bas.y);
      ctx.lineTo(portCizgisi.son.x, portCizgisi.son.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(portCizgisi.son.x, portCizgisi.son.y, 4 * b, 0, Math.PI * 2);
      ctx.fillStyle = "#2563eb";
      ctx.fill();
    }
    // Bağlayıcı aracında seçilen kaynak: küçük işaret (sıradaki tık hedeftir).
    const kaynak = baglayiciKaynakUcu;
    if (arac === "baglayici" && kaynak) {
      const sk = "sekilId" in kaynak ? sekiller.find((x) => x.id === kaynak.sekilId) : undefined;
      const p = "sekilId" in kaynak
        ? (sk && (sk.tur === "akis" || sk.tur === "fizik") ? { x: sk.x + sk.w / 2, y: sk.y + sk.h / 2 } : null)
        : { x: kaynak.x, y: kaynak.y };
      if (p) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6 * b, 0, Math.PI * 2);
        ctx.fillStyle = "#2563eb";
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Seçim değişince özellik panelini araç çubuğunun görünür alanına getir.
  // `scrollIntoView` jsdom'da tanımsız olabiliyor — testler bileşeni gerçek
  // tarayıcısız kuruyor, bu yüzden varlığı kontrol ediliyor.
  useEffect(() => {
    const panel = seciliPanelRef.current;
    if (!panel || typeof panel.scrollIntoView !== "function") return;
    panel.scrollIntoView({ block: "nearest" });
  }, [seciliIds]);

  // [] bağımlılıkla bir kez kurulur (önceden deps'siz olduğundan her render'da
  // söküp takılıyordu). Handler, kapandığı state yerine seciliIdRef/seciliIdsRef
  // üzerinden güncel değeri okur — aksi halde mount anındaki (boş) seçime donar.
  useEffect(() => {
    function tus(e: KeyboardEvent) {
      const hedef = e.target as HTMLElement | null;
      if (hedef?.closest("input,textarea,[contenteditable='true']")) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? ileriAl() : geriAl();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault(); ileriAl(); return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault(); seciliCogalt(); return;
      }
      // Ctrl/Cmd+A: tüm şekilleri seç (çoklu seçim işlemleri için). Tarayıcının
      // sayfa seçimini engelliyoruz; yazı alanlarındayken yukarıda zaten çıkıldı.
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        secimAyarla(sekillerRef.current.map((s) => s.id));
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && seciliIdRef.current) {
        e.preventDefault(); seciliSil(); return;
      }
      // Escape ÖNCE odak kipinden çıkarır. Kip açıkken araç çubuğu yok, yani
      // "çıkış" düğmesi de görünmüyor; tek çıkış yolu bu tuş olmalı. Modalı
      // kapatmasını `kapanabilir` engelliyor (odak kipinde false).
      if (e.key === "Escape" && odakKipiRef.current) {
        setOdakKipi(false);
        return;
      }
      // Escape önce etkin aracı bırakır (sürekli bağlayıcı kipi, silgi, çizim
      // araçları) ve Seç'e döner; Seç'teyken seçimi temizler.
      if (e.key === "Escape" && aracRef.current !== "sec") {
        setArac("sec"); setBaglayiciKaynakUcu(null); setPortCizgisi(null); setMetinNoktasi(null);
        return;
      }
      if (e.key === "Escape") { secimAyarla([]); setMetinNoktasi(null); return; }
      if (seciliIdsRef.current.length && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;
        e.preventDefault();
        const adim = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -adim : e.key === "ArrowRight" ? adim : 0;
        const dy = e.key === "ArrowUp" ? -adim : e.key === "ArrowDown" ? adim : 0;
        tarihceyeKaydet();
        const tasinanIds = new Set([
          ...seciliIdsRef.current,
          ...birlikteTasinanBaglayicilar(sekillerRef.current, seciliIdsRef.current).map((s) => s.id),
        ]);
        setSekiller((liste) => liste.map((s) => tasinanIds.has(s.id) ? sekilTasiSinirli(ctx, s, dx, dy, tuvalOlcuRef.current) : s));
      }
    }
    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  }, []);

  // Pencere düzeyinde pointerup/pointercancel güvencesi: parmak/kalem tuval DIŞINDA
  // kalkarsa ya da pointer capture kaybolursa (ör. sistem hareketi, pencere dışı
  // bırakma) tuvalin kendi onPointerUp'ı hiç çalışmaz ve taslak/sürükleme asılı
  // kalırdı. Tuval kendi olayını zaten işlediği için yalnız hedefi tuval OLMAYAN
  // olaylar ele alınır (çift çağrı yok); etkin bir etkileşim yoksa hiçbir şey yapılmaz.
  useEffect(() => {
    function etkilesimVar() {
      return !!(taslakRef.current || surukleBaslangici.current || boyutlandirmaBaslangici.current
        || grupDondurmeBaslangici.current || secimKutusuBaslangiciRef.current || silgiAktifRef.current
        || portSurukleRef.current || noktaSurukleRef.current || baglayiciSurukleRef.current);
    }
    function pencereYukari(e: globalThis.PointerEvent) {
      if (e.target === canvasRef.current || !etkilesimVar()) return;
      yukariRef.current();
    }
    function pencereIptal(e: globalThis.PointerEvent) {
      if (e.target === canvasRef.current || !etkilesimVar()) return;
      iptalRef.current();
    }
    window.addEventListener("pointerup", pencereYukari);
    window.addEventListener("pointercancel", pencereIptal);
    return () => {
      window.removeEventListener("pointerup", pencereYukari);
      window.removeEventListener("pointercancel", pencereIptal);
    };
  }, []);

  const yukariRef = useRef<() => void>(() => {});
  const iptalRef = useRef<() => void>(() => {});

  function tarihceyeKaydet(anlik: Sekil[] = sekillerRef.current) {
    gecmisRef.current = [...gecmisRef.current, { sekiller: anlik, tuvalOlcu: tuvalOlcuRef.current }].slice(-GECMIS_LIMITI);
    ileriRef.current = [];
    setGecmisSayisi(gecmisRef.current.length);
    setIleriSayisi(0);
  }

  function secimAyarla(ids: string[]) {
    const benzersiz = [...new Set(ids)].filter((id) => sekillerRef.current.some((s) => s.id === id));
    setSeciliIds(benzersiz);
    setSeciliId(benzersiz[benzersiz.length - 1] ?? null);
    const birincil = sekillerRef.current.find((s) => s.id === benzersiz[benzersiz.length - 1]);
    if (birincil?.tur === "metin") {
      setMetinPunto(birincil.punto ?? METIN_PUNTO);
      setMetinSatirAraligi(birincil.satirAraligi ?? METIN_SATIR_ARALIGI);
    } else if (birincil) {
      setKalinlik(birincil.kalinlik);
      setCizgiTipi(birincil.cizgiTipi ?? "duz");
      setTarama(birincil.tarama ?? "yok");
    }
  }

  function geriAl() {
    if (gecmisRef.current.length === 0) return;
    const son = gecmisRef.current[gecmisRef.current.length - 1];
    gecmisRef.current = gecmisRef.current.slice(0, -1);
    ileriRef.current = [...ileriRef.current, { sekiller: sekillerRef.current, tuvalOlcu: tuvalOlcuRef.current }].slice(-GECMIS_LIMITI);
    setSekiller(son.sekiller);
    setTuvalOlcu(son.tuvalOlcu);
    secimAyarla([]);
    setGecmisSayisi(gecmisRef.current.length);
    setIleriSayisi(ileriRef.current.length);
  }

  function ileriAl() {
    if (ileriRef.current.length === 0) return;
    const son = ileriRef.current[ileriRef.current.length - 1];
    ileriRef.current = ileriRef.current.slice(0, -1);
    gecmisRef.current = [...gecmisRef.current, { sekiller: sekillerRef.current, tuvalOlcu: tuvalOlcuRef.current }].slice(-GECMIS_LIMITI);
    setSekiller(son.sekiller);
    setTuvalOlcu(son.tuvalOlcu);
    secimAyarla([]);
    setGecmisSayisi(gecmisRef.current.length);
    setIleriSayisi(ileriRef.current.length);
  }

  function hepsiniTemizle() {
    if (sekiller.length === 0) return;
    tarihceyeKaydet();
    setSekiller([]);
    secimAyarla([]);
    setTemizleOnayi(false);
  }

  function degisiklikUygula(yeni: Sekil[]) {
    tarihceyeKaydet();
    setSekiller(yeni);
  }

  function seciliOzellikGuncelle(patch: { kalinlik?: number; cizgiTipi?: CizgiTipi; punto?: number; satirAraligi?: number; okUcu?: "yok" | "son" | "cift"; tarama?: TaramaTipi }) {
    if (!seciliIds.length) return;
    tarihceyeKaydet();
    setSekiller((mevcut) => mevcut.map((s) => seciliIds.includes(s.id) ? { ...s, ...patch } as Sekil : s));
  }

  // Dikdörtgeni "köşeleri serbest" moduna alır/çıkarır. Serbest moda geçerken
  // mevcut 4 köşe aynen korunur (görsel olarak hiçbir şey değişmez), sadece
  // artık her köşe üçgende olduğu gibi bağımsız sürüklenebilir hale gelir.
  // Kapatırken şekil, o ana kadarki köşelerin kapladığı alana göre yeniden
  // dikdörtgenleştirilir (büyüt/küçültme bu moddan sonra da bozulmadan çalışır).
  function seciliDikdortgenSerbestlikDegistir() {
    if (seciliIds.length !== 1 || !seciliId) return;
    const secili = sekiller.find((s) => s.id === seciliId);
    if (!secili || secili.tur !== "dikdortgen") return;
    tarihceyeKaydet();
    setSekiller((liste) => liste.map((s) => {
      if (s.id !== secili.id || s.tur !== "dikdortgen") return s;
      if (s.serbestKoseler) {
        const kutu = noktaListesiKutusu(s.serbestKoseler);
        return { ...s, serbestKoseler: undefined, x: kutu.x, y: kutu.y, w: kutu.w, h: kutu.h };
      }
      return { ...s, serbestKoseler: dortgenKoseleri({ x: s.x, y: s.y, w: s.w, h: s.h }) };
    }));
  }

  function seciliCogalt() {
    // sekiller/seciliIds state'i yerine ref'ler kullanılır: bu fonksiyon artık
    // [] bağımlılıkla mount'ta bir kez kurulan global Ctrl+D dinleyicisinden de
    // çağrılıyor, orada state kapanışı mount anındaki değerde donar kalırdı.
    const guncelSekiller = sekillerRef.current;
    if (!seciliIdsRef.current.length) return;
    // Seçili şekiller arasındaki bağlayıcılar (seçim dikdörtgeni onları
    // yakalamıyor) kendiliğinden kopyalanır; kimlikler + bağlayıcı uçları
    // aynı eşlemeyle yenilenir, seçim dışındaki şekle tutunan uç serbest
    // noktaya döner (kopya ok asıl şekle bağlı kalmasın).
    const ids = new Set(seciliBaglayicilarlaGenislet(seciliIdsRef.current, guncelSekiller));
    const secilenler = guncelSekiller.filter((s) => ids.has(s.id));
    if (!secilenler.length) return;
    const ctx = canvasRef.current?.getContext("2d");
    const yeniler = kimlikleriYenile(disUclariSerbestBirak(secilenler, guncelSekiller)).map((s) =>
      // sekilTasi yerine sekilTasiSinirli: kenardaki bir şekil çoğaltılınca
      // tuval dışına taşmasın (ctx alınamazsa eski davranışa düşülür).
      ctx ? sekilTasiSinirli(ctx, s, 16, 16, tuvalOlcuRef.current) : sekilTasi(s, 16, 16));
    degisiklikUygula([...guncelSekiller, ...yeniler]);
    window.setTimeout(() => secimAyarla(yeniler.map((s) => s.id)), 0);
  }

  function secilenleriGrupla() {
    if (seciliIds.length < 2) return;
    const grupId = `grup-${sekilId()}`;
    tarihceyeKaydet();
    setSekiller((liste) => liste.map((s) => seciliIds.includes(s.id) ? { ...s, grupId } : s));
  }

  function secilenGrubuCoz() {
    if (!seciliIds.some((id) => sekiller.find((s) => s.id === id)?.grupId)) return;
    tarihceyeKaydet();
    setSekiller((liste) => liste.map((s) => seciliIds.includes(s.id) ? { ...s, grupId: undefined } : s));
  }

  function secilenleriHizala(tur: "sol" | "orta-x" | "ust" | "orta-y") {
    const ctx = canvasRef.current?.getContext("2d");
    // Bağlayıcılar hizalamaya KATILMAZ: kutuları tuval dışında (-1e6) duruyor;
    // Ctrl+A ile seçildiklerinde "sola hizala" her şeyi -1e6'ya itiyordu. Uçları
    // şekillere bağlı olduğu için şekillerle birlikte zaten yer değiştirirler.
    const secilenler = sekiller.filter((s) => seciliIds.includes(s.id) && s.tur !== "baglayici");
    if (!ctx || secilenler.length < 2) return;
    const sinirlar = secilenler.map((s) => ({ sekil: s, sinir: sekilSinirlari(ctx, s) }));
    const hedef = tur === "sol" ? Math.min(...sinirlar.map((x) => x.sinir.x))
      : tur === "orta-x" ? sinirlar.reduce((t, x) => t + x.sinir.x + x.sinir.w / 2, 0) / sinirlar.length
      : tur === "ust" ? Math.min(...sinirlar.map((x) => x.sinir.y))
      : sinirlar.reduce((t, x) => t + x.sinir.y + x.sinir.h / 2, 0) / sinirlar.length;
    tarihceyeKaydet();
    setSekiller((liste) => liste.map((s) => {
      const bilgi = sinirlar.find((x) => x.sekil.id === s.id);
      if (!bilgi) return s;
      const dx = tur === "sol" ? hedef - bilgi.sinir.x : tur === "orta-x" ? hedef - (bilgi.sinir.x + bilgi.sinir.w / 2) : 0;
      const dy = tur === "ust" ? hedef - bilgi.sinir.y : tur === "orta-y" ? hedef - (bilgi.sinir.y + bilgi.sinir.h / 2) : 0;
      return sekilTasiSinirli(ctx, s, dx, dy, tuvalOlcu);
    }));
  }

  function secilenleriDagit(eksen: "x" | "y") {
    const ctx = canvasRef.current?.getContext("2d");
    const secilenler = sekiller.filter((s) => seciliIds.includes(s.id) && s.tur !== "baglayici");
    if (!ctx || secilenler.length < 3) return;
    const sirali = secilenler.map((s) => {
      const sinir = sekilSinirlari(ctx, s);
      return { sekil: s, sinir, merkez: eksen === "x" ? sinir.x + sinir.w / 2 : sinir.y + sinir.h / 2 };
    }).sort((a, b) => a.merkez - b.merkez);
    const aralik = (sirali[sirali.length - 1].merkez - sirali[0].merkez) / (sirali.length - 1);
    const kaymalar = new Map(sirali.map((x, i) => [x.sekil.id, sirali[0].merkez + i * aralik - x.merkez]));
    tarihceyeKaydet();
    setSekiller((liste) => liste.map((s) => {
      const kayma = kaymalar.get(s.id);
      if (kayma == null) return s;
      return sekilTasiSinirli(ctx, s, eksen === "x" ? kayma : 0, eksen === "y" ? kayma : 0, tuvalOlcu);
    }));
  }

  function kullaniciSablonlariniSakla(liste: KullaniciSablonu[]) {
    setKullaniciSablonlari(liste);
    try { window.localStorage.setItem(KULLANICI_SABLONLARI_ANAHTARI, JSON.stringify(liste)); }
    catch { setHata("Özel şablon tarayıcıya kaydedilemedi."); }
  }

  function kullaniciSablonuKaydet() {
    const ad = sablonAdi.trim().slice(0, SABLON_ADI_SINIRI);
    // Seçili şekiller arasındaki teller/ipler/oklar da şablona girer; şablon
    // dışındaki bir şekle tutunan uç serbest noktaya çevrilir (eklendiği
    // tuvalde o şekil yok, yol hesaplanamaz ve bağlayıcı görünmezdi).
    const ids = new Set(seciliBaglayicilarlaGenislet(seciliIds, sekiller));
    const secilenler = disUclariSerbestBirak(sekiller.filter((s) => ids.has(s.id)), sekiller);
    if (!ad || !secilenler.length) return;
    // Bağlayıcının kutusu tuval dışında (-1e6): sol/üst hesabına katılmaz.
    const kutular = secilenler.filter((s) => s.tur !== "baglayici").map(sekilGeometriKutusu);
    if (!kutular.length) return;
    const sol = Math.min(...kutular.map((k) => k.x)), ust = Math.min(...kutular.map((k) => k.y));
    const kopyalar = secilenler.map((s) => sekilTasi(s, 40 - sol, 40 - ust));
    kullaniciSablonlariniSakla([...kullaniciSablonlari, { id: sekilId(), ad, sekiller: kopyalar }]);
    setSablonAdi(""); setSablonKaydiAcik(false);
  }

  function kullaniciSablonuEkle(sablon: KullaniciSablonu) {
    // Bağlayıcı uçları da yeni kimliklere eşlenir. Eski sürümün kaydettiği
    // şablonlarda şablon içi kimlikler aynen durduğundan kopuk teller burada
    // geri bağlanır.
    const yeniler = kimlikleriYenile(sablon.sekiller);
    tarihceyeKaydet();
    setSekiller((liste) => [...liste, ...yeniler]);
    setArac("sec");
    window.setTimeout(() => secimAyarla(yeniler.map((s) => s.id)), 0);
  }

  function kesinGeometriGuncelle(alan: "x" | "y" | "w" | "h" | "donus", ham: string) {
    const deger = Number(ham);
    if (!Number.isFinite(deger) || !seciliId) return;
    const secili = sekiller.find((s) => s.id === seciliId);
    if (!secili) return;
    // Değer gerçekte değişmediyse (ör. kutuya tıklayıp aynı sayıyla çıkmak)
    // geçmişe boş bir kayıt eklenmesin.
    const kutu = sekilGeometriKutusu(secili);
    const mevcutDeger = alan === "donus" ? (secili.donus ?? 0) : kutu[alan];
    if (Math.abs(mevcutDeger - deger) < 0.01) return;
    tarihceyeKaydet();
    setSekiller((liste) => liste.map((s) => s.id === seciliId ? sekilGeometriAyarla(s, { [alan]: deger }, tuvalOlcu) : s));
  }

  function klavyeyleSekilEkle() {
    if (["sec", "silgi"].includes(arac)) return;
    if (arac === "metin") {
      if (sekillerRef.current.find((s) => s.id === seciliId)?.tur === "metin") { secimAyarla([]); setMetinPunto(METIN_PUNTO); }
      setMetinDuzenlenenId(null); setMetinNoktasi({ x: 300, y: 200 }); setMetinDeger(""); return;
    }
    const ortak = { id: sekilId(), kalinlik, cizgiTipi };
    const varsayilanKutu = { x: 250, y: 150, w: 140, h: 100 };
    const yeni: Sekil = arac === "dogru" || arac === "ok"
      ? { ...ortak, tur: "dogru", okUcu: arac === "ok" ? "son" : "yok", x1: 250, y1: 200, x2: 390, y2: 200 }
      : arac === "ucgen"
        ? { ...ortak, tur: "ucgen", tarama, x1: 320, y1: 130, x2: 250, y2: 270, x3: 390, y3: 270 }
        : arac === "cokgen"
          ? { ...ortak, tur: "cokgen", tarama, noktalar: cokgenNoktalariUret(varsayilanKutu, cokgenKenar) }
          : arac === "dalga"
            ? { ...ortak, tur: "dalga", noktalar: dalgaNoktalariUret(varsayilanKutu, dalgaSayisi) }
            : arac === "serbest"
              ? { ...ortak, tur: "serbest", noktalar: [{ x: 250, y: 220 }, { x: 285, y: 180 }, { x: 320, y: 220 }, { x: 355, y: 180 }, { x: 390, y: 220 }] }
              : { ...ortak, tur: arac as "dikdortgen" | "elips", tarama, x: 250, y: 150, w: 140, h: 100 };
    tarihceyeKaydet(); setSekiller((liste) => [...liste, yeni]); setArac("sec");
    window.setTimeout(() => secimAyarla([yeni.id]), 0);
  }

  function seciliKatmanDegistir(one: boolean) {
    if (!seciliIds.length) return;
    const secilenler = sekiller.filter((s) => seciliIds.includes(s.id));
    const kalanlar = sekiller.filter((s) => !seciliIds.includes(s.id));
    const kopya = one ? [...kalanlar, ...secilenler] : [...secilenler, ...kalanlar];
    degisiklikUygula(kopya);
  }

  /**
   * Silinen şekillere tutunan bağlayıcıları da temizler.
   *
   * OLMAZSA SESSİZ BOZULMA: kutu silinince ona bağlı ok belgede KALIYOR ama
   * çizilemiyor (`baglayiciYolu` null döner). Görünmeyen ama var olan bir
   * şekil — şablona kaydediliyor, yedeğe giriyor, "N şekil var" sayacında
   * görünüyor ve öğretmen neden duruyor anlamıyor.
   *
   * TEK KAYNAK: ÜÇ silme yolu var (seçiliyi sil, silgiye basma, silgiyle
   * sürükleme) ve üçü de buradan geçmeli. Birine eklemek yetmezdi — sürükleme
   * yolu ilk denememde gözden kaçmıştı.
   */
  function yetimBaglayicilariAt(liste: Sekil[]): Sekil[] {
    const idler = new Set(liste.map((sk) => sk.id));
    return liste.filter(
      (sk) =>
        sk.tur !== "baglayici" ||
        (("sekilId" in sk.kaynak ? idler.has(sk.kaynak.sekilId) : true) &&
          ("sekilId" in sk.hedef ? idler.has(sk.hedef.sekilId) : true)),
    );
  }

  function seciliSil() {
    // seciliIds yerine ref: global (mount'ta [] bağımlılıkla kurulan) Delete/
    // Backspace dinleyicisinden de çağrılıyor, orada state kapanışı donar kalır.
    // Kimlikler YEREL değişkene alınır: güncelleyici fonksiyon sonraki render'da
    // çalışır, o sırada secimAyarla([]) ref'i çoktan boşaltmış olur (süzgeç hiçbir
    // şeyi silmiyordu: "Seçileni sil" ve Delete/Backspace etkisizdi).
    const silinecekler = new Set(seciliIdsRef.current);
    if (!silinecekler.size) return;
    tarihceyeKaydet();
    setSekiller((mevcut) =>
      yetimBaglayicilariAt(mevcut.filter((s) => !silinecekler.has(s.id))),
    );
    secimAyarla([]);
  }

  function noktaAl(e: PointerEvent): Nokta {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    // Ölçek ve kırpma TUVAL ÖLÇÜSÜNDEN gelmeli, sabitten değil. Sabit
    // kaldığında kutu 1920 genişliğinde çiziliyor ama tıklama 960'a kırpılıyordu:
    // tuvalin sağ yarısı tıklanamaz oluyordu. Faz süiti yakaladı (640×400'lük
    // bir belgeyle çalışan gruplama senaryosu düştü).
    let x = Math.min(Math.max((e.clientX - rect.left) * (tuvalOlcu.w / rect.width), 0), tuvalOlcu.w);
    let y = Math.min(Math.max((e.clientY - rect.top) * (tuvalOlcu.h / rect.height), 0), tuvalOlcu.h);
    if (izgarayaYakala && arac !== "serbest") {
      x = Math.round(x / IZGARA_ARALIK) * IZGARA_ARALIK;
      y = Math.round(y / IZGARA_ARALIK) * IZGARA_ARALIK;
    }
    return { x, y };
  }

  /**
   * Bağlayıcı ucunun tıklanan yere göre karşılığı: akış kutusu ya da fizik
   * nesnesi (şekle tutunur), kareli alan (en yakın köşe), yoksa serbest nokta.
   * "Şekle yapışma" kapalıysa her zaman serbest nokta.
   */
  function baglayiciUcuBul(ctx: CanvasRenderingContext2D, nokta: Nokta, haric?: string): BaglayiciUcu {
    const zeminMi = (sk: Sekil) => sk.tur === "fizik" && sk.nesne === "kareliAlan";
    const liste = sekillerRef.current;
    const vurulan = [...liste]
      .reverse()
      .find((sk) => sk.id !== haric && !baglayiciAyari.serbest && (sk.tur === "akis" || sk.tur === "fizik") && !zeminMi(sk) && sekilVuruldu(ctx, sk, nokta, zoom, liste));
    if (vurulan) {
      // Hedefin bir portunun üstünde bırakıldıysa o kenara bağlan.
      const port = baglantiPortlari(vurulan).find((p) => Math.hypot(p.x - nokta.x, p.y - nokta.y) <= portYaricapi());
      return port ? { sekilId: vurulan.id, yon: port.yon } : { sekilId: vurulan.id };
    }
    const alan = [...liste].reverse().find((sk) => {
      if (!zeminMi(sk) || sk.tur !== "fizik") return false;
      const p = noktaYerel(ctx, sk, nokta);
      const pay = 10;
      return p.x >= sk.x - pay && p.x <= sk.x + sk.w + pay && p.y >= sk.y - pay && p.y <= sk.y + sk.h + pay;
    });
    if (alan) return { sekilId: alan.id, dugum: enYakinDugum(alan, noktaYerel(ctx, alan, nokta)) };
    // Boş noktaya da bağlanılır (serbest uç): kuvvet vektörünün başlangıcı/
    // bitişi çoğu zaman bir cismin üstünde değil, boşlukta.
    return { x: nokta.x, y: nokta.y };
  }

  /** Port/köşe tutamacı vuruş yarıçapı: parmakla da tutulabilsin (≥ 18 ekran px). */
  function portYaricapi() {
    return Math.max(tutamacPayi(zoom), 18 * (100 / Math.max(zoom, 1)));
  }

  /** Portları görünen şekiller: üstüne gelinen + tek seçili (dokunmatikte üstüne gelme yok). */
  function portluSekiller(): Sekil[] {
    const idler = [uzerindekiId, seciliIds.length === 1 ? seciliIds[0] : null].filter(Boolean) as string[];
    return [...new Set(idler)].map((id) => sekillerRef.current.find((s) => s.id === id)).filter((s): s is Sekil => !!s && portluMu(s));
  }

  function portBul(nokta: Nokta): (BaglantiPortu & { sekilId: string }) | null {
    for (const s of portluSekiller()) {
      const p = baglantiPortlari(s).find((q) => Math.hypot(q.x - nokta.x, q.y - nokta.y) <= portYaricapi());
      if (p) return { ...p, sekilId: s.id };
    }
    return null;
  }

  /** Tek seçili şeklin doğrudan sürüklenebilir noktaları (üçgen köşesi, çember noktası, grafik köşesi). */
  function noktaTutamaclari(): { tur: "geo" | "grafik"; i: number; egri?: number; x: number; y: number }[] {
    if (seciliIds.length !== 1) return [];
    const s = sekillerRef.current.find((x) => x.id === seciliIds[0]);
    if (!s || s.tur !== "fizik") return [];
    if (s.nesne === "grafik") return grafikNoktaTutamaclari(s).map((p) => ({ tur: "grafik" as const, i: p.nokta, egri: p.egri, x: p.x, y: p.y }));
    if (geometriNesnesiMi(s)) {
      // Düzgün çokgende köşe taşınmaz (düzgünlük bozulur): tutamaç gösterilmez.
      return geometriKoseleri(s)
        .filter((t) => geometriKoseTasi(s, t.index, t) !== null)
        .map((t) => ({ tur: "geo" as const, i: t.index, x: t.x, y: t.y }));
    }
    return [];
  }

  /** Çift tıklama: yerinde düzenleme baloncuğu ya da (karmaşık nesnede) ayrıntılı panel. */
  function ciftTiklamaIsle(ctx: CanvasRenderingContext2D, nokta: Nokta): boolean {
    const tol = Math.max(tutamacPayi(zoom) * 1.5, 12 * (100 / Math.max(zoom, 1)));
    const liste = sekillerRef.current;
    const secili = seciliIds.length === 1 ? liste.find((x) => x.id === seciliIds[0]) : undefined;
    const vurulan = [...liste].reverse().find((s) => sekilVuruldu(ctx, s, nokta, zoom, liste));
    // Seçili geometri şeklinin köşe/kenarı, kutusunun içinde olmasa da önce denenir.
    const adaylar = [secili, vurulan].filter((x): x is Sekil => !!x);
    for (const s of adaylar) {
      if (s.tur !== "fizik" || !geometriNesnesiMi(s)) continue;
      const parca = geometriEnYakinKenarVeyaKose(s, nokta, tol);
      if (parca) {
        secimAyarla([s.id]);
        balonAc({ tur: "geo", sekilId: s.id, hedef: { tur: parca.tur, index: parca.index }, ad: parca.ad }, nokta);
        return true;
      }
    }
    if (!vurulan) return false;
    if (vurulan.tur === "metin") {
      secimAyarla([vurulan.id]);
      setMetinDuzenlenenId(vurulan.id);
      setMetinNoktasi(nokta);
      setMetinDeger(vurulan.metin);
      setMetinPunto(vurulan.punto ?? METIN_PUNTO);
      setMetinSatirAraligi(vurulan.satirAraligi ?? METIN_SATIR_ARALIGI);
      return true;
    }
    if (vurulan.tur === "akis" || vurulan.tur === "baglayici" || (vurulan.tur === "fizik" && !karmasikMi(vurulan))) {
      secimAyarla([vurulan.id]);
      balonAc({ tur: "metin", sekilId: vurulan.id }, nokta);
      return true;
    }
    if (karmasikMi(vurulan)) {
      secimAyarla([vurulan.id]);
      setSagPanelAcik(true);
      return true;
    }
    return false;
  }

  function balonAc(hedef: BalonHedefi, nokta: Nokta) {
    balonOncesiRef.current = sekillerRef.current;
    setBalon({ hedef, nokta });
  }

  function balonKapat() {
    const once = balonOncesiRef.current;
    balonOncesiRef.current = null;
    // Baloncukta gerçekten bir şey değiştiyse TEK geçmiş adımı yazılır.
    if (once && once !== sekillerRef.current) tarihceyeKaydet(once);
    setBalon(null);
  }

  function isaretciAsagi(e: PointerEvent<HTMLCanvasElement>) {
    // Canvas'ın tabindex'i yok; preventDefault olmadan tarayıcı mousedown'ın
    // varsayılan davranışı olarak "odaklanabilir olmayan öğeye tıklandı" diyip
    // az önce React'in autoFocus ile odakladığı metin kutusunu HEMEN blur ediyordu
    // — bu da metin etiketi popover'ının anında (boş metinle) kapanmasına yol
    // açıyordu. preventDefault bu native odak-çalma davranışını engeller.
    e.preventDefault();
    setHata("");
    const nokta = noktaAl(e);
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = canvasRef.current?.getContext("2d");

    if (arac === "baglayici") {
      if (!ctx) return;
      // Kaynak bu basışta seçildiyse sürükleyip bırakılan yer HEDEF olur
      // (iki tıkla kurmak da çalışmaya devam eder).
      baglayiciSurukleRef.current = { nokta, yeniKaynak: !baglayiciKaynakUcuRef.current };
      // Porttan başlandıysa çıkış yönü o kenar.
      const port = portBul(nokta);
      baglayiciTikla(port ? { sekilId: port.sekilId, yon: port.yon } : baglayiciUcuBul(ctx, nokta));
      return;
    }

    if (arac === "silgi") {
      if (!ctx) return;
      const vurulan = [...sekiller].reverse().find((s) => sekilVuruldu(ctx, s, nokta, zoom, sekiller));
      if (!vurulan) return;
      tarihceyeKaydet();
      islemOncesiRef.current = sekiller;
      islemDegistiRef.current = true;
      silgiAktifRef.current = true;
      setSekiller((liste) => {
        const yeni = yetimBaglayicilariAt(liste.filter((s) => s.id !== vurulan.id));
        sekillerRef.current = yeni;
        return yeni;
      });
      secimAyarla([]);
      return;
    }

    if (arac === "sec") {
      if (!ctx) return;
      setIsaretciBasili(true);
      // Çift tıklama/dokunma: `detail` pointerdown'da her tarayıcıda dolu
      // gelmiyor (Chrome 0 veriyor, dokunmatikte hiç yok); süre + mesafeyle de tanınır.
      const simdi = Date.now();
      const onceki = sonBasisRef.current;
      sonBasisRef.current = { t: simdi, nokta };
      const cift = e.detail >= 2 || (!!onceki && simdi - onceki.t < 450 && Math.hypot(nokta.x - onceki.nokta.x, nokta.y - onceki.nokta.y) < 12 * (100 / Math.max(zoom, 1)));
      if (cift) sonBasisRef.current = null;
      if (cift && ciftTiklamaIsle(ctx, nokta)) return;
      // BAĞLANTI PORTU: şeklin kenarındaki mavi halkadan sürükleyince bağlayıcı çekilir.
      const port = portBul(nokta);
      if (port) {
        portSurukleRef.current = { kaynak: { sekilId: port.sekilId, yon: port.yon }, bas: { x: port.x, y: port.y } };
        setPortCizgisi({ bas: { x: port.x, y: port.y }, son: nokta });
        return;
      }
      // DOĞRUDAN NOKTA TUTAMAÇLARI (üçgen köşesi, çember noktası, grafik köşesi).
      const nt = noktaTutamaclari().find((t) => Math.hypot(t.x - nokta.x, t.y - nokta.y) <= portYaricapi());
      if (nt && seciliId) {
        const s0 = sekiller.find((x) => x.id === seciliId);
        if (s0 && s0.tur === "fizik") {
          islemOncesiRef.current = sekiller;
          islemDegistiRef.current = false;
          const pencere = nt.tur === "grafik" && s0.grafik ? grafikPenceresi(s0, s0.grafik) : undefined;
          const g = s0.grafik;
          noktaSurukleRef.current = {
            sekilId: s0.id, tur: nt.tur, i: nt.i, egri: nt.egri, pencere,
            eskiPencere: g ? { xMin: g.xMin, xMax: g.xMax, yMin: g.yMin, yMax: g.yMax, xAdim: g.xAdim, yAdim: g.yAdim } : undefined,
          };
          return;
        }
      }
      if (seciliIds.length > 1) {
        const secilenler = sekiller.filter((s) => seciliIds.includes(s.id));
        const sinir = birlesikSinir(ctx, secilenler);
        const tutamac = { x: sinir.x + sinir.w / 2, y: sinir.y - 26 };
        if (Math.hypot(nokta.x - tutamac.x, nokta.y - tutamac.y) <= tutamacPayi(zoom)) {
          const merkez = { x: sinir.x + sinir.w / 2, y: sinir.y + sinir.h / 2 };
          islemOncesiRef.current = sekiller;
          islemDegistiRef.current = false;
          grupDondurmeBaslangici.current = {
            orijinaller: secilenler,
            merkez,
            baslangicAci: Math.atan2(nokta.y - merkez.y, nokta.x - merkez.x) * 180 / Math.PI,
          };
          return;
        }
      }
      // Boyutlandırma, taşımadan önceliklidir: seçili şeklin tutamaçlarından biri
      // vurulduysa taşıma/seçim değiştirme değil, boyutlandırma başlar.
      const seciliSekil = seciliIds.length === 1 && seciliId ? sekiller.find((s) => s.id === seciliId) : undefined;
      const tutamaclar = seciliSekil ? sekilTutamaclari(ctx, seciliSekil) : null;
      const vurulanTutamac = tutamaclar?.find(
        (t) => Math.hypot(nokta.x - t.x, nokta.y - t.y) <= tutamacPayi(zoom),
      );
      if (seciliSekil && vurulanTutamac) {
        islemOncesiRef.current = sekiller;
        islemDegistiRef.current = false;
        boyutlandirmaBaslangici.current = {
          sekilId: seciliSekil.id,
          handleId: vurulanTutamac.id,
          orijinal: seciliSekil,
          baslangicAci: vurulanTutamac.id === "dondur"
            ? Math.atan2(nokta.y - sekilMerkezi(ctx, seciliSekil).y, nokta.x - sekilMerkezi(ctx, seciliSekil).x) * 180 / Math.PI
            : undefined,
        };
        aktifHizalamaXRef.current = null;
        aktifHizalamaYRef.current = null;
        susturulmusXRef.current.clear();
        susturulmusYRef.current.clear();
        // Sürüklenen köşe BAŞLARKEN zaten bir adayın giriş eşiği içindeyse o
        // adayın DEĞERİ susturulur — aksi halde ilk harekette anında kilitlenip
        // küçük ince ayarı imkânsız kılıyordu (döndürme tutamacı hariç).
        if (vurulanTutamac.id !== "dondur") {
          const esik = hizalamaEsigi(zoom);
          const { xAdaylar, yAdaylar } = boyutlandirmaAdaylari(ctx, sekillerRef.current, seciliSekil, vurulanTutamac.id);
          for (const aday of xAdaylar) if (Math.abs(vurulanTutamac.x - aday.deger) <= esik) susturulmusXRef.current.add(aday.deger);
          for (const aday of yAdaylar) if (Math.abs(vurulanTutamac.y - aday.deger) <= esik) susturulmusYRef.current.add(aday.deger);
        }
        return;
      }
      const vurulan = [...sekiller].reverse().find((s) => sekilVuruldu(ctx, s, nokta, zoom, sekiller));
      if (vurulan) {
        const vurulanIds = vurulan.grupId
          ? sekiller.filter((s) => s.grupId === vurulan.grupId).map((s) => s.id)
          : [vurulan.id];
        let yeniSecim: string[];
        if (e.shiftKey) {
          const hepsiSecili = vurulanIds.every((id) => seciliIds.includes(id));
          yeniSecim = hepsiSecili
            ? seciliIds.filter((id) => !vurulanIds.includes(id))
            : [...seciliIds, ...vurulanIds];
        } else {
          yeniSecim = vurulanIds.every((id) => seciliIds.includes(id)) ? seciliIds : vurulanIds;
        }
        secimAyarla(yeniSecim);
        islemOncesiRef.current = sekiller;
        islemDegistiRef.current = false;
        const seciliTasinan = sekiller.filter((s) => yeniSecim.includes(s.id));
        // Cisme tek ucundan tutunan kuvvet vektörünün SERBEST ucu da cisimle
        // gelir; yoksa cisim taşınınca vektörün yönü/boyu bozulurdu.
        const tasinacaklar = [...seciliTasinan, ...birlikteTasinanBaglayicilar(sekiller, yeniSecim)];
        surukleBaslangici.current = { nokta, sekiller: tasinacaklar };
        aktifHizalamaXRef.current = null;
        aktifHizalamaYRef.current = null;
        susturulmusXRef.current.clear();
        susturulmusYRef.current.clear();
        // Taşıma BAŞLARKEN şeklin üç kenar değerinden (sol/orta/sağ, üst/orta/
        // alt) biri zaten bir adayın giriş eşiği içindeyse o adayın DEĞERİ
        // susturulur — aksi halde önceden hizalanmış bir şekli azıcık kaydırmak
        // bile anında kilitleniyordu.
        if (tasinacaklar.length > 0) {
          const esik = hizalamaEsigi(zoom);
          const { sol, ust, sag, alt } = tasimaKenarDegerleri(ctx, tasinacaklar);
          const { x: xAdaylar, y: yAdaylar } = digerSekillerKenarAdaylari(ctx, sekillerRef.current, new Set(tasinacaklar.map((s) => s.id)));
          const kenarX = [sol, (sol + sag) / 2, sag];
          const kenarY = [ust, (ust + alt) / 2, alt];
          for (const kd of kenarX) for (const aday of xAdaylar) if (Math.abs(kd - aday.deger) <= esik) susturulmusXRef.current.add(aday.deger);
          for (const kd of kenarY) for (const aday of yAdaylar) if (Math.abs(kd - aday.deger) <= esik) susturulmusYRef.current.add(aday.deger);
        }
      } else {
        secimKutusuBaslangiciRef.current = nokta;
        secimKutusuOncekiRef.current = e.shiftKey ? seciliIds : [];
        if (!e.shiftKey) secimAyarla([]);
        secimKutusuRef.current = { x: nokta.x, y: nokta.y, w: 0, h: 0 };
        setSecimKutusu(secimKutusuRef.current);
      }
      return;
    }

    if (arac === "metin") {
      setMetinDuzenlenenId(null);
      // Punto alanı SEÇİLİ etiketin puntosunu yansıtıyorsa (önceki 64 pt etiket gibi)
      // yeni etiket onu miras almasın: varsayılanla başlar. Öğretmen alanı elle
      // ayarlamışsa (seçili etiket yok) o değer korunur.
      if (sekillerRef.current.find((s) => s.id === seciliId)?.tur === "metin") { secimAyarla([]); setMetinPunto(METIN_PUNTO); }
      setMetinNoktasi(nokta);
      setMetinDeger("");
      return;
    }

    cizimBaslangici.current = nokta;
    const yeniTaslak: CizilenTaslak =
      arac === "serbest"
        ? { id: "taslak", tur: "serbest", kalinlik, cizgiTipi, noktalar: [nokta] }
        : arac === "dogru" || arac === "ok"
          ? { id: "taslak", tur: "dogru", kalinlik, cizgiTipi, okUcu: arac === "ok" ? "son" : "yok", x1: nokta.x, y1: nokta.y, x2: nokta.x, y2: nokta.y }
          : arac === "ucgen"
            ? {
                id: "taslak",
                tur: "ucgen",
                kalinlik,
                cizgiTipi,
                tarama,
                ...ucgenNoktalari({ x: nokta.x, y: nokta.y, w: 0, h: 0 }),
              }
            : arac === "cokgen"
              ? {
                  id: "taslak",
                  tur: "cokgen",
                  kalinlik,
                  cizgiTipi,
                  tarama,
                  noktalar: cokgenNoktalariUret({ x: nokta.x, y: nokta.y, w: 0, h: 0 }, cokgenKenar),
                }
              : arac === "dalga"
                ? {
                    id: "taslak",
                    tur: "dalga",
                    kalinlik,
                    cizgiTipi,
                    noktalar: dalgaNoktalariUret({ x: nokta.x, y: nokta.y, w: 0, h: 0 }, dalgaSayisi),
                  }
                : { id: "taslak", tur: arac, kalinlik, cizgiTipi, tarama, x: nokta.x, y: nokta.y, w: 0, h: 0 };
    taslakRef.current = yeniTaslak;
    setTaslak(yeniTaslak);
  }

  /** Fareyle üstüne gelinen portlu şekil (kutusunun port payı kadar dışı dahil). */
  function uzerindekiniGuncelle(nokta: Nokta, haric?: string) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pay = portYaricapi();
    const bulunan = [...sekillerRef.current].reverse().find((s) => {
      if (s.id === haric || !portluMu(s)) return false;
      const k = sekilSinirlari(ctx, s);
      return nokta.x >= k.x - pay && nokta.x <= k.x + k.w + pay && nokta.y >= k.y - pay && nokta.y <= k.y + k.h + pay;
    });
    const id = bulunan?.id ?? null;
    if (id !== uzerindekiId) setUzerindekiId(id);
  }

  function isaretciHareket(e: PointerEvent<HTMLCanvasElement>) {
    const nokta = noktaAl(e);

    // Porttan bağlayıcı çekiliyor: önizleme çizgisi + bırakılacak hedefin portları.
    if (portSurukleRef.current) {
      setPortCizgisi({ bas: portSurukleRef.current.bas, son: nokta });
      uzerindekiniGuncelle(nokta, "sekilId" in portSurukleRef.current.kaynak ? portSurukleRef.current.kaynak.sekilId : undefined);
      return;
    }
    // Köşe / nokta tutamacı sürükleniyor.
    if (noktaSurukleRef.current) {
      const ns = noktaSurukleRef.current;
      const s0 = sekillerRef.current.find((x) => x.id === ns.sekilId);
      if (!s0 || s0.tur !== "fizik") return;
      let yeni: Sekil = s0;
      if (ns.tur === "geo") {
        // Köşe kutu dışına çıkarsa kutu da büyür (seçim çerçevesi köşeyi kapsasın).
        const tasinan = geometriKoseTasiSekil(s0, ns.i, nokta);
        if (tasinan) yeni = tasinan;
      } else if (ns.tur === "grafik" && ns.pencere && ns.egri !== undefined) {
        const p = ns.pencere;
        // Pencere sürükleme boyunca dondurulur: yoksa nokta değiştikçe eksenler
        // yeniden ölçeklenir ve köşe imlecin altından kaçar.
        const sabit = { ...s0, grafik: s0.grafik ? { ...s0.grafik, xMin: p.xMin, xMax: p.xMax, yMin: p.yMin, yMax: p.yMax, xAdim: p.xAdim, yAdim: p.yAdim } : s0.grafik };
        const g = grafikNoktaTasi(sabit, ns.egri, ns.i, nokta, p);
        if (g) yeni = { ...sabit, grafik: g };
      }
      if (yeni === s0) return;
      if (!islemDegistiRef.current) {
        tarihceyeKaydet(islemOncesiRef.current ?? sekillerRef.current);
        islemDegistiRef.current = true;
      }
      setSekiller((liste) => liste.map((x) => (x.id === ns.sekilId ? yeni : x)));
      return;
    }
    if ((arac === "sec" || arac === "baglayici") && !surukleBaslangici.current && !boyutlandirmaBaslangici.current
      && !grupDondurmeBaslangici.current && !secimKutusuBaslangiciRef.current) {
      uzerindekiniGuncelle(nokta);
    }

    if (arac === "sec" && !surukleBaslangici.current && !boyutlandirmaBaslangici.current
      && !grupDondurmeBaslangici.current && !secimKutusuBaslangiciRef.current) {
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        const portta = !!portBul(nokta);
        const noktaTutamacinda = !portta && noktaTutamaclari().some((t) => Math.hypot(t.x - nokta.x, t.y - nokta.y) <= portYaricapi());
        const etkilesim = etkilesimBelirle(ctx, sekiller, seciliIds, nokta, zoom, { portta, noktaTutamacinda });
        const imlec = imlecSinifi(etkilesim.tur);
        const ipucu = etkilesimIpucu(etkilesim.tur);
        setImlecIpucu((onceki) => (onceki === ipucu ? onceki : ipucu));
        e.currentTarget.style.cursor = imlec;
      }
    }

    if (arac === "silgi" && silgiAktifRef.current) {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const vurulan = [...sekillerRef.current].reverse().find((s) => sekilVuruldu(ctx, s, nokta, zoom, sekillerRef.current));
      if (vurulan) setSekiller((liste) => {
        const yeni = yetimBaglayicilariAt(liste.filter((s) => s.id !== vurulan.id));
        sekillerRef.current = yeni;
        return yeni;
      });
      return;
    }

    if (arac === "sec" && grupDondurmeBaslangici.current) {
      const { orijinaller, merkez, baslangicAci } = grupDondurmeBaslangici.current;
      const aci = Math.atan2(nokta.y - merkez.y, nokta.x - merkez.x) * 180 / Math.PI;
      let fark = aci - baslangicAci;
      if (e.shiftKey) fark = Math.round(fark / 15) * 15;
      if (!islemDegistiRef.current) {
        tarihceyeKaydet(islemOncesiRef.current ?? sekillerRef.current);
        islemDegistiRef.current = true;
      }
      const orijinalMap = new Map(orijinaller.map((s) => [s.id, s] as const));
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      setSekiller((liste) => liste.map((s) => {
        const orijinal = orijinalMap.get(s.id);
        if (!orijinal) return s;
        const eskiMerkez = sekilMerkezi(ctx, orijinal);
        const yeniMerkez = noktaDondur(eskiMerkez, merkez, fark);
        const tasinan = sekilTasi(orijinal, yeniMerkez.x - eskiMerkez.x, yeniMerkez.y - eskiMerkez.y);
        return { ...tasinan, donus: (orijinal.donus ?? 0) + fark } as Sekil;
      }));
      return;
    }

    if (arac === "sec" && boyutlandirmaBaslangici.current) {
      const { sekilId, handleId, orijinal, baslangicAci } = boyutlandirmaBaslangici.current;
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      let guncellenmis: Sekil;
      if (handleId === "dondur") {
        const merkez = sekilMerkezi(ctx, orijinal);
        const aci = Math.atan2(nokta.y - merkez.y, nokta.x - merkez.x) * 180 / Math.PI;
        let donus = (orijinal.donus ?? 0) + aci - (baslangicAci ?? aci);
        if (e.shiftKey) donus = Math.round(donus / 15) * 15;
        guncellenmis = { ...orijinal, donus } as Sekil;
        setHizalamaCizgileri({ dikey: [], yatay: [] });
        aktifHizalamaXRef.current = null;
        aktifHizalamaYRef.current = null;
      } else {
        // Hizalama adayları: diğer TÜM şekillerin kenar/merkezleri + (nokta
        // tutamacıysa) aynı şeklin BAŞKA köşeleri — köşe bazlı serbest
        // şekillerde (çokgen, dalga, serbest dikdörtgen) kendi içinde de
        // hizalanabilsin diye. Adaylar hep GLOBAL (dönüşsüz) uzayda toplanır;
        // döndürülmüş şekillerde kendi köşeleri de mevcut açıyla döndürülerek
        // global konuma taşınır.
        const esik = hizalamaEsigi(zoom);
        const { xAdaylar, yAdaylar } = boyutlandirmaAdaylari(ctx, sekillerRef.current, orijinal, handleId);
        // Sürükleme BAŞINDA (isaretciAsagi) susturulmuş değerler, ham nokta o
        // değerden çıkış eşiğinden uzaklaşana kadar eşleştirmede atlanır.
        const cikisEsigi = esik * HIZALAMA_CIKIS_ORANI;
        susturulmusTemizle(susturulmusXRef.current, [nokta.x], cikisEsigi);
        susturulmusTemizle(susturulmusYRef.current, [nokta.y], cikisEsigi);
        const xAdaylarEtkin = xAdaylar.filter((a) => !susturulmusXRef.current.has(a.deger));
        const yAdaylarEtkin = yAdaylar.filter((a) => !susturulmusYRef.current.has(a.deger));
        // hizalamaKilitliEslestir tek-değerli (HizalamaAday | null) çalışır;
        // paylaşılan kilit ref'i burada .aday ile açılıp kenarIndex 0 ile
        // (nokta yolunda anlamsız) geri sarılır.
        const xEslesen = hizalamaKilitliEslestir(nokta.x, xAdaylarEtkin, aktifHizalamaXRef.current?.aday ?? null, esik);
        const yEslesen = hizalamaKilitliEslestir(nokta.y, yAdaylarEtkin, aktifHizalamaYRef.current?.aday ?? null, esik);
        aktifHizalamaXRef.current = xEslesen ? { aday: xEslesen, kenarIndex: 0 } : null;
        aktifHizalamaYRef.current = yEslesen ? { aday: yEslesen, kenarIndex: 0 } : null;
        const hizaliNokta = { x: xEslesen?.deger ?? nokta.x, y: yEslesen?.deger ?? nokta.y };
        setHizalamaCizgileri({
          dikey: xEslesen ? [dikeyCizgiUret(xEslesen.deger, nokta.y, nokta.y, xEslesen.kutu)] : [],
          yatay: yEslesen ? [yatayCizgiUret(yEslesen.deger, nokta.x, nokta.x, yEslesen.kutu)] : [],
        });
        guncellenmis = sekilBoyutlandir(orijinal, handleId, noktaYerel(ctx, orijinal, hizaliNokta));
      }
      if (!islemDegistiRef.current) {
        tarihceyeKaydet(islemOncesiRef.current ?? sekillerRef.current);
        islemDegistiRef.current = true;
      }
      setSekiller((mevcut) => mevcut.map((s) => (s.id === sekilId ? guncellenmis : s)));
      return;
    }

    if (arac === "sec" && surukleBaslangici.current) {
      const dx = nokta.x - surukleBaslangici.current.nokta.x;
      const dy = nokta.y - surukleBaslangici.current.nokta.y;
      const orijinaller = surukleBaslangici.current.sekiller;
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      if (!islemDegistiRef.current && (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5)) {
        tarihceyeKaydet(islemOncesiRef.current ?? sekillerRef.current);
        islemDegistiRef.current = true;
      }
      const { sol, ust, sag, alt } = tasimaKenarDegerleri(ctx, orijinaller);
      const gercekDx = Math.max(-sol, Math.min(tuvalOlcu.w - sag, dx));
      const gercekDy = Math.max(-ust, Math.min(tuvalOlcu.h - alt, dy));

      // Taşınan şeklin sol/orta/sağ kenarı diğer şekillerden birininkiyle
      // hizalanıyorsa o kenara tam oturt ve kılavuz çizgiyi göster.
      const esik = hizalamaEsigi(zoom);
      const haric = new Set(orijinaller.map((s) => s.id));
      const { x: xAdaylar, y: yAdaylar } = digerSekillerKenarAdaylari(ctx, sekillerRef.current, haric);
      const kenarX = [sol + gercekDx, (sol + sag) / 2 + gercekDx, sag + gercekDx];
      const kenarY = [ust + gercekDy, (ust + alt) / 2 + gercekDy, alt + gercekDy];
      // Sürükleme BAŞINDA (isaretciAsagi) susturulmuş değerler, ham kenar o
      // değerden çıkış eşiğinden uzaklaşana kadar eşleştirmede atlanır.
      const cikisEsigi = esik * HIZALAMA_CIKIS_ORANI;
      susturulmusTemizle(susturulmusXRef.current, kenarX, cikisEsigi);
      susturulmusTemizle(susturulmusYRef.current, kenarY, cikisEsigi);
      const xAdaylarEtkin = xAdaylar.filter((a) => !susturulmusXRef.current.has(a.deger));
      const yAdaylarEtkin = yAdaylar.filter((a) => !susturulmusYRef.current.has(a.deger));
      const xEslesme = hizalamaKilitliEslestirKenar(kenarX, xAdaylarEtkin, aktifHizalamaXRef.current, esik);
      const yEslesme = hizalamaKilitliEslestirKenar(kenarY, yAdaylarEtkin, aktifHizalamaYRef.current, esik);
      aktifHizalamaXRef.current = xEslesme ? { aday: xEslesme.hedef, kenarIndex: xEslesme.kenarIndex } : null;
      aktifHizalamaYRef.current = yEslesme ? { aday: yEslesme.hedef, kenarIndex: yEslesme.kenarIndex } : null;
      const dxDuzelt = xEslesme ? xEslesme.hedef.deger - xEslesme.kenarDegeri : 0;
      const dyDuzelt = yEslesme ? yEslesme.hedef.deger - yEslesme.kenarDegeri : 0;
      // sonDx/sonDy (düzeltme dahil GERÇEK son konum) kılavuz hesabından ÖNCE
      // alınır — aksi halde çift eksen aynı anda kilitliyken çizgi ucu şeklin
      // gerçek kenarından eşik kadar kısa/taşkın kalıyordu.
      const sonDx = gercekDx + dxDuzelt;
      const sonDy = gercekDy + dyDuzelt;
      setHizalamaCizgileri({
        dikey: xEslesme ? [dikeyCizgiUret(xEslesme.hedef.deger, ust + sonDy, alt + sonDy, xEslesme.hedef.kutu)] : [],
        yatay: yEslesme ? [yatayCizgiUret(yEslesme.hedef.deger, sol + sonDx, sag + sonDx, yEslesme.hedef.kutu)] : [],
      });

      const orijinalMap = new Map(orijinaller.map((s) => [s.id, s] as const));
      setSekiller((mevcut) => mevcut.map((s) => {
        const orijinal = orijinalMap.get(s.id);
        return orijinal ? sekilTasi(orijinal, sonDx, sonDy) : s;
      }));
      return;
    }

    if (arac === "sec" && secimKutusuBaslangiciRef.current) {
      const bas = secimKutusuBaslangiciRef.current;
      secimKutusuRef.current = kutuNormalle(bas.x, bas.y, nokta.x - bas.x, nokta.y - bas.y);
      setSecimKutusu(secimKutusuRef.current);
      return;
    }

    const guncelTaslak = taslakRef.current;
    const basl = cizimBaslangici.current;
    if (!basl || !guncelTaslak) return;
    const yeniTaslak: CizilenTaslak =
      guncelTaslak.tur === "serbest"
        ? (() => {
            const son = guncelTaslak.noktalar[guncelTaslak.noktalar.length - 1];
            if (son && Math.hypot(nokta.x - son.x, nokta.y - son.y) < 1.8) return guncelTaslak;
            return { ...guncelTaslak, noktalar: [...guncelTaslak.noktalar, nokta] };
          })()
        : guncelTaslak.tur === "dogru"
          ? (() => {
              if (!e.shiftKey) return { ...guncelTaslak, x2: nokta.x, y2: nokta.y };
              const dx = nokta.x - basl.x;
              const dy = nokta.y - basl.y;
              const uzunluk = Math.hypot(dx, dy);
              const aci = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
              return { ...guncelTaslak, x2: basl.x + Math.cos(aci) * uzunluk, y2: basl.y + Math.sin(aci) * uzunluk };
            })()
          : guncelTaslak.tur === "ucgen"
            ? {
                ...guncelTaslak,
                ...ucgenNoktalari({
                  x: basl.x,
                  y: basl.y,
                  w: nokta.x - basl.x,
                  h: nokta.y - basl.y,
                }),
              }
            : guncelTaslak.tur === "cokgen"
              ? (() => {
                  let w = nokta.x - basl.x;
                  let h = nokta.y - basl.y;
                  if (e.shiftKey) {
                    const boyut = Math.max(Math.abs(w), Math.abs(h));
                    w = (w < 0 ? -1 : 1) * boyut;
                    h = (h < 0 ? -1 : 1) * boyut;
                  }
                  return { ...guncelTaslak, noktalar: cokgenNoktalariUret(kutuNormalle(basl.x, basl.y, w, h), cokgenKenar) };
                })()
              : guncelTaslak.tur === "dalga"
                ? {
                    ...guncelTaslak,
                    noktalar: dalgaNoktalariUret(
                      kutuNormalle(basl.x, basl.y, nokta.x - basl.x, nokta.y - basl.y),
                      dalgaSayisi,
                    ),
                  }
                : (() => {
                    // Shift basılıyken kare/daire elde edilsin diye genişlik ve
                    // yükseklik aynı büyüklüğe (işaretleri korunarak) zorlanır.
                    let w = nokta.x - basl.x;
                    let h = nokta.y - basl.y;
                    if (e.shiftKey) {
                      const boyut = Math.max(Math.abs(w), Math.abs(h));
                      w = (w < 0 ? -1 : 1) * boyut;
                      h = (h < 0 ? -1 : 1) * boyut;
                    }
                    return { ...guncelTaslak, x: basl.x, y: basl.y, w, h };
                  })();
    taslakRef.current = yeniTaslak;
    setTaslak(yeniTaslak);
  }

  function isaretciYukari(e?: PointerEvent<HTMLCanvasElement>) {
    setIsaretciBasili(false);
    // Porttan çekilen bağlayıcı bırakıldı.
    if (portSurukleRef.current) {
      const ps = portSurukleRef.current;
      portSurukleRef.current = null;
      const cizgi = portCizgisi;
      setPortCizgisi(null);
      const ctx = canvasRef.current?.getContext("2d");
      const son = e ? noktaAl(e) : cizgi?.son;
      if (!ctx || !son) return;
      if (Math.hypot(son.x - ps.bas.x, son.y - ps.bas.y) < 12 * (100 / Math.max(zoom, 1))) return;
      const kaynakId = "sekilId" in ps.kaynak ? ps.kaynak.sekilId : undefined;
      const hedef = baglayiciUcuBul(ctx, son, kaynakId);
      baglayiciOlustur(ps.kaynak, hedef);
      return;
    }
    if (noktaSurukleRef.current) {
      const ns = noktaSurukleRef.current;
      noktaSurukleRef.current = null;
      // Grafik: dondurulan pencere eski hâline (çoğu zaman otomatik) döner.
      if (ns.tur === "grafik" && ns.eskiPencere && islemDegistiRef.current) {
        const eski = ns.eskiPencere;
        setSekiller((liste) => liste.map((x) => {
          if (x.id !== ns.sekilId || x.tur !== "fizik" || !x.grafik) return x;
          const g = { ...x.grafik } as Record<string, unknown>;
          for (const k of ["xMin", "xMax", "yMin", "yMax", "xAdim", "yAdim"] as const) {
            if (eski[k] === undefined) delete g[k]; else g[k] = eski[k];
          }
          return { ...x, grafik: g as unknown as GrafikVerisi };
        }));
      }
      islemOncesiRef.current = null;
      islemDegistiRef.current = false;
      return;
    }
    if (arac === "baglayici") {
      // Sürükle-bırak: kaynak bu basışta seçildiyse bırakılan yer hedeftir.
      const bs = baglayiciSurukleRef.current;
      baglayiciSurukleRef.current = null;
      const ctx = canvasRef.current?.getContext("2d");
      if (bs?.yeniKaynak && e && ctx && baglayiciKaynakUcuRef.current) {
        const son = noktaAl(e);
        if (Math.hypot(son.x - bs.nokta.x, son.y - bs.nokta.y) >= 12 * (100 / Math.max(zoom, 1))) {
          const kaynak = baglayiciKaynakUcuRef.current;
          const haric = "sekilId" in kaynak ? kaynak.sekilId : undefined;
          baglayiciOlustur(kaynak, baglayiciUcuBul(ctx, son, haric));
        }
      }
      return;
    }
    if (arac === "silgi") {
      silgiAktifRef.current = false;
      islemOncesiRef.current = null;
      islemDegistiRef.current = false;
      return;
    }
    if (arac === "sec") {
      const kutu = secimKutusuRef.current;
      if (secimKutusuBaslangiciRef.current && kutu) {
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx && (kutu.w >= 3 || kutu.h >= 3)) {
          const vurulanlar = sekiller.filter((s) => {
            const b = sekilSinirlari(ctx, s);
            return b.x <= kutu.x + kutu.w && b.x + b.w >= kutu.x
              && b.y <= kutu.y + kutu.h && b.y + b.h >= kutu.y;
          });
          const grupIds = new Set(vurulanlar.map((s) => s.grupId).filter(Boolean));
          const genisletilmis = sekiller.filter((s) => vurulanlar.some((v) => v.id === s.id) || (s.grupId && grupIds.has(s.grupId)));
          secimAyarla([...secimKutusuOncekiRef.current, ...genisletilmis.map((s) => s.id)]);
        }
      }
      secimKutusuBaslangiciRef.current = null;
      secimKutusuOncekiRef.current = [];
      secimKutusuRef.current = null;
      setSecimKutusu(null);
      setHizalamaCizgileri({ dikey: [], yatay: [] });
      aktifHizalamaXRef.current = null;
      aktifHizalamaYRef.current = null;
      // Susturulmuş adaylar her pointer-up'ta temizlenir (bir sonraki
      // sürükleme kendi susturma kümesini isaretciAsagi'da yeniden kurar).
      susturulmusXRef.current.clear();
      susturulmusYRef.current.clear();
      surukleBaslangici.current = null;
      boyutlandirmaBaslangici.current = null;
      grupDondurmeBaslangici.current = null;
      islemOncesiRef.current = null;
      islemDegistiRef.current = false;
      return;
    }
    const guncelTaslak = taslakRef.current;
    if (!guncelTaslak) return;
    cizimBaslangici.current = null;
    taslakRef.current = null;

    // Beş şekil türü için AYNI kuyruk vardı; değişen tek şey "yeterince büyük
    // mü" kuralıydı ve o kural dallara dağıldığı için birim testle
    // yoklanamıyordu. Kural artık `taslagiKesinlestir` içinde (saf, testli);
    // burada yalnız yan etkiler kaldı.
    const hazir = taslagiKesinlestir(guncelTaslak);
    if (!hazir) {
      setTaslak(null);
      return;
    }
    tarihceyeKaydet();
    const yeni: Sekil = { ...hazir, id: sekilId() };
    setSekiller((mevcut) => [...mevcut, yeni]);
    // setTimeout: secimAyarla, henüz bu render'a girmemiş `sekillerRef.current`
    // üzerinden filtreleme yapıyor — senkron çağrılırsa yeni eklenen şekil o
    // ref'te bulunamayıp seçim sessizce boşa düşüyordu (bkz. çoğalt/şablon
    // fonksiyonlarındaki aynı setTimeout deseni).
    window.setTimeout(() => secimAyarla([yeni.id]), 0);
    setTaslak(null);
    // Çizim bitince Seç'e dönülür: öğretmen yeni şekli hemen taşıyabilsin,
    // "Seç"e tıklamak zorunda kalmasın.
    setArac("sec");
  }

  function isaretciIptal() {
    setIsaretciBasili(false);
    portSurukleRef.current = null;
    noktaSurukleRef.current = null;
    baglayiciSurukleRef.current = null;
    setPortCizgisi(null);
    if (islemDegistiRef.current && islemOncesiRef.current) {
      setSekiller(islemOncesiRef.current);
      // Sürükleme/boyutlandırma başında tarihceyeKaydet ile açılan geçmiş
      // kaydı, işlem iptal edildiğinde (ör. Escape) burada geri alınır.
      gecmisRef.current = gecmisRef.current.slice(0, -1);
      setGecmisSayisi(gecmisRef.current.length);
    }
    surukleBaslangici.current = null;
    boyutlandirmaBaslangici.current = null;
    grupDondurmeBaslangici.current = null;
    silgiAktifRef.current = false;
    secimKutusuBaslangiciRef.current = null;
    secimKutusuOncekiRef.current = [];
    secimKutusuRef.current = null;
    setSecimKutusu(null);
    setHizalamaCizgileri({ dikey: [], yatay: [] });
    aktifHizalamaXRef.current = null;
    aktifHizalamaYRef.current = null;
    // Susturulmuş adaylar her pointer-cancel'da da temizlenir (madde 1).
    susturulmusXRef.current.clear();
    susturulmusYRef.current.clear();
    islemOncesiRef.current = null;
    islemDegistiRef.current = false;
    cizimBaslangici.current = null;
    taslakRef.current = null;
    setTaslak(null);
  }

  yukariRef.current = isaretciYukari;
  iptalRef.current = isaretciIptal;

  /**
   * Tuval ölçüsünü değiştirir.
   *
   * KÜÇÜLTME, DIŞARIDA ŞEKİL KALIYORSA REDDEDİLİR. Sessizce kırpmak veya
   * şekilleri içeri itmek iki farklı sessiz veri kaybı olurdu: birincisinde
   * şekil belgede kalıp görünmez oluyor, ikincisinde öğretmenin kurduğu
   * yerleşim habersiz bozuluyor. Sayıyı söyleyip kararı ona bırakmak doğru olan.
   */
  function tuvalOlcusunuDegistir(yeni: TuvalOlcusu) {
    if (yeni.w > EN_BUYUK_TUVAL.w || yeni.h > EN_BUYUK_TUVAL.h) return;
    // Aynı ölçüye tıklamak geçmişe boş bir adım yazmasın.
    if (yeni.w === tuvalOlcu.w && yeni.h === tuvalOlcu.h) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && (yeni.w < tuvalOlcu.w || yeni.h < tuvalOlcu.h)) {
      const disarida = sekiller.filter((sk) => {
        if (sk.tur === "baglayici") return false;
        const sinir = sekilSinirlari(ctx, sk);
        return sinir.x + sinir.w > yeni.w || sinir.y + sinir.h > yeni.h;
      });
      if (disarida.length > 0) {
        setHata(
          `${disarida.length} şekil yeni tuvalin dışında kalıyor. Önce onları içeri taşıyın.`,
        );
        return;
      }
    }
    setHata("");
    // Geçmiş kaydı artık ölçüyü de taşıyor: Ctrl+Z eski ölçüye döner.
    tarihceyeKaydet();
    setTuvalOlcu(yeni);
  }

  /**
   * Bağlayıcıyı kurar. Araç Seç'e DÖNMEZ: öğretmen Esc'e basana ya da başka
   * araç seçene kadar ardı ardına tel/ok çekebilsin (sürekli bağlayıcı kipi).
   */
  function baglayiciOlustur(kaynak: BaglayiciUcu, hedef: BaglayiciUcu) {
    const ayniSekil = "sekilId" in kaynak && "sekilId" in hedef && kaynak.sekilId === hedef.sekilId && !("dugum" in hedef && hedef.dugum);
    if (ayniSekil) { setBaglayiciKaynakUcu(null); return; }
    tarihceyeKaydet();
    // Öğretmen tür seçmediyse uçlara bakarak akıllı varsayılan: iki devre
    // elemanı arası devre teli, akış kutusu varsa dik açılı ok, yoksa düz ok.
    let ayar = baglayiciAyari;
    if (!baglayiciTuruSecildiRef.current) {
      const uc = (u: BaglayiciUcu) => ("sekilId" in u ? sekillerRef.current.find((x) => x.id === u.sekilId) : undefined);
      const a = uc(kaynak), b = uc(hedef);
      const elektrik = (x?: Sekil) => x?.tur === "fizik" && FIZIK_TANIMLARI[x.nesne]?.grup === "elektrik";
      ayar = elektrik(a) && elektrik(b) ? { stil: "dik", okUcu: "yok" }
        : a?.tur === "akis" || b?.tur === "akis" ? { stil: "dik", okUcu: "son" }
        : { stil: "duz", okUcu: "son" };
    }
    const yeni: Sekil = {
      id: sekilId(),
      tur: "baglayici",
      kalinlik,
      kaynak,
      hedef,
      okUcu: ayar.okUcu,
      // "dik" varsayılan olduğu için eski belge biçimi korunur: alan yazılmaz.
      ...(ayar.stil !== "dik" ? { stil: ayar.stil } : {}),
    };
    setSekiller((mevcut) => [...mevcut, yeni]);
    setBaglayiciKaynakUcu(null);
  }

  /** Bağlayıcı akışında bir şekle (ya da boş noktaya) tıklandı. */
  function baglayiciTikla(uc: BaglayiciUcu) {
    const baglayiciKaynakUcu = baglayiciKaynakUcuRef.current;
    if (!baglayiciKaynakUcu) {
      setBaglayiciKaynakUcu(uc);
      return;
    }
    const dugumAyni = (a: BaglayiciUcu, b: BaglayiciUcu) =>
      "dugum" in a && "dugum" in b && !!a.dugum && !!b.dugum && a.dugum.c === b.dugum.c && a.dugum.r === b.dugum.r;
    const ayniSekil =
      "sekilId" in uc && "sekilId" in baglayiciKaynakUcu && uc.sekilId === baglayiciKaynakUcu.sekilId &&
      // Kareli alanda aynı alanın İKİ FARKLI köşesi geçerli bir vektördür.
      (!("dugum" in uc && uc.dugum) || dugumAyni(uc, baglayiciKaynakUcu));
    const ayniNokta =
      !("sekilId" in uc) && !("sekilId" in baglayiciKaynakUcu) &&
      Math.hypot(uc.x - baglayiciKaynakUcu.x, uc.y - baglayiciKaynakUcu.y) < ASGARI_CIZIM_PX;
    if (ayniSekil || ayniNokta) {
      // Aynı yere ikinci tık = vazgeç. Kendine bağlanan ya da boyu sıfır ok anlamsız.
      setBaglayiciKaynakUcu(null);
      return;
    }
    baglayiciOlustur(baglayiciKaynakUcu, uc);
  }

  /**
   * Fizik nesnesi tıklanarak eklenir (akış kutusuyla aynı gerekçe: sürükleyip
   * boyut vermek yerine doğru varsayılan ölçüyle gelir, sonra tutamaçla
   * ayarlanır). Her yeni nesne tuvalin ortasından küçük kaymalarla gelir ki
   * üst üste binip birbirini gizlemesin.
   */
  function fizikNesnesiEkle(nesne: FizikNesnesi, ek?: { grafik?: GrafikVerisi; istatistik?: IstatistikVerisi; sema?: SemaVerisi; kimya?: KimyaVerisi; geo?: GeometriVerisi }) {
    const t0 = FIZIK_TANIMLARI[nesne];
    // Kimya ve şema kutusu içeriğe göre ölçülür (birim çember, 3 aşamalı ağaç sıkışmasın).
    const t = nesne === "kimya" ? { ...t0, ...kimyaBoyutu(ek?.kimya ?? varsayilanKimya()) }
      : nesne === "sema" ? { ...t0, ...semaBoyutu(ek?.sema ?? varsayilanSema()) } : t0;
    const ctx = canvasRef.current?.getContext("2d");
    const kutular: Kutu[] = ctx
      ? sekiller
          .filter((x) => x.tur !== "baglayici" && !(x.tur === "fizik" && x.nesne === "kareliAlan"))
          .map((x) => {
            const k = sekilTamKutusu(ctx, x);
            // Etiket/ip payı: yeni şekil etiketin üstüne de binmesin.
            return x.tur === "fizik" ? { x: k.x - 8, y: k.y - 24, w: k.w + 16, h: k.h + 48 } : k;
          })
      : [];
    // Grafik: eksen sayıları/okları kutunun dışına taşar; boş yer bu pay dâhil aranır.
    const grafikPayi = fizikDisPayi(nesne);
    let konum = bosYerBul(kutular, t.w + grafikPayi.sol + grafikPayi.sag, t.h + grafikPayi.ust + grafikPayi.alt, tuvalOlcu);
    konum = { x: konum.x + grafikPayi.sol, y: konum.y + grafikPayi.ust };
    // Vektör: seçili şeklin sağ kenarından DIŞARI doğru başlar (kuvvet o cisme uygulanmış görünür).
    const secili0 = seciliIds.length === 1 ? sekiller.find((x) => x.id === seciliIds[0]) : undefined;
    if (nesne.startsWith("vektor") && secili0 && secili0.tur === "fizik" && secili0.nesne === "kareliAlan") {
      konum = { x: Math.round(secili0.x + secili0.w / 2 - t.w / 2), y: Math.round(secili0.y + secili0.h / 2 - t.h / 2) };
    } else if (nesne.startsWith("vektor") && secili0 && secili0.tur !== "baglayici" && ctx) {
      const k = sekilTamKutusu(ctx, secili0);
      konum = {
        x: Math.round(Math.min(tuvalOlcu.w - t.w - 10, k.x + k.w)),
        y: Math.round(Math.max(10, k.y + k.h / 2 - t.h / 2)),
      };
    }
    const { x, y } = konum;
    tarihceyeKaydet();
    const yeni: Sekil = {
      id: sekilId(),
      tur: "fizik",
      nesne,
      kalinlik,
      x,
      y,
      w: t.w,
      h: t.h,
      ...(t.etiket ? { etiket: t.etiket } : {}),
      ...(nesne === "kareliAlan" ? { satir: 3, sutun: 4, kalinlik: 1 } : {}),
      ...(nesne === "grafik" ? { grafik: ek?.grafik ?? GRAFIK_SABLONLARI[2].olustur() } : {}),
      ...(nesne === "istatistik" ? { istatistik: ek?.istatistik ?? varsayilanIstatistik() } : {}),
      ...(nesne === "sema" ? { sema: ek?.sema ?? varsayilanSema() } : {}),
      ...(nesne === "kimya" ? { kimya: ek?.kimya ?? varsayilanKimya() } : {}),
      ...(ek?.geo ? { geo: ek.geo } : {}),
    };
    setSekiller((mevcut) => [...mevcut, yeni]);
    setArac("sec");
    window.setTimeout(() => secimAyarla([yeni.id]), 0);
  }

  /**
   * Birden çok şekli (hazır sahne, kayıtlı şablon) tuvalde BOŞ bir yere ekler.
   * Kimlikler ve bağlayıcı uçları yenilenir; eklenenler seçili gelir.
   */
  function sekillerEkle(kaynak: Sekil[]) {
    const yeniler = kimlikleriYenile(kaynak);
    if (!yeniler.length) return;
    const ctx = canvasRef.current?.getContext("2d");
    let tasinmis = yeniler;
    if (ctx) {
      const govde = yeniler.filter((x) => x.tur !== "baglayici");
      if (govde.length) {
        const k = birlesikSinir(ctx, govde);
        const kutular: Kutu[] = sekiller
          .filter((x) => x.tur !== "baglayici" && !(x.tur === "fizik" && x.nesne === "kareliAlan"))
          .map((x) => sekilTamKutusu(ctx, x));
        const pay = 24;
        const konum = bosYerBul(kutular, k.w + pay * 2, k.h + pay * 2, tuvalOlcu);
        const dx = konum.x + pay - k.x, dy = konum.y + pay - k.y;
        tasinmis = yeniler.map((x) => sekilTasi(x, dx, dy));
      }
    }
    tarihceyeKaydet();
    setSekiller((liste) => [...liste, ...tasinmis]);
    setArac("sec");
    window.setTimeout(() => secimAyarla(tasinmis.map((x) => x.id)), 0);
  }

  /** Sol kütüphanedeki bir karta tıklandı. Çekmece AÇIK kalır. */
  function kutuphanedenEkle(girdi: KutuphaneGirdisi) {
    const eylem = girdi.ekle();
    if (eylem.tur === "fizik") fizikNesnesiEkle(eylem.nesne, eylem.ek);
    else if (eylem.tur === "akis") akisKutusuEkle(eylem.sekil);
    else if (eylem.tur === "uclu") grafikUcluEkle();
    else if (girdi.kullaniciSablonuId) {
      const sb = kullaniciSablonlari.find((x) => x.id === girdi.kullaniciSablonuId);
      if (sb) kullaniciSablonuEkle(sb);
    } else sekillerEkle(eylem.sekiller);
    setSonEklenen(girdi.ad);
    // Dar ekranda çekmece tuvalin üstünü kaplıyor: eklenen şekil görünsün diye
    // çekmece AÇIK kalır ama arama metni korunur (ardı ardına ekleme).
  }

  /** Hazır grafik şablonunu (x–t, v–t, a–t, sinüs…) tek tıkla ekler. */
  function grafikSablonuEkle(sablonId: string) {
    const sablon = GRAFIK_SABLONLARI.find((x) => x.id === sablonId);
    if (sablon) fizikNesnesiEkle("grafik", { grafik: sablon.olustur() });
  }

  /**
   * Aynı hareketin konum, hız ve ivme grafiğini alt alta ekler. Üçü aynı
   * evrelerden ve aynı zaman aralığından çıktığı için evre sınırları hizalıdır.
   */
  function grafikUcluEkle(x0 = 0, v0 = 0, evreler = ORNEK_EVRELER) {
    const grafikler = hareketUcluGrafik(x0, v0, evreler);
    const ctx = canvasRef.current?.getContext("2d");
    const kutular: Kutu[] = ctx
      ? sekiller
          .filter((x) => x.tur !== "baglayici" && !(x.tur === "fizik" && x.nesne === "kareliAlan"))
          .map((x) => sekilTamKutusu(ctx, x))
      : [];
    const w = 360;
    const h = 108;
    const pitch = h + 32 + 26 + 6;
    const toplamH = pitch * 3;
    const o = bosYerBul(kutular, w + 130, toplamH, tuvalOlcu);
    tarihceyeKaydet();
    const yeniler: Sekil[] = grafikler.map((grafik, i) => ({
      id: sekilId(),
      tur: "fizik",
      nesne: "grafik",
      kalinlik,
      x: o.x + 46,
      y: o.y + 32 + i * pitch,
      w,
      h,
      grafik,
    }));
    setSekiller((mevcut) => [...mevcut, ...yeniler]);
    setArac("sec");
    window.setTimeout(() => secimAyarla(yeniler.map((y) => y.id)), 0);
  }

  /**
   * Akış kutusu SÜRÜKLENEREK değil, tıklanarak eklenir.
   *
   * Sebebi: kutunun asıl içeriği metni ve öğretmenin ilk isteyeceği şey onu
   * yazmak. Sürükle-çiz akışı önce boş bir kutu bırakıp sonra ayrıca metin
   * istemek demekti; tıkla-ekle hem daha az adım hem de kutuyu doğru
   * varsayılan ölçüde bırakıyor (karar kutusu ötekilerden geniş — eşkenar
   * dörtgende kullanılabilir iç genişlik kutunun ~yarısı).
   */
  function akisKutusuEkle(akisSekli: AkisSekli) {
    const karar = akisSekli === "karar";
    const w = karar ? AKIS_KARAR_W : AKIS_VARSAYILAN_W;
    const h = karar ? AKIS_KARAR_H : AKIS_VARSAYILAN_H;
    // YENİ KUTU BİR ÖNCEKİNİN ALTINA. İlk denemede sabit bir çapraz kayma
    // (24px) kullanılmıştı ve kutular birbirinin üstüne biniyordu — ekran
    // görüntüsünde açıkça görüldü. Akış şeması zaten yukarıdan aşağı okunur;
    // alt alta dizmek hem çakışmayı bitiriyor hem de öğretmenin yapacağı ilk
    // düzenlemeyi (sırayı kurmak) hazır veriyor.
    const oncekiler = sekiller.filter((x) => x.tur === "akis") as Extract<Sekil, { tur: "akis" }>[];
    const son = oncekiler[oncekiler.length - 1];
    const ARA = 46;
    let x = Math.round((tuvalOlcu.w - w) / 2);
    let y = 40;
    if (son) {
      // Merkezleri hizalı kalsın: bağlayıcı dikey inecek.
      x = Math.round(son.x + son.w / 2 - w / 2);
      y = son.y + son.h + ARA;
    }
    // Tuvalin altına taşarsa yeni bir SÜTUNA geç (sağa kay, tepeden başla).
    if (y + h > tuvalOlcu.h - 10) {
      const enSag = oncekiler.reduce((m, o) => Math.max(m, o.x + o.w), 0);
      x = Math.min(tuvalOlcu.w - w - 10, enSag + 70);
      y = 40;
    }
    x = Math.max(10, Math.min(tuvalOlcu.w - w - 10, x));
    tarihceyeKaydet();
    const yeni: Sekil = {
      id: sekilId(),
      tur: "akis",
      akisSekli,
      kalinlik,
      x,
      y,
      w,
      h,
      metin: AKIS_VARSAYILAN_METIN[akisSekli],
    };
    setSekiller((mevcut) => [...mevcut, yeni]);
    setArac("sec");
    window.setTimeout(() => secimAyarla([yeni.id]), 0);
  }

  /**
   * Tuvali kabına sığdıran yakınlaştırma oranı.
   *
   * Saf hesap `sigdirmaOrani`'nda (cizim/sabitler.ts) — burada yalnız ölçü
   * okunuyor. Kabın `p-2` dolgusu ve kenarlığı için pay düşülüyor, yoksa
   * "sığdı" denen oranda kaydırma çubuğu çıkıyor.
   */
  /**
   * Yazılan tarifi kutulara çevirir.
   *
   * TEK KERELİK (öğretmenle konuşuldu): tuvalde şekil varsa ÜSTÜNE eklemez,
   * onay ister ve hepsini değiştirir. Karışık bir tuvale yeni bir şema
   * karıştırmak, elle yerleştirilmiş şekillerin üstüne kutu yığardı.
   * Geri alınabilir — tarihçeye yazılıyor.
   */
  function tarifiDiz() {
    const tarif = akisMetniniCoz(tarifMetni);
    setTarifUyarilari(tarif.uyarilar);
    if (!tarif.dugumler.length) {
      setHata("Tarif okunamadı: en az bir adım yazın (örn. \"(Başla) -> [İşlem]\").");
      return;
    }
    // Tuvalde şekil varsa ONAY. `window.confirm` DEĞİL: yerel kutu modalın
    // odak tuzağının dışında kalıyor (faz8 kalite süiti bunu yakalıyor).
    if (sekiller.length > 0) {
      setDizmeOnayi(true);
      return;
    }
    tarifiUygula(tarif);
  }

  function tarifiUygula(tarif: ReturnType<typeof akisMetniniCoz>) {
    const yerlesim = akisiYerlestir(tarif, { kalinlik });
    // Tuval şemayı ALMALI: sığmıyorsa bir üst ölçüye geç, yoksa kutular
    // kenara sıkışır ve `sekilTasiSinirli` onları içeri iter (üst üste biner).
    const uygun = TUVAL_OLCULERI.find((o) => o.w >= yerlesim.genislik && o.h >= yerlesim.yukseklik)
      ?? TUVAL_OLCULERI[TUVAL_OLCULERI.length - 1];
    tarihceyeKaydet();
    setTuvalOlcu({ w: uygun.w, h: uygun.h });
    setSekiller(yerlesim.sekiller);
    secimAyarla([]);
    setHata("");
    // Yeni ölçüye göre sığdır: 45 kutuluk şema %100'de ekrana sığmıyor.
    window.setTimeout(() => {
      const kap = containerRef.current;
      if (kap) setZoom(sigdirmaOrani(kap.clientWidth, kap.clientHeight, { w: uygun.w, h: uygun.h }));
    }, 0);
  }

  // OTOMATİK SIĞDIRMA: tuval kabına sığmıyorsa (iPad, küçük pencere, panel
  // açıldı) öğretmen elle yakınlaştırmadıkça sığdırılır; çizimin bir kısmı
  // kaydırma çubuğunun arkasında kalmasın. Kap boyu değişince yeniden ölçülür
  // (yüzen çubuk da yeni ölçüye göre konumlansın diye yeniden çizilir).
  const zoomElleRef = useRef(false);
  const tuvalOlcuGuncelRef = useRef(tuvalOlcu);
  tuvalOlcuGuncelRef.current = tuvalOlcu;
  useEffect(() => {
    const kap = containerRef.current;
    if (!kap) return;
    const olc = () => {
      setKaydirmaSayaci((n) => n + 1);
      if (zoomElleRef.current || kap.clientWidth <= 0 || kap.clientHeight <= 0) return;
      const olcu = tuvalOlcuGuncelRef.current;
      setZoom(Math.min(100, sigdirmaOrani(kap.clientWidth, kap.clientHeight, olcu)));
    };
    const t = window.setTimeout(olc, 0);
    const RO = (window as unknown as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
    const gozcu = RO ? new RO(() => olc()) : null;
    gozcu?.observe(kap);
    return () => { window.clearTimeout(t); gozcu?.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pencereyeSigdir() {
    zoomElleRef.current = false;
    const kap = containerRef.current;
    if (!kap) return;
    setZoom(sigdirmaOrani(kap.clientWidth, kap.clientHeight, tuvalOlcu));
  }

  function metniOnayla() {
    const metin = metinDeger.trim();
    if (!metin || !metinNoktasi) {
      setMetinNoktasi(null);
      return;
    }
    tarihceyeKaydet();
    if (metinDuzenlenenId) {
      setSekiller((mevcut) => mevcut.map((s) => s.id === metinDuzenlenenId && s.tur === "metin"
        ? { ...s, metin, punto: metinPunto, satirAraligi: metinSatirAraligi } : s));
      secimAyarla([metinDuzenlenenId]);
    } else {
      const yeni: Sekil = { id: sekilId(), tur: "metin", metin, punto: metinPunto, satirAraligi: metinSatirAraligi, x: metinNoktasi.x, y: metinNoktasi.y };
      setSekiller((mevcut) => [...mevcut, yeni]);
      window.setTimeout(() => secimAyarla([yeni.id]), 0);
      setArac("sec");
    }
    setMetinNoktasi(null);
    setMetinDeger("");
    setMetinDuzenlenenId(null);
  }

  function olustur(hedef: "yeni" | "secili" | "inline") {
    if (sekiller.length === 0) {
      setHata("Önce en az bir şekil çizin.");
      return;
    }
    const olcuCanvas = document.createElement("canvas");
    const olcuCtx = olcuCanvas.getContext("2d");
    if (!olcuCtx) {
      setHata("Çizim oluşturulamadı.");
      return;
    }
    const sinir = cizimIcerikSiniri(olcuCtx, sekiller, 14, tuvalOlcu);
    const { x: sol, y: ust, w, h } = sinir;
    const kalite = 3;
    const disCanvas = document.createElement("canvas");
    disCanvas.width = w * kalite;
    disCanvas.height = h * kalite;
    const disCtx = disCanvas.getContext("2d");
    if (!disCtx) { setHata("Çizim oluşturulamadı."); return; }
    disCtx.fillStyle = "#ffffff";
    disCtx.fillRect(0, 0, disCanvas.width, disCanvas.height);
    disCtx.scale(kalite, kalite);
    disCtx.translate(-sol, -ust);
    // Tek tek `sekilCiz` DEĞİL: bağlayıcının yolu şekil listesinden hesaplanıyor,
    // tek şekille çağrılınca sessizce çizilmiyordu (oklar kâğıda hiç basılmıyordu).
    sekilleriCiz(disCtx, sekiller);
    // ÇİZİLMİŞ içeriğe göre kırp (8 CSS px pay): nesne kutusu büyük, çizim küçük
    // olan şemalar (gövde-yaprak, kutu, sayı doğrusu…) büyük boş alanla basılıyordu.
    const kirpilmis = icerigeKirp(disCanvas, 8 * kalite);
    const cizimVerisi: CizimBelgesi = { surum: 1, genislik: tuvalOlcu.w, yukseklik: tuvalOlcu.h, sekiller };
    onOlustur({ dataUrl: kirpilmis.toDataURL("image/png"), oran: kirpilmis.width / kirpilmis.height, cizimVerisi }, hedef);
  }

  // Kapatma onayı ortak standarttan geliyor (hooks/useKapatmaOnayi.ts).
  // Önceden elle çizilen bir katmandı: odak tuzağı YOKTU, Escape çalışmıyordu.
  // Karşılaştırma pahalı olduğu için hook `degisiklikVar`ı fonksiyon alıyor —
  // her render'da değil, yalnız kapatma anında hesaplanır.
  const kapatma = useKapatmaOnayi({
    degisiklikVar: () => JSON.stringify(sekiller) !== baslangicSekilleriRef.current,
    onKapat: onClose,
  });

  const ustCls =
    "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition";
  const seciliSekiller = sekiller.filter((s) => seciliIds.includes(s.id));
  const birincilId = seciliIds.length === 1 ? seciliIds[0] : null;
  const birincil = birincilId ? sekiller.find((s) => s.id === birincilId) : undefined;
  // Karmaşık nesne (grafik, istatistik, şema, kimya, geometri…) seçilince
  // ayrıntılı panel kendiliğinden açılır; basit şekilde yüzen çubuk yeter.
  useEffect(() => {
    setSagPanelAcik(karmasikMi(sekillerRef.current.find((s) => s.id === birincilId)));
  }, [birincilId]);
  useEffect(() => { if (!seciliIds.length) setSagPanelAcik(false); }, [seciliIds.length]);
  const panelAcik = sagPanelAcik && seciliIds.length > 0 && !odakKipi;
  // Tek yan panel kuralı (dar/orta ekran): ayrıntılı panel açılınca kütüphane
  // yer açmak için kapanır, panel kapanınca geri açılır. Çok geniş ekranda ikisi birlikte.
  useEffect(() => {
    const genis = (window.innerWidth || 1440) >= 1700;
    if (panelAcik && solAcik && !genis) {
      solOtomatikKapandiRef.current = true;
      setSolAcik(false);
    } else if (!panelAcik && solOtomatikKapandiRef.current) {
      solOtomatikKapandiRef.current = false;
      setSolAcik(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelAcik]);
  const kutuphaneListesi = useMemo(() => kutuphaneGirdileri(kullaniciSablonlari), [kullaniciSablonlari]);

  /** Seçimin dünya kutusu (bağlayıcı için uç noktalarından). */
  function secimKutusuHesapla(liste: Sekil[] = seciliSekiller): { x: number; y: number; w: number; h: number } | null {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !liste.length) return null;
    const kutular = liste.map((s) => {
      if (s.tur === "fizik" && geometriNesnesiMi(s)) {
        // Köşesi kutunun dışına sürüklenmiş geometri şekli: köşeler de kapsansın.
        const k = sekilSinirlari(ctx, s);
        const noktalar = geometriKoseleri(s);
        const xs = [k.x, k.x + k.w, ...noktalar.map((p) => p.x - 14), ...noktalar.map((p) => p.x + 14)];
        const ys = [k.y, k.y + k.h, ...noktalar.map((p) => p.y - 18), ...noktalar.map((p) => p.y + 18)];
        return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
      }
      if (s.tur !== "baglayici") return sekilSinirlari(ctx, s);
      const uc = (u: BaglayiciUcu) => {
        if (!("sekilId" in u)) return { x: u.x, y: u.y };
        const h = sekiller.find((x) => x.id === u.sekilId);
        return h && h.tur !== "baglayici" ? (() => { const k = sekilSinirlari(ctx, h); return { x: k.x + k.w / 2, y: k.y + k.h / 2 }; })() : null;
      };
      const a = uc(s.kaynak), b = uc(s.hedef);
      if (!a || !b) return null;
      return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
    }).filter((k): k is { x: number; y: number; w: number; h: number } => !!k && Number.isFinite(k.x) && k.x > -1e5);
    if (!kutular.length) return null;
    const x = Math.min(...kutular.map((k) => k.x)), y = Math.min(...kutular.map((k) => k.y));
    return { x, y, w: Math.max(...kutular.map((k) => k.x + k.w)) - x, h: Math.max(...kutular.map((k) => k.y + k.h)) - y };
  }

  /** Tuval (dünya) noktası → kaydırma kabı içindeki konum. */
  function ekranKonumu(p: Nokta) {
    const canvas = canvasRef.current;
    return { x: (canvas?.offsetLeft ?? 0) + p.x * zoom / 100, y: (canvas?.offsetTop ?? 0) + p.y * zoom / 100 };
  }

  const YUZEN_W = 470;
  const yuzenKonum = (() => {
    if (!seciliSekiller.length || isaretciBasili || odakKipi || metinNoktasi || balon || arac !== "sec") return null;
    const k = secimKutusuHesapla();
    if (!k) return null;
    const kap = containerRef.current;
    const ust = ekranKonumu({ x: k.x, y: k.y });
    const alt = ekranKonumu({ x: k.x, y: k.y + k.h });
    const gorunurUst = (kap?.scrollTop ?? 0) + 4;
    // Döndürme tutamacının (şeklin 24 birim üstü) da üstünde dursun.
    let top = ust.y - (24 * zoom) / 100 - 58;
    if (top < gorunurUst) top = alt.y + 14;
    const solSinir = (kap?.scrollLeft ?? 0) + 4;
    const sagSinir = (kap?.scrollLeft ?? 0) + (kap?.clientWidth || 800) - Math.min(YUZEN_W, (kap?.clientWidth || 800) - 8) - 4;
    const left = Math.max(solSinir, Math.min(sagSinir, ust.x));
    return { left, top };
  })();

  /** Seçili şekillere bir dönüşüm uygular (tek geçmiş adımı). */
  function seciliyeUygula(f: (s: Sekil) => Sekil) {
    if (!seciliIds.length) return;
    tarihceyeKaydet();
    setSekiller((liste) => liste.map((s) => (seciliIds.includes(s.id) ? f(s) : s)));
  }
  function alanAyarla(alan: "renk" | "dolgu", deger: string | undefined, turler: string[]) {
    seciliyeUygula((x) => {
      if (!turler.includes(x.tur)) return x;
      const kopya = { ...x } as Record<string, unknown>;
      if (deger) kopya[alan] = deger; else delete kopya[alan];
      return kopya as Sekil;
    });
  }

  const yuzenAyar: YuzenAracAyarlari | null = (() => {
    if (!yuzenKonum) return null;
    const coklu = seciliIds.length > 1;
    const s = birincil ?? seciliSekiller[seciliSekiller.length - 1];
    if (!s) return null;
    const grupVar = seciliSekiller.some((x) => x.grupId);
    const ortak: YuzenAracAyarlari = {
      coklu,
      onCogalt: seciliCogalt,
      onSil: seciliSil,
      onAyrintilar: () => setSagPanelAcik((v) => !v),
      ayrintiAcik: panelAcik,
      onOne: () => seciliKatmanDegistir(true),
      onArkaya: () => seciliKatmanDegistir(false),
      onSablonKaydet: () => setSablonKaydiAcik(true),
      onGrubuCoz: grupVar ? secilenGrubuCoz : undefined,
      cizgi: s.tur === "metin" ? undefined : {
        kalinlik: s.kalinlik,
        onKalinlik: (k) => { setKalinlik(k); seciliyeUygula((x) => (x.tur === "metin" ? x : { ...x, kalinlik: k } as Sekil)); },
        cizgiTipi: s.cizgiTipi,
        onCizgiTipi: s.tur === "baglayici" ? undefined : (t) => { setCizgiTipi(t); seciliyeUygula((x) => (x.tur === "metin" || x.tur === "baglayici" ? x : { ...x, cizgiTipi: t } as Sekil)); },
        okUcu: s.tur === "dogru" || s.tur === "baglayici" ? (s.okUcu ?? (s.tur === "baglayici" ? "son" : "yok")) : undefined,
        onOkUcu: !coklu && (s.tur === "dogru" || s.tur === "baglayici") ? (u) => seciliyeUygula((x) => (x.tur === "dogru" || x.tur === "baglayici" ? { ...x, okUcu: u } : x)) : undefined,
      },
    };
    if (coklu) {
      const temeller = seciliSekiller.filter((x) => TEMEL_RENKLI_TURLER.includes(x.tur));
      return {
        ...ortak,
        onHizala: secilenleriHizala,
        onDagit: secilenleriDagit,
        dagitilabilir: seciliSekiller.filter((x) => x.tur !== "baglayici").length >= 3,
        onGrupla: secilenleriGrupla,
        renk: temeller.length ? {
          palet: TEMEL_RENK_PALETI,
          deger: (temeller[temeller.length - 1] as { renk?: string }).renk,
          onSec: (d) => alanAyarla("renk", d, TEMEL_RENKLI_TURLER),
        } : undefined,
      };
    }
    const temelRenkli = TEMEL_RENKLI_TURLER.includes(s.tur);
    const temelDolgulu = TEMEL_DOLGULU_TURLER.includes(s.tur);
    const vektor = s.tur === "fizik" && s.nesne.startsWith("vektor");
    const basitFizik = s.tur === "fizik" && !karmasikMi(s);
    const veriNesnesi = s.tur === "fizik" && ["grafik", "istatistik", "sema", "kimya"].includes(s.nesne);
    // Hesaplı fizik sahnelerinde (eğik düzlem kuvvetleri, optik, sıvı kabı) ayna anlamsız.
    const cevrilemez = veriNesnesi || (s.tur === "fizik" && fizikSahnePaneliVarMi(s.nesne));
    let onDuzenle: (() => void) | undefined;
    let duzenleAdi = "Etiket / Metin";
    if (s.tur === "metin") {
      duzenleAdi = "Metni düzenle";
      onDuzenle = () => {
        setMetinDuzenlenenId(s.id); setMetinNoktasi({ x: s.x, y: s.y }); setMetinDeger(s.metin);
        setMetinPunto(s.punto ?? METIN_PUNTO); setMetinSatirAraligi(s.satirAraligi ?? METIN_SATIR_ARALIGI);
      };
    } else if (s.tur === "akis" || s.tur === "baglayici" || basitFizik) {
      duzenleAdi = s.tur === "akis" ? "Kutu metni" : "Etiket";
      const k = secimKutusuHesapla();
      onDuzenle = () => balonAc({ tur: "metin", sekilId: s.id }, k ? { x: k.x + k.w / 2, y: k.y + k.h / 2 } : { x: 40, y: 40 });
    }
    return {
      ...ortak,
      onDuzenle,
      duzenleAdi,
      renk: temelRenkli || s.tur === "baglayici" || vektor ? {
        palet: TEMEL_RENK_PALETI,
        deger: (s as { renk?: string }).renk,
        onSec: (d) => alanAyarla("renk", d, [...TEMEL_RENKLI_TURLER, "baglayici", "fizik"]),
      } : undefined,
      dolgu: temelDolgulu ? {
        palet: TEMEL_DOLGU_PALETI,
        deger: (s as { dolgu?: string }).dolgu,
        onSec: (d) => alanAyarla("dolgu", d, TEMEL_DOLGULU_TURLER),
      } : s.tur === "akis" || basitFizik ? {
        palet: AKIS_DOLGU_PALETI,
        deger: (s as { dolgu?: string }).dolgu,
        onSec: (d) => alanAyarla("dolgu", d, ["akis", "fizik"]),
      } : undefined,
      tarama: temelDolgulu ? {
        deger: (s as { tarama?: TaramaTipi }).tarama ?? "yok",
        onSec: (t) => { setTarama(t); seciliyeUygula((x) => (TEMEL_DOLGULU_TURLER.includes(x.tur) ? { ...x, tarama: t } as Sekil : x)); },
      } : undefined,
      punto: s.tur === "metin" ? {
        deger: s.punto ?? METIN_PUNTO,
        onDegis: (p) => { setMetinPunto(p); seciliyeUygula((x) => (x.tur === "metin" ? { ...x, punto: p } : x)); },
      } : undefined,
      // Grafik/istatistik/şema/kimya yazılı veri: çevirmek/döndürmek yazıları bozar.
      onCevir: cevrilebilirMi(s) && !cevrilemez ? () => seciliyeUygula(sekilYatayCevir) : undefined,
      onDondur: s.tur !== "baglayici" && !veriNesnesi ? () => seciliyeUygula(sekilDondur90) : undefined,
    };
  })();

  const balonSekli = balon ? sekiller.find((s) => s.id === balon.hedef.sekilId) : undefined;
  const balonKonum = (() => {
    if (!balon) return null;
    const kap = containerRef.current;
    // Balon şeklin kendisine (köşe adları dahil) değmesin: şeklin ekran kutusu
    // verilir; yer seçimi (yan / alt / üst, gerekirse kısaltıp kaydırma) saf
    // `balonYerlesimi`'nde.
    const sk = balonSekli && balonSekli.tur !== "baglayici" ? secimKutusuHesapla([balonSekli]) : null;
    const a = sk ? ekranKonumu({ x: sk.x, y: sk.y }) : null;
    const b = sk ? ekranKonumu({ x: sk.x + sk.w, y: sk.y + sk.h }) : null;
    return {
      nokta: ekranKonumu(balon.nokta),
      kacin: a && b ? { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y } : null,
      gorunur: { x: kap?.scrollLeft ?? 0, y: kap?.scrollTop ?? 0, w: kap?.clientWidth || 800, h: kap?.clientHeight || 600 },
    };
  })();

  const aracDugmesi = (a: CizimAraci) => {
    const tanim = ARAC_TANIMLARI.find((x) => x.arac === a)!;
    const Icon = tanim.icon;
    const aktif = arac === a;
    return (
      <button
        key={a}
        type="button"
        title={tanim.ipucu ?? tanim.etiket}
        aria-label={tanim.etiket}
        aria-pressed={aktif}
        data-arac={a}
        onClick={() => {
          setDigerAraclarAcik(false);
          if (a === "baglayici") {
            // Aynı araca tekrar tıklamak bırakır (Seç'e döner).
            if (aktif) { setArac("sec"); setBaglayiciKaynakUcu(null); return; }
            setBaglayiciKaynakUcu(null);
          }
          setArac(a);
          if (a !== "sec") secimAyarla([]);
        }}
        className={`flex h-12 min-w-[44px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 text-[10px] font-semibold leading-none transition xl:min-w-[58px] ${
          aktif ? "bg-brand-100 text-brand-700 ring-1 ring-brand-300" : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        <Icon size={19} />
        <span className="max-xl:sr-only">{tanim.etiket}</span>
      </button>
    );
  };

  const aracIpucu: Partial<Record<CizimAraci, string>> = {
    dogru: "Sürükleyerek çizin (Shift: yatay/dikey/45°). Bitince Seç'e dönülür.",
    dikdortgen: "Sürükleyerek çizin (Shift: kare). Bitince Seç'e dönülür.",
    elips: "Sürükleyerek çizin (Shift: daire). Bitince Seç'e dönülür.",
    ucgen: "Sürükleyerek çizin; sonra köşeleri tek tek sürükleyin.",
    serbest: "Basılı tutup çizin. Bitince Seç'e dönülür.",
    metin: "Yazının başlayacağı yere tıklayın.",
    silgi: "Silmek istediğiniz şekillerin üstünden geçin.",
  };

  return (
    <ModalKabuk
      baslik={duzenlemeModu ? "Çizimi Düzenle" : "Çizim Ekle"}
      onClose={kapatma.kapatIstendi}
      genislik="max-w-[1480px]"
      tamYukseklik
      // Escape modalı KAPATMAZ: odak kipindeyken önce şeritleri geri getirir,
      // bir araç seçiliyken önce aracı bırakır (Seç'e döner), balon açıkken balonu kapatır.
      kapanabilir={!odakKipi && arac === "sec" && !balon && !sablonKaydiAcik && !temizleOnayi && !kapatma.onayAcik && !silinecekSablon && !denklemKutusuId && !dizmeOnayi}
    >
      {/* ÜST ARAÇ ÇUBUĞU: kütüphane anahtarı · temel çizim araçları · geri/ileri · görünüm · daha fazla. */}
      {!odakKipi && (
        <div className="flex shrink-0 flex-wrap items-center gap-1 pb-2" role="toolbar" aria-label="Çizim araçları" data-arac-cubugu>
          <button
            type="button"
            aria-pressed={solAcik}
            aria-label="Şekil kütüphanesi"
            title="Şekil ve şablon kütüphanesi"
            onClick={() => { solOtomatikKapandiRef.current = false; setSolAcik((v) => !v); }}
            className={`flex h-12 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-bold transition ${solAcik ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-700 hover:bg-brand-100"}`}
          >
            <BookOpen size={18} /> <span className="max-md:sr-only">Şekiller</span>
          </button>
          <span className="mx-1 h-8 w-px shrink-0 bg-slate-200" />
          {ARAC_TANIMLARI.map((t) => aracDugmesi(t.arac))}
          <span className="mx-1 h-8 w-px shrink-0 bg-slate-200" />
          <button type="button" title={`Geri al (${kisayol("Ctrl+Z")})`} aria-label="Geri al" disabled={gecmisSayisi === 0} onClick={geriAl}
            className="flex h-12 min-w-[44px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-35">
            <Undo2 size={19} /><span className="max-xl:sr-only">Geri al</span>
          </button>
          <button type="button" title={`İleri al (${kisayol("Ctrl+Y")})`} aria-label="İleri al" disabled={ileriSayisi === 0} onClick={ileriAl}
            className="flex h-12 min-w-[44px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-35">
            <Redo2 size={19} /><span className="max-xl:sr-only">İleri al</span>
          </button>
          <span className="flex-1" />
          <div className="inline-flex h-11 shrink-0 items-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
            {/* Alt sınır %25: büyük tuvalde (1920×1200) %50'de bile ekrana sığmıyor. */}
            <button type="button" title="Uzaklaştır" aria-label="Uzaklaştır" onClick={() => { zoomElleRef.current = true; setZoom((v) => Math.max(25, v - 25)); }} className="flex h-11 w-10 items-center justify-center hover:bg-slate-50"><ZoomOut size={16} /></button>
            <button type="button" title="%100" onClick={() => { zoomElleRef.current = true; setZoom(100); }} className="h-11 min-w-12 border-x border-slate-100 px-1.5 text-xs font-semibold">%{zoom}</button>
            <button type="button" title="Yakınlaştır" aria-label="Yakınlaştır" onClick={() => { zoomElleRef.current = true; setZoom((v) => Math.min(200, v + 25)); }} className="flex h-11 w-10 items-center justify-center hover:bg-slate-50"><ZoomIn size={16} /></button>
            <button type="button" title="Tuvalin tamamı pencereye sığacak orana geç" onClick={pencereyeSigdir} className="flex h-11 items-center gap-1 border-l border-slate-100 px-2 text-xs font-semibold hover:bg-slate-50">
              <Maximize2 size={14} /> <span className="max-lg:sr-only">Sığdır</span>
            </button>
          </div>
          <div ref={digerAraclarRef} className="relative shrink-0">
            <button
              type="button"
              aria-expanded={digerAraclarAcik}
              aria-haspopup="menu"
              title="Daha fazla: ızgara, tuval ölçüsü, temizle…"
              onClick={() => setDigerAraclarAcik((v) => !v)}
              className={`flex h-12 min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 text-[10px] font-semibold transition ${digerAraclarAcik ? "bg-slate-100 text-slate-800" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <MoreHorizontal size={19} /><span className="max-xl:sr-only">Daha fazla</span>
            </button>
          </div>
        </div>
      )}
      {/* "Daha fazla" menüsü araç çubuğunun yatay kaydırmasından etkilenmesin diye dışarıda. */}
      {digerAraclarAcik && !odakKipi && (
        <div className="relative z-40 h-0" >
          <div ref={dahaFazlaMenuRef} role="menu" aria-label="Daha fazla" data-testid="daha-fazla-menusu"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute right-0 top-0 flex w-[320px] max-w-[calc(100vw-32px)] flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-xl">
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => { setOdakKipi(true); setDigerAraclarAcik(false); }}
                title="Araç çubuklarını gizle, tuvali büyüt (Esc ile geri gelir)"
                className="inline-flex h-10 items-center gap-1.5 rounded-lg px-2.5 font-semibold ring-1 ring-slate-200 hover:bg-slate-50">
                <Maximize2 size={14} /> Sadece tuval
              </button>
              <button type="button" aria-pressed={izgaraGoster} onClick={() => setIzgaraGoster((v) => !v)}
                className={`inline-flex h-10 items-center gap-1.5 rounded-lg px-2.5 font-semibold ${izgaraGoster ? "bg-brand-100 text-brand-700" : "ring-1 ring-slate-200 hover:bg-slate-50"}`}>
                <Grid3X3 size={14} /> Izgara
              </button>
              <label className="inline-flex h-10 items-center gap-1.5 rounded-lg px-2.5 font-semibold ring-1 ring-slate-200">
                <input type="checkbox" checked={izgarayaYakala} onChange={(e) => setIzgarayaYakala(e.target.checked)} /> Izgaraya yakala
              </label>
            </div>
            {/* TUVAL ÖLÇÜSÜ. Küçültme, dışarıda ŞEKİL KALIYORSA engelleniyor. */}
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Tuval ölçüsü</div>
              <div className="flex flex-wrap gap-1.5">
                {TUVAL_OLCULERI.map((o) => (
                  <button key={o.ad} type="button" title={`${o.w}×${o.h}`}
                    aria-pressed={tuvalOlcu.w === o.w && tuvalOlcu.h === o.h}
                    onClick={() => tuvalOlcusunuDegistir({ w: o.w, h: o.h })}
                    className={`h-10 rounded-lg px-2.5 font-semibold ${tuvalOlcu.w === o.w && tuvalOlcu.h === o.h ? "bg-brand-100 text-brand-700" : "ring-1 ring-slate-200 hover:bg-slate-50"}`}>
                    {o.ad}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
              <span title="En fazla 80 işlem saklanır; sınır dolunca en eski işlem otomatik çıkarılır."
                className={`rounded-md px-2 py-1 text-[10px] font-semibold ${gecmisSayisi >= GECMIS_LIMITI ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"}`}>
                Geçmiş {gecmisSayisi}/{GECMIS_LIMITI}
              </span>
              <button type="button" title="Tümünü temizle" disabled={sekiller.length === 0}
                onClick={() => { setTemizleOnayi(true); setDigerAraclarAcik(false); }}
                className="inline-flex h-10 items-center gap-1 rounded-lg px-2.5 font-semibold text-rose-600 ring-1 ring-rose-100 hover:bg-rose-50 disabled:opacity-40">
                {/* Etiket "Tümünü temizle" kalıyor: onay kutusundaki düğme "Temizle". */}
                <Trash2 size={14} /> Tümünü temizle
              </button>
            </div>
            <p className="text-[11px] leading-snug text-slate-400">
              {sekiller.length} şekil · Çift tıklama: yerinde düzenle · Shift: düzgün açı · Delete: sil · {kisayol("Ctrl+Z/Y")}: geri/ileri · {kisayol("Ctrl+D")}: çoğalt · Esc: aracı bırak
            </p>
          </div>
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        Tuvalde {sekiller.length} şekil var. {seciliIds.length} şekil seçili. Etkin araç: {ARAC_TANIMLARI.find((x) => x.arac === arac)?.etiket}.
      </p>
      {/* YERLEŞİM: solda kütüphane çekmecesi, ortada tuval, sağda (yalnız
          gerektiğinde) ayrıntılı panel. Kütüphane DOM'da tuvalden SONRA gelir
          (önizleme tuvalleri ana tuvalden önce bulunmasın), görsel sırası `order`. */}
      <div className="relative flex min-h-0 flex-1 gap-3">
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          {arac === "sec" && (imlecIpucu || seciliIds.length === 1) && (() => {
            const secili = seciliIds.length === 1 ? sekiller.find((x) => x.id === seciliIds[0]) : undefined;
            if (!secili && !imlecIpucu) return null;
            return (
              <div
                data-testid="imlec-ipucu"
                className="pointer-events-none absolute bottom-3 left-3 z-10 max-w-[80%] rounded-lg bg-slate-900/85 px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg"
              >
                {secili ? `${sekilTurAdi(secili)} seçili` : ""}{secili && imlecIpucu ? " · " : ""}{imlecIpucu}
              </div>
            );
          })()}
          <div
            ref={containerRef}
            onScroll={() => setKaydirmaSayaci((n) => n + 1)}
            className="relative min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-2"
          >
            <canvas
              ref={canvasRef}
              width={tuvalOlcu.w}
              height={tuvalOlcu.h}
              tabIndex={0}
              role="img"
              aria-label={`Çizim tuvali. ${sekiller.length} şekil var. Enter veya boşluk etkin araçla ortada şekil oluşturur; ok tuşları seçimi taşır.`}
              className="mx-auto block rounded border border-slate-200 bg-white touch-none"
              style={{
                cursor: arac === "sec" ? "default" : arac === "silgi" ? "cell" : "crosshair",
                width: `${tuvalOlcu.w * zoom / 100}px`,
                height: `${tuvalOlcu.h * zoom / 100}px`,
              }}
              onPointerDown={isaretciAsagi}
              onPointerMove={isaretciHareket}
              onPointerUp={isaretciYukari}
              onPointerCancel={isaretciIptal}
              onPointerLeave={() => { setImlecIpucu(""); if (uzerindekiId && !portSurukleRef.current) setUzerindekiId(null); }}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !e.ctrlKey && !e.metaKey) {
                  e.preventDefault(); klavyeyleSekilEkle();
                }
              }}
            />
            {metinNoktasi && (
              <div
                className="absolute z-10 rounded-lg border border-slate-200 bg-white p-2 shadow-lg"
                style={{
                  left: (() => {
                    const canvas = containerRef.current?.querySelector("canvas");
                    const bas = canvas?.offsetLeft ?? 0;
                    return Math.max(bas, Math.min(bas + metinNoktasi.x * zoom / 100, bas + tuvalOlcu.w * zoom / 100 - 224));
                  })(),
                  top: (() => {
                    const canvas = containerRef.current?.querySelector("canvas");
                    const bas = canvas?.offsetTop ?? 0;
                    return Math.max(bas, Math.min(bas + metinNoktasi.y * zoom / 100, bas + tuvalOlcu.h * zoom / 100 - 126));
                  })(),
                }}
              >
                <textarea
                  autoFocus
                  value={metinDeger}
                  onChange={(e) => setMetinDeger(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); metniOnayla(); }
                    if (e.key === "Escape") setMetinNoktasi(null);
                  }}
                  onBlur={metniOnayla}
                  placeholder="Etiket metni"
                  className="h-20 w-52 resize-none rounded-md border border-slate-200 px-2 py-1 text-xs outline-none focus:border-brand-400"
                />
                <div className="mt-1 flex flex-wrap gap-1">
                  {["°", "θ", "α", "β", "Δ", "μ", "Ω", "π", "→"].map((s) => (
                    <button key={s} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setMetinDeger((v) => v + s)}
                      className="rounded border border-slate-200 px-1.5 py-0.5 text-xs hover:bg-slate-50">{s}</button>
                  ))}
                </div>
              </div>
            )}
            {yuzenKonum && yuzenAyar && <YuzenAracCubugu konum={yuzenKonum} ayar={yuzenAyar} />}
            {balon && balonSekli && balonKonum && (
              <YerindeDuzenleBalonu
                hedef={balon.hedef}
                sekil={balonSekli}
                konum={balonKonum}
                kapat={balonKapat}
                guncelle={(yeni) => setSekiller((liste) => liste.map((x) => (x.id === yeni.id ? yeni : x)))}
              />
            )}
          </div>
          {/* ETKİN ARACIN SEÇENEKLERİ: yalnız gerektiğinde, tuvalin sol üstünde. */}
          {!odakKipi && arac !== "sec" && (
            <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[calc(100%-24px)] flex-wrap items-center gap-1.5" data-testid="arac-secenekleri">
              <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white/95 px-2 py-1.5 text-xs text-slate-600 shadow-sm">
                {arac === "cokgen" && (
                  <>
                    <span className="font-semibold">Kenar sayısı</span>
                    {[3, 4, 5, 6, 7, 8].map((d) => (
                      <button key={d} type="button" aria-pressed={cokgenKenar === d} onClick={() => setCokgenKenar(d)}
                        className={`h-9 min-w-9 rounded-lg font-semibold ${cokgenKenar === d ? "bg-brand-100 text-brand-700" : "bg-white ring-1 ring-slate-200"}`}>{d}</button>
                    ))}
                  </>
                )}
                {arac === "dalga" && (
                  <>
                    <span className="font-semibold">Tepe sayısı</span>
                    {[1, 2, 3, 4].map((d) => (
                      <button key={d} type="button" aria-pressed={dalgaSayisi === d} onClick={() => setDalgaSayisi(d)}
                        className={`h-9 min-w-9 rounded-lg font-semibold ${dalgaSayisi === d ? "bg-brand-100 text-brand-700" : "bg-white ring-1 ring-slate-200"}`}>{d}</button>
                    ))}
                  </>
                )}
                {arac === "baglayici" && (
                  <>
                    <button type="button" aria-pressed={!baglayiciTuruSecildi}
                      title="Tür uçlara göre seçilir: devre elemanları arası tel, akış kutusunda dik ok, diğerlerinde düz ok"
                      onClick={() => { baglayiciTuruSecildiRef.current = false; setBaglayiciTuruSecildi(false); setBaglayiciKaynakUcu(null); }}
                      className={`h-9 rounded-lg px-2.5 font-semibold ${!baglayiciTuruSecildi ? "bg-brand-100 text-brand-700" : "bg-white ring-1 ring-slate-200 hover:bg-slate-50"}`}>
                      Otomatik
                    </button>
                    {BAGLAYICI_TURLERI.map((t) => {
                      const secili = baglayiciTuruSecildi && t.ayar.stil === baglayiciAyari.stil && t.ayar.okUcu === baglayiciAyari.okUcu;
                      return (
                        <button key={t.id} type="button" title={t.ipucu} aria-pressed={secili}
                          onClick={() => { setBaglayiciAyari({ ...t.ayar, ...(baglayiciAyari.serbest ? { serbest: true } : {}) }); setBaglayiciKaynakUcu(null); }}
                          className={`h-9 rounded-lg px-2.5 font-semibold ${secili ? "bg-brand-100 text-brand-700" : "bg-white ring-1 ring-slate-200 hover:bg-slate-50"}`}>
                          {t.ad}
                        </button>
                      );
                    })}
                    <button type="button" aria-pressed={!baglayiciAyari.serbest}
                      title="Kapalıyken şeklin üstüne tıklamak şekle yapışmaz: ok tıkladığınız noktadan başlar/biter"
                      onClick={() => setBaglayiciAyariDurum({ ...baglayiciAyari, serbest: !baglayiciAyari.serbest })}
                      className={`h-9 rounded-lg px-2.5 font-semibold ${!baglayiciAyari.serbest ? "bg-slate-100 text-slate-700" : "bg-amber-50 text-amber-800 ring-1 ring-amber-200"}`}>
                      Şekle yapış: {baglayiciAyari.serbest ? "kapalı" : "açık"}
                    </button>
                    <span className="font-semibold text-brand-700">
                      {baglayiciKaynakUcu ? "Şimdi HEDEFE tıklayın ya da bırakın" : "Bir şekilden ötekine sürükleyin ya da sırayla tıklayın"}
                    </span>
                  </>
                )}
                {aracIpucu[arac] && <span>{aracIpucu[arac]}</span>}
                <button type="button" onClick={() => { setArac("sec"); setBaglayiciKaynakUcu(null); }}
                  className="h-9 rounded-lg bg-slate-800 px-2.5 font-semibold text-white hover:bg-slate-700">
                  Bitir (Esc)
                </button>
              </div>
            </div>
          )}
          {/* İLK AÇILIŞ İPUCU: boş tuvalde ne yapılacağını söyler. */}
          {sekiller.length === 0 && !taslak && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
              <div className="max-w-md rounded-2xl bg-white/90 px-5 py-4 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
                <p className="font-semibold text-slate-700">Soldaki kütüphaneden bir şekil seçin ya da üstteki araçlarla çizin.</p>
                <p className="mt-1">Arama kutusuna <b>makara</b>, <b>parabol</b>, <b>dik üçgen</b> ya da <b>y = x^2 − 4</b> yazabilirsiniz. Köşeleri sürükleyin, etiketlere çift tıklayın, mavi halkalardan sürükleyerek bağlayın.</p>
              </div>
            </div>
          )}
        </div>

        {!odakKipi && solAcik && (
          <aside
            aria-label="Şekil ve şablon kütüphanesi"
            className="order-first flex min-h-0 w-[300px] shrink-0 flex-col rounded-xl border border-slate-200 bg-white max-lg:absolute max-lg:inset-y-0 max-lg:left-0 max-lg:z-30 max-lg:shadow-2xl"
          >
            <SolKutuphane
              girdiler={kutuphaneListesi}
              onEkle={kutuphanedenEkle}
              onSablonSil={(id) => { const sb = kullaniciSablonlari.find((x) => x.id === id); if (sb) setSilinecekSablon(sb); }}
              onKapat={() => setSolAcik(false)}
              sonEklenen={sonEklenen}
              ekBolumler={{
                matematik: {
                  baslik: "Yazarak çiz ve diğer matematik araçları",
                  icerik: <MatematikSeridi
                    onGrafik={(grafik) => fizikNesnesiEkle("grafik", { grafik })}
                    onIstatistik={(istatistik) => fizikNesnesiEkle("istatistik", { istatistik })}
                    onSema={(sema) => fizikNesnesiEkle("sema", { sema })}
                  />,
                },
                fizik: {
                  baslik: "Noktaları yazarak grafik çiz",
                  icerik: <GrafikSeridi onSablon={grafikSablonuEkle} onUclu={() => grafikUcluEkle()} onHizli={(n, b) => fizikNesnesiEkle("grafik", { grafik: noktalardanGrafik(n, b) })} />,
                },
                kimya: {
                  baslik: "Zincir çizici, özel molekül ve diğer kimya araçları",
                  icerik: <KimyaSeridi
                    onLab={(nesne) => fizikNesnesiEkle(nesne)}
                    onKimya={(kimya) => fizikNesnesiEkle("kimya", { kimya })}
                    onGrafik={(grafik) => fizikNesnesiEkle("grafik", { grafik })}
                  />,
                },
                akis: {
                  baslik: "Yazarak diz (metinden akış şeması)",
                  icerik: (
        <div className="mt-2 rounded-xl border border-brand-200 bg-brand-50/40 p-2">
          <div className="flex flex-col gap-2">
            <textarea
              aria-label="Akış şeması tarifi"
              value={tarifMetni}
              onChange={(e) => setTarifMetni(e.target.value)}
              rows={4}
              spellCheck={false}
              className="min-w-0 flex-1 resize-y rounded-md border border-slate-200 px-2 py-1 font-mono text-[11px] leading-relaxed text-slate-700"
              placeholder={"(Başla) -> /Sayıyı oku/ -> <Çift mi?> -evet-> [Çifttir yazdır] -> (Bitir)\n<Çift mi?> -hayır-> [Tektir yazdır] -> (Bitir)"}
            />
            <div className="flex shrink-0 flex-col gap-1">
              <button
                type="button"
                onClick={tarifiDiz}
                disabled={!tarifMetni.trim()}
                className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Diz
              </button>
              <span className="text-[10px] leading-snug text-slate-500">
                ( ) başla · [ ] işlem · &lt; &gt; karar · / / girdi-çıktı ·{" "}
                <code>-evet-&gt;</code> etiketli ok. Aynı metni tekrar yazmak
                aynı kutuya bağlar (döngü).
              </span>
            </div>
          </div>
          {tarifUyarilari.length > 0 && (
            <ul className="mt-1.5 space-y-0.5 text-[10px] font-semibold text-amber-700">
              {tarifUyarilari.map((u) => <li key={u}>⚠ {u}</li>)}
            </ul>
          )}
        </div>
                  ),
                },
              }}
            />
          </aside>
        )}

        {/* AYRINTILI PANEL. Seçim varken içerik DOM'da durur (gizliyken `hidden`);
            karmaşık nesnede kendiliğinden, basit şekilde "Ayrıntılar" ile açılır. */}
        <aside
          aria-label="Seçili şekil ayarları"
          aria-hidden={!panelAcik ? true : undefined}
          className={`min-h-0 w-[370px] shrink-0 flex-col rounded-xl border border-slate-200 bg-white max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:z-30 max-lg:max-w-[calc(100%-16px)] max-lg:shadow-2xl ${panelAcik ? "flex" : "hidden"}`}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-3 py-1.5">
            <span className="text-sm font-bold text-slate-700">
              {seciliIds.length > 1 ? `${seciliIds.length} şekil` : birincil?.tur === "fizik" ? FIZIK_TANIMLARI[birincil.nesne]?.ad ?? "Ayarlar" : "Ayarlar"}
            </span>
            <button type="button" aria-label="Ayrıntılı paneli kapat" onClick={() => setSagPanelAcik(false)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X size={16} /></button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {seciliIds.length === 1 && (
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-600 empty:hidden">
        {seciliIds.length === 1 && sekiller.find((s) => s.id === seciliId)?.tur === "dikdortgen" && (() => {
          const secili = sekiller.find((s) => s.id === seciliId) as Extract<Sekil, { tur: "dikdortgen" }>;
          const serbest = !!secili.serbestKoseler;
          return (
            <button type="button" title="Köşeleri üçgende olduğu gibi tek tek, bağımsız sürüklenebilir yapar (dikdörtgen bir yamuğa/paralelkenara dönüşebilir)"
              onClick={seciliDikdortgenSerbestlikDegistir}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-semibold ${serbest ? "bg-brand-100 text-brand-700" : "bg-white ring-1 ring-slate-200"}`}>
              {serbest ? <Unlock size={14} /> : <Lock size={14} />} Köşeleri serbest bırak
            </button>
          );
        })()}
        {(arac === "metin" || sekiller.find((s) => s.id === seciliId)?.tur === "metin") && (
          <>
            <label className="ml-auto inline-flex items-center gap-1.5">
              Metin punto
              <input type="number" min={8} max={48} value={metinPunto}
                onFocus={() => {
                  // Odaklanma anındaki değeri + tüm şekil listesini sakla: onBlur'da
                  // gerçek bir değişiklik olduysa geçmişe YAZILACAK anlık görüntü bu.
                  metinPuntoOdaklanmaRef.current = { punto: metinPunto, anlik: sekillerRef.current };
                }}
                onChange={(e) => {
                  const yeni = Math.max(8, Math.min(48, Number(e.target.value) || METIN_PUNTO));
                  setMetinPunto(yeni);
                  // seciliOzellikGuncelle her tuş vuruşunda tarihceyeKaydet çağırıyordu
                  // ("24" yazmak 2+ geçmiş kaydı üretiyordu); burada yalnızca önizleme
                  // güncellenir, geçmişe yazma onBlur'a bırakılır.
                  const secili = sekiller.find((s) => s.id === seciliId);
                  if (secili?.tur === "metin") {
                    setSekiller((mevcut) => mevcut.map((s) => seciliIds.includes(s.id) ? { ...s, punto: yeni } as Sekil : s));
                  }
                }}
                onBlur={() => {
                  const odaklanma = metinPuntoOdaklanmaRef.current;
                  metinPuntoOdaklanmaRef.current = null;
                  if (odaklanma && Math.abs(odaklanma.punto - metinPunto) > 0.001) tarihceyeKaydet(odaklanma.anlik);
                }}
                className="w-16 rounded-md border border-slate-200 bg-white px-2 py-1" />
              {metinPunto !== METIN_PUNTO && (
                <button type="button" title={`Punto varsayılana (${METIN_PUNTO}) dönsün`} data-testid="metin-punto-sifirla"
                  onClick={() => {
                    setMetinPunto(METIN_PUNTO);
                    const secili = sekiller.find((s) => s.id === seciliId);
                    if (secili?.tur === "metin") seciliOzellikGuncelle({ punto: METIN_PUNTO });
                  }}
                  className="rounded-md bg-white px-1.5 py-1 text-[11px] font-semibold ring-1 ring-slate-200">
                  Varsayılan ({METIN_PUNTO})
                </button>
              )}
            </label>
            <div className="flex items-center gap-1">
              <span>Satır aralığı</span>
              {([["Sıkı", 1], ["Normal", 1.2], ["Geniş", 1.6]] as const).map(([ad, deger]) => (
                <button key={ad} type="button" aria-pressed={Math.abs(metinSatirAraligi - deger) < 0.01} onClick={() => {
                  setMetinSatirAraligi(deger);
                  const secili = sekiller.find((s) => s.id === seciliId);
                  if (secili?.tur === "metin") seciliOzellikGuncelle({ satirAraligi: deger });
                }} className={`rounded-md px-2 py-1 font-semibold ${Math.abs(metinSatirAraligi - deger) < 0.01 ? "bg-brand-100 text-brand-700" : "bg-white ring-1 ring-slate-200"}`}>
                  {ad}
                </button>
              ))}
            </div>
          </>
        )}
        {sekiller.find((s) => s.id === seciliId)?.tur === "dogru" && (
          <div className="flex items-center gap-1">
            <span>Ok ucu</span>
            {(["yok", "son", "cift"] as const).map((deger) => (
              <button key={deger} type="button" onClick={() => seciliOzellikGuncelle({ okUcu: deger })}
                className={`rounded-md px-2 py-1 font-semibold ${
                  (sekiller.find((s) => s.id === seciliId) as Extract<Sekil, { tur: "dogru" }> | undefined)?.okUcu === deger
                    ? "bg-brand-100 text-brand-700" : "bg-white ring-1 ring-slate-200"
                }`}>{deger === "yok" ? "Yok" : deger === "son" ? "Tek" : "Çift"}</button>
            ))}
          </div>
        )}
        {(() => {
          const secili = sekiller.find((s) => s.id === seciliId);
          const taranabilir = ["dikdortgen", "elips", "ucgen", "cokgen"].includes(secili?.tur ?? arac);
          if (!taranabilir) return null;
          return (
            <div className="flex items-center gap-1" aria-label="Tarama deseni">
              <span>Tarama</span>
              {(["yok", "capraz", "nokta"] as TaramaTipi[]).map((deger) => (
                <button key={deger} type="button" aria-pressed={tarama === deger} onClick={() => {
                  setTarama(deger);
                  if (secili && ["dikdortgen", "elips", "ucgen", "cokgen"].includes(secili.tur)) seciliOzellikGuncelle({ tarama: deger });
                }} className={`rounded-md px-2 py-1 font-semibold ${tarama === deger ? "bg-brand-100 text-brand-700" : "bg-white ring-1 ring-slate-200"}`}>
                  {deger === "yok" ? "Yok" : deger === "capraz" ? "Çapraz" : "Noktalı"}
                </button>
              ))}
            </div>
          );
        })()}
              </div>
            )}
      {seciliIds.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <>
            <button type="button" title={`Seçili şekli çoğalt (${kisayol("Ctrl+D")})`} onClick={seciliCogalt}
              className={`${ustCls} border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100`}>
              <Copy size={15} /> Çoğalt
            </button>
            <button type="button" title="Seçili şekli öne getir" onClick={() => seciliKatmanDegistir(true)}
              className={`${ustCls} border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}>
              <Layers size={15} /> Öne
            </button>
            <button type="button" title="Seçili şekilleri arkaya gönder" onClick={() => seciliKatmanDegistir(false)}
              className={`${ustCls} border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}>
              <Layers size={15} /> Arkaya
            </button>
            {seciliIds.length > 1 && (
              <button type="button" title="Seçili şekilleri grupla" onClick={secilenleriGrupla}
                className={`${ustCls} border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}>
                <Copy size={15} /> Grupla
              </button>
            )}
            {seciliIds.some((id) => sekiller.find((s) => s.id === id)?.grupId) && (
              <button type="button" title="Grubu çöz" onClick={secilenGrubuCoz}
                className={`${ustCls} border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}>
                <Copy size={15} /> Grubu çöz
              </button>
            )}
            <button type="button" title="Seçili şekli sil" onClick={seciliSil}
              className={`${ustCls} border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100`}>
              <Trash2 size={15} /> Seçileni sil
            </button>
            <button type="button" title="Seçili şekilleri sonraki sorularda kullanmak için sakla" onClick={() => setSablonKaydiAcik(true)}
              className={`${ustCls} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}>
              <Copy size={15} /> Şablon kaydet
            </button>
          </>
        </div>
      )}
      {seciliIds.length > 1 && (
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-brand-100 bg-brand-50/60 px-3 py-2 text-xs">
          <span className="mr-1 font-semibold text-brand-700">{seciliIds.length} şekil seçili</span>
          <button type="button" onClick={() => secilenleriHizala("sol")} className="rounded bg-white px-2 py-1 ring-1 ring-brand-100">Sola hizala</button>
          <button type="button" onClick={() => secilenleriHizala("orta-x")} className="rounded bg-white px-2 py-1 ring-1 ring-brand-100">Dikey merkez</button>
          <button type="button" onClick={() => secilenleriHizala("ust")} className="rounded bg-white px-2 py-1 ring-1 ring-brand-100">Üste hizala</button>
          <button type="button" onClick={() => secilenleriHizala("orta-y")} className="rounded bg-white px-2 py-1 ring-1 ring-brand-100">Yatay merkez</button>
          <button type="button" disabled={seciliIds.length < 3} onClick={() => secilenleriDagit("x")} className="rounded bg-white px-2 py-1 ring-1 ring-brand-100 disabled:opacity-40">Yatay dağıt</button>
          <button type="button" disabled={seciliIds.length < 3} onClick={() => secilenleriDagit("y")} className="rounded bg-white px-2 py-1 ring-1 ring-brand-100 disabled:opacity-40">Dikey dağıt</button>
        </div>
      )}
      {seciliIds.length === 1 && (() => {
        const secili = sekiller.find((s) => s.id === seciliId);
        if (!secili) return null;
        const kutu = sekilGeometriKutusu(secili);
        const boyutVar = secili.tur !== "metin";
        const alanlar = [
          ["x", "X", kutu.x], ["y", "Y", kutu.y],
          ...(boyutVar ? [["w", "Genişlik", kutu.w], ["h", "Yükseklik", kutu.h]] : []),
          ["donus", "Açı", secili.donus ?? 0],
        ] as ["x" | "y" | "w" | "h" | "donus", string, number][];
        return (
          <details className="group mb-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs" aria-label="Kesin ölçüler">
            <summary className="cursor-pointer select-none font-semibold text-slate-700">Kesin ölçüler <span className="font-normal text-slate-400">(konum, boyut, açı)</span></summary>
            <div className="mt-2 flex flex-wrap items-end gap-2">
            {alanlar.map(([alan, etiket, deger]) => (
              <label key={`${secili.id}-${alan}-${deger}`} className="grid gap-0.5 text-[10px] font-semibold text-slate-500">
                {etiket}
                <input aria-label={etiket} type="number" step={alan === "donus" ? 1 : 0.5} defaultValue={Number(deger.toFixed(2))}
                  onBlur={(e) => kesinGeometriGuncelle(alan, e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                  className="w-20 rounded-md border border-slate-200 px-2 py-1 text-xs font-normal text-slate-700" />
              </label>
            ))}
            <span className="pb-1 text-[10px] text-slate-400">px · açı derece</span>
            </div>
          </details>
        );
      })()}

      {/* SEÇİLİ TEMEL ŞEKİL(LER): çizgi rengi ve (kapalı şekillerde) iç dolgu.
          Seçimdeki temel şekillerin hepsine uygulanır. "Siyah"/"Dolgusuz"
          alanı SİLER: eski belge biçimi aynen korunur. */}
      {(() => {
        const temeller = sekiller.filter((x) => seciliIds.includes(x.id) && TEMEL_RENKLI_TURLER.includes(x.tur));
        if (!temeller.length) return null;
        const kapalilar = temeller.filter((x) => TEMEL_DOLGULU_TURLER.includes(x.tur));
        const ilk = temeller[temeller.length - 1] as { renk?: string };
        const ilkKapali = kapalilar[kapalilar.length - 1] as { dolgu?: string } | undefined;
        const boyaUygula = (alan: "renk" | "dolgu", deger: string | undefined) => {
          const turler = alan === "renk" ? TEMEL_RENKLI_TURLER : TEMEL_DOLGULU_TURLER;
          tarihceyeKaydet();
          setSekiller((mevcut) => mevcut.map((x) => {
            if (!seciliIds.includes(x.id) || !turler.includes(x.tur)) return x;
            const kopya = { ...x } as Record<string, unknown>;
            if (deger) kopya[alan] = deger; else delete kopya[alan];
            return kopya as Sekil;
          }));
        };
        const kutuSinifi = (secili: boolean) => `h-6 w-6 rounded-md border transition ${secili ? "border-brand-500 ring-2 ring-brand-200" : "border-slate-300 hover:border-slate-400"}`;
        return (
          <div aria-label="Renk ve dolgu" className="mb-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-12 shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-500">Renk</span>
              {TEMEL_RENK_PALETI.map((r) => (
                <button key={r.ad} type="button" title={r.ad} aria-label={`Renk: ${r.ad}`}
                  aria-pressed={(ilk.renk ?? undefined) === r.deger}
                  onClick={() => boyaUygula("renk", r.deger)}
                  className={kutuSinifi((ilk.renk ?? undefined) === r.deger)}
                  style={{ background: r.deger ?? MUREKKEP }} />
              ))}
            </div>
            {ilkKapali && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="w-12 shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-500">Dolgu</span>
                {TEMEL_DOLGU_PALETI.map((r) => (
                  <button key={r.ad} type="button" title={r.ad} aria-label={`Dolgu: ${r.ad}`}
                    aria-pressed={(ilkKapali.dolgu ?? undefined) === r.deger}
                    onClick={() => boyaUygula("dolgu", r.deger)}
                    className={kutuSinifi((ilkKapali.dolgu ?? undefined) === r.deger)}
                    style={{
                      background: r.deger ?? "#ffffff",
                      backgroundImage: r.deger ? undefined : "linear-gradient(45deg, #e2e8f0 25%, transparent 25%, transparent 75%, #e2e8f0 75%)",
                      backgroundSize: r.deger ? undefined : "8px 8px",
                    }} />
                ))}
                <span className="text-[10px] text-slate-400">Taralı dolgu: üstteki “Tarama”.</span>
              </div>
            )}
          </div>
        );
      })()}

      {/* SEÇİLİ FİZİK NESNESİ: etiket (m_1, \theta…), yer, çevir/döndür, dolgu. */}
      {(() => {
        const seciliFizik =
          seciliIds.length === 1
            ? sekiller.find((x) => x.id === seciliIds[0] && x.tur === "fizik")
            : undefined;
        if (!seciliFizik || seciliFizik.tur !== "fizik") return null;
        if (seciliFizik.nesne === "grafik") {
          return (
            <GrafikSecimPaneli
              sekil={seciliFizik}
              tarihceyeKaydet={tarihceyeKaydet}
              onUcluEkle={(x0, v0, evreler) => grafikUcluEkle(x0, v0, evreler)}
              guncelle={(yama) =>
                setSekiller((mevcut) =>
                  mevcut.map((x) => (x.id === seciliFizik.id && x.tur === "fizik" ? { ...x, ...yama } : x)),
                )
              }
            />
          );
        }
        if (seciliFizik.nesne === "kimya") {
          return (
            <KimyaPaneli
              sekil={seciliFizik}
              tarihceyeKaydet={tarihceyeKaydet}
              guncelle={(yama) =>
                setSekiller((mevcut) =>
                  mevcut.map((x) => (x.id === seciliFizik.id && x.tur === "fizik" ? { ...x, ...yama } : x)),
                )
              }
            />
          );
        }
        if (seciliFizik.nesne === "istatistik" || seciliFizik.nesne === "sema") {
          const Panel = seciliFizik.nesne === "istatistik" ? IstatistikPaneli : SemaPaneli;
          return (
            <Panel
              sekil={seciliFizik}
              tarihceyeKaydet={tarihceyeKaydet}
              guncelle={(yama) =>
                setSekiller((mevcut) =>
                  mevcut.map((x) => (x.id === seciliFizik.id && x.tur === "fizik" ? { ...x, ...yama } : x)),
                )
              }
            />
          );
        }
        return (
          <FizikSecimPaneli
            sekil={seciliFizik}
            tarihceyeKaydet={tarihceyeKaydet}
            onVektorEkle={(yeni) => {
              tarihceyeKaydet();
              const v: Sekil = { id: sekilId(), tur: "baglayici", kalinlik, okUcu: "son", stil: "vektor", ...yeni };
              setSekiller((mevcut) => [...mevcut, v]);
              window.setTimeout(() => secimAyarla([v.id]), 0);
            }}
            guncelle={(yama) =>
              setSekiller((mevcut) =>
                mevcut.map((x) => (x.id === seciliFizik.id && x.tur === "fizik" ? { ...x, ...yama } : x)),
              )
            }
          />
        );
      })()}

      {/* SEÇİLİ AKIŞ KUTUSU: metin ve dolgu burada düzenlenir.
          Metin ayrı bir modal yerine yerinde bir alan: kutunun içeriği asıl
          işin kendisi, her düzenleme için modal açmak akışı kesiyor. */}
      {(() => {
        const seciliAkis =
          seciliIds.length === 1
            ? sekiller.find((x) => x.id === seciliIds[0] && x.tur === "akis")
            : undefined;
        if (!seciliAkis || seciliAkis.tur !== "akis") return null;
        const guncelle = (yama: Partial<Extract<Sekil, { tur: "akis" }>>) => {
          setSekiller((mevcut) =>
            mevcut.map((x) => (x.id === seciliAkis.id && x.tur === "akis" ? { ...x, ...yama } : x)),
          );
        };
        return (
          <div ref={seciliPanelRef} className="mt-2 rounded-xl border border-brand-200 bg-brand-50/50 p-2">
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Kutu metni
              </span>
              <textarea
                aria-label="Akış kutusu metni"
                value={seciliAkis.metin}
                onChange={(e) => guncelle({ metin: e.target.value })}
                /* Geçmişe HER tuşta değil, alandan çıkınca kaydediliyor: aksi
                   halde tek bir cümle 30 geri alma adımı üretirdi. */
                onFocus={() => tarihceyeKaydet()}
                rows={2}
                disabled={!!seciliAkis.denklem}
                className="min-w-0 flex-1 resize-y rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 disabled:bg-slate-100 disabled:text-slate-400"
                placeholder="Kutunun içinde görünecek metin (Enter ile satır kırabilirsiniz)"
              />
            </div>
            {/* DENKLEM: kutu ya metin ya denklem gösterir. Metin alanı devre
                dışı kalıyor ama İÇERİĞİ SİLİNMİYOR — denklem kaldırılınca geri
                geliyor. */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                İçerik
              </span>
              <button
                type="button"
                onClick={() => setDenklemKutusuId(seciliAkis.id)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-brand-300 hover:bg-brand-50"
              >
                <Sigma className="h-3.5 w-3.5" />
                {seciliAkis.denklem ? "Denklemi düzenle" : "Denklem ekle"}
              </button>
              {seciliAkis.denklem && (
                <button
                  type="button"
                  onClick={() => { tarihceyeKaydet(); guncelle({ denklem: undefined }); }}
                  className="rounded-md border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50"
                >
                  Denklemi kaldır
                </button>
              )}
              {seciliAkis.denklem && (
                <span className="text-[10px] text-slate-500">
                  Kutu denklemi gösteriyor; metin saklı, kaldırınca geri gelir.
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Dolgu
              </span>
              {AKIS_DOLGU_PALETI.map((renk) => (
                <button
                  key={renk.ad}
                  type="button"
                  title={renk.ad}
                  aria-label={`Dolgu: ${renk.ad}`}
                  aria-pressed={(seciliAkis.dolgu ?? undefined) === renk.deger}
                  onClick={() => { tarihceyeKaydet(); guncelle({ dolgu: renk.deger }); }}
                  className={`h-6 w-6 rounded-md border transition ${
                    (seciliAkis.dolgu ?? undefined) === renk.deger
                      ? "border-brand-500 ring-2 ring-brand-200"
                      : "border-slate-300 hover:border-slate-400"
                  }`}
                  style={{
                    background: renk.deger ?? "#ffffff",
                    backgroundImage: renk.deger
                      ? undefined
                      : "linear-gradient(45deg, #e2e8f0 25%, transparent 25%, transparent 75%, #e2e8f0 75%)",
                    backgroundSize: renk.deger ? undefined : "8px 8px",
                  }}
                />
              ))}
              <span className="mx-1 h-5 w-px bg-slate-200" />
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Şekil
              </span>
              {AKIS_ARACLARI.map(({ sekil: bicim, etiket }) => (
                <button
                  key={bicim}
                  type="button"
                  title={etiket}
                  aria-label={`Şekli değiştir: ${etiket}`}
                  aria-pressed={seciliAkis.akisSekli === bicim}
                  onClick={() => { tarihceyeKaydet(); guncelle({ akisSekli: bicim }); }}
                  className={`inline-flex h-6 w-7 items-center justify-center rounded-md border transition ${
                    seciliAkis.akisSekli === bicim
                      ? "border-brand-500 bg-white text-brand-700"
                      : "border-slate-300 bg-white text-slate-500 hover:border-slate-400"
                  }`}
                >
                  <AkisSimge sekil={bicim} />
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* SEÇİLİ BAĞLAYICI: etiket ve ok yönü. "Evet"/"Hayır" hazır düğme
          çünkü karar kutusundan çıkan her dalda bu ikisinden biri yazılıyor. */}
      {(() => {
        const secili =
          seciliIds.length === 1
            ? sekiller.find((x) => x.id === seciliIds[0] && x.tur === "baglayici")
            : undefined;
        if (!secili || secili.tur !== "baglayici") return null;
        const guncelle = (yama: Partial<Extract<Sekil, { tur: "baglayici" }>>) => {
          tarihceyeKaydet();
          setSekiller((mevcut) =>
            mevcut.map((x) => (x.id === secili.id && x.tur === "baglayici" ? { ...x, ...yama } : x)),
          );
        };
        return (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50/50 p-2">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Ok etiketi
            </span>
            <input
              aria-label="Bağlayıcı etiketi"
              value={secili.etiket ?? ""}
              onChange={(e) =>
                setSekiller((mevcut) =>
                  mevcut.map((x) =>
                    x.id === secili.id && x.tur === "baglayici" ? { ...x, etiket: e.target.value } : x,
                  ),
                )
              }
              onFocus={() => tarihceyeKaydet()}
              placeholder="ör. Evet"
              className="w-28 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700"
            />
            {["Evet", "Hayır"].map((hazir) => (
              <button
                key={hazir}
                type="button"
                onClick={() => guncelle({ etiket: hazir })}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
              >
                {hazir}
              </button>
            ))}
            <span className="mx-1 h-5 w-px bg-slate-200" />
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Ok ucu</span>
            {([
              ["son", "Tek"],
              ["cift", "Çift"],
              ["yok", "Yok"],
            ] as const).map(([deger, etiket]) => (
              <TogglePill
                key={deger}
                aktif={(secili.okUcu ?? "son") === deger}
                onClick={() => guncelle({ okUcu: deger })}
              >
                {etiket}
              </TogglePill>
            ))}
          </div>
        );
      })()}
      {/* SEÇİLİ BAĞLAYICI: biçim (dik/düz/yay/vektör) ve uç yönleri. */}
      {(() => {
        const secili =
          seciliIds.length === 1
            ? sekiller.find((x) => x.id === seciliIds[0] && x.tur === "baglayici")
            : undefined;
        if (!secili || secili.tur !== "baglayici") return null;
        const yama = (p: Partial<Extract<Sekil, { tur: "baglayici" }>>) => {
          tarihceyeKaydet();
          setSekiller((mevcut) =>
            mevcut.map((x) => (x.id === secili.id && x.tur === "baglayici" ? { ...x, ...p } : x)),
          );
        };
        return (
          <BaglayiciBicimPaneli
            stil={secili.stil ?? "dik"}
            kaynakYon={"sekilId" in secili.kaynak ? secili.kaynak.yon ?? "oto" : "oto"}
            hedefYon={"sekilId" in secili.hedef ? secili.hedef.yon ?? "oto" : "oto"}
            kaynakSekilde={"sekilId" in secili.kaynak}
            hedefSekilde={"sekilId" in secili.hedef}
            renk={secili.renk}
            onRenk={(r) => yama({ renk: r })}
            onStil={(stil) =>
              yama(
                stil === "dik"
                  ? { stil: undefined }
                  : { stil, ...(secili.okUcu === undefined && stil === "vektor" ? { okUcu: "son" as const } : {}) },
              )
            }
            onYon={(uc, yon) =>
              yama(
                uc === "kaynak"
                  ? { kaynak: { ...(secili.kaynak as { sekilId: string }), yon } }
                  : { hedef: { ...(secili.hedef as { sekilId: string }), yon } },
              )
            }
          />
        );
      })()}
          </div>
        </aside>
      </div>
      {hata && (
        <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{hata}</p>
      )}

      <div className="mt-2 flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-white pt-2">
        {inlineMod && satirIciYukseklik && (
          <div className="mr-auto flex flex-wrap items-center gap-1.5 text-xs" role="group" aria-label="Metin içindeki çizim boyu">
            <span className="font-semibold text-slate-600">Metindeki boy</span>
            {([["Küçük", 70], ["Orta", 120], ["Büyük", 180]] as const).map(([ad, px]) => (
              <button key={ad} type="button" aria-pressed={satirIciYukseklik.deger === px}
                onClick={() => satirIciYukseklik.onChange(px)}
                className={`rounded-lg border px-2.5 py-1 font-semibold transition ${satirIciYukseklik.deger === px ? "border-brand-300 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                {ad}
              </button>
            ))}
            <label className="inline-flex items-center gap-1 text-slate-500">
              <input type="number" min={20} max={200} step={5} aria-label="Çizim yüksekliği (px)"
                value={satirIciYukseklik.deger}
                onChange={(e) => satirIciYukseklik.onChange(Math.min(200, Math.max(20, Math.round(Number(e.target.value) || 120))))}
                className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-xs" />
              px
            </label>
            <span className="text-[10px] text-slate-400">En-boy oranı korunur.</span>
          </div>
        )}
        <VazgecDugmesi onClick={kapatma.kapatIstendi} />
        {inlineMod ? (
          <button type="button" onClick={() => olustur("inline")}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700">
            <PenTool size={15} /> {duzenlemeModu ? "Değişiklikleri Kaydet" : "Metne Ekle"}
          </button>
        ) : (
          <>
            {seciliSoruVar && !duzenlemeModu && (
              <button type="button" onClick={() => olustur("secili")}
                className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100">
                <PenTool size={15} /> Seçili soruya ekle
              </button>
            )}
            <button type="button" onClick={() => olustur("yeni")}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700">
              <PenTool size={15} /> {duzenlemeModu ? "Değişiklikleri Kaydet" : "Yeni Soru Olarak Ekle"}
            </button>
          </>
        )}
      </div>
      {sablonKaydiAcik && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="sablon-kaydet-baslik" className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h4 id="sablon-kaydet-baslik" className="font-bold text-slate-800">Seçimi şablon olarak kaydet</h4>
            <p className="mt-2 text-sm text-slate-500">Bu şablon sonraki sorularda “Şablonlarım” bölümünden kullanılabilir.</p>
            <label className="mt-3 grid gap-1 text-xs font-semibold text-slate-600">
              <span className="flex items-center justify-between">
                Şablon adı
                <span className="font-normal text-slate-400">{sablonAdi.length}/{SABLON_ADI_SINIRI}</span>
              </span>
              <input autoFocus maxLength={SABLON_ADI_SINIRI} value={sablonAdi}
                onChange={(e) => setSablonAdi(e.target.value.slice(0, SABLON_ADI_SINIRI))}
                onKeyDown={(e) => { if (e.key === "Enter") kullaniciSablonuKaydet(); if (e.key === "Escape") setSablonKaydiAcik(false); }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-brand-400" />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setSablonKaydiAcik(false)} className="rounded-lg border px-3 py-2 text-sm">Vazgeç</button>
              <button type="button" disabled={!sablonAdi.trim()} onClick={kullaniciSablonuKaydet}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">Kaydet</button>
            </div>
          </div>
        </div>
      )}
      {temizleOnayi && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h4 className="font-bold text-slate-800">Tüm çizim temizlensin mi?</h4>
            <p className="mt-2 text-sm text-slate-500">Bu işlem geri alınabilir.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setTemizleOnayi(false)} className="rounded-lg border px-3 py-2 text-sm">Vazgeç</button>
              <button type="button" onClick={hepsiniTemizle} className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white">Temizle</button>
            </div>
          </div>
        </div>
      )}
      {dizmeOnayi && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h4 className="font-bold text-slate-800">Tuvaldeki çizim değiştirilsin mi?</h4>
            <p className="mt-2 text-sm text-slate-500">
              Yazdığınız şema dizilecek ve tuvaldeki mevcut şekillerin yerini alacak.
              Geri alınabilir (Geri al).
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setDizmeOnayi(false)} className="rounded-lg border px-3 py-2 text-sm">Vazgeç</button>
              <button
                type="button"
                onClick={() => { setDizmeOnayi(false); tarifiUygula(akisMetniniCoz(tarifMetni)); }}
                className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
              >
                Diz
              </button>
            </div>
          </div>
        </div>
      )}
      {kapatma.onayAcik && (
        <KaydedilmemisUyarisi
          baslik="Kaydedilmemiş çizim var"
          aciklama="Çizimde yaptığınız değişiklikler henüz soruya eklenmedi. Kapatırsanız kaybolur."
          atEtiketi="Kaydetmeden kapat"
          vazgecEtiketi="Çizime dön"
          onVazgec={kapatma.vazgec}
          onAt={kapatma.onayla}
        />
      )}
      {silinecekSablon && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h4 className="font-bold text-slate-800">“{silinecekSablon.ad}” şablonu silinsin mi?</h4>
            <p className="mt-2 text-sm text-slate-500">Bu işlem geri alınamaz — şablon başka sorularda da kullanılamaz hale gelir.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setSilinecekSablon(null)} className="rounded-lg border px-3 py-2 text-sm">Vazgeç</button>
              <button type="button" onClick={() => {
                kullaniciSablonlariniSakla(kullaniciSablonlari.filter((x) => x.id !== silinecekSablon.id));
                setSilinecekSablon(null);
              }} className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white">Şablonu sil</button>
            </div>
          </div>
        </div>
      )}
      {/* AKIŞ KUTUSUNUN DENKLEMİ. Denklem editörü olduğu gibi kullanılıyor;
          buradan alınan tek şey `denklemVerisi` — üretilen PNG'ye gerek yok,
          kutu denklemi ÇİZİM ANINDA motorla çiziyor (bkz. akisDenklemiCiz).
          Görsel gömülseydi kutu büyütülünce bulanırdı. */}
      {denklemKutusuId && (() => {
        const kutu = sekiller.find((x) => x.id === denklemKutusuId && x.tur === "akis");
        if (!kutu || kutu.tur !== "akis") return null;
        return (
          <DenklemEditoruModal
            inlineMod
            duzenlemeModu={!!kutu.denklem}
            baslangicBelgesi={kutu.denklem}
            onClose={() => setDenklemKutusuId(null)}
            onOlustur={(cikti) => {
              tarihceyeKaydet();
              setSekiller((mevcut) =>
                mevcut.map((x) =>
                  x.id === denklemKutusuId && x.tur === "akis"
                    ? { ...x, denklem: cikti.denklemVerisi }
                    : x,
                ),
              );
              setDenklemKutusuId(null);
            }}
          />
        );
      })()}
    </ModalKabuk>
  );
}
