/**
 * DENKLEM ÇİZİM MOTORU — akış şeması kutusuna denklem koyabilmenin ön şartı.
 *
 * NEDEN BU TEST VAR: motor `DenklemEditoruModal.tsx`'in içinde kapalıydı ve
 * hiç testi yoktu; tek koruması "tsc geçiyor"du. tsc, denklemin YANLIŞ YERE
 * çizildiğini göremez. Buradaki iddialar motoru modal dışından kullanmanın
 * şartlarını donduruyor:
 *   1. Ölçü ile çizim aynı yerleşimi kullanır (ölçtüğünden başka boyda çizmez).
 *   2. Verilen sol-üst köşeye ÖTELENİR — kutunun içine yerleştirmek bunu ister.
 *   3. Arka planı BOYAMAZ — akış kutusunun dolgusunu silmemeli.
 *   4. Tıklama eşlemesi yerleşimin ikinci kopyası değil, aynı hesabı okur.
 */
import type { DenklemParcasi } from "../src/modules/sinav-olusturucu/denklem/tipler";
import {
  denklemOlcusu,
  denklemiCiz,
  tiklananParca,
} from "../src/modules/sinav-olusturucu/denklem/ciz";

function dogrula(kosul: unknown, mesaj: string) {
  if (!kosul) throw new Error(`DENKLEM MOTORU TESTİ BAŞARISIZ: ${mesaj}`);
}

type Cagri = { ad: string; args: unknown[] };

/**
 * Her yöntemi kaydeden sahte bağlam. Proxy kullanılıyor çünkü motor onlarca
 * canvas yöntemi çağırıyor (beginPath/stroke/ellipse/...) ve elle sayılan bir
 * taklit, yeni bir yöntem eklendiğinde testi ÜRÜN HATASI olmadan düşürürdü.
 */
