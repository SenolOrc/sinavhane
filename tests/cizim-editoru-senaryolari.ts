import { writeFileSync } from "node:fs";
// Faz D: bu fonksiyonlar CizimEditoruModal.tsx'ten cizim/ altına çıkarıldı.
// Test artık React bileşenini HİÇ yüklemeden saf geometriyi çağırıyor —
// çıkarmanın amacı zaten buydu.
import type { CizimSekli } from "../src/modules/sinav-olusturucu/cizim/tipler";
import {
  noktaDondur,
  sekilGeometriAyarla,
  sekilGeometriKutusu,
  sekilBoyutlandir,
  dalgaNoktalariUret,
  sekilTasi,
  taslagiKesinlestir,
} from "../src/modules/sinav-olusturucu/cizim/geometri";
import type { CizilenTaslak } from "../src/modules/sinav-olusturucu/cizim/tipler";
import {
  cizimIcerikSiniri,
  sekilSinirlari,
  sekilTasiSinirli,
} from "../src/modules/sinav-olusturucu/cizim/sinirlar";
import { sekilVuruldu } from "../src/modules/sinav-olusturucu/cizim/vurus";
import {
  akisKutusuKosaleri,
  baglayiciYolu,
  noktaCokgenIcindeMi,
  otoYonler,
  tutunmaNoktasi,
} from "../src/modules/sinav-olusturucu/cizim/geometri";
import { akisMetniniSar, sekilleriCiz } from "../src/modules/sinav-olusturucu/cizim/ciz";
import type { Sekil } from "../src/modules/sinav-olusturucu/cizim/tipler";
import { sekilGecerliMi } from "../src/modules/sinav-olusturucu/cizim/sablon";
import { sigdirmaOrani, SABLON_ADI_SINIRI } from "../src/modules/sinav-olusturucu/cizim/sabitler";
import {
  birlikteTasinanBaglayicilar,
  disUclariSerbestBirak,
  kimlikleriYenile,
  seciliBaglayicilarlaGenislet,
} from "../src/modules/sinav-olusturucu/cizim/geometri";
import { noktaYerel, sekilMerkezi } from "../src/modules/sinav-olusturucu/cizim/sinirlar";
import { tasimaKenarDegerleri } from "../src/modules/sinav-olusturucu/cizim/hizalama";
import { temelDolgu, temelRenk } from "../src/modules/sinav-olusturucu/cizim/ciz";

function dogrula(kosul: unknown, mesaj: string) {
  if (!kosul) throw new Error(`TEST BAŞARISIZ: ${mesaj}`);
}

const ctx = {
  font: "",
  measureText(metin: string) { return { width: [...metin].length * 10 }; },
} as unknown as CanvasRenderingContext2D;

const ortak = { kalinlik: 2, cizgiTipi: "duz" as const };

// 1) İç içe dikdörtgenler: iç şeklin kenarı dış şeklin boş iç alanından seçilebilmeli.
const disDortgen: CizimSekli = { id: "dr-dis", tur: "dikdortgen", ...ortak, x: 80, y: 70, w: 460, h: 260 };
const ortaDortgen: CizimSekli = { id: "dr-orta", tur: "dikdortgen", ...ortak, x: 150, y: 120, w: 320, h: 160 };
const icDortgen: CizimSekli = { id: "dr-ic", tur: "dikdortgen", ...ortak, x: 220, y: 165, w: 180, h: 70 };
dogrula(sekilVuruldu(ctx, icDortgen, { x: 280, y: 165 }), "İç dikdörtgen kenarı seçilemedi");
dogrula(!sekilVuruldu(ctx, disDortgen, { x: 280, y: 165 }), "Dış dikdörtgen iç alanı yanlışlıkla seçildi");

// 2) İç içe çemberler: yalnız çevre vuruş sayılmalı.
const disCember: CizimSekli = { id: "c-dis", tur: "elips", ...ortak, x: 120, y: 60, w: 300, h: 300 };
const icCember: CizimSekli = { id: "c-ic", tur: "elips", ...ortak, x: 200, y: 140, w: 140, h: 140 };
dogrula(sekilVuruldu(ctx, icCember, { x: 270, y: 140 }), "İç çember çevresi seçilemedi");
dogrula(!sekilVuruldu(ctx, disCember, { x: 270, y: 140 }), "Dış çemberin iç alanı yanlışlıkla seçildi");

// 3) Döndürülmüş karmaşık üçgenin kenar vuruşu.
const ucgen: CizimSekli = {
  id: "ucgen", tur: "ucgen", ...ortak, donus: 37,
  x1: 320, y1: 70, x2: 170, y2: 310, x3: 500, y3: 280,
};
const merkez = { x: (170 + 500) / 2, y: (70 + 310) / 2 };
const yerelKenar = { x: (320 + 170) / 2, y: (70 + 310) / 2 };
const donmusKenar = noktaDondur(yerelKenar, merkez, 37);
dogrula(sekilVuruldu(ctx, ucgen, donmusKenar), "Döndürülmüş üçgen kenarı seçilemedi");

// 4) 90 derece döndürmede sınırlar en/boy değiştirmeli.
const yatay: CizimSekli = { id: "rot", tur: "dikdortgen", ...ortak, x: 100, y: 100, w: 220, h: 60, donus: 90 };
const rotSinir = sekilSinirlari(ctx, yatay);
dogrula(rotSinir.h > rotSinir.w, "90° döndürülmüş dikdörtgenin sınırları yanlış");

// 5) Grup taşıma: şekiller arası göreli mesafe korunmalı.
const grup = [disDortgen, icDortgen].map((s) => ({ ...s, grupId: "g1" }));
const tasinan = grup.map((s) => sekilTasi(s, 35, -20));
const onceFark = sekilSinirlari(ctx, grup[1]).x - sekilSinirlari(ctx, grup[0]).x;
const sonraFark = sekilSinirlari(ctx, tasinan[1]).x - sekilSinirlari(ctx, tasinan[0]).x;
dogrula(Math.abs(onceFark - sonraFark) < 0.001, "Grup taşınırken göreli konum bozuldu");

// 6) Karmaşık kompozisyonun otomatik kırpma sınırı geçerli olmalı.
const karmasik = [disDortgen, ortaDortgen, icDortgen, disCember, icCember, ucgen];
const kirpma = cizimIcerikSiniri(ctx, karmasik);
dogrula(kirpma.w > 300 && kirpma.h > 250, "Karmaşık çizim kırpma sınırı gereğinden küçük");
// Tuval boyutu cizim/sabitler.ts'teki CANVAS_W/CANVAS_H ile eşleşmeli (şu an 960×600).
dogrula(kirpma.w <= 960 && kirpma.h <= 600, "Karmaşık çizim kırpma sınırı tuvali aşıyor");

// 7) Sayısal geometri: karmaşık üçgen yeniden konumlandırılıp tam ölçüye getirilmeli.
const kesinUcgen = sekilGeometriAyarla(ucgen, { x: 40, y: 50, w: 300, h: 180, donus: 30 });
const kesinKutu = sekilGeometriKutusu(kesinUcgen);
dogrula(Math.abs(kesinKutu.x - 40) < 0.001 && Math.abs(kesinKutu.y - 50) < 0.001, "Sayısal üçgen konumu yanlış");
dogrula(Math.abs(kesinKutu.w - 300) < 0.001 && Math.abs(kesinKutu.h - 180) < 0.001, "Sayısal üçgen boyutu yanlış");
dogrula(kesinUcgen.donus === 30, "Sayısal açı uygulanmadı");

// Faz D eki: geometri `cizim/` altına çıkarılınca iki boşluk görüldü —
// aşağıdaki ikisi ESKİ kodda da yoktu, mutasyon denemesinde ortaya çıktılar
// (dönüş yönünü tersine çevirmek ve `sekilTasi`'nın dy'sini düşürmek süiti
// düşürmüyordu). Çıkarmanın amacı zaten bunu ucuzlatmaktı.

