import type { PointerEvent } from "react";
import { useRef, useState } from "react";
import { Crop, X } from "lucide-react";

import type { EkGorselKonumu, SoruOgesi } from "../types";
import { KaydedilmemisUyarisi, ModalAlt, ModalKabuk, OnayDugmesi, TogglePill, VazgecDugmesi } from "./ModalParcalari";
import { useKapatmaOnayi } from "../hooks/useKapatmaOnayi";

type Secim = { x: number; y: number; w: number; h: number };

type KesmeModu = "kopyala" | "kes";

type ParcaCikti = {
  dataUrl: string;
  oran: number;
  konum: EkGorselKonumu;
  anaGorselDataUrl?: string;
  anaGorselOran?: number;
};

// "Kes" sonrası ana görselde beyaza boyanan alan sadece boş yer bırakmasın diye
// görselin dış beyaz/şeffaf kenarlarını buda: kenardan kesildiğinde görsel gerçekten
// küçülür. Ortadan kesilirse iç beyaz kalır (bu fiziksel olarak kaçınılmaz).
function beyazKenarlariBuda(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const { width, height } = canvas;
  if (width === 0 || height === 0) return canvas;
  const veri = ctx.getImageData(0, 0, width, height).data;
  const dolu = (i: number) =>
    veri[i + 3] > 8 &&
    !(veri[i] > 247 && veri[i + 1] > 247 && veri[i + 2] > 247);
  let ust = 0;
  let alt = height - 1;
  let sol = 0;
  let sag = width - 1;
  const satirDolu = (y: number) => {
    for (let x = 0; x < width; x += 1) if (dolu((y * width + x) * 4)) return true;
    return false;
  };
  const sutunDolu = (x: number) => {
    for (let y = ust; y <= alt; y += 1) if (dolu((y * width + x) * 4)) return true;
    return false;
  };
  while (ust < alt && !satirDolu(ust)) ust += 1;
  while (alt > ust && !satirDolu(alt)) alt -= 1;
  while (sol < sag && !sutunDolu(sol)) sol += 1;
  while (sag > sol && !sutunDolu(sag)) sag -= 1;
  const yeniW = sag - sol + 1;
  const yeniH = alt - ust + 1;
  if (yeniW <= 0 || yeniH <= 0 || (yeniW === width && yeniH === height))
    return canvas;
  const out = document.createElement("canvas");
  out.width = yeniW;
  out.height = yeniH;
  const octx = out.getContext("2d");
  if (!octx) return canvas;
  octx.drawImage(canvas, sol, ust, yeniW, yeniH, 0, 0, yeniW, yeniH);
  return out;
}

function secimNormalle(secim: Secim): Secim {
  const x = secim.w < 0 ? secim.x + secim.w : secim.x;
  const y = secim.h < 0 ? secim.y + secim.h : secim.y;
  return { x, y, w: Math.abs(secim.w), h: Math.abs(secim.h) };
}

function noktaAl(e: PointerEvent, el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  return {
    x: Math.min(Math.max(e.clientX - rect.left, 0), rect.width),
    y: Math.min(Math.max(e.clientY - rect.top, 0), rect.height),
  };
}

async function gorseldenParcaAl(
  img: HTMLImageElement,
  secim: Secim,
  kesmeModu: KesmeModu,
) {
  const rect = img.getBoundingClientRect();
  const kaynakX = Math.round((secim.x / rect.width) * img.naturalWidth);
  const kaynakY = Math.round((secim.y / rect.height) * img.naturalHeight);
  const kaynakW = Math.round((secim.w / rect.width) * img.naturalWidth);
  const kaynakH = Math.round((secim.h / rect.height) * img.naturalHeight);
  if (kaynakW < 8 || kaynakH < 8) throw new Error("Seçim çok küçük.");

  const parcaCanvas = document.createElement("canvas");
  parcaCanvas.width = kaynakW;
  parcaCanvas.height = kaynakH;
  const parcaCtx = parcaCanvas.getContext("2d");
  if (!parcaCtx) throw new Error("Canvas oluşturulamadı.");
  parcaCtx.drawImage(
    img,
    kaynakX,
    kaynakY,
    kaynakW,
    kaynakH,
    0,
    0,
    kaynakW,
    kaynakH,
  );

  let anaGorselDataUrl: string | undefined;
  let anaGorselOran: number | undefined;
  if (kesmeModu === "kes") {
    const anaCanvas = document.createElement("canvas");
    anaCanvas.width = img.naturalWidth;
    anaCanvas.height = img.naturalHeight;
    const anaCtx = anaCanvas.getContext("2d");
    if (!anaCtx) throw new Error("Ana görsel düzenlenemedi.");
    anaCtx.drawImage(img, 0, 0);
    anaCtx.fillStyle = "#ffffff";
    anaCtx.fillRect(kaynakX, kaynakY, kaynakW, kaynakH);
    const budanmis = beyazKenarlariBuda(anaCanvas);
    anaGorselDataUrl = budanmis.toDataURL("image/png");
    anaGorselOran = budanmis.width / Math.max(1, budanmis.height);
  }

  return {
    dataUrl: parcaCanvas.toDataURL("image/png"),
    oran: kaynakW / Math.max(1, kaynakH),
    anaGorselDataUrl,
    anaGorselOran,
  };
}

