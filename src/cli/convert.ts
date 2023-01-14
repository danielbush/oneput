import { convert } from '../convert';
import * as fs from 'fs';

const file = process.argv[2];

if (!file) {
  console.error('You need to specify a file.');
  process.exit(1);
}
if (!fs.existsSync(file)) {
  console.error(`File "${file} doesn't exist.`);
  process.exit(1);
}

const content = fs.readFileSync(file, 'utf-8');
const html = convert(content);

// See https://github.com/iktakahiro/markdown-it-katex for <link> tag for katex etc.

const templ = (title: string, content: string) => `<!doctype html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <meta name="Description" content="Put your description here.">
  <base href="/">

  <style></style>
  <link rel="stylesheet" href="/dist/es/style.css" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.11.1/katex.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/4.0.0/github-markdown.min.css"/>
  <title>test-app-shell</title>
</head>

<body>
  ${content}
  <script type="module" src="/dist/es/sketch.js"></script>
</body>

</html>`;

process.stdout.write(templ(file, html));
// console.log(html);
