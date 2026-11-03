// Fizik grafiği paneli: şablon seç, eğriyi (hareket evreleri / noktalar / sinüs)
// düzenle, eksenleri ayarla. Veri `cizim/grafik.ts`'te; burada yalnız arayüz.
//
// İLKE: boş ekrandan başlanmaz. Şablon tek tıkla hazır grafik getirir; asıl iş
// sayıları değiştirmek (süre, ivme, genlik…). Hareket evreleri yazıldığında
// konum, hız ve ivme grafiği AYNI evrelerden çıktığı için birbirini tutar.

import { useEffect, useRef, useState } from "react";

import {
  GRAFIK_BUYUKLUK_ADLARI,
  GRAFIK_CIZGI_DESENLERI,
  egriCizgiDeseni,
  grafikCiz,
  GRAFIK_SABLONLARI,
  buyuklukEtiketi,
  adliNoktalariOku,
  adliNoktalariYaz,
  dogrusalRegresyon,
  grafikVerisiGecerliMi,
  hareketOzeti,
  noktalardanEvreler,
  ayniXUyarisi,
  EN_COK_IFADE,
  HAREKET_SINIRI,
  noktalariOku,
  noktalariOkuAyrinti,
  noktalariYaz,
  sayiYaz,
  tegetDogrusu,
  varsayilanEgri,
  varsayilanGrafik,
} from "../cizim/grafik";
import { denklemOku, esitsizlikOku, fonksiyonOku } from "../cizim/ifade";
import type { GrafikBuyuklugu, GrafikCizgiDeseni, GrafikEgrisi, GrafikVerisi, Nokta, Sekil } from "../cizim/tipler";
import { RenkSecici } from "./FizikPaneli";
import { TogglePill } from "./ModalParcalari";

type FizikSekliTipi = Extract<Sekil, { tur: "fizik" }>;

const BUYUKLUKLER: GrafikBuyuklugu[] = ["konum", "hiz", "ivme"];
const TUR_ADLARI: { tur: GrafikEgrisi["tur"]; ad: string }[] = [
  { tur: "hareket", ad: "Hareket evreleri" },
  { tur: "noktalar", ad: "Noktalar" },
  { tur: "sinus", ad: "Sinüs / Kosinüs" },
  { tur: "fonksiyon", ad: "Fonksiyon y=f(x)" },
  { tur: "bolge", ad: "Eşitsizlik bölgesi" },
  { tur: "denklem", ad: "Denklem (çember, elips…)" },
  { tur: "arasi", ad: "İki eğri arası alan" },
  { tur: "teget", ad: "Teğet doğrusu" },
  { tur: "isaret", ad: "Adlı noktalar" },
];

const egriAdi = (e: GrafikEgrisi) =>
  e.tur === "hareket" ? GRAFIK_BUYUKLUK_ADLARI[e.buyukluk]
  : e.tur === "sinus" ? (e.fonksiyon === "sin" ? "Sinüs" : "Kosinüs")
  : e.tur === "fonksiyon" ? `y=${e.ifade.replace(/^\s*(y|f\(x\))\s*=\s*/i, "")}`.slice(0, 14)
  : e.tur === "bolge" ? e.ifade.slice(0, 14)
  : e.tur === "denklem" ? e.ifade.slice(0, 14)
  : e.tur === "arasi" ? "Alan"
  : e.tur === "teget" ? `Teğet x=${e.x0}`
  : e.tur === "isaret" ? "Noktalar (ad)"
  : "Noktalar";

/** Boş bırakılabilen ondalık sayı kutusu (virgül ya da nokta). Yazarken bozulmaz. */
export function OndalikGirdisi({ etiket, deger, onDegis, onOdak, bos, genis }: {
  etiket: string;
  deger: number | undefined;
  onDegis: (v: number | undefined) => void;
  onOdak?: () => void;
  /** Verilirse kutu boş bırakılabilir (otomatik) ve ipucu olarak gösterilir. */
  bos?: string;
  genis?: boolean;
}) {
  const [metin, setMetin] = useState(deger === undefined ? "" : String(deger).replace(".", ","));
  const odakta = useRef(false);
  useEffect(() => {
    if (odakta.current) return;
    setMetin(deger === undefined ? "" : String(Math.round(deger * 1e6) / 1e6).replace(".", ","));
  }, [deger]);
  return (
    <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
      {etiket}
      <input
        aria-label={etiket}
        inputMode="decimal"
        value={metin}
        placeholder={bos}
        onFocus={() => { odakta.current = true; onOdak?.(); }}
        onBlur={() => { odakta.current = false; setMetin(deger === undefined ? "" : String(Math.round(deger * 1e6) / 1e6).replace(".", ",")); }}
        onChange={(e) => {
          const ham = e.target.value;
          setMetin(ham);
          const t = ham.trim();
          if (!t) { if (bos !== undefined) onDegis(undefined); return; }
          const n = Number(t.replace(",", ".").replace("−", "-"));
          if (Number.isFinite(n)) onDegis(n);
        }}
        className={`${genis ? "w-20" : "w-16"} rounded-md border border-slate-300 bg-white px-1.5 py-1 text-[11px]`}
      />
    </label>
  );
}

/** Başlık/ad kutusu: varsayılan en çok 80 karakter (ad alanlarında 40 verilir); uzun metin şekli taşırır. */
export function MetinGirdisi({ etiket, deger, onDegis, onOdak, yerTutucu, genislik = "w-28", enCok = 80 }: {
  etiket: string; deger: string; onDegis: (v: string) => void; onOdak: () => void; yerTutucu?: string; genislik?: string; enCok?: number;
}) {
  return (
    <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
      {etiket}
      <input
        aria-label={etiket}
        value={deger}
        maxLength={enCok}
        placeholder={yerTutucu}
        onFocus={onOdak}
        onChange={(e) => onDegis(e.target.value)}
        className={`${genislik} rounded-md border border-slate-300 bg-white px-1.5 py-1 text-[11px]`}
      />
    </label>
  );
}

