// "Hazır Soru Sahneleri": tek tıkla birden çok şekil (cisim + makara + ip +
// kuvvet okları…) ekleyen birleşik düzenekler.
//
// KAYIT YERİ: sol kütüphane (`cizim/kutuphane.ts`) bu listeyi okur; yeni bir
// sahne buraya eklenince kütüphanede ve aramada kendiliğinden görünür.
//
// SÖZLEŞME:
// - `olustur()` her çağrıda YENİ kimlikli şekiller döndürür (ya da sabit
//   kimlikler kullanır; editör eklerken `kimlikleriYenile` ile yeniler ve
//   bağlayıcı uçlarını eşler). Koordinatlar (0,0)'a yakın başlayabilir;
//   editör sahneyi tuvalde boş bir yere kaydırır.
// - Bağlayıcı uçları yalnız AYNI sahnedeki şekillere ya da serbest noktaya
//   ({x,y}) bağlanmalı.
// - `aramaKelimeleri`: Türkçe anahtar kelimeler ("makara, atwood, palanga").

import type { Sekil } from "./tipler";

export type HazirSahne = {
  id: string;
  ad: string;
  ipucu: string;
  aramaKelimeleri?: string[];
  olustur: () => Sekil[];
};

export const HAZIR_SAHNELER: HazirSahne[] = [];
