// Sınavhane — yalnız sınav modülünün iki ekranı.
import { lazy, Suspense, type ComponentType } from "react";
import { createHashRouter, Navigate } from "react-router-dom";
import { Layout } from "@/app/Layout";
import { EkranHataSiniri, EkranYukleniyor } from "@/components/UygulamaDurumlari";

function tembelEkran<T extends Record<string, unknown>, K extends keyof T>(yukle: () => Promise<T>, ad: K) {
  return lazy(() => yukle().then((modul) => ({ default: modul[ad] as ComponentType })));
}

const SinavOlusturucuScreen = tembelEkran(() => import("@/modules/sinav-olusturucu/SinavOlusturucuScreen"), "SinavOlusturucuScreen");
const SinavlarimScreen = tembelEkran(() => import("@/modules/sinav-olusturucu/SinavlarimScreen"), "SinavlarimScreen");

function ekran(icerik: JSX.Element) {
  return <EkranHataSiniri><Suspense fallback={<EkranYukleniyor />}>{icerik}</Suspense></EkranHataSiniri>;
}

function BuSurumdeYok() {
  return (
    <div className="mx-auto max-w-xl p-8 text-center text-slate-600">
      <p className="text-lg font-semibold text-slate-800">Bu sayfa bu sürümde yok</p>
      <p className="mt-2 text-sm">Bu uygulama yalnızca sınav hazırlama modülünü içerir (ders kitabı ve soru havuzu yoktur).</p>
    </div>
  );
}

// Hash yönlendirme: masaüstü (Tauri), GitHub Pages ve ana ekrana eklenen sürümde sayfa yenilenince 404 olmaz.
export const router = createHashRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/sinav-olusturucu" replace /> },
      { path: "sinav-olusturucu", element: ekran(<SinavOlusturucuScreen />) },
      { path: "sinav-olusturucu/sinavlarim", element: ekran(<SinavlarimScreen />) },
      { path: "*", element: <BuSurumdeYok /> },
    ],
  },
]);
