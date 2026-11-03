/**
 * İptal bildirimlerinin tek üslubu.
 *
 * Aynı bilgi modülde DÖRT ayrı yerde dört ayrı biçimde yazılmıştı ve üç şey
 * birden oynuyordu: noktalama (`.` / `;`), güvencenin kipi ("korundu" /
 * "korunuyor" / "duruyor") ve neyin korunduğunun adı ("seçiminiz" /
 * "soru seçiminiz" / "Seçiminiz Soru Havuzunda"). Cümleyi burada kurmak
 * beşinci bir varyantın doğmasını engelliyor — kopyalar arasındaki fark
 * kimsenin kararı değildi, sadece birikmişti (§9.7).
 *
 * Kalıp: `<İşlem> iptal edildi. <Korunan> korundu.`
 *
 * İkinci cümle ZORUNLU ve ayrı bir parametre: iptale basan öğretmenin ilk
 * sorusu "emeğim gitti mi?" oluyor. Neyin korunduğu her akışta farklı
 * (kitaptaki seçim, havuzdaki seçim, föye giren sorular), o yüzden metin tek
 * bir sabit değil; değişmeyen şey cümlenin biçimi.
 *
 * Buraya YALNIZ öğretmenin gördüğü iptal bildirimleri girer. Fırlatılan
 * `Error`/`DOMException` mesajları (ör. `sinavAktarimDepo.ts`) teknik ve
 * ayrı bir sınıf; onlar bu kalıba sokulmadı.
 */
export function iptalMesaji(islem: string, korunan: string): string {
  return `${islem} iptal edildi. ${korunan} korundu.`;
}
