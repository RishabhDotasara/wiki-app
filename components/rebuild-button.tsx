"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Loader2 } from "lucide-react";

export function RebuildRegistryButton({ variant = "default" }: { variant?: "default" | "outline" | "sm" }) {
  const { pending } = useFormStatus();
  
  return (
    <Button 
      type="submit" 
      variant={variant === "sm" ? "outline" : variant} 
      size={variant === "sm" ? "sm" : "default"}
      disabled={pending}
      className={variant === "sm" ? "gap-2 text-muted-foreground" : "gap-2"}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <RefreshCcw className="h-4 w-4" />
      )}
      {pending ? "Indexing Wiki..." : "Initialize / Rebuild Registry"}
    </Button>
  );
}
