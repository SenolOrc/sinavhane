import { SINAV_TASLAK_DOSYA_AZAMI_BAYT, sinavTaslaginiDogrula, sinavTaslakKimlikleriniYenile, sinavTaslakOzeti } from "../src/modules/sinav-olusturucu/storage/taslakDosya";
import { parolaliSinavMi } from "../src/lib/parolaliSinav";

function dogrula(kosul: unknown, mesaj: string): asserts kosul { if (!kosul) throw new Error(`SINAV TASLAK GÜVENLİĞİ: ${mesaj}`); }
function reddedilir(deger: unknown): boolean { try { sinavTaslaginiDogrula(deger); return false; } catch { return true; } }

function gecerliTaslak() {
  return {
    id: "taslak-1", surum: "v0.11C", kayitZamani: "2026-08-26T10:00:00.000Z",
    baslik: { okulAdi: "Okul", sinifSeviyesi: "9", donem: "1", yaziliNo: "1", ders: "Fizik" },
    sorular: [{ id: "soru-1", tur: "metin", metinHtml: "<p>Bir soru</p>", metinKonumu: "alt", hizalama: "sol", genislikMm: 80, boslukMm: 20, punto: 10, puan: 10, maddeler: [], maddeKolon: 1, tamGenislik: false }],
    ayarlar: { kenarBosluk: 10, varsayilanSoruBosluk: 20, ogretmenler: ["Öğretmen"], sayfaNoGoster: true, sayfaDuzeni: "cift", sutunAra: 8, sutunAyirici: true },
  };
}

dogrula(sinavTaslaginiDogrula(gecerliTaslak()).sorular.length === 1, "geçerli taslak reddedildi");
const ozetTaslagi = sinavTaslaginiDogrula(gecerliTaslak());
ozetTaslagi.sorular[0].maddeler = [
  { id: "m1", metinHtml: "A", puan: 4, cevapSatir: 1 },
  { id: "m2", metinHtml: "B", puan: 6, cevapSatir: 1 },
];
ozetTaslagi.sorular[0].ekGorseller = [{ id: "g1", dataUrl: "data:image/png;base64,AA==", konum: "alt", genislikMm: 20, oran: 1 }];
const ozet = sinavTaslakOzeti(ozetTaslagi);
dogrula(ozet.ders === "Fizik" && ozet.soruSayisi === 1 && ozet.toplamPuan === 10 && ozet.gorselSayisi === 1 && ozet.surum === "v0.11C", "içe aktarma özeti yanlış");

const kimlikTaslagi = sinavTaslaginiDogrula(gecerliTaslak());
kimlikTaslagi.sorular[0].logicalQuestionId = "mantik-eski";
kimlikTaslagi.sorular[0].paketId = "paket-eski";
kimlikTaslagi.sorular[0].kirpmaId = "yerel-kirpma";
kimlikTaslagi.sorular[0].kaynakKitapId = "yerel-kitap";
kimlikTaslagi.sorular[0].kaynakAktarimId = "yerel-aktarim";
kimlikTaslagi.sorular[0].maddeler = [{ id: "madde-eski", metinHtml: "A", puan: 5, cevapSatir: 1 }];
kimlikTaslagi.sorular[0].ekGorseller = [{ id: "gorsel-eski", dataUrl: "data:image/png;base64,AA==", konum: "alt", genislikMm: 20, oran: 1 }];
kimlikTaslagi.ayarlar.bepSeciliIds = ["soru-1"];
let kimlikSirasi = 0;
const izole = sinavTaslakKimlikleriniYenile(kimlikTaslagi, () => `yeni-${++kimlikSirasi}`);
dogrula(izole !== kimlikTaslagi && izole.id !== kimlikTaslagi.id, "taslak kimliği yenilenmedi");
dogrula(izole.sorular[0].id !== "soru-1" && izole.sorular[0].maddeler[0].id !== "madde-eski" && izole.sorular[0].ekGorseller?.[0].id !== "gorsel-eski", "iç kimlikler yenilenmedi");
dogrula(izole.sorular[0].logicalQuestionId !== "mantik-eski" && izole.sorular[0].paketId !== "paket-eski", "grup kimlikleri yenilenmedi");
dogrula(izole.ayarlar.bepSeciliIds?.[0] === izole.sorular[0].id, "BEP soru referansı yeni kimliğe taşınmadı");
dogrula(!izole.sorular[0].kirpmaId && !izole.sorular[0].kaynakKitapId && !izole.sorular[0].kaynakAktarimId, "yabancı cihazın yerel kaynak kimlikleri taşındı");
dogrula(kimlikTaslagi.sorular[0].id === "soru-1" && kimlikTaslagi.sorular[0].kirpmaId === "yerel-kirpma", "kaynak taslak mutasyona uğradı");

