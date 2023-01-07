import MarkdownIt from 'markdown-it';

function convert(markdown: string): string {
  const md = new MarkdownIt();
  const result = md.render(markdown);
  return result;
}

export { convert };
