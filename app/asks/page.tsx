import { getAsks } from "@/lib/github";
import { getCurrentUser } from "@/lib/auth";
import { NewAskForm } from "@/components/new-ask-form";
import { AskCard } from "@/components/ask-card";
import { MessageSquarePlus } from "lucide-react";

export default async function AsksPage() {
  const [asks, user] = await Promise.all([getAsks(), getCurrentUser()]);

  const openAsks = asks
    .filter((a) => a.status === "open")
    .sort((a, b) => b.upvotes.length - a.upvotes.length); // Most upvoted first

  const resolvedAsks = asks.filter((a) => a.status === "resolved");

  return (
    <div className="w-full max-w-3xl mx-auto py-12 px-6 space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            {/* <MessageSquarePlus className="h-5 w-5 text-primary" /> */}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Article Requests</h1>
            <p className="text-muted-foreground mt-1">
              Request topics you&apos;d like to see covered. Upvote what matters most to you.
            </p>
          </div>
        </div>
      </div>

      {/* New request form — only for logged-in users */}
      {user ? (
        <NewAskForm />
      ) : (
        <div className="p-4 rounded-xl border border-dashed text-center text-sm text-muted-foreground">
          Sign in to post or upvote article requests.
        </div>
      )}

      {/* Open requests */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            Open Requests
          </h2>
          <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-1 rounded-md">
            {openAsks.length} pending
          </span>
        </div>

        {openAsks.length === 0 ? (
          <div className="text-center py-16 bg-muted/20 rounded-xl border border-dashed">
            <p className="text-muted-foreground text-sm">
              No open requests yet. Be the first to ask for an article!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {openAsks.map((ask) => (
              <AskCard
                key={ask.id}
                ask={ask}
                userEmail={user?.email || null}
                isLoggedIn={!!user}
              />
            ))}
          </div>
        )}
      </section>

      {/* Resolved requests */}
      {resolvedAsks.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Resolved
            </h2>
            <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-1 rounded-md">
              {resolvedAsks.length} completed
            </span>
          </div>

          <div className="space-y-3">
            {resolvedAsks.map((ask) => (
              <AskCard
                key={ask.id}
                ask={ask}
                userEmail={user?.email || null}
                isLoggedIn={!!user}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
