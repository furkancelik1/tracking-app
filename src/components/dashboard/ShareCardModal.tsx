"use client";

import { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Download, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareCard, type ShareCardProps } from "@/components/dashboard/ShareCard";
import { downloadShareCard } from "@/lib/share";

type Props = {
  open: boolean;
  onClose: () => void;
  cardProps: ShareCardProps;
};

export function ShareCardModal({ open, onClose, cardProps }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const filename =
        cardProps.variant === "level-up"
          ? "seviye-atladi"
          : "haftalik-ozet";
      await downloadShareCard(cardRef.current, filename);
      toast.success("Görsel indirildi! 📸");
    } catch {
      toast.error("Görsel oluşturulamadı, tekrar deneyin.");
    } finally {
      setDownloading(false);
    }
  }, [cardProps.variant]);

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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-2xl flex flex-col gap-4">
              {/* Kapat butonu */}
              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="rounded-full bg-white/10 p-2 text-white/60 hover:bg-white/20 hover:text-white transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Kart Önizleme — ölçeklenmiş */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/20 ring-1 ring-white/10">
                <div
                  style={{
                    transform: "scale(0.5)",
                    transformOrigin: "top left",
                    width: 1200,
                    height: 630,
                  }}
                >
                  <ShareCard ref={cardRef} {...cardProps} />
                </div>
                {/* Ölçeklenmiş boyuta uygun container */}
                <div style={{ paddingBottom: `${(630 / 1200) * 100}%` }} className="pointer-events-none" />
              </div>

              {/* Aksiyon butonları */}
              <div className="flex items-center justify-center gap-3">
                <Button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                  size="lg"
                >
                  {downloading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Hazırlanıyor…
                    </>
                  ) : (
                    <>
                      <Download className="size-4" />
                      Görseli İndir
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={onClose}
                  size="lg"
                  className="border-white/10 text-white/70 hover:bg-white/5"
                >
                  Kapat
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
