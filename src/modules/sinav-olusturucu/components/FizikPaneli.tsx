// Çizim editörünün FİZİK kipi: şekil paleti, bağlantı türleri ve seçili şekil
// paneli. `CizimEditoruModal.tsx` zaten 1.600 satır; fizik arayüzü ayrı durur,
// modal yalnız durumu (kip, araç, bağlantı ayarı) tutup bunları çağırır.

import { useEffect, useRef, useState } from "react";
import { FlipHorizontal2, RotateCw } from "lucide-react";

import { AKIS_DOLGU_PALETI } from "../cizim/sabitler";
import {
  FIZIK_TANIMLARI,
  fizikSimgeCiz,
} from "../cizim/fizik";
import { kimyaSiviliMi } from "../cizim/kimya";
import { izgaraBoyutu } from "../cizim/geometri";
import type { BaglayiciUcu, BaglayiciStili, BaglayiciYonu, FizikEtiketYeri, FizikNesnesi, Sekil } from "../cizim/tipler";
import { TogglePill } from "./ModalParcalari";
import { GeoEkPaneli } from "./GeometriPaneli";
import { portluMu } from "../cizim/etkilesim";
import { FizikSahnePaneli, fizikSahnePaneliVarMi } from "./FizikSahnePaneli";

export type BaglayiciAyari = {
  stil: BaglayiciStili;
  okUcu: "yok" | "son" | "cift";
  /**
   * Serbest uç: şeklin ÜSTÜNE tıklanınca şekle yapışmaz, tıklanan noktaya serbest uç konur.
   * Kuvvet okunu cismin merkezinden (ya da herhangi bir noktadan) çizmek için.
   */
  serbest?: boolean;
};

/** Fizik kipindeki bağlantı türleri: tek tıkla stil + ok ucu birlikte seçilir. */
export const BAGLANTI_TURLERI: { id: string; ad: string; ayar: BaglayiciAyari; ipucu: string }[] = [
  { id: "ip", ad: "İp / Çubuk", ayar: { stil: "duz", okUcu: "yok" }, ipucu: "İki şekli düz çizgiyle bağlar (ip, çubuk, kablo)" },
  { id: "yay", ad: "Yay", ayar: { stil: "yay", okUcu: "yok" }, ipucu: "İki şekli zikzaklı yayla bağlar" },
  { id: "vektor", ad: "Kuvvet / Vektör", ayar: { stil: "vektor", okUcu: "son" }, ipucu: "Kalın uçlu ok — kuvvet, hız, ivme. Boş bir noktaya da bitebilir" },
  { id: "tel", ad: "Devre teli", ayar: { stil: "dik", okUcu: "yok" }, ipucu: "Dik açılı tel; devre elemanlarını birbirine bağlar" },
  { id: "ok", ad: "Ok (dik)", ayar: { stil: "dik", okUcu: "son" }, ipucu: "Dik açılı ok" },
];

export function baglantiTuruBul(ayar: BaglayiciAyari) {
  return BAGLANTI_TURLERI.find((t) => t.ayar.stil === ayar.stil && t.ayar.okUcu === ayar.okUcu);
}

/** Paletteki küçük önizleme: gerçek çizim rutini kullanılır, ayrı SVG tutulmaz. */
export function FizikSimgesi({ nesne }: { nesne: FizikNesnesi }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    // Jsdom/testte getContext null dönebilir; yukarıdaki kontrol bunu karşılar.
    const oran = typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1;
    canvas.width = 44 * oran;
    canvas.height = 30 * oran;
    ctx.setTransform(oran, 0, 0, oran, 0, 0);
    fizikSimgeCiz(ctx, nesne, 44, 30);
  }, [nesne]);
  return <canvas ref={ref} width={44} height={30} style={{ width: 44, height: 30 }} aria-hidden="true" />;
}

const SEMBOLLER = ["θ", "α", "β", "μ", "ω", "ρ", "Δ", "Ω", "π", "°", "·", "×", "±"];

