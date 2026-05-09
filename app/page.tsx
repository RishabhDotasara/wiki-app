import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { listPages, getPage } from '@/lib/github';
import { getCurrentUser, canEdit } from '@/lib/auth';
import { Pencil, Plus, RefreshCcw } from 'lucide-react';
import { revalidatePath } from 'next/cache';
import { RebuildRegistryButton } from '@/components/rebuild-button';
import matter from 'gray-matter';
import { popularTags } from '@/lib/mock-data'; // Keeping tags static for UI demo

export default async function HomePage() {
  const user = await getCurrentUser();
  const isEditor = await canEdit(user);

  let pages: any[] = [];
  let popularTags: { name: string, count: number }[] = [];
  let errorMsg = null;

  try {
    const { getRegistry } = await import('@/lib/github');
    const registry = await getRegistry();
    
    // Filter for articles tagged with "Guide"
    pages = Object.entries(registry.articles)
      .map(([slug, data]) => ({ slug, frontmatter: data }))
      .filter(art => art.frontmatter.tags.some(t => {
        const lower = t.toLowerCase();
        return lower === "guide" || lower.endsWith("/guide");
      }))
      .sort((a, b) => new Date(b.frontmatter.lastUpdated).getTime() - new Date(a.frontmatter.lastUpdated).getTime())
      .slice(0, 10);

    // Dynamic Popular Tags from Registry
    const tagCounts: Record<string, number> = {};
    Object.values(registry.articles).forEach(art => {
      art.tags.forEach(t => {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
    });

    popularTags = Object.entries(tagCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

  } catch (err: any) {
    errorMsg = err.message || "Failed to load from GitHub.";
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome to FlightDeck</h1>
          <p className="text-muted-foreground mt-2">Your centralized source for institutional knowledge and documentation.</p>
        </div>
      </div>

      {errorMsg ? (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="p-6">
            <h3 className="font-semibold text-destructive">GitHub API Error</h3>
            <p className="text-sm mt-2">{errorMsg}</p>
          </CardContent>
        </Card>
      ) : pages.length === 0 ? (
        <div className="text-center py-24 bg-muted/20 border border-dashed rounded-2xl">
           <h2 className="text-xl font-semibold mb-2">Wiki Registry Not Initialized</h2>
           <p className="text-muted-foreground mb-6 max-w-md mx-auto">
             It looks like the new scalable index hasn't been created yet. 
             Click below to scan your repository and initialize the Wiki registry.
           </p>
           <form action={async () => {
             "use server";
             const { rebuildRegistry } = await import("@/lib/github");
             await rebuildRegistry();
             revalidatePath("/");
           }}>
             <RebuildRegistryButton />
           </form>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Essential Guides</h2>
          
          {pages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No articles found in the repository.</p>
          ) : (
            <div className="grid gap-4">
              {pages.map(article => (
                <Card key={article.slug} className="cursor-pointer hover:bg-muted/50 transition-colors shadow-sm group">
                  <Link href={`/${article.slug}`} className="block">
                    <CardHeader className="py-4">
                      <div className="flex items-center justify-between gap-4 mb-1">
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">{article.frontmatter.title || article.title}</CardTitle>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{article.frontmatter.date || "Unknown Date"}</span>
                      </div>
                      <CardDescription>{article.excerpt}</CardDescription>
                    </CardHeader>
                    <CardContent className="py-4 pt-0">
                      <div className="flex flex-wrap gap-2">
                         {(article.frontmatter.tags || []).map((tag: string) => (
                           <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0 font-normal">{tag}</Badge>
                         ))}
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
