"use client";

import { useState } from "react";

const LABELS = { idle: "Copy as Markdown", copied: "Copied", failed: "Copy failed, try again" } as const;

export function CopyMarkdown({ href }: { href: string }) {
  const [state, setState] = useState<keyof typeof LABELS>("idle");

  async function copy() {
    try {
      const response = await fetch(href);
      if (!response.ok) throw new Error(String(response.status));
      await navigator.clipboard.writeText(await response.text());
      setState("copied");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 1600);
  }

  return (
    <button type="button" className="button small" onClick={copy}>
      {LABELS[state]}
      <span className="sr-only" role="status">
        {state === "idle" ? "" : LABELS[state]}
      </span>
    </button>
  );
}
