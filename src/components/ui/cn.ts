export function cn(...degerler: Array<string | false | null | undefined>): string {
  return degerler.filter(Boolean).join(" ");
}

