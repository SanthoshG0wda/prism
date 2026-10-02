import React, { useMemo } from 'react';
import { marked } from 'marked';

// Configure marked for GitHub flavored markdown
marked.setOptions({
  gfm: true,
  breaks: true,
});

export default function MarkdownRenderer({ content }) {
  const html = useMemo(() => {
    if (!content) return '';
    return marked.parse(content);
  }, [content]);

  return (
    <div
      className="markdown-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
