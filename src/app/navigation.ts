import {
  Activity,
  Armchair,
  BarChart3,
  BookOpen,
  Cable,
  CalendarDays,
  CalendarX2,
  ClipboardCheck,
  ClipboardList,
  FilePlus2,
  FileText,
  GraduationCap,
  LayoutDashboard,
  ListTodo,
  NotebookPen,
  PieChart,
  Settings,
  SlidersHorizontal,
  ArrowUpCircle,
  Target,
  Upload,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { kazanimTakibiAktifMi } from "@/db/repo";
import { sinavHazirlamaVarMi } from "@/lib/platform";

export type NavigationItem = {
  path: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export type NavigationGroup = {
  /** Menüde "1 · Her gün" diye sıra numarasıyla yazılır (OA74 "işe göre" menü). */
  no: number;
  label: string;
  items: NavigationItem[];
  /** OA71: grup kenar çubuğunda hafif renkli bir panelde durur, ekranlarına da aynı
   *  ton verilir. Öğretmen "ayrı modül olsun, arka planı farklı olsun, görünsün" dedi;
   *  etikete bağlı değil ki başka bir grup da aynı işaretle öne çıkarılabilsin. */
  vurgu?: boolean;
  /** OA74: varsayılan KAPALI (açık/kapalı bu cihazda hatırlanır); seyrek kullanılanlar. */
  katlanir?: boolean;
};

/** "Yıldızlılarım" (eski "Hızlı erişim") VARSAYILANI. OA74 (menü "işe göre"):
 *  Bugün, Dersi İşle, Devamsızlık, Ödev Defteri. Öğretmen listeyi kendisi düzenler
 *  (Düzenle → ☆) — bkz. hizliErisimOku/Yaz. Yıldızlı madde grubundan SAKLANMAZ. */
export const PRIMARY_NAVIGATION_PATHS = [
  "/",
  "/hizli-isleme",
  "/devamsizlik",
  "/odev",
] as const;

const HIZLI_ERISIM_ANAHTARI = "oa-hizli-erisim";
const HIZLI_ERISIM_AZAMI = 8;

/** Taşınan rotalar: eski yol yıldızlanmışsa (hızlı erişim) yeni yoluyla kalsın, sessizce
 *  düşmesin. OA71: Performans notu Ayarlar'ın altından kendi modülüne çıktı. */
const TASINAN_YOLLAR: Record<string, string> = { "/ayarlar/performans-notu": "/performans-notu" };

/** Öğretmenin seçtiği hızlı erişim yolları (bu bilgisayarda saklanır). Bozuk/boş
 *  kayıtta varsayılana döner; tanımsız rotalar ayıklanır. */
export function hizliErisimOku(): string[] {
  const gecerli = new Set(NAVIGATION_GROUPS.flatMap((g) => g.items.map((i) => i.path)));
  try {
    const ham = JSON.parse(localStorage.getItem(HIZLI_ERISIM_ANAHTARI) ?? "null");
    if (Array.isArray(ham)) {
      const liste = ham
        .map((x) => (typeof x === "string" && TASINAN_YOLLAR[x]) || x)
        .filter((x): x is string => typeof x === "string" && gecerli.has(x));
      if (liste.length) return [...new Set(liste)].slice(0, HIZLI_ERISIM_AZAMI);
    }
  } catch { /* depolama kapalı / bozuk → varsayılan */ }
  return [...PRIMARY_NAVIGATION_PATHS];
}

export function hizliErisimYaz(yollar: string[]): string[] {
  const temiz = [...new Set(yollar)].slice(0, HIZLI_ERISIM_AZAMI);
  try { localStorage.setItem(HIZLI_ERISIM_ANAHTARI, JSON.stringify(temiz)); } catch { /* yalnız bu oturum */ }
  return temiz;
}

export const HIZLI_ERISIM_SINIRI = HIZLI_ERISIM_AZAMI;

const ACIK_GRUPLAR_ANAHTARI = "oa-menu-acik-gruplar";

/** OA74: katlanır grupların (5 · Ayarlar ve bağlantılar) açık olanları — bu cihazda.
 *  Kayıt yoksa hepsi kapalı. */
export function acikGruplarOku(): number[] {
  try {
    const ham = JSON.parse(localStorage.getItem(ACIK_GRUPLAR_ANAHTARI) ?? "null");
    if (Array.isArray(ham)) return ham.filter((x): x is number => typeof x === "number");
  } catch { /* depolama kapalı / bozuk → hepsi kapalı */ }
  return [];
}

export function acikGruplarYaz(nolar: number[]): number[] {
  const temiz = [...new Set(nolar)];
  try { localStorage.setItem(ACIK_GRUPLAR_ANAHTARI, JSON.stringify(temiz)); } catch { /* yalnız bu oturum */ }
  return temiz;
}

// OA74 — menü "işe göre" (öğretmen "Öneri B"yi seçti): gruplar öğretmenin günü/dönemi
// sırasıyla. Her maddenin altında tek satır açıklama görünür; eski adlar yeni adlarla
// değişti (rotalar AYNI). Hızlı İşleme menüde "Dersi İşle"; ekranın kendisi değişmedi.
export const NAVIGATION_GROUPS: NavigationGroup[] = [
  {
    no: 1,
    label: "Her gün",
    items: [
      { path: "/", label: "Bugün", description: "Bugünkü dersleri gösterir.", icon: LayoutDashboard },
      { path: "/hizli-isleme", label: "Dersi İşle", description: "Derste katılımı, kitabı ve davranışı işaretler.", icon: Zap },
      { path: "/devamsizlik", label: "Devamsızlık", description: "e-Okul'daki devamsızlığı gösterir.", icon: CalendarX2 },
      { path: "/ders-programi", label: "Ders Programım", description: "Haftalık ders programını gösterir.", icon: CalendarDays },
      { path: "/yapilacaklar", label: "Yapılacaklar", description: "Kendi görevlerini tutar.", icon: ListTodo },
    ],
  },
  {
    no: 2,
    label: "Sınıfım",
    items: [
      { path: "/sinif", label: "Sınıflar ve Öğrenciler", description: "Sınıf listesini ve her öğrencinin kartını gösterir.", icon: Users },
      { path: "/oturma-plani", label: "Oturma Planı", description: "Sınıf oturma planını hazırlar.", icon: Armchair },
      { path: "/kazanim", label: "Kazanım Takibi", description: "İşlenen ve eksik kazanımları gösterir.", icon: Target },
      { path: "/mebi", label: "MEBİ Takibi", description: "MEBİ'yi kimin yaptığını gösterir.", icon: GraduationCap },
    ],
  },
  {
    no: 3,
    label: "Ödev, sınav ve içerik",
    items: [
      { path: "/odev", label: "Ödev Defteri", description: "Ödev ve projeyi işaretler, puanlar ya da ölçekler.", icon: ClipboardList },
      { path: "/performans/notlar", label: "Proje ve Sunum Notları", description: "Elle girdiğin notları tutar.", icon: NotebookPen },
      { path: "/ders-kitabi", label: "Kitap ve Föy Hazırla", description: "Kitaptan soru keser, föy hazırlar.", icon: BookOpen },
      { path: "/sinav-olusturucu", label: "Sınav Hazırla", description: "Yazılı kâğıdını hazırlar.", icon: FilePlus2 },
      { path: "/sinav-analizi", label: "Sınav Sonuçları", description: "Sınav puanlarını girer ve inceler.", icon: BarChart3 },
    ],
  },
  // OA71 vurgusu korunur: dönem sonu ve e-Okul'a yazan işler amber panelde.
  // OA72: "Performans Ayarları" adı öğretmenin seçimi — değiştirme.
  {
    no: 4,
    label: "Dönem sonu ve e-Okul",
    vurgu: true,
    items: [
      // OA80: dönem sonunun asıl işi üstte; yılda 1–2 kez açılan ayar ve form aşağıda.
      { path: "/performans", label: "e-Okul'a Not Yaz", description: "Notları e-Okul formuna yazar. Kaydet'e sen basarsın.", icon: Upload },
      { path: "/rapor", label: "Raporlar", description: "Sınıf ve öğrenci raporlarını PDF yapar.", icon: FileText },
      { path: "/olumlu-davranis", label: "Olumlu Davranışlar", description: "Olumlu davranış sayısını gösterir.", icon: ArrowUpCircle },
      { path: "/performans-notu", label: "Performans Ayarları", description: "Performans notunun hesabını ayarlar.", icon: SlidersHorizontal },
      // OA80: eski ad "Değerlendirme Ölçeği" Ödev Defteri'ndeki dereceli ölçekle karışıyordu.
      { path: "/performans-dagitim", label: "Not Dağıtım Formu", description: "Notu resmi formun ölçütlerine dağıtır.", icon: PieChart },
      { path: "/sok", label: "ŞÖK Tutanağı", description: "Şube Öğretmenler Kurulu tutanağını hazırlar.", icon: ClipboardCheck },
    ],
  },
  {
    no: 5,
    label: "Ayarlar ve bağlantılar",
    katlanir: true,
    items: [
      { path: "/ayarlar", label: "Ayarlar", description: "Tercihleri, zil saatlerini ve yedeği ayarlar.", icon: Settings },
      { path: "/entegrasyon", label: "e-Okul / Telefon Bağlantısı", description: "Eklentiyi ve telefonu eşleştirir.", icon: Cable },
      { path: "/sistem", label: "Veri Durumu", description: "Son veri alma zamanını ve uyarıları gösterir.", icon: Activity },
    ],
  },
];

/** Sidebar'da gösterilecek gruplar — Kazanım takibi Ayarlar'dan kapatılmışsa
 *  "Kazanım Takibi" öğesi gizlenir. Route yine erişilebilir kalır (bkz. plan). */
export function gorunurNavigasyonGruplari(): NavigationGroup[] {
  const gizli = new Set<string>();
  if (!kazanimTakibiAktifMi()) gizli.add("/kazanim");
  if (!sinavHazirlamaVarMi()) gizli.add("/sinav-olusturucu");
  if (gizli.size === 0) return NAVIGATION_GROUPS;
  return NAVIGATION_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((i) => !gizli.has(i.path)) }))
    .filter((g) => g.items.length > 0);
}

const ALL_ITEMS = NAVIGATION_GROUPS.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.label })),
);

const VURGULU_GRUPLAR = new Set(NAVIGATION_GROUPS.filter((g) => g.vurgu).map((g) => g.label));

export function getNavigationContext(pathname: string): {
  group: string;
  item: NavigationItem;
  /** Rotanın grubu vurgulu mu (OA71) — Layout ekrana aynı hafif tonu verir. */
  vurgu: boolean;
} {
  const item = ALL_ITEMS
    .filter((candidate) => candidate.path === "/" ? pathname === "/" : pathname === candidate.path || pathname.startsWith(`${candidate.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0];

  if (pathname.startsWith("/ogrenci/")) {
    const sinifItem = ALL_ITEMS.find((candidate) => candidate.path === "/sinif")!;
    return { group: sinifItem.group, item: { ...sinifItem, label: "Öğrenci Kartı", description: "Öğrenci bilgileri ve gelişimi" }, vurgu: false };
  }

  return item
    ? { group: item.group, item, vurgu: VURGULU_GRUPLAR.has(item.group) }
    : { group: "Öğretmen Asistanı", item: ALL_ITEMS[0], vurgu: false };
}
