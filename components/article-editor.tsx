"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveArticleAction } from "@/lib/actions";
import { Loader2 } from "lucide-react";

import { MediaManager, MediaItem } from "@/components/media-manager";

import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface ArticleEditorProps {
  initialTitle?: string;
  initialContent?: string;
  initialTags?: string[];
  slug: string;
  initialMedia?: MediaItem[];
}

export function ArticleEditor({ 
  initialTitle = "", 
  initialContent = "", 
  initialTags = [],
  slug, 
  initialMedia = [] 
}: ArticleEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      try {
        // Only pass slug if it's an existing article (not our 'new-article' route)
        const existingSlug = slug !== "new-article" ? slug : undefined;
        const result = await saveArticleAction(title, content, tags, existingSlug);
        
        if (result.isQueued) {
           alert("Your edit has been safely queued for an Admin to review and approve!");
           router.push(`/${result.slug}`);
        } else {
           router.push(`/${result.slug}`);
        }
      } catch (err: any) {
        alert(err.message || "Failed to save article");
      }
    });
  };

  const addTag = () => {
    const freshTag = tagInput.trim();
    if (freshTag && !tags.includes(freshTag)) {
      setTags([...tags, freshTag]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Edit Article</h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleCancel} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">Article Title</label>
              <Input 
                id="title" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="e.g., Getting Started with Campuslores"
                className="text-lg font-medium"
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tags</label>
              <div className="flex flex-wrap gap-2 mb-2 min-h-[32px]">
                {tags.length === 0 && <span className="text-xs text-muted-foreground italic">No tags added yet...</span>}
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="pl-2 pr-1 py-1 gap-1 group">
                    {tag}
                    <button 
                      onClick={() => removeTag(tag)}
                      className="hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input 
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Add a tag..."
                  className="max-w-[200px]"
                  disabled={isPending}
                />
                <Button type="button" variant="outline" onClick={addTag} disabled={isPending}>Add</Button>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="content" className="text-sm font-medium">Content (Markdown supported)</label>
            <Textarea 
              id="content" 
              value={content} 
              onChange={(e) => setContent(e.target.value)} 
              placeholder="Write your article content here... Paste images with Cmd+V"
              className="min-h-[60vh] font-mono text-sm resize-y"
              disabled={isPending}
            />
          </div>
        </div>
        
        {/* Right Sidebar: Media Uploads */}
        <div className="lg:col-span-1 hidden md:block">
           <MediaManager slug={slug} initialMedia={initialMedia} />
        </div>
      </div>
    </div>
  );
}
