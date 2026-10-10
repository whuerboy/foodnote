import { createWorker } from "tesseract.js";
import { parseNutritionLabel, type LabelDraft } from "../domain/label";
// All OCR assets come from this site's origin. Photos are processed on the device.
export async function recognizeLabel(
  image: Blob,
  progress: (value: number) => void,
): Promise<LabelDraft> {
  const base = new URL(`${import.meta.env.BASE_URL}ocr/`, location.origin).href;
  // Cache assets before the first scan, including when the service worker has
  // not yet taken control of the first opened page.
  if ("caches" in window) {
    const cache = await caches.open("foodnote-ocr-v1");
    for (const path of [
      "worker.min.js",
      "core/tesseract-core-lstm.wasm.js",
      "core/tesseract-core-simd-lstm.wasm.js",
      "lang/chi_sim.traineddata.gz",
      "lang/eng.traineddata.gz",
    ]) {
      const url = `${base}${path}`;
      if (!(await cache.match(url))) {
        const response = await fetch(url);
        if (!response.ok) throw Error("无法加载识别组件");
        await cache.put(url, response);
      }
    }
  }
  const worker = await createWorker("chi_sim+eng", 1, {
    workerPath: `${base}worker.min.js`,
    corePath: `${base}core/`,
    langPath: `${base}lang/`,
    logger: (m) => {
      if (m.status === "recognizing text") progress(m.progress);
    },
  });
  try {
    const { data } = await worker.recognize(await resizeImage(image));
    return parseNutritionLabel(data.text);
  } finally {
    await worker.terminate();
  }
}
async function resizeImage(blob: Blob): Promise<Blob> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const ratio = Math.min(
      1,
      2200 / Math.max(img.naturalWidth, img.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * ratio);
    canvas.height = Math.round(img.naturalHeight * ratio);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) =>
          b
            ? resolve(b)
            : reject(Error("无法读取照片，请选择 JPG 或 PNG 图片")),
        "image/png",
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
