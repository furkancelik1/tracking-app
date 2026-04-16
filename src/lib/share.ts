import { toPng } from "html-to-image";

/**
 * DOM elemanÄ±nÄ± PNG'ye dÃ¶nÃ¼ÅŸtÃ¼rÃ¼p indirir.
 */
export async function downloadShareCard(
  node: HTMLElement,
  filename = "rutin-takip-basari"
): Promise<void> {
  const dataUrl = await toPng(node, {
    quality: 0.95,
    pixelRatio: 2,
    cacheBust: true,
  });
  const link = document.createElement("a");
  link.download = `${filename}.png`;
  link.href = dataUrl;
  link.click();
}

/**
 * DOM elemanÄ±nÄ± PNG Blob'a Ã§evirir (native share iÃ§in).
 */
export async function shareCardToBlob(node: HTMLElement): Promise<Blob> {
  const dataUrl = await toPng(node, {
    quality: 0.95,
    pixelRatio: 2,
    cacheBust: true,
  });
  const res = await fetch(dataUrl);
  return res.blob();
}

/**
 * Web Share API ile PNG paylaÅŸÄ±r. Desteklenmiyorsa false dÃ¶ner.
 */
export async function nativeShareImage(
  blob: Blob,
  title: string,
  text: string
): Promise<boolean> {
  if (
    typeof navigator === "undefined" ||
    !navigator.share ||
    !navigator.canShare
  ) {
    return false;
  }

  const file = new File([blob], "share.png", { type: "image/png" });
  const shareData = { title, text, files: [file] };

  if (!navigator.canShare(shareData)) {
    return false;
  }

  await navigator.share(shareData);
  return true;
}
