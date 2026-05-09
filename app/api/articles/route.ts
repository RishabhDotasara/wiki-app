import { NextRequest, NextResponse } from "next/server";
import matter from "gray-matter";
import { validateApiKey } from "@/lib/api-keys";

/**
 * Webhook endpoint for external apps to create/update articles.
 *
 * POST /api/articles
 *
 * Headers:
 *   x-api-key: <USER_API_KEY from Developer Settings>
 *
 * Body (JSON):
 *   {
 *     "title": "My Article Title",
 *     "content": "Markdown content here...",
 *     "tags": ["Guide", "Engineering"],
 *     "author": { "name": "Bot Name", "email": "bot@example.com" },
 *     "slug": "optional-existing-slug-to-update",
 *     "updateMessage": "Optional: what changed"
 *   }
 *
 * Returns:
 *   { "success": true, "slug": "my-article-title-a1b2", "url": "/my-article-title-a1b2" }
 */

function unauthorized() {
  return NextResponse.json(
    { error: "Unauthorized. Provide a valid x-api-key header." },
    { status: 401 }
  );
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(req: NextRequest) {
  // --- Parse body ---
  let body: any;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const { title, content, tags, author, slug: existingSlug, updateMessage } = body;

  // --- Auth: validate per-user API key ---
  const apiKey = req.headers.get("x-api-key");
  if (!author?.email || !apiKey || !validateApiKey(apiKey, author.email)) {
    return unauthorized();
  }

  if (!title || typeof title !== "string") {
    return badRequest("Missing or invalid 'title' (string required).");
  }
  if (!content || typeof content !== "string") {
    return badRequest("Missing or invalid 'content' (string required).");
  }
  if (!author || !author.name || !author.email) {
    return badRequest("Missing 'author' object with 'name' and 'email'.");
  }

  const safeTags = Array.isArray(tags) ? tags : [];

  // --- Build frontmatter & content ---
  const {
    upsertPage,
    slugify,
    getPage,
    updateRegistryEntry,
  } = await import("@/lib/github");

  const slug = existingSlug || slugify(title);
  const now = new Date().toISOString();
  const dateOnly = now.split("T")[0];

  // Load existing data if updating
  let contributors: { name: string; email: string; date: string }[] = [];
  let updates: { name: string; email: string; date: string; message: string }[] = [];

  if (existingSlug) {
    try {
      const existing = await getPage(existingSlug);
      const parsed = matter(existing.body);
      if (Array.isArray(parsed.data.contributors)) {
        contributors = parsed.data.contributors;
      }
      if (Array.isArray(parsed.data.updates)) {
        updates = parsed.data.updates;
      }
    } catch {
      // New article or not found — start fresh
    }
  }

  // Update contributors list
  const existingIdx = contributors.findIndex((c) => c.email === author.email);
  if (existingIdx !== -1) {
    contributors[existingIdx].date = dateOnly;
  } else {
    contributors.push({ name: author.name, email: author.email, date: dateOnly });
  }

  // Record the update
  updates.push({
    name: author.name,
    email: author.email,
    date: now,
    message: updateMessage || (existingSlug ? "Updated via API" : "Created via API"),
  });

  // Build the markdown file with frontmatter
  const fileContent = matter.stringify("\n" + content, {
    title,
    contributors,
    updates: updates.slice(-50),
    date: dateOnly,
    tags: safeTags,
  });

  try {
    const result = await upsertPage(title, fileContent, author.name, undefined, slug);

    // Update the global registry
    await updateRegistryEntry(result.slug, {
      title,
      tags: safeTags,
      lastUpdated: now,
    });

    return NextResponse.json(
      {
        success: true,
        slug: result.slug,
        url: `/${result.slug}`,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[Webhook] Failed to create article:", err);
    return NextResponse.json(
      { error: "Failed to create article.", details: err.message },
      { status: 500 }
    );
  }
}
