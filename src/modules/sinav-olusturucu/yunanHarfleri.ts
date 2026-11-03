// `\theta`, `\Delta`, `\deg` gibi ters bölülü adların karşılığı.
//
// İKİ YERDE KULLANILIYOR: çizim editörünün fizik etiketleri (`cizim/fizik.ts`)
// ve denklem editörünün "yazarak ekle" satırı (`denklem/yazim.ts`). İki ayrı
// tablo olsaydı biri `\mu`yu tanır, öbürü tanımazdı — öğretmen aynı yazımın bir
// yerde çalışıp ötekinde çalışmamasına anlam veremezdi.

export const YUNANCA: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", varepsilon: "ε", zeta: "ζ", eta: "η",
  theta: "θ", lambda: "λ", mu: "μ", nu: "ν", xi: "ξ", pi: "π", rho: "ρ", sigma: "σ", tau: "τ",
  phi: "φ", varphi: "φ", chi: "χ", psi: "ψ", omega: "ω",
  Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Pi: "Π", Sigma: "Σ", Phi: "Φ", Psi: "Ψ", Omega: "Ω",
  deg: "°", cdot: "·", times: "×", pm: "±", approx: "≈", neq: "≠", leq: "≤", geq: "≥",
  infty: "∞", rightarrow: "→", leftarrow: "←", uparrow: "↑", downarrow: "↓", ohm: "Ω", sqrt: "√",
  vec: "→", perp: "⊥", parallel: "∥", propto: "∝",
};

/**
 * Ters bölüsüz yazılan TAM kelimeler (`theta`, `omega`, `Delta`).
 * Yalnız kelimenin tamamı eşleşirse çevrilir (`alphabet` bozulmaz). Büyük/küçük
 * harf ayrımı vardır: `delta` = δ, `Delta` = Δ.
 */
export const YUNAN_KELIMELERI: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", theta: "θ", lambda: "λ", mu: "μ",
  pi: "π", rho: "ρ", sigma: "σ", tau: "τ", phi: "φ", omega: "ω",
  Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Pi: "Π", Sigma: "Σ", Phi: "Φ", Omega: "Ω",
  deg: "°", inf: "∞",
};
