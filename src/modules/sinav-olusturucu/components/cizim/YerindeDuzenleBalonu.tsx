// Tuvalde çift tıklanan yerde açılan küçük düzenleme baloncuğu (inline popover):
// - üçgen kenarı: kenar etiketi + eş kenar tırtığı
// - üçgen köşesi: köşe adı, açı etiketi, açı işareti, eş açı yayı
// - çember/çokgen noktası: nokta adı
// - akış kutusu / fizik nesnesi / bağlayıcı: metin ya da etiket (_ ^ ve Yunan harfleri)
// Değişiklik anında uygulanır; Enter/Esc/dışarı tıklama kapatır.

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

import { useDisariTiklama } from "@/lib/disariTiklama";
import type { Sekil } from "../../cizim/tipler";
import type { GeometriVerisi } from "../../cizim/tipler";
import { geometriEtiketiAyarla, geometriEtiketiOku, type GeoEtiketYamasi, type GeoHedef } from "../../cizim/geometriEtkilesim";
import { geometriVerisiGecerliMi, varsayilanGeometri } from "../../cizim/geometriSekilleri";

type FizikSekli = Extract<Sekil, { tur: "fizik" }>;

export type BalonHedefi =
  | { tur: "geo"; sekilId: string; hedef: GeoHedef; ad?: string }
  | { tur: "metin"; sekilId: string };

const SEMBOLLER = ["°", "α", "β", "θ", "μ", "Δ", "Ω", "π", "ε", "λ", "·"];
const BOLUM = "text-[10px] font-bold uppercase tracking-wide text-slate-500";

function Hap({ aktif, onClick, children, etiket }: { aktif: boolean; onClick: () => void; children: ReactNode; etiket?: string }) {
  return (
    <button type="button" aria-pressed={aktif} aria-label={etiket} onClick={onClick}
      className={`h-10 min-w-10 rounded-lg px-2.5 text-sm font-semibold ${aktif ? "bg-brand-100 text-brand-700" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}`}>
      {children}
    </button>
  );
}

/** Metin kutusu + alt/üst simge ve sembol düğmeleri (imlecin olduğu yere yazar). */
function SembolluGirdi({ deger, onDegis, etiket, yerTutucu, cokSatir, onBitir, odakla }: {
  deger: string; onDegis: (v: string) => void; etiket: string; yerTutucu?: string; cokSatir?: boolean; onBitir: () => void; odakla?: boolean;
}) {
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!odakla) return;
    const t = window.setTimeout(() => { ref.current?.focus(); ref.current?.select?.(); }, 0);
    return () => window.clearTimeout(t);
  }, [odakla]);
  const ekle = (m: string) => {
    const g = ref.current;
    const bas = g?.selectionStart ?? deger.length, son = g?.selectionEnd ?? deger.length;
    onDegis(deger.slice(0, bas) + m + deger.slice(son));
    window.setTimeout(() => { g?.focus(); g?.setSelectionRange(bas + m.length, bas + m.length); }, 0);
  };
  const ortak = {
    ref,
    "aria-label": etiket,
    value: deger,
    placeholder: yerTutucu,
    onChange: (e: { target: { value: string } }) => onDegis(e.target.value),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onBitir(); }
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onBitir(); }
    },
    className: "w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm text-slate-800 outline-none focus:border-brand-400",
  };
  return (
    <div className="flex flex-col gap-1.5">
      {cokSatir ? <textarea rows={2} {...ortak} /> : <input {...ortak} />}
      <div className="flex flex-wrap gap-1">
        <button type="button" title="Alt simge (m_1)" aria-label="Alt simge" onMouseDown={(e) => e.preventDefault()} onClick={() => ekle("_")}
          className="h-9 min-w-9 rounded-md border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50">xₙ</button>
        <button type="button" title="Üst simge (v^2)" aria-label="Üst simge" onMouseDown={(e) => e.preventDefault()} onClick={() => ekle("^")}
          className="h-9 min-w-9 rounded-md border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50">xⁿ</button>
        {SEMBOLLER.map((s) => (
          <button key={s} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => ekle(s)}
            className="h-9 min-w-9 rounded-md border border-slate-200 bg-white px-1 text-sm text-slate-600 hover:bg-slate-50">{s}</button>
        ))}
      </div>
    </div>
  );
}

