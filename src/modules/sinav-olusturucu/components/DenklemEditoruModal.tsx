import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Braces,
  Copy,
  Divide,
  Grid3x3,
  GripVertical,
  Minus,
  Parentheses,
  Plus,
  Redo2,
  Sigma,
  Square,
  Subscript,
  Superscript,
  Trash2,
  Type,
  Undo2,
} from "lucide-react";

import { yeniId } from "../utils";
import { denklemYazisiniCoz, kimyaYazisiniCoz, KIMYA_ORNEKLERI, YAZIM_ORNEKLERI } from "../denklem/yazim";
import {
  KaydedilmemisUyarisi,
  ModalKabuk,
  AlanEtiket,
  MiniButon,
  TogglePill,
} from "./ModalParcalari";
import { useKapatmaOnayi } from "../hooks/useKapatmaOnayi";
import { kisayol } from "../lib/kisayol";
import { parcaOzeti } from "../denklemOzet";
import { OPERATORLER, sembolGruplariniSuz } from "../denklemSemboller";
import { araclariSuz } from "../denklemArama";

import type {
  DenklemBelgesi,
  DenklemCikti,
  DenklemParcasi,
  ParcaTuru,
} from "../denklem/tipler";
import { denklemCiz, tiklananParca } from "../denklem/ciz";

/** İleri araçların açık/kapalı tercihi oturumlar arasında hatırlanır. */
const ILERI_ARAC_KEY = "denklem-ileri-araclar-v1";

/**
 * Düz metinden iç içe yapıya geçerken tohumlanacak metin parçaları.
 *
 * Boş dizi = tohumlama yok. Karar tek yerde ve saf tutuluyor ki testlenebilsin:
 * kural "yer tutucuyu tohumlama, öğretmenin yazdığını tohumla".
 */
export function tohumParcalari(metin: string, varsayilan?: string): string[] {
  const yerTutucu = varsayilan !== undefined && metin === varsayilan;
  if (yerTutucu || !metin.trim()) return [];
  return [metin];
}

function yeniParca(tur: ParcaTuru): DenklemParcasi {
  const id = yeniId();
  if (tur === "metin") return { id, tur, deger: "x + y" };
  if (tur === "kesir") return { id, tur, pay: "a", payda: "b" };
  if (tur === "kok") return { id, tur, derece: "", icerik: "x" };
  if (tur === "us") return { id, tur, taban: "x", ust: "2", alt: "" };
  if (tur === "limit") return { id, tur, altYazi: "x→0", ifade: "f(x)" };
  if (tur === "integral")
    return {
      id,
      tur,
      kat: 1,
      altSinir: "0",
      ustSinir: "1",
      ifade: "f(x) dx",
    };
  if (tur === "toplam")
    return { id, tur, altYazi: "i=1", ustYazi: "n", ifade: "aᵢ" };
  if (tur === "carpim")
    return { id, tur, altYazi: "i=1", ustYazi: "n", ifade: "aᵢ" };
  if (tur === "turev")
    return { id, tur, kismi: false, derece: "", pay: "y", payda: "x" };
  if (tur === "operator") return { id, tur, sembol: "+" };
  if (tur === "sembol") return { id, tur, sembol: "π" };
  if (tur === "grup") return { id, tur, stil: "parantez", icerik: "x + y" };
  if (tur === "fonksiyon") return { id, tur, ad: "sin", arguman: "x" };
  if (tur === "matris")
    return {
      id,
      tur,
      stil: "parantez",
      satirlar: [
        ["1", "0"],
        ["0", "1"],
      ],
    };
  if (tur === "sistem")
    return { id, tur, satirlar: ["x + y = 5", "x − y = 1"] };
  if (tur === "parcali")
    return {
      id,
      tur,
      satirlar: [
        { ifade: "x²", kosul: "x ≥ 0" },
        { ifade: "−x²", kosul: "x < 0" },
      ],
    };
  if (tur === "binom") return { id, tur, ust: "n", alt: "k" };
  return { id, tur: "vektor", stil: "ok", ifade: "v" };
}

export function parcaGecersizMi(parca: DenklemParcasi) {
  if (parca.tur === "metin") return !parca.deger.trim();
  if (parca.tur === "operator" || parca.tur === "sembol")
    return !parca.sembol.trim();
  const ifadeBos = (metin: string, alt?: DenklemParcasi[]) =>
    alt ? alt.length === 0 || alt.some(parcaGecersizMi) : !metin.trim();
  /**
   * İSTEĞE BAĞLI alanlar için (integral sınırı, limit alt yazısı, kök derecesi,
   * toplam/çarpım yazıları): boş kalmaları GEÇERLİ — sınırsız integral ya da
   * derecesiz kök normal yazımdır. Ama iç içe yapı açılmışsa içindekiler
   * geçerli olmalı, yoksa yarım bir parça sessizce çıktıya gider.
   *
   * `ifadeBos` burada KULLANILAMAZ: o, boşluğu hata sayar ve sınırsız her
   * integrali geçersiz ilan ederdi.
   */
  const eklentiGecersiz = (alt?: DenklemParcasi[]) =>
    !!alt && (alt.length === 0 || alt.some(parcaGecersizMi));
  if (parca.tur === "kesir")
    return (
      ifadeBos(parca.pay, parca.payParcalari) ||
      ifadeBos(parca.payda, parca.paydaParcalari)
    );
  if (parca.tur === "kok")
    return (
      ifadeBos(parca.icerik, parca.icerikParcalari) ||
      eklentiGecersiz(parca.dereceParcalari)
    );
  if (parca.tur === "us")
    return (
      ifadeBos(parca.taban, parca.tabanParcalari) ||
      (ifadeBos(parca.ust, parca.ustParcalari) &&
        ifadeBos(parca.alt, parca.altParcalari))
    );
  if (parca.tur === "grup")
    return ifadeBos(parca.icerik, parca.icerikParcalari);
  if (parca.tur === "fonksiyon")
    return !parca.ad.trim() || ifadeBos(parca.arguman, parca.argumanParcalari);
  if (parca.tur === "vektor") return !parca.ifade.trim();
  if (parca.tur === "limit")
    return (
      ifadeBos(parca.ifade, parca.ifadeParcalari) ||
      eklentiGecersiz(parca.altYaziParcalari)
    );
  if (parca.tur === "integral")
    return (
      ifadeBos(parca.ifade, parca.ifadeParcalari) ||
      eklentiGecersiz(parca.altSinirParcalari) ||
      eklentiGecersiz(parca.ustSinirParcalari)
    );
  if (parca.tur === "toplam" || parca.tur === "carpim")
    return (
      ifadeBos(parca.ifade, parca.ifadeParcalari) ||
      eklentiGecersiz(parca.altYaziParcalari) ||
      eklentiGecersiz(parca.ustYaziParcalari)
    );
  if (parca.tur === "matris")
    return (
      parca.satirlar.length === 0 ||
      parca.satirlar.some((satir) => satir.some((hucre) => !hucre.trim()))
    );
  if (parca.tur === "sistem")
    return (
      parca.satirlar.length === 0 ||
      parca.satirlar.some((satir) => !satir.trim())
    );
  if (parca.tur === "parcali")
    return (
      parca.satirlar.length === 0 ||
      parca.satirlar.some((satir) => !satir.ifade.trim() || !satir.kosul.trim())
    );
  if (parca.tur === "binom") return !parca.ust.trim() || !parca.alt.trim();
  return !parca.pay.trim() || !parca.payda.trim();
}

function parcaKopyala(parca: DenklemParcasi): DenklemParcasi {
  const kopya = JSON.parse(JSON.stringify(parca)) as DenklemParcasi;
  function kimlikleriYenile(oge: DenklemParcasi) {
    oge.id = yeniId();
    Object.entries(oge).forEach(([anahtar, deger]) => {
      if (anahtar.endsWith("Parcalari") && Array.isArray(deger)) {
        deger.forEach((alt) => kimlikleriYenile(alt as DenklemParcasi));
      }
    });
  }
  kimlikleriYenile(kopya);
  return kopya;
}

/**
 * Alanların YER TUTUCU değerleri — `yeniParca`'dan TÜRETİLİYOR, elle
 * yazılmıyor. İkinci bir liste tutmak, varsayılan değiştiğinde sessizce
 * ayrışan bir kopya üretirdi (bu depoda §9.6'nın tam olarak dersi).
 */
function yerTutucu(tur: ParcaTuru, alan: string): string | undefined {
  const ornek = yeniParca(tur) as unknown as Record<string, unknown>;
  const deger = ornek[alan];
  return typeof deger === "string" ? deger : undefined;
}

