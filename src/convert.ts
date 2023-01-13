import MarkdownIt from 'markdown-it';
import mk from '@iktakahiro/markdown-it-katex';

const md = new MarkdownIt();
md.use(mk);

function convert(markdown: string): string {
  const result = md.render(markdown);
  return result;
}

export { convert };
