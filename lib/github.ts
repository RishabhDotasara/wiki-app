/**
 * githubDB.ts
 * GitHub as a Database — utility functions for a wiki app
 *
 * Uses the GitHub Contents API to read/write Markdown files
 * in a repository, treating each file as a "wiki page" (record).
 *
 * Setup:
 *   1. Create a GitHub repo (can be private).
 *   2. Generate a Personal Access Token (PAT) with `repo` scope.
 *   3. Fill in the CONFIG object below (or pass via environment variables).
 */

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface GitHubConfig {
  owner: string;
  repo: string;
  branch: string;
  token: string;
  contentDir: string;
}

/** Lightweight metadata returned by listPages() — no body content. */
export interface PageMeta {
  slug: string;
  title: string;
  path: string;
  sha: string;
  size: number;
  htmlUrl: string;
  downloadUrl: string;
}

/** Full page including Markdown body, returned by getPage(). */
export interface Page {
  slug: string;
  title: string;
  body: string;
  sha: string;
  htmlUrl: string;
}

/** Minimal result returned by write operations (create / update / upsert). */
export interface WriteResult {
  slug: string;
  sha: string;
  htmlUrl: string;
}

/** A single entry in a page's commit history. */
export interface CommitRecord {
  sha: string;
  message: string;
  author: string;
  date: string;
  htmlUrl: string;
}

/** A historical snapshot of a page at a specific commit. */
export interface PageSnapshot {
  slug: string;
  body: string;
  commitSha: string;
}

/** A search result with a short body excerpt. */
export interface SearchResult {
  slug: string;
  title: string;
  excerpt: string;
}

// Raw shapes returned by the GitHub Contents API (subset we actually use).
interface GitHubFileItem {
  type: string;
  name: string;
  path: string;
  sha: string;
  size: number;
  html_url: string;
  download_url: string;
}

interface GitHubFileContent {
  content: string;
  sha: string;
  html_url: string;
}

interface GitHubWriteResponse {
  content: {
    sha: string;
    html_url: string;
  };
}

interface GitHubCommit {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
}

interface GitHubErrorBody {
  message?: string;
}

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const CONFIG: GitHubConfig = {
  owner: "RishabhDotasara",        // e.g. "acme-corp"
  repo: "insti-wiki",              // e.g. "institute-wiki"
  branch: "main",
  token: process.env.GITHUB_PAT!,  // ghp_xxxxxxxxxxxx
  contentDir: "wiki",                        // folder inside the repo
};

const BASE_URL = "https://api.github.com" as const;

// ─── INTERNAL HELPERS ────────────────────────────────────────────────────────

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${CONFIG.token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

/** Encode a string to Base64 — works in both browsers and Node. */
function toBase64(str: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str, "utf8").toString("base64");
  }
  return btoa(unescape(encodeURIComponent(str)));
}

/** Decode Base64 content returned by the GitHub API. */
function fromBase64(b64: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(b64, "base64").toString("utf8");
  }
  return decodeURIComponent(escape(atob(b64)));
}

/** Convert a human-readable title to a URL/filename-safe slug. */
export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)+/g, "");
  
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}-${suffix}`;
}

/** Build the repo-relative file path for a wiki page. */
function filePath(slug: string): string {
  return `${CONFIG.contentDir}/${slug}.md`;
}

/** Core fetch wrapper pointing to the root of the repo api space */
async function coreFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}/repos/${CONFIG.owner}/${CONFIG.repo}${endpoint}`;
  
  // Merge custom headers if any (for diff fetching)
  const mergedHeaders = { ...headers(), ...(options.headers as any) };
  
  console.log(`[GitHub API] ${options.method || 'GET'} ${url}`);
  
  const res = await fetch(url, { ...options, headers: mergedHeaders });

  if (!res.ok) {
    const text = await res.text();
    
    // Silence 404s for files that might not exist yet (like registry/notifications)
    // We KEEP the "404" string in the message because other functions (upsert/upload) use it to detect new files!
    if (res.status === 404) {
      throw new Error("GitHub API error 404: NOT_FOUND");
    }

    console.error(`[GitHub API Error] ${res.status}: ${text}`);
  }

  // Special case: Diff API returns raw text, not JSON
  if (mergedHeaders.Accept?.includes("diff")) {
    return res.text() as unknown as T;
  }

  // 204 No Content
  if (res.status === 204) return null as unknown as T;
  return res.json() as Promise<T>;
}

