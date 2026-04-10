import { toPng } from "html-to-image";

/**
 * DOM elemanını PNG'ye dönüştürüp indirir.
 *
 * @param node - Yakalanacak DOM elemanı
 * @param filename - İndirilecek dosya adı (uzantısız)
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
