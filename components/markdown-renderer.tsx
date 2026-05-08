import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

export function extractHeadings(markdown: string) {
  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
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
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
      
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
          h1: ({node, ...props}) => <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight mt-12 mb-6" {...props} />,
          h2: ({node, ...props}) => <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight mt-12 mb-4 first:mt-0" {...props} />,
          h3: ({node, ...props}) => <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight mt-8 mb-4" {...props} />,
          h4: ({node, ...props}) => <h4 className="scroll-m-20 text-xl font-semibold tracking-tight mt-6 mb-3" {...props} />,
          p: ({node, ...props}) => <p className="leading-7 [&:not(:first-child)]:mt-6" {...props} />,
          a: ({node, ...props}) => <a className="font-medium text-primary underline underline-offset-4 decoration-primary/30 hover:decoration-primary transition-colors" {...props} />,
          ul: ({node, ...props}) => <ul className="my-6 ml-6 list-disc space-y-2 [&>li]:mt-2" {...props} />,
          ol: ({node, ...props}) => <ol className="my-6 ml-6 list-decimal space-y-2 [&>li]:mt-2" {...props} />,
          li: ({node, ...props}) => <li className="leading-7" {...props} />,
          blockquote: ({node, ...props}) => (
            <blockquote className="mt-6 border-l-4 border-primary/40 pl-6 italic text-muted-foreground bg-muted/30 py-2 rounded-r-md shadow-sm" {...props} />
          ),
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
          pre: ({node, ...props}) => <div {...props} />, // Discard default <pre> because SyntaxHighlighter injects it
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
