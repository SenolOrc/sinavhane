// Sınav Oluşturucu'nun kendi modalları: yeni metin/görsel sorusu, taslak
// kurtarma, içe aktarma onayı, temizleme onayı ve kısayol yardımı.
//
// Çizim/denklem/PDF modalları buraya girmez — onlar kendi dosyalarında, çünkü
// her biri kendi belge modelini ve tuvalini taşıyor. Buradakiler ortak
// `ModalKabuk` üzerine kurulu ince formlardır.

import { useState } from "react";
import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import type { GorselTaslak, Madde, MetinTaslak, SoruOgesi } from "../types";

import { useDokunmatik } from "@/lib/dokunmatik";
import { AlanEtiket, KaydedilmemisUyarisi, ModalAlt, ModalKabuk, OnayDugmesi, TogglePill, VazgecDugmesi } from "./ModalParcalari";
import { useKapatmaOnayi } from "../hooks/useKapatmaOnayi";
import { govdeGorselMaxMm, htmlToText, metinKonumuYanYanaMi, sayiSinirla, yeniId } from "../utils";

import { RichTextEditor } from "./SinavZenginMetin";
import { MmInput } from "./SinavPanelParcalari";
import { MaddeSatiri } from "./SinavSoruPanel";
import { kisayol } from "../lib/kisayol";
import { sinavTaslakOzeti } from "../storage/taslakDosya";
export function MetinSoruModal({
  varsayilanBosluk,
  onClose,
  onSave,
  testModu,
  baslangicMetni = "",
}: {
  varsayilanBosluk: number;
  onClose: () => void;
  onSave: (taslak: MetinTaslak, devamMi: boolean) => void;
  /** Şık harfleri kâğıtla aynı alfabeden gelsin (test kipinde A–E). */
  testModu?: boolean;
  baslangicMetni?: string;
}) {
  const [html, setHtml] = useState(() => baslangicMetni
    .split(/\n{2,}/)
    .map((paragraf) => `<p>${paragraf.replace(/[&<>]/g, (karakter) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[karakter]!) .replace(/\n/g, "<br>")}</p>`)
    .join(""));
  const [bosluk, setBosluk] = useState(varsayilanBosluk);
  const [maddeler, setMaddeler] = useState<Madde[]>([]);
  const [editorSurumu, setEditorSurumu] = useState(0);
  const [eklendiMesaji, setEklendiMesaji] = useState("");
  const doluMu = htmlToText(html).length > 0;
  // Esc/dışarı tık yazılan metni sessizce atıyordu (2026-09 denetimi); diğer dört
  // modaldaki ortak kapatma onayına bağlandı.
  const kapatma = useKapatmaOnayi({ degisiklikVar: () => htmlToText(html).length > 0 || maddeler.length > 0, onKapat: onClose });

  const [odakMaddeId, setOdakMaddeId] = useState<string | null>(null);
  function maddeEkle() {
    const yeni = { id: yeniId(), metinHtml: "", puan: null, cevapSatir: 0 };
    setOdakMaddeId(yeni.id);
    setMaddeler((m) => [...m, yeni]);
  }

  function maddeGuncelle(id: string, patch: Partial<Madde>) {
    setMaddeler((m) =>
      m.map((madde) => (madde.id === id ? { ...madde, ...patch } : madde)),
    );
  }

  function maddeSil(id: string) {
    setMaddeler((m) => m.filter((madde) => madde.id !== id));
  }

  function maddeTasi(id: string, yon: "yukari" | "asagi") {
    setMaddeler((m) => {
      const index = m.findIndex((madde) => madde.id === id);
      if (index < 0) return m;
      const hedef = yon === "yukari" ? index - 1 : index + 1;
      if (hedef < 0 || hedef >= m.length) return m;
      const kopya = [...m];
      const [tasinan] = kopya.splice(index, 1);
      kopya.splice(hedef, 0, tasinan);
      return kopya;
    });
  }

  function kaydet(devamMi: boolean) {
    if (!doluMu) return;
    onSave({ html, punto: 10, boslukMm: bosluk, maddeler }, devamMi);
    if (devamMi) {
      setHtml("");
      setMaddeler([]);
      setEditorSurumu((s) => s + 1);
      setEklendiMesaji("Soru eklendi, yenisini yazabilirsiniz.");
      window.setTimeout(() => setEklendiMesaji(""), 2500);
    }
  }

  return (
    <ModalKabuk baslik="Metin Soru Ekle" onClose={kapatma.kapatIstendi} kapanabilir={!kapatma.onayAcik} genislik="max-w-3xl">
      <RichTextEditor
        key={editorSurumu}
        value={html}
        onChange={setHtml}
        placeholder="Soru kökünü yazın..."
        minHeight="220px"
        autoFocus
      />
      <div className="mx-auto mt-2 w-full max-w-[220px] rounded-xl border border-slate-200 bg-slate-50 p-2 text-center">
        <MmInput
          label="Sorudan sonraki boşluk"
          value={bosluk}
          onChange={(v) => setBosluk(sayiSinirla(v, 0, 80))}
          min={0}
          max={80}
        />
      </div>

      <div className="mt-3">
        <AlanEtiket>{testModu ? "Şıklar (A, B, C...)" : "Maddeler (a, b, c...)"}</AlanEtiket>
        {maddeler.length > 0 && (
          <div className="mt-1 space-y-2">
            {maddeler.map((madde, index) => (
              <MaddeSatiri
                key={madde.id}
                madde={madde}
                index={index}
                testModu={testModu}
                odakla={madde.id === odakMaddeId}
                onChange={(patch) => maddeGuncelle(madde.id, patch)}
                onSil={() => maddeSil(madde.id)}
                onYukari={
                  index > 0 ? () => maddeTasi(madde.id, "yukari") : undefined
                }
                onAsagi={
                  index < maddeler.length - 1
                    ? () => maddeTasi(madde.id, "asagi")
                    : undefined
                }
              />
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={maddeEkle}
          className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          <Plus size={13} /> Madde ekle
        </button>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
        Madde puanı, cevap satırı ve kolon sayısı gibi ince ayarlar soru
        eklendikten sonra soru listesindeki düzenleme panelinden verilir.
      </p>
      {eklendiMesaji && (
        <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
          {eklendiMesaji}
        </p>
      )}
      <ModalAlt>
        <VazgecDugmesi onClick={onClose} etiket="Kapat" />
        <button
          type="button"
          onClick={() => kaydet(true)}
          disabled={!doluMu}
          className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Kaydet ve Yeni
        </button>
        <button
          type="button"
          onClick={() => kaydet(false)}
          disabled={!doluMu}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Kaydet
        </button>
      </ModalAlt>
      {kapatma.onayAcik && (
        <KaydedilmemisUyarisi
          baslik="Yazdığınız soru eklenmedi"
          aciklama="Soru metni henüz sınava eklenmedi. Kapatırsanız kaybolur."
          onVazgec={kapatma.vazgec}
          onAt={kapatma.onayla}
        />
      )}
    </ModalKabuk>
  );
}

export function GorselSoruModal({
  taslak,
  baglamGenislikMm,
  onChange,
  onClose,
  onSave,
}: {
  taslak: GorselTaslak;
  baglamGenislikMm: number;
  onChange: (taslak: GorselTaslak) => void;
  onClose: () => void;
  onSave: (taslak: GorselTaslak) => void;
}) {
  const yanYana = metinKonumuYanYanaMi(taslak.metinKonumu);
  const maxMm = Math.round(govdeGorselMaxMm(baglamGenislikMm, yanYana));
  const gorunenMm = Math.min(taslak.genislikMm, maxMm);
  const yuzde = Math.round((gorunenMm / maxMm) * 100);

  function metinKonumuSec(deger: GorselTaslak["metinKonumu"]) {
    const hedefMaxMm = Math.round(
      govdeGorselMaxMm(baglamGenislikMm, metinKonumuYanYanaMi(deger)),
    );
    onChange({
      ...taslak,
      metinKonumu: deger,
      genislikMm: Math.min(taslak.genislikMm, hedefMaxMm),
    });
  }

  return (
    <ModalKabuk baslik="Soru Görseli Ekle" onClose={onClose}>
      <div className="flex justify-center rounded-xl border border-slate-200 bg-slate-50 p-3">
        <img
          src={taslak.dataUrl}
          alt={taslak.dosyaAdi}
          className="max-h-56 rounded border border-slate-200 bg-white object-contain"
        />
      </div>
      <div className="mt-3">
        <AlanEtiket>Görsel boyu</AlanEtiket>
        <div className="mt-1 grid grid-cols-4 gap-1">
          {(
            [
              ["Küçük", 0.35, false],
              ["Orta", 0.6, false],
              ["Büyük", 1, false],
              ["Tam genişlik", 1, true],
            ] as const
          ).map(([ad, oran, tam]) => {
            const hedef = Math.round(maxMm * oran);
            return (
              <TogglePill
                key={ad}
                aktif={
                  tam
                    ? !!taslak.tamGenislik
                    : !taslak.tamGenislik &&
                      Math.abs(taslak.genislikMm - hedef) <= 2
                }
                onClick={() =>
                  onChange({ ...taslak, genislikMm: hedef, tamGenislik: tam })
                }
              >
                {ad}
              </TogglePill>
            );
          })}
        </div>
        <div className="mt-2 flex items-end gap-2">
          <div className="flex-1">
            <MmInput
              label="İnce ayar"
              value={taslak.genislikMm}
              onChange={(v) =>
                onChange({ ...taslak, genislikMm: sayiSinirla(v, 8, maxMm) })
              }
              min={8}
              max={maxMm}
            />
          </div>
          <span className="pb-2 text-[11px] font-semibold text-slate-500">
            alanın %{yuzde}'i
          </span>
        </div>
      </div>
      <div className="mt-3">
        <AlanEtiket>Metin konumu</AlanEtiket>
        <div className="mt-1 grid grid-cols-5 gap-1">
          {(
            [
              ["ust", "Üstte"],
              ["alt", "Altta"],
              ["sag", "Sağda"],
              ["sol", "Solda"],
              ["yok", "Yok"],
            ] as const
          ).map(([deger, etiket]) => (
            <TogglePill
              key={deger}
              aktif={taslak.metinKonumu === deger}
              onClick={() => metinKonumuSec(deger)}
            >
              {etiket}
            </TogglePill>
          ))}
        </div>
        {yanYana && (
          <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">
            Görsel yanına metin sığdırmak için genişlik ~{maxMm} mm ile
            sınırlandı.
          </p>
        )}
      </div>
      <div className="mt-2">
        <AlanEtiket>Görsel hizası</AlanEtiket>
        <div className="mt-1 grid grid-cols-3 gap-1">
          {(
            [
              ["sol", "Sol"],
              ["orta", "Orta"],
              ["sag", "Sağ"],
            ] as const
          ).map(([deger, etiket]) => (
            <TogglePill
              key={deger}
              aktif={taslak.hizalama === deger}
              onClick={() => onChange({ ...taslak, hizalama: deger })}
            >
              {etiket}
            </TogglePill>
          ))}
        </div>
      </div>
      {taslak.metinKonumu !== "yok" && (
        <div className="mt-3">
          <AlanEtiket>Soru açıklaması (isteğe bağlı)</AlanEtiket>
          <RichTextEditor
            value={taslak.altMetinHtml}
            onChange={(html) => onChange({ ...taslak, altMetinHtml: html })}
            placeholder="Örn: Yukarıdaki grafiğe göre soruları yanıtlayınız."
            minHeight="60px"
          />
        </div>
      )}
      <div className="mt-3">
        <MmInput
          label="Boşluk sonrası"
          value={taslak.boslukMm}
          onChange={(v) =>
            onChange({ ...taslak, boslukMm: sayiSinirla(v, 0, 80) })
          }
          min={0}
          max={80}
        />
      </div>
      <ModalAlt>
        <VazgecDugmesi onClick={onClose} />
        <OnayDugmesi onClick={() => onSave(taslak)}>Soruyu Ekle</OnayDugmesi>
      </ModalAlt>
    </ModalKabuk>
  );
}

export function TaslakKurtarmaModal({
  taslak,
  dersKitabiSoruSayisi = 0,
  onDevam,
  onYeni,
  onDosyayaKaydet,
}: {
  taslak: { kayitZamani: string; sorular: SoruOgesi[] };
  dersKitabiSoruSayisi?: number;
  onDevam: () => void;
  onYeni: () => void;
  /** "Yeni Başla" onayından çıkış yolu: bulunan taslağı .json olarak indirir. */
  onDosyayaKaydet?: () => void | Promise<void>;
}) {
  const tarih = new Date(taslak.kayitZamani).toLocaleString("tr-TR");
  // 2026-09 denetimi: burada eskiden "Yeni Başla → bulunan taslak KALICI olarak
  // silinecek, geri dönüşü yok" deniyordu — tek slot devrinden kalma metin. Kütüphane
  // geldiğinden beri yeni sınav eskisini SİLMİYOR (yeniTaslaklaBasla, Sınavlarım'da
  // duruyor). Korkutucu metin yüzünden öğretmen 9-B sorularını 9-A yazılısına ekliyordu.
  void onDosyayaKaydet;
  const gelen = dersKitabiSoruSayisi > 0;
  return (
    <ModalKabuk baslik={gelen ? `Gelen ${dersKitabiSoruSayisi} soruyu nereye ekleyelim?` : "Açık bir sınavınız var"} onClose={onDevam}>
      <p className="text-sm leading-relaxed text-slate-600">
        {tarih} tarihinde kaydedilmiş <b>{taslak.sorular.length} soruluk</b> bir sınav açık.
        {gelen
          ? " Gelen soruları bu sınavın sonuna ekleyebilir ya da yeni bir sınav başlatabilirsiniz."
          : " Kaldığınız yerden devam edebilir ya da yeni bir sınav başlatabilirsiniz."}
      </p>
      <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600 ring-1 ring-slate-200">
        Yeni sınav başlatmak açık sınavı <b>silmez</b>; o sınav Sınavlarım'da durur ve istediğiniz zaman açabilirsiniz.
      </p>
      <ModalAlt>
        <VazgecDugmesi onClick={gelen ? onDevam : onYeni} etiket={gelen ? "Açık sınavın sonuna ekle" : "Yeni sınav başlat"} />
        <OnayDugmesi onClick={gelen ? onYeni : onDevam}>{gelen ? "Yeni sınav başlat" : "Devam et"}</OnayDugmesi>
      </ModalAlt>
    </ModalKabuk>
  );
}

export function IceAktarOnayModal({
  taslak,
  mevcutSoruSayisi,
  dosyaAdi,
  dosyaBoyutu,
  dosyaTuru,
  hata,
  onVazgec,
  onOnayla,
}: {
  taslak: import("../types").SinavTaslagi;
  mevcutSoruSayisi: number;
  dosyaAdi: string;
  dosyaBoyutu: number;
  dosyaTuru: "parolali" | "eski-json";
  hata?: string;
  onVazgec: () => void;
  onOnayla: () => void;
}) {
  const ozet = sinavTaslakOzeti(taslak);
  const boyut = dosyaBoyutu < 1024 * 1024 ? `${Math.max(1, Math.round(dosyaBoyutu / 1024))} KB` : `${(dosyaBoyutu / 1024 / 1024).toFixed(1)} MB`;
  return (
    <ModalKabuk baslik="Sınav taslağını içe aktar" onClose={onVazgec} genislik="max-w-xl">
      <p className="text-xs leading-5 text-slate-600">Dosya doğrulandı. İçeriği kontrol edip açıkça onaylamadan sınava uygulanmaz.</p>
      <dl className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs sm:grid-cols-3">
        <div><dt className="text-slate-400">Ders</dt><dd className="mt-0.5 font-bold text-slate-700">{ozet.ders}</dd></div>
        <div><dt className="text-slate-400">Sınıf</dt><dd className="mt-0.5 font-bold text-slate-700">{ozet.sinif}</dd></div>
        <div><dt className="text-slate-400">Sınav</dt><dd className="mt-0.5 font-bold text-slate-700">{ozet.sinav}</dd></div>
        <div><dt className="text-slate-400">Soru / puan</dt><dd className="mt-0.5 font-bold text-slate-700">{ozet.soruSayisi} soru · {ozet.toplamPuan} puan</dd></div>
        <div><dt className="text-slate-400">Gömülü görsel</dt><dd className="mt-0.5 font-bold text-slate-700">{ozet.gorselSayisi}</dd></div>
        <div><dt className="text-slate-400">Kaynak sürümü</dt><dd className="mt-0.5 font-bold text-slate-700">{ozet.surum}</dd></div>
      </dl>
      <div className="mt-3 rounded-xl border border-slate-200 px-3 py-2 text-[11px] leading-5 text-slate-600">
        <p className="break-all"><b>Dosya:</b> {dosyaAdi} ({boyut})</p>
        <p><b>Tür:</b> {dosyaTuru === "parolali" ? "Parola korumalı .oa27sinav" : "Eski, parolasız JSON"}</p>
      </div>
      {dosyaTuru === "eski-json" && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-800 ring-1 ring-amber-200">Bu eski dosya şifreli değildir. İçeriği güvenlik doğrulamasından geçti; yine de yalnız güvendiğiniz kişiden aldıysanız devam edin.</p>}
      {mevcutSoruSayisi > 0 && <p className="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-xs font-semibold leading-5 text-brand-800 ring-1 ring-brand-200">Ekrandaki {mevcutSoruSayisi} soruluk çalışma kütüphanede korunacak. İçe aktarılan dosya ayrı ve yeni bir sınav olarak açılacak.</p>}
      {hata && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold leading-5 text-rose-700 ring-1 ring-rose-200">{hata}</p>}
      <ModalAlt>
        <VazgecDugmesi onClick={onVazgec} />
        <OnayDugmesi onClick={onOnayla} disabled={!!hata}>Yeni sınav olarak içe aktar</OnayDugmesi>
      </ModalAlt>
    </ModalKabuk>
  );
}

export function TemizleOnayModal({
  onVazgec,
  onOnayla,
}: {
  onVazgec: () => void;
  onOnayla: () => void;
}) {
  return (
    <ModalKabuk baslik="Taslağı temizle" onClose={onVazgec}>
      <p className="text-sm leading-relaxed text-slate-600">
        Bu oturumda eklediğiniz tüm sorular ve otomatik kaydedilen son taslak
        silinecek. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?
      </p>
      <ModalAlt>
        <VazgecDugmesi onClick={onVazgec} />
        <OnayDugmesi yikici onClick={onOnayla}>Evet, temizle</OnayDugmesi>
      </ModalAlt>
    </ModalKabuk>
  );
}

function Kisayol({ tuslar, children }: { tuslar: string[]; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2">
      <span className="flex shrink-0 gap-1 pt-0.5">
        {tuslar.map((tus) => (
          <kbd
            key={tus}
            className="rounded-md border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600 shadow-sm"
          >
            {tus}
          </kbd>
        ))}
      </span>
      <span className="text-xs leading-relaxed text-slate-600">{children}</span>
    </div>
  );
}

/** Kısayollar ve keşfedilmesi zor etkileşimler tek bir yerde. Bunlar daha önce
 *  hiçbir ekranda yazmıyordu; öğretmenin var olduklarını bilmesinin yolu yoktu. */
export function KisayolYardimModal({ onClose }: { onClose: () => void }) {
  // Dokunmatikte (telefon/tablet) klavye kısayolları yerine dokunma ipuçları
  // (T12/D12/Y15/Y4): Ctrl+V, Win+Shift+S, "sürükleyerek" orada yok.
  const dokunmatik = useDokunmatik();
  if (dokunmatik)
    return (
      <ModalKabuk baslik="İpuçları" onClose={onClose}>
        <div className="space-y-2">
          <Kisayol tuslar={["Soru ekle"]}>
            Görsel, metin, çizim ya da denklem sorusu ekler. Telefonunuzdaki bir
            fotoğrafı soru yapmak için <b>Soru ekle → Görsel yükle</b>.
          </Kisayol>
          <Kisayol tuslar={["↑", "↓"]}>
            Sol listedeki her sorunun yanındaki oklara dokunarak sırasını
            değiştirebilirsiniz.
          </Kisayol>
          <Kisayol tuslar={["⋯"]}>
            Sınavlarım, yeni sınav, ayarlar, yazdırma, dosyaya kaydetme ve geri
            al / ileri al bu menüdedir.
          </Kisayol>
          <Kisayol tuslar={["Tutamaç"]}>
            Kâğıttaki görselin sağ alt köşesindeki mavi tutamacı parmağınızla
            çekerek boyutunu ayarlayabilirsiniz.
          </Kisayol>
          <Kisayol tuslar={["Sığdır"]}>
            Kâğıt ekrana sığmazsa önizlemenin üstündeki <b>Sığdır</b> ya da −/+
            düğmelerini kullanın. Bu yalnız ekrandaki görünümü değiştirir, çıktıyı değil.
          </Kisayol>
        </div>
        <p className="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-[11px] leading-relaxed text-brand-700 ring-1 ring-brand-100">
          Çalışmanız 2 saniyede bir otomatik kaydedilir. Yine de önemli sınavları
          <b> ⋯ → Sınavı dosyaya kaydet</b> ile yedeklemeniz önerilir.
        </p>
        <ModalAlt>
          <OnayDugmesi onClick={onClose}>Anladım</OnayDugmesi>
        </ModalAlt>
      </ModalKabuk>
    );
  return (
    <ModalKabuk baslik="Kısayollar ve ipuçları" onClose={onClose}>
      <div className="space-y-2">
        <Kisayol tuslar={["Ctrl", "V"]}>
          Panodaki görseli doğrudan soru olarak yapıştırır. Ekran görüntüsü almak
          için Windows&apos;ta <b>Win+Shift+S</b>.
        </Kisayol>
        <Kisayol tuslar={["Ctrl", "Z"]}>
          Son 30 adımı geri alır: soru ekleme/silme/sıralama, başlık bilgileri ve
          sayfa düzeni ayarları dâhil.
        </Kisayol>
        <Kisayol tuslar={["Ctrl", "Shift", "Z"]}>
          Geri aldığınızı ileri alır. <b>{kisayol("Ctrl+Y")}</b> de aynı işi yapar.
        </Kisayol>
        <Kisayol tuslar={["Sürükle"]}>
          Sol listedeki soruları sürükleyerek sırasını değiştirebilirsiniz.
        </Kisayol>
        <Kisayol tuslar={["Tutamaç"]}>
          Kağıt üzerindeki görselin sağ alt köşesindeki mavi tutamacı sürükleyerek
          boyutunu ayarlayabilirsiniz.
        </Kisayol>
        <Kisayol tuslar={["Esc"]}>
          Açık pencereyi kapatır.
        </Kisayol>
      </div>
      <p className="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-[11px] leading-relaxed text-brand-700 ring-1 ring-brand-100">
        Çalışmanız 2 saniyede bir otomatik kaydedilir. Yine de önemli sınavları
        <b> Kaydet / Yükle → Dosyaya kaydet</b> ile yedeklemeniz önerilir.
      </p>
      <ModalAlt>
        <OnayDugmesi onClick={onClose}>Anladım</OnayDugmesi>
      </ModalAlt>
    </ModalKabuk>
  );
}
