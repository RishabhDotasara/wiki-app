"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronUp,
  CheckCircle2,
  Link2,
  Loader2,
  Sparkles,
  AlertTriangle,
  ExternalLink,
  X,
} from "lucide-react";
import { upvoteAskAction, resolveAskAction } from "@/lib/actions";
import type { Ask } from "@/lib/github";
import Link from "next/link";

interface AskCardProps {
  ask: Ask;
  userEmail: string | null;
  isLoggedIn: boolean;
}

export function AskCard({ ask, userEmail, isLoggedIn }: AskCardProps) {
  const [upvoting, setUpvoting] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [showResolve, setShowResolve] = useState(false);
  const [slugInput, setSlugInput] = useState("");
  const [validation, setValidation] = useState<{
    status: "idle" | "loading" | "valid" | "invalid" | "not-found";
    reason: string;
    articleTitle: string;
  }>({ status: "idle", reason: "", articleTitle: "" });

  const isUpvoted = userEmail ? ask.upvotes.includes(userEmail) : false;
  const isResolved = ask.status === "resolved";

  async function handleUpvote() {
    if (!isLoggedIn || upvoting) return;
    setUpvoting(true);
    try {
      await upvoteAskAction(ask.id);
    } catch (err: any) {
      console.error(err);
    } finally {
      setUpvoting(false);
    }
  }

  function extractSlug(input: string): string {
    // Support both full URLs ("/credit-system-9bnr") and bare slugs
    const trimmed = input.trim();
    if (trimmed.startsWith("/")) return trimmed.slice(1);
    if (trimmed.startsWith("http")) {
      try {
        const url = new URL(trimmed);
        return url.pathname.slice(1); // remove leading "/"
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }

  async function handleValidate() {
    const slug = extractSlug(slugInput);
    if (!slug) return;

    setValidation({ status: "loading", reason: "", articleTitle: "" });

    try {
      const res = await fetch("/api/validate-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          askTitle: ask.title,
          askDescription: ask.description,
          articleSlug: slug,
        }),
      });
      const data = await res.json();

      if (!data.exists) {
        setValidation({
          status: "not-found",
          reason: data.reason,
          articleTitle: "",
        });
      } else if (data.valid) {
        setValidation({
          status: "valid",
          reason: data.reason,
          articleTitle: data.articleTitle,
        });
      } else {
        setValidation({
          status: "invalid",
          reason: data.reason,
          articleTitle: data.articleTitle,
        });
      }
    } catch {
      setValidation({
        status: "invalid",
        reason: "Validation request failed.",
        articleTitle: "",
      });
    }
  }

  async function handleResolve() {
    const slug = extractSlug(slugInput);
    setResolving(true);
    try {
      await resolveAskAction(ask.id, slug, validation.articleTitle || slug);
    } catch (err: any) {
      alert("Failed to resolve: " + err.message);
    } finally {
      setResolving(false);
    }
  }

  return (
    <div
      className={`rounded-xl border transition-all ${
        isResolved
          ? "bg-emerald-500/[0.03] border-emerald-500/20"
          : "bg-card hover:border-primary/30"
      }`}
    >
      <div className="p-5">
        <div className="flex gap-4">
          {/* Upvote column */}
          <div className="flex flex-col items-center gap-1 pt-0.5">
            <button
              onClick={handleUpvote}
              disabled={!isLoggedIn || upvoting || isResolved}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all ${
                isUpvoted
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/5"
              } ${(!isLoggedIn || isResolved) ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
              title={isLoggedIn ? "Upvote this request" : "Log in to upvote"}
            >
              <ChevronUp className={`h-5 w-5 ${upvoting ? "animate-bounce" : ""}`} />
              <span className="text-sm font-bold leading-none">{ask.upvotes.length}</span>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[15px] leading-snug">
                  {isResolved && (
                    <CheckCircle2 className="inline h-4 w-4 text-emerald-500 mr-1.5 -mt-0.5" />
                  )}
                  {ask.title}
                </h3>
                {ask.description && (
                  <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">
                    {ask.description}
                  </p>
                )}
              </div>

              {/* Status badge */}
              {isResolved ? (
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">
                  Resolved
                </span>
              ) : (
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md">
                  Open
                </span>
              )}
            </div>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
              <span>Asked by <span className="font-medium text-foreground/70">{ask.requester.name}</span></span>
              <span className="opacity-30">•</span>
              <span>
                {new Date(ask.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>

              {isResolved && ask.resolvedBy && (
                <>
                  <span className="opacity-30">•</span>
                  <Link
                    href={`/${ask.resolvedBy.articleSlug}`}
                    className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-500 font-medium transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {ask.resolvedBy.articleTitle}
                  </Link>
                </>
              )}
            </div>

            {/* Resolve panel (only for open + logged in) */}
            {!isResolved && isLoggedIn && (
              <div className="mt-3">
                {!showResolve ? (
                  <button
                    onClick={() => setShowResolve(true)}
                    className="text-xs text-primary/70 hover:text-primary font-medium flex items-center gap-1 transition-colors"
                  >
                    <Link2 className="h-3 w-3" />
                    Link an article to resolve
                  </button>
                ) : (
                  <div className="animate-in fade-in slide-in-from-top-1 duration-150 space-y-3 mt-2 p-3 rounded-lg bg-muted/30 border">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={slugInput}
                        onChange={(e) => {
                          setSlugInput(e.target.value);
                          setValidation({ status: "idle", reason: "", articleTitle: "" });
                        }}
                        placeholder="Enter article slug or URL..."
                        className="flex-1 bg-background border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleValidate}
                        disabled={!slugInput.trim() || validation.status === "loading"}
                        className="gap-1.5"
                      >
                        {validation.status === "loading" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        Validate
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setShowResolve(false);
                          setSlugInput("");
                          setValidation({ status: "idle", reason: "", articleTitle: "" });
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Validation result */}
                    {validation.status === "not-found" && (
                      <div className="flex items-start gap-2 text-sm text-red-500 bg-red-500/5 p-2.5 rounded-md border border-red-500/10">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{validation.reason}</span>
                      </div>
                    )}

                    {validation.status === "valid" && (
                      <div className="space-y-2">
                        <div className="flex items-start gap-2 text-sm text-emerald-600 bg-emerald-500/5 p-2.5 rounded-md border border-emerald-500/10">
                          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-medium">AI Validated: </span>
                            <span className="text-emerald-600/80">{validation.reason}</span>
                            {validation.articleTitle && (
                              <span className="block mt-0.5 text-xs opacity-70">
                                Article: "{validation.articleTitle}"
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={handleResolve}
                          disabled={resolving}
                          className="w-full gap-2"
                        >
                          {resolving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          Mark as Resolved
                        </Button>
                      </div>
                    )}

                    {validation.status === "invalid" && (
                      <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-500/5 p-2.5 rounded-md border border-amber-500/10">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-medium">Not a match: </span>
                          <span className="text-amber-600/80">{validation.reason}</span>
                          {validation.articleTitle && (
                            <span className="block mt-0.5 text-xs opacity-70">
                              Article: &quot;{validation.articleTitle}&quot;
                            </span>
                          )}
                          <span className="block mt-1.5 text-xs text-muted-foreground">
                            Try linking a different article that addresses this request.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
