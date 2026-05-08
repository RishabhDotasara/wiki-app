import { getRegistry } from "@/lib/github";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChevronRight, Folder, FileText, Home, RefreshCcw } from "lucide-react";
import { RebuildRegistryButton } from "@/components/rebuild-button";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const user = await getCurrentUser();
  const { tag: activeTag } = await searchParams;
  const registry = await getRegistry();
  
  // Convert registry map to array for processing
  const allPages = Object.entries(registry.articles).map(([slug, data]) => ({
    slug,
    ...data
  }));

  // 1. Get all unique tags and decompose them into hierarchy
  const tagMap = new Set<string>();
  allPages.forEach(p => p.tags.forEach(t => tagMap.add(t)));

  const activeTagParts = activeTag ? activeTag.split('/') : [];
  
  async function actionRebuild() {
    "use server";
    const { rebuildRegistry } = await import("@/lib/github");
    await rebuildRegistry();
    redirect("/explore");
  }

  // 2. Filter matching pages
  const filteredPages = activeTag 
    ? allPages.filter(p => p.tags.some(t => t === activeTag || t.startsWith(activeTag + '/')))
    : [];

  // 3. Find sub-tags at the current level
  const subTags = Array.from(tagMap).filter(t => {
    if (!activeTag) {
        // Top level: tags without a slash
        return !t.includes('/');
    }
    // Sub-level: tags that start with activeTag/ and have exactly one more part
    if (t.startsWith(activeTag + '/')) {
        const remaining = t.substring(activeTag.length + 1);
        return !remaining.includes('/');
    }
    return false;
  }).map(t => ({
    full: t,
    name: t.split('/').pop() || t
  }));

  return (
    <div className="w-full max-w-5xl mx-auto py-12 px-6 space-y-8">
      {/* Search Header / Breadcrumbs */}
      <div className="flex items-center justify-between">
        <div className="space-y-4 flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Tag Explorer</h1>
          <nav className="flex items-center text-sm font-medium text-muted-foreground bg-muted/30 p-3 rounded-lg border">
            <Link href="/explore" className="hover:text-primary flex items-center gap-1 transition-colors">
              <Home className="h-4 w-4" /> Root
            </Link>
            {activeTagParts.map((part, i) => {
              const partialTag = activeTagParts.slice(0, i + 1).join('/');
              return (
                <div key={partialTag} className="flex items-center">
                  <ChevronRight className="h-4 w-4 mx-2 opacity-40" />
                  <Link href={`/explore?tag=${encodeURIComponent(partialTag)}`} className="hover:text-primary transition-colors">
                    {part}
                  </Link>
                </div>
              );
            })}
          </nav>
        </div>

        {user?.role === "admin" && (
           <form action={actionRebuild} className="ml-4">
              <Button variant="outline" size="sm" className="gap-2 text-muted-foreground">
                <RefreshCcw className="h-3 w-3" /> Rebuild Index
              </Button>
           </form>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Left: Sub-tag Navigation */}
        <aside className="md:col-span-1 space-y-6">
          <div className="space-y-3">
             <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
               <Folder className="h-4 w-4" /> Subcategories
             </h2>
             {subTags.length === 0 ? (
               <p className="text-sm text-muted-foreground italic">No further subcategories.</p>
             ) : (
               <div className="flex flex-col gap-1">
                 {subTags.map(st => (
                   <Link 
                     key={st.full} 
                     href={`/explore?tag=${encodeURIComponent(st.full)}`}
                     className="px-3 py-2 rounded-md hover:bg-primary/10 hover:text-primary transition-all text-sm font-medium flex items-center justify-between group"
                   >
                     {st.name}
                     <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                   </Link>
                 ))}
               </div>
             )}
          </div>
        </aside>

        {/* Right: Articles List */}
        <main className="md:col-span-3 space-y-6">
           <div className="flex items-center justify-between border-b pb-4">
               <h2 className="text-xl font-semibold">
                {activeTag ? `Articles in "${activeTagParts[activeTagParts.length-1]}"` : "Recent Documentation"}
              </h2>
              <Badge variant="secondary" className="px-2">{filteredPages.length} Items</Badge>
           </div>

           {filteredPages.length === 0 ? (
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
           ) : (
             <div className="grid gap-4">
               {filteredPages.map(page => (
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
        </main>
      </div>
    </div>
  );
}
