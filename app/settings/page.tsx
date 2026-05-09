import { getCurrentUser } from "@/lib/auth";
import { generateApiKey } from "@/lib/api-keys";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Key, AlertCircle } from "lucide-react";
import { CopyButton } from "@/components/copy-button";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  const apiKey = generateApiKey(user.email);

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-8 px-4">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Developer Settings</h1>
        <p className="text-muted-foreground text-sm md:text-base">Manage your API access and integration keys.</p>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Key className="h-5 w-5 text-primary" />
            Your API Key
          </CardTitle>
          <CardDescription className="text-sm">
            Use this key to authenticate requests to the FlightDeck Webhook API. 
            This key is unique to your account and should be kept secret.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input 
              readOnly 
              value={apiKey} 
              className="font-mono text-xs md:text-sm bg-muted/50 h-10"
            />
            <CopyButton value={apiKey} className="h-10 shrink-0" />
          </div>

          <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 dark:text-yellow-400 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="leading-normal">
              Anyone with this key can create or update articles on your behalf. 
              Do not share it or commit it to public repositories.
            </p>
          </div>

          <div className="pt-2 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">API Usage Example</h4>
              <CopyButton 
                value={`curl -X POST /api/articles \\
  -H "x-api-key: ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "New Article",
    "content": "# Markdown content here...",
    "tags": ["Engineering", "Docs"],
    "author": { 
      "name": "${user.name}", 
      "email": "${user.email}" 
    },
    "updateMessage": "Initial commit via API"
  }'`}
                className="h-8 py-0"
              />
            </div>
            <div className="bg-slate-950 dark:bg-muted p-4 rounded-lg overflow-x-auto border border-border/50">
              <pre className="text-[10px] md:text-[11px] leading-relaxed font-mono text-slate-300 dark:text-muted-foreground whitespace-pre-wrap sm:whitespace-pre">
{`curl -X POST /api/articles \\
  -H "x-api-key: ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "New Article",
    "content": "# Markdown content here...",
    "tags": ["Engineering", "Docs"],
    "author": { 
      "name": "${user.name}", 
      "email": "${user.email}" 
    },
    "updateMessage": "Initial commit via API"
  }'`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
