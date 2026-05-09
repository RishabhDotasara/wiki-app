import { NextRequest, NextResponse } from "next/server";
import { getPage } from "@/lib/github";
import { validateArticleRelevance } from "@/lib/groq";
import matter from "gray-matter";

/**
 * POST /api/validate-article
 *
 * Validates that:
 *  1. The article slug exists in the wiki
 *  2. The article content is semantically relevant to the ask (via Groq AI)
 *
 * Body: { askTitle, askDescription, articleSlug }
 * Returns: { valid, exists, articleTitle, reason }
 */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { askTitle, askDescription, articleSlug } = body;

  if (!askTitle || !articleSlug) {
    return NextResponse.json(
      { error: "Missing askTitle or articleSlug." },
      { status: 400 }
    );
  }

  // Step 1: Check if article exists
  let articleContent = "";
  let articleTitle = "";

  try {
    const page = await getPage(articleSlug);
    const parsed = matter(page.body);
    articleTitle = parsed.data.title || articleSlug.replace(/-/g, " ");
    articleContent = parsed.content;
  } catch (err: any) {
    if (err.message?.includes("404")) {
      return NextResponse.json({
        valid: false,
        exists: false,
        articleTitle: "",
        reason: "Article not found. Check the slug and try again.",
      });
    }
    return NextResponse.json(
      { error: "Failed to fetch article.", details: err.message },
      { status: 500 }
    );
  }

  // Step 2: AI semantic validation via Groq
  const { relevant, reason } = await validateArticleRelevance(
    askTitle,
    askDescription || "",
    articleTitle,
    articleContent
  );

  return NextResponse.json({
    valid: relevant,
    exists: true,
    articleTitle,
    reason,
  });
}