export function GorselParcaModal({
  soru,
  onClose,
  onEkle,
}: {
  soru: SoruOgesi;
  onClose: () => void;
  onEkle: (cikti: ParcaCikti) => void;
}) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [secim, setSecim] = useState<Secim | null>(null);
  const [baslangic, setBaslangic] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [konum, setKonum] = useState<EkGorselKonumu>("alt");
  const [kesmeModu, setKesmeModu] = useState<KesmeModu>("kes");
  const [hata, setHata] = useState("");
  const normalSecim = secim ? secimNormalle(secim) : null;

  function secimeBasla(e: PointerEvent<HTMLDivElement>) {
    const img = imgRef.current;
    if (!img) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const nokta = noktaAl(e, img);
    setBaslangic(nokta);
    setSecim({ x: nokta.x, y: nokta.y, w: 0, h: 0 });
    setHata("");
  }

  function secimiSurukle(e: PointerEvent<HTMLDivElement>) {
    const img = imgRef.current;
    if (!img || !baslangic) return;
    const nokta = noktaAl(e, img);
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

  async function ekle() {
    const img = imgRef.current;
    if (!img || !normalSecim || normalSecim.w < 10 || normalSecim.h < 10) {
      setHata("Önce görsel üzerinde kesilecek alanı seçin.");
      return;
    }
    try {
      const parca = await gorseldenParcaAl(img, normalSecim, kesmeModu);
      onEkle({ ...parca, konum });
    } catch (err) {
      setHata(err instanceof Error ? err.message : "Parça oluşturulamadı.");
    }
  }

  // Eklenmemiş bir seçim varken kapatmak, kesme işini sessizce çöpe atıyordu —
  // dört modalın içinde uyarısı olmayan TEK modaldı. Eşik `ekle()` ile aynı:
  // 10px altındaki seçim zaten eklenemiyor, onun için sormak gürültü olur.
  const kapatma = useKapatmaOnayi({
    degisiklikVar: () => !!normalSecim && normalSecim.w >= 10 && normalSecim.h >= 10,
    onKapat: onClose,
  });

  if (!soru.gorselDataUrl) return null;

  return (
    <ModalKabuk
      baslik="Görselden Parça Kes"
      onClose={kapatma.kapatIstendi}
      kapanabilir={!kapatma.onayAcik}
    >
      <p className="text-sm leading-relaxed text-slate-600">
        Görseldeki yazı veya ek bölümü dikdörtgenle seçin. Seçilen parça metne
        çevrilmez; görsel olarak sorunun altına veya yanına eklenir.
      </p>
      <div className="mt-3">
        <div className="mb-2 grid gap-2 lg:grid-cols-[1fr_1fr_auto] lg:items-center">
          <div className="grid grid-cols-2 gap-1">
            <TogglePill aktif={konum === "alt"} onClick={() => setKonum("alt")}>
              Altına ekle
            </TogglePill>
            <TogglePill aktif={konum === "yan"} onClick={() => setKonum("yan")}>
              Yanına ekle
            </TogglePill>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <TogglePill
              aktif={kesmeModu === "kes"}
              onClick={() => setKesmeModu("kes")}
            >
              Kes ve ekle
            </TogglePill>
            <TogglePill
              aktif={kesmeModu === "kopyala"}
              onClick={() => setKesmeModu("kopyala")}
            >
              Kopyala
            </TogglePill>
          </div>
          <button
            type="button"
            onClick={() => setSecim(null)}
            className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50"
          >
            <X size={13} /> Seçimi temizle
          </button>
        </div>
        <p className="mb-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
          <b>Kes ve ekle</b> seçilirse ana görselde seçtiğiniz alan
          beyazlatılır, parça ayrıca eklenir.
          <b> Kopyala</b> seçilirse ana görsel aynen kalır.
        </p>
        <div
          className="relative max-h-[62vh] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-2"
          onPointerDown={secimeBasla}
          onPointerMove={secimiSurukle}
          onPointerUp={secimiBitir}
          onPointerCancel={secimiBitir}
        >
          <img
            ref={imgRef}
            src={soru.gorselDataUrl}
            alt={soru.dosyaAdi ?? "Soru görseli"}
            className="mx-auto block max-h-[58vh] max-w-full select-none rounded border border-slate-200 bg-white"
            draggable={false}
          />
          {normalSecim && (
            <div
              className="pointer-events-none absolute border-2 border-brand-500 bg-brand-400/15"
              style={{
                left: (imgRef.current?.offsetLeft ?? 0) + normalSecim.x,
                top: (imgRef.current?.offsetTop ?? 0) + normalSecim.y,
                width: normalSecim.w,
                height: normalSecim.h,
              }}
            />
          )}
        </div>
        {hata && (
          <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
            {hata}
          </p>
        )}
      </div>
      <ModalAlt>
        <VazgecDugmesi onClick={kapatma.kapatIstendi} />
        <OnayDugmesi onClick={ekle}>
          <Crop size={15} />
          {kesmeModu === "kes" ? "Kes ve Ekle" : "Parçayı Kopyala"}
        </OnayDugmesi>
      </ModalAlt>
      {kapatma.onayAcik && (
        <KaydedilmemisUyarisi
          baslik="Kesilmemiş seçim var"
          aciklama="Görselde seçtiğiniz alan henüz eklenmedi. Kapatırsanız bu seçim kaybolur."
          onVazgec={kapatma.vazgec}
          onAt={kapatma.onayla}
        />
      )}
    </ModalKabuk>
  );
}