// 8) Dönüş YÖNÜ. Tuval ekseninde y aşağı büyür; +90° saat yönündedir.
// İşaret ters çevrilirse şekiller aynadan bakılmış gibi döner ve bu ancak
// çıktı alınınca fark edilir.
const dondurulen = noktaDondur({ x: 10, y: 0 }, { x: 0, y: 0 }, 90);
dogrula(
  Math.abs(dondurulen.x - 0) < 0.001 && Math.abs(dondurulen.y - 10) < 0.001,
  `90° dönüş yönü yanlış: (${dondurulen.x}, ${dondurulen.y}) — beklenen (0, 10)`,
);
const geriDondurulen = noktaDondur(dondurulen, { x: 0, y: 0 }, -90);
dogrula(
  Math.abs(geriDondurulen.x - 10) < 0.001 && Math.abs(geriDondurulen.y - 0) < 0.001,
  "Dönüş tersiyle geri alınamıyor",
);

// 9) Kutu tabanlı şekilde taşıma. `sekilTasi`'nın iki dalı var: nokta listesi
// olan şekiller (doğru/üçgen/serbest) ve kutu tabanlılar (dikdörtgen/elips/
// metin). Testlerin tamamı ilk dalı kullanıyordu; ikincisinde dy'nin
// düşürülmesi sessizce geçiyordu.
const tasinacakKutu: CizimSekli = { id: "tk", tur: "dikdortgen", ...ortak, x: 100, y: 200, w: 50, h: 60 };
const tasinmis = sekilTasi(tasinacakKutu, 15, -25) as Extract<CizimSekli, { tur: "dikdortgen" }>;
dogrula(
  tasinmis.x === 115 && tasinmis.y === 175,
  `Kutu tabanlı şekil taşıma yanlış: (${tasinmis.x}, ${tasinmis.y}) — beklenen (115, 175)`,
);
dogrula(tasinmis.w === 50 && tasinmis.h === 60, "Taşıma şeklin boyutunu değiştirdi");
dogrula(tasinacakKutu.x === 100 && tasinacakKutu.y === 200, "Taşıma orijinal şekli YERİNDE değiştirdi");

