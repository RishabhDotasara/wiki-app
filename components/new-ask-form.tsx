"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { submitAskAction } from "@/lib/actions";

export function NewAskForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      await submitAskAction(title, description);
      setTitle("");
      setDescription("");
      setExpanded(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full p-4 rounded-xl border-2 border-dashed border-primary/20 hover:border-primary/40 bg-primary/[0.02] hover:bg-primary/[0.04] transition-all text-left group"
      >
        <span className="text-muted-foreground group-hover:text-primary transition-colors font-medium">
          + Request an article topic...
        </span>
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border bg-card p-5 space-y-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <div>
        <label
          htmlFor="ask-title"
          className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
        >
          What topic do you want an article about?
        </label>
        <input
          id="ask-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder='e.g. "How does the branch change process work?"'
          className="w-full bg-background border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          autoFocus
          required
        />
      </div>

      <div>
        <label
          htmlFor="ask-description"
          className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
        >
          Additional details <span className="opacity-50">(optional)</span>
        </label>
        <textarea
          id="ask-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what specific aspects you'd like covered..."
          rows={3}
          className="w-full bg-background border rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setExpanded(false);
            setTitle("");
            setDescription("");
          }}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={loading || !title.trim()} className="gap-2">
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          Submit Request
        </Button>
      </div>
    </form>
  );
}
