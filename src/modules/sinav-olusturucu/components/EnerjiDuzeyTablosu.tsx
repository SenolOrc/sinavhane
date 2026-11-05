// Enerji düzeyi diyagramının düzey ve geçiş girişi: "n=1:-13,6; n=2:-3,4" ve "3>1; 3>2:Hα"
// yazımı yerine görsel mini tablolar. Veri yine `ek.metin` / `ek.metin2` metninde saklanır
// (fizikEk.ts okuyucuları değişmedi; eski çizimler aynen açılır). Metin yazımı katlanır alanda.

import {
  ENERJI_VARSAYILAN_DUZEYLER,
  ENERJI_VARSAYILAN_GECISLER,
  enerjiDuzeyleriOku,
  enerjiGecisleriOku,
} from "../cizim/fizikEk";
import type { FizikEk } from "../cizim/tipler";
import { MetinGirdisi } from "./GrafikPaneli";
import { MetinOlarakYapistir, MiniTablo, type MiniTabloOlayi, miniSayi, miniSayiYaz } from "./MiniTablo";

type Duzey = { ad: string; e: number };
type Gecis = { bas: number; son: number; etiket: string };

export const enerjiDuzeyleriYaz = (d: Duzey[]) => d.map((x) => `${x.ad}:${miniSayiYaz(x.e)}`).join("; ");
export const enerjiGecisleriYaz = (g: Gecis[]) => g.map((x) => `${x.bas}>${x.son}${x.etiket ? `:${x.etiket}` : ""}`).join("; ");

/** Düzey silinince/eklenince geçişlerin 1 tabanlı düzey numaralarını kaydırır (silinen düzeyin geçişleri gider). */
export function gecisleriKaydir(g: Gecis[], olay: MiniTabloOlayi): Gecis[] {
  if (olay.tur === "sil") {
    const n = olay.index + 1;
    return g.filter((x) => x.bas !== n && x.son !== n).map((x) => ({ ...x, bas: x.bas > n ? x.bas - 1 : x.bas, son: x.son > n ? x.son - 1 : x.son }));
  }
  if (olay.tur === "ekle") {
    const n = olay.index + 1;
    return g.map((x) => ({ ...x, bas: x.bas >= n ? x.bas + 1 : x.bas, son: x.son >= n ? x.son + 1 : x.son }));
  }
  return g;
}

const YASAK = /[;\n]/;

export function EnerjiTablolari({ ek, ekYaz, tarihce }: { ek: FizikEk; ekYaz: (y: Partial<FizikEk>) => void; tarihce: () => void }) {
  const duzeyMetni = ek.metin ?? ENERJI_VARSAYILAN_DUZEYLER;
  const gecisMetni = ek.metin2 ?? ENERJI_VARSAYILAN_GECISLER;
  const d = enerjiDuzeyleriOku(duzeyMetni);
  const duzeyler = "duzeyler" in d ? d.duzeyler : [];
  const g = "duzeyler" in d ? enerjiGecisleriOku(gecisMetni, duzeyler.length) : null;
  const gecisler = g && "gecisler" in g ? g.gecisler : [];
  const secenekler = duzeyler.map((x, i) => ({ deger: String(i + 1), ad: `${i + 1}: ${x.ad}` }));
  return (
    <div className="flex flex-col gap-1.5" data-testid="enerji-tablolari">
      {"duzeyler" in d && (
        <MiniTablo
          etiket="Enerji düzeyleri"
          testId="enerji-duzey-tablosu"
          sutunlar={[
            { baslik: "Düzey adı", tur: "metin", enCok: 30, bosOlabilir: false, yerTutucu: "n=1", genislik: "w-24", yasak: YASAK, yasakAciklama: "; kullanmayın" },
            { baslik: "Enerji", aciklama: "eV", tur: "sayi", yerTutucu: "-13,6", genislik: "w-20", min: -1e6, max: 1e6 },
          ]}
          satirlar={duzeyler.map((x) => [x.ad, miniSayiYaz(x.e)])}
          enAz={2}
          enCok={10}
          yeniSatir={(m) => [`n=${m.length + 1}`, m.length ? m[m.length - 1][1] : "0"]}
          onOdak={tarihce}
          onDegis={(h, olay) => {
            const yeni = h.map(([ad, e]) => ({ ad: ad.trim(), e: miniSayi(e)! }));
            ekYaz({ metin: enerjiDuzeyleriYaz(yeni), metin2: enerjiGecisleriYaz(gecisleriKaydir(gecisler, olay)) });
          }}
          ipucu="Yazış sırasıyla 1, 2, 3… numaralanır."
        />
      )}
      {"duzeyler" in d && g && "gecisler" in g && (
        <MiniTablo
          etiket="Enerji geçişleri"
          testId="enerji-gecis-tablosu"
          sutunlar={[
            { baslik: "Başlangıç", tur: "secim", secenekler, genislik: "w-24" },
            { baslik: "Bitiş", tur: "secim", secenekler, genislik: "w-24" },
            { baslik: "Etiket", tur: "metin", enCok: 20, yerTutucu: "Hα", genislik: "w-16", yasak: YASAK, yasakAciklama: "; kullanmayın" },
          ]}
          satirlar={gecisler.map((x) => [String(x.bas), String(x.son), x.etiket])}
          enAz={0}
          enCok={12}
          yeniSatir={() => [String(Math.min(2, duzeyler.length)), "1", ""]}
          satirDogrula={(s) => (s[0] === s[1] ? "başlangıç ve bitiş farklı düzey olmalı" : null)}
          onOdak={tarihce}
          onDegis={(h) => ekYaz({ metin2: enerjiGecisleriYaz(h.map(([b, s, e]) => ({ bas: Number(b), son: Number(s), etiket: e.trim() }))) })}
          ekleYazisi="+ Geçiş ekle"
          ipucu="Üst → alt = ışıma (aşağı ok), alt → üst = soğurma (yukarı ok)."
        />
      )}
      <MetinOlarakYapistir>
        <MetinGirdisi etiket="Düzeyler (ad:eV)" deger={duzeyMetni} genislik="w-72" enCok={300} yerTutucu="n=1:-13,6; n=2:-3,4" onOdak={tarihce} onDegis={(v) => ekYaz({ metin: v })} />
        <MetinGirdisi etiket="Geçişler (üst>alt)" deger={gecisMetni} genislik="w-56" enCok={200} yerTutucu="3>1; 3>2:Hα" onOdak={tarihce} onDegis={(v) => ekYaz({ metin2: v })} />
      </MetinOlarakYapistir>
    </div>
  );
}
