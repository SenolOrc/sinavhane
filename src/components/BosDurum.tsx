// components/BosDurum.tsx — tüm ekranlarda tek tip "veri/seçim yok" kutusu.
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui";

export function BosDurum({
  icon: Icon, baslik, aciklama, eylem, kompakt = false,
}: {
  icon?: LucideIcon;
  baslik: string;
  aciklama?: string;
  eylem?: ReactNode;
  kompakt?: boolean;
}) {
  return (
    <EmptyState className="mt-6" compact={kompakt} icon={Icon} title={baslik} description={aciklama} action={eylem} />
  );
}
