import { marked } from 'marked';

function convert(markdown: string): string {
  const md = marked.parse(markdown, { breaks: false });
  return md;
}

export { convert };
