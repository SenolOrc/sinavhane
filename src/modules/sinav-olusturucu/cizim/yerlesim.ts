// Yeni eklenen şekil için boş yer bulma. Saf fonksiyon (tuval/React bilmez).

export type Kutu = { x: number; y: number; w: number; h: number };

const BOSLUK = 14;

function kesisir(a: Kutu, b: Kutu, pay: number) {
  return a.x < b.x + b.w + pay && a.x + a.w + pay > b.x && a.y < b.y + b.h + pay && a.y + a.h + pay > b.y;
}

/**
 * Tuval ortasına en yakın, mevcut kutularla (etiket payı dâhil) kesişmeyen
 * konumu döndürür. Hiç boş yer yoksa orta + kademeli kayma (eski davranış).
 */
export function bosYerBul(mevcut: Kutu[], w: number, h: number, tuval: { w: number; h: number }): { x: number; y: number } {
  const kenar = 10;
  const enX = Math.max(kenar, tuval.w - w - kenar);
  const enY = Math.max(kenar, tuval.h - h - kenar);
  const ortaX = Math.min(enX, Math.max(kenar, (tuval.w - w) / 2));
  const ortaY = Math.min(enY, Math.max(kenar, (tuval.h - h) / 2));
  const adaylar: { x: number; y: number; d: number }[] = [];
  for (let y = kenar; y <= enY; y += 20) {
    for (let x = kenar; x <= enX; x += 20) {
      adaylar.push({ x, y, d: Math.hypot(x - ortaX, y - ortaY) });
    }
  }
  adaylar.sort((a, b) => a.d - b.d);
  for (const a of adaylar) {
    const kutu = { x: a.x, y: a.y, w, h };
    if (!mevcut.some((m) => kesisir(kutu, m, BOSLUK))) return { x: Math.round(a.x), y: Math.round(a.y) };
  }
  const kayma = (mevcut.length % 6) * 26;
  return { x: Math.round(Math.min(enX, ortaX + kayma)), y: Math.round(Math.min(enY, ortaY + kayma)) };
}
