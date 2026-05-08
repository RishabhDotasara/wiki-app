import { notFound } from "next/navigation";
import Link from "next/link";
import { getPage } from "@/lib/github";
import { extractHeadings, MarkdownRenderer } from "@/components/markdown-renderer";
import { TableOfContents } from "@/components/toc";
import { ArticleEditor } from "@/components/article-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, Pencil } from "lucide-react";
import { getCurrentUser, canEdit } from "@/lib/auth";
import matter from "gray-matter";

export default async function ArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ edit?: string }>;
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
      const [page, mediaFiles] = await Promise.all([
        getPage(p.slug),
        (await import("@/lib/github")).listMediaFiles(p.slug)
      ]);
      rawMarkdown = page.body;
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
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">{displayTitle}</h1>
            {isEditor && (
              <Button asChild variant="outline" size="sm" className="h-8 shadow-sm">
                <Link href={`/${p.slug}?edit=true`}>
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  Edit
                </Link>
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <span>Last updated on {frontmatter.date || "Unknown"}</span>
            {frontmatter.author && <span>by {frontmatter.author}</span>}
            <div className="flex gap-2">
              {(frontmatter.tags || []).map((tag: string) => (
                <Badge key={tag} variant="secondary" className="px-1.5 py-0 text-xs font-normal">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <Separator />

        {/* Real Markdown Rendering */}
        <MarkdownRenderer content={contentBody} />
      </div>

      {/* Right Sidebar - Dynamic TOC */}
      <div className="hidden md:block w-[240px] shrink-0 sticky top-[80px]">
        <TableOfContents headings={headings.filter(h => h.level <= 3)} />
      </div>
    </div>
  );
}