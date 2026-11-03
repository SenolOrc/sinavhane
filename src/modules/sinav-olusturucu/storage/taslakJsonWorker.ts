self.onmessage = (olay: MessageEvent<string>) => {
  try {
    self.postMessage({ sonuc: JSON.parse(olay.data) as unknown });
  } catch {
    self.postMessage({ hata: "Dosya geçerli JSON içermiyor." });
  }
};

export {};