export function YerindeDuzenleBalonu({ hedef, sekil, konum, guncelle, kapat }: {
  hedef: BalonHedefi;
  sekil: Sekil;
  konum: { left: number; top: number };
  /** Şekli verilen yeni hâliyle değiştirir (geçmiş kaydını çağıran yönetir). */
  guncelle: (yeni: Sekil) => void;
  kapat: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDisariTiklama(true, kapat, ref);
  useEffect(() => {
    const tus = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); kapat(); } };
    window.addEventListener("keydown", tus, true);
    return () => window.removeEventListener("keydown", tus, true);
  }, [kapat]);

  let baslik = "Düzenle";
  let icerik: ReactNode = null;
  const fiz = sekil.tur === "fizik" ? (sekil as FizikSekli) : null;
  const geo = fiz?.geo;

  if (hedef.tur === "geo" && fiz) {
    const v: GeometriVerisi = geo && geometriVerisiGecerliMi(geo) ? geo : varsayilanGeometri(fiz.nesne);
    const deger = geometriEtiketiOku(v, hedef.hedef) ?? {};
    const yaz = (yama: GeoEtiketYamasi) => guncelle({ ...fiz, geo: geometriEtiketiAyarla(v, hedef.hedef, yama) });
    const kose = hedef.hedef.tur === "kose";
    baslik = kose ? `${hedef.ad || deger.ad || "Köşe"} ${v.tur === "cember" ? "noktası" : "köşesi"}` : `${hedef.ad || ""} kenarı`.trim();
    icerik = (
      <>
        {deger.ad !== undefined && (
          <>
            <span className={BOLUM}>{v.tur === "ucgen" || v.tur === "dortgen" ? "Köşe adı" : "Nokta adı"}</span>
            <SembolluGirdi odakla etiket={v.tur === "ucgen" || v.tur === "dortgen" ? "Köşe adı" : "Nokta adı"} deger={deger.ad} yerTutucu="A" onDegis={(t) => yaz({ ad: t })} onBitir={kapat} />
          </>
        )}
        {deger.aciEtiket !== undefined && (
          <>
            <span className={`${BOLUM} mt-1`}>Açı etiketi</span>
            <SembolluGirdi etiket="Açı etiketi" deger={deger.aciEtiket} yerTutucu="ör. 60°, α, 2x" onDegis={(t) => yaz({ aciEtiket: t })} onBitir={kapat} />
          </>
        )}
        {deger.aciIsareti !== undefined && (
          <>
            <span className={`${BOLUM} mt-1`}>Açı işareti</span>
            <div className="flex gap-1.5">
              {([["yok", "Yok"], ["yay", "Yay"], ["dik", "Dik açı ∟"]] as const).map(([d, ad]) => (
                <Hap key={d} aktif={deger.aciIsareti === d} onClick={() => yaz({ aciIsareti: d })}>{ad}</Hap>
              ))}
            </div>
          </>
        )}
        {deger.esAci !== undefined && (
          <>
            <span className={`${BOLUM} mt-1`}>Eş açı yayı</span>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map((n) => (
                <Hap key={n} aktif={deger.esAci === n} etiket={`Eş açı yayı: ${n}`} onClick={() => yaz({ esAci: n })}>{n}</Hap>
              ))}
            </div>
          </>
        )}
        {deger.kenarEtiket !== undefined && (
          <>
            <span className={BOLUM}>Kenar etiketi</span>
            <SembolluGirdi odakla etiket="Kenar etiketi" deger={deger.kenarEtiket} yerTutucu="ör. 5 cm, x+2, a" onDegis={(t) => yaz({ kenarEtiket: t })} onBitir={kapat} />
          </>
        )}
        {deger.esKenar !== undefined && (
          <>
            <span className={`${BOLUM} mt-1`}>Eş kenar işareti</span>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map((n) => (
                <Hap key={n} aktif={deger.esKenar === n} etiket={`Eş kenar tırtığı: ${n}`} onClick={() => yaz({ esKenar: n })}>
                  {n === 0 ? "Yok" : "|".repeat(n)}
                </Hap>
              ))}
            </div>
          </>
        )}
        {kose && deger.ad === undefined && <p className="text-xs text-slate-500">Bu noktanın adı sağ panelden değiştirilir.</p>}
      </>
    );
  } else if (hedef.tur === "metin") {
    if (sekil.tur === "akis") {
      baslik = "Kutu metni";
      icerik = sekil.denklem
        ? <p className="text-xs text-slate-500">Bu kutu denklem gösteriyor. Değiştirmek için sağ paneldeki “Denklemi düzenle”yi kullanın.</p>
        : <SembolluGirdi odakla cokSatir etiket="Kutu metni" deger={sekil.metin} yerTutucu="Kutunun metni (Shift+Enter: yeni satır)" onDegis={(t) => guncelle({ ...sekil, metin: t })} onBitir={kapat} />;
    } else if (sekil.tur === "fizik") {
      baslik = "Etiket";
      icerik = <SembolluGirdi odakla etiket="Şekil etiketi" deger={sekil.etiket ?? ""} yerTutucu="ör. m_1   R_1   4 Ω" onDegis={(t) => guncelle({ ...sekil, etiket: t })} onBitir={kapat} />;
    } else if (sekil.tur === "baglayici") {
      baslik = "Ok etiketi";
      icerik = (
        <>
          <SembolluGirdi odakla etiket="Bağlayıcı etiketi" deger={sekil.etiket ?? ""} yerTutucu="ör. Evet, F, v" onDegis={(t) => guncelle({ ...sekil, etiket: t })} onBitir={kapat} />
          <div className="flex gap-1.5">
            {["Evet", "Hayır"].map((h) => <Hap key={h} aktif={sekil.etiket === h} onClick={() => guncelle({ ...sekil, etiket: h })}>{h}</Hap>)}
          </div>
        </>
      );
    }
  }
  if (!icerik) return null;
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={baslik}
      data-testid="yerinde-duzenle"
      className="absolute z-30 flex w-[300px] max-w-[calc(100%-16px)] flex-col gap-1.5 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
      style={{ left: konum.left, top: konum.top }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-700">{baslik}</span>
        <button type="button" aria-label="Kapat" onClick={kapat} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X size={16} /></button>
      </div>
      {icerik}
    </div>
  );
}

