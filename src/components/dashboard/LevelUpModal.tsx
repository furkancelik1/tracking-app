"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield } from "lucide-react";
import confetti from "canvas-confetti";

type Props = {
  open: boolean;
  level: number;
  rank: string;
  rankColor: string;
  onClose: () => void;
};

/**
 * Center-screen Level Up celebration overlay.
 * Auto-dismisses after 4 s; click anywhere on the card to close early.
 */
export function LevelUpModal({ open, level, rank, rankColor, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, 4000);

    // Minimal neon confetti burst
    confetti({
      particleCount: 55,
      spread: 70,
      origin: { x: 0.5, y: 0.52 },
      colors: [rankColor, "#ffffff", rankColor + "bb", "#e0e0ff"],
      startVelocity: 22,
      gravity: 1.3,
      scalar: 0.8,
      ticks: 160,
      disableForReducedMotion: true,
    });

    return () => clearTimeout(t);
  }, [open, onClose, rankColor]);

  return (
    <AnimatePresence>
      {open && (
        // Full-screen positioner — pointer-events: none so the rest of the UI stays interactive
        <motion.div
          className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center px-4 pb-[env(safe-area-inset-bottom,0px)] pt-[env(safe-area-inset-top,0px)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Subtle dark backdrop behind the card only */}
          <motion.div
            className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Card */}
          <motion.div
            className="relative pointer-events-auto cursor-pointer select-none"
            initial={{ scale: 0.55, opacity: 0, y: 32 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.75, opacity: 0, y: -16 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
            onClick={onClose}
          >
            <div
              className="relative max-w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border bg-background/95 px-6 py-6 text-center shadow-2xl backdrop-blur-xl sm:px-12 sm:py-9"
              style={{
                borderColor: `${rankColor}50`,
                boxShadow: `0 0 80px ${rankColor}25, 0 24px 64px rgba(0,0,0,0.45)`,
              }}
            >
              {/* Radial glow inside card */}
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse at 50% 0%, ${rankColor}18 0%, transparent 65%)`,
                }}
              />

              <div className="relative space-y-2">
                {/* Star burst */}
                <motion.div
                  className="text-4xl sm:text-5xl"
                  animate={{ rotate: [0, 10, -10, 8, -6, 0] }}
                  transition={{ duration: 0.8, delay: 0.15 }}
                >
                  🌟
                </motion.div>

                {/* "LEVEL UP" label */}
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.35em]"
                  style={{ color: `${rankColor}cc` }}
                >
                  Level Up
                </p>

                {/* Giant level number */}
                <motion.div
                  className="text-6xl font-black tabular-nums leading-none sm:text-8xl"
                  style={{ color: rankColor }}
                  initial={{ scale: 0.4 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.08, type: "spring", stiffness: 380, damping: 18 }}
                >
                  {level}
                </motion.div>

                {/* Rank badge */}
                <motion.div
                  className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1"
                  style={{ backgroundColor: `${rankColor}1a`, color: rankColor }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <Shield className="size-3.5" />
                  <span className="text-sm font-semibold">{rank}</span>
                </motion.div>

                {/* Dismiss hint */}
                <p className="text-[10px] text-muted-foreground/40 pt-1">tap to dismiss</p>
              </div>

              {/* Bottom progress bar — drains over 4s (auto-dismiss) */}
              <motion.div
                className="absolute bottom-0 left-0 h-[2px] rounded-b-2xl"
                style={{ backgroundColor: rankColor }}
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 4, ease: "linear" }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
