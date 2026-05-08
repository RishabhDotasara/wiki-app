import { getCurrentUser } from "@/lib/auth";
import { getPullRequestDiff } from "@/lib/github";
import { redirect } from "next/navigation";
import { XCircle } from "lucide-react";
import { ApproveButton, RejectButton } from "@/components/moderation-actions";

export default async function QueueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return redirect("/"); // Only Admins can execute merges

  const { id } = await params;
  const pullNumber = parseInt(id);
  const diffString = await getPullRequestDiff(pullNumber);

  // Next.js Server Actions directly inline for Buttons!
  async function actionMerge() {
    "use server";
    const { getPullRequest, mergePullRequest, addNotification } = await import("@/lib/github");
    const { getEditorEmailFromPR } = await import("@/lib/actions");
    
    const pr = await getPullRequest(pullNumber);
    await mergePullRequest(pullNumber, "Approved by Admin via InstiWiki");
    
    // Update Registry after merge
    const slug = pr.title.replace('Suggested Edit: ', '').toLowerCase().replace(/[^a-z0-9]+/g, "-");
    try {
      const { getPage, updateRegistryEntry } = await import("@/lib/github");
      const { body } = await getPage(slug);
      const { data } = (await import("gray-matter")).default(body);
      await updateRegistryEntry(slug, {
        title: data.title || pr.title.replace('Suggested Edit: ', ''),
        tags: data.tags || [],
        lastUpdated: new Date().toISOString()
      });
    } catch (e) {
      console.error("Registry update failed after merge", e);
    }

    const editorEmail = await getEditorEmailFromPR(pr.body);
    if (editorEmail) {
       await addNotification(editorEmail, {
          id: `notif-${Date.now()}`,
          status: 'approved',
          articleTitle: pr.title.replace('Suggested Edit: ', ''),
          timestamp: new Date().toISOString()
       });
    }

    redirect("/queue");
  }

  async function actionReject(formData: FormData) {
    "use server";
    const { getPullRequest, closePullRequest, addNotification, commentOnPullRequest } = await import("@/lib/github");
    const { getEditorEmailFromPR } = await import("@/lib/actions");

    const comment = formData.get("comment") as string;
    const pr = await getPullRequest(pullNumber);
    
    if (comment) await commentOnPullRequest(pullNumber, `Admin Rejected: ${comment}`);
    await closePullRequest(pullNumber);
    
    const editorEmail = await getEditorEmailFromPR(pr.body);
    if (editorEmail) {
       await addNotification(editorEmail, {
          id: `notif-${Date.now()}`,
          status: 'rejected',
          articleTitle: pr.title.replace('Suggested Edit: ', ''),
          comment: comment || "No reason provided.",
          timestamp: new Date().toISOString()
       });
    }

    redirect("/queue");
  }

  const lines = diffString.split('\n');

  return (
    <div className="w-full max-w-5xl mx-auto py-12 px-6">
      <div className="flex items-center justify-between mb-8 pb-4 border-b">
        <div>
           <h1 className="text-3xl font-bold">Review Request #{pullNumber}</h1>
           <p className="text-muted-foreground mt-2">Approve these Markdown changes to merge them natively into GitHub.</p>
        </div>
        <div className="flex items-center gap-3">
          <form action={actionMerge}>
            <ApproveButton />
          </form>
        </div>
      </div>

      <div className="bg-zinc-950 rounded-xl overflow-hidden shadow-lg border border-zinc-800 mb-8 font-mono text-sm leading-relaxed">
        <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 text-zinc-400 font-semibold text-xs tracking-wider uppercase">
          Diff Viewer
        </div>
        <div className="p-4 overflow-x-auto min-h-[200px]">
          {lines.map((line, i) => {
            if (line.startsWith('+') && !line.startsWith('+++')) {
              return <div key={i} className="text-green-400 bg-green-500/10 px-2 py-0.5"><span className="select-none text-green-600 mr-4">+</span>{line.substring(1)}</div>;
            }
            if (line.startsWith('-') && !line.startsWith('---')) {
              return <div key={i} className="text-red-400 bg-red-500/10 px-2 py-0.5 line-through decoration-red-400/50"><span className="select-none text-red-600 mr-4">-</span>{line.substring(1)}</div>;
            }
            if (line.startsWith('@@')) {
              return <div key={i} className="text-blue-400 bg-blue-500/10 px-2 py-2 mt-4 font-bold">{line}</div>;
            }
            return <div key={i} className="text-zinc-300 px-2 py-0.5"><span className="select-none text-zinc-700 mr-4"> </span>{line.substring(1) || " "}</div>;
          })}
        </div>
      </div>

      <div className="p-6 rounded-xl border bg-muted/10">
         <h2 className="font-semibold mb-4 text-red-500 flex items-center gap-2">
            <XCircle className="h-4 w-4" /> Hard Reject
         </h2>
         <form action={actionReject} className="flex flex-col gap-3">
            <textarea 
               name="comment" 
               placeholder="Optional reason for rejection..." 
               className="w-full bg-background border rounded-md p-3 text-sm min-h-[100px]"
            />
            <div className="self-end">
              <RejectButton />
            </div>
         </form>
      </div>
    </div>
  );
}
