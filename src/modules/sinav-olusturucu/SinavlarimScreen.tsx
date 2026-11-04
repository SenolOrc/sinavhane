// Sınav kütüphanesi aşama 2: "Sınavlarım" ekranı.
//
// Kütüphane (aşama 1) veritabanında çalışıyordu ama arayüzden GÖRÜNMÜYORDU —
// yeni sınav açılamıyor, aralarında geçilemiyor, arşivlenemiyordu (bkz. DEVAM.md
// §5). Bu ekran o eksik yüzü kapatır; app/Layout.tsx'teki "Sınavlarım"
// sekmesinden açılır.
//
// Liste İÇERİĞE HİÇ DOKUNMADAN çizilir: soru/sayfa sayısı ve boyut
// db.sinavlar'da önbelleklidir (bkz. lib/sinavKutuphanesi.ts metadataTuret).
// İçerik (IndexedDB) yalnız silme sırasında geri-al anlık görüntüsü için
// okunur — föy/Soru Havuzu listelerinin yaptığı "her kartı aç" hatası
// tekrarlanmaz (bkz. CLAUDE.md kural 4).
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  ArchiveRestore,
  CalendarClock,
  Check,
  Copy,
  FileText,
  FolderOpen,
  GraduationCap,
  ListChecks,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import type { SinavKaydi } from "@shared/types";
import { AZAMI_AKTIF_SINAV, sinavArsivle, sinavGeriYukle, sinavSil, sinavlarGetir } from "@/db/repo";
import { GeriButon } from "@/components/GeriButon";
import { BosDurum } from "@/components/BosDurum";
import {
  aktifSinavIdOku,
  aktifSinavIdYaz,
  otomatikAktifSinaviSec,
  sinavCogalt,
  sinavYenidenAdlandir,
  yeniSinavOlusturVeAktifYap,
} from "./lib/sinavKutuphanesi";
import { sinavIcerigiKaydet, sinavIcerigiOku, sinavIcerigiSil } from "./storage/taslakDepo";
import type { SinavTaslagi } from "./types";
import { geriAlBildirimiGoster } from "@/lib/geriAlKuyrugu";

function altBaslik(kayit: SinavKaydi): string {
  return [kayit.ders, kayit.sinifSeviyesi, kayit.donem, kayit.yaziliNo]
    .filter((parca): parca is string => !!parca?.trim())
    .join(" · ") || "Sınav bilgisi girilmedi";
}

