// Görsel mini tablo: "0,0; 4,20" gibi ; ve : yazımı yerine satır satır kutular.
//
// Her satır [sütun kutuları…] [Sil]; altında [+ Satır ekle]. Kullanıldığı yerler: grafik
// noktaları, adlı noktalar, enerji düzeyleri/geçişleri, olasılık ağacı, fonksiyon şeması
// elemanları. Ortak davranış:
//  - Tab ile hücreler arasında doğal sırayla gezilir; Enter alttaki satıra geçer, son satırda
//    yeni satır açar; ↑/↓ aynı sütunda satır değiştirir.
//  - Sayı sütunları virgül ya da nokta ondalık, "−" eksi kabul eder; okunamayan hücre kırmızı
//    çerçeve + `aria-invalid` + altta okunur neden ("2. satır, y: sayı yazın").
//  - Tablo YALNIZ tüm hücreler geçerliyken `onDegis` çağırır: yazarken yarım değer ("-", "2,")
//    şekli bozmaz, önceki geçerli şekil korunur.
//  - Excel'den çok satırlı / sekmeli yapıştırma hücreleri doldurur (satır sınırına kadar).
//  - Satır sınırı (enAz / enCok): Sil ve + düğmeleri sınırda devre dışı.
// Eski metin yazımı kaybolmasın diye `MetinOlarakYapistir` katlanır alanı ayrıca verilir.

import { useEffect, useRef, useState } from "react";

export type MiniTabloSutunu = {
  /** Sütun başlığı ("x", "Ad", "Enerji (eV)"). */
  baslik: string;
  /** Başlığın altında küçük açıklama (eksen adı: "t (s)"). */
  aciklama?: string;
  tur: "sayi" | "metin" | "secim";
  yerTutucu?: string;
  /** Tailwind genişlik sınıfı (varsayılan sayı w-16, metin w-20). */
  genislik?: string;
  /** Metin sütunu en çok karakter. */
  enCok?: number;
  /** Boş bırakılabilir mi? (varsayılan: sayı hayır, metin evet) */
  bosOlabilir?: boolean;
  min?: number;
  max?: number;
  tamSayi?: boolean;
  /** Metinde yasak karakterler (ör. /[;:\n]/): yazımla çakışan ayırıcılar. */
  yasak?: RegExp;
  yasakAciklama?: string;
  secenekler?: { deger: string; ad: string }[];
};

export type MiniTabloOlayi = { tur: "duzenle" } | { tur: "ekle"; index: number } | { tur: "sil"; index: number } | { tur: "yapistir" };

