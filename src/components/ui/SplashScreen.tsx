"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";

const BRAND_GREEN = "#00FF80";

export function SplashScreen() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
        >
          {/* Ambient outer glow ring */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{ width: 220, height: 220, border: `1px solid ${BRAND_GREEN}18` }}
            animate={{
              boxShadow: [
                `0 0 40px ${BRAND_GREEN}25, 0 0 90px ${BRAND_GREEN}10`,
                `0 0 65px ${BRAND_GREEN}45, 0 0 130px ${BRAND_GREEN}20`,
                `0 0 40px ${BRAND_GREEN}25, 0 0 90px ${BRAND_GREEN}10`,
              ],
            }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.72 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-52 h-52 overflow-hidden"
          >
            <Image
              src="/images/logo.png"
              alt="Zenith"
              fill
              className="object-contain"
              priority
            />

            {/* Glow scan â€” sweeps top-to-bottom once on mount, then repeats */}
            <motion.div
              className="absolute inset-x-0 h-16 pointer-events-none"
              style={{
                background: `linear-gradient(180deg,
                  transparent 0%,
                  ${BRAND_GREEN}18 30%,
                  ${BRAND_GREEN}38 50%,
                  ${BRAND_GREEN}18 70%,
                  transparent 100%)`,
              }}
              initial={{ top: "-18%" }}
              animate={{ top: "115%" }}
              transition={{
                duration: 1.1,
                delay: 0.55,
                ease: "easeInOut",
                repeat: Infinity,
                repeatDelay: 1.8,
              }}
            />
          </motion.div>

          {/* Brand name â€” fades in under the logo */}
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="absolute bottom-[27%] text-sm font-black tracking-[0.55em] uppercase"
            style={{
              color: BRAND_GREEN,
              textShadow: `0 0 10px ${BRAND_GREEN}65, 0 0 26px ${BRAND_GREEN}28`,
            }}
          >
            ZENITH
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