const BASLIK = "text-[10px] font-bold uppercase tracking-wide text-slate-500";

function NoktaListesi({ egri, yaz, tarihceyeKaydet, onUcluEkle }: {
  egri: Extract<GrafikEgrisi, { tur: "noktalar" }>;
  yaz: (yama: Partial<GrafikEgrisi>) => void;
  tarihceyeKaydet: () => void;
  onUcluEkle?: (x0: number, v0: number, evreler: { sure: number; ivme: number }[]) => void;
}) {
  const evre = noktalardanEvreler(egri.noktalar);
  const [metin, setMetin] = useState(() => noktalariYaz(egri.noktalar));
  const odakta = useRef(false);
  const dis = noktalariYaz(egri.noktalar);
  useEffect(() => {
    if (!odakta.current) setMetin(dis);
  }, [dis]);
  const ayrinti = noktalariOkuAyrinti(metin);
  const okunan = "noktalar" in ayrinti ? ayrinti.noktalar : null;
  const ayniX = okunan ? ayniXUyarisi(okunan) : null;
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <label className="flex flex-wrap items-center gap-1 text-[11px] font-semibold text-slate-600">
        Noktalar (x,y)
        <input
          aria-label="Grafik noktaları"
          value={metin}
          onFocus={() => { odakta.current = true; tarihceyeKaydet(); }}
          onBlur={() => { odakta.current = false; setMetin(dis); }}
          onChange={(e) => {
            setMetin(e.target.value);
            const n = noktalariOku(e.target.value);
            if (n) yaz({ noktalar: n } as Partial<GrafikEgrisi>);
          }}
          placeholder="0,0; 4,20; 8,20; 10,0"
          className={`w-full min-w-0 flex-1 rounded-md border bg-white px-2 py-1 font-mono text-[11px] ${okunan ? "border-slate-300" : "border-red-400"}`}
        />
      </label>
      <span className={`text-[10px] ${okunan ? "text-slate-500" : "text-red-600"}`}>
        {okunan
          ? "Her nokta x,y — noktalar ; ile ayrılır. Çizgi noktaları sırayla birleştirir."
          : `Okunamadı: ${"hata" in ayrinti ? ayrinti.hata : ""} (ör. 0,0; 4,20; 8,20)`}
      </span>
      {ayniX && <span className="text-[10px] text-amber-700" data-testid="grafik-ayni-x">{ayniX}</span>}
      {onUcluEkle && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!evre}
            onClick={() => evre && onUcluEkle(0, evre.v0, evre.evreler)}
            title="Bunu hız–zaman grafiği sayar; aynı hareketin konum (x–t) ve ivme (a–t) grafiğini de ekler"
            className="rounded-md border border-brand-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-40"
          >
            Bunu v–t say: x–t ve a–t grafiğini de üret
          </button>
          {!evre && <span className="text-[10px] text-slate-500">(noktalar t=0'dan başlamalı ve zamanda artmalı)</span>}
        </div>
      )}
    </div>
  );
}

