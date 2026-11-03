// Geometri ve fizik ek şekillerinin paneli: köşe adlı üçgen, çember, benzer üçgenler, çokgen,
// açı yayı, dik açı, eş kenar işareti; ışın ok, halka akım, solenoid, düz tel alanı, ⊗/⊙ alanı,
// girişim deseni, enerji düzeyi. Çizim kodu `cizim/geometriSekilleri.ts` ve `cizim/fizikEk.ts`'te.
//
// `FizikSecimPaneli` seçili şekil bunlardan biriyse bu paneli etiket satırının altına koyar.

import { useState } from "react";

import {
  BENZER_SABLONLARI,
  CEMBER_SABLONLARI,
  COKGEN_SABLONLARI,
  UCGEN_SABLONLARI,
  geometriVerisiGecerliMi,
  ucgenKoseleri,
  ucgenOlculeri,
  varsayilanBenzer,
  varsayilanCember,
  varsayilanCokgen,
  varsayilanGeometri,
  varsayilanUcgen,
} from "../cizim/geometriSekilleri";
import {
  ENERJI_VARSAYILAN_DUZEYLER,
  ENERJI_VARSAYILAN_GECISLER,
  enerjiDuzeyleriOku,
  enerjiGecisleriOku,
} from "../cizim/fizikEk";
import type { FizikEk, GeoAciIsareti, GeometriVerisi, Sekil } from "../cizim/tipler";
import { MetinGirdisi, OndalikGirdisi } from "./GrafikPaneli";
import { TogglePill } from "./ModalParcalari";

type FizikSekliTipi = Extract<Sekil, { tur: "fizik" }>;

const BASLIK = "text-[10px] font-bold uppercase tracking-wide text-slate-500";
const SATIR = "mt-2 flex flex-wrap items-center gap-1.5";

export const GEO_PANELLI_NESNELER = [
  "ucgenABC", "dikUcgen", "benzerUcgen", "cemberGeo", "cokgenAd",
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

function SablonSirasi({ sablonlar, onSec, ad }: { sablonlar: { id: string; ad: string; ipucu: string }[]; onSec: (i: number) => void; ad: string }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={BASLIK}>{ad}</span>
      {sablonlar.map((sb, i) => (
        <button
          key={sb.id}
          type="button"
          title={sb.ipucu}
          aria-label={`${ad}: ${sb.ad}`}
          onClick={() => onSec(i)}
          className="rounded-md border border-brand-300 bg-white px-2 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-50"
        >
          {sb.ad}
        </button>
      ))}
    </div>
  );
}

const ACI_ISARETLERI: { id: GeoAciIsareti; ad: string }[] = [{ id: "yok", ad: "Yok" }, { id: "yay", ad: "Yay" }, { id: "dik", ad: "Dik açı" }];

