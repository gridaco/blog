"use client";

import { useEffect, useId, useRef } from "react";

export function Mermaid({ chart }: { chart: string }) {
  const container = useRef<HTMLDivElement>(null);
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  useEffect(() => {
    let cancelled = false;
    async function render() {
      const { default: mermaid } = await import("mermaid");
      mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral" });
      const { svg } = await mermaid.render(`diagram-${id}`, chart);
      if (!cancelled && container.current) container.current.innerHTML = svg;
    }
    void render().catch(() => {
      /* The readable source remains if rendering fails. */
    });
    return () => {
      cancelled = true;
    };
  }, [chart, id]);
  return (
    <figure className="mermaid-diagram">
      <div ref={container} role="img" aria-label="Diagram">
        <pre>{chart}</pre>
      </div>
    </figure>
  );
}
