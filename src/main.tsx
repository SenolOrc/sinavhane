import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "@fontsource-variable/inter";
import "@/index.css";

// Sınav taslağı ve görseller IndexedDB'de durur; kalıcı depolama izni istenir
// (reddedilirse akış bozulmaz).
async function kaliciDepolamaIste() {
  try {
    if (!navigator.storage?.persist) return;
    if (await navigator.storage.persisted()) return;
    await navigator.storage.persist();
  } catch (err) {
    console.warn("Kalıcı depolama izni istenemedi", err);
  }
}

async function baslat() {
  void kaliciDepolamaIste();
  // Depo (SQLite → bellek) router'dan önce hazırlanır.
  const { veritabaniHazirla } = await import("@/db/repo");
  await veritabaniHazirla();
  // Pencere kapanırken bekleyen yazımı diske indirir.
  const { kapanisBosaltmasiniKur } = await import("@/lib/kapanisBosaltma");
  void kapanisBosaltmasiniKur();
  const { router } = await import("@/app/router");
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>,
  );
}

// Web sürümünde (Tauri dışı, üretim) internetsiz çalışma için servis çalışanı.
if ("serviceWorker" in navigator && import.meta.env.PROD && !("__TAURI_INTERNALS__" in window)) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((err) => console.warn("Servis çalışanı kaydedilemedi", err));
  });
}

baslat().catch((err) => {
  console.error("Uygulama başlatılamadı", err);
  const root = document.getElementById("root");
  if (root) root.textContent = "Uygulama başlatılamadı. Konsolu kontrol edin.";
});
