// Kimya sekmesi: laboratuvar malzemeleri, atom/molekül, periyodik tablo, kimya grafikleri.
// Çizim kodu `cizim/kimya.ts`'te; burada yalnız arayüz. Fizik/matematik sekmeleriyle aynı ilke:
// önce tek tıkla hazır şekil, sonra sayıları değiştirmek.

import { useEffect, useRef, useState } from "react";

import { FIZIK_TANIMLARI } from "../cizim/fizik";
import { grafikCiz } from "../cizim/grafik";
import {
  ELEMENT_SEMBOLLERI,
  KIMYA_ATOM_SABLONLARI,
  KIMYA_GRAFIK_SABLONLARI,
  KIMYA_LAB_NESNELERI,
  KIMYA_MOLEKUL_SABLONLARI,
  KIMYA_ORBITAL_SABLONLARI,
  KIMYA_ORGANIK_SABLONLARI,
  KIMYA_PERIYODIK_SABLONLARI,
  KIMYA_PIL_SABLONLARI,
  MOLEKULLER,
  OZEL_MOLEKUL_ORNEGI,
  orbitalDizilimMetni,
  ozelMolekulOku,
  ozelMolekulVerisi,
  zincirAdi,
  zincirVerisi,
  KIMYA_SIKLO_SABLONLARI,
  ORGANIK_YAN_GRUPLAR,
  organikAdVeFormul,
  elementListesiOku,
  elementListesiYaz,
  kabukDizilimi,
  kimyaBoyutu,
  kimyaCiz,
  kimyaVerisiGecerliMi,
  molekulCoz,
  varsayilanKimya,
} from "../cizim/kimya";
import type { GrafikVerisi, KimyaVerisi, OrganikYanGrup, Sekil } from "../cizim/tipler";
import { FizikSimgesi } from "./FizikPaneli";
import { MetinGirdisi, OndalikGirdisi } from "./GrafikPaneli";
import { Onizleme, SablonDugmesi } from "./MatematikPaneli";
import { TogglePill } from "./ModalParcalari";

type FizikSekliTipi = Extract<Sekil, { tur: "fizik" }>;

const BASLIK = "text-[10px] font-bold uppercase tracking-wide text-slate-500";

// ── Şerit ──────────────────────────────────────────────────────────────────

type Sekme = "lab" | "atom" | "organik" | "orbital" | "periyodik" | "grafik";

