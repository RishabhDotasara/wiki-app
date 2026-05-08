"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Search, Folder } from "lucide-react";
import { Input } from "@/components/ui/input";

export function ExploreClient({ articles, activeTag, activeTagParts }: { 
  articles: any[], 
  activeTag?: string,
  activeTagParts: string[] 
}) {
  const [search, setSearch] = useState("");

  const filtered = articles.filter(a => 
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    (a.tags && a.tags.some((t: string) => t.toLowerCase().includes(search.toLowerCase())))
  );

  if (articles.length === 0) {
    return (
      <div className="text-center py-32 bg-muted/5 rounded-2xl border border-dashed border-muted-foreground/10 flex flex-col items-center justify-center">
        <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center mb-6">
          <Folder className="h-8 w-8 text-primary/40" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          {activeTag ? "No articles found" : "Explore by Category"}
        </h3>
        <p className="text-sm text-muted-foreground max-w-[280px] mx-auto">
          {activeTag 
            ? `We couldn't find any articles tagged under "${activeTagParts[activeTagParts.length-1]}".` 
            : "Select a subcategory from the left to browse the knowledge base curated for that topic."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder={`Search ${articles.length} articles in this category...`}
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
           <p className="text-muted-foreground italic">No results matching "{search}"</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(page => (
            <Link key={page.slug} href={`/${page.slug}`}>
               <Card className="hover:border-primary/40 transition-colors shadow-sm group">
                 <CardHeader className="py-4">
                   <div className="flex items-center justify-between">
                     <CardTitle className="text-lg group-hover:text-primary transition-colors">{page.title}</CardTitle>
                     <Badge variant="outline" className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">Article</Badge>
                   </div>
                   <CardDescription className="line-clamp-2">Tagged with {page.tags.join(', ')}</CardDescription>
                 </CardHeader>
               </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
