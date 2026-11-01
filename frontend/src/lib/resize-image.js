// The API rejects photos over 250 KB, so shrink in the browser first: max 1600px on the long
// side, then lower the JPEG quality (and finally the size) until the blob fits.
export async function resizeImage(file, maxBytes = 250 * 1024, max = 1600) {
  const bitmap = await createImageBitmap(file); // throws for formats the browser can't decode (e.g. HEIC)
  try {
    let side = Math.min(max, Math.max(bitmap.width, bitmap.height));
    for (;;) {
      const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);

      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff"; // JPEG has no alpha: transparent PNGs would turn black
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (const q of [0.8, 0.65, 0.5, 0.4]) {
        const blob = await toBlob(canvas, q);
        if (blob.size <= maxBytes) return blob;
      }
      if (side <= 400) throw new Error("Foto terlalu besar");
      side = Math.round(side * 0.75);
    }
  } finally {
    bitmap.close();
  }
}

function toBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Gagal memproses foto"))),
      "image/jpeg",
      quality,
    );
  });
}
