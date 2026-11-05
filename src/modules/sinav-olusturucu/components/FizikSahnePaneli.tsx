// Hesaplı fizik düzeneklerinin (eğik düzlem kuvvetleri, optik ışın düzeneği,
// sıvı kapları) sade ayar paneli. Çizim her ayarda veriden yeniden hesaplanır:
// kütle/açı değişince oklar, cisim uzaklığı değişince görüntü kendiliğinden güncellenir.

import { useState } from "react";
import type { ReactNode } from "react";

import type { EgikKuvvetVerisi, OptikVerisi, Sekil, SiviVerisi } from "../cizim/tipler";
import { egikKuvvetleri, egikKuvvetVerisiGecerliMi, varsayilanEgikKuvvet } from "../cizim/fizikSahneler";
import { OPTIK_TURLERI, aynaMi, optikHesapla, optikNitelik, optikVerisiGecerliMi, varsayilanOptik } from "../cizim/optik";
import { siviVerisiGecerliMi, uBorusuH2, varsayilanSivi } from "../cizim/sivi";
import { TogglePill } from "./ModalParcalari";

type FizikSekliTipi = Extract<Sekil, { tur: "fizik" }>;
type Ortak = { sekil: FizikSekliTipi; guncelle: (yama: Partial<FizikSekliTipi>) => void; tarihceyeKaydet: () => void };

const BASLIK = "text-[10px] font-bold uppercase tracking-wide text-slate-500";
const yaz = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");

export const fizikSahnePaneliVarMi = (nesne: string) => nesne === "egikKuvvet" || nesne === "optikDuzenek" || nesne === "siviKabi";

function Sayi({ etiket, deger, min, max, adim = 1, onDegis, onOdak, devreDisi }: {
  etiket: string; deger: number; min: number; max: number; adim?: number; onDegis: (v: number) => void; onOdak: () => void; devreDisi?: boolean;
}) {
  return (
    <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
      {etiket}
      <input
        type="number" aria-label={etiket} value={Math.round(deger * 100) / 100} min={min} max={max} step={adim} disabled={devreDisi}
        onFocus={onOdak}
        onChange={(e) => { const v = Number(e.target.value.replace(",", ".")); if (Number.isFinite(v)) onDegis(Math.min(max, Math.max(min, v))); }}
        className="w-16 rounded-md border border-slate-300 bg-white px-1.5 py-1 text-[11px] disabled:bg-slate-100 disabled:text-slate-400"
      />
    </label>
  );
}

function Kaydirici({ etiket, deger, min, max, adim, onDegis, onOdak, goster }: {
  etiket: string; deger: number; min: number; max: number; adim: number; onDegis: (v: number) => void; onOdak: () => void; goster?: string;
}) {
  return (
    <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
      {etiket}
      <input type="range" aria-label={etiket} min={min} max={max} step={adim} value={deger} onPointerDown={onOdak}
        onChange={(e) => onDegis(Number(e.target.value))} className="w-28" />
      <span className="w-10 text-slate-500">{goster ?? yaz(deger)}</span>
    </label>
  );
}

function Metin({ etiket, deger, onDegis, onOdak, genislik = "w-20" }: { etiket: string; deger: string; onDegis: (v: string) => void; onOdak: () => void; genislik?: string }) {
  return (
    <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
      {etiket}
      <input aria-label={etiket} value={deger} maxLength={24} onFocus={onOdak} onChange={(e) => onDegis(e.target.value)}
        className={`${genislik} rounded-md border border-slate-300 bg-white px-1.5 py-1 text-[11px]`} />
    </label>
  );
}

// ── Eğik düzlem ────────────────────────────────────────────────────────────

