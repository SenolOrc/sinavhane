// lib.rs — Sınavhane (Tauri 2). Yalnız sınav modülünün ihtiyaç duyduğu komutlar:
//   • db_*            : taslakların/sınavların kalıcı deposu (şifreli SQLite, anahtar işletim sistemi kasasında)
//   • veri_dosyasi_*  : app_data altında dosya deposu (görsel/önizleme önbelleği)
//   • dosya_yaz       : kaydet penceresinin seçtiği yola dosya yazma (PDF/yedek dışa aktarma)
//   • sinav_parola*   : parolalı sınav dosyası (.json şifreleme)
//   • yazdir          : yazdırma / "PDF olarak kaydet" penceresi (macOS'ta A4 sabitlenir)
// Telefon köprüsü, e-Okul eklenti köprüsü ve ders kitabı içe aktarma bu sürümde YOK.

use tauri::Manager;
use aes_gcm::{Aes256Gcm, KeyInit, Nonce};
use aes_gcm::aead::{Aead, Payload};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use rand::{RngCore, rngs::OsRng};
use zeroize::Zeroizing;
use argon2::{Algorithm, Argon2, Params, Version};

const DB_SIFRE_SURUMU: i64 = 2;
const DB_AAD: &[u8] = b"ogretmen-asistani/app-state/v2";
const ANAHTAR_SERVISI: &str = "tr.fizik-sinav.desktop";
const ANAHTAR_HESABI: &str = "app-state-aes256gcm";
const SINAV_FORMATI: &str = "oa27-encrypted-exam";
const SINAV_AAD: &[u8] = b"ogretmen-asistani/exam-draft/v1";
const YEDEK_BELLEK_KIB: u32 = 65_536;
const YEDEK_TUR: u32 = 3;

#[derive(serde::Serialize, serde::Deserialize)]
struct ParolaliYedekZarfi {
    format: String,
    version: u8,
    kdf: ParolaliYedekKdf,
    cipher: ParolaliYedekCipher,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct ParolaliYedekKdf {
    name: String,
    salt: String,
    #[serde(rename = "memoryKiB")]
    memory_kib: u32,
    iterations: u32,
    parallelism: u32,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct ParolaliYedekCipher {
    name: String,
    nonce: String,
    ciphertext: String,
}

/// Bir eklenti bağlantısının yazma ucu. PAYLAŞIMLI (Arc): bağlantı kendi cevaplarını
/// (veri_ok/veri_error) KENDİ ucundan yollar; aynı uç "doldur" için ortak yuvaya da konur.
/// Eskiden uç yuvaya TAŞINIYORDU ve cevaplar yuvadan gidiyordu: iki sekme (e-Okul + MEBİ)
/// açıkken A sekmesinin onayı son bağlanan B sekmesine gidiyordu (OA64).

#[tauri::command]
fn dosya_yaz(request: tauri::ipc::Request) -> Result<(), String> {
    // OA85: içerik HAM gövde olarak gelir (eskiden `Array.from(bytes)` → JSON sayı dizisi:
    // 45 MB'lık yedek ~1,3 GB, 100 MB ~2,3 GB bellek). Yol, kaydetme penceresinin seçtiği
    // tam yol; Türkçe harf taşıdığı için başlıkta encodeURIComponent ile kodlu gelir.
    let kodlu = request.headers().get("x-oa-yol")
        .ok_or("Dosya yolu başlığı eksik")?
        .to_str().map_err(|_| "Geçersiz dosya yolu başlığı")?;
    let yol = yuzde_coz(kodlu)?;
    if yol.is_empty() { return Err("Dosya yolu boş".into()); }
    let tauri::ipc::InvokeBody::Raw(icerik) = request.body() else {
        return Err("Ham dosya gövdesi bekleniyordu".into());
    };
    std::fs::write(&yol, icerik).map_err(|e| e.to_string())
}

/// encodeURIComponent'in tersi (UTF-8). Bozuk kaçış ya da geçersiz UTF-8 → hata.
fn yuzde_coz(s: &str) -> Result<String, String> {
    let b = s.as_bytes();
    let mut cikti = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' {
            let h = s.get(i + 1..i + 3).ok_or("Bozuk yol kodu")?;
            cikti.push(u8::from_str_radix(h, 16).map_err(|_| "Bozuk yol kodu")?);
            i += 3;
        } else {
            cikti.push(b[i]);
            i += 1;
        }
    }
    String::from_utf8(cikti).map_err(|_| "Yol UTF-8 değil".into())
}

