// Soru Havuzundan SEÇME modalı — Sınav Oluşturucu'nun "Soru ekle" menüsünden
// açılır, öğretmen ekran değiştirmeden havuzdan soru alır.
//
// NEDEN burada, ders-kitabi altında: havuz verisi (kırpmalar, kitaplar,
// önizlemeler) bu modülün. Sınav Oluşturucu'nun `queries.ts`'imizi çağırması
// CLAUDE.md'ye aykırı olurdu; onun yerine ders-kitabi dışa bir BİLEŞEN veriyor
// ve veriye yalnız kendisi dokunuyor. (Aynı bilinçli istisna kalıbı
// odev/OdevCiktiScreen.tsx'te de açıklanmış.)
//
// NEDEN "sade seçici": Soru Havuzu ekranı 555 satır ve büyük kısmı YÖNETİM
// (silme, föye gönderme, kitapta gösterme, bilgi düzenleme). Buraya seçim
// dışındaki hiçbir eylem taşınmadı — taşınsaydı iki ekran arasında ikinci bir
// kopya doğardı ve §9.7'nin "aynı kusurun iki kopyası" tuzağına girerdi.
//
// Gönderme boru hattı YENİDEN YAZILMADI: `sinavAktariminiHazirla` aynen
// kullanılıyor, yani gömme, başarısızların ayıklanması, zarf/TTL ve kullanım
// geçmişi Soru Havuzu ekranındakiyle birebir aynı yoldan geçiyor.
import { useEffect, useMemo, useState } from "react";
import { FilePlus2, Loader2, Search, X } from "lucide-react";
import type { KirpmaKaydi, KitapKaydi } from "@shared/types";
import { kitaplariGetir, tumKirpmalar } from "../queries";
import { OnizlemeKutusu } from "./OnizlemeKutusu";
import { konuSecenekleriCikar, sinifSecenekleriCikar } from "../lib/rozetSecenekleri";
import { aktarimIptalHatasiMi, sinavAktariminiHazirla } from "../lib/sinavAktarimGonderici";
import { aramaEslesirMi } from "../lib/metinEslestirme";
import { iptalMesaji } from "../lib/iptalMesaji";
import type { KirpmaGommeIlerlemesi } from "../lib/kirpmaGom";

const SECIM_SINIRI = 60;

/** Paket parçaları (tam sayfa / sayfa aralığı) tek mantıksal soru sayılır;
 *  kartta bir kez görünür, seçilince parçaların HEPSİ gider. Havuz ekranındaki
 *  `havuzOgesiIdleri` ile aynı kural. */
type HavuzOgesi = {
  anahtar: string;
  temsil: KirpmaKaydi;
  idler: string[];
  parcaSayisi: number;
};

function havuzOgeleriniKur(kirpmalar: KirpmaKaydi[]): HavuzOgesi[] {
  const gruplar = new Map<string, KirpmaKaydi[]>();
  for (const kirpma of kirpmalar) {
    const anahtar = kirpma.paketId ?? kirpma.id;
    const mevcut = gruplar.get(anahtar);
    if (mevcut) mevcut.push(kirpma);
    else gruplar.set(anahtar, [kirpma]);
  }
  return Array.from(gruplar.entries()).map(([anahtar, parcalar]) => {
    const sirali = [...parcalar].sort((a, b) => (a.paketSira ?? 0) - (b.paketSira ?? 0));
    return {
      anahtar,
      temsil: sirali[0],
      idler: sirali.map((p) => p.id),
      parcaSayisi: sirali.length,
    };
  });
}

