// Matematik sekmesi: fonksiyon grafiği, istatistik grafiği, Venn / ağaç / sayı doğrusu.
// Çizim kodu `cizim/` altında; burada yalnız arayüz.
//
// İLKE (fizik grafiğindekiyle aynı): boş ekrandan başlanmaz. Şablon tek tıkla gelir,
// asıl iş sayıları değiştirmektir. "Hızlı çiz" kutusuna ifade yazılır, Enter ile çizilir.

import { useEffect, useRef, useState } from "react";

import { grafikCiz, hizliMatematik, MAT_GRAFIK_SABLONLARI } from "../cizim/grafik";
import {
  besSayiOzeti,
  EN_COK_AD,
  EN_COK_GOVDE_SATIRI,
  EN_COK_HAM_DEGER,
  EN_COK_SINIF,
  EN_COK_TABLO_SATIRI,
  GOVDE_GENIS_UYARISI,
  govdeSatirSayisi,
  sinifSayisi,
  istatistikCiz,
  ISTATISTIK_SABLONLARI,
  ISTATISTIK_TURLERI,
  istatistikVerisiGecerliMi,
  ozetSayilar,
  siniflandir,
  tabloOku,
  varsayilanIstatistik,
} from "../cizim/istatistik";
import {
  agacOkuAyrinti,
  agacYaz,
  EN_COK_DAL_ADI,
  EN_COK_SEMA_AD,
  SAYI_DOGRUSU_SINIRI,
  araliklariOku,
  araliklariYaz,
  sayiNoktalariniOku,
  sayiNoktalariniYaz,
  SEMA_SABLONLARI,
  semaCiz,
  semaVerisiGecerliMi,
  varsayilanSema,
  vennBolgeAdlari,
} from "../cizim/sema";
import type { GrafikVerisi, IstatistikVerisi, SemaVerisi, Sekil } from "../cizim/tipler";
import { MetinGirdisi, OndalikGirdisi } from "./GrafikPaneli";
import { TogglePill } from "./ModalParcalari";

type FizikSekliTipi = Extract<Sekil, { tur: "fizik" }>;

const BASLIK = "text-[10px] font-bold uppercase tracking-wide text-slate-500";
const DUGME = "rounded-md border border-brand-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-40";

const sayiMetni = (n: number) => String(Math.round(n * 1e4) / 1e4).replace(".", ",");

// ── Önizleme ───────────────────────────────────────────────────────────────

export function Onizleme({ ciz, deps, olcek = 0.17 }: { ciz: (ctx: CanvasRenderingContext2D) => void; deps: unknown; olcek?: number }) {
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
    ctx.save();
    ctx.translate(7, 4);
    ctx.scale(olcek, olcek);
    ciz(ctx);
    ctx.restore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps]);
  return <canvas ref={ref} width={64} height={40} style={{ width: 64, height: 40 }} aria-hidden="true" />;
}

export function SablonDugmesi({ ad, ipucu, etiket, onClick, children }: {
  ad: string; ipucu: string; etiket: string; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={ipucu}
      aria-label={etiket}
      onClick={onClick}
      className="inline-flex flex-col items-center gap-0.5 rounded-lg border border-slate-200 bg-white px-2 pb-1 pt-1.5 text-[10px] font-semibold text-slate-600 transition hover:border-brand-200 hover:bg-brand-50"
    >
      {children}
      {ad}
    </button>
  );
}

// ── Şerit ──────────────────────────────────────────────────────────────────