/** "Fizik şekilleri > Kimya" sekmesi. */
export function KimyaSeridi({ onLab, onKimya, onGrafik }: {
  onLab: (nesne: (typeof KIMYA_LAB_NESNELERI)[number]) => void;
  onKimya: (veri: KimyaVerisi) => void;
  onGrafik: (veri: GrafikVerisi) => void;
}) {
  const [sekme, setSekme] = useState<Sekme>("lab");
  const [zincir, setZincir] = useState<{ n: number; tur: "alkan" | "alken" | "alkin"; konum: number }>({ n: 4, tur: "alkan", konum: 1 });
  const kimyaOnizleme = (ham: KimyaVerisi, olcek: number) => {
    // Küçük önizlemede başlık/geometri yazısı okunmaz; çizim kutusuna sığsın diye kaldırılır.
    const v: KimyaVerisi = ham.tur === "molekul" ? { ...ham, geometri: false } : ham.tur === "atom" ? { ...ham, baslik: "" } : ham;
    const b = kimyaBoyutu(v);
    return <Onizleme deps={JSON.stringify(v)} olcek={olcek} ciz={(ctx) => kimyaCiz(ctx, { id: "o", tur: "fizik", nesne: "kimya", kalinlik: 3, x: 0, y: 0, ...b, kimya: v })} />;
  };
  return (
    <div className="flex w-full flex-wrap gap-1.5" data-testid="kimya-seridi">
      <div className="flex w-full flex-wrap items-center gap-1.5">
        {([["lab", "Laboratuvar"], ["atom", "Atom / Molekül"], ["organik", "Organik"], ["orbital", "Orbital / Pil"], ["periyodik", "Periyodik tablo"], ["grafik", "Grafik"]] as const).map(([id, ad]) => (
          <TogglePill key={id} aktif={sekme === id} onClick={() => setSekme(id)}>{ad}</TogglePill>
        ))}
        <span className="text-[10px] text-slate-500">
          {sekme === "lab" ? "Tıklayın, sonra Dolgu rengi seçerek sıvı ekleyin" : sekme === "atom" ? "Atom numarasını ve yükü sonra değiştirebilirsiniz" : sekme === "organik" ? "Benzen halkası, fonksiyonel gruplar, izomerler, alkan/alken/alkin zinciri" : sekme === "orbital" ? "Elektron sayısına göre kutu-ok (Hund kuralı) ve tuz köprülü pil" : sekme === "periyodik" ? "Elementleri boyayabilir, simgesini ? yapabilirsiniz" : "Isınma, çözünürlük, enerji profili, titrasyon"}
        </span>
      </div>

      {sekme === "lab" && KIMYA_LAB_NESNELERI.map((n) => (
        <button
          key={n}
          type="button"
          title={FIZIK_TANIMLARI[n].ipucu}
          aria-label={`Ekle: ${FIZIK_TANIMLARI[n].ad}`}
          onClick={() => onLab(n)}
          className="inline-flex flex-col items-center gap-0.5 rounded-lg border border-slate-200 bg-white px-2 pb-1 pt-1.5 text-[10px] font-semibold text-slate-600 transition hover:border-brand-200 hover:bg-brand-50"
        >
          <FizikSimgesi nesne={n} />
          {FIZIK_TANIMLARI[n].ad}
        </button>
      ))}

      {sekme === "atom" && (
        <>
          <span className={`${BASLIK} w-full`}>Atom ve iyon</span>
          {KIMYA_ATOM_SABLONLARI.map((sb) => (
            <SablonDugmesi key={sb.id} ad={sb.ad} ipucu={sb.ipucu} etiket={`Kimya ekle: ${sb.ad}`} onClick={() => onKimya(sb.olustur())}>
              {kimyaOnizleme(sb.olustur(), 0.17)}
            </SablonDugmesi>
          ))}
          <span className={`${BASLIK} w-full pt-0.5`}>Molekül (Lewis yapısı)</span>
          {KIMYA_MOLEKUL_SABLONLARI.map((sb) => (
            <SablonDugmesi key={sb.id} ad={sb.ad} ipucu={sb.ipucu} etiket={`Kimya ekle: ${sb.ad}`} onClick={() => onKimya(sb.olustur())}>
              {kimyaOnizleme(sb.olustur(), 0.22)}
            </SablonDugmesi>
          ))}
        </>
      )}

      {sekme === "organik" && (
        <>
          <span className={`${BASLIK} w-full`}>Hazır organik yapılar (iskelet formülü)</span>
          {KIMYA_ORGANIK_SABLONLARI.map((sb) => (
            <SablonDugmesi key={sb.id} ad={sb.ad} ipucu={sb.ipucu} etiket={`Organik ekle: ${sb.ad}`} onClick={() => onKimya(sb.olustur())}>
              {kimyaOnizleme({ ...sb.olustur(), geometri: false } as KimyaVerisi, 0.2)}
            </SablonDugmesi>
          ))}
          <span className={`${BASLIK} w-full pt-0.5`}>Sikloalkanlar ve dallanmış yapılar (IUPAC adı otomatik)</span>
          {KIMYA_SIKLO_SABLONLARI.map((sb) => (
            <SablonDugmesi key={sb.id} ad={sb.ad} ipucu={sb.ipucu} etiket={`Organik ekle: ${sb.ad}`} onClick={() => onKimya(sb.olustur())}>
              {kimyaOnizleme({ ...sb.olustur(), geometri: false } as KimyaVerisi, 0.2)}
            </SablonDugmesi>
          ))}
          <div className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-brand-200 bg-brand-50/60 px-2 py-1.5" data-testid="kimya-zincir">
            <span className={BASLIK}>Zincir çizici</span>
            <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
              Karbon sayısı
              <input
                type="number"
                aria-label="Zincir karbon sayısı"
                min={2}
                max={12}
                value={zincir.n}
                onChange={(e) => { const n = Math.round(Number(e.target.value)); if (n >= 2 && n <= 12) setZincir({ ...zincir, n, konum: Math.min(zincir.konum, n - 1) }); }}
                className="w-14 rounded-md border border-slate-300 bg-white px-1.5 py-1 text-[11px]"
              />
            </label>
            {([["alkan", "Alkan"], ["alken", "Alken (C=C)"], ["alkin", "Alkin (C≡C)"]] as const).map(([id, ad]) => (
              <TogglePill key={id} aktif={zincir.tur === id} onClick={() => setZincir({ ...zincir, tur: id })}>{ad}</TogglePill>
            ))}
            {zincir.tur !== "alkan" && (
              <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                Bağ konumu
                <input
                  type="number"
                  aria-label="Çoklu bağın konumu"
                  min={1}
                  max={zincir.n - 1}
                  value={zincir.konum}
                  onChange={(e) => { const k = Math.round(Number(e.target.value)); if (k >= 1 && k <= zincir.n - 1) setZincir({ ...zincir, konum: k }); }}
                  className="w-14 rounded-md border border-slate-300 bg-white px-1.5 py-1 text-[11px]"
                />
              </label>
            )}
            <button type="button" onClick={() => onKimya(zincirVerisi(zincir.n, zincir.tur, zincir.konum))} className="rounded-md border border-brand-300 bg-white px-2.5 py-1 text-[11px] font-bold text-brand-700 hover:bg-brand-50">
              Ekle: {zincirAdi(zincir.n, zincir.tur, zincir.konum)}
            </button>
          </div>
        </>
      )}

      {sekme === "atom" && (
        <button type="button" onClick={() => onKimya(ozelMolekulVerisi())} className="rounded-md border border-brand-300 bg-white px-2.5 py-1 text-[11px] font-bold text-brand-700 hover:bg-brand-50">
          Özel molekül yaz (atom + bağ + serbest çift)
        </button>
      )}

      {sekme === "orbital" && (
        <>
          <span className={`${BASLIK} w-full`}>Orbital kutu-ok diyagramı</span>
          {KIMYA_ORBITAL_SABLONLARI.map((sb) => (
            <SablonDugmesi key={sb.id} ad={sb.ad} ipucu={sb.ipucu} etiket={`Orbital ekle: ${sb.ad}`} onClick={() => onKimya(sb.olustur())}>
              {kimyaOnizleme({ ...sb.olustur(), baslik: "" } as KimyaVerisi, 0.12)}
            </SablonDugmesi>
          ))}
          <span className={`${BASLIK} w-full pt-0.5`}>Tuz köprülü pil</span>
          {KIMYA_PIL_SABLONLARI.map((sb) => (
            <SablonDugmesi key={sb.id} ad={sb.ad} ipucu={sb.ipucu} etiket={`Pil ekle: ${sb.ad}`} onClick={() => onKimya(sb.olustur())}>
              {kimyaOnizleme(sb.olustur(), 0.11)}
            </SablonDugmesi>
          ))}
        </>
      )}

      {sekme === "periyodik" && KIMYA_PERIYODIK_SABLONLARI.map((sb) => (
        <SablonDugmesi key={sb.id} ad={sb.ad} ipucu={sb.ipucu} etiket={`Kimya ekle: ${sb.ad}`} onClick={() => onKimya(sb.olustur())}>
          {kimyaOnizleme(sb.olustur(), 0.09)}
        </SablonDugmesi>
      ))}

      {sekme === "grafik" && KIMYA_GRAFIK_SABLONLARI.map((sb) => (
        <SablonDugmesi key={sb.id} ad={sb.ad} ipucu={sb.ipucu} etiket={`Kimya grafiği ekle: ${sb.ad}`} onClick={() => onGrafik(sb.olustur())}>
          <Onizleme deps={sb.id} ciz={(ctx) => grafikCiz(ctx, { id: "o", tur: "fizik", nesne: "grafik", kalinlik: 3, x: 0, y: 0, w: 300, h: 190, grafik: { ...sb.olustur(), sade: true } })} />
        </SablonDugmesi>
      ))}
    </div>
  );
}

