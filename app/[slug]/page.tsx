import { notFound } from "next/navigation";
import Link from "next/link";
import { getPage } from "@/lib/github";
import { extractHeadings, MarkdownRenderer } from "@/components/markdown-renderer";
import { TableOfContents } from "@/components/toc";
import { ArticleEditor } from "@/components/article-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, Pencil, Clock, History } from "lucide-react";
import { getCurrentUser, canEdit } from "@/lib/auth";
import matter from "gray-matter";

export default async function ArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ edit?: string; branch?: string; notifId?: string }>;
}) {
  const p = await params;
  const sp = await searchParams;
  
  const user = await getCurrentUser();
  const isEditor = await canEdit(user);
  const isEditing = sp.edit === "true" && isEditor; // Only allow editing if authorized

  let rawMarkdown = "";
  let frontmatter: any = {};
  let contentBody = "";
  let initialMedia: any[] = [];

  if (p.slug !== "new-article") {
    try {
      let overrideContent = null;
      if (sp.notifId && user?.email && isEditor) {
        const notifications = await (await import("@/lib/github")).getUserNotifications(user.email);
        const notif = notifications.find((n: any) => n.id === sp.notifId);
        if (notif && notif.proposedContent) {
          overrideContent = notif.proposedContent;
        }
      }

      const [mediaFiles, page] = await Promise.all([
        (await import("@/lib/github")).listMediaFiles(p.slug),
        overrideContent ? Promise.resolve(null) : getPage(p.slug, sp.branch)
      ]);
      
      rawMarkdown = overrideContent || (page ? page.body : "");
      const parsed = matter(rawMarkdown);
      frontmatter = parsed.data;
      contentBody = parsed.content;
      initialMedia = mediaFiles;
    } catch (e: any) {
      if (e.message?.includes("404")) {
         // Proceed to allow creating if it's an editor
         if (!isEditor) notFound();
      } else {
         throw e; // Crash with Error UI for token issues
      }
    }
  }

  // If in edit mode, show the inline editor
  if (isEditing) {
    return (
      <ArticleEditor 
        initialTitle={frontmatter.title || p.slug.split('-').join(' ')} 
        initialContent={contentBody} 
        initialTags={Array.isArray(frontmatter.tags) ? frontmatter.tags : []}
        slug={p.slug}
        initialMedia={initialMedia} 
      />
    );
  }

  if (!contentBody && p.slug !== "new-article") {
    return (
       <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
         <h1 className="text-2xl font-bold">Article not found</h1>
         <p className="text-muted-foreground">The page {p.slug} does not exist in the repository.</p>
         {isEditor && (
            <Button asChild>
              <Link href={`/${p.slug}?edit=true`}>Create this page</Link>
            </Button>
         )}
       </div>
    );
  }

  const headings = extractHeadings(contentBody);
  const displayTitle = frontmatter.title || p.slug;

  return (
    <div className="flex flex-col gap-8 md:flex-row md:items-start md:gap-12">
      <div className="flex-1 w-full min-w-0 space-y-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center text-sm font-medium text-muted-foreground whitespace-nowrap overflow-x-auto">
          <Link href="/" className="hover:text-foreground transition-colors shrink-0">Home</Link>
          <ChevronRight className="mx-2 h-4 w-4 shrink-0" />
          <span className="text-foreground truncate">{displayTitle}</span>
        </nav>

        {/* Article Header */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl break-words leading-tight flex-1 min-w-0">
              {displayTitle}
            </h1>
            {isEditor && (
              <Button asChild variant="outline" size="sm" className="h-8 shadow-sm">
                <Link href={`/${p.slug}?edit=true`}>
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  Edit
                </Link>
              </Button>
            )}
          </div>
          
          {(() => {
            // Build contributors list supporting both old and new format
            let contributors: { name: string; email?: string; date?: string }[] = [];
            if (Array.isArray(frontmatter.contributors)) {
              contributors = frontmatter.contributors;
            } else if (frontmatter.author) {
              contributors = [{ name: frontmatter.author, email: frontmatter.authorEmail, date: frontmatter.date }];
            }
            
            // Build updates list
            const updates = Array.isArray(frontmatter.updates) ? frontmatter.updates : [];
            const latestUpdate = updates.length > 0 ? updates[updates.length - 1] : null;
            const latestContributor = contributors.length > 0 ? contributors[contributors.length - 1] : null;
            
            return (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-4 mt-4 text-xs sm:text-sm text-muted-foreground">
                  <span className="shrink-0 text-primary uppercase font-bold tracking-widest text-[10px]">Documentation</span>
                  <span className="opacity-40">•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Last updated {frontmatter.date || "recently"}
                  </span>
                  {latestContributor && (
                    <>
                      <span className="opacity-40">•</span>
                      <span className="truncate max-w-[200px]">
                        By {latestContributor.name}
                        {contributors.length > 1 && (
                          <span className="text-muted-foreground/60"> + {contributors.length - 1} other{contributors.length - 1 > 1 ? "s" : ""}</span>
                        )}
                      </span>
                    </>
                  )}
                  <div className="flex gap-2">
                    {(frontmatter.tags || []).map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="px-1.5 py-0 text-xs font-normal">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Revision History details */}
                {(updates.length > 0 || contributors.length > 1) && (
                  <details className="group">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none flex items-center gap-1.5">
                      <History className="h-3 w-3" />
                      View revision history ({updates.length || contributors.length} updates)
                    </summary>
                    <div className="mt-3 pl-3 border-l-2 border-muted space-y-4 py-1">
                      {updates.length > 0 ? (
                        // Render full updates list
                        [...updates].reverse().map((u: any, i: number) => (
                          <div key={i} className="relative pl-4">
                             <div className="absolute left-[-17px] top-1.5 h-2 w-2 rounded-full bg-muted border-2 border-background" />
                             <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-foreground/90 text-[13px]">{u.name}</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {u.date ? new Date(u.date).toLocaleString(undefined, { 
                                      dateStyle: 'medium', 
                                      timeStyle: 'short' 
                                    }) : "unknown date"}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed italic">
                                  "{u.message || (i === updates.length - 1 ? "Created article" : "Updated article")}"
                                </p>
                             </div>
                          </div>
                        ))
                      ) : (
                        // Fallback to legacy contributors list
                        contributors.map((c: any, i: number) => (
                          <div key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                            <span className="font-medium text-foreground/80">{c.name}</span>
                            {c.date && <span className="opacity-50">· {c.date}</span>}
                          </div>
                        ))
                      )}
                    </div>
                  </details>
                )}
              </div>
            );
          })()}
        </div>

        <Separator />

        {/* Real Markdown Rendering */}
        <MarkdownRenderer content={contentBody} />
      </div>

      {/* Right Sidebar - Dynamic TOC */}
      <div className="hidden md:block w-[240px] shrink-0 sticky top-[80px]">
        <TableOfContents headings={headings.filter(h => h.level <= 2)} />
      </div>
    </div>
  );
}