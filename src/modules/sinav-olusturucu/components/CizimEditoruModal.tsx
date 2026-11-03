import type { PointerEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useDisariTiklama } from "@/lib/disariTiklama";
import {
  ArrowRight,
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
import { FIZIK_TANIMLARI, fizikDisPayi, type FizikGrubu } from "../cizim/fizik";
import { varsayilanIstatistik } from "../cizim/istatistik";
import { varsayilanSema } from "../cizim/sema";
import { kimyaBoyutu, varsayilanKimya } from "../cizim/kimya";
import { GRAFIK_SABLONLARI, hareketUcluGrafik, noktalardanGrafik, ORNEK_EVRELER } from "../cizim/grafik";
import type { GrafikVerisi, IstatistikVerisi, KimyaVerisi, SemaVerisi } from "../cizim/tipler";
import { BaglayiciBicimPaneli, FizikSecimPaneli, FizikSeridi } from "./FizikPaneli";
import { GrafikSecimPaneli, GrafikSeridi } from "./GrafikPaneli";
import { IstatistikPaneli, MatematikSeridi, SemaPaneli } from "./MatematikPaneli";
import { KimyaPaneli, KimyaSeridi } from "./KimyaPaneli";
import type { BaglayiciAyari } from "./FizikPaneli";

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
import { sekilVuruldu, tutamacPayi } from "../cizim/vurus";
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

const AKIS_ARACLARI: { sekil: AkisSekli; etiket: string; ipucu: string }[] = [
  { sekil: "baslangic", etiket: "Başla/Bitir", ipucu: "Yuvarlatılmış uç kutusu" },
  { sekil: "surec", etiket: "İşlem", ipucu: "Dikdörtgen işlem adımı" },
  { sekil: "karar", etiket: "Karar", ipucu: "Eşkenar dörtgen — evet/hayır dallanması" },
  { sekil: "veri", etiket: "Girdi/Çıktı", ipucu: "Paralelkenar" },
  { sekil: "hazirlik", etiket: "Hazırlık", ipucu: "Altıgen — döngü hazırlığı" },
  { sekil: "belge", etiket: "Belge", ipucu: "Alt kenarı dalgalı çıktı belgesi" },
];

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
const AKIS_KIPI_ARACLARI: CizimAraci[] = ["sec", "silgi", "metin"];

const ARAC_TANIMLARI: { arac: CizimAraci; etiket: string; ipucu?: string; icon: typeof Minus }[] = [
  { arac: "sec", etiket: "Seç / Taşı", icon: MousePointer2 },
  { arac: "dogru", etiket: "Çizgi", ipucu: "Shift ile yatay, dikey veya 45° çizgi", icon: Minus },
  { arac: "ok", etiket: "Ok / Vektör", ipucu: "Kuvvet, hız, ivme veya ışın oku çizin", icon: ArrowRight },
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
  { arac: "silgi", etiket: "Silgi", ipucu: "Üzerinden geçtiğiniz şekilleri siler", icon: Eraser },
  { arac: "metin", etiket: "Metin etiketi", icon: Type },
];

/**
 * "Diğer" menüsüne inen araçlar.
 *
 * Ayrım kullanım sıklığı: fizik/matematik sorusu çizen öğretmen çizgi, ok,
 * dikdörtgen, daire, üçgen ve metni sürekli kullanıyor; çokgen, dalga ve
 * serbest çizgi ise nadir. Onbir araç etiketleriyle tek satıra sığmıyordu
 * (ölçüldü: satır 93 px, yani iki sıraya sarıyordu) — sekize inince tek
 * sıraya oturuyor. Nadir araçlar kaybolmuyor, bir tık ötede.
 */
const NADIR_ARACLAR: CizimAraci[] = ["cokgen", "dalga", "serbest"];

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
  const gecmisRef = useRef<Sekil[][]>([]);
  const ileriRef = useRef<Sekil[][]>([]);
  const [gecmisSayisi, setGecmisSayisi] = useState(0);
  const [ileriSayisi, setIleriSayisi] = useState(0);
  const [arac, setArac] = useState<CizimAraci>("dogru");
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
  const [baglayiciKaynakUcu, setBaglayiciKaynakUcu] = useState<BaglayiciUcu | null>(null);
  const baglayiciKaynakId = baglayiciKaynakUcu && "sekilId" in baglayiciKaynakUcu ? baglayiciKaynakUcu.sekilId : null;
  const setBaglayiciKaynakId = (id: string | null) => setBaglayiciKaynakUcu(id ? { sekilId: id } : null);
  /** Yeni bağlayıcının biçimi. Akış kipinde dik açılı ok; fizik kipinde paletten. */
  const [baglayiciAyari, setBaglayiciAyari] = useState<BaglayiciAyari>({ stil: "dik", okUcu: "son" });
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
  const [tarifAcik, setTarifAcik] = useState(false);
  const [tarifMetni, setTarifMetni] = useState("");
  const [tarifUyarilari, setTarifUyarilari] = useState<string[]>([]);
  /** Tuvalde şekil varken "Diz" denince açılan onay. */
  const [dizmeOnayi, setDizmeOnayi] = useState(false);
  /**
   * Araç çubuğu kipi.
   *
   * NEDEN VAR: akış şeması çizen öğretmen üçgen/dalga/tarama araçlarını hiç
   * kullanmıyor ama hepsi ekranın üstünü kaplıyordu (araç ızgarası + çizgi
   * özellikleri şeridi, tuvalden ÖNCE beş satır). Kip, o iki bloğu ilgisiz
   * olduğu tarafta gizliyor.
   *
   * Açılışta belgeye BAKARAK seçiliyor: içinde akış kutusu olan bir çizim
   * yeniden açıldığında öğretmen kaldığı yerden devam etmek ister.
   */
  /** Fizik şekil paletinde seçili grup. Üstteki "Matematik" ve "Kimya" sekmeleri
   *  aynı paleti doğrudan ilgili grupta açar (ayrı bir panel DEĞİL). */
  const [fizikGrubu, setFizikGrubu] = useState<FizikGrubu>("mekanik");
  const [kip, setKip] = useState<"cizim" | "akis" | "fizik">(() => {
    const ilk = baslangicBelgesi?.sekiller ?? [];
    if (ilk.some((s) => s.tur === "fizik")) return "fizik";
    return ilk.some((s) => s.tur === "akis" || s.tur === "baglayici") ? "akis" : "cizim";
  });
  /**
   * ODAK KİPİ — "sadece tuval".
   *
   * NEDEN: 1200×800 gerçek pencerede ÖLÇÜLDÜ — bir şekil seçiliyken araç
   * çubuğu 404 px içerik istiyor, 240 px'e sıkışıyor (164 px kontrol kendi
   * içinde kayıyor) ve 600 px'lik tuvalin yalnız 302 px'i görünüyor. Öğretmen
   * "üstte çok şey oluyor" derken bunu görüyor.
   *
   * Kip hiçbir şeyi kalıcı olarak saklamıyor: tek tuşla girilip Escape ile
   * çıkılıyor. Ayar gizlemek yerine, ayar YAPMADIĞI anı tanıyor.
   */
  const [odakKipi, setOdakKipi] = useState(false);
  // Sağ panel sekmesi: seçim yapılınca "Ayarlar", seçim kalkınca "Şekiller" açılır.
  const [sagSekme, setSagSekme] = useState<"sekiller" | "ayarlar">("sekiller");
  /** Klavye dinleyicisi bir kez kuruluyor ([] bağımlılık); güncel değeri
   *  ref'ten okur, yoksa mount anındaki `false`a donar. */
  const odakKipiRef = useRef(false);
  useEffect(() => {
    odakKipiRef.current = odakKipi;
  }, [odakKipi]);
  /** Nadir araçlar taşma menüsünde; açık/kapalı durumu. */
  const [digerAraclarAcik, setDigerAraclarAcik] = useState(false);
  // OA89: menü tuvalin üstünde açık kalıyordu; dışarı tıklayınca kapansın.
  const digerAraclarRef = useRef<HTMLDivElement>(null);
  useDisariTiklama(digerAraclarAcik, () => setDigerAraclarAcik(false), digerAraclarRef);
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
  }, [sekiller, taslak, seciliIds, izgaraGoster, secimKutusu, hizalamaCizgileri]);

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
      if (e.key === "Escape") { secimAyarla([]); setMetinNoktasi(null); return; }
      if (seciliIdsRef.current.length && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;
        e.preventDefault();
        const adim = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -adim : e.key === "ArrowRight" ? adim : 0;
        const dy = e.key === "ArrowUp" ? -adim : e.key === "ArrowDown" ? adim : 0;
        tarihceyeKaydet();
        setSekiller((liste) => liste.map((s) => seciliIdsRef.current.includes(s.id) ? sekilTasiSinirli(ctx, s, dx, dy, tuvalOlcu) : s));
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
        || grupDondurmeBaslangici.current || secimKutusuBaslangiciRef.current || silgiAktifRef.current);
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
    gecmisRef.current = [...gecmisRef.current, anlik].slice(-GECMIS_LIMITI);
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
    ileriRef.current = [...ileriRef.current, sekillerRef.current].slice(-GECMIS_LIMITI);
    setSekiller(son);
    secimAyarla([]);
    setGecmisSayisi(gecmisRef.current.length);
    setIleriSayisi(ileriRef.current.length);
  }

  function ileriAl() {
    if (ileriRef.current.length === 0) return;
    const son = ileriRef.current[ileriRef.current.length - 1];
    ileriRef.current = ileriRef.current.slice(0, -1);
    gecmisRef.current = [...gecmisRef.current, sekillerRef.current].slice(-GECMIS_LIMITI);
    setSekiller(son);
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
    const secilenler = guncelSekiller.filter((s) => seciliIdsRef.current.includes(s.id));
    if (!secilenler.length) return;
    const ctx = canvasRef.current?.getContext("2d");
    const grupMap = new Map<string, string>();
    const yeniler = secilenler.map((s) => {
      let grupId = s.grupId;
      if (grupId) {
        if (!grupMap.has(grupId)) grupMap.set(grupId, `grup-${sekilId()}`);
        grupId = grupMap.get(grupId);
      }
      // sekilTasi yerine sekilTasiSinirli: kenardaki bir şekil çoğaltılınca
      // tuval dışına taşmasın (ctx alınamazsa eski davranışa düşülür).
      const tasinan = ctx ? sekilTasiSinirli(ctx, s, 16, 16, tuvalOlcu) : sekilTasi(s, 16, 16);
      return { ...tasinan, id: sekilId(), grupId } as Sekil;
    });
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
    const secilenler = sekiller.filter((s) => seciliIds.includes(s.id));
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
    const secilenler = sekiller.filter((s) => seciliIds.includes(s.id));
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
    const secilenler = sekiller.filter((s) => seciliIds.includes(s.id));
    if (!ad || !secilenler.length) return;
    const kutular = secilenler.map(sekilGeometriKutusu);
    const sol = Math.min(...kutular.map((k) => k.x)), ust = Math.min(...kutular.map((k) => k.y));
    const kopyalar = secilenler.map((s) => sekilTasi(s, 40 - sol, 40 - ust));
    kullaniciSablonlariniSakla([...kullaniciSablonlari, { id: sekilId(), ad, sekiller: kopyalar }]);
    setSablonAdi(""); setSablonKaydiAcik(false);
  }

  function kullaniciSablonuEkle(sablon: KullaniciSablonu) {
    const grupMap = new Map<string, string>();
    const yeniler = sablon.sekiller.map((s) => {
      let grupId = s.grupId;
      if (grupId) {
        if (!grupMap.has(grupId)) grupMap.set(grupId, `grup-${sekilId()}`);
        grupId = grupMap.get(grupId);
      }
      return { ...s, id: sekilId(), grupId } as Sekil;
    });
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
      // Yalnız AKIŞ KUTULARINA bağlanılıyor. Serbest çizgi/metin gibi
      // şekillere tutunmak teknik olarak mümkün ama akış şemasında anlamsız;
      // yanlış hedefe bağlanmayı da engelliyor.
      const zeminMi = (sk: Sekil) => sk.tur === "fizik" && sk.nesne === "kareliAlan";
      const vurulan = [...sekiller]
        .reverse()
        .find((sk) => !baglayiciAyari.serbest && (sk.tur === "akis" || sk.tur === "fizik") && !zeminMi(sk) && sekilVuruldu(ctx, sk, nokta, zoom, sekiller));
      if (vurulan) {
        baglayiciTikla({ sekilId: vurulan.id });
        return;
      }
      // Kareli alanın içine (ya da hemen yanına) tıklandı: en yakın köşeye yapış.
      const alan = [...sekiller].reverse().find((sk) => {
        if (!zeminMi(sk) || sk.tur !== "fizik") return false;
        const p = noktaYerel(ctx, sk, nokta);
        const pay = 10;
        return p.x >= sk.x - pay && p.x <= sk.x + sk.w + pay && p.y >= sk.y - pay && p.y <= sk.y + sk.h + pay;
      });
      if (alan) {
        baglayiciTikla({ sekilId: alan.id, dugum: enYakinDugum(alan, noktaYerel(ctx, alan, nokta)) });
        return;
      }
      // Fizik kipinde boş noktaya da bağlanılır (serbest uç): kuvvet vektörünün
      // başlangıcı/bitişi çoğu zaman bir cismin üstünde değil, boşlukta.
      if (kip === "fizik") {
        baglayiciTikla({ x: nokta.x, y: nokta.y });
        return;
      }
      setBaglayiciKaynakId(null);
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
        if (e.detail >= 2 && vurulan.tur === "metin") {
          secimAyarla([vurulan.id]);
          setMetinDuzenlenenId(vurulan.id);
          setMetinNoktasi(nokta);
          setMetinDeger(vurulan.metin);
          setMetinPunto(vurulan.punto ?? METIN_PUNTO);
          setMetinSatirAraligi(vurulan.satirAraligi ?? METIN_SATIR_ARALIGI);
          return;
        }
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
        const tasinacaklar = sekiller.filter((s) => yeniSecim.includes(s.id));
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

  function isaretciHareket(e: PointerEvent<HTMLCanvasElement>) {
    const nokta = noktaAl(e);

    if (arac === "sec" && !surukleBaslangici.current && !boyutlandirmaBaslangici.current
      && !grupDondurmeBaslangici.current && !secimKutusuBaslangiciRef.current) {
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        let imlec = "crosshair";
        if (seciliIds.length > 1) {
          const sinir = birlesikSinir(ctx, sekiller.filter((s) => seciliIds.includes(s.id)));
          if (Math.hypot(nokta.x - (sinir.x + sinir.w / 2), nokta.y - (sinir.y - 26)) <= tutamacPayi(zoom)) imlec = "grab";
        } else if (seciliId) {
          const secili = sekiller.find((s) => s.id === seciliId);
          const tutamac = secili ? sekilTutamaclari(ctx, secili).find((t) => Math.hypot(nokta.x - t.x, nokta.y - t.y) <= tutamacPayi(zoom)) : undefined;
          if (tutamac) imlec = tutamac.id === "dondur" ? "grab" : "nwse-resize";
        }
        if (imlec === "crosshair" && [...sekiller].reverse().some((s) => sekilVuruldu(ctx, s, nokta, zoom, sekiller))) imlec = "move";
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

  function isaretciYukari() {
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
  }

  function isaretciIptal() {
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
    tarihceyeKaydet();
    setTuvalOlcu(yeni);
  }

  /** Bağlayıcı akışında bir şekle (ya da fizik kipinde boş noktaya) tıklandı. */
  function baglayiciTikla(uc: BaglayiciUcu) {
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
    tarihceyeKaydet();
    const yeni: Sekil = {
      id: sekilId(),
      tur: "baglayici",
      kalinlik,
      kaynak: baglayiciKaynakUcu,
      hedef: uc,
      okUcu: baglayiciAyari.okUcu,
      // "dik" varsayılan olduğu için eski belge biçimi korunur: alan yazılmaz.
      ...(baglayiciAyari.stil !== "dik" ? { stil: baglayiciAyari.stil } : {}),
    };
    setSekiller((mevcut) => [...mevcut, yeni]);
    setBaglayiciKaynakUcu(null);
    setArac("sec");
    window.setTimeout(() => secimAyarla([yeni.id]), 0);
  }

  /**
   * Fizik nesnesi tıklanarak eklenir (akış kutusuyla aynı gerekçe: sürükleyip
   * boyut vermek yerine doğru varsayılan ölçüyle gelir, sonra tutamaçla
   * ayarlanır). Her yeni nesne tuvalin ortasından küçük kaymalarla gelir ki
   * üst üste binip birbirini gizlemesin.
   */
  function fizikNesnesiEkle(nesne: FizikNesnesi, ek?: { grafik?: GrafikVerisi; istatistik?: IstatistikVerisi; sema?: SemaVerisi; kimya?: KimyaVerisi }) {
    const t0 = FIZIK_TANIMLARI[nesne];
    const t = nesne === "kimya" ? { ...t0, ...kimyaBoyutu(ek?.kimya ?? varsayilanKimya()) } : t0;
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
    };
    setSekiller((mevcut) => [...mevcut, yeni]);
    setArac("sec");
    window.setTimeout(() => secimAyarla([yeni.id]), 0);
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

  function pencereyeSigdir() {
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

  const seciliSayisi = seciliIds.length;
  useEffect(() => { setSagSekme(seciliSayisi > 0 ? "ayarlar" : "sekiller"); }, [seciliSayisi]);

  const railCls =
    "flex min-w-[68px] flex-col items-center justify-center rounded-xl border px-2 py-1 text-[10px] lg:w-full lg:px-1 lg:py-2 font-semibold leading-tight transition";
  const ustCls =
    "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition";
  const kutuphaneVar = kip !== "cizim" || kullaniciSablonlari.length > 0;
  const panelGorunur = kutuphaneVar || seciliIds.length > 0;
  const etkinSekme: "sekiller" | "ayarlar" = !kutuphaneVar ? "ayarlar" : seciliIds.length === 0 ? "sekiller" : sagSekme;

  return (
    <ModalKabuk
      baslik={duzenlemeModu ? "Çizimi Düzenle" : "Çizim Ekle"}
      onClose={kapatma.kapatIstendi}
      genislik="max-w-[1480px]"
      tamYukseklik
      // Odak kipinde Escape modalı KAPATMAZ: o tuş önce şeritleri geri getirir
      // (yukarıdaki `tus` dinleyicisi). Aksi halde tuvali büyüten öğretmen
      // Escape'e basınca çizimi kapatmış oluyordu.
      kapanabilir={!odakKipi && !sablonKaydiAcik && !temizleOnayi && !kapatma.onayAcik && !silinecekSablon && !denklemKutusuId && !dizmeOnayi}
    >
      {/* YERLEŞİM: üstte tek ince şerit (kip, geri al, çizgi), solda dikey araç
          çubuğu, ortada geniş tuval, sağda tek panel (Şekiller / Ayarlar).
          Eskiden her şey tuvalin üstünde 5–6 satırdı ve tuval alta sıkışıyordu. */}
      {!odakKipi && (
      <div className="flex shrink-0 flex-wrap items-center gap-2 pb-2 pt-1">
        {/* KİP ANAHTARI. Araçların hangisinin görüneceğini belirler; şekiller ve
            tuval ortak — kip değiştirmek çizimi DEĞİŞTİRMEZ, yalnız çubuğu.
            Kendi satırındaydı ve o satır tek bir anahtardan ibaretti: 32 px'i
            tek başına yiyordu, araç satırının başına alındı. */}
        <div className="mr-1 inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          {([
            { id: "cizim", deger: "cizim" as const, etiket: "Çizim", grup: undefined },
            { id: "fizik", deger: "fizik" as const, etiket: "Fizik", grup: "mekanik" as FizikGrubu },
            // Matematik/Kimya şekilleri "Fizik" paletinin içindeydi ve öğretmen
            // "Çizim"de arayınca bulamıyordu: üst düzeyde görünür giriş noktaları.
            // Matematik sekmesinde Fonksiyon / İstatistik / Şema alt sekmeleri var.
            { id: "matematik", deger: "fizik" as const, etiket: "Matematik", grup: "matematik" as FizikGrubu },
            { id: "kimya", deger: "fizik" as const, etiket: "Kimya", grup: "kimya" as FizikGrubu },
            { id: "akis", deger: "akis" as const, etiket: "Akış şeması", grup: undefined },
          ]).map(({ id, deger, etiket, grup }) => {
            const aktif = kip === deger && (deger !== "fizik"
              || (id === "matematik" ? fizikGrubu === "matematik"
                : id === "kimya" ? fizikGrubu === "kimya"
                : fizikGrubu !== "matematik" && fizikGrubu !== "kimya"));
            return (
            <button
              key={id}
              type="button"
              aria-pressed={aktif}
              data-kip-sekmesi={id}
              onClick={() => {
                if (id === "fizik") { if (fizikGrubu === "matematik" || fizikGrubu === "kimya") setFizikGrubu("mekanik"); }
                else if (grup) setFizikGrubu(grup);
                setKip(deger);
                // Gizlenecek bir araç seçiliyse elde kalmasın: kip değişince
                // görünmeyen bir araçla çizmeye devam etmek şaşırtıcı olurdu.
                // Fizik kipi çizim araçlarının HEPSİNİ korur (ok, çizgi, dalga, elips
                // fizik şemasında lazım) ve bağlayıcıyı da ekler.
                const kalabilir = deger === "akis"
                  ? AKIS_KIPI_ARACLARI.includes(arac) || arac === "baglayici"
                  : deger === "fizik"
                    ? true
                    : arac !== "baglayici";
                if (!kalabilir) { setArac("sec"); setBaglayiciKaynakId(null); }
              }}
              className={`rounded-md px-3 py-1 text-xs font-bold transition ${
                aktif ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {etiket}
            </button>
            );
          })}
        </div>
        <span className="mx-1 h-6 w-px bg-slate-200" />
        <button
          type="button"
          title="Geri al"
          disabled={gecmisSayisi === 0}
          onClick={geriAl}
          className={`${ustCls} border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40`}
        >
          <Undo2 size={15} />
          Geri al
        </button>
        <button
          type="button"
          title={`İleri al (${kisayol("Ctrl+Y")})`}
          disabled={ileriSayisi === 0}
          onClick={ileriAl}
          className={`${ustCls} border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40`}
        >
          <Redo2 size={15} /> İleri al
        </button>
        <span className="mx-1 h-6 w-px bg-slate-200" />
        <div className="flex items-center gap-1">
          {[1, 2, 3].map((deger) => (
            <TogglePill key={deger} aktif={kalinlik === deger} onClick={() => {
              setKalinlik(deger);
              const secili = sekiller.find((s) => s.id === seciliId);
              if (secili && secili.tur !== "metin") seciliOzellikGuncelle({ kalinlik: deger });
            }}>
              {deger === 1 ? "İnce" : deger === 2 ? "Orta" : "Kalın"}
            </TogglePill>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <TogglePill aktif={cizgiTipi === "duz"} onClick={() => {
            setCizgiTipi("duz");
            const secili = sekiller.find((s) => s.id === seciliId);
            if (secili && secili.tur !== "metin") seciliOzellikGuncelle({ cizgiTipi: "duz" });
          }}>Düz</TogglePill>
          <TogglePill aktif={cizgiTipi === "kesik"} onClick={() => {
            setCizgiTipi("kesik");
            const secili = sekiller.find((s) => s.id === seciliId);
            if (secili && secili.tur !== "metin") seciliOzellikGuncelle({ cizgiTipi: "kesik" });
          }}>Kesik</TogglePill>
        </div>
      </div>
      )}

      <p className="sr-only" aria-live="polite">
        Tuvalde {sekiller.length} şekil var. {seciliIds.length} şekil seçili. Etkin araç: {ARAC_TANIMLARI.find((x) => x.arac === arac)?.etiket}.
      </p>
      {/* Geniş ekranda (≥1024 px) yan yana: araçlar | tuval | panel. Dar ekranda (iPad dikey,
          küçük pencere) panel tuvalin ALTINA iner; araç çubuğu soldaki dikey şerit kalır. */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:gap-3">
        {!odakKipi && (
          <nav aria-label="Çizim araçları" data-arac-cubugu className="flex shrink-0 flex-row flex-wrap gap-1.5 lg:w-[74px] lg:flex-col lg:flex-nowrap lg:pr-0.5">
        {ARAC_TANIMLARI.filter(({ arac: a }) =>
          (kip !== "akis" || AKIS_KIPI_ARACLARI.includes(a)) && !NADIR_ARACLAR.includes(a),
        ).map(({ arac: a, etiket, ipucu, icon: Icon }) => (
          <button
            key={a}
            type="button"
            title={ipucu ?? etiket}
            aria-pressed={arac === a}
            onClick={() => { setArac(a); if (a !== "sec") secimAyarla([]); }}
            className={`${railCls} ${
              arac === a
                ? "border-brand-300 bg-brand-50 text-brand-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Icon size={15} />
            {etiket}
          </button>
        ))}
        {/* NADİR ARAÇLAR. Seçiliyken düğme vurgulu kalıyor ki "hangi araçtayım"
            sorusu menü kapalıyken de cevaplansın. */}
        {kip !== "akis" && (
          <div ref={digerAraclarRef} className="relative">
            <button
              type="button"
              aria-expanded={digerAraclarAcik}
              aria-haspopup="menu"
              onClick={() => setDigerAraclarAcik((v) => !v)}
              className={`${railCls} ${
                NADIR_ARACLAR.includes(arac)
                  ? "border-brand-300 bg-brand-50 text-brand-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <MoreHorizontal size={15} /> Diğer
            </button>
            {digerAraclarAcik && (
              <div role="menu" className="absolute left-0 top-full z-20 mt-1 flex lg:left-full lg:top-0 lg:ml-2 lg:mt-0 flex w-max flex-col gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                {ARAC_TANIMLARI.filter(({ arac: a }) => NADIR_ARACLAR.includes(a)).map(({ arac: a, etiket, ipucu, icon: Icon }) => (
                  <button
                    key={a}
                    type="button"
                    role="menuitem"
                    title={ipucu ?? etiket}
                    aria-pressed={arac === a}
                    onClick={() => { setArac(a); secimAyarla([]); setDigerAraclarAcik(false); }}
                    className={`${railCls} justify-start ${
                      arac === a
                        ? "border-brand-300 bg-brand-50 text-brand-700"
                        : "border-transparent bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon size={15} />
                    {etiket}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
          </nav>
        )}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
          {!odakKipi && (
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 empty:hidden">
        {arac === "cokgen" && (
          <div className="flex items-center gap-1">
            <span>Kenar sayısı</span>
            {[3, 4, 5, 6, 7, 8].map((deger) => (
              <button key={deger} type="button" aria-pressed={cokgenKenar === deger} onClick={() => setCokgenKenar(deger)}
                className={`rounded-md px-2 py-1 font-semibold ${cokgenKenar === deger ? "bg-brand-100 text-brand-700" : "bg-white ring-1 ring-slate-200"}`}>
                {deger}
              </button>
            ))}
          </div>
        )}
        {arac === "dalga" && (
          <div className="flex items-center gap-1">
            <span>Tepe sayısı</span>
            {[1, 2, 3, 4].map((deger) => (
              <button key={deger} type="button" aria-pressed={dalgaSayisi === deger} onClick={() => setDalgaSayisi(deger)}
                className={`rounded-md px-2 py-1 font-semibold ${dalgaSayisi === deger ? "bg-brand-100 text-brand-700" : "bg-white ring-1 ring-slate-200"}`}>
                {deger}
              </button>
            ))}
          </div>
        )}
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
      <div
        ref={containerRef}
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
            cursor: arac === "sec" ? "crosshair" : arac === "silgi" ? "cell" : "crosshair",
            width: `${tuvalOlcu.w * zoom / 100}px`,
            height: `${tuvalOlcu.h * zoom / 100}px`,
          }}
          onPointerDown={isaretciAsagi}
          onPointerMove={isaretciHareket}
          onPointerUp={isaretciYukari}
          onPointerCancel={isaretciIptal}
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
      </div>
        </div>
      </div>
        {/* Panel her zaman DOM'da; görünmüyorsa `hidden` (seçim paneli testleri ve odak yönetimi buna güveniyor). */}
        {/* Geniş ekranda panel gizliyken (çizim kipi, şekil seçili değil) yeri
            AYRILIR (`lg:invisible`, `hidden` değil): panel ilk şekil çizilince
            açılıp tuvali ~182 px sola kaydırıyordu. Odak kipinde (tuvali
            büyütmek için bilerek kapatıldığında) ve dar ekranda yer ayrılmaz. */}
        <aside aria-label="Seçili şekil ayarları" aria-hidden={!odakKipi && !panelGorunur ? true : undefined} className={`h-[40%] min-h-0 w-full shrink-0 flex-col rounded-xl lg:h-auto lg:w-[370px] border border-slate-200 bg-white ${odakKipi ? "hidden" : !panelGorunur ? "hidden lg:flex lg:invisible" : "flex"}`}>
            {kutuphaneVar && (
              <div className="flex shrink-0 gap-1 border-b border-slate-100 p-1.5">
                {([["sekiller", "Şekiller"], ["ayarlar", "Ayarlar"]] as const).map(([id, ad]) => (
                  <button key={id} type="button" aria-pressed={etkinSekme === id}
                    disabled={id === "ayarlar" && seciliIds.length === 0}
                    onClick={() => setSagSekme(id)}
                    className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${etkinSekme === id ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-50"}`}>
                    {ad}
                  </button>
                ))}
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              <div className={etkinSekme === "sekiller" ? "flex flex-col gap-2" : "hidden"}>
      {kullaniciSablonlari.length > 0 && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">Şablonlarım</span>
            {kullaniciSablonlari.map((sablon) => (
              <span key={sablon.id} className="inline-flex overflow-hidden rounded-lg border border-emerald-200 bg-white">
                <button type="button" onClick={() => kullaniciSablonuEkle(sablon)} className="px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50">{sablon.ad}</button>
                <button type="button" aria-label={`${sablon.ad} şablonunu sil`} title="Şablonu sil"
                  onClick={() => setSilinecekSablon(sablon)}
                  className="border-l border-emerald-100 px-2 text-rose-500 hover:bg-rose-50">×</button>
              </span>
            ))}
          </div>
        </div>
      )}
      {/* FİZİK şeridi: şekil paleti + bağlantı türleri. Akış şeridiyle aynı
          mantık: bunlar "araç" değil, tek tıkla şekil EKLEYEN eylemler. */}
      {kip === "fizik" && (
        <FizikSeridi
          grup={fizikGrubu}
          onGrupDegisti={setFizikGrubu}
          onEkle={fizikNesnesiEkle}
          kimyaIcerigi={<KimyaSeridi
            onLab={(nesne) => fizikNesnesiEkle(nesne)}
            onKimya={(kimya) => fizikNesnesiEkle("kimya", { kimya })}
            onGrafik={(grafik) => fizikNesnesiEkle("grafik", { grafik })}
          />}
          matematikIcerigi={<MatematikSeridi
            onGrafik={(grafik) => fizikNesnesiEkle("grafik", { grafik })}
            onIstatistik={(istatistik) => fizikNesnesiEkle("istatistik", { istatistik })}
            onSema={(sema) => fizikNesnesiEkle("sema", { sema })}
          />}
          grafikIcerigi={<GrafikSeridi onSablon={grafikSablonuEkle} onUclu={() => grafikUcluEkle()} onHizli={(n, b) => fizikNesnesiEkle("grafik", { grafik: noktalardanGrafik(n, b) })} />}
          baglayiciAyari={baglayiciAyari}
          baglayiciAktif={arac === "baglayici"}
          kaynakSecildi={!!baglayiciKaynakUcu}
          onBaglayici={(ayar) => {
            const ayniAyar = arac === "baglayici" && ayar.stil === baglayiciAyari.stil && ayar.okUcu === baglayiciAyari.okUcu && !!ayar.serbest === !!baglayiciAyari.serbest;
            setBaglayiciAyari(ayar);
            setBaglayiciKaynakUcu(null);
            secimAyarla([]);
            setArac(ayniAyar ? "sec" : "baglayici");
          }}
        />
      )}
      {/* AKIŞ ŞEMASI şeridi ayrı: bunlar "araç" değil, tek tıkla kutu EKLEYEN
          eylemler. Araç çubuğuna karıştırılsaydı `aria-pressed` ile seçili
          görünürlerdi ama seçili kalacak bir kip yok. */}
      {kip === "akis" && (
      <div className="mt-3 flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1.5">
        <span className="px-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
          Akış şeması
        </span>
        {AKIS_ARACLARI.map(({ sekil, etiket, ipucu }) => (
          <button
            key={sekil}
            type="button"
            title={ipucu}
            onClick={() => akisKutusuEkle(sekil)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-brand-200 hover:bg-brand-50"
          >
            <AkisSimge sekil={sekil} />
            {etiket}
          </button>
        ))}
        <span className="mx-1 h-6 w-px bg-slate-200" />
        <button
          type="button"
          title="İki kutuya sırayla tıklayın: ok kutulara TUTUNUR, kutuyu taşıyınca ok da gelir"
          aria-pressed={arac === "baglayici"}
          onClick={() => {
            setArac(arac === "baglayici" ? "sec" : "baglayici");
            setBaglayiciAyari({ stil: "dik", okUcu: "son" });
            setBaglayiciKaynakId(null);
            secimAyarla([]);
          }}
          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
            arac === "baglayici"
              ? "border-brand-300 bg-brand-50 text-brand-700"
              : "border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50"
          }`}
        >
          <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true">
            <path d="M1 2 H8 V8 H13" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <polygon points="13,5 16,8 13,11" fill="currentColor" transform="translate(-1,-3)" />
          </svg>
          Bağlayıcı
        </button>
        {arac === "baglayici" && (
          <span className="text-[10px] font-semibold text-brand-700">
            {baglayiciKaynakId ? "Şimdi HEDEF kutuya tıklayın" : "Önce KAYNAK kutuya tıklayın"}
          </span>
        )}
        <span className="mx-1 h-6 w-px bg-slate-200" />
        <button
          type="button"
          aria-pressed={tarifAcik}
          onClick={() => setTarifAcik((v) => !v)}
          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
            tarifAcik
              ? "border-brand-300 bg-brand-50 text-brand-700"
              : "border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50"
          }`}
        >
          <Type size={14} /> Yazarak diz
        </button>
      </div>
      )}
      {/* YAZARAK TARİF ETME. Metin TEK KERELİK: kutular dizildikten sonra bağ
          kopar, öğretmen elle düzenler (öğretmenle konuşuldu, DEVAM §19.5).
          Bu yüzden metin belgeye kaydedilmiyor — yalnız bu oturumda duruyor. */}
      {kip === "akis" && tarifAcik && (
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
      )}
              </div>
              <div className={etkinSekme === "ayarlar" ? "" : "hidden"}>
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
            </div>
        </aside>
      </div>
      {hata && (
        <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{hata}</p>
      )}
      {/* ALT ŞERİT — GÖRÜNÜM.
          Üstteki eylem şeridinden ayrı duruyor: üstte "ne yapıyorum" (araçlar),
          altta "nasıl bakıyorum" (ızgara, yakınlaştırma, tuval ölçüsü). Alt
          sıra zaten vardı ve 1120 px'in 837 px'i boştu; bu kontroller 624 px
          tutuyor, yani taşınmaları dikeyde 42 px'i BEDAVA geri veriyor. */}
      <div className="mt-2 flex shrink-0 flex-wrap items-center gap-2 border-t border-slate-100 bg-white pt-2 text-xs text-slate-600">
        <button type="button" onClick={() => setOdakKipi((v) => !v)}
          title={odakKipi ? "Şeritleri geri getir (Esc)" : "Araç çubuklarını gizle, tuvali büyüt"}
          aria-pressed={odakKipi}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-semibold ${odakKipi ? "bg-brand-100 text-brand-700" : "bg-white ring-1 ring-slate-200 hover:bg-slate-50"}`}>
          <Maximize2 size={14} /> {odakKipi ? "Şeritleri göster" : "Sadece tuval"}
        </button>
        <span className="mx-0.5 h-5 w-px bg-slate-200" />
        <button type="button" onClick={() => setIzgaraGoster((v) => !v)}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-semibold ${izgaraGoster ? "bg-brand-100 text-brand-700" : "bg-white ring-1 ring-slate-200"}`}>
          <Grid3X3 size={14} /> Izgara
        </button>
        <label className="inline-flex items-center gap-1.5">
          <input type="checkbox" checked={izgarayaYakala} onChange={(e) => setIzgarayaYakala(e.target.checked)} /> Izgaraya yakala
        </label>
        <div className="inline-flex items-center overflow-hidden rounded-md bg-white ring-1 ring-slate-200">
          {/* Alt sınır %25: büyük tuvalde (1920×1200) %50'de bile ekrana
              sığmıyor ve öğretmen şemanın tamamını göremiyordu. */}
          <button type="button" title="Uzaklaştır" onClick={() => setZoom((v) => Math.max(25, v - 25))} className="p-1.5 hover:bg-slate-50"><ZoomOut size={14} /></button>
          <button type="button" title="%100" onClick={() => setZoom(100)} className="min-w-12 border-x border-slate-100 px-2 py-1 font-semibold">%{zoom}</button>
          <button type="button" title="Yakınlaştır" onClick={() => setZoom((v) => Math.min(200, v + 25))} className="p-1.5 hover:bg-slate-50"><ZoomIn size={14} /></button>
        </div>
        {/* PENCEREYE SIĞDIR: 25'lik adımlarla aramak yerine tek tık. Oran
            tuvalin GERÇEK kabından okunuyor, sabitten değil — tuval ölçüsü
            de pencere de değişebiliyor. */}
        <button
          type="button"
          title="Tuvalin tamamı pencereye sığacak orana geç"
          onClick={pencereyeSigdir}
          className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 font-semibold ring-1 ring-slate-200 hover:bg-slate-50"
        >
          <Maximize2 size={14} /> Sığdır
        </button>
        {/* TUVAL ÖLÇÜSÜ. Öğretmenin örnek şeması ~1900×1300'dü; 960×600'e
            sığdırınca kutular okunmaz oluyordu. Küçültme, dışarıda ŞEKİL
            KALIYORSA engelleniyor — sessizce kırpmak yerine söylemek. */}
        <div className="inline-flex items-center gap-1">
          <span className="text-slate-400">Tuval</span>
          {TUVAL_OLCULERI.map((o) => (
            <button
              key={o.ad}
              type="button"
              title={`${o.w}×${o.h}`}
              aria-pressed={tuvalOlcu.w === o.w && tuvalOlcu.h === o.h}
              onClick={() => tuvalOlcusunuDegistir({ w: o.w, h: o.h })}
              className={`rounded-md px-2 py-1 font-semibold ${
                tuvalOlcu.w === o.w && tuvalOlcu.h === o.h
                  ? "bg-brand-100 text-brand-700"
                  : "bg-white ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {o.ad}
            </button>
          ))}
        </div>
        <span className="mx-0.5 h-5 w-px bg-slate-200" />
        <span title="En fazla 80 işlem saklanır; sınır dolunca en eski işlem otomatik çıkarılır."
          className={`rounded-md px-2 py-1 text-[10px] font-semibold ${gecmisSayisi >= GECMIS_LIMITI ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500"}`}>
          Geçmiş {gecmisSayisi}/{GECMIS_LIMITI}
        </span>
        <button
          type="button"
          title="Tümünü temizle"
          disabled={sekiller.length === 0}
          onClick={() => setTemizleOnayi(true)}
          className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 font-semibold ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {/* Etiket "Tümünü temizle" kalıyor: onay kutusundaki düğme "Temizle"
              ve testler ikisini TAM METİNLE ayırıyor. Kısaltmak iki düğmeyi
              birbirine karıştırılabilir yapıyordu. */}
          <Trash2 size={14} /> Tümünü temizle
        </button>
        <span className="ml-auto text-[10px] text-slate-400">
          {sekiller.length} şekil · Shift: düzgün açı · Delete: sil · {kisayol("Ctrl+Z/Y")}: geri/ileri
        </span>
      </div>
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