function UcgenPaneli({ geo, yaz, tarihce }: { geo: Extract<GeometriVerisi, { tur: "ucgen" }>; yaz: (g: GeometriVerisi) => void; tarihce: () => void }) {
  const koseler = ucgenKoseleri(geo);
  const olcu = koseler ? ucgenOlculeri(koseler) : null;
  const gunc = (yama: Partial<typeof geo>) => yaz({ ...geo, ...yama });
  const dizi = <T,>(d: T[], i: number, v: T) => d.map((x, j) => (j === i ? v : x));
  const f = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");
  const olcuAdlari = geo.mod === "kenar" ? ["a (BC)", "b (CA)", "c (AB)"] : ["b (CA)", "c (AB)", "A açısı °"];
  return (
    <div className="flex flex-col gap-1.5" data-testid="geo-ucgen">
      <SablonSirasi ad="Hazır üçgen" sablonlar={UCGEN_SABLONLARI} onSec={(i) => { tarihce(); yaz(UCGEN_SABLONLARI[i].olustur()); }} />
      <div className={SATIR.replace("mt-2 ", "")}>
        <span className={BASLIK}>Çizim</span>
        {([["kenar", "Kenar uzunlukları (a, b, c)"], ["aci", "İki kenar + aradaki açı"], ["serbest", "Köşe konumları"]] as const).map(([id, ad]) => (
          <TogglePill
            key={id}
            aktif={geo.mod === id}
            onClick={() => { tarihce(); gunc({ mod: id, olcu: id === "aci" && geo.mod !== "aci" ? [5, 4, 60] : id === "kenar" && geo.mod !== "kenar" ? [6, 5, 4] : geo.olcu }); }}
          >
            {ad}
          </TogglePill>
        ))}
      </div>
      {geo.mod !== "serbest" ? (
        <div className="flex flex-wrap items-center gap-2">
          {olcuAdlari.map((ad, i) => (
            <OndalikGirdisi key={ad} etiket={ad} deger={geo.olcu[i]} onOdak={tarihce} onDegis={(v) => v !== undefined && gunc({ olcu: dizi(geo.olcu, i, v) })} />
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {geo.kose.map((p, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              <OndalikGirdisi etiket={`${geo.adlar[i] || "ABC"[i]} x (0–1)`} deger={p.x} onOdak={tarihce} onDegis={(v) => v !== undefined && gunc({ kose: geo.kose.map((q, j) => (j === i ? { ...q, x: Math.max(0, Math.min(1, v)) } : q)) })} />
              <OndalikGirdisi etiket={`${geo.adlar[i] || "ABC"[i]} y (0–1)`} deger={p.y} onOdak={tarihce} onDegis={(v) => v !== undefined && gunc({ kose: geo.kose.map((q, j) => (j === i ? { ...q, y: Math.max(0, Math.min(1, v)) } : q)) })} />
            </span>
          ))}
        </div>
      )}
      {!koseler && <span className="text-[10px] text-red-600" role="alert">Bu ölçülerle üçgen kurulamaz (üçgen eşitsizliği ya da açı 0–180° dışında).</span>}
      {olcu && (
        <span className="text-[10px] text-slate-500" data-testid="geo-ucgen-olcu">
          Kenarlar a={f(olcu.kenar[0])}, b={f(olcu.kenar[1])}, c={f(olcu.kenar[2])} · açılar A={f(olcu.aci[0])}°, B={f(olcu.aci[1])}°, C={f(olcu.aci[2])}°
        </span>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {[0, 1, 2].map((i) => (
          <MetinGirdisi key={`ad${i}`} etiket={`Köşe ${i + 1} adı`} deger={geo.adlar[i] ?? ""} genislik="w-12" enCok={6} onOdak={tarihce} onDegis={(v) => gunc({ adlar: dizi(geo.adlar, i, v) })} />
        ))}
        {[0, 1, 2].map((i) => (
          <MetinGirdisi key={`k${i}`} etiket={`${"abc"[i]} kenarı`} deger={geo.kenarlar[i] ?? ""} genislik="w-16" enCok={12} yerTutucu={`${"abc"[i]} ya da 5 cm`} onOdak={tarihce} onDegis={(v) => gunc({ kenarlar: dizi(geo.kenarlar, i, v) })} />
        ))}
      </div>
      {[0, 1, 2].map((i) => (
        <div key={`a${i}`} className="flex flex-wrap items-center gap-1.5">
          <span className={BASLIK}>{geo.adlar[i] || "ABC"[i]} köşesi</span>
          {ACI_ISARETLERI.map((a) => (
            <TogglePill key={a.id} aktif={geo.aciIsareti[i] === a.id} onClick={() => { tarihce(); gunc({ aciIsareti: dizi(geo.aciIsareti, i, a.id) }); }}>
              <span aria-label={`${"ABC"[i]} köşesi açı işareti: ${a.ad}`}>{a.ad}</span>
            </TogglePill>
          ))}
          <MetinGirdisi etiket={`${"ABC"[i]} açı etiketi`} deger={geo.acilar[i] ?? ""} genislik="w-14" enCok={12} yerTutucu="60° ya da α" onOdak={tarihce} onDegis={(v) => gunc({ acilar: dizi(geo.acilar, i, v) })} />
          <span className="text-[10px] text-slate-500">Eş açı yayı</span>
          <SayiPil ad={`${"ABC"[i]} eş açı yayı`} deger={geo.esAci[i] ?? 0} secenekler={[0, 1, 2, 3]} onSec={(n) => { tarihce(); gunc({ esAci: dizi(geo.esAci, i, n) }); }} />
          <span className="text-[10px] text-slate-500">· {"abc"[i]} kenarında eş kenar işareti</span>
          <SayiPil ad={`${"abc"[i]} eş kenar işareti`} deger={geo.esKenar[i] ?? 0} secenekler={[0, 1, 2, 3]} onSec={(n) => { tarihce(); gunc({ esKenar: dizi(geo.esKenar, i, n) }); }} />
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={BASLIK}>Yükseklik</span>
        {(["yok", "A", "B", "C"] as const).map((k) => (
          <TogglePill key={k} aktif={geo.yukseklik === k} onClick={() => { tarihce(); gunc({ yukseklik: k }); }}>
            <span aria-label={`Yükseklik: ${k}`}>{k === "yok" ? "Yok" : `${geo.adlar["ABC".indexOf(k)] || k} köşesinden`}</span>
          </TogglePill>
        ))}
        <MetinGirdisi etiket="Yükseklik adı" deger={geo.yukseklikEtiket} genislik="w-12" enCok={6} onOdak={tarihce} onDegis={(v) => gunc({ yukseklikEtiket: v })} />
        <MetinGirdisi etiket="Ayak noktası adı" deger={geo.ayakAdi} genislik="w-12" enCok={6} onOdak={tarihce} onDegis={(v) => gunc({ ayakAdi: v })} />
      </div>
    </div>
  );
}

function CemberPaneli({ geo, yaz, tarihce }: { geo: Extract<GeometriVerisi, { tur: "cember" }>; yaz: (g: GeometriVerisi) => void; tarihce: () => void }) {
  const gunc = (yama: Partial<typeof geo>) => yaz({ ...geo, ...yama });
  const dizi = <T,>(d: T[], i: number, v: T) => Array.from({ length: Math.max(d.length, i + 1) }, (_, j) => (j === i ? v : d[j] ?? "" as unknown as T));
  const secenekler: [keyof typeof geo, string][] = [["merkez", "Merkez O"], ["yaricap", "Yarıçap OA"], ["kiris", "Kiriş AB"], ["cap", "Çap"], ["merkezAci", "Merkez açı AOB"], ["cevreAci", "Çevre açı ACB"], ["teget", "Teğet (T)"]];
  return (
    <div className="flex flex-col gap-1.5" data-testid="geo-cember">
      <SablonSirasi ad="Hazır çember" sablonlar={CEMBER_SABLONLARI} onSec={(i) => { tarihce(); yaz(CEMBER_SABLONLARI[i].olustur()); }} />
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={BASLIK}>Çiz</span>
        {secenekler.map(([alan, ad]) => (
          <TogglePill key={alan} aktif={geo[alan] === true} onClick={() => { tarihce(); gunc({ [alan]: !geo[alan] } as Partial<typeof geo>); }}>{ad}</TogglePill>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {["Merkez", "A", "B", "C", "T"].map((ad, i) => (
          <MetinGirdisi key={ad} etiket={`${ad} adı`} deger={geo.adlar[i] ?? ""} genislik="w-12" enCok={6} onOdak={tarihce} onDegis={(v) => gunc({ adlar: dizi(geo.adlar, i, v) as string[] })} />
        ))}
        {["A", "B", "C", "T"].map((ad, i) => (
          <OndalikGirdisi key={ad} etiket={`${ad} konumu °`} deger={geo.konum[i]} onOdak={tarihce} onDegis={(v) => v !== undefined && gunc({ konum: geo.konum.map((q, j) => (j === i ? v : q)) })} />
        ))}
        <MetinGirdisi etiket="Merkez açı etiketi" deger={geo.merkezAciEtiket} genislik="w-14" enCok={12} onOdak={tarihce} onDegis={(v) => gunc({ merkezAciEtiket: v })} />
        <MetinGirdisi etiket="Çevre açı etiketi" deger={geo.cevreAciEtiket} genislik="w-14" enCok={12} onOdak={tarihce} onDegis={(v) => gunc({ cevreAciEtiket: v })} />
      </div>
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
      <MetinGirdisi etiket="Düzeyler (ad:eV)" deger={duzeyMetni} genislik="w-96" enCok={300} yerTutucu="n=1:-13,6; n=2:-3,4" onOdak={tarihce} onDegis={(v) => ekYaz({ metin: v })} />
      <MetinGirdisi etiket="Geçişler (üst>alt)" deger={gecisMetni} genislik="w-72" enCok={200} yerTutucu="3>1; 3>2:Hα" onOdak={tarihce} onDegis={(v) => ekYaz({ metin2: v })} />
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

  if (["ucgenABC", "dikUcgen", "benzerUcgen", "cemberGeo", "cokgenAd"].includes(nesne)) {
    const geo = sekil.geo && geometriVerisiGecerliMi(sekil.geo) ? sekil.geo : varsayilanGeometri(nesne);
    const yaz = (g: GeometriVerisi) => guncelle({ geo: g });
    icerik = geo.tur === "ucgen" ? <UcgenPaneli geo={geo} yaz={yaz} tarihce={tarihceyeKaydet} />
      : geo.tur === "cember" ? <CemberPaneli geo={geo} yaz={yaz} tarihce={tarihceyeKaydet} />
      : geo.tur === "benzer" ? <BenzerPaneli geo={geo} yaz={yaz} tarihce={tarihceyeKaydet} />
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