/** Legacy wrapper pointing specifically to /contents/ endpoints */
async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  return coreFetch<T>(`/contents/${path}`, options);
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

/**
 * List all wiki pages.
 * Returns metadata only — use getPage() to fetch the body of a specific page.
 */
export async function listPages(): Promise<PageMeta[]> {
  const items = await apiFetch<GitHubFileItem[]>(CONFIG.contentDir);

  return items
    .filter((item) => item.type === "file" && item.name.endsWith(".md"))
    .map((item) => ({
      slug: item.name.replace(/\.md$/, ""),
      title: item.name.replace(/\.md$/, "").replace(/-/g, " "),
      path: item.path,
      sha: item.sha,
      size: item.size,
      htmlUrl: item.html_url,
      downloadUrl: item.download_url,
    }));
}

/**
 * Enhanced listPages that also parses tags from frontmatter.
 * Useful for building the tag explorer.
 */
export async function listPagesWithTags(): Promise<(PageMeta & { tags: string[] })[]> {
  const meta = await listPages();
  const pages = await Promise.all(
    meta.map(async (p) => {
      try {
        const full = await getPage(p.slug);
        const { data } = (await import("gray-matter")).default(full.body);
        return { ...p, tags: data.tags || [] };
      } catch (e) {
        return { ...p, tags: [] };
      }
    })
  );
  return pages;
}

/**
 * Fetch a single wiki page by slug.
 * The `body` field contains the raw Markdown string.
 *
 * @param slug — e.g. "admissions-process"
 */
export async function getPage(slug: string, branch: string = CONFIG.branch): Promise<Page> {
  const data = await apiFetch<GitHubFileContent>(`${filePath(slug)}?ref=${branch}`);

  return {
    slug,
    title: slug.replace(/-/g, " "),
    body: fromBase64(data.content.replace(/\n/g, "")),
    sha: data.sha,
    htmlUrl: data.html_url,
  };
}

/**
 * Create a new wiki page.
 *
 * @param title  — Human-readable title (also used as the filename slug)
 * @param body   — Markdown content
 * @param author — Name used in the commit message (default: "wiki-app")
 */
export async function createPage(
  title: string,
  body: string,
  author: string = "wiki-app",
  targetBranch: string = CONFIG.branch,
  forcedSlug?: string
): Promise<WriteResult> {
  const slug = forcedSlug || slugify(title);
  const message = `docs: create page "${title}" via ${author}`;

  const data = await apiFetch<GitHubWriteResponse>(filePath(slug), {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: toBase64(body),
      branch: targetBranch,
    }),
  });

  return {
    slug,
    sha: data.content.sha,
    htmlUrl: data.content.html_url,
  };
}

/**
 * Update an existing wiki page.
 *
 * The `sha` of the current file version is required by the GitHub API to
 * prevent accidental overwrites — obtain it from getPage() or listPages().
 *
 * @param slug   — Page slug
 * @param body   — New Markdown content
 * @param sha    — Current file SHA
 * @param author — Name used in the commit message
 */
export async function updatePage(
  slug: string,
  body: string,
  sha: string,
  author: string = "wiki-app",
  targetBranch: string = CONFIG.branch
): Promise<WriteResult> {
  const title = slug.replace(/-/g, " ");
  const message = `docs: update page "${title}" via ${author}`;

  const data = await apiFetch<GitHubWriteResponse>(filePath(slug), {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: toBase64(body),
      sha,
      branch: targetBranch,
    }),
  });

  return {
    slug,
    sha: data.content.sha,
    htmlUrl: data.content.html_url,
  };
}