function HareketDuzenleyici({ egri, yaz, tarihceyeKaydet, yEtiketiniGuncelle, onUcluEkle }: {
  egri: Extract<GrafikEgrisi, { tur: "hareket" }>;
  yaz: (yama: Partial<GrafikEgrisi>) => void;
  tarihceyeKaydet: () => void;
  yEtiketiniGuncelle: (b: GrafikBuyuklugu) => void;
  onUcluEkle?: (x0: number, v0: number, evreler: { sure: number; ivme: number }[]) => void;
}) {
  const ozet = hareketOzeti(egri.x0, egri.v0, egri.evreler);
  const [uyari, setUyari] = useState<string | null>(null);
  // Süre/ivme/başlangıç değerleri |değer| ≤ 1e6 aralığına kıstırılır (1e308/∞ grafiği boş bırakıp sınava girmesin).
  const kisit = (v: number | undefined, altSifir = false): number => {
    let n = v ?? 0;
    const lo = altSifir ? 0 : -HAREKET_SINIRI;
    if (n > HAREKET_SINIRI || n < lo) {
      setUyari(`Değer ${altSifir ? "0 ile" : "−1 000 000 ile"} 1 000 000 arasında olmalı; sınıra çekildi`);
      n = Math.min(HAREKET_SINIRI, Math.max(lo, n));
    } else setUyari(null);
    return n;
  };
  const evreYaz = (i: number, yama: Partial<{ sure: number; ivme: number }>) =>
    yaz({ evreler: egri.evreler.map((e, j) => (j === i ? { ...e, ...yama } : e)) } as Partial<GrafikEgrisi>);
  return (
    <div className="flex flex-col gap-2" data-testid="grafik-hareket">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={BASLIK}>Çizilecek</span>
        {BUYUKLUKLER.map((b) => (
          <TogglePill
            key={b}
            aktif={egri.buyukluk === b}
            onClick={() => { tarihceyeKaydet(); yaz({ buyukluk: b } as Partial<GrafikEgrisi>); yEtiketiniGuncelle(b); }}
          >
            {GRAFIK_BUYUKLUK_ADLARI[b]}
          </TogglePill>
        ))}
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <OndalikGirdisi etiket="Başlangıç konumu (m)" deger={egri.x0} onOdak={tarihceyeKaydet} onDegis={(v) => yaz({ x0: kisit(v) } as Partial<GrafikEgrisi>)} />
        <OndalikGirdisi etiket="Başlangıç hızı (m/s)" deger={egri.v0} onOdak={tarihceyeKaydet} onDegis={(v) => yaz({ v0: kisit(v) } as Partial<GrafikEgrisi>)} />
      </div>
      {uyari && <span className="text-[10px] text-red-600" data-testid="grafik-hareket-uyari">{uyari}</span>}
      <div className="flex flex-col gap-1">
        {egri.evreler.map((e, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2" data-testid="grafik-evre">
            <span className="w-14 text-[11px] font-bold text-slate-500">Evre {i + 1}</span>
            <OndalikGirdisi etiket={`Evre ${i + 1} süre (s)`} deger={e.sure} onOdak={tarihceyeKaydet} onDegis={(v) => evreYaz(i, { sure: kisit(v, true) })} />
            <OndalikGirdisi etiket={`Evre ${i + 1} ivme (m/s²)`} deger={e.ivme} onOdak={tarihceyeKaydet} onDegis={(v) => evreYaz(i, { ivme: kisit(v) })} />
            <button
              type="button"
              aria-label={`Evre ${i + 1}'i sil`}
              disabled={egri.evreler.length <= 1}
              onClick={() => { tarihceyeKaydet(); yaz({ evreler: egri.evreler.filter((_, j) => j !== i) } as Partial<GrafikEgrisi>); }}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-40"
            >
              Sil
            </button>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={egri.evreler.length >= 12}
            onClick={() => { tarihceyeKaydet(); yaz({ evreler: [...egri.evreler, { sure: 2, ivme: 0 }] } as Partial<GrafikEgrisi>); }}
            className="rounded-md border border-brand-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-40"
          >
            + Evre ekle
          </button>
          {onUcluEkle && (
            <button
              type="button"
              onClick={() => onUcluEkle(egri.x0, egri.v0, egri.evreler)}
              title="Aynı evrelerden konum, hız ve ivme grafiğini alt alta ekler"
              className="rounded-md border border-brand-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-50"
            >
              x–t, v–t, a–t üçünü birlikte ekle
            </button>
          )}
          <span className="text-[10px] text-slate-500" data-testid="grafik-ozet">
            Toplam {sayiYaz(ozet.toplamSure)} s · son hız {sayiYaz(ozet.sonHiz)} m/s · yer değiştirme {sayiYaz(ozet.yerDegistirme)} m
          </span>
        </div>
      </div>
    </div>
  );
}

function SinusDuzenleyici({ egri, yaz, tarihceyeKaydet }: {
  egri: Extract<GrafikEgrisi, { tur: "sinus" }>;
  yaz: (yama: Partial<GrafikEgrisi>) => void;
  tarihceyeKaydet: () => void;
}) {
  const g = (alan: "genlik" | "periyot" | "faz" | "ofset" | "baslangic" | "bitis") => (v: number | undefined) =>
    yaz({ [alan]: v ?? 0 } as Partial<GrafikEgrisi>);
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="grafik-sinus">
      <span className={BASLIK}>Fonksiyon</span>
      <TogglePill aktif={egri.fonksiyon === "sin"} onClick={() => { tarihceyeKaydet(); yaz({ fonksiyon: "sin" } as Partial<GrafikEgrisi>); }}>sin</TogglePill>
      <TogglePill aktif={egri.fonksiyon === "cos"} onClick={() => { tarihceyeKaydet(); yaz({ fonksiyon: "cos" } as Partial<GrafikEgrisi>); }}>cos</TogglePill>
      <OndalikGirdisi etiket="Genlik A" deger={egri.genlik} onOdak={tarihceyeKaydet} onDegis={g("genlik")} />
      <OndalikGirdisi etiket="Periyot T" deger={egri.periyot} onOdak={tarihceyeKaydet} onDegis={(v) => yaz({ periyot: v && v > 0 ? v : 1 } as Partial<GrafikEgrisi>)} />
      <OndalikGirdisi etiket="Faz (°)" deger={egri.faz} onOdak={tarihceyeKaydet} onDegis={g("faz")} />
      <OndalikGirdisi etiket="Düşey kayma" deger={egri.ofset} onOdak={tarihceyeKaydet} onDegis={g("ofset")} />
      <OndalikGirdisi etiket="Başlangıç" deger={egri.baslangic} onOdak={tarihceyeKaydet} onDegis={g("baslangic")} />
      <OndalikGirdisi etiket="Bitiş" deger={egri.bitis} onOdak={tarihceyeKaydet} onDegis={g("bitis")} />
      <span className="text-[10px] text-slate-500">y = A·{egri.fonksiyon}(2πt/T + faz) + kayma</span>
    </div>
  );
}

function IfadeKutusu({ etiket, deger, onDegis, onOdak, hata, ornek }: {
  etiket: string; deger: string; onDegis: (v: string) => void; onOdak: () => void; hata: string | null; ornek: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <label className="flex flex-wrap items-center gap-1 text-[11px] font-semibold text-slate-600">
        {etiket}
        <input
          aria-label={etiket}
          value={deger}
          maxLength={EN_COK_IFADE}
          placeholder={ornek}
          onFocus={onOdak}
          onChange={(e) => onDegis(e.target.value)}
          className={`w-full min-w-0 flex-1 rounded-md border bg-white px-2 py-1 font-mono text-[11px] ${hata ? "border-red-400" : "border-slate-300"}`}
        />
      </label>
      <span className={`text-[10px] ${hata ? "text-red-600" : "text-slate-500"}`}>
        {hata ?? "x^2 üs, sqrt(x) kök, |x| mutlak değer, sin(x), ln(x), 2^x, pi. Dikey doğru: x=3"}
      </span>
    </div>
  );
}

const UC_ADLARI: { id: "yok" | "dolu" | "bos"; ad: string }[] = [
  { id: "yok", ad: "Düz" }, { id: "dolu", ad: "● Kapalı" }, { id: "bos", ad: "○ Açık" },
];

function FonksiyonDuzenleyici({ egri, yaz, tarihceyeKaydet }: {
  egri: Extract<GrafikEgrisi, { tur: "fonksiyon" }>;
  yaz: (yama: Partial<GrafikEgrisi>) => void;
  tarihceyeKaydet: () => void;
}) {
  const okunan = fonksiyonOku(egri.ifade);
  const hata = "hata" in okunan ? okunan.hata : null;
  return (
    <div className="flex flex-col gap-2" data-testid="grafik-fonksiyon">
      <IfadeKutusu etiket="Fonksiyon" deger={egri.ifade} onOdak={tarihceyeKaydet} ornek="y = x^2 - 4" hata={hata}
        onDegis={(v) => yaz({ ifade: v } as Partial<GrafikEgrisi>)} />
      <div className="flex flex-wrap items-center gap-2">
        <span className={BASLIK}>Parça</span>
        <OndalikGirdisi etiket="x başlangıç" deger={egri.baslangic} bos="oto" onOdak={tarihceyeKaydet} onDegis={(v) => yaz({ baslangic: v } as Partial<GrafikEgrisi>)} />
        <OndalikGirdisi etiket="x bitiş" deger={egri.bitis} bos="oto" onOdak={tarihceyeKaydet} onDegis={(v) => yaz({ bitis: v } as Partial<GrafikEgrisi>)} />
        <span className={BASLIK}>Baş uç</span>
        {UC_ADLARI.map((u) => (
          <TogglePill key={u.id} aktif={(egri.ucBas ?? "yok") === u.id} onClick={() => { tarihceyeKaydet(); yaz({ ucBas: u.id } as Partial<GrafikEgrisi>); }}>{u.ad}</TogglePill>
        ))}
        <span className={BASLIK}>Son uç</span>
        {UC_ADLARI.map((u) => (
          <TogglePill key={u.id} aktif={(egri.ucSon ?? "yok") === u.id} onClick={() => { tarihceyeKaydet(); yaz({ ucSon: u.id } as Partial<GrafikEgrisi>); }}>{u.ad}</TogglePill>
        ))}
      </div>
    </div>
  );
}

function BolgeDuzenleyici({ egri, yaz, tarihceyeKaydet }: {
  egri: Extract<GrafikEgrisi, { tur: "bolge" }>;
  yaz: (yama: Partial<GrafikEgrisi>) => void;
  tarihceyeKaydet: () => void;
}) {
  const okunan = esitsizlikOku(egri.ifade);
  const hata = "hata" in okunan ? okunan.hata : null;
  return (
    <div data-testid="grafik-bolge">
      <IfadeKutusu etiket="Eşitsizlik" deger={egri.ifade} onOdak={tarihceyeKaydet} ornek="y > 2x + 1" hata={hata}
        onDegis={(v) => yaz({ ifade: v } as Partial<GrafikEgrisi>)} />
      <span className="text-[10px] text-slate-500">&lt; ve &gt; kesikli sınır, ≤ ve ≥ (&lt;= &gt;=) düz sınır çizer. Bölge boyanır.</span>
    </div>
  );
}

function DenklemDuzenleyici({ egri, yaz, tarihceyeKaydet }: {
  egri: Extract<GrafikEgrisi, { tur: "denklem" }>;
  yaz: (yama: Partial<GrafikEgrisi>) => void;
  tarihceyeKaydet: () => void;
}) {
  const okunan = denklemOku(egri.ifade);
  const hata = "hata" in okunan ? okunan.hata : null;
  return (
    <div data-testid="grafik-denklem" className="flex flex-col gap-1">
      <IfadeKutusu etiket="Denklem" deger={egri.ifade} onOdak={tarihceyeKaydet} ornek="x^2 + y^2 = 25" hata={hata}
        onDegis={(v) => yaz({ ifade: v } as Partial<GrafikEgrisi>)} />
      <span className="text-[10px] text-slate-500">Çember x^2+y^2=25 · elips x^2/9+y^2/4=1 · hiperbol x^2/9-y^2/4=1 · (x-1)^2+(y+2)^2=4</span>
    </div>
  );
}

function ArasiDuzenleyici({ egri, yaz, tarihceyeKaydet }: {
  egri: Extract<GrafikEgrisi, { tur: "arasi" }>;
  yaz: (yama: Partial<GrafikEgrisi>) => void;
  tarihceyeKaydet: () => void;
}) {
  const f1 = fonksiyonOku(egri.ifade);
  const f2 = egri.ifade2.trim() ? fonksiyonOku(egri.ifade2) : null;
  const h1 = "hata" in f1 ? f1.hata : f1.tur !== "y" ? "y=f(x) yazın" : null;
  const h2 = f2 ? ("hata" in f2 ? f2.hata : f2.tur !== "y" ? "y=f(x) yazın" : null) : null;
  return (
    <div className="flex flex-col gap-2" data-testid="grafik-arasi">
      <div className="flex flex-wrap gap-2">
        <IfadeKutusu etiket="Üst eğri" deger={egri.ifade} onOdak={tarihceyeKaydet} ornek="x^2" hata={h1} onDegis={(v) => yaz({ ifade: v } as Partial<GrafikEgrisi>)} />
        <IfadeKutusu etiket="Alt eğri (boş = x ekseni)" deger={egri.ifade2} onOdak={tarihceyeKaydet} ornek="x" hata={h2} onDegis={(v) => yaz({ ifade2: v } as Partial<GrafikEgrisi>)} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <OndalikGirdisi etiket="x başlangıç" deger={egri.baslangic} bos="oto" onOdak={tarihceyeKaydet} onDegis={(v) => yaz({ baslangic: v } as Partial<GrafikEgrisi>)} />
        <OndalikGirdisi etiket="x bitiş" deger={egri.bitis} bos="oto" onOdak={tarihceyeKaydet} onDegis={(v) => yaz({ bitis: v } as Partial<GrafikEgrisi>)} />
        <span className="text-[10px] text-slate-500">Eğrilerin kendisini ayrıca “Fonksiyon” olarak ekleyin.</span>
      </div>
    </div>
  );
}

function TegetDuzenleyici({ egri, yaz, tarihceyeKaydet }: {
  egri: Extract<GrafikEgrisi, { tur: "teget" }>;
  yaz: (yama: Partial<GrafikEgrisi>) => void;
  tarihceyeKaydet: () => void;
}) {
  const f = fonksiyonOku(egri.ifade);
  const hata = "hata" in f ? f.hata : f.tur !== "y" ? "y=f(x) yazın" : null;
  const t = tegetDogrusu(egri);
  const sayi = (v: number) => String(Math.round(v * 1000) / 1000).replace(".", ",");
  return (
    <div className="flex flex-col gap-2" data-testid="grafik-teget">
      <IfadeKutusu etiket="Teğet alınacak fonksiyon" deger={egri.ifade} onOdak={tarihceyeKaydet} ornek="x^2" hata={hata} onDegis={(v) => yaz({ ifade: v } as Partial<GrafikEgrisi>)} />
      <div className="flex flex-wrap items-center gap-2">
        <OndalikGirdisi etiket="Değme noktası x₀" deger={egri.x0} bos="0" onOdak={tarihceyeKaydet} onDegis={(v) => yaz({ x0: v ?? 0 } as Partial<GrafikEgrisi>)} />
        {t && <span className="text-[11px] text-slate-600">Teğet: y = {sayi(t.m)}x {t.c < 0 ? "−" : "+"} {sayi(Math.abs(t.c))} (eğim {sayi(t.m)})</span>}
      </div>
    </div>
  );
}

function IsaretDuzenleyici({ egri, yaz, tarihceyeKaydet }: {
  egri: Extract<GrafikEgrisi, { tur: "isaret" }>;
  yaz: (yama: Partial<GrafikEgrisi>) => void;
  tarihceyeKaydet: () => void;
}) {
  const dis = adliNoktalariYaz(egri.noktalar);
  const [metin, setMetin] = useState(dis);
  const odakta = useRef(false);
  useEffect(() => { if (!odakta.current) setMetin(dis); }, [dis]);
  const okunan = adliNoktalariOku(metin);
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1" data-testid="grafik-isaret">
      <label className="flex flex-wrap items-center gap-1 text-[11px] font-semibold text-slate-600">
        Adlı noktalar
        <input
          aria-label="Adlı noktalar"
          value={metin}
          onFocus={() => { odakta.current = true; tarihceyeKaydet(); }}
          onBlur={() => { odakta.current = false; setMetin(dis); }}
          onChange={(e) => {
            setMetin(e.target.value);
            const n = adliNoktalariOku(e.target.value);
            if (n) yaz({ noktalar: n } as Partial<GrafikEgrisi>);
          }}
          placeholder="A(2,3); B(-1,2)"
          className={`w-full min-w-0 flex-1 rounded-md border bg-white px-2 py-1 font-mono text-[11px] ${okunan ? "border-slate-300" : "border-red-400"}`}
        />
      </label>
      <span className={`text-[10px] ${okunan ? "text-slate-500" : "text-red-600"}`}>
        {okunan ? "Ad(x,y) biçiminde, ; ile ayırın. Ad noktanın yanına yazılır." : "Okunamadı: örnek A(2,3); B(-1,2)"}
      </span>
    </div>
  );
}

/** Şablon önizlemesi: gerçek çizim rutini, yazısız ve küçük. */
function SablonOnizleme({ veri }: { veri: GrafikVerisi }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const oran = typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1;
    canvas.width = 64 * oran;
    canvas.height = 40 * oran;
    ctx.setTransform(oran, 0, 0, oran, 0, 0);
    ctx.clearRect(0, 0, 64, 40);
    const olcek = 0.17;
    ctx.save();
    ctx.translate(7, 4);
    ctx.scale(olcek, olcek);
    grafikCiz(ctx, { id: "onizleme", tur: "fizik", nesne: "grafik", kalinlik: 3, x: 0, y: 0, w: 300, h: 190, grafik: { ...veri, sade: true } });
    ctx.restore();
  }, [veri]);
  return <canvas ref={ref} width={64} height={40} style={{ width: 64, height: 40 }} aria-hidden="true" />;
}