// ── Seçili şekil paneli ────────────────────────────────────────────────────

function ListeKutusu({ etiket, deger, ornek, onOdak, onYaz }: {
  etiket: string; deger: number[]; ornek: string; onOdak: () => void; onYaz: (z: number[]) => void;
}) {
  const dis = elementListesiYaz(deger);
  const [metin, setMetin] = useState(dis);
  const odakta = useRef(false);
  useEffect(() => { if (!odakta.current) setMetin(dis); }, [dis]);
  const ok = elementListesiOku(metin) !== null;
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1 text-[11px] font-semibold text-slate-600">
      {etiket}
      <input
        aria-label={etiket}
        value={metin}
        placeholder={ornek}
        onFocus={() => { odakta.current = true; onOdak(); }}
        onBlur={() => { odakta.current = false; setMetin(dis); }}
        onChange={(e) => { setMetin(e.target.value); const z = elementListesiOku(e.target.value); if (z) onYaz(z); }}
        className={`w-full min-w-0 rounded-md border bg-white px-2 py-1 font-mono text-[11px] ${ok ? "border-slate-300" : "border-red-400"}`}
      />
      <span className={`text-[10px] font-normal ${ok ? "text-slate-500" : "text-red-600"}`}>{ok ? "Sembol ya da numara; aralık için 3-10" : "Okunamadı — örnek: " + ornek}</span>
    </label>
  );
}

