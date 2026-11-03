# iPad / iPhone (TestFlight)

Aynı kod Tauri 2 ile iOS'a da derlenir. **Bu bölüm Mac gerektirir** (Xcode). Aşağıdaki adımlar hazırlandı ama
gerçek bir cihazda henüz denenmedi: ilk denemede hata çıkarsa çıktıyı Issues'a yazın.

> Yazdırma gerekiyorsa şimdilik en güvenilir yol **web sürümüdür**: Safari'de açın, Paylaş → Yazdır / PDF.

## 1. Apple tarafı (bir kez)
1. developer.apple.com → Certificates, Identifiers & Profiles → **Identifiers** → yeni **App ID**.
   Bundle ID, `src-tauri/tauri.conf.json` içindeki `identifier` ile aynı olmalı (şu an `com.fiziksinav.app`;
   başka biri almışsa değiştirin, ama masaüstü veri klasörü de değişir).
2. appstoreconnect.apple.com → **Apps** → **+** → yeni uygulama (ad: Sınavhane, aynı Bundle ID).
3. Takım Kimliğinizi (10 karakter, Membership sayfasında) not alın.

## 2. Mac'te araçlar (bir kez)
```bash
xcode-select --install                    # ya da App Store'dan Xcode; bir kez açıp lisansı kabul edin
rustup target add aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios
brew install cocoapods
npm install
```

## 3. iOS projesini üretin ve deneyin
```bash
export APPLE_DEVELOPMENT_TEAM=XXXXXXXXXX     # Takım Kimliğiniz
npm run tauri ios init                       # src-tauri/gen/apple oluşur (repoya eklenebilir)
npm run tauri ios dev                        # simülatör; iPad'i USB ile bağlayıp seçerseniz gerçek cihaz
```

## 4. TestFlight'a yükleyin
```bash
npm run tauri ios build -- --export-method app-store-connect
# çıktı: src-tauri/gen/apple/build/arm64/*.ipa
```
`.ipa` dosyasını Mac'teki **Transporter** uygulamasıyla (App Store'dan ücretsiz) sürükleyip yükleyin. Birkaç dakika
sonra App Store Connect → TestFlight'ta görünür; kendinizi **Internal Testing**'e ekleyin, iPad'de TestFlight
uygulamasından kurun.

## Bilinen eksikler
- **Yazdırma:** iOS'ta `window.print()` denenir; çalışmazsa web sürümüyle yazdırın.
- **Kaydet / Yükle:** dosya kaydetme penceresi iOS'ta farklı davranabilir; sorun olursa bildirin.
- Veri uygulama içinde saklanır; arka plana alınırken yazılır. Yine de düzenli "Kaydet / Yükle" yedeği alın.
