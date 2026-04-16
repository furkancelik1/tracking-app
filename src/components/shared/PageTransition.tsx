"use client";

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
        initial={{ opacity: 0, y: 10, scale: 0.995 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.995 }}
        transition={{ type: "spring", stiffness: 170, damping: 20, mass: 0.7 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
