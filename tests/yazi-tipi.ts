// Test ortamı yazı tipi eşlemesi (esbuild --inject ile her test paketine eklenir).
// CI'da (ubuntu-latest) @napi-rs/canvas'ta "Times New Roman", "serif" ve "sans-serif" adları, listedeki ilk
// aileye (Noto Color Emoji) düşer ve yazı ~2,6 kat genişler: kutu/taşma ölçümleri yazı tipini ölçer.
// Times uyumlu Liberation Serif/Sans varsa adları ona bağlarız; yoksa hiçbir şey yapmaz.
import { GlobalFonts } from "@napi-rs/canvas";

try {
  const aileler = new Set(GlobalFonts.families.map((f) => f.family));
  const serif = aileler.has("Liberation Serif") ? "Liberation Serif" : aileler.has("DejaVu Serif") ? "DejaVu Serif" : null;
  const sans = aileler.has("Liberation Sans") ? "Liberation Sans" : aileler.has("DejaVu Sans") ? "DejaVu Sans" : null;
  if (serif) for (const ad of ["Times New Roman", "Times", "serif"]) GlobalFonts.setAlias(serif, ad);
  if (sans) for (const ad of ["sans-serif", "Arial", "Helvetica"]) GlobalFonts.setAlias(sans, ad);
} catch {
  /* yazı tipi eşlemesi isteğe bağlı */
}
