"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { rebuildRegistryAction } from "@/lib/actions";

export function RebuildRegistryButton() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleRebuild() {
    setLoading(true);
    setDone(false);
    try {
      await rebuildRegistryAction();
      setDone(true);
      // Auto-reload so the article list refreshes with new data
      setTimeout(() => window.location.reload(), 800);
    } catch (e: any) {
      alert("Rebuild failed: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRebuild}
      disabled={loading}
      className="gap-2 text-xs"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Rebuilding…" : done ? "✓ Rebuilt!" : "Rebuild Registry"}
    </Button>
  );
}
