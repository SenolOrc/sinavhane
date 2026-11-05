// Seçili şeklin hemen üstünde (yer yoksa altında) yüzen kompakt araç çubuğu.
// Basit işler için gözün sağ panele kaymasına gerek kalmasın: etiket, renk,
// dolgu/tarama, kalınlık/kesikli, çevir, 90° döndür, çoğalt, sil. Ayrıntılı
// veri düzenlemesi "Ayrıntılar" ile sağ panelde.

import { useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignHorizontalJustifyStart,
  AlignVerticalJustifyStart,
  Copy,
  FlipHorizontal2,
  Group,
  MoreHorizontal,
  Palette,
  PaintBucket,
  RotateCw,
  SlidersHorizontal,
  Trash2,
  Type,
  Ungroup,
  Minus,
  Columns3,
  Rows3,
} from "lucide-react";

import { useDisariTiklama } from "@/lib/disariTiklama";
import type { CizgiTipi, TaramaTipi } from "../../cizim/tipler";

export type RenkSecenegi = { ad: string; deger: string | undefined };

export type YuzenAracAyarlari = {
  /** Tek şekil mi, çoklu seçim mi. */
  coklu: boolean;
  /** "Etiket / Metin" düzenleyicisini açar (yoksa düğme görünmez). */
  onDuzenle?: () => void;
  duzenleAdi?: string;
  renk?: { palet: readonly RenkSecenegi[]; deger: string | undefined; onSec: (d: string | undefined) => void };
  dolgu?: { palet: readonly RenkSecenegi[]; deger: string | undefined; onSec: (d: string | undefined) => void };
  tarama?: { deger: TaramaTipi; onSec: (t: TaramaTipi) => void };
  cizgi?: {
    kalinlik: number;
    onKalinlik: (k: number) => void;
    cizgiTipi?: CizgiTipi;
    onCizgiTipi?: (t: CizgiTipi) => void;
    okUcu?: "yok" | "son" | "cift";
    onOkUcu?: (u: "yok" | "son" | "cift") => void;
  };
  punto?: { deger: number; onDegis: (p: number) => void };
  onCevir?: () => void;
  onDondur?: () => void;
  onCogalt: () => void;
  onSil: () => void;
  onAyrintilar: () => void;
  ayrintiAcik: boolean;
  /** Çoklu seçim. */
  onHizala?: (tur: "sol" | "orta-x" | "ust" | "orta-y") => void;
  onDagit?: (eksen: "x" | "y") => void;
  dagitilabilir?: boolean;
  onGrupla?: () => void;
  onGrubuCoz?: () => void;
  /** Daha fazla menüsü. */
  onOne: () => void;
  onArkaya: () => void;
  onSablonKaydet: () => void;
};

const DUGME = "flex h-10 min-w-10 items-center justify-center gap-1 rounded-lg px-2 text-slate-600 transition hover:bg-slate-100 active:bg-slate-200 aria-pressed:bg-brand-50 aria-pressed:text-brand-700";
const MENU = "absolute left-0 top-full z-30 mt-1.5 flex w-max max-w-[300px] flex-col gap-1.5 rounded-xl border border-slate-200 bg-white p-2 shadow-xl";

function RenkKutulari({ palet, deger, onSec, onek }: { palet: readonly RenkSecenegi[]; deger: string | undefined; onSec: (d: string | undefined) => void; onek: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {palet.map((r) => (
        <button
          key={r.ad}
          type="button"
          title={r.ad}
          aria-label={`${onek}: ${r.ad}`}
          aria-pressed={deger === r.deger}
          onClick={() => onSec(r.deger)}
          className={`h-10 w-10 rounded-lg border-2 transition ${deger === r.deger ? "border-brand-500" : "border-slate-200 hover:border-slate-400"}`}
          style={{
            background: r.deger ?? (onek === "Renk" ? "#111827" : "#ffffff"),
            backgroundImage: r.deger || onek === "Renk" ? undefined : "linear-gradient(45deg, #e2e8f0 25%, transparent 25%, transparent 75%, #e2e8f0 75%)",
            backgroundSize: r.deger ? undefined : "10px 10px",
          }}
        />
      ))}
    </div>
  );
}

function Hap({ aktif, onClick, children, etiket }: { aktif: boolean; onClick: () => void; children: ReactNode; etiket?: string }) {
  return (
    <button type="button" aria-pressed={aktif} aria-label={etiket} onClick={onClick}
      className={`h-10 min-w-10 rounded-lg px-2.5 text-xs font-semibold ${aktif ? "bg-brand-100 text-brand-700" : "bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"}`}>
      {children}
    </button>
  );
}

const BOLUM = "text-[10px] font-bold uppercase tracking-wide text-slate-400";

