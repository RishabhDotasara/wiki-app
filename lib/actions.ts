"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, canEdit } from "./auth";
import { upsertPage } from "./github";
import matter from "gray-matter";

/**
 * Saves an article safely using Server Actions.
 * Validates the user, injects YAML frontmatter, and caches it.
 */
export async function saveArticleAction(
  title: string,
  content: string,
  tags: string[] = [],
  existingSlug?: string
) {
  const user = await getCurrentUser();
  if (!user || !(await canEdit(user))) {
    throw new Error("Unauthorized: Only editors can perform this action.");
  }

  // Format datastream with Gray-Matter Frontmatter
  const fileContent = matter.stringify("\n" + content, {
    title,
    author: user.name,
    date: new Date().toISOString().split("T")[0],
    tags,
  });

  const { upsertPage, getBranchSha, createBranch, createPullRequest, slugify } = await import("./github");
  const isAdmin = user.role === "admin";
  
  // Use existing slug if provided (preserves URL), otherwise generate new unique one
  const slug = existingSlug || slugify(title);

  if (isAdmin) {
    const result = await upsertPage(title, fileContent, user.name, undefined, slug);
    
    // Automatically update the scalable registry
    const { updateRegistryEntry } = await import("./github");
    await updateRegistryEntry(result.slug, {
      title,
      tags,
      lastUpdated: new Date().toISOString()
    });

    revalidatePath("/");
    revalidatePath(`/${result.slug}`);
    return { success: true, slug: result.slug, isQueued: false };
  }

  // Editor Workflow: Push to branch, open PR
  const branchName = `edit-${slug}-${Date.now()}`;
  const sha = await getBranchSha();
  
  await createBranch(branchName, sha);
  // Upsert pointing strictly to the new branch, using the stable slug
  await upsertPage(title, fileContent, user.name, branchName, slug);
  
  await createPullRequest(
    `Suggested Edit: ${title}`, 
    branchName, 
    `Automated pull request from Editor: @${user.name} (${user.email})\nReview changes for ${slug}.`
  );

  return { success: true, slug, isQueued: true };
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

