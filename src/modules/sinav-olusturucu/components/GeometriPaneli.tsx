// Geometri ve fizik ek şekillerinin paneli: köşe adlı üçgen (açıortay, kenarortay, dış açı, iç teğet /
// çevrel çember), çember (iç/dış açı, teğet-kiriş, dilim), benzer üçgenler, çokgen, doğruda açılar,
// özel dörtgenler, katı cisimler, kağıt katlama;
// açı yayı, dik açı, eş kenar işareti; ışın ok, halka akım, solenoid, düz tel alanı, ⊗/⊙ alanı,
// girişim deseni, enerji düzeyi. Çizim kodu `cizim/geometriSekilleri.ts` ve `cizim/fizikEk.ts`'te.
//
// `FizikSecimPaneli` seçili şekil bunlardan biriyse bu paneli etiket satırının altına koyar.

import { useEffect, useRef, useState } from "react";

import {
  BENZER_SABLONLARI,
  CEMBER_SABLONLARI,
  COKGEN_SABLONLARI,
  DOGRU_ACI_SABLONLARI,
  DORTGEN_SABLONLARI,
  DORTGEN_TIPLERI,
  KATI_SABLONLARI,
  KATI_TURLERI,
  KATLAMA_SABLONLARI,
  UCGEN_SABLONLARI,
  geometriNesneyeUygun,
  geometriSablonOnizlemeCiz,
  geometriVerisiGecerliMi,
  ucgenKoseleri,
  ucgenOlculeri,
  varsayilanBenzer,
  varsayilanCember,
  varsayilanCokgen,
  varsayilanGeometri,
  varsayilanUcgen,
} from "../cizim/geometriSekilleri";
import type { GeometriSablonu } from "../cizim/geometriSekilleri";
import { dortgenKoseleri, kagitKenarlari, kagitKoseleri, katDuzelt, varsayilanKati } from "../cizim/geometriEk";
import {
  ENERJI_VARSAYILAN_DUZEYLER,
  ENERJI_VARSAYILAN_GECISLER,
  enerjiDuzeyleriOku,
  enerjiGecisleriOku,
} from "../cizim/fizikEk";
import type { FizikEk, GeoAciIsareti, GeometriVerisi, KatlamaAdimi, KatlamaKagidi, Sekil } from "../cizim/tipler";
import { MetinGirdisi, OndalikGirdisi } from "./GrafikPaneli";
import { EnerjiTablolari } from "./EnerjiDuzeyTablosu";
import { TogglePill } from "./ModalParcalari";

type FizikSekliTipi = Extract<Sekil, { tur: "fizik" }>;

const BASLIK = "text-[10px] font-bold uppercase tracking-wide text-slate-500";
const SATIR = "mt-2 flex flex-wrap items-center gap-1.5";

export const GEO_PANELLI_NESNELER = [
  "ucgenABC", "dikUcgen", "benzerUcgen", "cemberGeo", "cokgenAd",
  "dogrudaAcilar", "dortgenGeo", "katiCisim", "kagitKatlama",
  "aciYayi", "dikAci", "esIsaret",
  "isinOk", "halkaAkim", "solenoid", "telAlan", "alanNokta", "dalgaGirisim", "enerjiDuzeyi",
];

export const geoPaneliVarMi = (nesne: string) => GEO_PANELLI_NESNELER.includes(nesne);

function SayiPil({ deger, secenekler, onSec, ad }: { deger: number; secenekler: number[]; onSec: (n: number) => void; ad: string }) {
  return (
    <>
      {secenekler.map((n) => (
        <TogglePill key={n} aktif={deger === n} onClick={() => onSec(n)}>
          <span aria-label={`${ad}: ${n}`}>{n}</span>
        </TogglePill>
      ))}
    </>
  );
}

/** Şablon kartındaki küçük önizleme: gerçek çizim rutini (`geometriSablonOnizlemeCiz`). */
function GeoOnizleme({ sablon }: { sablon: GeometriSablonu }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const oran = typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1;
    canvas.width = 64 * oran;
    canvas.height = 40 * oran;
    ctx.setTransform(oran, 0, 0, oran, 0, 0);
    geometriSablonOnizlemeCiz(ctx, sablon, 64, 40);
  }, [sablon]);
  return <canvas ref={ref} width={64} height={40} style={{ width: 64, height: 40 }} aria-hidden="true" />;
}

