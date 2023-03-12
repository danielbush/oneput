import MarkdownIt from 'markdown-it';
import mk from '@iktakahiro/markdown-it-katex';

/**
 * Convert markdown content to html but handle katex.
 */
function convert(markdown: string): string {
  const md = new MarkdownIt();
  md.use(mk);
  return md.render(markdown);
}

export { convert };
