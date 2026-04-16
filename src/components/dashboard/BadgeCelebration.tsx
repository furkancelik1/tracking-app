"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy } from "lucide-react";

const NEON = "#39FF14";

type Props = {
  badgeName: string | null;
  onDone: () => void;
};

export function BadgeCelebration({ badgeName, onDone }: Props) {
  useEffect(() => {
    if (!badgeName) return;
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [badgeName, onDone]);

  return (
    <AnimatePresence>
      {badgeName && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ pointerEvents: "none" }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Card */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
            className="relative z-10 flex flex-col items-center gap-5 rounded-2xl px-12 py-10"
            style={{
              background: "rgba(9,9,11,0.92)",
              border: `1px solid ${NEON}30`,
              boxShadow: `0 0 60px ${NEON}25, 0 0 120px ${NEON}10`,
            }}
          >
            {/* Pulsing ring */}
            <motion.div
              animate={{ scale: [1, 1.35, 1], opacity: [0.35, 0, 0.35] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-2xl"
              style={{ border: `2px solid ${NEON}` }}
            />

            {/* Trophy */}
            <motion.div
              initial={{ rotate: -20, scale: 0.6 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
              className="flex h-20 w-20 items-center justify-center rounded-full"
              style={{
                background: `radial-gradient(circle, ${NEON}15 0%, transparent 70%)`,
                boxShadow: `0 0 32px ${NEON}35`,
              }}
            >
              <Trophy
                className="h-10 w-10"
                style={{ color: NEON, filter: `drop-shadow(0 0 10px ${NEON})` }}
              />
            </motion.div>

            {/* Text */}
            <div className="text-center">
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-[11px] font-semibold uppercase tracking-widest"
                style={{ color: NEON }}
              >
                Rozet Kazandın!
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="mt-1.5 text-2xl font-black text-white"
              >
                {badgeName}
              </motion.p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
