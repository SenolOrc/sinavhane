// main.rs — masaüstü giriş. Tüm mantık lib.rs'te (Tauri 2 standart yapısı).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    fizik_sinav_lib::run()
}
