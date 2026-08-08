"use client";

import { useEffect } from "react";

const VERSION_LABEL = "InstaEditor";

export default function VersionLogger() {
  useEffect(() => {
    // Visible in browser console for quick verification.
    console.info(`[${VERSION_LABEL}] UI loaded`);
  }, []);

  return null;
}
