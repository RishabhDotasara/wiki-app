import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { listPages, getPage } from '@/lib/github';
import { getCurrentUser, canEdit } from '@/lib/auth';
import { Pencil, Plus } from 'lucide-react';
import matter from 'gray-matter';
import { popularTags } from '@/lib/mock-data'; // Keeping tags static for UI demo

export default async function HomePage() {
  const user = await getCurrentUser();
  const isEditor = await canEdit(user);

  let pages: any[] = [];
  let errorMsg = null;

  try {
    const pagesMeta = await listPages();
    // Fetch top 10 for recent parsing
    pages = await Promise.all(
      pagesMeta.slice(0, 10).map(async (p) => {
        try {
          const fullPage = await getPage(p.slug);
          const parsed = matter(fullPage.body || "");
          return { 
            ...p, 
            frontmatter: parsed.data || {}, 
            excerpt: parsed.content.replace(/^#+ .*\n+/m, '').substring(0, 120) + '...' 
          };
        } catch (e) {
          return { ...p, frontmatter: {}, excerpt: "Could not load preview." };
        }
      })
    );
  } catch (err: any) {
    errorMsg = err.message || "Failed to load from GitHub.";
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome to InstiWiki</h1>
          <p className="text-muted-foreground mt-2">Your centralized source for institutional knowledge and documentation.</p>
        </div>
        
        {isEditor && (
          <Button asChild>
            <Link href="/new-article?edit=true">
              <Plus className="h-4 w-4 mr-2" />
              New Article
            </Link>
          </Button>
        )}
      </div>

      {errorMsg ? (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="p-6">
            <h3 className="font-semibold text-destructive">GitHub API Error</h3>
            <p className="text-sm mt-2">{errorMsg}</p>
            <p className="text-xs mt-2 opacity-80">Make sure your GitHub token in 'lib/github.ts' is valid and has read/write permissions.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          <div className="md:col-span-3 space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Recent Articles</h2>
            
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
          
          <div className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Popular Tags</h2>
            <Card className="shadow-sm">
              <CardContent className="p-4 flex flex-wrap gap-2">
                 {popularTags.map(tag => (
                   <Badge key={tag.name} variant="outline" className="cursor-pointer hover:bg-muted font-normal">
                     {tag.name} <span className="ml-1.5 text-xs text-muted-foreground">{tag.count}</span>
                   </Badge>
                 ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