/** "Fizik şekilleri > Matematik" sekmesi. */
export function MatematikSeridi({ onGrafik, onIstatistik, onSema }: {
  onGrafik: (veri: GrafikVerisi) => void;
  onIstatistik: (veri: IstatistikVerisi) => void;
  onSema: (veri: SemaVerisi) => void;
}) {
  const [metin, setMetin] = useState("");
  const sonuc = metin.trim() ? hizliMatematik(metin) : null;
  const hata = sonuc && "hata" in sonuc ? sonuc.hata : null;
  const ciz = () => {
    if (sonuc && "veri" in sonuc) {
      onGrafik(sonuc.veri);
      setMetin("");
    }
  };
  const [sekme, setSekme] = useState<"fonksiyon" | "istatistik" | "sema">("fonksiyon");
  return (
    <div className="flex w-full flex-wrap gap-1.5" data-testid="matematik-seridi">
      <div className="flex w-full items-center gap-1.5">
        {([["fonksiyon", "Fonksiyon"], ["istatistik", "İstatistik"], ["sema", "Şema"]] as const).map(([id, ad]) => (
          <TogglePill key={id} aktif={sekme === id} onClick={() => setSekme(id)}>{ad}</TogglePill>
        ))}
        <span className="text-[10px] text-slate-500">
          {sekme === "fonksiyon" ? "Aşağıya yazın ya da hazır grafiğe tıklayın" : sekme === "istatistik" ? "Hazır grafiğe tıklayın, sayıları sonra değiştirin" : "Venn, olasılık ağacı, sayı doğrusu"}
        </span>
      </div>

      {sekme === "fonksiyon" && (
        <div className="flex w-full flex-wrap items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50/60 px-2 py-1.5" data-testid="matematik-hizli">
          <span className="text-[10px] font-bold uppercase tracking-wide text-brand-700">Yazarak çiz</span>
          <input
            aria-label="Hızlı fonksiyon"
            value={metin}
            onChange={(e) => setMetin(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); ciz(); } }}
            placeholder="y = x^2 - 4 ; {x<0: -x, x>=0: x^2} ; A(2,3)"
            className={`min-w-[16rem] flex-1 rounded-md border bg-white px-2 py-1 font-mono text-[11px] ${hata ? "border-red-400" : "border-slate-300"}`}
          />
          <button type="button" disabled={!sonuc || !!hata} onClick={ciz} className={`${DUGME} font-bold`}>Çiz</button>
          <span className={`w-full text-[10px] ${hata ? "text-red-600" : "text-slate-500"}`}>
            {hata ?? "Birden fazla ifade ; ile ayrılır. > < >= <= yazarsanız bölge boyanır. Çember/elips: x^2+y^2=25. Alan: alan(x, x^2, 0, 1). Teğet: teget(x^2, 1). Kesişim noktaları: kesisim. Parçalı: {x<0: -x, x>=0: x^2} (açık/kapalı uç otomatik). Adlı nokta: A(2,3) ; F1(-3,0). Birden çok eğri düz/kesikli/noktalı çizgiyle ayrılır; sin/cos yazarsanız x ekseni π katlarıyla gelir."}
          </span>
        </div>
      )}

      {sekme === "fonksiyon" && MAT_GRAFIK_SABLONLARI.map((sb) => (
        <SablonDugmesi key={sb.id} ad={sb.ad} ipucu={sb.ipucu} etiket={`Grafik ekle: ${sb.ad}`} onClick={() => onGrafik(sb.olustur())}>
          <Onizleme deps={sb.id} ciz={(ctx) => grafikCiz(ctx, { id: "o", tur: "fizik", nesne: "grafik", kalinlik: 3, x: 0, y: 0, w: 300, h: 190, grafik: { ...sb.olustur(), sade: true } })} />
        </SablonDugmesi>
      ))}

      {sekme === "istatistik" && ISTATISTIK_SABLONLARI.map((sb) => (
        <SablonDugmesi key={sb.id} ad={sb.ad} ipucu={sb.ipucu} etiket={`İstatistik ekle: ${sb.ad}`} onClick={() => onIstatistik(sb.olustur())}>
          <Onizleme deps={sb.id} ciz={(ctx) => istatistikCiz(ctx, { id: "o", tur: "fizik", nesne: "istatistik", kalinlik: 3, x: 0, y: 0, w: 300, h: 190, istatistik: { ...sb.olustur(), sade: true } })} />
        </SablonDugmesi>
      ))}

      {sekme === "sema" && SEMA_SABLONLARI.map((sb) => (
        <SablonDugmesi key={sb.id} ad={sb.ad} ipucu={sb.ipucu} etiket={`Şema ekle: ${sb.ad}`} onClick={() => onSema(sb.olustur())}>
          <Onizleme deps={sb.id} ciz={(ctx) => semaCiz(ctx, { id: "o", tur: "fizik", nesne: "sema", kalinlik: 3, x: 0, y: 0, w: 300, h: 190, sema: sb.olustur() })} />
        </SablonDugmesi>
      ))}
    </div>
  );
}

// ── İstatistik paneli ──────────────────────────────────────────────────────

const HAM_TURLER = ["kutu", "govde"];

function tabloYaz(v: IstatistikVerisi): string {
  const baslik = ["", ...v.seriler].join("\t");
  return [baslik, ...v.satirlar.map((r) => [r.ad, ...r.v.map((x) => String(x).replace(".", ","))].join("\t"))].join("\n");
}

const hamOku = (metin: string): number[] | null => {
  const parcalar = metin.split(/[;\s]+/).filter(Boolean);
  const sayilar = parcalar.map((p) => Number(p.replace(",", ".").replace("−", "-")));
  return sayilar.every((n) => Number.isFinite(n)) && sayilar.length <= EN_COK_HAM_DEGER ? sayilar : null;
};