/** Seçili atom / molekül / periyodik tablonun paneli. */
export function KimyaPaneli({ sekil, guncelle, tarihceyeKaydet }: {
  sekil: FizikSekliTipi;
  guncelle: (yama: Partial<FizikSekliTipi>) => void;
  tarihceyeKaydet: () => void;
}) {
  const veri: KimyaVerisi = sekil.kimya && kimyaVerisiGecerliMi(sekil.kimya) ? sekil.kimya : varsayilanKimya();
  const yaz = (yeni: KimyaVerisi, boyutla = false) => guncelle({ kimya: yeni, ...(boyutla ? kimyaBoyutu(yeni) : {}) });

  return (
    <div className="mt-2 rounded-xl border border-brand-200 bg-brand-50/50 p-2" data-testid="kimya-paneli">
      {veri.tur === "atom" && (() => {
        const kabuk = veri.kabuklar?.length ? veri.kabuklar : kabukDizilimi(veri.z, veri.yuk);
        return (
          <div className="flex flex-col gap-2" data-testid="kimya-atom">
            <div className="flex flex-wrap items-center gap-2">
              <span className={BASLIK}>Atom</span>
              <MetinGirdisi
                etiket="Element (sembol ya da no)"
                deger={ELEMENT_SEMBOLLERI[veri.z - 1] ?? ""}
                genislik="w-16"
                onOdak={tarihceyeKaydet}
                onDegis={(v) => {
                  const z = elementListesiOku(v);
                  if (z && z.length === 1) yaz({ ...veri, z: z[0], kabuklar: undefined, notron: undefined, baslik: veri.baslik === ELEMENT_SEMBOLLERI[veri.z - 1] ? ELEMENT_SEMBOLLERI[z[0] - 1] : veri.baslik });
                }}
              />
              <OndalikGirdisi etiket="Atom numarası" deger={veri.z} onOdak={tarihceyeKaydet} onDegis={(v) => v !== undefined && Number.isInteger(v) && v >= 1 && v <= 118 && yaz({ ...veri, z: v, kabuklar: undefined, notron: undefined })} />
              <span className={BASLIK}>Yük</span>
              {[-2, -1, 0, 1, 2, 3].map((y) => (
                <TogglePill key={y} aktif={veri.yuk === y} onClick={() => { tarihceyeKaydet(); yaz({ ...veri, yuk: y, kabuklar: undefined }); }}>{y > 0 ? `+${y}` : y < 0 ? `−${-y}` : "Nötr"}</TogglePill>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={BASLIK}>Çekirdekte yaz</span>
              {([["yuk", "+Z"], ["pn", "p ve n sayısı"], ["sembol", "Simge"]] as const).map(([id, ad]) => (
                <TogglePill key={id} aktif={veri.cekirdek === id} onClick={() => { tarihceyeKaydet(); yaz({ ...veri, cekirdek: id }); }}>{ad}</TogglePill>
              ))}
              <TogglePill aktif={veri.kabukAdi} onClick={() => { tarihceyeKaydet(); yaz({ ...veri, kabukAdi: !veri.kabukAdi }); }}>K, L, M adları</TogglePill>
              <MetinGirdisi etiket="Başlık" deger={veri.baslik ?? ""} genislik="w-20" onOdak={tarihceyeKaydet} onDegis={(v) => yaz({ ...veri, baslik: v })} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <MetinGirdisi
                etiket="Elle kabuk dizilimi"
                deger={veri.kabuklar?.join(", ") ?? ""}
                yerTutucu="2, 8, 7"
                genislik="w-24"
                onOdak={tarihceyeKaydet}
                onDegis={(v) => {
                  const n = v.split(/[,\s]+/).filter(Boolean).map(Number);
                  if (!v.trim()) yaz({ ...veri, kabuklar: undefined });
                  else if (n.length <= 7 && n.every((x) => Number.isInteger(x) && x >= 0 && x <= 32)) yaz({ ...veri, kabuklar: n });
                }}
              />
              <span className="text-[10px] text-slate-500" data-testid="kimya-dizilim">
                Dizilim: {kabuk.join(", ")} · değerlik elektronu {kabuk[kabuk.length - 1] ?? 0}. Boş bırakırsanız otomatik dolar.
              </span>
            </div>
          </div>
        );
      })()}

      {veri.tur === "molekul" && (
        <div className="flex flex-col gap-2" data-testid="kimya-molekul">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={BASLIK}>Molekül</span>
            {MOLEKULLER.filter((m) => (m.grup === "organik") === (molekulCoz(veri).grup === "organik")).map((m) => (
              <TogglePill key={m.id} aktif={veri.id === m.id} onClick={() => { tarihceyeKaydet(); yaz({ ...veri, id: m.id, ozel: undefined, zincir: undefined }, true); }}>{m.ad}</TogglePill>
            ))}
            <TogglePill aktif={veri.id === "ozel"} onClick={() => { tarihceyeKaydet(); yaz({ ...veri, id: "ozel", ozel: veri.ozel ?? OZEL_MOLEKUL_ORNEGI }, true); }}>Özel (yaz)</TogglePill>
            <TogglePill aktif={veri.id === "zincir"} onClick={() => { tarihceyeKaydet(); yaz({ ...veri, id: "zincir", zincir: veri.zincir ?? { n: 4, tur: "alkan", konum: 1 }, gosterim: "cizgi", geometri: true }, true); }}>Zincir (alkan/alken/alkin)</TogglePill>
          </div>
          {veri.id === "ozel" && veri.ozel && (() => {
            const o = veri.ozel;
            const sonuc = ozelMolekulOku(o.ad, o.atomlar, o.baglar);
            const hata = "hata" in sonuc ? sonuc.hata : null;
            const yazOzel = (yama: Partial<typeof o>) => yaz({ ...veri, ozel: { ...o, ...yama } });
            return (
              <div className="flex flex-col gap-1.5" data-testid="kimya-ozel">
                <MetinGirdisi etiket="Molekül adı" deger={o.ad} genislik="w-28" enCok={40} onOdak={tarihceyeKaydet} onDegis={(v) => yazOzel({ ad: v })} />
                <MetinGirdisi etiket="Atomlar" deger={o.atomlar} genislik="w-full" enCok={800} yerTutucu="O(0,-0.35,2); H(-0.85,0.45); H(0.85,0.45)" onOdak={tarihceyeKaydet} onDegis={(v) => yazOzel({ atomlar: v })} />
                <MetinGirdisi etiket="Bağlar" deger={o.baglar} genislik="w-full" enCok={400} yerTutucu="1-2; 1-3" onOdak={tarihceyeKaydet} onDegis={(v) => yazOzel({ baglar: v })} />
                <span className={`text-[10px] ${hata ? "text-red-600" : "text-slate-500"}`} role={hata ? "alert" : undefined}>
                  {hata ?? "Atom: simge(x, y, serbest çift sayısı) — y aşağı artar. Bağ: 1-2 tek, 1=2 çift, 1#2 üçlü (atom numaraları 1'den; sonuna k = kama, s = kesik). Simgede alt indis için H_2, yük için ^+."}
                </span>
              </div>
            );
          })()}
          {veri.id === "zincir" && veri.zincir && (() => {
            const z = veri.zincir;
            const yazZ = (yama: Partial<typeof z>) => yaz({ ...veri, zincir: { ...z, ...yama } }, true);
            return (
              <div className="flex flex-wrap items-center gap-1.5" data-testid="kimya-zincir-paneli">
                <span className={BASLIK}>Zincir</span>
                <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                  Karbon sayısı
                  <input type="number" aria-label="Karbon sayısı" min={2} max={12} value={z.n} onFocus={tarihceyeKaydet}
                    onChange={(e) => { const n = Math.round(Number(e.target.value)); if (n >= (z.halka ? 3 : 2) && n <= (z.halka ? 8 : 12)) yazZ({ n, konum: Math.min(z.konum, n - 1), yanGruplar: z.yanGruplar?.filter((y) => y.k <= n) }); }}
                    className="w-14 rounded-md border border-slate-300 bg-white px-1.5 py-1 text-[11px]" />
                </label>
                {([["alkan", "Alkan"], ["alken", "Alken"], ["alkin", "Alkin"]] as const).map(([id, ad]) => (
                  <TogglePill key={id} aktif={z.tur === id} onClick={() => { tarihceyeKaydet(); yazZ({ tur: id, ...(id !== "alkan" ? { halka: undefined, yanGruplar: undefined } : {}) }); }}>{ad}</TogglePill>
                ))}
                {z.tur !== "alkan" && (
                  <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                    Bağ konumu
                    <input type="number" aria-label="Bağ konumu" min={1} max={z.n - 1} value={z.konum} onFocus={tarihceyeKaydet}
                      onChange={(e) => { const k = Math.round(Number(e.target.value)); if (k >= 1 && k <= z.n - 1) yazZ({ konum: k }); }}
                      className="w-14 rounded-md border border-slate-300 bg-white px-1.5 py-1 text-[11px]" />
                  </label>
                )}
                <span className="text-[10px] text-slate-500">{zincirAdi(z.n, z.tur, z.konum)}</span>
                <OrganikYanGrupPaneli z={z} yazZ={(yama) => { tarihceyeKaydet(); yazZ(yama); }} />
              </div>
            );
          })()}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={BASLIK}>Gösterim</span>
            <TogglePill aktif={veri.gosterim === "cizgi"} onClick={() => { tarihceyeKaydet(); yaz({ ...veri, gosterim: "cizgi" }); }}>Bağ çizgisi</TogglePill>
            <TogglePill aktif={veri.gosterim === "lewis"} onClick={() => { tarihceyeKaydet(); yaz({ ...veri, gosterim: "lewis" }); }}>Lewis noktaları</TogglePill>
            <TogglePill aktif={veri.kismiYuk} onClick={() => { tarihceyeKaydet(); yaz({ ...veri, kismiYuk: !veri.kismiYuk }); }}>Kısmi yük (δ+ δ−)</TogglePill>
            <TogglePill aktif={veri.geometri} onClick={() => { tarihceyeKaydet(); yaz({ ...veri, geometri: !veri.geometri }); }}>Formül ve geometri yazısı</TogglePill>
            <MetinGirdisi etiket="Başlık" deger={veri.baslik ?? ""} genislik="w-24" onOdak={tarihceyeKaydet} onDegis={(v) => yaz({ ...veri, baslik: v })} />
          </div>
        </div>
      )}

      {veri.tur === "orbital" && (
        <div className="flex flex-col gap-2" data-testid="kimya-orbital">
          <div className="flex flex-wrap items-center gap-2">
            <span className={BASLIK}>Orbital</span>
            <MetinGirdisi
              etiket="Element (sembol ya da no)"
              deger={ELEMENT_SEMBOLLERI[veri.z - 1] ?? ""}
              genislik="w-16"
              onOdak={tarihceyeKaydet}
              onDegis={(v) => { const z = elementListesiOku(v); if (z && z.length === 1) yaz({ ...veri, z: z[0], baslik: veri.baslik === ELEMENT_SEMBOLLERI[veri.z - 1] ? ELEMENT_SEMBOLLERI[z[0] - 1] : veri.baslik }, true); }}
            />
            <OndalikGirdisi etiket="Atom numarası" deger={veri.z} onOdak={tarihceyeKaydet} onDegis={(v) => v !== undefined && Number.isInteger(v) && v >= 1 && v <= 118 && yaz({ ...veri, z: v }, true)} />
            <span className={BASLIK}>Yük</span>
            {[-2, -1, 0, 1, 2, 3].map((y) => (
              <TogglePill key={y} aktif={veri.yuk === y} onClick={() => { tarihceyeKaydet(); yaz({ ...veri, yuk: y }, true); }}>{y > 0 ? `+${y}` : y < 0 ? `−${-y}` : "Nötr"}</TogglePill>
            ))}
            <TogglePill aktif={veri.dizilim} onClick={() => { tarihceyeKaydet(); yaz({ ...veri, dizilim: !veri.dizilim }, true); }}>Altına dizilimi yaz</TogglePill>
            <MetinGirdisi etiket="Başlık" deger={veri.baslik ?? ""} genislik="w-20" onOdak={tarihceyeKaydet} onDegis={(v) => yaz({ ...veri, baslik: v })} />
          </div>
          <span className="text-[10px] text-slate-500" data-testid="kimya-orbital-dizilim">
            Elektron sayısı {veri.z - veri.yuk}; dizilim {orbitalDizilimMetni(veri.z, veri.yuk).replace(/\^(\d+)/g, "($1)")}. Kutular Aufbau sırasıyla ve Hund kuralıyla (önce birer yukarı ok) kendiliğinden dolar.
          </span>
        </div>
      )}

      {veri.tur === "pil" && (
        <div className="flex flex-col gap-2" data-testid="kimya-pil">
          <div className="flex flex-wrap items-center gap-2">
            <span className={BASLIK}>Pil</span>
            <MetinGirdisi etiket="Anot elektrodu" deger={veri.anot} genislik="w-14" enCok={12} onOdak={tarihceyeKaydet} onDegis={(v) => yaz({ ...veri, anot: v })} />
            <MetinGirdisi etiket="Anot çözeltisi" deger={veri.anotCozelti} genislik="w-28" enCok={40} onOdak={tarihceyeKaydet} onDegis={(v) => yaz({ ...veri, anotCozelti: v })} />
            <MetinGirdisi etiket="Katot elektrodu" deger={veri.katot} genislik="w-14" enCok={12} onOdak={tarihceyeKaydet} onDegis={(v) => yaz({ ...veri, katot: v })} />
            <MetinGirdisi etiket="Katot çözeltisi" deger={veri.katotCozelti} genislik="w-28" enCok={40} onOdak={tarihceyeKaydet} onDegis={(v) => yaz({ ...veri, katotCozelti: v })} />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <TogglePill aktif={veri.voltmetre} onClick={() => { tarihceyeKaydet(); yaz({ ...veri, voltmetre: !veri.voltmetre }); }}>Voltmetre</TogglePill>
            <TogglePill aktif={veri.iyonlar} onClick={() => { tarihceyeKaydet(); yaz({ ...veri, iyonlar: !veri.iyonlar }); }}>İyon göçü okları</TogglePill>
            <MetinGirdisi etiket="Başlık" deger={veri.baslik ?? ""} genislik="w-28" onOdak={tarihceyeKaydet} onDegis={(v) => yaz({ ...veri, baslik: v })} />
            <span className="text-[10px] text-slate-500">Elektronlar anottan katota (tel üstünde e⁻ oku); çözelti yazısında alt indis için _ kullanın (ZnSO_4).</span>
          </div>
        </div>
      )}

      {veri.tur === "periyodik" && (
        <div className="flex flex-col gap-2" data-testid="kimya-periyodik">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={BASLIK}>Bölge</span>
            {([["tum", "Tüm tablo"], ["ilk20", "İlk 20"], ["ilk3", "İlk 3 periyot"], ["ana", "Ana gruplar"]] as const).map(([id, ad]) => (
              <TogglePill key={id} aktif={veri.bolge === id} onClick={() => { tarihceyeKaydet(); yaz({ ...veri, bolge: id }, true); }}>{ad}</TogglePill>
            ))}
            <span className={BASLIK}>Hücrede</span>
            {([["sembol", "Simge"], ["sembolNo", "Simge + no"], ["tam", "+ kütle"]] as const).map(([id, ad]) => (
              <TogglePill key={id} aktif={veri.goster === id} onClick={() => { tarihceyeKaydet(); yaz({ ...veri, goster: id }); }}>{ad}</TogglePill>
            ))}
            <TogglePill aktif={veri.grupNo} onClick={() => { tarihceyeKaydet(); yaz({ ...veri, grupNo: !veri.grupNo }); }}>Grup/periyot numaraları</TogglePill>
          </div>
          <div className="flex flex-wrap gap-2">
            <ListeKutusu etiket="Boyalı elementler" deger={veri.boyali} ornek="O, S, 11-13" onOdak={tarihceyeKaydet} onYaz={(z) => yaz({ ...veri, boyali: z })} />
            <ListeKutusu etiket="Simgesi ? olanlar" deger={veri.soru} ornek="Na, Cl" onOdak={tarihceyeKaydet} onYaz={(z) => yaz({ ...veri, soru: z })} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <MetinGirdisi etiket="Başlık" deger={veri.baslik ?? ""} genislik="w-28" onOdak={tarihceyeKaydet} onDegis={(v) => yaz({ ...veri, baslik: v })} />
            <span className="text-[10px] text-slate-500">Kutuyu büyüterek hücreleri büyütebilirsiniz.</span>
          </div>
        </div>
      )}
    </div>
  );
}

type ZincirTam = NonNullable<Extract<KimyaVerisi, { tur: "molekul" }>["zincir"]>;

/**
 * Sikloalkan (halka) ve ana zincire yan grup bağlama. Ad, çizilen iskeletten
 * IUPAC kurallarıyla hesaplanır (en uzun zincir yeniden seçilir): öğretmen
 * bütanın 2. karbonuna −C₂H₅ eklerse ad "3-metilpentan" olur.
 */
export function OrganikYanGrupPaneli({ z, yazZ }: { z: ZincirTam; yazZ: (yama: Partial<ZincirTam>) => void }) {
  const [yeni, setYeni] = useState<{ k: number; g: OrganikYanGrup }>({ k: Math.min(2, z.n), g: "CH3" });
  const yanlar = z.yanGruplar ?? [];
  const sonuc = organikAdVeFormul(z);
  const ekle = () => {
    const aday = { ...z, tur: "alkan" as const, yanGruplar: [...yanlar, { k: Math.min(yeni.k, z.n), g: yeni.g }] };
    const r = organikAdVeFormul(aday);
    if ("hata" in r) return;
    yazZ({ tur: "alkan", yanGruplar: aday.yanGruplar });
  };
  const ekleHata = (() => {
    const r = organikAdVeFormul({ ...z, tur: "alkan", yanGruplar: [...yanlar, { k: Math.min(yeni.k, z.n), g: yeni.g }] });
    return "hata" in r ? r.hata : yanlar.length >= 8 ? "En çok 8 yan grup" : null;
  })();
  return (
    <div className="flex w-full flex-col gap-1.5 border-t border-brand-100 pt-1.5" data-testid="kimya-yan-grup">
      <div className="flex flex-wrap items-center gap-1.5">
        <TogglePill aktif={!!z.halka} onClick={() => {
          const halka = !z.halka;
          const n = halka ? Math.min(8, Math.max(3, z.n)) : z.n;
          yazZ({ halka, n, tur: "alkan", yanGruplar: yanlar.filter((y) => y.k <= n) });
        }}>Halka (sikloalkan)</TogglePill>
        <span className={BASLIK}>Yan grup</span>
        <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
          Karbon
          <select aria-label="Yan grubun karbonu" value={Math.min(yeni.k, z.n)} onChange={(e) => setYeni({ ...yeni, k: Number(e.target.value) })} className="rounded-md border border-slate-300 bg-white px-1 py-1 text-[11px]">
            {Array.from({ length: z.n }, (_, i) => <option key={i} value={i + 1}>C{i + 1}</option>)}
          </select>
        </label>
        <select aria-label="Yan grup" value={yeni.g} onChange={(e) => setYeni({ ...yeni, g: e.target.value as OrganikYanGrup })} className="rounded-md border border-slate-300 bg-white px-1 py-1 text-[11px]">
          {ORGANIK_YAN_GRUPLAR.map((t) => <option key={t.g} value={t.g}>{t.yazi} ({t.ad})</option>)}
        </select>
        <button type="button" disabled={!!ekleHata} title={ekleHata ?? "Seçili karbona bağla"} onClick={ekle}
          className="rounded-md border border-brand-300 bg-white px-2 py-1 text-[11px] font-bold text-brand-700 hover:bg-brand-50 disabled:opacity-40">+ Bağla</button>
      </div>
      {yanlar.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {yanlar.map((y, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] text-slate-700">
              C{y.k}: {ORGANIK_YAN_GRUPLAR.find((t) => t.g === y.g)?.yazi}
              <button type="button" aria-label={`C${y.k} yan grubunu sil`} onClick={() => yazZ({ yanGruplar: yanlar.filter((_, j) => j !== i) })} className="text-rose-500 hover:text-rose-700">×</button>
            </span>
          ))}
        </div>
      )}
      <span className="text-[11px] text-slate-600" data-testid="organik-ad">
        {"hata" in sonuc ? <span className="text-rose-600">{sonuc.hata}</span> : <>IUPAC adı: <b>{sonuc.ad}</b> · Kapalı formül: <b>{sonuc.formul}</b></>}
      </span>
      {(z.halka || yanlar.length > 0) && z.tur !== "alkan" && <span className="text-[10px] text-slate-500">Halka ve yan gruplar alkan zincirinde kullanılır.</span>}
      <span className="text-[10px] text-slate-500">Ad, çizilen iskeletten hesaplanır: en uzun zincir ve en küçük numaralar kendiliğinden seçilir (ör. bütanın C2'sine −C₂H₅ → 3-metilpentan).</span>
    </div>
  );
}