/** "−2,5" → −2.5; okunamazsa null. */
export function miniSayi(metin: string): number | null {
  const t = metin.trim().replace(/[−–]/g, "-").replace(",", ".");
  if (!t || !/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Sayıyı hücre yazısına: 2.5 → "2,5", −3 → "-3". */
export const miniSayiYaz = (n: number) => String(Math.round(n * 1e6) / 1e6).replace(".", ",");

function hucreHatasi(s: MiniTabloSutunu, deger: string): string | null {
  const t = deger.trim();
  const bosOlur = s.bosOlabilir ?? s.tur !== "sayi";
  if (!t) return bosOlur ? null : "boş bırakılamaz";
  if (s.tur === "sayi") {
    const n = miniSayi(t);
    if (n === null) return "sayı yazın (ör. 2,5)";
    if (s.tamSayi && !Number.isInteger(n)) return "tam sayı yazın";
    if (s.min !== undefined && n < s.min) return `en az ${miniSayiYaz(s.min)}`;
    if (s.max !== undefined && n > s.max) return `en çok ${miniSayiYaz(s.max)}`;
    return null;
  }
  if (s.tur === "secim") return s.secenekler?.some((o) => o.deger === deger) ? null : "seçin";
  if (s.enCok !== undefined && deger.length > s.enCok) return `en çok ${s.enCok} karakter`;
  if (s.yasak && s.yasak.test(deger)) return s.yasakAciklama ?? "geçersiz karakter";
  return null;
}

type Taslak = { id: number; hucre: string[] };

export function MiniTablo({
  etiket, sutunlar, satirlar, onDegis, onOdak, enAz = 0, enCok = 20, yeniSatir, satirDogrula, tabloDogrula,
  satirGirintisi, ipucu, testId, ekleYazisi = "+ Satır ekle",
}: {
  /** Tablonun erişilebilir adı ("Grafik noktaları tablosu"). Hücre adları bundan türetilir. */
  etiket: string;
  sutunlar: MiniTabloSutunu[];
  /** Dış (kaydedilmiş) değerlerin hücre yazıları. */
  satirlar: string[][];
  /** Yalnız tablo baştan sona geçerliyken çağrılır. */
  onDegis: (satirlar: string[][], olay: MiniTabloOlayi) => void;
  /** Düzenleme başlarken (geri al kaydı için). */
  onOdak?: () => void;
  enAz?: number;
  enCok?: number;
  yeniSatir?: (mevcut: string[][]) => string[];
  satirDogrula?: (satir: string[], i: number, tum: string[][]) => string | null;
  tabloDogrula?: (satirlar: string[][]) => string | null;
  /** Satırın görsel girintisi (ağaç aşaması gibi), 0–3. */
  satirGirintisi?: (satir: string[]) => number;
  ipucu?: string;
  testId?: string;
  ekleYazisi?: string;
}) {
  const sayac = useRef(0);
  const yeniId = () => (sayac.current += 1);
  /** Dış değerden taslak; mevcut satır kimlikleri sırayla korunur (hücreler yeniden kurulmaz, odak kaybolmaz). */
  const kur = (s: string[][], onceki: Taslak[] = []): Taslak[] => s.map((h, i) => ({ id: onceki[i]?.id ?? yeniId(), hucre: sutunlar.map((_, j) => h[j] ?? "") }));
  const [taslak, setTaslak] = useState<Taslak[]>(() => kur(satirlar));
  const odakta = useRef(false);
  const kutuRef = useRef<HTMLDivElement>(null);
  const hucreRef = useRef(new Map<string, HTMLInputElement | HTMLSelectElement>());
  const [bekleyenOdak, setBekleyenOdak] = useState<{ id: number; sutun: number } | null>(null);
  const disAnahtar = JSON.stringify(satirlar);

  // Dış veri değişince (şablon, geri al, metin yapıştırma) ve kullanıcı tabloda değilken eşitle.
  useEffect(() => {
    if (!odakta.current) setTaslak((o) => kur(satirlar, o));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disAnahtar]);

  useEffect(() => {
    if (!bekleyenOdak) return;
    hucreRef.current.get(`${bekleyenOdak.id}-${bekleyenOdak.sutun}`)?.focus();
    setBekleyenOdak(null);
  }, [bekleyenOdak]);

  const hucreler = taslak.map((t) => t.hucre);
  const hatalar = taslak.map((t) => t.hucre.map((d, j) => hucreHatasi(sutunlar[j], d)));
  const satirHatalari = taslak.map((t, i) => (hatalar[i].every((h) => !h) && satirDogrula ? satirDogrula(t.hucre, i, hucreler) : null));
  const ilkHucreHatasi = (() => {
    for (let i = 0; i < hatalar.length; i += 1) {
      const j = hatalar[i].findIndex(Boolean);
      if (j >= 0) return `${i + 1}. satır, ${sutunlar[j].baslik}: ${hatalar[i][j]}`;
      if (satirHatalari[i]) return `${i + 1}. satır: ${satirHatalari[i]}`;
    }
    return null;
  })();
  const sayiHatasi = taslak.length < enAz ? `En az ${enAz} satır gerekli` : null;
  const tabloHatasi = !ilkHucreHatasi && !sayiHatasi && tabloDogrula ? tabloDogrula(hucreler) : null;
  const hata = ilkHucreHatasi ?? sayiHatasi ?? tabloHatasi;

  const uygula = (yeni: Taslak[], olay: MiniTabloOlayi) => {
    setTaslak(yeni);
    const h = yeni.map((t) => t.hucre);
    if (h.length < enAz || h.length > enCok) return;
    for (const [i, sat] of h.entries()) {
      if (sat.some((d, j) => hucreHatasi(sutunlar[j], d))) return;
      if (satirDogrula?.(sat, i, h)) return;
    }
    if (tabloDogrula?.(h)) return;
    onDegis(h.map((sat) => sat.map((d, j) => (sutunlar[j].tur === "sayi" ? d.trim() : d))), olay);
  };

  const hucreYaz = (i: number, j: number, deger: string) =>
    uygula(taslak.map((t, k) => (k === i ? { ...t, hucre: t.hucre.map((d, m) => (m === j ? deger : d)) } : t)), { tur: "duzenle" });

  const satirEkle = (sonra: number, odakSutun = 0) => {
    if (taslak.length >= enCok) return;
    if (!odakta.current) onOdak?.();
    const bos = yeniSatir ? yeniSatir(hucreler.slice(0, sonra + 1)) : sutunlar.map((s) => (s.tur === "secim" ? s.secenekler?.[0]?.deger ?? "" : ""));
    const yeni = { id: yeniId(), hucre: sutunlar.map((_, j) => bos[j] ?? "") };
    const liste = [...taslak.slice(0, sonra + 1), yeni, ...taslak.slice(sonra + 1)];
    uygula(liste, { tur: "ekle", index: sonra + 1 });
    setBekleyenOdak({ id: yeni.id, sutun: odakSutun });
  };

  const satirSil = (i: number) => {
    if (taslak.length <= enAz) return;
    if (!odakta.current) onOdak?.();
    const sonraki = taslak[i + 1] ?? taslak[i - 1];
    uygula(taslak.filter((_, k) => k !== i), { tur: "sil", index: i });
    if (sonraki) setBekleyenOdak({ id: sonraki.id, sutun: 0 });
  };

  const tusla = (e: React.KeyboardEvent, i: number, j: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (i === taslak.length - 1) satirEkle(i, 0);
      else setBekleyenOdak({ id: taslak[i + 1].id, sutun: j });
    } else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && sutunlar[j].tur !== "secim") {
      const k = i + (e.key === "ArrowDown" ? 1 : -1);
      if (taslak[k]) { e.preventDefault(); setBekleyenOdak({ id: taslak[k].id, sutun: j }); }
    }
  };

  const yapistir = (e: React.ClipboardEvent, i: number, j: number) => {
    const metin = e.clipboardData.getData("text");
    if (!/[\t\n]/.test(metin.trim())) return; // tek değer: normal yapıştırma
    e.preventDefault();
    if (!odakta.current) onOdak?.();
    const parcalar = metin.replace(/\r/g, "").split("\n").filter((s) => s.trim()).map((s) => s.split("\t"));
    const yeni = taslak.map((t) => ({ ...t, hucre: [...t.hucre] }));
    parcalar.forEach((sat, di) => {
      const k = i + di;
      if (k >= enCok) return;
      if (!yeni[k]) yeni[k] = { id: yeniId(), hucre: sutunlar.map(() => "") };
      sat.forEach((d, dj) => { if (j + dj < sutunlar.length) yeni[k].hucre[j + dj] = d.trim(); });
    });
    uygula(yeni, { tur: "yapistir" });
  };

  return (
    <div
      ref={kutuRef}
      className="flex min-w-0 flex-col gap-1"
      data-testid={testId}
      onFocus={() => { if (!odakta.current) { odakta.current = true; onOdak?.(); } }}
      onBlur={(e) => {
        if (kutuRef.current && e.relatedTarget instanceof Node && kutuRef.current.contains(e.relatedTarget)) return;
        odakta.current = false;
        // Ayrılırken: dış (geçerli) değerle eşitle — yarım kalan hücre geri döner.
        setTaslak((o) => kur(satirlar, o));
      }}
    >
      <table className="w-max max-w-full border-separate border-spacing-x-1 border-spacing-y-0.5 text-[11px]" aria-label={etiket}>
        <thead>
          <tr>
            <th scope="col" className="w-5 text-right text-[10px] font-semibold text-slate-400"><span className="sr-only">Sıra</span></th>
            {sutunlar.map((s) => (
              <th key={s.baslik} scope="col" className="text-left align-bottom text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {s.baslik}
                {s.aciklama && <span className="ml-1 font-normal normal-case text-slate-400">{s.aciklama}</span>}
              </th>
            ))}
            <th scope="col"><span className="sr-only">Sil</span></th>
          </tr>
        </thead>
        <tbody>
          {taslak.map((t, i) => {
            const girinti = satirGirintisi?.(t.hucre) ?? 0;
            return (
              <tr key={t.id} data-testid="mini-tablo-satir">
                <td className="text-right text-[10px] text-slate-400">{i + 1}</td>
                {sutunlar.map((s, j) => {
                  const h = hatalar[i][j] ?? (j === 0 ? satirHatalari[i] : null);
                  const ad = `${etiket}: ${i + 1}. satır ${s.baslik}`;
                  const sinif = `${s.genislik ?? (s.tur === "sayi" ? "w-16" : "w-20")} rounded-md border bg-white px-1.5 py-1 text-[11px] ${h ? "border-red-400 bg-red-50" : "border-slate-300"}`;
                  const ref = (el: HTMLInputElement | HTMLSelectElement | null) => {
                    const anahtar = `${t.id}-${j}`;
                    if (el) hucreRef.current.set(anahtar, el); else hucreRef.current.delete(anahtar);
                  };
                  return (
                    <td key={j} style={j === 0 && girinti ? { paddingLeft: girinti * 14 } : undefined}>
                      {s.tur === "secim" ? (
                        <select
                          ref={ref}
                          aria-label={ad}
                          aria-invalid={h ? true : undefined}
                          value={t.hucre[j]}
                          onChange={(e) => hucreYaz(i, j, e.target.value)}
                          onKeyDown={(e) => tusla(e, i, j)}
                          className={sinif}
                        >
                          {s.secenekler?.map((o) => <option key={o.deger} value={o.deger}>{o.ad}</option>)}
                        </select>
                      ) : (
                        <input
                          ref={ref}
                          aria-label={ad}
                          aria-invalid={h ? true : undefined}
                          title={h ?? undefined}
                          inputMode={s.tur === "sayi" ? "decimal" : undefined}
                          value={t.hucre[j]}
                          placeholder={s.yerTutucu}
                          maxLength={s.tur === "metin" && s.enCok ? s.enCok : undefined}
                          onChange={(e) => hucreYaz(i, j, e.target.value)}
                          onKeyDown={(e) => tusla(e, i, j)}
                          onPaste={(e) => yapistir(e, i, j)}
                          className={sinif}
                        />
                      )}
                    </td>
                  );
                })}
                <td>
                  <button
                    type="button"
                    aria-label={`${etiket}: ${i + 1}. satırı sil`}
                    title="Satırı sil"
                    disabled={taslak.length <= enAz}
                    onClick={() => satirSil(i)}
                    className="rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Sil
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={taslak.length >= enCok}
          onClick={() => satirEkle(taslak.length - 1, 0)}
          className="rounded-md border border-brand-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-40"
        >
          {ekleYazisi}
        </button>
        <span className="text-[10px] text-slate-400">{taslak.length}/{enCok}</span>
        {ipucu && !hata && <span className="text-[10px] text-slate-500">{ipucu}</span>}
      </div>
      {hata && <span className="text-[10px] text-red-600" role="alert" data-testid="mini-tablo-hata">{hata}</span>}
    </div>
  );
}

/** Eski metin yazımı için katlanır alan ("Metin olarak yapıştır"). İçerik DOM'da kalır. */
export function MetinOlarakYapistir({ children, ozet = "Metin olarak yaz / yapıştır" }: { children: React.ReactNode; ozet?: string }) {
  return (
    <details className="group rounded-md border border-dashed border-slate-300 bg-white/60 px-2 py-1" data-testid="metin-olarak-yapistir">
      <summary className="cursor-pointer select-none text-[10px] font-semibold text-slate-500 hover:text-brand-700">{ozet}</summary>
      <div className="mt-1 flex flex-col gap-1">{children}</div>
    </details>
  );
}
