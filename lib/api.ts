export interface Article {
  slug: string;
  title: string;
  content: string;
  tags: string[];
  lastModified: string;
}

// Placeholder functions for business logic

export async function getRecentArticles(): Promise<Article[]> {
  // TODO: Implement actual database fetching here
  return [
    {
      slug: "getting-started",
      title: "Getting Started",
      content: "Welcome to the wiki. This is a minimal and clean knowledge base.\n\nHere you can find all the information you need.",
      tags: ["Guide", "Welcome"],
      lastModified: "2026-05-08",
    },
    {
      slug: "design-system",
      title: "Design System",
      content: "We use Shadcn UI and Tailwind CSS for a modern, minimal look.",
      tags: ["Design", "UI"],
      lastModified: "2026-05-07",
    },
    {
      slug: "deployment",
      title: "Deployment Guide",
      content: "Learn how to deploy your Next.js application to Vercel.",
      tags: ["DevOps", "Guide"],
      lastModified: "2026-05-05",
    },
  ];
}

export async function getTags(): Promise<string[]> {
  // TODO: Fetch distinct tags from database
  return ["Guide", "Welcome", "Design", "UI", "DevOps", "Engineering", "HR"];
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  // TODO: Fetch single article from DB
  const articles = await getRecentArticles();
  return articles.find(a => a.slug === slug) || null;
}

export async function saveArticle(slug: string, data: Partial<Article>): Promise<boolean> {
  // TODO: Implement actual db save/update
  console.log(`Saving article ${slug} with data:`, data);
  return true;
}

export async function searchArticles(query: string): Promise<Article[]> {
  // TODO: Implement actual search logc
  const articles = await getRecentArticles();
  if (!query) return articles;
  return articles.filter(a => a.title.toLowerCase().includes(query.toLowerCase()));
}
