import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { AlertTriangle, Compass, Home, LoaderCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui";

export function EkranYukleniyor() {
  return (
    <div role="status" aria-live="polite" aria-label="Ekran yükleniyor" className="flex min-h-[260px] items-center justify-center p-8">
      <div className="rounded-2xl border border-slate-200 bg-white px-8 py-7 text-center shadow-sm">
        <LoaderCircle className="mx-auto animate-spin text-brand-600 motion-reduce:animate-none" size={28} aria-hidden="true" />
        <p className="mt-3 text-sm font-bold text-slate-700">Ekran hazırlanıyor</p>
        <p className="mt-1 text-xs text-slate-500">Verileriniz korunuyor; bu işlem kısa sürebilir.</p>
      </div>
    </div>
  );
}

/** OA88: rotalar aynı tipte sınırla sarıldığı için React sınırı yeniden kullanıyordu — bir ekran
 *  çökünce başka ekrana geçmek de hata kutusunu gösteriyordu. Adres değişince hata temizlenir
 *  (anahtar yerine: aynı ekranın kendi durumu korunur). */
export function EkranHataSiniri({ children }: { children: ReactNode }) {
  return <EkranHataSiniriCekirdek konum={useLocation().pathname}>{children}</EkranHataSiniriCekirdek>;
}

class EkranHataSiniriCekirdek extends Component<{ children: ReactNode; konum: string }, { hata: Error | null }> {
  state: { hata: Error | null } = { hata: null };

  static getDerivedStateFromError(hata: Error) {
    return { hata };
  }

  componentDidUpdate(onceki: { konum: string }) {
    if (this.state.hata && onceki.konum !== this.props.konum) this.setState({ hata: null });
  }

  componentDidCatch(hata: Error, bilgi: ErrorInfo) {
    console.error("Ekran oluşturulamadı", hata, bilgi);
  }

  render() {
    if (!this.state.hata) return this.props.children;
    return (
      <div role="alert" className="flex min-h-[360px] items-center justify-center p-6">
        <section className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600"><AlertTriangle size={24} aria-hidden="true" /></span>
          <h1 className="mt-4 text-lg font-bold text-slate-900">Bu ekran açılamadı</h1>
          <p className="mt-2 break-words text-sm leading-6 text-slate-600">Çalışmanız silinmedi. Ekranı yeniden yükleyerek güvenle tekrar deneyebilir ya da ana sayfaya dönebilirsiniz.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button variant="primary" onClick={() => window.location.reload()}><RotateCcw size={16} aria-hidden="true" /> Ekranı yeniden yükle</Button>
            <Link to="/"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
              <Home size={16} aria-hidden="true" /> Ana sayfaya dön
            </Link>
          </div>
        </section>
      </div>
    );
  }
}

/** Geçersiz/var olmayan rota (404). Router'ın markasız İngilizce varsayılan
 *  hata sayfası ("Hey developer...") yerine — UI+UX incelemesinde İKİ AYRI
 *  ajan bağımsız olarak bunu bulmuştu. `EkranHataSiniri`'den farklı: o React
 *  RENDER hatalarını yakalar (her ekranın içinde), bu ise router'ın hiçbir
 *  path'e eşleşmediği durumu (route.tsx'te catch-all `path: "*"`). */
export function RotaBulunamadi() {
  return (
    <div role="alert" className="flex min-h-[360px] items-center justify-center p-6">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500"><Compass size={24} aria-hidden="true" /></span>
        <h1 className="mt-4 text-lg font-bold text-slate-900">Bu sayfa bulunamadı</h1>
        <p className="mt-2 break-words text-sm leading-6 text-slate-600">Aradığınız adres kaldırılmış veya hiç var olmamış olabilir. Çalışmanız etkilenmedi.</p>
        <Link
          to="/"
          className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-transparent bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          Ana sayfaya dön
        </Link>
      </section>
    </div>
  );
}
