import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { FileText, RotateCw, ScanText } from "lucide-react";
import { ModalAlt, ModalKabuk, OnayDugmesi, VazgecDugmesi } from "./ModalParcalari";
import { gorseliDondur, gorseliKirp, ocrGorseliHazirla, yerelTurkceOcr, type OcrKirpma } from "../ocr/yerelOcr";

const TUM_SAYFA: OcrKirpma = { x: 0, y: 0, genislik: 1, yukseklik: 1 };

export function GorseldenMetneModal({ onKapat, onAktar }: { onKapat: () => void; onAktar: (metin: string) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [gorsel, setGorsel] = useState("");
  const [dosyaAdi, setDosyaAdi] = useState("");
  const [mod, setMod] = useState<"duzyazi" | "siir">("duzyazi");
  const [metin, setMetin] = useState("");
  const [ilerleme, setIlerleme] = useState(0);
  const [durum, setDurum] = useState("Kaynak seçin");
  const [hata, setHata] = useState("");
  const [isleniyor, setIsleniyor] = useState(false);
  const [kirpma, setKirpma] = useState<OcrKirpma>(TUM_SAYFA);
  const secimBaslangici = useRef<{ x: number; y: number } | null>(null);

  async function dosyaSecildi(file?: File) {
    if (!file) return;
    setHata(""); setMetin(""); setDosyaAdi(file.name); setDurum("Kaynak hazırlanıyor…");
    try { setGorsel(await ocrGorseliHazirla(file)); setKirpma(TUM_SAYFA); setDurum("Taramaya hazır"); }
    catch (err) { setHata(err instanceof Error ? err.message : "Kaynak açılamadı."); setDurum("Kaynak açılamadı"); }
  }
  async function tara() {
    if (!gorsel || isleniyor) return;
    setIsleniyor(true); setHata(""); setIlerleme(0); setDurum("Türkçe OCR hazırlanıyor…");
    try {
      const kaynak = kirpma.genislik === 1 && kirpma.yukseklik === 1 ? gorsel : await gorseliKirp(gorsel, kirpma);
      const sonuc = await yerelTurkceOcr(kaynak, mod, ({ durum: d, oran }) => { setDurum(d); setIlerleme(Math.round(oran * 100)); });
      setMetin(sonuc.metin); setDurum(`Tamamlandı · güven %${Math.round(sonuc.guven)}`); setIlerleme(100);
    } catch (err) { setHata(err instanceof Error ? err.message : "Metin okunamadı."); setDurum("OCR başarısız"); }
    finally { setIsleniyor(false); }
  }
  function konum(e: ReactPointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) };
  }
  function secimBaslat(e: ReactPointerEvent<HTMLDivElement>) {
    if (isleniyor) return;
    const p = konum(e); secimBaslangici.current = p; e.currentTarget.setPointerCapture(e.pointerId);
    setKirpma({ x: p.x, y: p.y, genislik: 0.001, yukseklik: 0.001 });
  }
  function secimiDegistir(e: ReactPointerEvent<HTMLDivElement>) {
    const bas = secimBaslangici.current; if (!bas) return;
    const p = konum(e);
    setKirpma({ x: Math.min(bas.x, p.x), y: Math.min(bas.y, p.y), genislik: Math.max(0.001, Math.abs(p.x - bas.x)), yukseklik: Math.max(0.001, Math.abs(p.y - bas.y)) });
  }
  function secimiBitir() {
    secimBaslangici.current = null;
    if (kirpma.genislik < 0.02 || kirpma.yukseklik < 0.02) setKirpma(TUM_SAYFA);
  }
  return <ModalKabuk baslik="Görselden metne" onClose={onKapat} genislik="max-w-5xl">
    <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,application/pdf,.pdf" className="hidden" onChange={(e) => void dosyaSecildi(e.target.files?.[0])} />
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="mb-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"><FileText size={14}/> Görsel / PDF seç</button>
          <button type="button" disabled={!gorsel || isleniyor} onClick={() => void gorseliDondur(gorsel).then(setGorsel).catch((e) => setHata(e.message))} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-40"><RotateCw size={14}/> Döndür</button>
          <button type="button" disabled={!gorsel || isleniyor} onClick={() => setKirpma(TUM_SAYFA)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-40">Tüm sayfa</button>
        </div>
        {gorsel ? <><div className="relative mx-auto w-fit max-w-full touch-none select-none cursor-crosshair" onPointerDown={secimBaslat} onPointerMove={secimiDegistir} onPointerUp={secimiBitir} onPointerCancel={secimiBitir}>
          <img src={gorsel} alt="OCR kaynağı" draggable={false} className="block max-h-[420px] max-w-full rounded-lg"/>
          <div className="pointer-events-none absolute border-2 border-brand-500 bg-brand-400/15 shadow-[0_0_0_9999px_rgba(15,23,42,0.22)]" style={{ left: `${kirpma.x * 100}%`, top: `${kirpma.y * 100}%`, width: `${kirpma.genislik * 100}%`, height: `${kirpma.yukseklik * 100}%` }}/>
        </div><p className="mt-2 text-center text-[11px] font-semibold text-brand-600">Okunacak alanı fareyle çerçeveleyin.</p></> : <button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-72 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 text-sm font-semibold text-slate-400"><ScanText size={42}/> Fotoğraf veya PDF seçin</button>}
        {dosyaAdi && <p className="mt-2 truncate text-[11px] text-slate-400">{dosyaAdi} · PDF ise ilk sayfa okunur</p>}
      </section>
      <section className="rounded-xl border border-slate-200 p-3">
        <div className="mb-3 flex items-end gap-2">
          <label className="flex-1 text-xs font-semibold text-slate-600">Metin düzeni<select value={mod} onChange={(e) => setMod(e.target.value as typeof mod)} disabled={isleniyor} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"><option value="duzyazi">Düzyazı</option><option value="siir">Şiir / dizeler</option></select></label>
          <button type="button" onClick={() => void tara()} disabled={!gorsel || isleniyor} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"><ScanText size={14}/>{isleniyor ? `%${ilerleme}` : "Metni tara"}</button>
        </div>
        <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-brand-500 transition-all" style={{ width: `${ilerleme}%` }}/></div>
        <p className="mb-2 text-[11px] text-slate-400" aria-live="polite">{durum}</p>
        {hata && <p role="alert" className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{hata}</p>}
        <textarea value={metin} onChange={(e) => setMetin(e.target.value)} placeholder="Taranan metin burada görünecek; aktarmadan önce düzenleyebilirsiniz." className="min-h-[310px] w-full resize-y rounded-lg border border-slate-200 p-3 text-sm leading-relaxed outline-none focus:border-brand-400"/>
        <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700">OCR cihazınızda çalışır. Metin, siz onaylamadan sınava eklenmez.</p>
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold leading-relaxed text-amber-800">
          Bu özellik metin odaklıdır. Kesir, kök, üs ve benzeri karmaşık denklemler doğru tanınmayabilir; aktarmadan önce sonucu kontrol edin.
        </p>
      </section>
    </div>
    <ModalAlt><VazgecDugmesi onClick={onKapat}/><OnayDugmesi onClick={() => onAktar(metin)} disabled={!metin.trim() || isleniyor}>Metin Soru’ya aktar</OnayDugmesi></ModalAlt>
  </ModalKabuk>;
}