export function YuzenAracCubugu({ konum, ayar }: { konum: { left: number; top: number }; ayar: YuzenAracAyarlari }) {
  const [menu, setMenu] = useState<null | "renk" | "dolgu" | "cizgi" | "hizala" | "fazla">(null);
  const ref = useRef<HTMLDivElement>(null);
  useDisariTiklama(menu !== null, () => setMenu(null), ref);
  const ac = (m: NonNullable<typeof menu>) => setMenu((v) => (v === m ? null : m));

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label="Seçili şekil araçları"
      data-testid="yuzen-arac-cubugu"
      className="absolute z-20 flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-lg backdrop-blur"
      style={{ left: konum.left, top: konum.top }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {ayar.onDuzenle && (
        <button type="button" className={DUGME} title={ayar.duzenleAdi ?? "Etiket / Metin"} aria-label={ayar.duzenleAdi ?? "Etiket / Metin"} onClick={() => { setMenu(null); ayar.onDuzenle?.(); }}>
          <Type size={18} />
        </button>
      )}
      {ayar.renk && (
        <div className="relative">
          <button type="button" className={DUGME} title="Renk" aria-label="Renk" aria-expanded={menu === "renk"} onClick={() => ac("renk")}>
            <Palette size={18} />
            <span className="h-3 w-3 rounded-full ring-1 ring-slate-300" style={{ background: ayar.renk.deger ?? "#111827" }} />
          </button>
          {menu === "renk" && (
            <div className={MENU}>
              <span className={BOLUM}>Çizgi rengi</span>
              <RenkKutulari palet={ayar.renk.palet} deger={ayar.renk.deger} onSec={ayar.renk.onSec} onek="Renk" />
            </div>
          )}
        </div>
      )}
      {(ayar.dolgu || ayar.tarama) && (
        <div className="relative">
          <button type="button" className={DUGME} title="Dolgu / Tarama" aria-label="Dolgu / Tarama" aria-expanded={menu === "dolgu"} onClick={() => ac("dolgu")}>
            <PaintBucket size={18} />
          </button>
          {menu === "dolgu" && (
            <div className={MENU}>
              {ayar.dolgu && (
                <>
                  <span className={BOLUM}>Dolgu</span>
                  <RenkKutulari palet={ayar.dolgu.palet} deger={ayar.dolgu.deger} onSec={ayar.dolgu.onSec} onek="Dolgu" />
                </>
              )}
              {ayar.tarama && (
                <>
                  <span className={`${BOLUM} mt-1`}>Tarama</span>
                  <div className="flex gap-1.5">
                    {(["yok", "capraz", "nokta"] as TaramaTipi[]).map((t) => (
                      <Hap key={t} aktif={ayar.tarama!.deger === t} onClick={() => ayar.tarama!.onSec(t)}>
                        {t === "yok" ? "Yok" : t === "capraz" ? "Çapraz" : "Noktalı"}
                      </Hap>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
      {(ayar.cizgi || ayar.punto) && (
        <div className="relative">
          <button type="button" className={DUGME} title="Kalınlık ve kesikli çizgi" aria-label="Kalınlık ve kesikli çizgi" aria-expanded={menu === "cizgi"} onClick={() => ac("cizgi")}>
            <Minus size={18} strokeWidth={3} />
          </button>
          {menu === "cizgi" && (
            <div className={MENU}>
              {ayar.cizgi && (
                <>
                  <span className={BOLUM}>Kalınlık</span>
                  <div className="flex gap-1.5">
                    {[1, 2, 3].map((k) => (
                      <Hap key={k} aktif={ayar.cizgi!.kalinlik === k} onClick={() => ayar.cizgi!.onKalinlik(k)}>
                        {k === 1 ? "İnce" : k === 2 ? "Orta" : "Kalın"}
                      </Hap>
                    ))}
                  </div>
                  {ayar.cizgi.onCizgiTipi && (
                    <>
                      <span className={`${BOLUM} mt-1`}>Çizgi</span>
                      <div className="flex gap-1.5">
                        <Hap aktif={ayar.cizgi.cizgiTipi !== "kesik"} onClick={() => ayar.cizgi!.onCizgiTipi!("duz")}>Düz</Hap>
                        <Hap aktif={ayar.cizgi.cizgiTipi === "kesik"} onClick={() => ayar.cizgi!.onCizgiTipi!("kesik")}>Kesikli</Hap>
                      </div>
                    </>
                  )}
                  {ayar.cizgi.onOkUcu && (
                    <>
                      <span className={`${BOLUM} mt-1`}>Ok ucu</span>
                      <div className="flex gap-1.5">
                        {(["yok", "son", "cift"] as const).map((u) => (
                          <Hap key={u} aktif={(ayar.cizgi!.okUcu ?? "yok") === u} onClick={() => ayar.cizgi!.onOkUcu!(u)}>
                            {u === "yok" ? "Yok" : u === "son" ? "Tek" : "Çift"}
                          </Hap>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
              {ayar.punto && (
                <>
                  <span className={BOLUM}>Yazı boyu (punto)</span>
                  <div className="flex items-center gap-1.5">
                    <Hap aktif={false} etiket="Yazıyı küçült" onClick={() => ayar.punto!.onDegis(Math.max(8, ayar.punto!.deger - 2))}>A−</Hap>
                    <span className="w-10 text-center text-sm font-semibold text-slate-700">{ayar.punto.deger}</span>
                    <Hap aktif={false} etiket="Yazıyı büyüt" onClick={() => ayar.punto!.onDegis(Math.min(48, ayar.punto!.deger + 2))}>A+</Hap>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
      {ayar.coklu && ayar.onHizala && (
        <div className="relative">
          <button type="button" className={`${DUGME} text-xs font-semibold`} aria-expanded={menu === "hizala"} onClick={() => ac("hizala")}>
            <AlignHorizontalJustifyStart size={18} /> Hizala
          </button>
          {menu === "hizala" && (
            <div className={MENU} role="menu">
              {([
                ["sol", "Sola hizala", AlignHorizontalJustifyStart],
                ["orta-x", "Dikey merkez", AlignCenterVertical],
                ["ust", "Üste hizala", AlignVerticalJustifyStart],
                ["orta-y", "Yatay merkez", AlignCenterHorizontal],
              ] as const).map(([t, ad, Ikon]) => (
                <button key={t} type="button" role="menuitem" onClick={() => { ayar.onHizala!(t); setMenu(null); }}
                  className="flex h-10 items-center gap-2 rounded-lg px-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                  <Ikon size={16} /> {ad}
                </button>
              ))}
              {ayar.onDagit && (
                <>
                  <button type="button" role="menuitem" disabled={!ayar.dagitilabilir} onClick={() => { ayar.onDagit!("x"); setMenu(null); }}
                    className="flex h-10 items-center gap-2 rounded-lg px-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40">
                    <Columns3 size={16} /> Yatay dağıt
                  </button>
                  <button type="button" role="menuitem" disabled={!ayar.dagitilabilir} onClick={() => { ayar.onDagit!("y"); setMenu(null); }}
                    className="flex h-10 items-center gap-2 rounded-lg px-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40">
                    <Rows3 size={16} /> Dikey dağıt
                  </button>
                  {!ayar.dagitilabilir && <span className="px-2 text-[11px] text-slate-400">Dağıtmak için en az 3 şekil seçin.</span>}
                </>
              )}
            </div>
          )}
        </div>
      )}
      {ayar.coklu && ayar.onGrupla && (
        <button type="button" className={DUGME} title="Grupla" aria-label="Grupla" onClick={ayar.onGrupla}><Group size={18} /></button>
      )}
      {ayar.onGrubuCoz && (
        <button type="button" className={DUGME} title="Grubu çöz" aria-label="Grubu çöz" onClick={ayar.onGrubuCoz}><Ungroup size={18} /></button>
      )}
      {ayar.onCevir && (
        <button type="button" className={DUGME} title="Yatay çevir" aria-label="Yatay çevir" onClick={ayar.onCevir}><FlipHorizontal2 size={18} /></button>
      )}
      {ayar.onDondur && (
        <button type="button" className={DUGME} title="90° döndür" aria-label="90° döndür" onClick={ayar.onDondur}><RotateCw size={18} /></button>
      )}
      <button type="button" className={DUGME} title="Çoğalt (Ctrl+D)" aria-label="Çoğalt" onClick={ayar.onCogalt}><Copy size={18} /></button>
      <button type="button" className={`${DUGME} text-rose-600 hover:bg-rose-50`} title="Sil (Delete)" aria-label="Sil" onClick={ayar.onSil}><Trash2 size={18} /></button>
      <span className="mx-0.5 h-6 w-px bg-slate-200" />
      <button type="button" className={DUGME} title="Ayrıntılı ayarlar (sağ panel)" aria-label="Ayrıntılar" aria-pressed={ayar.ayrintiAcik} onClick={ayar.onAyrintilar}>
        <SlidersHorizontal size={18} />
      </button>
      <div className="relative">
        <button type="button" className={DUGME} title="Daha fazla" aria-label="Şekil için daha fazla" aria-expanded={menu === "fazla"} onClick={() => ac("fazla")}>
          <MoreHorizontal size={18} />
        </button>
        {menu === "fazla" && (
          <div className={`${MENU} left-auto right-0`} role="menu">
            {[
              ["Öne getir", ayar.onOne],
              ["Arkaya gönder", ayar.onArkaya],
              ["Şablon olarak kaydet", ayar.onSablonKaydet],
            ].map(([ad, f]) => (
              <button key={ad as string} type="button" role="menuitem" onClick={() => { (f as () => void)(); setMenu(null); }}
                className="flex h-10 items-center rounded-lg px-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                {ad as string}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
