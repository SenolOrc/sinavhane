import type { PointerEvent } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Search, Trash2 } from "lucide-react";

import type { EkGorselKonumu } from "../types";
import { KaydedilmemisUyarisi, TogglePill } from "./ModalParcalari";
import { useModalErisilebilirligi } from "@/lib/modalErisilebilirligi";
import { useKapatmaOnayi } from "../hooks/useKapatmaOnayi";
import {
  canvasBolgesiniKirp,
  dikdortgenNormalle,
  noktaYereleCevir,
  secimCanvasPikseline,
} from "@shared/pdf-kirpma";

type PdfSayfa = {
  getViewport: (args: { scale: number }) => { width: number; height: number };
  render: (args: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
  }) => { promise: Promise<void> };
};

type PdfBelge = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfSayfa>;
  destroy?: () => Promise<void>;
};

type Secim = { x: number; y: number; w: number; h: number };
type Hedef = "yeni" | "alt" | "yan";

export type KaynakBag = { soruId: string; ekGorselId?: string };

type KaynakRozet = {
  id: string;
  sayfaNo: number;
  secimNo: number;
  x: number;
  y: number;
  bag: KaynakBag;
};

export type PdfKaynakCikti = {
  hedef: Hedef;
  dataUrl: string;
  oran: number;
  secimNo: number;
  sayfaNo: number;
  konum?: EkGorselKonumu;
};

// Seçim/kırpma geometrisi packages/shared/pdf-kirpma.ts'e taşındı (modules/ders-kitabi
// ile paylaşılıyor, bkz. CLAUDE.md mimari sınırı) — burada yalnızca PointerEvent/
// HTMLCanvasElement'e özgü ince sarmalayıcılar kalıyor, davranış aynı.
function secimNormalle(secim: Secim): Secim {
  return dikdortgenNormalle(secim);
}

function noktaAl(e: PointerEvent, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  return noktaYereleCevir(e.clientX, e.clientY, rect);
}

function canvasSecimKirp(canvas: HTMLCanvasElement, secim: Secim) {
  const rect = canvas.getBoundingClientRect();
  const pikselKutu = secimCanvasPikseline(secim, rect, canvas);
  return canvasBolgesiniKirp(canvas, pikselKutu);
}

