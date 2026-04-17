"use client";

import React from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

type Props = {
  children: ReactNode;
};

export function PageTransition({ children }: Props) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ type: "spring", stiffness: 200, damping: 26, mass: 0.75 }}
        className="min-h-[50vh]"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