/** Ham veri kutusu okunamıyorsa nedeni. */
const hamHatasi = (metin: string): string | null => {
  const parcalar = metin.split(/[;\s]+/).filter(Boolean);
  if (parcalar.length > EN_COK_HAM_DEGER) return `En çok ${EN_COK_HAM_DEGER} değer yazılabilir`;
  if (hamOku(metin) === null) return "Okunamadı: yalnız sayı yazın (boşluk ya da ; ile ayırın)";
  return null;
};

function HamSatir({ satir, yaz, sil, silinebilir, tarihceyeKaydet, govdeUygun }: {
  satir: { ad: string; v: number[] };
  /** Gövde–yaprak: bu değerler (diğer satırlar ve yaprak birimiyle) gövde sınırını aşmıyor mu? */
  govdeUygun?: (n: number[]) => boolean;
  yaz: (s: { ad: string; v: number[] }) => void;
  sil: () => void;
  silinebilir: boolean;
  tarihceyeKaydet: () => void;
}) {
  const dis = satir.v.map((x) => String(x).replace(".", ",")).join("; ");
  const [metin, setMetin] = useState(dis);
  const odakta = useRef(false);
  useEffect(() => { if (!odakta.current) setMetin(dis); }, [dis]);
  const ok = hamOku(metin);
  const cokGenis = !!ok && !!govdeUygun && !govdeUygun(ok);
  const hata = cokGenis ? GOVDE_GENIS_UYARISI : hamHatasi(metin);
  return (
    <div className="flex flex-wrap items-center gap-1.5" data-testid="istatistik-ham-satir">
      <MetinGirdisi etiket="Grup adı" deger={satir.ad} onOdak={tarihceyeKaydet} onDegis={(v) => yaz({ ...satir, ad: v })} genislik="w-24" yerTutucu="Sınıf A" enCok={EN_COK_AD} />
      <label className="flex min-w-0 flex-1 items-center gap-1 text-[11px] font-semibold text-slate-600">
        Değerler
        <input
          aria-label="Değerler"
          value={metin}
          onFocus={() => { odakta.current = true; tarihceyeKaydet(); }}
          onBlur={() => { odakta.current = false; setMetin(dis); }}
          onChange={(e) => {
            setMetin(e.target.value);
            const n = hamOku(e.target.value);
            // Aralık çok genişse yazılan değer UYGULANMAZ: önceki geçerli şekil korunur.
            if (n && !(govdeUygun && !govdeUygun(n))) yaz({ ...satir, v: n });
          }}
          placeholder="12; 15; 17; 21 (boşluk ya da ; ile ayırın)"
          className={`min-w-0 flex-1 rounded-md border bg-white px-2 py-1 font-mono text-[11px] ${hata ? "border-red-400" : "border-slate-300"}`}
        />
      </label>
      {hata && <span className="w-full text-[10px] text-red-600" data-testid="istatistik-ham-uyari">{hata}</span>}
      <button type="button" disabled={!silinebilir} onClick={sil} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-40">Sil</button>
    </div>
  );
}

