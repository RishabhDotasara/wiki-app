import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="w-full max-w-5xl mx-auto py-24 px-6 flex flex-col items-center justify-center space-y-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary/40" />
      <p className="text-muted-foreground font-medium animate-pulse">
        Fetching diff from GitHub...
      </p>
      
      <div className="w-full max-w-2xl mt-12 space-y-4 opacity-20">
        <div className="h-8 bg-muted rounded-md w-3/4" />
        <div className="h-4 bg-muted rounded-md w-1/2" />
        <div className="h-64 bg-muted rounded-xl w-full" />
      </div>
    </div>
  );
}
