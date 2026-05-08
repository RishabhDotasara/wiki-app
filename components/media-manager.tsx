"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon, Loader2, Copy } from "lucide-react";
import { uploadMediaAction } from "@/lib/actions";

export interface MediaItem {
  name: string;
  url: string;
}

interface MediaManagerProps {
  slug: string;
  initialMedia?: MediaItem[];
}

export function MediaManager({ slug, initialMedia = [] }: MediaManagerProps) {
  const [media, setMedia] = useState(initialMedia);
  const [isPending, startTransition] = useTransition();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Only images are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("File exceeds 5MB limit.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      try {
        const res = await uploadMediaAction(slug, formData);
        if (res.success) {
          setMedia(prev => [...prev, { name: res.name || file.name, url: res.url || "" }]);
        }
      } catch (err: any) {
         alert(err.message || "Failed to upload image. Ensure Github tokens are properly configured.");
      }
    });
  };

  const copyMarkdown = (name: string, url: string) => {
    navigator.clipboard.writeText(`![${name}](${url})`);
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card text-card-foreground p-4 shadow-sm w-full h-full">
      <div className="flex items-center justify-between border-b pb-2">
        <h3 className="font-semibold flex items-center gap-2">
          <ImageIcon className="h-4 w-4" /> Media Libary
        </h3>
        <div>
          <input 
            type="file" 
            id="media-upload" 
            accept="image/*" 
            className="hidden" 
            onChange={handleFileChange} 
            disabled={isPending}
          />
          <Button asChild variant="secondary" size="sm" className="cursor-pointer shadow-sm">
            <label htmlFor="media-upload">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Upload Image"}
            </label>
          </Button>
        </div>
      </div>
      
      {media.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No media uploaded yet.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
          {media.map(m => (
             <div key={m.url} className="relative group rounded-md border border-border/50 overflow-hidden bg-muted/10 p-2 flex flex-col gap-2 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt={m.name} className="h-24 w-full object-cover rounded bg-muted/40" />
                <div className="text-[10px] text-muted-foreground truncate font-medium px-0.5 mt-1" title={m.name}>
                   {m.name}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full h-7 text-xs flex gap-2 shadow-sm" 
                  onClick={() => copyMarkdown(m.name, m.url)}
                >
                  <Copy className="h-3 w-3" /> Copy MD
                </Button>
             </div>
          ))}
        </div>
      )}
    </div>
  );
}
