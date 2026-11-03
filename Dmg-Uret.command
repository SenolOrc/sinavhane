#!/bin/bash
# Çift tıklayın: gerekli araçları denetler, uygulamayı derler ve DMG'nin olduğu klasörü açar.
cd "$(dirname "$0")" || exit 1
[ -f "$HOME/.cargo/env" ] && source "$HOME/.cargo/env"
eksik=0
command -v node >/dev/null || { echo "EKSİK: Node.js  →  terminalde: brew install node   (Homebrew: https://brew.sh)"; eksik=1; }
command -v cargo >/dev/null || { echo "EKSİK: Rust  →  terminalde: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"; eksik=1; }
xcode-select -p >/dev/null 2>&1 || { echo "EKSİK: Xcode araçları  →  terminalde: xcode-select --install"; eksik=1; }
if [ $eksik -ne 0 ]; then echo; echo "Eksikleri kurup bu dosyayı tekrar çift tıklayın."; read -r -p "Kapatmak için Enter..."; exit 1; fi
echo "Bağımlılıklar kuruluyor..."
npm install || { echo "npm install başarısız oldu."; read -r -p "Enter..."; exit 1; }
echo "Derleniyor (ilk seferde 5-15 dakika sürebilir)..."
npm run tauri:build || { echo "Derleme başarısız oldu. Yukarıdaki hatayı bana gönderin."; read -r -p "Enter..."; exit 1; }
d="src-tauri/target/release/bundle/dmg"
echo; echo "Hazır: $d"
open "$d"
read -r -p "Kapatmak için Enter..."