const maddesiBozuk = structuredClone(gecerliTaslak());
(maddesiBozuk.sorular[0] as Record<string, unknown>).maddeler = "dizi-degil";
dogrula(reddedilir(maddesiBozuk), "dizi olmayan maddeler kabul edildi");

const bilinmeyenTur = structuredClone(gecerliTaslak());
(bilinmeyenTur.sorular[0] as Record<string, unknown>).tur = "calistir";
dogrula(reddedilir(bilinmeyenTur), "bilinmeyen soru türü kabul edildi");

const bilinmeyenAlan = structuredClone(gecerliTaslak()) as ReturnType<typeof gecerliTaslak> & { calistir?: string };
bilinmeyenAlan.calistir = "istenmeyen";
dogrula(reddedilir(bilinmeyenAlan), "bilinmeyen üst alan kabul edildi");

const asiriPuan = structuredClone(gecerliTaslak());
asiriPuan.sorular[0].puan = 1_001;
dogrula(reddedilir(asiriPuan), "aşırı puan kabul edildi");

const devGorsel = structuredClone(gecerliTaslak());
devGorsel.sorular[0] = { ...devGorsel.sorular[0], tur: "gorsel", gorselDataUrl: `data:image/png;base64,${"A".repeat(8 * 1024 * 1024 + 1)}` } as typeof devGorsel.sorular[0];
dogrula(reddedilir(devGorsel), "8 MB üstü tek görsel kabul edildi");

const cokSoru = structuredClone(gecerliTaslak());
cokSoru.sorular = Array.from({ length: 501 }, (_, i) => ({ ...cokSoru.sorular[0], id: `s-${i}` }));
dogrula(reddedilir(cokSoru), "500 üstü soru kabul edildi");

const mukerrer = structuredClone(gecerliTaslak());
mukerrer.sorular.push(structuredClone(mukerrer.sorular[0]));
dogrula(reddedilir(mukerrer), "yinelenen soru kimliği kabul edildi");

const tehlikeli = JSON.parse('{"surum":"v0.11C","constructor":{"prototype":{"kirlet":true}}}');
dogrula(reddedilir(tehlikeli), "prototype pollution alanı kabul edildi");
dogrula(({} as Record<string, unknown>).kirlet === undefined, "global prototip kirlendi");

let derin: Record<string, unknown> = {};
const kok = derin;
for (let i = 0; i < 20; i++) { derin.alt = {}; derin = derin.alt as Record<string, unknown>; }
dogrula(reddedilir(kok), "aşırı derin JSON kabul edildi");
dogrula(SINAV_TASLAK_DOSYA_AZAMI_BAYT === 25 * 1024 * 1024, "dosya tavanı değişti");
dogrula(parolaliSinavMi('{"format":"oa27-encrypted-exam","version":1}'), "parolalı sınav zarfı tanınmadı");
dogrula(!parolaliSinavMi('{"format":"oa27-encrypted-backup","version":1}'), "yedek zarfı sınav zarfı sanıldı");

console.log("✓ Sınav taslağı tam yapı, boyut, derinlik, kimlik ve zararlı alan kontrolleri doğru");
