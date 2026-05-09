import { getCurrentUser } from "@/lib/auth";
import { getUserArticles } from "@/lib/github";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { FileText, Pencil } from "lucide-react";
import { RebuildRegistryButton } from "@/components/rebuild-registry-button";
import { Button } from "@/components/ui/button";

export default async function MyArticlesPage() {
  const user = await getCurrentUser();
  if (!user) return redirect("/");

  const articles = await getUserArticles(user.email);

  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-6 space-y-12">
      <section className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Articles</h1>
            <p className="text-muted-foreground mt-2">A registry of the knowledge pages you've contributed to FlightDeck that have been published.</p>
          </div>
          {user.role === "admin" && <RebuildRegistryButton />}
        </div>

        {articles.length === 0 ? (
          <div className="text-center py-24 bg-muted/30 rounded-xl border border-dashed hover:border-border transition-colors">
            <p className="text-muted-foreground font-medium mb-4">You haven't published any articles yet.</p>
            <Button asChild variant="default">
              <Link href="/new-article?edit=true">Create your first article</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {articles.map((article) => (
              <div key={article.slug} className="group relative p-6 rounded-xl border bg-card shadow-sm flex flex-col gap-3 transition-colors hover:border-primary/50">
                <Link href={`/${article.slug}`} className="absolute inset-0 z-10">
                  <span className="sr-only">View {article.title}</span>
                </Link>
                
                <h3 className="text-lg font-semibold text-primary/90 group-hover:text-primary leading-tight">
                  {article.title}
                </h3>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-auto">
                  <span>Published {formatDistanceToNow(new Date(article.lastUpdated))} ago</span>
                </div>

                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                  <Button asChild size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary">
                    <Link href={`/${article.slug}?edit=true`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
