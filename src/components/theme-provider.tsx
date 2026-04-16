"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

// React 19'un gereksiz yere fÄ±rlattÄ±ÄŸÄ± "script tag" devasa hata ekranÄ±nÄ± susturuyoruz.
// Sadece geliÅŸtirme modunda Ã§alÄ±ÅŸÄ±r ve projenin mantÄ±ÄŸÄ±nÄ± asla bozmaz.
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const origError = console.error;
  console.error = (...args) => {
    if (typeof args[0] === "string" && args[0].includes("Encountered a script tag")) return;
    origError.apply(console, args);
  };
}

export function ThemeProvider({ children, ...props }: any) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
