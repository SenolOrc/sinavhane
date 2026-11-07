// Zengin metin düzenleyici ve onun salt-okunur ikizi.
//
// Ayrı dosyada olmasının nedeni yalnız boyut değil: burası `document.execCommand`
// kullanan TEK yer (deprecated Web API, README'de teknik borç olarak kayıtlı) ve
// üretilen HTML'in tek çıkışı `security/html.ts`. Düzenleyiciyi değiştiren biri
// sanitizer'ın beyaz listesini de gözden geçirmek zorunda; ikisinin ayrışması
// ya içerik kaybı (etiket süzülür) ya da açık üretir.

import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Eraser,
  List,
  ListOrdered,
  PenTool,
  Divide,
  Omega,
  Sigma,
  Subscript,
  Superscript,
  Table as TabloIkonu,
} from "lucide-react";

import { sayiSinirla, yeniId } from "../utils";
import { useDisariTiklama } from "@/lib/disariTiklama";
import { useDokunmatikDar } from "@/lib/dokunmatik";
import { htmlTemizle } from "../security/html";

import { DenklemEditoruModal } from "./DenklemEditoruModal";
import type { DenklemBelgesi, DenklemCikti } from "../denklem/tipler";
import { CizimEditoruModal } from "./CizimEditoruModal";
import type { CizimBelgesi, CizimCikti } from "../cizim/tipler";
// Fizik/matematik sorularında sık geçen semboller. Yeni kütüphane gerekmez,
// düz metin olarak imlece eklenir (insertText).
// Karışması kolay sembolleri (Ω/Σ gibi) buton üzerinde ad göstererek ayırt
// ettirir — küçük ızgarada glif tek başına yeterince açık olmuyor.
const SEMBOL_LISTESI: { sembol: string; ad: string }[] = [
  { sembol: "√", ad: "Karekök" },
  { sembol: "²", ad: "Üs 2" },
  { sembol: "³", ad: "Üs 3" },
  { sembol: "½", ad: "Yarım" },
  { sembol: "¼", ad: "Çeyrek" },
  { sembol: "¾", ad: "Üç bölü dört" },
  { sembol: "π", ad: "Pi" },
  { sembol: "Σ", ad: "Toplam (sigma)" },
  { sembol: "Δ", ad: "Delta — değişim" },
  { sembol: "∞", ad: "Sonsuz" },
  { sembol: "±", ad: "Artı eksi" },
  { sembol: "≈", ad: "Yaklaşık eşit" },
  { sembol: "≤", ad: "Küçük eşit" },
  { sembol: "≥", ad: "Büyük eşit" },
  { sembol: "≠", ad: "Eşit değil" },
  { sembol: "→", ad: "Ok" },
  { sembol: "°", ad: "Derece" },
  { sembol: "θ", ad: "Teta" },
  { sembol: "α", ad: "Alfa" },
  { sembol: "β", ad: "Beta" },
  { sembol: "γ", ad: "Gama" },
  { sembol: "λ", ad: "Lambda" },
  { sembol: "μ", ad: "Mü" },
  { sembol: "Ω", ad: "Ohm — direnç birimi" },
  { sembol: "δ", ad: "Delta (küçük)" },
  { sembol: "ε", ad: "Epsilon" },
  { sembol: "ζ", ad: "Zeta" },
  { sembol: "η", ad: "Eta" },
  { sembol: "κ", ad: "Kapa" },
  { sembol: "ν", ad: "Nü" },
  { sembol: "ξ", ad: "Ksi" },
  { sembol: "ρ", ad: "Ro" },
  { sembol: "σ", ad: "Sigma (küçük)" },
  { sembol: "τ", ad: "Tau" },
  { sembol: "φ", ad: "Fi" },
  { sembol: "χ", ad: "Hi (Chi)" },
  { sembol: "ψ", ad: "Psi" },
  { sembol: "ω", ad: "Omega (küçük)" },
  { sembol: "Π", ad: "Pi (büyük) — çarpım" },
  { sembol: "Φ", ad: "Fi (büyük) — manyetik akı" },
  { sembol: "Ψ", ad: "Psi (büyük) — dalga fonksiyonu" },
];