function TabloKutusu({ veri, yaz, tarihceyeKaydet }: {
  veri: IstatistikVerisi; yaz: (yama: Partial<IstatistikVerisi>) => void; tarihceyeKaydet: () => void;
}) {
  const dis = tabloYaz(veri);
  const [metin, setMetin] = useState(dis);
  const odakta = useRef(false);
  useEffect(() => { if (!odakta.current) setMetin(dis); }, [dis]);
  const okunan = tabloOku(metin);
  return (
    <div className="flex flex-col gap-1">
      <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate-600">
        Tablo (Excel'den yapıştırabilirsiniz)
        <textarea
          aria-label="İstatistik tablosu"
          rows={Math.min(9, Math.max(4, veri.satirlar.length + 2))}
          value={metin}
          onFocus={() => { odakta.current = true; tarihceyeKaydet(); }}
          onBlur={() => { odakta.current = false; setMetin(dis); }}
          onChange={(e) => {
            setMetin(e.target.value);
            const t = tabloOku(e.target.value);
            if (t) yaz({ seriler: t.seriler, satirlar: t.satirlar });
          }}
          className={`w-full rounded-md border bg-white px-2 py-1 font-mono text-[11px] ${okunan ? "border-slate-300" : "border-red-400"}`}
        />
      </label>
      <span className={`text-[10px] ${okunan ? "text-slate-500" : "text-red-600"}`}>
        {okunan
          ? "İlk satır seri adları (daire/çubukta tek seri), ilk sütun etiketler. Sütunlar sekme ya da ; ile ayrılır."
          : "Okunamadı: her satırda etiket ve en az bir sayı olmalı (ör. Pzt ; 12)."}
      </span>
      {okunan && okunan.fazlaSatir > 0 && <span className="text-[10px] text-amber-700" data-testid="istatistik-satir-uyari">En çok {EN_COK_TABLO_SATIRI} satır gösterilir ({okunan.fazlaSatir} satır dışarıda kaldı)</span>}
      {okunan && okunan.fazlaSeri > 0 && <span className="text-[10px] text-amber-700">En çok 6 sütun (seri) gösterilir</span>}
      {okunan && veri.tur === "daire" && (okunan.seriler.length > 1 || okunan.satirlar.length < 2) && (
        <span className="text-[10px] text-amber-700">Daire grafiği yalnız ilk sütunu kullanır; her satır bir dilimdir (en az 2 satır, değerler pozitif).</span>
      )}
    </div>
  );
}

function SiniflarKutusu({ yaz, tarihceyeKaydet }: { yaz: (yama: Partial<IstatistikVerisi>) => void; tarihceyeKaydet: () => void }) {
  const [ham, setHam] = useState("");
  const [genislik, setGenislik] = useState<number | undefined>(10);
  const sayilar = ham.trim() ? hamOku(ham) : null;
  const sinifN = sayilar && genislik && genislik > 0 ? sinifSayisi(sayilar, genislik) : 0;
  const sinifFazla = sinifN > EN_COK_SINIF;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white/70 p-2" data-testid="istatistik-siniflar">
      <span className={BASLIK}>Ham veriden sınıf oluştur</span>
      <input
        aria-label="Ham veri"
        value={ham}
        onChange={(e) => setHam(e.target.value)}
        placeholder="45; 52; 61; 58; 73; 66 …"
        className={`min-w-[12rem] flex-1 rounded-md border bg-white px-2 py-1 font-mono text-[11px] ${!ham || sayilar ? "border-slate-300" : "border-red-400"}`}
      />
      <OndalikGirdisi etiket="Sınıf genişliği" deger={genislik} onDegis={setGenislik} />
      <button
        type="button"
        disabled={!sayilar?.length || !(genislik && genislik > 0) || sinifFazla}
        onClick={() => {
          if (!sayilar || !genislik) return;
          tarihceyeKaydet();
          yaz({ seriler: ["Sıklık"], satirlar: siniflandir(sayilar, genislik) });
          setHam("");
        }}
        className={DUGME}
      >
        Sınıfları oluştur
      </button>
      {sinifFazla && <span className="w-full text-[10px] text-red-600" data-testid="istatistik-sinif-uyari">En çok {EN_COK_SINIF} sınıf oluşur; sınıf genişliğini büyütün</span>}
      {ham.trim() && !sayilar && <span className="w-full text-[10px] text-red-600">Okunamadı: yalnız sayı yazın (en çok {EN_COK_HAM_DEGER} değer)</span>}
    </div>
  );
}