/**
 * Delete a wiki page.
 *
 * @param slug   — Page slug
 * @param sha    — Current file SHA
 * @param author — Name used in the commit message
 */
export async function deletePage(
  slug: string,
  sha: string,
  author: string = "wiki-app"
): Promise<true> {
  const title = slug.replace(/-/g, " ");
  const message = `docs: delete page "${title}" via ${author}`;

  await apiFetch<null>(filePath(slug), {
    method: "DELETE",
    body: JSON.stringify({ message, sha, branch: CONFIG.branch }),
  });

  return true;
}

/**
 * Create the page if it doesn't exist, otherwise update it.
 * Handles the SHA lookup automatically.
 *
 * @param title  — Human-readable title
 * @param body   — Markdown content
 * @param author — Name used in the commit message
 */
export async function upsertPage(
  title: string,
  body: string,
  author: string = "wiki-app",
  targetBranch: string = CONFIG.branch,
  forcedSlug?: string
): Promise<WriteResult> {
  const slug = forcedSlug || slugify(title);

  try {
    const existing = await getPage(slug);
    return await updatePage(slug, body, existing.sha, author, targetBranch);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("404")) {
      return await createPage(title, body, author, targetBranch, slug);
    }
    throw err;
  }
}

/**
 * Client-side full-text search across all pages.
 *
 * Fetches every page and filters by keyword in the title or body.
 * For large wikis (50+ pages) consider GitHub's Search API instead.
 *
 * @param keyword — Search term
 */
export async function searchPages(keyword: string): Promise<SearchResult[]> {
  const pages = await listPages();
  const kw = keyword.toLowerCase();
  const results: SearchResult[] = [];

  for (const meta of pages) {
    const page = await getPage(meta.slug);
    const inTitle = page.title.toLowerCase().includes(kw);
    const inBody = page.body.toLowerCase().includes(kw);

    if (inTitle || inBody) {
      const idx = page.body.toLowerCase().indexOf(kw);
      const start = Math.max(0, idx - 60);
      const end = Math.min(page.body.length, idx + 120);
      const excerpt =
        (start > 0 ? "…" : "") +
        page.body.slice(start, end) +
        (end < page.body.length ? "…" : "");

      results.push({ slug: page.slug, title: page.title, excerpt });
    }
  }

  return results;
}

/**
 * Fetch the commit history for a single page.
 *
 * @param slug    — Page slug
 * @param perPage — Number of commits to return (default: 10)
 */
export async function getPageHistory(
  slug: string,
  perPage: number = 10
): Promise<CommitRecord[]> {
  const url =
    `${BASE_URL}/repos/${CONFIG.owner}/${CONFIG.repo}/commits` +
    `?path=${filePath(slug)}&per_page=${perPage}&sha=${CONFIG.branch}`;

  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`GitHub API error ${res.status}`);

  const commits = (await res.json()) as GitHubCommit[];

  return commits.map((c) => ({
    sha: c.sha,
    message: c.commit.message,
    author: c.commit.author.name,
    date: c.commit.author.date,
    htmlUrl: c.html_url,
  }));
}

/**
 * Fetch a historical snapshot of a page at a specific commit.
 *
 * @param slug      — Page slug
 * @param commitSha — Commit SHA from getPageHistory()
 */
export async function getPageAtCommit(
  slug: string,
  commitSha: string
): Promise<PageSnapshot> {
  const url =
    `${BASE_URL}/repos/${CONFIG.owner}/${CONFIG.repo}/contents/` +
    `${filePath(slug)}?ref=${commitSha}`;

  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`GitHub API error ${res.status}`);

  const data = (await res.json()) as GitHubFileContent;

  return {
    slug,
    body: fromBase64(data.content.replace(/\n/g, "")),
    commitSha,
  };
}