#[cfg(test)]
mod dosya_yaz_testleri {
    use super::yuzde_coz;
    #[test]
    fn turkce_yol_cozulur() {
        assert_eq!(yuzde_coz("C%3A%5CKullan%C4%B1c%C4%B1lar%5C%C3%96%C4%9Fretmen%20Asistan%C4%B1%20%C2%B7%201.%20D%C3%B6nem.zip").unwrap(),
            "C:\\Kullanıcılar\\Öğretmen Asistanı · 1. Dönem.zip");
        assert_eq!(yuzde_coz("/Users/a/b.pdf").unwrap(), "/Users/a/b.pdf");
        assert!(yuzde_coz("%G1").is_err());
        assert!(yuzde_coz("abc%2").is_err());
        assert!(yuzde_coz("%FF").is_err());
    }
}

// ─── Uygulama verisi dosya deposu (Ders Kitabı modülü: PDF + önbellek) ─────
// app_data_dir() ALTINDA, göreli bir alt yolla çalışan genel komutlar —
// "kitaplar/{id}.pdf" ve "onbellek/sayfa-thumb/{kitapId}/{sayfa}.jpg" gibi
// farklı amaçlar için ayrı ayrı komut yazmak yerine TEK küçük yüzey (5 komut).
// db_kaydet_json/db_yukle_json'daki app_data_dir() kalıbıyla aynı.

fn veri_alt_yolu(app: &tauri::AppHandle, alt_yol: &str) -> Result<std::path::PathBuf, String> {
    let goreli = std::path::Path::new(alt_yol);
    if goreli.is_absolute() || goreli.components().any(|c| !matches!(c, std::path::Component::Normal(_))) {
        return Err("Geçersiz yol".into());
    }
    let taban = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(taban.join(goreli))
}

#[tauri::command]
fn veri_dosyasi_yaz(app: tauri::AppHandle, request: tauri::ipc::Request) -> Result<(), String> {
    let alt_yol = request.headers().get("x-oa-alt-yol")
        .ok_or("Dosya yolu başlığı eksik")?
        .to_str().map_err(|_| "Geçersiz dosya yolu başlığı")?;
    let tauri::ipc::InvokeBody::Raw(icerik) = request.body() else {
        return Err("Ham dosya gövdesi bekleniyordu".into());
    };
    let yol = veri_alt_yolu(&app, &alt_yol)?;
    if let Some(dizin) = yol.parent() {
        std::fs::create_dir_all(dizin).map_err(|e| e.to_string())?;
    }
    std::fs::write(&yol, icerik).map_err(|e| e.to_string())
}

#[tauri::command]
fn veri_dosyasi_oku(app: tauri::AppHandle, alt_yol: String) -> Result<tauri::ipc::Response, String> {
    let yol = veri_alt_yolu(&app, &alt_yol)?;
    if !yol.exists() {
        return Err("OA_DOSYA_YOK".into());
    }
    std::fs::read(&yol).map(tauri::ipc::Response::new).map_err(|e| e.to_string())
}

#[tauri::command]
fn veri_dosyasi_tam_yol(app: tauri::AppHandle, alt_yol: String) -> Result<Option<String>, String> {
    let yol = veri_alt_yolu(&app, &alt_yol)?;
    Ok(yol.exists().then(|| yol.to_string_lossy().to_string()))
}

