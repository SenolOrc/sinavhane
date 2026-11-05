// Sol "Şekil ve Şablon Kütüphanesi" çekmecesi: anlık arama + katlanabilir
// kategoriler + önizlemeli kartlar. Veri `cizim/kutuphane.ts`'ten gelir; bu
// bileşen yalnız gösterir. Karta tıklamak çekmeceyi KAPATMAZ: öğretmen ardı
// ardına Pil + Direnç + Ampermetre ekleyebilsin.

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown, ChevronRight, Search, X } from "lucide-react";

import {
  KUTUPHANE_KATEGORILERI,
  aramaOnerileri,
  kutuphaneAra,
  type KutuphaneGirdisi,
  type KutuphaneKategorisi,
  type KutuphaneOnizlemesi,
} from "../../cizim/kutuphane";
import { fizikDisPayi, fizikSimgeCiz } from "../../cizim/fizik";
import { sekilleriCiz } from "../../cizim/ciz";
import { sekilTamKutusu } from "../../cizim/sinirlar";
import type { Sekil } from "../../cizim/tipler";

const ONIZLEME_W = 112;
const ONIZLEME_H = 64;
const ACIK_KATEGORI_ANAHTARI = "sinavhane:cizim-kutuphane-acik:v1";

/**
 * Şekilleri, kutuları kartın iki katı büyüklükte bir taslak tuvalin ortasına
 * sığdırarak çizer ve saydam olmayan piksellerin sınırını dünya koordinatında
 * döndürür. Tarayıcı dışı ortamda (jsdom) ya da boş çizimde null.
 */
function murekkepSiniri(
  sekiller: Sekil[], x0: number, y0: number, x1: number, y1: number, olcek: number, w: number, h: number,
): { x0: number; y0: number; x1: number; y1: number } | null {
  if (typeof document === "undefined") return null;
  const k = 2; // taslak çözünürlük katsayısı
  const tw = w * 2 * k, th = h * 2 * k;
  const c = document.createElement("canvas");
  c.width = tw; c.height = th;
  const t = c.getContext("2d");
  if (!t || typeof t.getImageData !== "function") return null;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  t.setTransform(olcek * k, 0, 0, olcek * k, tw / 2 - cx * olcek * k, th / 2 - cy * olcek * k);
  sekilleriCiz(t, sekiller);
  const d = t.getImageData(0, 0, tw, th).data;
  let px0 = tw, py0 = th, px1 = -1, py1 = -1;
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      if (d[(y * tw + x) * 4 + 3] > 24) {
        if (x < px0) px0 = x;
        if (x > px1) px1 = x;
        if (y < py0) py0 = y;
        if (y > py1) py1 = y;
      }
    }
  }
  if (px1 < 0) return null;
  const dunya = (px: number, py: number) => ({ x: cx + (px - tw / 2) / (olcek * k), y: cy + (py - th / 2) / (olcek * k) });
  const a = dunya(px0, py0), b = dunya(px1 + 1, py1 + 1);
  return { x0: a.x, y0: a.y, x1: b.x, y1: b.y };
}