export function PdfKaynakModal({
  dosyaAdi,
  pdfData,
  seciliSoruVar,
  sonrakiSecimNo,
  onClose,
  onEkle,
  onKaynakSil,
}: {
  dosyaAdi: string;
  pdfData: ArrayBuffer;
  seciliSoruVar: boolean;
  sonrakiSecimNo: number;
  onClose: () => void;
  onEkle: (cikti: PdfKaynakCikti) => KaynakBag | null;
  onKaynakSil: (bag: KaynakBag) => void;
}) {
  const baslikId = useId();
  const diyalogRef = useRef<HTMLDivElement | null>(null);
  const kapatRef = useRef<HTMLButtonElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [belge, setBelge] = useState<PdfBelge | null>(null);
  const [sayfaNo, setSayfaNo] = useState(1);
  const [sayfaInput, setSayfaInput] = useState("1");
  const [zoom, setZoom] = useState(1.4);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState("");
  const [secim, setSecim] = useState<Secim | null>(null);
  const [baslangic, setBaslangic] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [hedef, setHedef] = useState<Hedef>("yeni");
  const [secimModu, setSecimModu] = useState(false);
  const secimSayacRef = useRef(sonrakiSecimNo);
  const [rozetler, setRozetler] = useState<KaynakRozet[]>([]);
  const normalSecim = useMemo(
    () => (secim ? secimNormalle(secim) : null),
    [secim],
  );

  // window.confirm'den modal içi onaya geçildi — dört modalın ortak standardı
  // (bkz. hooks/useKapatmaOnayi.ts). Eşik `seciliAlaniEkle` ile aynı.
  const kapatma = useKapatmaOnayi({
    degisiklikVar: () => !!normalSecim && normalSecim.w >= 10 && normalSecim.h >= 10,
    onKapat: onClose,
  });

  useModalErisilebilirligi({
    containerRef: diyalogRef,
    ilkOdakRef: kapatRef,
    onKapat: kapatma.kapatIstendi,
    // Onay katmanı açıkken Escape ÜST modalı kapatmamalı; soruyu yanıtlamalı.
    kapanabilir: !kapatma.onayAcik,
  });

  useEffect(() => {
    let iptal = false;
    let acilanBelge: PdfBelge | null = null;
    setYukleniyor(true);
    setHata("");
    import("pdfjs-dist")
      .then((pdfjs) => {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.mjs",
          import.meta.url,
        ).toString();
        return pdfjs.getDocument({ data: pdfData.slice(0) }).promise;
      })
      .then((pdf) => {
        acilanBelge = pdf as unknown as PdfBelge;
        if (iptal) {
          void acilanBelge.destroy?.();
          return;
        }
        setBelge(acilanBelge);
        setSayfaNo(1);
        setSayfaInput("1");
      })
      .catch(() => {
        if (!iptal)
          setHata("PDF açılamadı. Dosya bozuk olabilir veya desteklenmiyor.");
      })
      .finally(() => {
        if (!iptal) setYukleniyor(false);
      });
    return () => {
      iptal = true;
      setBelge(null);
      if (acilanBelge) void acilanBelge.destroy?.();
    };
  }, [pdfData]);

  useEffect(() => {
    let iptal = false;
    async function renderSayfa() {
      if (!belge || !canvasRef.current) return;
      setYukleniyor(true);
      setHata("");
      try {
        const sayfa = await belge.getPage(sayfaNo);
        if (iptal || !canvasRef.current) return;
        const viewport = sayfa.getViewport({ scale: zoom });
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas oluşturulamadı.");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        canvas.style.width = `${Math.ceil(viewport.width)}px`;
        canvas.style.height = `${Math.ceil(viewport.height)}px`;
        await sayfa.render({ canvasContext: ctx, viewport }).promise;
        if (!iptal) setSecim(null);
      } catch {
        if (!iptal) setHata("Sayfa görüntülenemedi.");
      } finally {
        if (!iptal) setYukleniyor(false);
      }
    }
    renderSayfa();
    return () => {
      iptal = true;
    };
  }, [belge, sayfaNo, zoom]);

  const sayfaSayisi = belge?.numPages ?? 0;
  const sayfaRozetleri = rozetler.filter((rozet) => rozet.sayfaNo === sayfaNo);

  function sayfayaGit(hedefSayfa: number) {
    if (!belge) return;
    const yeni = Math.min(Math.max(Math.round(hedefSayfa), 1), belge.numPages);
    setSayfaNo(yeni);
    setSayfaInput(String(yeni));
  }

  function secimeBasla(e: PointerEvent<HTMLDivElement>) {
    const canvas = canvasRef.current;
    if (!secimModu || !canvas || yukleniyor) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const nokta = noktaAl(e, canvas);
    setBaslangic(nokta);
    setSecim({ x: nokta.x, y: nokta.y, w: 0, h: 0 });
    setHata("");
  }

  function secimiSurukle(e: PointerEvent<HTMLDivElement>) {
    const canvas = canvasRef.current;
    if (!canvas || !baslangic) return;
    const nokta = noktaAl(e, canvas);
    setSecim({
      x: baslangic.x,
      y: baslangic.y,
      w: nokta.x - baslangic.x,
      h: nokta.y - baslangic.y,
    });
  }

  function secimiBitir() {
    setBaslangic(null);
  }

  function seciliAlaniEkle() {
    const canvas = canvasRef.current;
    if (!canvas || !normalSecim || normalSecim.w < 10 || normalSecim.h < 10) {
      setHata("Önce PDF sayfasında eklenecek alanı seçin.");
      return;
    }
    if (hedef !== "yeni" && !seciliSoruVar) {
      setHata("Altına/yanına eklemek için önce sınavdaki bir soruyu seçin.");
      return;
    }
    const secimNo = secimSayacRef.current;
    try {
      const parca = canvasSecimKirp(canvas, normalSecim);
      const rect = canvas.getBoundingClientRect();
      const bag = onEkle({
        hedef,
        dataUrl: parca.dataUrl,
        oran: parca.oran,
        secimNo,
        sayfaNo,
        konum: hedef === "alt" ? "alt" : hedef === "yan" ? "yan" : undefined,
      });
      if (bag) {
        secimSayacRef.current = secimNo + 1;
        setRozetler((mevcut) => [
          ...mevcut,
          {
            id: `${sayfaNo}-${secimNo}-${Date.now()}`,
            sayfaNo,
            secimNo,
            x: (normalSecim.x / rect.width) * 100,
            y: (normalSecim.y / rect.height) * 100,
            bag,
          },
        ]);
      }
      setSecim(null);
    } catch (err) {
      setHata(err instanceof Error ? err.message : "Seçili alan eklenemedi.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3"
      onClick={kapatma.kapatIstendi}
    >
      <div
        ref={diyalogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={baslikId}
        className="flex h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="min-w-0">
            <h3 id={baslikId} className="truncate text-base font-bold text-slate-800">
              PDF’den Soru Seç
            </h3>
            <p className="truncate text-xs text-slate-500">{dosyaAdi}</p>
          </div>
          <button
            ref={kapatRef}
            type="button"
            onClick={kapatma.kapatIstendi}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Kapat
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2">
          <button
            type="button"
            onClick={() => sayfayaGit(sayfaNo - 1)}
            disabled={!belge || sayfaNo <= 1}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-40"
          >
            <ChevronLeft size={14} /> Önceki
          </button>
          <button
            type="button"
            onClick={() => sayfayaGit(sayfaNo + 1)}
            disabled={!belge || sayfaNo >= sayfaSayisi}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-40"
          >
            Sonraki <ChevronRight size={14} />
          </button>
          <label className="flex items-center gap-1 text-xs font-semibold text-slate-500">
            Sayfa
            <input
              type="number"
              min={1}
              max={sayfaSayisi || 1}
              value={sayfaInput}
              onChange={(e) => setSayfaInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sayfayaGit(Number(sayfaInput));
              }}
              className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-brand-400"
            />
            / {sayfaSayisi || "..."}
          </label>
          <button
            type="button"
            onClick={() => sayfayaGit(Number(sayfaInput))}
            disabled={!belge}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-40"
          >
            <Search size={13} /> Git
          </button>
          <span className="mx-1 h-5 w-px bg-slate-200" />
          <button
            type="button"
            onClick={() =>
              setZoom((z) => Math.max(0.8, Number((z - 0.2).toFixed(1))))
            }
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600"
          >
            -
          </button>
          <span className="text-xs font-semibold text-slate-500">
            %{Math.round(zoom * 100)}
          </span>
          <button
            type="button"
            onClick={() =>
              setZoom((z) => Math.min(2.8, Number((z + 0.2).toFixed(1))))
            }
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600"
          >
            +
          </button>
          <span className="mx-1 h-5 w-px bg-slate-200" />
          <button
            type="button"
            aria-pressed={secimModu}
            onClick={() => {
              setSecimModu((aktif) => !aktif);
              setSecim(null);
            }}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ring-1 transition ${
              secimModu
                ? "bg-emerald-600 text-white ring-emerald-600 hover:bg-emerald-700"
                : "bg-amber-500 text-white ring-amber-500 hover:bg-amber-600"
            }`}
          >
            {secimModu ? "Seçim modu açık ✓" : "Alan Seç"}
          </button>
          <div className="grid grid-cols-3 gap-1">
            <TogglePill
              aktif={hedef === "yeni"}
              onClick={() => setHedef("yeni")}
            >
              Yeni soru
            </TogglePill>
            <TogglePill aktif={hedef === "alt"} onClick={() => setHedef("alt")}>
              Altına
            </TogglePill>
            <TogglePill aktif={hedef === "yan"} onClick={() => setHedef("yan")}>
              Yanına
            </TogglePill>
          </div>
          <button
            type="button"
            onClick={() => setSecim(null)}
            disabled={!secim}
            className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Seçimi temizle
          </button>
          <button
            type="button"
            onClick={seciliAlaniEkle}
            disabled={
              !secimModu || !normalSecim || normalSecim.w < 10 || normalSecim.h < 10
            }
            title={
              secimModu && !normalSecim
                ? "Önce PDF sayfasında eklenecek alanı sürükleyerek seçin"
                : undefined
            }
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={14} /> Seçili Alanı Ekle
          </button>
        </div>

        {hata && (
          <p role="alert" className="mx-4 mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
            {hata}
          </p>
        )}

        <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-4">
          <div
            className={`relative mx-auto w-max rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-200 ${secimModu ? "cursor-crosshair" : "cursor-default"}`}
            onPointerDown={secimeBasla}
            onPointerMove={secimiSurukle}
            onPointerUp={secimiBitir}
            onPointerCancel={secimiBitir}
          >
            <canvas ref={canvasRef} className="block select-none" />
            {yukleniyor && (
              <div role="status" aria-live="polite" className="absolute inset-2 flex items-center justify-center rounded-lg bg-white/80 text-sm font-semibold text-slate-500">
                PDF sayfası yükleniyor...
              </div>
            )}
            {!yukleniyor && !secimModu && (
              <div className="pointer-events-none absolute left-4 top-4 rounded-lg bg-slate-900/70 px-3 py-2 text-xs font-semibold text-white shadow">
                Soru seçmek için üstten <b>Alan Seç</b> butonuna basın.
              </div>
            )}
            {normalSecim && (
              <div
                className="pointer-events-none absolute border-2 border-brand-500 bg-brand-400/15"
                style={{
                  left: normalSecim.x + 8,
                  top: normalSecim.y + 8,
                  width: normalSecim.w,
                  height: normalSecim.h,
                }}
              />
            )}
            {sayfaRozetleri.map((rozet) => (
              <button
                key={rozet.id}
                type="button"
                title="Bu seçimi ve eklediği soruyu sil"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onKaynakSil(rozet.bag);
                  setRozetler((mevcut) =>
                    mevcut.filter((r) => r.id !== rozet.id),
                  );
                }}
                className="absolute flex h-7 min-w-7 items-center justify-center gap-1 rounded-full bg-brand-600 px-2 text-xs font-bold text-white shadow transition hover:bg-rose-600"
                style={{
                  left: `calc(${rozet.x}% + 8px)`,
                  top: `calc(${rozet.y}% + 8px)`,
                }}
              >
                {rozet.secimNo}
                <Trash2 size={11} />
              </button>
            ))}
          </div>
        </div>
      </div>
      {kapatma.onayAcik && (
        <KaydedilmemisUyarisi
          baslik="Eklenmemiş seçim var"
          aciklama="PDF üzerinde seçtiğiniz alan henüz soruya eklenmedi. Kapatırsanız bu seçim kaybolur."
          onVazgec={kapatma.vazgec}
          onAt={kapatma.onayla}
        />
      )}
    </div>
  );
}