#[tauri::command]
fn veri_dosyasi_sil(app: tauri::AppHandle, alt_yol: String) -> Result<(), String> {
    let yol = veri_alt_yolu(&app, &alt_yol)?;
    if yol.exists() {
        std::fs::remove_file(&yol).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn dizin_boyutu(yol: &std::path::Path) -> u64 {
    let mut toplam = 0u64;
    if let Ok(okuma) = std::fs::read_dir(yol) {
        for girdi in okuma.flatten() {
            let p = girdi.path();
            if p.is_dir() {
                toplam += dizin_boyutu(&p);
            } else if let Ok(meta) = girdi.metadata() {
                toplam += meta.len();
            }
        }
    }
    toplam
}

#[tauri::command]
fn veri_klasoru_boyutu(app: tauri::AppHandle, alt_yol: String) -> Result<u64, String> {
    let yol = veri_alt_yolu(&app, &alt_yol)?;
    Ok(dizin_boyutu(&yol))
}

#[tauri::command]
fn veri_klasoru_temizle(app: tauri::AppHandle, alt_yol: String) -> Result<(), String> {
    let yol = veri_alt_yolu(&app, &alt_yol)?;
    if yol.exists() {
        std::fs::remove_dir_all(&yol).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn veri_anahtari() -> Result<Zeroizing<Vec<u8>>, String> {
    let kayit = keyring::Entry::new(ANAHTAR_SERVISI, ANAHTAR_HESABI)
        .map_err(|e| format!("İşletim sistemi anahtar kasası açılamadı: {e}"))?;
    match kayit.get_secret() {
        Ok(anahtar) if anahtar.len() == 32 => Ok(Zeroizing::new(anahtar)),
        Ok(_) => Err("Anahtar kasasındaki veri anahtarı geçersiz uzunlukta.".into()),
        Err(keyring::Error::NoEntry) => {
            let mut anahtar = Zeroizing::new(vec![0u8; 32]);
            OsRng.fill_bytes(&mut anahtar);
            kayit.set_secret(&anahtar)
                .map_err(|e| format!("Veri anahtarı işletim sistemi kasasına yazılamadı: {e}"))?;
            Ok(anahtar)
        }
        Err(e) => Err(format!("Veri anahtarı işletim sistemi kasasından okunamadı: {e}")),
    }
}

fn json_sifrele(json: &str) -> Result<(String, Vec<u8>), String> {
    let anahtar = veri_anahtari()?;
    json_sifrele_anahtarla(json, &anahtar)
}

fn json_sifrele_anahtarla(json: &str, anahtar: &[u8]) -> Result<(String, Vec<u8>), String> {
    let sifre = Aes256Gcm::new_from_slice(&anahtar).map_err(|_| "Veri anahtarı kullanılamadı")?;
    let mut nonce = vec![0u8; 12];
    OsRng.fill_bytes(&mut nonce);
    let icerik = sifre.encrypt(Nonce::from_slice(&nonce), Payload { msg: json.as_bytes(), aad: DB_AAD })
        .map_err(|_| "Uygulama verisi şifrelenemedi")?;
    Ok((BASE64.encode(icerik), nonce))
}

fn json_sifre_coz(sifreli: &str, nonce: &[u8]) -> Result<String, String> {
    if nonce.len() != 12 { return Err("Şifreli verinin nonce değeri geçersiz.".into()); }
    let anahtar = veri_anahtari()?;
    json_sifre_coz_anahtarla(sifreli, nonce, &anahtar)
}

fn json_sifre_coz_anahtarla(sifreli: &str, nonce: &[u8], anahtar: &[u8]) -> Result<String, String> {
    if nonce.len() != 12 { return Err("Şifreli verinin nonce değeri geçersiz.".into()); }
    let sifre = Aes256Gcm::new_from_slice(&anahtar).map_err(|_| "Veri anahtarı kullanılamadı")?;
    let icerik = BASE64.decode(sifreli).map_err(|_| "Şifreli veri kodu bozuk.")?;
    let acik = sifre.decrypt(Nonce::from_slice(nonce), Payload { msg: &icerik, aad: DB_AAD })
        .map_err(|_| "Uygulama verisinin bütünlüğü doğrulanamadı veya anahtar erişilemiyor.")?;
    String::from_utf8(acik).map_err(|_| "Çözülen uygulama verisi geçerli metin değil.".into())
}

fn yedek_anahtari(parola: &str, salt: &[u8]) -> Result<Zeroizing<Vec<u8>>, String> {
    if parola.chars().count() < 12 { return Err("Yedek parolası en az 12 karakter olmalı.".into()); }
    let params = Params::new(YEDEK_BELLEK_KIB, YEDEK_TUR, 1, Some(32))
        .map_err(|_| "Argon2id parametreleri oluşturulamadı")?;
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    let mut anahtar = Zeroizing::new(vec![0u8; 32]);
    argon2.hash_password_into(parola.as_bytes(), salt, &mut anahtar)
        .map_err(|_| "Yedek anahtarı üretilemedi")?;
    Ok(anahtar)
}



fn parolali_sinav_sifrele(ham: &str, parola: &str) -> Result<String, String> {
    let mut salt = vec![0u8; 16];
    let mut nonce = vec![0u8; 12];
    OsRng.fill_bytes(&mut salt);
    OsRng.fill_bytes(&mut nonce);
    let anahtar = yedek_anahtari(parola, &salt)?;
    let sifre = Aes256Gcm::new_from_slice(&anahtar).map_err(|_| "Sınav anahtarı kullanılamadı")?;
    let ciphertext = sifre.encrypt(Nonce::from_slice(&nonce), Payload { msg: ham.as_bytes(), aad: SINAV_AAD })
        .map_err(|_| "Sınav taslağı şifrelenemedi")?;
    serde_json::to_string(&ParolaliYedekZarfi {
        format: SINAV_FORMATI.into(), version: 1,
        kdf: ParolaliYedekKdf {
            name: "argon2id".into(), salt: BASE64.encode(salt), memory_kib: YEDEK_BELLEK_KIB,
            iterations: YEDEK_TUR, parallelism: 1,
        },
        cipher: ParolaliYedekCipher {
            name: "aes-256-gcm".into(), nonce: BASE64.encode(nonce), ciphertext: BASE64.encode(ciphertext),
        },
    }).map_err(|_| "Şifreli sınav zarfı oluşturulamadı".into())
}

fn parolali_sinav_ac(zarf_ham: &str, parola: &str) -> Result<String, String> {
    let zarf: ParolaliYedekZarfi = serde_json::from_str(zarf_ham)
        .map_err(|_| "Parolalı sınav zarfı geçersiz.")?;
    if zarf.format != SINAV_FORMATI || zarf.version != 1 || zarf.kdf.name != "argon2id"
        || zarf.kdf.memory_kib != YEDEK_BELLEK_KIB || zarf.kdf.iterations != YEDEK_TUR
        || zarf.kdf.parallelism != 1 || zarf.cipher.name != "aes-256-gcm" {
        return Err("Parolalı sınav biçimi veya güvenlik parametreleri desteklenmiyor.".into());
    }
    let salt = BASE64.decode(zarf.kdf.salt).map_err(|_| "Sınav salt değeri bozuk.")?;
    let nonce = BASE64.decode(zarf.cipher.nonce).map_err(|_| "Sınav nonce değeri bozuk.")?;
    let ciphertext = BASE64.decode(zarf.cipher.ciphertext).map_err(|_| "Şifreli sınav içeriği bozuk.")?;
    if salt.len() != 16 || nonce.len() != 12 { return Err("Parolalı sınav güvenlik alanları geçersiz.".into()); }
    let anahtar = yedek_anahtari(parola, &salt)?;
    let sifre = Aes256Gcm::new_from_slice(&anahtar).map_err(|_| "Sınav anahtarı kullanılamadı")?;
    let acik = sifre.decrypt(Nonce::from_slice(&nonce), Payload { msg: &ciphertext, aad: SINAV_AAD })
        .map_err(|_| "Parola yanlış veya sınav dosyası değiştirilmiş.")?;
    String::from_utf8(acik).map_err(|_| "Çözülen sınav taslağı geçerli metin değil.".into())
}



#[tauri::command]
fn sinav_parolala(ham: String, parola: String) -> Result<String, String> {
    let parola = Zeroizing::new(parola);
    parolali_sinav_sifrele(&ham, &parola)
}

#[tauri::command]
fn sinav_parolasini_ac(ham: String, parola: String) -> Result<String, String> {
    let parola = Zeroizing::new(parola);
    parolali_sinav_ac(&ham, &parola)
}


#[tauri::command]
fn db_yukle_json(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let conn = sqlite_baglan(&app)?;
    let mut stmt = conn.prepare("SELECT json, sifre_surumu, nonce FROM app_state WHERE anahtar = 'ana'")
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let kayit: String = row.get(0).map_err(|e| e.to_string())?;
        let surum: i64 = row.get(1).map_err(|e| e.to_string())?;
        if surum == DB_SIFRE_SURUMU {
            let nonce: Vec<u8> = row.get(2).map_err(|e| e.to_string())?;
            Ok(Some(json_sifre_coz(&kayit, &nonce)?))
        } else {
            // Tek seferlik yerinde göç: düz JSON başarıyla okunduktan sonra aynı
            // bağlantıda şifreli biçime çevrilir; uygulamaya yine özgün JSON döner.
            let (sifreli, nonce) = json_sifrele(&kayit)?;
            conn.execute("UPDATE app_state SET json=?1, sifre_surumu=?2, nonce=?3, guncel_zaman=datetime('now') WHERE anahtar='ana'",
                rusqlite::params![sifreli, DB_SIFRE_SURUMU, nonce]).map_err(|e| e.to_string())?;
            Ok(Some(kayit))
        }
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn db_kaydet_json(app: tauri::AppHandle, json: String) -> Result<(), String> {
    let conn = sqlite_baglan(&app)?;
    let (sifreli, nonce) = json_sifrele(&json)?;
    conn.execute(
        "INSERT INTO app_state (anahtar, json, guncel_zaman, sifre_surumu, nonce) VALUES ('ana', ?1, datetime('now'), ?2, ?3) \
         ON CONFLICT(anahtar) DO UPDATE SET json=excluded.json, guncel_zaman=excluded.guncel_zaman, sifre_surumu=excluded.sifre_surumu, nonce=excluded.nonce",
        rusqlite::params![sifreli, DB_SIFRE_SURUMU, nonce],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

// ─── Otomatik yedek (2026-09-26) ────────────────────────────────────────────
// NEDEN: tüm veri tek bilgisayarda; öğretmenin elle yedek alması unutuluyordu.
// 'ana' satırının ŞİFRELİ hâli, AYNI tabloda haftanın gününe göre dönen 7 yuvaya
// kopyalanır ("otoyedek-0".."otoyedek-6"). Böylece: (1) düz metin öğrenci verisi
// diske hiç yazılmaz (KVKK — asıl kayıtla aynı şifre), (2) listeleme/silme
// gerekmez, 8. gün en eski yuva kendiliğinden ezilir, (3) yanlışlıkla silme ya da
// bozuk içe aktarma sonrası son 7 günün herhangi birine dönülebilir.
// Disk arızasına KARŞI KORUMAZ (aynı dosya) — o yüzden arayüz dışa yedek
// hatırlatmasını ayrıca yapar.

#[tauri::command]
fn db_dosyasi_yolu(app: tauri::AppHandle) -> Result<String, String> {
    Ok(sqlite_yolu(&app)?.to_string_lossy().to_string())
}

/// Yazdırma penceresini açar.
///
/// NEDEN Rust tarafında: macOS'ta Tauri WKWebView kullanıyor ve WKWebView JS
/// `window.print()` çağrısına HİÇBİR ŞEY yapmıyor (yazdırmayı barındıran
/// uygulamanın başlatması gerekir; tarayıcılardaki gibi yerleşik bir diyalog
/// yok). Windows'taki WebView2'de `window.print()` çalıştığı için bu eksik
/// uzun süre fark edilmedi — uygulama önce Windows'a paketleniyordu.
/// Tauri'nin `Webview::print()`'i wry üzerinden NSPrintOperation'a bağlanıyor;
/// macOS'un yazdırma diyaloğu buradan açılır ("PDF olarak kaydet" dâhil).
#[tauri::command]
fn yazdir(webview: tauri::Webview) -> Result<(), String> {
    // iPad/iPhone: wry `print()` yok; arayüz iOS'ta `window.print()` dener (bkz. lib/yazdirma.ts).
    #[cfg(target_os = "ios")]
    {
        let _ = webview;
        return Err("Bu cihazda yazdırma penceresi açılamadı. Sınavhane web sürümünü Safari'de açıp Paylaş → Yazdır'ı kullanın.".into());
    }
    #[cfg(not(target_os = "ios"))]
    {
        #[cfg(target_os = "macos")]
        a4_kagidina_sabitle();
        webview.print().map_err(|e| e.to_string())
    }
}

/// Yazdırma kâğıdını A4'e sabitler — YALNIZ macOS.
///
/// NEDEN: WebKit `@page { size: A4 }` kuralını YOK SAYIYOR. Kâğıt tamamen
/// sistem yazdırma diyaloğundan geliyor ve o da varsayılan yazıcının
/// kâğıdını kullanıyor. Ölçüldü: kâğıt Letter'a alınınca çıktı
/// 215,90×279,40 mm oldu ve sayfa hizaları tamamen bozuldu — uygulamanın
/// tüm yerleşimi 210×297 mm varsayıyor. Öğretmenin kendi yazıcısı A4
/// olduğu için sorun görünmüyordu; Letter seçen birinde çıktı SESSİZCE
/// bozuluyor.
///
/// NEDEN BURADA: wry `print()` çağrısında `NSPrintInfo::sharedPrintInfo()`
/// kullanıyor (wry 0.55.1, wkwebview/mod.rs). Paylaşılan tekil olduğu için
/// `print()`'ten hemen önce ayarlamak yeterli; wry'ye dokunmaya gerek yok.
///
/// NEDEN YALNIZ macOS: Windows'ta WebView2 (Chromium) `@page size`'ı ZATEN
/// uyguluyor. Orada da kâğıda karışmak, çalışan bir davranışın üstüne
/// yazmak olurdu (§12.1'in dersi: iki motor aynı JS'i çalıştırır ama aynı
/// şeyi yapmaz).
///
/// Diyalog yine açılıyor ve öğretmen kâğıdı değiştirebiliyor; burada
/// yapılan yalnız BAŞLANGIÇ değerini yazıcının varsayılanından almamak.
#[cfg(target_os = "macos")]
fn a4_kagidina_sabitle() {
    // A4, PostScript punto cinsinden: 210 mm / 25.4 * 72 = 595.276…
    //                                 297 mm / 25.4 * 72 = 841.890…
    const A4_GENISLIK_PT: f64 = 595.276;
    const A4_YUKSEKLIK_PT: f64 = 841.890;
    // objc2 0.6 bu erişimcileri güvenli veriyor; `unsafe` blok gerekmiyor
    // (derleyici uyarısı da bunu söylüyordu).
    let bilgi = objc2_app_kit::NSPrintInfo::sharedPrintInfo();
    // paperName'e DOKUNULMUYOR — bilerek. İlk yazımda `setPaperName(None)`
    // vardı ve gerçek WKWebView koşumunda UYGULAMAYI ÇÖKERTTİ:
    //   NSInvalidArgumentException: object cannot be nil (key: NSPaperName)
    // Yani öğretmen Yazdır'a bastığında uygulama kapanacaktı. Ölçüm olmasa
    // fark edilmezdi; `cargo check` bunu görmez.
    //
    // Gerek de yokmuş: yalnız `setPaperSize` çağırmak kâğıdı A4'e çekiyor.
    // Ölçüldü — paylaşılan printInfo Letter'a çekilip sonra yalnız boyut
    // verildiğinde çıkan PDF 210,00×297,00 mm oluyor (fix uygulanmadığında
    // 215,90×279,40 mm = Letter).
    bilgi.setPaperSize(objc2_foundation::NSSize::new(
        A4_GENISLIK_PT,
        A4_YUKSEKLIK_PT,
    ));
    bilgi.setOrientation(objc2_app_kit::NSPaperOrientation::Portrait);
}

fn sqlite_yolu(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("fizik-sinav.sqlite3"))
}

fn sqlite_baglan(app: &tauri::AppHandle) -> Result<rusqlite::Connection, String> {
    let yol = sqlite_yolu(app)?;
    let conn = rusqlite::Connection::open(yol).map_err(|e| e.to_string())?;
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;
         CREATE TABLE IF NOT EXISTS app_state (
           anahtar TEXT PRIMARY KEY,
           json TEXT NOT NULL,
           guncel_zaman TEXT NOT NULL,
           sifre_surumu INTEGER NOT NULL DEFAULT 1,
           nonce BLOB
         );"
    ).map_err(|e| e.to_string())?;
    // CREATE TABLE eski kurulumda yeni sütunları eklemez; idempotent ALTER için
    // duplicate-column hatası bilinçli olarak yutulur.
    let _ = conn.execute("ALTER TABLE app_state ADD COLUMN sifre_surumu INTEGER NOT NULL DEFAULT 1", []);
    let _ = conn.execute("ALTER TABLE app_state ADD COLUMN nonce BLOB", []);
    Ok(conn)
}

/// Eklenti köprüsünün eşleştirme anahtarı DİSKTE kalıcı.
///
/// NEDEN (2026-09 kullanıcı denetimi): anahtar her `run()`da yeniden üretiliyordu.
/// Öğretmen ertesi gün uygulamayı açınca eklenti "auth_error" alıp susuyor, panel de
/// "masaüstü uygulaması açık mı?" diyordu — her gün ~7 adımlık yeniden eşleştirme.
/// Telefon oturumları için aynı hata daha önce düzeltilmişti (telefon_oturumlarini_yukle).
/// Sunucu yalnız 127.0.0.1'e bağlı; dosya 0600 ve telefon oturum dosyasıyla aynı düzeyde.
/// Bozuk/eksik dosyada yeni anahtar üretilir ve yazılır; yazılamazsa (salt okunur disk)

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut yapi = tauri::Builder::default();
    // TEK ÖRNEK: ikinci pencere aynı veritabanı dosyasını paylaşmasın; ikinci açılış mevcut pencereyi öne getirir.
    #[cfg(any(target_os = "windows", target_os = "macos", target_os = "linux"))]
    {
        yapi = yapi.plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.show();
                let _ = w.set_focus();
            }
        }));
    }
    yapi
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            dosya_yaz, db_yukle_json, db_kaydet_json, db_dosyasi_yolu,
            sinav_parolala, sinav_parolasini_ac,
            yazdir,
            veri_dosyasi_yaz, veri_dosyasi_oku, veri_dosyasi_sil, veri_dosyasi_tam_yol,
            veri_klasoru_boyutu, veri_klasoru_temizle,
        ])
        .run(tauri::generate_context!())
        .expect("Tauri başlatılamadı");
}