// ─── RUNTIME CONFIGURATION ───────────────────────────────────────────────────

/**
 * Override config values at runtime.
 * Useful for loading the token from environment variables rather than
 * hardcoding it above.
 *
 * @example
 *   import { configure } from "./githubDB";
 *   configure({ token: import.meta.env.VITE_GITHUB_TOKEN });
 */
export function configure(overrides: Partial<GitHubConfig>): void {
  Object.assign(CONFIG, overrides);
}

/**
 * Upload a media file.
 */
export async function uploadMediaFile(
  slug: string,
  filename: string,
  base64Data: string,
  author: string = "wiki-app"
): Promise<{ downloadUrl: string; sha: string }> {
  const path = `${CONFIG.contentDir}/media/${slug}/${filename}`;
  const message = `docs: upload media "${filename}" for "${slug}" via ${author}`;

  // Using a try-catch for upsert. If it exists, we must provide SHA to overwrite.
  let targetSha: string | undefined = undefined;
  try {
    const existing = await apiFetch<GitHubFileContent>(path);
    targetSha = existing.sha;
  } catch (e: any) {
    if (!e.message.includes("404")) throw e;
  }

  const data = await apiFetch<GitHubWriteResponse>(path, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: base64Data,
      sha: targetSha,
      branch: CONFIG.branch,
    }),
  });

  return {
    downloadUrl: `https://raw.githubusercontent.com/${CONFIG.owner}/${CONFIG.repo}/${CONFIG.branch}/${path}`,
    sha: data.content.sha,
  };
}

/**
 * List media files for a specific article.
 */
export async function listMediaFiles(slug: string): Promise<{ name: string; url: string }[]> {
  const path = `${CONFIG.contentDir}/media/${slug}`;
  try {
    const items = await apiFetch<GitHubFileItem[]>(path);
    if (!Array.isArray(items)) return [];
    
    return items
      .filter((item) => item.type === "file")
      .map((item) => ({
        name: item.name,
        url: item.download_url,
      }));
  } catch (err: any) {
    if (err.message && err.message.includes("404")) {
      return []; 
    }
    throw err;
  }
}

// ─── PULL REQUEST & QUEUE ENGINE ──────────────────────────────────────────────

export interface PullRequest {
  id: number;
  number: number;
  state: string;
  title: string;
  body: string;
  html_url: string;
  created_at: string;
  user: { login: string; avatar_url: string };
  head: { ref: string; sha: string };
}

/** Get the latest SHA checksum of a branch (defaults to main) */
export async function getBranchSha(branch: string = CONFIG.branch): Promise<string> {
  const data = await coreFetch<{ object: { sha: string } }>(`/git/ref/heads/${branch}`);
  return data.object.sha;
}

/** Create a new branch pointing to a specific SHA parent */
export async function createBranch(branchName: string, sha: string): Promise<void> {
  await coreFetch(`/git/refs`, {
    method: "POST",
    body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha })
  });
}

/** Submit a Pull Request from head -> base */
export async function createPullRequest(title: string, headBranch: string, body: string, base: string = CONFIG.branch): Promise<PullRequest> {
  return coreFetch<PullRequest>(`/pulls`, {
    method: "POST",
    body: JSON.stringify({ title, head: headBranch, base, body })
  });
}

/** Fetch all PRs targeting our wiki */
export async function listPullRequests(state: "open" | "closed" | "all" = "open"): Promise<PullRequest[]> {
  return coreFetch<PullRequest[]>(`/pulls?state=${state}`);
}

/** Get a specific PR's metadata */
export async function getPullRequest(pullNumber: number): Promise<PullRequest> {
  return coreFetch<PullRequest>(`/pulls/${pullNumber}`);
}