// Zengin metin editörü. Seçim, "selectionchange" ile bir ref'te saklanır;
// punto kutusuna tıklanınca tarayıcı seçimi düşürse bile saklanan seçim
// geri yüklenip biçim uygulanır (v0.11B4 punto düzeltmesi).
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = "90px",
  autoFocus = false,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  autoFocus?: boolean;
  kompakt?: boolean;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const kayitliSecim = useRef<Range | null>(null);
  const sembolKutusuRef = useRef<HTMLDivElement | null>(null);
  const kesirKutusuRef = useRef<HTMLDivElement | null>(null);
  const tabloKutusuRef = useRef<HTMLDivElement | null>(null);
  const [tabloAcik, setTabloAcik] = useState(false);
  const [tabloSatir, setTabloSatir] = useState(3);
  const [tabloSutun, setTabloSutun] = useState(3);
  const [tabloBaslik, setTabloBaslik] = useState(true);
  const [tabloIcinde, setTabloIcinde] = useState(false);
  const [manuelPunto, setManuelPunto] = useState(10);
  const [uyari, setUyari] = useState("");
  const [sembolAcik, setSembolAcik] = useState(false);
  const [sembolArama, setSembolArama] = useState("");
  const [kesirAcik, setKesirAcik] = useState(false);
  const [kesirPay, setKesirPay] = useState("");
  const [kesirPayda, setKesirPayda] = useState("");
  const [denklemModalAcik, setDenklemModalAcik] = useState(false);
  const duzenlenenDenklemId = useRef<string | null>(null);
  const denklemEklemeKonumu = useRef<Range | null>(null);
  const [duzenlenenDenklemBelgesi, setDuzenlenenDenklemBelgesi] =
    useState<DenklemBelgesi | undefined>(undefined);
  const [cizimModalAcik, setCizimModalAcik] = useState(false);
  const duzenlenenCizimId = useRef<string | null>(null);
  /** Metne eklenecek/düzenlenen çizimin kâğıttaki yüksekliği (CSS px; Orta = 120). */
  const [cizimYukseklikPx, setCizimYukseklikPx] = useState(120);
  const cizimEklemeKonumu = useRef<Range | null>(null);
  const [duzenlenenCizimBelgesi, setDuzenlenenCizimBelgesi] =
    useState<CizimBelgesi | undefined>(undefined);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && editor.innerHTML !== value) editor.innerHTML = value;
  }, [value]);

  useEffect(() => {
    const editor = editorRef.current;
    if (autoFocus && editor) editor.focus();
  }, [autoFocus]);

  useEffect(() => {
    function secimYakala() {
      const editor = editorRef.current;
      const secim = window.getSelection();
      if (!editor || !secim || secim.rangeCount === 0) return;
      const aralik = secim.getRangeAt(0);
      if (!editor.contains(aralik.commonAncestorContainer)) return;
      // Araç çubuğundaki bir düğmeye basmak (mousedown), preventDefault'a
      // RAĞMEN Chrome'da bazen canlı seçimi imlece ÇÖKERTİYOR (collapsed) —
      // bu da hemen bir selectionchange doğuruyor ve o daralmış aralık BURAYA
      // "son seçim" olarak yazılırsa, komutUygula() gerçek seçimi değil boş bir
      // imleci biçimlendirir (execCommand çökmüş seçimde görünür etki üretmez;
      // "fare ile kalın/italik çalışmıyor" hissi buradan geliyordu). Çökmüş bir
      // aralık, hâlâ dolu bir kayıtlı seçimin ÜZERİNE yazmasın: yalnız hiç kayıt
      // yokken veya gerçekten boş bir seçime geçilirken kaydı güncelliyoruz.
      if (aralik.collapsed && kayitliSecim.current && !kayitliSecim.current.collapsed) return;
      kayitliSecim.current = aralik.cloneRange();
    }
    document.addEventListener("selectionchange", secimYakala);
    return () => document.removeEventListener("selectionchange", secimYakala);
  }, []);

  useDisariTiklama(sembolAcik, () => setSembolAcik(false), sembolKutusuRef);

  useDisariTiklama(kesirAcik, () => setKesirAcik(false), kesirKutusuRef);

  useDisariTiklama(tabloAcik, () => setTabloAcik(false), tabloKutusuRef);

  function uyariGoster(mesaj: string) {
    setUyari(mesaj);
    window.setTimeout(() => setUyari(""), 3000);
  }

  // Sanitizer içeriği değiştirdiğinde (ör. üst/alt simge her tuş vuruşunda span'dan
  // <sub>/<sup>'a çevriliyor) innerHTML sıfırlanır; imleç konumu korunmazsa tarayıcı
  // imleci kaybeder ve kullanıcı "biçimden çıkamıyor" hissi yaşar. Metin ofsetiyle
  // (etiketlerden bağımsız) konumu ölçüp geri yüklüyoruz.
  // Konum birimi: metin karakteri + her blok öğe (div/p/li) başlangıcı için 1. Blok
  // sayılmazsa Enter'ın açtığı boş satırlar (<div><br></div> -> <p><br></p>) ölçümde
  // görünmez ve imleç bir önceki metne zıplar; yazılan satırlar birleşirdi.
  const BLOK_ETIKETLERI = ["DIV", "P", "LI"];

  function imlecKonumuOlc(editor: HTMLElement): number | null {
    const secim = window.getSelection();
    if (!secim || secim.rangeCount === 0) return null;
    const aralik = secim.getRangeAt(0);
    if (!editor.contains(aralik.startContainer)) return null;
    const imlec = document.createRange();
    imlec.setStart(aralik.startContainer, aralik.startOffset);
    imlec.collapse(true);
    const nokta = document.createRange();
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let toplam = 0;
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (!BLOK_ETIKETLERI.includes((node as Element).tagName)) continue;
        nokta.setStart(node, 0);
        nokta.collapse(true);
        if (nokta.compareBoundaryPoints(Range.START_TO_START, imlec) <= 0) toplam += 1;
        else break;
      } else {
        const uzunluk = node.textContent?.length ?? 0;
        nokta.setStart(node, uzunluk);
        nokta.collapse(true);
        if (nokta.compareBoundaryPoints(Range.START_TO_START, imlec) <= 0) toplam += uzunluk;
        else {
          if (node === aralik.startContainer) toplam += aralik.startOffset;
          break;
        }
      }
    }
    return toplam;
  }

  function imlecKonumunaGit(editor: HTMLElement, konum: number) {
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let kalan = konum;
    let kandidat: { dugum: Node; ofset: number } | null = null;
    let node: Node | null;
    const yerlestir = (dugum: Node, ofset: number) => {
      const aralik = document.createRange();
      aralik.setStart(dugum, ofset);
      aralik.collapse(true);
      araligiGeriYukle(aralik);
      kayitliSecim.current = aralik.cloneRange();
    };
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (!BLOK_ETIKETLERI.includes((node as Element).tagName)) continue;
        if (kalan === 0 && kandidat) break;
        kalan -= 1;
        if (kalan === 0) kandidat = { dugum: node, ofset: 0 };
        continue;
      }
      const uzunluk = node.textContent?.length ?? 0;
      if (kalan <= uzunluk) {
        yerlestir(node, kalan);
        return;
      }
      kalan -= uzunluk;
      if (kalan === 0) kandidat = { dugum: node, ofset: uzunluk };
    }
    if (kandidat) {
      yerlestir(kandidat.dugum, kandidat.ofset);
      return;
    }
    const sonAralik = document.createRange();
    sonAralik.selectNodeContents(editor);
    sonAralik.collapse(false);
    araligiGeriYukle(sonAralik);
    kayitliSecim.current = sonAralik.cloneRange();
  }

  function icerikGonder() {
    const editor = editorRef.current;
    if (!editor) return;
    const temiz = htmlTemizle(editor.innerHTML);
    if (editor.innerHTML !== temiz) {
      const konum = imlecKonumuOlc(editor);
      editor.innerHTML = temiz;
      if (konum !== null) imlecKonumunaGit(editor, konum);
    }
    onChange(temiz);
  }

  function aktifAralik(): Range | null {
    const editor = editorRef.current;
    if (!editor) return null;
    const kayitli = kayitliSecim.current;
    const kayitliGecerli = !!kayitli && editor.contains(kayitli.commonAncestorContainer);
    const secim = window.getSelection();
    const canliAralik =
      secim && secim.rangeCount > 0 && editor.contains(secim.getRangeAt(0).commonAncestorContainer)
        ? secim.getRangeAt(0)
        : null;
    if (canliAralik && !canliAralik.collapsed) return canliAralik;
    // Canlı seçim çökmüşse (bkz. secimYakala'daki gerekçe — araç çubuğu
    // mousedown'ı preventDefault'a rağmen bunu tetikleyebiliyor) ama dolu bir
    // kayıtlı seçim varsa ONU kullan; yoksa çökmüş imleç de geçerli bir
    // hedeftir (yeni yazıya biçim uygulamak için).
    if (kayitliGecerli) return kayitli;
    return canliAralik;
  }

  function araligiGeriYukle(aralik: Range) {
    const secim = window.getSelection();
    if (!secim) return;
    secim.removeAllRanges();
    secim.addRange(aralik);
  }

  function komutUygula(komut: string) {
    const editor = editorRef.current;
    if (!editor) return;
    const aralik = aktifAralik();
    editor.focus();
    if (!aralik) return;
    // Üst/alt simge: Chrome'un execCommand toggle durumu, sanitizer'ın ürettiği
    // gerçek <sub>/<sup> etiketlerini "zaten aktif" olarak tanımıyor (sadece kendi
    // ürettiği vertical-align span'ını tanıyor) — bu yüzden hem imleç etiketin
    // içindeyken (collapsed) hem de mevcut simgeli metin seçiliyken execCommand
    // toggle'ı güvenilmez/işlevsiz kalıyordu ("biçimden nasıl çıkılıyor" sorunu).
    // Bu iki durumu DOM'u kendimiz yöneterek çözüyoruz: etiket bulunursa kaldırılır.
    if (komut === "subscript" || komut === "superscript") {
      const etiketAdi = komut === "subscript" ? "sub" : "sup";
      function etiketiBul(node: Node | null): HTMLElement | null {
        while (node && node !== editor) {
          if (
            node.nodeType === 1 &&
            (node as HTMLElement).tagName.toLowerCase() === etiketAdi
          )
            return node as HTMLElement;
          node = node.parentNode;
        }
        return null;
      }
      const basEtiket = etiketiBul(aralik.startContainer);
      const bitEtiket = aralik.collapsed
        ? basEtiket
        : etiketiBul(aralik.endContainer);
      const etiket = basEtiket && basEtiket === bitEtiket ? basEtiket : null;
      if (etiket) {
        const isaretci = document.createTextNode("​");
        if (aralik.collapsed) {
          etiket.after(isaretci);
        } else {
          etiket.replaceWith(...Array.from(etiket.childNodes), isaretci);
        }
        const yeniAralik = document.createRange();
        yeniAralik.setStart(isaretci, 1);
        yeniAralik.collapse(true);
        araligiGeriYukle(yeniAralik);
        kayitliSecim.current = yeniAralik.cloneRange();
        icerikGonder();
        return;
      }
    }
    araligiGeriYukle(aralik);
    // Chrome: seçim salt inline eleman (ör. <span>) içindeyse justify*/liste
    // komutları blok yokluğunda sessizce hiçbir şey yapmaz; önce formatBlock ile
    // blok kurar. Bu, seçimin öncesinde/sonrasında boş <p></p> bırakabilir; temizlenir.
    const blokGerekli =
      komut.startsWith("justify") ||
      komut === "insertUnorderedList" ||
      komut === "insertOrderedList";
    if (blokGerekli) document.execCommand("formatBlock", false, "p");
    document.execCommand(komut, false);
    if (blokGerekli) {
      editor.querySelectorAll("p").forEach((p) => {
        if (!p.textContent?.trim() && p.children.length === 0) p.remove();
      });
    }
    icerikGonder();
  }

  const sembolFiltreli = (() => {
    const sorgu = sembolArama.trim().toLocaleLowerCase("tr");
    if (!sorgu) return SEMBOL_LISTESI;
    return SEMBOL_LISTESI.filter(
      ({ sembol, ad }) =>
        ad.toLocaleLowerCase("tr").includes(sorgu) ||
        sembol.toLocaleLowerCase("tr").includes(sorgu),
    );
  })();

  function sembolEkle(sembol: string) {
    const editor = editorRef.current;
    if (!editor) return;
    const aralik = aktifAralik();
    editor.focus();
    if (aralik) araligiGeriYukle(aralik);
    document.execCommand("insertText", false, sembol);
    icerikGonder();
    setSembolAcik(false);
  }

  function kesirEkle() {
    const pay = kesirPay.trim();
    const payda = kesirPayda.trim();
    if (!pay || !payda) return;
    const editor = editorRef.current;
    if (!editor) return;
    const aralik = aktifAralik();
    editor.focus();
    if (aralik) araligiGeriYukle(aralik);
    const kacis = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    // "/" kesir-cizgi içinde gerçek bir metin düğümü olarak durur (Word/düz metne
    // aktarınca "3/7" okunsun diye); görsel olarak index.css'teki font-size:0 gizler,
    // çizgiyi border-top çizer.
    document.execCommand(
      "insertHTML",
      false,
      `<span class="kesir"><span class="kesir-pay">${kacis(pay)}</span><span class="kesir-cizgi">/</span><span class="kesir-payda">${kacis(payda)}</span></span>&nbsp;`,
    );
    icerikGonder();
    setKesirAcik(false);
    setKesirPay("");
    setKesirPayda("");
  }

  /** İmlecin bulunduğu tablo hücresi (editörün içinde), yoksa null. */
  function imlecHucresi(): HTMLTableCellElement | null {
    const editor = editorRef.current;
    if (!editor) return null;
    // Hücre için CANLI seçim esas alınır: aktifAralik() çökmüş imleçte eski (dolu) kayıtlı seçimi
    // döndürebilir; metin seçip başka hücreye tıklayınca satır/sütun işlemi eski hücreye uygulanırdı.
    const secim = window.getSelection();
    const canli = secim && secim.rangeCount > 0 && editor.contains(secim.getRangeAt(0).commonAncestorContainer) ? secim.getRangeAt(0) : null;
    const aralik = canli ?? aktifAralik();
    if (!aralik) return null;
    const dugum = aralik.startContainer;
    const el = dugum.nodeType === 1 ? (dugum as Element) : dugum.parentElement;
    const hucre = el?.closest("td, th") as HTMLTableCellElement | null;
    return hucre && editor.contains(hucre) ? hucre : null;
  }

  function hucreyeGit(hucre: Element) {
    const sec = window.getSelection();
    if (!sec) return;
    const r = document.createRange();
    r.selectNodeContents(hucre);
    r.collapse(true);
    sec.removeAllRanges();
    sec.addRange(r);
  }

  /** Tab / Shift+Tab: tablo hücreleri arasında gezinir; son hücrede Tab yeni satır açar. */
  function editorTusu(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab" || event.nativeEvent.isComposing) return;
    const editor = editorRef.current;
    const sec = window.getSelection();
    if (!editor || !sec || sec.rangeCount === 0) return;
    const dugum = sec.getRangeAt(0).startContainer;
    const el = dugum.nodeType === 1 ? (dugum as Element) : dugum.parentElement;
    const hucre = el?.closest("td, th");
    if (!hucre || !editor.contains(hucre)) return;
    event.preventDefault();
    const tablo = hucre.closest("table") as HTMLTableElement;
    const hepsi = Array.from(tablo.querySelectorAll("td, th"));
    const no = hepsi.indexOf(hucre);
    if (event.shiftKey) {
      if (no > 0) hucreyeGit(hepsi[no - 1]);
      return;
    }
    if (no < hepsi.length - 1) return hucreyeGit(hepsi[no + 1]);
    if (tablo.rows.length >= 20) return;
    const yeniSatir = document.createElement("tr");
    Array.from((hucre.parentElement as HTMLTableRowElement).children).forEach(() => {
      const h = document.createElement("td");
      h.appendChild(document.createElement("br"));
      yeniSatir.appendChild(h);
    });
    (hucre.parentElement as HTMLTableRowElement).after(yeniSatir);
    const tabloNo = Array.from(editor.querySelectorAll("table")).indexOf(tablo);
    icerikGonder();
    // Temizleme editörü yeniden yazmış olabilir: tabloyu sırasıyla yeniden bul.
    const guncel = editor.querySelectorAll("table")[tabloNo] as HTMLTableElement | undefined;
    const sonSatir = guncel?.rows[guncel.rows.length - 1];
    if (sonSatir?.firstElementChild) hucreyeGit(sonSatir.firstElementChild);
  }

  /** Basit tablo ekler: satır x sütun, istenirse üst satır başlık (kalın). */
  function tabloEkle() {
    const satir = sayiSinirla(Math.round(tabloSatir) || 1, 1, 20);
    const sutun = sayiSinirla(Math.round(tabloSutun) || 1, 1, 20);
    const editor = editorRef.current;
    if (!editor) return;
    const aralik = aktifAralik();
    editor.focus();
    if (aralik) araligiGeriYukle(aralik);
    const hucre = (etiket: "td" | "th") => `<${etiket}><br></${etiket}>`;
    let satirlar = "";
    for (let r = 0; r < satir; r += 1) {
      satirlar += `<tr>${(tabloBaslik && r === 0 ? hucre("th") : hucre("td")).repeat(sutun)}</tr>`;
    }
    // İmleç bir tablo hücresindeyse iç içe tablo olmasın: tablonun SONUNA eklenir.
    const mevcut = imlecHucresi()?.closest("table");
    if (mevcut) {
      const sonra = document.createRange();
      sonra.setStartAfter(mevcut);
      sonra.collapse(true);
      araligiGeriYukle(sonra);
    }
    const oncekiTablolar = new Set(Array.from(editor.querySelectorAll("table")));
    document.execCommand(
      "insertHTML",
      false,
      `<table class="soru-tablo" data-yeni="1"><tbody>${satirlar}</tbody></table><p><br></p>`,
    );
    // Eklenen tablo: tarayıcı işaretimizi korumamış olabilir, bu yüzden "öncekilerde olmayan".
    const yeni = Array.from(editor.querySelectorAll("table")).find((t) => !oncekiTablolar.has(t));
    let tabloNo = -1;
    if (yeni) {
      yeni.removeAttribute("data-yeni");
      tabloNo = Array.from(editor.querySelectorAll("table")).indexOf(yeni);
    }
    icerikGonder();
    // Temizleme editörü yeniden yazmış olabilir: eklenen tabloyu SIRASIYLA bulup
    // imleci ilk hücresine koy (yazmaya hemen başlanabilsin; Tab sonraki hücre).
    if (tabloNo >= 0) {
      const ilk = editor.querySelectorAll("table")[tabloNo]?.querySelector("th, td");
      if (ilk) hucreyeGit(ilk);
    }
    setTabloAcik(false);
  }

  /** İmlecin bulunduğu tabloda satır/sütun ekleme-silme. */
  function tabloIslemi(islem: "satirEkle" | "sutunEkle" | "satirSil" | "sutunSil" | "tabloSil") {
    const editor = editorRef.current;
    const hucre = imlecHucresi();
    if (!editor || !hucre) return;
    const satir = hucre.parentElement as HTMLTableRowElement;
    const tablo = hucre.closest("table") as HTMLTableElement;
    const sutunNo = Array.from(satir.children).indexOf(hucre);
    const bosHucre = (etiket: string) => {
      const h = document.createElement(etiket);
      h.appendChild(document.createElement("br"));
      return h;
    };
    const satirlar = Array.from(tablo.rows);
    if (islem === "satirEkle") {
      if (satirlar.length >= 20) return uyariGoster("Tabloda en çok 20 satır olabilir.");
      const yeni = document.createElement("tr");
      Array.from(satir.children).forEach(() => yeni.appendChild(bosHucre("td")));
      satir.after(yeni);
    } else if (islem === "sutunEkle") {
      if (satir.children.length >= 20) return uyariGoster("Tabloda en çok 20 sütun olabilir.");
      satirlar.forEach((s) => {
        const kaynak = s.children[sutunNo] as HTMLElement | undefined;
        const yeni = bosHucre(kaynak?.tagName.toLowerCase() === "th" ? "th" : "td");
        if (kaynak) kaynak.after(yeni);
        else s.appendChild(yeni);
      });
    } else if (islem === "satirSil") {
      if (satirlar.length <= 1) tablo.remove();
      else satir.remove();
    } else if (islem === "sutunSil") {
      if (satir.children.length <= 1) tablo.remove();
      else satirlar.forEach((s) => s.children[sutunNo]?.remove());
    } else {
      tablo.remove();
    }
    icerikGonder();
    setTabloIcinde(false);
    setTabloAcik(false);
  }

  function denklemEklemeyiAc() {
    // İmleç konumu MODAL AÇILMADAN ÖNCE yakalanır — modal açıkken kullanıcı
    // uzun süre parça düzenleyebilir, bu sırada tarayıcı seçimi tamamen
    // temizleyebilir (rangeCount 0'a düşer). Kaydı burada almak, "Metne Ekle"ye
    // basıldığında imlecin doğru yerde olmasını garanti eder.
    // Not: aktifAralik() burada kasıtlı kullanılmıyor. O fonksiyon canlı seçimi
    // kayıtlı seçime tercih ediyor; ama araç çubuğu butonuna tıklamak (mousedown
    // preventDefault'a rağmen) tarayıcıda canlı seçimi metin başına (offset 0)
    // sıfırlayabiliyor — kayıtlı seçim ise doğru kalıyor. Bu yüzden burada
    // önce kayıtlı seçime bakılır, o geçersizse canlı seçime düşülür.
    const editor = editorRef.current;
    const kayitli = kayitliSecim.current;
    denklemEklemeKonumu.current =
      kayitli && editor && editor.contains(kayitli.commonAncestorContainer)
        ? kayitli
        : aktifAralik();
    duzenlenenDenklemId.current = null;
    setDuzenlenenDenklemBelgesi(undefined);
    setDenklemModalAcik(true);
  }

  function denklemDuzenlemeyeAc(img: HTMLImageElement) {
    const ham = img.dataset.denklem;
    if (!ham) return;
    try {
      const belge = JSON.parse(decodeURIComponent(ham)) as DenklemBelgesi;
      duzenlenenDenklemId.current = img.dataset.denklemId ?? null;
      setDuzenlenenDenklemBelgesi(belge);
      setDenklemModalAcik(true);
    } catch {
      // bozuk veri — düzenleme açılmadan sessizce yok sayılır
    }
  }

  function denklemModaldanGeldi(cikti: DenklemCikti) {
    const editor = editorRef.current;
    if (!editor) return;
    // Denklemin GERÇEK yüksekliği kullanılır. Sabit punto*1.5 katsayısı,
    // içerikten bağımsız olduğu için düz metin bloğunu az, kesir/integral gibi
    // uzun yapıları çok küçültüyordu: punto=14'te bir kesir ~40px çizilip 21px'e
    // sıkıştırıldığı için rakamları okunmaz hâle geliyordu.
    // Üst sınır, tek bir dev denklemin satırı patlatmasını engeller
    // (security/html.ts de 10-200px aralığına sıkıştırıyor).
    const yukseklik = Math.round(
      Math.min(200, Math.max(10, cikti.denklemVerisi.punto * cikti.yukseklikOrani)),
    );
    // Yükseklik okunaklı kalacak şekilde sınırlanıyor ama GENİŞLİK hiç
    // kontrol edilmiyordu: kesir+kök+limit+integral+matris gibi yapıları art
    // arda içeren bir denklem doğal olarak çok geniş çiziliyor, sütuna
    // sığmayınca yazdırma/önizleme CSS'i (`max-width:100%`) yalnız GENİŞLİĞİ
    // küçültüyor — yükseklik sabit kaldığı için oran bozulup rakamlar daha da
    // sıkışıyordu. Otomatik yeniden boyutlandırmak (Faz D'nin ertelediği
    // denklem motoru yeniden tasarımına giriyor) yerine öğretmeni burada
    // uyarıyoruz; editörün kendi genişliği sütun genişliğine yakın bir vekil.
    const dogalGenislik = yukseklik * cikti.oran;
    if (dogalGenislik > (editor.clientWidth || 600)) {
      uyariGoster("Bu denklem geniş; basılı çıktıda küçülüp okunması zorlaşabilir. Yapıyı sadeleştirmeyi veya iki parçaya bölmeyi düşünün.");
    }
    const veri = encodeURIComponent(JSON.stringify(cikti.denklemVerisi));
    const duzenlenenId = duzenlenenDenklemId.current;
    if (duzenlenenId) {
      const mevcut = editor.querySelector<HTMLImageElement>(
        `img[data-denklem-id="${duzenlenenId}"]`,
      );
      if (mevcut) {
        mevcut.src = cikti.dataUrl;
        mevcut.dataset.denklem = veri;
        mevcut.style.height = `${yukseklik}px`;
      }
    } else {
      const kayitliKonum = denklemEklemeKonumu.current;
      const aralik =
        kayitliKonum && editor.contains(kayitliKonum.commonAncestorContainer)
          ? kayitliKonum
          : aktifAralik();
      editor.focus();
      if (aralik) araligiGeriYukle(aralik);
      const id = yeniId();
      document.execCommand(
        "insertHTML",
        false,
        `<img src="${cikti.dataUrl}" data-denklem-id="${id}" data-denklem="${veri}" class="denklem-inline" alt="denklem" style="height:${yukseklik}px;vertical-align:middle;cursor:pointer;" />&nbsp;`,
      );
    }
    icerikGonder();
    setDenklemModalAcik(false);
    duzenlenenDenklemId.current = null;
    denklemEklemeKonumu.current = null;
    setDuzenlenenDenklemBelgesi(undefined);
  }

  function cizimEklemeyiAc() {
    // Denklem ekleme ile aynı gerekçe: imleç konumu modal açılmadan ÖNCE
    // yakalanır, çünkü modal açıkken kullanıcı uzun süre şekil düzenleyebilir
    // ve bu sırada tarayıcı seçimi tamamen temizleyebilir.
    const editor = editorRef.current;
    const kayitli = kayitliSecim.current;
    cizimEklemeKonumu.current =
      kayitli && editor && editor.contains(kayitli.commonAncestorContainer)
        ? kayitli
        : aktifAralik();
    duzenlenenCizimId.current = null;
    setDuzenlenenCizimBelgesi(undefined);
    setCizimModalAcik(true);
  }

  function cizimDuzenlemeyeAc(img: HTMLImageElement) {
    const ham = img.dataset.cizim;
    if (!ham) return;
    try {
      const belge = JSON.parse(decodeURIComponent(ham)) as CizimBelgesi;
      duzenlenenCizimId.current = img.dataset.cizimId ?? null;
      const mevcutYuksek = parseFloat(img.style.height);
      if (mevcutYuksek > 0) setCizimYukseklikPx(Math.round(Math.min(200, Math.max(20, mevcutYuksek))));
      setDuzenlenenCizimBelgesi(belge);
      setCizimModalAcik(true);
    } catch {
      // bozuk veri — düzenleme açılmadan sessizce yok sayılır
    }
  }

  function cizimModaldanGeldi(cikti: CizimCikti) {
    const editor = editorRef.current;
    if (!editor) return;
    const veri = encodeURIComponent(JSON.stringify(cikti.cizimVerisi));
    const duzenlenenId = duzenlenenCizimId.current;
    if (duzenlenenId) {
      const mevcut = editor.querySelector<HTMLImageElement>(
        `img[data-cizim-id="${duzenlenenId}"]`,
      );
      if (mevcut) {
        mevcut.src = cikti.dataUrl;
        mevcut.dataset.cizim = veri;
        mevcut.style.height = `${cizimYukseklikPx}px`;
      }
    } else {
      const kayitliKonum = cizimEklemeKonumu.current;
      const aralik =
        kayitliKonum && editor.contains(kayitliKonum.commonAncestorContainer)
          ? kayitliKonum
          : aktifAralik();
      editor.focus();
      if (aralik) araligiGeriYukle(aralik);
      const id = yeniId();
      // Yükseklik kullanıcı seçimi (Küçük 70 / Orta 120 / Büyük 180 px ya da px
      // girişi; varsayılan Orta). Genişlik img'in doğal oranından gelir, yani
      // çizimin en-boyu korunur.
      const yukseklikPx = cizimYukseklikPx;
      document.execCommand(
        "insertHTML",
        false,
        `<img src="${cikti.dataUrl}" data-cizim-id="${id}" data-cizim="${veri}" class="cizim-inline" alt="çizim" style="height:${yukseklikPx}px;vertical-align:middle;cursor:pointer;" />&nbsp;`,
      );
    }
    icerikGonder();
    setCizimModalAcik(false);
    duzenlenenCizimId.current = null;
    cizimEklemeKonumu.current = null;
    setDuzenlenenCizimBelgesi(undefined);
  }

  function editorTiklandi(event: ReactMouseEvent<HTMLDivElement>) {
    const hedef = event.target;
    if (hedef instanceof HTMLImageElement && hedef.classList.contains("denklem-inline")) {
      event.preventDefault();
      denklemDuzenlemeyeAc(hedef);
    } else if (hedef instanceof HTMLImageElement && hedef.classList.contains("cizim-inline")) {
      event.preventDefault();
      cizimDuzenlemeyeAc(hedef);
    }
  }

  function puntoDegeriUygula(punto: number) {
    const editor = editorRef.current;
    if (!editor) return;
    const aralik = aktifAralik();
    if (!aralik || aralik.collapsed) {
      uyariGoster("Önce punto verilecek metni seçin, sonra puntoya basın.");
      return;
    }
    setManuelPunto(punto);
    editor.focus();
    araligiGeriYukle(aralik);
    const span = document.createElement("span");
    span.style.fontSize = `${punto}pt`;
    try {
      aralik.surroundContents(span);
    } catch {
      const icerik = aralik.extractContents();
      span.appendChild(icerik);
      aralik.insertNode(span);
    }
    // Aynı seçime tekrar punto verildiğinde `<span 18pt><span 8pt>…` diye
    // sonsuza kadar iç içe etiket üretme. Yeni seçim içindeki eski punto
    // kurallarını kaldır; seçim eski bir punto span'ının tamamıysa o dış
    // kabuğu da güvenle sadeleştir. Kalın/italik gibi başka nitelikler korunur.
    [...span.querySelectorAll<HTMLElement>("span")].reverse().forEach((alt) => {
      alt.style.removeProperty("font-size");
      if (!alt.getAttribute("style")?.trim()) alt.removeAttribute("style");
      if (alt.attributes.length === 0) alt.replaceWith(...alt.childNodes);
    });
    let dis = span.parentElement;
    while (dis?.tagName === "SPAN" && dis.childNodes.length === 1 && dis.firstChild === span) {
      dis.style.removeProperty("font-size");
      if (!dis.getAttribute("style")?.trim()) dis.removeAttribute("style");
      if (dis.attributes.length > 0) break;
      const sonrakiDis = dis.parentElement;
      dis.replaceWith(span);
      dis = sonrakiDis;
    }
    const yeniAralik = document.createRange();
    yeniAralik.selectNodeContents(span);
    araligiGeriYukle(yeniAralik);
    kayitliSecim.current = yeniAralik.cloneRange();
    icerikGonder();
  }

  function puntoUygula() {
    puntoDegeriUygula(manuelPunto);
  }

  const dar = useDokunmatikDar();
  const arac =
    `rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 ${dar ? "inline-flex min-w-[40px] items-center justify-center text-sm" : ""}`;

  return (
    <div className={dar ? "relative mt-1" : "mt-1"}>
      {/* Dar/dokunmatik ekranda araç çubuğu TEK SATIR ve yatay kayar (K10/T9):
          `flex-wrap` + sağda mutlak konumlu Punto kutusu (pr-[165px]) 320 px'te
          düğmelere ~100 px bırakıyor, çubuk 380 px'lik dikey bir yığına
          dönüşüp yazı alanını ekranın altına itiyordu. Kayan şerit açılır
          kutuları (sembol/kesir) kırpacağı için onlar dar kipte şeridin
          DIŞINDAKİ kaba göre konumlanır (şerit ve sarmalayıcılar `relative`
          değil). */}
      <div className={dar
        // OA52: telefonda yatay kayan şerit yerine SARAN şerit — sağda kalan
        // düğmeler (hizalama, liste, sembol, punto) görünmüyordu; harf düğmeleri
        // (K/İ/A) 17–23 px'ti. Şerit artık `relative`: açılır kutular onun altına.
        ? "relative flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-slate-200 bg-slate-50 px-1.5 py-1.5"
        : "relative flex flex-wrap items-center gap-0.5 rounded-t-lg border border-b-0 border-slate-200 bg-slate-50 py-1.5 pl-2 pr-[165px]"}>
        <button
          type="button"
          className={`${arac} font-bold`}
          title="Kalın"
          aria-label="Kalın"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => komutUygula("bold")}
        >
          K
        </button>
        <button
          type="button"
          className={`${arac} italic`}
          title="İtalik"
          aria-label="İtalik"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => komutUygula("italic")}
        >
          İ
        </button>
        <button
          type="button"
          className={`${arac} underline`}
          title="Altı çizili"
          aria-label="Altı çizili"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => komutUygula("underline")}
        >
          A
        </button>
        <span className="mx-0.5 h-4 w-px bg-slate-200" />
        <button
          type="button"
          className={arac}
          title="Sola hizala"
          aria-label="Sola hizala"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => komutUygula("justifyLeft")}
        >
          <AlignLeft size={14} />
        </button>
        <button
          type="button"
          className={arac}
          title="Ortala"
          aria-label="Ortala"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => komutUygula("justifyCenter")}
        >
          <AlignCenter size={14} />
        </button>
        <button
          type="button"
          className={arac}
          title="Sağa hizala"
          aria-label="Sağa hizala"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => komutUygula("justifyRight")}
        >
          <AlignRight size={14} />
        </button>
        <button
          type="button"
          className={arac}
          title="İki yana yasla"
          aria-label="İki yana yasla"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => komutUygula("justifyFull")}
        >
          <AlignJustify size={14} />
        </button>
        <span className="mx-0.5 h-4 w-px bg-slate-200" />
        <button
          type="button"
          className={arac}
          title="Madde işaretli liste"
          aria-label="Madde işaretli liste"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => komutUygula("insertUnorderedList")}
        >
          <List size={14} />
        </button>
        <button
          type="button"
          className={arac}
          title="Numaralı liste"
          aria-label="Numaralı liste"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => komutUygula("insertOrderedList")}
        >
          <ListOrdered size={14} />
        </button>
        <span className="mx-0.5 h-4 w-px bg-slate-200" />
        <button
          type="button"
          className={arac}
          title="Üst simge (x²)"
          aria-label="Üst simge (x²)"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => komutUygula("superscript")}
        >
          <Superscript size={14} />
        </button>
        <button
          type="button"
          className={arac}
          title="Alt simge (H₂O)"
          aria-label="Alt simge (H₂O)"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => komutUygula("subscript")}
        >
          <Subscript size={14} />
        </button>
        <span className="mx-0.5 h-4 w-px bg-slate-200" />
        <button
          type="button"
          className={arac}
          title="Biçimlendirmeyi temizle"
          aria-label="Biçimlendirmeyi temizle"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => komutUygula("removeFormat")}
        >
          <Eraser size={14} />
        </button>
        <span className="mx-0.5 h-4 w-px bg-slate-200" />
        <div className={dar ? "" : "relative"} ref={sembolKutusuRef}>
          <button
            type="button"
            className={arac}
            title="Sembol ekle"
          aria-label="Sembol ekle"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setSembolAcik((a) => !a);
              setSembolArama("");
            }}
          >
            <Omega size={14} />
          </button>
          {sembolAcik && (
            <div className={`${dar ? "left-2 top-full z-20 mt-1" : "left-0 top-full z-10 mt-1"} absolute w-52 rounded-lg border border-slate-200 bg-white p-2 shadow-lg`}>
              <input
                type="text"
                value={sembolArama}
                onChange={(e) => setSembolArama(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && sembolFiltreli[0]) {
                    e.preventDefault();
                    sembolEkle(sembolFiltreli[0].sembol);
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setSembolAcik(false);
                  }
                }}
                autoFocus
                placeholder="Ara... (ör. sigma)"
                className="mb-2 w-full rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 outline-none focus:border-brand-400"
              />
              <div className="grid grid-cols-6 gap-1">
                {sembolFiltreli.map(({ sembol, ad }) => (
                  <button
                    key={sembol}
                    type="button"
                    title={ad}
                    className="rounded-md py-1 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => sembolEkle(sembol)}
                  >
                    {sembol}
                  </button>
                ))}
                {sembolFiltreli.length === 0 && (
                  <p className="col-span-6 py-2 text-center text-[11px] text-slate-400">
                    Sonuç yok
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
        <div className={dar ? "" : "relative"} ref={kesirKutusuRef}>
          <button
            type="button"
            className={arac}
            title="Kesir ekle (üstte pay, altta payda)"
          aria-label="Kesir ekle (üstte pay, altta payda)"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setKesirAcik((a) => !a)}
          >
            <Divide size={14} />
          </button>
          {kesirAcik && (
            <div className={`${dar ? "left-2 top-full z-20 mt-1" : "left-0 top-full z-10 mt-1"} absolute w-36 rounded-lg border border-slate-200 bg-white p-2 shadow-lg`}>
              <input
                value={kesirPay}
                onChange={(e) => setKesirPay(e.target.value)}
                placeholder="Pay"
                className="w-full rounded-md border border-slate-200 px-2 py-1 text-center text-xs outline-none focus:border-brand-400"
                autoFocus
              />
              <div className="my-1.5 h-px bg-slate-300" />
              <input
                value={kesirPayda}
                onChange={(e) => setKesirPayda(e.target.value)}
                placeholder="Payda"
                className="w-full rounded-md border border-slate-200 px-2 py-1 text-center text-xs outline-none focus:border-brand-400"
                onKeyDown={(e) => {
                  if (e.key === "Enter") kesirEkle();
                }}
              />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={kesirEkle}
                disabled={!kesirPay.trim() || !kesirPayda.trim()}
                className="mt-1.5 w-full rounded-md bg-brand-600 py-1 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Ekle
              </button>
            </div>
          )}
        </div>
        <div className={dar ? "" : "relative"} ref={tabloKutusuRef}>
          <button
            type="button"
            className={arac}
            title="Tablo ekle (satır x sütun; hücrelere tıklayıp yazın)"
            aria-label="Tablo ekle (satır x sütun; hücrelere tıklayıp yazın)"
            data-testid="tablo-ekle-ac"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setTabloIcinde(!!imlecHucresi());
              setTabloAcik((a) => !a);
            }}
          >
            <TabloIkonu size={14} />
          </button>
          {tabloAcik && (
            <div
              role="dialog"
              aria-label="Tablo"
              className={`${dar ? "left-2 top-full z-20 mt-1" : "left-0 top-full z-10 mt-1"} absolute w-56 rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700 shadow-lg`}
            >
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1">
                  Satır
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={tabloSatir}
                    aria-label="Tablo satır sayısı"
                    onChange={(e) => setTabloSatir(sayiSinirla(Math.round(Number(e.target.value)) || 1, 1, 20))}
                    className="w-12 rounded-md border border-slate-200 px-1.5 py-1"
                  />
                </label>
                <span aria-hidden>×</span>
                <label className="flex items-center gap-1">
                  Sütun
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={tabloSutun}
                    aria-label="Tablo sütun sayısı"
                    onChange={(e) => setTabloSutun(sayiSinirla(Math.round(Number(e.target.value)) || 1, 1, 20))}
                    className="w-12 rounded-md border border-slate-200 px-1.5 py-1"
                  />
                </label>
              </div>
              <label className="mt-1.5 flex items-center gap-1.5">
                <input type="checkbox" checked={tabloBaslik} onChange={(e) => setTabloBaslik(e.target.checked)} />
                Üst satır başlık (kalın)
              </label>
              <button
                type="button"
                data-testid="tablo-ekle"
                onMouseDown={(e) => e.preventDefault()}
                onClick={tabloEkle}
                className="mt-1.5 w-full rounded-md bg-brand-600 py-1 text-xs font-semibold text-white transition hover:bg-brand-700"
              >
                Tablo ekle
              </button>
              {tabloIcinde && (
                <div className="mt-2 grid grid-cols-2 gap-1 border-t border-slate-100 pt-2" data-testid="tablo-duzenle">
                  {([
                    ["satirEkle", "Satır ekle"],
                    ["sutunEkle", "Sütun ekle"],
                    ["satirSil", "Satırı sil"],
                    ["sutunSil", "Sütunu sil"],
                  ] as const).map(([islem, ad]) => (
                    <button
                      key={islem}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => tabloIslemi(islem)}
                      className="rounded-md border border-slate-200 px-1.5 py-1 text-[11px] font-semibold hover:bg-slate-50"
                    >
                      {ad}
                    </button>
                  ))}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => tabloIslemi("tabloSil")}
                    className="col-span-2 rounded-md border border-red-200 px-1.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                  >
                    Tabloyu sil
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          className={arac}
          title="Denklem ekle (metnin içine, imlecin olduğu yere)"
          aria-label="Denklem ekle (metnin içine, imlecin olduğu yere)"
          onMouseDown={(e) => e.preventDefault()}
          onClick={denklemEklemeyiAc}
        >
          <Sigma size={14} />
        </button>
        <button
          type="button"
          className={arac}
          title="Çizim ekle (metnin içine, imlecin olduğu yere)"
          aria-label="Çizim ekle (metnin içine, imlecin olduğu yere)"
          onMouseDown={(e) => e.preventDefault()}
          onClick={cizimEklemeyiAc}
        >
          <PenTool size={14} />
        </button>
        <span className={`${dar ? "ml-auto" : "absolute right-2 top-1.5"} inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white p-0.5 pl-1.5`}>
          <span className="text-[10px] font-semibold text-slate-500">Punto</span>
          <input
            type="number"
            min={6}
            max={40}
            value={manuelPunto}
            onChange={(e) =>
              setManuelPunto(
                sayiSinirla(Math.round(Number(e.target.value)), 6, 40),
              )
            }
            className="w-14 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-700 outline-none focus:border-brand-400"
            title="Punto değeri"
            aria-label="Punto değeri"
          />
          <button
            type="button"
            className={arac}
            title="Puntoyu seçili metne uygula"
            aria-label="Puntoyu seçili metne uygula"
            onMouseDown={(e) => e.preventDefault()}
            onClick={puntoUygula}
          >
            Uygula
          </button>
        </span>
      </div>
      {/* ERİŞİLEBİLİRLİK: çıplak bir `contentEditable` div, ekran okuyucuya
          düzenlenebilir bir metin alanı olduğunu SÖYLEMİYOR. `data-placeholder`
          yalnız CSS ile görünüyor, erişilebilir ad üretmiyor — yani alanın ne
          için olduğu da duyulmuyordu. */}
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder ?? "Zengin metin alanı"}
        suppressContentEditableWarning
        onInput={icerikGonder}
        onKeyDown={editorTusu}
        onClick={editorTiklandi}
        data-placeholder={placeholder}
        className="w-full rounded-b-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)] [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
        style={{ minHeight }}
      />
      {uyari && (
        <p className="mt-1 rounded-lg bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-700">
          {uyari}
        </p>
      )}
      {denklemModalAcik && (
        <DenklemEditoruModal
          inlineMod
          duzenlemeModu={!!duzenlenenDenklemBelgesi}
          baslangicBelgesi={duzenlenenDenklemBelgesi}
          onClose={() => {
            setDenklemModalAcik(false);
            duzenlenenDenklemId.current = null;
            setDuzenlenenDenklemBelgesi(undefined);
          }}
          onOlustur={denklemModaldanGeldi}
        />
      )}
      {cizimModalAcik && (
        <CizimEditoruModal
          inlineMod
          satirIciYukseklik={{ deger: cizimYukseklikPx, onChange: setCizimYukseklikPx }}
          duzenlemeModu={!!duzenlenenCizimBelgesi}
          baslangicBelgesi={duzenlenenCizimBelgesi}
          onClose={() => {
            setCizimModalAcik(false);
            duzenlenenCizimId.current = null;
            setDuzenlenenCizimBelgesi(undefined);
          }}
          onOlustur={cizimModaldanGeldi}
        />
      )}
    </div>
  );
}

// Sanitizasyon her render'da yeniden çalışıyordu; hem memo'lu bileşen hem
// useMemo ile aynı HTML için tek kez çalışır.
export const RichTextGorunum = memo(function RichTextGorunum({
  html,
}: {
  html: string;
}) {
  const temiz = useMemo(() => htmlTemizle(html), [html]);
  return (
    <div
      data-zengin-kok=""
      className="[&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
      style={{ wordBreak: "break-word" }}
      dangerouslySetInnerHTML={{ __html: temiz }}
    />
  );
});