function EgikKuvvetPaneli({ sekil, guncelle, tarihceyeKaydet }: Ortak) {
  const v: EgikKuvvetVerisi = sekil.kuvvet && egikKuvvetVerisiGecerliMi(sekil.kuvvet) ? sekil.kuvvet : varsayilanEgikKuvvet();
  const yazV = (yama: Partial<EgikKuvvetVerisi>, ek: Partial<FizikSekliTipi> = {}) => guncelle({ kuvvet: { ...v, ...yama }, ...ek });
  const k = egikKuvvetleri(v);
  const gosterDegis = (anahtar: keyof EgikKuvvetVerisi["goster"]) => {
    tarihceyeKaydet();
    const goster = { ...v.goster, [anahtar]: !v.goster[anahtar] };
    // Sürtünme açılıp μ = 0 ise anlamlı bir varsayılan (0,3) ver.
    yazV({ goster, ...(anahtar === "surtunme" && goster.surtunme && v.mu === 0 ? { mu: 0.3 } : {}) });
  };
  return (
    <div className="flex flex-col gap-2" data-testid="egik-kuvvet-paneli">
      <div className="flex flex-wrap items-center gap-2">
        <Kaydirici etiket="Açı α" deger={v.aci} min={5} max={70} adim={1} goster={`${v.aci}°`} onOdak={tarihceyeKaydet}
          // Kutunun yüksekliği açıya uyar: takoz kutuyu doldursun (çizilen açı her durumda gerçek α).
          onDegis={(aci) => yazV({ aci }, { h: Math.round(Math.max(40, Math.min(400, sekil.w * Math.tan((aci * Math.PI) / 180)))) })} />
        <Sayi etiket="Kütle (kg)" deger={v.kutle} min={0.1} max={100} adim={0.5} onOdak={tarihceyeKaydet} onDegis={(kutle) => yazV({ kutle })} />
        <Sayi etiket="μ" deger={v.mu} min={0} max={1.5} adim={0.05} onOdak={tarihceyeKaydet} onDegis={(mu) => yazV({ mu })} />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={BASLIK}>Oklar</span>
        <TogglePill aktif={v.goster.mg} onClick={() => gosterDegis("mg")}>mg</TogglePill>
        <TogglePill aktif={v.goster.bilesen} onClick={() => gosterDegis("bilesen")}>mg·sinα, mg·cosα</TogglePill>
        <TogglePill aktif={v.goster.normal} onClick={() => gosterDegis("normal")}>N</TogglePill>
        <TogglePill aktif={v.goster.surtunme} onClick={() => gosterDegis("surtunme")}>fₛ</TogglePill>
        <TogglePill aktif={v.degerler} onClick={() => { tarihceyeKaydet(); yazV({ degerler: !v.degerler }); }}>Değerleri yaz</TogglePill>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Kaydirici etiket="Ok ölçeği (px/N)" deger={v.olcek} min={0.2} max={10} adim={0.1} onOdak={tarihceyeKaydet} onDegis={(olcek) => yazV({ olcek })} />
        <Kaydirici etiket="Kütlenin yeri" deger={v.konum} min={0} max={1} adim={0.05} goster={`%${Math.round(v.konum * 100)}`} onOdak={tarihceyeKaydet} onDegis={(konum) => yazV({ konum })} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Metin etiket="Açı etiketi" deger={v.aciEtiketi} onOdak={tarihceyeKaydet} onDegis={(aciEtiketi) => yazV({ aciEtiketi })} />
        <Metin etiket="Kütle etiketi" deger={v.kutleEtiketi} onOdak={tarihceyeKaydet} onDegis={(kutleEtiketi) => yazV({ kutleEtiketi })} />
      </div>
      <p className="text-[10px] leading-snug text-slate-500" data-testid="egik-kuvvet-ozet">
        g = 10 m/s²: mg = {yaz(k.G)} N · mg·sinα = {yaz(k.paralel)} N · N = mg·cosα = {yaz(k.N)} N
        {v.mu > 0 && <> · fₛ,max = μN = {yaz(k.fsMax)} N → {k.durgun ? `cisim durur, fₛ = ${yaz(k.fs)} N` : `cisim kayar, a = ${yaz(k.ivme)} m/s²`}</>}.
        {" "}Oklar kuvvetle orantılı: kütleyi artırınca hepsi uzar.
      </p>
    </div>
  );
}

// ── Optik ──────────────────────────────────────────────────────────────────

