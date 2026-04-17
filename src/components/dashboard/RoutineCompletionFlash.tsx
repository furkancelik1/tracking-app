"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";

type Props = {
  label: string | null;
};

export function RoutineCompletionFlash({ label }: Props) {
  return (
    <AnimatePresence>
      {label ? (
        <motion.div
          key={label}
          className="fixed inset-0 z-[120] flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.span
            className="select-none text-[min(18vw,7rem)] font-black uppercase tracking-[-0.06em] leading-none text-[#D6FF00]/[0.38] drop-shadow-[0_0_40px_rgba(214,255,0,0.15)]"
            initial={{ scale: 0.88, opacity: 0, filter: "blur(10px)" }}
            animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
            exit={{ scale: 1.08, opacity: 0, filter: "blur(14px)" }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            {label}
          </motion.span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
