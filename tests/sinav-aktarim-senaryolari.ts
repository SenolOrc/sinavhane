import { dersKitabiTekrarlariniAyir } from "../src/modules/sinav-olusturucu/aktarim";
import {
  mantiksalSoruGruplari,
  mantiksalSoruGrubunuSil,
  mantiksalSoruGrubunuTasi,
  mantiksalSoruSiraHaritasi,
  paketFarkindaKaristir,
  puanlariMantiksalEsitDagit,
} from "../src/modules/sinav-olusturucu/utils";
import type { SoruOgesi } from "../src/modules/sinav-olusturucu/types";

function dogrula(kosul: unknown, mesaj: string) {
  if (!kosul) throw new Error(`SINAV AKTARIM TESTİ BAŞARISIZ: ${mesaj}`);
}

const soru = (id: string, logicalQuestionId?: string, paketSira?: number): SoruOgesi => ({
  id, logicalQuestionId, paketId: logicalQuestionId, paketSira, kirpmaId: id,
  tur: "gorsel", metinKonumu: "alt", hizalama: "sol", genislikMm: 50,
  gorselOran: 1, boslukMm: 4, punto: 10, puan: null, maddeler: [],
  maddeKolon: 1, tamGenislik: false,
});

const paket = [soru("p1", "paket", 1), soru("p2", "paket", 2), soru("tek")];
dogrula(mantiksalSoruGruplari(paket).length === 2, "paket tek mantıksal soru değil");
const siralar = mantiksalSoruSiraHaritasi(paket);
dogrula(siralar.get("p1") === 1 && siralar.get("p2") === 1 && siralar.get("tek") === 2, "paket numarası ortak değil");
const puanli = puanlariMantiksalEsitDagit(paket);
dogrula(puanli[0].puan === 50 && puanli[1].puan === null && puanli[2].puan === 50, "paket puanda iki kez sayıldı");
const karisik = paketFarkindaKaristir(paket, 42);
dogrula(Math.abs(karisik.findIndex((x) => x.id === "p1") - karisik.findIndex((x) => x.id === "p2")) === 1, "paket karıştırmada ayrıldı");
const tasinan = mantiksalSoruGrubunuTasi(paket, "p1", "asagi");
dogrula(tasinan.map((x) => x.id).join(",") === "tek,p1,p2", "paket birlikte taşınmadı");
dogrula(mantiksalSoruGrubunuSil(paket, "p2").map((x) => x.id).join(",") === "tek", "paket tek işlemde silinmedi");

const tekrar = dersKitabiTekrarlariniAyir([
  { dataUrl: "a", oran: 1, kirpmaId: "tek" },
  { dataUrl: "b", oran: 1, kirpmaId: "yeni" },
  { dataUrl: "c", oran: 1, kirpmaId: "yeni" },
], paket);
dogrula(tekrar.benzersiz.length === 1 && tekrar.benzersiz[0].kirpmaId === "yeni" && tekrar.tekrarSayisi === 2, "mevcut/transfer içi tekrarlar elenmedi");

console.log("✓ Paket numaralandırma, puan, karıştırma ve tekrar eleme");
console.log("TÜM SINAV AKTARIM SENARYOLARI BAŞARILI");