export function SoruSeciciModal({
  onKapat,
  onSecildi,
}: {
  onKapat: () => void;
  /** Zarf hazırlandı; çağıran taraf onu YERİNDE uygular (ekran değişmez). */
  onSecildi: (transferId: string) => void;
}) {
  const [kirpmalar, setKirpmalar] = useState<KirpmaKaydi[]>([]);
  const [kitaplar, setKitaplar] = useState<KitapKaydi[]>([]);
  const [arama, setArama] = useState("");
  const [kitapFiltre, setKitapFiltre] = useState("");
  const [sinifFiltre, setSinifFiltre] = useState("");
  const [konuFiltre, setKonuFiltre] = useState("");
  const [secili, setSecili] = useState<string[]>([]);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [ilerleme, setIlerleme] = useState<KirpmaGommeIlerlemesi | null>(null);
  const [hata, setHata] = useState("");

  useEffect(() => {
    try {
      setKirpmalar(tumKirpmalar());
      setKitaplar(kitaplariGetir());
    } catch (err) {
      setHata(err instanceof Error ? err.message : "Soru havuzu okunamadı.");
    }
  }, []);

  const kitapAdlari = useMemo(
    () => new Map(kitaplar.map((k) => [k.id, k.ad])),
    [kitaplar],
  );
  const sinifSecenekleri = useMemo(() => sinifSecenekleriCikar(kirpmalar), [kirpmalar]);
  const konuSecenekleri = useMemo(() => konuSecenekleriCikar(kirpmalar), [kirpmalar]);

  const ogeler = useMemo(() => {
    const suzulmus = kirpmalar.filter((k) => {
      if (kitapFiltre && k.kitapId !== kitapFiltre) return false;
      if (sinifFiltre && (k.sinif ?? "") !== sinifFiltre) return false;
      if (konuFiltre && (k.konu ?? "") !== konuFiltre) return false;
      return aramaEslesirMi([k.baslikTahmini, kitapAdlari.get(k.kitapId), k.sayfa], arama);
    });
    return havuzOgeleriniKur(suzulmus).sort(
      (a, b) => (a.temsil.eklenme < b.temsil.eklenme ? 1 : -1),
    );
  }, [kirpmalar, kitapFiltre, sinifFiltre, konuFiltre, arama, kitapAdlari]);

  const seciliSet = useMemo(() => new Set(secili), [secili]);
  const seciliOgeSayisi = ogeler.filter((o) => seciliSet.has(o.anahtar)).length;

  function secimiCevir(oge: HavuzOgesi) {
    setSecili((mevcut) =>
      mevcut.includes(oge.anahtar)
        ? mevcut.filter((a) => a !== oge.anahtar)
        : mevcut.length >= SECIM_SINIRI
          ? mevcut
          : [...mevcut, oge.anahtar],
    );
  }

  async function ekle() {
    if (gonderiliyor || secili.length === 0) return;
    setGonderiliyor(true);
    setHata("");
    try {
      // Seçim ANAHTAR bazlı; gönderime kırpma id'leri gider (paket parçaları dâhil).
      const anahtarlar = new Set(secili);
      const idler = ogeler.filter((o) => anahtarlar.has(o.anahtar)).flatMap((o) => o.idler);
      const sonuc = await sinavAktariminiHazirla(idler, "soru-havuzu", {
        onProgress: setIlerleme,
      });
      // Sözleşmede transferId opsiyonel (eski doğrudan-payload route state'i
      // için); bu yol her zaman yeni zarfı üretir, yoksa devam edemeyiz.
      const transferId = sonuc.routeState.transferId;
      if (!transferId) throw new Error("Aktarım zarfı kimliği üretilemedi.");
      onSecildi(transferId);
    } catch (err) {
      setHata(
        aktarimIptalHatasiMi(err)
          ? iptalMesaji("Hazırlama", "Soru seçiminiz")
          : err instanceof Error
            ? err.message
            : "Sorular eklenemedi.",
      );
    } finally {
      setGonderiliyor(false);
      setIlerleme(null);
    }
  }

  const SECIM_KUTU =
    "rounded-lg border px-2 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Soru Havuzundan soru seç"
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-slate-800">Soru Havuzundan ekle</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Seçtiğiniz sorular açık sınava eklenir. Havuzda kalmaya devam ederler.
            </p>
          </div>
          <button
            type="button"
            onClick={onKapat}
            aria-label="Kapat"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="shrink-0 border-b border-slate-100 px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-[200px] flex-1">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={arama}
                onChange={(e) => setArama(e.target.value)}
                placeholder="Başlık, kitap veya sayfa ara"
                aria-label="Soru ara"
                className={`w-full pl-8 ${SECIM_KUTU} border-slate-200`}
              />
            </label>
            <select
              value={kitapFiltre}
              onChange={(e) => setKitapFiltre(e.target.value)}
              aria-label="Kitap filtresi"
              className={`${SECIM_KUTU} border-slate-200`}
            >
              <option value="">Tüm kitaplar</option>
              {kitaplar.map((k) => (
                <option key={k.id} value={k.id}>{k.ad}</option>
              ))}
            </select>
            <select
              value={sinifFiltre}
              onChange={(e) => setSinifFiltre(e.target.value)}
              aria-label="Sınıf filtresi"
              className={`${SECIM_KUTU} border-slate-200`}
            >
              <option value="">Tüm sınıflar</option>
              {sinifSecenekleri.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={konuFiltre}
              onChange={(e) => setKonuFiltre(e.target.value)}
              aria-label="Konu filtresi"
              className={`${SECIM_KUTU} border-slate-200`}
            >
              <option value="">Tüm konular</option>
              {konuSecenekleri.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {ogeler.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              {kirpmalar.length === 0
                ? "Soru Havuzu boş. Kitap ve Föy Hazırla'dan kitap ekleyip soru kesebilirsiniz."
                : "Bu filtrelerle soru bulunamadı."}
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {ogeler.map((oge) => {
                const seciliMi = seciliSet.has(oge.anahtar);
                return (
                  <li key={oge.anahtar}>
                    <button
                      type="button"
                      onClick={() => secimiCevir(oge)}
                      aria-pressed={seciliMi}
                      className={`w-full overflow-hidden rounded-xl border-2 text-left transition ${
                        seciliMi
                          ? "border-brand-600 bg-brand-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <OnizlemeKutusu id={oge.temsil.id} className="h-28 w-full bg-slate-50 object-contain" />
                      <div className="border-t border-slate-100 p-2">
                        <p className="truncate text-[11px] font-bold text-slate-700">
                          {oge.temsil.baslikTahmini || `Sayfa ${oge.temsil.sayfa}`}
                        </p>
                        <p className="truncate text-[10px] text-slate-500">
                          {kitapAdlari.get(oge.temsil.kitapId) ?? "Kitap yok"} · s. {oge.temsil.sayfa}
                          {oge.parcaSayisi > 1 ? ` · ${oge.parcaSayisi} sayfa` : ""}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {hata && (
          <p role="alert" className="shrink-0 border-t border-rose-100 bg-rose-50 px-5 py-2.5 text-xs font-semibold text-rose-700">
            {hata}
          </p>
        )}

        <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-slate-200 px-5 py-3">
          <p className="min-w-0 flex-1 text-xs font-semibold text-slate-600">
            {secili.length === 0
              ? "Soru seçilmedi."
              : `${secili.length} soru seçildi${seciliOgeSayisi !== secili.length ? " (bir kısmı bu filtrenin dışında)" : ""}.`}
            {secili.length >= SECIM_SINIRI && (
              <span className="ml-1 text-amber-700">Tek seferde en fazla {SECIM_SINIRI} soru.</span>
            )}
            {ilerleme && (
              <span className="ml-1 font-normal text-slate-500">
                Hazırlanıyor: {ilerleme.tamamlanan}/{ilerleme.toplam}
              </span>
            )}
          </p>
          {secili.length > 0 && (
            <button
              type="button"
              onClick={() => setSecili([])}
              className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100"
            >
              Seçimi temizle
            </button>
          )}
          <button
            type="button"
            onClick={onKapat}
            className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={() => void ekle()}
            disabled={gonderiliyor || secili.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
          >
            {gonderiliyor ? <Loader2 size={15} className="animate-spin" /> : <FilePlus2 size={15} />}
            {gonderiliyor ? "Ekleniyor…" : "Sınava ekle"}
          </button>
        </div>
      </div>
    </div>
  );
}