function svgSekil(s: CizimSekli): string {
  const dash = s.tur !== "metin" && s.cizgiTipi === "kesik" ? ' stroke-dasharray="8 5"' : "";
  const sinir = sekilSinirlari(ctx, { ...s, donus: 0 });
  const cx = sinir.x + sinir.w / 2, cy = sinir.y + sinir.h / 2;
  const donus = s.donus ? ` transform="rotate(${s.donus} ${cx} ${cy})"` : "";
  const stil = `fill="none" stroke="#0f172a" stroke-width="${s.tur === "metin" ? 0 : s.kalinlik}"${dash}`;
  if (s.tur === "dikdortgen") return `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" ${stil}${donus}/>`;
  if (s.tur === "elips") return `<ellipse cx="${s.x + s.w / 2}" cy="${s.y + s.h / 2}" rx="${s.w / 2}" ry="${s.h / 2}" ${stil}${donus}/>`;
  if (s.tur === "ucgen") return `<polygon points="${s.x1},${s.y1} ${s.x2},${s.y2} ${s.x3},${s.y3}" ${stil}${donus}/>`;
  if (s.tur === "dogru") return `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" ${stil}${donus}/>`;
  if (s.tur === "serbest") return `<polyline points="${s.noktalar.map((n) => `${n.x},${n.y}`).join(" ")}" ${stil}${donus}/>`;
  return `<text x="${s.x}" y="${s.y}" font-family="Times New Roman" font-size="${s.punto ?? 20}" fill="#0f172a"${donus}>${s.metin}</text>`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600" viewBox="0 0 960 600"><rect width="100%" height="100%" fill="white"/>${karmasik.map(svgSekil).join("")}</svg>`;
writeFileSync("/tmp/cizim-editoru-karmasik-test.svg", svg);

console.log(`✓ İç içe dikdörtgen seçimi`);
console.log(`✓ İç içe çember seçimi`);
console.log(`✓ Döndürülmüş karmaşık üçgen`);
console.log(`✓ 90° sınır hesabı`);
console.log(`✓ Grup taşıma`);
console.log(`✓ Otomatik kırpma (${kirpma.w}×${kirpma.h})`);
console.log(`✓ Sayısal konum, boyut ve açı`);
console.log(`✓ Dönüş yönü ve tersiyle geri alma`);
console.log(`✓ Kutu tabanlı şekilde taşıma (değişmezlik dâhil)`);

// ─── taslagiKesinlestir ────────────────────────────────────────────────────
// KORUDUĞU ŞEY: "kazara tek tıkla nokta büyüklüğünde şekil bırakma" koruması.
// Bu kural beş dala dağılmıştı ve dağınık olduğu için hiç test edilmiyordu;
// tek fonksiyona indirilince yoklanabilir hâle geldi (§11.3'teki mutasyon
// dersi: dağınık kural = korumasız kural).
const bosTaslak = { id: "", kalinlik: 2 } as const;

dogrula(
  taslagiKesinlestir({ ...bosTaslak, tur: "serbest", noktalar: [{ x: 1, y: 1 }] } as CizilenTaslak) === null,
  "tek noktalı serbest çizim kalıcı şekle dönüşmemeli",
);
dogrula(
  taslagiKesinlestir({ ...bosTaslak, tur: "serbest", noktalar: [{ x: 1, y: 1 }, { x: 9, y: 9 }] } as CizilenTaslak) !== null,
  "iki noktalı serbest çizim kabul edilmeli",
);
dogrula(
  taslagiKesinlestir({ ...bosTaslak, tur: "dogru", x1: 0, y1: 0, x2: 2, y2: 2 } as CizilenTaslak) === null,
  "asgari uzunluğun altındaki doğru elenmeli",
);
dogrula(
  taslagiKesinlestir({ ...bosTaslak, tur: "dogru", x1: 0, y1: 0, x2: 40, y2: 0 } as CizilenTaslak) !== null,
  "yeterince uzun doğru kabul edilmeli",
);
dogrula(
  taslagiKesinlestir({ ...bosTaslak, tur: "ucgen", x1: 0, y1: 0, x2: 2, y2: 0, x3: 1, y3: 2 } as CizilenTaslak) === null,
  "her iki ekseni de dar olan üçgen elenmeli",
);
dogrula(
  taslagiKesinlestir({ ...bosTaslak, tur: "ucgen", x1: 0, y1: 0, x2: 40, y2: 0, x3: 20, y3: 30 } as CizilenTaslak) !== null,
  "normal üçgen kabul edilmeli",
);
dogrula(
  taslagiKesinlestir({ ...bosTaslak, tur: "cokgen", noktalar: [{ x: 0, y: 0 }, { x: 2, y: 1 }, { x: 1, y: 2 }] } as CizilenTaslak) === null,
  "çok küçük çokgen elenmeli",
);

// Kutu tabanlılar: sağdan sola / aşağıdan yukarı çizim NORMALİZE edilmeli.
// Negatif w/h ile kaydedilen bir şekil sonradan vuruş ve tutamaç hesaplarını
// bozuyor — bu yüzden ayrı bir iddia.
const tersKutu = taslagiKesinlestir({
  ...bosTaslak, tur: "dikdortgen", x: 100, y: 80, w: -60, h: -40,
} as CizilenTaslak);
dogrula(tersKutu !== null, "ters yönde çizilen dikdörtgen elenmemeli");
dogrula(
  tersKutu !== null && tersKutu.tur === "dikdortgen"
    && tersKutu.x === 40 && tersKutu.y === 40 && tersKutu.w === 60 && tersKutu.h === 40,
  "ters yönde çizilen dikdörtgen normalize edilmeli (sol-üst köşe + pozitif w/h)",
);
dogrula(
  taslagiKesinlestir({ ...bosTaslak, tur: "dikdortgen", x: 10, y: 10, w: 3, h: 3 } as CizilenTaslak) === null,
  "nokta büyüklüğündeki dikdörtgen elenmeli",
);

console.log("✓ Taslak kesinleştirme: asgari ölçü kuralı ve kutu normalleştirme");

// Tam yatay (dy=0) dalga artık şekil oluşturur.
{
  const yatay = taslagiKesinlestir({
    ...bosTaslak, tur: "dalga", noktalar: dalgaNoktalariUret({ x: 20, y: 100, w: 200, h: 0 }, 2),
  } as CizilenTaslak);
  dogrula(yatay !== null, "tam yatay dalga sessizce elenmemeli");
  console.log("✓ Yatay dalga çizilebiliyor");
}

// Akış kutusu köşe tutamağıyla boyutlanır, asgari ölçü korunur, karşı köşe sabit.
{
  const akis = { id: "ak", tur: "akis", akisSekli: "islem", kalinlik: 2, x: 100, y: 100, w: 120, h: 60, metin: "A" } as unknown as Sekil;
  const b = sekilBoyutlandir(akis, "sag-alt", { x: 300, y: 220 }) as any;
  dogrula(b.x === 100 && b.y === 100 && b.w === 200 && b.h === 120, "akış kutusu sağ-alt tutamağıyla boyutlanmadı");
  const k = sekilBoyutlandir(akis, "sol-ust", { x: 219, y: 159 }) as any;
  dogrula(k.w >= 40 && k.h >= 24 && k.x + k.w === 220 && k.y + k.h === 160, "akış kutusu asgari ölçü/sabit köşe bozuk");
  const g = sekilGeometriAyarla(akis, { w: 250, h: 90 }) as any;
  dogrula(g.w === 250 && g.h === 90, "Kesin ölçüler akış kutusuna uygulanmıyor");
  console.log("✓ Akış kutusu boyutlandırma");
}
// ── Akış şeması kutusu ─────────────────────────────────────────────────────
{
  const kutu = { akisSekli: "karar" as const, x: 100, y: 50, w: 200, h: 100 };
  const koseler = akisKutusuKosaleri(kutu);
  dogrula(koseler.length === 4, "karar kutusu dört köşeli olmalı");
  dogrula(
    koseler[0].x === 200 && koseler[0].y === 50,
    "karar kutusunun tepe noktası üst kenarın ORTASINDA olmalı",
  );
  dogrula(
    koseler[3].x === 100 && koseler[3].y === 100,
    "karar kutusunun sol noktası sol kenarın ORTASINDA olmalı",
  );

  // Paralelkenar EĞİK olmalı: üst-sol köşe, alt-sol köşeden sağda.
  const veri = akisKutusuKosaleri({ akisSekli: "veri", x: 0, y: 0, w: 200, h: 80 });
  dogrula(veri[0].x > veri[3].x, "girdi/çıktı kutusu eğik değil — dikdörtgene düşmüş");

  // KUTUNUN İÇİ dolu sayılmalı: öğretmen ortadaki yazıya tıklayınca kutu
  // seçilmeli, ince kenar çizgisini yakalamak zorunda kalmamalı.
  dogrula(
    noktaCokgenIcindeMi({ x: 200, y: 100 }, koseler),
    "karar kutusunun merkezi 'dışarıda' sayılıyor — kutu yazısına tıklanamaz",
  );
  dogrula(
    !noktaCokgenIcindeMi({ x: 105, y: 55 }, koseler),
    "karar kutusunun kutu köşesi (eşkenar dörtgenin DIŞI) içeride sayılıyor",
  );
}

// Metin sarma: girilen satır sonları KORUNUR, uzun satır kelime kelime sarılır.
{
  // ölçüm bağlamı: her karakter ~10px varsayan sahte measureText yeterli,
  // gerçek font metriği bu iddianın konusu değil.
  const sahteCtx = {
    measureText: (t: string) => ({ width: t.length * 10 }),
  } as unknown as CanvasRenderingContext2D;

  const korunan = akisMetniniSar(sahteCtx, "bir\niki", 1000);
  dogrula(
    korunan.length === 2 && korunan[0] === "bir" && korunan[1] === "iki",
    `öğretmenin girdiği satır sonu kaybolmuş: ${JSON.stringify(korunan)}`,
  );

  const sarilan = akisMetniniSar(sahteCtx, "aaa bbb ccc ddd", 79);
  dogrula(sarilan.length > 1, "genişliğe sığmayan metin hiç sarılmamış");
  dogrula(
    sarilan.every((satir) => satir.length * 10 <= 79 || !satir.includes(" ")),
    `sarma genişliği aşıyor: ${JSON.stringify(sarilan)}`,
  );

  // Tek kelime genişliğe sığmıyorsa KIRPILMAZ, taşar — kelimeyi ortadan bölmek
  // ("LoopCondi- tion") akış şemasında okunurluğu daha çok bozuyor.
  const uzunKelime = akisMetniniSar(sahteCtx, "LoopConditionDegiskeni", 50);
  dogrula(
    uzunKelime.length === 1 && uzunKelime[0] === "LoopConditionDegiskeni",
    "sığmayan tek kelime bölünmüş — kutuyu büyütmek öğretmenin elinde olmalı",
  );
}

// ŞABLON BEYAZ LİSTESİ: yeni tür buraya öğretilmezse, şablona kaydedilen akış
// kutusu geri yüklenirken SESSİZCE düşer (§17.4'ün bu modüldeki hâli).
dogrula(
  sekilGecerliMi({ id: "a1", tur: "akis", akisSekli: "surec", kalinlik: 2, x: 0, y: 0, w: 10, h: 10, metin: "x" }),
  "akış kutusu şablon beyaz listesinde yok — kaydedilen şablon geri gelmez",
);
dogrula(
  !sekilGecerliMi({ id: "a2", tur: "uydurma", x: 0, y: 0 }),
  "beyaz liste tanınmayan türü geçiriyor",
);

console.log("✓ Akış şeması: kutu geometrisi, iç alan seçimi, metin sarma, şablon beyaz listesi");
// ── Bağlayıcı (akış şeması oku) ────────────────────────────────────────────
{
  const kutu = (id: string, x: number, y: number, sekli: "surec" | "karar" = "surec"): CizimSekli =>
    ({ id, tur: "akis", akisSekli: sekli, kalinlik: 2, x, y, w: 180, h: 80, metin: id }) as CizimSekli;

  const ust = kutu("ust", 100, 40);
  const alt = kutu("alt", 100, 240);
  const ok: CizimSekli = {
    id: "ok1", tur: "baglayici", kalinlik: 2,
    kaynak: { sekilId: "ust" }, hedef: { sekilId: "alt" },
  } as CizimSekli;

  const yol = baglayiciYolu([ust, alt, ok], ok as never);
  dogrula(!!yol && yol.length >= 2, "bağlayıcı yolu üretilmedi");
  if (yol) {
    // Uçlar KUTULARIN KENARINDA: alt alta duran iki kutuda üstün alt kenarından
    // çıkıp altın üst kenarına girmeli.
    dogrula(Math.abs(yol[0].y - 120) < 0.01, `yol üst kutunun ALT kenarından başlamalı, y=${yol[0].y}`);
    dogrula(
      Math.abs(yol[yol.length - 1].y - 240) < 0.01,
      `yol alt kutunun ÜST kenarında bitmeli, y=${yol[yol.length - 1].y}`,
    );
    // DİK AÇILI: her parça ya yatay ya dikey olmalı.
    for (let i = 1; i < yol.length; i += 1) {
      const yatay = Math.abs(yol[i].y - yol[i - 1].y) < 0.01;
      const dikey = Math.abs(yol[i].x - yol[i - 1].x) < 0.01;
      dogrula(yatay || dikey, `yolun ${i}. parçası eğik — dik açılı olmalı`);
    }
  }

  // ASIL İDDİA: kutu taşınınca OK DA GELİR. Yol saklanmıyor, uçlardan
  // hesaplanıyor — saklansaydı ok yerinde kalırdı ve akış şeması işe yaramazdı.
  const altTasinmis = { ...alt, x: 500, y: 400 } as CizimSekli;
  const yeniYol = baglayiciYolu([ust, altTasinmis, ok], ok as never);
  dogrula(!!yeniYol, "taşıma sonrası yol üretilmedi");
  if (yol && yeniYol) {
    const eskiUc = yol[yol.length - 1];
    const yeniUc = yeniYol[yeniYol.length - 1];
    dogrula(
      Math.abs(yeniUc.x - eskiUc.x) > 1 || Math.abs(yeniUc.y - eskiUc.y) > 1,
      "kutu taşındı ama okun ucu YERİNDE KALDI — bağlayıcı tutunmuyor",
    );
    dogrula(
      yeniUc.x >= 500 && yeniUc.x <= 680 && yeniUc.y >= 400 && yeniUc.y <= 480,
      `okun ucu taşınan kutunun üstünde değil: ${JSON.stringify(yeniUc)}`,
    );
  }

  // Tutunma noktası şeklin ÇEVRESİNDEN alınmalı, kaba kutudan değil.
  //
  // TEST VERİSİ SEÇİMİ BURADA KRİTİK (§15.8): ilk yazışında bu iddia KARAR
  // kutusunu kullanıyordu ve mutasyonu (çevre yerine kaba kutu) YAKALAMADI —
  // çünkü eşkenar dörtgenin tepe/dip/yan köşeleri kaba kutunun kenar
  // ortalarıyla ZATEN AYNI noktada. Fark ancak eğik kenarlı PARALELKENARDA
  // görünüyor: sol kenar üstte içeride, altta dışarıda başlıyor.
  const paralel = kutu("p", 0, 0, "veri");
  const pSol = tutunmaNoktasi(paralel, "sol");
  // w=180 → eğim = min(180*0.18, 80*0.6) = 32.4; orta yükseklikte sol kenar
  // x = 32.4/2 = 16.2. Kaba kutu 0 derdi.
  dogrula(
    pSol.x > 5,
    `paralelkenarın sol tutunması kaba kutudan alınmış (x=${pSol.x}) — eğik kenar yok sayılıyor`,
  );
  dogrula(Math.abs(pSol.y - 40) < 0.5, `paralelkenar sol tutunması dikeyde ortada değil: ${pSol.y}`);

  // Karar kutusunda köşeler kaba kutunun kenar ortalarıyla çakışıyor; yine de
  // doğru yerde olduklarını sabitliyoruz.
  const kararKutu = kutu("k", 0, 0, "karar");
  const tepe = tutunmaNoktasi(kararKutu, "ust");
  dogrula(Math.abs(tepe.x - 90) < 0.5 && Math.abs(tepe.y - 0) < 0.5, `karar üst tutunması yanlış: ${JSON.stringify(tepe)}`);

  // Alt alta duran kutularda "oto" yön DİKEY seçmeli (akış şeması yukarıdan
  // aşağı okunur); yan yana durunca yatay.
  const dikey = otoYonler({ x: 0, y: 0, w: 100, h: 50 }, { x: 0, y: 200, w: 100, h: 50 });
  dogrula(dikey.kaynak === "alt" && dikey.hedef === "ust", "alt alta kutularda oto yön dikey değil");
  const yatay = otoYonler({ x: 0, y: 0, w: 100, h: 50 }, { x: 300, y: 0, w: 100, h: 50 });
  dogrula(yatay.kaynak === "sag" && yatay.hedef === "sol", "yan yana kutularda oto yön yatay değil");

  // Tutunduğu şekil YOKSA yol üretilmemeli (yetim bağlayıcı savunması).
  dogrula(
    baglayiciYolu([ust, ok], ok as never) === null,
    "hedefi silinmiş bağlayıcı yine de çiziliyor",
  );
}

// Bağlayıcı da şablon beyaz listesinde olmalı.
dogrula(
  sekilGecerliMi({ id: "b1", tur: "baglayici", kalinlik: 2, kaynak: { sekilId: "a" }, hedef: { sekilId: "b" } }),
  "bağlayıcı şablon beyaz listesinde yok",
);

console.log("✓ Bağlayıcı: dik açılı yol, kutuya tutunma, karar kutusu köşesi, oto yön, yetim savunması");
// ── Büyüyebilen tuval ───────────────────────────────────────────────────────
//
// KORUDUĞU ŞEY: sınırlama artık SABİTE değil, verilen ölçüye göre yapılmalı.
// Tuval sabitken bu ayrım yoktu; büyük tuvalde sabite göre sınırlamak şekli
// görünmez bir duvara çarptırır (ve öğretmen neden ilerlemediğini anlamaz).
{
  const genisTuval = { w: 1920, h: 1200 };
  const kutuSekli: CizimSekli = {
    id: "t1", tur: "dikdortgen", kalinlik: 2, x: 1700, y: 1000, w: 150, h: 100,
  } as CizimSekli;

  // Varsayılan (960×600) ölçüyle sınırlanırsa şekil sola/yukarı ÇEKİLİR.
  const varsayilanla = sekilTasiSinirli(ctx, kutuSekli, 0, 0);
  dogrula(
    varsayilanla.tur === "dikdortgen" && varsayilanla.x < 1700,
    "ön koşul: varsayılan ölçü büyük tuvaldeki şekli geri çekmeli",
  );

  // Gerçek ölçü verilince YERİNDE kalmalı.
  const genisle = sekilTasiSinirli(ctx, kutuSekli, 0, 0, genisTuval);
  dogrula(
    genisle.tur === "dikdortgen" && Math.abs(genisle.x - 1700) < 0.01 && Math.abs(genisle.y - 1000) < 0.01,
    `geniş tuvalde şekil sabite göre sınırlanıyor: ${JSON.stringify(genisle)}`,
  );

  // Sağ kenardan taşırma yine ENGELLENMELİ — sınır kalkmış olmamalı.
  const tasiran = sekilTasiSinirli(ctx, kutuSekli, 500, 0, genisTuval);
  dogrula(
    tasiran.tur === "dikdortgen" && tasiran.x + tasiran.w <= genisTuval.w + 0.01,
    "geniş tuvalde sınır tamamen kalkmış — şekil tuvalin dışına çıkıyor",
  );

  // Geometri alanı da verilen ölçüye uymalı.
  const ayarli = sekilGeometriAyarla(kutuSekli, { x: 1800 }, genisTuval);
  dogrula(
    ayarli.tur === "dikdortgen" && Math.abs(ayarli.x - 1800) < 0.01,
    `sekilGeometriAyarla verilen ölçüyü kullanmıyor: ${JSON.stringify(ayarli)}`,
  );

  // Boş tuvalde içerik sınırı = verilen ölçü.
  const bosSinir = cizimIcerikSiniri(ctx, [], 14, genisTuval);
  dogrula(
    bosSinir.w === genisTuval.w && bosSinir.h === genisTuval.h,
    "boş tuvalde içerik sınırı sabite düşüyor",
  );
}

console.log("✓ Büyüyebilen tuval: sınırlama sabite değil verilen ölçüye göre");

/**
 * BAĞLAYICILAR ÇİZİM YOLUNUN HER İKİ UCUNDA DA ÇİZİLMELİ.
 *
 * KORUDUĞU ŞEY sessiz kayıp: iki çizim yolu vardı. Ekrandaki tuval iki geçişli
 * çiziyordu, soruya eklenen GÖRSELİ üreten dışa aktarma ise şekilleri tek tek
 * `sekilCiz`den geçiriyordu — `sekilCiz` bağlayıcının yolunu şekil listesi
 * olmadan hesaplayamadığı için hiçbir şey çizmeden dönüyordu. Öğretmen akış
 * şemasını ekranda tam görüyor, kâğıtta oklar HİÇ çıkmıyordu.
 *
 * İddia davranışsal: aynı şekil listesi bağlayıcıyla ve bağlayıcısız
 * çizildiğinde çizgi çağrılarının SAYISI artmalı.
 */
{
  const cagrilar: string[] = [];
  const kayitCtx = new Proxy(
    { font: "", textAlign: "left", textBaseline: "alphabetic", fillStyle: "#000", strokeStyle: "#000", lineWidth: 1 } as Record<string, unknown>,
    {
      get(hedef, ad: string) {
        if (ad in hedef && typeof hedef[ad] !== "function") return hedef[ad];
        if (ad === "measureText") return (m: string) => ({ width: [...m].length * 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 3 });
        return (...args: unknown[]) => { cagrilar.push(`${ad}(${args.join(",")})`); };
      },
      set(hedef, ad: string, deger) { hedef[ad] = deger; return true; },
    },
  ) as unknown as CanvasRenderingContext2D;

  const kutu = (id: string, x: number, y: number): Sekil => ({
    id, tur: "akis", akisSekli: "islem", kalinlik: 2, cizgiTipi: "duz",
    x, y, w: 160, h: 70, metin: id,
  });
  const ok: Sekil = {
    id: "ok1", tur: "baglayici", kalinlik: 2, cizgiTipi: "duz",
    kaynak: { sekilId: "k1" }, hedef: { sekilId: "k2" }, okUcu: "son",
  };
  const kutular = [kutu("k1", 100, 100), kutu("k2", 100, 300)];

  cagrilar.length = 0;
  sekilleriCiz(kayitCtx, kutular);
  const okSuz = cagrilar.filter((c) => c.startsWith("lineTo")).length;

  cagrilar.length = 0;
  sekilleriCiz(kayitCtx, [...kutular, ok]);
  const okVar = cagrilar.filter((c) => c.startsWith("lineTo")).length;

  dogrula(
    okVar > okSuz,
    `bağlayıcı hiç çizilmedi: oksuz ${okSuz}, oklu ${okVar} lineTo — dışa aktarılan görselde oklar kaybolur`,
  );

  // SIRA: bağlayıcı kutulardan ÖNCE çizilmeli, yoksa dolgulu kutu okun ucunu örter.
  cagrilar.length = 0;
  sekilleriCiz(kayitCtx, [kutu("k1", 100, 100), ok, kutu("k2", 100, 300)]);
  const ilkKutuCizimi = cagrilar.findIndex((c) => c.startsWith("fillText"));
  const ilkOkCizimi = cagrilar.findIndex((c) => c.startsWith("lineTo"));
  dogrula(
    ilkOkCizimi >= 0 && ilkOkCizimi < ilkKutuCizimi,
    `bağlayıcı kutudan SONRA çiziliyor (ok ${ilkOkCizimi}, kutu ${ilkKutuCizimi}) — dolgulu kutu okun ucunu örter`,
  );
}
console.log("✓ Bağlayıcılar tek çizim kapısından geçiyor (dışa aktarmada da çiziliyor)");

/**
 * İÇERİK SINIRI BAĞLAYICIYI DA SAYMALI.
 *
 * ASIL KORUDUĞU: `sekilHamSinirlari` bağlayıcıya `-1e6` veriyor ve bu sol/üst
 * uçta 0'a kırpılıyordu — yani bağlayıcı içeren HER çizimin sınırı (0,0)'dan
 * başlıyor, soruya eklenen görselin soluna ve üstüne koca bir boşluk giriyordu
 * (ölçüldü: 196×306 olması gereken kırpma 478×488).
 */
{
  // 1) Gerçekçi durum: iki kutu + tutunan ok. Ok sınırı GENİŞLETMEMELİ.
  const k1: Sekil = { id: "k1", tur: "akis", akisSekli: "islem", kalinlik: 2, cizgiTipi: "duz", x: 300, y: 200, w: 160, h: 70, metin: "k1" };
  const k2: Sekil = { id: "k2", tur: "akis", akisSekli: "islem", kalinlik: 2, cizgiTipi: "duz", x: 300, y: 400, w: 160, h: 70, metin: "k2" };
  const tutunanOk: Sekil = { id: "ok0", tur: "baglayici", kalinlik: 2, cizgiTipi: "duz", kaynak: { sekilId: "k1" }, hedef: { sekilId: "k2" }, okUcu: "son" };
  const okla = cizimIcerikSiniri(ctx, [k1, k2, tutunanOk], 14);
  const oksuz = cizimIcerikSiniri(ctx, [k1, k2], 14);
  dogrula(
    okla.x === oksuz.x && okla.y === oksuz.y && okla.w === oksuz.w && okla.h === oksuz.h,
    `bağlayıcı içerik sınırını değiştiriyor: ${JSON.stringify(okla)} ≠ ${JSON.stringify(oksuz)} — görselin soluna/üstüne boşluk giriyor`,
  );
  dogrula(okla.x > 0 && okla.y > 0, `sınır hâlâ (0,0)'a sıçrıyor: ${JSON.stringify(okla)}`);
}
{
  const kutu: Sekil = {
    id: "k1", tur: "akis", akisSekli: "islem", kalinlik: 2, cizgiTipi: "duz",
    x: 400, y: 300, w: 160, h: 70, metin: "k",
  };
  // Serbest uç kutunun EPEY solunda: sınır onu içermeli.
  const serbestOk: Sekil = {
    id: "ok1", tur: "baglayici", kalinlik: 2, cizgiTipi: "duz",
    kaynak: { x: 40, y: 330 }, hedef: { sekilId: "k1" }, okUcu: "son",
  };
  const sinir = cizimIcerikSiniri(ctx, [kutu, serbestOk], 14);
  dogrula(
    sinir.x <= 40,
    `serbest uç sınırın dışında kaldı (sınır solu ${sinir.x}, uç 40) — ok kırpılır`,
  );

  // Yetim bağlayıcı (tutunduğu şekil yok) sınırı BOZMAMALI: yolu hesaplanamıyor.
  const yetim: Sekil = {
    id: "ok2", tur: "baglayici", kalinlik: 2, cizgiTipi: "duz",
    kaynak: { sekilId: "yok-boyle-bir-sey" }, hedef: { sekilId: "k1" },
  };
  const yetimli = cizimIcerikSiniri(ctx, [kutu, yetim], 14);
  const yalniz = cizimIcerikSiniri(ctx, [kutu], 14);
  dogrula(
    Math.abs(yetimli.x - yalniz.x) < 0.01 && Math.abs(yetimli.w - yalniz.w) < 0.01,
    `yetim bağlayıcı sınırı kaydırıyor: ${JSON.stringify(yetimli)} ≠ ${JSON.stringify(yalniz)}`,
  );
}
console.log("✓ İçerik sınırı bağlayıcının yolunu da sayıyor (serbest uç kırpılmıyor)");

/**
 * AKIŞ KUTUSUNDA DENKLEM.
 *
 * Öğretmen bildirdi: "akış şemasında kutucuklara denklem yazamıyoruz."
 * Kutu ya metin ya denklem gösterir. İddialar:
 *  - denklem varken METİN çizilmez (ikisi üst üste binmez),
 *  - denklem kutunun İÇİNE sığdırılır (taşarsa şema okunmaz olur),
 *  - denklem kaldırılınca metin geri gelir (veri silinmemiş),
 *  - bozuk denklem şablon süzgecinden geçmez (çizim döngüsü patlamasın).
 */
{
  const kaydedenCtx = () => {
    const cagrilar: { ad: string; args: unknown[] }[] = [];
    const durum: Record<string, unknown> = { font: "", textAlign: "left", textBaseline: "alphabetic", fillStyle: "#000", strokeStyle: "#000", lineWidth: 1 };
    // Dönüşüm takibi: motor `ctx.scale`/`translate` ile sığdırıyor, çizilen
    // noktaların BELGE koordinatını bilmek için ölçek/öteleme izleniyor.
    let d = { olcek: 1, dx: 0, dy: 0 };
    const yigin: typeof d[] = [];
    const ctx = new Proxy(durum, {
      get(hedef, ad: string) {
        if (ad in hedef && typeof hedef[ad] !== "function") return hedef[ad];
        if (ad === "measureText") return (m: string) => ({ width: [...m].length * 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 3 });
        if (ad === "save") return () => { yigin.push({ ...d }); };
        if (ad === "restore") return () => { d = yigin.pop() ?? d; };
        if (ad === "translate") return (x: number, y: number) => { d.dx += x * d.olcek; d.dy += y * d.olcek; };
        if (ad === "scale") return (s: number) => { d.olcek *= s; };
        return (...args: unknown[]) => {
          const konumlu = ad === "fillText" || ad === "strokeText";
          cagrilar.push({
            ad,
            args: konumlu
              ? [args[0], d.dx + (args[1] as number) * d.olcek, d.dy + (args[2] as number) * d.olcek]
              : args,
          });
        };
      },
      set(hedef, ad: string, deger) { hedef[ad] = deger; return true; },
    }) as unknown as CanvasRenderingContext2D;
    return { ctx, cagrilar };
  };

  const temelKutu = {
    id: "k1", tur: "akis" as const, akisSekli: "islem" as const, kalinlik: 2,
    cizgiTipi: "duz" as const, x: 100, y: 100, w: 200, h: 90, metin: "ESKİ METİN",
  };
  const belge = {
    surum: "v1" as const,
    punto: 18,
    parcalar: [
      { id: "p1", tur: "metin" as const, deger: "x =" },
      { id: "p2", tur: "kesir" as const, pay: "a", payda: "b" },
    ],
  };

  // 1) Denklem varken metin çizilmemeli.
  const a = kaydedenCtx();
  sekilleriCiz(a.ctx, [{ ...temelKutu, denklem: belge } as Sekil]);
  const yazilanlar = a.cagrilar.filter((c) => c.ad === "fillText").map((c) => String(c.args[0]));
  dogrula(
    !yazilanlar.includes("ESKİ METİN"),
    `denklem varken kutu metni de çiziliyor (${JSON.stringify(yazilanlar)}) — ikisi üst üste biner`,
  );
  dogrula(yazilanlar.length > 0, "denklem hiç çizilmedi — kutu boş çıkar");

  // Çizilen denklemin YATAY YAYILIMI. Tek tek çapa noktalarına bakmak
  // yetmiyordu: `fillText`in x,y'si mürekkebin kutusu değil çapa noktası,
  // dolayısıyla denklem taşsa bile çapalar kutunun içinde kalabiliyor
  // (ölçek mutasyonu ilk yazışta tam bu yüzden KAÇTI). Yayılım ve merkez
  // ölçülüyor.
  const yayilim = (cagrilar: { ad: string; args: unknown[] }[]) => {
    const xler = cagrilar.filter((c) => c.ad === "fillText").map((c) => c.args[1] as number);
    return { en: Math.max(...xler) - Math.min(...xler), orta: (Math.max(...xler) + Math.min(...xler)) / 2 };
  };

  // 2) ORTALAMA: denklemin yatay ortası kutunun ortasında olmalı. Sol üst
  //    köşeden çizen bir gerileme burada düşer.
  const genisYayilim = yayilim(a.cagrilar);
  dogrula(genisYayilim.en > 0, "denklem tek noktaya çizilmiş — yayılım ölçülemiyor");
  dogrula(
    Math.abs(genisYayilim.orta - (temelKutu.x + temelKutu.w / 2)) < temelKutu.w * 0.25,
    `denklem kutuda ortalanmamış: çizim ortası ${genisYayilim.orta.toFixed(1)}, kutu ortası ${temelKutu.x + temelKutu.w / 2}`,
  );

  // 3) ASIL SIĞDIRMA İDDİASI: kutuya sığmayacak kadar büyük bir denklem
  //    KÜÇÜLTÜLMELİ. Aynı denklem dar kutuda daha küçük yayılmalı ve
  //    yayılımı kutunun iç genişliğini AŞMAMALI.
  //    Kutu KASITLI olarak çok dar: 60×40'ta ölçeksiz yayılım (38,6) kutu
  //    genişliğinin ALTINDA kaldığı için mutasyon 38,5 < 38,6 farkıyla
  //    sıyrılıyordu. 30×24'te ölçeksiz yayılım kutuyu açıkça aşar.
  const darKutu = { ...temelKutu, w: 30, h: 24 };
  const b = kaydedenCtx();
  sekilleriCiz(b.ctx, [{ ...darKutu, denklem: belge } as Sekil]);
  const darYayilim = yayilim(b.cagrilar);
  dogrula(
    darYayilim.en < genisYayilim.en * 0.5,
    `dar kutuda denklem küçültülmemiş: geniş kutuda yayılım ${genisYayilim.en.toFixed(1)}, dar kutuda ${darYayilim.en.toFixed(1)}`,
  );
  dogrula(
    darYayilim.en <= darKutu.w,
    `dar kutuda denklemin yayılımı (${darYayilim.en.toFixed(1)}) kutu genişliğini (${darKutu.w}) aşıyor`,
  );
  dogrula(
    Math.abs(darYayilim.orta - (darKutu.x + darKutu.w / 2)) < darKutu.w * 0.25,
    `dar kutuda denklem ortalanmamış: ${darYayilim.orta.toFixed(1)} ≠ ${darKutu.x + darKutu.w / 2}`,
  );

  // 4) Denklem kaldırılınca metin geri gelmeli (veri silinmemiş olmalı).
  const c = kaydedenCtx();
  sekilleriCiz(c.ctx, [{ ...temelKutu } as Sekil]);
  dogrula(
    c.cagrilar.some((x) => x.ad === "fillText" && x.args[0] === "ESKİ METİN"),
    "denklemsiz kutuda metin çizilmiyor",
  );

  // 5) Beyaz liste: bozuk denklem geçmemeli, sağlam denklem geçmeli.
  dogrula(
    sekilGecerliMi({ ...temelKutu, denklem: belge }),
    "sağlam denklemli akış kutusu şablon süzgecinden düşüyor",
  );
  dogrula(
    !sekilGecerliMi({ ...temelKutu, denklem: { surum: "v1", punto: 18, parcalar: "bozuk" } }),
    "parçaları dizi OLMAYAN denklem süzgeçten geçiyor — çizim döngüsü patlar",
  );
  dogrula(
    !sekilGecerliMi({ ...temelKutu, denklem: { surum: "v1", parcalar: [] } }),
    "puntosuz denklem süzgeçten geçiyor — ölçüm NaN döner",
  );
  dogrula(
    !sekilGecerliMi({ ...temelKutu, denklem: { surum: "v1", punto: 18, parcalar: [{ id: "x" }] } }),
    "türsüz parça süzgeçten geçiyor",
  );
}
console.log("✓ Akış kutusunda denklem: metnin yerine geçiyor, kutuya sığdırılıyor, beyaz liste tam");

/**
 * PENCEREYE SIĞDIR oranı.
 *
 * KORUDUĞU ŞEY: "sığdır" dedikten sonra kaydırma çubuğu ÇIKMAMALI — çıkarsa
 * düğme işini yapmamış olur. Kabın dolgusu/kenarlığı için pay düşülüyor;
 * pay unutulursa oran tam sınırda çıkar ve çubuk geri gelir.
 */
{
  const olcu = { w: 1920, h: 1200 };
  // Kap dar: yükseklik belirleyici.
  const dar = sigdirmaOrani(1118, 469, olcu);
  dogrula(dar >= 25 && dar <= 200, `oran aralık dışında: ${dar}`);
  dogrula(
    (olcu.h * dar) / 100 <= 469 && (olcu.w * dar) / 100 <= 1118,
    `sığdırma oranı (${dar}) kabı aşıyor — kaydırma çubuğu çıkar`,
  );
  // PAY gerçekten düşülmeli. Ölçüler KASITLI seçildi: 1000 yüksekliğinde tuval
  // 500'lük kapta paysız TAM %50 verir (500 px = kabın tamamı) ve kabın kendi
  // iç dolgusu (p-2) yüzünden çubuk yine çıkar. Rastgele bir ölçüde bu
  // yakalanmıyordu — 5'e yuvarlama 24 px'lik farkı yutuyor (mutasyon böyle
  // kaçtı).
  const tamSinir = sigdirmaOrani(2000, 500, { w: 1000, h: 1000 });
  dogrula(
    (1000 * tamSinir) / 100 <= 500 - 20,
    `oran (${tamSinir}) kabı tam dolduruyor — dolgu payı düşülmemiş, kaydırma çubuğu geri gelir`,
  );
  // Küçük tuval büyük kapta: %100'ü AŞMAMALI (punto kâğıttaki gerçek boyut).
  dogrula(
    sigdirmaOrani(4000, 3000, { w: 300, h: 200 }) <= 200,
    "sığdırma üst sınırı aşıyor",
  );
  // Beşin katına yuvarlanmalı: %137 gibi bir değer sonraki ±25 adımlarını bozar.
  dogrula(dar % 5 === 0, `oran 5'in katı değil: ${dar}`);
  // Ölçüsüz/bozuk kapta güvenli varsayılan.
  dogrula(sigdirmaOrani(0, 0, olcu) === 100, "kap ölçülemediğinde %100'e düşmüyor");
}
console.log("✓ Pencereye sığdır: kaydırma çubuğu bırakmayan oran");

// ── Madde 15: döndürülmüş şekli boyutlandırırken sabit köşe dünyada sabit ──
{
  const dunyaKosesi = (sk: Sekil, kose: "sol-ust" | "sag-ust" | "sol-alt" | "sag-alt") => {
    const k = sekilGeometriKutusu(sk);
    const yerel = kose === "sol-ust" ? { x: k.x, y: k.y } : kose === "sag-ust" ? { x: k.x + k.w, y: k.y }
      : kose === "sol-alt" ? { x: k.x, y: k.y + k.h } : { x: k.x + k.w, y: k.y + k.h };
    return noktaDondur(yerel, sekilMerkezi(ctx, sk), sk.donus ?? 0);
  };
  const karsi = { "sol-ust": "sag-alt", "sag-ust": "sol-alt", "sol-alt": "sag-ust", "sag-alt": "sol-ust" } as const;
  for (const tur of ["dikdortgen", "elips"] as const) {
    for (const derece of [30, 90]) {
      const sk = { id: `r-${tur}`, tur, ...ortak, x: 200, y: 150, w: 180, h: 90, donus: derece } as Sekil;
      for (const tutamac of ["sol-ust", "sag-ust", "sol-alt", "sag-alt"] as const) {
        const sabitOnce = dunyaKosesi(sk, karsi[tutamac]);
        const tutulan = dunyaKosesi(sk, tutamac);
        // İmleç dünyada sürükleniyor; tuval bunu şeklin YEREL uzayına çevirip veriyor.
        // (a) köşeyi dışarı doğru çek (kutu ters dönmez): karşı köşe AYNI adlı köşe olarak kalmalı.
        const disari = { x: tutulan.x + (tutulan.x - sabitOnce.x) * 0.3, y: tutulan.y + (tutulan.y - sabitOnce.y) * 0.3 };
        const yeni = sekilBoyutlandir(sk, tutamac, noktaYerel(ctx, sk, disari));
        const sabitSonra = dunyaKosesi(yeni, karsi[tutamac]);
        dogrula(Math.hypot(sabitOnce.x - sabitSonra.x, sabitOnce.y - sabitSonra.y) < 1e-6,
          `${derece}° ${tur} ${tutamac}: karşı köşe kaydı (${sabitOnce.x.toFixed(2)},${sabitOnce.y.toFixed(2)}) → (${sabitSonra.x.toFixed(2)},${sabitSonra.y.toFixed(2)})`);
        const yeniTutulan = dunyaKosesi(yeni, tutamac);
        dogrula(Math.hypot(yeniTutulan.x - disari.x, yeniTutulan.y - disari.y) < 1e-6, `${derece}° ${tur} ${tutamac}: sürüklenen köşe imlecin altında değil`);
        // (b) karşı köşeyi aşacak kadar çek (kutu ters döner): sabit nokta yine yeni kutunun bir köşesi.
        const ters = { x: sabitOnce.x + 260, y: sabitOnce.y - 140 };
        const yeni2 = sekilBoyutlandir(sk, tutamac, noktaYerel(ctx, sk, ters));
        const enYakin = Math.min(...(["sol-ust", "sag-ust", "sol-alt", "sag-alt"] as const).map((k) => {
          const n = dunyaKosesi(yeni2, k);
          return Math.hypot(n.x - sabitOnce.x, n.y - sabitOnce.y);
        }));
        dogrula(enYakin < 1e-6, `${derece}° ${tur} ${tutamac} (ters dönen): sabit köşe ${enYakin.toFixed(2)} px kaydı`);
        dogrula(Math.abs((yeni.donus ?? 0) - derece) < 1e-9, "boyutlandırma açıyı değiştirdi");
      }
    }
  }
  // Döndürülmüş üçgende nokta tutamacı: sürüklenmeyen köşeler yerinde, sürüklenen imlecin altında.
  const ucgenD: Sekil = { id: "u-d", tur: "ucgen", ...ortak, donus: 30, x1: 300, y1: 100, x2: 200, y2: 300, x3: 420, y3: 280 };
  const dunya = (sk: Sekil, i: number) => {
    const u = sk as Extract<Sekil, { tur: "ucgen" }>;
    const n = [{ x: u.x1, y: u.y1 }, { x: u.x2, y: u.y2 }, { x: u.x3, y: u.y3 }][i];
    return noktaDondur(n, sekilMerkezi(ctx, sk), 30);
  };
  const imlec = { x: 520, y: 420 };
  const ucgenSonra = sekilBoyutlandir(ucgenD, "nokta-2", noktaYerel(ctx, ucgenD, imlec));
  for (const i of [0, 1]) {
    const a = dunya(ucgenD, i), b = dunya(ucgenSonra, i);
    dogrula(Math.hypot(a.x - b.x, a.y - b.y) < 1e-6, `döndürülmüş üçgende ${i}. köşe kaydı`);
  }
  const surulen = dunya(ucgenSonra, 2);
  dogrula(Math.hypot(surulen.x - imlec.x, surulen.y - imlec.y) < 1e-6, "sürüklenen köşe imlecin altında değil");
  // Dönüşsüz şekilde davranış aynen eski (öteleme yok).
  const duz: Sekil = { id: "d0", tur: "dikdortgen", ...ortak, x: 10, y: 10, w: 50, h: 40 };
  const duzSonra = sekilBoyutlandir(duz, "sag-alt", { x: 100, y: 80 }) as Extract<Sekil, { tur: "dikdortgen" }>;
  dogrula(duzSonra.x === 10 && duzSonra.y === 10 && duzSonra.w === 90 && duzSonra.h === 70, "dönüşsüz boyutlandırma değişti");
}
console.log("✓ Madde 15: 30°/90° döndürülmüş kutu ve üçgende sabit köşe dünyada sabit");

// ── Madde 13: kopyalamada bağlayıcı uçları yeni kimliklere eşlenir ─────────
{
  const k1: Sekil = { id: "k1", tur: "fizik", nesne: "kutle", kalinlik: 2, x: 100, y: 100, w: 80, h: 60 } as Sekil;
  const k2: Sekil = { id: "k2", tur: "fizik", nesne: "kutle", kalinlik: 2, x: 400, y: 100, w: 80, h: 60 } as Sekil;
  const ip: Sekil = { id: "ip", tur: "baglayici", kalinlik: 2, kaynak: { sekilId: "k1" }, hedef: { sekilId: "k2" }, stil: "duz" };
  const vektor: Sekil = { id: "v", tur: "baglayici", kalinlik: 2, kaynak: { sekilId: "k1" }, hedef: { x: 140, y: 260 }, stil: "vektor", okUcu: "son" };
  const tum = [k1, k2, ip, vektor];
  // Seçim (k1, k2) bağlayıcıları kendiliğinden kapsar.
  const genis = seciliBaglayicilarlaGenislet(["k1", "k2"], tum);
  dogrula(genis.includes("ip") && genis.includes("v"), "seçili şekiller arasındaki bağlayıcılar seçime eklenmedi");
  dogrula(!seciliBaglayicilarlaGenislet(["k1"], tum).includes("ip"), "dışarıya bağlı ip seçime yanlışlıkla eklendi");
  let n = 0;
  const kopya = kimlikleriYenile(tum, () => `yeni-${++n}`);
  const idler = new Set(kopya.map((s) => s.id));
  const kIp = kopya.find((s) => s.tur === "baglayici" && "sekilId" in s.hedef) as Extract<Sekil, { tur: "baglayici" }>;
  dogrula(!!kIp && "sekilId" in kIp.kaynak && idler.has(kIp.kaynak.sekilId) && kIp.kaynak.sekilId !== "k1", "kopya ip eski kutuya bağlı kaldı");
  dogrula(baglayiciYolu(kopya, kIp) !== null, "kopya ipin yolu çizilemiyor");
  // Kümede karşılığı olmayan uç → serbest nokta (o anki ekrandaki ucunda).
  const yalnizK1 = disUclariSerbestBirak([k1, ip], tum);
  const serbestIp = yalnizK1.find((s) => s.id === "ip") as Extract<Sekil, { tur: "baglayici" }>;
  const eskiYol = baglayiciYolu(tum, ip as Extract<Sekil, { tur: "baglayici" }>)!;
  dogrula(!("sekilId" in serbestIp.hedef) && Math.abs((serbestIp.hedef as { x: number }).x - eskiYol[eskiYol.length - 1].x) < 1e-6,
    "seçim dışı şekle bağlı uç serbest noktaya çevrilmedi");
  dogrula("sekilId" in serbestIp.kaynak && serbestIp.kaynak.sekilId === "k1", "seçim içi uç bozuldu");
  // Eski kayıtlı (kopuk) şablon: dışarıya bağlı uç eklenince atılır, iç uçlar eşlenir.
  const eskiSablon = kimlikleriYenile([k1, ip]);
  dogrula(eskiSablon.length === 1 && eskiSablon[0].tur === "fizik", "eşlenemeyen uçlu bağlayıcı atılmadı");
  // Birlikte taşıma: tek uçlu vektör cisimle gelir; iki şekle bağlı ip gelmez.
  const birlikte = birlikteTasinanBaglayicilar(tum, ["k1"]).map((s) => s.id);
  dogrula(birlikte.length === 1 && birlikte[0] === "v", `birlikte taşınan bağlayıcılar yanlış: ${birlikte.join(",")}`);
  // Seçili serbest vektör ok tuşuyla/çoğaltmayla 1e6 px fırlamamalı.
  const serbestV: Sekil = { id: "sv", tur: "baglayici", kalinlik: 2, kaynak: { x: 100, y: 100 }, hedef: { x: 200, y: 100 }, stil: "vektor" };
  const kaymis = sekilTasiSinirli(ctx, serbestV, 1, 0, { w: 960, h: 600 }) as Extract<Sekil, { tur: "baglayici" }>;
  dogrula((kaymis.kaynak as { x: number }).x === 101 && (kaymis.hedef as { x: number }).x === 201, `serbest vektör ok tuşuyla yanlış kaydı: ${JSON.stringify(kaymis.kaynak)}`);
  const kenar = tasimaKenarDegerleri(ctx, [k1, ip, vektor]);
  dogrula(kenar.sol > -1000 && kenar.ust > -1000, "bağlayıcı taşıma sınırını -1e6'ya çekti");
}
console.log("✓ Madde 13: çoğalt/şablon bağlayıcı eşlemesi, serbest uç, birlikte taşıma");

// ── Madde 16: temel şekillere renk/dolgu; eski çizim aynen ─────────────────
{
  const kayitci = () => {
    const kayit: { ad: string; renk?: string }[] = [];
    const nesne: Record<string, unknown> = { font: "", lineWidth: 1, strokeStyle: "", fillStyle: "" };
    const p: any = new Proxy(nesne, {
      get(h, ad: string) {
        if (ad === "measureText") return (m: string) => ({ width: [...m].length * 10 });
        if (ad in h) return h[ad];
        return () => { kayit.push({ ad, renk: ad === "fill" || ad === "fillText" ? String(h.fillStyle) : ad === "stroke" ? String(h.strokeStyle) : undefined }); };
      },
      set(h, ad: string, v) { h[ad] = v; return true; },
    });
    // save/restore fillStyle'ı gerçekten geri almalı.
    const yigin: unknown[] = [];
    nesne.save = () => { yigin.push(nesne.fillStyle); };
    nesne.restore = () => { nesne.fillStyle = yigin.pop(); };
    return { ctx: p as CanvasRenderingContext2D, kayit };
  };
  const eski: Sekil = { id: "e", tur: "dikdortgen", ...ortak, x: 10, y: 10, w: 50, h: 40 };
  const a = kayitci();
  sekilleriCiz(a.ctx, [eski]);
  dogrula(!a.kayit.some((k) => k.ad === "fill"), "renk/dolgu alanı olmayan eski şekil dolduruldu");
  dogrula(a.kayit.filter((k) => k.ad === "stroke").every((k) => k.renk === "#0f172a"), "eski şeklin rengi değişti");
  const boyali = { ...eski, renk: "#1d4ed8", dolgu: "#e2e8f0" } as Sekil;
  const b = kayitci();
  sekilleriCiz(b.ctx, [boyali]);
  dogrula(b.kayit.some((k) => k.ad === "fill" && k.renk === "#e2e8f0"), "dolgu boyanmadı");
  dogrula(b.kayit.some((k) => k.ad === "stroke" && k.renk === "#1d4ed8"), "çizgi rengi uygulanmadı");
  const fillSira = b.kayit.findIndex((k) => k.ad === "fill"), strokeSira = b.kayit.findIndex((k) => k.ad === "stroke");
  dogrula(fillSira < strokeSira, "dolgu kenarın üstüne boyandı");
  const metinR: Sekil = { id: "m", tur: "metin", metin: "F", x: 10, y: 40, renk: "#b91c1c" };
  const c = kayitci();
  sekilleriCiz(c.ctx, [metinR]);
  dogrula(c.kayit.filter((k) => k.ad === "fillText").every((k) => k.renk === "#b91c1c"), "metin rengi uygulanmadı");
  // Güvenlik: yalnız #rrggbb.
  dogrula(temelRenk({ ...eski, renk: "url(javascript:1)" } as Sekil) === "#0f172a", "geçersiz renk çizime ulaştı");
  dogrula(temelDolgu({ ...eski, dolgu: "red" } as Sekil) === null, "geçersiz dolgu çizime ulaştı");
  dogrula(!sekilGecerliMi({ ...eski, renk: "expression(1)" }), "şablon doğrulayıcı geçersiz rengi kabul etti");
  dogrula(!sekilGecerliMi({ ...eski, dolgu: "#12" }), "şablon doğrulayıcı geçersiz dolguyu kabul etti");
  dogrula(sekilGecerliMi(boyali), "şablon doğrulayıcı geçerli renk/dolguyu reddetti");
  dogrula(SABLON_ADI_SINIRI >= 32 && "Eğik Düzlem Sürtünmeli".length <= SABLON_ADI_SINIRI, "şablon adı sınırı 32 değil");
}
console.log("✓ Madde 16: renk/dolgu çizimi, eski çizim aynen, #rrggbb süzgeci, şablon adı 32");

console.log("TÜM ÇİZİM EDİTÖRÜ SENARYOLARI BAŞARILI");