const ETIKET_YERLERI: { deger: FizikEtiketYeri; ad: string }[] = [
  { deger: "ic", ad: "İç" },
  { deger: "ust", ad: "Üst" },
  { deger: "alt", ad: "Alt" },
  { deger: "sol", ad: "Sol" },
  { deger: "sag", ad: "Sağ" },
];

/**
 * Etiket kutusu + sembol düğmeleri. Düğmeler imlecin olduğu yere yazar ve
 * imleci eklenenin sonuna alır; `_` ve `^` düğmeleri ardından yazılacak tek
 * karakteri alt/üst simge yapar (`m_1`, `v^2`).
 */
export function EtiketGirdisi({
  deger,
  onDegis,
  onOdak,
  yerTutucu,
  etiketAdi,
}: {
  deger: string;
  onDegis: (v: string) => void;
  onOdak: () => void;
  yerTutucu?: string;
  etiketAdi: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const ekle = (metin: string) => {
    const girdi = ref.current;
    const bas = girdi?.selectionStart ?? deger.length;
    const son = girdi?.selectionEnd ?? deger.length;
    const yeni = deger.slice(0, bas) + metin + deger.slice(son);
    onDegis(yeni);
    window.setTimeout(() => {
      girdi?.focus();
      girdi?.setSelectionRange(bas + metin.length, bas + metin.length);
    }, 0);
  };
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
      <input
        ref={ref}
        aria-label={etiketAdi}
        value={deger}
        onChange={(e) => onDegis(e.target.value)}
        onFocus={onOdak}
        placeholder={yerTutucu ?? "ör. m_1   v^2   \\theta"}
        className="w-40 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700"
      />
      {["_", "^"].map((s) => (
        <button
          key={s}
          type="button"
          title={s === "_" ? "Alt simge: sonraki karakter (m_1) ya da {…} grubu" : "Üst simge: sonraki karakter (x^2) ya da {…} grubu"}
          onClick={() => ekle(s)}
          className="h-6 w-6 rounded-md border border-slate-300 bg-white text-[11px] font-bold text-slate-600 hover:bg-slate-50"
        >
          {s === "_" ? "xₙ" : "xⁿ"}
        </button>
      ))}
      {SEMBOLLER.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => ekle(s)}
          className="h-6 min-w-6 rounded-md border border-slate-300 bg-white px-1 text-[12px] text-slate-600 hover:bg-slate-50"
        >
          {s}
        </button>
      ))}
    </div>
  );
}

type FizikSekliTipi = Extract<Sekil, { tur: "fizik" }>;

