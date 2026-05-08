"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getArticleBySlug, saveArticle, Article } from "@/lib/api";

export default function EditArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (resolvedParams.slug !== "new") {
        const article = await getArticleBySlug(resolvedParams.slug);
        if (article) {
          setTitle(article.title);
          setContent(article.content);
        }
      }
      setLoading(false);
    }
    load();
  }, [resolvedParams.slug]);

  const handleSave = async () => {
    // Placeholder business logic execution
    await saveArticle(resolvedParams.slug, { title, content });
    router.push(`/${resolvedParams.slug}`);
  };

  if (loading) {
    return <div className="py-8">Loading editor...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Editing: {title || resolvedParams.slug}</h1>
        <div className="space-x-4">
          <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Article Title</label>
          <Input 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            placeholder="Enter article title..." 
            className="text-lg font-medium"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Content (Markdown supported)</label>
          <Textarea 
            value={content} 
            onChange={(e) => setContent(e.target.value)} 
            placeholder="Write your article content here..." 
            className="min-h-[500px] font-mono text-sm resize-y"
          />
        </div>
      </div>
    </div>
  );
}