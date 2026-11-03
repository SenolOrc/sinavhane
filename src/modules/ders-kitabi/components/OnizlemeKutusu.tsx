// modules/ders-kitabi/components/OnizlemeKutusu.tsx — sepet ögesi/bölge-notu
// kartlarının ortak küçük resim kutusu. Önizleme kirpmaOnizlemeDepo.ts'ten
// async okunur; gelene kadar (veya hiç yoksa — eski kırpmalar/notlar için kabul
// edilen durum, hata verilmez) sabit kırpma ikonu placeholder olarak kalır.
import { useEffect, useRef, useState } from "react";
import { Crop } from "lucide-react";
import { kirpmaOnizlemeOku } from "../storage/kirpmaOnizlemeDepo";
import { eskiKucukOnizlemeMi } from "../lib/kirpmaOnizleme";
import { onizlemeyiYenile } from "../lib/onizlemeYenile";

export function OnizlemeKutusu({ id, className, alt = "Soru önizlemesi" }: { id: string; className?: string; alt?: string }) {
  const kutuRef = useRef<HTMLDivElement | null>(null);
  const [yuklensin, setYuklensin] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const idRef = useRef(id);
  idRef.current = id;

  useEffect(() => {
    setYuklensin(false);
    const eleman = kutuRef.current;
    if (!eleman || typeof IntersectionObserver === "undefined") {
      setYuklensin(true);
      return undefined;
    }
    const gozlemci = new IntersectionObserver((kayitlar) => {
      if (kayitlar.some((kayit) => kayit.isIntersecting)) {
        setYuklensin(true);
        gozlemci.disconnect();
      }
    }, { rootMargin: "160px" });
    gozlemci.observe(eleman);
    return () => gozlemci.disconnect();
  }, [id]);

  useEffect(() => {
    if (!yuklensin) return undefined;
    let iptal = false;
    setUrl(null);
    kirpmaOnizlemeOku(id)
      .then((sonuc) => {
        if (!iptal) setUrl(sonuc);
      })
      .catch(() => undefined);
    return () => {
      iptal = true;
    };
  }, [id, yuklensin]);

  return (
    <div
      ref={kutuRef}
      aria-busy={yuklensin && !url}
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded bg-slate-100 text-slate-400 ${className ?? ""}`}
    >
      {url ? <img
        src={url}
        alt={alt}
        className="h-full w-full object-contain"
        // Denetim (2026-10, B5): eski 160 px önizleme görüntülenince PDF'ten 480 px'e tembel yenilenir.
        onLoad={(e) => {
          const img = e.currentTarget;
          if (!eskiKucukOnizlemeMi(img.naturalWidth, img.naturalHeight)) return;
          const istenen = id;
          void onizlemeyiYenile(istenen).then((yeni) => { if (yeni && kutuRef.current && idRef.current === istenen) setUrl(yeni); });
        }}
      /> : <span role="img" aria-label={yuklensin ? `${alt} yükleniyor` : `${alt} görünür olduğunda yüklenecek`}><Crop size={14} aria-hidden /></span>}
    </div>
  );
}
