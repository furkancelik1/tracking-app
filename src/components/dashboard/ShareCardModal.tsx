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

const MAX_CONTAINER = 672;

export function ShareCardModal({ open, onClose, cardProps }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [layout, setLayout] = useState<ShareCardLayout>("landscape");
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [containerWidth, setContainerWidth] = useState(MAX_CONTAINER);
  const t = useTranslations("share");

  useEffect(() => {
    setCanNativeShare(
      typeof navigator !== "undefined" &&
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function"
    );
  }, []);

  useEffect(() => {
    const update = () => {
      if (typeof window === "undefined") return;
      setContainerWidth(Math.min(MAX_CONTAINER, Math.max(280, window.innerWidth - 32)));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
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
        await downloadShareCard(cardRef.current, getFilename());
        toast.success(t("downloaded"));
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      toast.error(t("downloadError"));
    } finally {
      setSharing(false);
    }
  }, [getFilename, t]);

  const isPortrait = layout === "portrait";
  const previewW = isPortrait ? 1080 : 1200;
  const previewH = isPortrait ? 1920 : 630;
  const cw = containerWidth;
  const scale = isPortrait ? (cw / previewW) * 0.55 : (cw / previewW) * 0.89;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 24 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="pointer-events-none fixed inset-0 z-[61] flex items-start justify-center overflow-y-auto overscroll-contain px-3 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] pt-[max(0.75rem,env(safe-area-inset-top,0px))] sm:items-center sm:px-4 sm:pb-8"
          >
            <div className="pointer-events-auto my-auto flex w-full max-w-2xl flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1 rounded-full bg-white/10 p-1">
                  <button
                    type="button"
                    onClick={() => setLayout("landscape")}
                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition-all sm:px-3 ${
                      layout === "landscape"
                        ? "bg-[#D6FF00] text-black shadow-sm"
                        : "text-white/50 hover:text-white/80"
                    }`}
                  >
                    <Monitor className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{t("layoutLandscape")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayout("portrait")}
                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition-all sm:px-3 ${
                      layout === "portrait"
                        ? "bg-[#D6FF00] text-black shadow-sm"
                        : "text-white/50 hover:text-white/80"
                    }`}
                  >
                    <Smartphone className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{t("layoutPortrait")}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full bg-white/10 p-2 text-white/60 transition-colors hover:bg-white/20 hover:text-white"
                  aria-label={t("close")}
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="max-h-[min(70dvh,560px)] w-full overflow-auto rounded-2xl ring-1 ring-white/10 sm:max-h-none">
                <div className="relative overflow-hidden rounded-2xl shadow-2xl shadow-black/40 ring-1 ring-white/10">
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
                  <div
                    style={{ paddingBottom: `${(previewH / previewW) * scale * 100}%` }}
                    className="pointer-events-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-3">
                <Button
                  onClick={handleDownload}
                  disabled={downloading || sharing}
                  className="w-full gap-2 bg-[#D6FF00] font-semibold text-black hover:bg-[#c8f000] sm:w-auto"
                  size="lg"
                >
                  {downloading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      {t("preparing")}
                    </>
                  ) : (
                    <>
                      <Download className="size-4" aria-hidden />
                      {t("download")}
                    </>
                  )}
                </Button>

                {canNativeShare && (
                  <Button
                    onClick={handleNativeShare}
                    disabled={downloading || sharing}
                    className="w-full gap-2 border border-white/15 bg-zinc-900 text-white hover:bg-zinc-800 sm:w-auto"
                    size="lg"
                  >
                    {sharing ? (
                      <>
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                        {t("preparing")}
                      </>
                    ) : (
                      <>
                        <Share2 className="size-4" aria-hidden />
                        {t("shareNative")}
                      </>
                    )}
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={onClose}
                  size="lg"
                  className="w-full border-white/10 text-white/70 hover:bg-white/5 sm:w-auto"
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