const PARCA_TANIMLARI: {
  tur: ParcaTuru;
  etiket: string;
  icon: typeof Type;
  grup: "temel" | "ileri" | "sembol";
  /** Etikette geçmeyen ama öğretmenin arayabileceği karşılıklar. */
  esAnlamlilar?: string[];
}[] = [
  { tur: "metin", etiket: "Metin", icon: Type, grup: "temel" },
  { tur: "operator", etiket: "İşlem", icon: Type, grup: "temel", esAnlamlilar: ["artı", "eksi", "eşit", "büyük", "küçük", "operatör"] },
  { tur: "kesir", etiket: "Kesir", icon: Divide, grup: "temel", esAnlamlilar: ["bölme", "bölü", "rasyonel", "pay", "payda"] },
  { tur: "kok", etiket: "Kök", icon: Square, grup: "temel", esAnlamlilar: ["karekök", "radikal"] },
  { tur: "us", etiket: "Üs / Alt Simge", icon: Superscript, grup: "temel", esAnlamlilar: ["üslü", "kuvvet", "indis", "abone", "kare"] },
  { tur: "grup", etiket: "Parantez / |x|", icon: Type, grup: "temel", esAnlamlilar: ["mutlak değer", "köşeli", "süslü"] },
  { tur: "fonksiyon", etiket: "Fonksiyon", icon: Type, grup: "ileri" },
  { tur: "limit", etiket: "Limit", icon: Subscript, grup: "ileri" },
  { tur: "integral", etiket: "İntegral", icon: Sigma, grup: "ileri" },
  { tur: "toplam", etiket: "Toplam (Σ)", icon: Sigma, grup: "ileri", esAnlamlilar: ["sigma", "seri"] },
  { tur: "carpim", etiket: "Çarpım (Π)", icon: Sigma, grup: "ileri", esAnlamlilar: ["pi çarpım"] },
  { tur: "turev", etiket: "Türev", icon: Divide, grup: "ileri", esAnlamlilar: ["diferansiyel", "kısmi"] },
  { tur: "vektor", etiket: "Vektör / Üst İşaret", icon: Type, grup: "ileri" },
  { tur: "matris", etiket: "Matris / Determinant", icon: Grid3x3, grup: "ileri", esAnlamlilar: ["tablo", "dizey"] },
  { tur: "sistem", etiket: "Denklem Sistemi", icon: Braces, grup: "ileri" },
  { tur: "parcali", etiket: "Parçalı Fonksiyon", icon: Braces, grup: "ileri" },
  { tur: "binom", etiket: "Binom / Kombinasyon", icon: Parentheses, grup: "ileri", esAnlamlilar: ["kombinasyon", "seçme", "C(n,r)"] },
  { tur: "sembol", etiket: "Özel Sembol", icon: Type, grup: "sembol" },
];

/** Katlanır düğmedeki sayı listeden TÜRETİLİYOR: yeni bir ileri araç
 *  eklendiğinde etiket sessizce eskimesin. */
const ILERI_ARAC_SAYISI = PARCA_TANIMLARI.filter((t) => t.grup !== "temel").length;


const FONKSIYONLAR = [
  "sin",
  "cos",
  "tan",
  "cot",
  "sec",
  "csc",
  "arcsin",
  "arccos",
  "arctan",
  "log",
  "ln",
  "exp",
];

