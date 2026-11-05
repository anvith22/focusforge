import React from 'react';

/**
 * Lightweight markdown parser that safely parses:
 * - **bold**
 * - *italic*
 * - `code`
 * - [text](url)
 * - \n (line breaks)
 */
export function renderMarkdownLite(text: string): React.ReactNode {
  if (!text) return null;

  // Split lines first
  const lines = text.split('\n');

  return lines.map((line, lineIdx) => {
    // Regex matching bold, code, link, italic
    const regex = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/g;
    const parts = line.split(regex);

    return (
      <React.Fragment key={lineIdx}>
        {parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
            return (
              <strong key={i} className="font-bold text-slate-800 dark:text-slate-100">
                {part.slice(2, -2)}
              </strong>
            );
          }
          if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
            return (
              <code
                key={i}
                className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-mono text-[11px] border border-slate-200/80 dark:border-slate-700/80"
              >
                {part.slice(1, -1)}
              </code>
            );
          }
          if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
            const labelEnd = part.indexOf('](');
            const label = part.slice(1, labelEnd);
            const url = part.slice(labelEnd + 2, -1);
            return (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                {label}
              </a>
            );
          }
          if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
            return (
              <em key={i} className="italic">
                {part.slice(1, -1)}
              </em>
            );
          }
          return part;
        })}
        {lineIdx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