function SablonSirasi({ sablonlar, onSec, ad }: { sablonlar: GeometriSablonu[]; onSec: (i: number) => void; ad: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={BASLIK}>{ad}</span>
      <div className="flex flex-wrap items-stretch gap-1.5">
        {sablonlar.map((sb, i) => (
          <button
            key={sb.id}
            type="button"
            title={sb.ipucu}
            aria-label={`${ad}: ${sb.ad}`}
            onClick={() => onSec(i)}
            className="inline-flex w-[76px] flex-col items-center gap-0.5 rounded-lg border border-slate-200 bg-white px-1 pb-1 pt-1 text-center text-[10px] font-semibold leading-tight text-slate-600 hover:border-brand-200 hover:bg-brand-50"
          >
            <GeoOnizleme sablon={sb} />
            {sb.ad}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Seçenek düğmeleri (tek seçim). */
function Secenekler<T extends string>({ baslik, deger, secenekler, onSec }: { baslik: string; deger: T; secenekler: readonly (readonly [T, string])[]; onSec: (v: T) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={BASLIK}>{baslik}</span>
      {secenekler.map(([id, ad]) => (
        <TogglePill key={id} aktif={deger === id} onClick={() => onSec(id)}>
          <span aria-label={`${baslik}: ${ad}`}>{ad}</span>
        </TogglePill>
      ))}
    </div>
  );
}

/** Açılır seçim kutusu (kağıt katlamada köşe/kenar seçimi). */
function SecimKutusu({ etiket, deger, secenekler, onSec }: { etiket: string; deger: string; secenekler: { id: string; ad: string }[]; onSec: (v: string) => void }) {
  return (
    <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
      {etiket}
      <select aria-label={etiket} value={deger} onChange={(e) => onSec(e.target.value)} className="rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-[11px]">
        {secenekler.map((s) => <option key={s.id} value={s.id}>{s.ad}</option>)}
      </select>
    </label>
  );
}

/** Seyrek kullanılan ayarlar: katlanır bölüm. */
function DigerAyarlar({ children, ad = "Adlar, etiketler ve diğer ayarlar" }: { children: React.ReactNode; ad?: string }) {
  return (
    <details className="rounded-md border border-slate-200 bg-slate-50/60 px-2 py-1">
      <summary className="cursor-pointer select-none text-[11px] font-semibold text-slate-600">{ad}</summary>
      <div className="mt-1.5 flex flex-col gap-1.5">{children}</div>
    </details>
  );
}

const dizi = <T,>(d: T[], i: number, v: T, dolgu: T) => Array.from({ length: Math.max(d.length, i + 1) }, (_, j) => (j === i ? v : d[j] ?? dolgu));
const IPUCU = "text-[10px] text-slate-500";

const ACI_ISARETLERI: { id: GeoAciIsareti; ad: string }[] = [{ id: "yok", ad: "Yok" }, { id: "yay", ad: "Yay" }, { id: "dik", ad: "Dik açı" }];

function UcgenPaneli({ geo, yaz, tarihce }: { geo: Extract<GeometriVerisi, { tur: "ucgen" }>; yaz: (g: GeometriVerisi) => void; tarihce: () => void }) {
  const koseler = ucgenKoseleri(geo);
  const olcu = koseler ? ucgenOlculeri(koseler) : null;
  const gunc = (yama: Partial<typeof geo>) => yaz({ ...geo, ...yama });
  const f = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");
  const olcuAdlari = geo.mod === "kenar" ? ["a (BC)", "b (CA)", "c (AB)"] : ["b (CA)", "c (AB)", "A açısı °"];
  const kAd = (i: number) => geo.adlar[i] || "ABC"[i];
  const disAci = geo.disAci ?? [];
  const koseSec = [["yok", "Yok"], ["A", kAd(0)], ["B", kAd(1)], ["C", kAd(2)]] as const;
  return (
    <div className="flex flex-col gap-1.5" data-testid="geo-ucgen">
      <SablonSirasi ad="Hazır üçgen" sablonlar={UCGEN_SABLONLARI} onSec={(i) => { tarihce(); yaz(UCGEN_SABLONLARI[i].olustur()); }} />
      <div className={SATIR.replace("mt-2 ", "")}>
        <span className={BASLIK}>Çizim</span>
        {([["kenar", "Kenar uzunlukları (a, b, c)"], ["aci", "İki kenar + aradaki açı"], ["serbest", "Köşe konumları"]] as const).map(([id, ad]) => (
          <TogglePill
            key={id}
            aktif={geo.mod === id}
            onClick={() => { tarihce(); gunc({ mod: id, sabitKutu: undefined, olcu: id === "aci" && geo.mod !== "aci" ? [5, 4, 60] : id === "kenar" && geo.mod !== "kenar" ? [6, 5, 4] : geo.olcu }); }}
          >
            {ad}
          </TogglePill>
        ))}
      </div>
      {geo.mod !== "serbest" ? (
        <div className="flex flex-wrap items-center gap-2">
          {olcuAdlari.map((ad, i) => (
            <OndalikGirdisi key={ad} etiket={ad} deger={geo.olcu[i]} onOdak={tarihce} onDegis={(v) => v !== undefined && gunc({ olcu: dizi(geo.olcu, i, v, 0) })} />
          ))}
        </div>
      ) : (
        <span className={IPUCU}>Köşeleri tuvalde fareyle sürükleyin (ya da konumları aşağıdan yazın).</span>
      )}
      {!koseler && <span className="text-[10px] text-red-600" role="alert">Bu ölçülerle üçgen kurulamaz (üçgen eşitsizliği ya da açı 0–180° dışında).</span>}
      {olcu && (
        <span className="text-[10px] text-slate-500" data-testid="geo-ucgen-olcu">
          Kenarlar a={f(olcu.kenar[0])}, b={f(olcu.kenar[1])}, c={f(olcu.kenar[2])} · açılar A={f(olcu.aci[0])}°, B={f(olcu.aci[1])}°, C={f(olcu.aci[2])}°
        </span>
      )}
      <Secenekler baslik="Yükseklik" deger={geo.yukseklik} secenekler={koseSec} onSec={(k) => { tarihce(); gunc({ yukseklik: k }); }} />
      <Secenekler baslik="Açıortay" deger={geo.aciortay ?? "yok"} secenekler={koseSec} onSec={(k) => { tarihce(); gunc({ aciortay: k }); }} />
      <Secenekler baslik="Kenarortay" deger={geo.kenarortay ?? "yok"} secenekler={[...koseSec, ["hepsi", "Üçü + ağırlık merkezi"]] as const} onSec={(k) => { tarihce(); gunc({ kenarortay: k }); }} />
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={BASLIK}>Çember / dış açı</span>
        <TogglePill aktif={geo.icTegetCember === true} onClick={() => { tarihce(); gunc({ icTegetCember: !geo.icTegetCember }); }}>İç teğet çember</TogglePill>
        <TogglePill aktif={geo.cevrelCember === true} onClick={() => { tarihce(); gunc({ cevrelCember: !geo.cevrelCember }); }}>Çevrel çember</TogglePill>
        {(["A", "B", "C"] as const).map((k, i) => (
          <TogglePill key={k} aktif={disAci.includes(k)} onClick={() => { tarihce(); gunc({ disAci: disAci.includes(k) ? disAci.filter((x) => x !== k) : [...disAci, k] }); }}>
            <span aria-label={`Dış açı: ${k}`}>{kAd(i)} dış açısı</span>
          </TogglePill>
        ))}
      </div>
      <DigerAyarlar>
        {geo.mod === "serbest" && (
          <div className="flex flex-wrap items-center gap-2">
            {geo.kose.map((p, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                <OndalikGirdisi etiket={`${kAd(i)} x (0–1)`} deger={p.x} onOdak={tarihce} onDegis={(v) => v !== undefined && gunc({ kose: geo.kose.map((q, j) => (j === i ? { ...q, x: Math.max(0, Math.min(1, v)) } : q)) })} />
                <OndalikGirdisi etiket={`${kAd(i)} y (0–1)`} deger={p.y} onOdak={tarihce} onDegis={(v) => v !== undefined && gunc({ kose: geo.kose.map((q, j) => (j === i ? { ...q, y: Math.max(0, Math.min(1, v)) } : q)) })} />
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {[0, 1, 2].map((i) => (
            <MetinGirdisi key={`ad${i}`} etiket={`Köşe ${i + 1} adı`} deger={geo.adlar[i] ?? ""} genislik="w-12" enCok={6} onOdak={tarihce} onDegis={(v) => gunc({ adlar: dizi(geo.adlar, i, v, "") })} />
          ))}
          {[0, 1, 2].map((i) => (
            <MetinGirdisi key={`k${i}`} etiket={`${"abc"[i]} kenarı`} deger={geo.kenarlar[i] ?? ""} genislik="w-16" enCok={12} yerTutucu={`${"abc"[i]} ya da 5 cm`} onOdak={tarihce} onDegis={(v) => gunc({ kenarlar: dizi(geo.kenarlar, i, v, "") })} />
          ))}
        </div>
        {[0, 1, 2].map((i) => (
          <div key={`a${i}`} className="flex flex-wrap items-center gap-1.5">
            <span className={BASLIK}>{kAd(i)} köşesi</span>
            {ACI_ISARETLERI.map((a) => (
              <TogglePill key={a.id} aktif={geo.aciIsareti[i] === a.id} onClick={() => { tarihce(); gunc({ aciIsareti: dizi(geo.aciIsareti, i, a.id, "yok") }); }}>
                <span aria-label={`${"ABC"[i]} köşesi açı işareti: ${a.ad}`}>{a.ad}</span>
              </TogglePill>
            ))}
            <MetinGirdisi etiket={`${"ABC"[i]} açı etiketi`} deger={geo.acilar[i] ?? ""} genislik="w-14" enCok={12} yerTutucu="60° ya da α" onOdak={tarihce} onDegis={(v) => gunc({ acilar: dizi(geo.acilar, i, v, "") })} />
            <span className={IPUCU}>Eş açı yayı</span>
            <SayiPil ad={`${"ABC"[i]} eş açı yayı`} deger={geo.esAci[i] ?? 0} secenekler={[0, 1, 2, 3]} onSec={(n) => { tarihce(); gunc({ esAci: dizi(geo.esAci, i, n, 0) }); }} />
            <span className={IPUCU}>· {"abc"[i]} kenarında eş kenar işareti</span>
            <SayiPil ad={`${"abc"[i]} eş kenar işareti`} deger={geo.esKenar[i] ?? 0} secenekler={[0, 1, 2, 3]} onSec={(n) => { tarihce(); gunc({ esKenar: dizi(geo.esKenar, i, n, 0) }); }} />
            {disAci.includes("ABC"[i] as "A") && (
              <MetinGirdisi etiket={`${"ABC"[i]} dış açı etiketi`} deger={geo.disAciEtiket?.[i] ?? ""} genislik="w-14" enCok={12} yerTutucu="α+β" onOdak={tarihce} onDegis={(v) => gunc({ disAciEtiket: dizi(geo.disAciEtiket ?? ["", "", ""], i, v, "") })} />
            )}
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-2">
          <MetinGirdisi etiket="Yükseklik adı" deger={geo.yukseklikEtiket} genislik="w-12" enCok={6} onOdak={tarihce} onDegis={(v) => gunc({ yukseklikEtiket: v })} />
          <MetinGirdisi etiket="Yükseklik ayağı" deger={geo.ayakAdi} genislik="w-12" enCok={6} onOdak={tarihce} onDegis={(v) => gunc({ ayakAdi: v })} />
          <MetinGirdisi etiket="Açıortay ayağı" deger={geo.aciortayAdi ?? "N"} genislik="w-12" enCok={6} onOdak={tarihce} onDegis={(v) => gunc({ aciortayAdi: v })} />
          <MetinGirdisi etiket="Kenarortay ayağı" deger={geo.kenarortayAdi ?? "V"} genislik="w-12" enCok={6} onOdak={tarihce} onDegis={(v) => gunc({ kenarortayAdi: v })} />
          <MetinGirdisi etiket="Ağırlık merkezi" deger={geo.agirlikAdi ?? "G"} genislik="w-12" enCok={6} onOdak={tarihce} onDegis={(v) => gunc({ agirlikAdi: v })} />
          <MetinGirdisi etiket="İç teğet merkezi" deger={geo.icMerkezAdi ?? "I"} genislik="w-12" enCok={6} onOdak={tarihce} onDegis={(v) => gunc({ icMerkezAdi: v })} />
          <MetinGirdisi etiket="Çevrel merkez" deger={geo.cevrelMerkezAdi ?? "O"} genislik="w-12" enCok={6} onOdak={tarihce} onDegis={(v) => gunc({ cevrelMerkezAdi: v })} />
        </div>
      </DigerAyarlar>
    </div>
  );
}

function CemberPaneli({ geo, yaz, tarihce }: { geo: Extract<GeometriVerisi, { tur: "cember" }>; yaz: (g: GeometriVerisi) => void; tarihce: () => void }) {
  const gunc = (yama: Partial<typeof geo>) => yaz({ ...geo, ...yama });
  const secenekler: [keyof typeof geo, string][] = [
    ["merkez", "Merkez O"], ["yaricap", "Yarıçap OA"], ["kiris", "Kiriş AB"], ["cap", "Çap"], ["merkezAci", "Merkez açı AOB"], ["cevreAci", "Çevre açı ACB"],
    ["teget", "Teğet (T)"], ["icAci", "İç açı (AB × CD)"], ["tegetKiris", "Teğet-kiriş açısı"], ["dilimTarama", "Daire dilimi tarama"],
  ];
  const konum = [...(geo.konum.length >= 4 ? geo.konum : [200, 340, 90, 300])];
  const disAdlar = geo.disAdlar ?? ["P", "C", "D"];
  return (
    <div className="flex flex-col gap-1.5" data-testid="geo-cember">
      <SablonSirasi ad="Hazır çember" sablonlar={CEMBER_SABLONLARI} onSec={(i) => { tarihce(); yaz(CEMBER_SABLONLARI[i].olustur()); }} />
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={BASLIK}>Çiz</span>
        {secenekler.map(([alan, ad]) => (
          <TogglePill key={alan} aktif={geo[alan] === true} onClick={() => { tarihce(); gunc({ [alan]: !geo[alan] } as Partial<typeof geo>); }}>{ad}</TogglePill>
        ))}
      </div>
      <Secenekler baslik="Dış nokta P" deger={geo.disAci ?? "yok"} secenekler={[["yok", "Yok"], ["kesen", "İki kesen"], ["teget", "İki teğet"]] as const}
        onSec={(d) => { tarihce(); gunc({ disAci: d, ...(d !== "yok" && !geo.disNokta ? { disNokta: { aci: 0, uzaklik: 2.1 } } : {}), ...(d === "teget" && !geo.disAdlar ? { disAdlar: ["P", "A", "B"] } : {}) }); }} />
      <span className={IPUCU}>A, B, C, T (ve P) noktalarını tuvalde çember üstünde sürükleyebilirsiniz.</span>
      <DigerAyarlar>
        <div className="flex flex-wrap items-center gap-2">
          {["Merkez", "A", "B", "C", "T", "D", "E (kesişim)"].map((ad, i) => (
            <MetinGirdisi key={ad} etiket={`${ad} adı`} deger={geo.adlar[i] ?? (i === 6 ? "E" : "")} genislik="w-12" enCok={6} onOdak={tarihce} onDegis={(v) => gunc({ adlar: dizi(geo.adlar, i, v, "") })} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {["A", "B", "C", "T", "D"].map((ad, i) => (
            <OndalikGirdisi key={ad} etiket={`${ad} konumu °`} deger={i === 4 ? geo.konum[4] ?? 290 : konum[i]} onOdak={tarihce}
              onDegis={(v) => { if (v === undefined) return; const k = [...konum, geo.konum[4] ?? 290]; k[i] = v; gunc({ konum: i === 4 || geo.konum.length >= 5 ? k : k.slice(0, 4) }); }} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MetinGirdisi etiket="Merkez açı etiketi" deger={geo.merkezAciEtiket} genislik="w-14" enCok={12} onOdak={tarihce} onDegis={(v) => gunc({ merkezAciEtiket: v })} />
          <MetinGirdisi etiket="Çevre açı etiketi" deger={geo.cevreAciEtiket} genislik="w-14" enCok={12} onOdak={tarihce} onDegis={(v) => gunc({ cevreAciEtiket: v })} />
          <MetinGirdisi etiket="İç açı etiketi" deger={geo.icAciEtiket ?? ""} genislik="w-14" enCok={12} onOdak={tarihce} onDegis={(v) => gunc({ icAciEtiket: v })} />
          <MetinGirdisi etiket="Dış açı etiketi" deger={geo.disAciEtiket ?? ""} genislik="w-14" enCok={12} onOdak={tarihce} onDegis={(v) => gunc({ disAciEtiket: v })} />
          <MetinGirdisi etiket="Teğet-kiriş etiketi" deger={geo.tegetKirisEtiket ?? ""} genislik="w-14" enCok={12} onOdak={tarihce} onDegis={(v) => gunc({ tegetKirisEtiket: v })} />
        </div>
        {(geo.disAci ?? "yok") !== "yok" && (
          <div className="flex flex-wrap items-center gap-2">
            <OndalikGirdisi etiket="P yönü °" deger={geo.disNokta?.aci ?? 0} onOdak={tarihce} onDegis={(v) => v !== undefined && gunc({ disNokta: { aci: v, uzaklik: geo.disNokta?.uzaklik ?? 2.1 } })} />
            <OndalikGirdisi etiket="P uzaklığı (× r, 1,25–3)" deger={geo.disNokta?.uzaklik ?? 2.1} onOdak={tarihce} onDegis={(v) => v !== undefined && gunc({ disNokta: { aci: geo.disNokta?.aci ?? 0, uzaklik: Math.max(1.25, Math.min(3, v)) } })} />
            {["P", geo.disAci === "teget" ? "1. teğet noktası" : "1. yakın nokta", geo.disAci === "teget" ? "2. teğet noktası" : "2. yakın nokta"].map((ad, i) => (
              <MetinGirdisi key={ad} etiket={`${ad} adı`} deger={disAdlar[i] ?? ""} genislik="w-12" enCok={6} onOdak={tarihce} onDegis={(v) => gunc({ disAdlar: dizi(disAdlar, i, v, "") })} />
            ))}
          </div>
        )}
      </DigerAyarlar>
    </div>
  );
}

function BenzerPaneli({ geo, yaz, tarihce }: { geo: Extract<GeometriVerisi, { tur: "benzer" }>; yaz: (g: GeometriVerisi) => void; tarihce: () => void }) {
  const gunc = (yama: Partial<typeof geo>) => yaz({ ...geo, ...yama });
  const [etiketMetni, setEtiketMetni] = useState(geo.etiketler.join(", "));
  return (
    <div className="flex flex-col gap-1.5" data-testid="geo-benzer">
      <SablonSirasi ad="Hazır benzer üçgen" sablonlar={BENZER_SABLONLARI} onSec={(i) => { tarihce(); const g = BENZER_SABLONLARI[i].olustur(); yaz(g); if (g.tur === "benzer") setEtiketMetni(g.etiketler.join(", ")); }} />
      <div className="flex flex-wrap items-center gap-2">
        <OndalikGirdisi etiket="Benzerlik oranı (0,15–0,9)" deger={geo.oran} onOdak={tarihce} onDegis={(v) => v !== undefined && gunc({ oran: Math.max(0.15, Math.min(0.9, v)) })} />
        <TogglePill aktif={geo.esAci} onClick={() => { tarihce(); gunc({ esAci: !geo.esAci }); }}>Eş açı yayları</TogglePill>
        {geo.adlar.slice(0, geo.duzen === "ic" ? 5 : 6).map((ad, i) => (
          <MetinGirdisi key={i} etiket={`Köşe ${i + 1} adı`} deger={ad} genislik="w-12" enCok={6} onOdak={tarihce} onDegis={(v) => gunc({ adlar: geo.adlar.map((q, j) => (j === i ? v : q)) })} />
        ))}
      </div>
      <MetinGirdisi
        etiket="Kenar etiketleri (virgülle)"
        deger={etiketMetni}
        genislik="w-64"
        yerTutucu={geo.duzen === "ic" ? "AD, DB, AE, EC, DE, BC sırasıyla" : "a, b, c, a', b', c'"}
        onOdak={tarihce}
        onDegis={(v) => { setEtiketMetni(v); gunc({ etiketler: v.split(",").map((t) => t.trim().slice(0, 12)).slice(0, 6) }); }}
      />
    </div>
  );
}

function CokgenPaneli({ geo, yaz, tarihce }: { geo: Extract<GeometriVerisi, { tur: "cokgen" }>; yaz: (g: GeometriVerisi) => void; tarihce: () => void }) {
  const gunc = (yama: Partial<typeof geo>) => yaz({ ...geo, ...yama });
  const [adMetni, setAdMetni] = useState(geo.adlar.join(""));
  return (
    <div className="flex flex-col gap-1.5" data-testid="geo-cokgen">
      <SablonSirasi ad="Hazır çokgen" sablonlar={COKGEN_SABLONLARI} onSec={(i) => { tarihce(); const g = COKGEN_SABLONLARI[i].olustur(); yaz(g); if (g.tur === "cokgen") setAdMetni(g.adlar.join("")); }} />
      <div className="flex flex-wrap items-center gap-2">
        <OndalikGirdisi
          etiket="Kenar sayısı (3–12)"
          deger={geo.n}
          onOdak={tarihce}
          onDegis={(v) => {
            if (v === undefined || !Number.isInteger(v) || v < 3 || v > 12) return;
            const yeni = varsayilanCokgen({ n: v });
            gunc({ n: v, adlar: yeni.adlar });
            setAdMetni(yeni.adlar.join(""));
          }}
        />
        <MetinGirdisi
          etiket="Köşe adları"
          deger={adMetni}
          genislik="w-28"
          enCok={40}
          yerTutucu="ABCDE ya da A,B,C"
          onOdak={tarihce}
          onDegis={(v) => {
            setAdMetni(v);
            const liste = v.includes(",") ? v.split(",").map((t) => t.trim()) : v.split("");
            gunc({ adlar: Array.from({ length: geo.n }, (_, i) => liste[i] ?? "") });
          }}
        />
        <TogglePill aktif={geo.merkez} onClick={() => { tarihce(); gunc({ merkez: !geo.merkez }); }}>Merkez O</TogglePill>
        <TogglePill aktif={geo.kosegen} onClick={() => { tarihce(); gunc({ kosegen: !geo.kosegen }); }}>Köşegenler</TogglePill>
        <TogglePill aktif={geo.esKenar} onClick={() => { tarihce(); gunc({ esKenar: !geo.esKenar }); }}>Eş kenar işareti</TogglePill>
      </div>
    </div>
  );
}

// ── v1.2: doğruda açılar, özel dörtgen, katı cisim, kağıt katlama ──────────

const DOGRU_DUZENLERI = [["kesen", "Kesen (8 açı)"], ["z", "Z (iç ters)"], ["u", "U (karşı durumlu)"], ["m", "M kuralı"], ["kalemUcu", "Kalem ucu"], ["zikzak", "Zikzak"]] as const;
const DOGRU_ACI_ADLARI: Record<Extract<GeometriVerisi, { tur: "dogruAci" }>["duzen"], string[]> = {
  kesen: ["1 (üst, sağ-üst)", "2 (üst, sol-üst)", "3 (üst, sol-alt)", "4 (üst, sağ-alt)", "5 (alt, sağ-üst)", "6 (alt, sol-üst)", "7 (alt, sol-alt)", "8 (alt, sağ-alt)"],
  z: ["A'daki açı", "B'deki açı"],
  u: ["A'daki açı", "B'deki açı"],
  m: ["A'daki açı", "B'deki açı", "C'deki açı"],
  kalemUcu: ["A'daki açı", "B'deki açı", "C'deki açı"],
  zikzak: ["A'daki açı", "C'deki açı", "D'deki açı", "B'deki açı"],
};

function DogruAciPaneli({ geo, yaz, tarihce }: { geo: Extract<GeometriVerisi, { tur: "dogruAci" }>; yaz: (g: GeometriVerisi) => void; tarihce: () => void }) {
  const gunc = (yama: Partial<typeof geo>) => yaz({ ...geo, ...yama });
  const ikiAci = geo.duzen === "m" || geo.duzen === "kalemUcu" || geo.duzen === "zikzak";
  const aciAdi = geo.duzen === "kesen" ? "Kesenin eğimi ° (10–170)" : ikiAci ? "A'daki açı ° (10–80)" : "A'daki açı ° (10–170)";
  return (
    <div className="flex flex-col gap-1.5" data-testid="geo-dogru-aci">
      <SablonSirasi ad="Hazır kural" sablonlar={DOGRU_ACI_SABLONLARI} onSec={(i) => { tarihce(); yaz(DOGRU_ACI_SABLONLARI[i].olustur()); }} />
      <Secenekler baslik="Düzen" deger={geo.duzen} secenekler={DOGRU_DUZENLERI} onSec={(d) => { tarihce(); gunc({ duzen: d }); }} />
      <div className="flex flex-wrap items-center gap-2">
        <OndalikGirdisi etiket={aciAdi} deger={geo.aci} onOdak={tarihce} onDegis={(v) => v !== undefined && gunc({ aci: Math.max(10, Math.min(ikiAci ? 80 : 170, v)) })} />
        {ikiAci && <OndalikGirdisi etiket="B'deki açı ° (10–80)" deger={geo.aci2} onOdak={tarihce} onDegis={(v) => v !== undefined && gunc({ aci2: Math.max(10, Math.min(80, v)) })} />}
        <TogglePill aktif={geo.paralelOk} onClick={() => { tarihce(); gunc({ paralelOk: !geo.paralelOk }); }}>Paralellik okları (&gt;&gt;)</TogglePill>
        <TogglePill aktif={geo.olcuYaz} onClick={() => { tarihce(); gunc({ olcuYaz: !geo.olcuYaz }); }}>Boş açılara ölçüyü yaz</TogglePill>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {DOGRU_ACI_ADLARI[geo.duzen].map((ad, i) => (
          <MetinGirdisi key={`${geo.duzen}${i}`} etiket={ad} deger={geo.etiketler[i] ?? ""} genislik="w-14" enCok={14} yerTutucu="α, 110°, 2x+10°" onOdak={tarihce} onDegis={(v) => gunc({ etiketler: dizi(geo.etiketler, i, v, "") })} />
        ))}
      </div>
      <DigerAyarlar>
        <div className="flex flex-wrap items-center gap-2">
          {["A", "B", "C", "D"].map((ad, i) => (
            <MetinGirdisi key={ad} etiket={`${ad} noktası adı`} deger={geo.adlar[i] ?? ""} genislik="w-12" enCok={6} onOdak={tarihce} onDegis={(v) => gunc({ adlar: dizi(geo.adlar, i, v, "") })} />
          ))}
          <MetinGirdisi etiket="1. doğru adı" deger={geo.dogruAdlari[0] ?? ""} genislik="w-14" enCok={12} onOdak={tarihce} onDegis={(v) => gunc({ dogruAdlari: dizi(geo.dogruAdlari, 0, v, "") })} />
          <MetinGirdisi etiket="2. doğru adı" deger={geo.dogruAdlari[1] ?? ""} genislik="w-14" enCok={12} onOdak={tarihce} onDegis={(v) => gunc({ dogruAdlari: dizi(geo.dogruAdlari, 1, v, "") })} />
        </div>
        <span className={IPUCU}>Kesende 1–8 gibi tek rakamlı etiketler yaysız yazılır; açı adı ya da derece yazınca yay çizilir.</span>
      </DigerAyarlar>
    </div>
  );
}

function DortgenPaneli({ geo, yaz, tarihce }: { geo: Extract<GeometriVerisi, { tur: "dortgen" }>; yaz: (g: GeometriVerisi) => void; tarihce: () => void }) {
  const gunc = (yama: Partial<typeof geo>) => yaz({ ...geo, ...yama });
  const tip = DORTGEN_TIPLERI.find((t) => t.id === geo.tip);
  const gecerli = dortgenKoseleri(geo) !== null;
  const kAd = (i: number) => geo.adlar[i] || "ABCD"[i];
  const kenarAdi = (i: number) => `${kAd(i)}${kAd((i + 1) % 4)}`;
  return (
    <div className="flex flex-col gap-1.5" data-testid="geo-dortgen">
      <SablonSirasi ad="Hazır dörtgen" sablonlar={DORTGEN_SABLONLARI} onSec={(i) => { tarihce(); yaz(DORTGEN_SABLONLARI[i].olustur()); }} />
      <Secenekler baslik="Tür" deger={geo.tip} secenekler={[...DORTGEN_TIPLERI.map((t) => [t.id, t.ad] as const), ...(geo.tip === "serbest" ? [["serbest", "Serbest (sürüklenmiş)"] as const] : [])]}
        onSec={(t) => { tarihce(); const yeni = DORTGEN_TIPLERI.find((x) => x.id === t); gunc({ tip: t, ...(yeni ? { olcu: [...yeni.varsayilan] } : {}) }); }} />
      {tip ? (
        <div className="flex flex-wrap items-center gap-2">
          {tip.olcuAdlari.map((ad, i) => (
            <OndalikGirdisi key={`${tip.id}${i}`} etiket={ad} deger={geo.olcu[i]} onOdak={tarihce} onDegis={(v) => v !== undefined && gunc({ olcu: dizi(geo.olcu, i, v, 0) })} />
          ))}
        </div>
      ) : <span className={IPUCU}>Köşeler serbest: tuvalde sürükleyin ya da yukarıdan bir tür seçin.</span>}
      {!gecerli && <span className="text-[10px] text-red-600" role="alert">Bu ölçülerle dörtgen kurulamaz (uzunluklar pozitif, açı 0–180°, oran 0–1 olmalı).</span>}
      <div className="flex flex-wrap items-center gap-1.5">
        <TogglePill aktif={geo.kosegen} onClick={() => { tarihce(); gunc({ kosegen: !geo.kosegen }); }}>Köşegenler + kesişim {geo.kesisimAdi || "E"}</TogglePill>
        <TogglePill aktif={geo.yukseklik} onClick={() => { tarihce(); gunc({ yukseklik: !geo.yukseklik }); }}>Yükseklik {kAd(3)}{geo.yukseklikAdi || "H"}</TogglePill>
        <TogglePill aktif={geo.dikIsaret} onClick={() => { tarihce(); gunc({ dikIsaret: !geo.dikIsaret }); }}>Dik kesişimde ∟</TogglePill>
      </div>
      <DigerAyarlar>
        <div className="flex flex-wrap items-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <MetinGirdisi key={`ad${i}`} etiket={`Köşe ${i + 1} adı`} deger={geo.adlar[i] ?? ""} genislik="w-12" enCok={6} onOdak={tarihce} onDegis={(v) => gunc({ adlar: dizi(geo.adlar, i, v, "") })} />
          ))}
          <MetinGirdisi etiket="Kesişim adı" deger={geo.kesisimAdi} genislik="w-12" enCok={6} onOdak={tarihce} onDegis={(v) => gunc({ kesisimAdi: v })} />
          <MetinGirdisi etiket="Yükseklik ayağı" deger={geo.yukseklikAdi} genislik="w-12" enCok={6} onOdak={tarihce} onDegis={(v) => gunc({ yukseklikAdi: v })} />
          <MetinGirdisi etiket="Yükseklik etiketi" deger={geo.yukseklikEtiket} genislik="w-12" enCok={8} onOdak={tarihce} onDegis={(v) => gunc({ yukseklikEtiket: v })} />
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div key={`k${i}`} className="flex flex-wrap items-center gap-1.5">
            <span className={BASLIK}>{kAd(i)} köşesi</span>
            {ACI_ISARETLERI.map((a) => (
              <TogglePill key={a.id} aktif={geo.aciIsareti[i] === a.id} onClick={() => { tarihce(); gunc({ aciIsareti: dizi(geo.aciIsareti, i, a.id, "yok") }); }}>
                <span aria-label={`${kAd(i)} köşesi açı işareti: ${a.ad}`}>{a.ad}</span>
              </TogglePill>
            ))}
            <MetinGirdisi etiket={`${kAd(i)} açı etiketi`} deger={geo.acilar[i] ?? ""} genislik="w-14" enCok={12} yerTutucu="60° ya da α" onOdak={tarihce} onDegis={(v) => gunc({ acilar: dizi(geo.acilar, i, v, "") })} />
            <SayiPil ad={`${kAd(i)} eş açı yayı`} deger={geo.esAci[i] ?? 0} secenekler={[0, 1, 2, 3]} onSec={(n) => { tarihce(); gunc({ esAci: dizi(geo.esAci, i, n, 0) }); }} />
            <span className={IPUCU}>· [{kenarAdi(i)}]</span>
            <MetinGirdisi etiket={`${kenarAdi(i)} kenarı`} deger={geo.kenarlar[i] ?? ""} genislik="w-14" enCok={12} yerTutucu="a ya da 5 cm" onOdak={tarihce} onDegis={(v) => gunc({ kenarlar: dizi(geo.kenarlar, i, v, "") })} />
            <SayiPil ad={`${kenarAdi(i)} eş kenar işareti`} deger={geo.esKenar[i] ?? 0} secenekler={[0, 1, 2, 3]} onSec={(n) => { tarihce(); gunc({ esKenar: dizi(geo.esKenar, i, n, 0) }); }} />
          </div>
        ))}
      </DigerAyarlar>
    </div>
  );
}

function KatiPaneli({ geo, yaz, tarihce }: { geo: Extract<GeometriVerisi, { tur: "kati" }>; yaz: (g: GeometriVerisi) => void; tarihce: () => void }) {
  const gunc = (yama: Partial<typeof geo>) => yaz({ ...geo, ...yama });
  const tur = KATI_TURLERI.find((t) => t.id === geo.cisim)!;
  const cokyuzlu = ["kup", "prizma", "ucgenPrizma", "piramit"].includes(geo.cisim);
  const kosegenler = geo.cisim === "kup" || geo.cisim === "prizma"
    ? ([["yok", "Yok"], ["cisim", "Cisim köşegeni (AG)"], ["yuzey", "Yüzey köşegeni (AF)"]] as const)
    : geo.cisim === "piramit" ? ([["yok", "Yok"], ["cisim", "Yükseklik (kesikli)"], ["yuzey", "Taban köşegenleri"]] as const) : null;
  return (
    <div className="flex flex-col gap-1.5" data-testid="geo-kati">
      <SablonSirasi ad="Hazır cisim" sablonlar={KATI_SABLONLARI} onSec={(i) => { tarihce(); yaz(KATI_SABLONLARI[i].olustur()); }} />
      <Secenekler baslik="Cisim" deger={geo.cisim} secenekler={KATI_TURLERI.map((t) => [t.id, t.ad] as const)} onSec={(c) => { tarihce(); yaz(varsayilanKati({ cisim: c, gizliKesik: geo.gizliKesik })); }} />
      <div className="flex flex-wrap items-center gap-2">
        {tur.olcuAdlari.map((ad, i) => (
          <OndalikGirdisi key={`${tur.id}${i}`} etiket={ad} deger={geo.olcu[i]} onOdak={tarihce} onDegis={(v) => v !== undefined && v > 0 && v <= 1000 && gunc({ olcu: dizi(geo.olcu, i, v, 1) })} />
        ))}
        <TogglePill aktif={geo.gizliKesik} onClick={() => { tarihce(); gunc({ gizliKesik: !geo.gizliKesik }); }}>Arka ayrıtlar kesikli</TogglePill>
      </div>
      {kosegenler && <Secenekler baslik="Köşegen" deger={geo.kosegen} secenekler={kosegenler} onSec={(k) => { tarihce(); gunc({ kosegen: k }); }} />}
      <DigerAyarlar>
        <div className="flex flex-wrap items-center gap-2">
          {tur.etiketler.map((_, i) => (
            <MetinGirdisi key={`e${i}`} etiket={`${i < tur.olcuAdlari.length ? tur.olcuAdlari[i] : geo.cisim === "koni" ? "Ana doğru" : "Yan ayrıt"} etiketi`} deger={geo.etiketler[i] ?? ""} genislik="w-12" enCok={10} onOdak={tarihce} onDegis={(v) => gunc({ etiketler: dizi(geo.etiketler, i, v, "") })} />
          ))}
          <TogglePill aktif={geo.koseAdlari} onClick={() => { tarihce(); gunc({ koseAdlari: !geo.koseAdlari }); }}>{cokyuzlu ? "Köşe adları" : "Merkez / tepe adları"}</TogglePill>
        </div>
        {geo.koseAdlari && (
          <MetinGirdisi etiket="Adlar (virgülle)" deger={geo.adlar.join(", ")} genislik="w-56" enCok={60} onOdak={tarihce}
            onDegis={(v) => gunc({ adlar: v.split(",").map((t) => t.trim().slice(0, 6)).slice(0, 8) })} />
        )}
      </DigerAyarlar>
    </div>
  );
}

const KATLAMA_MODLARI = [["iki", "İki köşeden"], ["nokta", "Köşe + kenardaki nokta"], ["getir", "Köşeyi bir noktaya getir"]] as const;

function KatlamaPaneli({ geo, yaz, tarihce }: { geo: Extract<GeometriVerisi, { tur: "katlama" }>; yaz: (g: GeometriVerisi) => void; tarihce: () => void }) {
  const gunc = (yama: Partial<typeof geo>) => yaz({ ...geo, ...yama });
  const kos = kagitKoseleri(geo.kagit);
  const adlar = kos.map((k) => k.ad);
  const kenarlar = kagitKenarlari(kos);
  const katYaz = (i: number, yama: Partial<KatlamaAdimi>) => gunc({ katlar: geo.katlar.map((k, j) => (j === i ? katDuzelt({ ...k, ...yama }, kos) : k)) });
  const kagitYaz = (yama: Partial<KatlamaKagidi>) => {
    const kagit = { ...geo.kagit, ...yama };
    const yeniKos = kagitKoseleri(kagit);
    gunc({ kagit, katlar: geo.katlar.map((k) => katDuzelt(k, yeniKos)) });
  };
  const olcu = (ad: string, alan: "w" | "h" | "a" | "p" | "q") => (
    <OndalikGirdisi key={alan} etiket={ad} deger={geo.kagit[alan]} onOdak={tarihce} onDegis={(v) => v !== undefined && v >= 2 && v <= 60 && kagitYaz({ [alan]: v })} />
  );
  return (
    <div className="flex flex-col gap-1.5" data-testid="geo-katlama">
      <SablonSirasi ad="Hazır katlama" sablonlar={KATLAMA_SABLONLARI} onSec={(i) => { tarihce(); yaz(KATLAMA_SABLONLARI[i].olustur()); }} />
      <Secenekler baslik="Kağıt" deger={geo.kagit.tur} secenekler={[["dikdortgen", "Dikdörtgen"], ["kare", "Kare"], ["dikucgen", "Dik üçgen"]] as const} onSec={(t) => { tarihce(); kagitYaz({ tur: t }); }} />
      <div className="flex flex-wrap items-center gap-2">
        {geo.kagit.tur === "dikdortgen" ? [olcu("|AB| (genişlik)", "w"), olcu("|BC| (yükseklik)", "h")]
          : geo.kagit.tur === "kare" ? [olcu("Kenar", "a")] : [olcu("|AB| (dik kenar)", "q"), olcu("|BC| (dik kenar)", "p")]}
      </div>
      {geo.katlar.map((kt, i) => {
        const e = kenarlar.find((x) => x.ad === kt.kenar);
        const sec = (l: string[]) => l.map((a) => ({ id: a, ad: a }));
        return (
          <div key={i} className="flex flex-col gap-1 rounded-md border border-slate-200 p-1.5" data-testid={`katlama-${i + 1}`}>
            <div className="flex items-center gap-2">
              <span className={BASLIK}>{i + 1}. katlama</span>
              {i > 0 && (
                <button type="button" onClick={() => { tarihce(); gunc({ katlar: geo.katlar.filter((_, j) => j !== i) }); }} className="text-[10px] font-semibold text-red-600 hover:underline">Sil</button>
              )}
            </div>
            <Secenekler baslik="Nasıl" deger={kt.mod} secenekler={KATLAMA_MODLARI} onSec={(m) => { tarihce(); katYaz(i, { mod: m }); }} />
            <div className="flex flex-wrap items-center gap-2">
              {kt.mod === "iki" && <>
                <SecimKutusu etiket="Çizginin 1. ucu" deger={kt.k1} secenekler={sec(adlar)} onSec={(v) => { tarihce(); katYaz(i, { k1: v }); }} />
                <SecimKutusu etiket="2. ucu" deger={kt.k2} secenekler={sec(adlar.filter((a) => a !== kt.k1))} onSec={(v) => { tarihce(); katYaz(i, { k2: v }); }} />
                <SecimKutusu etiket="Katlanan köşe" deger={kt.hareketli} secenekler={sec(adlar.filter((a) => a !== kt.k1 && a !== kt.k2))} onSec={(v) => { tarihce(); katYaz(i, { hareketli: v }); }} />
              </>}
              {kt.mod === "nokta" && <>
                <SecimKutusu etiket="Köşe" deger={kt.kose} secenekler={sec(adlar)} onSec={(v) => { tarihce(); katYaz(i, { kose: v }); }} />
                <SecimKutusu etiket="Kenar" deger={kt.kenar} secenekler={kenarlar.filter((x) => !x.ad.includes(kt.kose)).map((x) => ({ id: x.ad, ad: `[${x.ad}]` }))} onSec={(v) => { tarihce(); katYaz(i, { kenar: v }); }} />
                <OndalikGirdisi etiket={`Nokta ${e?.ad[0] ?? ""}'den uzaklık (1–${Math.max(1, Math.round(e?.uz ?? 2) - 1)})`} deger={kt.uz} onOdak={tarihce} onDegis={(v) => v !== undefined && katYaz(i, { uz: v })} />
                <SecimKutusu etiket="Katlanan köşe" deger={kt.hareketli} secenekler={sec(adlar.filter((a) => a !== kt.kose))} onSec={(v) => { tarihce(); katYaz(i, { hareketli: v }); }} />
              </>}
              {kt.mod === "getir" && <>
                <SecimKutusu etiket="Katlanan köşe" deger={kt.hareketli} secenekler={sec(adlar)} onSec={(v) => { tarihce(); katYaz(i, { hareketli: v }); }} />
                <SecimKutusu etiket="Nereye" deger={kt.hedef} secenekler={[{ id: "O", ad: "Merkez (O)" }, ...adlar.filter((a) => a !== kt.hareketli).map((a) => ({ id: a, ad: `${a} köşesi` }))]} onSec={(v) => { tarihce(); katYaz(i, { hedef: v }); }} />
              </>}
            </div>
          </div>
        );
      })}
      {geo.katlar.length < 2 && (
        <button
          type="button"
          onClick={() => { tarihce(); gunc({ katlar: [...geo.katlar, katDuzelt({ mod: "getir", k1: "A", k2: "C", hareketli: kos.length === 4 ? "D" : "C", kose: "A", kenar: "BC", uz: 2, hedef: "O" }, kos)] }); }}
          className="self-start rounded-md border border-brand-300 bg-white px-2 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-50"
        >
          + İkinci katlama
        </button>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        <TogglePill aktif={geo.sekil1} onClick={() => { tarihce(); gunc({ sekil1: !geo.sekil1 }); }}>Şekil I (katlamadan önce) yanında</TogglePill>
        <TogglePill aktif={geo.eski} onClick={() => { tarihce(); gunc({ eski: !geo.eski }); }}>Eski konum kesikli</TogglePill>
        <Secenekler baslik="Katlanan parça" deger={geo.dolgu} secenekler={[["mavi", "Açık mavi"], ["gri", "Gri"], ["tarali", "Taralı (siyah-beyaz)"]] as const} onSec={(d) => { tarihce(); gunc({ dolgu: d }); }} />
      </div>
      <DigerAyarlar ad="Diğer ayarlar">
        <div className="flex flex-wrap items-center gap-1.5">
          <TogglePill aktif={geo.ok} onClick={() => { tarihce(); gunc({ ok: !geo.ok }); }}>Katlama oku</TogglePill>
          <TogglePill aktif={geo.olcu} onClick={() => { tarihce(); gunc({ olcu: !geo.olcu }); }}>Kenar uzunlukları</TogglePill>
          <TogglePill aktif={geo.baslik} onClick={() => { tarihce(); gunc({ baslik: !geo.baslik }); }}>“Şekil I / Şekil II” yazısı</TogglePill>
        </div>
        <span className={IPUCU}>Katlanan köşeler üslü adla (B′), katlanan kenarın kağıt kenarını kestiği yeni noktalar sıradaki harfle (E, F…) otomatik adlanır. Ok ve uzunluklar Şekil I'de gösterilir.</span>
      </DigerAyarlar>
    </div>
  );
}

function EnerjiPaneli({ ek, ekYaz, tarihce }: { ek: FizikEk; ekYaz: (y: Partial<FizikEk>) => void; tarihce: () => void }) {
  const duzeyMetni = ek.metin ?? ENERJI_VARSAYILAN_DUZEYLER;
  const gecisMetni = ek.metin2 ?? ENERJI_VARSAYILAN_GECISLER;
  const d = enerjiDuzeyleriOku(duzeyMetni);
  const g = "duzeyler" in d ? enerjiGecisleriOku(gecisMetni, d.duzeyler.length) : null;
  const hata = "hata" in d ? d.hata : g && "hata" in g ? g.hata : null;
  return (
    <div className="flex flex-col gap-1.5" data-testid="enerji-paneli">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={BASLIK}>Hazır</span>
        <button
          type="button"
          onClick={() => { tarihce(); ekYaz({ metin: ENERJI_VARSAYILAN_DUZEYLER, metin2: ENERJI_VARSAYILAN_GECISLER, ters: false }); }}
          className="rounded-md border border-brand-300 bg-white px-2 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-50"
        >
          Hidrojen atomu (n = 1–4)
        </button>
        <button
          type="button"
          onClick={() => { tarihce(); ekYaz({ metin: "n=1:0; n=2:10,2; n=3:12,1", metin2: "1>2; 2>3; 3>1", ters: true }); }}
          className="rounded-md border border-brand-300 bg-white px-2 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-50"
        >
          Soğurma + ışıma örneği
        </button>
        <TogglePill aktif={ek.ters === true} onClick={() => { tarihce(); ekYaz({ ters: !ek.ters }); }}>Eşit aralıklı çiz</TogglePill>
      </div>
      {/* v1.2 (M): ; ve : yazımı yerine görsel mini tablo; metin yazımı katlanır alanda. */}
      <EnerjiTablolari ek={ek} ekYaz={ekYaz} tarihce={tarihce} />
      <span className={`text-[10px] ${hata ? "text-red-600" : "text-slate-500"}`} role={hata ? "alert" : undefined}>
        {hata ?? "Düzeyler yazış sırasıyla 1, 2, 3… numaralanır. Geçiş 3>1 = ışıma (aşağı ok), 1>3 = soğurma (yukarı ok). İsteğe bağlı etiket: 3>2:Hα."}
      </span>
    </div>
  );
}

/** Geometri / fizik ek şekli ise ayar paneli; değilse null. */
export function GeoEkPaneli({ sekil, guncelle, tarihceyeKaydet }: {
  sekil: FizikSekliTipi;
  guncelle: (yama: Partial<FizikSekliTipi>) => void;
  tarihceyeKaydet: () => void;
}) {
  const nesne = sekil.nesne;
  if (!geoPaneliVarMi(nesne)) return null;
  const ek: FizikEk = sekil.ek ?? {};
  const ekYaz = (yama: Partial<FizikEk>) => guncelle({ ek: { ...ek, ...yama } });
  let icerik: React.ReactNode = null;

  if (["ucgenABC", "dikUcgen", "benzerUcgen", "cemberGeo", "cokgenAd", "dogrudaAcilar", "dortgenGeo", "katiCisim", "kagitKatlama"].includes(nesne)) {
    const geo = sekil.geo && geometriVerisiGecerliMi(sekil.geo) && geometriNesneyeUygun(nesne, sekil.geo) ? sekil.geo : varsayilanGeometri(nesne);
    const yaz = (g: GeometriVerisi) => guncelle({ geo: g });
    icerik = geo.tur === "ucgen" ? <UcgenPaneli geo={geo} yaz={yaz} tarihce={tarihceyeKaydet} />
      : geo.tur === "cember" ? <CemberPaneli geo={geo} yaz={yaz} tarihce={tarihceyeKaydet} />
      : geo.tur === "benzer" ? <BenzerPaneli geo={geo} yaz={yaz} tarihce={tarihceyeKaydet} />
      : geo.tur === "dogruAci" ? <DogruAciPaneli geo={geo} yaz={yaz} tarihce={tarihceyeKaydet} />
      : geo.tur === "dortgen" ? <DortgenPaneli geo={geo} yaz={yaz} tarihce={tarihceyeKaydet} />
      : geo.tur === "kati" ? <KatiPaneli geo={geo} yaz={yaz} tarihce={tarihceyeKaydet} />
      : geo.tur === "katlama" ? <KatlamaPaneli geo={geo} yaz={yaz} tarihce={tarihceyeKaydet} />
      : <CokgenPaneli geo={geo} yaz={yaz} tarihce={tarihceyeKaydet} />;
  } else if (nesne === "aciYayi") {
    icerik = (
      <div className="flex flex-wrap items-center gap-2">
        <OndalikGirdisi etiket="Açı (derece)" deger={ek.sayi ?? 60} onOdak={tarihceyeKaydet} onDegis={(v) => v !== undefined && v > 0 && v < 360 && ekYaz({ sayi: v })} />
        <TogglePill aktif={ek.sayi2 === 1} onClick={() => { tarihceyeKaydet(); ekYaz({ sayi2: ek.sayi2 === 1 ? 0 : 1 }); }}>Yalnız yay (kolsuz)</TogglePill>
        <span className="text-[10px] text-slate-500">Etiket boşsa derece yazılır (60°); α, θ yazabilirsiniz.</span>
      </div>
    );
  } else if (nesne === "dikAci") {
    icerik = <TogglePill aktif={ek.sayi2 === 1} onClick={() => { tarihceyeKaydet(); ekYaz({ sayi2: ek.sayi2 === 1 ? 0 : 1 }); }}>Yalnız kare işareti (kolsuz)</TogglePill>;
  } else if (nesne === "esIsaret") {
    icerik = (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={BASLIK}>Tırtık sayısı</span>
        <SayiPil ad="Tırtık sayısı" deger={ek.sayi ?? 1} secenekler={[1, 2, 3]} onSec={(n) => { tarihceyeKaydet(); ekYaz({ sayi: n }); }} />
      </div>
    );
  } else if (nesne === "isinOk") {
    icerik = (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={BASLIK}>Ara ok sayısı</span>
        <SayiPil ad="Ara ok sayısı" deger={ek.sayi ?? 1} secenekler={[0, 1, 2, 3, 4]} onSec={(n) => { tarihceyeKaydet(); ekYaz({ sayi: n }); }} />
        <TogglePill aktif={ek.sayi2 === 1} onClick={() => { tarihceyeKaydet(); ekYaz({ sayi2: ek.sayi2 === 1 ? 0 : 1 }); }}>Uçta da ok</TogglePill>
        <TogglePill aktif={ek.ters === true} onClick={() => { tarihceyeKaydet(); ekYaz({ ters: !ek.ters }); }}>Yönü ters çevir</TogglePill>
        <span className="text-[10px] text-slate-500">Eğik ışın için tutamaçtan döndürün.</span>
      </div>
    );
  } else if (nesne === "halkaAkim") {
    icerik = (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={BASLIK}>Alan çizgisi (her yanda)</span>
        <SayiPil ad="Alan çizgisi sayısı" deger={ek.sayi ?? 2} secenekler={[1, 2, 3]} onSec={(n) => { tarihceyeKaydet(); ekYaz({ sayi: n }); }} />
        <TogglePill aktif={ek.ters === true} onClick={() => { tarihceyeKaydet(); ekYaz({ ters: !ek.ters }); }}>Akım yönünü ters çevir</TogglePill>
      </div>
    );
  } else if (nesne === "solenoid") {
    icerik = (
      <div className="flex flex-wrap items-center gap-2">
        <OndalikGirdisi etiket="Sarım sayısı (3–14)" deger={ek.sayi ?? 6} onOdak={tarihceyeKaydet} onDegis={(v) => v !== undefined && Number.isInteger(v) && v >= 3 && v <= 14 && ekYaz({ sayi: v })} />
        <TogglePill aktif={ek.ters === true} onClick={() => { tarihceyeKaydet(); ekYaz({ ters: !ek.ters }); }}>Alan yönünü ters çevir</TogglePill>
      </div>
    );
  } else if (nesne === "telAlan") {
    icerik = (
      <div className="flex flex-wrap items-center gap-1.5">
        <TogglePill aktif={ek.ters !== true} onClick={() => { tarihceyeKaydet(); ekYaz({ ters: false }); }}>Akım çıkıyor ⊙</TogglePill>
        <TogglePill aktif={ek.ters === true} onClick={() => { tarihceyeKaydet(); ekYaz({ ters: true }); }}>Akım giriyor ⊗</TogglePill>
        <span className={BASLIK}>Çember</span>
        <SayiPil ad="Alan çemberi sayısı" deger={ek.sayi ?? 3} secenekler={[1, 2, 3, 4, 5]} onSec={(n) => { tarihceyeKaydet(); ekYaz({ sayi: n }); }} />
      </div>
    );
  } else if (nesne === "alanNokta") {
    icerik = (
      <div className="flex flex-wrap items-center gap-2">
        <TogglePill aktif={ek.ters !== true} onClick={() => { tarihceyeKaydet(); ekYaz({ ters: false }); }}>Sayfadan çıkan ⊙</TogglePill>
        <TogglePill aktif={ek.ters === true} onClick={() => { tarihceyeKaydet(); ekYaz({ ters: true }); }}>Sayfaya giren ⊗</TogglePill>
        <OndalikGirdisi etiket="Sütun" deger={ek.sayi ?? 5} onOdak={tarihceyeKaydet} onDegis={(v) => v !== undefined && Number.isInteger(v) && v >= 1 && v <= 14 && ekYaz({ sayi: v })} />
        <OndalikGirdisi etiket="Satır" deger={ek.sayi2 ?? 3} onOdak={tarihceyeKaydet} onDegis={(v) => v !== undefined && Number.isInteger(v) && v >= 1 && v <= 10 && ekYaz({ sayi2: v })} />
      </div>
    );
  } else if (nesne === "dalgaGirisim") {
    icerik = (
      <div className="flex flex-wrap items-center gap-2">
        <OndalikGirdisi etiket="Dalga boyu (px)" deger={ek.sayi ?? 20} onOdak={tarihceyeKaydet} onDegis={(v) => v !== undefined && v >= 8 && v <= 60 && ekYaz({ sayi: v })} />
        <OndalikGirdisi etiket="Kaynak aralığı (px)" deger={ek.sayi2 ?? Math.round(sekil.h * 0.4)} onOdak={tarihceyeKaydet} onDegis={(v) => v !== undefined && v >= 24 && v <= 400 && ekYaz({ sayi2: v })} />
        <TogglePill aktif={ek.ters === true} onClick={() => { tarihceyeKaydet(); ekYaz({ ters: !ek.ters }); }}>Sönüm (düğüm) çizgileri</TogglePill>
      </div>
    );
  } else if (nesne === "enerjiDuzeyi") {
    icerik = <EnerjiPaneli ek={ek} ekYaz={ekYaz} tarihce={tarihceyeKaydet} />;
  }
  return (
    <div className="mt-2 rounded-lg border border-brand-100 bg-white/70 p-2" data-testid="geo-ek-paneli">
      {icerik}
    </div>
  );
}

// Dışa: varsayılanlar (testler ve panel için)
export { varsayilanBenzer, varsayilanCember, varsayilanCokgen, varsayilanUcgen };