export function DenklemEditoruModal({
  onClose,
  onOlustur,
  seciliSoruVar = false,
  baslangicBelgesi,
  duzenlemeModu = false,
  inlineMod = false,
}: {
  onClose: () => void;
  onOlustur: (cikti: DenklemCikti, hedef: "yeni" | "secili" | "inline") => void;
  seciliSoruVar?: boolean;
  baslangicBelgesi?: DenklemBelgesi;
  duzenlemeModu?: boolean;
  inlineMod?: boolean;
}) {
  const [belge, setBelge] = useState<DenklemBelgesi>(() => ({
    surum: "v1",
    // Varsayılan punto soru metniyle (genelde 10-14 punto) kıyaslandığında
    // eskiden (16/28) çok büyük kalıp akışı bozuyordu — küçültüldü.
    punto: baslangicBelgesi?.punto ?? (inlineMod ? 14 : 18),
    // Boş açılır. Önceden hazır bir kesirle açılıyordu: "x² + 3x − 5 = 0"
    // yazmak isteyen öğretmen önce o kesri silmek zorunda kalıyordu.
    parcalar: (baslangicBelgesi?.parcalar ?? []).map(
      (parca) => ({ ...parca }),
    ),
  }));
  const ilkBelgeRef = useRef(JSON.stringify(belge));
  const [geri, setGeri] = useState<DenklemBelgesi[]>([]);
  const [ileri, setIleri] = useState<DenklemBelgesi[]>([]);
  const [seciliParcaId, setSeciliParcaId] = useState<string | null>(
    belge.parcalar[0]?.id ?? null,
  );
  const [suruklenenId, setSuruklenenId] = useState<string | null>(null);
  const [onizlemeBoyutu, setOnizlemeBoyutu] = useState({ w: 0, h: 0 });
  const [onizlemeZoom, setOnizlemeZoom] = useState(1);
  const [ileriAraclarAcik, setIleriAraclarAcik] = useState(() => {
    try {
      return localStorage.getItem(ILERI_ARAC_KEY) === "1";
    } catch {
      // Kota/gizli kip: tercih okunamazsa varsayılan (kapalı) ile devam et.
      return false;
    }
  });
  function ileriAraclariAyarla(acik: boolean) {
    setIleriAraclarAcik(acik);
    try {
      localStorage.setItem(ILERI_ARAC_KEY, acik ? "1" : "0");
    } catch {
      // Yazılamazsa tercih bu oturumda yaşar; işlevsellik etkilenmez.
    }
  }
  const [islemHatasi, setIslemHatasi] = useState("");
  /** "Yazarak ekle" satırı: yazı + son ayrıştırmanın uyarıları. */
  const [yazimMetni, setYazimMetni] = useState("");
  const [yazimUyarilari, setYazimUyarilari] = useState<string[]>([]);
  const yazimGirdisiRef = useRef<HTMLInputElement | null>(null);
  const onizlemeRef = useRef<HTMLCanvasElement | null>(null);
  const kartRefs = useRef(new Map<string, HTMLDivElement>());
  const parcalar = belge.parcalar;
  const punto = belge.punto;
  const gecersizParcaSayisi = useMemo(
    () => parcalar.filter(parcaGecersizMi).length,
    [parcalar],
  );
  const degisiklikVar = JSON.stringify(belge) !== ilkBelgeRef.current;
  const cokUzun =
    onizlemeBoyutu.w > 820 ||
    (onizlemeBoyutu.h > 0 && onizlemeBoyutu.w / onizlemeBoyutu.h > 12);

  useEffect(() => {
    const canvas = onizlemeRef.current;
    if (!canvas) return;
    if (parcalar.length === 0) {
      const ctx = canvas.getContext("2d");
      canvas.width = 200;
      canvas.height = 60;
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }
    const boyut = denklemCiz(canvas, punto, parcalar, 2, seciliParcaId, onizlemeZoom);
    if (boyut) setOnizlemeBoyutu(boyut);
  }, [parcalar, punto, seciliParcaId, onizlemeZoom]);

  useEffect(() => {
    if (
      seciliParcaId &&
      !parcalar.some((parca) => parca.id === seciliParcaId)
    ) {
      setSeciliParcaId(parcalar[0]?.id ?? null);
    }
  }, [parcalar, seciliParcaId]);

  useEffect(() => {
    function klavye(event: KeyboardEvent) {
      const hedefEleman = event.target as HTMLElement | null;
      const alanIcinde = !!hedefEleman?.closest(
        "input,textarea,[contenteditable='true']",
      );

      // Escape ARTIK alan içinde de çalışır. Önceden erken return'e takıldığı
      // için, bir kutuya yazarken Esc'ye basmak hiçbir şey yapmıyordu.
      if (event.key === "Escape") {
        event.preventDefault();
        kapatma.kapatIstendi();
        return;
      }

      // Alt + ← / → : parçalar arası gezinme. Editör "soldan sağa" bir ifade
      // kurduğu hâlde parçalar arasında klavyeyle dolaşmanın hiçbir yolu yoktu;
      // her geçiş için fareyle kutuya tıklamak gerekiyordu.
      if (
        event.altKey &&
        (event.key === "ArrowLeft" || event.key === "ArrowRight") &&
        parcalar.length > 0
      ) {
        event.preventDefault();
        const suAn = parcalar.findIndex((parca) => parca.id === seciliParcaId);
        const yon = event.key === "ArrowRight" ? 1 : -1;
        const hedefIndex =
          suAn < 0
            ? 0
            : Math.min(parcalar.length - 1, Math.max(0, suAn + yon));
        parcayiSec(parcalar[hedefIndex].id, true);
        return;
      }

      if (alanIcinde) {
        // Tamamen boşalmış bir parçada Backspace parçayı siler — matematik
        // editörlerinin standart davranışı. Yalnız TÜM metin alanları boşsa
        // silinir; kesrin payını silmek payda doluyken parçayı götürmemeli.
        if (event.key === "Backspace") {
          const alan = hedefEleman as HTMLInputElement | HTMLTextAreaElement;
          if (alan.value === "" && alan.selectionStart === 0) {
            const kart = hedefEleman?.closest<HTMLElement>("[data-parca-id]");
            const parcaId = kart?.dataset.parcaId;
            if (kart && parcaId) {
              const alanlar = Array.from(
                kart.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
                  "input:not([type='checkbox']):not([type='radio']):not([type='number']), textarea",
                ),
              );
              if (alanlar.length > 0 && alanlar.every((a) => a.value === "")) {
                event.preventDefault();
                const index = parcalar.findIndex((p) => p.id === parcaId);
                parcaSil(parcaId);
                const komsu = parcalar[index - 1] ?? parcalar[index + 1];
                if (komsu) parcayiSec(komsu.id, true);
              }
            }
          }
        }
        // Diğer tuşlarda karışma: bir kutuda Ctrl+Z native metin geri-al'ı
        // olarak çalışmalı, belge geri-al'ı devreye girmemeli
        // (CizimEditoruModal ile aynı kalıp).
        return;
      }

      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === "z") {
        event.preventDefault();
        event.shiftKey ? ileriAl() : geriAl();
      } else if (mod && event.key.toLowerCase() === "y") {
        event.preventDefault();
        ileriAl();
      }
    }
    window.addEventListener("keydown", klavye);
    return () => window.removeEventListener("keydown", klavye);
  });

  function belgeyiUygula(sonraki: DenklemBelgesi) {
    if (JSON.stringify(sonraki) === JSON.stringify(belge)) return;
    setGeri((liste) => [...liste, belge].slice(-100));
    setIleri([]);
    setBelge(sonraki);
    setIslemHatasi("");
  }

  function geriAl() {
    const onceki = geri[geri.length - 1];
    if (!onceki) return;
    setGeri((liste) => liste.slice(0, -1));
    setIleri((liste) => [belge, ...liste].slice(0, 100));
    setBelge(onceki);
  }

  function ileriAl() {
    const sonraki = ileri[0];
    if (!sonraki) return;
    setIleri((liste) => liste.slice(1));
    setGeri((liste) => [...liste, belge].slice(-100));
    setBelge(sonraki);
  }

  // window.confirm'den modal içi onaya geçildi: yerel kutu biçimlendirilemiyor,
  // odak tuzağının dışında kalıyor ve iki webview'da aynı görünmüyor (§12.1).
  const kapatma = useKapatmaOnayi({
    degisiklikVar: () => degisiklikVar,
    onKapat: onClose,
  });

  function parcayiSec(id: string, kaydir = false) {
    setSeciliParcaId(id);
    if (!kaydir) return;
    requestAnimationFrame(() => {
      const kart = kartRefs.current.get(id);
      if (!kart) return;
      kart.scrollIntoView({ behavior: "smooth", block: "center" });
      // Parçanın ilk giriş alanına odaklan ve içeriğini SEÇ. İki şikâyeti
      // birden karşılar:
      //  - Yeni eklenen blok dolgu metinle geliyordu ("x + y", "a/b", "x²"…);
      //    seçili geldiği için artık silinmesi gereken bir engel değil,
      //    üzerine yazılan bir yer tutucu.
      //  - Önizlemeye tıklamak yalnızca kartı seçip kaydırıyordu, ilgili
      //    alana odak vermiyordu; "hangi kutuyu düzenliyorum" belirsizdi.
      const alan = kart.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        "input:not([type='checkbox']):not([type='radio']):not([type='number']), textarea",
      );
      if (!alan) return;
      alan.focus({ preventScroll: true });
      alan.select();
    });
  }

  function parcaEkle(tur: ParcaTuru) {
    const yeni = yeniParca(tur);
    const index = seciliParcaId
      ? parcalar.findIndex((parca) => parca.id === seciliParcaId)
      : -1;
    const kopya = [...parcalar];
    kopya.splice(index >= 0 ? index + 1 : kopya.length, 0, yeni);
    belgeyiUygula({ ...belge, parcalar: kopya });
    parcayiSec(yeni.id, true);
  }

  /**
   * Yazılan ifadeyi (`v_0 t + 1/2 a t^2`) parçalara çevirip seçili parçanın
   * ARKASINA ekler. Odak giriş kutusunda KALIR (`parcayiSec(…, true)` kullanılmaz:
   * o ilk alana odaklanıp seçiyor ve zincirleme yazmayı keserdi); öğretmen
   * arka arkaya birkaç ifade yazabilmeli.
   */
  function yazarakEkle(kimya = false) {
    const { parcalar: yeniler, uyarilar } = (kimya ? kimyaYazisiniCoz : denklemYazisiniCoz)(yazimMetni, yeniId);
    setYazimUyarilari(uyarilar);
    if (yeniler.length === 0) return;
    const index = seciliParcaId ? parcalar.findIndex((parca) => parca.id === seciliParcaId) : -1;
    const kopya = [...parcalar];
    kopya.splice(index >= 0 ? index + 1 : kopya.length, 0, ...yeniler);
    belgeyiUygula({ ...belge, parcalar: kopya });
    setSeciliParcaId(yeniler[yeniler.length - 1].id);
    setYazimMetni("");
  }

  function parcaGuncelle(id: string, patch: Partial<DenklemParcasi>) {
    belgeyiUygula({
      ...belge,
      parcalar: parcalar.map((p) =>
        p.id === id ? ({ ...p, ...patch } as DenklemParcasi) : p,
      ),
    });
  }

  function parcaSil(id: string) {
    const index = parcalar.findIndex((parca) => parca.id === id);
    const kalan = parcalar.filter((p) => p.id !== id);
    belgeyiUygula({ ...belge, parcalar: kalan });
    if (seciliParcaId === id)
      setSeciliParcaId(kalan[Math.min(index, kalan.length - 1)]?.id ?? null);
  }

  function parcaCogalt(id: string) {
    const index = parcalar.findIndex((parca) => parca.id === id);
    if (index < 0) return;
    const yeni = parcaKopyala(parcalar[index]);
    const kopya = [...parcalar];
    kopya.splice(index + 1, 0, yeni);
    belgeyiUygula({ ...belge, parcalar: kopya });
    parcayiSec(yeni.id, true);
  }

  function parcaTasi(id: string, yon: "sol" | "sag") {
    const index = parcalar.findIndex((p) => p.id === id);
    const hedef = yon === "sol" ? index - 1 : index + 1;
    if (index < 0 || hedef < 0 || hedef >= parcalar.length) return;
    const kopya = [...parcalar];
    const [tasinan] = kopya.splice(index, 1);
    kopya.splice(hedef, 0, tasinan);
    belgeyiUygula({ ...belge, parcalar: kopya });
  }

  function surukleyipTasi(hedefId: string, sonrasina = false) {
    if (!suruklenenId || suruklenenId === hedefId) return;
    const tasinan = parcalar.find((parca) => parca.id === suruklenenId);
    if (!tasinan) return;
    const kalan = parcalar.filter((parca) => parca.id !== suruklenenId);
    const hedef = kalan.findIndex((parca) => parca.id === hedefId);
    kalan.splice(
      hedef < 0 ? kalan.length : hedef + (sonrasina ? 1 : 0),
      0,
      tasinan,
    );
    belgeyiUygula({ ...belge, parcalar: kalan });
    setSuruklenenId(null);
  }

  function onizlemedenSec(event: MouseEvent<HTMLCanvasElement>) {
    const canvas = onizlemeRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || parcalar.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const tikX = ((event.clientX - rect.left) / rect.width) * onizlemeBoyutu.w;
    const bulunan = tiklananParca(ctx, punto, parcalar, tikX);
    if (bulunan) parcayiSec(bulunan.id, true);
  }

  function disaAktar(hedef: "yeni" | "secili" | "inline") {
    if (parcalar.length === 0 || gecersizParcaSayisi > 0) {
      setIslemHatasi(
        "Denklemi eklemeden önce kırmızı işaretli boş veya eksik parçaları tamamlayın.",
      );
      return;
    }
    const uretimCanvas = document.createElement("canvas");
    const boyut = denklemCiz(uretimCanvas, punto, parcalar, 3);
    if (!boyut) return;
    onOlustur(
      {
        dataUrl: uretimCanvas.toDataURL("image/png"),
        oran: boyut.w / boyut.h,
        yukseklikOrani: boyut.h / punto,
        denklemVerisi: {
          ...belge,
          parcalar: parcalar.map((parca) => ({ ...parca })),
        },
      },
      hedef,
    );
  }

  return (
    <ModalKabuk
      baslik={duzenlemeModu ? "Denklemi Düzenle" : "Denklem Ekle"}
      onClose={kapatma.kapatIstendi}
      genislik="max-w-6xl"
      kapanabilir={!kapatma.onayAcik}
    >
      {/* Açıklama katlanır. Bir kez okunup bir daha okunmayan üç satır, her
          açılışta kalıcı olarak yer kaplıyordu; ölçümde açıklama + araç
          çubuğu modalın %26'sıydı. `<details>` bilerek: semantik, klavyeyle
          açılıyor, JS gerektirmiyor. */}
      <details className="group">
        <summary className="w-fit cursor-pointer list-none text-xs font-semibold text-brand-600 hover:text-brand-700">
          Nasıl çalışır?
          <span className="ml-1 inline-block transition group-open:rotate-90">›</span>
        </summary>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          Temel ve ileri araçlardan parçalar ekleyin; bir alanın içindeki
          <b> İç içe ifade oluştur</b> seçeneğiyle kesir içinde kök, kök içinde
          kesir gibi yapılar kurun. Parçalar soldan sağa birleşir.
        </p>
      </details>

      {/* YAZARAK EKLE: kart kart yapı kurmak yerine ifadeyi yazmak. Sonuç yine
          sıradan parçalar; her biri sonradan kartından düzenlenebilir. */}
      <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50/40 p-2" data-testid="yazarak-ekle">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="denklem-yazarak-ekle" className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Yazarak ekle
          </label>
          <input
            id="denklem-yazarak-ekle"
            ref={yazimGirdisiRef}
            value={yazimMetni}
            autoFocus={!duzenlemeModu && parcalar.length === 0}
            onChange={(e) => { setYazimMetni(e.target.value); if (yazimUyarilari.length) setYazimUyarilari([]); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                e.stopPropagation();
                yazarakEkle(e.altKey);
              }
            }}
            placeholder="ör.  x = v_0 t + 1/2 a t^2     (Enter ile ekler)"
            className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-700"
          />
          <button
            type="button"
            onClick={() => yazarakEkle()}
            disabled={!yazimMetni.trim()}
            className="rounded-lg border border-brand-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-brand-700 transition hover:bg-brand-50 disabled:opacity-50"
          >
            Ekle
          </button>
          <button
            type="button"
            data-testid="kimya-formulu-ekle"
            onClick={() => yazarakEkle(true)}
            disabled={!yazimMetni.trim()}
            title="Yazıyı kimya formülü olarak ekler: AlCl3 → AlCl₃, SO4^2- → SO₄²⁻, kJ/mol kesir olmaz (Alt+Enter)"
            className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
          >
            Kimya formülü ekle
          </button>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-slate-500">Örnek:</span>
          {YAZIM_ORNEKLERI.map((o) => (
            <button
              key={o.yazi}
              type="button"
              title={o.yazi}
              onClick={() => { setYazimMetni(o.yazi); setYazimUyarilari([]); yazimGirdisiRef.current?.focus(); }}
              className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:border-brand-200 hover:bg-brand-50"
            >
              {o.ad}
            </button>
          ))}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-slate-500">Kimya örneği (<b>Kimya formülü ekle</b> ile):</span>
          {KIMYA_ORNEKLERI.map((o) => (
            <button
              key={o.yazi}
              type="button"
              title={o.yazi}
              onClick={() => { setYazimMetni(o.yazi); setYazimUyarilari([]); yazimGirdisiRef.current?.focus(); }}
              className="rounded-md border border-emerald-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              {o.ad}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">
          <b>sum_{"{i=1}"}^n</b> Σ · <b>lim_{"{x->0}"}</b> · <b>int_0^1</b> ∫ · <b>cup cap emptyset</b> ∪ ∩ ∅ ·{" "}
          <b>x^2</b> üs · <b>v_0</b> alt simge · <b>1/2</b> bitişik kesir · <b>m v^2 / 2</b> boşluklu bölme: önündeki/sonrasındaki tüm terim ·{" "}
          <b>sqrt(x)</b> kök · <b>sin(x)</b> · <b>vec(F)</b> · <b>\theta</b> ya da <b>theta</b> Yunan harfi · <b>*</b> çarpı · <b>&lt;=</b> ≤
        </p>
        {yazimUyarilari.length > 0 && (
          <p role="status" className="mt-1 text-[11px] font-semibold text-amber-700">
            {yazimUyarilari.join(" ")} Yine de eklendi; kartlardan düzeltebilirsiniz.
          </p>
        )}
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="w-12 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Temel
          </span>
          {PARCA_TANIMLARI.filter((tanim) => tanim.grup === "temel").map(
            ({ tur, etiket, icon: Icon }) => (
              <button
                key={tur}
                type="button"
                onClick={() => parcaEkle(tur)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-brand-200 hover:bg-brand-50"
              >
                <Icon size={13} /> {etiket}
              </button>
            ),
          )}
        </div>
        {/* İLERİ araçlar (12 düğme, iki satır) katlanır ve seçim HATIRLANIR.
            Varsayılan kapalı: çoğu yazılıda metin/kesir/kök/üs yetiyor ve o
            iki satır her açılışta yer yiyordu. Ama integral/matris düzenli
            kullanan öğretmenin her seferinde açması da gerileme olurdu —
            bu yüzden tercih localStorage'da (ekranın panel durumu ile aynı
            kalıp). */}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="w-12 shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            İleri
          </span>
          <button
            type="button"
            aria-expanded={ileriAraclarAcik}
            onClick={() => ileriAraclariAyarla(!ileriAraclarAcik)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-50"
          >
            {ileriAraclarAcik ? "Gizle" : `Göster (${ILERI_ARAC_SAYISI})`}
          </button>
        </div>
        <div
          className={`mt-1.5 flex-wrap items-center gap-1.5 ${
            ileriAraclarAcik ? "flex" : "hidden"
          }`}
        >
          {PARCA_TANIMLARI.filter((tanim) => tanim.grup !== "temel").map(
            ({ tur, etiket, icon: Icon }) => (
              <button
                key={tur}
                type="button"
                onClick={() => parcaEkle(tur)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-brand-200 hover:bg-brand-50"
              >
                <Icon size={13} /> {etiket}
              </button>
            ),
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-slate-200 pt-2">
          <MiniButon
            title={`Geri al (${kisayol("Ctrl+Z")})`}
            onClick={geriAl}
            disabled={geri.length === 0}
          >
            <Undo2 size={14} />
          </MiniButon>
          <MiniButon
            title={`İleri al (${kisayol("Ctrl+Y")})`}
            onClick={ileriAl}
            disabled={ileri.length === 0}
          >
            <Redo2 size={14} />
          </MiniButon>
          <label className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            Punto
            <input
              type="number"
              min={10}
              max={48}
              value={punto}
              onChange={(e) =>
                belgeyiUygula({
                  ...belge,
                  punto: Math.max(
                    10,
                    Math.min(48, Number(e.target.value) || 18),
                  ),
                })
              }
              className="w-16 rounded-md border border-slate-200 px-2 py-1"
            />
          </label>
          <span className="ml-auto text-[11px] font-medium text-slate-500">
            Yeni parça {seciliParcaId ? "seçili parçanın arkasına" : "sona"}{" "}
            eklenir ve yazmaya hazır gelir.
            <span className="ml-2 text-slate-400">
              <kbd className="rounded border border-slate-300 bg-white px-1 font-mono text-[10px]">Alt</kbd>
              +
              <kbd className="rounded border border-slate-300 bg-white px-1 font-mono text-[10px]">←→</kbd>{" "}
              parçalar arası ·{" "}
              <kbd className="rounded border border-slate-300 bg-white px-1 font-mono text-[10px]">Backspace</kbd>{" "}
              boş parçayı siler
            </span>
          </span>
        </div>
      </div>

      {/* Önizleme SAĞDA 360 px'lik bir sütun değil, ÜSTTE tam genişlikte.
          İki sebep: (1) öğretmenin tek sorusu "doğru göründü mü?" — kurduğu
          şeyin kendisi, onu kuran formdan daha görünür olmalıydı; ölçümde
          canvas 133×55 px iken form 1145 px'di. (2) Denklem geniş ve alçak
          bir şey; 360 px'lik dar sütun bu şekle ters, zoom açılınca hemen
          taşıyordu. Akordiyon parça yığınını 427 px'e indirdiği için üstteki
          şerit artık bedavaya geliyor. */}
      <div className="mt-3 flex flex-col gap-3">
        <div className="space-y-2 order-2">
          {parcalar.length === 0 && (
            <p className="rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-400">
              Yukarıdan bir parça ekleyerek başlayın.
            </p>
          )}
          {parcalar.map((parca, index) => (
            <div
              key={parca.id}
              data-parca-id={parca.id}
              ref={(node) => {
                if (node) kartRefs.current.set(parca.id, node);
                else kartRefs.current.delete(parca.id);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                const kutu = event.currentTarget.getBoundingClientRect();
                surukleyipTasi(
                  parca.id,
                  event.clientY > kutu.top + kutu.height / 2,
                );
              }}
              onClick={() => parcayiSec(parca.id)}
              className={`flex items-start gap-2 rounded-lg border bg-white p-2.5 transition ${
                seciliParcaId === parca.id
                  ? "border-brand-400 ring-2 ring-brand-100"
                  : "border-slate-200"
              } ${parcaGecersizMi(parca) ? "border-rose-300" : ""} ${
                suruklenenId === parca.id ? "opacity-50" : ""
              }`}
            >
              <span
                draggable
                onDragStart={() => setSuruklenenId(parca.id)}
                onDragEnd={() => setSuruklenenId(null)}
                className={`shrink-0 cursor-grab text-slate-300 ${seciliParcaId === parca.id ? "mt-2" : ""}`}
                title="Sürükleyerek sırala"
              >
                <GripVertical size={16} aria-hidden="true" />
              </span>
              {/* Taşıma okları kapalı kartta YAN YANA: alt alta dizildiklerinde
                  kartın taban yüksekliğini kendileri dayatıyor ve tek satırlık
                  özet 86 px yer kaplıyordu. Açık kartta dikey kalıyorlar,
                  çünkü orada zaten yer var ve sol kenarda dar bir sütun
                  oluşturuyorlar. */}
              <div
                className={`flex shrink-0 gap-1 ${
                  seciliParcaId === parca.id ? "flex-col pt-1" : "flex-row"
                }`}
              >
                <MiniButon
                  title="Sola taşı"
                  disabled={index === 0}
                  onClick={() => parcaTasi(parca.id, "sol")}
                >
                  <ArrowUp size={12} className="rotate-[-90deg]" />
                </MiniButon>
                <MiniButon
                  title="Sağa taşı"
                  disabled={index === parcalar.length - 1}
                  onClick={() => parcaTasi(parca.id, "sag")}
                >
                  <ArrowDown size={12} className="rotate-[-90deg]" />
                </MiniButon>
              </div>
              {/* AKORDİYON: yalnız SEÇİLİ parça alanlarıyla açılır, geri
                  kalanlar tek satırlık özete iner. Kartlar alt alta dizildiği
                  hâlde parçalar soldan sağa birleştiği için, hepsi birden açık
                  olduğunda formülün yapısı hiç görünmüyordu (ölçüm: 6 parça =
                  1145 px yığın, ekranda 2 kart). Kapalı kart tıklanınca açılır;
                  taşıma/çoğaltma/silme kapalıyken de erişilebilir kalır ki
                  sıralama için açmak gerekmesin. */}
              <div className="min-w-0 flex-1">
                {/* Kapalıyken etiket ve özet AYNI satırda: satır başına ~16 px
                    daha kazandırıyor ve liste taranabilir kalıyor. Açıkken
                    etiket kendi satırında durur, alanlar altına iner. */}
                {seciliParcaId === parca.id ? (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      {index + 1}.{" "}
                      {PARCA_TANIMLARI.find((t) => t.tur === parca.tur)?.etiket}
                    </p>
                    <div className="mt-1.5">
                      <ParcaAlanlari
                        parca={parca}
                        onChange={(patch) => parcaGuncelle(parca.id, patch)}
                      />
                    </div>
                  </>
                ) : (
                  // Gerçek düğme, tıklanabilir div değil: kapalı kart artık
                  // düzenlemeye girmenin ASIL yolu, klavyeyle de açılabilmeli.
                  // `parcayiSec(..., true)` açar + ilk alana odaklanır, yani
                  // Tab+Enter ile doğrudan yazmaya geçilebiliyor.
                  <button
                    type="button"
                    aria-expanded={false}
                    onClick={(event) => {
                      event.stopPropagation();
                      parcayiSec(parca.id, true);
                    }}
                    className="flex w-full min-w-0 items-baseline gap-2 text-left"
                    title={`${parcaOzeti(parca) || "boş"} — düzenlemek için açın`}
                  >
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      {index + 1}.{" "}
                      {PARCA_TANIMLARI.find((t) => t.tur === parca.tur)?.etiket}
                    </span>
                    <span
                      className={`min-w-0 flex-1 truncate font-serif text-sm ${
                        parcaGecersizMi(parca) ? "text-rose-600" : "text-slate-700"
                      }`}
                    >
                      {parcaOzeti(parca) || (
                        <span className="font-sans text-xs italic text-slate-400">
                          boş — düzenlemek için tıklayın
                        </span>
                      )}
                    </span>
                  </button>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <MiniButon
                  title="Parçayı çoğalt"
                  onClick={() => parcaCogalt(parca.id)}
                >
                  <Copy size={13} />
                </MiniButon>
                <MiniButon
                  title="Parçayı sil"
                  onClick={() => parcaSil(parca.id)}
                  danger
                >
                  <Trash2 size={13} />
                </MiniButon>
              </div>
            </div>
          ))}
        </div>

        <aside className="order-1 sticky top-0 z-10 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold text-slate-600">Canlı önizleme</p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400">
                Bölüme tıklayarak seçin
              </span>
              {/* Yakınlaştırma yalnız GÖRÜNTÜYÜ büyütür; punto'ya dokunmaz.
                  Önizleme 18 punto'da gerçek boyutunda çiziliyor — dürüst ama
                  ekranda okunmuyordu, ve punto'yu değiştirerek bakmak çıktıyı
                  da değiştirmek demekti. Çıktı üretimi ayrı çağrı (kalite 3,
                  zoom yok), bu yüzden basılan görsel etkilenmiyor. */}
              <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5">
                <MiniButon
                  title="Uzaklaştır"
                  disabled={onizlemeZoom <= 1}
                  onClick={() => setOnizlemeZoom((z) => Math.max(1, z - 0.5))}
                >
                  <Minus size={12} />
                </MiniButon>
                <span className="w-9 text-center text-[10px] font-bold tabular-nums text-slate-500">
                  {onizlemeZoom}×
                </span>
                <MiniButon
                  title="Yakınlaştır"
                  disabled={onizlemeZoom >= 4}
                  onClick={() => setOnizlemeZoom((z) => Math.min(4, z + 0.5))}
                >
                  <Plus size={12} />
                </MiniButon>
              </div>
            </div>
          </div>
          <div className="flex min-h-32 max-h-64 items-center justify-center overflow-auto rounded-lg border border-slate-200 bg-white p-3">
            <canvas
              ref={onizlemeRef}
              onClick={onizlemedenSec}
              className="cursor-pointer bg-white"
              style={{ imageRendering: "auto" }}
            />
          </div>
          {gecersizParcaSayisi > 0 && (
            <p className="flex gap-1.5 rounded-lg bg-rose-50 px-2.5 py-2 text-[11px] font-semibold text-rose-700">
              <AlertTriangle size={14} className="shrink-0" />
              {gecersizParcaSayisi} parçada boş veya eksik zorunlu alan var.
            </p>
          )}
          {cokUzun && (
            <p className="flex gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] font-semibold text-amber-700">
              <AlertTriangle size={14} className="shrink-0" />
              Denklem çok uzun; sınav kağıdına eklenirken küçülüp okunması
              zorlaşabilir.
            </p>
          )}
          <p className="text-[10px] leading-relaxed text-slate-400">
            Seçili bölüm mavi gösterilir; çıktı görselinde bu vurgu yer almaz.
          </p>
        </aside>
      </div>

      {islemHatasi && (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
          {islemHatasi}
        </p>
      )}

      <div className="sticky bottom-0 mt-4 flex justify-end gap-2 border-t border-slate-100 bg-white/95 pt-3 backdrop-blur">
        <button
          type="button"
          onClick={kapatma.kapatIstendi}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Vazgeç
        </button>
        {inlineMod ? (
          <button
            type="button"
            disabled={parcalar.length === 0 || gecersizParcaSayisi > 0}
            onClick={() => disaAktar("inline")}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {duzenlemeModu ? "Denklemi Güncelle" : "Metne Ekle"}
          </button>
        ) : (
          <>
            {!duzenlemeModu && seciliSoruVar && (
              <button
                type="button"
                disabled={parcalar.length === 0 || gecersizParcaSayisi > 0}
                onClick={() => disaAktar("secili")}
                className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Seçili Soruya Ekle
              </button>
            )}
            <button
              type="button"
              disabled={parcalar.length === 0 || gecersizParcaSayisi > 0}
              onClick={() => disaAktar("yeni")}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {duzenlemeModu ? "Denklemi Güncelle" : "Yeni Soru Olarak Ekle"}
            </button>
          </>
        )}
      </div>
      {kapatma.onayAcik && (
        <KaydedilmemisUyarisi
          baslik="Kaydedilmemiş denklem var"
          aciklama="Denklemde yaptığınız değişiklikler henüz soruya eklenmedi. Kapatırsanız kaybolur."
          onVazgec={kapatma.vazgec}
          onAt={kapatma.onayla}
        />
      )}
    </ModalKabuk>
  );
}

/** Alan yazısında ayrıştırıcıyı tetikleyen işaretler: / ^ _ \ ya da sqrt( vec( gibi. */
const YAPI_ISARETI = /[/^_\\]|\b(?:sqrt|kok|abs|vec|bar|hat|dot)\(|->|<=|>=|!=/;

const INPUT_CLS =
  "w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-700 focus:border-brand-400 focus:outline-none";

function IfadeDuzenleyici({
  etiket,
  metin,
  parcalar,
  onMetin,
  onParcalar,
  derinlik,
  varsayilan,
}: {
  etiket: string;
  metin: string;
  parcalar?: DenklemParcasi[];
  onMetin: (deger: string) => void;
  onParcalar: (deger: DenklemParcasi[] | undefined) => void;
  derinlik: number;
  /** Bu alanın `yeniParca`'dan gelen YER TUTUCU değeri (ör. integral alt
   *  sınırında "0"). İç içe yapıya geçerken metin yer tutucudan ibaretse
   *  tohumlanmaz — bkz. `yapiyiDegistir`. */
  varsayilan?: string;
}) {
  const icIce = !!parcalar;
  // İç içe yapıyı kaldırmak bu alandaki parçaları SİLER — geri alınamaz.
  // Onayı modal içi soruyor: `window.confirm` yerel bir kutu, odak tuzağının
  // dışında kalıyor ve iki webview'da farklı görünüyor (bkz. useKapatmaOnayi).
  const [duzMetneDonOnayi, setDuzMetneDonOnayi] = useState(false);

  /** Alana yazılan "sin 3x / (2x)" gibi yazımı, yapı içeriyorsa iç içe parçalara
   *  çevirir (üst düzey "Yazarak ekle" ile AYNI ayrıştırıcı). Yapı yoksa metin
   *  olduğu gibi kalır. Çevirdiyse true. */
  function yaziyiCoz(): boolean {
    if (icIce || derinlik >= 3 || !YAPI_ISARETI.test(metin)) return false;
    const { parcalar: cozulen } = denklemYazisiniCoz(metin, yeniId);
    if (cozulen.length === 0) return false;
    if (cozulen.every((p) => p.tur === "metin")) {
      // "x->0" gibi yalnız sembol değişimi: düz metin kalır, "x→0" olur.
      const duz = cozulen.map((p) => (p.tur === "metin" ? p.deger : "")).join(" ");
      if (duz && duz !== metin) onMetin(duz);
      return false;
    }
    onParcalar(cozulen);
    return true;
  }

  function yapiyiDegistir() {
    if (icIce) {
      onParcalar(undefined);
      return;
    }
    // TOHUMLAMA YER TUTUCUDA YAPILMAZ.
    //
    // Öğretmen bildirdi: "indisleri yazınca önceki indis aynı şekilde kalıyor,
    // yazdığın onun yanına yazılıyor." Sebebi buydu — integralin alt sınırı
    // varsayılan "0" ile geliyor, iç içe yapıya geçerken bu "0" bir metin
    // parçası olarak tohumlanıyor ve eklenen kesir onun YANINA diziliyordu.
    //
    // Ayrım "yer tutucu mu, öğretmenin yazdığı mı": kendi yazdığı metin
    // tohumlanmaya devam ediyor (x²+1'i kesrin payı yapmak isteyen kişi onu
    // yeniden yazmasın). Yer tutucu tohumlanmıyor.
    //
    // Tohumlamamak METNİ KAYBETTİRMEZ: `yapiyiDegistir` yalnız `parcalar`a
    // dokunuyor, `metin` yerinde kalıyor ve "Düz metne dön" ile geri geliyor.
    onParcalar(tohumParcalari(metin, varsayilan).map((deger) => ({
      id: yeniId(),
      tur: "metin" as const,
      deger,
    })));
  }

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-1.5 min-w-0">
      <div className="mb-1 flex items-center justify-between gap-2">
        <AlanEtiket>{etiket}</AlanEtiket>
        {derinlik < 3 && (
          <button
            type="button"
            onClick={() => {
              if (icIce) setDuzMetneDonOnayi(true);
              else yapiyiDegistir();
            }}
            className="text-[10px] font-semibold text-brand-600 hover:text-brand-700"
          >
            {icIce ? "Düz metne dön" : "İç içe ifade oluştur"}
          </button>
        )}
      </div>
      {duzMetneDonOnayi && (
        <KaydedilmemisUyarisi
          baslik="İç içe yapı kaldırılsın mı?"
          aciklama="Bu alandaki iç içe parçalar silinecek ve alan düz metne dönecek. Bu işlem geri alınamaz."
          atEtiketi="Düz metne dön"
          onVazgec={() => setDuzMetneDonOnayi(false)}
          onAt={() => {
            setDuzMetneDonOnayi(false);
            yapiyiDegistir();
          }}
        />
      )}
      {icIce ? (
        <AltIfadeEditor
          parcalar={parcalar}
          onChange={(deger) => onParcalar(deger)}
          derinlik={derinlik + 1}
        />
      ) : (
        <>
          <input
            aria-label={etiket}
            className={`${INPUT_CLS} min-w-[110px]`}
            value={metin}
            onChange={(e) => onMetin(e.target.value)}
            onBlur={yaziyiCoz}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing && yaziyiCoz()) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          />
          {derinlik < 3 && (
            <p className="mt-0.5 text-[9px] leading-tight text-slate-400">
              Kesir/üs/kök yazın (sin 3x / (2x), x^2, sqrt(x)); Enter ile çözülür.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function AltIfadeEditor({
  parcalar,
  onChange,
  derinlik,
}: {
  parcalar: DenklemParcasi[];
  onChange: (deger: DenklemParcasi[]) => void;
  derinlik: number;
}) {
  // İç içe alanda ARTIK tam liste var. Eskiden 8 tip elle sayılıydı ve
  // gerekçesi hiçbir yerde yazılı değildi; ölçüldü — çizim motoru 18 tipin
  // hepsini iç içe de doğru çiziyor (kesir payında integral, kök içinde
  // toplam denendi ve düzgün çizildi). Yani sınır koruyucu değil, boşluktu.
  //
  // Ama 18 düğmeyi kartın içine dizmek de olmazdı: iç içe 3 kademeye kadar
  // inebiliyor ve her kademe kendi çubuğunu taşırdı. Onun yerine TEK bir
  // "+ Parça" düğmesi ve aramalı liste — üstteki sembol aramasıyla aynı kalıp.
  const [ekleAcik, setEkleAcik] = useState(false);
  const [aracArama, setAracArama] = useState("");
  const suzulmus = useMemo(
    () => araclariSuz(PARCA_TANIMLARI, aracArama),
    [aracArama],
  );
  function altParcaEkle(tur: ParcaTuru) {
    onChange([...parcalar, yeniParca(tur)]);
    setEkleAcik(false);
    setAracArama("");
  }
  function tasi(index: number, yon: -1 | 1) {
    const hedef = index + yon;
    if (hedef < 0 || hedef >= parcalar.length) return;
    const kopya = [...parcalar];
    [kopya[index], kopya[hedef]] = [kopya[hedef], kopya[index]];
    onChange(kopya);
  }
  return (
    <div className="space-y-1.5">
      <div>
        <button
          type="button"
          aria-expanded={ekleAcik}
          onClick={() => setEkleAcik((a) => !a)}
          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:border-brand-200 hover:bg-brand-50"
        >
          + Parça
        </button>
        {ekleAcik && (
          <div className="mt-1 rounded-md border border-slate-200 bg-white p-1.5">
            <input
              autoFocus
              value={aracArama}
              onChange={(e) => setAracArama(e.target.value)}
              placeholder="Parça ara (kesir, integral, üslü…)"
              aria-label="Parça türü ara"
              className="w-full rounded border border-slate-200 px-2 py-1 text-[11px] outline-none focus:border-brand-400"
            />
            {suzulmus.length === 0 ? (
              <p className="mt-1 px-1 text-[10px] text-slate-400">
                “{aracArama}” ile eşleşen parça yok.
              </p>
            ) : (
              <div className="mt-1 flex max-h-40 flex-wrap gap-1 overflow-auto">
                {suzulmus.map(({ tur, etiket }) => (
                  <button
                    key={tur}
                    type="button"
                    onClick={() => altParcaEkle(tur)}
                    className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[9px] font-semibold text-slate-500 hover:border-brand-200 hover:bg-brand-50"
                  >
                    {etiket}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {parcalar.length === 0 && (
        <p className="rounded-md bg-white px-2 py-2 text-[10px] text-slate-400">
          Bu alan boş. “+ Parça” ile içerik ekleyin.
        </p>
      )}
      {parcalar.map((parca, index) => (
        <div
          key={parca.id}
          className="min-w-0 rounded-md border border-slate-200 bg-white p-1"
        >
          <div className="mb-1 flex items-center justify-between gap-1">
            <span className="text-[9px] font-bold uppercase text-slate-400">
              {index + 1}.{" "}
              {PARCA_TANIMLARI.find((tanim) => tanim.tur === parca.tur)?.etiket}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => tasi(index, -1)}
                className="text-[10px] text-slate-400 disabled:opacity-30"
              >
                ←
              </button>
              <button
                type="button"
                disabled={index === parcalar.length - 1}
                onClick={() => tasi(index, 1)}
                className="text-[10px] text-slate-400 disabled:opacity-30"
              >
                →
              </button>
              <button
                type="button"
                onClick={() =>
                  onChange(parcalar.filter((oge) => oge.id !== parca.id))
                }
                className="text-[10px] font-semibold text-rose-500"
              >
                Sil
              </button>
            </div>
          </div>
          <ParcaAlanlari
            parca={parca}
            derinlik={derinlik}
            onChange={(patch) =>
              onChange(
                parcalar.map((oge) =>
                  oge.id === parca.id
                    ? ({ ...oge, ...patch } as DenklemParcasi)
                    : oge,
                ),
              )
            }
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Sembol seçici — ARAMALI ve İKİ SETİ birden kapsar.
 *
 * NEDEN: `≤` için "İşlem", `π` için "Özel Sembol" parçası eklemek gerekiyordu;
 * aynı zihinsel iş ("bir sembol koy") iki ayrı parça tipine bölünmüştü ve
 * hangisinde olduğunu bilmeden bulmanın yolu yoktu. Oysa `operator` ve
 * `sembol` parçaları geometri ve çizimde BİREBİR aynı işleniyor (tek fark
 * seçicinin gösterdiği liste). Ayrım tamamen arayüz kaynaklıydı.
 *
 * Çözüm: hangi parça tipiyle girilirse girilsin seçici hepsini gösterir,
 * arama hem glife hem TÜRKÇE ada bakar ("küçük eşit" → ≤, "dalga" → λ).
 * Parça tipleri korundu — eski kayıtlar aynen açılıyor.
 */
function SembolSecici({
  deger,
  oncelikli,
  onChange,
}: {
  deger: string;
  /** Parçanın kendi seti önce gösterilir; öğretmenin sık kullandığı yol
   *  aramasız da hızlı kalsın. */
  oncelikli: "operator" | "sembol";
  onChange: (deger: string) => void;
}) {
  const [arama, setArama] = useState("");
  const gruplar = useMemo(
    () => sembolGruplariniSuz(arama, oncelikli),
    [arama, oncelikli],
  );
  const sonucYok = gruplar.length === 0;

  return (
    <div>
      <input
        className={INPUT_CLS}
        value={deger}
        onChange={(e) => onChange(e.target.value)}
      />
      <input
        className={`${INPUT_CLS} mt-1.5`}
        value={arama}
        onChange={(e) => setArama(e.target.value)}
        placeholder="Sembol ara (pi, küçük eşit, sonsuz…)"
        aria-label="Sembol ara"
      />
      {sonucYok ? (
        <p className="mt-1.5 text-[11px] text-slate-400">
          “{arama}” ile eşleşen sembol yok. Sembolü yukarıdaki kutuya doğrudan
          yazabilirsiniz.
        </p>
      ) : (
        gruplar.map((grup) => (
          <div key={grup.baslik} className="mt-1.5">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
              {grup.baslik}
            </p>
            <div className="flex flex-wrap gap-1">
              {grup.semboller.map((sembol) => (
                <button
                  key={sembol}
                  type="button"
                  title={grup.adlar[sembol]}
                  onClick={() => onChange(sembol)}
                  className={`min-w-7 rounded-md border px-1.5 py-1 text-sm ${
                    deger === sembol
                      ? "border-brand-400 bg-brand-50 text-brand-700"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  {sembol}
                </button>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function ParcaAlanlari({
  parca,
  onChange,
  derinlik = 0,
}: {
  parca: DenklemParcasi;
  onChange: (patch: Partial<DenklemParcasi>) => void;
  derinlik?: number;
}) {
  if (parca.tur === "metin") {
    return (
      <label className="block">
        <AlanEtiket>Metin</AlanEtiket>
        <input
          className={INPUT_CLS}
          value={parca.deger}
          onChange={(e) => onChange({ deger: e.target.value })}
        />
      </label>
    );
  }
  if (parca.tur === "operator" || parca.tur === "sembol") {
    return (
      <div>
        <AlanEtiket>
          {parca.tur === "operator"
            ? "İşlem / İlişki"
            : "Yunan harfi / Özel sembol"}
        </AlanEtiket>
        <SembolSecici
          deger={parca.sembol}
          oncelikli={parca.tur === "operator" ? "operator" : "sembol"}
          onChange={(sembol) => onChange({ sembol })}
        />
      </div>
    );
  }
  if (parca.tur === "kesir") {
    return (
      <div className="space-y-2">
        <IfadeDuzenleyici
          etiket="Pay (üst)"
          varsayilan={yerTutucu("kesir", "pay")}
          metin={parca.pay}
          parcalar={parca.payParcalari}
          onMetin={(pay) => onChange({ pay })}
          onParcalar={(payParcalari) => onChange({ payParcalari })}
          derinlik={derinlik}
        />
        <div className="h-px bg-slate-300" />
        <IfadeDuzenleyici
          etiket="Payda (alt)"
          varsayilan={yerTutucu("kesir", "payda")}
          metin={parca.payda}
          parcalar={parca.paydaParcalari}
          onMetin={(payda) => onChange({ payda })}
          onParcalar={(paydaParcalari) => onChange({ paydaParcalari })}
          derinlik={derinlik}
        />
      </div>
    );
  }
  if (parca.tur === "kok") {
    return (
      <div className="space-y-2">
        <IfadeDuzenleyici
          etiket="Derece (boş = karekök)"
          varsayilan={yerTutucu("kok", "derece")}
          metin={parca.derece}
          parcalar={parca.dereceParcalari}
          onMetin={(derece) => onChange({ derece })}
          onParcalar={(dereceParcalari) => onChange({ dereceParcalari })}
          derinlik={derinlik}
        />
        <IfadeDuzenleyici
          etiket="Kök içi"
          varsayilan={yerTutucu("kok", "icerik")}
          metin={parca.icerik}
          parcalar={parca.icerikParcalari}
          onMetin={(icerik) => onChange({ icerik })}
          onParcalar={(icerikParcalari) => onChange({ icerikParcalari })}
          derinlik={derinlik}
        />
      </div>
    );
  }
  if (parca.tur === "us") {
    const genisletildi =
      !!parca.tabanParcalari || !!parca.ustParcalari || !!parca.altParcalari;
    return (
      <div
        className={
          derinlik > 0 || genisletildi
            ? "space-y-2"
            : "grid gap-2 md:grid-cols-3"
        }
      >
        <IfadeDuzenleyici
          etiket="Taban"
          metin={parca.taban}
          parcalar={parca.tabanParcalari}
          onMetin={(taban) => onChange({ taban })}
          onParcalar={(tabanParcalari) => onChange({ tabanParcalari })}
          derinlik={derinlik}
        />
        <IfadeDuzenleyici
          etiket="Üst simge"
          metin={parca.ust}
          parcalar={parca.ustParcalari}
          onMetin={(ust) => onChange({ ust })}
          onParcalar={(ustParcalari) => onChange({ ustParcalari })}
          derinlik={derinlik}
        />
        <IfadeDuzenleyici
          etiket="Alt simge"
          metin={parca.alt}
          parcalar={parca.altParcalari}
          onMetin={(alt) => onChange({ alt })}
          onParcalar={(altParcalari) => onChange({ altParcalari })}
          derinlik={derinlik}
        />
      </div>
    );
  }
  if (parca.tur === "grup") {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-4 gap-1">
          {(["parantez", "koseli", "suslu", "mutlak"] as const).map((stil) => (
            <TogglePill
              key={stil}
              aktif={parca.stil === stil}
              onClick={() => onChange({ stil })}
            >
              {stil === "parantez"
                ? "( )"
                : stil === "koseli"
                  ? "[ ]"
                  : stil === "suslu"
                    ? "{ }"
                    : "|x|"}
            </TogglePill>
          ))}
        </div>
        <IfadeDuzenleyici
          etiket="Grup içeriği"
          metin={parca.icerik}
          parcalar={parca.icerikParcalari}
          onMetin={(icerik) => onChange({ icerik })}
          onParcalar={(icerikParcalari) => onChange({ icerikParcalari })}
          derinlik={derinlik}
        />
      </div>
    );
  }
  if (parca.tur === "fonksiyon") {
    return (
      <div className="space-y-2">
        <label className="block">
          <AlanEtiket>Fonksiyon</AlanEtiket>
          <select
            className={INPUT_CLS}
            value={parca.ad}
            onChange={(e) => onChange({ ad: e.target.value })}
          >
            {FONKSIYONLAR.map((ad) => (
              <option key={ad}>{ad}</option>
            ))}
          </select>
        </label>
        <IfadeDuzenleyici
          etiket="Fonksiyon içi"
          metin={parca.arguman}
          parcalar={parca.argumanParcalari}
          onMetin={(arguman) => onChange({ arguman })}
          onParcalar={(argumanParcalari) => onChange({ argumanParcalari })}
          derinlik={derinlik}
        />
      </div>
    );
  }
  if (parca.tur === "vektor") {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-5 gap-1">
          {(["ok", "kalin", "sapka", "ustcizgi", "nokta"] as const).map(
            (stil) => (
              <TogglePill
                key={stil}
                aktif={parca.stil === stil}
                onClick={() => onChange({ stil })}
              >
                {stil === "ok"
                  ? "Vektör →"
                  : stil === "kalin"
                    ? "Kalın"
                    : stil === "sapka"
                      ? "Şapka"
                      : stil === "ustcizgi"
                        ? "Üst çizgi"
                        : "Üst nokta"}
              </TogglePill>
            ),
          )}
        </div>
        <label className="block">
          <AlanEtiket>İfade</AlanEtiket>
          <input
            className={INPUT_CLS}
            value={parca.ifade}
            onChange={(e) => onChange({ ifade: e.target.value })}
          />
        </label>
      </div>
    );
  }
  if (parca.tur === "limit") {
    return (
      <div className="space-y-2">
        <IfadeDuzenleyici
          etiket="Alt yazı (ör. x→0)"
          varsayilan={yerTutucu("limit", "altYazi")}
          metin={parca.altYazi}
          parcalar={parca.altYaziParcalari}
          onMetin={(altYazi) => onChange({ altYazi })}
          onParcalar={(altYaziParcalari) => onChange({ altYaziParcalari })}
          derinlik={derinlik}
        />
        <IfadeDuzenleyici
          etiket="Limit ifadesi"
          varsayilan={yerTutucu("limit", "ifade")}
          metin={parca.ifade}
          parcalar={parca.ifadeParcalari}
          onMetin={(ifade) => onChange({ ifade })}
          onParcalar={(ifadeParcalari) => onChange({ ifadeParcalari })}
          derinlik={derinlik}
        />
      </div>
    );
  }
  if (parca.tur === "integral") {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-1">
          <TogglePill aktif={parca.kat === 1} onClick={() => onChange({ kat: 1 })}>
            Tek integral
          </TogglePill>
          <TogglePill aktif={parca.kat === 2} onClick={() => onChange({ kat: 2 })}>
            Çift integral
          </TogglePill>
          <TogglePill aktif={parca.kat === 3} onClick={() => onChange({ kat: 3 })}>
            Üçlü integral
          </TogglePill>
        </div>
        {/* Sınırlar artık düz `input` değil: içlerine kesir/kök konabiliyor.
            `IfadeDuzenleyici` düz metinken aynı input'u gösteriyor, yani
            yalnız metin yazan öğretmen için hiçbir şey değişmiyor. */}
        <div className="grid grid-cols-2 gap-2">
          <IfadeDuzenleyici
            etiket="Alt sınır"
            varsayilan={yerTutucu("integral", "altSinir")}
            metin={parca.altSinir}
            parcalar={parca.altSinirParcalari}
            onMetin={(altSinir) => onChange({ altSinir })}
            onParcalar={(altSinirParcalari) => onChange({ altSinirParcalari })}
            derinlik={derinlik}
          />
          <IfadeDuzenleyici
            etiket="Üst sınır"
            varsayilan={yerTutucu("integral", "ustSinir")}
            metin={parca.ustSinir}
            parcalar={parca.ustSinirParcalari}
            onMetin={(ustSinir) => onChange({ ustSinir })}
            onParcalar={(ustSinirParcalari) => onChange({ ustSinirParcalari })}
            derinlik={derinlik}
          />
        </div>
        <IfadeDuzenleyici
          etiket="İntegral ifadesi"
          varsayilan={yerTutucu("integral", "ifade")}
          metin={parca.ifade}
          parcalar={parca.ifadeParcalari}
          onMetin={(ifade) => onChange({ ifade })}
          onParcalar={(ifadeParcalari) => onChange({ ifadeParcalari })}
          derinlik={derinlik}
        />
      </div>
    );
  }
  if (parca.tur === "toplam" || parca.tur === "carpim") {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <IfadeDuzenleyici
            etiket="Alt yazı (ör. i=1)"
            varsayilan={yerTutucu(parca.tur, "altYazi")}
            metin={parca.altYazi}
            parcalar={parca.altYaziParcalari}
            onMetin={(altYazi) => onChange({ altYazi })}
            onParcalar={(altYaziParcalari) => onChange({ altYaziParcalari })}
            derinlik={derinlik}
          />
          <IfadeDuzenleyici
            etiket="Üst yazı (ör. n)"
            varsayilan={yerTutucu(parca.tur, "ustYazi")}
            metin={parca.ustYazi}
            parcalar={parca.ustYaziParcalari}
            onMetin={(ustYazi) => onChange({ ustYazi })}
            onParcalar={(ustYaziParcalari) => onChange({ ustYaziParcalari })}
            derinlik={derinlik}
          />
        </div>
        <IfadeDuzenleyici
          etiket={parca.tur === "carpim" ? "Çarpım ifadesi" : "Toplam ifadesi"}
          metin={parca.ifade}
          parcalar={parca.ifadeParcalari}
          onMetin={(ifade) => onChange({ ifade })}
          onParcalar={(ifadeParcalari) => onChange({ ifadeParcalari })}
          derinlik={derinlik}
        />
      </div>
    );
  }
  if (parca.tur === "turev") {
    return (
      <div>
        <div className="mb-2 grid grid-cols-2 gap-1">
          <TogglePill
            aktif={!parca.kismi}
            onClick={() => onChange({ kismi: false })}
          >
            d (tam türev)
          </TogglePill>
          <TogglePill
            aktif={parca.kismi}
            onClick={() => onChange({ kismi: true })}
          >
            ∂ (kısmi türev)
          </TogglePill>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <label>
            <AlanEtiket>Derece (boş = 1)</AlanEtiket>
            <input
              className={INPUT_CLS}
              value={parca.derece}
              onChange={(e) => onChange({ derece: e.target.value })}
              placeholder="2"
            />
          </label>
          <label>
            <AlanEtiket>Pay değişkeni</AlanEtiket>
            <input
              className={INPUT_CLS}
              value={parca.pay}
              onChange={(e) => onChange({ pay: e.target.value })}
            />
          </label>
          <label>
            <AlanEtiket>Payda değişkeni</AlanEtiket>
            <input
              className={INPUT_CLS}
              value={parca.payda}
              onChange={(e) => onChange({ payda: e.target.value })}
            />
          </label>
        </div>
      </div>
    );
  }
  if (parca.tur === "matris") {
    const satirlarMatris = parca.satirlar;
    const satirSayisi = satirlarMatris.length;
    const sutunSayisi = Math.max(1, ...satirlarMatris.map((satir) => satir.length));
    const hucreGuncelle = (r: number, s: number, deger: string) => {
      const kopya = satirlarMatris.map((satir) => [...satir]);
      kopya[r][s] = deger;
      onChange({ satirlar: kopya });
    };
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-1">
          {(["parantez", "koseli", "determinant"] as const).map((stil) => (
            <TogglePill
              key={stil}
              aktif={parca.stil === stil}
              onClick={() => onChange({ stil })}
            >
              {stil === "parantez" ? "( )" : stil === "koseli" ? "[ ]" : "Determinant"}
            </TogglePill>
          ))}
        </div>
        <div className="space-y-1">
          {parca.satirlar.map((satir, r) => (
            <div key={r} className="flex gap-1">
              {satir.map((hucre, s) => (
                <input
                  key={s}
                  className={`${INPUT_CLS} text-center`}
                  value={hucre}
                  onChange={(e) => hucreGuncelle(r, s, e.target.value)}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] font-semibold text-brand-600">
          <button
            type="button"
            onClick={() =>
              onChange({ satirlar: [...parca.satirlar, Array(sutunSayisi).fill("0")] })
            }
          >
            + Satır
          </button>
          <button
            type="button"
            disabled={satirSayisi <= 1}
            onClick={() => onChange({ satirlar: parca.satirlar.slice(0, -1) })}
            className="disabled:opacity-30"
          >
            − Satır
          </button>
          <button
            type="button"
            onClick={() =>
              onChange({
                satirlar: parca.satirlar.map((satir) => [...satir, "0"]),
              })
            }
          >
            + Sütun
          </button>
          <button
            type="button"
            disabled={sutunSayisi <= 1}
            onClick={() =>
              onChange({
                satirlar: parca.satirlar.map((satir) => satir.slice(0, -1)),
              })
            }
            className="disabled:opacity-30"
          >
            − Sütun
          </button>
        </div>
      </div>
    );
  }
  if (parca.tur === "sistem") {
    return (
      <div className="space-y-2">
        <AlanEtiket>Denklemler (her satır bir denklem)</AlanEtiket>
        {parca.satirlar.map((satir, i) => (
          <div key={i} className="space-y-1">
            <div className="flex gap-1">
              <input
                className={INPUT_CLS}
                value={satir}
                onChange={(e) => {
                  const kopya = [...parca.satirlar];
                  kopya[i] = e.target.value;
                  onChange({ satirlar: kopya });
                }}
              />
              <button
                type="button"
                disabled={parca.satirlar.length <= 1}
                onClick={() =>
                  onChange({ satirlar: parca.satirlar.filter((_, j) => j !== i) })
                }
                className="shrink-0 text-[10px] font-semibold text-rose-500 disabled:opacity-30"
              >
                Sil
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {OPERATORLER.map((sembol) => (
                <button
                  key={sembol}
                  type="button"
                  onClick={() => {
                    const kopya = [...parca.satirlar];
                    kopya[i] = kopya[i] + sembol;
                    onChange({ satirlar: kopya });
                  }}
                  className="min-w-6 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-600 hover:border-brand-300 hover:bg-brand-50"
                >
                  {sembol}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange({ satirlar: [...parca.satirlar, ""] })}
          className="text-[10px] font-semibold text-brand-600"
        >
          + Denklem ekle
        </button>
      </div>
    );
  }
  if (parca.tur === "parcali") {
    return (
      <div className="space-y-2">
        <AlanEtiket>Parçalar (ifade / koşul)</AlanEtiket>
        {parca.satirlar.map((satir, i) => (
          <div key={i} className="space-y-1">
            <div className="flex gap-1">
              <input
                className={INPUT_CLS}
                placeholder="ifade"
                value={satir.ifade}
                onChange={(e) => {
                  const kopya = parca.satirlar.map((s, j) =>
                    j === i ? { ...s, ifade: e.target.value } : s,
                  );
                  onChange({ satirlar: kopya });
                }}
              />
              <input
                className={INPUT_CLS}
                placeholder="koşul"
                value={satir.kosul}
                onChange={(e) => {
                  const kopya = parca.satirlar.map((s, j) =>
                    j === i ? { ...s, kosul: e.target.value } : s,
                  );
                  onChange({ satirlar: kopya });
                }}
              />
              <button
                type="button"
                disabled={parca.satirlar.length <= 1}
                onClick={() =>
                  onChange({ satirlar: parca.satirlar.filter((_, j) => j !== i) })
                }
                className="shrink-0 text-[10px] font-semibold text-rose-500 disabled:opacity-30"
              >
                Sil
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              <span className="mr-1 text-[10px] text-slate-400">koşula ekle:</span>
              {OPERATORLER.map((sembol) => (
                <button
                  key={sembol}
                  type="button"
                  onClick={() => {
                    const kopya = parca.satirlar.map((s, j) =>
                      j === i ? { ...s, kosul: s.kosul + sembol } : s,
                    );
                    onChange({ satirlar: kopya });
                  }}
                  className="min-w-6 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-600 hover:border-brand-300 hover:bg-brand-50"
                >
                  {sembol}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            onChange({ satirlar: [...parca.satirlar, { ifade: "", kosul: "" }] })
          }
          className="text-[10px] font-semibold text-brand-600"
        >
          + Parça ekle
        </button>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      <label>
        <AlanEtiket>Üst (n)</AlanEtiket>
        <input
          className={INPUT_CLS}
          value={parca.ust}
          onChange={(e) => onChange({ ust: e.target.value })}
        />
      </label>
      <label>
        <AlanEtiket>Alt (k)</AlanEtiket>
        <input
          className={INPUT_CLS}
          value={parca.alt}
          onChange={(e) => onChange({ alt: e.target.value })}
        />
      </label>
    </div>
  );
}
