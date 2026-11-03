// UI testleri için gerçekçi veri (demo seti) üretir → argv[2] dosyasına JSON yazar.
import "./_tarayici-ortami";
import fs from "node:fs";
const repo = await import("../src/db/repo");
await repo.demoVerisiniYukle();
fs.writeFileSync(process.argv[2], JSON.stringify(JSON.parse(repo.veritabaniDisariAktar()).veri));
console.log("tohum yazıldı", repo.siniflariGetir().length, "sınıf");
