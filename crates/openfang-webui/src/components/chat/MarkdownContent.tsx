// MarkdownContent - Cyberpunk styled markdown rendering with code highlighting
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import vscDarkPlus from 'react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarkdownContentProps {
  content: string;
  className?: string;
  searchQuery?: string;
}

// Create regex for search highlighting
function createSearchRegex(query: string): RegExp | null {
  if (!query || query.trim().length < 2) return null;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(${escaped})`, 'gi');
}

// Highlight text component
function HighlightedText({ text, searchRegex }: { text: string; searchRegex: RegExp | null }) {
  if (!searchRegex) return <>{text}</>;

  const parts = text.split(searchRegex);
  const matches = text.match(searchRegex) || [];

  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < matches.length && (
            <mark className="bg-[var(--neon-amber)] text-[var(--void)] rounded px-0.5">
              {matches[i]}
            </mark>
          )}
        </span>
      ))}
    </>
  );
}

// Copy button component
function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded text-xs font-mono',
        'bg-[var(--surface-tertiary)] border border-[var(--border-default)]',
        'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)]',
        'transition-all duration-200',
        copied && 'bg-[var(--neon-green)] border-[var(--neon-green)] text-[var(--void)]'
      )}
    >
      {copied ? (
        <>
          <Check className="w-3 h-3" />
          <span>Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

export function MarkdownContent({ content, className, searchQuery }: MarkdownContentProps) {
  const searchRegex = createSearchRegex(searchQuery || '');

  return (
    <div className={cn('markdown-body prose prose-invert max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Code blocks with syntax highlighting
          code({ className: codeClassName, children, ...props }) {
            const match = /language-(\w+)/.exec(codeClassName || '');
            const code = String(children).replace(/\n$/, '');
            // inline is a react-markdown specific prop
            const { inline } = props as { inline?: boolean };

            // CRITICAL: Inline code must NEVER return a div - only block code can
            // The 'inline' prop is true for `code` and false for ```fenced blocks```
            if (inline || !match) {
              return (
                <code className="px-1.5 py-0.5 rounded bg-[var(--surface-tertiary)] text-[var(--neon-cyan)] font-mono text-sm">
                  {children}
                </code>
              );
            }

            // Block code (fenced code blocks only)
            return (
                <div className="relative group my-4">
                  <div className="absolute -top-3 left-3 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-[var(--surface-tertiary)] text-[var(--neon-cyan)] border border-[var(--border-default)] rounded">
                    {match[1]}
                  </div>
                  <CopyButton code={code} />
                  <SyntaxHighlighter
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    style={vscDarkPlus as any}
                    language={match[1]}
                    PreTag="div"
                    className="rounded-lg !bg-[var(--void-80)] !border !border-[var(--border-default)] !mt-0 !pt-6 !text-sm"
                  >
                    {code}
                  </SyntaxHighlighter>
                </div>
              );
          },

          // Headings
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-[var(--text-primary)] mt-6 mb-4 border-b border-[var(--border-default)] pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mt-5 mb-3">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-[var(--text-secondary)] mt-4 mb-2">
              {children}
            </h3>
          ),

          // Paragraphs
          p: ({ children }) => (
            <p className="text-[var(--text-secondary)] leading-relaxed mb-4 last:mb-0">
              {children}
            </p>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-1 mb-4 marker:text-[var(--neon-cyan)]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside text-[var(--text-secondary)] space-y-1 mb-4 marker:text-[var(--neon-cyan)]">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">{children}</li>
          ),

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[var(--neon-cyan)] pl-4 py-1 my-4 bg-[var(--surface-secondary)]/50 rounded-r">
              <p className="text-[var(--text-muted)] italic m-0">{children}</p>
            </blockquote>
          ),

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--neon-cyan)] hover:text-[var(--neon-cyan-dim)] underline decoration-[var(--neon-cyan)]/50 hover:decoration-[var(--neon-cyan)] transition-colors"
            >
              {children}
            </a>
          ),

          // Images
          img: ({ src, alt }) => (
            <a
              href={src || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="block my-4"
            >
              <img
                src={src}
                alt={alt || 'Image'}
                loading="lazy"
                className="max-w-full h-auto rounded-lg border border-[var(--border-default)] hover:border-[var(--border-hover)] transition-colors"
              />
            </a>
          ),

          // Horizontal rule
          hr: () => (
            <hr className="my-6 border-[var(--border-default)]" />
          ),

          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="w-full text-sm text-left border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[var(--surface-secondary)] text-[var(--text-primary)] font-mono text-xs uppercase">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="text-[var(--text-secondary)]">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="border-b border-[var(--border-subtle)] last:border-0">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2 font-semibold">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2">{children}</td>
          ),

          // Strong and emphasis
          strong: ({ children }) => (
            <strong className="text-[var(--text-primary)] font-semibold">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="text-[var(--text-secondary)] italic">
              {children}
            </em>
          ),

          // Text nodes - apply search highlighting
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          text: ({ value }: any) => {
            if (!value) return null;
            return <HighlightedText text={String(value)} searchRegex={searchRegex} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
