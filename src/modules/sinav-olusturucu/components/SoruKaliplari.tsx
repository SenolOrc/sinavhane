// Soru panelindeki "Kalıp ekle" ve "Sabit veriler" araçları.
// Üretim mantığı `kaliplar.ts`'te (saf, testli); burası yalnız düğmeler.

import { useState } from "react";
import { CheckSquare, ListChecks, Sigma, Table2 } from "lucide-react";

import type { SoruOgesi } from "../types";
import {
  DY_SATIR_EN_FAZLA,
  DY_SATIR_VARSAYILAN,
  SABIT_VERILER,
  dogruYanlisKalibi,
  isaretlemeKalibi,
  kokunSonunaEkle,
  maddelerDoluMu,
  oncullKalibi,
  sabitSeciminiOku,
  sabitSeciminiYaz,
  sabitVeriSatiri,
  sabitVeriSatiriniUygula,
  siklariMaddeYap,
} from "../kaliplar";
import { htmlTemizle } from "../security/html";
import { TogglePill } from "./ModalParcalari";

type Menu = "kalip" | "veri" | null;

export function SoruKaliplari({
  soru,
  testModu,
  onChange,
}: {
  soru: SoruOgesi;
  testModu: boolean;
  onChange: (patch: Partial<SoruOgesi>) => void;
}) {
  const [menu, setMenu] = useState<Menu>(null);
  const [mesaj, setMesaj] = useState("");
  const [dySatir, setDySatir] = useState(DY_SATIR_VARSAYILAN);
  const [secili, setSecili] = useState<string[]>(() => sabitSeciminiOku());

  const kokAlani = soru.tur === "metin" ? "metinHtml" : "altMetinHtml";
  const kokKapali = soru.tur === "gorsel" && soru.metinKonumu === "yok";
  if (kokKapali) return null;
  const kok = (soru[kokAlani] as string | undefined) ?? "";

  function ekle(parca: string, ek: Partial<SoruOgesi> = {}) {
    onChange({ [kokAlani]: htmlTemizle(kokunSonunaEkle(kok, parca)), ...ek });
  }

  function oncullu() {
    const k = oncullKalibi(soru.maddeler.length);
    if (!testModu) {
      ekle(k.kokParcasi);
      setMesaj("Öncüller eklendi. Şıklar Test kipinde doldurulur.");
    } else if (maddelerDoluMu(soru.maddeler)) {
      ekle(k.kokParcasi);
      setMesaj("Öncüller eklendi; yazılı şıklarınız korundu.");
    } else {
      ekle(k.kokParcasi, { maddeler: siklariMaddeYap(k.siklar), maddeKolon: 1 });
      setMesaj(`Öncüller ve ${k.siklar.length} şık eklendi.`);
    }
    setMenu(null);
  }

  function ekleVeKapat(parca: string, bilgi: string) {
    ekle(parca);
    setMesaj(bilgi);
    setMenu(null);
  }

  function sabitDegistir(id: string) {
    const yeni = secili.includes(id) ? secili.filter((x) => x !== id) : [...secili, id];
    setSecili(yeni);
    sabitSeciminiYaz(yeni);
  }

  const satir = sabitVeriSatiri(secili);
  function sabitEkle() {
    if (!satir) return;
    onChange({ [kokAlani]: htmlTemizle(sabitVeriSatiriniUygula(kok, satir)) });
    setMesaj("Veri satırı soru metninin sonuna eklendi.");
    setMenu(null);
  }

  const dugme =
    "inline-flex w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-50";

  return (
    <div className="mt-2" data-testid="soru-kaliplari">
      <div className="flex flex-wrap gap-1">
        <TogglePill aktif={menu === "kalip"} onClick={() => setMenu(menu === "kalip" ? null : "kalip")}>
          Kalıp ekle
        </TogglePill>
        <TogglePill aktif={menu === "veri"} onClick={() => setMenu(menu === "veri" ? null : "veri")}>
          Sabit veriler
        </TogglePill>
      </div>

      {menu === "kalip" && (
        <div className="mt-1.5 space-y-1 rounded-lg border border-slate-200 bg-slate-50/60 p-2" data-testid="kalip-menusu">
          <button type="button" className={dugme} data-testid="kalip-oncullu" onClick={oncullu}>
            <ListChecks size={14} className="shrink-0 text-slate-400" />
            <span>
              Öncüllü (I, II, III)
              <span className="block text-[10px] font-normal text-slate-400">
                {testModu ? "Üç öncül + “Yalnız I … I, II ve III” şıkları" : "Üç öncül + “hangileri doğrudur?”"}
              </span>
            </span>
          </button>
          <div className="flex items-stretch gap-1">
            <button type="button" className={dugme} data-testid="kalip-dy" onClick={() => ekleVeKapat(dogruYanlisKalibi(dySatir), "Doğru/Yanlış tablosu eklendi.")}>
              <Table2 size={14} className="shrink-0 text-slate-400" />
              <span>
                Doğru / Yanlış + Açıklama
                <span className="block text-[10px] font-normal text-slate-400">Önerme | D | Y | Açıklama</span>
              </span>
            </button>
            <label className="flex shrink-0 flex-col justify-center text-[10px] text-slate-400">
              Satır
              <input
                type="number"
                min={1}
                max={DY_SATIR_EN_FAZLA}
                value={dySatir}
                aria-label="Tablo satır sayısı"
                data-testid="kalip-dy-satir"
                onChange={(e) => setDySatir(Math.min(DY_SATIR_EN_FAZLA, Math.max(1, Math.round(Number(e.target.value)) || 1)))}
                className="w-12 rounded-md border border-slate-200 px-1.5 py-1 text-xs text-slate-700"
              />
            </label>
          </div>
          <button type="button" className={dugme} data-testid="kalip-isaretleme" onClick={() => ekleVeKapat(isaretlemeKalibi(), "Kutucuklu işaretleme eklendi.")}>
            <CheckSquare size={14} className="shrink-0 text-slate-400" />
            <span>
              ☐ Kutucuklu işaretleme
              <span className="block text-[10px] font-normal text-slate-400">Birden fazla doğru olabilir</span>
            </span>
          </button>
        </div>
      )}

      {menu === "veri" && (
        <div className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50/60 p-2" data-testid="sabit-veri-menusu">
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            {SABIT_VERILER.map((v) => (
              <label key={v.id} className="flex items-center gap-1.5 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={secili.includes(v.id)}
                  data-testid={`sabit-${v.id}`}
                  onChange={() => sabitDegistir(v.id)}
                />
                {v.etiket}
              </label>
            ))}
          </div>
          <p className="mt-2 rounded-md bg-white px-2 py-1 font-serif text-xs text-slate-700" data-testid="sabit-onizleme">
            {satir || "Bir sabit seçin."}
          </p>
          <button
            type="button"
            disabled={!satir}
            data-testid="sabit-ekle"
            onClick={sabitEkle}
            className="mt-1.5 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-brand-300 bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sigma size={13} /> Metnin sonuna ekle
          </button>
        </div>
      )}

      {mesaj && (
        <p className="mt-1 text-[10px] text-emerald-700" role="status" data-testid="kalip-mesaj">
          {mesaj}
        </p>
      )}
    </div>
  );
}