function sahteCtx() {
  const cagrilar: Cagri[] = [];
  const taban: Record<string, unknown> = {
    font: "",
    textAlign: "left",
    textBaseline: "alphabetic",
    fillStyle: "#000",
    strokeStyle: "#000",
    lineWidth: 1,
  };
  const ctx = new Proxy(taban, {
    get(hedef, ad: string) {
      if (ad in hedef && typeof hedef[ad] !== "function") return hedef[ad];
      if (ad === "measureText") {
        return (metin: string) => ({
          width: [...metin].length * 10,
          actualBoundingBoxAscent: 12,
          actualBoundingBoxDescent: 4,
        });
      }
      return (...args: unknown[]) => {
        cagrilar.push({ ad, args });
      };
    },
    set(hedef, ad: string, deger) {
      hedef[ad] = deger;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, cagrilar };
}

/** Konum taşıyan çağrılar: karşılaştırma bunlar üzerinden yapılıyor. */
const KONUMLU = new Set(["fillText", "strokeText", "moveTo", "lineTo", "fillRect", "strokeRect", "rect"]);

function konumluCagrilar(cagrilar: Cagri[]) {
  return cagrilar.filter((c) => KONUMLU.has(c.ad));
}

/** İç içe alanı da olan gerçekçi bir denklem: düz metin + kesir + integral. */
const PARCALAR: DenklemParcasi[] = [
  { id: "p1", tur: "metin", deger: "y =" },
  { id: "p2", tur: "kesir", pay: "a", payda: "b" },
  {
    id: "p3",
    tur: "integral",
    kat: 1,
    altSinir: "0",
    ustSinir: "1",
    ifade: "f(x) dx",
  },
];

function olcuCizimeUymali() {
  const { ctx, cagrilar } = sahteCtx();
  const olcu = denklemOlcusu(ctx, 18, PARCALAR);
  const cizim = denklemiCiz(ctx, 18, PARCALAR, 0, 0);

  dogrula(olcu.w > 0 && olcu.h > 0, "ölçü sıfır geldi — sahte bağlam motoru hiç çalıştırmamış");
  dogrula(
    Math.abs(olcu.w - cizim.w) < 0.0001 && Math.abs(olcu.h - cizim.h) < 0.0001,
    `ölçü (${olcu.w}×${olcu.h}) ile çizimin bildirdiği boyut (${cizim.w}×${cizim.h}) ayrışıyor`,
  );
  dogrula(
    konumluCagrilar(cagrilar).length > 0,
    "hiçbir konumlu çizim yapılmadı — iddia bir şey ölçmüyor",
  );
}

function otelemeGercekOlmali() {
  const a = sahteCtx();
  denklemiCiz(a.ctx, 18, PARCALAR, 0, 0);
  const b = sahteCtx();
  denklemiCiz(b.ctx, 18, PARCALAR, 137, 46);

  const solda = konumluCagrilar(a.cagrilar);
  const sagda = konumluCagrilar(b.cagrilar);
  dogrula(
    solda.length === sagda.length,
    `öteleyince çağrı sayısı değişti (${solda.length} → ${sagda.length}) — yerleşim konuma göre dallanıyor`,
  );

  solda.forEach((cagri, index) => {
    const esi = sagda[index];
    dogrula(cagri.ad === esi.ad, `${index}. çağrı türü değişti: ${cagri.ad} → ${esi.ad}`);
    // Konumlu çağrılarda ilk iki sayısal argüman x,y'dir (fillText'te 2. ve 3.).
    const sayisal = (c: Cagri) => c.args.filter((a) => typeof a === "number") as number[];
    const s = sayisal(cagri);
    const t = sayisal(esi);
    dogrula(
      Math.abs(t[0] - s[0] - 137) < 0.0001,
      `${index}. ${cagri.ad} x'i 137 ötelenmemiş: ${s[0]} → ${t[0]}`,
    );
    dogrula(
      Math.abs(t[1] - s[1] - 46) < 0.0001,
      `${index}. ${cagri.ad} y'si 46 ötelenmemiş: ${s[1]} → ${t[1]}`,
    );
  });
}

function arkaPlanBoyanmamali() {
  const { ctx, cagrilar } = sahteCtx();
  const olcu = denklemOlcusu(ctx, 18, PARCALAR);
  const b = sahteCtx();
  denklemiCiz(b.ctx, 18, PARCALAR, 0, 0);
  // Denklemin TAMAMINI kaplayan bir fillRect = zemin boyaması. Akış kutusunun
  // dolgusu bunun altında kalır; kutu renkli seçilince denklem beyaz bir
  // dikdörtgenin içinde durur.
  const zemin = b.cagrilar.find(
    (c) =>
      c.ad === "fillRect" &&
      typeof c.args[2] === "number" &&
      typeof c.args[3] === "number" &&
      (c.args[2] as number) >= olcu.w - 0.0001 &&
      (c.args[3] as number) >= olcu.h - 0.0001,
  );
  dogrula(!zemin, `denklemiCiz zemin boyuyor: fillRect(${zemin?.args.join(", ")})`);
  dogrula(cagrilar.length >= 0, "ölçüm bağlamı kullanılmadı");
}

function tiklamaYerlesimiOkumali() {
  const { ctx } = sahteCtx();
  const punto = 18;

  // Kenar payı ölçüden TÜRETİLEMİYOR (her ölçüde iki yanda birden var,
  // farkları alınca sadeleşiyor). Bilerek sabit: motorun PAY_ORANI'sı 0,4.
  // Değişirse bu test düşer — kenar payının sessizce değişmesi zaten
  // istenmeyen şey, tıklama eşlemesi de denklemin basıldığı yer de kayar.
  const pay = punto * 0.4;
  // Parça genişlikleri ve aralarındaki boşluk ölçümden çıkarılıyor; elle
  // yazılsalardı yerleşim değişince test ürün hatası olmadan düşerdi.
  const gen = (parca: DenklemParcasi) => denklemOlcusu(ctx, punto, [parca]).w - pay * 2;
  // Parçalar arası boşluk da ölçümden çıkarılıyor:
  // olcu(a,b) = gen(a) + bosluk + gen(b) + 2·pay
  const bosluk =
    denklemOlcusu(ctx, punto, [PARCALAR[0], PARCALAR[1]]).w
    - gen(PARCALAR[0]) - gen(PARCALAR[1]) - pay * 2;
  dogrula(bosluk > 0, `parçalar arası boşluk ölçülemedi (${bosluk}) — iddia bir şey yoklamıyor`);

  // Her parçanın SOL kenarı: pay + öncekilerin genişliği + aralarındaki boşluk.
  const sol: number[] = [];
  let x = pay;
  PARCALAR.forEach((parca, index) => {
    if (index > 0) x += bosluk;
    sol.push(x);
    x += gen(parca);
  });

  PARCALAR.forEach((parca, index) => {
    dogrula(
      tiklananParca(ctx, punto, PARCALAR, sol[index] + 1)?.id === parca.id,
      `${index + 1}. parçanın soluna (x=${sol[index] + 1}) tıklamak onu seçmiyor`,
    );
  });

  // ASIL İDDİA: parçaların YERİ boşlukla birlikte kayıyor. Son parçanın SAĞ
  // kenarına tıklamak onu seçmeli. Boşluk hesaba katılmazsa son parça iki
  // boşluk kadar (2×5,4 px) solda kalır ve bu tık hiçbir şeye düşmez —
  // merkeze tıklayan bir iddia bunu YAKALAMIYORDU (mutasyon böyle kaçtı:
  // tolerans ±punto×0,15 tek boşluğu zaten yutuyor).
  const sonIndex = PARCALAR.length - 1;
  const sonSag = sol[sonIndex] + gen(PARCALAR[sonIndex]);
  dogrula(
    tiklananParca(ctx, punto, PARCALAR, sonSag)?.id === PARCALAR[sonIndex].id,
    `son parçanın sağ kenarına (x=${sonSag}) tıklamak onu seçmiyor — yerleşim tıklamayla ayrışmış`,
  );

  dogrula(
    tiklananParca(ctx, punto, PARCALAR, 100000) === null,
    "denklemin çok sağına tıklamak bir parça döndürüyor",
  );
  // Öteleme burada da geçerli olmalı: kutu içine yerleştirilen denklemde
  // tıklama solX kadar kayar.
  dogrula(
    tiklananParca(ctx, punto, PARCALAR, 500 + sonSag, 500)?.id === PARCALAR[sonIndex].id,
    "solX verilince tıklama eşlemesi ötelenmiyor",
  );
}

function main() {
  olcuCizimeUymali();
  otelemeGercekOlmali();
  arkaPlanBoyanmamali();
  tiklamaYerlesimiOkumali();
  console.log("TÜM DENKLEM MOTORU SENARYOLARI BAŞARILI");
}

main();
