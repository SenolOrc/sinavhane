import { useState } from "react";
import { Eye, EyeOff, WandSparkles } from "lucide-react";
import { gucluYedekParolasiUret, yedekParolaGucu } from "@/lib/yedekParola";
import { ModalAlt, ModalKabuk, OnayDugmesi, VazgecDugmesi } from "./ModalParcalari";

export function SinavParolaModal({ kip, onVazgec, onOnayla }: {
  kip: "kaydet" | "ac";
  onVazgec: () => void;
  onOnayla: (parola: string) => Promise<void>;
}) {
  const [parola, setParola] = useState("");
  const [tekrar, setTekrar] = useState("");
  const [gorunur, setGorunur] = useState(false);
  const [hata, setHata] = useState("");
  const [isleniyor, setIsleniyor] = useState(false);
  const guc = yedekParolaGucu(parola);

  async function tamamla() {
    if (kip === "kaydet" && [...parola].length < 12) { setHata("Sınav parolası en az 12 karakter olmalı."); return; }
    if (kip === "ac" && !parola) { setHata("Bu sınav dosyası için parola gerekli."); return; }
    if (kip === "kaydet" && parola !== tekrar) { setHata("Parolalar eşleşmiyor."); return; }
    setIsleniyor(true); setHata("");
    try { await onOnayla(parola); } catch (err) { setHata(err instanceof Error ? err.message : "İşlem tamamlanamadı."); }
    finally { setIsleniyor(false); }
  }

  function uret() {
    try { const yeni = gucluYedekParolasiUret(); setParola(yeni); setTekrar(yeni); setGorunur(true); setHata(""); }
    catch (err) { setHata(err instanceof Error ? err.message : "Parola üretilemedi."); }
  }

  return <ModalKabuk baslik={kip === "kaydet" ? "Sınav dosyasını parola ile koru" : "Sınav dosyasının parolasını gir"} onClose={onVazgec} kapanabilir={!isleniyor}>
    <p className="text-xs leading-5 text-slate-600">
      {kip === "kaydet" ? "Dosya AES-256-GCM ile şifrelenir. Parola saklanmaz; unutulursa sınav açılamaz." : "Dosyanın sahibi tarafından belirlenen parolayı girin."}
    </p>
    {kip === "kaydet" && <button type="button" onClick={uret} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-brand-300 px-3 py-2 text-xs font-bold text-brand-700 hover:bg-brand-50"><WandSparkles size={14} /> Güçlü parola üret</button>}
    <label className="mt-3 block text-xs font-semibold text-slate-600">Parola
      <span className="relative mt-1 block">
        <input autoFocus type={gorunur ? "text" : "password"} autoComplete={kip === "kaydet" ? "new-password" : "current-password"} value={parola}
          onChange={(e) => { setParola(e.target.value); setHata(""); }} onKeyDown={(e) => { if (e.key === "Enter") void tamamla(); }}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm" />
        <button type="button" onClick={() => setGorunur((v) => !v)} aria-label={gorunur ? "Parolayı gizle" : "Parolayı göster"} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100">{gorunur ? <EyeOff size={16} /> : <Eye size={16} />}</button>
      </span>
    </label>
    {kip === "kaydet" && <>
      <label className="mt-2 block text-xs font-semibold text-slate-600">Parola tekrarı
        <input type={gorunur ? "text" : "password"} autoComplete="new-password" value={tekrar} onChange={(e) => { setTekrar(e.target.value); setHata(""); }} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </label>
      <p className={`mt-2 text-[11px] font-bold ${guc === "guclu" ? "text-emerald-700" : guc === "orta" ? "text-amber-700" : "text-red-700"}`}>
        {guc === "guclu" ? "Güçlü parola" : guc === "orta" ? "Uygun parola" : `${[...parola].length}/12 karakter`}
        {tekrar ? (parola === tekrar ? " · Parolalar eşleşiyor" : " · Parolalar eşleşmiyor") : ""}
      </p>
    </>}
    {hata && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{hata}</p>}
    <ModalAlt><VazgecDugmesi onClick={onVazgec} /><OnayDugmesi onClick={() => void tamamla()} disabled={isleniyor}>{isleniyor ? "İşleniyor…" : kip === "kaydet" ? "Şifrele ve kaydet" : "Dosyayı aç"}</OnayDugmesi></ModalAlt>
  </ModalKabuk>;
}
