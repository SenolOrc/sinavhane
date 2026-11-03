import { aramaIcinKucult } from "@/lib/turkceMetin";

/**
 * Denklem editörünün sembol setleri ve aramaları.
 *
 * Ayrı dosyada, çünkü süzme mantığı saf ve test edilebilir olmalı: seçici
 * artık İKİ seti birden gösteriyor ve arama hem glife hem TÜRKÇE ada bakıyor.
 * Ayrım (operator / sembol) çizimde hiçbir fark yaratmıyor — `parcaGeometri`
 * ve `denklemCiz` ikisini birlikte ele alıyor — yani tamamen arayüz
 * kaynaklıydı; öğretmen "≤ hangi parçadaydı?" sorusunu çözmek zorundaydı.
 */
export const OPERATORLER = [
  "+",
  "−",
  "×",
  "·",
  "÷",
  "=",
  "±",
  "<",
  ">",
  "≤",
  "≥",
  "≠",
  "≈",
  "∝",
];
const OPERATOR_ADLARI: Record<string, string> = {
  "+": "artı",
  "−": "eksi",
  "×": "çarpı",
  "·": "çarpı (nokta)",
  "÷": "bölü",
  "=": "eşit",
  "±": "artı eksi",
  "<": "küçüktür",
  ">": "büyüktür",
  "≤": "küçük eşit",
  "≥": "büyük eşit",
  "≠": "eşit değil",
  "≈": "yaklaşık",
  "∝": "orantılı",
};
const OZEL_SEMBOLLER = [
  "π",
  "α",
  "β",
  "γ",
  "δ",
  "Δ",
  "θ",
  "λ",
  "μ",
  "ρ",
  "σ",
  "φ",
  "ω",
  "Ω",
  "∞",
  "→",
  "⇒",
  "↔",
  "∇",
  "∂",
  "°",
  "∈",
  "∉",
  "⊂",
  "⊆",
  "⊃",
  "⊇",
  "∪",
  "∩",
  "∖",
  "∅",
  "∀",
  "∃",
  "∄",
  "ℕ",
  "ℤ",
  "ℚ",
  "ℝ",
  "ℂ",
];
// Karışması kolay harfleri (ω/Ω, σ/Σ gibi) buton üzerinde ad göstererek ayırt
// eder — küçük ızgarada glif tek başına yeterince açık olmuyor.
const OZEL_SEMBOL_ADLARI: Record<string, string> = {
  π: "Pi",
  α: "Alfa",
  β: "Beta",
  γ: "Gama",
  δ: "Delta (küçük) — değişim miktarı",
  Δ: "Delta (büyük) — değişim",
  θ: "Teta",
  λ: "Lambda — dalga boyu",
  μ: "Mü",
  ρ: "Ro — yoğunluk",
  σ: "Sigma (küçük)",
  φ: "Fi",
  ω: "Omega (küçük) — açısal hız",
  Ω: "Omega (büyük) — ohm, direnç birimi",
  "∞": "Sonsuz",
  "→": "Ok",
  "⇒": "Gerektirir (ise)",
  "↔": "Çift yönlü ok",
  "∇": "Nabla — gradyan",
  "∂": "Kısmi türev",
  "°": "Derece",
  "∈": "Elemanıdır",
  "∉": "Elemanı değildir",
  "⊂": "Alt kümesidir",
  "⊆": "Alt kümesidir veya eşittir",
  "⊃": "Kapsar",
  "⊇": "Kapsar veya eşittir",
  "∪": "Birleşim",
  "∩": "Kesişim",
  "∖": "Fark (küme)",
  "∅": "Boş küme",
  "∀": "Her (tümel niceleyici)",
  "∃": "Vardır (varlıksal niceleyici)",
  "∄": "Yoktur",
  ℕ: "Doğal sayılar",
  ℤ: "Tam sayılar",
  ℚ: "Rasyonel sayılar",
  ℝ: "Reel sayılar",
  ℂ: "Karmaşık sayılar",
};

/** Kimya: tepkime okları, faz sembolleri, iyon yükleri, sık formül/birimler. */
const KIMYA_SEMBOLLERI = [
  "⇌", "⇄", "↑", "↓",
  "(k)", "(s)", "(g)", "(aq)",
  "ΔH", "°C", "kJ/mol", "mol/L",
  "⁺", "⁻", "²⁺", "²⁻", "³⁺", "³⁻",
  "SO₄²⁻", "NH₄⁺", "OH⁻", "H₃O⁺", "e⁻", "H₂O",
];
const KIMYA_SEMBOL_ADLARI: Record<string, string> = {
  "⇌": "Denge oku (tersinir tepkime)",
  "⇄": "Denge oku (çift yönlü)",
  "↑": "Gaz çıkışı",
  "↓": "Çökelti",
  "(k)": "Katı hâl (k)",
  "(s)": "Sıvı hâl (s)",
  "(g)": "Gaz hâli (g)",
  "(aq)": "Sulu çözelti (aq)",
  ΔH: "Tepkime entalpisi",
  "°C": "Santigrat derece",
  "kJ/mol": "Kilojul bölü mol",
  "mol/L": "Molarite birimi",
  "⁺": "İyon yükü +",
  "⁻": "İyon yükü −",
  "²⁺": "İyon yükü 2+",
  "²⁻": "İyon yükü 2−",
  "³⁺": "İyon yükü 3+",
  "³⁻": "İyon yükü 3−",
  "SO₄²⁻": "Sülfat iyonu",
  "NH₄⁺": "Amonyum iyonu",
  "OH⁻": "Hidroksit iyonu",
  "H₃O⁺": "Hidronyum iyonu",
  "e⁻": "Elektron",
  "H₂O": "Su",
};

export type SembolGrubu = {
  baslik: string;
  semboller: string[];
  adlar: Record<string, string>;
};

/**
 * Arama kutusuna göre süzülmüş sembol grupları.
 *
 * `oncelikli`: parçanın kendi seti önce gelir — öğretmenin sık kullandığı yol
 * arama yapmadan da hızlı kalsın. Boş sorguda hiçbir şey elenmez.
 */
export function sembolGruplariniSuz(
  arama: string,
  oncelikli: "operator" | "sembol",
): SembolGrubu[] {
  const islem: SembolGrubu = {
    baslik: "İşlem / İlişki",
    semboller: OPERATORLER,
    adlar: OPERATOR_ADLARI,
  };
  const ozel: SembolGrubu = {
    baslik: "Yunan harfi / Özel sembol",
    semboller: OZEL_SEMBOLLER,
    adlar: OZEL_SEMBOL_ADLARI,
  };
  const kimya: SembolGrubu = {
    baslik: "Kimya (ok, faz, iyon yükü)",
    semboller: KIMYA_SEMBOLLERI,
    adlar: KIMYA_SEMBOL_ADLARI,
  };
  const sirali = oncelikli === "operator" ? [islem, ozel, kimya] : [ozel, islem, kimya];
  const q = aramaIcinKucult(arama.trim());
  if (!q) return sirali;
  return sirali
    .map((grup) => ({
      ...grup,
      // Sembolün KENDİSİ yazılmışsa da bulunsun: öğretmen panodan yapıştırmış
      // olabilir.
      semboller: grup.semboller.filter(
        (sembol) =>
          sembol === arama.trim() ||
          aramaIcinKucult(grup.adlar[sembol] ?? "").includes(q),
      ),
    }))
    .filter((grup) => grup.semboller.length > 0);
}
