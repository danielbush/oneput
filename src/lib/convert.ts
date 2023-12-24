import MarkdownIt from 'markdown-it';
import mk from '@iktakahiro/markdown-it-katex';

/**
 * Convert markdown content to html but handle katex.
 */
export function convertMd(markdown: string): string {
  const md = new MarkdownIt();
  md.use(mk);
  return md.render(markdown);
}

export function convert(markdown: string, title?: string): string {
  const content = convertMd(markdown);
  return template(content, title);
}

// See https://github.com/iktakahiro/markdown-it-katex for <link> tag for katex etc.

function template(
  content: string,
  title: string = 'Converted',
  description: string = 'Put your description here',
) {
  const appPath = '/src/app/sketch.ts';
  return `<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="Description" content="${description}">
  <base href="/">

  <style></style>
  <link rel="stylesheet" href="/style.css" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.11.1/katex.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/4.0.0/github-markdown.min.css"/>
  <title>${title}</title>
</head>

<body>
  ${content}
  <script type="module" src="${appPath}"></script>
</body>

</html>`;
}