/** Seçili istatistik grafiğinin paneli. */
export function IstatistikPaneli({ sekil, guncelle, tarihceyeKaydet }: {
  sekil: FizikSekliTipi;
  guncelle: (yama: Partial<FizikSekliTipi>) => void;
  tarihceyeKaydet: () => void;
}) {
  const veri: IstatistikVerisi = sekil.istatistik && istatistikVerisiGecerliMi(sekil.istatistik) ? sekil.istatistik : varsayilanIstatistik();
  const yaz = (yama: Partial<IstatistikVerisi>) => guncelle({ istatistik: { ...veri, ...yama } });
  const ham = HAM_TURLER.includes(veri.tur);
  const tureGec = (tur: IstatistikVerisi["tur"]) => {
    if (tur === veri.tur) return;
    tarihceyeKaydet();
    const hamMi = HAM_TURLER.includes(tur);
    if (hamMi !== ham) {
      // Ham veri ↔ tablo veri biçimleri farklı: yeni türün örneğiyle başla.
      const ornek = (ISTATISTIK_SABLONLARI.find((s) => s.olustur().tur === tur) ?? ISTATISTIK_SABLONLARI[0]).olustur();
      yaz({ tur, seriler: ornek.seriler, satirlar: ornek.satirlar, yazi: ornek.yazi, cokgen: undefined });
    } else {
      yaz({ tur, ...(tur === "daire" ? { yazi: "yuzde" as const } : {}) });
    }
  };
  const [birimUyari, setBirimUyari] = useState<string | null>(null);
  const govdeMi = veri.tur === "govde";
  // Gövde–yaprak: diğer satırlarla birlikte gövde satırı sayısı sınırı aşmasın (donma/çökme önlemi).
  const govdeUygunSatir = (i: number) => (n: number[]) =>
    !govdeMi || govdeSatirSayisi(veri.satirlar.slice(0, 2).map((r, j) => (j === i ? n : r.v)), veri.birim) <= EN_COK_GOVDE_SATIRI;
  const ilk = ham ? veri.satirlar[0]?.v ?? [] : [];
  const ozet = ham ? ozetSayilar(ilk) : null;
  const bes = ham ? besSayiOzeti(ilk) : null;

  return (
    <div className="mt-2 rounded-xl border border-brand-200 bg-brand-50/50 p-2" data-testid="istatistik-paneli">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={BASLIK}>Hazır</span>
        {ISTATISTIK_SABLONLARI.map((sb) => (
          <button key={sb.id} type="button" title={sb.ipucu} onClick={() => { tarihceyeKaydet(); guncelle({ istatistik: sb.olustur() }); }}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-brand-200 hover:bg-brand-50">{sb.ad}</button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-brand-100 pt-2">
        <span className={BASLIK}>Grafik türü</span>
        {ISTATISTIK_TURLERI.map((t) => (
          <TogglePill key={t.tur} aktif={veri.tur === t.tur} onClick={() => tureGec(t.tur)}>{t.ad}</TogglePill>
        ))}
      </div>

      <div className="mt-2 flex flex-col gap-2 rounded-lg border border-slate-200 bg-white/70 p-2">
        {ham ? (
          <>
            {veri.satirlar.map((s, i) => (
              <HamSatir
                key={i}
                satir={s}
                govdeUygun={govdeMi ? govdeUygunSatir(i) : undefined}
                tarihceyeKaydet={tarihceyeKaydet}
                yaz={(yeni) => yaz({ satirlar: veri.satirlar.map((x, j) => (j === i ? yeni : x)) })}
                sil={() => { tarihceyeKaydet(); yaz({ satirlar: veri.satirlar.filter((_, j) => j !== i) }); }}
                silinebilir={veri.satirlar.length > 1}
              />
            ))}
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" disabled={veri.satirlar.length >= 4} onClick={() => { tarihceyeKaydet(); yaz({ satirlar: [...veri.satirlar, { ad: `Grup ${veri.satirlar.length + 1}`, v: [10, 20, 30] }] }); }} className={DUGME}>+ Grup ekle</button>
              {veri.tur === "govde" && <OndalikGirdisi etiket="Yaprak birimi" deger={veri.birim} bos="oto" onOdak={tarihceyeKaydet} onDegis={(v) => {
                const b = v && v > 0 ? v : undefined;
                if (govdeSatirSayisi(veri.satirlar.slice(0, 2).map((r) => r.v), b) > EN_COK_GOVDE_SATIRI) { setBirimUyari(GOVDE_GENIS_UYARISI); return; }
                setBirimUyari(null);
                yaz({ birim: b });
              }} />}
              {birimUyari && <span className="text-[10px] text-red-600">{birimUyari}</span>}
              {veri.tur === "govde" && <span className="text-[10px] text-slate-500">2 grup yan yana (sırt sırta) gösterilir.</span>}
            </div>
            {(ozet || bes) && (
              <div className="rounded-md bg-slate-50 px-2 py-1 text-[11px] text-slate-600" data-testid="istatistik-ozet">
                {ozet && <>n = {ozet.n} · ortalama {sayiMetni(ozet.ortalama)} · ortanca {sayiMetni(ozet.medyan)} · açıklık {sayiMetni(ozet.aciklik)} · standart sapma {sayiMetni(ozet.sapma)}{ozet.tepe.length ? ` · tepe değer ${ozet.tepe.map(sayiMetni).join(", ")}` : ""}</>}
                {bes && <><br />min {sayiMetni(bes.min)} · Q1 {sayiMetni(bes.q1)} · ortanca {sayiMetni(bes.med)} · Q3 {sayiMetni(bes.q3)} · maks {sayiMetni(bes.max)} · çeyrekler açıklığı {sayiMetni(bes.iqr)}{bes.aykiri.length ? ` · aykırı: ${bes.aykiri.map(sayiMetni).join(", ")}` : ""}</>}
              </div>
            )}
          </>
        ) : (
          <>
            <TabloKutusu veri={veri} yaz={yaz} tarihceyeKaydet={tarihceyeKaydet} />
            {veri.tur === "histogram" && <SiniflarKutusu yaz={yaz} tarihceyeKaydet={tarihceyeKaydet} />}
          </>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className={BASLIK}>Yazılar</span>
        <MetinGirdisi etiket="Başlık" deger={veri.baslik ?? ""} onOdak={tarihceyeKaydet} onDegis={(v) => yaz({ baslik: v })} yerTutucu="Sınıfın notları" />
        {veri.tur !== "daire" && veri.tur !== "govde" && (
          <>
            <MetinGirdisi etiket="Yatay eksen" deger={veri.xEtiket ?? ""} onOdak={tarihceyeKaydet} onDegis={(v) => yaz({ xEtiket: v })} genislik="w-24" enCok={EN_COK_AD} />
            <MetinGirdisi etiket="Dikey eksen" deger={veri.yEtiket ?? ""} onOdak={tarihceyeKaydet} onDegis={(v) => yaz({ yEtiket: v })} genislik="w-24" enCok={EN_COK_AD} />
          </>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className={BASLIK}>Görünüm</span>
        {veri.tur !== "govde" && veri.tur !== "kutu" && (
          <>
            {([["yok", "Değer yok"], ["deger", "Değerler"], ["yuzde", "Yüzde"]] as const).map(([id, ad]) => (
              <TogglePill key={id} aktif={(veri.yazi ?? "deger") === id} onClick={() => { tarihceyeKaydet(); yaz({ yazi: id }); }}>{ad}</TogglePill>
            ))}
            <TogglePill aktif={!!veri.renkli} onClick={() => { tarihceyeKaydet(); yaz({ renkli: !veri.renkli }); }}>Renkli (yazıcıda gri değil)</TogglePill>
          </>
        )}
        {(veri.tur === "sutun" || veri.tur === "cubuk" || veri.tur === "cizgi" || veri.tur === "histogram" || veri.tur === "kutu") && (
          <TogglePill aktif={!!veri.izgara} onClick={() => { tarihceyeKaydet(); yaz({ izgara: !veri.izgara }); }}>Izgara</TogglePill>
        )}
        {veri.tur === "histogram" && <TogglePill aktif={!!veri.cokgen} onClick={() => { tarihceyeKaydet(); yaz({ cokgen: !veri.cokgen }); }}>Sıklık çokgeni</TogglePill>}
        {(veri.tur === "sutun" || veri.tur === "cizgi" || veri.tur === "histogram") && (
          <>
            <OndalikGirdisi etiket="Dikey en çok" deger={veri.yMax} bos="oto" onOdak={tarihceyeKaydet} onDegis={(v) => yaz({ yMax: v && v > 0 ? v : undefined })} />
            <OndalikGirdisi etiket="Dikey adım" deger={veri.yAdim} bos="oto" onOdak={tarihceyeKaydet} onDegis={(v) => yaz({ yAdim: v && v > 0 ? v : undefined })} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Şema paneli ────────────────────────────────────────────────────────────

function YaziAlani({ etiket, deger, ornek, satir, onOdak, onYaz, gecerli, neden, uyari }: {
  etiket: string; deger: string; ornek: string; satir?: number;
  onOdak: () => void; onYaz: (metin: string) => void; gecerli: (metin: string) => boolean;
  /** Okunamama nedeni (varsa kırmızı mesajda gösterilir). */
  neden?: (metin: string) => string | null;
  /** Okundu ama bir şey düzeltildi/kesildi: kısa uyarı. */
  uyari?: (metin: string) => string | undefined;
}) {
  const [metin, setMetin] = useState(deger);
  const odakta = useRef(false);
  useEffect(() => { if (!odakta.current) setMetin(deger); }, [deger]);
  const ok = gecerli(metin);
  const uyariMetni = ok ? uyari?.(metin) : undefined;
  const Girdi = satir ? "textarea" : "input";
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1 text-[11px] font-semibold text-slate-600">
      {etiket}
      <Girdi
        aria-label={etiket}
        {...(satir ? { rows: satir } : {})}
        value={metin}
        placeholder={ornek}
        onFocus={() => { odakta.current = true; onOdak(); }}
        onBlur={() => { odakta.current = false; setMetin(deger); }}
        onChange={(e) => { setMetin(e.target.value); if (gecerli(e.target.value)) onYaz(e.target.value); }}
        className={`w-full min-w-0 rounded-md border bg-white px-2 py-1 font-mono text-[11px] ${ok ? "border-slate-300" : "border-red-400"}`}
      />
      <span className={`text-[10px] font-normal ${ok ? "text-slate-500" : "text-red-600"}`}>{ok ? `Örnek: ${ornek.replace(/\n/g, " / ")}` : `Okunamadı${neden?.(metin) ? `: ${neden(metin)}` : ""} — örnek: ${ornek.replace(/\n/g, " / ")}`}</span>
      {uyariMetni && <span className="text-[10px] font-normal text-amber-700" data-testid="sema-uyari">{uyariMetni}</span>}
    </label>
  );
}

/** Seçili şemanın (Venn / ağaç / sayı doğrusu) paneli. */
export function SemaPaneli({ sekil, guncelle, tarihceyeKaydet }: {
  sekil: FizikSekliTipi;
  guncelle: (yama: Partial<FizikSekliTipi>) => void;
  tarihceyeKaydet: () => void;
}) {
  const [sayiUyari, setSayiUyari] = useState<string | null>(null);
  const veri: SemaVerisi = sekil.sema && semaVerisiGecerliMi(sekil.sema) ? sekil.sema : varsayilanSema();
  const yaz = (yeni: SemaVerisi) => guncelle({ sema: yeni });
  /** Sayı doğrusu değerleri |değer| ≤ 1e9: aşan değer uygulanmaz, uyarı gösterilir. */
  const sinirli = (v: number | undefined, uygula: (n: number) => unknown) => {
    if (v === undefined) return;
    if (Math.abs(v) > SAYI_DOGRUSU_SINIRI) { setSayiUyari("Sayılar en çok ±1 000 000 000 olabilir"); return; }
    setSayiUyari(null);
    uygula(v);
  };
  const sablonTuru = (id: string) => SEMA_SABLONLARI.find((s) => s.id === id)!.olustur();

  return (
    <div className="mt-2 rounded-xl border border-brand-200 bg-brand-50/50 p-2" data-testid="sema-paneli">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={BASLIK}>Hazır</span>
        {SEMA_SABLONLARI.map((sb) => (
          <button key={sb.id} type="button" title={sb.ipucu} onClick={() => { tarihceyeKaydet(); yaz(sb.olustur()); }}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-brand-200 hover:bg-brand-50">{sb.ad}</button>
        ))}
      </div>

      {veri.tur === "venn" && (() => {
        const adlar = vennBolgeAdlari(veri.kume, veri.adlar);
        const bolgeler = adlar.map((_, i) => veri.bolgeler[i] ?? "");
        const boyali = new Set(veri.boyali ?? []);
        return (
          <div className="mt-2 flex flex-col gap-2 border-t border-brand-100 pt-2" data-testid="sema-venn">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={BASLIK}>Küme sayısı</span>
              {[2, 3].map((k) => (
                <TogglePill key={k} aktif={veri.kume === k} onClick={() => {
                  if (veri.kume === k) return;
                  tarihceyeKaydet();
                  yaz({ ...(sablonTuru(k === 2 ? "venn2" : "venn3") as Extract<SemaVerisi, { tur: "venn" }>), baslik: veri.baslik, evrensel: veri.evrensel, evrenselAd: veri.evrenselAd });
                }}>{k} küme</TogglePill>
              ))}
              {veri.adlar.slice(0, veri.kume).map((a, i) => (
                <MetinGirdisi key={i} etiket={`${i + 1}. küme adı`} deger={a} genislik="w-16" enCok={EN_COK_SEMA_AD} onOdak={tarihceyeKaydet}
                  onDegis={(v) => yaz({ ...veri, adlar: veri.adlar.map((x, j) => (j === i ? v : x)) })} />
              ))}
              <TogglePill aktif={veri.evrensel} onClick={() => { tarihceyeKaydet(); yaz({ ...veri, evrensel: !veri.evrensel }); }}>Evrensel küme kutusu</TogglePill>
              {veri.evrensel && <MetinGirdisi etiket="Evrensel ad" deger={veri.evrenselAd ?? ""} genislik="w-14" enCok={EN_COK_SEMA_AD} onOdak={tarihceyeKaydet} onDegis={(v) => yaz({ ...veri, evrenselAd: v })} yerTutucu="E" />}
              <MetinGirdisi etiket="Başlık" deger={veri.baslik ?? ""} genislik="w-24" onOdak={tarihceyeKaydet} onDegis={(v) => yaz({ ...veri, baslik: v })} />
            </div>
            {/* Sağ panel ~370 px: her bölge kendi satırında; etiket kısalır (truncate+title), giriş ve Boya düğmesi daima görünür. */}
            <div className="flex min-w-0 flex-col gap-1">
              {adlar.map((ad, i) => (
                <div key={i} className="flex min-w-0 items-center gap-1.5" data-testid="venn-bolge">
                  <label className="flex min-w-0 flex-1 items-center gap-1 text-[11px] font-semibold text-slate-600">
                    <span className="min-w-0 flex-1 truncate" title={ad}>{ad}</span>
                    <input
                      aria-label={`Bölge: ${ad}`}
                      value={bolgeler[i]}
                      maxLength={30}
                      onFocus={tarihceyeKaydet}
                      onChange={(e) => yaz({ ...veri, bolgeler: bolgeler.map((x, j) => (j === i ? e.target.value : x)) })}
                      className="w-16 shrink-0 rounded-md border border-slate-300 bg-white px-1.5 py-1 text-[11px]"
                      placeholder="değer"
                    />
                  </label>
                  <div className="shrink-0">
                    <TogglePill aktif={boyali.has(i)} onClick={() => {
                      tarihceyeKaydet();
                      const yeni = new Set(boyali);
                      if (yeni.has(i)) yeni.delete(i); else yeni.add(i);
                      yaz({ ...veri, boyali: [...yeni].sort((a, b) => a - b) });
                    }}>Boya</TogglePill>
                  </div>
                </div>
              ))}
            </div>
            <span className="text-[10px] text-slate-500">Bölgeye sayı ya da eleman yazın (ör. 5 ya da 1,2). Boyanan bölgeler taranır — A∖B, A∩B, (A∪B)′ gibi ifadeleri göstermek için.</span>
          </div>
        );
      })()}

      {veri.tur === "agac" && (
        <div className="mt-2 flex flex-col gap-2 border-t border-brand-100 pt-2" data-testid="sema-agac">
          <YaziAlani
            etiket="Dallar"
            satir={Math.min(10, agacYaz(veri.dallar).split("\n").length + 1)}
            deger={agacYaz(veri.dallar)}
            ornek={"K: 1/3\n- K: 1/2\n- M: 1/2\nM: 2/3\n- K: 1/2\n- M: 1/2"}
            onOdak={tarihceyeKaydet}
            gecerli={(m) => "dallar" in agacOkuAyrinti(m)}
            neden={(m) => { const r = agacOkuAyrinti(m); return "hata" in r ? r.hata : null; }}
            uyari={(m) => { const r = agacOkuAyrinti(m); return "dallar" in r ? r.uyari : undefined; }}
            onYaz={(m) => { const r = agacOkuAyrinti(m); if ("dallar" in r) yaz({ ...veri, dallar: r.dallar }); }}
          />
          <span className="text-[10px] text-slate-500">Her satır bir dal: "ad: olasılık". Alt dallar "-" ile başlar ve üstündeki dala bağlanır. Sona ulaşan yolların çarpımı sağda yazılır. Dal adı en çok {EN_COK_DAL_ADI}, olasılık en çok 20 karakter.</span>
          <MetinGirdisi etiket="Başlık" deger={veri.baslik ?? ""} onOdak={tarihceyeKaydet} onDegis={(v) => yaz({ ...veri, baslik: v })} />
        </div>
      )}

      {veri.tur === "sayiDogrusu" && (
        <div className="mt-2 flex flex-col gap-2 border-t border-brand-100 pt-2" data-testid="sema-sayi">
          <div className="flex flex-wrap items-center gap-2">
            <OndalikGirdisi etiket="En küçük" deger={veri.min} onOdak={tarihceyeKaydet} onDegis={(v) => sinirli(v, (n) => n < veri.max && yaz({ ...veri, min: n }))} />
            <OndalikGirdisi etiket="En büyük" deger={veri.max} onOdak={tarihceyeKaydet} onDegis={(v) => sinirli(v, (n) => n > veri.min && yaz({ ...veri, max: n }))} />
            <OndalikGirdisi etiket="Adım" deger={veri.adim} onOdak={tarihceyeKaydet} onDegis={(v) => sinirli(v, (n) => n > 0 && yaz({ ...veri, adim: n }))} />
            <MetinGirdisi etiket="Başlık" deger={veri.baslik ?? ""} onOdak={tarihceyeKaydet} onDegis={(v) => yaz({ ...veri, baslik: v })} />
          </div>
          {sayiUyari && <span className="text-[10px] text-red-600" data-testid="sema-sayi-uyari">{sayiUyari}</span>}
          <div className="flex flex-wrap gap-2">
            <YaziAlani
              etiket="Aralıklar"
              deger={araliklariYaz(veri.araliklar)}
              ornek="(-2, 3]; [5, ∞)"
              neden={() => "en çok 6 aralık; sayılar ±1 000 000 000 içinde, başlangıç ≤ bitiş"}
              onOdak={tarihceyeKaydet}
              gecerli={(m) => !m.trim() || !!araliklariOku(m)}
              onYaz={(m) => yaz({ ...veri, araliklar: m.trim() ? araliklariOku(m)! : [] })}
            />
            <YaziAlani
              etiket="Noktalar"
              deger={sayiNoktalariniYaz(veri.noktalar)}
              ornek="1:A; 4:B:bos"
              onOdak={tarihceyeKaydet}
              gecerli={(m) => !m.trim() || !!sayiNoktalariniOku(m)}
              onYaz={(m) => yaz({ ...veri, noktalar: m.trim() ? sayiNoktalariniOku(m)! : [] })}
            />
          </div>
          <span className="text-[10px] text-slate-500">( ) açık uç ○, [ ] kapalı uç ●. ∞ ya da boş uç sonsuzu gösterir. Noktada "bos" yazarsanız içi boş daire olur.</span>
        </div>
      )}
    </div>
  );
}
