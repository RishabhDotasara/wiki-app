import { getCurrentUser } from "@/lib/auth";
import { listPullRequests, getUserNotifications } from "@/lib/github";
import { settleNotificationAction } from "@/lib/actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, XCircle, Bell } from "lucide-react";

export default async function QueuePage() {
  const user = await getCurrentUser();
  if (!user) return redirect("/");

  const isEditor = user.role === "editor";
  const prs = await listPullRequests("open");
  const notifications = isEditor ? await getUserNotifications(user.email) : [];
  
  // Editors only see their own PRs if we could filter by string, but GitHub API PRs return the commit user. 
  // We added "Editor: name (email)" in the body. We can just filter by body locally!
  const myPrs = isEditor 
      ? prs.filter(pr => pr.body.includes(user.email)) 
      : prs;

  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-6 space-y-12">
      {/* Notifications Section for Editors */}
      {isEditor && notifications.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" /> Notifications
          </h2>
          <div className="grid gap-3">
            {notifications.map(n => (
              <div key={n.id} className="p-4 rounded-lg border bg-card shadow-sm flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {n.status === 'approved' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-1 shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 mt-1 shrink-0" />
                  )}
                  <div>
                    <p className="font-medium">
                      Your request for <span className="font-bold underline">"{n.articleTitle}"</span> was {n.status}.
                    </p>
                    {n.comment && <p className="text-sm text-muted-foreground mt-1 bg-muted/30 p-2 rounded italic">Admin: {n.comment}</p>}
                    <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-wide">
                      {formatDistanceToNow(new Date(n.timestamp))} ago
                    </p>
                  </div>
                </div>
                <form action={settleNotificationAction.bind(null, n.id)}>
                  <button className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors border px-2 py-1 rounded bg-muted/20 hover:bg-muted/40">
                    Settle
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-6">
        <h1 className="text-3xl font-bold">
          {isEditor ? "My Pending Requests" : "Moderation Queue"}
        </h1>

        {myPrs.length === 0 ? (
          <div className="text-center py-24 bg-muted/30 rounded-xl border border-dashed">
            <p className="text-muted-foreground font-medium">No pending requests.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {myPrs.map(pr => (
              <Link key={pr.id} href={`/queue/${pr.number}`} className="block block group">
                <div className="p-6 rounded-xl border bg-card hover:border-primary/50 transition-colors shadow-sm flex items-start justify-between">
                   <div>
                     <h3 className="text-lg font-semibold text-primary/90 group-hover:text-primary mb-1">
                       {pr.title}
                     </h3>
                     <div className="flex gap-4 text-sm text-muted-foreground mt-2">
                       <span>#{pr.number}</span>
                       <span>•</span>
                       <span>Branch: <code className="text-xs bg-muted/60 px-1 py-0.5 rounded">{pr.head.ref}</code></span>
                       <span>•</span>
                       <span>Opened {formatDistanceToNow(new Date(pr.created_at))} ago</span>
                     </div>
                   </div>
                   <div className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20 px-3 py-1 text-xs uppercase font-bold rounded-full">
                     Pending Review
                   </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