/** Get the files changed in a PR */
export async function getPullRequestFiles(pullNumber: number): Promise<{ filename: string; raw_url: string }[]> {
  return coreFetch<{ filename: string; raw_url: string }[]>(`/pulls/${pullNumber}/files`);
}

/** Get the raw diff payload of a PR for the Red/Green viewer */
export async function getPullRequestDiff(pullNumber: number): Promise<string> {
  return coreFetch<string>(`/pulls/${pullNumber}`, {
    headers: { Accept: "application/vnd.github.diff" }
  });
}

/** Accept and merge a Pull Request */
export async function mergePullRequest(pullNumber: number, message: string): Promise<void> {
  await coreFetch(`/pulls/${pullNumber}/merge`, {
    method: "PUT",
    body: JSON.stringify({ commit_title: message })
  });
}

/** Reject and close a Pull Request without merging */
export async function closePullRequest(pullNumber: number): Promise<void> {
  await coreFetch(`/pulls/${pullNumber}`, {
    method: "PATCH",
    body: JSON.stringify({ state: "closed" })
  });
}

/** Post a moderation comment onto the PR thread */
export async function commentOnPullRequest(pullNumber: number, comment: string): Promise<void> {
  await coreFetch(`/issues/${pullNumber}/comments`, {
    method: "POST",
    body: JSON.stringify({ body: comment })
  });
}

// ─── NOTIFICATION SYSTEM ──────────────────────────────────────────────────────

export interface WikiNotification {
  id: string;
  status: 'approved' | 'rejected';
  articleTitle: string;
  comment?: string;
  timestamp: string;
  branchName?: string;
  slug?: string;
  proposedContent?: string;
}

