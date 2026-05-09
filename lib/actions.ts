"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, canEdit } from "./auth";
import matter from "gray-matter";

/**
 * Saves an article safely using Server Actions.
 * Validates the user, injects YAML frontmatter, and caches it.
 */
export async function saveArticleAction(
  title: string,
  content: string,
  tags: string[] = [],
  existingSlug?: string,
  updateMessage?: string
) {
  const user = await getCurrentUser();
  if (!user || !(await canEdit(user))) {
    throw new Error("Unauthorized: Only editors can perform this action.");
  }

  const { upsertPage, getBranchSha, createBranch, createPullRequest, slugify, getPage } = await import("./github");
  const isAdmin = user.role === "admin";
  
  // Use existing slug if provided (preserves URL), otherwise generate new unique one
  const slug = existingSlug || slugify(title);

  // Build history lists: preserve existing, append current user as contributor and update
  let contributors: { name: string; email: string; date: string }[] = [];
  let updates: { name: string; email: string; date: string; message: string }[] = [];
  
  if (existingSlug) {
    try {
      const existing = await getPage(existingSlug);
      const parsed = matter(existing.body);
      
      // Load contributors
      if (Array.isArray(parsed.data.contributors)) {
        contributors = parsed.data.contributors;
      } else if (parsed.data.author) {
        // Migrate legacy single-author format
        contributors = [{
          name: parsed.data.author,
          email: parsed.data.authorEmail || "",
          date: parsed.data.date || new Date().toISOString()
        }];
      }

      // Load updates
      if (Array.isArray(parsed.data.updates)) {
        updates = parsed.data.updates;
      }
    } catch (e) {
      // New article or fetch failed - start fresh
    }
  }

  const now = new Date().toISOString();
  const dateOnly = now.split("T")[0];

  // Add/update current user's contribution entry (for unique authors list)
  const existingContribIdx = contributors.findIndex(c => c.email === user.email);
  if (existingContribIdx !== -1) {
    contributors[existingContribIdx].date = dateOnly;
  } else {
    contributors.push({ name: user.name, email: user.email, date: dateOnly });
  }

  // Record this specific update
  updates.push({
    name: user.name,
    email: user.email,
    date: now,
    message: updateMessage || (existingSlug ? "Updated article" : "Created article")
  });

  // Format datastream with Gray-Matter Frontmatter
  const fileContent = matter.stringify("\n" + content, {
    title,
    contributors,
    updates: updates.slice(-50), // Keep last 50 updates to prevent frontmatter bloat
    date: dateOnly,
    tags,
  });


  if (isAdmin) {
    const result = await upsertPage(title, fileContent, user.name, undefined, slug);
    
    // Automatically update the scalable registry
    const { updateRegistryEntry, addArticleToUser } = await import("./github");
    await updateRegistryEntry(result.slug, {
      title,
      tags,
      lastUpdated: new Date().toISOString()
    });

    if (user.email) {
      await addArticleToUser(user.email, {
        slug: result.slug,
        title,
        lastUpdated: new Date().toISOString()
      });
    }

    revalidatePath("/");
    revalidatePath(`/${result.slug}`);
    return { success: true, slug: result.slug, isQueued: false };
  }

  // Editor Workflow: Push to branch, open PR
  const branchName = `edit-${slug}-${Date.now()}`;
  const sha = await getBranchSha();
  
  await createBranch(branchName, sha);
  // Upsert pointing strictly to the new branch, using the stable slug
  const result = await upsertPage(title, fileContent, user.name, branchName, slug);
  const actualSlug = result.slug;
  
  await createPullRequest(
    `Suggested Edit: ${title}`, 
    branchName, 
    `Automated pull request from Editor: @${user.name} (${user.email})\nReview changes for ${actualSlug}.`
  );

  return { success: true, slug: actualSlug, isQueued: true };
}

/**
 * Validates and uploads media (Images only, max 5MB).
 */
export async function uploadMediaAction(slug: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !(await canEdit(user))) {
    throw new Error("Unauthorized: Only editors can upload media.");
  }

  const file = formData.get("file") as File;
  if (!file) {
    throw new Error("No file provided.");
  }

  // Restrictions
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed.");
  }
  
  const maxSize = 5 * 1024 * 1024; // 5MB limit
  if (file.size > maxSize) {
    throw new Error("File exceeds 5MB size limit.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64Content = buffer.toString("base64");

  // Create safe filename (remove spaces/special chars)
  const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const finalFilename = `${Date.now()}-${safeFilename}`;

  const result = await (await import("./github")).uploadMediaFile(
    slug,
    finalFilename,
    base64Content,
    user.name
  );

  return { success: true, url: result.downloadUrl, name: finalFilename };
}

/**
 * Handles clearing a notification for an editor.
 */
export async function settleNotificationAction(notifId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const { settleNotification } = await import("./github");
  await settleNotification(user.email, notifId);
  revalidatePath("/queue");
}

/**
 * Helper to extract Editor email from PR body.
 */
export async function getEditorEmailFromPR(body: string): Promise<string | null> {
  const match = /\(([^)]+@[^)]+)\)/.exec(body);
  return match ? match[1] : null;
}

/**
 * Admin action to trigger a full global registry rebuild.
 */
export async function rebuildRegistryAction() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    throw new Error("Unauthorized: Only admins can rebuild the global registry.");
  }

  const { rebuildRegistry } = await import("./github");
  await rebuildRegistry();
  revalidatePath("/");
}

// ─── ASKS (Community Article Requests) ────────────────────────────────────────

/**
 * Submit a new article request.
 */
export async function submitAskAction(title: string, description: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized: You must be logged in to post a request.");

  const { addAsk } = await import("./github");

  await addAsk({
    id: `ask-${Date.now()}`,
    title: title.trim(),
    description: description.trim(),
    requester: { name: user.name, email: user.email },
    createdAt: new Date().toISOString(),
    status: "open",
    upvotes: [user.email], // auto-upvote by requester
  });

  revalidatePath("/asks");
}

/**
 * Resolve an ask by linking a validated article.
 */
export async function resolveAskAction(askId: string, articleSlug: string, articleTitle: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const { resolveAsk } = await import("./github");
  await resolveAsk(
    askId,
    { name: user.name, email: user.email },
    articleSlug,
    articleTitle
  );

  revalidatePath("/asks");
}

/**
 * Toggle upvote on an ask.
 */
export async function upvoteAskAction(askId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const { upvoteAsk } = await import("./github");
  await upvoteAsk(askId, user.email);

  revalidatePath("/asks");
}
