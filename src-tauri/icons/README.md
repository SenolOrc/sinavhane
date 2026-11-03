# İkonlar

Kaynak sanat `kaynak/` altında; üretilen dosyalar bu klasörün kökünde.
`tauri.conf.json` yalnız beş dosyayı sayıyor: `32x32.png`, `128x128.png`,
`icon.png`, `icon.ico`, `icon.icns`. Başka dosya üretilirse kullanılmaz.

## İKİ PLATFORM, İKİ FARKLI KAYNAK

Uygulama hem macOS hem Windows'ta çalışıyor ve ikisi ikonu farklı çiziyor:

| | Kaynak | Neden |
|---|---|---|
| Windows (`.ico`, PNG'ler) | `kaynak/logo-1024.png` — **tam kanama** | Windows 10/11 uygulama ikonunu yuvarlatmaz; kenar boşluğu bırakmak ikonu komşularından küçük gösterir |
| macOS (`.icns`) | `kaynak/logo-mac-1024.png` — **yuvarlatılmış + boşluklu** | Big Sur'dan beri sistem ikonları 1024'lük tuvalde 824×824 gövde, köşe yarıçapı 185,4. Tam kare bir ikon Dock'ta komşularından taşmış görünür |

`logo-mac-1024.png`, `logo-1024.png`'nin 824'e küçültülüp yuvarlatılmış
dikdörtgene kırpılmış hâlidir; kenardaki 100 px saydam.

## YENİDEN ÜRETME — SIRA ÖNEMLİ

> **UYARI:** `tauri icon` `.icns`'i de üretir ve macOS maskesini EZER.
> Tek başına çalıştırıp bırakma; ikinci adım zorunlu.

```bash
# 1) Windows + PNG seti (tam kanama kaynaktan)
cd apps/desktop && npm run tauri icon src-tauri/icons/kaynak/logo-1024.png

# tauri icon mobil ve Windows Store dosyaları da üretir; bu proje yalnız
# masaüstü (nsis + dmg), o yüzden kullanılmayanlar silinir:
cd src-tauri/icons && rm -rf android ios Square*Logo.png StoreLogo.png 64x64.png "128x128@2x.png"

# 2) macOS .icns'i maskeli kaynaktan YENİDEN üret (1. adımınkinin üstüne yazar)
I=$(mktemp -d)/oa.iconset && mkdir -p "$I" && G=kaynak/logo-mac-1024.png
sips -z 16 16   "$G" --out "$I/icon_16x16.png"
sips -z 32 32   "$G" --out "$I/icon_16x16@2x.png"
sips -z 32 32   "$G" --out "$I/icon_32x32.png"
sips -z 64 64   "$G" --out "$I/icon_32x32@2x.png"
sips -z 128 128 "$G" --out "$I/icon_128x128.png"
sips -z 256 256 "$G" --out "$I/icon_128x128@2x.png"
sips -z 256 256 "$G" --out "$I/icon_256x256.png"
sips -z 512 512 "$G" --out "$I/icon_256x256@2x.png"
sips -z 512 512 "$G" --out "$I/icon_512x512.png"
cp "$G" "$I/icon_512x512@2x.png"
iconutil -c icns "$I" -o icon.icns
```

Maskeli kaynak elde yoksa: `logo-1024.png`'yi 824×824'e küçültüp 1024'lük
saydam tuvale ortala, köşe yarıçapı 185,4 ile yuvarlatılmış dikdörtgene kırp.

## Doğrulama

- `.ico` çok boyutlu mu: 16/24/32/48/64/256 beklenir (Windows küçük boyutları
  kendi ölçeklemesin diye).
- `.icns` maskeli mi: `sips -s format png icon.icns --out /tmp/k.png` ile
  bakılır; kenarların saydam ve köşelerin yuvarlak olması gerekir.