/** Seçili fizik nesnesinin paneli: etiket, etiket yeri, çevir/döndür, dolgu. */
export function FizikSecimPaneli({
  sekil,
  guncelle,
  tarihceyeKaydet,
  onVektorEkle,
}: {
  sekil: FizikSekliTipi;
  guncelle: (yama: Partial<FizikSekliTipi>) => void;
  tarihceyeKaydet: () => void;
  onVektorEkle?: (yeni: { kaynak: BaglayiciUcu; hedef: BaglayiciUcu; etiket?: string }) => void;
}) {
  if (sekil.nesne === "kareliAlan") {
    return <KareliAlanPaneli sekil={sekil} guncelle={guncelle} tarihceyeKaydet={tarihceyeKaydet} onVektorEkle={onVektorEkle} />;
  }
  const t = FIZIK_TANIMLARI[sekil.nesne];
  const yer = sekil.etiketYeri ?? t.etiketYeri;
  // Hesaplı düzenekler (eğik düzlem kuvvetleri, optik, sıvı kabı) yazılarını kendisi
  // çizer: genel etiket kutusu ve etiket yeri yerine sade ayar paneli gösterilir.
  if (fizikSahnePaneliVarMi(sekil.nesne)) {
    return (
      <div className="mt-2 rounded-xl border border-brand-200 bg-brand-50/50 p-2" data-testid="fizik-secim-paneli">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{t.ad}</span>
        <FizikSahnePaneli sekil={sekil} guncelle={guncelle} tarihceyeKaydet={tarihceyeKaydet} />
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-slate-500">Değerleri değiştirince oklar, ışınlar ve görüntü yeniden hesaplanır.</span>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-2 rounded-xl border border-brand-200 bg-brand-50/50 p-2" data-testid="fizik-secim-paneli">
      <div className="flex flex-wrap items-center gap-2">
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-500">{t.ad} etiketi</span>
        <EtiketGirdisi
          etiketAdi="Fizik şekli etiketi"
          deger={sekil.etiket ?? ""}
          onDegis={(v) => guncelle({ etiket: v })}
          onOdak={tarihceyeKaydet}
          yerTutucu={sekil.nesne === "koordinat" ? "dikey|yatay  ör. v|t" : undefined}
        />
      </div>
      {portluMu(sekil) && (
        <span className="mt-1 block text-[10px] text-slate-500">
          Etikete tuvalde çift tıklayarak da yazabilirsiniz. Şeklin üstüne gelince çıkan mavi noktalardan sürükleyerek tel/ok bağlayabilirsiniz.
        </span>
      )}
      <GeoEkPaneli sekil={sekil} guncelle={guncelle} tarihceyeKaydet={tarihceyeKaydet} />
      {kimyaSiviliMi(sekil.nesne) && (
        <div className="mt-2 flex flex-wrap items-center gap-2" data-testid="kimya-sivi">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{sekil.nesne === "gazKabi" ? "Piston konumu (gaz yüksekliği)" : "Sıvı seviyesi"}</span>
          <input
            type="range"
            aria-label="Sıvı seviyesi"
            min={5}
            max={100}
            step={5}
            value={Math.round((sekil.seviye ?? 0.5) * 100)}
            onPointerDown={tarihceyeKaydet}
            onChange={(e) => guncelle({ seviye: Number(e.target.value) / 100 })}
            className="w-40"
          />
          <span className="w-9 text-[11px] font-semibold text-slate-600">%{Math.round((sekil.seviye ?? 0.5) * 100)}</span>
          <span className="text-[10px] text-slate-500">{sekil.nesne === "gazKabi" ? "Pistonu aşağı çekmek gazı sıkıştırır (tanecik yoğunluğu artar)." : "Sıvı görünmüyorsa aşağıdan bir Dolgu rengi seçin."}</span>
        </div>
      )}
      {sekil.nesne.startsWith("vektor") && (
        <div className="mt-2">
          <RenkSecici deger={sekil.renk} onSec={(r) => { tarihceyeKaydet(); guncelle({ renk: r }); }} ad="Vektör rengi" />
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Etiket yeri</span>
        {ETIKET_YERLERI.map((e) => (
          <TogglePill key={e.deger} aktif={yer === e.deger} onClick={() => { tarihceyeKaydet(); guncelle({ etiketYeri: e.deger }); }}>
            {e.ad}
          </TogglePill>
        ))}
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <button
          type="button"
          aria-pressed={!!sekil.ayna}
          onClick={() => { tarihceyeKaydet(); guncelle({ ayna: !sekil.ayna }); }}
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold ${
            sekil.ayna ? "border-brand-300 bg-brand-50 text-brand-700" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          <FlipHorizontal2 className="h-3.5 w-3.5" /> Çevir
        </button>
        <button
          type="button"
          onClick={() => { tarihceyeKaydet(); guncelle({ donus: (((sekil.donus ?? 0) + 90) % 360) }); }}
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
        >
          <RotateCw className="h-3.5 w-3.5" /> 90° döndür
        </button>
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Dolgu</span>
        {AKIS_DOLGU_PALETI.map((renk) => (
          <button
            key={renk.ad}
            type="button"
            title={renk.ad}
            aria-label={`Dolgu: ${renk.ad}`}
            aria-pressed={(sekil.dolgu ?? undefined) === renk.deger}
            onClick={() => { tarihceyeKaydet(); guncelle({ dolgu: renk.deger }); }}
            className={`h-6 w-6 rounded-md border transition ${
              (sekil.dolgu ?? undefined) === renk.deger ? "border-brand-500 ring-2 ring-brand-200" : "border-slate-300 hover:border-slate-400"
            }`}
            style={{
              background: renk.deger ?? "#ffffff",
              backgroundImage: renk.deger ? undefined : "linear-gradient(45deg, #e2e8f0 25%, transparent 25%, transparent 75%, #e2e8f0 75%)",
              backgroundSize: renk.deger ? undefined : "8px 8px",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export const VEKTOR_RENKLERI = [
  { ad: "Siyah", deger: "#111827" },
  { ad: "Kırmızı", deger: "#dc2626" },
  { ad: "Mavi", deger: "#2563eb" },
  { ad: "Yeşil", deger: "#16a34a" },
  { ad: "Turuncu", deger: "#ea580c" },
  { ad: "Mor", deger: "#7c3aed" },
  { ad: "Gri", deger: "#6b7280" },
];

/** Hazır renkler + istenen rengi seçtiren renk kutusu. `deger` boşsa siyah (varsayılan). */
export function RenkSecici({ deger, onSec, ad = "Renk" }: { deger?: string; onSec: (renk: string | undefined) => void; ad?: string }) {
  const aktif = (deger ?? "").toLowerCase();
  const hazir = VEKTOR_RENKLERI.some((r) => r.deger === aktif);
  return (
    <div className="inline-flex flex-wrap items-center gap-1.5" data-testid="renk-secici">
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{ad}</span>
      {VEKTOR_RENKLERI.map((r, i) => {
        const secili = aktif ? aktif === r.deger : i === 0;
        return (
          <button
            key={r.deger}
            type="button"
            title={r.ad}
            aria-label={`${ad}: ${r.ad}`}
            aria-pressed={secili}
            onClick={() => onSec(i === 0 ? undefined : r.deger)}
            className={`h-6 w-6 rounded-md border ${secili ? "border-brand-500 ring-2 ring-brand-200" : "border-slate-300"}`}
            style={{ background: r.deger }}
          />
        );
      })}
      <label className={`inline-flex h-6 cursor-pointer items-center gap-1 rounded-md border px-1.5 text-[10px] font-semibold ${aktif && !hazir ? "border-brand-500 ring-2 ring-brand-200" : "border-slate-300"} bg-white text-slate-600`} title="İstediğiniz rengi seçin">
        Özel
        <input
          type="color"
          aria-label={`${ad}: özel renk`}
          value={aktif && /^#[0-9a-f]{6}$/.test(aktif) ? aktif : "#111827"}
          onChange={(e) => onSec(e.target.value)}
          className="h-4 w-5 cursor-pointer border-0 bg-transparent p-0"
        />
      </label>
    </div>
  );
}

const IZGARA_RENKLERI = [
  { ad: "Açık gri", deger: "#b9c3cf" },
  { ad: "Gri", deger: "#8b97a6" },
  { ad: "Açık mavi", deger: "#9ec5e8" },
  { ad: "Açık yeşil", deger: "#a8d5b5" },
  { ad: "Siyah", deger: "#1f2937" },
];
const IZGARA_KALINLIKLARI = [0.5, 0.8, 1, 1.5, 2];

function SayiGirdisi({ etiket, deger, min, max, adim = 1, onDegis, onOdak }: {
  etiket: string; deger: number; min: number; max: number; adim?: number; onDegis: (v: number) => void; onOdak?: () => void;
}) {
  return (
    <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
      {etiket}
      <input
        type="number"
        aria-label={etiket}
        value={Number.isFinite(deger) ? Math.round(deger * 100) / 100 : ""}
        min={min}
        max={max}
        step={adim}
        onFocus={onOdak}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onDegis(Math.min(max, Math.max(min, v)));
        }}
        className="w-14 rounded-md border border-slate-300 bg-white px-1.5 py-1 text-[11px]"
      />
    </label>
  );
}

/** Kareli alan: satır/sütun, hücre boyu, çizgi görünümü ve köşelerden vektör ekleme. */
function KareliAlanPaneli({ sekil, guncelle, tarihceyeKaydet, onVektorEkle }: {
  sekil: FizikSekliTipi;
  guncelle: (yama: Partial<FizikSekliTipi>) => void;
  tarihceyeKaydet: () => void;
  onVektorEkle?: (yeni: { kaynak: BaglayiciUcu; hedef: BaglayiciUcu; etiket?: string }) => void;
}) {
  const { satir, sutun } = izgaraBoyutu(sekil);
  const hucreW = sekil.w / sutun;
  const hucreH = sekil.h / satir;
  const [kare, setKare] = useState(true);
  const [v, setV] = useState({ c: 0, r: satir, dx: 2, dy: 2, etiket: "F" });
  const renk = sekil.renk ?? "#b9c3cf";
  const kalin = sekil.izgaraKalinlik ?? 1;
  const cerceveli = sekil.cerceve !== false;
  return (
    <div className="mt-2 rounded-xl border border-brand-200 bg-brand-50/50 p-2" data-testid="kareli-alan-paneli">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Kareli alan</span>
        <SayiGirdisi etiket="Satır" deger={satir} min={1} max={40} onOdak={tarihceyeKaydet}
          onDegis={(n) => guncelle({ satir: n, h: hucreH * n })} />
        <SayiGirdisi etiket="Sütun" deger={sutun} min={1} max={40} onOdak={tarihceyeKaydet}
          onDegis={(n) => guncelle({ sutun: n, w: hucreW * n })} />
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <SayiGirdisi etiket="Hücre genişliği" deger={hucreW} min={8} max={200} onOdak={tarihceyeKaydet}
          onDegis={(n) => guncelle(kare ? { w: n * sutun, h: n * satir } : { w: n * sutun })} />
        <SayiGirdisi etiket="Hücre yüksekliği" deger={hucreH} min={8} max={200} onOdak={tarihceyeKaydet}
          onDegis={(n) => guncelle(kare ? { w: n * sutun, h: n * satir } : { h: n * satir })} />
        <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
          <input type="checkbox" checked={kare} onChange={(e) => setKare(e.target.checked)} /> Kare kalsın
        </label>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Çizgi</span>
        {IZGARA_RENKLERI.map((r) => (
          <button
            key={r.ad}
            type="button"
            title={r.ad}
            aria-label={`Çizgi rengi: ${r.ad}`}
            aria-pressed={renk === r.deger}
            onClick={() => { tarihceyeKaydet(); guncelle({ renk: r.deger }); }}
            className={`h-6 w-6 rounded-md border ${renk === r.deger ? "border-brand-500 ring-2 ring-brand-200" : "border-slate-300"}`}
            style={{ background: r.deger }}
          />
        ))}
        <span className="mx-1 h-5 w-px bg-slate-200" />
        {IZGARA_KALINLIKLARI.map((k) => (
          <TogglePill key={k} aktif={kalin === k} onClick={() => { tarihceyeKaydet(); guncelle({ izgaraKalinlik: k }); }}>
            {k}
          </TogglePill>
        ))}
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <TogglePill aktif={sekil.cizgiTipi === "kesik"} onClick={() => { tarihceyeKaydet(); guncelle({ cizgiTipi: sekil.cizgiTipi === "kesik" ? "duz" : "kesik" }); }}>
          Kesikli
        </TogglePill>
        <TogglePill aktif={cerceveli} onClick={() => { tarihceyeKaydet(); guncelle({ cerceve: !cerceveli }); }}>
          Dış çerçeve
        </TogglePill>
      </div>
      {onVektorEkle && (
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-brand-100 pt-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Vektör ekle</span>
          <SayiGirdisi etiket="Başlangıç sütun" deger={v.c} min={0} max={sutun} onDegis={(n) => setV({ ...v, c: n })} />
          <SayiGirdisi etiket="Başlangıç satır" deger={v.r} min={0} max={satir} onDegis={(n) => setV({ ...v, r: n })} />
          <SayiGirdisi etiket="Yatay bileşen" deger={v.dx} min={-40} max={40} onDegis={(n) => setV({ ...v, dx: n })} />
          <SayiGirdisi etiket="Dikey bileşen" deger={v.dy} min={-40} max={40} onDegis={(n) => setV({ ...v, dy: n })} />
          <EtiketGirdisi etiketAdi="Vektör etiketi" deger={v.etiket} onDegis={(e) => setV({ ...v, etiket: e })} onOdak={() => undefined} />
          <button
            type="button"
            onClick={() =>
              onVektorEkle({
                kaynak: { sekilId: sekil.id, dugum: { c: Math.round(v.c), r: Math.round(v.r) } },
                hedef: { sekilId: sekil.id, dugum: { c: Math.round(v.c + v.dx), r: Math.round(v.r - v.dy) } },
                ...(v.etiket.trim() ? { etiket: v.etiket.trim() } : {}),
              })
            }
            disabled={Math.round(v.dx) === 0 && Math.round(v.dy) === 0}
            className="rounded-md border border-brand-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-40"
          >
            Vektörü ekle
          </button>
          <span className="text-[10px] text-slate-500">Sütun/satır köşe numarasıdır (sol-üst = 0,0); dikey bileşen yukarı pozitif. Üst çubuktaki Ok / Bağlayıcı aracında “Kuvvet / Vektör” türünü seçip köşelere tıklayarak da çizebilirsiniz.</span>
        </div>
      )}
    </div>
  );
}

const YON_SECENEKLERI: { deger: BaglayiciYonu; ad: string }[] = [
  { deger: "oto", ad: "Otomatik" },
  { deger: "ust", ad: "Üst" },
  { deger: "sag", ad: "Sağ" },
  { deger: "alt", ad: "Alt" },
  { deger: "sol", ad: "Sol" },
];

/** Seçili bağlayıcının biçimi (ip/yay/vektör/dik) ve uçlarının yönü. */
export function BaglayiciBicimPaneli({
  stil,
  kaynakYon,
  hedefYon,
  kaynakSekilde,
  hedefSekilde,
  onStil,
  onYon,
  renk,
  onRenk,
}: {
  renk?: string;
  onRenk: (r: string | undefined) => void;
  stil: BaglayiciStili;
  kaynakYon: BaglayiciYonu;
  hedefYon: BaglayiciYonu;
  /** Uç bir şekle tutunuyorsa yön seçilebilir; serbest nokta için anlamsız. */
  kaynakSekilde: boolean;
  hedefSekilde: boolean;
  onStil: (s: BaglayiciStili) => void;
  onYon: (uc: "kaynak" | "hedef", y: BaglayiciYonu) => void;
}) {
  const STILLER: { deger: BaglayiciStili; ad: string }[] = [
    { deger: "dik", ad: "Dik açılı" },
    { deger: "duz", ad: "Düz (ip/çubuk)" },
    { deger: "yay", ad: "Yay" },
    { deger: "vektor", ad: "Vektör" },
  ];
  const yonSec = (ad: string, deger: BaglayiciYonu, uc: "kaynak" | "hedef", aktif: boolean) => (
    <label className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
      {ad}
      <select
        aria-label={`${ad} yönü`}
        value={deger}
        disabled={!aktif}
        onChange={(e) => onYon(uc, e.target.value as BaglayiciYonu)}
        className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[11px] font-normal normal-case text-slate-700 disabled:bg-slate-100 disabled:text-slate-400"
      >
        {YON_SECENEKLERI.map((y) => (
          <option key={y.deger} value={y.deger}>{y.ad}</option>
        ))}
      </select>
    </label>
  );
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50/50 p-2" data-testid="baglayici-bicim-paneli">
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Biçim</span>
      {STILLER.map((s) => (
        <TogglePill key={s.deger} aktif={stil === s.deger} onClick={() => onStil(s.deger)}>
          {s.ad}
        </TogglePill>
      ))}
      <span className="mx-1 h-5 w-px bg-slate-200" />
      {yonSec("Çıkış", kaynakYon, "kaynak", kaynakSekilde)}
      {yonSec("Varış", hedefYon, "hedef", hedefSekilde)}
      <span className="mx-1 h-5 w-px bg-slate-200" />
      <RenkSecici deger={renk} onSec={onRenk} ad="Renk" />
    </div>
  );
}