function notifPath(email: string) {
  return `notifications/${email.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
}

/** Fetch notifications for a specific user */
export async function getUserNotifications(email: string): Promise<WikiNotification[]> {
  try {
    const res = await apiFetch<GitHubFileContent>(notifPath(email));
    return JSON.parse(fromBase64(res.content));
  } catch (e) {
    return [];
  }
}

/** Add a new notification to a user's file */
export async function addNotification(email: string, notification: WikiNotification): Promise<void> {
  const path = notifPath(email);
  const existing = await getUserNotifications(email);
  const updated = [notification, ...existing].slice(0, 20); // Keep last 20
  
  let sha;
  try {
    const res = await apiFetch<GitHubFileContent>(path);
    sha = res.sha;
  } catch (e) {}

  await apiFetch(path, {
    method: 'PUT',
    body: JSON.stringify({
      message: `notify: ${notification.status} for ${notification.articleTitle}`,
      content: toBase64(JSON.stringify(updated, null, 2)),
      sha,
      branch: CONFIG.branch
    })
  });
}

/** Remove a notification (Editor "Settle") */
export async function settleNotification(email: string, notifId: string): Promise<void> {
  const path = notifPath(email);
  const existing = await getUserNotifications(email);
  const updated = existing.filter(n => n.id !== notifId);
  
  const res = await apiFetch<GitHubFileContent>(path);
  
  await apiFetch(path, {
    method: 'PUT',
    body: JSON.stringify({
      message: `notify: settle ${notifId}`,
      content: toBase64(JSON.stringify(updated, null, 2)),
      sha: res.sha,
      branch: CONFIG.branch
    })
  });
}

// ─── REGISTRY SYSTEM (SCALABILITY) ───────────────────────────────────────────

export interface RegistryEntry {
  title: string;
  tags: string[];
  lastUpdated: string;
}

export interface WikiRegistry {
  articles: Record<string, RegistryEntry>;
}

const REGISTRY_PATH = "registry.json";

/** Get the current wiki registry */
export async function getRegistry(): Promise<WikiRegistry> {
  try {
    const res = await apiFetch<GitHubFileContent>(REGISTRY_PATH);
    return JSON.parse(fromBase64(res.content));
  } catch (e: any) {
    // If it's a 404, we return an empty registry structure
    return { articles: {} };
  }
}

/** Update a single entry in the registry */
export async function updateRegistryEntry(slug: string, entry: RegistryEntry): Promise<void> {
  const registry = await getRegistry();
  registry.articles[slug] = entry;

  let sha;
  try {
    const res = await apiFetch<GitHubFileContent>(REGISTRY_PATH);
    sha = res.sha;
  } catch (e) {}

  await apiFetch(REGISTRY_PATH, {
    method: 'PUT',
    body: JSON.stringify({
      message: `registry: update ${slug}`,
      content: toBase64(JSON.stringify(registry, null, 2)),
      sha,
      branch: CONFIG.branch
    })
  });
}

/** 
 * Rebuild the entire registry from scratch! 
 * Now also rebuilds individual user-registries based on authorEmail in frontmatter.
 */
export async function rebuildRegistry(): Promise<void> {
  const meta = await listPages();
  const articles: Record<string, RegistryEntry> = {};
  const userArticlesMap: Record<string, UserArticleEntry[]> = {};
  
  // Sequential to avoid rate limits during rebuild
  for (const p of meta) {
    try {
      const full = await getPage(p.slug);
      const parsed = (await import("gray-matter")).default(full.body);
      
      const entry: RegistryEntry = {
        title: parsed.data.title || p.title,
        tags: parsed.data.tags || [],
        lastUpdated: parsed.data.date || new Date().toISOString()
      };
      articles[p.slug] = entry;

      // Track per-user articles from contributors array (current format)
      const contributors = parsed.data.contributors;
      if (Array.isArray(contributors)) {
        for (const c of contributors) {
          if (c.email) {
            if (!userArticlesMap[c.email]) userArticlesMap[c.email] = [];
            userArticlesMap[c.email].push({
              slug: p.slug,
              title: entry.title,
              lastUpdated: entry.lastUpdated
            });
          }
        }
      } else {
        // Legacy fallback: single authorEmail
        const email = parsed.data.authorEmail;
        if (email) {
          if (!userArticlesMap[email]) userArticlesMap[email] = [];
          userArticlesMap[email].push({
            slug: p.slug,
            title: entry.title,
            lastUpdated: entry.lastUpdated
          });
        }
      }
    } catch (e) {}
  }

  // 1. Update Global Registry
  let globalSha;
  try {
    const res = await apiFetch<GitHubFileContent>(REGISTRY_PATH);
    globalSha = res.sha;
  } catch (e) {}

  await apiFetch(REGISTRY_PATH, {
    method: 'PUT',
    body: JSON.stringify({
      message: "registry: full global rebuild",
      content: toBase64(JSON.stringify({ articles }, null, 2)),
      sha: globalSha,
      branch: CONFIG.branch
    })
  });

  // 2. Update User Registries
  for (const [email, userArticles] of Object.entries(userArticlesMap)) {
    const path = userRegistryPath(email);
    let userSha;
    try {
      const res = await apiFetch<GitHubFileContent>(path);
      userSha = res.sha;
    } catch (e) {}

    await apiFetch(path, {
      method: 'PUT',
      body: JSON.stringify({
        message: `user-registry: rebuild for ${email}`,
        content: toBase64(JSON.stringify(userArticles, null, 2)),
        sha: userSha,
        branch: CONFIG.branch
      })
    });
  }
}

// ─── USER ARTICLE TRACKING ───────────────────────────────────────────────────

export interface UserArticleEntry {
  slug: string;
  title: string;
  lastUpdated: string;
}

function userRegistryPath(email: string) {
  return `user-registries/${email.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
}

/** Get articles authored by the user */
export async function getUserArticles(email: string): Promise<UserArticleEntry[]> {
  try {
    const res = await apiFetch<GitHubFileContent>(userRegistryPath(email));
    return JSON.parse(fromBase64(res.content));
  } catch (e) {
    return [];
  }
}

/** Register an authored article to a user */
export async function addArticleToUser(email: string, entry: UserArticleEntry): Promise<void> {
  const path = userRegistryPath(email);
  const existing = await getUserArticles(email);
  
  // Update or insert
  const index = existing.findIndex(a => a.slug === entry.slug);
  if (index !== -1) {
    existing[index] = entry;
  } else {
    existing.unshift(entry); // prepend new article
  }
  
  let sha;
  try {
    const res = await apiFetch<GitHubFileContent>(path);
    sha = res.sha;
  } catch (e) {}

  await apiFetch(path, {
    method: 'PUT',
    body: JSON.stringify({
      message: `user-registry: track article ${entry.slug} for ${email}`,
      content: toBase64(JSON.stringify(existing, null, 2)),
      sha,
      branch: CONFIG.branch
    })
  });
}

// ─── ASKS SYSTEM (Community Article Requests) ────────────────────────────────

export interface Ask {
  id: string;
  title: string;
  description: string;
  requester: {
    name: string;
    email: string;
  };
  createdAt: string;
  status: "open" | "resolved";
  resolvedBy?: {
    name: string;
    email: string;
    articleSlug: string;
    articleTitle: string;
    resolvedAt: string;
  };
  upvotes: string[]; // emails for dedup
}

const ASKS_PATH = "asks.json";

/** Fetch all asks from the repo */
export async function getAsks(): Promise<Ask[]> {
  try {
    const res = await apiFetch<GitHubFileContent>(ASKS_PATH);
    return JSON.parse(fromBase64(res.content));
  } catch (e: any) {
    return [];
  }
}

/** Add a new ask */
export async function addAsk(ask: Ask): Promise<void> {
  const existing = await getAsks();
  existing.unshift(ask);

  let sha;
  try {
    const res = await apiFetch<GitHubFileContent>(ASKS_PATH);
    sha = res.sha;
  } catch (e) {}

  await apiFetch(ASKS_PATH, {
    method: 'PUT',
    body: JSON.stringify({
      message: `ask: new request "${ask.title}"`,
      content: toBase64(JSON.stringify(existing, null, 2)),
      sha,
      branch: CONFIG.branch
    })
  });
}

/** Resolve an ask by linking an article */
export async function resolveAsk(
  askId: string,
  resolver: { name: string; email: string },
  articleSlug: string,
  articleTitle: string
): Promise<void> {
  const existing = await getAsks();
  const ask = existing.find(a => a.id === askId);
  if (!ask) throw new Error("Ask not found");

  ask.status = "resolved";
  ask.resolvedBy = {
    ...resolver,
    articleSlug,
    articleTitle,
    resolvedAt: new Date().toISOString()
  };

  const res = await apiFetch<GitHubFileContent>(ASKS_PATH);

  await apiFetch(ASKS_PATH, {
    method: 'PUT',
    body: JSON.stringify({
      message: `ask: resolved "${ask.title}" → ${articleSlug}`,
      content: toBase64(JSON.stringify(existing, null, 2)),
      sha: res.sha,
      branch: CONFIG.branch
    })
  });
}

/** Toggle upvote on an ask */
export async function upvoteAsk(askId: string, email: string): Promise<void> {
  const existing = await getAsks();
  const ask = existing.find(a => a.id === askId);
  if (!ask) throw new Error("Ask not found");

  const idx = ask.upvotes.indexOf(email);
  if (idx !== -1) {
    ask.upvotes.splice(idx, 1); // remove upvote
  } else {
    ask.upvotes.push(email); // add upvote
  }

  const res = await apiFetch<GitHubFileContent>(ASKS_PATH);

  await apiFetch(ASKS_PATH, {
    method: 'PUT',
    body: JSON.stringify({
      message: `ask: ${idx !== -1 ? 'remove' : 'add'} upvote on "${ask.title}"`,
      content: toBase64(JSON.stringify(existing, null, 2)),
      sha: res.sha,
      branch: CONFIG.branch
    })
  });
}