/** Kart önizlemesi: gerçek çizim rutinleriyle, kutuya sığdırılmış. */
export function KutuphaneOnizleme({ onizleme, w = ONIZLEME_W, h = ONIZLEME_H }: { onizleme: KutuphaneOnizlemesi; w?: number; h?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || onizleme.tur === "yazi") return;
    const oran = typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1;
    canvas.width = w * oran;
    canvas.height = h * oran;
    ctx.setTransform(oran, 0, 0, oran, 0, 0);
    ctx.clearRect(0, 0, w, h);
    try {
      if (onizleme.tur === "simge") {
        fizikSimgeCiz(ctx, onizleme.nesne, w, h);
        return;
      }
      const sekiller = onizleme.sekiller();
      const kutular = sekiller.filter((s) => s.tur !== "baglayici").map((s) => {
        const k = sekilTamKutusu(ctx, s);
        if (s.tur !== "fizik") return k;
        const p = fizikDisPayi(s.nesne);
        return { x: k.x - p.sol, y: k.y - p.ust, w: k.w + p.sol + p.sag, h: k.h + p.ust + p.alt };
      });
      if (!kutular.length) return;
      let x0 = Math.min(...kutular.map((k) => k.x)), y0 = Math.min(...kutular.map((k) => k.y));
      let x1 = Math.max(...kutular.map((k) => k.x + k.w)), y1 = Math.max(...kutular.map((k) => k.y + k.h));
      const pay = 4;
      const sigdir = (a: number, b: number, c: number, d: number) =>
        Math.min((w - 2 * pay) / Math.max(1, c - a), (h - 2 * pay) / Math.max(1, d - b));
      let olcek = sigdir(x0, y0, x1, y1);
      // Kutu çoğu zaman mürekkepten büyüktür (molekül, gövde–yaprak, birim
      // çember): önce geniş bir taslak tuvale çiz, gerçek mürekkep sınırını bul,
      // sonra yalnız o sınırı karta sığdır. Böylece küçük kalan önizlemeler
      // büyür, kutudan taşan yazılar da kesilmez.
      const sinir = murekkepSiniri(sekiller, x0, y0, x1, y1, olcek, w, h);
      if (sinir) {
        const yeni = Math.min(sigdir(sinir.x0, sinir.y0, sinir.x1, sinir.y1), olcek * 4);
        if (yeni > olcek * 1.08 || sinir.x0 < x0 || sinir.y0 < y0 || sinir.x1 > x1 || sinir.y1 > y1) {
          ({ x0, y0, x1, y1 } = sinir);
          olcek = yeni;
        }
      }
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(olcek, olcek);
      ctx.translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
      sekilleriCiz(ctx, sekiller);
      ctx.restore();
    } catch {
      // Önizleme çizilemezse kart yine de adıyla çalışır.
    }
  }, [onizleme, w, h]);
  if (onizleme.tur === "yazi") {
    return <span className="flex items-center justify-center text-sm font-bold text-slate-600" style={{ width: w, height: h }} aria-hidden="true">{onizleme.metin}</span>;
  }
  return <canvas ref={ref} width={w} height={h} style={{ width: w, height: h }} aria-hidden="true" />;
}

