"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

export function SettleButton() {
  const { pending } = useFormStatus();
  
  return (
    <button 
      type="submit"
      disabled={pending}
      className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors border px-3 py-1 rounded bg-muted/20 hover:bg-muted/40 min-w-[60px] flex items-center justify-center disabled:opacity-50"
    >
      {pending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        "Dismiss"
      )}
    </button>
  );
}
