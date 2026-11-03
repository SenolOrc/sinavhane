import {
  soruHavuzMetalariniOku,
  soruHavuzMetasiniAyarla,
  soruRozetleriGetir,
  soruRozetiEkle,
  soruRozetiGuncelle,
  soruRozetiKullanimSayisi,
  soruRozetiSil,
  soruRozetiTasi,
} from "../src/lib/soruRozetleri";

class BellekDeposu {
  private veri = new Map<string, string>();
  getItem(anahtar: string) { return this.veri.get(anahtar) ?? null; }
  setItem(anahtar: string, deger: string) { this.veri.set(anahtar, String(deger)); }
  removeItem(anahtar: string) { this.veri.delete(anahtar); }
  clear() { this.veri.clear(); }
  key(index: number) { return [...this.veri.keys()][index] ?? null; }
  get length() { return this.veri.size; }
}

Object.defineProperty(globalThis, "localStorage", { value: new BellekDeposu(), configurable: true });

function dogrula(kosul: unknown, mesaj: string) {
  if (!kosul) throw new Error(`SORU ROZETLERİ TESTİ BAŞARISIZ: ${mesaj}`);
}

const META = "ogretmen-asistani.ders-kitabi.soru-havuzu-meta.v1";
localStorage.setItem(META, JSON.stringify({
  soru1: { favori: true, etiketler: ["kolay", "ödev", "Tekrar"] },
  soru2: { favori: false, etiketler: ["zor", "yazılı"] },
  soru3: { favori: false, etiketler: ["kolay", "zor", "Klasik"] },
}));

const ilkRozetler = soruRozetleriGetir();
dogrula(ilkRozetler.some((r) => r.ad === "Ödev") && ilkRozetler.some((r) => r.ad === "Yazılı"), "resmi eski etiketler merkezi rozete dönüşmedi");
dogrula(ilkRozetler.some((r) => r.ad === "Tekrar") && ilkRozetler.some((r) => r.ad === "Klasik"), "serbest eski etiketler kayboldu");

const ilkMetalar = soruHavuzMetalariniOku();
const odev = ilkRozetler.find((r) => r.ad === "Ödev")!;
const tekrar = ilkRozetler.find((r) => r.ad === "Tekrar")!;
dogrula(ilkMetalar.soru1.zorluk === "kolay", "eski zorluk ayrı tek seçim alanına taşınmadı");
dogrula(ilkMetalar.soru1.rozetIdler.includes(odev.id) && ilkMetalar.soru1.rozetIdler.includes(tekrar.id), "eski özel rozet atamaları taşınmadı");
dogrula(ilkMetalar.soru1.favori === true, "gizlenen eski favori bilgisi migrasyonda kayboldu");
dogrula(ilkMetalar.soru3.zorluk === "zor" && ilkMetalar.soru3.legacyEtiketler?.length === 3, "çakışan eski zorlukların ham verisi korunmadı");

const yeni = soruRozetiEkle("Kazanım", "#112233");
soruRozetiGuncelle(yeni.id, { ad: "Kazanım odaklı", renk: "#334455" });
dogrula(soruRozetleriGetir().some((r) => r.id === yeni.id && r.ad === "Kazanım odaklı" && r.renk === "#334455"), "yeniden adlandırma/renk değişimi kalıcı değil");

const oncekiIndex = soruRozetleriGetir().findIndex((r) => r.id === yeni.id);
soruRozetiTasi(yeni.id, -1);
dogrula(soruRozetleriGetir().findIndex((r) => r.id === yeni.id) === oncekiIndex - 1, "rozet sıralama çalışmıyor");

soruHavuzMetasiniAyarla("soru1", { zorluk: "orta", rozetIdler: [yeni.id] });
dogrula(soruHavuzMetalariniOku().soru1.zorluk === "orta", "zorluk tek seçim güncellemesi çalışmıyor");
dogrula(soruRozetiKullanimSayisi(yeni.id) === 1, "rozet kullanım sayısı yanlış");

soruRozetiGuncelle(yeni.id, { aktif: false });
dogrula(!soruRozetleriGetir(true).some((r) => r.id === yeni.id), "devre dışı rozet aktif filtre listesinde kaldı");
dogrula(soruHavuzMetalariniOku().soru1.rozetIdler.includes(yeni.id), "devre dışı bırakma mevcut atamayı sildi");

soruRozetiSil(yeni.id);
dogrula(!soruRozetleriGetir().some((r) => r.id === yeni.id), "rozet silinmedi");
dogrula(!soruHavuzMetalariniOku().soru1.rozetIdler.includes(yeni.id), "silinen rozet atamalardan temizlenmedi");

// ——— Doğru şık: YALNIZ bu alanı taşıyan meta da yaşamalı ———
// Bu senaryo iki GERÇEK sessiz hatayı çiviliyor; ikisi de tsc'den geçiyordu,
// ikisi de ancak gerçek depoda ölçünce çıktı:
//   1) `metaKaydet`in "anlamlı kayıt" süzgeci yeni alanı tanımıyordu →
//      yalnız şıkkı işaretlenmiş soru kaydedilirken SESSİZCE atılıyordu
//      (modal kapanıyor, öğretmen kaydettim sanıyor, hiçbir şey yazılmıyor).
//   2) `soruHavuzMetalariniOku` metayı alan alan YENİDEN KURUYOR; listede
//      olmayan alan her okumada düşüyordu. Kaydetme okuduğunu geri yazdığı
//      için ikinci soruyu işaretlemek BİRİNCİNİN şıkkını siliyordu.
// Yeni bir meta alanı eklerken bu senaryoyu o alan için de çoğaltın.
localStorage.removeItem(META);
soruHavuzMetasiniAyarla("sik1", { rozetIdler: [], dogruSik: "C" });
dogrula(soruHavuzMetalariniOku().sik1?.dogruSik === "C", "yalnız doğru şık taşıyan meta kaydedilmiyor");
soruHavuzMetasiniAyarla("sik2", { rozetIdler: [], dogruSik: "A" });
const ikisi = soruHavuzMetalariniOku();
dogrula(ikisi.sik1?.dogruSik === "C" && ikisi.sik2?.dogruSik === "A", "ikinci soruyu işaretlemek birincinin şıkkını siliyor");
soruHavuzMetasiniAyarla("sik1", { rozetIdler: [], dogruSik: undefined });
dogrula(!soruHavuzMetalariniOku().sik1, "doğru şık kaldırılınca boş meta depoda kalıyor");
localStorage.setItem(META, JSON.stringify({ bozuk: { rozetIdler: [], dogruSik: "Z" }, sayi: { rozetIdler: [], dogruSik: 3 } }));
dogrula(!soruHavuzMetalariniOku().bozuk?.dogruSik && !soruHavuzMetalariniOku().sayi?.dogruSik, "geçersiz doğru şık (A-E dışı / sayı) süzülmüyor");
localStorage.removeItem(META);

console.log("✓ Eski zorluk/özel etiket migrasyonu kayıpsız");
console.log("✓ Merkezi rozet CRUD, renk, sıra, aktiflik ve silme");
console.log("✓ Tek seçimli zorluk ve çoklu merkezi rozet ataması");
console.log("✓ Doğru şık havuzda kalıcı: tek başına yaşıyor, birbirini silmiyor, geçersizi süzülüyor");
console.log("TÜM SORU ROZETLERİ SENARYOLARI BAŞARILI");
