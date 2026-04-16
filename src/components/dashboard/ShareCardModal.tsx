"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Download,
  X,
  Loader2,
  Share2,
  Monitor,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ShareCard,
  type ShareCardProps,
  type ShareCardLayout,
} from "@/components/dashboard/ShareCard";
import { downloadShareCard, shareCardToBlob, nativeShareImage } from "@/lib/share";
import { useTranslations } from "next-intl";

type Props = {
  open: boolean;
  onClose: () => void;
  cardProps: ShareCardProps;
};

export function ShareCardModal({ open, onClose, cardProps }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [layout, setLayout] = useState<ShareCardLayout>("landscape");
  const [canNativeShare, setCanNativeShare] = useState(false);
  const t = useTranslations("share");

  useEffect(() => {
    setCanNativeShare(
      typeof navigator !== "undefined" &&
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function"
    );
  }, []);

  const getFilename = useCallback(() => {
    if (cardProps.variant === "level-up") return t("filenameLevelUp");
    if (cardProps.variant === "single-routine") return t("filenameSingleRoutine");
    return t("filenameWeeklySummary");
  }, [cardProps.variant, t]);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      await downloadShareCard(cardRef.current, getFilename());
      toast.success(t("downloaded"));
    } catch {
      toast.error(t("downloadError"));
    } finally {
      setDownloading(false);
    }
  }, [getFilename, t]);

  const handleNativeShare = useCallback(async () => {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const blob = await shareCardToBlob(cardRef.current);
      const shared = await nativeShareImage(
        blob,
        t("nativeShareTitle"),
        t("nativeShareText")
      );
      if (!shared) {
        // Fallback: download
        await downloadShareCard(cardRef.current, getFilename());
        toast.success(t("downloaded"));
      }
    } catch (err) {
      // AbortError means the user cancelled the share dialog â€” not an error
      if (err instanceof Error && err.name === "AbortError") return;
      toast.error(t("downloadError"));
    } finally {
      setSharing(false);
    }
  }, [getFilename, t]);

  const isPortrait = layout === "portrait";
  const previewW = isPortrait ? 1080 : 1200;
  const previewH = isPortrait ? 1920 : 630;
  // Scale to fit in a max-w-2xl (672px) container
  const scale = isPortrait ? 672 / previewW * 0.55 : 0.5;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none overflow-y-auto"
          >
            <div className="pointer-events-auto w-full max-w-2xl flex flex-col gap-4 my-auto">
              {/* Ãœst bar: Layout toggle + Kapat */}
              <div className="flex items-center justify-between">
                {/* Layout Toggle */}
                <div className="flex items-center gap-1 rounded-full bg-white/10 p-1">
                  <button
                    onClick={() => setLayout("landscape")}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      layout === "landscape"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-white/50 hover:text-white/80"
                    }`}
                  >
                    <Monitor className="size-3.5" />
                    {t("layoutLandscape")}
                  </button>
                  <button
                    onClick={() => setLayout("portrait")}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      layout === "portrait"
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-white/50 hover:text-white/80"
                    }`}
                  >
                    <Smartphone className="size-3.5" />
                    {t("layoutPortrait")}
                  </button>
                </div>

                <button
                  onClick={onClose}
                  className="rounded-full bg-white/10 p-2 text-white/60 hover:bg-white/20 hover:text-white transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Kart Ã–nizleme â€” Ã¶lÃ§eklenmiÅŸ */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/20 ring-1 ring-white/10">
                <div
                  style={{
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                    width: previewW,
                    height: previewH,
                  }}
                >
                  <ShareCard ref={cardRef} {...cardProps} layout={layout} />
                </div>
                {/* Ã–lÃ§eklenmiÅŸ boyuta uygun container */}
                <div
                  style={{ paddingBottom: `${(previewH / previewW) * scale * 100}%` }}
                  className="pointer-events-none"
                />
              </div>

              {/* Aksiyon butonlarÄ± */}
              <div className="flex items-center justify-center gap-3">
                <Button
                  onClick={handleDownload}
                  disabled={downloading || sharing}
                  className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                  size="lg"
                >
                  {downloading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {t("preparing")}
                    </>
                  ) : (
                    <>
                      <Download className="size-4" />
                      {t("download")}
                    </>
                  )}
                </Button>

                {canNativeShare && (
                  <Button
                    onClick={handleNativeShare}
                    disabled={downloading || sharing}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    size="lg"
                  >
                    {sharing ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        {t("preparing")}
                      </>
                    ) : (
                      <>
                        <Share2 className="size-4" />
                        {t("shareNative")}
                      </>
                    )}
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={onClose}
                  size="lg"
                  className="border-white/10 text-white/70 hover:bg-white/5"
                >
                  {t("close")}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