function Kart({ girdi, onEkle, onSil }: { girdi: KutuphaneGirdisi; onEkle: (g: KutuphaneGirdisi) => void; onSil?: (id: string) => void }) {
  return (
    <div className="relative">
      <button
        type="button"
        title={girdi.ipucu}
        aria-label={`Ekle: ${girdi.ad}`}
        data-kutuphane-girdisi={girdi.id}
        onClick={() => onEkle(girdi)}
        className="flex w-full min-h-[44px] flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white px-1.5 pb-1.5 pt-2 text-center text-[11px] font-semibold leading-tight text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 active:bg-brand-100"
      >
        <KutuphaneOnizleme onizleme={girdi.onizleme} />
        <span className="line-clamp-2 w-full">{girdi.ad}</span>
      </button>
      {girdi.kullaniciSablonuId && onSil && (
        <button
          type="button"
          aria-label={`${girdi.ad} şablonunu sil`}
          title="Şablonu sil"
          onClick={() => onSil(girdi.kullaniciSablonuId!)}
          className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-rose-500 ring-1 ring-rose-100 hover:bg-rose-50"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

function KartIzgarasi({ girdiler, onEkle, onSil }: { girdiler: KutuphaneGirdisi[]; onEkle: (g: KutuphaneGirdisi) => void; onSil?: (id: string) => void }) {
  // Alt başlıklara göre böl (sıra korunur).
  const bolumler: { alt?: string; liste: KutuphaneGirdisi[] }[] = [];
  for (const g of girdiler) {
    const son = bolumler[bolumler.length - 1];
    if (son && son.alt === g.altBaslik) son.liste.push(g);
    else bolumler.push({ alt: g.altBaslik, liste: [g] });
  }
  return (
    <div className="flex flex-col gap-2">
      {bolumler.map((b, i) => (
        <div key={`${b.alt ?? ""}-${i}`}>
          {b.alt && <div className="mb-1 px-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{b.alt}</div>}
          <div className="grid grid-cols-2 gap-1.5">
            {b.liste.map((g) => <Kart key={g.id} girdi={g} onEkle={onEkle} onSil={onSil} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SolKutuphane({
  girdiler,
  onEkle,
  onSablonSil,
  ekBolumler = {},
  onKapat,
  sonEklenen,
}: {
  girdiler: KutuphaneGirdisi[];
  onEkle: (g: KutuphaneGirdisi) => void;
  onSablonSil: (id: string) => void;
  /** Kategori altında katlanır "ayrıntılı araçlar" (zincir çizici, yazarak çiz…). */
  ekBolumler?: Partial<Record<KutuphaneKategorisi, { baslik: string; icerik: ReactNode }>>;
  onKapat?: () => void;
  /** Son eklenen kartın adı — ekran okuyucu ve kısa geri bildirim için. */
  sonEklenen?: string | null;
}) {
  const [arama, setArama] = useState("");
  const [acik, setAcik] = useState<KutuphaneKategorisi[]>(() => {
    try {
      const k = window.localStorage.getItem(ACIK_KATEGORI_ANAHTARI);
      const v: unknown = k ? JSON.parse(k) : null;
      if (Array.isArray(v)) return v.filter((x): x is KutuphaneKategorisi => KUTUPHANE_KATEGORILERI.some((c) => c.id === x));
    } catch { /* tarayıcı depolaması kapalı olabilir */ }
    return [];
  });
  const [ekAcik, setEkAcik] = useState<KutuphaneKategorisi | null>(null);
  useEffect(() => {
    try { window.localStorage.setItem(ACIK_KATEGORI_ANAHTARI, JSON.stringify(acik)); } catch { /* yok say */ }
  }, [acik]);

  const sonuclar = useMemo(
    () => (arama.trim() ? [...aramaOnerileri(arama), ...kutuphaneAra(girdiler, arama)].slice(0, 60) : []),
    [arama, girdiler],
  );
  const kategoriGirdileri = (k: KutuphaneKategorisi) => girdiler.filter((g) => g.kategori === k);

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="sol-kutuphane">
      <div className="flex shrink-0 items-center gap-2 px-2 pb-2 pt-2">
        <label className="relative flex min-w-0 flex-1 items-center">
          <Search size={16} className="pointer-events-none absolute left-3 text-slate-400" />
          <input
            type="search"
            aria-label="Şekil veya şablon ara"
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Ara: makara, parabol, beher…"
            title="Şekil veya şablon ara... ör. makara, parabol, dik üçgen, beher, venn"
            className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-sm [&::-webkit-search-cancel-button]:hidden text-slate-700 outline-none placeholder:text-slate-400 focus:border-brand-400 focus:bg-white"
          />
          {arama && (
            <button type="button" aria-label="Aramayı temizle" onClick={() => setArama("")}
              className="absolute right-1 flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
              <X size={15} />
            </button>
          )}
        </label>
        {onKapat && (
          <button type="button" aria-label="Kütüphaneyi kapat" title="Kütüphaneyi kapat" onClick={onKapat}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100">
            <X size={18} />
          </button>
        )}
      </div>
      <p className="sr-only" aria-live="polite">{sonEklenen ? `${sonEklenen} eklendi` : ""}</p>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {arama.trim() ? (
          sonuclar.length ? (
            <div data-testid="kutuphane-sonuclari">
              <div className="mb-1.5 px-0.5 text-[11px] font-semibold text-slate-500">{sonuclar.length} sonuç</div>
              <KartIzgarasi girdiler={sonuclar} onEkle={onEkle} onSil={onSablonSil} />
            </div>
          ) : (
            <p className="px-2 py-6 text-center text-sm text-slate-500">
              “{arama}” için şekil bulunamadı. Başka bir sözcük deneyin; ör. <b>eğik düzlem</b>, <b>beher</b>, <b>y = x^2</b>.
            </p>
          )
        ) : (
          <div className="flex flex-col gap-1">
            {KUTUPHANE_KATEGORILERI.map((k) => {
              const liste = kategoriGirdileri(k.id);
              const ek = ekBolumler[k.id];
              if (!liste.length && !ek && k.id !== "sablonlarim") return null;
              const acikMi = acik.includes(k.id);
              return (
                <section key={k.id} data-kategori={k.id}>
                  <button
                    type="button"
                    aria-expanded={acikMi}
                    onClick={() => setAcik((v) => (acikMi ? v.filter((x) => x !== k.id) : [...v, k.id]))}
                    className="flex h-11 w-full items-center gap-2 rounded-xl px-2 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    {acikMi ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                    <span className="flex-1">{k.ad}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{liste.length}</span>
                  </button>
                  {acikMi && (
                    <div className="pb-2 pt-1">
                      {liste.length > 0 && <KartIzgarasi girdiler={liste} onEkle={onEkle} onSil={onSablonSil} />}
                      {!liste.length && k.id === "sablonlarim" && (
                        <p className="px-1 text-xs text-slate-500">Şekilleri seçip “Şablon kaydet” deyin; burada görünür.</p>
                      )}
                      {ek && (
                        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/70">
                          <button type="button" aria-expanded={ekAcik === k.id} data-ek-bolum={k.id}
                            onClick={() => setEkAcik((v) => (v === k.id ? null : k.id))}
                            className="flex min-h-[40px] w-full items-center gap-1.5 px-2 text-left text-xs font-semibold text-slate-600">
                            {ekAcik === k.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            {ek.baslik}
                          </button>
                          {ekAcik === k.id && <div className="px-2 pb-2">{ek.icerik}</div>}
                        </div>
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