/** "Fizik şekilleri > Grafik" sekmesi: tek tıkla hazır grafik ekler. */
export function GrafikSeridi({ onSablon, onUclu, onHizli }: {
  onSablon: (id: string) => void;
  onUclu: () => void;
  onHizli?: (noktalar: Nokta[], buyukluk: GrafikBuyuklugu) => void;
}) {
  const [metin, setMetin] = useState("");
  const [buyukluk, setBuyukluk] = useState<GrafikBuyuklugu>("hiz");
  const ayrinti = metin.trim() ? noktalariOkuAyrinti(metin) : null;
  const noktalar = ayrinti && "noktalar" in ayrinti ? ayrinti.noktalar : null;
  const nedeni = ayrinti && "hata" in ayrinti ? ayrinti.hata : null;
  const ayniX = noktalar ? ayniXUyarisi(noktalar) : null;
  const ciz = () => {
    if (noktalar && onHizli) {
      onHizli(noktalar, buyukluk);
      setMetin("");
    }
  };
  return (
    <div className="flex flex-wrap gap-1.5" data-testid="grafik-seridi">
      {onHizli && (
        <div className="flex w-full flex-wrap items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50/60 px-2 py-1.5" data-testid="grafik-hizli">
          <span className="text-[10px] font-bold uppercase tracking-wide text-brand-700">Hızlı çiz</span>
          {BUYUKLUKLER.map((b) => (
            <TogglePill key={b} aktif={buyukluk === b} onClick={() => setBuyukluk(b)}>{GRAFIK_BUYUKLUK_ADLARI[b]}</TogglePill>
          ))}
          <input
            aria-label="Hızlı grafik noktaları"
            value={metin}
            onChange={(e) => setMetin(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); ciz(); } }}
            placeholder="Noktaları yazın: 0,5; 5,15; 9,15; 11,9"
            className={`min-w-[16rem] flex-1 rounded-md border bg-white px-2 py-1 font-mono text-[11px] ${!metin || noktalar ? "border-slate-300" : "border-red-400"}`}
          />
          <button
            type="button"
            disabled={!noktalar}
            onClick={ciz}
            className="rounded-md border border-brand-300 bg-white px-3 py-1 text-[11px] font-bold text-brand-700 hover:bg-brand-50 disabled:opacity-40"
          >
            Çiz
          </button>
          {nedeni && <span className="w-full text-[10px] text-red-600" data-testid="grafik-hizli-hata">{nedeni}</span>}
          {ayniX && <span className="w-full text-[10px] text-amber-700" data-testid="grafik-hizli-uyari">{ayniX}</span>}
          <span className="w-full text-[10px] text-slate-500">(zaman, değer) çiftleri ; ile ayrılır (en çok 80 nokta). Köşelere kesikli kılavuz ve sayılar otomatik gelir.</span>
        </div>
      )}
      {GRAFIK_SABLONLARI.map((sb) => (
        <button
          key={sb.id}
          type="button"
          title={sb.ipucu}
          aria-label={`Grafik ekle: ${sb.ad}`}
          onClick={() => onSablon(sb.id)}
          className="inline-flex flex-col items-center gap-0.5 rounded-lg border border-slate-200 bg-white px-2 pb-1 pt-1.5 text-[10px] font-semibold text-slate-600 transition hover:border-brand-200 hover:bg-brand-50"
        >
          <SablonOnizleme veri={sb.olustur()} />
          {sb.ad}
        </button>
      ))}
      <button
        type="button"
        title="Aynı hareketin konum, hız ve ivme grafiğini alt alta, zaman eksenleri hizalı ekler"
        aria-label="Grafik ekle: x–t, v–t, a–t üçlü"
        onClick={onUclu}
        className="inline-flex flex-col items-center justify-center gap-0.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-[10px] font-bold text-brand-700 transition hover:bg-brand-100"
      >
        <span className="text-[13px]">x · v · a</span>
        Üçlü grafik
      </button>
    </div>
  );
}

