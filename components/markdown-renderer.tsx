import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { Info, Lightbulb, CircleAlert, TriangleAlert, OctagonAlert } from "lucide-react";

export function extractHeadings(markdown: string) {
  const headingRegex = /^(#{1,2})\s+(.+)$/gm;
  const headings = [];
  let match;
  
  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const rawText = match[2];
    // Simple ID generator that mimics github-slugger/rehype-slug behavior
    const text = rawText.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1'); // strip bold/italics
    const id = text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')     // spaces to dashes
      .replace(/[^\w-]/g, '')    // remove all non-word chars (except dashes)
      .replace(/--+/g, '-')     // replace multiple dashes with single dash
      .replace(/^-+|-+$/g, '');  // trim dashes from start/end
      
    headings.push({ level, text, id });
  }
  return headings;
}

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="w-full text-foreground pb-20">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={{
          h1: ({node, ...props}) => <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight mt-10 mb-5" {...props} />,
          h2: ({node, ...props}) => <h2 className="scroll-m-20 border-b pb-2 text-2xl font-bold tracking-tight mt-10 mb-4 first:mt-0" {...props} />,
          h3: ({node, ...props}) => <h3 className="scroll-m-20 text-xl font-semibold tracking-tight mt-8 mb-3" {...props} />,
          h4: ({node, ...props}) => <h4 className="scroll-m-20 text-lg font-semibold tracking-tight mt-6 mb-2" {...props} />,
          p: ({node, ...props}) => <p className="leading-7 [&:not(:first-child)]:mt-6" {...props} />,
          a: ({node, ...props}) => <a className="font-medium text-primary underline underline-offset-4 decoration-primary/30 hover:decoration-primary transition-colors" {...props} />,
          ul: ({node, ...props}) => <ul className="my-6 ml-6 list-disc space-y-2 [&>li]:mt-2" {...props} />,
          ol: ({node, ...props}) => <ol className="my-6 ml-6 list-decimal space-y-2 [&>li]:mt-2" {...props} />,
          li: ({node, ...props}) => <li className="leading-7" {...props} />,
          blockquote: ({ children, ...props }) => {
            const childrenArray = React.Children.toArray(children);
            
            // Helper to find the first text string deep in the children tree
            const findFirstText = (nodes: any[]): { text: string, node: any, index: number } | null => {
              for (const [i, node] of nodes.entries()) {
                if (typeof node === 'string' && node.trim().length > 0) return { text: node.trim(), node, index: i };
                if (node?.props?.children) {
                  const found = findFirstText(React.Children.toArray(node.props.children));
                  if (found) return found;
                }
              }
              return null;
            };

            const firstTextInfo = findFirstText(childrenArray);
            let alertType: string | null = null;
            let finalChildren: React.ReactNode = children;

            if (firstTextInfo) {
              const match = firstTextInfo.text.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
              if (match) {
                alertType = match[1].toUpperCase();

                // Advanced replacement: we need to find the specific node and strip the tag
                const rewriteChildren = (nodes: any[]): any[] => {
                   return nodes.map((node, i) => {
                     if (typeof node === 'string' && node.trim() === firstTextInfo.text) {
                       return node.replace(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i, "");
                     }
                     if (node?.props?.children) {
                       return React.cloneElement(node, {
                         ...node.props,
                         children: rewriteChildren(React.Children.toArray(node.props.children))
                       });
                     }
                     return node;
                   });
                };

                finalChildren = rewriteChildren(childrenArray);
              }
            }

            if (alertType) {
              const styles: any = {
                NOTE: { border: "border-blue-500", bg: "bg-blue-500/5", icon: Info, color: "text-blue-500", label: "Note" },
                TIP: { border: "border-emerald-500", bg: "bg-emerald-500/5", icon: Lightbulb, color: "text-emerald-500", label: "Tip" },
                IMPORTANT: { border: "border-purple-500", bg: "bg-purple-500/5", icon: CircleAlert, color: "text-purple-500", label: "Important" },
                WARNING: { border: "border-amber-500", bg: "bg-amber-500/5", icon: TriangleAlert, color: "text-amber-500", label: "Warning" },
                CAUTION: { border: "border-red-500", bg: "bg-red-500/5", icon: OctagonAlert, color: "text-red-500", label: "Caution" }
              };

              const style = styles[alertType];
              const Icon = style.icon;

              return (
                <div className={`mt-6 border-l-4 ${style.border} ${style.bg} px-6 py-4 rounded-r-lg shadow-sm relative ring-1 ring-inset ring-foreground/5`}>
                  <div className={`flex items-center gap-2 mb-2 font-bold text-sm tracking-wide uppercase ${style.color}`}>
                    {Icon && <Icon className="h-4 w-4 shrink-0" />}
                    {style.label}
                  </div>
                  <div className="text-foreground/90 prose-p:my-0 [&_p]:m-0">
                    {finalChildren}
                  </div>
                </div>
              );
            }

            return (
              <blockquote className={`mt-6 border-l-4 border-primary/40 pl-6 italic text-muted-foreground bg-muted/30 py-2 rounded-r-md shadow-sm`} {...props}>
                {children}
              </blockquote>
            );
          },
          hr: ({node, ...props}) => <hr className="my-8 border-muted" {...props} />,
          table: ({node, ...props}) => (
            <div className="my-6 w-full overflow-y-auto rounded-lg border shadow-sm max-w-full">
              <table className="w-full relative text-sm text-left" {...props} />
            </div>
          ),
          thead: ({node, ...props}) => <thead className="bg-muted bg-opacity-70 text-muted-foreground text-xs uppercase font-semibold" {...props} />,
          tbody: ({node, ...props}) => <tbody className="divide-y divide-border" {...props} />,
          tr: ({node, ...props}) => <tr className="transition-colors hover:bg-muted/30" {...props} />,
          th: ({node, ...props}) => <th className="h-10 px-4 align-middle font-medium" {...props} />,
          td: ({node, ...props}) => <td className="p-4 align-middle" {...props} />,
          pre: ({node, ...props}: any) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { ref, ...rest } = props;
            return <div {...rest} />;
          },
          code: ({node, className, children, ...props}: any) => {
            const match = /language-(\w+)/.exec(className || '');
            return match ? (
              <div className="relative mt-6 mb-4 rounded-lg overflow-hidden border shadow-md font-mono">
                <div className="flex bg-zinc-950/90 text-xs px-4 py-2 text-zinc-400 border-b border-zinc-800 uppercase font-semibold tracking-wider">
                  {match[1]}
                </div>
                <SyntaxHighlighter
                  {...props}
                  style={vscDarkPlus as any}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{ margin: 0, padding: '1rem', background: '#09090b', textShadow: 'none', fontSize: '13px' }}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code className="relative rounded bg-muted/80 px-[0.35rem] py-[0.15rem] font-mono text-sm shadow-sm border" {...props}>
                {children}
              </code>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
