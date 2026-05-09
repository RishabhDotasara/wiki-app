#!/usr/bin/env tsx
/**
 * rebuild-user-registry.ts
 *
 * Standalone script to rebuild ALL user-article registry files.
 * Scans every article in the wiki, reads its frontmatter, and
 * maps contributor emails → articles, writing per-user JSON
 * files to `user-registries/` in the GitHub repo.
 *
 * Usage:
 *   npx tsx scripts/rebuild-user-registry.ts
 *
 * Requires GITHUB_PAT in .env.local (loaded via dotenv).
 */

import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local from the project root
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// ─── Config ──────────────────────────────────────────────────────────────────

const OWNER = "RishabhDotasara";
const REPO = "insti-wiki";
const BRANCH = "main";
const CONTENT_DIR = "wiki";
const TOKEN = process.env.GITHUB_PAT!;

if (!TOKEN) {
  console.error("❌ GITHUB_PAT not found. Make sure .env.local exists with a valid token.");
  process.exit(1);
}

const BASE = `https://api.github.com/repos/${OWNER}/${REPO}`;

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${TOKEN}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

// ─── GitHub helpers ──────────────────────────────────────────────────────────

async function ghFetch<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(url, { ...opts, headers: { ...headers(), ...(opts.headers as any) } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub ${res.status}: ${text}`);
  }
  if (res.status === 204) return null as unknown as T;
  return res.json() as Promise<T>;
}

interface FileItem {
  type: string;
  name: string;
  path: string;
  sha: string;
  download_url: string;
}

interface FileContent {
  content: string;
  sha: string;
}

interface UserArticleEntry {
  slug: string;
  title: string;
  lastUpdated: string;
}

function fromBase64(b64: string): string {
  return Buffer.from(b64, "base64").toString("utf8");
}

function toBase64(str: string): string {
  return Buffer.from(str, "utf8").toString("base64");
}

function userRegistryPath(email: string): string {
  return `user-registries/${email.replace(/[^a-zA-Z0-9]/g, "_")}.json`;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔍 Listing all wiki articles...");

  // 1. List all markdown files in the wiki content directory
  const items = await ghFetch<FileItem[]>(`${BASE}/contents/${CONTENT_DIR}`);
  const mdFiles = items.filter((f) => f.type === "file" && f.name.endsWith(".md"));

  console.log(`   Found ${mdFiles.length} articles.\n`);

  // 2. Build the user → articles map
  const userMap: Record<string, UserArticleEntry[]> = {};
  let processed = 0;
  let skipped = 0;

  for (const file of mdFiles) {
    const slug = file.name.replace(/\.md$/, "");
    process.stdout.write(`   [${++processed}/${mdFiles.length}] ${slug}...`);

    try {
      const data = await ghFetch<FileContent>(`${BASE}/contents/${CONTENT_DIR}/${file.name}?ref=${BRANCH}`);
      const raw = fromBase64(data.content.replace(/\n/g, ""));
      const parsed = matter(raw);

      const title = parsed.data.title || slug.replace(/-/g, " ");
      const lastUpdated = parsed.data.date || new Date().toISOString();

      // Extract emails from contributors array (current format)
      const contributors = parsed.data.contributors;
      let foundEmails = 0;

      if (Array.isArray(contributors)) {
        for (const c of contributors) {
          if (c.email) {
            if (!userMap[c.email]) userMap[c.email] = [];
            // Deduplicate by slug
            if (!userMap[c.email].some((a) => a.slug === slug)) {
              userMap[c.email].push({ slug, title, lastUpdated });
            }
            foundEmails++;
          }
        }
      }

      // Legacy fallback: single authorEmail
      if (foundEmails === 0 && parsed.data.authorEmail) {
        const email = parsed.data.authorEmail;
        if (!userMap[email]) userMap[email] = [];
        if (!userMap[email].some((a) => a.slug === slug)) {
          userMap[email].push({ slug, title, lastUpdated });
        }
        foundEmails++;
      }

      // Also check the updates array for additional contributors
      if (Array.isArray(parsed.data.updates)) {
        for (const u of parsed.data.updates) {
          if (u.email) {
            if (!userMap[u.email]) userMap[u.email] = [];
            if (!userMap[u.email].some((a) => a.slug === slug)) {
              userMap[u.email].push({ slug, title, lastUpdated });
            }
          }
        }
      }

      console.log(` ✓ (${foundEmails} contributor${foundEmails !== 1 ? "s" : ""})`);
    } catch (err: any) {
      console.log(` ✗ skipped (${err.message.slice(0, 60)})`);
      skipped++;
    }
  }

  // 3. Summary
  const emails = Object.keys(userMap);
  console.log(`\n📊 Summary:`);
  console.log(`   Articles processed: ${processed - skipped}/${mdFiles.length}`);
  console.log(`   Unique users found: ${emails.length}`);
  for (const email of emails) {
    console.log(`     • ${email}: ${userMap[email].length} article(s)`);
  }

  // 4. Write per-user registry files
  console.log(`\n📝 Writing user registry files to GitHub...\n`);

  for (const email of emails) {
    const regPath = userRegistryPath(email);
    const articles = userMap[email];

    process.stdout.write(`   ${email} (${articles.length} articles)...`);

    // Check if the file already exists (need SHA to update)
    let sha: string | undefined;
    try {
      const existing = await ghFetch<FileContent>(`${BASE}/contents/${regPath}`);
      sha = existing.sha;
    } catch {
      // File doesn't exist yet — will create
    }

    await ghFetch(`${BASE}/contents/${regPath}`, {
      method: "PUT",
      body: JSON.stringify({
        message: `user-registry: rebuild for ${email}`,
        content: toBase64(JSON.stringify(articles, null, 2)),
        sha,
        branch: BRANCH,
      }),
    });

    console.log(" ✓");
  }

  console.log(`\n✅ Done! All ${emails.length} user registries have been rebuilt.`);
}

main().catch((err) => {
  console.error("\n❌ Fatal error:", err);
  process.exit(1);
});