/** Seçili grafiğin paneli. */
export function GrafikSecimPaneli({ sekil, guncelle, tarihceyeKaydet, onUcluEkle }: {
  sekil: FizikSekliTipi;
  guncelle: (yama: Partial<FizikSekliTipi>) => void;
  tarihceyeKaydet: () => void;
  onUcluEkle?: (x0: number, v0: number, evreler: { sure: number; ivme: number }[]) => void;
}) {
  const veri: GrafikVerisi = sekil.grafik && grafikVerisiGecerliMi(sekil.grafik) ? sekil.grafik : varsayilanGrafik();
  const [secili, setSecili] = useState(0);
  const idx = Math.min(secili, Math.max(0, veri.egriler.length - 1));
  const egri = veri.egriler[idx];
  const yaz = (yama: Partial<GrafikVerisi>) => guncelle({ grafik: { ...veri, ...yama } });
  const egriYaz = (yama: Partial<GrafikEgrisi>) =>
    yaz({ egriler: veri.egriler.map((e, i) => (i === idx ? ({ ...e, ...yama } as GrafikEgrisi) : e)) });
  const sayilar = veri.sayilar ?? "oto";

  const tureGec = (tur: GrafikEgrisi["tur"]) => {
    if (!egri || egri.tur === tur) return;
    tarihceyeKaydet();
    const yeni = varsayilanEgri(tur, egri.renk);
    const ortak = { alan: egri.alan, kesik: egri.kesik, cizgi: egri.cizgi, kilavuz: tur === "hareket" || tur === "noktalar" ? egri.kilavuz : false, etiket: egri.etiket };
    const eksenler =
      tur === "sinus" ? { xEtiket: "t (s)", yEtiket: "x (cm)", sayilar: "oto" as const, izgara: true }
      : tur === "hareket" ? { xEtiket: "t (s)", yEtiket: buyuklukEtiketi("hiz"), sayilar: "kilavuz" as const }
      : tur === "fonksiyon" || tur === "bolge" || tur === "isaret" || tur === "denklem" || tur === "arasi" || tur === "teget" ? { xEtiket: "x", yEtiket: "y", sayilar: "oto" as const, izgara: true }
      : {};
    yaz({
      egriler: veri.egriler.map((e, i) => (i === idx ? ({ ...yeni, ...ortak } as GrafikEgrisi) : e)),
      xMin: undefined, xMax: undefined, yMin: undefined, yMax: undefined, xAdim: undefined, yAdim: undefined,
      piEksen: false,
      ...eksenler,
    });
  };

  const yEtiketiniGuncelle = (b: GrafikBuyuklugu) => {
    const varsayilanlar = BUYUKLUKLER.map(buyuklukEtiketi);
    if (varsayilanlar.includes(veri.yEtiket) || !veri.yEtiket.trim()) yaz({ yEtiket: buyuklukEtiketi(b) });
  };

  return (
    <div className="mt-2 rounded-xl border border-brand-200 bg-brand-50/50 p-2" data-testid="grafik-paneli">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={BASLIK}>Hazır grafik</span>
        {GRAFIK_SABLONLARI.map((sb) => (
          <button
            key={sb.id}
            type="button"
            title={sb.ipucu}
            onClick={() => { tarihceyeKaydet(); setSecili(0); guncelle({ grafik: sb.olustur() }); }}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-brand-200 hover:bg-brand-50"
          >
            {sb.ad}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-brand-100 pt-2">
        <span className={BASLIK}>Eğriler</span>
        {veri.egriler.map((e, i) => (
          <TogglePill key={i} aktif={i === idx} onClick={() => setSecili(i)}>
            {i + 1}. {egriAdi(e)}
          </TogglePill>
        ))}
        <button
          type="button"
          disabled={veri.egriler.length >= 4}
          onClick={() => {
            tarihceyeKaydet();
            const renkler = ["#2563eb", "#dc2626", "#16a34a", "#ea580c"];
            const yeni = { ...varsayilanEgri("noktalar", renkler[veri.egriler.length % renkler.length]), kilavuz: false } as GrafikEgrisi;
            yaz({ egriler: [...veri.egriler, yeni] });
            setSecili(veri.egriler.length);
          }}
          className="rounded-md border border-brand-300 bg-white px-2 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-40"
        >
          + Eğri ekle
        </button>
        <button
          type="button"
          disabled={veri.egriler.length <= 1}
          onClick={() => { tarihceyeKaydet(); yaz({ egriler: veri.egriler.filter((_, i) => i !== idx) }); setSecili(0); }}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          Bu eğriyi sil
        </button>
      </div>

      {egri && (
        <div className="mt-2 flex flex-col gap-2 rounded-lg border border-slate-200 bg-white/70 p-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={BASLIK}>Eğri türü</span>
            {TUR_ADLARI.map((t) => (
              <TogglePill key={t.tur} aktif={egri.tur === t.tur} onClick={() => tureGec(t.tur)}>{t.ad}</TogglePill>
            ))}
          </div>
          {egri.tur === "hareket" && (
            <HareketDuzenleyici egri={egri} yaz={egriYaz} tarihceyeKaydet={tarihceyeKaydet} yEtiketiniGuncelle={yEtiketiniGuncelle} onUcluEkle={onUcluEkle} />
          )}
          {egri.tur === "noktalar" && <NoktaListesi egri={egri} yaz={egriYaz} tarihceyeKaydet={tarihceyeKaydet} onUcluEkle={onUcluEkle} />}
          {egri.tur === "sinus" && <SinusDuzenleyici egri={egri} yaz={egriYaz} tarihceyeKaydet={tarihceyeKaydet} />}
          {egri.tur === "fonksiyon" && <FonksiyonDuzenleyici egri={egri} yaz={egriYaz} tarihceyeKaydet={tarihceyeKaydet} />}
          {egri.tur === "bolge" && <BolgeDuzenleyici egri={egri} yaz={egriYaz} tarihceyeKaydet={tarihceyeKaydet} />}
          {egri.tur === "denklem" && <DenklemDuzenleyici egri={egri} yaz={egriYaz} tarihceyeKaydet={tarihceyeKaydet} />}
          {egri.tur === "arasi" && <ArasiDuzenleyici egri={egri} yaz={egriYaz} tarihceyeKaydet={tarihceyeKaydet} />}
          {egri.tur === "teget" && <TegetDuzenleyici egri={egri} yaz={egriYaz} tarihceyeKaydet={tarihceyeKaydet} />}
          {egri.tur === "isaret" && <IsaretDuzenleyici egri={egri} yaz={egriYaz} tarihceyeKaydet={tarihceyeKaydet} />}
          {egri.tur === "noktalar" && (
            <div className="flex flex-wrap items-center gap-2">
              <TogglePill aktif={!!egri.nokta} onClick={() => { tarihceyeKaydet(); egriYaz({ nokta: !egri.nokta }); }}>Noktaları göster</TogglePill>
              <TogglePill aktif={!!egri.cizgisiz} onClick={() => { tarihceyeKaydet(); egriYaz({ cizgisiz: !egri.cizgisiz, nokta: !egri.cizgisiz ? true : egri.nokta }); }}>Çizgisiz (serpme)</TogglePill>
              {(() => {
                const r = dogrusalRegresyon(egri.noktalar);
                return (
                  <button
                    type="button"
                    disabled={!r || veri.egriler.length >= 4}
                    title="En küçük kareler doğrusunu yeni eğri olarak ekler"
                    onClick={() => {
                      if (!r) return;
                      tarihceyeKaydet();
                      const f = (n: number) => String(Math.round(n * 1e4) / 1e4);
                      const xs = egri.noktalar.map((p) => p.x);
                      yaz({ egriler: [...veri.egriler, { tur: "fonksiyon", ifade: `${f(r.a)}x+${f(r.b)}`, renk: "#dc2626", kesik: true, baslangic: Math.min(...xs), bitis: Math.max(...xs) } as GrafikEgrisi] });
                    }}
                    className="rounded-md border border-brand-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-40"
                  >
                    Regresyon doğrusu ekle{r ? ` (r = ${String(Math.round(r.r * 1000) / 1000).replace(".", ",")})` : ""}
                  </button>
                );
              })()}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <RenkSecici deger={egri.renk} onSec={(r) => { tarihceyeKaydet(); egriYaz({ renk: r }); }} ad="Eğri rengi" />
            <span className="mx-1 h-5 w-px bg-slate-200" />
            <TogglePill aktif={!!egri.alan} onClick={() => { tarihceyeKaydet(); egriYaz({ alan: !egri.alan }); }}>Altını boya</TogglePill>
            <TogglePill aktif={!!egri.kesik && !egri.cizgi} onClick={() => { tarihceyeKaydet(); egriYaz({ kesik: !egri.kesik, cizgi: undefined }); }}>Kesikli</TogglePill>
            <label className="flex items-center gap-1 text-[11px] text-slate-600">
              Çizgi deseni
              <select
                aria-label="Çizgi deseni"
                value={egriCizgiDeseni(egri)}
                onChange={(e) => { tarihceyeKaydet(); egriYaz({ cizgi: e.target.value as GrafikCizgiDeseni, kesik: undefined }); }}
                className="rounded-md border border-slate-300 bg-white px-1 py-0.5 text-[11px]"
              >
                {GRAFIK_CIZGI_DESENLERI.map((d) => <option key={d.id} value={d.id}>{d.ad}</option>)}
              </select>
            </label>
            {(egri.tur === "hareket" || egri.tur === "noktalar") && (
              <TogglePill aktif={!!egri.kilavuz} onClick={() => { tarihceyeKaydet(); egriYaz({ kilavuz: !egri.kilavuz }); }}>Köşe noktaları + kılavuz</TogglePill>
            )}
            <MetinGirdisi etiket="Eğri adı" deger={egri.etiket ?? ""} onOdak={tarihceyeKaydet} onDegis={(v) => egriYaz({ etiket: v })} genislik="w-20" yerTutucu="I, x_1" enCok={40} />
          </div>
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-brand-100 pt-2">
        <span className={BASLIK}>Eksenler</span>
        <MetinGirdisi etiket="Yatay eksen" deger={veri.xEtiket} onOdak={tarihceyeKaydet} onDegis={(v) => yaz({ xEtiket: v })} yerTutucu="t (s)" />
        <MetinGirdisi etiket="Dikey eksen" deger={veri.yEtiket} onOdak={tarihceyeKaydet} onDegis={(v) => yaz({ yEtiket: v })} yerTutucu="v (m/s)" />
        <MetinGirdisi etiket="Başlık" deger={sekil.etiket ?? ""} onOdak={tarihceyeKaydet} onDegis={(v) => guncelle({ etiket: v })} yerTutucu="Şekil I" />
        <span className="text-[10px] text-slate-500">m/s^2 → üst simge, x_1 → alt simge</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className={BASLIK}>Aralık</span>
        <OndalikGirdisi etiket="x en az" deger={veri.xMin} bos="oto" onOdak={tarihceyeKaydet} onDegis={(v) => yaz({ xMin: v })} />
        <OndalikGirdisi etiket="x en çok" deger={veri.xMax} bos="oto" onOdak={tarihceyeKaydet} onDegis={(v) => yaz({ xMax: v })} />
        <OndalikGirdisi etiket="x adımı" deger={veri.xAdim} bos="oto" onOdak={tarihceyeKaydet} onDegis={(v) => yaz({ xAdim: v && v > 0 ? v : undefined })} />
        <OndalikGirdisi etiket="y en az" deger={veri.yMin} bos="oto" onOdak={tarihceyeKaydet} onDegis={(v) => yaz({ yMin: v })} />
        <OndalikGirdisi etiket="y en çok" deger={veri.yMax} bos="oto" onOdak={tarihceyeKaydet} onDegis={(v) => yaz({ yMax: v })} />
        <OndalikGirdisi etiket="y adımı" deger={veri.yAdim} bos="oto" onOdak={tarihceyeKaydet} onDegis={(v) => yaz({ yAdim: v && v > 0 ? v : undefined })} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className={BASLIK}>Görünüm</span>
        <TogglePill aktif={!!veri.izgara} onClick={() => { tarihceyeKaydet(); yaz({ izgara: !veri.izgara }); }}>Izgara</TogglePill>
        <TogglePill aktif={!!veri.kesisim} onClick={() => { tarihceyeKaydet(); yaz({ kesisim: !veri.kesisim }); }}>Kesişim ve kökleri işaretle</TogglePill>
        <TogglePill aktif={!!veri.tepe} onClick={() => { tarihceyeKaydet(); yaz({ tepe: !veri.tepe }); }}>Uç noktaları (tepe) işaretle</TogglePill>
        <TogglePill aktif={!!veri.piEksen} onClick={() => { tarihceyeKaydet(); yaz({ piEksen: !veri.piEksen, xAdim: undefined }); }}>Yatay eksen π (radyan)</TogglePill>
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <span className={BASLIK}>Sayılar</span>
        {([["oto", "Düzenli"], ["kilavuz", "Yalnız köşe değerleri"], ["yok", "Yok"]] as const).map(([id, ad]) => (
          <TogglePill key={id} aktif={sayilar === id} onClick={() => { tarihceyeKaydet(); yaz({ sayilar: id }); }}>{ad}</TogglePill>
        ))}
      </div>
    </div>
  );
}