export function SinavlarimScreen() {
  const nav = useNavigate();
  const [aktifId, setAktifId] = useState<string | null>(() => aktifSinavIdOku());
  const [aktifListe, setAktifListe] = useState<SinavKaydi[]>([]);
  const [arsivListe, setArsivListe] = useState<SinavKaydi[]>([]);

  const [duzenlenenId, setDuzenlenenId] = useState<string | null>(null);
  const [duzenlenenAd, setDuzenlenenAd] = useState("");
  const [adHatasi, setAdHatasi] = useState("");

  const [islemHatasi, setIslemHatasi] = useState("");
  const [yeniSinavIsleniyor, setYeniSinavIsleniyor] = useState(false);

  const [arsivAcik, setArsivAcik] = useState(false);

  function yenile() {
    const tumu = sinavlarGetir();
    const sirala = (liste: SinavKaydi[]) => [...liste].sort((a, b) => (a.guncelleme < b.guncelleme ? 1 : -1));
    setAktifListe(sirala(tumu.filter((s) => !s.arsiv)));
    setArsivListe(sirala(tumu.filter((s) => s.arsiv)));
  }

  useEffect(() => {
    yenile();
  }, []);

  function aktifIsaretciyiTasi(harictutulanId: string) {
    const yeni = otomatikAktifSinaviSec();
    const hedefId = yeni && yeni.id !== harictutulanId ? yeni.id : null;
    aktifSinavIdYaz(hedefId);
    setAktifId(hedefId);
  }

  function acVeGecisYap(kayit: SinavKaydi) {
    aktifSinavIdYaz(kayit.id);
    nav("/sinav-olusturucu");
  }

  async function yeniSinav() {
    setIslemHatasi("");
    setYeniSinavIsleniyor(true);
    try {
      await yeniSinavOlusturVeAktifYap();
      nav("/sinav-olusturucu");
    } catch (err) {
      setIslemHatasi(err instanceof Error ? err.message : "Yeni sınav oluşturulamadı.");
    } finally {
      setYeniSinavIsleniyor(false);
    }
  }

  async function cogalt(kayit: SinavKaydi) {
    setIslemHatasi("");
    try {
      const yeni = await sinavCogalt(kayit.id);
      setAktifId(yeni.id);
      yenile();
      duzenlemeyiAc(yeni); // kopyaya hemen ad verebilsin ("… (kopya)" yerine "B grubu")
    } catch (err) {
      setIslemHatasi(err instanceof Error ? err.message : "Sınav çoğaltılamadı.");
    }
  }

  function duzenlemeyiAc(kayit: SinavKaydi) {
    setDuzenlenenId(kayit.id);
    setDuzenlenenAd(kayit.ad);
    setAdHatasi("");
  }

  function adiKaydet(id: string) {
    try {
      sinavYenidenAdlandir(id, duzenlenenAd);
      setDuzenlenenId(null);
      setAdHatasi("");
      yenile();
    } catch (err) {
      setAdHatasi(err instanceof Error ? err.message : "Ad kaydedilemedi.");
    }
  }

  function arsivDegistir(kayit: SinavKaydi, arsivle: boolean) {
    setIslemHatasi("");
    try {
      sinavArsivle(kayit.id, arsivle);
      if (arsivle && kayit.id === aktifId) aktifIsaretciyiTasi(kayit.id);
      if (arsivle) setArsivAcik(true);
      yenile();
    } catch (err) {
      setIslemHatasi(err instanceof Error ? err.message : "İşlem tamamlanamadı.");
    }
  }

  async function sil(kayit: SinavKaydi) {
    setIslemHatasi("");
    let icerik: SinavTaslagi | null = null;
    let icerikSilindi = false;
    try {
      icerik = await sinavIcerigiOku(kayit.id);
      await sinavIcerigiSil(kayit.id);
      icerikSilindi = true;
      sinavSil(kayit.id);
      if (kayit.id === aktifId) aktifIsaretciyiTasi(kayit.id);
      yenile();
      // Bildirim lib/geriAlKuyrugu üzerinden GLOBAL gösterilir: öğretmen 10 sn
      // dolmadan başka bir ekrana geçse bile geri alma hakkı kaybolmaz (bu
      // ekranın kendi state'i unmount'ta silinirdi — önceki hâlin asıl açığı).
      geriAlBildirimiGoster({
        mesaj: `"${kayit.ad}" silindi.`,
        saniye: 10,
        geriAl: async () => {
          sinavGeriYukle(kayit);
          if (icerik) await sinavIcerigiKaydet(kayit.id, icerik);
          yenile();
        },
      });
    } catch (err) {
      let geriYuklemeHatasi = false;
      if (icerikSilindi && icerik) {
        try {
          await sinavIcerigiKaydet(kayit.id, icerik);
        } catch {
          geriYuklemeHatasi = true;
        }
      }
      const neden = err instanceof Error ? err.message : "Sınav silinemedi.";
      setIslemHatasi(geriYuklemeHatasi ? `${neden} Sınav içeriği de geri yüklenemedi.` : neden);
    }
  }

  const sinirDoldu = aktifListe.length >= AZAMI_AKTIF_SINAV;

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <GeriButon onClick={() => nav("/sinav-olusturucu")}>Sınav Hazırla'ya dön</GeriButon>

      <header className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
            <FolderOpen size={25} className="text-brand-600" /> Sınavlarım
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {aktifListe.length}/{AZAMI_AKTIF_SINAV} aktif sınav · Liste hızlı kalsın diye en fazla {AZAMI_AKTIF_SINAV} sınav açık tutulur; eskileri arşivleyebilirsiniz, arşivdekiler silinmez.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void yeniSinav()}
          disabled={yeniSinavIsleniyor || sinirDoldu}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={16} /> {yeniSinavIsleniyor ? "Oluşturuluyor…" : "Yeni sınav"}
        </button>
      </header>

      {sinirDoldu && (
        <p role="alert" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">
          Kütüphanede en fazla {AZAMI_AKTIF_SINAV} aktif sınav olabilir. Yeni bir sınav açmak için aşağıdan birini arşivleyin.
        </p>
      )}
      {islemHatasi && (
        <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
          {islemHatasi}
        </p>
      )}

      {!aktifListe.length ? (
        <BosDurum
          icon={FolderOpen}
          baslik="Henüz aktif sınav yok"
          aciklama="“Yeni sınav” ile boş bir sınav taslağı açabilirsiniz."
        />
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {aktifListe.map((kayit) => {
            const buAktif = kayit.id === aktifId;
            const buDuzenleniyor = duzenlenenId === kayit.id;
            return (
              <article
                key={kayit.id}
                className={`group flex flex-col rounded-2xl border bg-white p-4 shadow-sm transition ${
                  buAktif ? "border-brand-300 ring-1 ring-brand-100" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <FileText size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    {buDuzenleniyor ? (
                      <div>
                        <input
                          autoFocus
                          value={duzenlenenAd}
                          onChange={(e) => setDuzenlenenAd(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") adiKaydet(kayit.id);
                            if (e.key === "Escape") setDuzenlenenId(null);
                          }}
                          aria-label="Sınav adını düzenle"
                          className="w-full rounded-lg border border-brand-300 px-2 py-1 text-sm font-semibold text-slate-800 outline-none ring-2 ring-brand-100"
                        />
                        {adHatasi && <p role="alert" className="mt-1 text-[11px] font-semibold text-rose-600">{adHatasi}</p>}
                        <div className="mt-1.5 flex gap-2">
                          <button type="button" onClick={() => adiKaydet(kayit.id)} className="rounded-lg bg-brand-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-brand-700">Kaydet</button>
                          <button type="button" onClick={() => setDuzenlenenId(null)} className="rounded-lg px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100">Vazgeç</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-bold text-slate-800">{kayit.ad}</p>
                          {buAktif && (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                              <Check size={10} /> Aktif
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-400">{altBaslik(kayit)}</p>
                      </>
                    )}
                  </div>
                  {!buDuzenleniyor && (
                    <button
                      type="button"
                      aria-label="Sınavı yeniden adlandır"
                      onClick={() => duzenlemeyiAc(kayit)}
                      className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-1.5 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                  {/* Dosya boyutu ("54 KB") öğretmene bir şey söylemiyordu (Y18);
                      yerine soru ve sayfa sayısı tek başına duruyor. */}
                  <span className="col-span-2 flex items-center gap-1.5"><ListChecks size={13} className="shrink-0 text-slate-400" />{kayit.soruSayisi} soru · {kayit.sayfaSayisi} sayfa</span>
                  <span className="col-span-2 flex items-center gap-1.5"><CalendarClock size={13} className="shrink-0 text-slate-400" />{new Date(kayit.guncelleme).toLocaleString("tr-TR")}</span>
                </div>

                <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => acVeGecisYap(kayit)}
                    className="flex-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
                  >
                    {buAktif ? "Aç" : "Geçiş yap"}
                  </button>
                  <button type="button" aria-label="Sınavı çoğalt" title="Çoğalt (B grubu / başka şube için bağımsız kopya)" disabled={sinirDoldu} onClick={() => void cogalt(kayit)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30">
                    <Copy size={15} />
                  </button>
                  <button type="button" aria-label="Sınavı arşivle" title="Arşivle" onClick={() => arsivDegistir(kayit, true)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                    <Archive size={15} />
                  </button>
                  <button type="button" aria-label="Sınavı sil" title="Sil" onClick={() => void sil(kayit)} className="rounded-lg p-2 text-slate-300 hover:bg-rose-50 hover:text-rose-600">
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {arsivListe.length > 0 && (
        <section className="mt-7 rounded-2xl border border-amber-200 bg-amber-50/40 p-3">
          <details open={arsivAcik} onToggle={(e) => setArsivAcik(e.currentTarget.open)}>
            <summary className="cursor-pointer select-none text-sm font-bold text-amber-900">
              Arşivlenenler <span className="ml-1 rounded-full bg-white px-2 py-0.5 text-xs">{arsivListe.length}</span>
            </summary>
            <p className="mt-2 text-xs leading-5 text-amber-800">
              Arşivlenen sınavların içeriği silinmez, yalnız bu listeden gizlenir; aktif sınıra dahil edilmezler.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {arsivListe.map((kayit) => (
                <article key={kayit.id} className="rounded-xl border border-amber-100 bg-white p-3">
                  <p className="truncate text-sm font-bold text-slate-800">{kayit.ad}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{altBaslik(kayit)}</p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                    <GraduationCap size={12} className="shrink-0" />{kayit.soruSayisi} soru · {kayit.sayfaSayisi} sayfa
                  </p>
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => arsivDegistir(kayit, false)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-100 px-2.5 py-1.5 text-[11px] font-bold text-amber-900 hover:bg-amber-200"
                    >
                      <ArchiveRestore size={13} /> Arşivden çıkar
                    </button>
                    <button type="button" aria-label="Sınavı kalıcı sil" title="Kalıcı sil" onClick={() => void sil(kayit)} className="rounded-lg p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-600">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </details>
        </section>
      )}

    </div>
  );
}
