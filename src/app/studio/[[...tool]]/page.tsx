"use client";

import { NextStudio } from "next-sanity/studio";
import config from "../../../../sanity.config";

const disableTransitionWarning = "React does not recognize the `disableTransition` prop";

if (typeof window !== "undefined") {
  const win = window as Window & { __cvSanityWarningFilter?: boolean };
  if (!win.__cvSanityWarningFilter) {
    const originalError = console.error;
    console.error = (...args) => {
      if (typeof args[0] === "string" && args[0].includes(disableTransitionWarning)) return;
      originalError(...args);
    };
    win.__cvSanityWarningFilter = true;
  }
}

export default function StudioPage() {
  return <NextStudio config={config} />;
}