function OptikPaneli({ sekil, guncelle, tarihceyeKaydet }: Ortak) {
  const v: OptikVerisi = sekil.optik && optikVerisiGecerliMi(sekil.optik) ? sekil.optik : varsayilanOptik();
  const yazV = (yama: Partial<OptikVerisi>) => guncelle({ optik: { ...v, ...yama } });
  const r = optikHesapla(v);
  const ayna = aynaMi(v.tur);
  const isin = (anahtar: keyof OptikVerisi["isinlar"]) => { tarihceyeKaydet(); yazV({ isinlar: { ...v.isinlar, [anahtar]: !v.isinlar[anahtar] } }); };
  return (
    <div className="flex flex-col gap-2" data-testid="optik-paneli">
      <div className="flex flex-wrap items-center gap-1.5">
        {OPTIK_TURLERI.map((t) => (
          <TogglePill key={t.deger} aktif={v.tur === t.deger} onClick={() => { tarihceyeKaydet(); yazV({ tur: t.deger }); }}>{t.ad}</TogglePill>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Sayi etiket="Odak uzaklığı |f|" deger={v.f} min={0.5} max={200} adim={1} onOdak={tarihceyeKaydet} onDegis={(f) => yazV({ f })} />
        <Kaydirici etiket="Cisim uzaklığı dₒ" deger={v.uzaklik} min={0.5} max={Math.max(60, v.f * 4)} adim={0.5} onOdak={tarihceyeKaydet} onDegis={(uzaklik) => yazV({ uzaklik })} />
        <Sayi etiket="dₒ" deger={v.uzaklik} min={0.1} max={500} adim={1} onOdak={tarihceyeKaydet} onDegis={(uzaklik) => yazV({ uzaklik })} />
        <Sayi etiket="Cisim boyu" deger={v.boy} min={0.1} max={100} adim={0.5} onOdak={tarihceyeKaydet} onDegis={(boy) => yazV({ boy })} />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={BASLIK}>Işınlar</span>
        <TogglePill aktif={v.isinlar.paralel} onClick={() => isin("paralel")}>Paralel gelen</TogglePill>
        <TogglePill aktif={v.isinlar.odak} onClick={() => isin("odak")}>Odaktan gelen</TogglePill>
        <TogglePill aktif={v.isinlar.merkez} onClick={() => isin("merkez")}>{ayna ? "Tepeye gelen" : "Merkezden geçen"}</TogglePill>
        {ayna && <TogglePill aktif={!!v.isinlar.egrilik} onClick={() => isin("egrilik")}>Merkezden (M) gelen</TogglePill>}
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <TogglePill aktif={v.goruntu} onClick={() => { tarihceyeKaydet(); yazV({ goruntu: !v.goruntu }); }}>Görüntü</TogglePill>
        <TogglePill aktif={v.isaretler} onClick={() => { tarihceyeKaydet(); yazV({ isaretler: !v.isaretler }); }}>{ayna ? "M, F, T" : "2F, F, O"}</TogglePill>
        <TogglePill aktif={v.bilgi} onClick={() => { tarihceyeKaydet(); yazV({ bilgi: !v.bilgi }); }}>Hesap yazısı</TogglePill>
      </div>
      <p className="text-[10px] leading-snug text-slate-500" data-testid="optik-ozet">
        1/f = 1/dₒ + 1/dᵢ (f = {yaz(r.f)}): {r.sonsuz ? "cisim odakta, görüntü sonsuzda." : `dᵢ = ${yaz(r.di)}, büyütme m = ${yaz(r.m)} → ${optikNitelik(v)}.`}
        {" "}Sanal görüntü ve ışın uzantıları kesikli çizilir.
      </p>
    </div>
  );
}

// ── Sıvı kapları ───────────────────────────────────────────────────────────

const SIVI_TURLERI: { deger: SiviVerisi["tur"]; ad: string }[] = [
  { deger: "uBorusu", ad: "U borusu" },
  { deger: "kaldirma", ad: "Kaldırma kuvveti" },
  { deger: "bolmeli", ad: "Bölmeli kap" },
];

function SiviPaneli({ sekil, guncelle, tarihceyeKaydet }: Ortak) {
  const v: SiviVerisi = sekil.sivi && siviVerisiGecerliMi(sekil.sivi) ? sekil.sivi : varsayilanSivi();
  const [mod, setMod] = useState<"dolu" | "engel" | "nokta">("dolu");
  const yazV = (yeni: SiviVerisi) => guncelle({ sivi: yeni });
  let icerik: ReactNode = null;
  if (v.tur === "uBorusu") {
    const h2 = uBorusuH2(v);
    icerik = (
      <>
        <div className="flex flex-wrap items-center gap-2">
          <Sayi etiket="d₁ (altta)" deger={v.d1} min={0.1} max={30} adim={0.1} onOdak={tarihceyeKaydet} onDegis={(d1) => yazV({ ...v, d1 })} />
          <Sayi etiket="d₂" deger={v.d2} min={0.1} max={30} adim={0.1} onOdak={tarihceyeKaydet} onDegis={(d2) => yazV({ ...v, d2 })} />
          <Sayi etiket="h₁" deger={v.h1} min={0.1} max={100} adim={0.5} onOdak={tarihceyeKaydet} onDegis={(h1) => yazV({ ...v, h1 })} />
          <Sayi etiket="h₂" deger={h2} min={0.1} max={300} adim={0.5} devreDisi={v.otomatik} onOdak={tarihceyeKaydet} onDegis={(yeni) => yazV({ ...v, h2: yeni })} />
          <TogglePill aktif={v.otomatik} onClick={() => { tarihceyeKaydet(); yazV({ ...v, otomatik: !v.otomatik, h2: Math.min(300, Math.max(0.1, h2)) }); }}>Denge: d₁·h₁ = d₂·h₂</TogglePill>
        </div>
        <p className="text-[10px] text-slate-500">
          d₁·h₁ = {yaz(v.d1 * v.h1)}, d₂·h₂ = {yaz(v.d2 * h2)}{v.otomatik ? " (h₂ otomatik)" : Math.abs(v.d1 * v.h1 - v.d2 * h2) > 1e-6 ? " — sıvılar dengede değil" : ""}.
          {v.d2 >= v.d1 && <span className="font-semibold text-rose-600"> Alttaki sıvı daha yoğun olmalı (d₂ &lt; d₁).</span>}
        </p>
      </>
    );
  } else if (v.tur === "kaldirma") {
    icerik = (
      <div className="flex flex-wrap items-center gap-2">
        <Kaydirici etiket="Sıvı seviyesi" deger={v.seviye} min={0.3} max={0.95} adim={0.05} goster={`%${Math.round(v.seviye * 100)}`} onOdak={tarihceyeKaydet} onDegis={(seviye) => yazV({ ...v, seviye })} />
        <Kaydirici etiket="X batan oran (dX/dₛ)" deger={v.xBatma} min={0.1} max={0.9} adim={0.05} onOdak={tarihceyeKaydet} onDegis={(xBatma) => yazV({ ...v, xBatma })} />
        <Sayi etiket="dZ/dₛ" deger={v.zOran} min={1.05} max={5} adim={0.1} onOdak={tarihceyeKaydet} onDegis={(zOran) => yazV({ ...v, zOran })} />
        <Metin etiket="Adlar" genislik="w-24" deger={v.adlar.join(", ")} onOdak={tarihceyeKaydet}
          onDegis={(t) => { const p = t.split(",").map((x) => x.trim().slice(0, 8)); yazV({ ...v, adlar: [p[0] ?? "", p[1] ?? "", p[2] ?? ""] }); }} />
        <TogglePill aktif={v.kuvvet} onClick={() => { tarihceyeKaydet(); yazV({ ...v, kuvvet: !v.kuvvet }); }}>Fₖ, G, N okları</TogglePill>
        <span className="text-[10px] text-slate-500">Eşit hacimli cisimler: yüzen ve askıdakinde Fₖ = G; batanda G &gt; Fₖ, N = G − Fₖ.</span>
      </div>
    );
  } else {
    const n = v.satir * v.sutun;
    const hucreTikla = (i: number) => {
      tarihceyeKaydet();
      const cikar = (l: number[]) => l.filter((x) => x !== i);
      if (mod === "nokta") {
        const noktalar = v.noktalar ?? [];
        const var_ = noktalar.some((p) => p.hucre === i);
        const ad = "KLMNPRST"[noktalar.length % 8];
        yazV({ ...v, noktalar: var_ ? noktalar.filter((p) => p.hucre !== i) : [...noktalar, { hucre: i, ad }].slice(0, 12) });
      } else if (mod === "dolu") yazV({ ...v, dolu: v.dolu.includes(i) ? cikar(v.dolu) : [...v.dolu, i], engel: cikar(v.engel) });
      else yazV({ ...v, engel: v.engel.includes(i) ? cikar(v.engel) : [...v.engel, i], dolu: cikar(v.dolu) });
    };
    const boyut = (satir: number, sutun: number) => {
      const yeniN = satir * sutun;
      const tasi = (i: number) => { const r = Math.floor(i / v.sutun), c = i % v.sutun; return r < satir && c < sutun ? r * sutun + c : -1; };
      const liste = (l: number[]) => l.map(tasi).filter((i) => i >= 0 && i < yeniN);
      yazV({ ...v, satir, sutun, dolu: liste(v.dolu), engel: liste(v.engel), noktalar: (v.noktalar ?? []).map((p) => ({ ...p, hucre: tasi(p.hucre) })).filter((p) => p.hucre >= 0) });
    };
    icerik = (
      <>
        <div className="flex flex-wrap items-center gap-2">
          <Sayi etiket="Satır" deger={v.satir} min={1} max={12} onOdak={tarihceyeKaydet} onDegis={(s) => boyut(Math.round(s), v.sutun)} />
          <Sayi etiket="Sütun" deger={v.sutun} min={1} max={12} onOdak={tarihceyeKaydet} onDegis={(s) => boyut(v.satir, Math.round(s))} />
          <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
            Musluk
            <select aria-label="Musluk" value={v.musluk?.taraf ?? "yok"} onChange={(e) => { tarihceyeKaydet(); const t = e.target.value; yazV({ ...v, musluk: t === "yok" ? undefined : { taraf: t as "sol" | "sag" | "alt", konum: v.musluk?.konum ?? 0 } }); }}
              className="rounded-md border border-slate-300 bg-white px-1 py-1 text-[11px]">
              <option value="yok">Yok</option><option value="sol">Sol kenar</option><option value="sag">Sağ kenar</option><option value="alt">Alt kenar</option>
            </select>
          </label>
          {v.musluk && <Sayi etiket={v.musluk.taraf === "alt" ? "Sütun no" : "Satır no"} deger={v.musluk.konum + 1} min={1} max={v.musluk.taraf === "alt" ? v.sutun : v.satir} onOdak={tarihceyeKaydet}
            onDegis={(k) => yazV({ ...v, musluk: { ...v.musluk!, konum: Math.round(k) - 1 } })} />}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={BASLIK}>Bölmeye tıkla</span>
          <TogglePill aktif={mod === "dolu"} onClick={() => setMod("dolu")}>Sıvı</TogglePill>
          <TogglePill aktif={mod === "engel"} onClick={() => setMod("engel")}>Engel</TogglePill>
          <TogglePill aktif={mod === "nokta"} onClick={() => setMod("nokta")}>Nokta (K, L…)</TogglePill>
        </div>
        <div className="inline-grid gap-px self-start rounded border border-slate-400 bg-slate-300" style={{ gridTemplateColumns: `repeat(${v.sutun}, 20px)` }} data-testid="bolmeli-izgara">
          {Array.from({ length: n }, (_, i) => {
            const nokta = v.noktalar?.find((p) => p.hucre === i);
            return (
              <button key={i} type="button" aria-label={`Bölme ${Math.floor(i / v.sutun) + 1}. satır ${(i % v.sutun) + 1}. sütun`} onClick={() => hucreTikla(i)}
                className="h-5 w-5 text-[9px] font-bold text-slate-700"
                style={{ background: v.engel.includes(i) ? "repeating-linear-gradient(45deg,#475569 0 2px,#fff 2px 5px)" : v.dolu.includes(i) ? "#bcd3ea" : "#fff" }}>
                {nokta?.ad ?? ""}
              </button>
            );
          })}
        </div>
      </>
    );
  }
  return (
    <div className="flex flex-col gap-2" data-testid="sivi-paneli">
      <div className="flex flex-wrap items-center gap-1.5">
        {SIVI_TURLERI.map((t) => (
          <TogglePill key={t.deger} aktif={v.tur === t.deger} onClick={() => { if (v.tur === t.deger) return; tarihceyeKaydet(); yazV(varsayilanSivi(t.deger)); }}>{t.ad}</TogglePill>
        ))}
      </div>
      {icerik}
    </div>
  );
}

/** Seçili hesaplı düzeneğin paneli (değilse null). */
export function FizikSahnePaneli(props: Ortak) {
  const n = props.sekil.nesne;
  if (!fizikSahnePaneliVarMi(n)) return null;
  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2">
      {n === "egikKuvvet" ? <EgikKuvvetPaneli {...props} /> : n === "optikDuzenek" ? <OptikPaneli {...props} /> : <SiviPaneli {...props} />}
    </div>
  );
}
