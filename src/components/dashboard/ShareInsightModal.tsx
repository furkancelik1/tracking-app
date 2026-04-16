"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  X,
  Copy,
  Check,
  Share2,
  ExternalLink,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import type { WeeklyInsightPayload } from "@/actions/ai.actions";

// ─── Social Icons (inline SVG) ──────────────────────────────────────────────

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface ShareInsightModalProps {
  open: boolean;
  onClose: () => void;
  data: WeeklyInsightPayload;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ShareInsightModal({
  open,
  onClose,
  data,
}: ShareInsightModalProps) {
  const t = useTranslations("aiInsight");
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [ogLoaded, setOgLoaded] = useState(false);

  const ogImageUrl =
    typeof window !== "undefined" && data.id
      ? `${window.location.origin}/api/og/weekly-insight?id=${data.id}`
      : "";

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/dashboard`
      : "";

  const shareText = `${t("shareDescription")} (${data.weekKey})`;

  useEffect(() => {
    setCanNativeShare(
      typeof navigator !== "undefined" &&
        typeof navigator.share === "function"
    );
  }, []);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success(t("shareCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }, [shareUrl, t]);

  const handleNativeShare = useCallback(async () => {
    try {
      await navigator.share({
        title: t("shareTitle"),
        text: shareText,
        url: shareUrl,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
    }
  }, [shareUrl, shareText, t]);

  const openTwitter = useCallback(() => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [shareText, shareUrl]);

  const openWhatsApp = useCallback(() => {
    const url = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [shareText, shareUrl]);

  const openLinkedIn = useCallback(() => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [shareUrl]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="share-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            key="share-modal"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-gray-950 via-indigo-950/50 to-gray-950 shadow-2xl shadow-indigo-500/10 overflow-hidden">
              {/* ── Header ── */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="flex items-center gap-2">
                  <Share2 className="h-4.5 w-4.5 text-indigo-400" />
                  <h2 className="text-sm font-semibold text-white">
                    {t("shareTitle")}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-full p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* ── OG Image Preview ── */}
              <div className="mx-5 mb-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                  {t("sharePreview")}
                </p>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="relative rounded-xl overflow-hidden border border-indigo-500/20"
                >
                  {/* Loading skeleton */}
                  {!ogLoaded && (
                    <div className="flex items-center justify-center bg-gradient-to-br from-indigo-950 via-violet-950 to-indigo-950 aspect-[1200/630]">
                      <div className="flex flex-col items-center gap-2 text-indigo-300/50">
                        <ImageIcon className="h-6 w-6 animate-pulse" />
                        <span className="text-[10px]">{t("sharePreview")}…</span>
                      </div>
                    </div>
                  )}
                  {/* Actual OG Image */}
                  {ogImageUrl && (
                    <img
                      src={ogImageUrl}
                      alt="Weekly Insight OG Image"
                      className={`w-full ${ogLoaded ? "block" : "hidden"}`}
                      onLoad={() => setOgLoaded(true)}
                    />
                  )}
                </motion.div>
              </div>

              {/* ── Social Buttons ── */}
              <div className="px-5 pb-3">
                <div className="grid grid-cols-3 gap-2">
                  {/* X (Twitter) */}
                  <motion.button
                    whileHover={{ scale: 1.04, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={openTwitter}
                    className="group flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-3 px-2 transition-colors hover:border-white/20 hover:bg-white/10 hover:shadow-lg hover:shadow-white/5"
                  >
                    <XIcon className="h-4.5 w-4.5 text-white/70 group-hover:text-white transition-colors" />
                    <span className="text-[10px] font-medium text-white/50 group-hover:text-white/80">
                      {t("shareTwitter")}
                    </span>
                  </motion.button>

                  {/* WhatsApp */}
                  <motion.button
                    whileHover={{ scale: 1.04, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={openWhatsApp}
                    className="group flex flex-col items-center gap-1.5 rounded-xl border border-emerald-500/10 bg-emerald-500/5 py-3 px-2 transition-colors hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:shadow-lg hover:shadow-emerald-500/5"
                  >
                    <WhatsAppIcon className="h-4.5 w-4.5 text-emerald-400/70 group-hover:text-emerald-400 transition-colors" />
                    <span className="text-[10px] font-medium text-emerald-400/50 group-hover:text-emerald-400/80">
                      {t("shareWhatsApp")}
                    </span>
                  </motion.button>

                  {/* LinkedIn */}
                  <motion.button
                    whileHover={{ scale: 1.04, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={openLinkedIn}
                    className="group flex flex-col items-center gap-1.5 rounded-xl border border-blue-500/10 bg-blue-500/5 py-3 px-2 transition-colors hover:border-blue-500/30 hover:bg-blue-500/10 hover:shadow-lg hover:shadow-blue-500/5"
                  >
                    <LinkedInIcon className="h-4.5 w-4.5 text-blue-400/70 group-hover:text-blue-400 transition-colors" />
                    <span className="text-[10px] font-medium text-blue-400/50 group-hover:text-blue-400/80">
                      {t("shareLinkedIn")}
                    </span>
                  </motion.button>
                </div>
              </div>

              {/* ── Copy Link + Native Share ── */}
              <div className="px-5 pb-5 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="flex-1 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-200 hover:shadow-md hover:shadow-indigo-500/10 transition-all"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {copied ? t("shareCopied") : t("shareCopyLink")}
                </Button>

                {canNativeShare && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNativeShare}
                    className="border-violet-500/30 text-violet-300 hover:bg-violet-500/10 hover:text-violet-200 hover:shadow-md hover:shadow-violet-500/10 transition-all"
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    {t("shareSystemShare")}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
