// modules/ders-kitabi/queries.ts — bu modülün SQLite (JSON blob) erişimi (CLAUDE.md mimari sınırı).
export {
  kitaplariGetir, kitapBul, kitapHashIleBul, kitapEkle, kitapGuncelle, kitapSil, kitabaBagliVarlikSayisi,
  kirpmalariGetir, tumKirpmalar, kirpmaBul, kirpmaEkle, kirpmaTopluEkle, kirpmaGuncelle, kirpmalariTopluGuncelle, kirpmaSil, kirpmaGeriYukle,
  kitapNotlariGetir, kitapNotuEkle, kitapNotuGuncelle, kitapNotuSil, kitapNotuGeriYukle,
  foylerGetir, foyEkle, foyGuncelle, foyeBagliKayitOzeti, foySil,
  siniflariGetir, odevEkle, odevGuncelle, odevSil, rubrikSablonlariGetir,
  DepoDoluHatasi,
} from "@/db/repo";
export { HAZIR_RUBRIKLER, rubrikKopyala } from "@/core/rubrik";
