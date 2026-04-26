"use server";

import { requireAuth } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_FLASH = "gemini-2.5-flash";

const COACH_SYSTEM_PROMPT = `Sen kısa, odaklı koçluk ipuçları üreten bir fitness ve yaşam koçusun.
Verilen rutin başlığı ve zorluk seviyesine göre tek bir, güçlü koçluk ipucu üret.

KURALLARIN:
- Maksimum 2 cümle, pratik ve eyleme dönüştürülebilir.
- Yargılamadan, motive edici bir ton kullan.
- Teknik detay değil, zihinsel/pratik strateji odaklı ol.
- Emoji KULLANMA.
- Sadece ipucu metnini döndür, başlık veya etiket ekleme.

IMPORTANT: Respond ENTIRELY in the language requested. If locale is "tr", use Turkish with proper characters (ğ, ş, ı, ö, ç, ü). If locale is "en", use English. Never mix languages.`;

export async function generateCoachTip(
  title: string,
  intensity: string,
  locale: string
): Promise<{ success: true; tip: string } | { success: false; error: string }> {
  try {
    await requireAuth();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { success: false, error: "AI service not configured." };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL_FLASH,
      systemInstruction: COACH_SYSTEM_PROMPT,
    });

    const intensityLabel =
      intensity === "HIGH"
        ? locale === "tr" ? "yüksek yoğunluklu" : "high intensity"
        : intensity === "LOW"
        ? locale === "tr" ? "düşük yoğunluklu" : "low intensity"
        : locale === "tr" ? "orta yoğunluklu" : "medium intensity";

    const prompt =
      locale === "tr"
        ? `Rutin: "${title}" (${intensityLabel})\nBu rutin için kısa, güçlü bir koçluk ipucu yaz.`
        : `Routine: "${title}" (${intensityLabel})\nWrite a short, powerful coaching tip for this routine.`;

    const result = await model.generateContent(prompt);
    const tip = result.response.text().trim();

    if (!tip) {
      return { success: false, error: "Empty response from AI." };
    }

    return { success: true, tip };
  } catch (err) {
    console.error("[generateCoachTip]", err);
    return { success: false, error: "AI tip generation failed." };
  }
}
