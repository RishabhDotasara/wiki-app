import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-6 space-y-8">
      <div className="flex items-center justify-between">
         <div className="h-10 bg-muted rounded-md w-48 animate-pulse" />
      </div>
      
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="p-6 rounded-xl border bg-muted/20 h-24 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
